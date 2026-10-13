// historia.js — Escenas de Nácar. Regla: ninguna escena dura más de ~25 s y casi todo se cuenta jugando.
// El humor sale de Tilo y de los registros; Lunex aporta la parte filosófica (y no es un villano plano).
import { STATE, setState } from '../../player.js';
import { CONFIG } from '../../config.js';
import { wait, until, say, fadeTo } from '../../director.js';
import { TIPS } from './nivel.js';

export const NOMBRES = { dip: 'DIP', tilo: 'Tilo', lunex: 'Lunex', guardian: 'Guardián de la Estación', capsula: 'Cápsula', registro: 'Registro' };

export const DEATH_LINES = {
  antes: [
    ['capsula', 'Pasajero reiniciado. Daños: los mismos de antes.'],
    ['capsula', 'Consejo: el suelo funciona mejor cuando está debajo.'],
    ['dip', '…otra vez.']
  ],
  despues: [
    ['tilo', 'Te caíste. Yo también me caigo, pero siempre hacia abajo. Es más cómodo.'],
    ['tilo', '¿Seguro que no quieres una piedra? Dan fuerza. Creo.'],
    ['capsula', 'Pasajero reiniciado. Daños: los mismos de antes.'],
    ['dip', 'Si recuerdo cómo caí… ¿también existe la caída?'],
    ['tilo', 'Tranquilo. En Nácar nadie se rompe del todo. Solo un poquito.']
  ]
};

export function setupHistoria(g) {
  const S = g.director.scripts, p = g.player, sp = g.L.spots;
  g.tipsText = TIPS;

  // ---------- Apertura: el cráter (≈20 s) ----------
  S.apertura = function* () {
    g.musicOverride = 'apertura';
    g.placePlayer(sp.despertar.x, 0, sp.despertar.z); p.poseAnim = 'hurt'; setState(p, STATE.POSE); p.face = 1;
    g.cam.fix = { x: -2.6, y: 1.9, z: 10.6, lx: 1.4, ly: 0.9, lz: 6.2 }; g.cam.snap = true; g.cam.speed = 1.6;
    g.fx.humo = true; g.fx.pantalla = 0;
    yield fadeTo(0, 1.4);
    yield wait(0.6);
    g.fx.pantalla = 1; g.sound.sfx('capsula');
    yield say('capsula', 'Aterrizaje completado. Daños: sí.');
    p.poseAnim = 'crouch'; g.dust(10, 1.6); g.sound.sfx('caida');
    yield wait(0.35);
    p.poseAnim = 'idle';
    g.cam.fix = { x: -1.6, y: 1.8, z: 9.6, lx: -0.2, ly: 1.1, lz: 4.4 };
    yield say('dip', '¿Dónde estoy? Recuerdo caer… pero no recuerdo haber subido.');
    yield say('capsula', 'Pasajero: DIP. Destino: no encontrado. Le sugerimos conseguir uno.');
    g.cam.fix = null; g.musicOverride = null;
    setState(p, STATE.IDLE);
    g.timerOn = true;
  };

  // ---------- Muerte: control otra vez en ~1 s, con un comentario distinto ----------
  S.reaparecer = function* () {
    g.deaths++; g.deathsHere++;
    yield wait(0.35);
    yield fadeTo(1, CONFIG.respawnFade, '#0d0a14');
    g.lives--;
    // ayuda dinámica: 5 muertes → una Concha de regalo; 10 → punto de control extra
    if (g.deathsHere >= 10 && !g.flags.extraCk && g.safe.length) {
      const far = g.safe.reduce((a, b) => (b.z < a.z ? b : a));
      if (far.z < g.checkpoint.z - 6) { g.checkpoint = { x: far.x, y: far.y, z: far.z, sec: g.section.n }; g.flags.extraCk = true; g.showToast('Punto de control extra'); }
    }
    const k = g.checkpoint;
    g.placePlayer(k.x, k.y + 0.05, k.z); setState(p, STATE.IDLE); p.invuln = 1.2; p.hidden = false;
    if (g.lives <= 0) { g.lives = 4; g.fragments = 0; g.showToast('Sin vidas. Nácar te devuelve cuatro.', 2.5); }
    if (g.deathsHere >= 5 && !g.flags.ayuda5 && g.conchas === 0) { g.flags.ayuda5 = true; g.conchas = 1; g.sound.sfx('concha'); }
    for (const e of g.L.ecos) { e.on = false; e.buf.length = 0; e.vis = 0; }
    g.ondas.clear();
    if (g.chase.on || (k.sec === 6 && !g.chase.done && g.flags.jefe)) { g.chase.on = true; g.resetChase(k.z); }
    if (g.boss.active) g.boss.place();
    yield wait(0.08);
    yield fadeTo(0, 0.3);
    const [who, text] = g.deathLine();
    g.say(who, text, 2.6);
  };

  // ---------- Fase 2: Tilo ----------
  S.conocerTilo = function* () {
    g.flags.tilo = true;
    if (g.trial) { g.objetivo = { tipo: 'piezas', n: g.L.piezas.filter(q => q.got).length, total: 3 }; return; }
    const t = sp.tilo;
    g.cam.fix = { x: t.x + 4.2, y: 2.6, z: t.z + 5.4, lx: (t.x + p.pos.x) / 2, ly: 1.1, lz: t.z + 0.6 }; g.cam.speed = 3;
    g.fx.tiloSalta = 1; g.sound.sfx('tilo_hola');
    yield wait(0.5);
    yield say('tilo', '¡Un visitante! ¿Comes piedras? Esta sabe a lunes.');
    yield say('dip', 'No… no como piedras.');
    yield say('tilo', 'Más para mí. Oye: mi recolector se tragó tres piezas y se descompuso. Si me las traes, te abre el camino.');
    g.cam.fix = null;
    g.objetivo = { tipo: 'piezas', n: 0, total: 3 };
    yield wait(0.4);
    g.say('tilo', 'Una la tiene el escarabajo de rayas. Odian que les salten encima.', 3.4);
  };
  S.reparar = function* () {
    g.objetivo = null;
    const r = sp.recolector;
    if (!g.trial) { g.cam.fix = { x: r.x + 5, y: 4.2, z: r.z + 8, lx: r.x, ly: 1.6, lz: r.z }; g.cam.speed = 3; }
    g.sound.sfx('maquina'); g.addTrauma(0.2);
    g.fx.recolector = 0.001;
    yield until(() => g.fx.recolector >= 0.5);
    g.L.recolector.active = false;
    if (!g.trial) yield say('tilo', '¡Funciona! Escucha cómo mastica… qué orgullo. Ve, ve. Si un cristal te mira raro, es normal. Creo.');
    yield until(() => g.fx.recolector >= 1);
    g.cam.fix = null;
  };

  // ---------- Fase 3: el primer recuerdo ----------
  S.primerRecuerdo = function* () {
    const c = g.L.cristales[0];
    if (c) c.vuela = 0;
    g.sound.sfx('cristal_llama');
    yield until(() => !c || c.vuela >= 1);
    if (c) c.got = true;
    g.habilidades.add('recordar'); g.saveProgress();
    g.fx.flash = 1; g.hitStop = 0.12; g.addTrauma(0.3); g.sound.sfx('recordar_grande');
    p.proj = 0.8;
    g.burst(p.pos.x, p.pos.y + 1.2, p.pos.z, 40, [0.85, 0.95, 1], { speed: 6, life: 1, size: 1.6 });
    if (!g.trial) {
      yield wait(0.4);
      g.say('dip', 'Recuerdo una forma… un puente. No sé si existió. Pero ahora podría.', 3.6);
      yield wait(1.4);
      g.tip(g.touchUI ? TIPS.recordar.t : TIPS.recordar.k, 4.2);
    }
  };
  S.primerRecuerdo.free = true;
  S.puente = function* () { if (!g.trial) g.say('dip', 'Este lo recuerdo entero. Creo.', 2.4); };
  S.puente.free = true;

  // ---------- Fase 5: el núcleo, el registro y el Guardián ----------
  S.nucleo = function* () {
    g.gate = { x0: -10, x1: 10, y0: 0, y1: 8, z0: -300.6, z1: -300.1, active: true, mat: 'reja' }; g.solids.push(g.gate);
    const n = sp.nucleo;
    g.cam.fix = { x: 3.2, y: 2.8, z: n.z + 6.5, lx: n.x, ly: 1.4, lz: n.z - 1 }; g.cam.speed = 3;
    g.fx.nucleo = 0.001; g.sound.sfx('nucleo');
    yield wait(0.9);
    if (!g.trial && !g.flags.nucleoVisto) {
      yield say('registro', 'PASAJERO: DIP. ESTADO: PRESENTE. DESTINO: PENDIENTE DE CREACIÓN. FECHA DE LLEGADA: ANTERIOR AL VIAJE.');
      yield say('dip', '¿Llegué… antes de venir?');
    }
    g.flags.nucleoVisto = true;
    g.fx.guardianSube = 0.001; g.sound.sfx('guardian_despierta'); g.addTrauma(0.5);
    g.cam.fix = { x: 0, y: 6.5, z: -307, lx: 0, ly: 2.2, lz: sp.guardian.z }; g.cam.speed = 2.5;
    yield until(() => g.fx.guardianSube >= 1);
    if (!g.trial) yield say('guardian', 'Pasajero no autorizado. Usted llegó antes de partir. Eso no está en el horario.');
    g.cam.fix = null; g.boss.start();
    if (!g.trial) g.tip('Salta sus ondas. Si suelta una célula, gira junto a ella para devolvérsela.', 4);
  };
  S.guardianFase2 = function* () {
    const b = g.boss; b.shots.clear(); g.ondas.clear();
    g.say('guardian', 'Reconfigurando acceso. Escaleras: retiradas.', 2.2);
    g.addTrauma(0.4); g.sound.sfx('maquina');
    yield wait(0.6);
    const tw = g.L.towers[0];
    b.tower = 0;
    b.hop = { x0: b.x, y0: b.y, z0: b.z, x1: tw.x, y1: tw.top, z1: tw.z, t: 0, dur: 1.1, done: () => b.abrirEscalera(0) };
    yield until(() => !b.hop);
    if (!g.trial) g.tip('Faltan escalones. Recuérdalos junto al ancla y písale la cabeza.', 3.6);
  };
  S.guardianFase3 = function* () {
    const b = g.boss;
    b.hop = { x0: b.x, y0: b.y, z0: b.z, x1: 0, y1: 0, z1: sp.guardian.z, t: 0, dur: 1, done: null };
    yield until(() => !b.hop);
    g.say('guardian', 'Drones de mantenimiento: ejecuten todas las órdenes. A la vez.', 2.6);
    b.callFormas();
    if (!g.trial) g.tip('Los drones dudan con cada orden. Llévalos hasta el Guardián.', 3.6);
  };
  S.guardianDesactivado = function* () {
    const b = g.boss;
    g.cam.fix = { x: b.x + 3.4, y: 3.2, z: b.z + 7.5, lx: b.x, ly: 1.5, lz: b.z }; g.cam.speed = 3;
    g.sound.sfx('apagado');
    if (!g.trial) yield say('guardian', 'Llegada… registrada. Otra vez. Bienvenido… de nuevo, pasajero.');
    yield until(() => b.off >= 0.8);
    g.flags.jefe = true;
    if (g.gate) g.gate.active = false;
    g.L.salida.active = false; g.fx.salida = 0.001; g.sound.sfx('puerta');
    g.cam.fix = null;
    g.addTrauma(0.6); g.sound.sfx('reconfigura');
    g.showToast('La estación se reconfigura', 2.4);
    g.setCheckpoint({ x: 0, y: 0, z: -333, sec: 5 }, true);
  };

  // ---------- Fase 6: la huida ----------
  S.persecucion = function* () {
    g.chase.on = true; g.chase.z = p.pos.z + 10; g.chase.speed = 4.5;
    g.sound.sfx('reconfigura'); g.addTrauma(0.5);
    yield wait(0.25);
    if (!g.trial) g.tip(g.touchUI ? '¡Corre hacia la cámara! (pulgar hacia abajo)' : '¡Corre hacia la cámara! (↓ o S)', 3.6);
  };
  S.persecucion.free = true;
  S.finPersecucion = function* () { g.sound.sfx('reconfigura'); g.addTrauma(0.3); };
  S.lunex = function* () {
    g.fx.lunex = 0.001; g.sound.sfx('lunex');
    if (!g.trial) g.say('lunex', 'Anomalía detectada. No te odio, pequeño. Temo lo que puedas recordar.', 4.2);
    yield wait(5);
    g.fx.lunexSale = true;
  };
  S.lunex.free = true;

  S.final = function* () {
    g.timerOn = false;
    const t = sp.tiloFinal;
    g.fx.tiloFinal = true; g.fx.senal = 0;
    g.auto = { x: 0, y: 0 };
    g.cam.fix = { x: 4.6, y: 2.4, z: -447.2, lx: 0.9, ly: 1.2, lz: t.z - 0.8 }; g.cam.speed = 2.5;
    yield wait(0.4);
    g.auto = null;
    if (!g.trial) {
      yield say('dip', '¿Tilo? ¿Cómo llegaste antes que yo?');
      yield say('tilo', 'Atajo. Por debajo. Comiendo.');
      yield say('tilo', 'Te soñé, ¿sabes? Antes de que cayeras. ¿Eso me hace adivino… o a ti, un sueño?');
      yield say('dip', 'Espero que ninguno de los dos.');
    }
    g.fx.senal = 0.001; g.sound.sfx('senal'); g.addTrauma(0.3);
    g.cam.fix = { x: 3.8, y: 1.4, z: -447.4, lx: 0, ly: 7, lz: sp.senal.z }; g.cam.speed = 1.6;
    yield until(() => g.fx.senal >= 1);
    g.showToast('Ruta a Vértice: abierta', 2.6);
    yield wait(1.6);
    yield fadeTo(1, 1, '#f4eefc');
    g.finishLevel();
  };
}
