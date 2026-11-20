import { N, LF, WN, ROOFS, WALLS, FLW } from '../../config/world';

import { extraHouses } from '../../config/settlement';

import { sx } from '../../world/terrain.ts';

export function createHouses(world) {
  const { Hm, OC, put, rnd } = world;
  const chims = [];
  const houses = [],
    doors = [];
  function house(x, z, w, d, fl_, r, wall, rf, st) {
    const W = r % 2 ? d : w,
      D = r % 2 ? w : d;
    for (let i = x - 1; i <= x + W; i++)
      for (let j = z - 1; j <= z + D + 1; j++) if (j < 92 && Math.abs(i - sx(j)) < 6) return false;
    let B = Math.max(5, Hm[(x + (W >> 1)) * N + z + (D >> 1)]);
    if (st) B = 6;
    for (let i = x - 1; i <= x + W; i++)
      for (let j = z - 1; j <= z + D + 1; j++) {
        OC[i * N + j] = 1;
        if (!st) Hm[i * N + j] = B;
      }
    const WP = (a, b) => {
      let ww = w,
        dd = d;
      for (let q = 0; q < r; q++) {
        [a, b, ww, dd] = [dd - 1 - b, a, dd, ww];
      }
      return [x + a, z + b];
    };
    const P = (lx, ly, lz, c, f) => {
      const [a, b] = WP(lx, lz);
      put(a, B + ly, b, c, f);
    };
    const H = fl_ * 5,
      top = H + 1,
      wood = 0x6b4a2b,
      stone = 0x9a9486;
    if (st) {
      for (let lx = -1; lx <= w; lx++)
        for (let lz = -1; lz <= d + 1; lz++) {
          P(lx, -1, lz, 0x8a5f35);
          if ((lx % 3 == 0 || lx == w) && (lz % 3 == 0 || lz == d + 1) && lx >= -1)
            for (let y = -1; y >= -8; y--) {
              const [a, b] = WP(lx, lz);
              if (B + y >= Hm[a * N + b]) P(lx, y, lz, 0x4e351f);
            }
        }
    }
    for (let lx = 0; lx < w; lx++)
      for (let lz = 0; lz < d; lz++) {
        P(lx, 0, lz, stone);
        P(lx, -1, lz, stone);
        P(lx, -2, lz, stone);
        const e = lx == 0 || lz == 0 || lx == w - 1 || lz == d - 1;
        if (!e) continue;
        const cor = (lx == 0 || lx == w - 1) && (lz == 0 || lz == d - 1);
        for (let y = 1; y <= H; y++) {
          let c = wall;
          if (y == 1) c = 0x8f8a7c;
          if (cor || (y % 5 == 0 && y > 4) || y == H) c = wood;
          P(lx, y, lz, c);
        }
      }
    const dc = w >> 1,
      dl = dc - 1;
    for (let f = 0; f < fl_; f++) {
      const y0 = 2 + f * 5;
      for (let lx = 1; lx < w - 2; lx += 3) {
        for (const side of [0, 1]) {
          const lz = side ? d - 1 : 0;
          if (side && f == 0 && Math.abs(lx - dc) < 3) continue;
          for (let a = 0; a < 2; a++)
            for (let b = 0; b < 2; b++) {
              P(lx + a, y0 + b, lz, null);
              P(lx + a, y0 + b, side ? lz - 1 : 1, 0xffd98a, WN);
            }
          P(lx - 1, y0, lz, 0x4d6b45);
          P(lx - 1, y0 + 1, lz, 0x4d6b45);
          P(lx + 2, y0, lz, 0x4d6b45);
          P(lx + 2, y0 + 1, lz, 0x4d6b45);
          P(lx, y0 - 1, lz + (side ? 1 : -1), wood);
          P(lx + 1, y0 - 1, lz + (side ? 1 : -1), wood);
          if (side && rnd() < 0.8) {
            P(lx, y0, lz + 1, 0x3f7a35, LF);
            P(lx + 1, y0, lz + 1, FLW[(rnd() * 4) | 0], LF);
          }
        }
      }
    }
    for (let y = 1; y <= 3; y++)
      for (let a = 0; a < 2; a++) {
        P(dl + a, y, d - 1, null);
        P(dl + a, y, d - 2, 0x5a3a22);
      }
    P(dl, 4, d - 1, wood);
    P(dl + 1, 4, d - 1, wood);
    P(dl, 0, d, 0xa8a291);
    P(dl + 1, 0, d, 0xa8a291);
    if (fl_ >= 2 && w >= 7) {
      for (let lx = dc - 2; lx <= dc + 1; lx++)
        for (let lz = d; lz <= d + 1; lz++) P(lx, 4, lz, 0x8a5f35);
      for (let lx = dc - 2; lx <= dc + 1; lx++) P(lx, 5, d + 1, wood);
      P(dc - 2, 5, d, wood);
      P(dc + 1, 5, d, wood);
      P(dc - 2, 6, d + 1, wood);
      P(dc + 1, 6, d + 1, wood);
    } else {
      for (let lx = dl - 1; lx <= dl + 2; lx++)
        for (let lz = d; lz <= d + 1; lz++) P(lx, 4, lz, rf[0]);
      P(dl - 1, 1, d + 1, wood);
      P(dl - 1, 2, d + 1, wood);
      P(dl - 1, 3, d + 1, wood);
      P(dl + 2, 1, d + 1, wood);
      P(dl + 2, 2, d + 1, wood);
      P(dl + 2, 3, d + 1, wood);
    }
    P(dl - 2, 1, d, 0xb5603a);
    P(dl - 2, 2, d, 0xe4577a, LF);
    P(dl + 3, 1, d, 0xb5603a);
    P(dl + 3, 2, d, 0xf0c93a, LF);
    const side = rnd() < 0.5 ? -1 : w;
    for (let k = 0; k < 3; k++) for (let l = 0; l < 2; l++) P(side, 1 + l, 2 + k, 0x8a6a3a);
    const rows = Math.ceil(d / 2) + 1;
    let kl = 0,
      zl = 0,
      zh = 0;
    for (let k = 0; k < rows; k++) {
      const lo = k - 1,
        hi = d - k;
      if (lo > hi) break;
      kl = k;
      zl = lo;
      zh = hi;
      for (let lx = -1; lx <= w; lx++)
        for (let lz = lo; lz <= hi; lz++) {
          const edge = lz <= lo + 1 || lz >= hi - 1;
          if (edge) {
            let c = (k + (lx & 1 && k % 2 ? 1 : 0)) % 2 ? rf[1] : rf[0];
            if (rnd() < 0.04) c = 0x6b8f3a;
            P(lx, top + k, lz, c);
          } else if (lx == 0 || lx == w - 1) P(lx, top + k, lz, k < 1 ? wood : wall);
        }
    }
    for (let lx = -1; lx <= w; lx++)
      for (let lz = zl; lz <= zh; lz++) P(lx, top + kl + 1, lz, 0x7a3a22);
    const cx_ = w - 2;
    for (let y = top; y <= top + rows + 2; y++) P(cx_, y, 2, 0x8a8274);
    P(cx_, top + rows + 3, 2, 0x5a554c);
    const [cwx, cwz] = WP(cx_, 2);
    chims.push([cwx - 64, B + rows + top + 3.5, cwz - 64]);
    if (!st) {
      const [a, b] = WP(dc, d + 2);
      doors.push([a, b]);
    }
    houses.push({ x, z, w, d, B, r, wall, rf, st, WP, P, H, top, rows });
    return true;
  }

  [
    [40, 75, 9, 8, 2, 0, 0, 0],
    [52, 74, 7, 7, 1, 0, 1, 1],
    [38, 63, 9, 8, 2, 0, 2, 2],
    [42, 53, 8, 7, 2, 0, 3, 0],
    [73, 51, 8, 7, 2, 0, 3, 2],
    [39, 42, 8, 7, 2, 0, 1, 1],
    [73, 75, 8, 7, 2, 0, 1, 1],
    [85, 76, 9, 8, 2, 0, 0, 2],
    [72, 63, 7, 7, 2, 0, 2, 0],
    [44, 86, 8, 6, 1, 0, 3, 1, 1],
    [87, 66, 7, 6, 1, 0, 1, 0],
    [29, 73, 7, 7, 2, 0, 2, 1],
    [27, 59, 7, 6, 1, 0, 0, 2],
    [91, 50, 8, 7, 2, 0, 0, 0],
    [51, 29, 6, 5, 1, 0, 1, 1],
    ...extraHouses,
  ].forEach((h, q) => house(h[0], h[1], h[2], h[3], h[4], h[5], WALLS[h[6]], ROOFS[h[7]], h[8]));

  return { houses, doors, chims };
}
