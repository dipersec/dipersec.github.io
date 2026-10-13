// game.js — Estado del juego y update(). Aquí no se dibuja nada: world.js y hud.js solo leen.
// El núcleo es común a los siete mundos; cada mundo aporta sus datos desde mundos/registro.js.
import { mundo } from './mundos/registro.js';
import { createPlayer, updatePlayer, setState, bounce, STATE } from './player.js';
import { groundBelow } from './physics.js';
import { CONFIG } from './config.js';
import { Pool } from './pool.js';
import { Director } from './director.js';
import { Memorias } from './memoria.js';
import { cargar, guardar } from './guardado.js';
import * as E from './enemigos.js';

const CRATE = 0.9;

export class Game {
  constructor(sound, input, mundoId = 'nacar') {
    this.sound = sound; this.input = input;
    this.M = mundo(mundoId);
    this.L = this.M.construir();
    this.solids = this.L.solids;
    this.save = cargar();
    this.ajustes = this.save.ajustes;
    this.player = createPlayer(0, 0, 4);
    this.mode = 'titulo'; this.paused = false; this.trial = false;
    this.time = 0; this.runTime = 0; this.timerOn = false;
    this.view = { w: 640, h: 360 };
    this.cam = { x: 0, y: 3, z: 10, yaw: 0, anchor: 0, shake: 0, fix: null, look: { x: 0, y: 1, z: 0 }, speed: 3 };
    this.prev = { px: 0, py: 0, pz: 0, cx: 0, cy: 0, cz: 0 }; this.alpha = 1;
    this.flags = {}; this.fx = { flash: 0, recolector: 0, guardianSube: 0, nucleo: 0, salida: 0, lunex: -1, senal: -1, pantalla: 0, tiloSalta: 0 };
    this.habilidades = new Set();
    this.lives = 4; this.fragments = 0; this.conchas = 0; this.superT = 0;
    this.cratesBroken = 0; this.cratesTotal = this.L.crates.length; this.fragsGot = 0;
    this.checkpoint = this.L.checkpoints[0];
    this.deathsHere = 0; this.deaths = 0; this.lastLine = -1; this.safe = [];
    this.dialog = null; this.bubble = null; this.guiaTip = null; this.toast = null; this.sectionCard = null; this.objetivo = null;
    this.fade = { a: 1, target: 1, speed: 1, color: '#0d0a14' };
    this.letterbox = 0; this.hitStop = 0; this.hurtFlash = 0; this.dustT = 0; this.ladder = { n: 0, t: 0 };
    this.fragBump = 0;
    this.auto = null;
    this.chase = { on: false, done: false, z: 0, speed: 0 };
    this.section = this.L.sections[0]; this.seenSections = new Set();
    this.shards = new Pool(() => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, life: 0, kind: 0 }), 160);
    this.particles = new Pool(() => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, g: 0, drag: 0, r: 1, gg: 1, b: 1, size: 1 }), 700);
    this.popFrags = new Pool(() => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0 }), 60);
    this.ondas = new Pool(() => ({ x: 0, y: 0, z: 0, r: 0, speed: 6, max: 7, hit: false }), 16);
    for (const c of this.L.crates) {
      c.s = { x0: c.x - CRATE / 2, x1: c.x + CRATE / 2, y0: c.y, y1: c.y + CRATE, z0: c.z - CRATE / 2, z1: c.z + CRATE / 2, active: true, crate: c, mat: 'caja' };
      this.solids.push(c.s);
    }
    this.memorias = new Memorias(this);
    this.boss = new this.M.Jefe(this);
    this.director = new Director(this);
    this.M.historia(this);
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
    this.aplicarAjustes();
  }

  // ---------- utilidades ----------
  get efectos() { return !this.ajustes.efectosReducidos; }
  aplicarAjustes() { this.sound.setVolume?.(this.ajustes.volumen / 100); }
  writeSave() { guardar(this.save); }
  saveProgress() {
    if (this.trial || this.mode !== 'juego') return;
    const k = this.checkpoint;
    this.save.progreso = { mundo: this.M.id, ck: { x: k.x, y: k.y, z: k.z, sec: k.sec }, vidas: this.lives, particulas: this.fragments, conchas: Math.min(2, this.conchas) };
    this.save.habilidades = [...this.habilidades];
    this.writeSave();
  }
  addTrauma(a) { if (this.efectos) this.cam.shake = Math.min(1, this.cam.shake + a); }
  savePrev() { const p = this.player.pos, c = this.cam, v = this.prev; v.px = p.x; v.py = p.y; v.pz = p.z; v.cx = c.x; v.cy = c.y; v.cz = c.z; }
  placePlayer(x, y, z) {
    const p = this.player; p.pos.x = x; p.pos.y = y; p.pos.z = z; p.vel.x = p.vel.y = p.vel.z = 0;
    p.onGround = false; setState(p, STATE.FALLING); p.sq = 1; p.spin = 0;
    this.cam.anchor = y; this.cam.snap = true;
  }
  openDialog(who, text) { this.dialog = { who, text, shown: 0 }; }
  say(who, text, dur = 2.6) { this.bubble = { who, text, t: 0, dur }; }
  tip(text, dur = 3.2) { this.guiaTip = { text, t: 0, dur }; this.sound.sfx('tip'); }
  showToast(text, dur = 2.5) { this.toast = { text, t: 0, dur }; }
  burst(x, y, z, n, rgb, { speed = 3, life = 0.6, g = 0, up = 0, drag = 0, size = 1 } = {}) {
    if (!this.efectos) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) this.particles.spawn(o => {
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2, v = speed * (0.4 + Math.random() * 0.6);
      o.x = x; o.y = y; o.z = z; o.vx = Math.cos(a) * Math.cos(b) * v; o.vy = Math.sin(b) * v + up; o.vz = Math.sin(a) * Math.cos(b) * v;
      o.life = o.max = life * (0.6 + Math.random() * 0.5); o.g = g; o.drag = drag; o.r = rgb[0]; o.gg = rgb[1]; o.b = rgb[2]; o.size = size;
    });
  }
  dust(n, speed) { const p = this.player.pos; this.burst(p.x, p.y + 0.05, p.z, n, [0.86, 0.78, 0.74], { speed, life: 0.45, g: -4, up: 0.8, drag: 2, size: 1.4 }); }

  // ---------- empezar, continuar y saltar a una sección ----------
  // Coloca a DIP en un punto de control y deja el mundo como si ya hubiera pasado todo lo anterior.
  irA(k, { vidas, particulas, conchas } = {}) {
    this.mode = 'juego'; this.fade.a = this.fade.target = 0; this.player.hidden = false; this.timerOn = true; this.cam.fix = null;
    const pr = this.M.progresoHasta(k.z);
    for (const t of this.L.tips) if (t.z > k.z + 0.5) t.done = true;
    for (const c of this.L.checkpoints) if (c.z >= k.z - 0.5) c.on = true;
    if (pr.tilo) this.flags.tilo = true;
    if (pr.recolector) { for (const q of this.L.piezas) { q.got = true; q.carrier = null; } this.L.recolector.active = false; this.fx.recolector = 1; }
    if (pr.recordar) { this.habilidades.add('recordar'); for (const c of this.L.cristales) c.got = true; }
    if (pr.jefe) { this.boss.defeated = true; this.boss.gone = false; this.boss.off = 1; this.flags.jefe = true; this.flags.nucleoVisto = true; this.L.salida.active = false; this.fx.salida = 1; this.fx.nucleo = 1; this.fx.guardianSube = 1; }
    for (const h of this.save.habilidades) if (h !== 'recordar' || pr.recordar) this.habilidades.add(h);
    if (vidas) this.lives = vidas; if (particulas) this.fragments = particulas; if (conchas) this.conchas = conchas;
    this.checkpoint = k; this.section = this.L.sections.find(s => s.n === k.sec) || this.section;
    this.seenSections.add(k.sec);
    this.placePlayer(k.x, k.y + 0.05, k.z); this.savePrev();
  }
  skipTo(n) {
    const k = this.L.checkpoints.find(c => c.sec === n);
    if (k) { this.irA(k); if (n >= 2) this.conchas = 1; }
  }
  continuar() {
    const pr = this.save.progreso;
    if (!pr || pr.mundo !== this.M.id) return this.start(false);
    this.irA(pr.ck, pr);
    this.showToast(this.L.sections.find(s => s.n === pr.ck.sec)?.name || 'Continuar', 2.2);
  }
  start(trial = false) {
    this.trial = trial; this.mode = 'juego';
    if (trial) { this.irA(this.L.checkpoints[0]); this.runTime = 0; }
    else { this.save.progreso = null; this.save.habilidades = []; this.writeSave(); this.director.run('apertura'); }
  }

  // =====================================================================
  update(dt) {
    const inp = this.input;
    this.time += dt;
    if (inp.pressed.mute) this.sound.toggleMute();
    if (this.mode === 'titulo') {
      if (inp.pressed.trial && this.save.completados[this.M.id]) this.start(true);
      else if (inp.pressed.nueva) this.start(false);
      else if (inp.pressed.confirm || inp.pressed.jump) { if (this.save.progreso) this.continuar(); else this.start(false); }
      this.updateCamera(dt); this.updateAmbient(dt); return;
    }
    if (this.mode === 'fin') {
      this.endT = (this.endT || 0) + dt; this.updateFade(dt); this.updateAmbient(dt);
      if (this.endT > 2.5) { if (inp.pressed.trial) location.href = location.pathname + '?contrarreloj'; else if (inp.pressed.confirm || inp.pressed.jump) location.href = location.pathname; }
      return;
    }
    if (inp.pressed.pause && !this.director.blocking) this.paused = !this.paused;
    if (this.paused) { if (inp.pressed.restart) this.reiniciarDesdeControl(); return; }

    const dlg = this.dialog;
    if (dlg) {
      const before = Math.floor(dlg.shown);
      dlg.shown = Math.min(dlg.text.length, dlg.shown + dt * 48);
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
    this.memorias.update(dt);
    if (!blocking && inp.pressed.recordar && !this.player.hidden && this.player.state !== STATE.DEAD) this.memorias.intentar();
    this.updateCrates(dt);
    this.updateFragments(dt);
    E.updateBichos(this, dt);
    E.updateBarredores(this, dt);
    E.updateCentinelas(this, dt);
    E.updateEsferas(this, dt);
    E.updateOndas(this, dt);
    E.updateEcos(this, dt);
    E.updatePuertas(this, dt);
    E.updateTemporales(this, dt);
    E.updateFalling(this, dt);
    this.updatePickups(dt);
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
  reiniciarDesdeControl() {
    this.paused = false;
    if (this.player.state !== STATE.DEAD && !this.director.blocking) this.die('reinicio');
  }

  // ---------- jugador ----------
  updatePlayerStep(dt, blocking) {
    const p = this.player, inp = this.input;
    if (p.hidden) return;
    let mx = 0, my = 0;
    if (this.auto) { mx = this.auto.x; my = this.auto.y; }
    else if (!blocking) { const m = inp.move; mx = m.x; my = m.y; }
    // La dirección se fija mientras se mantiene el control: si la cámara gira (huida), DIP sigue
    // corriendo hacia donde iba hasta que sueltes; al volver a pulsar se usa la cámara nueva.
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
    const cyaw = this.cam.yaw, sx = p.vel.x * Math.cos(cyaw) - p.vel.z * Math.sin(cyaw);
    if (Math.abs(sx) > 0.6) p.face = Math.sign(sx);
    if (p.onGround && p.ground && p.ground.crate && p.landVel < -2) this.stompCrate(p.ground.crate);
    else if (p.onGround && p.ground && p.ground.crate && p.ground !== prevGround && p.ground.crate.type === 'cristal') this.stompCrate(p.ground.crate);
    if (p.ceiling && p.ceiling.crate) this.hitCrate(p.ceiling.crate, 'cabeza');
    if (p.onGround && p.ground && p.ground.falling) { const f = this.L.falling.find(q => q.s === p.ground); if (f && f.state === 'firme') { f.state = 'tiembla'; f.t = 0; this.sound.sfx('crujido'); } }
    if (p.spin > 0) this.spinHits();
    if (p.state === STATE.RUNNING && p.onGround && Math.hypot(p.vel.x, p.vel.z) > 4) {
      this.dustT -= dt; if (this.dustT <= 0) { this.dustT = CONFIG.runDustEvery; this.dust(2, 0.8); this.sound.sfx('paso'); }
    }
    if (p.spin > 0 && Math.random() < 0.6) this.burst(p.pos.x, p.pos.y + 0.8, p.pos.z, 1, [0.9, 0.85, 1], { speed: 2.5, life: 0.25, size: 0.8 });
    if (p.onGround && p.ground && !p.ground.crate && !p.ground.falling && !p.ground.ghost && !p.ground.temp && !p.ground.folder && (this.time % 0.5) < dt) {
      this.safe.push({ x: p.pos.x, y: p.pos.y, z: p.pos.z }); if (this.safe.length > 80) this.safe.shift();
    }
    if (this.superT > 0) { this.superT -= dt; if (this.superT <= 0) { this.conchas = 2; this.sound.musicFast = false; } }
  }

  hurt(fromX, fromZ, cause = 'golpe') {
    const p = this.player;
    if (p.invuln > 0 || p.state === STATE.DEAD || this.director.blocking || p.hidden) return;
    if (this.superT > 0) return;
    if (this.conchas > 0) {
      this.conchas--; p.invuln = 1.2; this.sound.sfx('concha_rompe'); this.addTrauma(0.45); this.hitStop = CONFIG.hitStop; this.hurtFlash = this.efectos ? 0.6 : 0.3;
      const dx = p.pos.x - fromX, dz = p.pos.z - fromZ, d = Math.hypot(dx, dz) || 1;
      p.vel.x = dx / d * 6; p.vel.z = dz / d * 6; p.vel.y = 6; p.onGround = false; setState(p, STATE.HURT);
      return;
    }
    this.die(cause);
  }
  die(cause = 'golpe') {
    const p = this.player; this.lastCause = cause;
    if (p.state === STATE.DEAD || this.director.blocking) return;
    setState(p, STATE.DEAD); p.vel.x = p.vel.z = 0;
    this.sound.sfx('muerte'); this.addTrauma(0.6); this.hitStop = CONFIG.hitStop; this.hurtFlash = this.efectos ? 1 : 0.4;
    this.burst(p.pos.x, p.pos.y + 0.8, p.pos.z, 24, [0.6, 0.85, 1], { speed: 5, life: 0.7, size: 1.2 });
    this.director.run('reaparecer');
  }
  deathLine() {
    const list = this.flags.tilo ? this.M.muertes.despues : this.M.muertes.antes;
    if (this.deathsHere >= 10 && !this.flags.tendencia && this.flags.tilo) { this.flags.tendencia = true; return ['tilo', 'Diez caídas. Yo con diez caídas ya me como la montaña. Tú sigue.']; }
    let i; do { i = Math.floor(Math.random() * list.length); } while (i === this.lastLine && list.length > 1);
    this.lastLine = i; return list[i];
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
    for (const o of this.L.crates) if (o.alive && Math.abs(o.x - c.x) < 0.1 && Math.abs(o.z - c.z) < 0.1 && o.y > c.y + 0.5) { o.y -= CRATE; o.s.y0 -= CRATE; o.s.y1 -= CRATE; }
  }
  startTnt(c) { if (c.fuse === undefined) { c.fuse = 3; this.sound.sfx('tnt'); } }
  explode(c) {
    if (!c.alive) return;
    c.alive = false; c.s.active = false; this.cratesBroken++; c.fuse = undefined;
    this.sound.sfx('explosion'); this.addTrauma(0.7);
    this.burst(c.x, c.y + 0.5, c.z, 40, [1, 0.55, 0.2], { speed: 9, life: 0.7, size: 2 });
    this.burst(c.x, c.y + 0.5, c.z, 20, [0.3, 0.3, 0.35], { speed: 4, life: 1.2, up: 2, drag: 1.5, size: 2.5 });
    const R = 2.4;
    for (const o of this.L.crates) if (o.alive && Math.hypot(o.x - c.x, o.y - c.y, o.z - c.z) < R) { if (o.type === 'tnt') o.fuse = 0.15; else this.breakCrate(o); }
    for (const b of this.L.bichos) if (b.alive && Math.hypot(b.x - c.x, b.z - c.z) < R) E.killBicho(this, b, c.x, c.z);
    for (const s of this.L.centinelas) if (s.alive && Math.hypot(s.x - c.x, s.z - c.z) < R) E.matarCentinela(this, s, c.x, c.z, true);
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
    for (const b of this.L.bichos) if (b.alive && !b.launched && Math.hypot(b.x - p.x, b.z - p.z) < R + 0.4 && Math.abs(b.y - p.y) < 1.4) E.killBicho(this, b, p.x, p.z, true);
    E.spinCentinelas(this, p);
    this.boss.onSpin(p);
  }

  // ---------- partículas (lo que se colecciona) ----------
  giveFrag(x, y, z) {
    this.popFrags.spawn(o => { o.x = x; o.y = y; o.z = z; o.vx = (Math.random() - 0.5) * 3; o.vy = 5 + Math.random() * 2; o.vz = (Math.random() - 0.5) * 3; o.t = 0; });
  }
  collectFrag(x, y, z) {
    this.fragments++; this.fragsGot++; this.fragBump = 1;
    this.ladder.n = this.ladder.t > 0 ? Math.min(this.ladder.n + 1, 14) : 0; this.ladder.t = 1;
    this.sound.fragment(this.ladder.n);
    this.burst(x, y, z, 4, [1, 0.88, 0.95], { speed: 2, life: 0.3, size: 0.8 });
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

  // ---------- recogibles, piezas y puntos de control ----------
  updatePickups(dt) {
    const p = this.player;
    if (p.hidden || p.state === STATE.DEAD) return;
    const cerca = (o, r = 0.9, h = 1.6) => Math.hypot(p.pos.x - o.x, p.pos.z - o.z) < r && Math.abs(p.pos.y - o.y) < h;
    for (const c of this.L.conchas) { if (!c.got && cerca(c, 0.9, 1.5)) { c.got = true; this.addConcha(c.first); } }
    for (const r of this.L.registros) {
      if (r.got || !cerca(r)) continue;
      r.got = true; this.sound.sfx('registro');
      if (!this.save.registros.includes(this.M.id + r.id)) { this.save.registros.push(this.M.id + r.id); this.writeSave(); }
      this.showToast(`Registro ${this.L.registros.filter(q => q.got).length}/${this.L.registros.length} · ${r.title}`, 3);
    }
    for (const q of this.L.piezas) {
      if (q.got || !q.free) continue;
      if (q.pop !== undefined && q.pop < 1) { q.pop = Math.min(1, q.pop + dt * 2.5); continue; }
      if (!cerca(q, 1.0, 1.8)) continue;
      q.got = true; this.sound.sfx('pieza');
      const n = this.L.piezas.filter(o => o.got).length;
      this.burst(q.x, q.y + 0.8, q.z, 14, [1, 0.85, 0.5], { speed: 3, life: 0.5 });
      if (n < 3) this.showToast(`Pieza del recolector ${n}/3`, 1.8);
      else if (this.flags.tilo) this.say('tilo', '¡Las tres! Llévalas al recolector, junto a la salida.', 3);
    }
    // con las tres piezas, el recolector se repara al acercarse
    const r = this.L.spots.recolector;
    if (r && this.L.recolector.active && this.L.piezas.every(q => q.got) && Math.hypot(p.pos.x - r.x, p.pos.z - r.z) < 7.5) this.director.run('reparar');
    for (const k of this.L.checkpoints) {
      if (k.on || p.pos.z > k.z) continue;
      k.on = true; if (!this.checkpoint || k.z < this.checkpoint.z) this.setCheckpoint(k, true);
    }
  }
  addConcha(first) {
    this.sound.sfx('concha');
    if (this.conchas >= 2) { this.conchas = 3; this.superT = 8; this.sound.musicFast = true; this.showToast('Nácar pleno: 8 s invulnerable', 2); return; }
    this.conchas++;
    if (first && !this.trial) this.say(this.flags.tilo ? 'tilo' : 'dip', this.flags.tilo ? '¡Una concha de nácar! Aguanta un golpe por ti. Luego se ofende.' : 'Una concha… brilla como si me conociera.', 3.4);
  }
  setCheckpoint(k, silent = false) {
    if (this.checkpoint !== k) { this.deathsHere = 0; this.flags.tendencia = false; this.flags.ayuda5 = false; this.flags.extraCk = false; }
    this.checkpoint = k;
    if (!silent) { this.sound.sfx('checkpoint'); this.burst(k.x, k.y + 1, k.z, 20, [0.85, 0.95, 1], { speed: 4, life: 0.8 }); }
    this.saveProgress();
  }

  // ---------- huida: la estación se reconfigura detrás de DIP ----------
  updateChase(dt) {
    const ch = this.chase, p = this.player, C = this.L.chase;
    if (!C) return;
    if (!ch.on && !ch.done && this.flags.jefe && p.pos.z < C.start && !p.hidden) this.director.run('persecucion', { block: false });
    if (!ch.on) return;
    ch.speed = Math.min(6.85, ch.speed + dt * 1.2);
    ch.z -= ch.speed * dt;
    for (const s of this.solids) if (!s.erased && !s.wall && s.z0 > ch.z && s.z0 < C.zona[0] && s.z0 > C.zona[1]) { s.erased = true; s.active = false; }
    if (p.pos.z > ch.z - 0.3 && p.state !== STATE.DEAD) this.die('reconfiguracion');
    if (p.pos.z < this.L.spots.chaseEnd.z) { ch.on = false; ch.done = true; this.restaurarBorrados(); this.director.run('finPersecucion'); }
    if (Math.random() < 0.6) this.burst((Math.random() - 0.5) * 8, Math.random() * 4, ch.z, 1, [0.95, 0.9, 1], { speed: 1, life: 0.6, size: 1.5 });
  }
  // lo que borró la reconfiguración vuelve (al reaparecer o al terminar la huida)
  restaurarBorrados() {
    for (const s of this.solids) {
      if (!s.erased) continue;
      s.erased = false;
      if (s.door || s.temp || (s.crate && !s.crate.alive)) continue;
      s.active = !s.ghost && s !== this.L.salida;
    }
  }
  resetChase(z) { this.restaurarBorrados(); this.chase.z = z + 10; this.chase.speed = 4.5; }

  // ---------- secciones, consejos, muerte ----------
  checkTips() {
    const p = this.player;
    for (const t of this.L.tips) {
      if (t.done || p.pos.z > t.z) continue;
      t.done = true;
      if (t.who === 'evento') this.director.run(t.text);
      else if (!this.trial) { const T = this.tipsText?.[t.text]; if (T) this.tip(this.touchUI ? T.t : T.k); }
    }
  }
  checkSection() {
    const z = this.player.pos.z, s = this.L.sections.find(q => z <= q.z0 && z > q.z1);
    if (s && s !== this.section) {
      this.section = s;
      if (!this.seenSections.has(s.n)) { this.seenSections.add(s.n); this.sectionCard = { n: s.n, name: s.name, t: 0 }; this.sound.sfx('seccion'); }
    }
  }
  checkDeath() { if (this.player.pos.y < -6 && this.player.state !== STATE.DEAD) this.die('vacio'); }

  // ---------- cámara ----------
  updateCamera(dt) {
    const p = this.player, c = this.cam, C = CONFIG;
    const damp = (a, b, l) => a + (b - a) * (1 - Math.exp(-l * dt));
    if (p.onGround || p.pos.y < c.anchor - C.camAnchorDrop || c.snap) c.anchor = p.pos.y;
    let tx, ty, tz, lx, ly, lz;
    if (this.mode === 'titulo') { const a = this.time * 0.08; tx = -2.6 + Math.sin(a) * 1.2; ty = 2.4; tz = 11.6; lx = 1.6; ly = 1.6; lz = 2; c.yaw = 0; }
    else if (c.fix) { tx = c.fix.x; ty = c.fix.y; tz = c.fix.z; lx = c.fix.lx; ly = c.fix.ly; lz = c.fix.lz; }
    else if (this.boss.active) {
      const a = this.L.spots.arena;
      tx = p.pos.x * 0.45; ty = 9.8; tz = a.z + 16; lx = p.pos.x * 0.55; ly = 1.2; lz = (p.pos.z + a.z - 4) / 2;
      c.yaw = damp(c.yaw, 0, C.camYawLambda);
    } else {
      const targetYaw = this.chase.on ? Math.PI : 0;
      c.yaw = damp(c.yaw, targetYaw, C.camYawLambda);
      const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw);
      const turn = Math.abs(Math.sin(c.yaw)), wide = this.section.n === 2 && p.pos.z > -96 ? 1.25 : 1;
      const dist = C.camDist * wide * (1 - 0.6 * turn);
      tx = p.pos.x * 0.6 - fx * dist; ty = c.anchor + C.camHeight * wide + 2.5 * turn; tz = p.pos.z - fz * dist;
      lx = p.pos.x * 0.8 + fx * C.camLookAhead; ly = c.anchor + 1; lz = p.pos.z + fz * C.camLookAhead;
    }
    // en vertical se ve menos a los lados: la cámara se aleja un poco de lo que mira
    if (this.view.h > this.view.w && this.mode !== 'titulo') { const k = c.fix ? 1.45 : 1.2; tx = lx + (tx - lx) * k; ty = ly + (ty - ly) * k; tz = lz + (tz - lz) * k; }
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
    const f = this.fx, p = this.player.pos;
    const grow = (k, d) => { if (f[k] > 0 && f[k] < 1) f[k] = Math.min(1, f[k] + dt / d); };
    grow('recolector', 2.4); grow('guardianSube', 2.2); grow('nucleo', 1.2); grow('salida', 1.4); grow('senal', 3.2);
    if (f.lunex >= 0) f.lunex = f.lunexSale ? Math.max(-1, f.lunex - dt / 1.5) : Math.min(1, f.lunex + dt / 1.2);
    f.tiloSalta = Math.max(0, f.tiloSalta - dt * 1.5);
    for (const c of this.L.cristales) if (c.vuela !== undefined && c.vuela < 1) c.vuela = Math.min(1, c.vuela + dt / 0.9);
    if (f.humo && Math.random() < dt * 8) {
      const s = this.L.spots.capsula;
      this.particles.spawn(o => { o.x = s.x + (Math.random() - 0.5) * 0.8; o.y = s.y + 1.4; o.z = s.z + (Math.random() - 0.5) * 0.8; o.vx = 0.3 + Math.random() * 0.3; o.vy = 1 + Math.random() * 0.6; o.vz = -0.2; o.life = o.max = 2.4; o.g = 0; o.drag = 0.3; o.r = 0.32; o.gg = 0.3; o.b = 0.36; o.size = 3.4; });
    }
    if (this.section.n !== 1) f.humo = Math.abs(p.z - this.L.spots.capsula.z) < 60;
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
    const music = this.mode === 'titulo' ? 'titulo' : this.mode === 'fin' ? 'fin' : this.musicOverride || (this.boss.active ? 'jefe' : this.chase.on ? 'persecucion' : this.section.n >= 3 && this.section.n <= 4 ? 'ruinas' : 'nivel');
    this.sound.update(dt, { music, fast: this.superT > 0, chase: this.chase.on ? 1 : 0 });
  }

  // ---------- final del mundo ----------
  finishLevel() {
    this.timerOn = false;
    const t = this.runTime, s = this.save, MED = this.M.medallas;
    const medal = !this.trial ? null : t <= MED.oro ? 'oro' : t <= MED.plata ? 'plata' : t <= MED.bronce ? 'bronce' : null;
    const allCrates = this.cratesBroken >= this.cratesTotal;
    s.completados[this.M.id] = true; s.progreso = null;
    s.habilidades = [...new Set([...s.habilidades, 'recordar'])];
    if (this.trial && (!s.mejor[this.M.id] || t < s.mejor[this.M.id])) s.mejor[this.M.id] = t;
    this.writeSave();
    this.result = { t, medal, allCrates, crates: this.cratesBroken, total: this.cratesTotal, frags: this.fragsGot, registros: this.L.registros.filter(p => p.got).length, totalRegistros: this.L.registros.length, deaths: this.deaths, best: s.mejor[this.M.id] };
    this.mode = 'fin'; this.endT = 0;
  }
}
export { STATE };
