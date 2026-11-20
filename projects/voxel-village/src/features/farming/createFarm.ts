import {
  Color,
  Raycaster,
  Group,
  MeshLambertMaterial,
  Plane,
  Vector3,
  type Ray,
  type Scene,
} from 'three';
import type { createFarmPersistence } from './farmSave';
import type { VillageStore } from '../../state/villageStore';
import type { LakeBox } from '../environment/lakeActor';
import { createGardener } from './createGardener';
import { bedCenters, farmCenter, frontLane, plantOffsets, workPosition } from './farmLayout';
import { createFarmState, crops, type Crop, type FarmAction } from './farmState';
import { sm } from '../../world/math';

const mix = (a: Vector3, b: Vector3, t: number) => a.clone().lerp(b, Math.max(0, Math.min(1, t)));
const basketSlots = [
  [-0.4, -0.32],
  [0.4, -0.32],
  [0, 0.4],
] as const;
const basketHeight = (kind: Crop) => (kind === 'radish' ? 0.41 : kind === 'tomato' ? 0.265 : 0.355);
export function createFarm(scene: Scene, box: LakeBox, store: VillageStore, ground: number) {
  const machine = createFarmState(),
    field = new Group();
  field.name = 'interactive-garden';
  scene.add(field);
  field.position.y = ground;
  box(field, 10, 0.1, 8, 0xa89770, farmCenter.x, 0.05, farmCenter.z);
  // Open front gate and broad working alleys; no ambient farmer or old crops inside this plot.
  for (const x of [farmCenter.x - 5.1, farmCenter.x + 5.1])
    for (const z of [farmCenter.z - 2.4, farmCenter.z, farmCenter.z + 3.7])
      box(field, 0.17, 0.85, 0.17, 0x987b50, x, 0.425, z);
  for (const x of [farmCenter.x - 5.1, farmCenter.x + 5.1])
    box(field, 0.12, 0.12, 6.1, 0xc3a878, x, 0.58, farmCenter.z + 0.65);
  box(field, 10.2, 0.12, 0.12, 0xc3a878, farmCenter.x, 0.58, farmCenter.z + 3.7);
  const actor = createGardener(box);
  scene.add(actor.root);
  actor.root.position.set(workPosition(0).x, ground, frontLane);
  actor.root.rotation.y = Math.PI / 2;
  let hoveredBed = -1;
  const beds = bedCenters.map((p, i) => {
    const root = new Group();
    root.position.set(p.x, 0.2, p.z);
    field.add(root);
    const soil = box(root, 1.8, 0.22, 3.0, 0x735033 + i, 0, -0.1, 0);
    const ridges = [-0.59, 0, 0.59].map((x) =>
      box(root, 0.38, 0.09, 2.85, 0x805b39 + i, x, 0.035, 0),
    );
    for (let k = 0; k < 22; k++) {
      const crumb = box(
        root,
        0.05 + (k % 3) * 0.025,
        0.035,
        0.08,
        k % 2 ? 0x97714a : 0x5b412c,
        Math.sin(k * 12.7 + i) * 0.8,
        0.075,
        Math.cos(k * 7.3) * 1.4,
      );
      crumb.rotation.y = k * 1.7;
    }
    for (const x of [-0.98, 0.98]) box(root, 0.14, 0.28, 3.22, 0x98764e, x, -0.03, 0);
    for (const z of [-1.56, 1.56]) box(root, 2.1, 0.28, 0.14, 0xb18a58, 0, -0.03, z);
    const highlight = new Group();
    root.add(highlight);
    for (const x of [-1.04, 1.04]) box(highlight, 0.055, 0.045, 3.35, 0xe4cb86, x, 0.15, 0);
    for (const z of [-1.65, 1.65]) box(highlight, 2.1, 0.045, 0.055, 0xe4cb86, 0, 0.15, z);
    const basket = new Group();
    field.add(basket);
    basket.position.set(p.x, 0.12, frontLane + 1.25);
    box(basket, 1.6, 0.12, 1.6, 0x9a7446, 0, 0.03, 0);
    for (const x of [-0.83, 0.83]) box(basket, 0.1, 0.4, 1.7, 0xb08d57, x, 0.23, 0);
    for (const z of [-0.83, 0.83]) box(basket, 1.7, 0.4, 0.1, 0xb08d57, 0, 0.23, z);
    box(root, 0.75, 0.38, 0.08, 0xd9c996, 0, 0.48, 1.7);
    for (let mark = 0; mark <= i; mark++)
      box(root, 0.065, 0.16, 0.09, 0x6f714c, -i * 0.1 + mark * 0.2, 0.48, 1.75);
    return {
      root,
      soil,
      ridges,
      highlight,
      basket,
      plants: [] as { root: Group; fruit: Group; leaves: Group }[],
      crop: '' as Crop | '',
      items: [] as Group[],
    };
  });
  function produce(kind: Crop, parent: Group) {
    const root = new Group();
    parent.add(root);
    if (kind === 'radish') {
      box(root, 0.29, 0.34, 0.29, 0xefddba, 0, 0, 0);
      box(root, 0.19, 0.18, 0.18, 0xeacba5, 0, -0.23, 0);
      box(root, 0.34, 0.12, 0.34, 0xce806a, 0, 0.18, 0);
      for (const x of [-0.12, 0, 0.12]) {
        const leaf = box(root, 0.13, 0.38, 0.11, 0x6d9244, x, 0.39, 0);
        leaf.rotation.z = x * 2;
      }
    } else if (kind === 'tomato') {
      box(root, 0.43, 0.33, 0.39, 0xce6545);
      box(root, 0.31, 0.39, 0.28, 0xd97752, 0, 0.02, 0);
      box(root, 0.24, 0.055, 0.22, 0x547a40, 0, 0.22, 0);
    } else {
      box(root, 0.61, 0.43, 0.54, 0xd29541);
      box(root, 0.43, 0.53, 0.6, 0xe4ad52);
      box(root, 0.66, 0.3, 0.35, 0xc88535);
      box(root, 0.11, 0.19, 0.12, 0x667047, 0, 0.34, 0);
    }
    return root;
  }
  function rebuild(index: number, kind: Crop) {
    const bed = beds[index]!;
    for (const plant of bed.plants) bed.root.remove(plant.root);
    // Meshes use the shared box geometry/material pool, owned by the scene lifetime.
    bed.plants = plantOffsets.map((offset) => {
      const root = new Group(),
        leaves = new Group();
      root.position.z = offset;
      bed.root.add(root);
      root.add(leaves);
      if (kind === 'tomato') {
        box(leaves, 0.08, 0.9, 0.08, 0x587440, 0, 0.45, 0);
        for (const sign of [-1, 1]) {
          const leaf = box(leaves, 0.42, 0.1, 0.22, 0x6e8e46, sign * 0.19, 0.58, 0);
          leaf.rotation.z = sign * 0.35;
        }
      } else if (kind === 'pumpkin') {
        box(leaves, 0.83, 0.07, 0.55, 0x608541, 0, 0.06, 0);
        box(leaves, 0.54, 0.08, 0.78, 0x7a984c, 0, 0.08, 0);
      }
      if (kind === 'radish') {
        for (let k = 0; k < 5; k++) {
          const leaf = box(
            leaves,
            0.12,
            0.36,
            0.06,
            k % 2 ? 0x789947 : 0x547c39,
            Math.sin(k * 2.4) * 0.12,
            0.2,
            Math.cos(k * 2.4) * 0.12,
          );
          leaf.rotation.z = Math.sin(k * 2.4) * 0.55;
          leaf.rotation.x = Math.cos(k * 2.4) * 0.55;
        }
      }
      const fruit = produce(kind, root);
      fruit.position.y = kind === 'tomato' ? 0.66 : kind === 'pumpkin' ? 0.28 : 0.02;
      return { root, fruit, leaves };
    });
    bed.crop = kind;
  }
  const held = new Group();
  field.add(held);
  const heldVariants = Object.fromEntries(
    (['radish', 'tomato', 'pumpkin'] as Crop[]).map((kind) => [kind, produce(kind, held)]),
  ) as Record<Crop, Group>;
  const can = new Group();
  field.add(can);
  box(can, 0.5, 0.5, 0.48, 0x7b9e98, 0, 0, 0);
  box(can, 0.55, 0.08, 0.52, 0x9fb8a8, 0, 0.26, 0);
  const spout = box(can, 0.14, 0.14, 0.65, 0xa3bab0, 0, 0.08, 0.46);
  spout.rotation.x = -0.12;
  box(can, 0.24, 0.16, 0.1, 0xc3ccba, 0, 0.12, 0.8);
  for (const x of [-0.34, 0.34]) box(can, 0.07, 0.45, 0.08, 0x557d77, x, 0.1, -0.08);
  box(can, 0.74, 0.08, 0.08, 0x6a9188, 0, 0.33, -0.08);
  const droplets = Array.from({ length: 15 }, () => box(field, 0.045, 0.1, 0.045, 0xadd3cf));
  const seeds = Array.from({ length: 3 }, () => box(field, 0.085, 0.08, 0.085, 0xd5b37b));
  let previousTime = 0,
    lastPublished = '';
  let persistence: ReturnType<typeof createFarmPersistence> | undefined;
  const stockShown = ['', '', ''];
  function publish() {
    const snapshot = machine.snapshot(),
      signature = machine.active ? JSON.stringify(snapshot) : 'off';
    if (signature !== lastPublished) {
      lastPublished = signature;
      store.set({ farm: machine.active ? snapshot : null });
    }
  }
  function action(a: FarmAction) {
    if (store.getSnapshot().paused && !['enter', 'exit', 'view', 'retry-save'].includes(a.kind))
      return;
    if (a.kind === 'enter' && store.getSnapshot().fishing) return;
    persistence?.sync();
    machine.action(a);
    persistence?.flush();
    if (a.kind === 'enter' || a.kind === 'exit' || a.kind === 'use') store.set({ hover: null });
    if (a.kind === 'exit') hoveredBed = -1;
    publish();
  }
  const cropRay = new Raycaster();
  function target(ray: Ray) {
    cropRay.ray.copy(ray);
    field.updateMatrixWorld(true);
    // Hit the visible crop first, so tall tomatoes are clickable at the fruit, not only at their roots.
    let nearest: { bed: number; item: number; distance: number } | null = null;
    beds.forEach((bed, index) =>
      bed.plants.forEach((plant, item) => {
        if (!plant.root.visible || !plant.fruit.visible) return;
        const point = cropRay.intersectObject(plant.root, true)[0]?.point;
        if (point && (!nearest || point.distanceTo(ray.origin) < nearest.distance))
          nearest = { bed: index, item, distance: point.distanceTo(ray.origin) };
      }),
    );
    if (nearest) return nearest as { bed: number; item: number };
    const hit = ray.intersectPlane(
      new Plane(new Vector3(0, 1, 0), -(ground + 0.26)),
      new Vector3(),
    );
    if (!hit) return null;
    const index = bedCenters.findIndex(
      (p) => Math.abs(hit.x - p.x) < 0.92 && Math.abs(hit.z - p.z) < 1.5,
    );
    if (index < 0) return null;
    const item = plantOffsets.reduce(
      (best, offset, i) =>
        Math.abs(hit.z - bedCenters[index]!.z - offset) <
        Math.abs(hit.z - bedCenters[index]!.z - plantOffsets[best]!)
          ? i
          : best,
      0,
    );
    return { bed: index, item };
  }
  function hover(ray?: Ray) {
    const hit = ray ? target(ray) : null;
    hoveredBed = hit?.bed ?? -1;
    if (!hit) return null;
    const reason = store.getSnapshot().paused
      ? '已暂停'
      : machine.reason(hit.bed, machine.tool === 'harvest' ? hit.item : undefined);
    return {
      ...hit,
      allowed: !reason,
      label:
        reason ||
        (machine.tool === 'seed'
          ? `点击播种 · ${crops[machine.seed].name}`
          : machine.tool === 'water'
            ? '点击浇水'
            : `点击采收 · ${crops[machine.beds[hit.bed]!.crop].name}`),
    };
  }
  function pick(ray: Ray) {
    const hit = target(ray);
    if (hit)
      action({
        kind: 'use',
        bed: hit.bed,
        item: machine.tool === 'harvest' ? hit.item : undefined,
      });
  }
  function update(time: number) {
    const dt = Math.max(0, time - previousTime);
    previousTime = time;
    const previousJob = machine.job;
    if (!store.getSnapshot().paused) machine.step(dt);
    persistence?.tick(!!previousJob && !machine.job);
    const job = machine.job;
    held.visible = false;
    can.visible = false;
    droplets.forEach((d) => (d.visible = false));
    seeds.forEach((s) => (s.visible = false));
    // The farmer stays beside the gate. Mouse tools operate directly above the clicked bed.
    actor.pose(0, 0, new Vector3(-0.6, 1.05, 0.15), new Vector3(0.6, 1.05, 0.15));
    if (job) {
      const bed = bedCenters[job.bed]!,
        p = job.age / job.duration;
      if (job.kind === 'seed') {
        seeds.forEach((seed, i) => {
          const f = Math.max(0, Math.min(1, (p - i * 0.13) / 0.58));
          seed.visible = f > 0 && f < 1;
          seed.position.set(
            bed.x + Math.sin(f * Math.PI) * 0.25,
            0.28 + (1 - f) * 1.5,
            bed.z + plantOffsets[i]!,
          );
        });
      } else if (job.kind === 'water') {
        can.visible = true;
        can.position.set(bed.x, 1.65, bed.z - 0.8 + Math.sin(p * Math.PI * 2) * 0.45);
        can.rotation.x = 0.5 * Math.sin(Math.PI * p);
        can.updateMatrix();
        const tip = new Vector3(0, 0.12, 0.84).applyMatrix4(can.matrix);
        droplets.forEach((drop, i) => {
          const f = (p * 3 + i / 15) % 1;
          drop.visible = p > 0.12 && p < 0.9;
          drop.position
            .copy(tip)
            .lerp(
              new Vector3(bed.x + Math.sin(i * 3.7) * 0.65, 0.27, bed.z + Math.cos(i * 4.1) * 1.2),
              f,
            );
        });
      } else {
        const initial = new Vector3(
          bed.x,
          0.2 + (job.crop === 'tomato' ? 0.66 : job.crop === 'pumpkin' ? 0.28 : 0.02),
          bed.z + plantOffsets[job.item]!,
        );
        const cropIndex = (['radish', 'tomato', 'pumpkin'] as Crop[]).indexOf(job.crop);
        const slot = basketSlots[Math.min(2, machine.basket[job.crop])]!;
        const destination = new Vector3(
          bedCenters[cropIndex]!.x + slot[0],
          0.12 + basketHeight(job.crop),
          frontLane + 1.25 + slot[1],
        );
        const f = sm(0.15, 1, p);
        held.visible = p >= 0.15;
        held.position.copy(mix(initial, destination, f));
        held.position.y += Math.sin(f * Math.PI) * 1.8;
        held.rotation.y = Math.sin(f * Math.PI) * 0.4;
        for (const kind of Object.keys(heldVariants) as Crop[])
          heldVariants[kind].visible = kind === job.crop;
      }
    }
    beds.forEach((visual, index) => {
      const bed = machine.beds[index]!;
      if (visual.crop !== bed.crop) rebuild(index, bed.crop);
      visual.highlight.visible =
        machine.active && (hoveredBed >= 0 ? hoveredBed === index : machine.selected === index);
      const water =
        job?.bed === index && job.kind === 'water' ? sm(0.2, 0.75, job.age / job.duration) : 0;
      (visual.soil.material as MeshLambertMaterial).color
        .copy(new Color(0x735033))
        .lerp(
          new Color(0x423d2b),
          Math.max(bed.stage === 'growing' ? 0.7 : bed.stage === 'ready' ? 0.35 : 0, water * 0.8),
        );
      for (const ridge of visual.ridges)
        (ridge.material as MeshLambertMaterial).color
          .copy((visual.soil.material as MeshLambertMaterial).color)
          .multiplyScalar(1.12);
      visual.plants.forEach((plant, item) => {
        const exists = bed.stage !== 'empty' && bed.stage !== 'seeding';
        plant.root.visible = exists;
        plant.root.scale.setScalar(0.32 + bed.growth * 0.68);
        plant.fruit.scale.setScalar(
          bed.crop === 'radish' ? 0.4 + bed.growth * 0.6 : Math.max(0.05, (bed.growth - 0.3) / 0.7),
        );
        plant.root.rotation.y = (item - 1) * 0.22;
        const picked =
          bed.picked.includes(item) ||
          (job?.bed === index &&
            job.kind === 'harvest' &&
            job.item === item &&
            job.age >= job.duration * 0.15);
        plant.fruit.visible = !picked;
        if (bed.crop === 'radish' && picked) plant.root.visible = false;
        if (plant.root.visible && bed.stage === 'ready')
          plant.root.rotation.z = Math.sin(time * 1.8 + item) * 0.025;
        else plant.root.rotation.z = 0;
      });
      const crop = (['radish', 'tomato', 'pumpkin'] as Crop[])[index]!;
      const count = Math.min(3, machine.basket[crop]);
      if (stockShown[index] !== `${crop}:${count}`) {
        for (const item of visual.items) visual.basket.remove(item);
        visual.items = [];
        for (let i = 0; i < count; i++) {
          const slot = basketSlots[i]!,
            fruit = produce(crop, visual.basket);
          fruit.position.set(slot[0], basketHeight(crop), slot[1]);
          visual.items.push(fruit);
        }
        stockShown[index] = `${crop}:${count}`;
      }
    });
    publish();
  }
  update(0);
  return {
    setPersistence(save: ReturnType<typeof createFarmPersistence>) {
      persistence = save;
      update(previousTime);
    },
    machine,
    actor,
    field,
    beds,
    action,
    pick,
    hover,
    target,
    update,
    ground,
    held,
    can,
  };
}
