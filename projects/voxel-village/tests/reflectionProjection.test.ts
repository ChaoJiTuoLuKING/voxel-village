import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { copyReflectionProjection } from '../src/features/water/reflectionProjection';

describe('lake reflection with off-axis filming cameras', () => {
  it.each([0, 270, -270])('covers visible water with horizontal offset %s', (offset) => {
    const camera = new PerspectiveCamera(44, 1920 / 1080, 0.1, 2000);
    camera.position.set(-25, 10, 65);
    camera.setViewOffset(1920, 1080, offset, 60, 1920, 1080);
    camera.lookAt(-38, 5.5, 52.5);
    camera.updateMatrixWorld();
    const original = camera.projectionMatrix.clone();
    const reflected = camera.clone();
    reflected.position.y = 6.4 - camera.position.y;
    reflected.up.y *= -1;
    const target = camera.position.clone().add(camera.getWorldDirection(new Vector3()));
    target.y = 6.4 - target.y;
    reflected.lookAt(target);
    reflected.updateMatrixWorld();
    copyReflectionProjection(camera.projectionMatrix, reflected.projectionMatrix);
    reflected.projectionMatrixInverse.copy(reflected.projectionMatrix).invert();

    // Rays near both screen edges must stay inside the reflection texture;
    // otherwise ClampToEdge stretches its last column across the lake.
    for (const x of [-0.99, -0.5, 0, 0.5, 0.99]) {
      for (const y of [-0.9, -0.5]) {
        const ray = new Vector3(x, y, 0).unproject(camera).sub(camera.position).normalize();
        const waterPoint = camera.position.clone().addScaledVector(ray, (3.2 - camera.position.y) / ray.y);
        const uv = waterPoint.project(reflected);
        expect(uv.x).toBeCloseTo(-x, 8);
        expect(uv.y).toBeCloseTo(y, 8);
        expect(Math.abs(uv.x)).toBeLessThan(1);
      }
    }
    expect(camera.projectionMatrix.equals(original)).toBe(true);
  });
});
