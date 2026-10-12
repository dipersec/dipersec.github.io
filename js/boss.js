// boss.js — Jefe del Nivel 1: el Inspector de Trámites (tres fases).
//   1 · Lanza formularios en arco. Cada tercer lanzamiento es un sello: girar cerca se lo devuelve y lo aturde (×3).
//   2 · Su torre se desmorona: llueven carpetas que forman escaleras. Hay que subir y caerle encima (×2).
//   3 · Llama a dos formateadoras. Hay que atraerlas para que lo borren a él (×2).
import { Pool } from './pool.js';
import { overlaps } from './physics.js';
import { bounce } from './player.js';
import { CONFIG } from './config.js';

const G = 14;
const FOLDER = { w: 1.6, h: 0.8, d: 1.6 };

export class Inspector {
  constructor(g) {
    this.g = g; this.active = false; this.defeated = false;
    this.shots = new Pool(() => ({ kind: 'form', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, tx: 0, tz: 0, t: 0, landed: false, back: false }), 12);
    this.folders = [];
    this.formas = [{ x: 0, z: 0, a: 0, alive: false, t: 0 }, { x: 0, z: 0, a: 0, alive: false, t: 0 }];
    this.phase = 1; this.hp = 3; this.total = 7; this.lost = 0;
    this.x = 0; this.y = 0; this.z = -353; this.stun = 0; this.t = 0; this.throws = 0; this.hop = null; this.flash = 0; this.dir = 1;
  }
  get spots() { return this.g.L.spots; }
  start() { this.active = true; this.phase = 1; this.hp = 3; this.lost = 0; this.place(); }
  // Coloca al Inspector según la fase (también tras una muerte de DIP)
  place() {
    const L = this.g.L;
    this.shots.clear(); this.stun = 0; this.t = 0; this.throws = 0; this.hop = null;
    for (const f of this.folders) f.s.active = false; this.folders = [];
    for (const f of this.formas) f.alive = false;
    if (this.phase === 1) { this.x = 0; this.y = 0; this.z = this.spots.inspector.z; }
    else if (this.phase === 2) { const tw = L.towers[2 - this.hp]; this.x = tw.x; this.y = tw.top; this.z = tw.z; this.rainStairs(2 - this.hp); }
    else { this.x = 0; this.y = 0; this.z = this.spots.inspector.z; this.callFormas(); }
  }
  bodyBox() { return { x0: this.x - 0.75, x1: this.x + 0.75, y0: this.y, y1: this.y + 2.2, z0: this.z - 0.7, z1: this.z + 0.7 }; }

  hit() {
    this.hp--; this.lost++; this.flash = 1;
    this.g.sound.sfx('jefe_golpe'); this.g.addTrauma(0.45); this.g.hitStop = 0.08;
    this.g.burst(this.x, this.y + 2, this.z, 24, [1, 1, 1], { speed: 6, life: 0.8, g: 6, size: 1.6 });
    if (this.lost >= this.total) { this.active = false; this.defeated = true; this.shots.clear(); for (const f of this.formas) f.alive = false; this.g.director.run('jefeDerrotado'); return; }
    if (this.hp <= 0) {
      this.phase++; this.hp = 2;
      this.g.director.run(this.phase === 2 ? 'jefeFase2' : 'jefeFase3');
    }
  }

  update(dt) {
    if (!this.active) return;
    const g = this.g, p = g.player;
    this.t += dt; this.flash = Math.max(0, this.flash - dt * 3);
    if (this.stun > 0) this.stun -= dt;
    if (this.hop) {
      const h = this.hop; h.t += dt / h.dur; const k = Math.min(1, h.t);
      this.x = h.x0 + (h.x1 - h.x0) * k; this.z = h.z0 + (h.z1 - h.z0) * k; this.y = h.y0 + (h.y1 - h.y0) * k + Math.sin(k * Math.PI) * 4;
      if (k >= 1) { this.hop = null; g.sound.sfx('caida_fuerte'); g.addTrauma(0.3); h.done?.(); }
    }
    if (g.director.blocking) return;
    if (this.phase === 1) this.phase1(dt);
    else if (this.phase === 2) this.phase2(dt);
    else this.phase3(dt);
    this.updateShots(dt);
    this.updateFolders(dt);
    // tocar al Inspector de costado hace daño
    if (!this.hop && p.state !== 'dead' && !p.hidden && overlaps(p, this.bodyBox())) {
      const top = this.y + 2.2;
      if (this.phase === 2 && p.vel.y < 0 && p.pos.y > top - 0.9) { bounce(p, 1); this.hit(); if (this.phase === 2) this.jumpToTower(); }
      else if (this.stun <= 0) g.hurt(this.x, this.z, 'jefe');
    }
  }

  // ---------- fase 1: formularios y sellos ----------
  phase1(dt) {
    const p = this.g.player;
    if (this.stun > 0) return;
    this.x += this.dir * 1.2 * dt; if (Math.abs(this.x) > 3) this.dir *= -1;
    if (this.t > 1.25) {
      this.t = 0; this.throws++;
      const seal = this.throws % 3 === 0;
      const lead = seal ? 0 : 0.35;
      this.throwAt(p.pos.x + p.vel.x * lead, p.pos.z + p.vel.z * lead, seal ? 'seal' : 'form', seal ? 1.25 : 1.05);
    }
  }
  throwAt(tx, tz, kind, T) {
    const x = this.x + (Math.random() < 0.5 ? -0.9 : 0.9), y = this.y + 2.0, z = this.z + 0.6;
    tx = Math.max(-9, Math.min(9, tx)); tz = Math.max(-360, Math.min(-333, tz));
    this.shots.spawn(o => {
      o.kind = kind; o.x = x; o.y = y; o.z = z; o.tx = tx; o.tz = tz; o.t = 0; o.landed = false; o.back = false;
      o.vx = (tx - x) / T; o.vz = (tz - z) / T; o.vy = (0 - y + 0.5 * G * T * T) / T;
    });
    this.g.sound.sfx(kind === 'seal' ? 'sello' : 'papel');
  }
  updateShots(dt) {
    const g = this.g, p = g.player;
    this.shots.forEachActive(o => {
      o.t += dt;
      if (o.back) {
        const dx = this.x - o.x, dy = this.y + 2 - o.y, dz = this.z - o.z, d = Math.hypot(dx, dy, dz);
        const v = 20 * dt; o.x += dx / d * v; o.y += dy / d * v; o.z += dz / d * v;
        if (d < 1) { o.active = false; this.stun = 1.8; g.sound.sfx('aturdido'); this.hit(); }
        return;
      }
      if (!o.landed) {
        o.vy -= G * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt;
        if (o.y <= 0.05) {
          o.y = 0.05; o.landed = true; o.t = 0;
          if (o.kind === 'form') { o.active = false; g.burst(o.x, 0.2, o.z, 8, [1, 1, 1], { speed: 3, life: 0.5, g: 4 }); g.sound.sfx('papel'); }
          else g.sound.sfx('sello');
        }
        if (o.active && Math.hypot(p.pos.x - o.x, p.pos.y + 0.8 - o.y, p.pos.z - o.z) < 0.75) { o.active = false; g.hurt(o.x, o.z, 'formulario'); }
      } else if (o.kind === 'seal' && o.t > 2.6) { o.active = false; g.burst(o.x, 0.3, o.z, 6, [1, 0.3, 0.3], { speed: 2, life: 0.4 }); }
    });
  }
  onSpin(pp) {
    if (!this.active) return;
    this.shots.forEachActive(o => {
      if (o.kind === 'seal' && o.landed && !o.back && Math.hypot(o.x - pp.x, o.z - pp.z) < CONFIG.spinRadius + 0.7) {
        o.back = true; o.y = 0.8; this.g.sound.sfx('sello'); this.g.hitStop = 0.05;
      }
    });
  }

  // ---------- fase 2: carpetas y torres ----------
  rainStairs(i) {
    const stairs = this.g.L.folderStairs[i]; let delay = 0.2;
    for (const [x, z, n = 1] of stairs) for (let k = 0; k < n; k++) { this.dropFolder(x, z, delay, true); delay += 0.35; }
  }
  dropFolder(x, z, delay = 0, stair = false) {
    const s = { x0: x - FOLDER.w / 2, x1: x + FOLDER.w / 2, y0: 14, y1: 14 + FOLDER.h, z0: z - FOLDER.d / 2, z1: z + FOLDER.d / 2, active: false, mat: 'carpeta', folder: true };
    const f = { s, x, z, y: 14, vy: 0, delay, state: 'espera', stair, t: 0 };
    this.g.solids.push(s); this.folders.push(f);
  }
  updateFolders(dt) {
    const g = this.g, p = g.player;
    for (const f of this.folders) {
      if (f.state === 'espera') { f.delay -= dt; if (f.delay <= 0) f.state = 'cae'; continue; }
      if (f.state === 'cae') {
        f.vy -= 24 * dt; const ny = f.y + f.vy * dt;
        // apoyo: suelo u otra carpeta ya posada
        let floor = 0;
        for (const o of this.folders) if (o !== f && o.state === 'posada' && Math.abs(o.x - f.x) < FOLDER.w * 0.9 && Math.abs(o.z - f.z) < FOLDER.d * 0.9) floor = Math.max(floor, o.y + FOLDER.h);
        f.y = Math.max(floor, ny);
        f.s.y0 = f.y; f.s.y1 = f.y + FOLDER.h;
        if (f.y + FOLDER.h > p.pos.y && f.y < p.pos.y + p.h && Math.abs(p.pos.x - f.x) < 1.1 && Math.abs(p.pos.z - f.z) < 1.1 && f.vy < -3) g.hurt(f.x, f.z, 'carpeta');
        if (f.y <= floor) { f.state = 'posada'; f.s.active = true; f.vy = 0; g.sound.sfx('caida'); g.burst(f.x, f.y, f.z, 6, [0.9, 0.8, 0.5], { speed: 2, life: 0.4 }); if (overlaps(p, f.s)) { p.pos.y = f.s.y1; } }
      }
      if (f.state === 'posada' && !f.stair) { f.t += dt; if (f.t > 4) { f.state = 'fuera'; f.s.active = false; } }
    }
    this.folders = this.folders.filter(f => f.state !== 'fuera' || (f.s.active = false));
  }
  phase2(dt) {
    const p = this.g.player;
    if (this.t > 2.4 && !this.hop) { this.t = 0; this.dropFolder(Math.max(-8, Math.min(8, p.pos.x + (Math.random() - 0.5) * 2)), Math.max(-358, Math.min(-335, p.pos.z + (Math.random() - 0.5) * 2))); }
  }
  jumpToTower() {
    const L = this.g.L, tw = L.towers[1];
    for (const f of this.folders) if (f.stair) { f.state = 'fuera'; f.s.active = false; this.g.burst(f.x, f.y + 0.4, f.z, 6, [0.9, 0.8, 0.5], { speed: 3, life: 0.5 }); }
    this.hop = { x0: this.x, y0: this.y, z0: this.z, x1: tw.x, y1: tw.top, z1: tw.z, t: 0, dur: 1.1, done: () => this.rainStairs(1) };
  }

  // ---------- fase 3: formateadoras ----------
  callFormas() {
    const pos = [[-8.5, -359], [8.5, -359]];
    this.formas.forEach((f, i) => { f.alive = true; f.x = pos[i][0]; f.z = pos[i][1]; f.a = Math.PI; f.t = 0; f.respawn = 0; });
  }
  phase3(dt) {
    const g = this.g, p = g.player;
    if (this.stun <= 0) { this.x += this.dir * 1.6 * dt; if (Math.abs(this.x) > 5) this.dir *= -1; }
    for (const f of this.formas) {
      if (!f.alive) { f.respawn -= dt; if (f.respawn <= 0 && this.active) { f.alive = true; f.x = (Math.random() < 0.5 ? -8.5 : 8.5); f.z = -359; } continue; }
      // persiguen a DIP girando poco a poco
      const want = Math.atan2(p.pos.x - f.x, p.pos.z - f.z);
      let d = want - f.a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      f.a += Math.max(-2 * dt, Math.min(2 * dt, d));
      f.x += Math.sin(f.a) * 3.2 * dt; f.z += Math.cos(f.a) * 3.2 * dt;
      f.x = Math.max(-9.3, Math.min(9.3, f.x)); f.z = Math.max(-361, Math.min(-332, f.z));
      if (Math.hypot(f.x - this.x, f.z - this.z) < 1.6) {
        f.alive = false; f.respawn = 2.5; this.stun = 1.2;
        g.burst(f.x, 0.6, f.z, 20, [0.6, 0.6, 0.7], { speed: 4, life: 0.6 });
        this.hit(); continue;
      }
      if (p.state !== 'dead' && Math.hypot(p.pos.x - f.x, p.pos.z - f.z) < 1.15 && p.pos.y < 1.2) g.hurt(f.x, f.z, 'formateadora');
    }
  }
}
