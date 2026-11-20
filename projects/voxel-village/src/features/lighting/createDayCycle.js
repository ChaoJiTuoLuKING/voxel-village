import * as T from 'three';

export function createDayCycle(scene, lighting, water, wm, cm, wfm) {
  const { sun, hemi, SUNW, skyM } = lighting;
  const { WU } = water;
  const DAY = {
      sun: new T.Color(0xfff0d0),
      hs: new T.Color(0xc7e1e8),
      hg: new T.Color(0x717a50),
      fog: new T.Color(0xc1d4d7),
      st: new T.Color(0x639bd0),
      sb: new T.Color(0xcbdde2),
    },
    NGT = {
      sun: new T.Color(0xff8a4a),
      hs: new T.Color(0x5a68a8),
      hg: new T.Color(0x2a2438),
      fog: new T.Color(0x5a5578),
      st: new T.Color(0x1b2250),
      sb: new T.Color(0xd98a64),
    };
  const wd = new T.Color(0.28, 0.36, 0.46),
    wn = new T.Color(1.7, 1.25, 0.6),
    tmp = new T.Color();
  function applyDay(t) {
    sun.color.copy(DAY.sun).lerp(NGT.sun, t);
    // r155 removed legacy light scaling; compensate locally for the r128 scene.
    sun.intensity = (1.7 - 0.8 * t) * Math.PI;
    hemi.color.copy(DAY.hs).lerp(NGT.hs, t);
    hemi.groundColor.copy(DAY.hg).lerp(NGT.hg, t);
    hemi.intensity = (0.78 - 0.3 * t) * Math.PI;
    scene.fog.color.copy(DAY.fog).lerp(NGT.fog, t);
    WU.fogC.value.copy(scene.fog.color);
    WU.night.value = t;
    skyM.uniforms.top.value.copy(DAY.st).lerp(NGT.st, t);
    skyM.uniforms.bot.value.copy(DAY.sb).lerp(NGT.sb, t);
    WU.sky.value.copy(skyM.uniforms.bot.value).lerp(skyM.uniforms.top.value, 0.35);
    wm.color.copy(wd).lerp(wn, t);
    sun.position.set(-72, 112 - 60 * t, 48);
    WU.sunDir.value.copy(sun.position).normalize();
    SUNW.copy(WU.sunDir.value);
    cm.color.setScalar(1 - 0.6 * t);
    cm.emissiveIntensity = 0.55 * (1 - 0.6 * t);
    wfm.uniforms.light.value = 1 - 0.52 * t;
  }

  applyDay(0);
  return { applyDay };
}
