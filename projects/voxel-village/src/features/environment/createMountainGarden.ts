import {
  Color,
  CylinderGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Scene,
} from 'three';
import { fbm, sm } from '../../world/math';
import { createRandom } from '../../world/random';
import {
  meadowShoulderWeight,
  mountainMeadowCoverage,
  mountainPlantingMask,
} from '../terrain/mountainMeadows';
import { createTerraceGroves, type TerraceTree } from './createTerraceGroves';

export interface MountainPlant {
  x: number;
  y: number;
  z: number;
  size: number;
  tint: number;
  up: number;
}
export function planMountainGarden(
  heightAt: (x: number, z: number) => number,
  existing: TerraceTree[],
) {
  const random = createRandom(17112026);
  const shrubs: MountainPlant[] = [],
    flowers: MountainPlant[] = [],
    trees: TerraceTree[] = [];
  const site = (x: number, z: number): MountainPlant | null => {
    if (mountainPlantingMask(x, z) < 0.85) return null;
    const y = heightAt(x, z);
    if (y < 12 || y > 141) return null;
    const dx = heightAt(x + 0.5, z) - heightAt(x - 0.5, z);
    const dz = heightAt(x, z + 0.5) - heightAt(x, z - 0.5);
    const up = 1 / Math.hypot(dx, 1, dz);
    if (up < 0.42 || mountainMeadowCoverage(x, z, y, up) < 0.65) return null;
    const tint = fbm(x * 0.075 + 51, z * 0.075 + 12);
    return { x, y, z, up, size: 0.8 + random() * 0.6, tint };
  };
  for (let attempt = 0; attempt < 22000; attempt++) {
    const x = -151 + random() * 302,
      z = -144 + random() * 201;
    const patch = fbm(x * 0.08 + 12, z * 0.08 + 32);
    if (patch < 0.45) continue;
    const p = site(x, z);
    if (!p) continue;
    const shoulder = meadowShoulderWeight(x, z);
    if (
      shrubs.length < 350 &&
      patch > 0.54 &&
      shrubs.every((q) => Math.hypot(x - q.x, z - q.z) > 3.7)
    )
      shrubs.push(p);
    if (
      trees.length < 40 &&
      shoulder > 0.2 &&
      p.up > 0.83 &&
      patch > 0.5 &&
      [...existing, ...trees].every((q) => Math.hypot(x - q.x, z - q.z) > 10)
    ) {
      trees.push({
        x,
        y: p.y + 0.015,
        z,
        height: 5.5 + random() * 4,
        angle: random() * Math.PI * 2,
        kind: random() < 0.68 ? 'lime' : 'sage',
        terraceId: -1,
      });
    }
    // Small flower colonies follow fertile pockets; rock and intervening grass stay readable.
    if (flowers.length < 3400 && p.up > 0.52 && patch > 0.53) {
      for (let i = 0; i < 7; i++) {
        if (flowers.length >= 3400) break;
        const angle = random() * Math.PI * 2,
          radius = random() * 2.2;
        const f = site(x + Math.cos(angle) * radius, z + Math.sin(angle) * radius);
        if (f && f.up > 0.52 && flowers.every((q) => Math.hypot(f.x - q.x, f.z - q.z) > 0.6))
          flowers.push(f);
      }
    }
  }
  return { shrubs, flowers, trees };
}

export function createMountainGarden(
  scene: Scene,
  heightAt: (x: number, z: number) => number,
  existing: TerraceTree[],
) {
  const plan = planMountainGarden(heightAt, existing);
  const matrix = new Matrix4(),
    rotation = new Quaternion(),
    position = new Vector3(),
    scale = new Vector3();
  const leaf = new MeshLambertMaterial({ color: '#ffffff' });
  const bush = new InstancedMesh(new IcosahedronGeometry(1, 1), leaf, plan.shrubs.length * 3);
  bush.name = 'mountain-meadow-shrubs';
  const dark = new Color('#447a38'),
    light = new Color('#a7bf4b');
  plan.shrubs.forEach((plant, index) => {
    for (let lobe = 0; lobe < 3; lobe++) {
      const angle = lobe * 2.4 + plant.tint * 9;
      const x = plant.x + Math.cos(angle) * 0.5 * plant.size,
        z = plant.z + Math.sin(angle) * 0.5 * plant.size;
      position.set(x, heightAt(x, z) + plant.size * 0.48, z);
      scale.set(plant.size * 0.9, plant.size * (lobe === 0 ? 0.9 : 0.6), plant.size * 0.78);
      matrix.compose(position, rotation, scale);
      bush.setMatrixAt(index * 3 + lobe, matrix);
      bush.setColorAt(
        index * 3 + lobe,
        dark.clone().lerp(light, sm(0.3, 0.8, plant.tint) + lobe * 0.04),
      );
    }
  });
  bush.castShadow = bush.receiveShadow = true;
  bush.computeBoundingSphere();
  scene.add(bush);

  const stems = new InstancedMesh(
    new CylinderGeometry(0.035, 0.055, 1, 4),
    new MeshLambertMaterial({ color: '#58853a' }),
    plan.flowers.length,
  );
  const petals = new InstancedMesh(
    new SphereGeometry(1, 5, 3),
    new MeshLambertMaterial({ color: '#ffffff' }),
    plan.flowers.length * 5,
  );
  const hearts = new InstancedMesh(
    new IcosahedronGeometry(1, 0),
    new MeshLambertMaterial({ color: '#d5a531' }),
    plan.flowers.length,
  );
  stems.name = 'mountain-wildflower-stems';
  petals.name = 'mountain-wildflower-petals';
  hearts.name = 'mountain-wildflower-hearts';
  const palette = ['#fff1cd', '#f1c141', '#e47dad', '#9a79d1', '#ef9165'];
  plan.flowers.forEach((plant, index) => {
    const h = plant.size * 0.78;
    matrix.compose(position.set(plant.x, plant.y + h / 2, plant.z), rotation, scale.set(1, h, 1));
    stems.setMatrixAt(index, matrix);
    const color = new Color(
      palette[
        plant.tint < 0.34
          ? 0
          : plant.tint < 0.43
            ? 1
            : plant.tint < 0.51
              ? 2
              : plant.tint < 0.6
                ? 3
                : 4
      ],
    );
    for (let j = 0; j < 5; j++) {
      const angle = (j * Math.PI * 2) / 5 + plant.tint * 6;
      position.set(
        plant.x + Math.cos(angle) * h * 0.28,
        plant.y + h,
        plant.z + Math.sin(angle) * h * 0.28,
      );
      matrix.compose(position, rotation, scale.set(h * 0.29, h * 0.1, h * 0.29));
      petals.setMatrixAt(index * 5 + j, matrix);
      petals.setColorAt(index * 5 + j, color);
    }
    matrix.compose(
      position.set(plant.x, plant.y + h * 1.05, plant.z),
      rotation,
      scale.set(h * 0.15, h * 0.1, h * 0.15),
    );
    hearts.setMatrixAt(index, matrix);
  });
  for (const mesh of [stems, petals, hearts]) {
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    scene.add(mesh);
  }
  createTerraceGroves(scene, plan.trees);
  return plan;
}
