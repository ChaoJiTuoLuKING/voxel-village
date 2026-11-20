import * as T from 'three';

import { sx } from '../../world/terrain.ts';

export function createVillageLife(scene, mesh, ANI) {
  const { instDetails } = mesh;
  // A small waterwheel beside the lower stream, with individually stepped paddles.
  const wheel = new T.Group(),
    wheelMat = new T.MeshLambertMaterial({ color: 0x79522e });
  wheel.position.set(sx(61) - 64 - 3.4, 8.5, 61 - 64);
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6,
      pl = new T.Mesh(new T.BoxGeometry(0.65, 0.35, 2.2), wheelMat);
    pl.position.set(Math.sin(a) * 2.3, Math.cos(a) * 2.3, 0);
    pl.rotation.z = -a;
    wheel.add(pl);
    const spoke = new T.Mesh(new T.BoxGeometry(0.14, 4.6, 0.15), wheelMat);
    spoke.rotation.z = a;
    wheel.add(spoke);
  }
  scene.add(wheel);
  ANI.push((t) => (wheel.rotation.z = -t * 0.25));
  // Ropes of small pennants add human scale across the village square.
  {
    const f = [];
    for (let k = 0; k < 27; k++) {
      const t = k / 26,
        x = -12 + t * 13,
        y = 10.6 - Math.sin(t * Math.PI) * 1.1;
      f.push([x, y, 19, 0.5, 0.05, 0.05, 0x735332]);
      if (k % 2 === 0)
        f.push([x, y - 0.35, 19, 0.42, 0.52, 0.05, [0xb65037, 0xe4b853, 0x55877f][k % 3]]);
    }
    instDetails(f, new T.MeshLambertMaterial());
  }

  // A hanging footbridge crosses the upper gorge between the two forest terraces.
  {
    const deck = [],
      xx = sx(33) - 64,
      zz = 33 - 64;
    for (let k = 0; k <= 24; k++) {
      const t = k / 24,
        x = xx - 9 + t * 18,
        y = 28.6 - Math.sin(Math.PI * t) * 1.8;
      deck.push([x, y, zz, 0.7, 0.25, 2, 0x9a7749]);
      for (const z of [zz - 1.05, zz + 1.05]) {
        deck.push([x, y + 1.35, z, 0.8, 0.09, 0.09, 0x79674a]);
        if (k % 3 === 0) deck.push([x, y + 0.65, z, 0.12, 1.3, 0.12, 0x765735]);
      }
      if (k === 0 || k === 24)
        for (const z of [zz - 1.2, zz + 1.2]) deck.push([x, 27.5, z, 0.5, 6, 0.5, 0x685239]);
    }
    instDetails(deck, new T.MeshLambertMaterial());
  }

  return {};
}
