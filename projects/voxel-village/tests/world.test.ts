import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { createWorld } from '../src/world/createWorld';
import { createHouses } from '../src/features/buildings/createHouses';
import { createLandmarks } from '../src/features/buildings/createLandmarks';
import { createProps } from '../src/features/buildings/createProps';
import { createPaths } from '../src/features/paths/createPaths';
import { createVegetation } from '../src/features/vegetation/createVegetation';
import { createRandom } from '../src/world/random';
import { disposeObjectTree } from '@visual/scene-kit';
import { prepareCountryside } from '../src/features/environment/createCountryside';
import { farmPlots, fishingPiers } from '../src/config/settlement';
import { terrainHeight } from '../src/world/terrain.ts';
import { sampleRowingRoute, rowingRoutes } from '../src/features/environment/rowingRoute';
import { WL } from '../src/config/world';
import { walkSpawn } from '../src/features/camera/presets';

describe('expanded valley world', () => {
  it('preserves the deterministic building, vegetation and voxel population', () => {
    const world = createWorld(),
      buildings = createHouses(world);
    const landmarks = createLandmarks(world, buildings.doors);
    createProps(world);
    prepareCountryside(world);
    const paths = createPaths(world, buildings.doors);
    const vegetation = createVegetation(world);
    // Recorded before the mountain art change: includes every building, prop and core tree.
    expect(
      createHash('sha256')
        .update(
          JSON.stringify({
            Hm: [...world.Hm],
            M: [...world.M],
            houses: buildings.houses,
            doors: buildings.doors,
          }),
        )
        .digest('hex'),
    ).toBe('b1da82e8a18d43c7a87eedda243d5d5b8f1bce05c5308796d0d00cec4262806e');
    expect(buildings.houses).toHaveLength(30);
    expect(vegetation.treeCenters.length).toBeGreaterThan(100);
    // The same seed must reproduce the full expanded settlement, not just a fixed mesh count.
    const repeat = createWorld(),
      repeatedBuildings = createHouses(repeat);
    const repeatedLandmarks = createLandmarks(repeat, repeatedBuildings.doors);
    createProps(repeat);
    prepareCountryside(repeat);
    createPaths(repeat, repeatedBuildings.doors);
    createVegetation(repeat);
    expect(repeat.Hm).toEqual(world.Hm);
    expect(repeat.M).toEqual(world.M);
    disposeObjectTree(repeatedLandmarks.mill);
    for (const plot of farmPlots)
      for (const [x, z] of vegetation.treeCenters)
        expect(x < plot.x - 1 || x > plot.x + plot.w || z < plot.z - 1 || z > plot.z + plot.d).toBe(
          true,
        );
    for (const pier of fishingPiers)
      expect(world.ground(pier.x, pier.z + pier.length)).toBeGreaterThan(WL);
    for (const [from, to] of paths.EDG) {
      expect(paths.NODES[from]).toBeDefined();
      expect(paths.NODES[to]).toBeDefined();
    }
    expect([...world.Hm].every(Number.isFinite)).toBe(true);
    for (const z of [walkSpawn.z, walkSpawn.z - 1, walkSpawn.z - 2]) {
      const y = Math.round(world.ground(walkSpawn.x, z) + 0.5);
      for (const offset of [0, 1, 2])
        expect(world.M.has(world.K(walkSpawn.x + 64, y + offset, z + 64))).toBe(false);
    }
    disposeObjectTree(landmarks.mill);
  });
  it('keeps every rowing route inside open water', () => {
    for (let q = 0; q < 3; q++)
      for (let step = 0; step < 360; step++) {
        const { x, z } = sampleRowingRoute(((step / 360) * Math.PI * 2) / rowingRoutes[q].speed, q);
        expect(terrainHeight(x, z)).toBeLessThan(WL - 1);
      }
  });
  it('encloses the lake and village on every side with a continuous mountain rim', () => {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
      const x = Math.sin(angle) * 150,
        z = 22 + Math.cos(angle) * 170;
      expect(terrainHeight(x, z)).toBeGreaterThan(60);
    }
    expect(terrainHeight(-86, 176)).toBeGreaterThan(180);
    expect(terrainHeight(30, 213)).toBeGreaterThan(180);
  });
  it('keeps seeded generators independent across simultaneous scenes', () => {
    const a = createRandom(42),
      b = createRandom(42),
      c = createRandom(43);
    const sequence = Array.from({ length: 20 }, a);
    expect(Array.from({ length: 20 }, b)).toEqual(sequence);
    expect(Array.from({ length: 20 }, c)).not.toEqual(sequence);
  });
  it('rejects out-of-world writes and treats the dock as walkable', () => {
    const world = createWorld();
    world.put(-1, 0, 0, 0xffffff);
    world.put(128, 0, 0, 0xffffff);
    world.put(0, 192, 0, 0xffffff);
    expect(world.M.size).toBe(0);
    world.put(1, 2, 3, 0xff0000);
    expect(world.M.get(world.K(1, 2, 3))).toBe(0xff0000);
    world.put(1, 2, 3, null);
    expect(world.M.size).toBe(0);
    expect(world.ground(12, 34)).toBe(4.5);
  });
});
