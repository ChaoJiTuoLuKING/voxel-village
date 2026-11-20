import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Points,
  RingGeometry,
  ShaderMaterial,
} from 'three';
import type { SceneRuntime } from '@visual/scene-kit';
import { ATMOSPHERE_LAYER } from '../../config/world';
import { sx, lvl, riverHalfWidth } from '../../world/terrain.ts';
import { createRandom } from '../../world/random';
import { cascadeBreaks, createFlowPalette, type TimeUniform } from './createRiver';
import { createWaterfallMist } from './createWaterfallMist';
import noise from './shaders/flow-noise.glsl?raw';
import vertexShader from './shaders/waterfalls-vertex.glsl?raw';
import fragmentShader from './shaders/waterfalls-fragment.glsl?raw';
import sprayVertexShader from './shaders/spray-vertex.glsl?raw';
import sprayFragmentShader from './shaders/spray-fragment.glsl?raw';
import rainbowFragmentShader from './shaders/rainbow-fragment.glsl?raw';

export function cascadeLanding(j: number) {
  return { x: sx(j + 1.35) - 64, y: lvl(j + 1.35), z: j - 64 + 1.35 };
}

/** Water sheets and terrain use the same ledge elevations, including the two high falls. */
export function buildWaterfallRibbon(j: number) {
  const upper = lvl(j - 1),
    lower = cascadeLanding(j).y,
    boundary = j - 0.5;
  const rows = 80,
    cols = 24;
  const positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  for (let row = 0; row <= rows; row++) {
    const t = row / rows,
      s = 1 - t;
    // A short lip, nearly vertical center, and a rounded run-out into the lower pool.
    const offsetZ = s * s * s * -0.4 + 3 * s * s * t * 0.8 + 3 * s * t * t * 0.6 + t * t * t * 1.85;
    // Clear the block's front edge before dropping; taller sheets otherwise cut into the lip.
    const fallT = Math.max(0, (offsetZ - 0.06) / 1.79);
    const drop = fallT * fallT * (3 - 2 * fallT);
    const sample = boundary + offsetZ;
    const width =
      riverHalfWidth(j) *
      (1 + 0.035 * Math.sin(((sample - 64) * 8) / 3) + 0.025 * Math.sin(((sample - 64) * 13) / 3));
    for (let col = 0; col <= cols; col++) {
      const u = col / cols;
      positions.push(
        sx(sample) - 64 + (u * 2 - 1) * width,
        upper +
          (lower - upper) * drop +
          0.035 +
          Math.sin(u * 19 + (sample * 4) / 3) * 0.035 * Math.sin(Math.PI * fallT),
        sample - 64 + Math.sin(u * 15 + sample) * 0.035 * Math.sin(Math.PI * t),
      );
      uvs.push(u, 1 - t);
      if (col < cols && row < rows) {
        const k = row * (cols + 1) + col;
        indices.push(k, k + cols + 1, k + 1, k + 1, k + cols + 1, k + cols + 2);
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

export function createWaterfalls(runtime: SceneRuntime, time: TimeUniform) {
  const { scene, camera } = runtime;
  const light = { value: 1 };
  const wfm = new ShaderMaterial({
    uniforms: { ...createFlowPalette(), t: time, shade: light, light },
    vertexShader,
    fragmentShader: noise + fragmentShader,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
  for (const j of cascadeBreaks) {
    const waterfall = new Mesh(buildWaterfallRibbon(j), wfm);
    waterfall.name = `village-cascade-${j}`;
    waterfall.renderOrder = 4;
    scene.add(waterfall);
  }

  const rings: Mesh<RingGeometry, MeshBasicMaterial>[] = [];
  for (const j of cascadeBreaks) {
    const p = cascadeLanding(j);
    for (let i = 0; i < 3; i++) {
      const ring = new Mesh(
        new RingGeometry(0.54, 0.705, 40),
        new MeshBasicMaterial({
          color: '#d7eee4',
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
          side: DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(p.x, p.y + 0.075, p.z + 0.15);
      ring.renderOrder = 5;
      scene.add(ring);
      rings.push(ring);
    }
  }

  // Match the pasture's ballistic spray and rising mist at the village's larger scale.
  const random = createRandom(5150),
    count = 160,
    scale = 2.8;
  const positions = new Float32Array(count * cascadeBreaks.length * 3);
  const seeds = new Float32Array(count * cascadeBreaks.length * 4);
  const widths = new Float32Array(count * cascadeBreaks.length);
  cascadeBreaks.forEach((j, k) => {
    const p = cascadeLanding(j);
    for (let i = 0; i < count; i++) {
      const index = k * count + i;
      positions.set([p.x / scale, (p.y + 0.08) / scale, p.z / scale], index * 3);
      seeds.set([random(), random(), random(), random()], index * 4);
      widths[index] = riverHalfWidth(j) / scale;
    }
  });
  const sprayGeometry = new BufferGeometry();
  sprayGeometry.setAttribute('position', new BufferAttribute(positions, 3));
  sprayGeometry.setAttribute('aSeed', new BufferAttribute(seeds, 4));
  sprayGeometry.setAttribute('aW', new BufferAttribute(widths, 1));
  const sprayUniforms = {
    uT: time,
    uScale: { value: 600 },
    uCol: { value: new Color('#e4f6ee') },
    uK: light,
  };
  const spray = new Points(
    sprayGeometry,
    new ShaderMaterial({
      uniforms: sprayUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: sprayVertexShader,
      fragmentShader: sprayFragmentShader,
    }),
  );
  spray.name = 'village-cascade-spray';
  spray.scale.setScalar(scale);
  spray.frustumCulled = false;
  spray.renderOrder = 6;
  spray.layers.set(ATMOSPHERE_LAYER);
  camera.layers.enable(ATMOSPHERE_LAYER);
  scene.add(spray);
  createWaterfallMist(runtime, time, light);
  runtime.onResize(() => {
    sprayUniforms.uScale.value =
      (scale * runtime.size.height * runtime.size.pixelRatio) /
      (2 * Math.tan((camera.fov * Math.PI) / 360));
  });
  // Initialize before the first resize callback as well.
  sprayUniforms.uScale.value =
    (scale * runtime.size.height * runtime.size.pixelRatio) /
    (2 * Math.tan((camera.fov * Math.PI) / 360));

  const p = cascadeLanding(10),
    rainbowK = { value: 0.2 };
  const rainbow = new Mesh(
    new PlaneGeometry(20, 20),
    new ShaderMaterial({
      uniforms: { uK: rainbowK },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      vertexShader,
      fragmentShader: rainbowFragmentShader,
    }),
  );
  rainbow.position.set(p.x, p.y + 0.3, p.z + 0.8);
  rainbow.name = 'village-water-mist-rainbow';
  rainbow.renderOrder = 7;
  scene.add(rainbow);

  function update(elapsed: number) {
    rings.forEach((ring, index) => {
      const phase = (elapsed * 0.37 + (index % 3) / 3) % 1;
      ring.scale.set(0.8 + phase * 3.8, 0.55 + phase * 2.2, 1);
      ring.material.opacity = (1 - phase) * 0.23 * light.value;
    });
    rainbowK.value = 0.2 * Math.max(0, (light.value - 0.48) / 0.52);
    rainbow.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
  }
  update(0);
  return { wfx: sx(36) - 64, wfz: 35.5 - 64, wfm, update };
}
