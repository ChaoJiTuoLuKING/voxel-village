import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { createOpeningFlight } from '../src/features/camera/openingFlight';
import { waterfallArrival } from '../src/features/camera/presets';
import { terrainHeight } from '../src/world/terrain.ts';
import { createWorld } from '../src/world/createWorld';
import { createHouses } from '../src/features/buildings/createHouses';
import { createLandmarks } from '../src/features/buildings/createLandmarks';
import { createProps } from '../src/features/buildings/createProps';
import { disposeObjectTree } from '@visual/scene-kit';

describe('basin arrival flight', () => {
  it('descends from the opposite rim and clears terrain, trees and village structures', () => {
    const flight = createOpeningFlight(),
      position = new Vector3(),
      target = new Vector3();
    const world = createWorld(),
      buildings = createHouses(world);
    const landmarks = createLandmarks(world, buildings.doors);
    createProps(world);
    let previousZ = Infinity;
    for (let frame = 0; frame <= 960; frame++) {
      flight.sample(frame / 960, position, target);
      // Trees in the opposite forest reach 25 units; the route stays above their canopy.
      const clearance = position.z > 74 ? 28 : 12;
      expect(position.y - terrainHeight(position.x, position.z)).toBeGreaterThan(clearance);
      expect(position.z).toBeLessThanOrEqual(previousZ + 0.01);
      expect(position.distanceTo(target)).toBeGreaterThan(25);
      previousZ = position.z;
      for (const dx of [-1, 0, 1])
        for (const dz of [-1, 0, 1])
          for (const dy of [-2, 0, 2]) {
            const x = Math.round(position.x + 64 + dx),
              z = Math.round(position.z + 64 + dz);
            if (x < 0 || x > 127 || z < 0 || z > 127) continue;
            expect(world.M.has(world.K(x, Math.round(position.y + dy), z))).toBe(false);
          }
    }
    expect(position.z).toBeLessThan(20);
    expect(target.z).toBeLessThan(-40);
    expect(target.y).toBeGreaterThan(position.y + 20);
    disposeObjectTree(landmarks.mill);
  });

  it('ends exactly at its waterfall orbit without a jump or reverse flight back to the lake', () => {
    const flight = createOpeningFlight(),
      position = new Vector3(),
      target = new Vector3();
    flight.sample(1, position, target);
    const end = waterfallArrival;
    expect(target.distanceTo(new Vector3(end.x, end.y, end.z))).toBeLessThan(1e-8);
    expect(position.distanceTo(target)).toBeCloseTo(end.d, 8);
    expect(Math.acos((position.y - target.y) / end.d)).toBeCloseTo(end.ph, 8);
    const previous = new Vector3();
    flight.sample(1 - 1 / 960, previous, new Vector3());
    expect(position.distanceTo(previous)).toBeLessThan(0.01);
  });
});
