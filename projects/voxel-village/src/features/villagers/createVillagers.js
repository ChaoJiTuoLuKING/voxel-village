import * as T from 'three';
import { createPierAccess } from './pierAccess';

const V3 = T.Vector3;

export function createVillagers(world, scene, paths) {
  const { rnd, ground } = world;
  const { NODES, EDG } = paths;
  // villagers
  const NM = [
      '阿禾',
      '小满',
      '老周',
      '梨花',
      '木子',
      '阿杰',
      '莲姨',
      '石头',
      '小七',
      '芸娘',
      '大壮',
      '青禾',
      '阿福',
      '朵朵',
      '春生',
      '谷雨',
      '阿杏',
      '老林',
      '阿竹',
      '小川',
      '秀兰',
      '山伯',
      '阿松',
      '冬青',
      '小麦',
      '大河',
      '桂婶',
      '长生',
    ],
    ACT = {
      farm: '查看田里的庄稼',
      plaza: '在广场闲聊',
      stall: '在摊位前挑选东西',
      bench: '坐在长椅上休息',
      dock: '在码头边看水面',
      bridge: '站在桥上看溪流',
      view: '眺望山谷',
      road: '停下整理背篓',
      tower: '抬头看钟楼',
      mill: '查看风车',
      shore: '在岸边观察水面',
    };
  const ids = Object.keys(NODES),
    adj = {};
  ids.forEach((k) => (adj[k] = []));
  EDG.forEach(([a, b]) => {
    adj[a].push(b);
    adj[b].push(a);
  });
  const wp = (k) => new V3(NODES[k][0] - 64, 0, NODES[k][1] - 64);
  const vils = [];
  const SK = [0xf1c9a0, 0xe0b088, 0xc58f64],
    SH = [0xc4452f, 0x3f78a8, 0x5f9b3f, 0xd6a43a, 0x8a5fa8, 0xe8dcbc],
    PN_ = [0x4a4a5a, 0x6b4a2b, 0x3f4f6a, 0x5a5a4a];
  NM.forEach((nm, q) => {
    const g = new T.Group(),
      mt = (c) => new T.MeshLambertMaterial({ color: c }),
      sh = SH[(rnd() * 6) | 0],
      pn = PN_[(rnd() * 4) | 0];
    const mk = (w, h, d, c, x, y, z, par) => {
      const m = new T.Mesh(new T.BoxGeometry(w, h, d), mt(c));
      m.position.set(x, y, z);
      m.castShadow = true;
      (par || g).add(m);
      return m;
    };
    const mkL = (x) => {
        const p = new T.Group();
        p.position.set(x, 1, 0);
        g.add(p);
        mk(0.45, 1, 0.5, pn, 0, -0.5, 0, p);
        return p;
      },
      mkA = (x) => {
        const p = new T.Group();
        p.position.set(x, 2.05, 0);
        g.add(p);
        mk(0.35, 0.95, 0.4, sh, 0, -0.45, 0, p);
        return p;
      };
    const body = mk(1.1, 1.1, 0.6, sh, 0, 1.55, 0);
    mk(0.8, 0.8, 0.8, SK[(rnd() * 3) | 0], 0, 2.5, 0);
    mk(
      0.9,
      0.3,
      0.9,
      rnd() < 0.5 ? 0x5a3e26 : [0xd6a43a, 0x2a2a2a, 0x8a3a2a][(rnd() * 3) | 0],
      0,
      3,
      0,
    );
    if (rnd() < 0.4) mk(1.3, 0.2, 1.3, 0xd6b45a, 0, 3.05, 0);
    const v = {
      nm,
      root: g,
      l: [mkL(-0.28), mkL(0.28)],
      a: [mkA(-0.75), mkA(0.75)],
      at: 'road',
      st: 'wait',
      w: rnd() * 3,
      sp: 1.3 + rnd() * 0.9,
      off: (rnd() - 0.5) * 1.2,
      ya: rnd() * 6.28,
      wt: rnd() * 9,
      cd: 0,
      cur: ids[(rnd() * ids.length) | 0],
      ph: rnd() * 9,
    };
    g.traverse((o) => {
      o.userData.v = v;
    });
    v.pos = wp(v.cur);
    g.position.copy(v.pos);
    g.position.y = ground(v.pos.x, v.pos.z);
    scene.add(g);
    vils.push(v);
  });
  const pierAccess = createPierAccess(vils, wp, ground);
  function pick(v) {
    const available = adj[v.cur].filter((k) => pierAccess.canVisit(k));
    const a = available.filter((k) => k !== v.prev);
    const n = a.length ? a[(rnd() * a.length) | 0] : available[0];
    if (!n) {
      v.w = 2;
      return;
    }
    v.prev = v.cur;
    v.to = n;
    v.from = v.pos.clone();
    v.dst = wp(n);
    const dir = v.dst.clone().sub(v.from);
    v.len = dir.length();
    v.dir = dir.normalize();
    v.perp = new V3(-v.dir.z, 0, v.dir.x);
    v.d = 0;
    v.st = 'walk';
    v.act =
      '沿小路散步，前往' +
      (ACT[NODES[n][2]]
        ? ACT[NODES[n][2]].replace(/^在|^站在|^坐在|^抬头|^眺望|^查看|^停下/, '')
        : '前方');
  }
  vils.forEach((v) => {
    v.w = 1 + rnd() * 5;
    v.act = ACT[NODES[v.cur][2]];
  });

  const face = (cur, tgt, k) => cur + Math.atan2(Math.sin(tgt - cur), Math.cos(tgt - cur)) * k;
  function update(dt, wt, hov) {
    for (const v of vils) {
      v.cd -= dt;
      v.root.scale.setScalar(v === hov ? 1.14 : 1);
      if (v.st === 'wait') {
        v.w -= dt;
        const ty = NODES[v.cur][2];
        const sit = ty === 'bench';
        v.root.position.y +=
          (ground(v.pos.x, v.pos.z) - (sit ? 0.55 : 0) - v.root.position.y) * 0.2;
        v.l.forEach((l) => (l.rotation.x += ((sit ? -1.4 : 0) - l.rotation.x) * 0.2));
        v.a.forEach(
          (a, i) =>
            (a.rotation.x +=
              ((sit ? -0.4 : Math.sin(wt * 1.2 + v.ph + i) * 0.08) - a.rotation.x) * 0.2),
        );
        if (!v.fz)
          v.ya = face(
            v.ya,
            ty === 'bench' || ty === 'dock' || ty === 'shore' ? 0 : v.ya + 0.001,
            0.05,
          );
        else v.ya = face(v.ya, v.fz, 0.1);
        if (v.w <= 0) {
          v.fz = null;
          pick(v);
        }
      } else {
        const sp = v.sp * dt;
        v.d += sp;
        const t = Math.min(1, v.d / v.len),
          off = Math.sin(Math.PI * t) * v.off;
        v.pos.copy(v.from).addScaledVector(v.dir, v.d).addScaledVector(v.perp, off);
        v.root.position.set(v.pos.x, 0, v.pos.z);
        v.root.position.y = ground(v.pos.x, v.pos.z);
        v.wt += dt * v.sp * 4.2;
        const s = Math.sin(v.wt);
        v.l[0].rotation.x = s * 0.7;
        v.l[1].rotation.x = -s * 0.7;
        v.a[0].rotation.x = -s * 0.55;
        v.a[1].rotation.x = s * 0.55;
        v.root.position.y += Math.abs(s) * 0.1;
        v.ya = face(v.ya, Math.atan2(v.dir.x, v.dir.z), 0.12);
        if (v.d >= v.len) {
          v.cur = v.to;
          v.pos.copy(v.dst);
          v.st = 'wait';
          v.w = 2 + rnd() * 6;
          v.act = ACT[NODES[v.cur][2]] || '歇一会儿';
        } else if (v.cd <= 0)
          for (const o of vils) {
            if (o !== v && o.st === 'walk' && o.cd <= 0 && o.pos.distanceTo(v.pos) < 1.6) {
              for (const [a, b] of [
                [v, o],
                [o, v],
              ]) {
                a.st = 'wait';
                a.w = 2.5 + rnd() * 1.5;
                a.cd = 14;
                a.act = '和' + b.nm + '寒暄';
                a.fz = Math.atan2(b.pos.x - a.pos.x, b.pos.z - a.pos.z);
                a.cur = a.prev || a.cur;
                a.resume = 1;
              }
              break;
            }
          }
        if (v.st === 'wait' && v.resume) {
          v.resume = 0;
          v.pending = 1;
        }
      }
      v.root.rotation.y = v.ya;
      if (v.st === 'wait' && v.pending && v.w <= 0) {
        v.pending = 0;
      }
    }
  }
  return { vils, update, pierAccess };
}
