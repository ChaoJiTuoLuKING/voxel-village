uniform vec3 top,bot,sd;
varying vec3 p;
float hash(vec2 v) { return fract(sin(dot(v,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 v) {
  vec2 i=floor(v), f=fract(v); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
}
void main(){
  vec3 n=normalize(p); float h=clamp(n.y*1.6+.1,0.,1.);
  vec3 c=mix(bot,top,pow(h,.7)); float s=max(dot(n,normalize(sd)),0.);
  c+=vec3(1.,.85,.6)*(pow(s,10.)*.25+pow(s,160.)*.9+smoothstep(.9992,.9998,s)*2.);
  vec2 uv=n.xz/max(.12,n.y)*2.;
  float cloud=noise(uv)*.58+noise(uv*2.03)*.27+noise(uv*4.07)*.15;
  float veil=smoothstep(.51,.77,cloud)*smoothstep(.04,.28,n.y)*.55;
  c=mix(c,mix(bot,vec3(1.,.97,.89),.75),veil);
  gl_FragColor=vec4(c,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
