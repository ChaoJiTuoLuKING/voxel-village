import {
  SphereGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  type Scene,
} from 'three';

export function createCloudscape(
  scene: Scene,
  random: () => number,
  animations: ((t: number) => void)[],
) {
  const material = new MeshLambertMaterial({
    color: 0xe3e9ea,
    emissive: 0xd4e2eb,
    emissiveIntensity: 0.55,
  });
  const geometry = new SphereGeometry(0.65, 12, 8);
  const matrix = new Matrix4();
  for (let q = 0; q < 11; q++) {
    const group = new Group();
    const cloud = new InstancedMesh(geometry, material, 32);
    for (let k = 0; k < 32; k++) {
      const a = random() * Math.PI * 2,
        radius = Math.sqrt(random());
      const x = Math.cos(a) * radius * 24,
        z = Math.sin(a) * radius * 12;
      const height = (1 - radius) * 8;
      matrix.makeScale(7 + random() * 9, 6 + random() * 6, 6 + random() * 7);
      matrix.setPosition(Math.round(x / 2) * 2, Math.round(height / 2) * 2, Math.round(z / 2) * 2);
      cloud.setMatrixAt(k, matrix);
      cloud.setColorAt(k, new Color(height > 3 ? 0xf7f5ee : 0xdce7e6));
    }
    group.add(cloud);
    group.position.set(
      ((q % 5) - 2) * 100 + random() * 56,
      310 + Math.floor(q / 5) * 25 + random() * 8,
      -65 - Math.floor(q / 5) * 95 - random() * 40,
    );
    const x0 = group.position.x;
    scene.add(group);
    animations.push((t) => {
      group.position.x = x0 + Math.sin(t * 0.006 + q) * 18;
    });
  }
  return material;
}
