import { Vector3 } from 'three';

export const CAST_RELEASE_TIME = 0.9;
const gravity = 9.8;
const releaseAngle = 2;
const tether = 0.85;
const restGrip = new Vector3(0.4, 0.98, 0.45);
const raisedGrip = new Vector3(0.4, 1.2, 0.25);
const smooth = (t: number) => {
  const p = Math.max(0, Math.min(1, t));
  return p * p * (3 - 2 * p);
};
function hermite(a: number, b: number, va: number, vb: number, t: number, duration: number) {
  const p = Math.max(0, Math.min(1, t / duration));
  return (
    (2 * p ** 3 - 3 * p * p + 1) * a +
    (p ** 3 - 2 * p * p + p) * duration * va +
    (-2 * p ** 3 + 3 * p * p) * b +
    (p ** 3 - p * p) * duration * vb
  );
}

/** One motion owns rod, grip, release and lure. Coordinates are relative to the seated actor. */
export function createCastingMotion(target: Vector3) {
  const azimuth = Math.atan2(target.x - raisedGrip.x, target.z - raisedGrip.z);
  const horizontal = new Vector3(Math.sin(azimuth), 0, Math.cos(azimuth));
  const releaseTip = raisedGrip.clone().addScaledVector(horizontal, 4 * Math.cos(releaseAngle));
  releaseTip.y += 4 * Math.sin(releaseAngle);
  const origin = releaseTip.clone().add(new Vector3(0, -tether, 0));
  const range = Math.hypot(target.x - origin.x, target.z - origin.z);
  const slope = -Math.cos(releaseAngle) / Math.sin(releaseAngle);
  const flightTime = Math.sqrt((2 * (range * slope - (target.y - origin.y))) / gravity);
  const speed = range / flightTime;
  const velocity = horizontal.clone().multiplyScalar(speed);
  velocity.y = speed * slope;
  const angularSpeed = -speed / (4 * Math.sin(releaseAngle));
  const duration = CAST_RELEASE_TIME + flightTime;
  function sample(time: number) {
    const t = Math.max(0, Math.min(time, duration));
    let angle: number;
    if (t <= 0.6) angle = 0.38 + (2.35 - 0.38) * smooth(t / 0.6);
    else if (t <= CAST_RELEASE_TIME)
      angle = hermite(2.35, releaseAngle, 0, angularSpeed, t - 0.6, 0.3);
    else if (t <= 1.3)
      angle = hermite(releaseAngle, 0.55, angularSpeed, 0, t - CAST_RELEASE_TIME, 0.4);
    else angle = 0.55 - 0.17 * smooth((t - 1.3) / (duration - 1.3));
    const lift =
      t < CAST_RELEASE_TIME ? smooth(t / 0.6) : 1 - smooth((t - CAST_RELEASE_TIME) / 0.6);
    const start = restGrip.clone().lerp(raisedGrip, lift);
    const direction = horizontal.clone().multiplyScalar(Math.cos(angle));
    direction.y = Math.sin(angle);
    // Rod flex recovers after release; zero flex/velocity at release preserves the launch tangent.
    const post = Math.max(0, t - CAST_RELEASE_TIME);
    const flex = post > 0 ? 0.24 * Math.sin(post * 14) * Math.exp(-post * 5) : 0;
    const normal = horizontal.clone().multiplyScalar(-Math.sin(angle));
    normal.y = Math.cos(angle);
    const points = Array.from({ length: 10 }, (_, i) =>
      start
        .clone()
        .addScaledVector(direction, (4 * i) / 9)
        .addScaledVector(normal, flex * (i / 9) ** 2),
    );
    const tip = points[9].clone();
    const lure =
      t <= CAST_RELEASE_TIME
        ? tip.clone().add(new Vector3(0, -tether, 0))
        : origin
            .clone()
            .addScaledVector(velocity, post)
            .add(new Vector3(0, (-gravity * post * post) / 2, 0));
    return { start, direction, points, tip, lure, angle };
  }
  return { duration, flightTime, origin, velocity, azimuth, sample };
}
