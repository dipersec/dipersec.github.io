// registro.js — Los siete mundos. Cada mundo aporta sus datos (nivel, historia, jefe, escena) con la misma
// interfaz; el núcleo del juego (física, cámara, enemigos, memoria, HUD) no cambia al añadir uno.
// Solo los mundos con `listo: true` se pueden jugar; los demás se muestran como "próximamente", nunca vacíos.
import { buildNacar, progresoHasta as progresoNacar } from './nacar/nivel.js';
import { setupHistoria as historiaNacar, NOMBRES as nombresNacar, DEATH_LINES as _muertes } from './nacar/historia.js';
import { Guardian } from './nacar/guardian.js';
import { EscenaNacar } from './nacar/escena.js';
import * as reglasNacar from './nacar/reglas.js';
import { buildVertice, progresoHasta as progresoVertice } from './vertice/nivel.js';
import { setupHistoria as historiaVertice, NOMBRES as nombresVertice } from './vertice/historia.js';
import { Arquitecto } from './vertice/arquitecto.js';
import { EscenaVertice } from './vertice/escena.js';
import * as reglasVertice from './vertice/reglas.js';

export const MUNDOS = [
  {
    id: 'nacar', n: 1, nombre: 'Nácar', subtitulo: 'El planeta de la caída', listo: true,
    jefe: 'Guardián de la Estación', habilidad: 'Reconstrucción por memoria',
    revelacion: 'La estación registró a DIP antes del viaje.',
    construir: buildNacar, progresoHasta: progresoNacar, historia: historiaNacar, nombres: nombresNacar, Escena: EscenaNacar, ...reglasNacar,
    Jefe: Guardian, medallas: { oro: 260, plata: 330, bronce: 420 }
  },
  {
    id: 'vertice', n: 2, nombre: 'Vértice', subtitulo: 'El planeta de las leyes rotas', listo: true, requiere: 'nacar',
    jefe: 'Arquitecto de Vértice', habilidad: 'Estabilizar campos físicos',
    revelacion: 'Cambiar una ley arregla algo… y cambia otra cosa lejos.',
    construir: buildVertice, progresoHasta: progresoVertice, historia: historiaVertice, nombres: nombresVertice, Escena: EscenaVertice, ...reglasVertice,
    Jefe: Arquitecto, medallas: { oro: 300, plata: 380, bronce: 480 }, habilidadesIniciales: ['recordar'],
    fxCrecer: { arquitectoSube: 2.2, salida: 1.4, oceano: 3.5, islaLejana: 2.4 },
    camTitulo: { x: -3, y: 5.5, z: 11, lx: 1, ly: 3, lz: -18 }
  },
  { id: 'horalia', n: 3, nombre: 'Horalia', subtitulo: 'El planeta del tiempo contradictorio', listo: false, jefe: 'Cronarca', habilidad: 'Activar mecanismos por secuencia' },
  { id: 'lumen', n: 4, nombre: 'Lúmen', subtitulo: 'El planeta de las reglas absolutas', listo: false, jefe: 'Ejecutor de Normas', habilidad: 'Alterar restricciones temporalmente' },
  { id: 'miral', n: 5, nombre: 'Miral', subtitulo: 'El planeta de las vidas posibles', listo: false, jefe: 'Reflejo Incompleto', habilidad: 'Alternar configuraciones' },
  { id: 'archivo', n: 6, nombre: 'El Archivo', subtitulo: 'El planeta de todo lo recordado', listo: false, jefe: 'Bibliotecario de Continuidad', habilidad: 'Combinar recuerdos' },
  { id: 'umbral', n: 7, nombre: 'El Umbral', subtitulo: 'El mundo que no debería existir', listo: false, jefe: 'Lunex', habilidad: 'Combinar todas las habilidades' }
];
export const mundo = (id) => MUNDOS.find(m => m.id === id && m.listo) || MUNDOS[0];
// un mundo se abre al terminar el anterior (el 1 siempre está abierto)
export const desbloqueado = (m, save) => m.listo && (!m.requiere || !!save.completados[m.requiere]);
