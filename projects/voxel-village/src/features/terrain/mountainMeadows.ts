import { Color } from 'three';
import { fbm, sm } from '../../world/math';

// Broad connected shoulders, outside the inhabited grid; their edges dissolve into rock.
const shoulders = [
  { x: -85, z: 0, rx: 38, rz: 52, rise: -0.72, along: -0.16 },
  { x: 87, z: -5, rx: 38, rz: 56, rise: 0.72, along: -0.18 },
  { x: -105, z: -47, rx: 29, rz: 34, rise: -0.38, along: -0.22 },
  { x: 103, z: -64, rx: 26, rz: 39, rise: 0.4, along: -0.2 },
  { x: -46, z: -86, rx: 25, rz: 22, rise: -0.3, along: -0.22 },
  { x: 48, z: -94, rx: 27, rz: 24, rise: 0.32, along: -0.18 },
  { x: -75, z: 24, rx: 20, rz: 26, rise: -0.48, along: -0.2 },
  { x: 76, z: 23, rx: 20, rz: 28, rise: 0.48, along: -0.22 },
] as const;

export function mountainPlantingMask(x: number, z: number) {
  // Smooth protection extends beyond buildings and old trees, and keeps the watercourse open.
  const outside = Math.max(sm(65, 75, Math.abs(x)), 1 - sm(-78, -65, z));
  const channel = sm(14, 24, Math.abs(x));
  return outside * channel * (1 - sm(80, 125, z));
}

export function meadowShoulderWeight(x: number, z: number) {
  let weight = 0;
  for (const s of shoulders) {
    const dx = (x - s.x) / s.rx,
      dz = (z - s.z) / s.rz;
    const distance = Math.hypot(dx + Math.sin(dz * 2.3) * 0.12, dz);
    weight = Math.max(weight, 1 - sm(0.48, 1.18, distance));
  }
  return weight * mountainPlantingMask(x, z);
}

export function createMeadowShoulders(base: (x: number, z: number, side?: number) => number) {
  const anchors = shoulders.map((s, index) => ({ ...s, y: base(s.x, s.z) - (index < 2 ? 24 : 5) }));
  return (x: number, z: number, side = 0) => {
    const original = base(x, z, side),
      mask = mountainPlantingMask(x, z);
    if (!mask) return original;
    let sum = 0,
      total = 0,
      strongest = 0;
    for (const s of anchors) {
      const dx = (x - s.x) / s.rx,
        dz = (z - s.z) / s.rz;
      const weight = 1 - sm(0.68, 1.18, Math.hypot(dx + Math.sin(dz * 2.3) * 0.12, dz));
      if (!weight) continue;
      const plane = s.y + (x - s.x) * s.rise + (z - s.z) * s.along;
      sum += plane * weight;
      total += weight;
      strongest = Math.max(strongest, weight);
    }
    if (!total) return original;
    // Carve lower foothill meadows into the massif, leaving its outer ridgeline intact.
    const change = Math.max(-85, Math.min(3, sum / total - original));
    return original + change * strongest * mask;
  };
}

const rockCool = new Color('#707f78'),
  rockWarm = new Color('#a49d85');
const grassDeep = new Color('#3d873d'),
  grassFresh = new Color('#7fb747');
const grassGold = new Color('#b5bd55'),
  moss = new Color('#48754c');
const snow = new Color('#e9eee9');
const grass = new Color();

export function mountainMeadowCoverage(x: number, z: number, y: number, up: number) {
  const alpine = 1 - sm(151, 192, y);
  // Vegetation follows connected slopes, not the handful of flattened planting ledges.
  // Nearly vertical faces remain rock; low-frequency ribs interrupt the grass above them.
  const rib = sm(0.59, 0.76, fbm(x * 0.033 + 81, z * 0.019 - 23));
  const bareRib = rib * (1 - sm(0.38, 0.66, up)) * 0.78;
  const cover = sm(0.105, 0.43, up) * (1 - bareRib);
  return cover * alpine;
}

export function mountainSurfaceColor(x: number, z: number, y: number, up: number, out: Color) {
  const broad = fbm(x * 0.022 + 7, z * 0.022 + 3);
  const patches = fbm(x * 0.055 + 37, z * 0.055 - 9);
  grass.copy(grassDeep).lerp(grassFresh, sm(0.25, 0.72, patches));
  grass.lerp(grassGold, sm(0.55, 0.78, broad) * 0.65);
  out.copy(rockCool).lerp(rockWarm, sm(0.25, 0.8, broad));
  const wet = (1 - sm(14, 38, Math.abs(x))) * (1 - sm(-35, -20, z));
  out.lerp(moss, wet * (1 - sm(125, 165, y)) * (0.2 + patches * 0.2));
  out.lerp(grass, mountainMeadowCoverage(x, z, y, up));
  const snowline = 176 + (broad - 0.5) * 32;
  return out.lerp(snow, sm(snowline - 3, snowline + 5, y) * sm(0.34, 0.68, up));
}
