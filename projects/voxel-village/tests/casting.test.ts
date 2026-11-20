import { expect, it } from 'vitest';
import { Vector3, Scene, InstancedMesh } from 'three';
import { createCastingMotion, CAST_RELEASE_TIME } from '../src/features/environment/castingMotion';
import {
  buildPineCrown,
  createMountainPines,
} from '../src/features/environment/createMountainPines';
import { disposeObjectTree } from '@visual/scene-kit';

it('winds back, launches continuously from the rod tip with its tangent velocity, and falls under gravity onto the selected water', () => {
  for (const x of [-2.8, 0.8, 2.8])
    for (const z of [4.5, 8]) {
      const target = new Vector3(x, -1.74, z),
        cast = createCastingMotion(target),
        release = CAST_RELEASE_TIME;
      expect(cast.sample(0.6).angle).toBeGreaterThan(Math.PI / 2);
      expect(cast.sample(1.3).angle).toBeLessThan(0.6);
      for (const t of [0, 0.3, 0.6, 0.85])
        expect(cast.sample(t).lure.distanceTo(cast.sample(t).tip)).toBeCloseTo(0.85, 6);
      const h = 0.0001,
        a = cast.sample(release - h).lure,
        b = cast.sample(release).lure,
        c = cast.sample(release + h).lure;
      expect(a.distanceTo(c)).toBeLessThan(0.003);
      const before = b.clone().sub(a).divideScalar(h),
        after = c.clone().sub(b).divideScalar(h);
      expect(before.distanceTo(after)).toBeLessThan(0.02);
      expect(cast.velocity.y).toBeGreaterThan(0);
      const t = release + 0.4,
        dt = 0.02;
      const acceleration = cast
        .sample(t + dt)
        .lure.add(cast.sample(t - dt).lure)
        .addScaledVector(cast.sample(t).lure, -2)
        .divideScalar(dt * dt);
      expect(acceleration.y).toBeCloseTo(-9.8, 5);
      expect(cast.sample(cast.duration).lure.distanceTo(target)).toBeLessThan(1e-6);
    }
});
it('varies branched tree crowns while retaining a small instanced draw budget', () => {
  const a = buildPineCrown(0),
    b = buildPineCrown(1);
  expect([...a.attributes.position.array]).not.toEqual([...b.attributes.position.array]);
  expect(a.attributes.position.count / 3).toBeLessThan(350);
  expect([...a.attributes.position.array].every(Number.isFinite)).toBe(true);
  a.dispose();
  b.dispose();
  const scene = new Scene();
  createMountainPines(
    scene,
    Array.from({ length: 100 }, (_, i) => [i, 0, 0, 15]),
  );
  expect(scene.children).toHaveLength(5);
  expect(
    scene.children
      .filter((p) => p.name.startsWith('mountain-pine-crowns'))
      .reduce((n, p) => n + (p as InstancedMesh).count, 0),
  ).toBe(100);
  disposeObjectTree(scene);
});
