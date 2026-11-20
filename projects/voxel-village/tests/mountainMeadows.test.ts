import { describe, expect, it } from 'vitest';
import { Scene, Vector3 } from 'three';
import { disposeObjectTree } from '@visual/scene-kit';
import { createWorld } from '../src/world/createWorld';
import { buildMountainTerrain } from '../src/features/terrain/buildMountainTerrain';
import { createMountainSurface } from '../src/features/terrain/mountainSurface';
import {
  createMeadowShoulders,
  mountainPlantingMask,
  mountainMeadowCoverage,
  meadowShoulderWeight,
} from '../src/features/terrain/mountainMeadows';
import { planTerraceTrees } from '../src/features/environment/createBasinForest';
import { planMountainGarden } from '../src/features/environment/createMountainGarden';
import { createOpeningFlight } from '../src/features/camera/openingFlight';

describe('mountain meadow integration', () => {
  it('leaves the settlement, watercourse and distant ridges untouched', () => {
    const base = createMountainSurface(createWorld()),
      sample = createMeadowShoulders(base);
    for (let x = -64; x <= 63; x += 3) {
      for (let z = -64; z <= 63; z += 3) expect(sample(x, z)).toBe(base(x, z));
    }
    for (let z = -190; z < 95; z += 3) {
      for (let x = -13; x <= 13; x += 3) expect(sample(x, z)).toBe(base(x, z));
    }
    for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
      const x = Math.sin(angle) * 240,
        z = Math.cos(angle) * 260;
      expect(sample(x, z)).toBe(base(x, z));
    }
  });
  it('roots flowers and shrubs on actual triangles and keeps tall planting out of the opening path', () => {
    const scene = new Scene(),
      terrain = buildMountainTerrain(createWorld(), scene);
    try {
      const existing = planTerraceTrees(terrain.heightAt, terrain.terraces);
      const garden = planMountainGarden(terrain.heightAt, existing);
      expect(garden.flowers.length).toBeGreaterThan(500);
      expect(garden.flowers.length).toBeLessThanOrEqual(3400);
      // Colonies must reach natural slopes beyond the authored planting platforms.
      expect(
        garden.flowers.filter((p) => meadowShoulderWeight(p.x, p.z) < 0.08).length,
      ).toBeGreaterThan(50);
      expect(garden.shrubs.length).toBeGreaterThan(100);
      expect(garden.shrubs.length).toBeLessThanOrEqual(350);
      expect(garden.trees.length).toBeGreaterThan(5);
      for (const plant of [...garden.flowers, ...garden.shrubs]) {
        expect(mountainPlantingMask(plant.x, plant.z)).toBeGreaterThanOrEqual(0.85);
        expect(plant.y).toBeCloseTo(terrain.heightAt(plant.x, plant.z), 6);
        expect(plant.up).toBeGreaterThanOrEqual(0.42);
        expect(plant.y).toBeGreaterThan(12);
      }
      const flight = createOpeningFlight(),
        camera = new Vector3(),
        target = new Vector3();
      for (let i = 0; i <= 320; i++) {
        flight.sample(i / 320, camera, target);
        for (const tree of [...existing, ...garden.trees]) {
          if (Math.hypot(camera.x - tree.x, camera.z - tree.z) < tree.height * 0.4 + 3)
            expect(camera.y).toBeGreaterThan(tree.y + tree.height + 2);
        }
      }
      expect(planMountainGarden(terrain.heightAt, existing)).toEqual(garden);
    } finally {
      disposeObjectTree(scene);
    }
  });
  it('connects grass on middle slopes but leaves sheer faces and high alpine rock exposed', () => {
    for (const [x, z] of [
      [-132, -24],
      [130, -36],
      [-114, 46],
      [120, 42],
    ]) {
      expect(mountainMeadowCoverage(x, z, 78, 0.5)).toBeGreaterThan(0.65);
      expect(mountainMeadowCoverage(x, z, 78, 0.04)).toBe(0);
      expect(mountainMeadowCoverage(x, z, 205, 0.8)).toBe(0);
    }
  });
});
