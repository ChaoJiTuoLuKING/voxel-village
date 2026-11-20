import { terrainHeight } from '../../world/terrain';

/** Spatially indexed triangles keep forest roots and camera protection on the rendered surface. */
export function createTerrainSampler(positions: number[]) {
  const cells = new Map<string, number[]>(),
    size = 16;
  for (let offset = 0; offset < positions.length; offset += 9) {
    const xs = [positions[offset], positions[offset + 3], positions[offset + 6]];
    const zs = [positions[offset + 2], positions[offset + 5], positions[offset + 8]];
    for (let x = Math.floor(Math.min(...xs) / size); x <= Math.floor(Math.max(...xs) / size); x++)
      for (
        let z = Math.floor(Math.min(...zs) / size);
        z <= Math.floor(Math.max(...zs) / size);
        z++
      ) {
        const key = `${x},${z}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key)!.push(offset);
      }
  }
  return (x: number, z: number) => {
    let height = -Infinity;
    for (const k of cells.get(`${Math.floor(x / size)},${Math.floor(z / size)}`) ?? []) {
      const ax = positions[k],
        az = positions[k + 2];
      const bx = positions[k + 3],
        bz = positions[k + 5];
      const cx = positions[k + 6],
        cz = positions[k + 8];
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(det) < 1e-8) continue;
      const a = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det;
      const b = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det;
      const c = 1 - a - b;
      if (a < -1e-6 || b < -1e-6 || c < -1e-6) continue;
      height = Math.max(height, a * positions[k + 1] + b * positions[k + 4] + c * positions[k + 7]);
    }
    return Number.isFinite(height) ? height : terrainHeight(x, z);
  };
}
