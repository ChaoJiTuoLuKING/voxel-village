import { Group, Mesh, Object3D, Vector3, type MeshLambertMaterial } from 'three';
import type { FocusTarget } from '../camera/createCameraController';

export type LakeBox = (
  parent: Object3D,
  w: number,
  h: number,
  d: number,
  color: number,
  x?: number,
  y?: number,
  z?: number,
) => Mesh<import('three').BoxGeometry, MeshLambertMaterial>;

const up = new Vector3(0, 1, 0);
/** Connect two anchors; the mesh's unit-height geometry is reused. */
export function connect(part: Mesh, start: Vector3, end: Vector3, width: number, depth = width) {
  part.position.copy(start).add(end).multiplyScalar(0.5);
  part.scale.set(width, start.distanceTo(end), depth);
  part.quaternion.setFromUnitVectors(up, end.clone().sub(start).normalize());
}

/** Root is the seat surface. Hands are solved from actual prop anchors, never independent loops. */
export function createSeatedActor(box: LakeBox, nm: string, color: number, act: string) {
  const root = new Group(),
    torso = new Group();
  root.name = nm;
  torso.position.y = 0.12;
  root.add(torso);
  box(root, 0.72, 0.2, 0.48, 0x4d575d, 0, 0.06);
  box(torso, 0.86, 1, 0.55, color, 0, 0.5);
  box(torso, 0.67, 0.72, 0.67, 0xe1b78d, 0, 1.32);
  box(torso, 1.13, 0.13, 1.05, 0xc7a356, 0, 1.77);
  box(torso, 0.66, 0.28, 0.65, 0xc7a356, 0, 1.92);
  for (const side of [-1, 1]) {
    box(root, 0.34, 0.3, 0.68, 0x4d575d, side * 0.23, 0, 0.28);
    box(root, 0.31, 0.5, 0.3, 0x4d575d, side * 0.23, -0.29, 0.58);
    box(root, 0.34, 0.17, 0.5, 0x393d35, side * 0.23, -0.56, 0.69);
  }
  const limbs = [-1, 1].map((side) => ({
    side,
    upper: box(torso, 0.27, 1, 0.3, color),
    lower: box(torso, 0.25, 1, 0.27, color),
    hand: box(torso, 0.26, 0.25, 0.27, 0xe1b78d),
  }));
  const actor: FocusTarget = { nm, act, root };
  function grip(targets: Vector3[]) {
    torso.updateWorldMatrix(true, false);
    limbs.forEach((limb, i) => {
      limb.upper.name = `upper-arm-${i}`;
      limb.lower.name = `forearm-${i}`;
      const shoulder = new Vector3(limb.side * 0.55, 0.8, 0);
      const hand = torso.worldToLocal(targets[i].clone());
      const axis = hand.clone().sub(shoulder);
      const distance = axis.length();
      axis.normalize();
      // Two-bone bend plane: elbows sit outside the torso and below the wrist.
      const bend = new Vector3(limb.side * 0.8, -0.8, -0.25);
      bend.addScaledVector(axis, -bend.dot(axis)).normalize();
      const elbow = shoulder
        .clone()
        .add(hand)
        .multiplyScalar(0.5)
        .addScaledVector(bend, Math.sqrt(Math.max(0, 0.62 ** 2 - (distance / 2) ** 2)));
      connect(limb.upper, shoulder, elbow, 0.27, 0.3);
      connect(limb.lower, elbow, hand, 0.25, 0.27);
      limb.hand.position.copy(hand);
      limb.hand.name = `grip-${i}`;
    });
  }
  return { ...actor, torso, grip, hands: limbs.map((limb) => limb.hand) };
}
