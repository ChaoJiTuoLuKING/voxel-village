import { emptyFishInventory, type FishingLedger } from '../farming/fishInventory';
export type FishingStage =
  | 'off'
  | 'ready'
  | 'casting'
  | 'waiting'
  | 'bite'
  | 'fighting'
  | 'landable'
  | 'landing'
  | 'caught'
  | 'releasing'
  | 'keeping'
  | 'escaped';
export type FishingAction =
  'enter' | 'exit' | 'cast' | 'reel' | 'cancel' | 'hook' | 'land' | 'retry' | 'keep' | 'free';
export interface FishingSnapshot {
  coins: number;
  caughtTotal: number;
  keptTotal: number;
  releasedTotal: number;
  saveStatus: string;
  stage: FishingStage;
  tension: number;
  distance: number;
  surge: boolean;
  reeling: boolean;
  reelCount: number;
  kept: number;
  message: string;
}
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/** Simulation seconds only; no wall-clock timers or React frame updates. */
export function createFishingState() {
  let stage: FishingStage = 'off',
    age = 0,
    fightTime = 0,
    reelRemaining = 0,
    reelCooldown = 0,
    reelCount = 0,
    castDuration = 2.4;
  let tension = 0.18,
    distance = 1,
    strain = 0;
  let attempt = 0,
    message = '';
  const localFish = emptyFishInventory();
  let ledger: FishingLedger | undefined;
  const inventory = () => ledger?.read() ?? { ...localFish, coins: 0, saveStatus: '' };
  const resolve = (keep: boolean) => {
    if (ledger) return ledger.resolve(keep);
    if (!localFish.pending) return false;
    localFish.pending = false;
    if (keep) {
      localFish.stock++;
      localFish.kept++;
    } else localFish.released++;
    return true;
  };
  const move = (next: FishingStage) => {
    stage = next;
    age = 0;
    reelRemaining = 0;
  };
  const surge = () => stage === 'fighting' && fightTime % 4.8 > 2.6 && fightTime % 4.8 < 4.0;
  function action(value: FishingAction, duration = 2.4) {
    ledger?.sync();
    if (value === 'exit') {
      move('off');
      return;
    }
    if (value === 'enter' && stage === 'off') {
      move(inventory().pending ? 'caught' : 'ready');
      message = inventory().pending ? '上次钓到的湖鱼还在，收下或放回湖里吧' : '';
      return;
    }
    if (value === 'cancel') {
      reelRemaining = 0;
      return;
    }
    if (value === 'cast' && stage === 'ready' && inventory().pending) {
      move('caught');
      return;
    }
    if (value === 'cast' && stage === 'ready') {
      message = '';
      attempt++;
      castDuration = duration;
      move('casting');
    }
    if (value === 'reel' && stage === 'fighting' && reelCooldown <= 0) {
      reelRemaining = 0.32;
      reelCooldown = 0.24;
      reelCount++;
    }
    if (value === 'hook' && (stage === 'waiting' || stage === 'bite')) {
      if (stage === 'waiting') {
        message = '提早了，鱼儿还在试探';
        move('escaped');
      } else {
        tension = 0.22;
        distance = 1;
        strain = 0;
        fightTime = 0;
        move('fighting');
      }
    }
    if (value === 'land' && stage === 'landable') move('landing');
    if (value === 'free' && stage === 'caught') move(resolve(false) ? 'releasing' : 'ready');
    if (value === 'keep' && stage === 'caught') {
      move(resolve(true) ? 'keeping' : 'ready');
    }
    if (value === 'retry' && (stage === 'escaped' || stage === 'ready')) {
      message = '';
      move('ready');
    }
  }
  function step(dt: number) {
    if (!(dt > 0)) return;
    // Small internal steps keep tug/escape rules independent of rendering frame rate.
    for (let remaining = Math.min(dt, 0.25); remaining > 0;) {
      const d = Math.min(remaining, 1 / 60);
      remaining -= d;
      age += d;
      reelCooldown = Math.max(0, reelCooldown - d);
      if (stage === 'casting' && age >= castDuration) move('waiting');
      if (stage === 'waiting' && age >= 4.4 + (attempt % 3) * 0.8) move('bite');
      if (stage === 'bite' && age >= 2.2) {
        message = '鱼儿游走了，再试一次';
        move('escaped');
      }
      if (stage === 'fighting') {
        fightTime += d;
        const rushing = surge();
        const reeling = reelRemaining > 0;
        reelRemaining = Math.max(0, reelRemaining - d);
        tension = clamp(tension + d * (reeling ? (rushing ? 1.0 : 0.28) : -0.26), 0.08, 1);
        distance = clamp(distance + d * (reeling ? (rushing ? -0.02 : -0.2) : 0.014), 0, 1.15);
        strain = tension > 0.94 ? strain + d : Math.max(0, strain - d * 2);
        if (strain > 0.65) {
          message = '拉得太紧，鱼脱钩了。冲刺时先停一停';
          move('escaped');
        } else if (distance <= 0.04) move('landable');
        else if (fightTime > 65) {
          message = '鱼儿挣脱了，重新甩一竿吧';
          move('escaped');
        }
      }
      if (stage === 'landing' && age >= 2.2) {
        if (ledger) ledger.land();
        else if (!localFish.pending) {
          localFish.pending = true;
          localFish.caught++;
        }
        move('caught');
      }
      if ((stage === 'keeping' || stage === 'releasing') && age >= 2.2) {
        message = stage === 'releasing' ? '小鱼游回湖里了' : '湖鱼已存入仓库，可以卖钱或继续钓鱼';
        move('ready');
      }
    }
  }
  return {
    bindLedger(value: FishingLedger) {
      ledger = value;
    },
    action,
    step,
    get stage() {
      return stage;
    },
    get age() {
      return age;
    },
    get fightTime() {
      return fightTime;
    },
    snapshot: (): FishingSnapshot => ({
      stage,
      tension,
      distance,
      surge: surge(),
      reeling: reelRemaining > 0,
      reelCount,
      kept: inventory().stock,
      coins: inventory().coins,
      caughtTotal: inventory().caught,
      keptTotal: inventory().kept,
      releasedTotal: inventory().released,
      saveStatus: inventory().saveStatus,
      message,
    }),
  };
}
