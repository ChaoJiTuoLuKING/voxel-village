import { createRandom } from '../../world/random';
import { sm } from '../../world/math';

export interface MountainTerrace {
  id: number;
  x: number;
  z: number;
  y: number;
  rx: number;
  rz: number;
  angle: number;
  phase: number;
  lobes: number;
  roughness: number;
  shoulder: number;
}
export function terraceDistance(terrace: MountainTerrace, x: number, z: number) {
  const dx = x - terrace.x,
    dz = z - terrace.z;
  const u = (dx * Math.cos(terrace.angle) + dz * Math.sin(terrace.angle)) / terrace.rx;
  const v = (-dx * Math.sin(terrace.angle) + dz * Math.cos(terrace.angle)) / terrace.rz;
  const a = Math.atan2(v, u);
  // Offset lobes and a shallow notch break the oval without making a serrated rim.
  const rim =
    1 +
    Math.sin(a * terrace.lobes + terrace.phase) * terrace.roughness +
    Math.cos(a * 3 - terrace.phase * 0.7) * 0.065 +
    Math.sin(a + terrace.phase) * 0.09;
  return Math.hypot(u, v) / rim;
}

/** Carve broad, flat shoulders into the same height field as the rock, never floating disks. */
export function createMountainTerraces(base: (x: number, z: number, side?: number) => number) {
  const random = createRandom(15112026),
    terraces: MountainTerrace[] = [];
  // Scattered candidates and unequal footprints avoid rows of evenly spaced ledges.
  for (let attempt = 0; attempt < 650 && terraces.length < 32; attempt++) {
    const px = -199 + random() * 395,
      pz = -170 + random() * 419;
    if (Math.abs(px) < 87 && pz > -86 && pz < 130) continue;
    if (Math.abs(px) < 42 && pz < -86) continue;
    const y = base(px, pz);
    if (y < 18 || y > 140) continue;
    const gx = (base(px + 3, pz) - base(px - 3, pz)) / 6;
    const gz = (base(px, pz + 3) - base(px, pz - 3)) / 6;
    if (Math.hypot(gx, gz) > 3.5) continue;
    const size = random();
    const rx =
      size < 0.42 ? 8.5 + random() * 3.5 : size < 0.77 ? 13 + random() * 4 : 19 + random() * 5;
    const rz = rx * (0.46 + random() * 0.31);
    const angle = Math.atan2(gz, gx) + Math.PI / 2 + (random() - 0.5) * 0.5;
    const extentX = Math.hypot(rx * Math.cos(angle), rz * Math.sin(angle)) * 2.05;
    const extentZ = Math.hypot(rx * Math.sin(angle), rz * Math.cos(angle)) * 2.05;
    // Keep the original settlement and waterfall terrain completely outside each footprint.
    if (px + extentX > -65 && px - extentX < 64 && pz + extentZ > -86 && pz - extentZ < 130)
      continue;
    if (Math.abs(px) - extentX < 14 && pz < -86) continue;
    if (terraces.some((t) => Math.hypot(t.x - px, t.z - pz) < (t.rx + rx) * 1.65)) continue;
    terraces.push({
      id: terraces.length,
      x: px,
      z: pz,
      y,
      rx,
      rz,
      angle,
      phase: random() * Math.PI * 2,
      lobes: 2 + Math.floor(random() * 2),
      roughness: 0.11 + random() * 0.09,
      shoulder: 1.22 + random() * 0.25,
    });
  }
  // Spatial lookup is shared by refinement and height sampling.
  const buckets = new Map<string, MountainTerrace[]>();
  for (const t of terraces) {
    const r = Math.max(t.rx, t.rz) * 2.05;
    for (let x = Math.floor((t.x - r) / 32); x <= Math.floor((t.x + r) / 32); x++)
      for (let z = Math.floor((t.z - r) / 32); z <= Math.floor((t.z + r) / 32); z++) {
        const key = `${x},${z}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push(t);
      }
  }
  function sample(x: number, z: number, side = 0) {
    let h = base(x, z, side);
    for (const t of buckets.get(`${Math.floor(x / 32)},${Math.floor(z / 32)}`) ?? []) {
      const d = terraceDistance(t, x, z);
      if (d < t.shoulder) {
        const blend = 1 - sm(0.76, t.shoulder, d);
        h += (t.y - h) * blend;
      }
    }
    return h;
  }
  function near(x: number, z: number, size: number) {
    return terraces.some(
      (t) =>
        Math.abs(t.x - x - size / 2) < Math.max(t.rx, t.rz) * 2.05 + size / 2 &&
        Math.abs(t.z - z - size / 2) < Math.max(t.rx, t.rz) * 2.05 + size / 2,
    );
  }
  return { terraces, sample, near };
}
