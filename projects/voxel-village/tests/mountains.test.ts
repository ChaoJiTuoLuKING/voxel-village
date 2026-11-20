import { describe, it, expect } from 'vitest';
import { Scene, Vector3 } from 'three';
import { disposeObjectTree } from '@visual/scene-kit';
import { createWorld } from '../src/world/createWorld';
import { createHouses } from '../src/features/buildings/createHouses';
import { createLandmarks } from '../src/features/buildings/createLandmarks';
import { createProps } from '../src/features/buildings/createProps';
import { prepareCountryside } from '../src/features/environment/createCountryside';
import { createPaths } from '../src/features/paths/createPaths';
import { buildMountainTerrain } from '../src/features/terrain/buildMountainTerrain';
import { createAlpineBackdrop } from '../src/features/terrain/createAlpineBackdrop';
import { createOpeningFlight } from '../src/features/camera/openingFlight';
import { buildWaterfallRibbon } from '../src/features/water/createWaterfalls';
import { cascadeBreaks } from '../src/features/water/createRiver';

describe('faceted mountain integration', () => {
  it('keeps foundations, waterfall sheets and the entire opening clear on the rendered triangles', () => {
    const world = createWorld(),
      scene = new Scene(),
      buildings = createHouses(world);
    const landmarks = createLandmarks(world, buildings.doors);
    createProps(world);
    prepareCountryside(world);
    createPaths(world, buildings.doors);
    const before = new Int16Array(world.Hm);
    const { mesh, heightAt } = buildMountainTerrain(world, scene);
    expect(world.Hm).toEqual(before);
    expect(mesh.geometry.getAttribute('position').count).toBeLessThan(250_000);
    for (const house of buildings.houses) {
      if (house.st) continue; // Stilt houses intentionally stand over the lake.
      const [x, z] = house.WP(Math.floor(house.w / 2), Math.floor(house.d / 2));
      expect(heightAt(x - 64, z - 64)).toBeCloseTo(house.B - 0.5, 4);
    }
    for (const j of cascadeBreaks) {
      const sheet = buildWaterfallRibbon(j),
        p = sheet.getAttribute('position');
      for (let row = 0; row <= 80; row++) {
        for (const col of [4, 12, 20]) {
          const k = row * 25 + col;
          expect(p.getY(k)).toBeGreaterThan(heightAt(p.getX(k), p.getZ(k)) - 0.08);
        }
      }
      sheet.dispose();
    }
    const flight = createOpeningFlight(),
      position = new Vector3(),
      target = new Vector3();
    for (let step = 0; step <= 320; step++) {
      flight.sample(step / 320, position, target);
      expect(position.y - heightAt(position.x, position.z)).toBeGreaterThan(
        position.z > 74 ? 28 : 12,
      );
    }
    const distant = createAlpineBackdrop(scene),
      points = distant.geometry.getAttribute('position');
    let highest = 0;
    for (let i = 0; i < points.count; i++) {
      expect(Number.isFinite(points.getY(i))).toBe(true);
      highest = Math.max(highest, points.getY(i));
      expect(Math.max(Math.abs(points.getX(i)), Math.abs(points.getZ(i)))).toBeGreaterThan(265);
    }
    expect(highest).toBeGreaterThan(360);
    disposeObjectTree(landmarks.mill);
    disposeObjectTree(scene);
  });
});
