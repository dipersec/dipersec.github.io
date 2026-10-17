// arquitecto.js — Jefe de Vértice: el Arquitecto. Reubica plataformas e invierte la gravedad de la sala.
// Ciclo: ATAQUE (deja caer bloques donde estás; su sombra avisa) → VENTANA SEGURA (abre su núcleo y muestra
// un símbolo; los nodos de la sala muestran símbolos: girar junto al que coincide lo golpea; el equivocado da descarga).
//   1 · Solo nodos en el suelo (×3).
//   2 · La gravedad de la sala se invierte cada pocos segundos (con aviso); el nodo correcto puede estar en el techo (×2).
//   3 · Todo a la vez y más rápido; también caen bloques durante la ventana (×2).
// La forma del símbolo (triángulo, círculo, cuadrado) es lo que importa; el color solo acompaña.
import { overlaps } from '../../physics.js';
import { CONFIG } from '../../config.js';
import { YB } from './nivel.js';

export const SIMBOLOS = ['triangulo', 'circulo', 'cuadrado'];
const TECHO = YB + 8.5, BLOQUE = 1.6;

export class Arquitecto {
  constructor(g) {
    this.g = g; this.active = false; this.defeated = false; this.gone = false; this.off = 0;
    this.phase = 1; this.hp = 3; this.total = 7; this.lost = 0;
    this.x = 0; this.y = YB + 3.6; this.z = -342; this.t = 0; this.dir = 1; this.flash = 0; this.stun = 0;
    this.estado = 'ataque'; this.et = 0; this.ventana = null; this.bloques = []; this.flipT = 0; this.aviso = 0; this.dropT = 0;
    this.formas = []; this.shots = { clear() {}, forEachActive() {} };
    this.nodos = [];
    for (const n of g.L.nodos) { this.nodos.push({ x: n.x, z: n.z, y: YB, techo: false, simbolo: null, on: false }); this.nodos.push({ x: n.x, z: n.z, y: TECHO, techo: true, simbolo: null, on: false }); }
  }
  get campo() { return this.g.L.campos.find(c => c.id === 'arena'); }
  get spots() { return this.g.L.spots; }
  start() { this.active = true; this.phase = 1; this.hp = 3; this.lost = 0; this.place(); }
  place() {
    for (const b of this.bloques) b.s.active = false;
    this.bloques = []; this.campo.activo = false; this.estado = 'ataque'; this.et = 0; this.ventana = null; this.flipT = 0; this.aviso = 0; this.dropT = 0;
    for (const n of this.nodos) n.on = false;
    this.x = 0; this.y = YB + 3.6; this.z = this.spots.arquitecto.z;
  }
  bodyBox() { return { x0: this.x - 1, x1: this.x + 1, y0: this.y - 1.2, y1: this.y + 1.4, z0: this.z - 1, z1: this.z + 1 }; }

  hit(n) {
    const g = this.g;
    this.hp--; this.lost++; this.flash = 1; this.stun = 1.3;
    g.fx.rayo = { x: n.x, y: n.techo ? TECHO - 0.5 : YB + 0.5, z: n.z, t: 0.5 };
    g.sound.sfx('jefe_golpe'); g.sound.sfx('nodo_bien'); g.addTrauma(0.45); g.hitStop = 0.09;
    g.burst(this.x, this.y, this.z, 30, [1, 0.9, 0.5], { speed: 6, life: 0.8, size: 1.6 });
    this.cerrarVentana();
    if (this.lost >= this.total) {
      this.active = false; this.defeated = true; this.campo.activo = false;
      for (const b of this.bloques) b.s.active = false; this.bloques = [];
      g.director.run('arquitectoDerrotado'); return;
    }
    if (this.hp <= 0) { this.phase++; this.hp = 2; g.director.run(this.phase === 2 ? 'arquitectoFase2' : 'arquitectoFase3'); }
  }

  update(dt) {
    if (!this.active) { if (this.defeated) this.off = Math.min(1, this.off + dt * 0.6); return; }
    const g = this.g, p = g.player;
    this.t += dt; this.flash = Math.max(0, this.flash - dt * 3); this.stun = Math.max(0, this.stun - dt);
    if (this.stun <= 0) { this.x += this.dir * 1.2 * dt; if (Math.abs(this.x) > 4) this.dir *= -1; }
    this.y = YB + 3.6 + Math.sin(this.t * 1.5) * 0.3;
    this.updateBloques(dt);
    if (g.director.blocking) return;
    // la gravedad de la sala se invierte (fases 2 y 3), siempre con aviso de 1.3 s
    if (this.phase >= 2) {
      this.flipT += dt;
      const per = this.phase === 2 ? 5.5 : 4.2;
      if (this.aviso <= 0 && this.flipT > per - 1.3) { this.aviso = 1.3; g.sound.sfx('aviso_inversion'); }
      if (this.aviso > 0) { this.aviso -= dt; if (this.aviso <= 0) { this.campo.activo = !this.campo.activo; this.flipT = 0; g.addTrauma(0.3); } }
    }
    this.et += dt;
    if (this.estado === 'ataque') {
      this.dropT -= dt;
      if (this.dropT <= 0 && this.et < 3.6) { this.dropT = this.phase === 3 ? 0.7 : 0.95; this.soltarBloque(); }
      if (this.et > 4.2) this.abrirVentana();
    } else {
      if (this.phase === 3) { this.dropT -= dt; if (this.dropT <= 0) { this.dropT = 1.4; this.soltarBloque(); } }
      if (this.et > this.ventana.dur) { this.cerrarVentana(); g.sound.sfx('memoria_fin'); }
    }
    if (!p.hidden && p.state !== 'dead' && overlaps(p, this.bodyBox()) && this.stun <= 0) g.hurt(this.x, this.z, 'arquitecto');
  }

  // ---------- bloques que reubica (caen donde está DIP; su sombra avisa) ----------
  soltarBloque() {
    const p = this.g.player, x = Math.max(-7.8, Math.min(7.8, p.pos.x + (Math.random() - 0.5))), z = Math.max(-352.5, Math.min(-320, p.pos.z + (Math.random() - 0.5)));
    const s = { x0: x - BLOQUE / 2, x1: x + BLOQUE / 2, y0: TECHO - 0.2, y1: TECHO - 0.2 + BLOQUE, z0: z - BLOQUE / 2, z1: z + BLOQUE / 2, active: false, mat: 'bloque', folder: true };
    this.g.solids.push(s);
    this.bloques.push({ s, x, z, y: TECHO - 0.2, vy: 0, espera: 0.55, estado: 'espera', t: 0 });
    this.g.sound.sfx('carga');
  }
  updateBloques(dt) {
    const g = this.g, p = g.player;
    for (const b of this.bloques) {
      if (b.estado === 'espera') { b.espera -= dt; if (b.espera <= 0) b.estado = 'cae'; continue; }
      if (b.estado === 'cae') {
        b.vy -= 26 * dt; let floor = YB;
        for (const o of this.bloques) if (o !== b && o.estado === 'posado' && Math.abs(o.x - b.x) < BLOQUE * 0.9 && Math.abs(o.z - b.z) < BLOQUE * 0.9) floor = Math.max(floor, o.y + BLOQUE);
        b.y = Math.max(floor, b.y + b.vy * dt); b.s.y0 = b.y; b.s.y1 = b.y + BLOQUE;
        if (b.vy < -3 && overlaps(p, b.s)) g.hurt(b.x, b.z, 'bloque');
        if (b.y <= floor) {
          b.estado = 'posado'; b.t = 0; b.s.active = true; g.sound.sfx('golpe_suelo'); g.addTrauma(0.12);
          g.burst(b.x, b.y, b.z, 8, [0.9, 0.85, 1], { speed: 3, life: 0.4 });
          if (overlaps(p, b.s)) p.pos.y = (p.gdir || 1) > 0 ? b.s.y1 : p.pos.y;
        }
      } else if (b.estado === 'posado') { b.t += dt; if (b.t > 3.4) { b.estado = 'fuera'; b.s.active = false; } }
    }
    this.bloques = this.bloques.filter(b => b.estado !== 'fuera');
  }

  // ---------- ventana segura: nodos con símbolos ----------
  abrirVentana() {
    const g = this.g;
    const simbolo = SIMBOLOS[Math.floor(Math.random() * 3)];
    const cand = this.nodos.filter(n => this.phase >= 2 || !n.techo);
    for (const n of this.nodos) n.on = false;
    // el correcto: en las fases 2 y 3 puede tocar en el techo (la sala se invertirá durante la ventana)
    const correcto = cand[Math.floor(Math.random() * cand.length)];
    const otros = SIMBOLOS.filter(s => s !== simbolo);
    let k = 0;
    for (const n of cand) { n.on = true; n.simbolo = n === correcto ? simbolo : otros[k++ % 2]; }
    this.ventana = { simbolo, dur: this.phase === 1 ? 6.5 : 8.5 };
    this.estado = 'ventana'; this.et = 0; this.dropT = 1;
    g.sound.sfx('ventana');
  }
  cerrarVentana() { this.ventana = null; this.estado = 'ataque'; this.et = 0; this.dropT = 0.6; for (const n of this.nodos) n.on = false; }
  onSpin(pp) {
    if (!this.active || this.estado !== 'ventana') return;
    for (const n of this.nodos) {
      if (!n.on || Math.hypot(n.x - pp.x, n.z - pp.z) > CONFIG.spinRadius + 0.6) continue;
      const alt = n.techo ? Math.abs(pp.y + 1.55 - n.y) : Math.abs(pp.y - n.y);
      if (alt > 1.4) continue;
      if (n.simbolo === this.ventana.simbolo) this.hit(n);
      else { this.g.sound.sfx('nodo_mal'); this.g.hurt(n.x, n.z, 'nodo'); this.cerrarVentana(); }
      return;
    }
  }
}
