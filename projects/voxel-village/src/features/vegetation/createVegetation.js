import { N, LF, FLW } from '../../config/world';
import { hs, cl } from '../../world/math';
import { sx } from '../../world/terrain.ts';

export function createVegetation(world) {
  const { Hm, OC, RD, PZ, put, hg, rnd } = world;
  // ---------- vegetation ----------
  const GL = [0x234d3d, 0x2f6248, 0x497b49, 0x73964c, 0x97b65b, 0xb2c879];
  function conifer(i, j) {
    const h = Hm[i * N + j],
      ht = 13 + ((rnd() * 16) | 0),
      R = 2.2 + rnd() * 2.3;
    for (let y = -2; y < ht * 0.74; y++) put(i, h + y, j, 0x62482e);
    for (let k = 2; k < ht; k++) {
      const taper = 1 - k / ht,
        tier = (k % 4) / 4,
        rr = Math.max(0.35, R * taper * (0.77 + 0.32 * (1 - tier)));
      for (let a = -5; a <= 5; a++)
        for (let b = -5; b <= 5; b++)
          if (
            Math.abs(a) + Math.abs(b) * 0.88 < rr * 1.35 &&
            Math.max(Math.abs(a), Math.abs(b)) <= rr + 0.2
          ) {
            const c = GL[k % 4 === 2 ? 1 : 0];
            put(i + a, h + k, j + b, c, LF);
          }
    }
    put(i, h + ht, j, GL[1], LF);
  }
  function broad(i, j, wil, autumn = false) {
    const h = Hm[i * N + j],
      th = wil ? 7 : 5 + ((rnd() * 3) | 0),
      R = wil ? 4.1 : 3.3 + rnd() * 1.3;
    const pal = autumn ? [0x8b6126, 0xb28030, 0xc99635, 0xd8a741, 0xe1b347, 0xe9c05c] : GL;
    for (let y = -2; y < th; y++) put(i, h + y, j, 0x695033);
    for (let a = -6; a <= 6; a++)
      for (let b = -6; b <= 6; b++)
        for (let c = -3; c <= 3; c++) {
          const dd = (a * a + b * b) / (R * R) + (c * c) / 8;
          if (
            dd < 1 + hs(i + a * 3, j + b * 5 + c) * 0.16 &&
            !(dd > 0.85 && hs(a + i + c, b + j) > 0.93)
          )
            put(
              i + a,
              h + th + c,
              j + b,
              pal[cl(3 + (c > 0 ? 1 : 0) + (hs(i + a, j + b) > 0.72 ? 1 : 0), 0, 5)],
              LF,
            );
        }
    if (wil)
      for (let a = -4; a <= 4; a++)
        for (let b = -4; b <= 4; b++)
          if (Math.hypot(a, b) > 2.9 && Math.hypot(a, b) < 4.3 && rnd() < 0.7)
            for (let y = 0, L = 3 + ((rnd() * 5) | 0); y < L; y++)
              put(i + a, h + th - 1 - y, j + b, GL[2 + (y % 2)], LF);
  }
  const RN = (x, z) =>
    x < 2 || z < 2 || x > N - 3 || z > N - 3 || OC[x * N + z] || RD[x * N + z] || PZ[x * N + z];
  const treeCenters = [];
  for (let i = 3; i < N - 3; i += 2)
    for (let j = 3; j < N - 3; j += 2) {
      const h = Hm[i * N + j],
        d = Math.abs(i - sx(j));
      if (h < 5 || h > 148 || (j < 94 && d < 7) || (j > 89 && i > 23 && i < 105)) continue;
      const inV = i > 5 && i < 123 && j > 30 && j < 94;
      let blocked = false;
      for (let a = -3; a <= 3 && !blocked; a += 2)
        for (let b = -3; b <= 3; b += 2)
          if (RN(i + a, j + b)) {
            blocked = true;
            break;
          }
      if (blocked) continue;
      const slope = Math.max(
        Math.abs(hg(i + 2, j) - h),
        Math.abs(hg(i - 2, j) - h),
        Math.abs(hg(i, j + 2) - h),
        Math.abs(hg(i, j - 2) - h),
      );
      if (slope > (inV ? 7 : 14) || rnd() > (inV ? 0.035 : 0.62)) continue;
      if (treeCenters.some((p) => (p[0] - i) ** 2 + (p[1] - j) ** 2 < 14)) continue;
      treeCenters.push([i, j]);
      if (!inV && rnd() < 0.84) conifer(i, j);
      else broad(i, j, false, rnd() < 0.2);
    }
  [
    [35, 85, 0, 0],
    [57, 65, 0, 1],
    [36, 51, 0, 1],
    [93, 88, 0, 0],
    [68, 72, 0, 1],
    [80, 69, 0, 0],
    [83, 91, 1, 0],
    [53, 91, 1, 0],
    [30, 85, 0, 0],
    [95, 61, 0, 1],
    [34, 65, 0, 0],
    [79, 43, 0, 0],
    [30, 93, 0, 0],
    [97, 93, 0, 0],
  ].forEach(([i, j, w, a]) => broad(i, j, !!w, !!a));
  const flowerSpots = [];
  // Small flower beds occupy path margins, leaving the walking network clear.
  for (let i = 26; i < 98; i++)
    for (let j = 42; j < 94; j++) {
      const h = Hm[i * N + j];
      if (RN(i, j) || h < 5 || Math.abs(i - sx(j)) < 4) continue;
      if (rnd() < 0.09 && h < 20) flowerSpots.push([i, j, h, FLW[(rnd() * 4) | 0]]);
    }

  return { treeCenters, flowerSpots, RN };
}
