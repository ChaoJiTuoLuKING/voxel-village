/** Grid coordinates. Keep the original village and expand into the two side terraces. */
export const extraHouses = [
  [11, 76, 8, 7, 2, 0, 1, 0],
  [21, 85, 8, 7, 1, 0, 2, 2],
  [9, 58, 9, 7, 1, 0, 0, 1],
  [21, 48, 8, 7, 2, 0, 1, 0],
  [10, 40, 7, 6, 1, 0, 3, 2],
  [25, 32, 7, 6, 1, 0, 2, 1],
  [38, 29, 8, 6, 2, 0, 0, 0],
  [101, 74, 8, 7, 2, 0, 2, 0],
  [113, 77, 7, 7, 1, 0, 0, 1],
  [102, 60, 9, 8, 2, 0, 1, 2],
  [114, 49, 7, 6, 1, 0, 2, 0],
  [102, 37, 8, 7, 2, 0, 3, 1],
  [87, 33, 8, 7, 1, 0, 1, 2],
  [76, 34, 7, 6, 1, 0, 0, 0],
  [34, 96, 8, 6, 1, 0, 2, 0, 1],
  [96, 98, 8, 6, 1, 0, 1, 2, 1],
] as const;

export const farmPlots = [
  { x: 8, z: 67, w: 15, d: 6, crop: 'wheat' },
  { x: 8, z: 87, w: 10, d: 8, crop: 'vegetables' },
  { x: 101, z: 85, w: 18, d: 8, crop: 'wheat' },
  { x: 112, z: 60, w: 9, d: 12, crop: 'lavender' },
  { x: 29, z: 40, w: 8, d: 10, crop: 'vegetables' },
  { x: 97, z: 47, w: 13, d: 10, crop: 'lavender' },
] as const;

export const fishingPiers = [
  { x: -38, z: 36, length: 14, width: 3 },
  { x: 46, z: 36, length: 15, width: 3 },
] as const;
