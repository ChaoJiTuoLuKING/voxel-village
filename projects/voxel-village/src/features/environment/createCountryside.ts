import { MeshLambertMaterial } from 'three';
import { N } from '../../config/world';
import { farmPlots, fishingPiers } from '../../config/settlement';
import type { createWorld } from '../../world/createWorld';
import type { createMeshBuilder } from '../../scene/geometry/createMeshBuilder';

type World = ReturnType<typeof createWorld>;
type Detail = [number, number, number, number, number, number, number];

/** Reserve working fields before trees and roads are generated. */
export function prepareCountryside(world: World) {
  for (const plot of farmPlots) {
    const base = Math.max(6, world.Hm[(plot.x + (plot.w >> 1)) * N + plot.z + (plot.d >> 1)]);
    for (let x = plot.x - 1; x <= plot.x + plot.w; x++)
      for (let z = plot.z - 1; z <= plot.z + plot.d; z++) {
        const k = x * N + z;
        if (world.OC[k]) continue;
        world.Hm[k] = base;
        world.OC[k] = 1;
      }
  }
}

export function createCountryside(world: World, mesh: ReturnType<typeof createMeshBuilder>) {
  const details: Detail[] = [];
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, c: number) =>
    details.push([x, y, z, w, h, d, c]);
  for (const plot of farmPlots) {
    if (plot === farmPlots[1]) {
      // Preserve the random sequence while the playable garden owns this plot's meshes.
      for (let z = 0; z < plot.d; z += 1.25)
        for (let x = 0.4; x < plot.w - 0.5; x += 0.65) world.rnd();
      continue;
    }
    const x0 = plot.x - 64,
      z0 = plot.z - 64;
    const y = world.Hm[plot.x * N + plot.z] - 0.43;
    box(x0 + (plot.w - 1) / 2, y, z0 + (plot.d - 1) / 2, plot.w, 0.18, plot.d, 0x80603d);
    for (let z = 0; z < plot.d; z += 1.25) {
      box(x0 + (plot.w - 1) / 2, y + 0.12, z0 + z, plot.w - 0.6, 0.2, 0.65, 0x6a4e30);
      for (let x = 0.4; x < plot.w - 0.5; x += 0.65) {
        const xx = x0 + x,
          zz = z0 + z;
        const height = 0.65 + world.rnd() * 0.45;
        if (plot.crop === 'wheat') {
          box(xx, y + height / 2, zz, 0.09, height, 0.1, 0x95914a);
          box(xx, y + height, zz, 0.25, 0.38, 0.2, world.rnd() > 0.5 ? 0xe0b954 : 0xcfa14b);
        } else if (plot.crop === 'lavender') {
          box(xx, y + 0.3, zz, 0.35, 0.5, 0.4, 0x4f7750);
          box(xx, y + height, zz, 0.22, 0.45, 0.23, world.rnd() > 0.5 ? 0x9c88bb : 0x73659d);
        } else {
          box(xx, y + 0.32, zz, 0.52, 0.45, 0.53, 0x739448);
          box(xx, y + 0.57, zz, 0.29, 0.24, 0.3, 0xa2b95f);
        }
      }
    }
    for (const zz of [z0 - 0.8, z0 + plot.d - 0.2]) {
      box(x0 + (plot.w - 1) / 2, y + 0.8, zz, plot.w + 1, 0.14, 0.16, 0xa58a60);
      for (let x = -0.5; x < plot.w + 0.5; x += 2.5)
        box(x0 + x, y + 0.55, zz, 0.23, 1.3, 0.25, 0x80613d);
    }
    // A small scarecrow faces the open lane.
    box(x0 + plot.w - 2, y + 1.3, z0 + plot.d - 1, 0.16, 2.6, 0.18, 0x785338);
    box(x0 + plot.w - 2, y + 1.8, z0 + plot.d - 1, 1.7, 0.2, 0.2, 0x785338);
    box(x0 + plot.w - 2, y + 1.85, z0 + plot.d - 1, 0.65, 0.9, 0.4, 0xb87545);
    box(x0 + plot.w - 2, y + 2.5, z0 + plot.d - 1, 0.48, 0.45, 0.48, 0xd9bd87);
    box(x0 + plot.w - 2, y + 2.8, z0 + plot.d - 1, 0.9, 0.15, 0.8, 0xc3a151);
  }
  // Two new fishing piers and shore walks connect the lakefront cottages.
  for (const pier of fishingPiers) {
    for (let z = pier.z - 6; z <= pier.z + pier.length; z += 0.6) {
      box(pier.x, 4.15, z, pier.width, 0.28, 0.54, Math.round(z * 10) % 3 ? 0x987447 : 0xb38a54);
    }
    for (let z = pier.z; z <= pier.z + pier.length; z += 3)
      for (const dx of [-pier.width / 2, pier.width / 2]) {
        box(pier.x + dx, 2.2, z, 0.3, 5.4, 0.3, 0x604933);
        if (z < pier.z + pier.length - 3) box(pier.x + dx, 5.2, z + 1.5, 0.13, 0.15, 3, 0xbba77c);
      }
    for (const dx of [-0.8, 0.8]) {
      box(pier.x + dx, 4.7, pier.z + 2, 0.7, 0.85, 0.7, 0x967442);
      box(pier.x + dx, 4.7, pier.z + 2, 0.75, 0.12, 0.75, 0x554c3c);
    }
  }
  // Stacked hay, cart and milk churns around the working farms.
  for (const [x, z] of [
    [-42, 8],
    [42, 19],
    [-30, -24],
  ]) {
    const y = world.ground(x, z);
    for (let k = 0; k < 3; k++) {
      box(x + k * 1.2, y + 0.55, z, 1.05, 1.1, 1.5, 0xc8ac60);
      box(x + k * 1.2, y + 0.55, z, 0.12, 1.12, 1.52, 0x8c7843);
    }
    box(x + 1.1, y + 1.55, z, 1.1, 0.85, 1.4, 0xddc277);
    box(x, y + 0.65, z + 3, 1.9, 0.3, 2.8, 0x88633c);
    for (const dx of [-1, 1]) {
      box(x + dx, y + 0.55, z + 3, 0.22, 1.05, 1.05, 0x514b3c);
      box(x + dx * 0.7, y + 0.9, z + 5, 0.13, 0.14, 3, 0x88633c);
    }
  }
  // Small apple orchard, visibly distinct from the surrounding conifer forest.
  for (const [x, z] of [
    [-29, 29],
    [-26, 30],
    [-22, 30],
    [43, 32],
    [48, 30],
    [53, 31],
  ]) {
    const y = world.ground(x, z);
    if (y < 4) continue;
    box(x, y + 1.5, z, 0.45, 3, 0.45, 0x705137);
    for (let k = 0; k < 3; k++)
      box(
        x,
        y + 2.8 + k * 0.65,
        z,
        3.4 - Math.abs(k - 1) * 0.8,
        0.9,
        3.3 - Math.abs(k - 1) * 0.6,
        k % 2 ? 0x86a64d : 0x6f9141,
      );
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      box(
        x + Math.sin(a) * 1.45,
        y + 3.2 + (k % 2) * 0.7,
        z + Math.cos(a) * 1.45,
        0.25,
        0.28,
        0.25,
        0xbd5738,
      );
    }
  }
  mesh.instDetails(details, new MeshLambertMaterial());
}
