import vertexShaderSource from './shaders/lighting-vertex.glsl?raw';
import fragmentShaderSource from './shaders/lighting-fragment.glsl?raw';
import * as T from 'three';

const V3 = T.Vector3;

export function createLighting(scene) {
  scene.fog = new T.Fog(0xc1d4d7, 250, 1150);
  const hemi = new T.HemisphereLight(0xbfd9ff, 0x6b7a4a, 0.85),
    sun = new T.DirectionalLight(0xfff0d0, 2.3);
  scene.add(hemi, sun, sun.target);
  sun.target.position.set(0, 8, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const sc_ = sun.shadow.camera;
  sc_.left = -125;
  sc_.right = 125;
  sc_.top = 125;
  sc_.bottom = -125;
  sc_.near = 1;
  sc_.far = 500;
  sun.shadow.bias = -0.00012;
  sun.shadow.normalBias = 0.055;
  const SUNW = new V3(-0.6, 0.5, -0.35).normalize();
  const skyM = new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      sd: { value: SUNW },
      top: { value: new T.Color(0x6fa4d8) },
      bot: { value: new T.Color(0xe8e2cf) },
    },
    vertexShader: vertexShaderSource,
    fragmentShader: fragmentShaderSource,
  });
  const sky = new T.Mesh(new T.SphereGeometry(2000, 24, 12), skyM);
  scene.add(sky);

  return { hemi, sun, SUNW, skyM };
}
