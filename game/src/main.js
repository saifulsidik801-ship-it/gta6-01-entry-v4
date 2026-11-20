/* MARISOL BAY — main.js (fresh build, v4): boot, states, cameras, input, loop. */
'use strict';

window.__errors = [];
window.addEventListener('error', e => { window.__errors.push(String(e.message || e.error)); });
const _cerr = console.error.bind(console);
console.error = (...a) => { window.__errors.push(a.map(String).join(' ')); _cerr(...a); };

const GAME = {
  state: 'title', keys: {}, frozenShot: false, missionT: 149, shot: null,
  camYaw: 0, dragX: null, enemiesDown: 0,
};
window.GAME = GAME;

const params = new URLSearchParams(location.search);
GAME.shot = params.get('shot');
const SEED = parseInt(params.get('seed') || '1', 10);

function show(id, on) { document.getElementById(id).classList.toggle('hidden', !on); }
function setState(s) {
  GAME.state = s;
  show('hud', s === 'drive' || s === 'foot');
  show('title', s === 'title');
  show('mapscreen', s === 'map');
  show('garage', s === 'garage');
  show('crosshair', s === 'foot');
  show('prompt', s === 'foot');
  if (s === 'map') { drawMap(); }
  if (s === 'garage') { W.setMode('garage'); } else { W.setMode('city'); }
  if (W.footProps) W.footProps.visible = (s === 'foot');
  if (s === 'drive') { H.speed = 123; }
  if (s === 'foot') { H.speed = 0; $('speedNum').textContent = '0'; $('carName').textContent = 'ON FOOT'; }
  if (s === 'drive') { $('carName').textContent = 'KITE COUPE'; }
}
GAME.toDrive = () => setState('drive');
GAME.toTitle = () => setState('title');
GAME.toMap = () => setState('map');
GAME.toGarage = () => setState('garage');
GAME.toFoot = () => setState('foot');

/* ---------- cameras ---------- */
function camDrive(dt) {
  const h = W.hero;
  const bx = Math.sin(h.heading), bz = Math.cos(h.heading);
  // chase camera: behind + right of the car, low — 3/4 rear view
  const cx = h.x + bx * 7.4 - Math.cos(h.heading) * 2.6;
  const cz = h.z + bz * 7.4 + Math.sin(h.heading) * 2.6;
  W.camera.position.set(cx, 2.6, cz);
  W.camera.lookAt(h.x - bx * 9, 1.1, h.z - bz * 9);
}
function camFoot() {
  const c = W.footChar.position;
  const yaw = GAME.camYaw;
  // camera right of the hero: we see the aiming (right) arm + the tracer to the target
  W.camera.position.set(c.x + Math.sin(yaw) * 0.6 + 1.2, 2.0, c.z + 5.4);
  W.camera.lookAt(c.x + Math.sin(yaw) * 2 - 0.8, 1.2, c.z - 12);
}
function camGarage() {
  // side-front angle: the four lift posts split to the frame edges, car clear in the middle
  W.camera.position.set(-7.5, 2.4, 1.5);
  W.camera.lookAt(-0.5, 0.9, 0);
}
function camTitle(t) {
  W.camera.position.set(16 + Math.sin(t * 0.05) * 4, 9, 34);
  W.camera.lookAt(-2, 7, -70);
}
function camCover() {
  // staged cover framing: hero bottom-centre-right (~30% frame width), heli top-centre-right, road ahead full
  W.camera.position.set(-2.0, 2.9, 9.8);
  W.camera.lookAt(0.8, 0.9, -14);
}

/* ---------- drive / foot update ---------- */
function updateDrive(dt) {
  const h = W.hero, k = GAME.keys;
  if (!GAME.frozenShot) {
    if (k['KeyW'] || k['ArrowUp']) h.targetSpeed = 118;
    else if (k['KeyS'] || k['ArrowDown']) h.targetSpeed = -14;
    else h.targetSpeed = h.speed > 0 ? 26 : 0;
    h.speed += (h.targetSpeed - h.speed) * Math.min(1, dt * 2.0);
    if (k['KeyA'] || k['ArrowLeft']) h.heading += dt * (0.7 + Math.abs(h.speed) * 0.004);
    if (k['KeyD'] || k['ArrowRight']) h.heading -= dt * (0.7 + Math.abs(h.speed) * 0.004);
    const v = h.speed * 0.09 * dt; // km/h -> world units (hero.speed IS km/h)
    h.z -= Math.cos(h.heading) * v;
    h.x -= Math.sin(h.heading) * v;
    h.x = Math.max(-10.5, Math.min(10.5, h.x));
    if (h.z < -250) { h.z = -250; h.speed *= 0.4; }
    if (h.z > 24) { h.z = 24; h.speed *= 0.4; }
    H.speed = Math.max(0, Math.abs(h.speed));
    // mission timer
    GAME.missionT -= dt;
    if (GAME.missionT <= 0) {
      GAME.missionT = 149; H.money += 2500; H.wanted = Math.max(1, H.wanted - 2);
      toast('MISSION COMPLETE — The patrol lost you · +$2,500'); renderVitals();
      setMission('MISSION 4 · MARKET SQUEEZE', 'CLEAR THE AISLES', 'Take out the Kerono Boys 1/5', '2/3', 'Melt away before the patrol arrives', '2:29');
    }
    $('mTimer').textContent = Math.floor(GAME.missionT / 60) + ':' + String(Math.floor(GAME.missionT % 60)).padStart(2, '0');
    // police pursuit: ease toward flanking points around the hero
    W.police.forEach((p, i) => {
      const offs = [[-5.2, 9], [5.6, 7], [-2.5, 16]][i % 3];
      const tx = h.x + offs[0] * 0.4, tz = h.z + offs[1];
      p.position.x += (tx - p.position.x) * Math.min(1, dt * 0.8);
      p.position.z += (tz - p.position.z) * Math.min(1, dt * 0.8);
      p.rotation.y = 0; // driving away from the chase camera: we see their rears
    });
    // heli tracks the hero
    if (W.heli) { W.heli.position.x += (h.x + 4.5 - W.heli.position.x) * Math.min(1, dt * 0.7); W.heli.position.z += (h.z - 24 - W.heli.position.z) * Math.min(1, dt * 0.7); }
    // traffic collision: slow + condition loss
    W.traffic.forEach(v => {
      const dx = v.g.position.x - h.x, dz = v.g.position.z - h.z;
      if (Math.abs(dx) < 2.2 && Math.abs(dz) < 4.5 && v.speed > 0) {
        h.speed *= 0.55; H.condition = Math.max(12, H.condition - 1); renderVitals();
      }
    });
  }
  W.heroCar.position.set(h.x, 0, h.z);
  W.heroCar.rotation.y = h.heading; // model front is -Z: rotation 0 = rear to the chase camera
  renderVitals();
}
function updateFoot(dt) {
  const k = GAME.keys, c = W.footChar;
  if (!GAME.frozenShot) {
    let mx = 0, mz = 0;
    if (k['KeyW'] || k['ArrowUp']) mz -= 1;
    if (k['KeyS'] || k['ArrowDown']) mz += 1;
    if (k['KeyA'] || k['ArrowLeft']) mx -= 1;
    if (k['KeyD'] || k['ArrowRight']) mx += 1;
    if (mx || mz) {
      const s = 3.4 * dt;
      c.position.x = Math.max(-11, Math.min(11, c.position.x + mx * s));
      c.position.z = Math.max(-24, Math.min(8, c.position.z + mz * s));
      c.position.y = Math.abs(Math.sin(W.time * 9)) * 0.06;
    }
  }
  $('speedNum').textContent = '0';
}
function shoot() {
  if (GAME.state !== 'foot') return;
  // tracer flash + hit the nearest enemy roughly ahead
  W.tracer.material.opacity = 1;
  const c = W.footChar.position;
  const foes = [];
  let best = null, bd = 1e9;
  W.footProps.traverse(o => { if (o.userData && o.userData.isFoe) foes.push(o); });
  foes.forEach(f => {
    const d = Math.hypot(f.position.x - c.x, f.position.z - c.z);
    if (f.position.z < c.z && d < bd) { bd = d; best = f; }
  });
  if (best && bd < 26) {
    best.rotation.z = Math.PI / 2; best.position.y = 0.25;
    best.userData.isFoe = false; GAME.enemiesDown++;
    H.money += 150; renderVitals();
    toast('Target down · +$150  (' + GAME.enemiesDown + '/7)');
    if (GAME.enemiesDown >= 3) setMission('MISSION 4 · MARKET SQUEEZE', 'CLEAR THE AISLES', 'Take out the Kerono Boys ' + GAME.enemiesDown + '/7', '2/3', 'Melt away before the patrol arrives', '2:29');
  }
}

/* ---------- input ---------- */
function bindInput() {
  window.addEventListener('keydown', e => {
    GAME.keys[e.code] = true;
    if (e.code === 'KeyM') setState(GAME.state === 'map' ? 'drive' : 'map');
    if (e.code === 'KeyG') setState(GAME.state === 'garage' ? 'drive' : 'garage');
    if (e.code === 'Escape') {
      if (GAME.state === 'map' || GAME.state === 'garage') setState('drive');
      else if (GAME.state === 'drive' || GAME.state === 'foot') setState('map');
    }
    if (e.code === 'KeyF') {
      if (GAME.state === 'drive') { setState('foot'); setDialogue('KIKI · CREW · LOOKOUT', '“Two down the left aisle! I have got the stall side, Milo.”'); }
      else if (GAME.state === 'foot') { setState('drive'); }
    }
    if (e.code === 'Enter' && GAME.state === 'title') setState('drive');
    if (/^Digit[1-6]$/.test(e.code)) {
      const i = parseInt(e.code.slice(5), 10) - 1;
      H.weapons.forEach((w, j) => { w.on = j === i && !w.locked; });
      renderWeapons();
    }
  });
  window.addEventListener('keyup', e => { GAME.keys[e.code] = false; });
  const cv = document.getElementById('game');
  cv.addEventListener('mousedown', e => {
    if (GAME.state === 'foot') { GAME.dragX = e.clientX; shoot(); }
    else if (GAME.state === 'title') { /* let buttons handle it */ }
  });
  cv.addEventListener('mousemove', e => {
    if (GAME.dragX !== null && GAME.state === 'foot') {
      GAME.camYaw += (e.clientX - GAME.dragX) * 0.004;
      GAME.dragX = e.clientX;
    }
  });
  window.addEventListener('mouseup', () => { GAME.dragX = null; });
  window.addEventListener('resize', () => W.resize());
}

/* ---------- shot staging ---------- */
function stageShot() {
  const s = GAME.shot;
  if (!s) { setState('title'); return; }
  GAME.frozenShot = true;
  W.frozen = true;
  if (s === 'cover') {
    setState('drive');
    W.hero.x = 0; W.hero.z = 0; W.hero.heading = 0; W.hero.speed = 34;
    H.speed = 123; H.money = 18450; H.wanted = 4; H.health = 76; H.armour = 58; H.condition = 84;
    setMission('MISSION 3 · DOWNTOWN HEAT', 'LOSE THE PATROL', 'Lose the patrol on the downtown streets', '3/4', 'Vanish through the Lantern Mile alleys', '2:29');
    setBanner('IN SIGHT', 'Air One has you in the light');
    setDialogue('MIRA KESANG · CREW · DRIVER', '“Four units on your tail, Milo — lose them through the towers, do not stop for anything.”');
    // stage the world for the cover frame
    W.heli.position.set(4.5, 11.5, -24);
    W.police[0].position.set(-5.2, 0, -13); W.police[1].position.set(5.6, 0, -17); W.police[2].position.set(-2.5, 0, -34);
    W.traffic[0].g.position.set(-6.5, 0, -14); W.traffic[1].g.position.set(5.5, 0, -20);
    W.traffic[2].g.position.set(-6.5, 0, -26); W.traffic[3].g.position.set(5.5, 0, -34);
    W.traffic[4].g.position.set(-5.5, 0, -44); W.traffic[5].g.position.set(6.5, 0, -52);
    W.traffic[6].g.position.set(-6.5, 0, -66); W.traffic[7].g.position.set(5.5, 0, -80);
    W.traffic[8].g.position.set(8.5, 0, -16);
    W.heroCar.position.set(0, 0, 0); W.heroCar.rotation.y = 0.28; // 3/4 rear view
    renderVitals();
  } else if (s === 'foot') {
    setState('foot');
    H.money = 7270; H.wanted = 2; H.health = 95; H.armour = 27;
    setMission('MISSION 4 · MARKET SQUEEZE', 'CLEAR THE AISLES', 'Clear the Kerono crew from the market', '2/3', 'Melt away before the patrol arrives', '2:29');
    setBanner('SEARCHING', 'Search zone 31 m · clear in 11 s');
    setDialogue('KIKI · CREW · LOOKOUT', '“Two down the left aisle! I have got the stall side, Milo.”');
    W.footChar.position.set(-0.3, 0, 2);
    renderVitals();
  } else if (s === 'map') {
    setState('map');
    H.money = 18450;
    renderVitals();
  } else if (s === 'garage') {
    setState('garage');
    H.money = 18450;
    renderVitals();
  }
}

/* ---------- boot + loop ---------- */
function boot() {
  initWorld(document.getElementById('game'));
  initHUD();
  bindInput();
  stageShot();
  const clock = { last: performance.now() };
  function frame(now) {
    const dt = Math.min(0.05, (now - clock.last) / 1000 || 0.016);
    clock.last = now;
    updateWorld(dt);
    if (GAME.state === 'drive') { if (!GAME.frozenShot) { updateDrive(dt); camDrive(dt); } else { W.heroCar.position.set(W.hero.x, 0, W.hero.z); camCover(); } }
    else if (GAME.state === 'foot') { updateFoot(dt); camFoot(); }
    else if (GAME.state === 'garage') { camGarage(); }
    else if (GAME.state === 'title') { camTitle(W.time); }
    else if (GAME.state === 'map') { camCover(); }
    if (GAME.state === 'drive' || GAME.state === 'foot') drawMinimap();
    W.renderer.render(W.scene, W.camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // ready flag for the screenshot / playtest harness
  setTimeout(() => { window.__gameReady = true; document.title = 'MARISOL BAY · ready'; }, 600);
  window.__luminance = () => W.probeLuminance();
  window.__state = () => GAME.state;
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
