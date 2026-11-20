import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  MeshLambertMaterial,
  Vector3,
  type Scene,
} from 'three';
import { N } from '../../config/world';
import { hs } from '../../world/math';
import { riverHalfWidth, sx } from '../../world/terrain';
import { cliffEdges, createMountainSurface, type TerrainWorld } from './mountainSurface';
import { createMountainTerraces } from './mountainTerraces';
import { createTerrainSampler } from './createTerrainSampler';
import {
  createMeadowShoulders,
  meadowShoulderWeight,
  mountainSurfaceColor,
} from './mountainMeadows';

interface Cell {
  x: number;
  z: number;
  size: number;
}
interface Point {
  x: number;
  z: number;
  size: number;
}
type Vertex = [number, number, number];

/** Conforming adaptive triangles: broad rock facets outside, precise foundations inside. */
export function buildMountainTerrain(world: TerrainWorld, scene: Scene) {
  const terraces = createMountainTerraces(createMeadowShoulders(createMountainSurface(world)));
  const sample = terraces.sample;
  const cells: Cell[] = [];
  const points = new Map<string, Point>();
  const key = (x: number, z: number) => `${x},${z}`;
  const addCell = (x: number, z: number, size: number) => {
    const nearCore = x < 63.5 && x + size > -64.5 && z < 63.5 && z + size > -64.5;
    const crossesCliff = cliffEdges.some((edge) => edge > z && edge < z + size);
    const desired =
      !nearCore &&
      (terraces.near(x, z, size) || meadowShoulderWeight(x + size / 2, z + size / 2) > 0.05) &&
      size <= 16
        ? 4
        : nearCore
          ? z + size <= -40.5 && !crossesCliff
            ? 4
            : 1
          : Math.max(Math.abs(x), Math.abs(z)) < 200
            ? 8
            : 16;
    if (size > desired) {
      const half = size / 2;
      addCell(x, z, half);
      addCell(x + half, z, half);
      addCell(x, z + half, half);
      addCell(x + half, z + half, half);
      return;
    }
    cells.push({ x, z, size });
    for (const [px, pz] of [
      [x, z],
      [x + size, z],
      [x, z + size],
      [x + size, z + size],
    ]) {
      const id = key(px, pz),
        existing = points.get(id);
      if (!existing || existing.size > size) points.set(id, { x: px, z: pz, size });
    }
  };
  for (let x = -320.5; x < 319.5; x += 16)
    for (let z = -320.5; z < 319.5; z += 16) addCell(x, z, 16);
  const xLines = new Map<number, Point[]>(),
    zLines = new Map<number, Point[]>();
  for (const p of points.values()) {
    if (!xLines.has(p.x)) xLines.set(p.x, []);
    if (!zLines.has(p.z)) zLines.set(p.z, []);
    xLines.get(p.x)!.push(p);
    zLines.get(p.z)!.push(p);
  }
  for (const line of xLines.values()) line.sort((a, b) => a.z - b.z);
  for (const line of zLines.values()) line.sort((a, b) => a.x - b.x);
  const position: number[] = [],
    colors: number[] = [];
  const normal = new Vector3(),
    ab = new Vector3(),
    ac = new Vector3();
  const rock = new Color();
  const color = (x: number, z: number, y: number, slope: number) => {
    const local = x >= -64 && x <= 63 && z >= -64 && z <= 63;
    if (local && z > -37 && y < 35) {
      const i = Math.round(x + 64),
        j = Math.round(z + 64),
        k = i * N + j;
      if (world.PZ[k]) return rock.set('#b5b09c');
      if (world.RD[k]) return rock.set('#bdaa80');
      if (y < 5.5) return rock.set('#b7bea0');
    }
    return mountainSurfaceColor(x, z, y, slope, rock);
  };
  const triangle = (a: Vertex, b: Vertex, c: Vertex) => {
    ab.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    ac.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
    normal.crossVectors(ab, ac).normalize();
    position.push(...a, ...b, ...c);
    for (const vertex of [a, b, c]) {
      const [x, y, z] = vertex;
      // Blend pigment across shared vertices; retain faceted lighting and genuinely bare cliffs.
      const dx = (sample(x + 0.7, z) - sample(x - 0.7, z)) / 1.4;
      const dz = (sample(x, z + 0.7) - sample(x, z - 0.7)) / 1.4;
      const up = Math.abs(normal.y) < 0.08 ? 0 : 1 / Math.hypot(dx, 1, dz);
      const col = color(x, z, y, up);
      colors.push(col.r, col.g, col.b);
    }
  };
  const vertex = (p: Point, side: number): Vertex => {
    const inCore = p.x >= -64.5 && p.x <= 63.5 && p.z >= -64.5 && p.z <= 63.5;
    const amount = p.size > 1 && !inCore ? p.size * 0.22 : 0;
    const x = p.x + (hs(p.x * 2, p.z * 2) - 0.5) * amount;
    const z = p.z + (hs(p.z * 2, p.x * 2 + 89) - 0.5) * amount;
    return [x, sample(x, z, side), z];
  };
  for (const { x, z, size } of cells) {
    const top = zLines.get(z)!.filter((p) => p.x >= x && p.x < x + size);
    const right = xLines.get(x + size)!.filter((p) => p.z >= z && p.z < z + size);
    const bottom = zLines
      .get(z + size)!
      .filter((p) => p.x > x && p.x <= x + size)
      .reverse();
    const left = xLines
      .get(x)!
      .filter((p) => p.z > z && p.z <= z + size)
      .reverse();
    const border = [...top, ...right, ...bottom, ...left];
    const side = (p: Point) => Math.sign(z + size / 2 - p.z);
    // Four vertices need only two triangles, avoiding a repetitive central pyramid pattern.
    const vertices = border.map((p) => vertex(p, side(p)));
    if (vertices.length === 4) {
      if (hs(x * 2, z * 2) > 0.5) {
        triangle(vertices[0], vertices[2], vertices[1]);
        triangle(vertices[0], vertices[3], vertices[2]);
      } else {
        triangle(vertices[0], vertices[3], vertices[1]);
        triangle(vertices[1], vertices[3], vertices[2]);
      }
    } else {
      const cx = x + size / 2,
        cz = z + size / 2;
      const center: Vertex = [cx, sample(cx, cz), cz];
      for (let i = 0; i < vertices.length; i++)
        triangle(center, vertices[(i + 1) % vertices.length], vertices[i]);
    }
  }
  // Tall continuous cliff faces, with a few large diagonal folds instead of unit voxel steps.
  for (const z of cliffEdges) {
    for (let x = -64.5; x < 63.5; x += 8) {
      const bands = 4;
      const face = (px: number, t: number): Vertex => {
        const upper = sample(px, z, -1),
          lower = sample(px, z, 1);
        const segment = Math.floor((px + 64.5) / 8),
          u = (px + 64.5) / 8 - segment;
        const fold = (k: number) => 1.5 + hs(k + 91, Math.round(t * bands) + z * 2) * 5;
        const relief = Math.sin(t * Math.PI) * (fold(segment) * (1 - u) + fold(segment + 1) * u);
        return [px, upper * (1 - t) + lower * t, z - relief];
      };
      // Keep the channel narrow and unobstructed, but use eight-unit slabs on its banks.
      const channel = sx(z + 64.5) - 64,
        width = riverHalfWidth(z + 64.5);
      const cuts = [
        x,
        ...Array.from({ length: 7 }, (_, i) => x + i + 1).filter(
          (px) => Math.abs(px - channel) < width + 1.5,
        ),
        x + 8,
      ];
      for (let band = 0; band < bands; band++) {
        for (let k = 0; k < cuts.length - 1; k++) {
          const x0 = cuts[k],
            x1 = cuts[k + 1];
          if (sample((x0 + x1) / 2, z, -1) - sample((x0 + x1) / 2, z, 1) < 0.01) continue;
          const a = face(x0, band / bands),
            b = face(x1, band / bands);
          const c = face(x1, (band + 1) / bands),
            d = face(x0, (band + 1) / bands);
          if ((band === 0 || band === bands - 1) && x1 - x0 > 1) {
            const center: Vertex = [
              (a[0] + b[0] + c[0] + d[0]) / 4,
              (a[1] + b[1] + c[1] + d[1]) / 4,
              (a[2] + b[2] + c[2] + d[2]) / 4,
            ];
            const boundary =
              band === 0
                ? [...Array.from({ length: x1 - x0 + 1 }, (_, i) => face(x0 + i, 0)), c, d]
                : [a, b, ...Array.from({ length: x1 - x0 + 1 }, (_, i) => face(x1 - i, 1))];
            for (let i = 0; i < boundary.length; i++)
              triangle(center, boundary[(i + 1) % boundary.length], boundary[i]);
          } else {
            triangle(a, d, b);
            triangle(b, d, c);
          }
        }
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const terrain = new Mesh(geometry, new MeshLambertMaterial({ vertexColors: true }));
  terrain.name = 'meadow-faceted-basin';
  terrain.castShadow = terrain.receiveShadow = true;
  scene.add(terrain);
  return { mesh: terrain, heightAt: createTerrainSampler(position), terraces: terraces.terraces };
}
