import { expect, it } from 'vitest';
import { createFarmState, type FarmAction } from '../src/features/farming/farmState';
import {
  advanceOffline,
  createFarmPersistence,
  decodeFarmSave,
  FARM_SAVE_KEY,
} from '../src/features/farming/farmSave';
function harness() {
  const values = new Map<string, string>();
  let time = 100000,
    fail = false;
  const storage = {
    getItem: (k: string) => {
      if (fail) throw Error('blocked');
      return values.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (fail) throw Error('full');
      values.set(k, v);
    },
  };
  const open = () => {
    const machine = createFarmState(),
      save = createFarmPersistence(machine, storage, () => time);
    machine.action({ kind: 'enter' });
    return {
      machine,
      save,
      action(a: FarmAction) {
        save.sync();
        const result = machine.action(a);
        save.flush();
        return result;
      },
      step(dt: number) {
        time += dt * 1000;
        machine.step(dt);
        save.flush();
      },
    };
  };
  return {
    values,
    storage,
    open,
    clock(dt: number) {
      time += dt * 1000;
    },
    fail(value: boolean) {
      fail = value;
    },
  };
}
function mature(f: ReturnType<ReturnType<typeof harness>['open']>) {
  f.action({ kind: 'use', bed: 0 });
  f.step(1);
  f.action({ kind: 'tool', tool: 'water' });
  f.action({ kind: 'use', bed: 0 });
  f.step(2);
  f.step(15);
  f.action({ kind: 'use', bed: 0 });
  f.step(2);
  f.step(15);
  f.action({ kind: 'tool', tool: 'harvest' });
}
it('persists completed harvests, one-time starter gifts, sales and seed purchases atomically', () => {
  const h = harness(),
    f = h.open();
  mature(f);
  for (const item of [2, 0, 1]) {
    f.action({ kind: 'use', bed: 0, item });
    f.step(1);
  }
  expect(f.machine.snapshot()).toMatchObject({
    coins: 60,
    basket: { radish: 3 },
    seedStock: { radish: 1 },
  });
  const resumed = h.open();
  expect(resumed.machine.snapshot()).toMatchObject({
    coins: 60,
    basket: { radish: 3 },
    seedStock: { radish: 1 },
  });
  resumed.action({ kind: 'sell', crop: 'radish' });
  expect(resumed.machine.snapshot()).toMatchObject({ coins: 66, basket: { radish: 2 } });
  resumed.action({ kind: 'sell', crop: 'all' });
  expect(resumed.machine.snapshot()).toMatchObject({ coins: 78, basket: { radish: 0 } });
  expect(resumed.action({ kind: 'sell', crop: 'all' })).toBe(false);
  resumed.action({ kind: 'buy', crop: 'pumpkin' });
  expect(h.open().machine.snapshot()).toMatchObject({
    coins: 46,
    seedStock: { pumpkin: 3 },
    basket: { radish: 0 },
  });
  resumed.action({ kind: 'buy', crop: 'pumpkin' });
  expect(resumed.action({ kind: 'buy', crop: 'pumpkin' })).toBe(false);
  expect(h.open().machine.snapshot().coins).toBe(14);
});
it('reloads incomplete actions without losing seeds, watering twice, or duplicating produce', () => {
  const h = harness();
  let f = h.open();
  f.action({ kind: 'use', bed: 0 });
  f.step(0.3);
  f = h.open();
  expect(f.machine.snapshot()).toMatchObject({
    seedStock: { radish: 2 },
    beds: [{ stage: 'empty' }, {}, {}],
  });
  f.action({ kind: 'use', bed: 0 });
  f.step(1);
  f.action({ kind: 'tool', tool: 'water' });
  f.action({ kind: 'use', bed: 0 });
  f.step(0.3);
  f = h.open();
  expect(f.machine.beds[0]).toMatchObject({ stage: 'thirsty', waters: 0 });
  f.action({ kind: 'tool', tool: 'water' });
  f.action({ kind: 'use', bed: 0 });
  f.step(2);
  f.step(15);
  f.action({ kind: 'use', bed: 0 });
  f.step(2);
  f.step(15);
  f.action({ kind: 'tool', tool: 'harvest' });
  f.action({ kind: 'use', bed: 0, item: 2 });
  f.step(0.4);
  f = h.open();
  expect(f.machine.beds[0]).toMatchObject({ stage: 'ready', picked: [] });
  expect(f.machine.basket.radish).toBe(0);
  f.action({ kind: 'tool', tool: 'harvest' });
  f.action({ kind: 'use', bed: 0, item: 2 });
  f.step(1);
  f = h.open();
  expect(f.machine.basket.radish).toBe(1);
  expect(f.machine.beds[0]!.picked).toEqual([2]);
  f.action({ kind: 'tool', tool: 'harvest' });
  expect(f.action({ kind: 'use', bed: 0, item: 2 })).toBe(false);
});
it('caps offline growth at the next watering, then matures after second watering without counting time twice', () => {
  const h = harness();
  let f = h.open();
  f.action({ kind: 'use', bed: 0 });
  f.step(1);
  f.action({ kind: 'tool', tool: 'water' });
  f.action({ kind: 'use', bed: 0 });
  f.step(2);
  h.clock(3600);
  f = h.open();
  expect(f.machine.beds[0]).toMatchObject({ stage: 'thirsty', growth: 0.5, waters: 1 });
  f.action({ kind: 'tool', tool: 'water' });
  f.action({ kind: 'use', bed: 0 });
  f.step(2);
  h.clock(3);
  f = h.open();
  expect(f.machine.beds[0]!.growth).toBeCloseTo(0.6);
  expect(h.open().machine.beds[0]!.growth).toBeCloseTo(0.6);
  h.clock(120);
  f = h.open();
  expect(f.machine.beds[0]).toMatchObject({ stage: 'ready', growth: 1 });
  const data = decodeFarmSave(h.values.get(FARM_SAVE_KEY)!)!;
  expect(advanceOffline(data, data.savedAt - 1000)).toEqual(data.progress);
});
it('preserves unreadable saves and exposes storage failures with a successful retry', () => {
  const h = harness();
  h.values.set(FARM_SAVE_KEY, '{broken');
  const broken = h.open();
  broken.action({ kind: 'buy', crop: 'radish' });
  expect(h.values.get(FARM_SAVE_KEY)).toBe('{broken');
  expect(broken.machine.snapshot().saveStatus).toContain('已保留原数据');
  const other = harness(),
    f = other.open();
  other.fail(true);
  f.action({ kind: 'buy', crop: 'radish' });
  expect(f.machine.snapshot().saveStatus).toContain('未保存');
  other.fail(false);
  f.save.flush();
  expect(other.open().machine.snapshot()).toMatchObject({
    coins: 48,
    seedStock: { radish: 3 },
    saveStatus: '已自动保存',
  });
  const invalid = JSON.parse(other.values.get(FARM_SAVE_KEY)!);
  invalid.progress.coins = -20;
  expect(decodeFarmSave(JSON.stringify(invalid))).toBeNull();
});
it('synchronizes another page before spending and blocks planting without seeds', () => {
  const h = harness(),
    first = h.open(),
    second = h.open();
  first.action({ kind: 'buy', crop: 'pumpkin' });
  second.action({ kind: 'buy', crop: 'tomato' });
  expect(h.open().machine.snapshot()).toMatchObject({
    coins: 8,
    seedStock: { pumpkin: 3, tomato: 3 },
  });
  const f = h.open(),
    data = f.machine.progress();
  data.seedStock.radish = 0;
  f.machine.restore(data);
  expect(f.action({ kind: 'use', bed: 0 })).toBe(false);
  expect(f.machine.beds[0]!.stage).toBe('empty');
  expect(f.machine.snapshot().notice).toContain('种子用完');
});

it('upgrades a vegetable-only v1 save without changing its money, crops or seeds', () => {
  const h = harness(),
    old = h.open();
  old.action({ kind: 'buy', crop: 'tomato' });
  old.action({ kind: 'use', bed: 0 });
  old.step(1);
  const legacy = JSON.parse(h.values.get(FARM_SAVE_KEY)!);
  legacy.version = 1;
  delete legacy.progress.fishing;
  h.values.set(FARM_SAVE_KEY, JSON.stringify(legacy));
  const upgraded = h.open();
  expect(upgraded.machine.snapshot()).toMatchObject({
    coins: 40,
    seedStock: { radish: 1, tomato: 3, pumpkin: 2 },
    fishing: { stock: 0, caught: 0, pending: false },
  });
  expect(upgraded.machine.beds[0]!.stage).toBe('thirsty');
  expect(JSON.parse(h.values.get(FARM_SAVE_KEY)!).version).toBe(2);
});

it('persists pending fish, resolves each once, sells into the shared wallet and preserves cumulative catches', () => {
  const h = harness();
  let f = h.open();
  f.machine.landFish();
  f.machine.landFish();
  f.save.flush();
  f = h.open();
  expect(f.machine.snapshot().fishing).toEqual({
    stock: 0,
    caught: 1,
    kept: 0,
    released: 0,
    pending: true,
  });
  expect(f.machine.resolveFish(true)).toBe(true);
  expect(f.machine.resolveFish(true)).toBe(false);
  f.save.flush();
  f = h.open();
  expect(f.machine.snapshot().fishing).toEqual({
    stock: 1,
    caught: 1,
    kept: 1,
    released: 0,
    pending: false,
  });
  f.action({ kind: 'sell', crop: 'fish' });
  expect(f.machine.snapshot().coins).toBe(84);
  expect(f.action({ kind: 'sell', crop: 'fish' })).toBe(false);
  f.action({ kind: 'buy', crop: 'radish' });
  f = h.open();
  expect(f.machine.snapshot()).toMatchObject({
    coins: 72,
    seedStock: { radish: 3 },
    fishing: { stock: 0, caught: 1, kept: 1 },
  });
  f.machine.landFish();
  f.machine.resolveFish(false);
  f.save.flush();
  f = h.open();
  expect(f.machine.snapshot().fishing).toEqual({
    stock: 0,
    caught: 2,
    kept: 1,
    released: 1,
    pending: false,
  });
  const invalid = JSON.parse(h.values.get(FARM_SAVE_KEY)!);
  invalid.progress.fishing.stock = 20;
  expect(decodeFarmSave(JSON.stringify(invalid))).toBeNull();
});

it('sells mixed vegetables and fish in one transaction without erasing catch history', () => {
  const h = harness(),
    f = h.open();
  f.machine.landFish();
  f.machine.resolveFish(true);
  const progress = f.machine.progress();
  progress.basket.radish = 2;
  f.machine.restore(progress);
  f.save.flush();
  expect(f.action({ kind: 'sell', crop: 'all' })).toBe(true);
  const restored = h.open().machine.snapshot();
  expect(restored.coins).toBe(96);
  expect(restored.basket.radish).toBe(0);
  expect(restored.fishing).toMatchObject({ stock: 0, caught: 1, kept: 1, pending: false });
});
