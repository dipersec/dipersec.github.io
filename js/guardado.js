// guardado.js — Guarda mundo, punto de control, habilidades, registros y ajustes en localStorage.
// Todo se valida al cargar: un guardado roto o de otra versión nunca impide jugar.
const KEY = 'dip-ultimo-recuerdo';

const num = (v, d, lo, hi) => (typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d);
const arr = (v) => (Array.isArray(v) ? v.filter(x => typeof x === 'string' || typeof x === 'number') : []);

function normalizar(s) {
  s = s && typeof s === 'object' ? s : {};
  const ck = s.progreso && s.progreso.ck;
  const progreso = ck && ['x', 'y', 'z', 'sec'].every(k => typeof ck[k] === 'number')
    ? { mundo: typeof s.progreso.mundo === 'string' ? s.progreso.mundo : 'nacar', ck, vidas: num(s.progreso.vidas, 4, 1, 99), particulas: num(s.progreso.particulas, 0, 0, 99), conchas: num(s.progreso.conchas, 0, 0, 2) }
    : null;
  return {
    v: 1,
    mundo: typeof s.mundo === 'string' ? s.mundo : 'nacar',
    progreso,
    habilidades: arr(s.habilidades),
    registros: arr(s.registros),
    completados: s.completados && typeof s.completados === 'object' ? s.completados : {},
    mejor: s.mejor && typeof s.mejor === 'object' ? s.mejor : {},
    ajustes: {
      volumen: num(s.ajustes && s.ajustes.volumen, 80, 0, 100),
      efectosReducidos: !!(s.ajustes && s.ajustes.efectosReducidos)
    }
  };
}

export function cargar() {
  try { return normalizar(JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch (e) { console.warn('Guardado ilegible; se empieza de cero.', e); return normalizar({}); }
}
export function guardar(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); return true; }
  catch (e) { console.warn('No se pudo guardar (almacenamiento bloqueado o lleno).', e); return false; }
}
