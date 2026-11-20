import { CatmullRomCurve3, Vector3 } from 'three';
import { openingPositions, openingTargets, waterfallArrival } from './presets';

export function createOpeningFlight() {
  const vectors = (points: number[][]) => points.map(([x, y, z]) => new Vector3(x, y, z));
  const path = new CatmullRomCurve3(vectors(openingPositions), false, 'centripetal');
  const gaze = new CatmullRomCurve3(vectors(openingTargets), false, 'centripetal');
  const end = waterfallArrival;
  path.points[path.points.length - 1].set(
    end.x + end.d * Math.sin(end.ph) * Math.sin(end.th),
    end.y + end.d * Math.cos(end.ph),
    end.z + end.d * Math.sin(end.ph) * Math.cos(end.th),
  );
  gaze.points[gaze.points.length - 1].set(end.x, end.y, end.z);
  return {
    sample(progress: number, position: Vector3, target: Vector3) {
      const t = Math.max(0, Math.min(1, progress));
      const eased = t * t * (3 - 2 * t);
      path.getPoint(eased, position);
      gaze.getPoint(eased, target);
    },
  };
}
