// memoria.js — Sistema de recuerdos reutilizable (sirve para los siete mundos).
// Un ancla es un punto concreto donde DIP puede recordar. Al hacerlo, sus piezas "fantasma" se vuelven sólidas
// durante `dur` segundos (o para siempre si dur = Infinity). El cambio se comunica con luz, partículas, sonido
// y un temporizador visible; nunca solo con color.
import { overlaps } from './physics.js';

export class Memorias {
  constructor(g) { this.g = g; this.near = null; this.cooldown = 0; }

  get puede() { return this.g.habilidades.has('recordar'); }

  update(dt) {
    const g = this.g, p = g.player;
    this.near = null; this.cooldown = Math.max(0, this.cooldown - dt);
    for (const m of g.L.memorias) {
      for (const s of m.targets) if (s.form !== undefined && s.form < 1) s.form = Math.min(1, s.form + dt * 3.2);
      if (m.state === 'activa') {
        m.t -= dt;
        const warn = m.t < 1.6;
        for (const s of m.targets) s.warn = warn;
        if (warn && Math.ceil(m.t * 2) !== Math.ceil((m.t + dt) * 2) && m.t > 0) g.sound.sfx('memoria_tic');
        if (m.t <= 0) this.apagar(m);
      }
      if (m.state !== 'lista' || p.hidden || p.state === 'dead') continue;
      const d = Math.hypot(p.pos.x - m.x, p.pos.z - m.z);
      if (d < 2.6 && Math.abs(p.pos.y - m.y) < 1.8 && (!this.near || d < this.near.d)) { this.near = m; m.d = d; }
    }
  }

  // DIP intenta recordar (botón Recordar)
  intentar() {
    const g = this.g, p = g.player, m = this.near;
    if (this.cooldown > 0) return;
    this.cooldown = 0.3;
    if (!m) { g.sound.sfx('recordar_vacio'); return; }
    if (!this.puede) { g.say('dip', 'Algo falta aquí… pero todavía no recuerdo qué.', 2.4); g.sound.sfx('recordar_vacio'); return; }
    this.activar(m);
    p.proj = 0.45;
  }

  activar(m, silencioso = false) {
    const g = this.g;
    m.state = 'activa'; m.t = m.dur;
    for (const s of m.targets) { s.active = true; s.form = 0; s.warn = false; }
    if (silencioso) return;
    g.sound.sfx(m.grande ? 'recordar_grande' : 'recordar'); g.fx.flash = m.grande ? 0.5 : 0.25; g.hitStop = Math.max(g.hitStop, 0.05);
    g.addTrauma(m.grande ? 0.3 : 0.12);
    const p = g.player.pos;
    for (const s of m.targets) {
      const cx = (s.x0 + s.x1) / 2, cy = s.y1, cz = (s.z0 + s.z1) / 2;
      // chispas que viajan de DIP a la pieza recordada + destello donde aparece
      for (let i = 0; i < 14; i++) g.particles.spawn(o => {
        const k = Math.random();
        o.x = p.x; o.y = p.y + 1.2; o.z = p.z; o.vx = (cx - p.x) * (1.6 + k); o.vy = (cy - p.y) * 1.6 + 2; o.vz = (cz - p.z) * (1.6 + k);
        o.life = o.max = 0.5 + k * 0.2; o.g = 4; o.drag = 0.5; o.r = 0.75; o.gg = 0.95; o.b = 1; o.size = 1.3;
      });
      g.burst(cx, cy, cz, 18, [0.8, 0.95, 1], { speed: 3, life: 0.7, size: 1.4, up: 1 });
    }
    // cajas o enemigos dentro de una pieza recién recordada: se apartan hacia arriba
    for (const s of m.targets) if (overlaps(g.player, s)) g.player.pos.y = s.y1;
  }

  apagar(m, ocultar = false) {
    const g = this.g;
    for (const s of m.targets) { s.active = false; s.warn = false; }
    m.state = ocultar ? 'oculta' : 'lista'; m.t = 0;
    g.sound.sfx('memoria_fin');
    for (const s of m.targets) g.burst((s.x0 + s.x1) / 2, s.y1, (s.z0 + s.z1) / 2, 10, [0.6, 0.8, 1], { speed: 2, life: 0.5, g: 3 });
  }

  // memoria más urgente para el HUD (la que se acaba antes)
  get activa() {
    let best = null;
    for (const m of this.g.L.memorias) if (m.state === 'activa' && m.dur !== Infinity && (!best || m.t < best.t)) best = m;
    return best;
  }
}
