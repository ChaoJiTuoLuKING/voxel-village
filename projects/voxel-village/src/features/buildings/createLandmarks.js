import * as T from 'three';
import { N, WN } from '../../config/world';

const V3 = T.Vector3;

export function createLandmarks(world, doors) {
  const { Hm, OC, put } = world;
  const hit = [];
  // clock tower
  (function () {
    const x0 = 50,
      z0 = 60,
      B = Math.max(5, Hm[52 * N + 62]);
    for (let i = x0 - 1; i <= x0 + 5; i++)
      for (let j = z0 - 1; j <= z0 + 5; j++) {
        Hm[i * N + j] = B;
        OC[i * N + j] = 1;
      }
    for (let y = -3; y < 17; y++)
      for (let a = 0; a < 5; a++)
        for (let b = 0; b < 5; b++) {
          if (a && a < 4 && b && b < 4) continue;
          const slit = y % 5 == 3 && (a == 2 || b == 2) && y < 10;
          put(
            x0 + a,
            B + y,
            z0 + b,
            slit ? 0x3a3530 : y < 2 ? 0x8f8a7c : y % 6 == 5 ? 0xa8a291 : 0xd8ccae,
          );
        }
    for (let a = -1; a <= 5; a++)
      for (let b = -1; b <= 5; b++) put(x0 + a, B + 17, z0 + b, 0x7a766f);
    for (let y = 1; y <= 3; y++)
      for (let a = 1; a <= 3; a++)
        for (let b of [0, 4])
          if (a != 2 || y != 2) {
            put(x0 + a, B + 17 + y, z0 + b, 0xd8ccae);
          }
    for (const [a, b] of [
      [0, 0],
      [4, 0],
      [0, 4],
      [4, 4],
    ])
      for (let y = 1; y <= 3; y++) put(x0 + a, B + 17 + y, z0 + b, 0x6b4a2b);
    for (let k = 0; k < 4; k++)
      for (let a = k; a < 5 - k; a++)
        for (let b = k; b < 5 - k; b++)
          put(x0 + a, B + 21 + k, z0 + b, k % 2 ? 0x5a7088 : 0x6f8396);
    put(x0 + 2, B + 25, z0 + 2, 0xd6a43a);
    put(x0 + 2, B + 26, z0 + 2, 0xd6a43a);
    for (let a = 1; a <= 3; a++)
      for (let b = 1; b <= 3; b++) put(x0 + a, B + 13 + (b == 2 ? 0 : 0), z0 + 5, null);
    for (let a = 0; a < 3; a++)
      for (let b = 0; b < 3; b++)
        put(
          x0 + 1 + a,
          B + 10 + b,
          z0 + 5,
          a == 1 && b == 1 ? 0xffe9a0 : 0xf3ecd8,
          a == 1 || b == 1 ? WN : 0,
        );
    for (let y = 1; y <= 3; y++)
      for (let a = 2; a <= 3; a++)
        (put(x0 + a, B + y, z0 + 4, null), put(x0 + a, B + y, z0 + 3, 0x5a3a22));
    hit.push({ n: '钟楼', tg: new V3(x0 - 62, B + 8, z0 - 62), d: 42, th: 0.5, ph: 1.2 });
    doors.push([52, 67]);
  })();
  // windmill
  const mill = new T.Group();
  (function () {
    const cx = 84,
      cz = 56,
      B = Math.max(5, Hm[cx * N + cz]);
    for (let i = cx - 5; i <= cx + 5; i++)
      for (let j = cz - 5; j <= cz + 6; j++) {
        Hm[i * N + j] = B;
        OC[i * N + j] = 1;
      }
    for (let y = -3; y < 13; y++) {
      const rr = 4.3 - y * 0.14;
      for (let a = -5; a <= 5; a++)
        for (let b = -5; b <= 5; b++) {
          const q = Math.hypot(a, b);
          if (q <= rr && q > rr - 1.3)
            put(cx + a, B + y, cz + b, y < 2 ? 0x8f8a7c : y % 4 == 0 ? 0xcfc2a0 : 0xe6dcc0);
        }
    }
    for (let k = 0; k < 6; k++) {
      const rr = 3.6 - k * 0.6;
      for (let a = -4; a <= 4; a++)
        for (let b = -4; b <= 4; b++)
          if (Math.hypot(a, b) <= rr) put(cx + a, B + 13 + k, cz + b, k % 2 ? 0x8a5a36 : 0x9a6a40);
    }
    for (let y = 1; y <= 3; y++)
      for (let a = -1; a <= 0; a++) {
        put(cx + a, B + y, cz + 4, null);
        put(cx + a, B + y, cz + 3, 0x5a3a22);
      }
    for (let y = 6; y < 8; y++) put(cx, B + y, cz + 3, 0xffd98a, WN);
    mill.position.set(cx - 64, B + 11, cz - 64 + 4.6);
    const sail = new T.Group();
    for (let q = 0; q < 4; q++) {
      const arm = new T.Group();
      const sp = new T.Mesh(
        new T.BoxGeometry(0.7, 10, 0.6),
        new T.MeshLambertMaterial({ color: 0x6b4a2b }),
      );
      sp.position.y = 5;
      arm.add(sp);
      for (let s = 0; s < 4; s++) {
        const c = new T.Mesh(
          new T.BoxGeometry(2.2, 1.7, 0.25),
          new T.MeshLambertMaterial({ color: s % 2 ? 0xf0e8d0 : 0xd9c9a0 }),
        );
        c.position.set(1.5, 2.6 + s * 1.9, 0.1);
        arm.add(c);
      }
      arm.rotation.z = (q * Math.PI) / 2;
      sail.add(arm);
    }
    sail.name = 'sail';
    mill.add(sail);
    mill.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    hit.push({ n: '山坡风车', tg: new V3(cx - 64, B + 8, cz - 64), d: 40, th: -0.3, ph: 1.2 });
    doors.push([84, 62]);
  })();
  // lighthouse
  (function () {
    const cx = 88,
      cz = 98;
    for (let a = -5; a <= 5; a++)
      for (let b = -5; b <= 5; b++)
        if (Math.hypot(a, b) <= 4.6)
          for (let y = 0; y < 6; y++) put(cx + a, y, cz + b, y > 4 ? 0xa8a291 : 0x7a766f);
    for (let y = 6; y < 20; y++) {
      const rr = 2.6 - (y - 6) * 0.06;
      for (let a = -3; a <= 3; a++)
        for (let b = -3; b <= 3; b++) {
          const q = Math.hypot(a, b);
          if (q <= rr && q > rr - 1.4)
            put(cx + a, y, cz + b, (((y - 6) / 3) | 0) % 2 ? 0xc4452f : 0xf0eadc);
        }
    }
    for (let a = -4; a <= 4; a++)
      for (let b = -4; b <= 4; b++) {
        const q = Math.hypot(a, b);
        if (q <= 3.4 && q > 2) put(cx + a, 20, cz + b, 0x5a554c);
        if (q <= 3.4 && q > 3) put(cx + a, 21, cz + b, 0x5a554c);
      }
    for (let y = 21; y < 24; y++)
      for (let a = -2; a <= 2; a++)
        for (let b = -2; b <= 2; b++) {
          const q = Math.hypot(a, b);
          if (q <= 1.8 && q > 0.9) put(cx + a, y, cz + b, 0xffe9a0, WN);
        }
    for (let k = 0; k < 4; k++)
      for (let a = -2; a <= 2; a++)
        for (let b = -2; b <= 2; b++)
          if (Math.hypot(a, b) <= 2.2 - k * 0.6) put(cx + a, 24 + k, cz + b, 0xc4452f);
    hit.push({ n: '湖边灯塔', tg: new V3(cx - 64, 12, cz - 64), d: 46, th: -0.6, ph: 1.25 });
  })();

  return { mill, hit };
}
