attribute float sz,al;uniform float k;varying float a;void main(){a=al;vec4 m=modelViewMatrix*vec4(position,1.);gl_PointSize=sz*k/-m.z;gl_Position=projectionMatrix*m;}
