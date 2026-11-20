import type { Matrix4 } from 'three';

/** The reflected camera's right axis is reversed, so mirror an off-axis frustum too. */
export function copyReflectionProjection(source: Matrix4, target: Matrix4): void {
  target.copy(source);
  target.elements[8] = -source.elements[8]!;
}
