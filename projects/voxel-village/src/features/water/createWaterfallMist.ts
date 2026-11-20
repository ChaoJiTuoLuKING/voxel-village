import {
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
} from 'three';
import type { SceneRuntime } from '@visual/scene-kit';
import { ATMOSPHERE_LAYER } from '../../config/world';
import { createRandom } from '../../world/random';
import { lvl, sx } from '../../world/terrain.ts';
import { cascadeBreaks, type TimeUniform } from './createRiver';
import noise from './shaders/flow-noise.glsl?raw';
import vertexShader from './shaders/mist-vertex.glsl?raw';
import fragmentShader from './shaders/mist-fragment.glsl?raw';

/** Two overlapping volumes: impact plumes and wind-sheared veils along the falling water. */
export function createWaterfallMist(runtime: SceneRuntime, time: TimeUniform, light: TimeUniform) {
  const random = createRandom(7281);
  const origins: number[] = [],
    seeds: number[] = [],
    shapes: number[] = [];
  for (const j of cascadeBreaks) {
    const top = lvl(j - 1),
      bottom = lvl(j + 1.35),
      drop = top - bottom;
    const power = Math.min(1, drop / 46);
    const impactCount = drop > 30 ? 46 : 20;
    for (let i = 0; i < impactCount; i++) {
      origins.push(sx(j + 1.35) - 64 + (random() - 0.5) * 4, bottom + 0.4, j - 62.3 + random() * 2);
      seeds.push(random(), random(), random(), 0);
      shapes.push(3.2 + random() * 3 + power * 7, 3 + power * 12, 2 + power * 6);
    }
    const veilCount = Math.ceil(drop * 0.9);
    for (let i = 0; i < veilCount; i++) {
      const fraction = (i + random()) / veilCount;
      origins.push(sx(j + 0.4) - 64 + (random() - 0.5) * 6, bottom + fraction * drop, j - 62.4);
      seeds.push(random(), random(), random(), 1);
      shapes.push(2.4 + random() * 3 + power * 2.5, 1.5 + power * 3, 0.6 + power * 1.1);
    }
  }
  const geometry = new InstancedBufferGeometry();
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3),
  );
  geometry.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geometry.setAttribute('aOrigin', new InstancedBufferAttribute(new Float32Array(origins), 3));
  geometry.setAttribute('aSeed', new InstancedBufferAttribute(new Float32Array(seeds), 4));
  geometry.setAttribute('aShape', new InstancedBufferAttribute(new Float32Array(shapes), 3));
  geometry.instanceCount = origins.length / 3;
  const mist = new Mesh(
    geometry,
    new ShaderMaterial({
      uniforms: { uT: time, uLight: light },
      transparent: true,
      depthWrite: false,
      vertexShader,
      fragmentShader: noise + fragmentShader,
    }),
  );
  mist.name = 'village-waterfall-mist-volumes';
  mist.frustumCulled = false;
  mist.renderOrder = 6;
  mist.layers.set(ATMOSPHERE_LAYER);
  runtime.scene.add(mist);
}
