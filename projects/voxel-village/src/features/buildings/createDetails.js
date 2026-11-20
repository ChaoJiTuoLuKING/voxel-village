import * as T from 'three';
import { N, FLW } from '../../config/world';
import { hs } from '../../world/math';
import { sx } from '../../world/terrain.ts';

export function createDetails(world, buildings, vegetation, smallFlowers, mesh) {
  const { Hm, rnd } = world;
  const { houses } = buildings;
  const { flowerSpots, RN } = vegetation;
  const { instDetails } = mesh;
  // Fine carpentry sits on the original v2.2 building footprints.
  const fine = [],
    glow = [];
  function detail(x, y, z, w, h, d, c, lit = false) {
    (lit ? glow : fine).push([x, y, z, w, h, d, c]);
  }
  for (const h of houses) {
    const { x, z, w, d, B, WP, H, top, rf, st } = h;
    const dp = (a, y, b, ww, hh, dd, c, lit = false) => {
      const [p, q] = WP(a, b);
      detail(p - 64, B + y, q - 64, ww, hh, dd, c, lit);
    };
    // Individually coursed half-block roof tiles and occasional weathered pieces.
    for (let k = 0; k < Math.ceil(d / 2) + 1; k++) {
      const lo = k - 1,
        hi = d - k;
      if (lo > hi) break;
      for (let ax = -1; ax < w + 0.5; ax += 0.5)
        for (const zz of [lo - 0.13, lo + 0.38, hi - 0.38, hi + 0.13]) {
          const cc = new T.Color(rf[k % 2]);
          cc.multiplyScalar(0.84 + hs(Math.round(ax * 23 + x), z + k * 13) * 0.26);
          dp(ax + 0.22, top + k + 0.515, zz, 0.46, 0.045, 0.43, cc.getHex());
        }
    }
    // Plaster repairs and exposed stone at the foundation, kept behind the joinery.
    for (let yy = 0.7; yy < H; yy += 0.55)
      for (let ax = 0.5; ax < w - 1; ax += 0.8) {
        const rr = hs(Math.round(x + ax * 13), Math.round(z + yy * 11));
        if (rr < 0.1) dp(ax, yy, d - 0.475, 0.48, 0.24, 0.06, yy < 2 ? 0x9a9b8c : 0xc5bda5);
      }
    // Facade joinery, separated window panes, shutters and flower boxes.
    for (let f = 0; f < Math.round(H / 5); f++) {
      const yy = 2 + f * 5;
      for (let a = 1; a < w - 2; a += 3) {
        for (const side of [0, 1]) {
          if (side && f === 0 && Math.abs(a - (w >> 1)) < 3) continue;
          const zz = side ? d - 0.43 : -0.57,
            sgn = side ? 1 : -1;
          dp(a + 0.5, yy + 0.5, zz, 2, 0.13, 0.12, 0xe8d8b3);
          dp(a + 0.5, yy + 0.5, zz, 0.13, 2, 0.12, 0xe8d8b3);
          dp(a + 0.5, yy + 1.48, zz, 2.35, 0.18, 0.22, 0x765036);
          for (const ax of [a - 0.66, a + 1.66])
            for (let sl = 0; sl < 6; sl++)
              dp(ax, yy - 0.35 + sl * 0.32, zz, 0.52, 0.19, 0.22, sl % 2 ? 0x3f735e : 0x507e60);
          if (side) {
            dp(a + 0.5, yy - 0.72, zz + 0.36, 2.45, 0.45, 0.65, 0x785333);
            for (let fl = 0; fl < 7; fl++) {
              dp(a - 0.45 + fl * 0.31, yy - 0.31, zz + 0.42, 0.2, 0.3, 0.3, 0x3a6d38);
              dp(a - 0.45 + fl * 0.31, yy - 0.08, zz + 0.42, 0.25, 0.22, 0.25, FLW[(fl + f) % 4]);
            }
          }
        }
      }
      for (const xx of [0.05, w - 1.05]) dp(xx, f * 5 + 2.6, d - 0.43, 0.3, 4.6, 0.24, 0x68442b);
      dp((w - 1) / 2, f * 5 + 4.5, d - 0.43, w, 0.3, 0.28, 0x795436);
    }
    for (const xx of [1.1, w - 2.1])
      for (let k = 0; k < 6; k++)
        dp(
          xx + (xx < w / 2 ? 1 : -1) * k * 0.17,
          H - 1.25 + k * 0.18,
          d - 0.32,
          0.24,
          0.28,
          0.18,
          0x6e4a2f,
        );
    const dc = w >> 1;
    dp(dc - 0.5, 1.8, d - 0.43, 1.65, 3.3, 0.18, 0x60432d);
    dp(dc - 0.08, 1.8, d - 0.29, 0.16, 0.16, 0.13, 0xe3b459);
    // A front-facing attic gable breaks up the repeated roof direction.
    if (w >= 8) {
      for (let k = 0; k < 3; k++) {
        dp(dc - 0.5, top + k, d - 1.25, 4 - k * 1.35, 1, 1.6, 0xe2d1a8);
        for (const sign of [-1, 1])
          dp(dc - 0.5 + sign * (2 - k * 0.65), top + k + 0.42, d - 1.25, 1.05, 0.27, 2.15, rf[0]);
      }
      dp(dc - 0.5, top + 1.2, d - 0.38, 0.9, 1.2, 0.12, 0x466874);
      dp(dc - 0.5, top + 1.2, d - 0.28, 0.12, 1.2, 0.1, 0xe9dcba);
    }
    // Side-wall windows and stepped timber braces keep every orbit angle finished.
    for (let floor = 0; floor < H / 5; floor++)
      for (const side of [-0.54, w - 0.46])
        for (const zz of [2, d - 3]) {
          const yy = 2.3 + floor * 5,
            sign = side < 0 ? -1 : 1;
          dp(side, yy, zz, 0.09, 1.9, 1.5, 0x4f6e76);
          dp(side + sign * 0.06, yy, zz, 0.1, 2, 0.12, 0xe8dcc0);
          dp(side + sign * 0.06, yy, zz, 0.1, 0.12, 1.6, 0xe8dcc0);
          for (const zt of [zz - 0.92, zz + 0.92])
            dp(side + sign * 0.04, yy, zt, 0.14, 2.2, 0.24, 0x55765b);
          dp(side + sign * 0.08, yy - 1.12, zz, 0.28, 0.2, 2.2, 0x785b3a);
        }
    for (const side of [-0.57, w - 0.43]) {
      for (let k = 0; k < Math.ceil(d / 2); k++) {
        dp(side, top + k, (d - 1) / 2, 0.14, 1, 0.24, 0x704b31);
        for (const sign of [-1, 1])
          dp(side, top + k, sign * (d / 2 - k) + (d - 1) / 2, 0.15, 0.38, 1.1, 0x775038);
      }
    }
    // Alternating brick courses and a flared stone chimney cap.
    const cy = top + Math.ceil(d / 2) + 2;
    for (let yy = top + 1; yy <= cy; yy++)
      dp(w - 2, yy, 2, 1.2, 0.95, 1.2, yy % 3 === 0 ? 0xb26b4d : 0xb5b09e);
    dp(w - 2, cy + 0.6, 2, 1.65, 0.38, 1.65, 0x6c7068);
    dp(w - 2, cy + 0.81, 2, 0.95, 0.08, 0.95, 0x333b36);
    if (st || H >= 10) {
      for (let k = 0; k < 7; k++) dp(-0.1 + k * 0.62, 3.95, d + 1.4, 0.14, 1.2, 0.18, 0x755435);
      dp(1.8, 4.65, d + 1.4, 4.5, 0.19, 0.28, 0x946c40);
    }
  }
  for (const [x, z, h, c] of flowerSpots)
    for (let q = 0; q < 3; q++) {
      const xx = x - 64 + (q - 1) * 0.22,
        zz = z - 64 + (hs(x + q, z) - 0.5) * 0.6;
      detail(xx, h - 0.15, zz, 0.05, 0.5, 0.05, 0x477238);
      detail(xx, h + 0.15, zz, 0.17, 0.13, 0.17, c);
    }
  for (const [x, y, z, c] of smallFlowers)
    for (let q = 0; q < 4; q++) {
      detail(
        x + ((q % 2) - 0.5) * 0.36,
        y - 0.12,
        z + (Math.floor(q / 2) - 0.5) * 0.36,
        0.06,
        0.48,
        0.06,
        0x4a793d,
      );
      detail(
        x + ((q % 2) - 0.5) * 0.36,
        y + 0.16,
        z + (Math.floor(q / 2) - 0.5) * 0.36,
        0.25,
        0.18,
        0.25,
        c,
      );
    }
  // Clock face: a square dial, twelve hour markers, two hands and a coloured emblem.
  {
    const B = Hm[52 * N + 62],
      cx = -12,
      cz = 1.58,
      cy = B + 12;
    detail(cx, cy, cz, 3.9, 3.9, 0.15, 0xe9e0b8);
    for (let k = 0; k < 12; k++) {
      const a = (k * Math.PI) / 6;
      detail(
        cx + Math.sin(a) * 1.48,
        cy + Math.cos(a) * 1.48,
        cz + 0.12,
        0.24,
        0.24,
        0.13,
        0x4c4b3d,
      );
    }
    detail(cx, cy + 0.54, cz + 0.2, 0.18, 1.2, 0.17, 0x3c4138);
    detail(cx + 0.38, cy + 0.04, cz + 0.22, 0.94, 0.18, 0.19, 0x3c4138);
    for (let y = 1; y < 22; y++)
      for (let x = 0; x < 5; x++) {
        if (hs(x * 17, y * 11) > 0.25 || (y > 9 && y < 15)) continue;
        detail(-14 + x, B + y, 0.54, 0.66, 0.43, 0.08, y % 3 ? 0xb6b5a5 : 0x939d94);
        detail(-14.54, B + y, -4 + x, 0.08, 0.43, 0.66, y % 3 ? 0xb6b5a5 : 0x939d94);
      }
    const cols = [0xe9b44c, 0x4f9d97, 0xb64b3f, 0x607b9c];
    for (let k = 0; k < 4; k++)
      detail(
        cx + ((k % 2) - 0.5) * 1.05,
        B + 18.1 + (k > 1 ? 0.5 : -0.5),
        cz,
        0.9,
        0.9,
        0.2,
        cols[k],
      );
  }
  // Garden fences and grass blades, deliberately held back from paths.
  for (let x = 28; x < 98; x++)
    for (let z = 43; z < 97; z++) {
      if (RN(x, z) || Hm[x * N + z] < 5 || Math.abs(x - sx(z)) < 4) continue;
      const h = Hm[x * N + z];
      if (h > 22 || hs(x, z) > 0.34) continue;
      for (let q = 0; q < 3; q++)
        detail(
          x - 64 + (rnd() - 0.5) * 0.8,
          h - 0.2 + rnd() * 0.15,
          z - 64 + (rnd() - 0.5) * 0.8,
          0.09,
          0.35 + rnd() * 0.48,
          0.11,
          q % 2 ? 0x86a84c : 0x5e8e39,
        );
    }
  instDetails(fine, new T.MeshLambertMaterial());
  if (glow.length) instDetails(glow, new T.MeshBasicMaterial());
}
