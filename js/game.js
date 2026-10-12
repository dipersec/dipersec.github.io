// game.js — Estado del juego y update() del Nivel 1. Aquí no se dibuja nada: world.js y hud.js solo leen.
import { buildLevel1 } from './level1.js';
import { createPlayer, updatePlayer, setState, bounce, STATE } from './player.js';
import { overlaps, boxHit, groundBelow } from './physics.js';
import { CONFIG, jumpVel } from './config.js';
import { Pool } from './pool.js';
import { Director, setupStory } from './story.js';
import { Inspector } from './boss.js';

const CRATE = 0.9;
export const DEATH_LINES = [
  ['copia', 'Te lo dije. Bueno, no te lo dije, pero lo pensé muy fuerte.'],
  ['copia', 'Restaurando… otra vez… nadie restaura a la Copia de Seguridad.'],
  ['guia', 'Caer al vacío es una forma rápida de viajar. No recomendada.'],
  ['guia', 'Según mis datos, ese salto era fácil. Mis datos se equivocan con frecuencia.'],
  ['dip', '…*pop*']
];
const MEDALS = { oro: 150, plata: 190, bronce: 240 };

export class Game {
  constructor(sound, input) {
    this.sound = sound; this.input = input;
    this.L = buildLevel1();
    this.solids = this.L.solids;
    this.player = createPlayer(0, 0, 3);
    this.mode = 'titulo'; this.paused = false; this.trial = false;
    this.time = 0; this.runTime = 0; this.timerOn = false;
    this.view = { w: 640, h: 360 };
    this.cam = { x: 0, y: 3, z: 10, yaw: 0, anchor: 0, shake: 0, fix: null, look: { x: 0, y: 1, z: 0 }, speed: 3 };
    this.prev = { px: 0, py: 0, pz: 0, cx: 0, cy: 0, cz: 0 }; this.alpha = 1;
    this.flags = {}; this.fx = { notice: 0, bubbles: false, guiaBook: -1, packet: -1, sofaFly: -1, flash: 0 };
    this.lives = 4; this.fragments = 0; this.copias = 0; this.superT = 0;
    this.cratesBroken = 0; this.cratesTotal = this.L.crates.length; this.fragsGot = 0;
    this.checkpoint = this.L.checkpoints[0];
    this.deathsHere = 0; this.deaths = 0; this.lastLine = -1; this.safe = [];
    this.dialog = null; this.bubble = null; this.guiaTip = null; this.toast = null; this.sectionCard = null;
    this.fade = { a: 1, target: 1, speed: 1, color: '#05070d' };
    this.letterbox = 0; this.hitStop = 0; this.hurtFlash = 0; this.dustT = 0; this.ladder = { n: 0, t: 0 };
    this.fragBump = 0;
    this.auto = null;  // control guionado { x, z, jump }
    this.chase = { on: false, done: false, z: 0, speed: 0 };
    this.section = this.L.sections[0]; this.seenSections = new Set();
    this.shards = new Pool(() => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, life: 0, kind: 0 }), 160);
    this.particles = new Pool(() => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, g: 0, drag: 0, r: 1, gg: 1, b: 1, size: 1 }), 700);
    this.popFrags = new Pool(() => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0 }), 60);
    // sólidos de las cajas
    for (const c of this.L.crates) {
      c.s = { x0: c.x - CRATE / 2, x1: c.x + CRATE / 2, y0: c.y, y1: c.y + CRATE, z0: c.z - CRATE / 2, z1: c.z + CRATE / 2, active: true, crate: c, mat: 'caja' };
      this.solids.push(c.s);
      if (c.type === 'fragmentos') c.hits = 0;
    }
    this.boss = new Inspector(this);
    this.director = new Director(this);
    setupStory(this);
    this.save = this.loadSave();
    this.touchUI = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
    this.wish = { x: 0, z: 0 }; this.pin = { jumpPressed: false, jumpHeld: false, spinPressed: false };
    this.hooks = {
      onJump: () => { this.sound.sfx('salto'); this.player.sq = CONFIG.stretchJump; this.dust(5, 1.2); },
      onLand: (vy) => {
        const k = Math.min(1, Math.max(0, -vy) / 22);
        this.sound.sfx(k > 0.6 ? 'caida_fuerte' : 'caida');
        this.player.sq = 1 - (1 - CONFIG.squashLand) * (0.35 + 0.65 * k);
        this.dust(Math.round(4 + k * 14), 1.2 + k * 2);
        if (k > 0.7) this.addTrauma(0.25);
      },
      onSpin: () => { this.sound.sfx('giro'); }
    };
  }

  // ---------- utilidades ----------
  loadSave() { try { return JSON.parse(localStorage.getItem('dip-suenio') || '{}'); } catch (e) { return {}; } }
  writeSave() { try { localStorage.setItem('dip-suenio', JSON.stringify(this.save)); } catch (e) { /* sin almacenamiento */ } }
  addTrauma(a) { this.cam.shake = Math.min(1, this.cam.shake + a); }
  savePrev() { const p = this.player.pos, c = this.cam, v = this.prev; v.px = p.x; v.py = p.y; v.pz = p.z; v.cx = c.x; v.cy = c.y; v.cz = c.z; }
  placePlayer(x, y, z) {
    const p = this.player; p.pos.x = x; p.pos.y = y; p.pos.z = z; p.vel.x = p.vel.y = p.vel.z = 0;
    p.onGround = false; setState(p, STATE.FALLING); p.sq = 1; p.spin = 0;
    this.cam.anchor = y; this.cam.snap = true;
  }
  openDialog(who, text) { this.dialog = { who, text, shown: 0 }; }
  say(who, text, dur = 2.6) { this.bubble = { who, text, t: 0, dur }; }
  tip(text, dur = 3.2) { this.guiaTip = { text, t: 0, dur }; this.sound.sfx('guia'); }
  showToast(text, dur = 2.5) { this.toast = { text, t: 0, dur }; }
  burst(x, y, z, n, rgb, { speed = 3, life = 0.6, g = 0, up = 0, drag = 0, size = 1 } = {}) {
    for (let i = 0; i < n; i++) this.particles.spawn(o => {
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2, v = speed * (0.4 + Math.random() * 0.6);
      o.x = x; o.y = y; o.z = z; o.vx = Math.cos(a) * Math.cos(b) * v; o.vy = Math.sin(b) * v + up; o.vz = Math.sin(a) * Math.cos(b) * v;
      o.life = o.max = life * (0.6 + Math.random() * 0.5); o.g = g; o.drag = drag; o.r = rgb[0]; o.gg = rgb[1]; o.b = rgb[2]; o.size = size;
    });
  }
  dust(n, speed) { const p = this.player.pos; this.burst(p.x, p.y + 0.05, p.z, n, [0.75, 0.78, 0.88], { speed, life: 0.45, g: -4, up: 0.8, drag: 2, size: 1.4 }); }

  // Pruebas de juego: ?seccion=1..4 empieza ahí (el jefe es la 4)
  skipTo(n) {
    this.mode = 'juego'; this.fade.a = this.fade.target = 0; this.player.hidden = false; this.timerOn = true; this.flags.sofaGone = true;
    const at = { 1: [0, 0, 3], 2: [0.5, 4.2, -109.5], 3: [0, 0, -216], 4: [0, 0, -329] }[n];
    for (const t of this.L.tips) if (t.z > at[2] + 0.5) t.done = true;
    for (const k of this.L.checkpoints) if (k.z >= at[2] - 0.5) k.on = true;
    this.checkpoint = this.L.checkpoints.filter(k => k.on).pop() || this.checkpoint;
    if (n >= 2) this.copias = 1;
    if (n >= 4) { this.chase.done = true; this.flags.sofaGone = true; }
    this.placePlayer(at[0], at[1], at[2]); this.savePrev();
  }

  start(trial = false) {
    this.trial = trial; this.mode = 'juego';
    if (trial) {
      this.fade.a = 0; this.fade.target = 0; this.placePlayer(0, 0, 3); this.timerOn = true; this.runTime = 0;
      this.player.hidden = false; this.cam.fix = null; this.flags.sofaGone = true;
    } else this.director.run('apertura');
  }

  // =====================================================================
  update(dt) {
    const inp = this.input;
    this.time += dt;
    if (inp.pressed.mute) this.sound.toggleMute();
    if (this.mode === 'titulo') {
      if (inp.pressed.trial && this.save.done) this.start(true);
      else if (inp.pressed.confirm || inp.pressed.jump || inp.pressed.spin) this.start(false);
      this.updateCamera(dt); this.updateAmbient(dt); return;
    }
    if (this.mode === 'fin') {
      this.endT = (this.endT || 0) + dt; this.updateFade(dt); this.updateAmbient(dt);
      if (this.endT > 2.5) { if (inp.pressed.trial) location.href = location.pathname + '?contrarreloj'; else if (inp.pressed.confirm || inp.pressed.jump) location.href = location.pathname; }
      return;
    }
    if (inp.pressed.pause && !this.director.blocking) this.paused = !this.paused;
    if (this.paused) { if (inp.pressed.restart) location.reload(); return; }

    // diálogo de escena
    const dlg = this.dialog;
    if (dlg) {
      const before = Math.floor(dlg.shown);
      dlg.shown = Math.min(dlg.text.length, dlg.shown + dt * 45);
      if (Math.floor(dlg.shown) !== before && before % 2 === 0) this.sound.blip(dlg.who);
      if (inp.pressed.confirm || inp.pressed.jump || inp.pressed.spin) {
        if (dlg.shown < dlg.text.length) dlg.shown = dlg.text.length; else this.dialog = null;
        inp.pressed.jump = inp.pressed.spin = false;
      }
    }
    this.director.update(dt);
    const blocking = this.director.blocking;
    if (this.timerOn && !blocking) this.runTime += dt;

    this.updatePlayerStep(dt, blocking);
    this.updateCrates(dt);
    this.updateFragments(dt);
    this.updateBichos(dt);
    this.updateFormas(dt);
    this.updateFalling(dt);
    this.updatePickups();
    this.updateChase(dt);
    this.boss.update(dt);
    this.updateParticles(dt);
    this.updateFx(dt);
    if (!blocking) { this.checkTips(); this.checkSection(); this.checkDeath(); }
    this.updateCamera(dt);
    this.updateFade(dt);
    this.updateTimers(dt);
    this.updateAmbient(dt);
  }

  // ---------- jugador ----------
  updatePlayerStep(dt, blocking) {
    const p = this.player, inp = this.input;
    if (p.hidden) return;
    // dirección relativa a la cámara: adelante = hacia donde mira la cámara
    let mx = 0, my = 0;
    if (this.auto) { mx = this.auto.x; my = this.auto.y; }
    else if (!blocking) { const m = inp.move; mx = m.x; my = m.y; }
    // La dirección se fija mientras se mantiene el control: si la cámara gira (persecución), DIP
    // sigue corriendo hacia donde iba hasta que sueltes; al volver a pulsar se usa la cámara nueva.
    const camYawTarget = this.boss.active ? 0 : this.chase.on ? Math.PI : 0;
    if (mx * mx + my * my < 0.01 || this.inputYaw === undefined) this.inputYaw = camYawTarget;
    const yaw = this.inputYaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    this.wish.x = rx * mx + fx * my; this.wish.z = rz * mx + fz * my;
    const pin = this.pin;
    pin.jumpPressed = !blocking && inp.pressed.jump || !!(this.auto && this.auto.jump);
    pin.jumpHeld = !blocking && inp.jumpHeld || !!(this.auto && this.auto.jump);
    pin.spinPressed = !blocking && inp.pressed.spin;
    if (this.auto) this.auto.jump = false;
    const prevGround = p.ground;
    updatePlayer(p, this.wish, pin, this.solids, dt, this.hooks);
    // lado al que mira en pantalla (según la cámara real)
    const cyaw = this.cam.yaw, sx = p.vel.x * Math.cos(cyaw) - p.vel.z * Math.sin(cyaw);
    if (Math.abs(sx) > 0.6) p.face = Math.sign(sx);
    // pisar cajas: rebotar y romperlas
    if (p.onGround && p.ground && p.ground.crate && p.landVel < -2) this.stompCrate(p.ground.crate);
    else if (p.onGround && p.ground && p.ground.crate && p.ground !== prevGround && p.ground.crate.type === 'cristal') this.stompCrate(p.ground.crate);
    if (p.ceiling && p.ceiling.crate) this.hitCrate(p.ceiling.crate, 'cabeza');
    if (p.onGround && p.ground && p.ground.falling) { const f = this.L.falling.find(q => q.s === p.ground); if (f && f.state === 'firme') { f.state = 'tiembla'; f.t = 0; this.sound.sfx('crujido'); } }
    // giro: alcance sobre cajas y enemigos
    if (p.spin > 0) this.spinHits();
    // polvo al correr
    if (p.state === STATE.RUNNING && p.onGround && Math.hypot(p.vel.x, p.vel.z) > 4) {
      this.dustT -= dt; if (this.dustT <= 0) { this.dustT = CONFIG.runDustEvery; this.dust(2, 0.8); this.sound.sfx('paso'); }
    }
    if (p.spin > 0 && Math.random() < 0.6) this.burst(p.pos.x, p.pos.y + 0.8, p.pos.z, 1, [0.75, 0.92, 1], { speed: 2.5, life: 0.25, size: 0.8 });
    // lugares seguros para la ayuda dinámica
    if (p.onGround && p.ground && !p.ground.crate && !p.ground.falling && (this.time % 0.5) < dt) {
      this.safe.push({ x: p.pos.x, y: p.pos.y, z: p.pos.z }); if (this.safe.length > 80) this.safe.shift();
    }
    if (this.superT > 0) { this.superT -= dt; if (this.superT <= 0) { this.copias = 2; this.sound.musicFast = false; } }
  }

  hurt(fromX, fromZ, cause = 'golpe') {
    const p = this.player;
    if (p.invuln > 0 || p.state === STATE.DEAD || this.director.blocking || p.hidden) return;
    if (this.superT > 0) return;
    if (this.copias > 0) {
      this.copias--; p.invuln = 1.2; this.sound.sfx('copia_rompe'); this.addTrauma(0.45); this.hitStop = CONFIG.hitStop; this.hurtFlash = 0.6;
      const dx = p.pos.x - fromX, dz = p.pos.z - fromZ, d = Math.hypot(dx, dz) || 1;
      p.vel.x = dx / d * 6; p.vel.z = dz / d * 6; p.vel.y = 6; p.onGround = false; setState(p, STATE.HURT);
      this.say('copia', ['Otra vez me destruyen. Qué novedad.', 'Auch. Por ti. Siempre por ti.'][Math.floor(Math.random() * 2)]);
      return;
    }
    this.die(cause);
  }
  die(cause = 'golpe') {
    const p = this.player; this.lastCause = cause;
    if (p.state === STATE.DEAD || this.director.blocking) return;
    setState(p, STATE.DEAD); p.vel.x = p.vel.z = 0;
    this.sound.sfx('muerte'); this.addTrauma(0.6); this.hitStop = CONFIG.hitStop; this.hurtFlash = 1;
    this.burst(p.pos.x, p.pos.y + 0.8, p.pos.z, 24, [0.6, 0.85, 1], { speed: 5, life: 0.7, size: 1.2 });
    this.director.run('reaparecer');
  }
  deathLine() {
    if (this.deathsHere >= 10 && !this.flags.tendencia) { this.flags.tendencia = true; return ['guia', 'Consejo: prueba a no morir. Es tendencia.']; }
    let i; do { i = Math.floor(Math.random() * DEATH_LINES.length); } while (i === this.lastLine && DEATH_LINES.length > 1);
    this.lastLine = i; return DEATH_LINES[i];
  }

  // ---------- cajas ----------
  stompCrate(c) {
    const p = this.player;
    if (!c.alive) return;
    if (c.type === 'rebote') { bounce(p, CONFIG.bounceBoxMult * (this.input.jumpHeld ? 1.12 : 1)); this.sound.sfx('rebote'); c.hits++; c.squash = 1; this.giveFrag(c.x, c.y + 1, c.z); if (c.hits >= 5) this.breakCrate(c); return; }
    if (c.type === 'cristal') {
      c.hits++; c.squash = 1;
      if (c.hits >= 2) { this.breakCrate(c); return; }
      this.sound.sfx('cristal_raja'); return;
    }
    if (c.type === 'tnt') { bounce(p); this.startTnt(c); return; }
    bounce(p, this.input.jumpHeld ? CONFIG.bounceMult * 1.15 : CONFIG.bounceMult);
    this.hitCrate(c, 'pisar');
  }
  hitCrate(c, how) {
    if (!c.alive) return;
    if (c.type === 'tnt') { if (how === 'giro') this.explode(c); else this.startTnt(c); return; }
    if (c.type === 'fragmentos' && how !== 'giro') { c.hits++; c.squash = 1; this.giveFrag(c.x, c.y + 1, c.z); this.sound.sfx('rebote'); if (c.hits >= 6) this.breakCrate(c); return; }
    if (c.type === 'rebote' && how !== 'giro') { c.squash = 1; return; }
    this.breakCrate(c);
  }
  breakCrate(c) {
    if (!c.alive) return;
    c.alive = false; c.s.active = false; this.cratesBroken++;
    this.sound.sfx(c.type === 'cristal' ? 'cristal' : 'caja');
    const n = c.type === 'fragmentos' ? Math.max(1, 6 - c.hits) : c.type === 'normal' ? 1 + Math.floor(Math.random() * 2) : 0;
    for (let i = 0; i < n; i++) this.giveFrag(c.x, c.y + 0.5, c.z);
    for (let i = 0; i < 10; i++) this.shards.spawn(o => {
      o.x = c.x + (Math.random() - 0.5) * 0.6; o.y = c.y + 0.45 + (Math.random() - 0.5) * 0.6; o.z = c.z + (Math.random() - 0.5) * 0.6;
      o.vx = (Math.random() - 0.5) * 7; o.vy = 3 + Math.random() * 5; o.vz = (Math.random() - 0.5) * 7; o.rx = Math.random() * 6; o.ry = Math.random() * 6; o.life = 1.1;
      o.kind = c.type === 'cristal' ? 1 : c.type === 'tnt' ? 2 : 0;
    });
    if (c.type === 'checkpoint') this.setCheckpoint({ x: c.x, y: c.y, z: c.z, sec: this.section.n });
    // cajas apoyadas encima caen
    for (const o of this.L.crates) if (o.alive && Math.abs(o.x - c.x) < 0.1 && Math.abs(o.z - c.z) < 0.1 && o.y > c.y + 0.5) { o.y -= CRATE; o.s.y0 -= CRATE; o.s.y1 -= CRATE; }
  }
  startTnt(c) { if (c.fuse === undefined) { c.fuse = 3; c.beep = 0; this.sound.sfx('tnt'); } }
  explode(c) {
    if (!c.alive) return;
    c.alive = false; c.s.active = false; this.cratesBroken++; c.fuse = undefined;
    this.sound.sfx('explosion'); this.addTrauma(0.7);
    this.burst(c.x, c.y + 0.5, c.z, 40, [1, 0.55, 0.2], { speed: 9, life: 0.7, size: 2 });
    this.burst(c.x, c.y + 0.5, c.z, 20, [0.3, 0.3, 0.35], { speed: 4, life: 1.2, up: 2, drag: 1.5, size: 2.5 });
    const R = 2.4;
    for (const o of this.L.crates) if (o.alive && Math.hypot(o.x - c.x, o.y - c.y, o.z - c.z) < R) { if (o.type === 'tnt') { o.fuse = 0.15; } else this.breakCrate(o); }
    for (const b of this.L.bichos) if (b.alive && Math.hypot(b.x - c.x, b.z - c.z) < R) this.killBicho(b, c.x, c.z);
    const p = this.player.pos;
    if (Math.hypot(p.x - c.x, p.y + 0.8 - (c.y + 0.45), p.z - c.z) < R + 0.3) this.hurt(c.x, c.z, 'explosion');
  }
  updateCrates(dt) {
    for (const c of this.L.crates) {
      if (c.squash) c.squash = Math.max(0, c.squash - dt * 6);
      if (c.alive && c.fuse !== undefined) {
        const prev = Math.ceil(c.fuse); c.fuse -= dt;
        if (Math.ceil(c.fuse) !== prev && c.fuse > 0) this.sound.sfx('tnt');
        if (c.fuse <= 0) this.explode(c);
      }
    }
  }
  spinHits() {
    const p = this.player.pos, R = CONFIG.spinRadius;
    for (const c of this.L.crates) {
      if (!c.alive) continue;
      const dx = c.x - p.x, dz = c.z - p.z;
      if (Math.abs(dx) < R + 0.45 && Math.abs(dz) < R + 0.45 && c.y < p.y + 1.5 && c.y + CRATE > p.y - 0.2) this.hitCrate(c, 'giro');
    }
    for (const b of this.L.bichos) if (b.alive && !b.launched && Math.hypot(b.x - p.x, b.z - p.z) < R + 0.4 && Math.abs(b.y - p.y) < 1.4) this.killBicho(b, p.x, p.z, true);
    this.boss.onSpin(p);
  }

  // ---------- fragmentos ----------
  giveFrag(x, y, z) {
    this.popFrags.spawn(o => { o.x = x; o.y = y; o.z = z; o.vx = (Math.random() - 0.5) * 3; o.vy = 5 + Math.random() * 2; o.vz = (Math.random() - 0.5) * 3; o.t = 0; });
  }
  collectFrag(x, y, z) {
    this.fragments++; this.fragsGot++; this.fragBump = 1;
    this.ladder.n = this.ladder.t > 0 ? Math.min(this.ladder.n + 1, 14) : 0; this.ladder.t = 1;
    this.sound.fragment(this.ladder.n);
    this.burst(x, y, z, 4, [1, 0.85, 0.4], { speed: 2, life: 0.3, size: 0.8 });
    if (this.fragments >= 100) { this.fragments -= 100; this.lives++; this.sound.sfx('vida'); this.showToast('¡Vida extra!'); }
  }
  updateFragments(dt) {
    const p = this.player.pos, M = CONFIG.magnetRadius;
    this.ladder.t = Math.max(0, this.ladder.t - dt);
    this.fragBump = Math.max(0, this.fragBump - dt * 4);
    if (this.player.hidden) return;
    for (const f of this.L.frags) {
      if (!f.alive) continue;
      const dx = p.x - f.x, dy = p.y + 0.8 - f.y, dz = p.z - f.z, d = Math.hypot(dx, dy, dz);
      if (d < 0.75) { f.alive = false; this.collectFrag(f.x, f.y, f.z); }
      else if (d < M) { const k = Math.min(1, dt * 12 * (1 - d / M + 0.3)); f.x += dx * k; f.y += dy * k; f.z += dz * k; }
    }
    this.popFrags.forEachActive(o => {
      o.t += dt;
      const dx = p.x - o.x, dy = p.y + 0.8 - o.y, dz = p.z - o.z, d = Math.hypot(dx, dy, dz);
      if (o.t > 0.35) { const k = Math.min(1, dt * 10); o.x += dx * k; o.y += dy * k; o.z += dz * k; }
      else { o.vy -= 18 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt; }
      if (d < 0.6 || o.t > 2) { o.active = false; this.collectFrag(o.x, o.y, o.z); }
    });
  }

  // ---------- enemigos ----------
  updateBichos(dt) {
    const p = this.player;
    for (const b of this.L.bichos) {
      if (!b.alive) continue;
      b.t += dt;
      if (b.launched) {
        b.vy -= 20 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.spinA = (b.spinA || 0) + dt * 18;
        if (b.t > 1.4) b.alive = false;
        continue;
      }
      // patrulla con saltos glitch de unos centímetros
      const k = b.axis === 'x' ? 'x' : 'z', home = b.axis === 'x' ? b.hx : b.hz;
      b[k] += b.dir * 1.4 * dt;
      if (Math.abs(b[k] - home) > b.range) { b[k] = home + Math.sign(b[k] - home) * b.range; b.dir *= -1; }
      b.glitch = Math.max(0, b.glitch - dt);
      if (b.t > 1.1 + Math.random() * 0.4) { b.t = 0; b.glitch = 0.12; b.x += (Math.random() - 0.5) * 0.5; b.z += (Math.random() - 0.5) * 0.5; }
      if (p.hidden || p.state === STATE.DEAD) continue;
      const dx = p.pos.x - b.x, dz = p.pos.z - b.z;
      if (Math.abs(dx) < 0.62 && Math.abs(dz) < 0.62 && p.pos.y < b.y + 0.8 && p.pos.y + p.h > b.y) {
        if (p.vel.y < -1 && p.pos.y > b.y + 0.25) { this.killBicho(b, p.pos.x, p.pos.z); bounce(p, this.input.jumpHeld ? 1.05 : CONFIG.bounceMult); }
        else if (p.spin <= 0) this.hurt(b.x, b.z, 'bicho');
      }
    }
  }
  killBicho(b, fx, fz, launch = false) {
    this.sound.sfx('bicho'); this.hitStop = Math.max(this.hitStop, 0.05); this.addTrauma(0.15);
    this.burst(b.x, b.y + 0.3, b.z, 12, [1, 0.3, 0.8], { speed: 4, life: 0.4, size: 1 });
    if (launch) {
      const dx = b.x - fx, dz = b.z - fz, d = Math.hypot(dx, dz) || 1;
      b.launched = true; b.t = 0; b.vx = dx / d * 12; b.vz = dz / d * 12 - 4; b.vy = 7;
    } else b.alive = false;
    this.giveFrag(b.x, b.y + 0.5, b.z);
  }
  updateFormas(dt) {
    const p = this.player;
    for (const f of this.L.formas) {
      if (!f.alive) continue;
      f.t += dt;
      if (this.chase.on && f.z > this.chase.z) continue;
      f.x += f.dir * f.speed * dt;
      if (Math.abs(f.x - f.hx) > f.range) { f.x = f.hx + Math.sign(f.x - f.hx) * f.range; f.dir *= -1; }
      if (p.hidden || p.state === STATE.DEAD) continue;
      if (Math.abs(p.pos.x - f.x) < 1.05 && Math.abs(p.pos.z - f.z) < 0.95 && p.pos.y < f.y + 1.1) {
        if (p.vel.y < -1 && p.pos.y > f.y + 0.7) { bounce(p, 0.9); this.sound.sfx('rebote'); }
        else this.hurt(f.x, f.z, 'formateadora');
      }
    }
  }
  updateFalling(dt) {
    const p = this.player;
    for (const f of this.L.falling) {
      f.t += dt;
      if (f.state === 'tiembla' && f.t > 0.5) { f.state = 'cae'; f.t = 0; f.vy = 0; this.sound.sfx('placa'); }
      if (f.state === 'cae') {
        f.vy -= 22 * dt; f.y += f.vy * dt; f.s.y0 = f.top - 0.35 + f.y; f.s.y1 = f.top + f.y;
        if (f.t > 1.2) { f.s.active = false; }
        if (f.t > 3.2 && !(p.pos.z < f.s.z1 + 0.5 && p.pos.z > f.s.z0 - 0.5 && Math.abs(p.pos.x - (f.s.x0 + f.s.x1) / 2) < 2)) { f.state = 'firme'; f.t = 0; f.y = 0; f.s.y0 = f.top - 0.35; f.s.y1 = f.top; f.s.active = true; }
      }
    }
  }
  updatePickups() {
    const p = this.player;
    if (p.hidden) return;
    for (const c of this.L.copias) {
      if (c.got || Math.hypot(p.pos.x - c.x, p.pos.z - c.z) > 0.9 || Math.abs(p.pos.y - c.y) > 1.5) continue;
      c.got = true; this.addCopia(c.first);
    }
    for (const pg of this.L.pages) {
      if (pg.got || Math.hypot(p.pos.x - pg.x, p.pos.z - pg.z) > 0.9 || Math.abs(p.pos.y - pg.y) > 1.6) continue;
      pg.got = true; this.sound.sfx('pagina');
      this.showToast(`Página de la Guía ${this.L.pages.filter(q => q.got).length}/4 · ${pg.title}`, 3);
    }
    for (const k of this.L.checkpoints) {
      if (k.on || p.pos.z > k.z) continue;
      k.on = true; if (!this.checkpoint || k.z < this.checkpoint.z) this.setCheckpoint(k, true);
    }
  }
  addCopia(first) {
    this.sound.sfx('copia');
    if (this.copias >= 2) { this.copias = 3; this.superT = 8; this.sound.musicFast = true; this.say('copia', '¿Tres? Somos invencibles. Por ocho segundos.'); return; }
    this.copias++;
    if (first && !this.trial) this.say('copia', 'Hola. Me crearon para protegerte. Moriré pronto. Es mi destino.', 4);
  }
  setCheckpoint(k, silent = false) {
    if (this.checkpoint !== k) { this.deathsHere = 0; this.flags.tendencia = false; this.flags.ayuda5 = false; }
    this.checkpoint = k;
    if (!silent) { this.sound.sfx('checkpoint'); this.burst(k.x, k.y + 1, k.z, 20, [0.6, 1, 0.8], { speed: 4, life: 0.8 }); }
  }

  // ---------- persecución del vacío ----------
  updateChase(dt) {
    const ch = this.chase, p = this.player, sp = this.L.spots;
    if (!ch.on && !ch.done && p.pos.z < sp.chaseStart.z && !p.hidden) this.director.run('persecucion', { block: false });
    if (!ch.on) return;
    ch.speed = Math.min(6.85, ch.speed + dt * 1.2);
    ch.z -= ch.speed * dt;
    for (const s of this.solids) if (!s.erased && s.z0 > ch.z && s.z0 < -200 && !s.wall) { s.erased = true; s.active = false; }
    if (p.pos.z > ch.z - 0.3 && p.state !== STATE.DEAD) this.die('vacio');
    if (p.pos.z < sp.chaseEnd.z) { ch.on = false; ch.done = true; this.director.run('finPersecucion'); }
    if (Math.random() < 0.6) this.burst((Math.random() - 0.5) * 8, Math.random() * 4, ch.z, 1, [0.5, 0.2, 0.9], { speed: 1, life: 0.6, size: 1.5 });
  }
  resetChase(z) {
    for (const s of this.solids) if (s.erased && !(s.crate && !s.crate.alive)) { s.erased = false; s.active = true; }
    this.chase.z = z + 10; this.chase.speed = 4.5;
  }

  // ---------- secciones, consejos, muerte ----------
  checkTips() {
    const p = this.player;
    for (const t of this.L.tips) {
      if (t.done || p.pos.z > t.z) continue;
      t.done = true;
      if (t.who === 'evento' || !this.trial) this.showTip(t);
    }
  }
  checkSection() {
    const z = this.player.pos.z, s = this.L.sections.find(q => z <= q.z0 && z > q.z1);
    if (s && s !== this.section) {
      this.section = s;
      if (!this.seenSections.has(s.n)) { this.seenSections.add(s.n); this.sectionCard = { n: s.n, name: s.name, t: 0 }; }
    }
  }
  checkDeath() { if (this.player.pos.y < -6 && this.player.state !== STATE.DEAD) this.die('vacio'); }

  // ---------- cámara ----------
  updateCamera(dt) {
    const p = this.player, c = this.cam, C = CONFIG;
    const damp = (a, b, l) => a + (b - a) * (1 - Math.exp(-l * dt));
    // ancla vertical: no sigue cada salto
    if (p.onGround || p.pos.y < c.anchor - C.camAnchorDrop || c.snap) c.anchor = p.pos.y;
    let tx, ty, tz, lx, ly, lz;
    if (c.fix) { tx = c.fix.x; ty = c.fix.y; tz = c.fix.z; lx = c.fix.lx; ly = c.fix.ly; lz = c.fix.lz; }
    else if (this.boss.active) {
      const a = this.L.spots.arena;
      tx = p.pos.x * 0.45; ty = 9.5; tz = a.z + 15; lx = p.pos.x * 0.55; ly = 1.2; lz = (p.pos.z + a.z - 4) / 2;
      c.yaw = damp(c.yaw, 0, C.camYawLambda);
    } else {
      const targetYaw = this.chase.on ? Math.PI : 0;
      c.yaw = damp(c.yaw, targetYaw, C.camYawLambda);
      const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw);
      // mientras gira (persecución) la cámara se acerca y sube para no atravesar las fachadas
      const turn = Math.abs(Math.sin(c.yaw)), dist = C.camDist * (1 - 0.6 * turn);
      tx = p.pos.x * 0.6 - fx * dist; ty = c.anchor + C.camHeight + 2.5 * turn; tz = p.pos.z - fz * dist;
      lx = p.pos.x * 0.8 + fx * C.camLookAhead; ly = c.anchor + 1; lz = p.pos.z + fz * C.camLookAhead;
    }
    if (c.snap) { c.x = tx; c.y = ty; c.z = tz; c.look.x = lx; c.look.y = ly; c.look.z = lz; c.snap = false; this.savePrev(); }
    else {
      const sp = c.fix ? c.speed : C.camFollowXZ;
      c.x = damp(c.x, tx, sp); c.z = damp(c.z, tz, sp); c.y = damp(c.y, ty, c.fix ? c.speed : C.camFollowY);
      const k = 1 - Math.exp(-10 * dt);
      c.look.x += (lx - c.look.x) * k; c.look.y += (ly - c.look.y) * k; c.look.z += (lz - c.look.z) * k;
    }
    c.shake = Math.max(0, c.shake - dt * C.shakeDecay);
    p.shadowY = groundBelow(p.pos.x, p.pos.y + 0.1, p.pos.z, this.solids);
  }
  updateFx(dt) {
    const f = this.fx, sp = this.L.spots;
    if (f.drone !== undefined && f.drone >= 0) { if (f.drone < 1) f.drone = Math.min(1, f.drone + dt / 2.2); else if (f.drone >= 2 && f.drone < 3) f.drone = Math.min(3, f.drone + dt / 2); }
    if (f.guiaBook >= 0) f.guiaBook += dt;
    if (f.sofaFly >= 0) f.sofaFly += dt;
    if (f.packet >= 0 && f.packet < 1) f.packet = Math.min(1, f.packet + dt / 4.5);
    if (f.bubbles && Math.random() < dt * 2.2) {
      const p = this.player.pos; this.sound.sfx('burbuja');
      this.particles.spawn(o => { o.x = p.x + 0.35; o.y = p.y + 1.3; o.z = p.z + 0.3; o.vx = 0.2 + Math.random() * 0.3; o.vy = 0.6 + Math.random() * 0.4; o.vz = 0.1; o.life = o.max = 2.4; o.g = 0; o.drag = 0; o.r = 0.8; o.gg = 0.95; o.b = 1; o.size = 2.4; });
    }
  }
  updateFade(dt) { const f = this.fade; if (f.a < f.target) f.a = Math.min(f.target, f.a + dt * f.speed); else if (f.a > f.target) f.a = Math.max(f.target, f.a - dt * f.speed); }
  updateParticles(dt) {
    this.particles.forEachActive(o => {
      o.vy -= o.g * dt; if (o.drag) { const k = Math.max(0, 1 - o.drag * dt); o.vx *= k; o.vy *= k; o.vz *= k; }
      o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt; o.life -= dt; if (o.life <= 0) o.active = false;
    });
    this.shards.forEachActive(o => {
      o.vy -= 22 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt; o.rx += dt * 9; o.ry += dt * 7;
      o.life -= dt; if (o.life <= 0) o.active = false;
    });
  }
  updateTimers(dt) {
    for (const k of ['bubble', 'guiaTip', 'toast']) { const o = this[k]; if (o) { o.t += dt; if (o.t > o.dur) this[k] = null; } }
    if (this.sectionCard) { this.sectionCard.t += dt; if (this.sectionCard.t > 3.2) this.sectionCard = null; }
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.5);
    this.fx.flash = Math.max(0, this.fx.flash - dt * 2);
    const lb = this.director.blocking && this.mode === 'juego' ? 1 : 0;
    this.letterbox += (lb - this.letterbox) * (1 - Math.exp(-dt * 6));
  }
  updateAmbient(dt) {
    const music = this.mode === 'titulo' ? 'titulo' : this.mode === 'fin' ? 'fin' : this.musicOverride || (this.boss.active ? 'jefe' : this.chase.on ? 'persecucion' : 'nivel');
    this.sound.update(dt, { music, fast: this.superT > 0, chase: this.chase.on ? 1 : 0 });
  }

  // ---------- final del nivel ----------
  finishLevel() {
    this.timerOn = false;
    const t = this.runTime, s = this.save;
    const medal = !this.trial ? null : t <= MEDALS.oro ? 'oro' : t <= MEDALS.plata ? 'plata' : t <= MEDALS.bronce ? 'bronce' : null;
    const allCrates = this.cratesBroken >= this.cratesTotal;
    s.done = true; s.seeds = s.seeds || {};
    if (allCrates) s.seeds.cajas = true;
    if (medal === 'oro') s.seeds.oro = true;
    if (this.trial && (!s.best || t < s.best)) s.best = t;
    s.pages = Array.from(new Set([...(s.pages || []), ...this.L.pages.filter(p => p.got).map(p => p.id)]));
    this.writeSave();
    this.result = { t, medal, allCrates, crates: this.cratesBroken, total: this.cratesTotal, frags: this.fragsGot, pages: this.L.pages.filter(p => p.got).length, deaths: this.deaths, seeds: Object.keys(s.seeds).length, best: s.best };
    this.mode = 'fin'; this.endT = 0;
  }
  showTip(t) {
    if (t.who === 'guia') { const T = this.tipsText?.[t.text]; if (T) this.tip(this.touchUI ? T.t : T.k); }
  }
}
export { STATE, MEDALS };
