import {
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Plane,
  Raycaster,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import { farmCursors } from '../farming/farmCursor';
import { WL } from '../../config/world';
import type { createFarm } from '../farming/createFarm';
import type { createFishing } from '../environment/createFishing';
import type { SceneRuntime } from '@visual/scene-kit';
import type { VillageStore } from '../../state/villageStore';
import type { CameraController, FocusTarget, Landmark } from './createCameraController';

export function bindInput(
  runtime: SceneRuntime,
  store: VillageStore,
  controls: CameraController,
  villagers: FocusTarget[],
  landmarks: Landmark[],
  fishing?: ReturnType<typeof createFishing>,
  farm?: ReturnType<typeof createFarm>,
) {
  const { renderer, camera, scene, lifetime } = runtime,
    canvas = renderer.domElement;
  const targets: Object3D[] = villagers.map((v) => v.root);
  for (const landmark of landmarks) {
    const proxy = new Mesh(new SphereGeometry(7, 8, 6), new MeshBasicMaterial({ visible: false }));
    proxy.position.copy(landmark.tg);
    proxy.userData.landmark = landmark;
    scene.add(proxy);
    targets.push(proxy);
  }
  const ray = new Raycaster(),
    position = new Vector2();
  const pointers = new Map<number, { x: number; y: number; button: number }>();
  let movement = 0,
    pinchDistance = 0,
    multitouch = false,
    hovered: FocusTarget | null = null;
  let pinchCenter: { x: number; y: number } | null = null;
  const hitAt = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    position.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    ray.setFromCamera(position, camera);
    for (const hit of ray.intersectObjects(targets, true)) {
      const { v, landmark } = hit.object.userData;
      if (v || landmark)
        return { v: v as FocusTarget | undefined, landmark: landmark as Landmark | undefined };
    }
    return null;
  };
  lifetime.listen(canvas, 'pointerdown', (event) => {
    canvas.focus();
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, button: event.button });
    if (pointers.size === 1) {
      movement = 0;
      multitouch = false;
    }
    if (pointers.size > 1) {
      multitouch = true;
      const [a, b] = [...pointers.values()];
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      pinchCenter = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    if (store.getSnapshot().fishing || store.getSnapshot().farm) return;
    controls.interrupt();
    controls.fadeTip();
  });
  lifetime.listen(canvas, 'pointermove', (event) => {
    const pointer = pointers.get(event.pointerId);
    if (store.getSnapshot().fishing || store.getSnapshot().farm) {
      if (store.getSnapshot().farm) {
        hitAt(event);
        const target = farm?.hover(ray.ray);
        canvas.style.cursor =
          target && !target.allowed ? 'not-allowed' : farmCursors[store.getSnapshot().farm!.tool];
        store.set({
          hover:
            target && event.pointerType === 'mouse'
              ? {
                  name: target.label,
                  x: Math.min(event.clientX + 18, window.innerWidth - 220),
                  y: event.clientY + 20,
                }
              : null,
        });
      }
      if (pointer) {
        movement += Math.abs(event.clientX - pointer.x) + Math.abs(event.clientY - pointer.y);
        pointer.x = event.clientX;
        pointer.y = event.clientY;
      }
      return;
    }
    if (!pointer) {
      if (event.pointerType !== 'mouse') return;
      const hit = hitAt(event);
      hovered = hit?.v || null;
      store.set({
        hover: hit
          ? { name: hit.v?.nm || hit.landmark!.n, x: event.clientX + 14, y: event.clientY + 14 }
          : null,
      });
      canvas.style.cursor = hit ? 'pointer' : 'grab';
      return;
    }
    const dx = event.clientX - pointer.x,
      dy = event.clientY - pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    movement += Math.abs(dx) + Math.abs(dy);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()],
        distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance && distance) controls.zoom(pinchDistance / distance);
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (pinchCenter) controls.drag(center.x - pinchCenter.x, center.y - pinchCenter.y, true);
      pinchCenter = center;
      pinchDistance = distance;
      return;
    }
    controls.drag(dx, dy, pointer.button === 2 || pointer.button === 1 || event.shiftKey);
  });
  const release = (event: PointerEvent) => {
    const pointer = pointers.get(event.pointerId);
    pointers.delete(event.pointerId);
    pinchDistance = 0;
    pinchCenter = null;
    if (
      pointer?.button === 0 &&
      !multitouch &&
      movement < 6 &&
      !pointers.size &&
      event.type === 'pointerup' &&
      store.getSnapshot().mode !== 'walk'
    ) {
      if (store.getSnapshot().farm) {
        if (!store.getSnapshot().paused) {
          hitAt(event);
          farm?.pick(ray.ray);
        }
        return;
      }
      if (store.getSnapshot().fishing) {
        if (!store.getSnapshot().paused) {
          hitAt(event);
          const point = ray.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), -WL), new Vector3());
          if (point) fishing?.aimAt(point);
        }
        return;
      }
      const hit = hitAt(event);
      controls.select(hit?.v, hit?.landmark);
    }
  };
  lifetime.listen(canvas, 'pointerup', release);
  lifetime.listen(canvas, 'pointercancel', release);
  lifetime.listen(canvas, 'lostpointercapture', (event) => {
    pointers.delete(event.pointerId);
  });
  lifetime.listen(canvas, 'pointerleave', () => {
    hovered = null;
    farm?.hover();
    store.set({ hover: null });
  });
  lifetime.listen(canvas, 'contextmenu', (event) => event.preventDefault());
  lifetime.listen(
    canvas,
    'wheel',
    (event) => {
      event.preventDefault();
      if (store.getSnapshot().fishing || store.getSnapshot().farm) return;
      controls.interrupt();
      controls.fadeTip();
      controls.zoom(Math.exp(event.deltaY * 0.0012));
    },
    { passive: false },
  );
  lifetime.listen(window, 'keydown', (event) => {
    if (
      event.target instanceof HTMLElement &&
      (event.target.matches('input,textarea,select') || event.target.isContentEditable)
    )
      return;
    const key = event.key.toLowerCase();
    const garden = store.getSnapshot().farm;
    if (garden) {
      if (key === 'escape') {
        store.dispatch({
          type: 'farm',
          action: garden.view === 'field' ? { kind: 'exit' } : { kind: 'view', view: 'field' },
        });
        return;
      }
      if (key === 'p' && !event.repeat) {
        store.dispatch({ type: 'pause' });
        return;
      }
      if (event.target instanceof HTMLElement && event.target.closest('button')) return;
      if (key === ' ') {
        event.preventDefault();
        if (!event.repeat)
          store.dispatch({ type: 'farm', action: { kind: 'use', bed: garden.selected } });
      }
      return;
    }
    const fish = store.getSnapshot().fishing;
    if (fish) {
      if (key === 'escape') {
        store.dispatch({ type: 'fishing', action: 'exit' });
        return;
      }
      if (key === 'p' && !event.repeat) {
        store.dispatch({ type: 'pause' });
        return;
      }
      if (event.target instanceof HTMLElement && event.target.closest('button')) return;
      if (key === ' ') {
        event.preventDefault();
        if (!event.repeat)
          store.dispatch({
            type: 'fishing',
            action:
              fish.stage === 'bite' || fish.stage === 'waiting'
                ? 'hook'
                : fish.stage === 'landable'
                  ? 'land'
                  : fish.stage === 'fighting'
                    ? 'reel'
                    : fish.stage === 'caught'
                      ? 'keep'
                      : fish.stage === 'escaped'
                        ? 'retry'
                        : 'cast',
          });
      }
      return;
    }
    if (key.startsWith('arrow')) event.preventDefault();
    if (event.repeat && ['h', 'p', 'v', 'escape'].includes(key)) return;
    controls.keys[key] = true;
    if (key === 'escape') controls.escape();
    if (key === 'h') store.dispatch({ type: 'hide' });
    if (key === 'p') store.dispatch({ type: 'pause' });
    if (key === 'v') store.dispatch({ type: 'shot' });
    if (
      ['w', 'a', 's', 'd'].includes(key) &&
      ['tour', 'opening'].includes(store.getSnapshot().mode)
    )
      controls.interrupt();
  });
  lifetime.listen(window, 'keyup', (event) => {
    controls.keys[event.key.toLowerCase()] = false;
  });
  lifetime.listen(window, 'blur', () => {
    fishing?.action('cancel');
    if (store.getSnapshot().farm) store.set({ paused: true });
    controls.clearKeys();
    pointers.clear();
    pinchDistance = 0;
    pinchCenter = null;
  });
  lifetime.listen(document, 'visibilitychange', () => {
    fishing?.action('cancel');
    if (document.hidden && (store.getSnapshot().fishing || store.getSnapshot().farm))
      store.set({ paused: true });
    controls.clearKeys();
    pointers.clear();
    pinchDistance = 0;
    pinchCenter = null;
  });
  let previousFarm = store.getSnapshot().farm;
  lifetime.defer(
    store.subscribe(() => {
      const next = store.getSnapshot().farm;
      if (next?.tool !== previousFarm?.tool || !!next !== !!previousFarm) {
        canvas.style.cursor = next ? farmCursors[next.tool] : 'grab';
      }
      previousFarm = next;
    }),
  );
  return { getHovered: () => hovered };
}
