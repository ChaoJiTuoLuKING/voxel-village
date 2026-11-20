import { Vector3, type Object3D } from 'three';
import { fishingPiers } from '../../config/settlement';

interface Pedestrian {
  pos: Vector3;
  root: Object3D;
  l: Object3D[];
  a: Object3D[];
  cur: string;
  to?: string;
  prev?: string;
  st: string;
  w: number;
  act?: string;
  pending?: number;
  resume?: number;
  fz?: number | null;
}
const pier = fishingPiers[0];
export function isOnFishingPier(position: { x: number; z: number }) {
  return (
    Math.abs(position.x - pier.x) < pier.width / 2 + 1 &&
    position.z > pier.z - 1 &&
    position.z < pier.z + pier.length + 2
  );
}

/** Reserve the playable pier without pausing village life or hiding pedestrians. */
export function createPierAccess(
  villagers: Pedestrian[],
  waypoint: (name: string) => Vector3,
  ground: (x: number, z: number) => number,
) {
  let active = false;
  const shoreRoute = [
    'westQuay',
    'westShore',
    'westLane',
    'westBend',
    'westFarm',
    'westCorner',
    'westNorth',
    'westUpper',
    'westGarden',
    'westHill',
  ];
  function setActive(value: boolean) {
    if (active === value) return;
    active = value;
    if (!active) return;
    // Clear the pier before the fishing camera moves in, including people already heading there.
    for (const visitor of villagers) {
      if (visitor.cur !== 'westPier' && visitor.to !== 'westPier' && !isOnFishingPier(visitor.pos))
        continue;
      let placement: { point: Vector3; node: string } | undefined;
      for (let segment = 0; segment < shoreRoute.length - 1 && !placement; segment++) {
        const node = shoreRoute[segment]!,
          from = waypoint(node),
          to = waypoint(shoreRoute[segment + 1]!);
        const length = from.distanceTo(to);
        for (let distance = 0; distance < length; distance += 2.2) {
          const point = from.clone().lerp(to, distance / length);
          if (villagers.some((other) => other !== visitor && other.pos.distanceTo(point) < 1.8))
            continue;
          placement = { point, node };
          break;
        }
      }
      // The shore route has more waiting spots than the village has pedestrians.
      if (!placement) continue;
      visitor.pos.copy(placement.point);
      visitor.root.position.set(
        placement.point.x,
        ground(placement.point.x, placement.point.z),
        placement.point.z,
      );
      visitor.cur = placement.node;
      visitor.prev = 'westPier';
      visitor.to = undefined;
      visitor.st = 'wait';
      visitor.w = 2;
      visitor.pending = 0;
      visitor.resume = 0;
      visitor.fz = null;
      visitor.act = '在岸边休息，为钓鱼留出栈桥';
      for (const limb of [...visitor.l, ...visitor.a]) limb.rotation.x = 0;
    }
  }
  return {
    setActive,
    canVisit: (node: string) => !active || node !== 'westPier',
    get active() {
      return active;
    },
    get visitors() {
      return villagers.filter((v) => isOnFishingPier(v.pos)).length;
    },
  };
}
