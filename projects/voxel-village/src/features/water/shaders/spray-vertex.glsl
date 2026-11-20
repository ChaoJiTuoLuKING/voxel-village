attribute vec4 aSeed;attribute float aW;uniform float uT,uScale;varying float vA;varying float vMist;
void main(){float mist=step(.82,aSeed.w);float life=fract(uT*mix(.55+aSeed.w*.35,.16,mist)+aSeed.z*7.13);
vec3 vel=mix(vec3((aSeed.x-.5)*1.6,1.1+aSeed.y*1.9,.35+aSeed.z*1.1),vec3((aSeed.x-.5)*.8,.55+aSeed.y*.4,.5+aSeed.z*.6),mist);
vec3 p=position+vec3((aSeed.x-.5)*aW*1.7,0.,(aSeed.y-.5)*.3)+vel*life*mix(.8,2.6,mist);p.y-=(1.-mist)*2.4*life*life;p.y=max(p.y,position.y-.02);
vA=sin(3.14159*life)*mix(1.,.55,mist)*(1.-life*.3);vMist=mist;
vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=mix(.05+aSeed.y*.06+life*.07,.55+life*1.3,mist)*uScale/-mv.z;gl_Position=projectionMatrix*mv;}