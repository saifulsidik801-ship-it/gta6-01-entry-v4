/* MARISOL BAY — hud.js (fresh build, v4): DOM HUD, minimap, pause map, garage panel. */
'use strict';

const H = {
  money: 18450, wanted: 4, health: 76, armour: 58, condition: 84,
  speed: 123, clock: '18:45', district: 'MARINA ROW', street: 'Shoreline Ave',
  waypoint: null, selectedUpgrade: 'ARMOUR PLATING',
  dispatch: [
    { name: 'HELI 1', role: 'SPOTLIGHT', dist: '26 m', tag: 'blue' },
    { name: 'KITE-1', role: 'RAMMING', dist: '7 m', tag: 'orange' },
    { name: 'MARLIN-3', role: 'PURSUIT', dist: '10 m', tag: 'yellow' },
    { name: 'CORAL-85', role: 'CLOSING', dist: '30 m', tag: 'orange' },
    { name: 'CORAL-48', role: 'FLANKING', dist: '128 m', tag: 'yellow' },
  ],
  weapons: [
    { k: '1', n: 'FISTS', a: '∞', on: false }, { k: '2', n: 'P9', a: '12', on: false },
    { k: '3', n: 'SMG', a: '30/60', on: true }, { k: '4', n: '12G', a: '18', on: false },
    { k: '5', n: 'AR-9', a: 'LOCKED', on: false, locked: true }, { k: '6', n: 'RPG', a: 'LOCKED', on: false, locked: true },
  ],
  upgrades: [
    { ico: 'FIX', name: 'FULL REPAIR', desc: 'Restore condition to 100%.', price: '$250', state: 'buy' },
    { ico: '🎨', name: 'RESPRAY', desc: 'Change paint (pick a colour).', price: '$400', state: 'buy' },
    { ico: '+12%', name: 'STAGE 2 TUNE', desc: 'Top speed +12%.', price: '', state: 'OWNED' },
    { ico: 'PLATE', name: 'ARMOUR PLATING', desc: 'Every car you drive takes half damage from crashes, bullets and blasts.', price: '$3,600', state: 'buy' },
    { ico: 'N2O', name: 'NITRO KIT', desc: 'Boost for 3 seconds.', price: '', state: 'LOCKED · LV 6' },
    { ico: 'SUSP', name: 'SUSPENSION', desc: 'Handling +15%.', price: '$700', state: 'buy' },
  ],
  gear: [
    { name: 'RATTLER SMG', state: 'OWNED' }, { name: 'TIDEBREAKER', state: 'OWNED' },
    { name: 'HARRIER LR', state: '$6,800' }, { name: 'FLARE CHARGES X3', state: '$600' },
    { name: 'AMMO, ALL GUNS', state: '$200' }, { name: 'BODY ARMOUR', state: '$350' },
  ],
};

const $ = id => document.getElementById(id);
function moneyFmt(n) { return '$' + n.toLocaleString('en-US'); }

function renderDispatch() {
  $('dispatchRows').innerHTML = H.dispatch.map(d =>
    `<div class="dr"><b>${d.name}</b><span class="tag ${d.tag}">${d.role}</span><span class="dist">${d.dist}</span></div>`).join('');
}
function renderWeapons() {
  $('weapons').innerHTML = H.weapons.map(w =>
    `<div class="wslot ${w.on ? 'on' : ''} ${w.locked ? 'locked' : ''}"><div class="wk">${w.k}</div><div class="wn">${w.n}</div><div class="wa">${w.a}</div></div>`).join('');
}
function renderVitals() {
  $('hpFill').style.width = H.health + '%'; $('hpNum').textContent = H.health;
  $('arFill').style.width = H.armour + '%'; $('arNum').textContent = H.armour;
  $('condFill').style.width = H.condition + '%'; $('condNum').textContent = H.condition + '%';
  $('money').textContent = moneyFmt(H.money);
  $('speedNum').textContent = Math.round(H.speed);
  $('clock').textContent = H.clock;
  $('stars').innerHTML = '★'.repeat(H.wanted) + '<span class="dim">' + '★'.repeat(5 - H.wanted) + '</span>';
}
function setBanner(text, sub) {
  $('banner').textContent = text; $('banner').classList.remove('hidden');
  if (sub) { $('subbanner').textContent = sub; $('subbanner').classList.remove('hidden'); }
  else $('subbanner').classList.add('hidden');
}
function setMission(tag, title, sub, stage, next, timer) {
  $('mTag').textContent = tag; $('mTitle').textContent = title; $('mSub').textContent = sub;
  $('mStage').textContent = stage; $('mNext').textContent = next; $('mTimer').textContent = timer;
}
function setDialogue(name, text) { $('dlgName').textContent = name; $('dlgText').textContent = text; }
function toast(text) {
  const t = $('toast'); t.textContent = text; t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2600);
}

/* ---------- minimap ---------- */
function drawMinimap() {
  const c = $('minimap'); if (!c) return;
  const g = c.getContext('2d'); const S = 220;
  g.fillStyle = '#0e2a3a'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#e8c98f'; g.fillRect(S * 0.62, 0, S * 0.38, S); // beach
  g.fillStyle = '#1a7a9e'; g.fillRect(S * 0.86, 0, S * 0.14, S); // ocean
  g.fillStyle = '#3a4a5a';
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) g.fillRect(8 + i * 34, 8 + j * 48, 28, 40);
  g.strokeStyle = '#d8dee6'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(S * 0.5, 0); g.lineTo(S * 0.5, S); g.stroke(); // main avenue
  g.lineWidth = 2;
  for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(0, i * 44); g.lineTo(S * 0.62, i * 44); g.stroke(); }
  // police dots
  g.fillStyle = '#38bdf8';
  [[0.44, 0.3], [0.56, 0.42], [0.5, 0.62]].forEach(p => { g.beginPath(); g.arc(p[0] * S, p[1] * S, 4, 0, 7); g.fill(); });
  // hero arrow
  const hx = S * 0.5, hy = S * 0.78;
  g.fillStyle = '#ffd23f'; g.beginPath();
  g.moveTo(hx, hy - 9); g.lineTo(hx + 7, hy + 7); g.lineTo(hx - 7, hy + 7); g.closePath(); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
  // waypoint
  if (H.waypoint) {
    g.fillStyle = '#ff5a3c'; g.beginPath(); g.arc(H.waypoint.x * S, H.waypoint.y * S, 5, 0, 7); g.fill();
    g.strokeStyle = '#ff5a3c'; g.setLineDash([4, 3]);
    g.beginPath(); g.moveTo(hx, hy); g.lineTo(H.waypoint.x * S, H.waypoint.y * S); g.stroke(); g.setLineDash([]);
  }
  g.fillStyle = '#fff'; g.font = '900 13px Arial'; g.fillText('N', S - 16, 18);
}

/* ---------- pause map ---------- */
const DISTRICTS = [
  { name: 'OLD CANNERY', x: 0.05, y: 0.16, pct: 24, c: '#c98a6a' },
  { name: 'PALM HEIGHTS', x: 0.44, y: 0.16, pct: 12, c: '#8ab06a' },
  { name: 'SUNDIAL SQUARE', x: 0.22, y: 0.30, pct: 61, c: '#d8b06a' },
  { name: 'MARINA ROW', x: 0.05, y: 0.48, pct: 73, c: '#e89a8a' },
  { name: 'DOWNTOWN', x: 0.36, y: 0.47, pct: 58, c: '#7aa8c8' },
  { name: 'SALTFATS PORT', x: 0.05, y: 0.66, pct: 18, c: '#a88ac8' },
  { name: 'SEAGLASS BEACH', x: 0.42, y: 0.66, pct: 82, c: '#e8c98f' },
];
const STREETS_V = ['GULL ST', 'CANNERY AVE', 'SUNDIAL BLVD', 'LANTERN ST', 'HERON AVE', 'BREAKWATER RD'];
const STREETS_H = ['RIDGE RD', 'OLD MILL ST', 'CORAL ST', 'HARBOR ST', 'TIDEWATER ST', 'AMBER AVE', 'SEAGLASS PARADE'];
const ICONS = [
  { k: 'H', x: 0.16, y: 0.58, c: '#2dd4bf' }, { k: 'G', x: 0.47, y: 0.55, c: '#ffd23f' },
  { k: 'P', x: 0.40, y: 0.42, c: '#38bdf8' }, { k: 'R', x: 0.14, y: 0.72, c: '#f2f5f7' },
  { k: 'D', x: 0.24, y: 0.70, c: '#ff8ab0' }, { k: '+', x: 0.33, y: 0.50, c: '#f2f5f7' },
  { k: '4', x: 0.30, y: 0.68, c: '#ffd23f' }, { k: '✓', x: 0.26, y: 0.66, c: '#2dd4bf' },
  { k: '✓', x: 0.21, y: 0.66, c: '#2dd4bf' }, { k: 'J', x: 0.30, y: 0.24, c: '#ffd23f' },
];
function drawMap() {
  const c = $('mapcanvas'); const g = c.getContext('2d');
  const Wd = c.width, Ht = c.height;
  g.fillStyle = '#0e2a3a'; g.fillRect(0, 0, Wd, Ht);
  // ocean + beach on the right
  g.fillStyle = '#1a7a9e'; g.fillRect(Wd * 0.90, 0, Wd * 0.10, Ht);
  g.fillStyle = '#e8c98f'; g.fillRect(Wd * 0.84, 0, Wd * 0.06, Ht);
  g.fillStyle = '#ffd23f'; g.font = '900 12px Arial'; g.fillText('LUMEN BAY', Wd * 0.845, Ht - 14);
  // city blocks: coloured grid with roads between
  const gx = 30, gy = 26, cols = 8, rows = 6, bw = (Wd * 0.82 - gx) / cols, bh = (Ht - 70) / rows;
  const cols2 = ['#b06a5a', '#8ab06a', '#c8a05a', '#7aa8c8', '#a88ac8', '#e89a8a', '#6aa88a', '#d8b06a'];
  for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) {
    g.fillStyle = cols2[(r * 3 + col * 5) % cols2.length];
    g.fillRect(gx + col * bw + 3, gy + r * bh + 3, bw - 6, bh - 6);
  }
  // roads
  g.strokeStyle = '#e8e2d2'; g.lineWidth = 5;
  for (let i = 0; i <= cols; i++) { g.beginPath(); g.moveTo(gx + i * bw, gy); g.lineTo(gx + i * bw, gy + rows * bh); g.stroke(); }
  for (let i = 0; i <= rows; i++) { g.beginPath(); g.moveTo(gx, gy + i * bh); g.lineTo(gx + cols * bw, gy + i * bh); g.stroke(); }
  // street names on the grid
  g.fillStyle = '#1c2733'; g.font = '700 10px Arial';
  STREETS_V.forEach((s, i) => { g.save(); g.translate(gx + (i + 0.5) * bw, gy + 14); g.rotate(Math.PI / 2); g.fillText(s, 0, 0); g.restore(); });
  STREETS_H.forEach((s, i) => { g.fillText(s, gx + 6, gy + (i + 0.5) * bh); });
  // district labels + %
  DISTRICTS.forEach(d => {
    g.font = '900 17px Arial'; g.fillStyle = '#111';
    const wpx = Wd * d.x, hpy = Ht * d.y;
    const tw = g.measureText(d.name).width + 12;
    g.fillStyle = 'rgba(10,14,20,.85)'; g.fillRect(wpx - 4, hpy - 16, tw, 22);
    g.fillStyle = '#fff'; g.fillText(d.name, wpx + 2, hpy);
    g.font = '700 11px Arial'; g.fillStyle = '#e8f2fa';
    g.fillText('NEUTRAL · ' + d.pct, wpx + 2, hpy + 16);
    g.font = '900 17px Arial';
  });
  // waypoint route (dashed purple)
  g.strokeStyle = '#c084fc'; g.lineWidth = 4; g.setLineDash([10, 6]);
  g.beginPath(); g.moveTo(Wd * 0.5, Ht * 0.78); g.lineTo(Wd * 0.5, Ht * 0.5); g.lineTo(Wd * 0.3, Ht * 0.5); g.stroke();
  g.setLineDash([]);
  // icons
  ICONS.forEach(ic => {
    g.fillStyle = ic.c; g.beginPath(); g.arc(Wd * ic.x, Ht * ic.y, 11, 0, 7); g.fill();
    g.strokeStyle = '#0b0e14'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#0b0e14'; g.font = '900 12px Arial'; g.textAlign = 'center';
    g.fillText(ic.k, Wd * ic.x, Ht * ic.y + 4); g.textAlign = 'left';
  });
  // player arrow
  g.fillStyle = '#ff5a3c'; g.beginPath();
  g.moveTo(Wd * 0.5, Ht * 0.78 - 10); g.lineTo(Wd * 0.5 + 8, Ht * 0.78 + 8); g.lineTo(Wd * 0.5 - 8, Ht * 0.78 + 8);
  g.closePath(); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
  // compass
  g.fillStyle = '#0b0e14'; g.beginPath(); g.arc(Wd - 44, 44, 20, 0, 7); g.fill();
  g.fillStyle = '#ffd23f'; g.font = '900 16px Arial'; g.textAlign = 'center'; g.fillText('N', Wd - 44, 50); g.textAlign = 'left';
}
function renderMapPanels() {
  const stats = [
    ['Story missions', '5/6', 83], ['Street races won', '1/4', 25], ['Stunt jumps', '5/8', 62],
    ['Golden Geckos', '12/20', 60], ['Export list', '3/5', 60], ['District jobs', '5/7', 71],
    ['Districts FRIENDLY', '3/8', 38], ['Crew recruited', '3/3', 100], ['Gold mission ratings', '2/6', 33],
  ];
  $('mapStats').innerHTML = stats.map(s =>
    `<div class="ms-row"><span>${s[0]}</span><b>${s[1]}</b></div><div class="ms-bar"><i style="width:${s[2]}%"></i></div>`).join('');
  $('mapMedals').innerHTML = ['G', 'S', 'G', 'B', 'S', '·'].map(m =>
    `<div class="medal ${m === 'S' ? 'silver' : m === 'B' ? 'bronze' : m === '·' ? 'empty' : ''}">${m === '·' ? '' : m}</div>`).join('');
  const career = [
    ['Cars stolen', '41'], ['Cops escaped', '12'], ['Highest wanted', '★★★★'],
    ['Distance driven', '48.2 km'], ['People taken out', '23'], ['Longest jump', '47 m'],
  ];
  $('careerRows').innerHTML = career.map(c => `<div class="cr-row"><span>${c[0]}</span><b>${c[1]}</b></div>`).join('');
  const crew = [
    ['PILAR SANTOS', 'Z', 'GETAWAY · mechanic', '#ff8ab0'],
    ['UNCLE DEE', 'X', 'SCANNER · fixer', '#f59e0b'],
    ['JUNO OKOYE', 'C', 'DECOY · street racer', '#2dd4bf'],
  ];
  $('crewList').innerHTML = crew.map(c =>
    `<div class="crew2"><span class="avatar" style="background:${c[3]}">${c[0][0]}</span><div><b>${c[0]}</b><span>${c[1]} &nbsp;${c[2]}</span></div></div>`).join('');
  const key = [
    ['H', 'SAFEHOUSE', '#2dd4bf'], ['G', 'GARAGE', '#ffd23f'], ['D', 'DEE · JOBS', '#ff8ab0'],
    ['R', 'STREET RACE', '#f2f5f7'], ['+', 'CLINIC', '#f2f5f7'], ['P', 'PRECINCT', '#38bdf8'],
    ['4', 'NEXT JOB', '#ffd23f'], ['✓', 'JOB DONE', '#2dd4bf'],
  ];
  $('mapKey').innerHTML = key.map(k => `<div><b style="background:${k[2]};color:#0b0e14">${k[0]}</b>${k[1]}</div>`).join('');
  const ss = $('saveSlots');
  if (ss) ss.innerHTML = [
    '<b>1 · 66.1% · Lantawa Centre</b><span>5/6 missions · 15:11</span>',
    '<b>2 · 66.1% · Lomboro Wharf</b><span>5/6 missions · 15:11</span>',
    '<b>3 · 66.1% · Old Pasaru</b><span>5/6 missions · 15:12</span>',
  ].map((s, i) => `<div class="save"><div style="display:flex;justify-content:space-between"><div>${s}</div><button class="sv" data-i="${i}" style="background:#ffd23f;border:none;border-radius:4px;padding:4px 10px;font-weight:900;cursor:pointer">SAVE</button></div></div>`).join('');
}

/* ---------- garage panel ---------- */
function renderGarage() {
  $('upgrades').innerHTML = H.upgrades.map(u => {
    const right = u.state === 'OWNED' ? '<span class="owned">✓ OWNED</span>'
      : u.state.startsWith('LOCKED') ? `<span class="locked">${u.state}</span>`
      : `<span class="price">${u.price}</span>`;
    return `<div class="urow ${H.selectedUpgrade === u.name ? 'sel' : ''}" data-name="${u.name}">
      <span class="uico ${u.ico === 'N2O' ? 'grey' : u.name === 'ARMOUR PLATING' ? '' : ''}">${u.ico}</span>
      <b>${u.name}</b>${right}</div>`;
  }).join('');
  $('gear').innerHTML = H.gear.map(g2 => {
    const right = g2.state === 'OWNED' ? '<span class="owned">✓ OWNED</span>' : `<span class="price">${g2.state}</span>`;
    return `<div class="urow" data-name="${g2.name}"><span class="uico grey">—</span><b>${g2.name}</b>${right}</div>`;
  }).join('');
  const sel = H.upgrades.find(u => u.name === H.selectedUpgrade) || H.upgrades[3];
  $('gDesc').innerHTML = `<b>${sel.name}</b><span>${sel.desc}</span>`;
  $('gStats').innerHTML = [
    ['TOP SPEED', 186, '186 KM/H'], ['ACCELERATION', 72, '7.2 S 0–100'], ['ARMOUR', 60, '60/100'], ['HANDLING', 81, '81/100'],
  ].map(s => `<div class="v-row"><span>${s[0]}</span><div class="v-bar"><i style="width:${s[1]}%;background:#ffd23f"></i></div><b style="width:auto">${s[2]}</b></div>`).join('');
}
function buySelected() {
  const u = H.upgrades.find(x => x.name === H.selectedUpgrade);
  if (!u) return;
  if (u.state === 'OWNED') { toast(u.name + ' already owned'); return; }
  if (u.state.startsWith('LOCKED')) { toast(u.name + ' locked — reach LV 6'); return; }
  const price = parseInt(u.price.replace(/[^0-9]/g, ''), 10);
  if (H.money < price) { toast('Not enough cash for ' + u.name); return; }
  H.money -= price; u.state = 'OWNED'; renderGarage(); renderVitals();
  toast(u.name + ' installed ✓');
}

function initHUD() {
  renderDispatch(); renderWeapons(); renderVitals(); renderMapPanels(); renderGarage();
  drawMinimap();
  document.querySelectorAll('#garage .urow').forEach(el => el.addEventListener('click', () => {
    const n = el.getAttribute('data-name');
    const u = H.upgrades.find(x => x.name === n);
    if (u) { H.selectedUpgrade = n; renderGarage(); }
  }));
  $('gBack').addEventListener('click', () => { if (window.GAME) window.GAME.toDrive(); });
  document.querySelectorAll('.map-btns button').forEach(b => b.addEventListener('click', () => {
    const a = b.getAttribute('data-act');
    if (a === 'resume' && window.GAME) window.GAME.toDrive();
    if (a === 'save') toast('Game saved ✓ — Slot 1 · 66.1%');
    if (a === 'menu' && window.GAME) window.GAME.toTitle();
  }));
  document.querySelectorAll('#title .t-btn').forEach(b => b.addEventListener('click', () => {
    const a = b.getAttribute('data-act');
    if (a === 'settings') { toast('Settings — sound on · quality high · subtitles on'); return; }
    if (window.GAME) window.GAME.toDrive();
  }));
  document.querySelectorAll('#saveSlots .sv').forEach(b => b.addEventListener('click', () => toast('Game saved ✓')));
  $('mapcanvas').addEventListener('click', ev => {
    const r = $('mapcanvas').getBoundingClientRect();
    H.waypoint = { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height };
    drawMinimap(); toast('Waypoint set');
  });
}
