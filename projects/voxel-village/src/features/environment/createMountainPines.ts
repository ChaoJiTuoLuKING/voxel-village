import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Quaternion,
  Vector3,
  type Scene,
} from 'three';
import { createRandom } from '../../world/random';

/** Branch sprays share one mesh per tree variant. No flat, stacked cone skirts. */
export function buildPineCrown(variant: number) {
  const random = createRandom(7123 + variant * 997);
  const vertices: number[] = [],
    colors: number[] = [];
  const shades = [0x789473, 0x708d6a, 0x62815e, 0x4d6c50].map((c) => new Color(c));
  function triangle(a: Vector3, b: Vector3, c: Vector3, shade: number) {
    // Keep outward normals consistent even for the asymmetric tuft shapes.
    vertices.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    for (let i = 0; i < 3; i++) colors.push(...shades[shade].toArray());
  }
  function tuft(angle: number, y: number, radius: number, width: number, rise: number) {
    const radial = new Vector3(Math.cos(angle), 0, Math.sin(angle));
    const side = new Vector3(-radial.z, 0, radial.x);
    const point = (r: number, h: number, s = 0) =>
      radial
        .clone()
        .multiplyScalar(r)
        .addScaledVector(side, s)
        .add(new Vector3(0, h, 0));
    const points = [
      point(radius * 0.07, y + rise),
      point(radius * 0.6, y, width),
      point(radius, y - rise * 0.22),
      point(radius * 0.6, y, -width),
      point(radius * 0.05, y - rise * 0.35),
      point(radius * 0.46, y + rise * 0.8),
    ];
    // Check each face against the tuft center, rather than relying on a fixed winding.
    const center = points
      .reduce((a, p) => a.add(p), new Vector3())
      .multiplyScalar(1 / points.length);
    const faces = [
      [0, 1, 5],
      [1, 2, 5],
      [2, 3, 5],
      [3, 0, 5],
      [0, 4, 1],
      [1, 4, 2],
      [2, 4, 3],
      [3, 4, 0],
    ];
    faces.forEach(([a, b, c], i) => {
      const normal = points[b].clone().sub(points[a]).cross(points[c].clone().sub(points[a]));
      if (normal.dot(points[a].clone().sub(center)) < 0) [b, c] = [c, b];
      triangle(points[a], points[b], points[c], i < 4 ? (i + variant) % 3 : 3);
    });
  }
  // Irregular whorls overlap vertically, with spaces between individual boughs.
  for (let tier = 0; tier < 7; tier++) {
    const y = 0.19 + tier * 0.108;
    const branches = 4 + ((tier + variant) % 2);
    for (let b = 0; b < branches; b++) {
      const radius = (0.25 - tier * 0.029) * (0.8 + random() * 0.32);
      const angle = (b / branches) * Math.PI * 2 + tier * 1.07 + variant * 0.67 + random() * 0.25;
      tuft(
        angle,
        y + (random() - 0.5) * 0.035,
        radius,
        radius * (0.35 + random() * 0.13),
        0.14 - tier * 0.008,
      );
    }
  }
  // Inner foliage joins the sprays, so close views do not read as a stack of thin plates.
  const core = Array.from({ length: 7 }, (_, level) =>
    Array.from({ length: 5 }, (_, k) => {
      const a = (k * Math.PI * 2) / 5 + level * 0.13,
        radius = (0.09 - level * 0.01) * (0.9 + random() * 0.2);
      return new Vector3(Math.cos(a) * radius, 0.22 + level * 0.105, Math.sin(a) * radius);
    }),
  );
  for (let level = 0; level < 6; level++)
    for (let k = 0; k < 5; k++) {
      const next = (k + 1) % 5;
      triangle(core[level][k], core[level + 1][k], core[level][next], 2);
      triangle(core[level][next], core[level + 1][k], core[level + 1][next], 1);
    }
  // Slender leader made of four small sprays, not a separate cone cap.
  for (let b = 0; b < 4; b++) tuft((b * Math.PI) / 2 + variant, 0.87, 0.047, 0.024, 0.13);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createMountainPines(scene: Scene, trees: number[][]) {
  const bark = new MeshLambertMaterial({ color: 0x77634a });
  const leaves = new MeshLambertMaterial({ vertexColors: true });
  const trunkGeometry = new CylinderGeometry(0.006, 0.018, 0.91, 5).translate(0, 0.455, 0);
  const trunks = new InstancedMesh(trunkGeometry, bark, trees.length);
  trunks.name = 'mountain-pine-trunks';
  const variants = Array.from(
    { length: 4 },
    (_, i) => new InstancedMesh(buildPineCrown(i), leaves, Math.ceil(trees.length / 4)),
  );
  const counts = [0, 0, 0, 0],
    matrix = new Matrix4(),
    color = new Color();
  trees.forEach(([x, y, z, height], i) => {
    const random = createRandom(Math.round((x + 400) * 871 + (z + 400) * 1601));
    const rotation = new Quaternion().setFromEuler(
      new Euler((random() - 0.5) * 0.055, random() * Math.PI * 2, (random() - 0.5) * 0.055),
    );
    const width = 0.82 + random() * 0.35;
    matrix.compose(
      new Vector3(x, y, z),
      rotation,
      new Vector3(height * width, height, height * width),
    );
    trunks.setMatrixAt(i, matrix);
    const v = i % 4,
      slot = counts[v]++;
    variants[v].setMatrixAt(slot, matrix);
    // Restrained per-tree tint; branch vertex colors carry the light/dark structure.
    color.setHSL(0.22 + random() * 0.08, 0.07 + random() * 0.08, 0.76 + random() * 0.12);
    variants[v].setColorAt(slot, color);
  });
  variants.forEach((mesh, i) => {
    mesh.name = `mountain-pine-crowns-${i}`;
    mesh.count = counts[i];
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
  });
  trunks.castShadow = true;
  scene.add(trunks);
}
