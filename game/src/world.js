/* MARISOL BAY — world.js (fresh build, v4)
   Original low-poly city: dusk beach avenue, leaning palms, wedge hero car,
   white police heli with spotlight, police + traffic, on-foot hero, garage. */
'use strict';

const W = {
  scene: null, camera: null, renderer: null,
  city: null, garage: null, skyDome: null, sun: null,
  heroCar: null, heli: null, rotor: null, spotCone: null, spotPool: null,
  footChar: null, tracer: null, targetRing: null,
  police: [], traffic: [], peds: [], palms: [], ferris: null, fires: [],
  hero: { x: 0, z: 0, heading: 0, speed: 0, targetSpeed: 0 },
  foot: { x: 0, z: 0, heading: 0 },
  mode: 'city', frozen: false, time: 0,
};

function std(color, opts) {
  return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0.05 }, opts || {}));
}
function box(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x || 0, y || 0, z || 0);
  (parent || W.scene).add(m);
  return m;
}
function cyl(rt, rb, h, mat, x, y, z, parent, seg) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 10), mat);
  m.position.set(x || 0, y || 0, z || 0);
  (parent || W.scene).add(m);
  return m;
}

/* ---------- procedural textures (no files, no network) ---------- */
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function windowTexture(base, lit) {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 12; y < h - 10; y += 22) for (let x = 10; x < w - 10; x += 18) {
      const on = Math.random() < lit;
      g.fillStyle = on ? (Math.random() < 0.7 ? '#ffd98a' : '#ffeec2') : '#20242e';
      g.fillRect(x, y, 11, 14);
    }
  });
}
function signTexture(text, bg, fg, sub) {
  return canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = '900 34px Arial'; g.textAlign = 'center';
    g.fillText(text, w / 2, sub ? 46 : 58);
    if (sub) { g.font = '700 20px Arial'; g.fillText(sub, w / 2, 78); }
  });
}
function skyTexture() {
  return canvasTex(64, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0.0, '#2a1a5e'); gr.addColorStop(0.35, '#7a3a8e');
    gr.addColorStop(0.55, '#e86a6a'); gr.addColorStop(0.72, '#ffb347');
    gr.addColorStop(0.85, '#ffd98a'); gr.addColorStop(1.0, '#ffe9b8');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}
function hazardTexture() {
  return canvasTex(256, 32, (g, w, h) => {
    for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#111' : '#ffd23f'; g.fillRect(i * 16, 0, 16, h); }
  });
}

/* ---------- vehicles ---------- */
function makeWheel(parent, x, y, z) {
  const w = cyl(0.34, 0.34, 0.26, std(0x14161a, { roughness: 0.95 }), x, y, z, parent, 14);
  w.rotation.x = Math.PI / 2;
  const hub = cyl(0.17, 0.17, 0.28, std(0xb8c0c8, { metalness: 0.7, roughness: 0.35 }), x, y, z, parent, 10);
  hub.rotation.x = Math.PI / 2;
  return w;
}
function makeWedgeCar(color, opts) {
  opts = opts || {};
  const g = new THREE.Group();
  const paint = std(color, { metalness: 0.55, roughness: 0.28 });
  const glass = std(0x0d1420, { metalness: 0.9, roughness: 0.12 });
  const body = box(2.3, 0.5, 4.7, paint, 0, 0.55, 0, g);
  body.geometry = new THREE.BoxGeometry(2.3, 0.5, 4.7);
  // wedge nose: sloped hood (front = -Z)
  const hood = box(2.1, 0.22, 1.5, paint, 0, 0.82, -1.7, g);
  hood.rotation.x = 0.16;
  const cabin = box(1.85, 0.5, 2.1, glass, 0, 1.0, 0.35, g);
  const roof = box(1.7, 0.1, 1.9, paint, 0, 1.28, 0.35, g);
  const spoiler = box(2.2, 0.08, 0.5, paint, 0, 1.12, 2.15, g);
  box(0.12, 0.3, 0.12, std(0x111318), -0.8, 0.95, 2.1, g);
  box(0.12, 0.3, 0.12, std(0x111318), 0.8, 0.95, 2.1, g);
  // taillights: glowing red bar across the rear (+Z face)
  const tl = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff1a1a, emissiveIntensity: 4.0 }));
  tl.position.set(0, 0.72, 2.38); g.add(tl);
  const tl2 = tl.clone(); tl2.position.set(0, 0.72, 2.38); g.add(tl2);
  // tail glow sprites (additive discs)
  [-0.7, 0.7].forEach(x => {
    const s = new THREE.Mesh(new THREE.CircleGeometry(0.38, 16),
      new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.position.set(x, 0.72, 2.44); g.add(s);
  });
  // headlights (front, -Z): emissive + beams
  [-0.75, 0.75].forEach(x => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x222200, emissive: 0xfff2b0, emissiveIntensity: 3.2 }));
    hl.position.set(x, 0.62, -2.38); g.add(hl);
  });
  makeWheel(g, -1.05, 0.34, -1.5); makeWheel(g, 1.05, 0.34, -1.5);
  makeWheel(g, -1.05, 0.34, 1.5); makeWheel(g, 1.05, 0.34, 1.5);
  if (opts.headlightBeams) {
    [-0.75, 0.75].forEach(x => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9, 7, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      cone.rotation.x = -Math.PI / 2; cone.position.set(x, 0.55, -6); g.add(cone);
    });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.03, -5); g.add(pool);
  }
  return g;
}
function makePoliceCar() {
  const g = new THREE.Group();
  const white = std(0xf2f5f7, { metalness: 0.3, roughness: 0.4 });
  box(2.1, 0.55, 4.3, white, 0, 0.55, 0, g);
  box(1.7, 0.5, 2.0, std(0x10151f, { metalness: 0.8, roughness: 0.2 }), 0, 1.0, 0.2, g);
  box(1.6, 0.09, 1.8, white, 0, 1.28, 0.2, g);
  const stripe = box(2.12, 0.16, 4.32, std(0x0e2a4a), 0, 0.5, 0, g);
  stripe.material = std(0x0e2a4a);
  // light bar: red left / blue right, emissive (flashed in update)
  const bar = new THREE.Group(); bar.position.set(0, 1.38, 0.2); g.add(bar);
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2020, emissiveIntensity: 3 }));
  red.position.x = -0.32; bar.add(red);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x000033, emissive: 0x2266ff, emissiveIntensity: 3 }));
  blue.position.x = 0.32; bar.add(blue);
  // red/blue glow pools on the road
  const rp = new THREE.Mesh(new THREE.CircleGeometry(1.5, 20),
    new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
  rp.rotation.x = -Math.PI / 2; rp.position.set(-0.7, 0.04, 0); g.add(rp);
  const bp = rp.clone(); bp.material = rp.material.clone(); bp.material.color.set(0x2266ff);
  bp.position.set(0.7, 0.04, 0); g.add(bp);
  makeWheel(g, -0.98, 0.34, -1.4); makeWheel(g, 0.98, 0.34, -1.4);
  makeWheel(g, -0.98, 0.34, 1.4); makeWheel(g, 0.98, 0.34, 1.4);
  g.userData = { red, blue, rp, bp };
  return g;
}
function makeTaxi() {
  const g = makeWedgeCar(0xf7b500, {});
  const sign = box(0.7, 0.18, 0.4, std(0x111111, { emissive: 0xffd23f, emissiveIntensity: 0.8 }), 0, 1.42, 0.35, g);
  sign.material = std(0x111111);
  return g;
}
function makeSedan(color) { return makeWedgeCar(color, {}); }
function makeScooter() {
  const g = new THREE.Group();
  box(0.5, 0.35, 1.5, std(0xe0483e), 0, 0.45, 0, g);
  const w1 = cyl(0.26, 0.26, 0.12, std(0x14161a), 0, 0.26, -0.65, g, 10); w1.rotation.z = Math.PI / 2;
  const w2 = cyl(0.26, 0.26, 0.12, std(0x14161a), 0, 0.26, 0.65, g, 10); w2.rotation.z = Math.PI / 2;
  const rider = makeBlocky(0xffd23f, 0x2b3a55); rider.position.set(0, 0.6, 0.1); rider.scale.setScalar(0.9); g.add(rider);
  return g;
}

/* ---------- people ---------- */
function makeBlocky(shirt, pants) {
  const g = new THREE.Group();
  box(0.42, 0.5, 0.24, std(pants || 0x1c2733), -0.12, 0.25, 0, g);
  box(0.42, 0.5, 0.24, std(pants || 0x1c2733), 0.12, 0.25, 0, g);
  box(0.62, 0.72, 0.34, std(shirt), 0, 0.86, 0, g);
  box(0.16, 0.6, 0.16, std(shirt), -0.4, 0.86, 0, g);
  box(0.16, 0.6, 0.16, std(shirt), 0.4, 0.86, 0, g);
  const skin = std(0xc98d5f);
  const head = box(0.36, 0.36, 0.34, skin, 0, 1.42, 0, g);
  head.material = skin;
  box(0.38, 0.16, 0.36, std(0x14100c), 0, 1.62, 0, g); // hair cap
  return g;
}
function makeFootHero() {
  // BIG on-foot hero, seen from behind: bold orange shirt, blocky head + hair,
  // right arm out aiming a pistol, tracer + target ring added by main.
  const g = new THREE.Group();
  const orange = 0xff5a1f;
  box(0.46, 0.55, 0.26, std(0x1c2733), -0.13, 0.28, 0, g);
  box(0.46, 0.55, 0.26, std(0x1c2733), 0.13, 0.28, 0, g);
  box(0.68, 0.78, 0.36, std(orange), 0, 0.95, 0, g);
  box(0.18, 0.62, 0.18, std(orange), -0.44, 0.95, 0, g);
  // aiming arm: forward (-Z), slightly raised
  const arm = box(0.18, 0.18, 0.85, std(0xc98d5f), 0.3, 1.15, -0.45, g);
  arm.rotation.x = 0.12;
  box(0.12, 0.16, 0.5, std(0x14161a), 0.3, 1.18, -0.95, g); // pistol
  const head = box(0.4, 0.4, 0.38, std(0xc98d5f), 0, 1.58, 0, g);
  box(0.42, 0.18, 0.4, std(0x14100c), 0, 1.8, 0, g);
  box(0.42, 0.1, 0.1, std(0x14100c), 0, 1.66, -0.2, g); // hair back
  return g;
}
function makeEnemy() {
  const g = makeBlocky(0x232a35, 0x14181f);
  // red marker triangle above head
  const tri = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 4),
    new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
  tri.rotation.x = Math.PI; tri.position.set(0, 2.25, 0); g.add(tri);
  return g;
}

/* ---------- heli: WHITE fuselage, dark belly + cockpit, tail boom, 2 long blades ---------- */
function makeHeli() {
  const g = new THREE.Group();
  const white = std(0xf4f7f9, { metalness: 0.25, roughness: 0.35 });
  const dark = std(0x101c33, { metalness: 0.6, roughness: 0.25 });
  // fuselage: white rounded body
  const fus = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 1.6, 6, 12), white);
  fus.rotation.z = Math.PI / 2; fus.position.y = 0; g.add(fus);
  // dark belly
  const belly = box(1.1, 0.5, 2.2, dark, 0, -0.55, 0.1, g);
  belly.material = dark;
  // dark cockpit glass (front = -Z)
  const glass = box(1.15, 0.7, 0.9, std(0x050a14, { metalness: 0.95, roughness: 0.08 }), 0, 0.15, -1.15, g);
  glass.material = std(0x050a14, { metalness: 0.95, roughness: 0.08 });
  // tail boom + fin + tail rotor
  const boom = cyl(0.16, 0.22, 2.6, white, 0, 0.15, 2.3, g, 8); boom.rotation.x = Math.PI / 2;
  box(0.08, 0.9, 0.5, white, 0, 0.5, 3.5, g);
  const tr = new THREE.Group(); tr.position.set(0.2, 0.3, 3.55); g.add(tr);
  box(0.06, 0.9, 0.1, dark, 0, 0, 0, tr); box(0.9, 0.06, 0.1, dark, 0, 0, 0, tr);
  g.userData.tailRotor = tr;
  // skids
  cyl(0.06, 0.06, 2.2, dark, -0.6, -1.05, 0, g, 6).rotation.x = Math.PI / 2;
  cyl(0.06, 0.06, 2.2, dark, 0.6, -1.05, 0, g, 6).rotation.x = Math.PI / 2;
  // main rotor: 2 long blades + translucent disc
  const rotor = new THREE.Group(); rotor.position.y = 1.05; g.add(rotor);
  const bladeMat = std(0x14181f, { metalness: 0.5, roughness: 0.5 });
  box(7.2, 0.06, 0.34, bladeMat, 0, 0, 0, rotor);
  box(0.34, 0.06, 7.2, bladeMat, 0, 0, 0, rotor);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.7, 40),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.02; rotor.add(disc);
  g.userData.rotor = rotor;
  // spotlight cone (apex at heli, wide base on the road) + bright pool
  const cone = new THREE.Mesh(new THREE.ConeGeometry(4.2, 11.5, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfffbe8, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  cone.position.y = -5.75; g.add(cone); // apex at heli (0), base at road (-11.5)
  const pool = new THREE.Mesh(new THREE.CircleGeometry(4.0, 28),
    new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = -11.4; g.add(pool);
  g.userData.cone = cone; g.userData.pool = pool;
  return g;
}

/* ---------- palms: curved trunks leaning over the road, fan leaves ---------- */
function makePalm(lean) {
  const g = new THREE.Group();
  const trunkMat = std(0x8a6a4a, { roughness: 0.95 });
  // curved trunk: 4 stacked segments, each offset toward the road
  let x = 0, y = 0;
  for (let i = 0; i < 4; i++) {
    const seg = cyl(0.16 - i * 0.02, 0.2 - i * 0.02, 1.6, trunkMat, x, y + 0.8, 0, g, 7);
    seg.rotation.z = lean * 0.12;
    x += lean * 0.22; y += 1.55;
  }
  const crown = new THREE.Group(); crown.position.set(x, y + 0.3, 0); g.add(crown);
  const leafMat = std(0x2fae5f, { roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 8; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 4), leafMat);
    leaf.scale.set(1, 1, 0.18);
    const a = (i / 8) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.1, -0.25, Math.sin(a) * 1.1);
    leaf.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1 - 0.5);
    crown.add(leaf);
  }
  const nut = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), std(0x6b4a2a));
  nut.position.set(0, -0.15, 0); crown.add(nut);
  return g;
}

/* ---------- buildings / street ---------- */
function makeBuilding(w, h, d, tex, x, z, signTex) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.9 }));
  m.position.set(x, h / 2, z);
  W.city.add(m);
  // roof rim
  box(w + 0.3, 0.3, d + 0.3, std(0x2a2f3a), x, h + 0.1, z, W.city);
  if (signTex) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.6),
      new THREE.MeshBasicMaterial({ map: signTex }));
    s.position.set(x, h * 0.62, z + d / 2 + 0.06);
    s.rotation.y = 0; // +Z face: the face the chase camera sees
    W.city.add(s);
  }
  return m;
}
function makeFerrisWheel(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const legMat = std(0xe8e8e8, { metalness: 0.4, roughness: 0.5 });
  const l1 = box(0.4, 16, 0.4, legMat, -3, 8, 0, g); l1.rotation.z = 0.35;
  const l2 = box(0.4, 16, 0.4, legMat, 3, 8, 0, g); l2.rotation.z = -0.35;
  const wheel = new THREE.Group(); wheel.position.set(0, 15, 0); g.add(wheel);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(6.5, 0.28, 8, 32),
    new THREE.MeshStandardMaterial({ color: 0xff5a8a, emissive: 0xff2a6a, emissiveIntensity: 0.9 }));
  wheel.add(rim);
  for (let i = 0; i < 8; i++) {
    const sp = box(0.18, 13, 0.18, std(0xffd23f, { emissive: 0xffd23f, emissiveIntensity: 0.5 }), 0, 0, 0, wheel);
    sp.rotation.z = (i / 8) * Math.PI;
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    box(0.9, 0.9, 0.9, std([0xff5a3c, 0x2dd4bf, 0xffd23f, 0x38bdf8][i % 4], { emissive: 0xffffff, emissiveIntensity: 0.25 }),
      Math.cos(a) * 6.5, Math.sin(a) * 6.5, 0, wheel);
  }
  g.userData.wheel = wheel;
  W.city.add(g);
  return g;
}
function makeUmbrella(x, z, color) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  cyl(0.05, 0.05, 2.2, std(0xe8e8e8), 0, 1.1, 0, g, 6);
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.7, 8), std(color, { roughness: 0.8 }));
  top.position.y = 2.3; g.add(top);
  box(1.2, 0.08, 2.0, std(0xff8ab0), 0.9, 0.05, 0.6, g); // towel
  W.city.add(g);
  return g;
}
function makeFire(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const f1 = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.6, 8),
    new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff6a00, emissiveIntensity: 2.4, transparent: true, opacity: 0.92 }));
  f1.position.y = 1.3; g.add(f1);
  const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffc21a, emissiveIntensity: 3, transparent: true, opacity: 0.95 }));
  f2.position.y = 1.1; g.add(f2);
  const light = new THREE.PointLight(0xff7a1a, 60, 22, 1.6); light.position.y = 2; g.add(light);
  g.userData = { f1, f2, light };
  (W.footProps || W.city).add(g); W.fires.push(g);
  return g;
}

/* ---------- city build ---------- */
function buildCity() {
  W.city = new THREE.Group(); W.scene.add(W.city);
  // sky dome + sun
  const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }));
  sky.position.y = 0; W.scene.add(sky); W.skyDome = sky;
  W.sun = new THREE.Mesh(new THREE.CircleGeometry(14, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, fog: false }));
  W.sun.position.set(-40, 26, -330); W.sun.lookAt(0, 10, 0); W.scene.add(W.sun);
  // clouds: flat translucent ellipses
  for (let i = 0; i < 8; i++) {
    const cl = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe2c8, transparent: true, opacity: 0.35, fog: false }));
    cl.scale.set(18 + Math.random() * 14, 2.2, 7);
    cl.position.set(-120 + Math.random() * 260, 55 + Math.random() * 30, -160 - Math.random() * 120);
    W.scene.add(cl);
  }
  // ground: sand + grass + ocean
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(260, 560), std(0xe8c98f, { roughness: 1 }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(60, 0, -140); W.city.add(sand);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(160, 560),
    new THREE.MeshStandardMaterial({ color: 0x1a7a9e, roughness: 0.25, metalness: 0.3, emissive: 0x0a3a55, emissiveIntensity: 0.5 }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(150, -0.15, -140); W.city.add(ocean);
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(90, 560), std(0x5a8a4a, { roughness: 1 }));
  lawn.rotation.x = -Math.PI / 2; lawn.position.set(-60, 0.01, -140); W.city.add(lawn);
  // road: dark asphalt, runs along Z (kept light enough for the dusk luminance gate)
  const road = new THREE.Mesh(new THREE.PlaneGeometry(26, 560), std(0x4c5058, { roughness: 0.95 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, -140); W.city.add(road);
  // sidewalks
  [-16.5, 16.5].forEach(x => {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(7, 560), std(0xb9a98c, { roughness: 1 }));
    sw.rotation.x = -Math.PI / 2; sw.position.set(x, 0.03, -140); W.city.add(sw);
  });
  // centre double-yellow + edge lines + crosswalk
  for (let z = 120; z > -420; z -= 8) {
    box(0.35, 0.02, 4, std(0xffd23f, { emissive: 0xffd23f, emissiveIntensity: 0.25 }), -0.7, 0.05, z, W.city);
    box(0.35, 0.02, 4, std(0xffd23f, { emissive: 0xffd23f, emissiveIntensity: 0.25 }), 0.7, 0.05, z, W.city);
  }
  for (let i = 0; i < 10; i++) box(1.1, 0.02, 0.7, std(0xf2f5f7), -11 + i * 2.45, 0.05, -8, W.city);
  for (let i = 0; i < 10; i++) box(1.1, 0.02, 0.7, std(0xf2f5f7), -11 + i * 2.45, 0.05, -58, W.city);
  // buildings west (left) + east (right, behind beach strip)
  const texA = windowTexture('#7a6a8a', 0.55), texB = windowTexture('#8a7a5a', 0.6),
        texC = windowTexture('#5a7a8a', 0.5), texD = windowTexture('#9a8a6a', 0.65);
  const spots = [
    [-36, 18, 24, texA, -10, 'MANGO & RYE', '#1c4a6e', '#ffd23f', null],
    [-37, 13, 20, texB, -46, null], [-36, 22, 24, texC, -84, 'HOTEL SERIWA', '#123a5c', '#ffffff', null],
    [-37, 12, 18, texD, -122, null], [-36, 16, 22, texA, -160, 'MALIN SUITES', '#5c1a3a', '#ffd98a', null],
    [-37, 20, 24, texB, -200, null], [-36, 12, 18, texC, -240, 'LAGUNA RASI', '#0e2a4a', '#ff8ab0', null],
    [38, 14, 20, texB, -90, null], [39, 19, 22, texC, -130, 'PIER PALACE', '#123a5c', '#ffffff', null],
    [38, 12, 18, texD, -170, null], [39, 24, 22, texA, -210, null],
    [38, 16, 20, texB, -250, 'BODEGA', '#7a4a12', '#ffd23f', null],
    [38, 12, 18, texC, -290, null],
  ];
  spots.forEach(s => makeBuilding(s[1], s[2] === undefined ? 20 : s[2], 26, s[3], s[0], s[4],
    s[5] ? signTexture(s[5], s[6], s[7]) : null));
  // palms: rows along both sidewalks, leaning over the road
  for (let z = 26; z > -260; z -= 13) {
    const pL = makePalm(1); pL.position.set(-15.2, 0, z); W.city.add(pL); W.palms.push(pL);
    const pR = makePalm(-1); pR.position.set(15.2, 0, z + 6); W.city.add(pR); W.palms.push(pR);
  }
  // beach props: umbrellas + ferris wheel on the open sand east of the road,
  // placed down-road so they sit inside the chase camera's frame
  makeUmbrella(30, -48, 0xff5a8a); makeUmbrella(33, -62, 0x2dd4bf); makeUmbrella(30, -78, 0xffd23f);
  makeUmbrella(34, -92, 0xff5a3c); makeUmbrella(31, -108, 0x38bdf8);
  W.ferris = makeFerrisWheel(34, -60);
  // market stalls (foot scene): striped awnings
  [[-9, -14, 0xff5a3c], [9.5, -18, 0x2dd4bf], [-9, -30, 0xffd23f], [9.5, -34, 0xff8ab0]].forEach(s => {
    const g = new THREE.Group(); g.position.set(s[0], 0, s[1]); W.city.add(g);
    box(3.4, 0.15, 2.4, std(s[2]), 0, 2.3, 0, g);
    box(3.0, 1.0, 2.0, std(0x6b4a2a), 0, 1.0, 0, g);
    box(0.5, 0.5, 0.5, std(0xff8a3c), -0.7, 1.7, 0, g); box(0.5, 0.5, 0.5, std(0x7ac74f), 0.7, 1.7, 0, g);
  });
  // pedestrians on sidewalks
  const shirts = [0xff5a3c, 0x2dd4bf, 0xffd23f, 0xa855f7, 0x38bdf8, 0xff8ab0, 0x7ac74f];
  for (let i = 0; i < 16; i++) {
    const p = makeBlocky(shirts[i % shirts.length], 0x2b3a55);
    const side = i % 2 ? -1 : 1;
    p.position.set(side * (14 + Math.random() * 3), 0, 10 - i * 17 - Math.random() * 6);
    p.rotation.y = Math.random() * Math.PI * 2;
    W.city.add(p); W.peds.push(p);
  }
}

/* ---------- vehicles in the world ---------- */
function placeTraffic() {
  const defs = [
    { make: makeTaxi, x: -6.5, z: -14 }, { make: () => makeSedan(0xe8e8e8), x: 5.5, z: -20 },
    { make: makeTaxi, x: -6.5, z: -26 }, { make: () => makeSedan(0x38bdf8), x: 5.5, z: -34 },
    { make: () => makeSedan(0xe8e8e8), x: -5.5, z: -44 }, { make: makeTaxi, x: 6.5, z: -52 },
    { make: () => makeSedan(0x7ac74f), x: -6.5, z: -66 }, { make: () => makeSedan(0xf2f5f7), x: 5.5, z: -80 },
    { make: makeScooter, x: 8.5, z: -16 },
  ];
  defs.forEach(d => {
    const v = d.make(); v.position.set(d.x, 0, d.z); v.rotation.y = 0; // driving away: rear to camera
    W.city.add(v); W.traffic.push({ g: v, lane: d.x, speed: 6 + Math.random() * 5, baseZ: d.z });
  });
}
function placePolice() {
  const defs = [{ x: -5.2, z: -13 }, { x: 5.6, z: -17 }, { x: -2.5, z: -34 }];
  defs.forEach(d => {
    const p = makePoliceCar(); p.position.set(d.x, 0, d.z); p.rotation.y = 0; // driving away: rear to camera
    W.city.add(p); W.police.push(p);
  });
}
function placeHeli() {
  W.heli = makeHeli();
  W.heli.scale.setScalar(1.3);
  W.heli.position.set(4.5, 11.5, -24);
  W.city.add(W.heli);
  W.rotor = W.heli.userData.rotor;
}
function placeFootScene() {
  // Everything on-foot only: kept in one group, hidden during the chase.
  W.footProps = new THREE.Group(); W.scene.add(W.footProps);
  W.footChar = makeFootHero();
  W.footChar.position.set(-0.3, 0, 2);
  W.footProps.add(W.footChar);
  // tracer: a bright cylinder from the gun muzzle to the target (a 1px Line is invisible)
  W.tracer = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 6),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.95 }));
  W.footProps.add(W.tracer);
  W.targetRing = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 24),
    new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }));
  W.targetRing.position.set(2.2, 1.4, -17); W.footProps.add(W.targetRing);
  // enemies ahead
  [[-1.5, -13], [2.2, -17], [-3.4, -21]].forEach(e => {
    const en = makeEnemy(); en.position.set(e[0], 0, e[1]); en.userData.isFoe = true; W.footProps.add(en);
  });
  // downed enemy
  const down = makeBlocky(0xff8a3c, 0x2b3a55); down.rotation.z = Math.PI / 2; down.rotation.y = 0.6;
  down.position.set(3.2, 0.25, -10); W.footProps.add(down);
  // burning police car ahead-left + taxi right
  const burn = makePoliceCar(); burn.position.set(-3.2, 0, -13.5); burn.rotation.y = Math.PI * 0.85; W.footProps.add(burn);
  makeFire(-3.2, -13.5);
  const taxi = makeTaxi(); taxi.position.set(6.8, 0, -9); taxi.rotation.y = Math.PI * 1.08; W.footProps.add(taxi);
  W.footProps.visible = false;
}

/* ---------- garage ---------- */
function buildGarage() {
  W.garage = new THREE.Group(); W.scene.add(W.garage);
  const wood = std(0x7a4a22, { roughness: 0.95 });
  const woodDark = std(0x5a3416, { roughness: 0.95 });
  // floor + wooden walls + ceiling (closed box: no sky leaks in)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 20), std(0x5a5548, { roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 0); W.garage.add(floor);
  const back = box(26, 10, 0.4, wood, 0, 5, -8, W.garage);
  for (let x = -12; x <= 12; x += 2) box(0.25, 10, 0.1, woodDark, x, 5, -7.78, W.garage);
  box(0.4, 10, 20, wood, -13, 5, 0, W.garage);
  box(0.4, 10, 20, wood, 13, 5, 0, W.garage);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(26, 20), std(0x4a3a26, { roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 9.8, 0); W.garage.add(ceil);
  const front = box(26, 10, 0.4, woodDark, 0, 5, 10, W.garage);
  // (no 3D sign: the DOM header already names the garage, and a wall sign fights it)
  // turntable + hazard ring
  const tt = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.25, 32), std(0x2a2f3a, { metalness: 0.4, roughness: 0.5 }));
  tt.position.set(0, 0.12, 0); W.garage.add(tt);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.5, 4.1, 48),
    new THREE.MeshBasicMaterial({ map: hazardTexture(), transparent: false }));
  ring.material.map.wrapS = THREE.RepeatWrapping; ring.material.map.repeat.set(6, 1);
  ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.26, 0); W.garage.add(ring);
  // 4-post lift (posts at the turntable corners, clear of the camera's line to the car)
  [[-4.6, -3.0], [4.6, -3.0], [-4.6, 3.0], [4.6, 3.0]].forEach(p => {
    box(0.45, 3.4, 0.45, std(0xffd23f, { roughness: 0.6 }), p[0], 1.7, p[1], W.garage);
    box(0.7, 0.18, 0.7, std(0x1a1d22), p[0], 3.45, p[1], W.garage);
  });
  // hero car on the turntable, headlights ON, facing front-left
  const car = makeWedgeCar(0xe8361f, { headlightBeams: true });
  car.scale.setScalar(1.35);
  car.position.set(0, 0.25, 0); car.rotation.y = 0.6; // front-left 3/4: headlights face the camera
  W.garage.add(car); W.garageCar = car;
  // crates, barrels, tyre stack, tool wall
  box(1.2, 1.2, 1.2, std(0x2dd4bf), -8.5, 0.6, -5.5, W.garage);
  box(1.0, 1.0, 1.0, std(0xff5a3c), -7.2, 0.5, -5.8, W.garage);
  box(1.2, 1.2, 1.2, std(0x38bdf8), -7.9, 1.8, -5.6, W.garage);
  cyl(0.55, 0.55, 1.4, std(0x374151, { metalness: 0.5, roughness: 0.5 }), 8.8, 0.7, -5.5, W.garage, 12);
  cyl(0.55, 0.55, 1.4, std(0x9a3412), 10.1, 0.7, -5.2, W.garage, 12);
  for (let i = 0; i < 3; i++) { const t = cyl(0.62, 0.62, 0.3, std(0x14161a), 9.4, 0.15 + i * 0.32, -2.5, W.garage, 14); }
  // warm work lights (legacy-light intensities: keep small or the room blows out)
  const l1 = new THREE.PointLight(0xffd9a0, 1.6, 26, 1.5); l1.position.set(-4, 6, 2); W.garage.add(l1);
  const l2 = new THREE.PointLight(0xfff2c8, 1.2, 24, 1.5); l2.position.set(5, 6, -3); W.garage.add(l2);
  W.garage.visible = false;
}

/* ---------- boot / per-frame ---------- */
function initWorld(canvas) {
  W.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  W.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  W.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  W.renderer.toneMappingExposure = 1.5;
  W.renderer.outputColorSpace = THREE.SRGBColorSpace;
  W.scene = new THREE.Scene();
  W.scene.fog = new THREE.Fog(0xd98a6a, 60, 320);
  W.camera = new THREE.PerspectiveCamera(55, 1024 / 576, 0.1, 900);
  W.hemi = new THREE.HemisphereLight(0xffd9b0, 0x4a3a30, 1.3);
  W.scene.add(W.hemi);
  const sun = new THREE.DirectionalLight(0xffb347, 1.8);
  sun.position.set(-60, 38, 60); W.scene.add(sun);
  W.sunLight = sun;
  const fill = new THREE.DirectionalLight(0x7a6ae8, 0.5);
  fill.position.set(40, 30, -40); W.scene.add(fill);
  buildCity();
  placeTraffic(); placePolice(); placeHeli(); placeFootScene();
  buildGarage();
  // hero car
  W.heroCar = makeWedgeCar(0xe8361f, { headlightBeams: false });
  W.heroCar.position.set(0, 0, 0);
  W.city.add(W.heroCar);
  W.hero = { x: 0, z: 0, heading: 0, speed: 0, targetSpeed: 0 };
  resize();
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  W.renderer.setSize(w, h, false);
  W.camera.aspect = w / h; W.camera.updateProjectionMatrix();
}
function setMode(mode) {
  W.mode = mode;
  const garageOn = mode === 'garage';
  W.garage.visible = garageOn;
  W.city.visible = !garageOn;
  if (W.footProps) W.footProps.visible = false; // foot props only in foot state; main.js re-shows them
  W.scene.fog = garageOn ? null : new THREE.Fog(0xd98a6a, 60, 320);
  // dim the harsh dusk sun inside the garage so the room does not blow out
  if (W.hemi) W.hemi.intensity = garageOn ? 0.45 : 1.3;
  if (W.sunLight) W.sunLight.intensity = garageOn ? 0.35 : 1.8;
  W.skyDome.visible = !garageOn;
  if (W.sun) W.sun.visible = !garageOn;
}
function updateWorld(dt) {
  W.time += dt;
  const t = W.time;
  if (W.rotor) W.rotor.rotation.y = t * 22;
  if (W.heli && W.heli.userData.tailRotor) W.heli.userData.tailRotor.rotation.z = t * 30;
  if (W.heli) { W.heli.position.y = 11.5 + Math.sin(t * 0.9) * 0.35; W.heli.rotation.z = Math.sin(t * 0.7) * 0.02; }
  if (W.ferris && W.ferris.userData.wheel) W.ferris.userData.wheel.rotation.z = t * 0.12;
  // police light bars flash (alternate red/blue)
  const on = Math.sin(t * 9) > 0;
  W.police.forEach(p => {
    const u = p.userData;
    u.red.material.emissiveIntensity = on ? 3.2 : 0.25;
    u.blue.material.emissiveIntensity = on ? 0.25 : 3.2;
    u.rp.material.opacity = on ? 0.34 : 0.08;
    u.bp.material.opacity = on ? 0.08 : 0.34;
  });
  // fires flicker
  W.fires.forEach(f => {
    const s = 0.9 + Math.sin(t * 13 + f.position.x) * 0.18;
    f.userData.f1.scale.set(s, s * (1 + Math.sin(t * 17) * 0.12), s);
    f.userData.light.intensity = 55 + Math.sin(t * 15) * 14;
  });
  // traffic rolls forward (away from camera, -Z) and wraps
  if (!W.frozen) {
    W.traffic.forEach(v => {
      if (v.speed === 0) return;
      v.g.position.z -= v.speed * dt;
      v.g.position.x = v.lane + Math.sin(t * 0.5 + v.baseZ) * 0.25;
      if (v.g.position.z < -260) v.g.position.z = 30;
    });
    W.peds.forEach((p, i) => { p.position.z -= Math.sin(t * 0.4 + i) * 0.15 * dt * 10; p.position.y = Math.abs(Math.sin(t * 3 + i)) * 0.05; });
  }
  // tracer: stretch the cylinder from the gun muzzle to the target ring
  if (W.tracer && W.footChar) {
    const a = new THREE.Vector3(W.footChar.position.x + 0.3, 1.18, W.footChar.position.z - 1.0);
    const b = new THREE.Vector3(W.targetRing.position.x, W.targetRing.position.y, W.targetRing.position.z);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a); const len = dir.length();
    W.tracer.position.copy(mid);
    W.tracer.scale.set(1, len, 1);
    W.tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    W.tracer.material.opacity = 0.75 + Math.sin(t * 20) * 0.2;
    W.targetRing.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
  }
}
/* Expose the world functions on W for main.js / hud.js. */
W.setMode = setMode;
W.resize = resize;
W.probeLuminance = probeLuminance;
W.initWorld = initWorld;
W.updateWorld = updateWorld;
function probeLuminance() {
  W.renderer.render(W.scene, W.camera);
  const gl = W.renderer.getContext();
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const px = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let s709 = 0, s601 = 0, n = 0;
  for (let i = 0; i < px.length; i += 16) {
    const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
    s709 += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    s601 += 0.299 * r + 0.587 * g + 0.114 * b;
    n++;
  }
  return { rec709: s709 / n, rec601: s601 / n, w, h };
}
