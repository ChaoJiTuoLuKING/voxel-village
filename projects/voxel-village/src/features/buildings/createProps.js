import { N, LF, WN } from '../../config/world';

import { lvl } from '../../world/terrain.ts';

export function createProps(world) {
  const { Hm, OC, PZ, put, BR } = world;
  // bridge, plaza, dock, props
  (function () {
    const j0 = 82;
    for (let i = BR.x0; i <= BR.x1; i++)
      for (let j = j0 - 1; j <= j0 + 1; j++) {
        put(i, BR.y, j, (i + j) % 2 ? 0x8a5f35 : 0x9b6e40);
        if (j != j0 && (i - BR.x0) % 3 == 0) {
          put(i, BR.y + 1, j, 0x6b4a2b);
          put(i, BR.y + 2, j, 0x6b4a2b);
        } else if (j != j0) put(i, BR.y + 1, j, 0x7a5632);
      }
    for (const i of [BR.x0 + 1, BR.x1 - 1])
      for (let j = j0 - 1; j <= j0 + 1; j++)
        for (let y = Math.max(0, Hm[i * N + j] - 2); y < BR.y; y++) put(i, y, j, 0x8f8a7c);
    for (let i = BR.x0 + 3; i <= BR.x1 - 3; i += 3)
      for (let j of [j0 - 1, j0 + 1])
        for (let y = Math.max(0, Math.floor(lvl(j)) - 1); y < BR.y; y++) put(i, y, j, 0x4e351f);
    for (let i = 52; i <= 62; i++)
      for (let j = 80; j <= 87; j++) {
        PZ[i * N + j] = 1;
        OC[i * N + j] = 1;
      }
    const lamp = (x, z) => {
      const y0 = Hm[x * N + z];
      for (let y = -1; y < 5; y++) put(x, y0 + y, z, 0x4a4a4a);
      put(x, y0 + 5, z, 0xffe9a0, WN);
    };
    [
      [52, 80],
      [62, 80],
      [52, 87],
      [62, 87],
      [BR.x0 - 1, 81],
      [BR.x1 + 1, 83],
    ].forEach((p) => lamp(...p));
    const bench = (x, z) => {
      const y0 = Hm[x * N + z];
      for (let a = -1; a <= 1; a++) {
        put(x + a, y0, z, 0x6b4a2b);
        put(x + a, y0 + 1, z - 1, 0x7a5632);
      }
      put(x - 1, y0 - 1, z, 0x4e351f);
      put(x + 1, y0 - 1, z, 0x4e351f);
    };
    bench(53, 81);
    bench(61, 81);
    const stall = (x, z, c) => {
      const y0 = Hm[x * N + z];
      for (const [a, b] of [
        [0, 0],
        [4, 0],
        [0, 2],
        [4, 2],
      ])
        for (let y = -1; y < 4; y++) put(x + a, y0 + y, z + b, 0x6b4a2b);
      for (let a = 0; a <= 4; a++) {
        put(x + a, y0, z, 0x8a5f35);
        put(x + a, y0 + 1, z, 0x8a5f35);
        if (a % 2 == 0)
          put(x + a, y0 + 2, z, [0xd9462b, 0xf2a93a, 0x6bb24a][((a / 2 + z) % 3) | 0], LF);
        for (let b = -1; b <= 3; b++) put(x + a, y0 + 4, z + b - 0.5, (a + b) % 2 ? c : 0xf3ecd8);
      }
    };
    stall(53, 86, 0xc4452f);
    stall(58, 86, 0x3f78a8);
    const wy = Hm[57 * N + 83];
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++)
        if (a || b) for (let y = 0; y < 2; y++) put(57 + a, wy + y, 83 + b, 0x8f8a7c);
    for (const a of [-1, 1]) for (let y = 2; y < 5; y++) put(57 + a, wy + y, 83, 0x6b4a2b);
    for (let a = -1; a <= 1; a++) put(57 + a, wy + 5, 83, 0xb5502f);
    for (let i = 75; i <= 77; i++)
      for (let j = 89; j <= 102; j++) {
        put(i, 4, j, j % 2 ? 0x8a5f35 : 0x9b6e40);
      }
    for (const i of [74, 78])
      for (let j = 89; j <= 102; j += 3) for (let y = 0; y <= 6; y++) put(i, y, j, 0x4e351f);
    for (let j = 90; j <= 102; j += 3)
      for (let y = 0; y <= 3; y++) {
        put(75, y, j, 0x4e351f);
        put(77, y, j, 0x4e351f);
      }
    for (const [a, b] of [
      [75, 92],
      [77, 92],
      [75, 96],
      [76, 97],
    ])
      for (let y = 5; y <= 6; y++) put(a, y, b, 0x8a6a3a);
    put(76, 5, 100, 0x8a5a2a);
    put(77, 5, 100, 0x8a5a2a);
    put(77, 6, 100, 0x8a5a2a);
    put(75, 5, 100, 0xb0a590);
    put(75, 5, 99, 0xb0a590);

    for (let y = 0; y < 8; y++) put(74, y, 102, 0x4e351f);
  })();
}
