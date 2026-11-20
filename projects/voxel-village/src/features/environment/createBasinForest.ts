import type { Scene } from 'three';
import { createRandom } from '../../world/random';
import { terraceDistance, type MountainTerrace } from '../terrain/mountainTerraces';
import { createTerraceGroves, type TerraceTree } from './createTerraceGroves';

export function planTerraceTrees(
  heightAt: (x: number, z: number) => number,
  terraces: MountainTerrace[],
) {
  const random = createRandom(771204),
    trees: TerraceTree[] = [];
  for (const t of terraces) {
    const area = t.rx * t.rz;
    const count =
      area < 90
        ? 2 + Math.floor(random() * 2)
        : area < 190
          ? 3 + Math.floor(random() * 3)
          : 6 + Math.floor(random() * 4);
    // Off-centre patches, with a few scattered trees, leave irregular clearings on the ledge.
    const patchU = (random() - 0.5) * 0.42,
      patchV = (random() - 0.5) * 0.36;
    const dominant = random();
    let planted = 0;
    for (let attempt = 0; attempt < 240 && planted < count; attempt++) {
      const clustered = random() < 0.7;
      const u = clustered ? patchU + (random() + random() - 1) * 0.5 : (random() - 0.5) * 1.25;
      const v = clustered ? patchV + (random() + random() - 1) * 0.5 : (random() - 0.5) * 1.25;
      const x = t.x + u * t.rx * Math.cos(t.angle) - v * t.rz * Math.sin(t.angle);
      const z = t.z + u * t.rx * Math.sin(t.angle) + v * t.rz * Math.cos(t.angle);
      if (terraceDistance(t, x, z) > 0.65) continue;
      const ground = heightAt(x, z);
      if (Math.abs(ground - t.y) > 0.08) continue;
      if (
        Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4).some(
          (a) => Math.abs(heightAt(x + Math.cos(a) * 0.7, z + Math.sin(a) * 0.7) - t.y) > 0.08,
        )
      )
        continue;
      const choice = random();
      const kind =
        choice < 0.54 ? (dominant < 0.6 ? 'pine' : 'sage') : choice < 0.91 ? 'lime' : 'gold';
      const height = kind === 'pine' || kind === 'sage' ? 9 + random() * 8 : 6.5 + random() * 4.5;
      const crownRadius = height * (kind === 'pine' || kind === 'sage' ? 0.2 : 0.32);
      if (
        trees.some(
          (tree) =>
            Math.hypot(tree.x - x, tree.z - z) <
            Math.max(
              3,
              (crownRadius +
                tree.height * (tree.kind === 'pine' || tree.kind === 'sage' ? 0.2 : 0.32)) *
                0.73,
            ),
        )
      )
        continue;
      trees.push({
        x,
        y: ground + 0.015,
        z,
        height,
        angle: random() * Math.PI * 2,
        kind,
        terraceId: t.id,
      });
      planted++;
    }
  }
  return trees;
}
export function createBasinForest(
  scene: Scene,
  heightAt: (x: number, z: number) => number,
  terraces: MountainTerrace[],
) {
  const trees = planTerraceTrees(heightAt, terraces);
  createTerraceGroves(scene, trees);
  return trees;
}
