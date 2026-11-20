import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  DoubleSide,
  Vector3,
  type Scene,
} from 'three';
import { WL } from '../../config/world';
import { fishingPiers } from '../../config/settlement';
import type { VillageStore } from '../../state/villageStore';
import { createSeatedActor, connect, type LakeBox } from './lakeActor';
import { createCastingMotion } from './castingMotion';
import { createFishingState } from './fishingState';

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const smooth = (t: number) => {
  const p = clamp(t, 0, 1);
  return p * p * (3 - 2 * p);
};
const mixing = (a: Vector3, b: Vector3, p: number) => a.clone().lerp(b, smooth(p));

export function createFishing(scene: Scene, box: LakeBox, store: VillageStore) {
  const machine = createFishingState();
  const aim = new Vector3(0.8, WL, 7.5);
  let castTarget = new Vector3(),
    lastStage = machine.stage,
    lastPublished = '';
  let previousTime = 0;
  let casting = createCastingMotion(new Vector3(aim.x, WL + 0.04 - 4.98, aim.z));
  const actors = fishingPiers.map((pier, index) => {
    const actor = createSeatedActor(
      box,
      index ? '渔娘' : '老江',
      index ? 0x8a668e : 0x5c7a64,
      index ? '在栈桥垂钓，等鱼儿咬钩' : '在西岸栈桥垂钓，可以一起钓鱼',
    );
    actor.root.position.set(pier.x, 4.98, pier.z + pier.length - 0.6);
    scene.add(actor.root);
    box(actor.root, 1.4, 0.25, 0.75, 0x83623e, 0, -0.125, -0.1);
    for (const x of [-0.48, 0.48]) box(actor.root, 0.14, 0.55, 0.54, 0x654d32, x, -0.415, -0.1);
    const basket = new Group();
    basket.position.set(-1.0, -0.69, -0.12);
    actor.root.add(basket);
    box(basket, 0.58, 0.08, 0.64, 0x7d653f, 0, 0.04);
    for (const x of [-0.27, 0.27]) box(basket, 0.08, 0.55, 0.64, 0xa08b58, x, 0.28);
    for (const z of [-0.28, 0.28]) box(basket, 0.58, 0.55, 0.08, 0xa08b58, 0, 0.28, z);
    const rod = new Group();
    actor.root.add(rod);
    rod.name = 'fishing-rod';
    const sections = Array.from({ length: 9 }, () => box(rod, 0.055, 1, 0.055, 0x856344));
    sections[8].name = 'rod-tip-section';
    const handle = box(rod, 0.12, 1, 0.12, 0x59452d);
    const reel = new Group();
    actor.root.add(reel);
    box(reel, 0.23, 0.2, 0.23, 0x657779);
    const crank = new Group();
    reel.add(crank);
    box(crank, 0.32, 0.06, 0.06, 0xb6bca7, -0.12);
    const crankGrip = box(crank, 0.11, 0.14, 0.11, 0x59452d, -0.25, 0.1);
    const positions = new Float32Array(18 * 3);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const line = new Line(
      geometry,
      new LineBasicMaterial({ color: 0xe5e2c5, transparent: true, opacity: 0.85 }),
    );
    line.name = `fishing-line-${index}`;
    line.frustumCulled = false;
    scene.add(line);
    const float = new Group();
    float.name = `fishing-float-${index}`;
    scene.add(float);
    box(float, 0.13, 0.23, 0.13, 0xd17a44, 0, 0.1);
    box(float, 0.065, 0.21, 0.065, 0xf3dfb5, 0, 0.31);
    const ring = new Mesh(
      new RingGeometry(0.25, 0.29, 28),
      new MeshBasicMaterial({
        color: 0xd4eadc,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        side: DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);
    const fish = new Group();
    fish.name = 'caught-fish';
    scene.add(fish);
    box(fish, 0.3, 0.34, 0.66, 0xb6bfa4);
    box(fish, 0.26, 0.12, 0.48, 0xd7d4aa, 0, -0.12);
    const tail = box(fish, 0.13, 0.35, 0.27, 0x668879, 0, 0, -0.42);
    box(fish, 0.04, 0.07, 0.06, 0x202f29, 0.154, 0.06, 0.21);
    box(fish, 0.04, 0.07, 0.06, 0x202f29, -0.154, 0.06, 0.21);
    box(fish, 0.11, 0.17, 0.2, 0x789987, 0, 0.22, -0.06);
    const spray = Array.from({ length: 6 }, () => box(scene, 0.06, 0.06, 0.06, 0xdaeee0));
    const savedFish = box(basket, 0.27, 0.2, 0.48, 0xb6bfa4, 0, 0.34);
    savedFish.visible = false;
    return {
      actor,
      rod,
      sections,
      handle,
      reel,
      crank,
      crankGrip,
      line,
      float,
      ring,
      fish,
      tail,
      savedFish,
      spray,
    };
  });
  const marker = new Mesh(
    new RingGeometry(0.32, 0.39, 32),
    new MeshBasicMaterial({
      color: 0xe9c67a,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  marker.rotation.x = -Math.PI / 2;
  scene.add(marker);
  function aimAt(point: Vector3) {
    if (machine.stage !== 'ready') return;
    const local = actors[0].actor.root.worldToLocal(point.clone());
    aim.x = clamp(local.x, -2.8, 2.8);
    aim.z = clamp(local.z, 4.5, 8);
    casting = createCastingMotion(new Vector3(aim.x, WL + 0.04 - 4.98, aim.z));
  }
  const endpoint = () => {
    const p = actors[0].actor.root.localToWorld(new Vector3(aim.x, 0, aim.z));
    p.y = WL + 0.04;
    return p;
  };
  function publish() {
    const state = machine.snapshot();
    // Publish discrete changes / 2% meter steps; the rig and state machine run outside React.
    const snapshot = {
      ...state,
      tension: Math.round(state.tension * 50) / 50,
      distance: Math.round(state.distance * 50) / 50,
    };
    const serialized = JSON.stringify(snapshot);
    if (serialized !== lastPublished) {
      lastPublished = serialized;
      store.set({ fishing: state.stage === 'off' ? null : snapshot });
    }
  }
  function update(t: number) {
    const dt = Math.max(0, t - previousTime);
    machine.step(dt);
    previousTime = t;
    const state = machine.snapshot(),
      stage = state.stage;
    if (stage !== lastStage) {
      if (stage === 'casting') castTarget.copy(endpoint());
      lastStage = stage;
    }
    marker.visible = stage === 'ready';
    marker.position.copy(actors[0].actor.root.localToWorld(new Vector3(aim.x, 0, aim.z)));
    marker.position.y = WL + 0.055;
    actors.forEach((rig, index) => {
      const { actor, sections, handle, reel, crank, crankGrip, line, float, ring, fish, tail } =
        rig;
      const active = index === 0 && stage !== 'off';
      const s = active ? stage : 'off',
        age = machine.age;
      const battling = s === 'fighting' || s === 'landable';
      const landed = ['landing', 'caught', 'releasing', 'keeping'].includes(s);
      const localWater = actor.root.worldToLocal(
        new Vector3(actor.root.position.x + 0.6, WL, actor.root.position.z + 5.7),
      );
      let angle = 0.38;
      if (battling) angle = 0.62 + state.tension * 0.3;
      if (landed) angle = 0.7 + smooth((s === 'landing' ? age : 2.2) / 2.2) * 0.5;
      actor.torso.rotation.x = battling
        ? -0.08 - state.tension * 0.14
        : s === 'casting'
          ? -0.12 * Math.sin(Math.min(age / 0.9, 1) * Math.PI) +
            0.08 * Math.sin(Math.max(0, age - 0.9) * 3) * Math.exp(-Math.max(0, age - 0.9) * 2)
          : Math.sin(t * 0.6 + index) * 0.015;
      const castPose = s === 'casting' ? casting.sample(age) : null;
      const start = castPose?.start ?? new Vector3(0.4, 0.98, 0.45);
      const azimuth = active ? casting.azimuth : 0.035;
      const direction =
        castPose?.direction ??
        new Vector3(
          Math.sin(azimuth) * Math.cos(angle),
          Math.sin(angle),
          Math.cos(azimuth) * Math.cos(angle),
        );
      const bend = battling ? state.tension * 0.9 : landed ? 0.35 : 0;
      const points =
        castPose?.points ??
        Array.from({ length: 10 }, (_, k) =>
          start
            .clone()
            .addScaledVector(direction, (4 * k) / 9)
            .add(new Vector3(0, -bend * (k / 9) ** 2, 0)),
        );
      sections.forEach((part, k) => connect(part, points[k], points[k + 1], 0.065 - k * 0.004));
      connect(
        handle,
        start.clone().addScaledVector(direction, -0.35),
        start.clone().addScaledVector(direction, 0.35),
        0.12,
      );
      reel.position.copy(start).add(new Vector3(-0.18, -0.12, 0.08));
      if (battling && state.reeling) crank.rotation.x += Math.min(dt, 0.25) * 7;
      actor.root.updateWorldMatrix(true, true);
      const leftGrip = crankGrip.getWorldPosition(new Vector3());
      const rightGrip = actor.root.localToWorld(start.clone());
      const tip = actor.root.localToWorld(points[9].clone());
      const water = actor.root.localToWorld(localWater.clone());
      const near = actor.root.localToWorld(new Vector3(0.5, 0, 1.6));
      near.y = WL - 0.05;
      let hook = water.clone();
      if (active) {
        if (['ready', 'escaped'].includes(s)) hook = tip.clone().add(new Vector3(0, -0.85, 0));
        else if (s === 'casting') {
          hook.copy(actor.root.localToWorld(castPose!.lure.clone()));
        } else if (s === 'waiting' || s === 'bite') hook.copy(castTarget);
        else if (battling) {
          hook.copy(near).lerp(castTarget, clamp(state.distance, 0, 1));
          hook.x +=
            Math.sin(machine.fightTime * (state.surge ? 6 : 2)) *
            (state.surge ? 0.45 : 0.18) *
            state.distance;
        } else if (landed) {
          const lifted = actor.root.localToWorld(new Vector3(-0.3, 1.2, 1.05));
          hook = mixing(near, lifted, s === 'landing' ? age / 2.2 : 1);
          if (s === 'releasing') {
            const destination = near
              .clone()
              .add(new Vector3(0, -0.3, 1 + Math.max(0, age - 1.1) * 2));
            hook = mixing(lifted, destination, age / 1.2);
          }
          if (s === 'keeping')
            hook = mixing(lifted, actor.root.localToWorld(new Vector3(-1, -0.3, -0.1)), age / 1.5);
        }
      }
      if (landed) {
        const catchGrip = hook.clone().add(new Vector3(0, 0.2, 0));
        leftGrip.lerp(
          catchGrip,
          s === 'landing'
            ? smooth(age / 2.2)
            : s === 'releasing'
              ? 1 - smooth((age - 0.25) / 0.4)
              : 1,
        );
      }
      actor.grip([leftGrip, rightGrip]);
      const nibble = s === 'waiting' && age > 2.8 ? Math.max(0, Math.sin(age * 9)) * 0.13 : 0;
      if (s === 'off' || s === 'waiting') hook.y += Math.sin(t * 2.2 + index) * 0.035 - nibble;
      if (s === 'bite') hook.y -= 0.32 + Math.sin(age * 13) * 0.06;
      float.position.copy(hook);
      float.visible = !battling && !landed;
      fish.visible = battling || landed || s === 'bite' || (active && s === 'waiting' && age > 2);
      fish.position.copy(hook);
      fish.rotation.set(0, Math.sin(t * 3) * 0.35, 0);
      if (!landed) {
        fish.position.y -= 0.28;
        fish.rotation.y += Math.PI;
      } else {
        fish.rotation.x = -Math.PI / 2;
        // Mouth is the line endpoint throughout lifting and transport.
        fish.position.y -= 0.33;
      }
      if (battling || landed || s === 'bite') {
        // Hook is an actual mouth anchor, including the fish's twisting orientation.
        fish.position.copy(hook).sub(new Vector3(0, 0, 0.33).applyEuler(fish.rotation));
      }
      tail.rotation.y = Math.sin(t * 17) * 0.55;
      if (s === 'releasing' && age > 1.1) {
        fish.rotation.x = 0;
        fish.position.y = WL - 0.4;
      }
      rig.savedFish.visible = index === 0 && state.kept > 0 && s !== 'keeping';
      const waterActivity =
        ['off', 'waiting', 'bite', 'fighting', 'landable'].includes(s) ||
        (s === 'releasing' && age > 0.9);
      ring.visible = waterActivity;
      ring.position.set(hook.x, WL + 0.04, hook.z);
      const ripple = (t * (battling ? 1.4 : 0.5) + index * 0.4) % 1;
      ring.scale.setScalar(1 + ripple * (battling ? 5 : 3));
      ring.material.opacity = (1 - ripple) * (battling ? 0.55 : 0.3);
      const splashAge =
        s === 'waiting'
          ? age
          : s === 'releasing'
            ? age - 1.05
            : battling && state.surge
              ? age % 0.5
              : 10;
      rig.spray.forEach((drop, k) => {
        drop.visible = splashAge >= 0 && splashAge < 0.5;
        const a = (k * Math.PI) / 3;
        drop.position.set(
          hook.x + Math.cos(a) * splashAge * 0.8,
          WL + 0.04 + splashAge * 2 - splashAge * splashAge * 4,
          hook.z + Math.sin(a) * splashAge * 0.8,
        );
        drop.scale.setScalar(0.06 * Math.max(0, 1 - splashAge * 1.6));
      });
      const end =
        s === 'releasing' || s === 'keeping'
          ? actor.root.localToWorld(new Vector3(-0.3, 1.2, 1.05))
          : hook;
      const attr = line.geometry.getAttribute('position');
      for (let k = 0; k < 18; k++) {
        const u = k / 17,
          p = tip.clone().lerp(end, u);
        p.y -= Math.sin(u * Math.PI) * (battling || landed ? 0.04 : s === 'casting' ? 0.35 : 0.16);
        attr.setXYZ(k, p.x, p.y, p.z);
      }
      attr.needsUpdate = true;
    });
    publish();
  }
  function action(value: Parameters<typeof machine.action>[0]) {
    if (store.getSnapshot().paused && !['exit', 'cancel', 'enter'].includes(value)) return;
    if (value === 'cast' && machine.stage === 'ready')
      casting = createCastingMotion(new Vector3(aim.x, WL + 0.04 - 4.98, aim.z));
    machine.action(value, casting.duration);
    publish();
  }
  return { actors: actors.map((rig) => rig.actor), update, action, aimAt, machine };
}
