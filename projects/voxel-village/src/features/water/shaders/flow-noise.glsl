float artH(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float artN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(artH(i),artH(i+vec2(1.,0.)),f.x),mix(artH(i+vec2(0.,1.)),artH(i+vec2(1.,1.)),f.x),f.y);}
