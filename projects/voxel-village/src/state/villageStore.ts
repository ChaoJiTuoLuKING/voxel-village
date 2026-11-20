import type { FarmAction, FarmSnapshot } from '../features/farming/farmState';
import type { FishingAction, FishingSnapshot } from '../features/environment/fishingState';
export type CameraMode = 'free' | 'explore' | 'walk' | 'tour' | 'opening';
export type Command =
  | { type: 'fishing'; action: FishingAction }
  | { type: 'farm'; action: FarmAction }
  | { type: 'mode'; value: CameraMode }
  | { type: 'shot'; index?: number }
  | { type: 'zoom'; factor: number }
  | { type: 'elevate'; amount: number }
  | { type: 'pause' | 'day' | 'reset' | 'hide' | 'close' };
export interface VillageState {
  mode: CameraMode;
  paused: boolean;
  dusk: boolean;
  hidden: boolean;
  tip: string;
  focus: { name: string; action: string } | null;
  hover: { name: string; x: number; y: number } | null;
  fishing: FishingSnapshot | null;
  farm: FarmSnapshot | null;
}
export function createVillageStore() {
  let state: VillageState = {
    mode: 'free',
    paused: false,
    dusk: false,
    hidden: false,
    tip: '拖拽旋转 · 滚轮缩放 · 右键 / Shift 拖拽平移 · 点击村民或地标',
    focus: null,
    fishing: null,
    farm: null,
    hover: null,
  };
  const listeners = new Set<() => void>();
  const commands = new Set<(command: Command) => void>();
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(patch: Partial<VillageState>) {
      if (
        Object.entries(patch).every(([key, value]) =>
          Object.is(state[key as keyof VillageState], value),
        )
      )
        return;
      state = { ...state, ...patch };
      listeners.forEach((listener) => listener());
    },
    dispatch: (command: Command) => commands.forEach((listener) => listener(command)),
    onCommand: (listener: (command: Command) => void) => {
      commands.add(listener);
      return () => {
        commands.delete(listener);
      };
    },
  };
}
export type VillageStore = ReturnType<typeof createVillageStore>;
