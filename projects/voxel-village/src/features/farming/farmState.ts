import { emptyFishInventory, lakeFish, type FishInventory } from './fishInventory';
export const crops = {
  radish: {
    name: '萝卜',
    seconds: 30,
    harvest: '拔萝卜',
    color: '#e6b9a1',
    seedPrice: 12,
    sellPrice: 6,
  },
  tomato: {
    name: '番茄',
    seconds: 42,
    harvest: '摘番茄',
    color: '#e58c6e',
    seedPrice: 20,
    sellPrice: 10,
  },
  pumpkin: {
    name: '南瓜',
    seconds: 54,
    harvest: '抱南瓜',
    color: '#e6b45f',
    seedPrice: 32,
    sellPrice: 16,
  },
} as const;
export type Crop = keyof typeof crops;
export type FarmTool = 'seed' | 'water' | 'harvest';
export type FarmStage =
  'empty' | 'seeding' | 'thirsty' | 'watering' | 'growing' | 'ready' | 'harvesting';
export type FarmView = 'field' | 'warehouse' | 'shop';
export type FarmAction =
  | { kind: 'enter' }
  | { kind: 'exit' }
  | { kind: 'view'; view: FarmView }
  | { kind: 'buy'; crop: Crop }
  | { kind: 'sell'; crop: Crop | 'fish' | 'all'; all?: boolean }
  | { kind: 'retry-save' }
  | { kind: 'tool'; tool: FarmTool }
  | { kind: 'select'; bed: number }
  | { kind: 'use'; bed: number; item?: number }
  | { kind: 'crop'; crop: Crop };
export interface FarmBed {
  crop: Crop;
  stage: FarmStage;
  growth: number;
  waters: number;
  harvested: number;
  picked: number[];
}
export interface FarmJob {
  kind: FarmTool;
  bed: number;
  age: number;
  duration: number;
  crop: Crop;
  item: number;
}
export const workDuration = { seed: 0.8, water: 1.15, harvest: 0.85 };
export interface FarmProgress {
  fishing: FishInventory;
  beds: FarmBed[];
  basket: Record<Crop, number>;
  coins: number;
  seedStock: Record<Crop, number>;
}
export interface FarmSnapshot {
  fishing: FishInventory;
  view: FarmView;
  coins: number;
  seedStock: Record<Crop, number>;
  saveStatus: string;
  selected: number;
  tool: FarmTool;
  seed: Crop;
  notice: string;
  beds: FarmBed[];
  basket: Record<Crop, number>;
  busy: boolean;
  progress: number;
}
export function createFarmState() {
  let active = false,
    selected = 0,
    view: FarmView = 'field',
    coins = 60,
    saveStatus = '',
    tool: FarmTool = 'seed',
    seed: Crop = 'radish',
    notice = '',
    job: FarmJob | null = null;
  const beds: FarmBed[] = (['radish', 'tomato', 'pumpkin'] as Crop[]).map((crop) => ({
    crop,
    stage: 'empty',
    growth: 0,
    waters: 0,
    harvested: 0,
    picked: [],
  }));
  const fishing = emptyFishInventory();
  const basket: Record<Crop, number> = { radish: 0, tomato: 0, pumpkin: 0 };
  const seedStock: Record<Crop, number> = { radish: 2, tomato: 2, pumpkin: 2 };
  function reason(index: number, item?: number) {
    const bed = beds[index];
    if (!bed) return '请点击田里的土地';
    if (view !== 'field') return '先返回田地再使用农具';
    if (job) return '正在操作，稍等一下';
    if (tool === 'seed')
      return bed.stage !== 'empty'
        ? '这畦已经种好了，换一块空地吧'
        : seedStock[seed] > 0
          ? ''
          : '种子用完了，去商店买一袋吧';
    if (tool === 'water')
      return bed.stage === 'thirsty'
        ? ''
        : bed.stage === 'empty'
          ? '先播种，再浇水'
          : '现在不需要浇水';
    if (bed.stage !== 'ready')
      return bed.stage === 'empty' ? '这里还没有作物' : '还没成熟，再等一会儿';
    if (
      item !== undefined &&
      (!Number.isInteger(item) || item < 0 || item > 2 || bed.picked.includes(item))
    )
      return '这株已经收过了，点旁边的作物';
    return '';
  }
  function action(a: FarmAction) {
    if (a.kind === 'enter') {
      active = true;
      view = 'field';
      notice = '';
      return true;
    }
    if (a.kind === 'exit') {
      if (job) {
        beds[job.bed]!.stage =
          job.kind === 'seed' ? 'empty' : job.kind === 'water' ? 'thirsty' : 'ready';
        job = null;
      }
      active = false;
      notice = '';
      return true;
    }
    if (!active || job) return false;
    notice = '';
    if (a.kind === 'retry-save') return true;
    if (a.kind === 'view') {
      view = a.view;
      return true;
    }
    if (a.kind === 'buy') {
      if (coins < crops[a.crop].seedPrice) {
        notice = '金币不够，先去仓库卖点菜吧';
        return false;
      }
      if (seedStock[a.crop] >= 1e9) return false;
      coins -= crops[a.crop].seedPrice;
      seedStock[a.crop]++;
      notice = `${crops[a.crop].name}种子 +1 袋 · 花费 ${crops[a.crop].seedPrice} 金币`;
      return true;
    }
    if (a.kind === 'sell') {
      const selling: (Crop | 'fish')[] =
        a.crop === 'all' ? [...(Object.keys(crops) as Crop[]), 'fish'] : [a.crop];
      let income = 0;
      for (const item of selling) {
        const stock = item === 'fish' ? fishing.stock : basket[item];
        const count = a.crop === 'all' || a.all ? stock : Math.min(1, stock);
        income += count * (item === 'fish' ? lakeFish.sellPrice : crops[item].sellPrice);
      }
      if (!income) {
        notice = '仓库里还没有可以出售的收获';
        return false;
      }
      if (!Number.isSafeInteger(coins + income)) return false;
      for (const item of selling) {
        if (item === 'fish')
          fishing.stock -= a.crop === 'all' || a.all ? fishing.stock : Math.min(1, fishing.stock);
        else basket[item] -= a.crop === 'all' || a.all ? basket[item] : Math.min(1, basket[item]);
      }
      coins += income;
      notice = `卖出成功 · 金币 +${income}`;
      return true;
    }
    if (a.kind === 'tool') {
      tool = a.tool;
      return true;
    }
    if (a.kind === 'crop') {
      seed = a.crop;
      tool = 'seed';
      return true;
    }
    if (!Number.isInteger(a.bed) || a.bed < 0 || a.bed > 2) return false;
    selected = a.bed;
    if (a.kind === 'select') return true;
    notice = reason(a.bed, a.item);
    if (notice) return false;
    const bed = beds[selected]!;
    if (tool === 'seed') {
      bed.crop = seed;
      bed.growth = 0;
      bed.waters = 0;
      bed.harvested = 0;
      bed.picked = [];
    }
    job = {
      kind: tool,
      bed: selected,
      crop: bed.crop,
      item: a.item ?? [0, 1, 2].find((i) => !bed.picked.includes(i)) ?? 0,
      age: 0,
      duration: workDuration[tool],
    };
    bed.stage = tool === 'seed' ? 'seeding' : tool === 'water' ? 'watering' : 'harvesting';
    return true;
  }
  function step(dt: number) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (const bed of beds)
      if (bed.stage === 'growing') {
        const cap = bed.waters === 1 ? 0.5 : 1;
        bed.growth = Math.min(cap, bed.growth + dt / crops[bed.crop].seconds);
        if (bed.growth >= cap) bed.stage = cap === 1 ? 'ready' : 'thirsty';
      }
    if (job) {
      job.age = Math.min(job.duration, job.age + dt);
      if (job.age >= job.duration) {
        const bed = beds[job.bed]!;
        if (job.kind === 'seed') {
          seedStock[bed.crop]--;
          bed.stage = 'thirsty';
          notice = '种好啦，选水壶给它浇水';
        }
        if (job.kind === 'water') {
          bed.waters++;
          bed.stage = 'growing';
          notice = '浇透了，幼苗正在长大';
        }
        if (job.kind === 'harvest') {
          basket[bed.crop]++;
          bed.harvested++;
          bed.picked.push(job.item);
          bed.stage = bed.harvested === 3 ? 'empty' : 'ready';
          notice = `${crops[bed.crop].name} +1 · 已存入仓库`;
        }
        job = null;
      }
    }
  }
  function progress(): FarmProgress {
    return {
      coins,
      fishing: { ...fishing },
      seedStock: { ...seedStock },
      basket: { ...basket },
      beds: beds.map((b, index) => ({
        ...b,
        picked: [...b.picked],
        stage:
          job?.bed === index
            ? job.kind === 'seed'
              ? 'empty'
              : job.kind === 'water'
                ? 'thirsty'
                : 'ready'
            : b.stage,
      })),
    };
  }
  function restore(data: FarmProgress) {
    job = null;
    coins = data.coins;
    Object.assign(fishing, data.fishing);
    Object.assign(seedStock, data.seedStock);
    Object.assign(basket, data.basket);
    beds.splice(0, 3, ...data.beds.map((b) => ({ ...b, picked: [...b.picked] })));
    notice = '已恢复农场进度';
  }
  return {
    progress,
    restore,
    fishingSnapshot() {
      return { ...fishing, coins, saveStatus };
    },
    landFish() {
      if (fishing.pending) return;
      fishing.pending = true;
      fishing.caught++;
    },
    resolveFish(keep: boolean) {
      if (!fishing.pending) return false;
      fishing.pending = false;
      if (keep) {
        fishing.stock++;
        fishing.kept++;
      } else fishing.released++;
      return true;
    },
    setSaveStatus(status: string) {
      saveStatus = status;
    },
    action,
    reason,
    step,
    beds,
    basket,
    get active() {
      return active;
    },
    get selected() {
      return selected;
    },
    get tool() {
      return tool;
    },
    get seed() {
      return seed;
    },
    get job() {
      return job;
    },
    snapshot(): FarmSnapshot {
      return {
        view,
        fishing: { ...fishing },
        coins,
        seedStock: { ...seedStock },
        saveStatus,
        selected,
        tool,
        seed,
        notice,
        beds: beds.map((b) => ({
          ...b,
          picked: [...b.picked],
          growth: Math.round(b.growth * 100) / 100,
        })),
        basket: { ...basket },
        busy: !!job,
        progress: job ? Math.round((job.age / job.duration) * 50) / 50 : 0,
      };
    },
  };
}
