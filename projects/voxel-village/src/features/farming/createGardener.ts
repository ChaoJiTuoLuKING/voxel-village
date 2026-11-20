import { Group, Vector3, type Mesh } from 'three';
import { connect, type LakeBox } from '../environment/lakeActor';
export function createGardener(box: LakeBox) {
  const root = new Group(),
    body = new Group();
  root.name = '青菜婶';
  root.add(body);
  box(body, 0.86, 0.94, 0.52, 0x67805a, 0, 0.45);
  box(body, 0.72, 0.62, 0.08, 0xd7c69d, 0, 0.32, 0.29);
  box(body, 0.65, 0.68, 0.65, 0xe1b78d, 0, 1.23);
  box(body, 1.14, 0.12, 1.05, 0xd4b66c, 0, 1.64);
  box(body, 0.65, 0.26, 0.63, 0xd4b66c, 0, 1.79);
  const arms = [-1, 1].map((side) => ({
    side,
    upper: box(root, 0.25, 1, 0.28, 0x67805a),
    lower: box(root, 0.24, 1, 0.26, 0x67805a),
    hand: box(root, 0.26, 0.23, 0.26, 0xe1b78d),
  }));
  const legs = [-1, 1].map((side) => ({
    side,
    upper: box(root, 0.32, 1, 0.35, 0x515347),
    lower: box(root, 0.3, 1, 0.33, 0x515347),
    foot: box(root, 0.34, 0.18, 0.52, 0x3e4036),
  }));
  const reach: number[] = [];
  function limb(
    upper: Mesh,
    lower: Mesh,
    a: Vector3,
    b: Vector3,
    length: number,
    bend: Vector3,
    width: number,
  ) {
    const axis = b.clone().sub(a),
      distance = axis.length();
    axis.normalize();
    bend.addScaledVector(axis, -bend.dot(axis)).normalize();
    const joint = a
      .clone()
      .add(b)
      .multiplyScalar(0.5)
      .addScaledVector(bend, Math.sqrt(Math.max(0, length * length - (distance * distance) / 4)));
    connect(upper, a, joint, width);
    connect(lower, joint, b, width);
    return distance;
  }
  function pose(
    crouch: number,
    walk: number,
    left: Vector3,
    right: Vector3,
    surface?: (x: number, z: number) => number,
  ) {
    body.position.set(0, 1 - crouch * 0.4, 0);
    body.rotation.x = crouch * 0.48;
    body.updateMatrix();
    reach.length = 0;
    arms.forEach((arm, i) => {
      const start = new Vector3(arm.side * 0.54, 0.74, 0).applyMatrix4(body.matrix),
        end = i === 0 ? left : right;
      reach.push(
        limb(arm.upper, arm.lower, start, end, 0.78, new Vector3(arm.side, 0.1, -0.25), 0.25),
      );
      arm.hand.position.copy(end);
    });
    legs.forEach((leg) => {
      const stride = Math.sin(walk) * 0.18 * leg.side,
        foot = new Vector3(leg.side * 0.24, 0.09 + Math.max(0, stride) * 0.35, stride);
      if (surface) {
        root.updateMatrixWorld(true);
        const world = root.localToWorld(foot.clone());
        foot.y += surface(world.x, world.z) - root.position.y;
      }
      leg.foot.position.copy(foot);
      limb(
        leg.upper,
        leg.lower,
        new Vector3(leg.side * 0.22, 1 - crouch * 0.4, 0),
        foot.clone().add(new Vector3(0, 0.09, 0)),
        0.55,
        new Vector3(0, 0, 1),
        0.32,
      );
    });
  }
  pose(0, 0, new Vector3(-0.6, 1.05, 0.15), new Vector3(0.6, 1.05, 0.15));
  return {
    root,
    body,
    pose,
    reach,
    arms,
    legs,
    nm: '青菜婶',
    act: '在小菜园照料庄稼，可以一起种菜',
  };
}
