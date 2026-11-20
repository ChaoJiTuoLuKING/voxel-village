import { sm, fbm, hs } from './math';

const basinPeaks = [
  [-86, 176, 145, 47],
  [30, 213, 158, 49],
  [125, 166, 139, 43],
  [-147, 91, 111, 42],
  [152, 84, 116, 44],
];

/** Opposite shore and connecting side ridges, outside the inhabited core and rowing lake. */
export function basinRimHeight(x: number, z: number) {
  const margin = Math.max(sm(112, 154, z), sm(84, 130, Math.abs(x)) * sm(32, 92, z));
  if (margin === 0) return 0;
  const radius = Math.hypot(x / 139, (z - 26) / 166);
  const rim = sm(0.66, 1.02, radius) * (1 - sm(1.4, 1.95, radius));
  let peak = 0;
  for (const [a, b, height, width] of basinPeaks)
    peak = Math.max(peak, height * Math.exp(-((x - a) ** 2 + (z - b) ** 2) / width ** 2));
  return (48 + 40 * fbm(x * 0.045 + 21, z * 0.045 + 17) + peak) * rim * margin;
}

export const sx = (j: number) => 64 + 5.6 * Math.sin(j * 0.073 + 0.3),
  fl = (j: number) => 4.3 + 5.7 * (1 - sm(44, 94, j)),
  lvl = (j: number) =>
    j < 10 ? 126 : j < 22 ? 70 : j < 36 ? 24 : j < 45 ? 13 : Math.max(3.25, fl(j) - 0.8);
/** Continuous rock surface before the legacy settlement's integer-grid quantization. */
export function naturalTerrainHeight(x: number, z: number) {
  const i = x + 64,
    j = z + 64,
    r = Math.hypot(x / 84, (z + 3) / 85),
    back = 1 - sm(24, 96, z);
  const n = fbm(x * 0.045 + 21, z * 0.045 + 17),
    ridge = sm(0.52, 1.17, r) * back;
  const peaks = [
    [-88, -72, 75, 37],
    [79, -93, 83, 34],
    [-125, -15, 66, 37],
    [120, -29, 72, 34],
    [-8, -135, 102, 39],
  ];
  let pk = 0;
  for (const [a, b, h, w] of peaks)
    pk = Math.max(pk, h * Math.exp(-((x - a) ** 2 + (z - b) ** 2) / (w * w)));
  let h = fl(j) + (n - 0.45) * 2.4 + ridge * (25 + 39 * n) + pk * sm(0.55, 1.1, r) * back;
  // Uplift only the uninhabited rear/outer ridges. Village terraces keep their elevations.
  const highCountry = Math.max(1 - sm(-78, -38, z), sm(64, 100, Math.abs(x))) * back;
  h += highCountry * (pk * 0.48 + ridge * (12 + 19 * n));
  // A broad rock massif supports the high source and both main drops, not a thin pedestal.
  const gorge = (1 - sm(24, 57, Math.abs(x))) * (1 - sm(-43, -37, z));
  h = Math.max(h, (lvl(j) + 12 + n * 21) * gorge);
  // Broad habitable shelves retain steep enclosing mountains behind the hamlets.
  const shelf = (1 - sm(52, 77, Math.abs(x))) * sm(-40, -18, z) * (1 - sm(27, 40, z));
  h = h * (1 - shelf * 0.82) + (fl(j) + Math.max(0, -z - 2) * 0.13) * shelf * 0.82;
  if (j > 89) {
    const shore = 91 + 3 * Math.sin(i * 0.07) + 1.4 * Math.sin(i * 0.21);
    h -= sm(shore, shore + 9, j) * 13;
    // Keep the open rowing lake; the opposite mountains begin beyond its far bank.
    const lake = (1 - sm(78, 109, Math.abs(x))) * sm(31, 42, z) * (1 - sm(110, 151, z));
    h = h * (1 - lake) - 5 * lake;
    h += sm(113, 160, z) * (13 + 8 * n);
  }
  const basinRim = basinRimHeight(x, z);
  if (basinRim > 0) h = Math.max(h, basinRim);
  // The river is carved into actual terraces; water and falls share these levels.
  const d = Math.abs(i - sx(j));
  if (j < 94) {
    const L = lvl(j);
    if (d < 2.8) h = Math.min(h, L - 1.65);
    else if (d < 8) h = Math.min(h, L + 1 + (d - 3) * 1.55);
    if (j < 45 && d < 10 && d > 2.8) h = Math.max(h, L + 1 + (d - 3) * 0.45);
  }
  if (j < 45 && d < 2.8) h = lvl(j) - 1.65;
  return Math.max(-5, h);
}

// The settlement continues using exactly the same heights and seed as before the art change.
export function terrainHeight(x: number, z: number) {
  let h = naturalTerrainHeight(x, z);
  if (h > 20)
    h = Math.floor(h / 2) * 2 + Math.floor(hs(Math.round(x * 1.4), Math.round(z * 0.7)) * 1.6);
  return Math.max(-5, Math.round(h));
}

/** Broader upper water sheets; the river and every bridge in the village keep their width. */
export const riverHalfWidth = (j: number) => 2.85 + 2.1 * (1 - sm(22, 27, j));
