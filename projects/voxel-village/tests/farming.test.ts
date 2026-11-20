import { expect, it } from 'vitest';
import { Box3, BoxGeometry, Mesh, MeshLambertMaterial, Ray, Scene, Vector3 } from 'three';
import { disposeObjectTree } from '@visual/scene-kit';
import { createFarmState, type Crop, type FarmTool } from '../src/features/farming/farmState';
import { createFarm } from '../src/features/farming/createFarm';
import { bedCenters, plantOffsets } from '../src/features/farming/farmLayout';
import { createVillageStore } from '../src/state/villageStore';
import type { LakeBox } from '../src/features/environment/lakeActor';

it('uses selected mouse tools, validates targets, and cancels incomplete work without credit', () => {
  const s = createFarmState();
  expect(s.action({ kind: 'use', bed: 0 })).toBe(false);
  s.action({ kind: 'enter' });
  s.action({ kind: 'tool', tool: 'water' });
  expect(s.action({ kind: 'use', bed: 0 })).toBe(false);
  s.action({ kind: 'crop', crop: 'pumpkin' });
  expect(s.beds[0]!.stage).toBe('empty'); // Selecting a seed alone never plants.
  s.action({ kind: 'use', bed: 0 });
  expect(s.action({ kind: 'use', bed: 0 })).toBe(false);
  s.action({ kind: 'exit' });
  expect(s.beds[0]!.stage).toBe('empty');
  s.action({ kind: 'enter' });
  s.action({ kind: 'use', bed: 0 });
  s.step(1);
  expect(s.beds[0]!.crop).toBe('pumpkin');
  expect(s.beds[0]!.stage).toBe('thirsty');
  expect(s.action({ kind: 'use', bed: 0 })).toBe(false);
  s.action({ kind: 'tool', tool: 'water' });
  s.action({ kind: 'use', bed: 0 });
  s.step(2);
  s.step(40);
  expect(s.beds[0]!.growth).toBe(0.5);
  s.action({ kind: 'use', bed: 0 });
  s.step(2);
  s.step(40);
  s.action({ kind: 'tool', tool: 'harvest' });
  s.action({ kind: 'use', bed: 0, item: 2 });
  s.step(0.4);
  s.action({ kind: 'exit' });
  expect(s.basket.pumpkin).toBe(0);
  s.action({ kind: 'enter' });
  for (const item of [2, 0, 1]) {
    expect(s.action({ kind: 'use', bed: 0, item })).toBe(true);
    s.step(1);
    expect(s.action({ kind: 'use', bed: 0, item })).toBe(false);
  }
  expect(s.basket.pumpkin).toBe(3);
  expect(s.beds[0]!.stage).toBe('empty');
  expect(s.beds[0]!.picked).toEqual([2, 0, 1]);
  s.action({ kind: 'crop', crop: 'tomato' });
  s.action({ kind: 'use', bed: 0 });
  s.step(1);
  expect(s.beds[0]!.picked).toEqual([]);
  expect(s.basket.pumpkin).toBe(3);
});

it('ray-picks every crop in any order, keeps the farmer outside, and lands produce on basket floors', () => {
  const scene = new Scene(),
    store = createVillageStore(),
    geometry = new BoxGeometry(1, 1, 1),
    materials = new Map<number, MeshLambertMaterial>();
  const box: LakeBox = (parent, w, h, d, c, x = 0, y = 0, z = 0) => {
    if (!materials.has(c)) materials.set(c, new MeshLambertMaterial({ color: c }));
    const part = new Mesh(geometry, materials.get(c)!);
    part.scale.set(w, h, d);
    part.position.set(x, y, z);
    parent.add(part);
    return part;
  };
  const farm = createFarm(scene, box, store, 12),
    original = farm.actor.root.position.clone();
  let time = 0;
  const tick = (seconds: number) => {
    for (let t = 0; t < seconds; t += 1 / 60) {
      time += 1 / 60;
      farm.update(time);
      expect(farm.actor.root.position).toEqual(original);
    }
  };
  const point = (bed: number, item = 1) =>
    new Ray(
      new Vector3(bedCenters[bed]!.x, 30, bedCenters[bed]!.z + plantOffsets[item]!),
      new Vector3(0, -1, 0),
    );
  const choose = (tool: FarmTool) => farm.action({ kind: 'tool', tool });
  farm.action({ kind: 'enter' });
  for (const [bed, crop] of (['radish', 'tomato', 'pumpkin'] as Crop[]).entries()) {
    farm.action({ kind: 'crop', crop });
    farm.pick(point(bed));
    tick(1);
    choose('water');
    farm.pick(point(bed));
    tick(2);
    tick(28);
    farm.pick(point(bed));
    tick(2);
    tick(28);
    choose('harvest');
    const camera = new Vector3(-53.5, 25.6, 38.3);
    for (const item of [0, 1, 2]) {
      const aim = new Vector3(
        bedCenters[bed]!.x,
        12.2 + (crop === 'tomato' ? 0.66 : crop === 'pumpkin' ? 0.28 : 0.1),
        bedCenters[bed]!.z + plantOffsets[item]!,
      );
      expect(farm.target(new Ray(camera, aim.sub(camera).normalize()))).toMatchObject({
        bed,
        item,
      });
    }
    for (const item of [2, 0, 1]) {
      expect(farm.target(point(bed, item))).toMatchObject({ bed, item });
      farm.pick(point(bed, item));
      tick(1);
      expect(farm.machine.beds[bed]!.picked).toContain(item);
      farm.pick(point(bed, item));
      expect(farm.machine.job).toBeNull();
    }
  }
  expect(farm.machine.basket).toEqual({ radish: 3, tomato: 3, pumpkin: 3 });
  scene.updateMatrixWorld(true);
  for (const bed of farm.beds)
    for (const fruit of bed.items)
      expect(new Box3().setFromObject(fruit).min.y).toBeCloseTo(12.21, 4);
  farm.action({ kind: 'sell', crop: 'radish' });
  tick(0.02);
  expect(farm.beds[0]!.items).toHaveLength(2);
  expect(farm.machine.basket.radish).toBe(2);
  farm.action({ kind: 'crop', crop: 'radish' });
  farm.pick(new Ray(new Vector3(0, 30, 0), new Vector3(0, -1, 0)));
  expect(farm.machine.job).toBeNull();
  store.set({ paused: true });
  farm.pick(point(0));
  tick(2);
  expect(farm.machine.job).toBeNull();
  store.set({ paused: false });
  farm.pick(point(0));
  store.set({ paused: true });
  const progress = farm.machine.job!.age;
  tick(2);
  expect(farm.machine.job!.age).toBe(progress);
  farm.action({ kind: 'exit' });
  expect(store.getSnapshot().farm).toBeNull();
  disposeObjectTree(scene);
});
