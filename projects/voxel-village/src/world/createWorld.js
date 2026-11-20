import { N, YMAX, WORLD_SEED } from '../config/world';
import { cl } from './math';
import { terrainHeight, sx, lvl } from './terrain.ts';
import { fishingPiers } from '../config/settlement';
import { createRandom } from './random';
const makeRandom = () => createRandom(WORLD_SEED);

export function createWorld() {
  const rnd = makeRandom();
  const Hm = new Int16Array(N * N),
    RD = new Uint8Array(N * N),
    OC = new Uint8Array(N * N),
    PZ = new Uint8Array(N * N);

  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) Hm[i * N + j] = terrainHeight(i - 64, j - 64);
  const M = new Map(),
    K = (i, y, j) => (i * N + j) * YMAX + y;
  const put = (i, y, j, c, f = 0) => {
    i = Math.round(i);
    y = Math.round(y);
    j = Math.round(j);
    if (i < 0 || j < 0 || i >= N || j >= N || y < 0 || y >= YMAX) return;
    if (c == null) M.delete(K(i, y, j));
    else M.set(K(i, y, j), c | f);
  };
  const fill = (a, b, c, d, e, f, col, fg) => {
    for (let x = a; x <= d; x++)
      for (let y = b; y <= e; y++) for (let z = c; z <= f; z++) put(x, y, z, col, fg);
  };
  const ground = (x, z) => {
    const i = Math.round(x + 64),
      j = Math.round(z + 64);
    for (const pier of fishingPiers)
      if (
        Math.abs(x - pier.x) <= pier.width / 2 &&
        z >= pier.z - 6 &&
        z <= pier.z + pier.length + 0.3
      )
        return 4.29;
    if (i >= 75 && i <= 77 && j >= 89 && j <= 102) return 4.5;
    if (i >= BR.x0 && i <= BR.x1 && j >= 82 && j <= 82 + 1 && j >= 81) return BR.y + 0.5;
    return hf(x + 64, z + 64);
  };
  const BR = { x0: 0, x1: 0, y: 0 };
  BR.x0 = Math.round(sx(82)) - 6;
  BR.x1 = Math.round(sx(82)) + 6;
  BR.y = Math.ceil(lvl(82) + 1.5);

  const hg = (i, j) => (i < 0 || j < 0 || i >= N || j >= N ? 0 : Hm[i * N + j]);
  const hf = (x, z) => {
    const i = Math.round(cl(x, 0, N - 1)),
      j = Math.round(cl(z, 0, N - 1));
    return Hm[i * N + j] - 0.5;
  };

  return { Hm, RD, OC, PZ, M, K, put, fill, ground, BR, hg, hf, rnd };
}
