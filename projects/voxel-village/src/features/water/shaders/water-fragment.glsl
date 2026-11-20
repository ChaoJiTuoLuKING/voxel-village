uniform float t, hasReflection;
uniform vec3 sunDir, sky, fogC, sh, dp;
uniform sampler2D reflection;
varying float vD;
varying vec3 vP;
varying vec4 vR;

void main() {
  vec2 p = vP.xz;
  // Broad, low-amplitude waves keep the reflection readable without point-like highlights.
  float a = sin(p.x * .38 + p.y * .22 + t * .48);
  float b = sin(p.y * .55 - p.x * .17 - t * .36);
  vec3 n = normalize(vec3(.012 * a + .005 * b, 1., .009 * cos(p.y * .32 - t * .42)));
  vec3 v = normalize(cameraPosition - vP);
  float fresnel = .32 + .5 * pow(1. - max(dot(n, v), 0.), 3.);
  vec3 c = mix(sh, dp, clamp(vD / 6., 0., 1.));
  vec2 uv = vR.xy / vR.w + n.xz * .012;
  vec3 reflectionColor = texture2D(reflection, clamp(uv, vec2(.001), vec2(.999))).rgb;
  if (vP.y < 3.4 && hasReflection > .5) c = mix(c, reflectionColor, fresnel);
  else c = mix(c, sky * .55, fresnel * .45);
  // A continuous soft sheen replaces the repeated white crest pattern and sharp glitter.
  float sheen = pow(max(dot(reflect(-sunDir, vec3(0., 1., 0.)), v), 0.), 12.);
  c += vec3(.95, .89, .72) * sheen * .045;
  float shallow = 1. - smoothstep(.3, 1.25, vD);
  c = mix(c, vec3(.42, .66, .6), shallow * .2);
  c = mix(c, fogC * .65, smoothstep(250., 1150., length(cameraPosition - vP)));
  gl_FragColor = vec4(c, .94);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
