// game.js — Estado del juego y update(). Aquí no se dibuja nada: draw() vive en world.js y hud.js
// y solo lee este estado.
import { buildLevel } from './level.js';
import { createPlayer, updatePlayer, hurtPlayer, setState, STATE } from './player.js';
import { GRAVITY, moveAndCollide, overlapRect, groundBelow } from './physics.js';
import { CONFIG } from './config.js';
import { Pool } from './pool.js';
import { Director, setupStory } from './story.js';

const HIST = 48;

export class Game {
  constructor(sound, input) {
    this.sound = sound; this.input = input;
    this.L = buildLevel();
    this.solids = this.L.solids;
    this.player = createPlayer(200, -72);
    this.player.hidden = true;
    this.mode = 'titulo'; this.paused = false;
    this.time = 0; this.playTime = 0;
    this.sec = 0;
    this.view = { w: 640, h: 360 };
    this.cam = { x: 700, y: -560, shake: 0, fix: { x: 700, y: -560 }, look: 0, speed: 4 };
    this.flags = {}; this.has = { sensor: false, memoria: false, energia: false };
    this.secrets = new Set();
    this.checkpoint = this.L.checkpoints[0];
    this.dialog = null; this.toast = null; this.hint = null; this.zoneCard = null; this.vision = null;
    this.objective = ''; this.letterbox = 0; this.prompt = null; this.sensor = 0; this.memNear = false;
    this.fade = { a: 1, target: 1, speed: 1, color: '#000000' };
    this.seenZones = new Set(); this.zone = null;
    this.envName = 'titulo'; this.alarm = 0; this.music = 'silencio'; this.musicVar = 0;
    this.auto = { x: 0, run: false, jump: false };
    this.tilo = { x: 2160, y: -220, face: -1, anim: 'idle', t: 0, visible: true, targetX: null, speed: 150, talk: false };
    this.lunex = { visible: false, a: 0, frag: 0 };
    this.fx = { meteor: -1, hatch: 0, crystalFly: -1, crystalTaken: false, orb: -1, shock: -1, ruinsVision: 0, beam: 0, ringFlash: 0, route: 0, core: 0, holo: 0, endTitle: -1, collector: 0 };
    this.ghostPrint = { state: 'oculta' };
    this.ringsDone = 0; this.pylonsOn = 0;
    this.particles = new Pool(() => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, g: 0, r: 1, gg: 1, b: 1, drag: 0 }), 600);
    this.pulses = new Pool(() => ({ x: 0, y: 0, vx: 0, life: 0 }), 12);
    this.history = Array.from({ length: HIST }, () => ({ x: 0, y: 0, face: 1, anim: 'idle', t: 0, time: -1 }));
    this.histI = 0;
    this.interactables = []; this.triggers = [];
    this.director = new Director(this);
    setupStory(this);
    this.introPlayed = false;
    this.prev = { px: 0, py: 0, cx: 0, cy: 0 }; this.alpha = 1; this.hitStop = 0; this.hurtFlash = 0; this.dustT = 0;
    this.touchUI = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  }

  // ---------- utilidades para los guiones ----------
  section(i = this.sec) { return this.L.sections[i]; }
  secAt(x) { return this.L.sections.findIndex(s => x >= s.x0 && x <= s.x1); }
  placePlayer(x, y, face = 1) {
    const p = this.player;
    p.pos.x = x - p.w / 2; p.pos.y = y - p.h; p.vel.x = 0; p.vel.y = 0; p.face = face;
    p.onGround = false; setState(p, STATE.FALLING); p.sq = 1;
    this.sec = this.secAt(x);
    this.cam.anchor = undefined;
    this.snapCamera(); this.savePrev();
  }
  snapCamera() { this.cam.snap = true; }
  addTrauma(a) { this.cam.shake = Math.min(1, this.cam.shake + a); }
  // Posiciones del paso anterior: el render interpola entre ambas (paso fijo de 60 Hz)
  savePrev() { const p = this.player, c = this.cam; this.prev.px = p.pos.x; this.prev.py = p.pos.y; this.prev.cx = c.x; this.prev.cy = c.y; }
  pose(anim) { const p = this.player; p.poseAnim = anim; setState(p, STATE.POSE); p.anim = anim; p.animTime = 0; }
  unpose() { const p = this.player; if (p.state === STATE.POSE) setState(p, STATE.IDLE); }
  showToast(text, dur = 4.5) { this.toast = { text, t: 0, dur }; }
  showHint(text, dur = 4) { this.hint = { text, t: 0, dur }; }
  setObjective(t) { this.objective = t; }
  openDialog(who, text) { this.dialog = { who, text, shown: 0, blipAcc: 0 }; }
  findSecret(id, text) {
    if (this.secrets.has(id)) return;
    this.secrets.add(id); this.sound.sfx('secreto'); this.showToast(`Secreto ${this.secrets.size}/4 · ${text}`, 3.5);
  }
  burst(x, y, n, rgb, { speed = 80, life = 0.8, g = 0, z = 0, spread = 1, up = 0, drag = 0, zs = 20 } = {}) {
    for (let i = 0; i < n; i++) {
      this.particles.spawn(o => {
        const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.6);
        o.x = x; o.y = y; o.z = z + (Math.random() - 0.5) * zs;
        o.vx = Math.cos(a) * v * spread; o.vy = Math.sin(a) * v - up; o.vz = (Math.random() - 0.5) * v * 0.4;
        o.life = o.max = life * (0.6 + Math.random() * 0.5); o.g = g; o.drag = drag;
        o.r = rgb[0]; o.gg = rgb[1]; o.b = rgb[2];
      });
    }
  }
  anchor(id) { return this.L.anchors.find(a => a.id === id); }
  door(id) { return this.L.doors.find(d => d.id === id); }
  playerCenter() { const p = this.player; return { x: p.pos.x + p.w / 2, y: p.pos.y + p.h / 2 }; }

  // Atajo para pruebas de juego: index.html?zona=1..6 empieza ahí con lo anterior resuelto.
  skipTo(n) {
    const F = this.flags, L = this.L;
    this.introPlayed = true; this.mode = 'juego'; this.player.hidden = false;
    this.fade.a = 0; this.fade.target = 0; this.cam.fix = null; this.music = 'superficie';
    this.setObjective('Prueba de zona ' + n);
    if (n >= 3) { F.conoceTilo = F.recolector = F.compuerta = true; this.has.sensor = true; L.rocks.forEach(r => { r.inSlot = true; r.pos.x = r.slot0; r.pos.y = -220; r.s.x = r.pos.x; r.s.y = r.pos.y; }); this.triggers.forEach(t => { if (t.sec === 0 && t.x0 < 2900) t.done = true; }); this.ghostPrint.state = 'ida'; }
    if (n >= 4) { F.portal = true; this.has.memoria = true; this.fx.crystalTaken = true; L.pylons.forEach(p => p.on = true); this.pylonsOn = 3; ['puente', 'escalera'].forEach(id => { const a = this.anchor(id); a.state = 'hecho'; a.solids.forEach(s => s.active = true); }); this.music = 'santuario'; }
    if (n >= 5) { F.camara = true; this.ringsDone = 3; L.anchors.filter(a => a.ring !== undefined).forEach(a => a.state = 'hecho'); this.music = 'estacion'; }
    if (n >= 6) { this.has.energia = true; F.consola = F.lunex = true; this.music = 'huida'; }
    const at = { 1: [300, 0], 2: [1700, -140], 3: [3010, -220], 4: [6060, 0], 5: [9060, 0], 6: [11960, 0] }[n] || [300, 0];
    this.placePlayer(at[0], at[1], 1);
    this.checkpoint = this.L.checkpoints.find(k => k.sec === this.sec && k.x <= at[0] + 50) || this.checkpoint;
  }

  start() {
    if (this.introPlayed) return;
    this.introPlayed = true; this.mode = 'juego';
    this.director.run('intro');
  }

  // =====================================================================
  update(dt) {
    const inp = this.input;
    this.time += dt;
    if (inp.pressed.mute) this.sound.toggleMute();
    if (this.mode === 'titulo') {
      if (inp.pressed.confirm || inp.pressed.any) this.start();
      this.updateCamera(dt); this.updateAmbient(dt);
      return;
    }
    if (this.mode === 'fin') { this.updateFade(dt); this.fx.endTitle += dt; if ((inp.pressed.confirm || inp.pressed.any) && this.fx.endTitle > 6) location.reload(); return; }
    if (inp.pressed.pause && !this.director.blocking) this.paused = !this.paused;
    if (this.paused) { if (inp.pressed.restart) location.reload(); return; }
    this.playTime += dt;

    // Diálogo abierto: avanzar texto
    const dlg = this.dialog;
    if (dlg) {
      const before = Math.floor(dlg.shown);
      dlg.shown = Math.min(dlg.text.length, dlg.shown + dt * 42);
      if (Math.floor(dlg.shown) !== before && Math.floor(dlg.shown) % 2 === 0 && dlg.text[Math.floor(dlg.shown)] !== ' ') this.sound.blip(dlg.who);
      if (inp.pressed.confirm) {
        if (dlg.shown < dlg.text.length) dlg.shown = dlg.text.length; else this.dialog = null;
        inp.pressed.act = false; inp.pressed.jump = false; // la tecla que cierra el diálogo no salta ni interactúa
      }
    }

    this.director.update(dt);
    const blocking = this.director.blocking;
    const p = this.player;

    // Interacción y prompt
    this.prompt = null;
    if (!blocking && !p.hidden) this.prompt = this.nearestInteractable();
    let castPressed = false;
    if (!blocking && inp.pressed.act) {
      if (this.prompt) { this.sound.sfx('interactuar'); this.director.run(this.prompt.run); }
      else if (this.has.memoria) castPressed = true;
    }

    // Jugador
    const ctl = blocking ? this.auto : null;
    const pin = {
      x: ctl ? ctl.x : inp.x, run: ctl ? ctl.run : inp.run,
      jumpPressed: ctl ? ctl.jump : inp.pressed.jump, jumpHeld: ctl ? ctl.jump : inp.jumpHeld, castPressed
    };
    if (ctl) ctl.jump = false;
    if (!p.hidden) {
      updatePlayer(p, pin, this.solids, dt, this.playerHooks || (this.playerHooks = {
        onJump: () => {
          this.sound.sfx('salto'); this.onPlayerJump(); p.sq = CONFIG.stretchJump;
          const c = this.playerCenter(); this.burst(c.x, p.pos.y + p.h, 5, this.dustColor(), { speed: 45, life: 0.35, up: 10, g: 150, spread: 1.4 });
        },
        onLand: () => {
          // Aterrizaje proporcional a la caída: squash, polvo y, si fue alta, temblor
          const v = Math.max(0, p.lastFallSpeed || 0), k = Math.min(1, v / 900);
          this.sound.sfx(k > 0.6 ? 'caida_fuerte' : 'caida');
          p.sq = 1 - (1 - CONFIG.squashLand) * (0.4 + 0.6 * k);
          const c = this.playerCenter(); this.burst(c.x, p.pos.y + p.h, Math.round(4 + k * 14), this.dustColor(), { speed: 50 + k * 90, life: 0.45, up: 15 + k * 30, g: 220, spread: 1.6 });
          if (k > 0.75) this.addTrauma(0.22);
        },
        onStep: () => this.sound.sfx('paso'),
        onPush: (s, dir) => { if (s.ent) s.ent.push = dir * CONFIG.pushSpeed; },
        onCastFire: () => this.castMemory()
      }));
      p.sq = (p.sq || 1) + (1 - (p.sq || 1)) * (1 - Math.exp(-dt * 4.6 / CONFIG.squashTime));
      if (p.state === STATE.RUNNING && p.running && p.onGround) {
        this.dustT -= dt;
        if (this.dustT <= 0) { this.dustT = CONFIG.runDustEvery; this.burst(p.pos.x + p.w / 2 - p.face * 8, p.pos.y + p.h, 3, this.dustColor(), { speed: 35, life: 0.35, up: 12, g: 120 }); }
      }
      if (p.state === STATE.PUSHING) { this.pushSnd = (this.pushSnd || 0) - dt; if (this.pushSnd <= 0) { this.pushSnd = 0.45; this.sound.sfx('empujar'); } }
    }
    this.recordHistory();

    this.updateRocks(dt);
    this.updatePlates(dt);
    this.updatePhases();
    this.updateDoors(dt);
    this.updateFragments(dt);
    this.updateSentinels(dt);
    this.updatePulses(dt);
    this.updateBeetles(dt);
    this.updateAnchors(dt);
    this.updateTilo(dt);
    this.updateParticles(dt);
    this.updateFx(dt);
    if (!blocking && !p.hidden) { this.checkTriggers(); this.checkCheckpoints(); this.checkDeath(); this.checkZone(); }
    this.updateSensor();
    this.updateCamera(dt);
    this.updateFade(dt);
    this.updateTimers(dt);
    this.updateAmbient(dt);
  }

  nearestInteractable() {
    const c = this.playerCenter(); let best = null, bd = 1e9;
    for (const it of this.interactables) {
      if (it.sec !== this.sec || (it.cond && !it.cond(this))) continue;
      const dx = Math.abs(c.x - it.x), dy = Math.abs((this.player.pos.y + this.player.h) - it.y);
      if (dx < (it.r || 46) && dy < 60 && dx < bd) { bd = dx; best = it; }
    }
    return best;
  }

  recordHistory() {
    const p = this.player, h = this.history[this.histI];
    h.x = p.pos.x + p.w / 2; h.y = p.pos.y + p.h; h.face = p.face; h.anim = p.anim; h.t = p.animTime; h.time = this.time;
    this.histI = (this.histI + 1) % HIST;
  }
  historyAt(lag) {
    const want = this.time - lag; let best = this.history[0];
    for (const h of this.history) if (h.time <= want && h.time > best.time) best = h;
    return best.time < 0 ? null : best;
  }

  onPlayerJump() {
    // Escena 2: al saltar el desnivel aparece una huella delante
    const c = this.playerCenter();
    if (this.ghostPrint.state === 'oculta' && this.sec === 0 && c.x > 1620 && c.x < 1800) { this.ghostPrint.state = 'visible'; this.sound.sfx('crujido'); }
  }

  castMemory() {
    const p = this.player, hx = p.pos.x + p.w / 2 + p.face * 26, hy = p.pos.y + 30;
    let best = null, bd = 210;
    for (const a of this.L.anchors) {
      if (a.state !== 'latente' || a.sec !== this.sec) continue;
      const d = Math.hypot(a.x - hx, a.y - hy);
      if (d < bd) { bd = d; best = a; }
    }
    if (best) {
      best.state = 'formando'; best.t = 0; best.fromX = hx; best.fromY = hy;
      this.sound.sfx('proyectar'); this.sound.sfx('reconstruir');
      for (let i = 0; i < 26; i++) this.particles.spawn(o => {
        const k = i / 26; o.x = hx; o.y = hy; o.z = 10;
        o.vx = (best.x - hx) * (0.9 + Math.random() * 0.4) / 0.6; o.vy = (best.y - hy) / 0.6 + (Math.random() - 0.5) * 60; o.vz = 0;
        o.life = o.max = 0.6 * (0.7 + k * 0.3); o.g = 0; o.drag = 0; o.r = 0.75; o.gg = 0.92; o.b = 0.97;
      });
    } else {
      this.sound.sfx('nada');
      this.burst(hx, hy, 10, [0.75, 0.92, 0.97], { speed: 50, life: 0.4 });
      
    }
  }

  // ---------- mecánicas ----------
  updateRocks(dt) {
    for (const r of this.L.rocks) {
      r.vel.x = r.inSlot ? 0 : r.push; r.push = 0;
      r.vel.y = Math.min(r.vel.y + GRAVITY * dt, 900);
      moveAndCollide(r, this.solids, dt);
      r.s.x = r.pos.x; r.s.y = r.pos.y;
      if (!r.inSlot && r.pos.y + r.h > -195) {
        r.inSlot = true; r.s.pushable = false;
        this.sound.sfx('caida'); this.sound.sfx('empujar');
        this.burst(r.pos.x + 25, r.pos.y, 14, [0.92, 0.9, 0.85], { speed: 90, life: 0.7, g: 300, up: 60 });
        if (this.L.rocks.every(k => k.inSlot)) this.setObjective('Baja la palanca');
      }
    }
  }
  updatePlates(dt) {
    const p = this.player;
    for (const pl of this.L.plates) {
      pl.t += dt;
      if (pl.state === 'firme') {
        if (p.onGround && p.ground === pl.s) { pl.state = 'tiembla'; pl.t = 0; this.sound.sfx('crujido'); }
      } else if (pl.state === 'tiembla') {
        if (pl.t > 0.45) { pl.state = 'cae'; pl.t = 0; pl.s.active = false; this.sound.sfx('placa'); this.burst(pl.x + 33, pl.y + 8, 12, [0.85, 0.83, 0.78], { speed: 70, life: 0.8, g: 500 }); }
      } else if (pl.state === 'cae') {
        if (pl.t > pl.respawn && !overlapRect(pl.x, pl.y, 66, 16, { x: p.pos.x, y: p.pos.y, w: p.w, h: p.h })) { pl.state = 'firme'; pl.t = 0; pl.s.active = true; }
      }
    }
  }
  updatePhases() {
    const p = this.player, box = { x: p.pos.x, y: p.pos.y, w: p.w, h: p.h };
    for (const ph of this.L.phases) {
      const k = ((this.time / ph.cycle) + ph.offset) % 1;
      const want = k < 0.62;
      ph.k = k; ph.warn = k > 0.47 && k < 0.62;
      if (want && !ph.s.active && overlapRect(ph.s.x, ph.s.y, ph.s.w, ph.s.h, box)) continue;
      ph.s.active = want;
    }
  }
  updateDoors(dt) {
    const p = this.player, c = this.playerCenter(), F = this.flags;
    for (const d of this.L.doors) {
      if (d.mode === 'salta') {
        d.t += dt;
        if (d.t > d.period) {
          const nx = d.xs[(d.k + 1) % d.xs.length];
          if (!overlapRect(nx - 6, d.s.y, d.s.w + 12, d.s.h, { x: p.pos.x, y: p.pos.y, w: p.w, h: p.h })) {
            d.k = (d.k + 1) % d.xs.length; d.s.x = nx; d.t = 0; d.flash = 0.25;
            if (this.sec === 3) this.sound.sfx('metal');
          }
        }
        d.flash = Math.max(0, (d.flash || 0) - dt);
        continue;
      }
      let want = d.open;
      if (d.id === 'compuerta') want = !!F.compuerta;
      else if (d.id === 'portal') want = !!F.portal;
      else if (d.id === 'camara') want = !!F.camara;
      else if (d.id === 'd1') want = this.sec === 2 && c.x > 9170;
      else if (d.id === 'd2') { const dist = Math.abs(c.x - 9975); if (this.sec === 2 && dist < 105) want = false; else if (dist > 230) want = true; else want = d.open; }
      else if (d.id === 'd3') want = this.has.energia;
      if (want !== d.open) { d.open = want; if (this.sec === this.secAt(d.s.x)) this.sound.sfx('puerta'); }
      d.t = Math.max(0, Math.min(1, d.t + (d.open ? dt : -dt) / 0.7));
      d.s.active = d.t < 0.8;
    }
  }
  updateFragments(dt) {
    const p = this.player;
    for (const f of this.L.fragments) {
      f.x += f.dir * f.speed * dt;
      if (f.x > f.x1) { f.x = f.x1; f.dir = -1; } else if (f.x < f.x0) { f.x = f.x0; f.dir = 1; }
      if (overlapRect(f.x - 8, f.y - 16, 16, 16, { x: p.pos.x, y: p.pos.y, w: p.w, h: p.h })) this.hurt(f.x);
    }
  }
  updateSentinels(dt) {
    const p = this.player, feetX = p.pos.x + p.w / 2, feetY = p.pos.y + p.h;
    for (const s of this.L.sentinels) {
      s.t += dt;
      const z = s.zone, inZone = this.sec === s.sec && feetX > z.x && feetX < z.x + z.w && feetY > z.y && feetY <= z.y + z.h;
      if (s.state === 'dormido') {
        if (inZone) { s.state = 'despierta'; s.t = 0; this.sound.sfx('despertar'); }
      } else if (s.state === 'despierta') {
        if (s.t > 0.7) { s.state = 'activo'; s.t = 0; s.cool = 0.1; }
      } else if (s.state === 'activo') {
        s.cool -= dt;
        if (inZone) s.lost = 0; else s.lost = (s.lost || 0) + dt;
        if (s.cool <= 0 && inZone) {
          s.cool = 1.4;
          const dir = feetX < s.x ? -1 : 1;
          this.pulses.spawn(o => { o.x = s.x + dir * 30; o.y = z.y + z.h - 40; o.vx = dir * 175; o.life = 2.6; });
          this.sound.sfx('pulso');
        }
        if (s.lost > 1.8) { s.state = 'dormido'; s.t = 0; }
      }
    }
  }
  updatePulses(dt) {
    const p = this.player, box = { x: p.pos.x, y: p.pos.y, w: p.w, h: p.h };
    this.pulses.forEachActive(o => {
      o.x += o.vx * dt; o.life -= dt;
      if (Math.random() < 0.5) this.particles.spawn(q => { q.x = o.x; q.y = o.y + (Math.random() - 0.5) * 14; q.z = 0; q.vx = -o.vx * 0.1; q.vy = 0; q.vz = 0; q.life = q.max = 0.3; q.g = 0; q.drag = 0; q.r = 1; q.gg = 0.45; q.b = 0.3; });
      if (overlapRect(o.x - 9, o.y - 9, 18, 18, box)) { this.hurt(o.x); o.active = false; }
      if (o.life <= 0) o.active = false;
    });
  }
  updateBeetles(dt) {
    const c = this.playerCenter();
    for (const b of this.L.beetles) {
      b.t += dt;
      const d = c.x - b.x, near = this.sec === 0 && Math.abs(d) < 130 && Math.abs(c.y - b.y) < 120;
      if (b.state === 'pasea') {
        b.x += b.dir * 26 * dt;
        if (Math.abs(b.x - b.hx) > 60) b.dir = Math.sign(b.hx - b.x);
        if (near) { b.state = 'huye'; b.t = 0; b.dir = d > 0 ? -1 : 1; }
      } else if (b.state === 'huye') {
        b.x += b.dir * 190 * dt;
        if (b.t > 0.9) { b.state = 'escondido'; b.t = 0; this.burst(b.x, b.y, 6, [0.9, 0.86, 0.78], { speed: 40, life: 0.5, g: 200, up: 30 }); }
      } else if (b.state === 'escondido') {
        if (b.t > 5 && Math.abs(c.x - b.hx) > 260) { b.state = 'pasea'; b.x = b.hx; b.t = 0; }
      }
    }
  }
  updateAnchors(dt) {
    const p = this.player;
    for (const a of this.L.anchors) {
      if (a.state !== 'formando') continue;
      a.t += dt;
      if (a.t >= 1.3) {
        a.state = 'hecho';
        for (const s of a.solids) {
          s.active = true;
          if (overlapRect(s.x, s.y, s.w, s.h, { x: p.pos.x, y: p.pos.y, w: p.w, h: p.h })) { p.pos.y = s.y - p.h; p.vel.y = 0; }
        }
        this.burst(a.x, a.y, 30, [0.75, 0.92, 0.97], { speed: 120, life: 1.0 });
        this.director.run('ancla_' + a.id);
      }
    }
  }
  updateTilo(dt) {
    const t = this.tilo; t.t += dt;
    if (t.targetX !== null) {
      const d = t.targetX - t.x;
      if (Math.abs(d) < 3) { t.x = t.targetX; t.targetX = null; }
      else { t.x += Math.sign(d) * Math.min(Math.abs(d), t.speed * dt); t.face = Math.sign(d); }
    }
    const talking = this.dialog && this.dialog.who === 'tilo' && this.dialog.shown < this.dialog.text.length;
    const a = t.targetX !== null ? 'walk' : (t.wave ? 'wave' : (talking ? 'talk' : 'idle'));
    if (a !== t.anim) { t.anim = a; t.t = 0; }
  }
  updateParticles(dt) {
    this.particles.forEachActive(o => {
      o.vy += o.g * dt;
      if (o.drag) { const k = Math.max(0, 1 - o.drag * dt); o.vx *= k; o.vy *= k; }
      o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt;
      o.life -= dt; if (o.life <= 0) o.active = false;
    });
  }
  updateFx(dt) {
    const f = this.fx;
    if (f.meteor >= 0) f.meteor += dt;
    if (f.crystalFly >= 0 && f.crystalFly < 1) f.crystalFly = Math.min(1, f.crystalFly + dt / 0.9);
    if (f.orb >= 0) f.orb += dt;
    if (f.shock >= 0) f.shock += dt;
    if (f.endTitle >= 0) f.endTitle += dt;
    f.ringFlash = Math.max(0, f.ringFlash - dt * 0.6);
    if (this.flags.recolector) f.collector += dt;
    if (this.ghostPrint.state === 'visible') {
      const c = this.playerCenter();
      if (Math.abs(c.x - 1880) < 70) { this.ghostPrint.state = 'desvanece'; this.ghostPrint.t = 0; }
    } else if (this.ghostPrint.state === 'desvanece') { this.ghostPrint.t += dt; if (this.ghostPrint.t > 0.8) this.ghostPrint.state = 'ida'; }
    this.lunex.frag = this.lunex.fragTarget !== undefined ? this.lunex.frag + (this.lunex.fragTarget - this.lunex.frag) * Math.min(1, dt * 3) : this.lunex.frag;
    this.lunex.a += ((this.lunex.visible ? 1 : 0) - this.lunex.a) * Math.min(1, dt * 2.5);
    // vibración leve del teléfono cerca de estructuras antiguas
    if (this.has.sensor && this.sensor > 0.75 && navigator.vibrate) {
      this.vibT = (this.vibT || 0) - dt;
      if (this.vibT <= 0) { this.vibT = 1.2; try { navigator.vibrate(25); } catch (e) { /* sin vibración */ } }
    }
  }

  hurt(fromX) {
    const p = this.player;
    if (this.director.blocking) return;
    if (hurtPlayer(p, fromX)) {
      this.sound.sfx('dano'); this.addTrauma(0.55); this.hitStop = CONFIG.hitStop; this.hurtFlash = 1;
      const c = this.playerCenter(); this.burst(c.x, c.y, 10, [0.42, 0.67, 0.8], { speed: 90, life: 0.5 });
      if (p.energy <= 0) this.director.run('reaparecer');
    }
  }

  checkTriggers() {
    const c = this.playerCenter();
    for (const t of this.triggers) {
      if (t.done || t.sec !== this.sec) continue;
      if (c.x >= t.x0 && c.x <= t.x1 && c.y >= (t.y0 ?? -1e9) && c.y <= (t.y1 ?? 1e9) && (!t.cond || t.cond(this))) {
        if (t.once !== false) t.done = true;
        this.director.run(t.run);
      }
    }
  }
  checkCheckpoints() {
    const c = this.playerCenter(), p = this.player;
    for (const k of this.L.checkpoints) {
      if (k.sec !== this.sec || Math.abs(c.x - k.x) > 40 || !p.onGround) continue;
      if (this.checkpoint !== k) {
        this.checkpoint = k;
        if (!k.on) { k.on = true; this.sound.sfx('checkpoint'); this.burst(k.x, k.y - 30, 12, [0.75, 0.92, 0.97], { speed: 60, life: 0.8, up: 40 }); }
        p.energy = 3;
      }
    }
  }
  checkDeath() {
    if (this.player.pos.y > this.section().killY) this.director.run('reaparecer');
  }
  checkZone() {
    const c = this.playerCenter();
    const z = this.L.zones.find(z => z.sec === this.sec && c.x >= z.x0 && c.x < z.x1);
    if (z && z !== this.zone) {
      this.zone = z;
      if (!this.seenZones.has(z.n)) { this.seenZones.add(z.n); this.zoneCard = { n: z.n, name: z.name, t: 0 }; }
    }
  }
  updateSensor() {
    const c = this.playerCenter();
    let d = 1e9;
    const consider = (x, y) => { const dd = Math.hypot(c.x - x, c.y - y); if (dd < d) d = dd; };
    if (this.sec === 0) {
      for (const p of this.L.pylons) if (!p.on) consider(p.x, p.y - 40);
      if (!this.fx.crystalTaken) consider(this.L.spots.cristalRuina.x, -240);
    }
    let anchorD = 1e9;
    for (const a of this.L.anchors) if (a.state === 'latente' && a.sec === this.sec) { const dd = Math.hypot(c.x - a.x, c.y - a.y); anchorD = Math.min(anchorD, dd); if (dd < d) d = dd; }
    this.sensor = this.has.sensor ? Math.max(0, 1 - d / 520) : 0;
    this.memNear = this.has.memoria && anchorD < 230;
    // vibración audible de cristales cercanos
    let hd = 1e9;
    const sp = this.L.spots;
    if (this.sec === 0) {
      hd = Math.min(Math.hypot(c.x - sp.cristalCrater.x, c.y + 20), this.fx.crystalTaken ? 1e9 : Math.hypot(c.x - sp.cristalRuina.x, c.y - (-260)));
    }
    if (this.sec === 1 && this.ringsDone >= 3) hd = Math.hypot(c.x - sp.cristalMudo.x, c.y + 20);
    this.crystalHum = Math.max(0, 1 - hd / 260) * (this.mode === 'juego' ? 1 : 0);
  }

  updateCamera(dt) {
    const p = this.player, cam = this.cam, sec = this.section(), hw = this.view.w / 2, hh = this.view.h / 2, C = CONFIG;
    const damp = (a, b, l) => a + (b - a) * (1 - Math.exp(-l * dt));
    let tx, ty;
    const feet = p.pos.y + p.h;
    // Ancla vertical: la cámara no sigue cada salto; solo al pisar suelo o si DIP cae bajo el ancla
    if (cam.anchor === undefined || p.onGround || feet > cam.anchor + C.camAnchorDrop || p.hidden) cam.anchor = feet;
    if (cam.fix) { tx = cam.fix.x; ty = cam.fix.y; }
    else {
      // Look-ahead: mira hacia donde va DIP (y un poco más si corre)
      cam.look = damp(cam.look, p.face * C.camLookAhead + p.vel.x * 0.18, C.camLookLambda);
      tx = p.pos.x + p.w / 2 + cam.look;
      ty = cam.anchor - 105 + (this.dialog && !this.touchUI ? 70 : 0);
      tx = Math.max(sec.x0 + hw, Math.min(sec.x1 - hw, tx));
      const y0 = sec.yMin + hh, y1 = sec.yMax - hh;
      ty = y0 > y1 ? (y0 + y1) / 2 : Math.max(y0, Math.min(y1, ty));
    }
    if (cam.snap) { cam.x = tx; cam.y = ty; cam.snap = false; this.savePrev(); }
    else if (cam.fix) { cam.x = damp(cam.x, tx, cam.speed); cam.y = damp(cam.y, ty, cam.speed * 0.8); }
    else { cam.x = damp(cam.x, tx, C.camFollowX); cam.y = damp(cam.y, ty, C.camFollowY); }
    cam.shake = Math.max(0, cam.shake - dt * C.shakeDecay);
    // zona visual según la cámara (para el clima y la luz)
    const zs = this.L.zones.find(z => cam.x >= z.x0 && cam.x < z.x1);
    if (this.mode === 'titulo') this.envName = 'titulo';
    else if (this.envOverride) this.envName = this.envOverride;
    else if (zs) this.envName = zs.env;
    // sombra: suelo bajo DIP
    p.shadowY = groundBelow(p.pos.x + p.w / 2, p.pos.y + p.h, this.solids);
  }
  updateFade(dt) {
    const f = this.fade;
    if (f.a < f.target) f.a = Math.min(f.target, f.a + dt * f.speed); else if (f.a > f.target) f.a = Math.max(f.target, f.a - dt * f.speed);
  }
  dustColor() { const e = this.envName; return ['santuario', 'estacion', 'huida', 'alarma'].includes(e) ? [0.55, 0.75, 0.85] : [0.93, 0.91, 0.86]; }
  updateTimers(dt) {
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.5);
    if (this.toast) { this.toast.t += dt; if (this.toast.t > this.toast.dur) this.toast = null; }
    if (this.hint) { this.hint.t += dt; if (this.hint.t > this.hint.dur) this.hint = null; }
    if (this.zoneCard) { this.zoneCard.t += dt; if (this.zoneCard.t > 4.5) this.zoneCard = null; }
    if (this.vision) this.vision.t += dt;
    const lbT = this.director.blocking && this.mode === 'juego' ? 1 : 0;
    this.letterbox += (lbT - this.letterbox) * Math.min(1, dt * 4);
  }
  updateAmbient(dt) {
    const e = this.envName;
    const wind = e === 'crater' || e === 'llanura' ? 1 : e === 'velo' ? 0.8 : e === 'titulo' ? 0.6 : e === 'final' ? 0.7 : 0.15;
    const drone = (this.flags.introMetal ? 1 : 0) + (e === 'estacion' ? 0.5 : 0) + (e === 'huida' ? 0.8 : 0) + (e === 'santuario' ? 0.25 : 0);
    this.sound.update(dt, { wind, drone, hum: this.crystalHum || 0, alarm: this.alarm, music: this.music, musicVar: this.musicVar });
    if (this.flags.introMetal && Math.random() < dt * 3) this.sound.sfx('metal');
  }
}

export { STATE };
