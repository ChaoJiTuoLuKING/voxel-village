import { CatmullRomCurve3, Object3D, Vector3 } from 'three';
import gsap from 'gsap';
import type { SceneRuntime } from '@visual/scene-kit';
import type { CameraMode, VillageStore } from '../../state/villageStore';
import { cl } from '../../world/math';
import { terrainHeight } from '../../world/terrain.ts';
import { farmCenter } from '../farming/farmLayout';
import { fishingPiers } from '../../config/settlement';
import { WL } from '../../config/world';
import {
  cameraPresets,
  tourPositions,
  tourTargets,
  walkSpawn,
  openingDuration,
  waterfallArrival,
} from './presets';
import { createOpeningFlight } from './openingFlight';

export interface FocusTarget {
  nm: string;
  root: Object3D;
  act?: string;
}
export interface Landmark {
  n: string;
  tg: Vector3;
  d: number;
  th: number;
  ph: number;
}
interface WalkWorld {
  ground(x: number, z: number): number;
  M: Map<number, number>;
  K(i: number, y: number, j: number): number;
}

export function createCameraController(
  runtime: SceneRuntime,
  world: WalkWorld,
  store: VillageStore,
  surfaceHeight: (x: number, z: number) => number = terrainHeight,
) {
  const { camera, lifetime } = runtime;
  const initial = cameraPresets[0];
  const cur = { ...initial },
    goal = { ...initial };
  const walk = { ...walkSpawn };
  const keys: Record<string, boolean> = {};
  const points = (values: number[][]) => values.map((p) => new Vector3(p[0], p[1], p[2]));
  const positionCurve = new CatmullRomCurve3(points(tourPositions), true, 'catmullrom', 0.5);
  const targetCurve = new CatmullRomCurve3(points(tourTargets), true, 'catmullrom', 0.5);
  const openingFlight = createOpeningFlight();
  const activeTarget = new Vector3(initial.x, initial.y, initial.z);
  let openingTime = 0;
  let beforeFishing: typeof cur | null = null;
  let beforeFarm: typeof cur | null = null;
  const forward = new Vector3();
  let focus: FocusTarget | null = null,
    tour = 0,
    shot = 0;
  let tipTimer: ReturnType<typeof setTimeout> | undefined;
  const tip = (text: string) => {
    clearTimeout(tipTimer);
    store.set({ tip: text });
    tipTimer = setTimeout(() => store.set({ tip: '' }), 5000);
  };
  const clearFocus = () => {
    focus = null;
    store.set({ focus: null });
  };
  const cancelTween = () => gsap.killTweensOf(goal);
  const toFree = (mode: 'free' | 'explore' = 'free') => {
    const target = activeTarget,
      delta = camera.position.clone().sub(target),
      length = delta.length();
    Object.assign(cur, {
      x: target.x,
      y: target.y,
      z: target.z,
      d: cl(length, 2.5, 380),
      ph: cl(Math.acos(delta.y / Math.max(length, 0.001)), 0.06, 2.55),
      th: Math.atan2(delta.x, delta.z),
      fov: camera.fov,
    });
    Object.assign(goal, cur);
    store.set({ mode });
  };
  const setMode = (mode: CameraMode) => {
    cancelTween();
    clearFocus();
    store.set({ hover: null });
    const previous = store.getSnapshot().mode;
    if (mode === 'free' || mode === 'explore') {
      if (
        previous === 'tour' ||
        previous === 'opening' ||
        ((previous === 'free' || previous === 'explore') && previous !== mode)
      )
        toFree(mode);
      else if (previous === 'walk' && mode === 'explore') {
        camera.getWorldDirection(forward);
        activeTarget.copy(camera.position).addScaledVector(forward, 18);
        toFree(mode);
      } else if (previous === 'walk') {
        Object.assign(goal, initial);
        Object.assign(cur, initial);
      }
      if (mode === 'explore')
        tip('自由视角 · 拖拽旋转 · 滚轮缩放 · 右键平移 · WASD 移动 · Q/E 升降');
    } else if (mode === 'walk') {
      Object.assign(walk, walkSpawn);
      tip('WASD / 方向键移动 · 拖拽转向 · Shift 加速 · Esc 返回全景');
    } else if (mode === 'opening') {
      openingTime = 0;
      store.set({ paused: false });
      tip('越岭入村 · 沿溪观瀑 · 拖拽可接管 · Esc 跳过开场');
    } else {
      tour = 0;
      tip('自动导览中 · 拖拽或滚轮即可接管');
    }
    store.set({ mode });
  };
  const interrupt = () => {
    cancelTween();
    if (['tour', 'opening'].includes(store.getSnapshot().mode)) toFree();
  };
  const transition = (value: Partial<typeof goal>) => {
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0.9;
    gsap.to(goal, { ...value, duration, ease: 'power2.inOut', overwrite: true });
  };
  const zoom = (factor: number) => {
    cancelTween();
    const explore = store.getSnapshot().mode === 'explore';
    goal.d = cl(goal.d * factor, explore ? 2.5 : 10, 380);
  };
  const elevate = (amount: number) => {
    cancelTween();
    clearFocus();
    goal.y = cl(goal.y + amount, WL + 0.5, 260);
  };
  lifetime.defer(
    store.onCommand((command) => {
      if (
        command.type === 'fishing' &&
        command.action === 'enter' &&
        !store.getSnapshot().fishing &&
        !store.getSnapshot().farm
      ) {
        if (store.getSnapshot().mode === 'walk') {
          camera.getWorldDirection(forward);
          activeTarget.copy(camera.position).addScaledVector(forward, 18);
          toFree();
        }
        setMode('free');
        // Tour/opening use their live camera, rather than the last stored orbit.
        beforeFishing = { ...cur };
        for (const key in keys) keys[key] = false;
        const pier = fishingPiers[0];
        transition({
          x: pier.x,
          y: 4.8,
          z: pier.z + pier.length + 2.2,
          d: camera.aspect < 0.9 ? 28 : 16,
          th: 1.35,
          ph: 1.12,
          fov: 50,
        });
        store.set({ paused: false, hidden: false, tip: '', hover: null });
      }
      if (command.type === 'fishing' && command.action === 'exit' && beforeFishing) {
        transition(beforeFishing);
        beforeFishing = null;
      }
      if (
        command.type === 'farm' &&
        command.action.kind === 'enter' &&
        !store.getSnapshot().farm &&
        !store.getSnapshot().fishing
      ) {
        if (store.getSnapshot().mode === 'walk') {
          camera.getWorldDirection(forward);
          activeTarget.copy(camera.position).addScaledVector(forward, 18);
          toFree();
        }
        setMode('free');
        beforeFarm = { ...cur };
        for (const key in keys) keys[key] = false;
        transition({
          x: farmCenter.x,
          y: surfaceHeight(farmCenter.x, farmCenter.z) + 0.6,
          z: farmCenter.z + 2.2,
          d: camera.aspect < 0.9 ? Math.max(28, 18 / camera.aspect) : 17,
          th: -0.18,
          ph: 0.7,
          fov: 50,
        });
        store.set({ paused: false, hidden: false, tip: '', hover: null });
      }
      if (command.type === 'farm' && command.action.kind === 'exit' && beforeFarm) {
        transition(beforeFarm);
        beforeFarm = null;
      }
      if (command.type === 'mode') setMode(command.value);
      if (command.type === 'close') clearFocus();
      if (command.type === 'pause') store.set({ paused: !store.getSnapshot().paused });
      if (command.type === 'hide') store.set({ hidden: !store.getSnapshot().hidden });
      if (command.type === 'day') store.set({ dusk: !store.getSnapshot().dusk });
      if (command.type === 'zoom') {
        interrupt();
        zoom(command.factor);
      }
      if (command.type === 'elevate') elevate(command.amount);
      if (command.type === 'reset') {
        shot = 0;
        setMode('free');
        store.set({ hover: null });
        transition(initial);
      }
      if (command.type === 'shot') {
        setMode(store.getSnapshot().mode === 'explore' ? 'explore' : 'free');
        shot =
          command.index === undefined
            ? (shot + 1) % cameraPresets.length
            : cl(Math.round(command.index), 0, cameraPresets.length - 1);
        const { name, ...position } = cameraPresets[shot];
        transition(position);
        tip(name);
      }
    }),
  );
  lifetime.defer(() => {
    clearTimeout(tipTimer);
    cancelTween();
  });
  tip(store.getSnapshot().tip);

  function update(delta: number, simulationDelta: number) {
    const mode = store.getSnapshot().mode;
    if (store.getSnapshot().fishing) goal.d = camera.aspect < 0.9 ? 28 : 16;
    if (store.getSnapshot().farm) {
      goal.d = camera.aspect < 0.9 ? Math.max(28, 18 / camera.aspect) : 17;
      const landscape = runtime.size.height < 580 && camera.aspect > 1.1;
      goal.x = farmCenter.x + (landscape ? 5 : 0);
      goal.z = farmCenter.z + (landscape ? 1 : 2.2);
    }
    if (focus) {
      const worldPosition = focus.root.getWorldPosition(forward);
      goal.x = worldPosition.x;
      goal.y = worldPosition.y + 1.4;
      goal.z = worldPosition.z;
      const previous = store.getSnapshot().focus;
      if (previous?.name !== focus.nm || previous?.action !== (focus.act || ''))
        store.set({ focus: { name: focus.nm, action: focus.act || '' } });
    }
    if (mode === 'free' || mode === 'explore') {
      if (mode === 'explore') {
        const f = Number(!!(keys.w || keys.arrowup)) - Number(!!(keys.s || keys.arrowdown));
        const r = Number(!!(keys.d || keys.arrowright)) - Number(!!(keys.a || keys.arrowleft));
        const up = Number(!!keys.e) - Number(!!keys.q);
        if (f || r || up) {
          cancelTween();
          clearFocus();
          const speed = cl(goal.d * 0.22, 3, 45) * (keys.shift ? 2.5 : 1) * delta;
          const length = Math.hypot(f, r, up);
          goal.x = cl(
            goal.x + ((-Math.sin(cur.th) * f + Math.cos(cur.th) * r) * speed) / length,
            -180,
            180,
          );
          goal.z = cl(
            goal.z + ((-Math.cos(cur.th) * f - Math.sin(cur.th) * r) * speed) / length,
            -180,
            180,
          );
          goal.y = cl(goal.y + (up * speed) / length, WL + 0.5, 260);
        }
      }
      const factor = 1 - Math.exp(-delta * 8);
      for (const key of ['x', 'y', 'z', 'th', 'ph', 'd', 'fov'] as const)
        cur[key] += (goal[key] - cur[key]) * factor;
      const sin = Math.sin(cur.ph);
      camera.position.set(
        cur.x + cur.d * sin * Math.sin(cur.th),
        cur.y + cur.d * Math.cos(cur.ph),
        cur.z + cur.d * sin * Math.cos(cur.th),
      );
      camera.position.y = Math.max(
        camera.position.y,
        surfaceHeight(camera.position.x, camera.position.z) + 3,
      );
      camera.lookAt(cur.x, cur.y, cur.z);
      activeTarget.set(cur.x, cur.y, cur.z);
      camera.fov = cur.fov;
    } else if (mode === 'opening') {
      openingTime = Math.min(openingDuration, openingTime + simulationDelta);
      const t = openingTime / openingDuration;
      camera.fov = 62 - 12 * Math.min(1, t / 0.75);
      openingFlight.sample(t, camera.position, activeTarget);
      camera.lookAt(activeTarget);
      if (t >= 1) {
        Object.assign(cur, waterfallArrival);
        Object.assign(goal, waterfallArrival);
        cur.fov = goal.fov = 50;
        store.set({ mode: 'free', tip: '' });
      }
    } else if (mode === 'tour') {
      camera.fov = 50;
      tour = (tour + simulationDelta / 110) % 1;
      camera.position.copy(positionCurve.getPoint(tour));
      camera.position.y = Math.max(
        camera.position.y,
        surfaceHeight(camera.position.x, camera.position.z) + 3,
      );
      activeTarget.copy(targetCurve.getPoint(tour));
      camera.lookAt(activeTarget);
    } else {
      camera.fov = 50;
      const speed = 6 * (keys.shift ? 2.2 : 1) * delta;
      const f = Number(!!(keys.w || keys.arrowup)) - Number(!!(keys.s || keys.arrowdown));
      const r = Number(!!(keys.d || keys.arrowright)) - Number(!!(keys.a || keys.arrowleft));
      if (f || r) {
        forward
          .set(
            -Math.sin(walk.a) * f + Math.cos(walk.a) * r,
            0,
            -Math.cos(walk.a) * f - Math.sin(walk.a) * r,
          )
          .normalize()
          .multiplyScalar(speed);
        for (const [dx, dz] of [
          [forward.x, 0],
          [0, forward.z],
        ]) {
          const x = walk.x + dx,
            z = walk.z + dz,
            ground = world.ground(x, z),
            currentGround = world.ground(walk.x, walk.z);
          const i = Math.round(x + 64),
            j = Math.round(z + 64),
            y = Math.round(ground + 0.5);
          const blocked = [0, 1, 2].some((offset) => world.M.has(world.K(i, y + offset, j)));
          if (
            ground >= WL + 0.2 &&
            ground - currentGround <= 2 &&
            !blocked &&
            Math.abs(x) < 62 &&
            Math.abs(z) < 62
          ) {
            walk.x = x;
            walk.z = z;
          }
        }
      }
      const y = world.ground(walk.x, walk.z) + 2.6;
      camera.position.y += (y - camera.position.y) * Math.min(1, delta * 10);
      if (Math.abs(camera.position.y - y) > 8) camera.position.y = y;
      camera.position.x = walk.x;
      camera.position.z = walk.z;
      camera.rotation.order = 'YXZ';
      camera.rotation.set(walk.p, walk.a, 0);
    }
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setMode('opening');
  update(1, 0);
  return {
    update,
    keys,
    setMode,
    interrupt,
    getDistance: () => cur.d,
    isSettled: () =>
      (['x', 'y', 'z', 'd', 'th', 'ph', 'fov'] as const).every(
        (key) => Math.abs(cur[key] - goal[key]) < (key === 'th' || key === 'ph' ? 0.0001 : 0.02),
      ),
    getLookElevation: () => Math.asin(camera.getWorldDirection(forward).y) * (180 / Math.PI),
    getOpeningProgress: () => openingTime / openingDuration,
    fadeTip: () => store.set({ tip: '' }),
    clearKeys: () => {
      for (const key in keys) keys[key] = false;
    },
    escape: () => {
      if (focus) clearFocus();
      else setMode('free');
    },
    drag(dx: number, dy: number, pan: boolean) {
      if (store.getSnapshot().mode === 'walk') {
        walk.a -= dx * 0.005;
        walk.p = cl(walk.p - dy * 0.005, -1.2, 1.2);
      } else if (pan) {
        const scale = goal.d * 0.0016,
          sin = Math.sin(goal.th),
          cos = Math.cos(goal.th);
        const limit = 180;
        goal.x = cl(goal.x - dx * scale * cos - dy * scale * sin, -limit, limit);
        goal.z = cl(goal.z + dx * scale * sin - dy * scale * cos, -limit, limit);
        clearFocus();
      } else {
        goal.th -= dx * 0.006;
        const explore = store.getSnapshot().mode === 'explore';
        goal.ph = cl(goal.ph - dy * 0.005, explore ? 0.06 : 0.25, 2.55);
      }
    },
    zoom,
    select(villager?: FocusTarget, landmark?: Landmark) {
      interrupt();
      if (villager) {
        if (focus === villager) clearFocus();
        else {
          focus = villager;
          transition({ d: 13, ph: 1.1 });
        }
      } else {
        clearFocus();
        if (landmark)
          transition({
            x: landmark.tg.x,
            y: landmark.tg.y,
            z: landmark.tg.z,
            d: landmark.d,
            th: landmark.th,
            ph: landmark.ph,
          });
      }
    },
  };
}
export type CameraController = ReturnType<typeof createCameraController>;
