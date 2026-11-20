import vertexShaderSource from './shaders/water-vertex.glsl?raw';
import fragmentShaderSource from './shaders/water-fragment.glsl?raw';
import * as T from 'three';
import { createRiver } from './createRiver';
import { copyReflectionProjection } from './reflectionProjection';
import { ATMOSPHERE_LAYER, N, WL } from '../../config/world';

import { sx, lvl } from '../../world/terrain.ts';
const V3 = T.Vector3;

export function createWater(world, runtime, UT) {
  const { Hm } = world;
  const { scene, renderer: R, camera: cam, lifetime } = runtime;
  // Shared river/lake material with a reflected scene, flowing ripples and pale banks.
  const WU = {
    t: UT,
    night: { value: 0 },
    sunDir: { value: new V3(-0.6, 0.6, 0.4).normalize() },
    sky: { value: new T.Color(0xc7dadd) },
    fogC: { value: new T.Color(0xc1d4d7) },
    sh: { value: new T.Color(0x68c9b6) },
    dp: { value: new T.Color(0x23798c) },
    reflection: { value: null },
    textureMatrix: { value: new T.Matrix4() },
    hasReflection: { value: 0 },
  };
  const reflectRT = new T.WebGLRenderTarget(1024, 768, {
    minFilter: T.LinearFilter,
    magFilter: T.LinearFilter,
    format: T.RGBAFormat,
  });
  WU.reflection.value = reflectRT.texture;
  const wg = new T.BufferGeometry(),
    wpos = [],
    wdepth = [],
    wix = [];
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      const h = Hm[i * N + j] - 0.5,
        river = j < 94 && Math.abs(i - sx(j)) < 3.3,
        L = river ? lvl(j) : WL;
      if (river || h >= L) continue;
      const x = i - 64,
        z = j - 64,
        k = wpos.length / 3;
      const L0 = river && j >= 45 ? lvl(j - 0.5) : L,
        L1 = river && j >= 45 ? lvl(j + 0.5) : L;
      wpos.push(
        x - 0.5,
        L0,
        z - 0.5,
        x - 0.5,
        L1,
        z + 0.5,
        x + 0.5,
        L1,
        z + 0.5,
        x + 0.5,
        L0,
        z - 0.5,
      );
      for (let v = 0; v < 4; v++) wdepth.push(Math.max(0.15, L - h));
      wix.push(k, k + 1, k + 2, k, k + 2, k + 3);
    }
  wg.setAttribute('position', new T.Float32BufferAttribute(wpos, 3));
  wg.setAttribute('depth', new T.Float32BufferAttribute(wdepth, 1));
  wg.setIndex(wix);
  const waterMat = new T.ShaderMaterial({
    uniforms: WU,
    transparent: true,
    depthWrite: false,
    vertexShader: vertexShaderSource,
    fragmentShader: fragmentShaderSource,
  });
  const water = new T.Mesh(wg, waterMat);
  water.renderOrder = 2;
  scene.add(water);
  // Only the basin lake extends beyond the core grid, not an ocean around the mountain range.
  const outerG = new T.PlaneGeometry(230, 150);
  outerG.rotateX(-Math.PI / 2);
  outerG.translate(0, WL - 0.025, 97.5);
  outerG.setAttribute('depth', new T.Float32BufferAttribute(new Float32Array(4).fill(8), 1));
  const outerWater = new T.Mesh(outerG, waterMat);
  outerWater.renderOrder = 1;
  scene.add(outerWater);
  createRiver(scene, UT, WU);
  const reflCam = new T.PerspectiveCamera(),
    reflPlane = new T.Plane(),
    normal = new V3(0, 1, 0),
    view = new V3(),
    target = new V3(),
    eye = new V3(),
    look = new V3(),
    qclip = new T.Vector4(),
    clipPlane = new T.Vector4(),
    biasMatrix = new T.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  function updateReflection() {
    if (cam.position.y <= WL + 0.1) return;
    eye.copy(cam.position);
    eye.y = 2 * WL - eye.y;
    cam.getWorldDirection(view);
    look.copy(cam.position).add(view);
    look.y = 2 * WL - look.y;
    reflCam.copy(cam);
    copyReflectionProjection(cam.projectionMatrix, reflCam.projectionMatrix);
    reflCam.layers.disable(ATMOSPHERE_LAYER);
    reflCam.position.copy(eye);
    reflCam.up.copy(cam.up);
    reflCam.up.y *= -1;
    reflCam.lookAt(look);
    reflCam.updateMatrixWorld();
    reflCam.matrixWorldInverse.copy(reflCam.matrixWorld).invert();
    WU.textureMatrix.value
      .copy(biasMatrix)
      .multiply(reflCam.projectionMatrix)
      .multiply(reflCam.matrixWorldInverse);
    reflPlane
      .setFromNormalAndCoplanarPoint(normal, new V3(0, WL, 0))
      .applyMatrix4(reflCam.matrixWorldInverse);
    clipPlane.set(reflPlane.normal.x, reflPlane.normal.y, reflPlane.normal.z, reflPlane.constant);
    const p = reflCam.projectionMatrix.elements;
    qclip.set(
      (Math.sign(clipPlane.x) + p[8]) / p[0],
      (Math.sign(clipPlane.y) + p[9]) / p[5],
      -1,
      (1 + p[10]) / p[14],
    );
    clipPlane.multiplyScalar(2 / clipPlane.dot(qclip));
    p[2] = clipPlane.x;
    p[6] = clipPlane.y;
    p[10] = clipPlane.z + 1 - 0.002;
    p[14] = clipPlane.w;
    water.visible = outerWater.visible = false;
    const rt = R.getRenderTarget(),
      auto = R.shadowMap.autoUpdate;
    R.shadowMap.autoUpdate = false;
    R.setRenderTarget(reflectRT);
    R.clear();
    R.render(scene, reflCam);
    R.setRenderTarget(rt);
    R.shadowMap.autoUpdate = auto;
    water.visible = outerWater.visible = true;
    WU.hasReflection.value = 1;
  }

  lifetime.defer(() => reflectRT.dispose());
  return { WU, updateReflection };
}
