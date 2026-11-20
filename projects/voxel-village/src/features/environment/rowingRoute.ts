// Each envelope includes hull and extended oars; leave room at the fishing piers.
export const rowingRoutes = [
  { x: -23, z: 60.5, rx: 16, rz: 8, speed: 0.022 },
  { x: 22, z: 72, rx: 24, rz: 11, speed: 0.018 },
  { x: 1, z: 98, rx: 17, rz: 9, speed: 0.015 },
] as const;

export function sampleRowingRoute(time: number, index: number) {
  const route = rowingRoutes[index];
  const phase = time * 2.15 + index * 2;
  // Accelerate while pulling; continue gliding during recovery. Never reverse.
  const a = (time - Math.sin(phase) * 0.15) * route.speed + index * 2.1;
  return {
    x: route.x + Math.cos(a) * route.rx,
    z: route.z + Math.sin(a) * route.rz,
    heading: Math.atan2(-route.rz * Math.cos(a), -route.rx * Math.sin(a)),
  };
}
