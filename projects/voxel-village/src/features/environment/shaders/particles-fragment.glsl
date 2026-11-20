varying float a;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(.93,.93,.95,a*smoothstep(.5,.1,d));}
