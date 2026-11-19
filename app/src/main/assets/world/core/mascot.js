// The space buddy: an illustrated kid astronaut (hand-drawn SVG poses rendered to PNG, assets/world/mascot/).
// Shown as a camera-facing sprite so the illustration keeps its full quality; brought to life with
// bob, squash-and-stretch, sway, blinks and pose swaps. One small transparent quad: cheap on the Mali-G52.
//   makeMascot({ scale, seated }) → Object3D with userData.setMood(mood, t) and userData.update(t, lookX)
//   moods: 'idle' | 'happy' | 'think' | 'wave' | 'fly'
import * as THREE from '../vendor/three.module.min.js';

const POSES = ['idle', 'blink', 'happy', 'think', 'wave', 'fly'];
const loader = new THREE.TextureLoader();
const TEX = {};
POSES.forEach(p => { const t = loader.load('mascot/pose_' + p + '.png'); t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; TEX[p] = t; });
const GEO = new THREE.PlaneGeometry(2.6, 2.6); GEO.translate(0, 1.05, 0);   // pivot near the feet
const SHADOW = new THREE.CircleGeometry(.55, 24);
const _q = new THREE.Quaternion();
let activeCamera = null;
/** Screens tell the mascot which camera to face (billboard). */
export function setMascotCamera(cam) { activeCamera = cam; }

export function makeMascot(opts = {}) {
  const root = new THREE.Group(), holder = new THREE.Group(); root.add(holder); holder.position.y = -1.3;
  const mat = new THREE.MeshBasicMaterial({ map: TEX.idle, transparent: true, alphaTest: .02, depthWrite: false, toneMapped: false });
  const sprite = new THREE.Mesh(GEO, mat); sprite.renderOrder = 3; holder.add(sprite);
  const shadow = new THREE.Mesh(SHADOW, new THREE.MeshBasicMaterial({ color: 0x0B0628, transparent: true, opacity: .25, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.scale.set(1, .45, 1); shadow.position.y = .02; if (opts.seated) shadow.visible = false; holder.add(shadow);
  let mood = opts.seated ? 'fly' : 'idle', moodT = 0, blinkAt = 1.6, face = 1;
  root.userData = {
    setMood(m, t) { mood = m; moodT = t; },
    update(t, lookX = 0) {
      const base = opts.seated ? 'fly' : 'idle';
      const mt = t - moodT; if (mood !== base && mt > 2.2) mood = base;
      let pose = mood; if (mood === 'idle' && t > blinkAt) { pose = 'blink'; if (t > blinkAt + .14) blinkAt = t + 2.5 + (Math.sin(t * 7.3) * .5 + .5) * 2.5; }
      if (mat.map !== TEX[pose]) mat.map = TEX[pose];
      // life: float bob, gentle sway; happy = hop with squash & stretch
      const hop = mood === 'happy' && mt < .8 ? Math.sin(mt / .8 * Math.PI) : 0;
      const land = mood === 'happy' && mt > .8 && mt < 1.05 ? Math.sin((mt - .8) / .25 * Math.PI) : 0;
      if (lookX < -.35) face = -1; else if (lookX > .35) face = 1;
      sprite.position.y = Math.sin(t * 2.1) * .06 + hop * .7;
      sprite.scale.set(face * (1 + land * .1 - hop * .05), 1 - land * .1 + hop * .06, 1);
      sprite.rotation.z = Math.sin(t * 1.3) * .035;
      shadow.scale.set(1 - hop * .35, .45 * (1 - hop * .35), 1); shadow.material.opacity = .25 * (1 - hop * .5);
      // billboard: keep the drawing square to the camera whatever the parent's rotation
      if (activeCamera && root.parent) { root.parent.getWorldQuaternion(_q).invert(); holder.quaternion.copy(_q).multiply(activeCamera.quaternion); }
    },
  };
  if (opts.scale) root.scale.setScalar(opts.scale);
  return root;
}
