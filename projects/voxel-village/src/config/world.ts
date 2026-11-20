// The migrated world assumes a 128×128 grid centered at (64,64).
// N is a model contract, not an independent quality slider.
export const N = 128,
  YMAX = 192,
  WL = 3.2,
  LF = 1 << 24,
  WN = 2 << 24;
export const WORLD_SEED = 20240611;
// Screen-facing smoke/mist stays in the main view, outside the planar water reflection.
export const ATMOSPHERE_LAYER = 1;
export const ROOFS = [
    [0xb5502f, 0xa44628],
    [0xd6a43a, 0xc4932e],
    [0x6f8396, 0x62768a],
  ],
  WALLS = [0xe8dcbc, 0xdccfa8, 0xefe6cf, 0xd9c9a0],
  FLW = [0xe4577a, 0xf0c93a, 0xf4f0e8, 0xc66ad8];
