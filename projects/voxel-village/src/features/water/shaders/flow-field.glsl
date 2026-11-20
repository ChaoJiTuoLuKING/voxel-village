uniform float uArtTime;uniform vec3 uWind;
float artGust(vec2 p,float t){vec2 q=p*.11-uWind.xz*t*.7;return smoothstep(.35,.85,artN(q)*.65+artN(q*2.3+7.)*.35);}
float artCloud(vec2 p,float t){vec2 q=p*.028-uWind.xz*t*.04;float n=artN(q)*.6+artN(q*2.1+3.)*.3+artN(q*4.3+11.)*.1;return smoothstep(.5,.74,n);}
