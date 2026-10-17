// reglas.js — Lo que el núcleo le pregunta a Vértice: progreso al continuar, líneas de muerte, música y objetivo.
import { DEATH_LINES } from './historia.js';

const activarLey = (g, m) => {
  g.memorias.activar(m, true); m.state = 'activa'; m.t = Infinity;
  for (const id of m.campos || []) { const c = g.L.campos.find(q => q.id === id); if (c) c.activo = !c.activo; }
};

export function aplicarProgreso(g, pr) {
  if (pr.leyes) for (const m of g.L.memorias) if (m.ley && m.state !== 'activa') activarLey(g, m);
  // los puentes de la fase 2 ya están conectados si se continúa más adelante
  if (pr.puentes) for (const m of g.L.memorias) if (m.interruptor && !m.ley && m.state !== 'activa') activarLey(g, m);
  if (pr.jefe) { g.boss.defeated = true; g.boss.off = 1; g.flags.jefe = true; g.L.salida.active = false; g.fx.salida = 1; g.fx.arquitectoSube = 1; }
}

export function alInterruptor(g, m) {
  if (!m.ley) return;
  const n = g.L.memorias.filter(q => q.ley && q.state === 'activa').length;
  g.showToast(`Dispositivo ${n}/3 · ${m.campos[0] === 'c3' ? 'gravedad normal' : m.campos[0] === 'c2' ? 'campo invertido' : 'gravedad ligera'}`, 2.2);
  if (n >= 3) g.objetivo = null;
}

export const muertes = () => DEATH_LINES;
export const tendencia = () => ['constructor', 'Diez caídas. En Vértice eso ya cuenta como estilo de vuelo.'];
export const musica = (g) => (g.section.n === 4 ? 'leyes' : 'vertice');
export const objetivo = (g) => ({ texto: 'Dispositivos de las leyes', n: g.L.memorias.filter(q => q.ley && q.state === 'activa').length, total: 3 });
