varying vec3 vP;varying vec2 vUv;uniform float t,night,uCloudK;uniform vec3 sky,sunDir,fogColor,shallow,deep,foam;uniform vec2 fogRange;
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*artN(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
float flowN(vec2 p){float a0=fract(t*.22),a1=fract(t*.22+.5),w=abs(a0-.5)*2.;return mix(fbm(p*1.5-vec2(0.,a0*2.2)),fbm(p*1.5-vec2(0.,a1*2.2)+3.1),w);}
void main(){vec2 p=vP.xz;float depth=pow(max(0.,sin(vUv.x*3.14159265)),.65);
float e=.07,h=flowN(p),hx=flowN(p+vec2(e,0.)),hz=flowN(p+vec2(0.,e));vec3 n=normalize(vec3((h-hx)*2.2,1.,(h-hz)*2.2));
vec3 v=normalize(cameraPosition-vP);float fresnel=pow(1.-max(dot(n,v),0.),3.);
vec3 col=mix(shallow,deep,depth);
float caus=pow(1.-abs(sin(fbm(p*2.6+vec2(t*.15,t*.35))*9.)),7.);col+=vec3(.9,1.,.85)*caus*(1.-depth)*.16*(1.-night);
col=mix(col,sky,fresnel*.6);
float glint=pow(max(dot(reflect(-sunDir,n),v),0.),160.)*(.4+.6*step(.55,artN(p*38.+t*2.)));col+=vec3(1.,.9,.7)*glint*2.4*(1.-night*.8);
float bank=(1.-smoothstep(.02,.3,depth))*smoothstep(.42,.72,fbm(p*4.-vec2(0.,t*.8)));
float streak=smoothstep(.6,.82,fbm(vec2(p.x*6.,p.y*.7-t*.9)))*.3;
col=mix(col,foam,clamp(bank*.75+streak*depth,0.,1.));
col*=1.-uCloudK*artCloud(p,uArtTime)*.6;col*=1.-night*.42;
col=mix(col,fogColor,smoothstep(fogRange.x,fogRange.y,length(cameraPosition-vP)));
gl_FragColor=vec4(col,.68+.24*depth);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}