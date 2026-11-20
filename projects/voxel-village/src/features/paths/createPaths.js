import { N } from '../../config/world';

import { sx } from '../../world/terrain.ts';

export function createPaths(world, doors) {
  const { BR, Hm, OC, RD } = world;
  const NODES = {
    westLane: [33, 83, 'road'],
    westBend: [24, 82, 'road'],
    westFarm: [24, 75, 'farm'],
    westCorner: [24, 66, 'road'],
    westNorth: [22, 57, 'road'],
    westUpper: [33, 57, 'road'],
    westGarden: [38, 51, 'farm'],
    westHill: [38, 39, 'view'],
    westQuay: [26, 94, 'shore'],
    westShore: [32, 94, 'road'],
    westPier: [26, 114, 'dock'],
    eastLane: [98, 84, 'road'],
    eastFarm: [122, 83, 'farm'],
    eastBend: [122, 72, 'road'],
    eastShore: [122, 95, 'road'],
    eastCorner: [111, 72, 'road'],
    eastNorth: [98, 72, 'road'],
    eastGarden: [98, 59, 'farm'],
    eastUpper: [112, 58, 'road'],
    eastHill: [112, 45, 'view'],
    eastRidge: [99, 45, 'road'],
    eastQuay: [110, 95, 'shore'],
    eastPier: [110, 115, 'dock'],
    wE: [44, 83, 'road'],
    pz: [57, 83, 'plaza'],
    st1: [55, 85, 'stall'],
    st2: [60, 85, 'stall'],
    bn1: [54, 82, 'bench'],
    bn2: [60, 82, 'bench'],
    m1: [51, 82, 'road'],
    bw: [BR.x0, 82, 'road'],
    bm: [Math.round(sx(82)), 82, 'bridge'],
    be: [BR.x1, 82, 'road'],
    eE: [78, 83, 'road'],
    eF: [88, 84, 'road'],
    e2: [82, 83, 'road'],
    nd0: [76, 87, 'road'],
    nd1: [76, 98, 'dock'],
    sh: [80, 87, 'shore'],
    p1: [51, 77, 'road'],
    p2: [51, 70, 'road'],
    p3: [45, 72, 'road'],
    p4: [52, 67, 'tower'],
    p5: [47, 62, 'view'],
    q3: [82, 81, 'road'],
    q2: [82, 74, 'road'],
    q1: [79, 72, 'view'],
    q4: [84, 62, 'mill'],
  };
  const EDG = [
    ['wE', 'westLane'],
    ['westLane', 'westBend'],
    ['westBend', 'westFarm'],
    ['westFarm', 'westCorner'],
    ['westCorner', 'westNorth'],
    ['westNorth', 'westUpper'],
    ['westUpper', 'westGarden'],
    ['westGarden', 'westHill'],
    ['westLane', 'westShore'],
    ['westShore', 'westQuay'],
    ['westQuay', 'westPier'],
    ['eF', 'eastLane'],
    ['eastLane', 'eastNorth'],
    ['eastFarm', 'eastBend'],
    ['eastBend', 'eastCorner'],
    ['eastCorner', 'eastNorth'],
    ['eastNorth', 'eastGarden'],
    ['eastGarden', 'eastUpper'],
    ['eastUpper', 'eastHill'],
    ['eastHill', 'eastRidge'],
    ['eastFarm', 'eastShore'],
    ['eastShore', 'eastQuay'],
    ['eastQuay', 'eastPier'],
    ['wE', 'm1'],
    ['m1', 'pz'],
    ['pz', 'st1'],
    ['pz', 'st2'],
    ['pz', 'bn1'],
    ['pz', 'bn2'],
    ['pz', 'bw'],
    ['bw', 'bm'],
    ['bm', 'be'],
    ['be', 'eE'],
    ['eE', 'e2'],
    ['e2', 'eF'],
    ['eE', 'nd0'],
    ['nd0', 'nd1'],
    ['e2', 'sh'],
    ['m1', 'p1'],
    ['p1', 'p2'],
    ['p2', 'p3'],
    ['p2', 'p4'],
    ['p4', 'p5'],
    ['e2', 'q3'],
    ['q3', 'q2'],
    ['q2', 'q1'],
    ['q1', 'q4'],
  ];
  function road(a, b) {
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.5);
    for (let s = 0; s <= n; s++) {
      const x = Math.round(a[0] + ((b[0] - a[0]) * s) / n),
        z = Math.round(a[1] + ((b[1] - a[1]) * s) / n);
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          const i = x + dx,
            j = z + dz,
            k = i * N + j;
          if (Hm[k] > 4 && !OC[k] && (j > 92 || Math.abs(i - sx(j)) > 5.5)) RD[k] = 1;
        }
    }
  }
  EDG.forEach(([a, b]) => {
    if (!(a == 'nd0' && b == 'nd1')) road(NODES[a], NODES[b]);
  });
  doors.forEach((d) => {
    let bst = null,
      bd = 1e9;
    for (const k in NODES) {
      const q = Math.hypot(NODES[k][0] - d[0], NODES[k][1] - d[1]);
      if (q < bd) {
        bd = q;
        bst = k;
      }
    }
    road(d, NODES[bst]);
  });

  return { NODES, EDG };
}
