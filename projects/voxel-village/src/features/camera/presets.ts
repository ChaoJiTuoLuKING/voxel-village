// The opening ends above the village, with the waterfall ahead and roofs in the foreground.
export const waterfallArrival = {
  name: '村中望瀑',
  x: 4,
  y: 68,
  z: -47,
  th: Math.atan2(-20, 60),
  ph: Math.acos(-27 / Math.hypot(20, 27, 60)),
  d: Math.hypot(20, 27, 60),
};

export const cameraPresets = [
  { name: '山谷全景', x: 1, y: 24, z: -5, th: -0.18, ph: 1.22, d: 176 },
  { name: '湖畔倒影', x: 0, y: 13, z: 17, th: -0.12, ph: 1.46, d: 92 },
  { name: '西村麦田', x: -46, y: 10, z: 8, th: -0.25, ph: 0.72, d: 65 },
  { name: '湖上泛舟', x: 13, y: 5, z: 65, th: 0.65, ph: 1.2, d: 56 },
  { name: '东岸垂钓', x: 44, y: 7, z: 44, th: 0.6, ph: 1.25, d: 35 },
  { name: '村庄街巷', x: -12, y: 18, z: 4, th: -0.7, ph: 1.11, d: 44 },
  { name: '林间瀑布', x: 3, y: 28, z: -34, th: 0.4, ph: 1.16, d: 72 },
  { name: '群山远景', x: 1, y: 102, z: -75, th: -0.18, ph: 1.12, d: 280 },
  { name: '仰望群峰', x: 0, y: 111, z: -78, th: -0.08, ph: 1.97, d: 232 },
  { name: '瀑底仰望', x: 4, y: 65, z: -48, th: -0.1, ph: 1.98, d: 119 },
  { name: '盆地全貌', x: 0, y: 64, z: 24, th: 0.75, ph: 0.66, d: 380 },
  { name: '对岸山脊', x: 0, y: 44, z: 23, th: -0.37, ph: 0.73, d: 298 },
  waterfallArrival,
  {
    name: '雪山环谷',
    x: 0,
    y: 82,
    z: -25,
    th: Math.atan2(-80, 165),
    ph: Math.acos(58 / Math.hypot(80, 58, 165)),
    d: Math.hypot(80, 58, 165),
    fov: 80,
  },
].map((preset) => ({ fov: 50, ...preset }));

export const openingDuration = 32;
// Across the opposite rim, down its wooded face, over the lake, through the village to the falls.
export const openingPositions = [
  [-61, 204, 166],
  [-59, 192, 156],
  [-50, 151, 143],
  [-35, 100, 123],
  [-24, 65, 97],
  [-20, 43, 59],
  [-18, 41, 31],
  [-16, 41, 13],
];
export const openingTargets = [
  [-112, 155, -80],
  [-70, 80, -30],
  [-42, 45, 16],
  [-8, 22, 8],
  [0, 20, -4],
  [2, 30, -22],
  [4, 51, -40],
  [4, 68, -47],
];
export const tourPositions = [
  [-48, 83, 101],
  [-12, 35, 72],
  [15, 10, 49],
  [12, 13, 29],
  [-7, 21, 26],
  [-24, 28, 10],
  [-16, 44, -15],
  [23, 60, -20],
  [48, 52, 43],
];
export const tourTargets = [
  [0, 20, -20],
  [0, 14, -5],
  [-3, 11, 19],
  [-11, 15, 8],
  [-10, 24, -3],
  [-4, 25, -17],
  [4, 32, -40],
  [1, 20, -8],
  [0, 14, 5],
];

// Road node m1; the original (-8,18) spawn intersects the plaza well.
export const walkSpawn = { x: -13, z: 18, a: 0, p: -0.05 };
