uniform float uT;
attribute vec3 aOrigin, aShape;
attribute vec4 aSeed;
varying vec2 vUv;
varying float vLife, vSeed, vVeil, vDepth;
void main() {
  float life = fract(uT * mix(.13, .22, aSeed.w) + aSeed.z);
  float angle = aSeed.x * 6.28318;
  vec3 p = aOrigin;
  p.x += (sin(angle) * life + sin(uT * .6 + angle) * .16) * aShape.z;
  p.y += life * aShape.y;
  p.z += life * (1.5 + aSeed.y * mix(7., 3., aSeed.w));
  float size = aShape.x * (.65 + life * .9);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  mv.xy += position.xy * vec2(size, size * mix(.75, 1.6, aSeed.w));
  gl_Position = projectionMatrix * mv;
  vUv = uv;
  vLife = sin(life * 3.14159);
  vSeed = aSeed.x * 31.;
  vVeil = aSeed.w;
  vDepth = -mv.z;
}
