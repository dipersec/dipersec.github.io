// historia.js — Escenas de Vértice. Humor: los constructores y los registros. Filosofía: el Arquitecto y Lunex.
// El Arquitecto no es un villano plano: quería un mundo sin errores y no dejó espacio para nada nuevo.
import { STATE, setState } from '../../player.js';
import { wait, until, say, fadeTo } from '../../director.js';
import { reaparecer } from '../comun.js';
import { TIPS, YB } from './nivel.js';

export const NOMBRES = { dip: 'DIP', constructor: 'Constructor', arquitecto: 'Arquitecto de Vértice', lunex: 'Lunex', registro: 'Registro' };

export const DEATH_LINES = [
  ['constructor', 'Caíste hacia abajo. Al menos elegiste una dirección.'],
  ['constructor', 'Aquí perder el suelo es normal. Perder la vida, un poco menos.'],
  ['dip', '¿Arriba era por allá?'],
  ['constructor', 'Regla 4 del manual: no caer. Regla 5: si caes, ver regla 4.'],
  ['dip', 'Si la gravedad cambia de opinión, ¿yo también puedo?']
];

export function setupHistoria(g) {
  const S = g.director.scripts, p = g.player, sp = g.L.spots;
  g.tipsText = TIPS;

  // ---------- Apertura: DIP cae del cielo sobre la primera isla (≈18 s) ----------
  S.apertura = function* () {
    g.musicOverride = 'apertura';
    const d = sp.despertar;
    g.placePlayer(d.x, 16, d.z); p.poseAnim = 'fall'; setState(p, STATE.POSE);
    g.cam.fix = { x: -3.4, y: 2.2, z: 11.5, lx: 0.6, ly: 4, lz: 2 }; g.cam.snap = true; g.cam.speed = 2;
    yield fadeTo(0, 1);
    setState(p, STATE.FALLING);
    yield until(() => p.onGround);
    g.addTrauma(0.35); g.dust(16, 2.4); g.sound.sfx('caida_fuerte');
    p.poseAnim = 'crouch'; setState(p, STATE.POSE);
    yield wait(0.5);
    p.poseAnim = 'idle';
    g.cam.fix = { x: -1.8, y: 2.0, z: 9.6, lx: 1.2, ly: 1.1, lz: 2.4 };
    yield say('constructor', '¡Llegaste de arriba! ¿O de abajo? Aquí depende del martes.');
    yield say('dip', 'Vengo de Nácar. Creo que hacia arriba.');
    yield say('constructor', 'Las islas se están despegando. El Arquitecto dice que es una mejora. Nosotros solo construimos.');
    g.cam.fix = null; g.musicOverride = null;
    setState(p, STATE.IDLE);
    g.timerOn = true;
  };

  S.reaparecer = reaparecer(g, 'Sin vidas. Vértice te devuelve cuatro (hacia arriba).');

  S.constructores = function* () {
    if (!g.trial) g.say('constructor', 'Construimos hacia abajo. O hacia arriba. Según quién nos mire.', 3);
  };
  S.constructores.free = true;

  // ---------- Fase 4: la cámara de las leyes ----------
  S.leyes = function* () {
    g.objetivo = { tipo: 'leyes' };
    if (!g.trial) {
      g.say('dip', 'Tres dispositivos… y cada uno cambia una ley.', 2.6);
      yield wait(2.4);
      g.tip(g.touchUI ? 'Gira junto a cada dispositivo para cambiar su campo.' : 'Gira (X) junto a cada dispositivo para cambiar su campo.', 3.6);
    }
  };
  S.leyes.free = true;

  // ---------- Fase 5: el Arquitecto de Vértice ----------
  S.arquitecto = function* () {
    g.gate = { x0: -9, x1: 9, y0: YB, y1: YB + 9, z0: -318.6, z1: -318.1, active: true, mat: 'reja' }; g.solids.push(g.gate);
    g.cam.fix = { x: 0, y: YB + 4, z: -326, lx: 0, ly: YB + 4, lz: sp.arquitecto.z }; g.cam.speed = 2.5;
    g.fx.arquitectoSube = 0.001; g.sound.sfx('guardian_despierta'); g.addTrauma(0.4);
    yield until(() => g.fx.arquitectoSube >= 1);
    if (!g.trial) yield say('arquitecto', 'Cada isla en su lugar. Cada ley sin excepciones. Tú eres una excepción.');
    g.cam.fix = null; g.boss.start();
    if (!g.trial) g.tip('Cuando abra su núcleo, gira junto al nodo con el mismo símbolo que muestra.', 4);
  };
  S.arquitectoFase2 = function* () {
    g.say('arquitecto', 'Si arriba y abajo te confunden, quédate quieto. Es lo más ordenado.', 3);
    g.addTrauma(0.3);
    if (!g.trial) { yield wait(1.2); g.tip('Ahora invierte la gravedad de la sala. El nodo correcto puede estar arriba.', 3.6); }
  };
  S.arquitectoFase3 = function* () {
    g.say('arquitecto', 'Reubicando todo. Otra vez. Hasta que quede perfecto.', 2.6);
    g.addTrauma(0.3);
  };
  S.arquitectoDerrotado = function* () {
    const b = g.boss;
    g.cam.fix = { x: 3.5, y: YB + 3.5, z: b.z + 8, lx: b.x, ly: b.y + 0.5, lz: b.z }; g.cam.speed = 3;
    g.sound.sfx('apagado');
    if (!g.trial) yield say('arquitecto', 'Diseñé un mundo sin errores… y no dejé espacio para nada nuevo.');
    yield until(() => b.off >= 0.9);
    g.flags.jefe = true;
    if (g.gate) g.gate.active = false;
    g.L.salida.active = false; g.fx.salida = 0.001; g.sound.sfx('puerta');
    g.cam.fix = null;
    g.setCheckpoint({ x: 0, y: YB, z: -350, sec: 5 }, true);
    if (!g.trial) g.say('dip', 'Las islas siguen soltándose… Tengo que recordar algo.', 3);
  };

  // ---------- Fase 6: la memoria del océano ----------
  S.oceano = function* () {
    if (!g.trial) g.say('dip', 'Recuerdo un océano que caía hacia arriba…', 2.8);
  };
  S.oceano.free = true;

  S.final = function* () {
    g.timerOn = false;
    const f = sp.final;
    g.cam.fix = { x: 5.5, y: f.y + 2.6, z: f.z + 7, lx: 0, ly: f.y + 3, lz: f.z - 6 }; g.cam.speed = 2;
    g.fx.oceano = 0.001; g.sound.sfx('senal'); p.proj = 1.2;
    if (!g.trial) yield say('dip', 'El océano subía. Las islas flotaban sobre él. Así era.');
    yield until(() => g.fx.oceano >= 1);
    g.addTrauma(0.4); g.showToast('Las islas se estabilizan', 2.4);
    yield wait(1.6);
    // revelación: no todo vuelve al estado anterior
    g.fx.islaLejana = 0.001; g.sound.sfx('reconfigura');
    g.cam.fix = { x: 2, y: f.y + 3, z: f.z + 4, lx: -40, ly: f.y + 12, lz: f.z - 70 }; g.cam.speed = 1.5;
    yield wait(1.8);
    g.fx.lunex = 0.001; g.sound.sfx('lunex');
    if (!g.trial) {
      yield say('lunex', 'Estabilizaste las islas. Una región lejana acaba de cambiar. Así empieza todo, anomalía.');
      yield say('dip', 'Arreglé algo… y algo más cambió.');
    }
    yield wait(1);
    yield fadeTo(1, 1, '#eaf6ff');
    g.finishLevel();
  };
}
