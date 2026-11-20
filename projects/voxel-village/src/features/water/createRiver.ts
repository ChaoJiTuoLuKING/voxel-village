import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Scene,
} from 'three';
import { sx, lvl, riverHalfWidth } from '../../world/terrain.ts';
import noise from './shaders/flow-noise.glsl?raw';
import field from './shaders/flow-field.glsl?raw';
import vertexShader from './shaders/river-vertex.glsl?raw';
import fragmentShader from './shaders/river-fragment.glsl?raw';

export interface TimeUniform {
  value: number;
}
export function createFlowPalette() {
  return {
    shallow: { value: new Color('#74beb1') },
    deep: { value: new Color('#368c97') },
    foam: { value: new Color('#d7eee4') },
  };
}

export const cascadeBreaks = [10, 22, 36, 45] as const;

/** Follow the village's original river path and the shared four terrace elevations. */
export function buildRiverSurface() {
  const positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  const sections = [-0.5, ...cascadeBreaks.map((j) => j - 0.5), 94];
  const cols = 18;
  for (let section = 0; section < sections.length - 1; section++) {
    const start = sections[section],
      end = sections[section + 1];
    const rows = Math.ceil((end - start) * 8),
      offset = positions.length / 3;
    for (let row = 0; row <= rows; row++) {
      const j = start + ((end - start) * row) / rows;
      const z = j - 64;
      const y = section < 4 ? lvl(start + 0.51) : lvl(Math.max(45, j));
      const width =
        riverHalfWidth(j) * (1 + 0.035 * Math.sin((z * 8) / 3) + 0.025 * Math.sin((z * 13) / 3));
      for (let col = 0; col <= cols; col++) {
        const u = col / cols;
        positions.push(sx(j) - 64 + (u * 2 - 1) * width, y + 0.035, z);
        uvs.push(u, row / rows);
        if (col < cols && row < rows) {
          const k = offset + row * (cols + 1) + col;
          indices.push(k, k + cols + 1, k + 1, k + 1, k + cols + 1, k + cols + 2);
        }
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createRiver(
  scene: Scene,
  time: TimeUniform,
  appearance: {
    sky: { value: Color };
    sunDir: { value: Vector3 };
    fogC: { value: Color };
    night: TimeUniform;
  },
) {
  // The local flow shaders provide the river's lighting, foam, and current.
  const material = new ShaderMaterial({
    uniforms: {
      ...createFlowPalette(),
      t: time,
      night: appearance.night,
      sky: appearance.sky,
      sunDir: appearance.sunDir,
      fogColor: appearance.fogC,
      fogRange: { value: new Vector2(250, 1150) },
      uArtTime: time,
      uWind: { value: new Vector3(0.94, 0, -0.33).normalize() },
      uCloudK: { value: 0.3 },
    },
    vertexShader,
    fragmentShader: noise + field + fragmentShader,
    transparent: true,
    depthWrite: false,
  });
  const river = new Mesh(buildRiverSurface(), material);
  river.name = 'village-river-meadow-flow';
  river.renderOrder = 3;
  scene.add(river);
  return river;
}
