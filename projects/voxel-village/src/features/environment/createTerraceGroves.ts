import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Quaternion,
  Vector3,
  type Scene,
} from 'three';
import { hs } from '../../world/math';

export type GroveKind = 'pine' | 'sage' | 'lime' | 'gold';
export interface TerraceTree {
  x: number;
  y: number;
  z: number;
  height: number;
  angle: number;
  kind: GroveKind;
  terraceId: number;
}
const palettes: Record<GroveKind, number[]> = {
  pine: [0x194532, 0x23573b, 0x2e6343, 0x38714b],
  sage: [0x345a3c, 0x416c45, 0x527c4c, 0x668d54],
  lime: [0x759641, 0x8daa4c, 0xa2ba59, 0xb6ca6a],
  gold: [0xaa7f2f, 0xc29838, 0xd6ac47, 0xe3bf60],
};

/** Exposed voxel faces only: the same stepped silhouettes as the original waterfall trees. */
export function buildGroveTree(kind: GroveKind) {
  const pine = kind === 'pine' || kind === 'sage',
    height = pine ? 24 : 14;
  const cells = new Map<string, { x: number; y: number; z: number; color: number }>();
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const put = (x: number, y: number, z: number, color: number) =>
    cells.set(key(x, y, z), { x, y, z, color });
  for (let y = 0; y < (pine ? 21 : 10); y++) put(0, y, 0, y % 3 === 0 ? 0x795b34 : 0x695032);
  if (pine) {
    for (let y = 4; y < 24; y++) {
      const radius = Math.max(0.2, 5.3 * (1 - (y - 4) / 20) * (0.7 + 0.3 * (1 - (y % 4) / 4)));
      for (let x = -5; x <= 5; x++)
        for (let z = -5; z <= 5; z++) {
          if (
            Math.max(Math.abs(x), Math.abs(z)) > radius + 0.15 ||
            Math.abs(x) + Math.abs(z) * 0.88 > radius * 1.36
          )
            continue;
          put(x, y, z, palettes[kind][y % 4 === 0 ? 2 : Math.floor(hs(x + 12, y + z * 3) * 2)]!);
        }
    }
  } else {
    for (let x = -5; x <= 5; x++)
      for (let y = 6; y < 14; y++)
        for (let z = -5; z <= 5; z++) {
          const shape = (x * x) / 22 + (y - 9.5) ** 2 / 12 + (z * z) / 19;
          if (shape > 1 + hs(x + 7, z + y * 9) * 0.12) continue;
          const shade = Math.min(3, Math.floor(hs(x + 31, z + y * 5) * 2 + (y - 6) / 5));
          put(x, y, z, palettes[kind][shade]!);
        }
  }
  const positions: number[] = [],
    normals: number[] = [],
    colors: number[] = [];
  const color = new Color();
  for (const cell of cells.values())
    for (let axis = 0; axis < 3; axis++)
      for (const sign of [-1, 1]) {
        const neighbor = [cell.x, cell.y, cell.z];
        neighbor[axis]! += sign;
        if (cells.has(key(neighbor[0]!, neighbor[1]!, neighbor[2]!))) continue;
        const u = (axis + 1) % 3,
          v = (axis + 2) % 3;
        const corners = [
          [-0.5, -0.5],
          [0.5, -0.5],
          [0.5, 0.5],
          [-0.5, 0.5],
        ];
        const order = sign > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
        color.setHex(cell.color);
        for (const index of order) {
          const p = [cell.x, cell.y + 0.5, cell.z],
            n = [0, 0, 0];
          p[axis]! += sign * 0.5;
          p[u]! += corners[index]![0]!;
          p[v]! += corners[index]![1]!;
          n[axis] = sign;
          positions.push(p[0]! / height, p[1]! / height, p[2]! / height);
          normals.push(...n);
          colors.push(color.r, color.g, color.b);
        }
      }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

export function createTerraceGroves(scene: Scene, trees: TerraceTree[]) {
  const material = new MeshLambertMaterial({ vertexColors: true });
  const matrix = new Matrix4(),
    rotation = new Quaternion(),
    up = new Vector3(0, 1, 0);
  for (const kind of Object.keys(palettes) as GroveKind[]) {
    const group = trees.filter((t) => t.kind === kind);
    if (!group.length) continue;
    const mesh = new InstancedMesh(buildGroveTree(kind), material, group.length);
    mesh.name = `terrace-grove-${kind}`;
    group.forEach((tree, index) => {
      rotation.setFromAxisAngle(up, tree.angle);
      matrix.compose(
        new Vector3(tree.x, tree.y, tree.z),
        rotation,
        new Vector3(tree.height, tree.height, tree.height),
      );
      mesh.setMatrixAt(index, matrix);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    scene.add(mesh);
  }
}
