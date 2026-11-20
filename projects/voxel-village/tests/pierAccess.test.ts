import { expect, it } from 'vitest';
import { Scene } from 'three';
import { disposeObjectTree } from '@visual/scene-kit';
import { createWorld } from '../src/world/createWorld';
import { createPaths } from '../src/features/paths/createPaths';
import { createVillagers } from '../src/features/villagers/createVillagers';
import { isOnFishingPier } from '../src/features/villagers/pierAccess';

it('clears the occupied fishing pier immediately, reroutes pedestrians, and restores access on exit', () => {
  const world = createWorld(),
    scene = new Scene(),
    paths = createPaths(world, []);
  const crowd = createVillagers(world, scene, paths);
  const occupied = crowd.vils[0],
    approaching = crowd.vils[1];
  occupied.cur = 'westPier';
  occupied.pos.set(-38, 0, 49);
  occupied.root.position.copy(occupied.pos);
  approaching.cur = 'westQuay';
  approaching.to = 'westPier';
  approaching.pos.set(-38, 0, 34);
  crowd.pierAccess.setActive(true);
  expect(crowd.pierAccess.visitors).toBe(0);
  expect(occupied.root.visible).toBe(true);
  expect(occupied.root.position.x).toBe(occupied.pos.x);
  expect(occupied.root.position.y).toBe(world.ground(occupied.pos.x, occupied.pos.z));
  expect(occupied.pos.distanceTo(approaching.pos)).toBeGreaterThanOrEqual(1.8);
  expect(crowd.pierAccess.canVisit('westPier')).toBe(false);
  expect(crowd.pierAccess.canVisit('eastPier')).toBe(true);
  const after = occupied.pos.clone();
  crowd.pierAccess.setActive(true);
  expect(occupied.pos.equals(after)).toBe(true);
  let moved = false;
  for (let i = 0; i < 6000; i++) {
    crowd.update(0.05, i * 0.05, null);
    expect(crowd.vils.some((v) => isOnFishingPier(v.pos))).toBe(false);
    moved ||= !occupied.pos.equals(after);
  }
  expect(moved).toBe(true);
  crowd.pierAccess.setActive(false);
  expect(crowd.pierAccess.canVisit('westPier')).toBe(true);
  let visited = false;
  for (let i = 0; i < 6000 && !visited; i++) {
    crowd.update(0.05, 300 + i * 0.05, null);
    visited = crowd.pierAccess.visitors > 0;
  }
  expect(visited).toBe(true);
  // Even a crowded pier is cleared into distinct shore positions before the close camera.
  for (const visitor of crowd.vils) {
    visitor.cur = 'westPier';
    visitor.pos.set(-38, 0, 49);
  }
  crowd.pierAccess.setActive(true);
  expect(crowd.pierAccess.visitors).toBe(0);
  for (let i = 0; i < crowd.vils.length; i++)
    for (let j = i + 1; j < crowd.vils.length; j++)
      expect(crowd.vils[i].pos.distanceTo(crowd.vils[j].pos)).toBeGreaterThanOrEqual(1.8);
  disposeObjectTree(scene);
});
