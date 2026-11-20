import { describe, expect, it } from 'vitest';
import { cascadeBreaks } from '../src/features/water/createRiver';
import { buildWaterfallRibbon, cascadeLanding } from '../src/features/water/createWaterfalls';
import { createWorld } from '../src/world/createWorld';
import { lvl, sx, riverHalfWidth } from '../src/world/terrain.ts';
import { createMountainSurface } from '../src/features/terrain/mountainSurface';

describe('high cascades fitted to the village', () => {
  it('keeps all four falls inside their channel and above the riverbed, including each lip', () => {
    const world = createWorld();
    const surface = createMountainSurface(world);
    for (const j of cascadeBreaks) {
      const geometry = buildWaterfallRibbon(j),
        positions = geometry.getAttribute('position');
      const cols = 25,
        rows = positions.count / cols;
      expect(positions.getY(12)).toBeCloseTo(lvl(j - 1) + 0.035, 3);
      expect(positions.getY((rows - 1) * cols + 12)).toBeCloseTo(cascadeLanding(j).y + 0.035, 3);
      for (let row = 0; row < rows; row++) {
        const i = row * cols + 12,
          x = positions.getX(i),
          y = positions.getY(i),
          z = positions.getZ(i);
        expect(y).toBeGreaterThanOrEqual(world.hg(Math.round(x + 64), Math.round(z + 64)) - 0.5);
        expect(y).toBeGreaterThanOrEqual(surface(x, z) - 0.01);
        if (row > 0) expect(y).toBeLessThanOrEqual(positions.getY(i - cols) + 0.001);
      }
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i),
          z = positions.getZ(i);
        expect(Number.isFinite(positions.getY(i))).toBe(true);
        expect(Math.abs(x - (sx(z + 64) - 64))).toBeLessThan(riverHalfWidth(j) * 1.065);
      }
      geometry.dispose();
    }
  });
  it('provides two major drops while preserving the lower village river levels', () => {
    expect(lvl(9) - lvl(10)).toBeGreaterThan(45);
    expect(lvl(21) - lvl(22)).toBeGreaterThan(40);
    expect(lvl(35)).toBe(24);
    expect(lvl(44)).toBe(13);
    expect(lvl(94)).toBe(3.5);
  });
});
