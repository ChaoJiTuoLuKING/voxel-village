import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  MeshLambertMaterial,
  Vector3,
  type Scene,
} from 'three';
import { fbm, hs, sm } from '../../world/math';

// Independent of the settlement height map: these ranges form the far horizon only.
const peaks = [
  [-280, -395, 320, 185],
  [20, -505, 405, 225],
  [285, -410, 355, 190],
  [-510, -150, 315, 200],
  [520, -170, 335, 195],
  [-350, 435, 315, 200],
  [355, 455, 300, 205],
  [10, 570, 380, 230],
  [-610, -590, 410, 255],
  [390, -685, 460, 280],
  [-420, 710, 395, 245],
];

export function createAlpineBackdrop(scene: Scene) {
  const p: number[] = [],
    c: number[] = [];
  const a = new Vector3(),
    b = new Vector3(),
    normal = new Vector3();
  const stone = new Color('#789598'),
    snow = new Color('#e8f0ee'),
    col = new Color();
  const point = (x: number, z: number): [number, number, number] => {
    const px = x + (hs(x, z) - 0.5) * 11,
      pz = z + (hs(z, x + 77) - 0.5) * 11;
    let height = 0;
    for (const [cx, cz, top, radius] of peaks) {
      const d = Math.hypot((px - cx) * 0.9, pz - cz) / radius;
      height = Math.max(height, top * Math.pow(Math.max(0, 1 - d), 0.85));
    }
    height += (fbm(px * 0.014, pz * 0.014) - 0.3) * 38;
    const edge = sm(280, 340, Math.max(Math.abs(px), Math.abs(pz)));
    return [px, Math.max(-7, height) * edge - 9 * (1 - edge), pz];
  };
  const face = (v0: number[], v1: number[], v2: number[]) => {
    a.set(v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]);
    b.set(v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]);
    normal.crossVectors(a, b).normalize();
    for (const v of [v0, v1, v2]) {
      const n = fbm(v[0] * 0.025 + 13, v[2] * 0.025);
      const snowline = 176 + (n - 0.5) * 55;
      const cover = sm(snowline - 8, snowline + 16, v[1]) * sm(0.2, 0.63, normal.y);
      col.copy(stone).lerp(snow, cover);
      p.push(...v);
      c.push(col.r, col.g, col.b);
    }
  };
  for (let x = -872; x < 872; x += 24)
    for (let z = -872; z < 872; z += 24) {
      if (Math.abs(x + 12) < 280 && Math.abs(z + 12) < 280) continue;
      const p0 = point(x, z),
        p1 = point(x + 24, z),
        p2 = point(x + 24, z + 24),
        p3 = point(x, z + 24);
      face(p0, p2, p1);
      face(p0, p3, p2);
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(p, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(c, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const mountain = new Mesh(geometry, new MeshLambertMaterial({ vertexColors: true }));
  mountain.name = 'layered-alpine-horizon';
  scene.add(mountain);
  return mountain;
}
