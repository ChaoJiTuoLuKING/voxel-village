import { emptyFishInventory, type FishInventory } from './fishInventory';
import {
  crops,
  type Crop,
  type FarmBed,
  type FarmProgress,
  type createFarmState,
} from './farmState';
export const FARM_SAVE_KEY = 'voxel-village:farm:v1';
export interface FarmSave {
  version: 2;
  savedAt: number;
  progress: FarmProgress;
}
const cropNames = Object.keys(crops) as Crop[];
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const crop = (v: unknown): v is Crop => typeof v === 'string' && cropNames.includes(v as Crop);
export function decodeFarmSave(raw: string): FarmSave | null {
  try {
    const data: unknown = JSON.parse(raw);
    if (
      !record(data) ||
      (data.version !== 1 && data.version !== 2) ||
      !integer(data.savedAt) ||
      !record(data.progress)
    )
      return null;
    const p = data.progress;
    if (
      !integer(p.coins) ||
      !record(p.basket) ||
      !record(p.seedStock) ||
      !Array.isArray(p.beds) ||
      p.beds.length !== 3
    )
      return null;
    for (const key of cropNames)
      if (
        !integer(p.basket[key]) ||
        !integer(p.seedStock[key]) ||
        p.basket[key] > 1e9 ||
        p.seedStock[key] > 1e9
      )
        return null;
    let fishing = emptyFishInventory();
    if (data.version === 2) {
      const f = p.fishing;
      if (
        !record(f) ||
        !integer(f.stock) ||
        !integer(f.caught) ||
        !integer(f.kept) ||
        !integer(f.released) ||
        typeof f.pending !== 'boolean' ||
        f.stock > f.kept ||
        f.caught !== f.kept + f.released + Number(f.pending)
      )
        return null;
      fishing = {
        stock: f.stock,
        caught: f.caught,
        kept: f.kept,
        released: f.released,
        pending: f.pending,
      } satisfies FishInventory;
    }
    const beds: FarmBed[] = [];
    for (const b of p.beds) {
      if (
        !record(b) ||
        !crop(b.crop) ||
        !['empty', 'thirsty', 'growing', 'ready'].includes(String(b.stage)) ||
        typeof b.growth !== 'number' ||
        !Number.isFinite(b.growth) ||
        b.growth < 0 ||
        b.growth > 1 ||
        !integer(b.waters) ||
        b.waters > 2 ||
        !integer(b.harvested) ||
        b.harvested > 3 ||
        !Array.isArray(b.picked) ||
        b.picked.length !== b.harvested ||
        new Set(b.picked).size !== b.picked.length ||
        b.picked.some((i) => !integer(i) || i > 2)
      )
        return null;
      if (b.stage === 'ready' && (b.waters !== 2 || b.growth !== 1 || b.harvested >= 3))
        return null;
      if (
        b.stage === 'thirsty' &&
        !((b.waters === 0 && b.growth === 0) || (b.waters === 1 && b.growth === 0.5))
      )
        return null;
      if (
        b.stage === 'growing' &&
        !(
          b.harvested === 0 &&
          ((b.waters === 1 && b.growth < 0.5) ||
            (b.waters === 2 && b.growth >= 0.5 && b.growth < 1))
        )
      )
        return null;
      if (b.stage !== 'empty' && b.stage !== 'ready' && b.harvested !== 0) return null;
      beds.push({
        crop: b.crop,
        stage: b.stage as FarmBed['stage'],
        growth: b.growth,
        waters: b.waters,
        harvested: b.harvested,
        picked: [...b.picked] as number[],
      });
    }
    return {
      version: 2,
      savedAt: data.savedAt,
      progress: {
        coins: p.coins,
        fishing,
        basket: { ...p.basket } as Record<Crop, number>,
        seedStock: { ...p.seedStock } as Record<Crop, number>,
        beds,
      },
    };
  } catch {
    return null;
  }
}
export function advanceOffline(data: FarmSave, now: number): FarmProgress {
  const progress = structuredClone(data.progress);
  const seconds = Math.max(0, now - data.savedAt) / 1000;
  for (const bed of progress.beds)
    if (bed.stage === 'growing') {
      const cap = bed.waters === 1 ? 0.5 : 1;
      bed.growth = Math.min(cap, bed.growth + seconds / crops[bed.crop].seconds);
      if (bed.growth >= cap) bed.stage = cap === 1 ? 'ready' : 'thirsty';
    }
  return progress;
}
export function createFarmPersistence(
  machine: ReturnType<typeof createFarmState>,
  storage: Pick<Storage, 'getItem' | 'setItem'> | null,
  now = Date.now,
) {
  let lastRaw: string | null = null,
    signature = '',
    lastTick = 0,
    blocked = false;
  const error = () => machine.setSaveStatus('未保存：浏览器存储不可用，请重试');
  function accept(raw: string) {
    const data = decodeFarmSave(raw);
    if (!data) {
      blocked = true;
      machine.setSaveStatus('存档无法识别，已保留原数据；当前进度暂不覆盖');
      return false;
    }
    machine.restore(advanceOffline(data, now()));
    lastRaw = raw;
    signature = ''; // Immediately checkpoint offline growth once, so it cannot be applied twice.
    return true;
  }
  function sync() {
    if (!storage || blocked) return false;
    try {
      const raw = storage.getItem(FARM_SAVE_KEY);
      if (raw !== lastRaw && raw !== null) return accept(raw);
      return true;
    } catch {
      error();
      return false;
    }
  }
  function flush() {
    if (!storage || blocked) {
      if (!blocked) error();
      return;
    }
    try {
      if (!sync() || blocked) return;
      const progress = machine.progress(),
        nextSignature = JSON.stringify(progress);
      if (nextSignature === signature) {
        machine.setSaveStatus('已自动保存');
        return;
      }
      const raw = JSON.stringify({ version: 2, savedAt: now(), progress } satisfies FarmSave);
      storage.setItem(FARM_SAVE_KEY, raw);
      lastRaw = raw;
      signature = nextSignature;
      machine.setSaveStatus('已自动保存');
    } catch {
      error();
    }
  }
  function tick(force = false) {
    if (force || now() - lastTick >= 1000) {
      lastTick = now();
      flush();
    }
  }
  sync();
  flush();
  return { sync, flush, tick };
}
