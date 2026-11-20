import { Vector3 } from 'three';
import { farmPlots } from '../../config/settlement';
export const playablePlot = farmPlots[1];
export const farmCenter = {
  x: playablePlot.x - 64 + (playablePlot.w - 1) / 2,
  z: playablePlot.z - 64 + (playablePlot.d - 1) / 2,
};
export const bedCenters = [-3.1, 0, 3.1].map((dx) => ({
  x: farmCenter.x + dx,
  z: farmCenter.z + 0.2,
}));
export const frontLane = farmCenter.z - 4.2;
export const plantOffsets = [-0.95, 0, 0.95];
export function workPosition(bed: number) {
  const p = bedCenters[bed]!;
  return new Vector3(p.x - 1.5, 0, p.z);
}
export function farmRoute(from: Vector3, bed: number, offset = 0) {
  const end = workPosition(bed);
  end.z += offset;
  const points = [from.clone()];
  if (Math.abs(from.x - end.x) > 0.01)
    points.push(new Vector3(from.x, 0, frontLane), new Vector3(end.x, 0, frontLane));
  points.push(end);
  const lengths = points.slice(1).map((p, i) => p.distanceTo(points[i]!));
  const length = lengths.reduce((a, b) => a + b, 0);
  function sample(distance: number) {
    let d = Math.max(0, distance);
    for (let i = 0; i < lengths.length; i++) {
      const len = lengths[i]!;
      if (d < len && len > 0.0001) {
        const direction = points[i + 1]!.clone().sub(points[i]!).normalize();
        return {
          position: points[i]!.clone().lerp(points[i + 1]!, d / len),
          angle: Math.atan2(direction.x, direction.z),
        };
      }
      d -= len;
    }
    return { position: end.clone(), angle: Math.PI / 2 };
  }
  return { length, sample };
}
