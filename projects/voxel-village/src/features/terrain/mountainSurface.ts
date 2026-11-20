import { N } from '../../config/world';
import { cl, sm } from '../../world/math';
import { lvl, naturalTerrainHeight, riverHalfWidth, sx } from '../../world/terrain';

export interface TerrainWorld {
  Hm: Int16Array;
  RD: Uint8Array;
  PZ: Uint8Array;
}

export const cliffEdges = [-54.5, -42.5, -28.5, -19.5];

/** The visual land meets the existing foundations, without writing to the village grid. */
export function createMountainSurface(world: TerrainWorld) {
  const gridHeight = (x: number, z: number) => {
    const i = cl(x + 64, 0, N - 1),
      j = cl(z + 64, 0, N - 1);
    const a = Math.floor(i),
      b = Math.floor(j),
      u = i - a,
      v = j - b;
    const h = (dx: number, dz: number) =>
      world.Hm[Math.min(N - 1, a + dx) * N + Math.min(N - 1, b + dz)];
    return (
      h(0, 0) * (1 - u) * (1 - v) + h(1, 0) * u * (1 - v) + h(0, 1) * (1 - u) * v + h(1, 1) * u * v
    );
  };
  return (x: number, z: number, side = 0) => {
    // Each side samples its own ledge. Vertical faces connect them, rather than sloping
    // a height-map triangle through the falling water at the four cascade boundaries.
    const edge = cliffEdges.find((ledge) => Math.abs(z - ledge) < 0.5001);
    const direction =
      edge === undefined ? 0 : Math.abs(z - edge) < 0.0001 ? side : Math.sign(z - edge);
    const sampleZ = edge === undefined ? z : edge + direction * 0.5001;
    // Broad ledge profiles produce rock slabs rather than one-unit corrugations.
    const rockX = Math.floor((x + 64.5) / 8) * 8 - 64.5;
    const u = (x - rockX) / 8;
    let h =
      z < -37.5 && Math.abs(x) < 64
        ? naturalTerrainHeight(rockX, sampleZ) * (1 - u) +
          naturalTerrainHeight(rockX + 8, sampleZ) * u
        : naturalTerrainHeight(x, sampleZ);
    const inside = x >= -64 && x <= 63 && z >= -64 && z <= 63;
    if (inside) {
      const settlement = sm(-40, -36, z);
      h = h * (1 - settlement) + gridHeight(x, sampleZ) * settlement;
    }
    // The upper channel widens only above the last inhabited terrace.
    const j = sampleZ + 64,
      width = riverHalfWidth(j),
      d = Math.abs(x - (sx(j) - 64));
    if (j < 27 && d < width + 1.4) {
      const bed = lvl(j) - 1.65;
      h = Math.min(h, bed + sm(width - 0.15, width + 1.4, d) * 19);
    }
    return h - 0.5;
  };
}
