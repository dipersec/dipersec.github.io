// reglas.js — Lo que el núcleo le pregunta a Nácar cada partida: progreso al continuar, lógica propia por paso
// (piezas del recolector, humo de la cápsula), líneas de muerte y música por zona.
import { DEATH_LINES } from './historia.js';

export function aplicarProgreso(g, pr) {
  if (pr.tilo) g.flags.tilo = true;
  if (pr.recolector) { for (const q of g.L.piezas) { q.got = true; q.carrier = null; } g.L.recolector.active = false; g.fx.recolector = 1; }
  if (pr.recordar) { g.habilidades.add('recordar'); for (const c of g.L.cristales) c.got = true; }
  else g.habilidades.delete('recordar');
  if (pr.jefe) { g.boss.defeated = true; g.boss.gone = false; g.boss.off = 1; g.flags.jefe = true; g.flags.nucleoVisto = true; g.L.salida.active = false; g.fx.salida = 1; g.fx.nucleo = 1; g.fx.guardianSube = 1; }
}

export function actualizar(g, dt) {
  const p = g.player, L = g.L;
  // piezas del recolector
  if (!p.hidden && p.state !== 'dead') for (const q of L.piezas) {
    if (q.got || !q.free) continue;
    if (q.pop !== undefined && q.pop < 1) { q.pop = Math.min(1, q.pop + dt * 2.5); continue; }
    if (Math.hypot(p.pos.x - q.x, p.pos.z - q.z) > 1.0 || Math.abs(p.pos.y - q.y) > 1.8) continue;
    q.got = true; g.sound.sfx('pieza');
    const n = L.piezas.filter(o => o.got).length;
    g.burst(q.x, q.y + 0.8, q.z, 14, [1, 0.85, 0.5], { speed: 3, life: 0.5 });
    if (n < 3) g.showToast(`Pieza del recolector ${n}/3`, 1.8);
    else if (g.flags.tilo) g.say('tilo', '¡Las tres! Llévalas al recolector, junto a la salida.', 3);
  }
  const r = L.spots.recolector;
  if (r && L.recolector.active && L.piezas.every(q => q.got) && Math.hypot(p.pos.x - r.x, p.pos.z - r.z) < 7.5) g.director.run('reparar');
  // humo de la cápsula
  const f = g.fx, s = L.spots.capsula;
  if (g.section.n !== 1) f.humo = Math.abs(p.pos.z - s.z) < 60;
  if (f.humo && Math.random() < dt * 8) {
    g.particles.spawn(o => { o.x = s.x + (Math.random() - 0.5) * 0.8; o.y = s.y + 1.4; o.z = s.z + (Math.random() - 0.5) * 0.8; o.vx = 0.3 + Math.random() * 0.3; o.vy = 1 + Math.random() * 0.6; o.vz = -0.2; o.life = o.max = 2.4; o.g = 0; o.drag = 0.3; o.r = 0.32; o.gg = 0.3; o.b = 0.36; o.size = 3.4; });
  }
}

export const muertes = (g) => (g.flags.tilo ? DEATH_LINES.despues : DEATH_LINES.antes);
export const tendencia = (g) => (g.flags.tilo ? ['tilo', 'Diez caídas. Yo con diez caídas ya me como la montaña. Tú sigue.'] : null);
export const musica = (g) => (g.section.n >= 3 && g.section.n <= 4 ? 'ruinas' : 'nivel');
export const objetivo = (g) => ({ texto: 'Piezas del recolector', n: g.L.piezas.filter(q => q.got).length, total: 3 });
