import { expect, it } from 'vitest';
import { Scene, Vector3, type Mesh } from 'three';
import { createLakeLife } from '../src/features/environment/createLakeLife';
import { createWorld } from '../src/world/createWorld';
import { WL } from '../src/config/world';
import { disposeObjectTree } from '@visual/scene-kit';

it('hands remain on oar handles and blades enter then clear the water every cycle', () => {
  const scene = new Scene(),
    life = createLakeLife(createWorld(), scene);
  const minimum = [Infinity, Infinity, Infinity],
    maximum = [-Infinity, -Infinity, -Infinity];
  let armLength = 0;
  for (let frame = 0; frame <= 180; frame++) {
    life.update(((frame / 180) * Math.PI * 2) / 2.15);
    scene.updateMatrixWorld(true);
    life.boats.slice(0, 3).forEach((boat, i) => {
      for (const [k, side] of [-1, 1].entries()) {
        const pivot = boat.getObjectByName(`oar-${side}`)!;
        const grip = boat.getObjectByName(`grip-${k}`)!;
        const target = pivot.localToWorld(new Vector3(0, 0, -side * 0.85));
        expect(grip.getWorldPosition(new Vector3()).distanceTo(target)).toBeLessThan(1e-5);
        const blade = pivot.getObjectByName('oar-blade')!;
        const y = blade.getWorldPosition(new Vector3()).y;
        minimum[i] = Math.min(minimum[i], y);
        maximum[i] = Math.max(maximum[i], y);
        armLength = Math.max(armLength, (boat.getObjectByName(`upper-arm-${k}`) as Mesh).scale.y);
      }
    });
  }
  for (let i = 0; i < 3; i++) {
    expect(minimum[i]).toBeLessThan(WL - 0.05);
    expect(maximum[i]).toBeGreaterThan(WL + 0.6);
  }
  expect(armLength).toBeLessThan(0.68);
  disposeObjectTree(scene);
});

it('keeps boat hulls and oar blades clear of the fishing piers', () => {
  const scene = new Scene(),
    life = createLakeLife(createWorld(), scene);
  let collision = '';
  for (let t = 0; t < 420; t += 0.5) {
    life.update(t);
    scene.updateMatrixWorld(true);
    life.boats.slice(0, 3).forEach((boat, i) => {
      const samples: Vector3[] = [];
      for (const x of [-2.5, 0, 2.5])
        for (const z of [-1.4, 0, 1.4]) samples.push(boat.localToWorld(new Vector3(x, 0.5, z)));
      for (const side of [-1, 1]) {
        const blade = boat.getObjectByName(`oar-${side}`)!.getObjectByName('oar-blade')!;
        samples.push(
          blade.localToWorld(new Vector3(0, 0, 0.5)),
          blade.localToWorld(new Vector3(0, 0, -0.5)),
        );
      }
      for (const p of samples) {
        if (
          (Math.abs(p.x + 38) < 1.65 && p.z > 30 && p.z < 50.3) ||
          (Math.abs(p.x - 46) < 1.65 && p.z > 30 && p.z < 51.3)
        )
          collision = `boat ${i} at ${t}: ${p.toArray()}`;
      }
    });
  }
  expect(collision).toBe('');
  disposeObjectTree(scene);
});

it('keeps entire rowing route envelopes separate even when boats arrive at different times', async () => {
  const { sampleRowingRoute, rowingRoutes } =
    await import('../src/features/environment/rowingRoute');
  const positions = rowingRoutes.map((route, i) =>
    Array.from({ length: 360 }, (_, n) =>
      sampleRowingRoute(((n / 360) * Math.PI * 2) / route.speed, i),
    ),
  );
  for (let a = 0; a < 3; a++)
    for (let b = a + 1; b < 3; b++) {
      let nearest = Infinity;
      for (const p of positions[a])
        for (const q of positions[b]) nearest = Math.min(nearest, Math.hypot(p.x - q.x, p.z - q.z));
      expect(nearest).toBeGreaterThan(8.3);
    }
});

it('keeps the fishing line on the rod tip and the float / fish through casting and landing', () => {
  const scene = new Scene(),
    life = createLakeLife(createWorld(), scene);
  const fisher = life.fishing.actors[0];
  let time = 0,
    caught = false,
    maxArm = 0;
  life.fishing.action('enter');
  life.fishing.action('cast');
  for (let frame = 0; frame < 2400; frame++) {
    time += 1 / 60;
    const state = life.fishing.machine.snapshot();
    if (state.stage === 'bite') life.fishing.action('hook');
    if (state.stage === 'fighting' && frame % 48 === 0 && !state.surge && state.tension < 0.75)
      life.fishing.action('reel');
    if (state.stage === 'landable') life.fishing.action('land');
    life.update(time);
    scene.updateMatrixWorld(true);
    const line = scene.getObjectByName('fishing-line-0') as import('three').Line;
    const tip = fisher.root
      .getObjectByName('rod-tip-section')!
      .localToWorld(new Vector3(0, 0.5, 0));
    const attr = line.geometry.getAttribute('position');
    expect(tip.distanceTo(new Vector3().fromBufferAttribute(attr, 0))).toBeLessThan(1e-4);
    const stage = life.fishing.machine.stage;
    if (stage === 'casting' || stage === 'waiting' || stage === 'bite') {
      const float = scene.getObjectByName('fishing-float-0')!;
      expect(float.position.distanceTo(new Vector3().fromBufferAttribute(attr, 17))).toBeLessThan(
        1e-4,
      );
    }
    for (let k = 0; k < 2; k++)
      maxArm = Math.max(maxArm, (fisher.root.getObjectByName(`upper-arm-${k}`) as Mesh).scale.y);
    if (stage === 'fighting' || stage === 'landing' || stage === 'caught') {
      const mouth = scene.getObjectByName('caught-fish')!.localToWorld(new Vector3(0, 0, 0.33));
      expect(mouth.distanceTo(new Vector3().fromBufferAttribute(attr, 17))).toBeLessThan(1e-4);
    }
    if (stage === 'caught') {
      caught = true;
      break;
    }
  }
  expect(caught).toBe(true);
  expect(maxArm).toBeLessThan(0.68);
  disposeObjectTree(scene);
});
