export const hs = (x: number, y: number) => {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export const sm = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const cl = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const vn = (x: number, y: number) => {
  const i = Math.floor(x),
    j = Math.floor(y),
    fx = x - i,
    fy = y - j,
    u = fx * fx * (3 - 2 * fx),
    v = fy * fy * (3 - 2 * fy);
  return (
    hs(i, j) * (1 - u) * (1 - v) +
    hs(i + 1, j) * u * (1 - v) +
    hs(i, j + 1) * (1 - u) * v +
    hs(i + 1, j + 1) * u * v
  );
};
export const fbm = (x: number, y: number) =>
  vn(x, y) * 0.55 + vn(x * 2.1, y * 2.1) * 0.3 + vn(x * 4.3, y * 4.3) * 0.15;
