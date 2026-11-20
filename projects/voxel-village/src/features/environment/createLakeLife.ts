import {
  BoxGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  Vector3,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  RingGeometry,
  MeshBasicMaterial,
  DoubleSide,
  type Scene,
} from 'three';
import { N, WL } from '../../config/world';
import { farmPlots } from '../../config/settlement';
import type { FocusTarget } from '../camera/createCameraController';
import type { createWorld } from '../../world/createWorld';

import { sampleRowingRoute } from './rowingRoute';
import { createSeatedActor } from './lakeActor';
import { createFishing } from './createFishing';
import { createFarm } from '../farming/createFarm';
import { playablePlot } from '../farming/farmLayout';
import { createVillageStore, type VillageStore } from '../../state/villageStore';

type Actor = FocusTarget & { arms: Group[]; torso: Group };

/** Shared geometry/materials keep the extra people and boats cheap to draw and dispose. */
export function createLakeLife(
  world: ReturnType<typeof createWorld>,
  scene: Scene,
  store: VillageStore = createVillageStore(),
) {
  const geometry = new BoxGeometry(1, 1, 1);
  const materials = new Map<number, MeshLambertMaterial>();
  function box(parent: Object3D, w: number, h: number, d: number, c: number, x = 0, y = 0, z = 0) {
    let material = materials.get(c);
    if (!material) {
      material = new MeshLambertMaterial({ color: c });
      materials.set(c, material);
    }
    const part = new Mesh(geometry, material);
    part.scale.set(w, h, d);
    part.position.set(x, y, z);
    part.castShadow = true;
    parent.add(part);
    return part;
  }
  const actors: FocusTarget[] = [];
  const animate: ((time: number) => void)[] = [];
  function person(name: string, action: string, color: number, seated: boolean) {
    const root = new Group(),
      torso = new Group();
    root.add(torso);
    box(torso, 0.86, 1, 0.55, color, 0, 1.36);
    box(torso, 0.67, 0.72, 0.67, 0xe1b78d, 0, 2.2);
    box(torso, 1.13, 0.13, 1.05, 0xc7a356, 0, 2.65);
    box(torso, 0.66, 0.28, 0.65, 0xc7a356, 0, 2.8);
    for (const x of [-0.24, 0.24]) {
      const leg = box(root, 0.36, 0.9, 0.4, 0x4d575d, x, 0.5, seated ? 0.32 : 0);
      if (seated) leg.rotation.x = -1.2;
    }
    const arms = [-0.58, 0.58].map((x) => {
      const arm = new Group();
      arm.position.set(x, 1.7, 0);
      torso.add(arm);
      box(arm, 0.29, 0.75, 0.32, color, 0, -0.3);
      box(arm, 0.28, 0.25, 0.3, 0xe1b78d, 0, -0.75);
      return arm;
    });
    const actor: Actor = { nm: name, act: action, root, arms, torso };
    actors.push(actor);
    return actor;
  }
  function ripple(parent: Object3D, radius: number) {
    const material = new MeshBasicMaterial({
      color: 0xd2e9dc,
      transparent: true,
      opacity: 0.3,
      side: DoubleSide,
      depthWrite: false,
    });
    const ring = new Mesh(new RingGeometry(radius, radius + 0.055, 24), material);
    ring.rotation.x = -Math.PI / 2;
    parent.add(ring);
    return ring;
  }
  const boats: Group[] = [];
  for (let q = 0; q < 5; q++) {
    const boat = new Group();
    boats.push(boat);
    scene.add(boat);
    const cells: { x: number; y: number; z: number; color: number }[] = [];
    for (let a = -5; a <= 5; a++)
      for (let b = -2; b <= 2; b++) {
        const end = Math.floor(5 - Math.abs(b) * 0.55);
        if (Math.abs(a) > end) continue;
        const edge = Math.abs(b) === 2 || Math.abs(a) >= end;
        for (let y = 0; y < (edge ? 3 : 1); y++)
          cells.push({
            x: a * 0.56,
            y: y * 0.28,
            z: b * 0.56,
            color: y === 2 ? 0xe8d4b1 : y === 1 ? [0x9f593e, 0x557e85, 0xc4964c][q % 3] : 0x735235,
          });
      }
    const hull = new InstancedMesh(geometry, new MeshLambertMaterial(), cells.length);
    const matrix = new Matrix4();
    cells.forEach((cell, i) => {
      matrix.makeScale(0.56, 0.28, 0.56).setPosition(cell.x, cell.y, cell.z);
      hull.setMatrixAt(i, matrix);
      hull.setColorAt(i, new Color(cell.color));
    });
    hull.castShadow = hull.receiveShadow = true;
    boat.add(hull);
    for (const x of [-1, 1]) box(boat, 0.35, 0.17, 1.95, 0xb58b57, x, 0.68);
    if (q < 3) {
      const rower = createSeatedActor(
        box,
        ['阿舟', '小荷', '望山'][q],
        [0x537b93, 0xb66447, 0x708953][q],
        '在湖上划船',
      );
      actors.push(rower);
      rower.root.position.set(1, 0.805, 0);
      rower.root.rotation.y = -Math.PI / 2;
      boat.add(rower.root);
      const oars = [-1, 1].map((side) => {
        // An actual oarlock on the gunwale supports each shaft.
        box(boat, 0.2, 0.23, 0.2, 0x656659, 0.45, 0.8, side * 1.18);
        const pivot = new Group();
        pivot.name = `oar-${side}`;
        pivot.position.set(0.45, 0.87, side * 1.18);
        pivot.rotation.order = 'YXZ';
        boat.add(pivot);
        box(pivot, 0.1, 0.11, 2.9, 0x976d3d, 0, 0, side * 0.55);
        const blade = box(pivot, 0.38, 0.12, 1, 0xb5935e, 0, 0, side * 2.25);
        blade.name = 'oar-blade';
        return { pivot, blade, side };
      });
      const wakes = Array.from({ length: 9 }, () => ripple(scene, 0.5));
      const splashes = Array.from({ length: 8 }, () => ({ ring: ripple(scene, 0.2), born: -100 }));
      let splashIndex = 0,
        lastSplash = -1;
      const route = (t: number) => sampleRowingRoute(t, q);
      const ease = (n: number) => {
        const p = Math.max(0, Math.min(1, n));
        return p * p * (3 - 2 * p);
      };
      animate.push((t) => {
        const phase = t * 2.15 + q * 2,
          p = (((phase / (Math.PI * 2)) % 1) + 1) % 1;
        const sweep = p < 0.52 ? -0.5 + ease(p / 0.52) : 0.5 - ease((p - 0.52) / 0.48);
        const dip =
          0.5 * ease(p / 0.12) * (1 - ease((p - 0.43) / 0.14)) -
          0.075 * ease((p - 0.58) / 0.12) * (1 - ease((p - 0.88) / 0.12));
        const point = route(t);
        boat.position.set(point.x, WL + 0.08 + Math.sin(phase) * 0.025, point.z);
        boat.rotation.set(Math.sin(phase) * 0.006, point.heading, Math.sin(phase) * 0.009);
        rower.torso.rotation.x = sweep * 0.23;
        oars.forEach(({ pivot, side }) => {
          pivot.rotation.y = sweep * side;
          pivot.rotation.x = dip * side;
        });
        boat.updateWorldMatrix(true, true);
        // Match each shoulder to its own side of the boat.
        const grips = oars.map(({ pivot, side }) =>
          pivot.localToWorld(new Vector3(0, 0, -side * 0.85)),
        );
        rower.grip(grips);
        wakes.forEach((ring, k) => {
          const born = Math.floor(t / 0.65) * 0.65 - k * 0.65;
          const age = t - born,
            old = route(Math.max(0, born));
          ring.visible = born >= 0;
          ring.position.set(
            old.x - Math.cos(old.heading) * 3.1,
            WL + 0.035,
            old.z + Math.sin(old.heading) * 3.1,
          );
          ring.scale.setScalar(0.65 + age * 0.3);
          ring.material.opacity = Math.max(0, 1 - age / 5.85) * 0.16;
        });
        if (t - lastSplash > 0.32) {
          oars.forEach(({ blade }) => {
            const point = blade.getWorldPosition(new Vector3());
            if (point.y > WL + 0.07) return;
            const splash = splashes[splashIndex++ % splashes.length];
            splash.born = t;
            splash.ring.position.set(point.x, WL + 0.045, point.z);
          });
          lastSplash = t;
        }
        splashes.forEach(({ ring, born }) => {
          const age = t - born;
          ring.visible = age < 1.2;
          ring.scale.setScalar(1 + age * 2.5);
          ring.material.opacity = Math.max(0, 1 - age / 1.2) * 0.42;
        });
      });
    } else {
      if (q === 4) {
        box(boat, 0.12, 6, 0.12, 0x755435, 0, 3.15);
        for (let k = 0; k < 9; k++) {
          const width = 2.7 - k * 0.27;
          box(boat, width, 0.49, 0.07, k % 2 ? 0xc0644a : 0xeee3c9, width / 2, 1.3 + k * 0.49);
        }
      }
      animate.push((t) => {
        boat.position.set(q === 3 ? 16 : -9, WL + 0.05 + Math.sin(t + q) * 0.1, q === 3 ? 41 : 43);
        boat.rotation.set(0, q === 3 ? -0.3 : 0.4, Math.sin(t * 0.8 + q) * 0.04);
      });
    }
  }
  const fishing = createFishing(scene, box, store);
  actors.push(...fishing.actors);
  animate.push(fishing.update);
  const farm = createFarm(scene, box, store, world.Hm[playablePlot.x * N + playablePlot.z] - 0.5);
  animate.push(farm.update);
  for (const [i, plot] of farmPlots.entries()) {
    if (i === 1) {
      actors.push(farm.actor);
      continue;
    }
    const farmer = person(
      ['阿稻', '青菜婶', '麦叔', '紫苏', '阿苗', '春兰'][i],
      '在田间照料庄稼',
      [0xb77d44, 0x687d50, 0x617e94][i % 3],
      false,
    );
    const x = plot.x - 63.3,
      z = plot.z - 63;
    farmer.root.position.set(x, world.ground(x, z) + 0.2, z);
    scene.add(farmer.root);
    const hoe = box(farmer.arms[1], 0.09, 1.9, 0.1, 0x89643e, 0, -0.9, 0.2);
    box(hoe, 3, 0.1, 4, 0x656d68, 0, -0.45, 0.12);
    animate.push((t) => {
      const motion = Math.sin(t * 1.1 + i * 1.7);
      farmer.torso.rotation.x = 0.2 + motion * 0.18;
      farmer.arms.forEach((arm) => {
        arm.rotation.x = -0.55 + motion * 0.4;
      });
    });
  }
  for (const actor of actors)
    actor.root.traverse((part) => {
      part.userData.v = actor;
    });
  const update = (time: number) => animate.forEach((fn) => fn(time));
  update(0);
  return { actors, boats, update, fishing, farm };
}
