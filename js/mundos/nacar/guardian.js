// guardian.js — Jefe de Nácar: el Guardián de la Estación. No se destruye: se desactiva.
//   1 · Golpea el suelo y salen ondas (se saltan). Cada tercer golpe expulsa una célula de energía:
//       girar junto a ella se la devuelve a su núcleo (×3).
//   2 · Sube a una torre. DIP recuerda los escalones que faltan, sube y le pisa la cabeza (×2).
//   3 · Llama a dos drones y da órdenes contradictorias. Los drones dudan; si chocan con él, se avería (×2).
// Siete golpes en total. Cada ataque tiene aviso (brazos arriba, núcleo encendido, anillo en el suelo).
import { Pool } from '../../pool.js';
import { overlaps } from '../../physics.js';
import { bounce } from '../../player.js';
import { CONFIG } from '../../config.js';
import { lanzarOnda } from '../../enemigos.js';

const G = 14;
const ORDENES = ['¡Proteger la estación!', '¡No se acerquen a la estación!', '¡Atrapen a la anomalía!', '¡No toquen a la anomalía!', '¡Obedezcan la orden anterior!', '¡Ignoren todas las órdenes!'];

export class Guardian {
  constructor(g) {
    this.g = g; this.active = false; this.defeated = false; this.gone = false;
    this.shots = new Pool(() => ({ kind: 'celula', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, tx: 0, tz: 0, t: 0, landed: false, back: false }), 6);
    this.formas = [{ x: 0, z: 0, a: 0, alive: false, t: 0, duda: 0 }, { x: 0, z: 0, a: 0, alive: false, t: 0, duda: 0 }];
    this.phase = 1; this.hp = 3; this.total = 7; this.lost = 0;
    this.x = 0; this.y = 0; this.z = -327; this.stun = 0; this.t = 0; this.slams = 0; this.hop = null; this.flash = 0; this.dir = 1;
    this.charge = 0; this.orden = ''; this.ordenT = 0; this.tower = 0; this.off = 0;
  }
  get spots() { return this.g.L.spots; }
  start() { this.active = true; this.phase = 1; this.hp = 3; this.lost = 0; this.place(); }
  // Coloca al Guardián según la fase (también tras una muerte de DIP: la fase vuelve a su inicio)
  place() {
    const L = this.g.L;
    this.shots.clear(); this.g.ondas.clear(); this.stun = 0; this.t = 0; this.slams = 0; this.hop = null; this.charge = 0;
    for (const f of this.formas) f.alive = false;
    for (const m of L.memorias) if (m.jefe !== undefined) this.g.memorias.apagar(m, true);
    if (this.phase === 1) { this.x = 0; this.y = 0; this.z = this.spots.guardian.z; }
    else if (this.phase === 2) { this.tower = 2 - this.hp; const tw = L.towers[this.tower]; this.x = tw.x; this.y = tw.top; this.z = tw.z; this.abrirEscalera(this.tower); }
    else { this.x = 0; this.y = 0; this.z = this.spots.guardian.z; this.callFormas(); }
  }
  bodyBox() { return { x0: this.x - 0.95, x1: this.x + 0.95, y0: this.y, y1: this.y + 2.4, z0: this.z - 0.8, z1: this.z + 0.8 }; }

  hit() {
    this.hp--; this.lost++; this.flash = 1;
    const g = this.g;
    g.sound.sfx('jefe_golpe'); g.addTrauma(0.45); g.hitStop = 0.09;
    g.burst(this.x, this.y + 2, this.z, 26, [0.85, 0.95, 1], { speed: 6, life: 0.8, g: 6, size: 1.6 });
    if (this.lost >= this.total) {
      this.active = false; this.defeated = true; this.shots.clear(); g.ondas.clear();
      for (const f of this.formas) f.alive = false;
      for (const m of g.L.memorias) if (m.jefe !== undefined) g.memorias.apagar(m, true);
      g.director.run('guardianDesactivado'); return;
    }
    if (this.hp <= 0) { this.phase++; this.hp = 2; g.director.run(this.phase === 2 ? 'guardianFase2' : 'guardianFase3'); }
  }

  update(dt) {
    if (!this.active) { if (this.defeated) this.off = Math.min(1, this.off + dt * 0.6); return; }
    const g = this.g, p = g.player;
    this.t += dt; this.flash = Math.max(0, this.flash - dt * 3);
    if (this.stun > 0) this.stun -= dt;
    if (this.ordenT > 0) this.ordenT -= dt;
    if (this.hop) {
      const h = this.hop; h.t += dt / h.dur; const k = Math.min(1, h.t);
      this.x = h.x0 + (h.x1 - h.x0) * k; this.z = h.z0 + (h.z1 - h.z0) * k; this.y = h.y0 + (h.y1 - h.y0) * k + Math.sin(k * Math.PI) * 4;
      if (k >= 1) { this.hop = null; g.sound.sfx('caida_fuerte'); g.addTrauma(0.35); lanzarOnda(g, this.x, 0, this.z, 7, 9); h.done?.(); }
    }
    if (g.director.blocking) return;
    if (this.phase === 1) this.phase1(dt);
    else if (this.phase === 2) this.phase2(dt);
    else this.phase3(dt);
    this.updateShots(dt);
    // tocarlo de costado hace daño (salvo aturdido); en la fase 2, caerle encima lo golpea
    if (!this.hop && p.state !== 'dead' && !p.hidden && overlaps(p, this.bodyBox())) {
      const top = this.y + 2.4;
      if (this.phase === 2 && p.vel.y < 0 && p.pos.y > top - 0.9) { bounce(p, 1.05); this.hit(); if (this.phase === 2) this.saltarATorre(); }
      else if (this.stun <= 0) g.hurt(this.x, this.z, 'guardian');
    }
  }

  // ---------- fase 1: golpes al suelo, ondas y células ----------
  phase1(dt) {
    const g = this.g, p = g.player;
    if (this.stun > 0) { this.charge = 0; return; }
    if (this.charge > 0) {
      this.charge -= dt;
      if (this.charge <= 0) this.slam();
      return;
    }
    this.x += this.dir * 1.1 * dt; if (Math.abs(this.x) > 3.2) this.dir *= -1;
    if (this.t > 2.1) { this.t = 0; this.charge = 0.75; g.sound.sfx('carga'); }
  }
  slam() {
    const g = this.g, p = g.player;
    this.slams++;
    lanzarOnda(g, this.x, 0, this.z, 7.2, 15); g.sound.sfx('golpe_guardian'); g.addTrauma(0.35);
    g.burst(this.x, 0.2, this.z + 0.8, 16, [0.85, 0.8, 0.75], { speed: 5, life: 0.6, up: 1.5 });
    if (this.slams % 3 === 0) this.throwAt(p.pos.x, p.pos.z, 1.2);
  }
  throwAt(tx, tz, T) {
    const x = this.x, y = this.y + 1.8, z = this.z + 0.9;
    tx = Math.max(-8.5, Math.min(8.5, tx)); tz = Math.max(-334, Math.min(-306, tz));
    if (Math.hypot(tx - this.x, tz - this.z) < 3.2) tz = this.z + 4;
    this.shots.spawn(o => {
      o.kind = 'celula'; o.x = x; o.y = y; o.z = z; o.tx = tx; o.tz = tz; o.t = 0; o.landed = false; o.back = false;
      o.vx = (tx - x) / T; o.vz = (tz - z) / T; o.vy = (0 - y + 0.5 * G * T * T) / T;
    });
    this.g.sound.sfx('celula');
  }
  updateShots(dt) {
    const g = this.g, p = g.player;
    this.shots.forEachActive(o => {
      o.t += dt;
      if (o.back) {
        const dx = this.x - o.x, dy = this.y + 1.5 - o.y, dz = this.z - o.z, d = Math.hypot(dx, dy, dz);
        const v = 20 * dt; o.x += dx / d * v; o.y += dy / d * v; o.z += dz / d * v;
        if (d < 1) { o.active = false; this.stun = 1.8; g.sound.sfx('aturdido'); this.hit(); }
        return;
      }
      if (!o.landed) {
        o.vy -= G * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt;
        if (o.y <= 0.05) { o.y = 0.05; o.landed = true; o.t = 0; g.sound.sfx('celula_cae'); }
        if (o.active && Math.hypot(p.pos.x - o.x, p.pos.y + 0.8 - o.y, p.pos.z - o.z) < 0.75) { o.active = false; g.hurt(o.x, o.z, 'celula'); }
      } else if (o.t > 3.4) { o.active = false; g.burst(o.x, 0.3, o.z, 8, [0.5, 0.9, 1], { speed: 2, life: 0.4 }); }
    });
  }
  onSpin(pp) {
    if (!this.active) return;
    this.shots.forEachActive(o => {
      if (o.landed && !o.back && Math.hypot(o.x - pp.x, o.z - pp.z) < CONFIG.spinRadius + 0.75) {
        o.back = true; o.y = 0.8; this.g.sound.sfx('devolver'); this.g.hitStop = 0.05;
      }
    });
  }

  // ---------- fase 2: torres y escalones recordados ----------
  abrirEscalera(i) {
    for (const m of this.g.L.memorias) if (m.jefe !== undefined) {
      if (m.jefe === i) { if (m.state === 'oculta') m.state = 'lista'; }
      else if (m.state !== 'oculta') this.g.memorias.apagar(m, true);
    }
  }
  phase2(dt) {
    const g = this.g;
    if (this.hop) return;
    if (this.charge > 0) { this.charge -= dt; if (this.charge <= 0) { lanzarOnda(g, this.x, 0, this.z, 6.5, 14); g.sound.sfx('golpe_guardian'); g.addTrauma(0.25); } return; }
    if (this.t > 3.2) { this.t = 0; this.charge = 0.8; g.sound.sfx('carga'); }
  }
  saltarATorre() {
    const L = this.g.L, tw = L.towers[1];
    this.tower = 1;
    this.hop = { x0: this.x, y0: this.y, z0: this.z, x1: tw.x, y1: tw.top, z1: tw.z, t: 0, dur: 1.1, done: () => this.abrirEscalera(1) };
    this.t = 0;
  }

  // ---------- fase 3: drones y órdenes contradictorias ----------
  callFormas() {
    const pos = [[-8.5, -334.5], [8.5, -334.5]];
    this.formas.forEach((f, i) => { f.alive = true; f.x = pos[i][0]; f.z = pos[i][1]; f.a = Math.PI; f.t = 0; f.respawn = 0; f.duda = 0.8; });
    this.ordenK = 0; this.ordenar();
  }
  ordenar() {
    this.orden = ORDENES[this.ordenK++ % ORDENES.length]; this.ordenT = 2.6; this.t = 0;
    for (const f of this.formas) f.duda = 0.7;
    this.g.sound.sfx('orden');
  }
  phase3(dt) {
    const g = this.g, p = g.player;
    if (this.stun <= 0) { this.x += this.dir * 1.4 * dt; if (Math.abs(this.x) > 4.5) this.dir *= -1; }
    if (this.t > 3.4) this.ordenar();
    for (const f of this.formas) {
      if (!f.alive) { f.respawn -= dt; if (f.respawn <= 0 && this.active) { f.alive = true; f.x = (Math.random() < 0.5 ? -8.5 : 8.5); f.z = -334.5; f.duda = 0.6; } continue; }
      f.t += dt;
      if (f.duda > 0) { f.duda -= dt; continue; }   // procesando la orden: se quedan quietos un momento
      const want = Math.atan2(p.pos.x - f.x, p.pos.z - f.z);
      let d = want - f.a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      f.a += Math.max(-2 * dt, Math.min(2 * dt, d));
      f.x += Math.sin(f.a) * 3.3 * dt; f.z += Math.cos(f.a) * 3.3 * dt;
      f.x = Math.max(-9.3, Math.min(9.3, f.x)); f.z = Math.max(-336, Math.min(-302, f.z));
      if (Math.hypot(f.x - this.x, f.z - this.z) < 1.7) {
        f.alive = false; f.respawn = 2.5; this.stun = 1.2;
        g.burst(f.x, 0.8, f.z, 20, [0.7, 0.85, 1], { speed: 4, life: 0.6 });
        this.hit(); continue;
      }
      if (p.state !== 'dead' && Math.hypot(p.pos.x - f.x, p.pos.z - f.z) < 1.1 && p.pos.y < 1.4) g.hurt(f.x, f.z, 'dron');
    }
  }
}
