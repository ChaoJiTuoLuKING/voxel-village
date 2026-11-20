uniform float uT, uLight;
varying vec2 vUv;
varying float vLife, vSeed, vVeil, vDepth;
void main() {
  vec2 q = vUv - .5;
  float n = artN(vUv * 3.7 + vec2(vSeed, -uT * .12));
  n = n * .68 + artN(vUv * 8. + vec2(-uT * .16, vSeed)) * .32;
  float edge = 1. - smoothstep(.08, .5, length(q) + (.5 - n) * .21);
  float alpha = edge * vLife * mix(.29, .17, vVeil);
  alpha *= smoothstep(.5, 3., vDepth) * (1. - smoothstep(175., 510., vDepth));
  vec3 white = mix(vec3(.86, .94, .93), vec3(1.2, 1.23, 1.18), n);
  gl_FragColor = vec4(white * uLight, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
