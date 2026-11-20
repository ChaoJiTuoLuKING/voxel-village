import { describe, expect, it } from 'vitest';
import { Scene } from 'three';
import { disposeObjectTree } from '@visual/scene-kit';
import { createWorld } from '../src/world/createWorld';
import { buildMountainTerrain } from '../src/features/terrain/buildMountainTerrain';
import { terraceDistance } from '../src/features/terrain/mountainTerraces';
import { planTerraceTrees } from '../src/features/environment/createBasinForest';
import {
  buildGroveTree,
  createTerraceGroves,
  type GroveKind,
} from '../src/features/environment/createTerraceGroves';

describe('mountain terraces and sparse groves', () => {
  it('roots every tree on an actual flat mesh terrace and mixes species without covering the cliffs', () => {
    const scene = new Scene(),
      terrain = buildMountainTerrain(createWorld(), scene);
    const trees = planTerraceTrees(terrain.heightAt, terrain.terraces);
    expect(terrain.terraces.length).toBeGreaterThan(20);
    expect(trees.length).toBeGreaterThan(60);
    expect(trees.length).toBeLessThan(155);
    expect(new Set(trees.map((t) => t.kind)).size).toBe(4);
    for (const tree of trees) {
      const terrace = terrain.terraces.find((t) => t.id === tree.terraceId)!;
      expect(terraceDistance(terrace, tree.x, tree.z)).toBeLessThanOrEqual(0.65);
      expect(tree.y - terrain.heightAt(tree.x, tree.z)).toBeCloseTo(0.015, 5);
      // Check a full root footprint against rendered triangles, not the analytic height field.
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        expect(
          Math.abs(
            terrain.heightAt(tree.x + Math.cos(angle) * 0.65, tree.z + Math.sin(angle) * 0.65) -
              terrace.y,
          ),
        ).toBeLessThan(0.08);
      }
    }
    for (const terrace of terrain.terraces) {
      const count = trees.filter((t) => t.terraceId === terrace.id).length;
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(9);
      expect(Math.abs(terrain.heightAt(terrace.x, terrace.z) - terrace.y)).toBeLessThan(0.02);
    }
    const counts = terrain.terraces.map(
      (t) => trees.filter((tree) => tree.terraceId === t.id).length,
    );
    expect(counts.some((n) => n === 2 || n === 3)).toBe(true);
    expect(counts.filter((n) => n >= 6).length).toBeGreaterThanOrEqual(3);
    const areas = terrain.terraces.map((t) => t.rx * t.rz);
    expect(Math.max(...areas) / Math.min(...areas)).toBeGreaterThan(4);
    createTerraceGroves(scene, trees);
    expect(scene.children.filter((m) => m.name.startsWith('terrace-grove-'))).toHaveLength(4);
    console.info(`Mountain planting: ${terrain.terraces.length} terraces, ${trees.length} trees`);
    disposeObjectTree(scene);
  });
  it('builds upright voxel silhouettes with outward faces and feet at ground zero', () => {
    for (const kind of ['pine', 'sage', 'lime', 'gold'] as GroveKind[]) {
      const geometry = buildGroveTree(kind),
        p = geometry.getAttribute('position'),
        n = geometry.getAttribute('normal');
      geometry.computeBoundingBox();
      expect(geometry.boundingBox!.min.y).toBe(0);
      expect(geometry.boundingBox!.max.y).toBeCloseTo(1, 5);
      expect(p.count).toBeLessThan(18000);
      for (let i = 0; i < p.count; i += 3) {
        const ax = p.getX(i + 1) - p.getX(i),
          ay = p.getY(i + 1) - p.getY(i),
          az = p.getZ(i + 1) - p.getZ(i);
        const bx = p.getX(i + 2) - p.getX(i),
          by = p.getY(i + 2) - p.getY(i),
          bz = p.getZ(i + 2) - p.getZ(i);
        expect(
          (ay * bz - az * by) * n.getX(i) +
            (az * bx - ax * bz) * n.getY(i) +
            (ax * by - ay * bx) * n.getZ(i),
        ).toBeGreaterThan(0);
      }
      geometry.dispose();
    }
  });
});
