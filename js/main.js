const A = {
  "plate": "assets/scene-plate.png",
  "maskCloud": "assets/mask-clouds.png",
  "maskBack": "assets/mask-leaves.png",
  "balloon": "assets/balloon-baked.png",
  "wall": "assets/wall.png",
  "wires": "assets/power-lines.png",
  "stationMobile": "assets/station-mobile.png",
  "station": "assets/station.png",
  "backcloud": "assets/back-cloud.png",
  "backBuildings": "assets/back-buildings.png",
  "bgBuildings": "assets/background-buildings.png",
  "floor": "assets/floor.png",
  "cloud1": "assets/cloud-1.png",
  "cloud2": "assets/cloud-2.png",
  "cloud3": "assets/cloud-3.png",
  "cloud4": "assets/cloud-4.png",
  "cloud5": "assets/cloud-5.png",
  "leafA": "assets/leaf-1.png",
  "leafB": "assets/leaf-2.png",
  "leafC": "assets/leaf-3.png",
  "leafD": "assets/leaf-4.png",
  "soobin": "assets/soobin-walk.png",
  "yeonjun": "assets/yeonjun-walk.png",
  "beomgyu": "assets/beomgyu-walk.png",
  "taehyun": "assets/taehyun-walk.png",
  "hueningkai": "assets/hueningkai-walk.png",
  "beomgyuHit": "assets/beomgyu-hit.png",
  "balloonSprite": "assets/balloon.png"
};
/* Scene reconstructed from the exported GIF (504×324, 24 s loop).
   Middle 504 px: exact static plate + moving pieces shown only where they show in the GIF.
   Wider screens: the same layers continue sideways (sky, back cloud, skyline, power lines, buildings, wall, floor). */
const W0 = 504, H0 = 324, LOOP = 24;
const CLOUDS = [ // sprite, x, y, drift px, swings per loop, phase
  ['cloud1',24,20,22,2,0], ['cloud2',300,8,18,3,.35], ['cloud3',178,46,14,2,.6], ['cloud4',410,58,20,3,.15], ['cloud5',96,78,16,2,.8] ];
const LEAVES = [ // sprite, x, falls per loop (the drop runs from the top of the page), phase, sway
  ['leafA',318,1,0,8],['leafB',352,2,.41,6],['leafC',384,1,.17,10],['leafD',410,2,.73,7],['leafA',436,1,.55,9],['leafB',462,2,.08,5],
  ['leafC',486,1,.88,8],['leafD',280,1,.32,11],['leafA',240,2,.64,6],['leafB',196,1,.21,9],['leafC',150,2,.95,7],['leafD',96,1,.47,10] ];
const WALKERS = [ // sprite, px/s, steps fps, enters at s, frame offset
  ['soobin',33,9,0,0], ['yeonjun',31,8.5,1.5,5], ['beomgyu',29,8,3.25,2], ['taehyun',37,10,5.75,6], ['hueningkai',32,9,6.5,3] ];
const WALK_Y = 182, STUMBLE = { sprite:'beomgyuHit', frames:7, fps:10 };

const img = {};
const loads = Object.keys(A).map(k => new Promise(r => { const i = new Image(); i.onload = r; i.onerror = r; i.src = A[k]; img[k] = i; }));

const cv = document.getElementById('scene'), g = cv.getContext('2d');
const sky = document.getElementById('sky'), sg = sky.getContext('2d');
let skyH = 200, skyClouds = [];
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
const [cloudC, cloudG] = mk(W0, H0), [leafC, leafG] = mk(W0, H0);
/* World coordinates: the station spans x 0..504. The camera has a position (cam) and a zoom (s px per scene px).
   Login view: whole scene ~60% of the screen height, station centred.  Select view: zoomed in so the wall fills the lower two thirds. */
let Wd = W0;                                     // visible scene width at the current zoom
let cam = 0, zoom = 1, mix = 0, pan = null;      // mix 0 = login framing, 1 = select framing; pan = {t0,dur,toMix,done}
let sLogin = 1, sSelect = 1, WdLogin = W0, camLogin = 0;
const selectCam = () => camLogin + WdLogin + 60;  // empty wall just past where the walkers leave the login view
const WALL_TOP = 288 - 182;                      // scene row where the wall starts
const rnd = v => Math.floor(v + 0.5);

function layout(){
  const vw = innerWidth, vh = innerHeight;
  let s = (vh * 0.6) / H0;                                   // scene takes ~60% of the screen height
  if(vw / s < W0) s = Math.min(vw / 255, (vh * 0.62) / H0);  // phones: compact station fills most of the width
  sLogin = s; WdLogin = Math.round(vw / s); camLogin = Math.round((W0 - WdLogin) / 2);
  const wallFrac = vw <= 700 ? 0.15 : 1 / 3;                   // phones (same breakpoint as the CSS): wall top 15% down; otherwise one third
  sSelect = (vh * (1 - wallFrac)) / (H0 - WALL_TOP);
  applyView(pan ? mix : (atSelect ? 1 : 0));
  document.documentElement.style.setProperty('--scene-h', (H0 * sLogin) + 'px');
  // sky above the scene: same pixel size as the scene
  const hero = sky.parentElement.getBoundingClientRect();
  skyH = Math.ceil(hero.height * WdLogin / vw); sky.width = WdLogin; sky.height = skyH; sg.imageSmoothingEnabled = false;
  // spread clouds over the whole open sky (down to just above the scene's rooftops), thinner behind the text
  const skyBottom = Math.max(30, skyH - H0 + 40);
  let seed = 11; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const kinds = ['cloud1','cloud2','cloud3','cloud4','cloud5'];
  // rows of evenly spaced clouds; every cloud in a row drifts at the same speed, so the spread stays even on both sides
  const CS = 2, rowH = 78, gap = 430; skyClouds = [];   // CS: sky clouds drawn at 2× pixel size
  for(let r = 0; r * rowH < skyBottom - 60; r++){
    const span = WdLogin + 216, n = Math.max(1, Math.round(span / gap)), step = span / n;
    const v = 2 + rand() * 3.5, shift = rand() * step;
    for(let i = 0; i < n; i++){
      const x = shift + i * step + (rand() - 0.5) * step * 0.35;
      const y = Math.round(r * rowH + 4 + rand() * rowH * 0.55);
      if(y > skyBottom - 60) continue;
      skyClouds.push({ k: kinds[Math.floor(rand() * 5)], x, y, v });
    }
  }
}
// position the camera between the login framing (0) and the select framing (1)
function applyView(m){
  mix = m;
  zoom = sLogin + (sSelect - sLogin) * m;
  const vw = innerWidth, w = Math.max(1, Math.round(vw / zoom));
  if(w !== Wd || cv.width !== w){ Wd = w; cv.width = Wd; cv.height = H0; g.imageSmoothingEnabled = false; }
  cam = camLogin + (selectCam() - camLogin) * m;
  cv.style.width = '100%';                                   // height follows: H0 * zoom (clipped at the top when zoomed in)
}
addEventListener('resize', layout);

// draw `im` repeated every `period` px across the canvas, anchored at x
function tile(ctx, im, x, y, period, w = im.naturalWidth, from = cam, to = cam + Wd){
  let start = x - Math.ceil((x - from) / period) * period;
  for(let dx = start; dx < to; dx += period) if(dx + w > from) ctx.drawImage(im, dx, y, w, im.naturalHeight);
}
function cloudPos(c, s){ const [, x, y, A_, cyc, ph] = c, p = 2*Math.PI*(cyc*s/LOOP + ph); return [x + rnd(A_*Math.sin(p)), y + rnd(Math.max(1, A_/6)*Math.sin(2*p))]; }
function leafPos(l, s){
  const [k, x, fall, ph, sway] = l, h = img[k].naturalHeight;
  const top = Math.min(0, H0 - skyH);                       // page top, in scene rows (negative: above the scene)
  const u = ((fall*s/LOOP + ph) % 1 + 1) % 1, sw = 2*Math.PI*(2*fall*s/LOOP + ph*5);
  return [x + rnd(sway*Math.sin(sw)), top - h - 4 + rnd(u*(H0 - top + h + 8)), Math.cos(sw) < 0];
}
function drawSprite(ctx, im, fx, fw, x, y, flip){
  const h = im.naturalHeight;
  if(flip){ ctx.save(); ctx.translate(x + fw, y); ctx.scale(-1, 1); ctx.drawImage(im, fx, 0, fw, h, 0, 0, fw, h); ctx.restore(); }
  else ctx.drawImage(im, fx, 0, fw, h, x, y, fw, h);
}

function draw(s){
  g.clearRect(0, 0, Wd, H0);
  g.save(); g.translate(-cam, 0);                 // everything below is in scene (world) coordinates
  const k0 = Math.floor(cam / W0) - 1, k1 = Math.ceil((cam + Wd) / W0) + 1;
  const mobile = WdLogin < W0;   // narrow screens use the compact station artwork
  {
    // ---- side extensions: the scene's own layers, continued left and right ----
    // no sky fill: the page background (body, --sky) shows through the transparent canvas
    tile(g, img.backcloud, -36, 0, 828);
    for(let k = k0; k <= k1; k++) CLOUDS.forEach(c => { const [x, y] = cloudPos(c, s); g.drawImage(img[c[0]], x + k*W0, y); });
    tile(g, img.backBuildings, 0, 50, 324);          // both building layers start behind the wall (top at y 114)
    tile(g, img.wires, 0, 0, W0);
    tile(g, img.bgBuildings, -288, -2, 1024);   // grey buildings rest right on top of the wall
    for(let k = k0; k <= k1; k++) LEAVES.forEach(l => { const [x, y, f] = leafPos(l, s); const im = img[l[0]]; drawSprite(g, im, 0, im.naturalWidth, x + k*W0, y, f); });
    // corrugated wall: pattern lines up with the GIF's left edge on the left and its right edge on the right
    // wall artwork (526×174), centred on the scene, bottom resting on the floor
    tile(g, img.wall, -Math.floor((img.wall.naturalWidth - W0) / 2), 288 - img.wall.naturalHeight, img.wall.naturalWidth);
    tile(g, img.floor, 0, 288, W0);   // floor sits flush with the bottom edge
  }
  if(mobile){
    const sx = Math.round((W0 - img.stationMobile.naturalWidth) / 2);
    g.drawImage(img.stationMobile, sx, 22);
    // balloon: same sprite and 86% opacity as the desktop scene, floating by the smiley window
    const mbf = Math.floor(s * 6) % 6; g.save(); g.globalAlpha = 0.86;
    g.drawImage(img.balloonSprite, mbf*36, 0, 36, 72, sx + 168, 194, 36, 72); g.restore();
  } else {
  // ---- the exact scene from the GIF ----
  g.drawImage(img.plate, 0, 0);
  cloudG.clearRect(0, 0, W0, H0);
  CLOUDS.forEach(c => { const [x, y] = cloudPos(c, s); cloudG.drawImage(img[c[0]], x, y); });
  cloudG.globalCompositeOperation = 'destination-in'; cloudG.drawImage(img.maskCloud, 0, 0); cloudG.globalCompositeOperation = 'source-over';
  leafG.clearRect(0, 0, W0, H0);
  LEAVES.forEach(l => { const [x, y, f] = leafPos(l, s); const im = img[l[0]]; drawSprite(leafG, im, 0, im.naturalWidth, x, y, f); });
  leafG.globalCompositeOperation = 'destination-in'; leafG.drawImage(img.maskBack, 0, 0); leafG.globalCompositeOperation = 'source-over';
  g.drawImage(cloudC, 0, 0); g.drawImage(leafC, 0, 0);
  // station sprite sheet: 4 frames (the tree rustles), drawn over the falling leaves and clouds
  const sf = Math.floor(s * 4) % 4; g.drawImage(img.station, sf*W0, 0, W0, 288, 0, 0, W0, 288);
  const bf = Math.floor(s * 6) % 6; g.drawImage(img.balloon, bf*36, 0, 36, 72, 432, 194, 36, 72);
  }
  // ---- walkers cross the whole screen in the same time as in the GIF, so the loop still repeats exactly ----
  const w = 36, f = (WdLogin + w) / (W0 + w), mid = Math.round((WdLogin - w) / 2);
  WALKERS.forEach(([k, v0, fps0, enter, off]) => {
    const v = v0 * f, tt = (((s - enter) % LOOP) + LOOP) % LOOP;
    let d = v * tt, frame = (Math.floor(tt * fps0 * f) + off) % 8, im = img[k];
    if(k === 'beomgyu'){
      const td = (mid + w) / v, D = STUMBLE.frames / STUMBLE.fps;
      if(tt >= td && tt < td + D){ im = img[STUMBLE.sprite]; frame = Math.floor((tt - td) * STUMBLE.fps); d = v*td + 0.35*v*(tt - td); }
      else if(tt >= td + D) d = v*td + 0.35*v*D + v*(tt - td - D);
    }
    d = Math.min(rnd(d), WdLogin + w);
    drawSprite(g, im, frame*w, w, camLogin - w + d, WALK_Y, false);
  });
  g.restore();
}

function drawSky(s){
  sg.clearRect(0, 0, WdLogin, skyH);
  skyClouds.forEach(c => {
    const im = img[c.k], w = im.naturalWidth * 2, span = WdLogin + w;
    const x = ((Math.round(c.x - c.v * s - (cam - camLogin) * 0.35) % span) + span) % span - w;   // drift left, wrap round; moves a little with the camera
    sg.drawImage(im, x, c.y, w, im.naturalHeight * 2);
  });
  // falling leaves above the scene: same world positions as in the scene, shifted into sky-canvas space
  const dy = skyH - H0, k0 = Math.floor(cam / W0) - 1, k1 = Math.ceil((cam + WdLogin) / W0) + 1;
  for(let k = k0; k <= k1; k++) LEAVES.forEach(l => {
    const [x, y, f] = leafPos(l, s); const im = img[l[0]];
    if(y + dy < skyH - H0 + 2) drawSprite(sg, im, 0, im.naturalWidth, x + k*W0 - cam, y + dy, f);
  });
}
/* ---------- views: login (#) and character selection (#select) ---------- */
const views = { login: document.getElementById('viewLogin'), select: document.getElementById('viewSelect') };
let atSelect = location.hash === '#select', busy = false, landT = null;
const nextBtn = document.getElementById('next');
function show(name, instant){
  const on = views[name], off = views[name === 'login' ? 'select' : 'login'];
  off.classList.add('out'); setTimeout(() => { off.classList.add('gone'); off.classList.remove('out'); }, instant ? 0 : 350);
  on.classList.remove('gone');
  if(name === 'select'){
    on.classList.remove('land', 'landed'); void on.offsetWidth; on.classList.add('land');   // restart the slap-on animation
    clearTimeout(landT); landT = setTimeout(() => { on.classList.add('landed'); nextBtn.classList.add('landed'); }, 1900);
    nextBtn.classList.remove('gone', 'landed'); return;
  }
  on.classList.add('pre'); void on.offsetWidth;   // start from the right, then slide in
  if(instant){ on.classList.remove('pre'); } else requestAnimationFrame(() => on.classList.remove('pre'));
}
function goTo(name){
  if(busy || (name === 'select') === atSelect) return;
  busy = true; atSelect = name === 'select';
  const off = views[atSelect ? 'login' : 'select'];
  off.classList.add('out'); if(!atSelect){ views.select.classList.remove('land', 'landed'); nextBtn.classList.add('gone'); }   // leaving: posters replay next visit
  const back = document.getElementById('back');
  if(!atSelect) back.classList.add('out');
  pan = { fromMix: mix, toMix: atSelect ? 1 : 0, t0: performance.now(), dur: 2200, done: () => {
    busy = false; off.classList.add('gone'); off.classList.remove('out'); show(name, false);
    back.classList.toggle('gone', !atSelect); back.classList.remove('out');
    if((location.hash === '#select') !== atSelect) history.replaceState(null, '', atSelect ? '#select' : location.pathname + location.search);
  } };
}
// card selection: click, or ← → keys while on the selection view
const cards = [...document.querySelectorAll('.card')];
let selected = 'yeonjun';
function selectCard(name){
  selected = name;
  cards.forEach(c => { const on = c.dataset.name === name; c.classList.toggle('sel', on); c.setAttribute('aria-selected', on); });
}
cards.forEach(c => {
  c.addEventListener('pointerdown', e => { if(e.button === 0 || e.pointerType !== 'mouse') selectCard(c.dataset.name); });   // respond on touch-down, not release
  c.addEventListener('click', () => selectCard(c.dataset.name));                                                             // keyboard / fallback
});
nextBtn.addEventListener('click', e => { e.preventDefault(); onNext(selected); });
function onNext(name){
  // TODO: hook up the next screen. `name` is the chosen member: soobin | yeonjun | beomgyu | taehyun | hueningkai
  console.log('Next with', name);
}
addEventListener('keydown', e => {
  if(!atSelect || busy) return;
  const i = cards.findIndex(c => c.dataset.name === selected);
  if(e.key === 'ArrowRight') selectCard(cards[(i + 1) % cards.length].dataset.name);
  if(e.key === 'ArrowLeft') selectCard(cards[(i + cards.length - 1) % cards.length].dataset.name);
});
document.getElementById('skip').addEventListener('click', e => { e.preventDefault(); goTo('select'); });
document.getElementById('back').addEventListener('click', e => { e.preventDefault(); goTo('login'); });
addEventListener('hashchange', () => goTo(location.hash === '#select' ? 'select' : 'login'));
if(atSelect){ views.login.classList.add('gone'); views.select.classList.remove('gone'); views.select.classList.add('land'); document.getElementById('back').classList.remove('gone'); nextBtn.classList.remove('gone'); landT = setTimeout(() => { views.select.classList.add('landed'); nextBtn.classList.add('landed'); }, 1900); }

let t = 0, last = null;
let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
if(paused) t = 12.6 * 1000;   // still frame on the stumble for reduced motion

function frame(now){
  if(last != null && !paused) t = (t + now - last) % (LOOP * 1000);
  if(pan){
    const u = Math.min(1, (now - pan.t0) / pan.dur), e = u < .5 ? 4*u*u*u : 1 - Math.pow(-2*u + 2, 3) / 2;   // ease in-out
    applyView(pan.fromMix + (pan.toMix - pan.fromMix) * e);
    if(u >= 1){ const done = pan.done; pan = null; done && done(); }
  }
  last = now; draw(t / 1000); drawSky(t / 1000); requestAnimationFrame(frame);
}
Promise.all(loads).then(() => { layout(); requestAnimationFrame(frame); });
