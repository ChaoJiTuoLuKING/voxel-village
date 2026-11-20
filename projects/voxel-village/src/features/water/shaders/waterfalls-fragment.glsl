uniform float t,shade;uniform vec3 shallow,deep,foam;varying vec2 vUv;
void main(){float c=clamp(vUv.x,0.,1.),v=clamp(vUv.y,0.,1.),fall=1.-v,s=pow(max(fall,0.),.75);
float n1=artN(vec2(c*16.+sin(s*11.-t*3.)*fall*.35,s*2.2-t*2.8)),n2=artN(vec2(c*38.+3.,s*4.5-t*4.5));
float churn=artN(vec2(c*7.+sin(s*15.-t*4.)*.6,s*17.-t*9.));
n2=mix(n2,churn,fall*.35);
float white=clamp(.22+fall*.24+smoothstep(.24,.78,n1*.65+n2*.35)*(.4+fall*.55),0.,1.);
vec3 col=mix(mix(deep,shallow,.45+.3*n1),foam*1.25,white);
col=mix(col,mix(shallow,deep,.5)*1.1+vec3(.12)*pow(n2,3.),smoothstep(.82,.98,v)*.55);
float base=1.-smoothstep(0.,.3,v);col=mix(col,foam*1.6,base*(.7+.3*n2));
float en=.06*n1,edge=smoothstep(0.,.1+en,c)*(1.-smoothstep(.9-en,1.,c));
gl_FragColor=vec4(col*shade,edge*(.82+white*.15));
#include <tonemapping_fragment>
#include <colorspace_fragment>
}
