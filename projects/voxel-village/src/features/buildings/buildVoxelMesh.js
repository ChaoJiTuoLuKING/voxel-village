import * as T from 'three';
import { N, YMAX, LF, WN, FLW } from '../../config/world';
import { hs } from '../../world/math';

export function buildVoxelMesh(world, mesh) {
  const { M, K } = world;
  const { FACES, builder, quad, finish } = mesh;
  const bSolid = builder(),
    bLeaf = builder(),
    bWin = builder(),
    smallFlowers = [];
  const occupied = (x, y, z) =>
    x >= 0 && z >= 0 && x < N && z < N && y >= 0 && y < YMAX && M.has(K(x, y, z));
  for (const [key, val] of M) {
    const y = key % YMAX,
      ij = (key - y) / YMAX,
      j = ij % N,
      i = (ij - j) / N,
      lf = val & LF,
      wn = val & WN,
      c = val & 0xffffff,
      b = wn ? bWin : lf ? bLeaf : bSolid;
    if (lf && FLW.includes(c)) {
      smallFlowers.push([i - 64, y, j - 64, c]);
      continue;
    }
    for (const f of FACES) {
      const [nx, ny, nz] = f.n;
      if (occupied(i + nx, y + ny, j + nz)) continue;
      const verts = f.v.map((v) => [i - 64 + v[0], y + v[1], j - 64 + v[2]]);
      const ao = f.v.map((v) => {
        const p = [i + nx, y + ny, j + nz],
          a = p.slice(),
          bb = p.slice(),
          ab = p.slice(),
          su = Math.sign(v[f.u]),
          sv = Math.sign(v[f.vv]);
        a[f.u] += su;
        bb[f.vv] += sv;
        ab[f.u] += su;
        ab[f.vv] += sv;
        const s1 = occupied(...a),
          s2 = occupied(...bb),
          sc = occupied(...ab);
        const occ = s1 && s2 ? 3 : s1 + s2 + sc;
        return (1 - occ * (lf ? 0.075 : 0.13)) * (0.94 + 0.06 * hs(i * 3 + y, j * 5));
      });
      quad(b, verts, f.n, c, ao);
    }
  }
  const solidMesh = finish(bSolid),
    leafMesh = finish(bLeaf),
    wm = new T.MeshBasicMaterial({ vertexColors: true, color: 0x748f9b });
  const windowMesh = finish(bWin, wm);

  return { wm, smallFlowers };
}
