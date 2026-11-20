import vertexShaderSource from './shaders/particles-vertex.glsl?raw';
import fragmentShaderSource from './shaders/particles-fragment.glsl?raw';
import * as T from 'three';
import { ATMOSPHERE_LAYER } from '../../config/world';

import { lvl } from '../../world/terrain.ts';

export function createParticles(world, runtime, chims, wfx, wfz, waterSpray = true) {
  const { rnd } = world;
  const { scene } = runtime;
  // particles
  const PN = 260,
    pp = new Float32Array(PN * 3),
    pvl = new Float32Array(PN * 3),
    psz = new Float32Array(PN),
    pal = new Float32Array(PN),
    pa = new Float32Array(PN),
    pm = new Float32Array(PN);
  function resp(q) {
    pa[q] = 0;
    if (q < PN - 110 && chims.length) {
      const c = chims[q % chims.length];
      pp[q * 3] = c[0] + (rnd() - 0.5) * 0.5;
      pp[q * 3 + 1] = c[1];
      pp[q * 3 + 2] = c[2] + (rnd() - 0.5) * 0.5;
      pvl[q * 3] = 0.35 + rnd() * 0.2;
      pvl[q * 3 + 1] = 0.9 + rnd() * 0.5;
      pvl[q * 3 + 2] = 0.1;
      pm[q] = 4 + rnd() * 3;
    } else {
      pp[q * 3] = wfx + (rnd() - 0.5) * 4.4;
      pp[q * 3 + 1] = lvl(36) + 0.4;
      pp[q * 3 + 2] = wfz + 1.2 + rnd();
      pvl[q * 3] = (rnd() - 0.5) * 0.7;
      pvl[q * 3 + 1] = 0.8 + rnd() * 1.2;
      pvl[q * 3 + 2] = 0.7 + rnd() * 0.5;
      pm[q] = 1.6 + rnd() * 1.4;
    }
  }
  for (let q = 0; q < PN; q++) {
    resp(q);
    pa[q] = rnd() * pm[q];
  }
  const pg = new T.BufferGeometry();
  pg.setAttribute('position', new T.BufferAttribute(pp, 3));
  pg.setAttribute('sz', new T.BufferAttribute(psz, 1));
  pg.setAttribute('al', new T.BufferAttribute(pal, 1));
  const PU = {
      k: {
        value:
          (runtime.size.height * runtime.size.pixelRatio) / (2 * Math.tan((23 * Math.PI) / 180)),
      },
    },
    pts = new T.Points(
      pg,
      new T.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: PU,
        vertexShader: vertexShaderSource,
        fragmentShader: fragmentShaderSource,
      }),
    );
  pts.frustumCulled = false;
  pts.layers.set(ATMOSPHERE_LAYER);
  runtime.camera.layers.enable(ATMOSPHERE_LAYER);
  scene.add(pts);

  runtime.onResize(() => {
    PU.k.value =
      (runtime.size.height * runtime.size.pixelRatio) / (2 * Math.tan((23 * Math.PI) / 180));
  });
  function update(dt, wt) {
    for (let q = 0; q < PN; q++) {
      pa[q] += dt;
      if (pa[q] >= pm[q]) resp(q);
      const t = pa[q] / pm[q],
        smk = q < PN - 110;
      pp[q * 3] += pvl[q * 3] * dt + (smk ? Math.sin(wt + q) * 0.08 * dt : 0);
      pp[q * 3 + 1] += pvl[q * 3 + 1] * dt * (smk ? 1 : 1 - t * 0.7);
      pp[q * 3 + 2] += pvl[q * 3 + 2] * dt;
      psz[q] = smk ? 0.6 + t * 1.8 : 0.7 + t * 1.6;
      pal[q] =
        !smk && !waterSpray
          ? 0
          : (smk ? 0.38 : 0.42) * Math.sin(Math.PI * Math.min(1, t)) * (smk ? 1 : 0.9);
    }
    pg.attributes.position.needsUpdate =
      pg.attributes.sz.needsUpdate =
      pg.attributes.al.needsUpdate =
        true;
  }
  return { update };
}
