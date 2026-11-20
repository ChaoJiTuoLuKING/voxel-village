import * as T from 'three';
import { createCloudscape } from './createCloudscape';
import { createBasinForest } from './createBasinForest';

import { terrainHeight } from '../../world/terrain.ts';

/**
 * @param {*} world
 * @param {T.Scene} scene
 * @param {*} mesh
 * @param {(x: number, z: number) => number} heightAt
 * @param {import('../terrain/mountainTerraces').MountainTerrace[]} terraces
 */
export function createEnvironment(world, scene, mesh, heightAt, terraces) {
  const { rnd } = world;
  const ANI = [];
  const cm = createCloudscape(scene, rnd, ANI);
  // Retain the legacy random consumption so clouds and birds do not change with planting.
  for (let x = -145; x <= 145; x += 5)
    for (let z = -147; z < 70; z += 5) {
      if (x > -62 && x < 65 && z > -62 && z < 65) continue;
      const xx = x + rnd() * 3,
        zz = z + rnd() * 3,
        h = terrainHeight(xx, zz);
      if (h < 16 || h > 91 || rnd() > 0.74) continue;
      rnd();
    }
  const trees = createBasinForest(scene, heightAt, terraces);
  for (let q = 0; q < 10; q++) {
    const g = new T.Group(),
      m = new T.MeshBasicMaterial({ color: 0x2a2f35, side: T.DoubleSide }),
      wl = new T.Mesh(new T.PlaneGeometry(0.9, 0.3), m),
      wr = wl.clone(),
      L = new T.Group(),
      Rr = new T.Group();
    wl.position.x = -0.45;
    wr.position.x = 0.45;
    L.add(wl);
    Rr.add(wr);
    g.add(L, Rr, new T.Mesh(new T.BoxGeometry(0.25, 0.2, 0.6), m));
    scene.add(g);
    const r = 30 + rnd() * 50,
      sp = 0.12 + rnd() * 0.1,
      ph = rnd() * 6.28,
      hy = 26 + rnd() * 20,
      cx = rnd() * 30 - 15,
      cz = rnd() * 30 - 10;
    ANI.push((t) => {
      const a = ph + t * sp;
      g.position.set(
        cx + Math.cos(a) * r,
        hy + Math.sin(t * 0.5 + ph) * 2,
        cz + Math.sin(a) * r * 0.6,
      );
      g.rotation.y = Math.atan2(-Math.sin(a), 0.6 * Math.cos(a));
      const f = Math.sin(t * 9 + ph) * 0.6;
      L.rotation.z = f;
      Rr.rotation.z = -f;
    });
  }

  return { ANI, cm, trees };
}
