// story.js — Las 9 escenas de Nácar como guiones (generadores) que avanzan dentro de update().
// Cada `yield` devuelve un "waiter" con update(dt) → true cuando termina.
import { STATE, setState } from './player.js';

// ---------- waiters ----------
const wait = (s) => ({ t: s, update(dt) { this.t -= dt; return this.t <= 0; } });
const until = (fn) => ({ update: () => fn() });
const say = (who, text) => ({ start(g) { g.openDialog(who, text); }, update(dt, g) { return !g.dialog; } });
const fadeTo = (a, dur, color) => ({
  start(g) { if (color) g.fade.color = color; g.fade.target = a; g.fade.speed = Math.abs(a - g.fade.a) / Math.max(0.01, dur) || 99; },
  update(dt, g) { return g.fade.a === g.fade.target; }
});
const vision = (kind, dur) => ({ start(g) { g.vision = { kind, t: 0, dur }; }, update(dt, g) { if (g.vision.t >= g.vision.dur) { g.vision = null; return true; } return false; } });
const tiloTo = (x, speed = 150) => ({ start(g) { g.tilo.targetX = x; g.tilo.speed = speed; }, update(dt, g) { return g.tilo.targetX === null; } });
const walkTo = (x, run = false) => ({
  update(dt, g) {
    const p = g.player, c = p.pos.x + p.w / 2, d = x - c;
    if (Math.abs(d) < 4) { g.auto.x = 0; g.auto.run = false; return true; }
    g.auto.x = Math.sign(d); g.auto.run = run; return false;
  }
});

export class Director {
  constructor(game) { this.g = game; this.tasks = []; this.scripts = {}; }
  get blocking() { return this.tasks.some(t => t.blocking); }
  run(script, opts = {}) {
    const fn = typeof script === 'string' ? this.scripts[script] : script;
    if (!fn) return;
    if (opts.unique !== false && this.tasks.some(t => t.fn === fn)) return;
    this.tasks.push({ fn, it: fn(this.g), wait: null, blocking: opts.block !== false && !fn.free });
  }
  update(dt) {
    for (let i = 0; i < this.tasks.length; i++) {
      const t = this.tasks[i];
      if (t.wait && !t.wait.update(dt, this.g)) continue;
      const r = t.it.next();
      if (r.done) { this.tasks.splice(i--, 1); if (!this.blocking) this.g.auto.x = 0; continue; }
      t.wait = r.value || wait(0);
      t.wait.start?.(this.g);
    }
  }
}

const IS_TOUCH = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const K = IS_TOUCH
  ? { move: 'Desliza el pulgar a la izquierda para moverte', jump: 'Saltar: mantén para llegar más alto' }
  : { move: '← →  moverse   ·   Shift  correr', jump: 'Espacio  saltar' };

export function setupStory(g) {
  const S = g.director.scripts, sp = g.L.spots;
  const I = (o) => g.interactables.push(o);
  const T = (o) => g.triggers.push(o);
  const p = g.player;

  // =====================================================================
  // ESCENA 1 · Una llegada que nadie ha solicitado
  // =====================================================================
  S.intro = function* () {
    g.music = 'silencio'; g.fade.a = 1; g.fade.target = 1; g.fade.color = '#000000';
    g.cam.fix = { x: 700, y: -640 }; g.cam.snap = true; g.envOverride = 'cielo';
    g.flags.introMetal = true;
    yield wait(1.8);
    g.fx.meteor = 0;
    yield fadeTo(0, 1.6);
    yield wait(3.4);
    g.sound.sfx('impacto'); g.cam.shake = 1.2;
    yield fadeTo(1, 0.35, '#f4efe4');
    g.fx.meteor = -1; g.flags.introMetal = false; g.envOverride = null;
    g.cam.fix = { x: 330, y: -80 }; g.cam.snap = true; g.sec = 0;
    for (let i = 0; i < 70; i++) g.particles.spawn(o => {
      const a = Math.random() * Math.PI; o.x = sp.capsula.x + (Math.random() - 0.5) * 60; o.y = -10; o.z = (Math.random() - 0.5) * 80;
      o.vx = Math.cos(a) * (40 + Math.random() * 120); o.vy = -Math.sin(a) * (20 + Math.random() * 90); o.vz = (Math.random() - 0.5) * 60;
      o.life = o.max = 2.5 + Math.random() * 2.5; o.g = 0; o.drag = 0.7; o.r = 0.95; o.gg = 0.93; o.b = 0.88;
    });
    yield fadeTo(0, 2.6);
    yield wait(1.2);
    g.fx.crystalFly = 0; g.sound.sfx('cristal');
    yield wait(1.6);
    g.fx.hatch = 1; g.sound.sfx('metal'); g.sound.sfx('puerta');
    yield wait(0.9);
    p.hidden = false; g.placePlayer(sp.capsula.x + 18, -40, 1); p.vel.x = 95; p.vel.y = -330;
    yield until(() => p.onGround);
    g.pose('crouch'); g.sound.sfx('caida');
    yield wait(1.1);
    g.pose('idle');
    yield wait(0.7);
    p.face = -1; yield wait(0.9); p.face = 1; yield wait(0.7);
    g.cam.fix = { x: 400, y: -110 };
    yield wait(1.2);
    p.face = -1;
    yield say('pantalla', 'IDENTIDAD: ERROR.\nORIGEN: NO REGISTRADO.\nDESTINO: NO REGISTRADO.\nVIAJE: COMPLETADO.');
    g.fx.screenOff = true; g.sound.sfx('pantalla');
    yield wait(0.9);
    p.face = 1; yield wait(0.6); p.face = -1; yield wait(0.5); p.face = 1;
    g.unpose(); g.cam.fix = null;
    g.music = 'superficie';
    g.setObjective('Sal del cráter');
    g.showHint(K.move, 4);
    g.director.run(S.ayudas, { block: false });
  };
  S.ayudas = function* () {
    yield until(() => Math.abs(p.pos.x - 220) > 90);
    yield wait(1.5);
    g.showHint(K.jump, 3.5);
    yield until(() => p.pos.x > 760 || g.flags.cristalCrater);
  };
  S.ayudas.free = true;

  I({ sec: 0, x: sp.capsula.x + 10, y: 0, r: 50, label: 'Examinar', run: function* () {
    yield say('pantalla', 'IDENTIDAD: ERROR.\nORIGEN: NO REGISTRADO.\nDESTINO: NO REGISTRADO.\nVIAJE: ▒▒▒▒▒▒▒▒▒▒.');
  } });
  I({ sec: 0, x: sp.cristalCrater.x, y: 0, r: 40, label: 'Examinar', run: function* () {
    g.flags.cristalCrater = true; g.sound.sfx('cristal');
    g.burst(sp.cristalCrater.x, -20, 14, [0.75, 0.92, 0.97], { speed: 60, life: 0.9, up: 40 });
  } });
  // Secreto 1: la huella adicional
  T({ sec: 0, x0: 615, x1: 680, y0: -340, y1: -255, run: function* () {
    g.findSecret('huella', 'Una huella en la pared');
  } });
  S.reaparecer = function* () {
    setState(p, STATE.DEAD);
    g.sound.sfx('dano');
    yield fadeTo(1, 0.22, '#000000');
    const k = g.checkpoint;
    g.placePlayer(k.x, k.y, 1); p.energy = 3; p.invuln = 1;
    yield wait(0.08);
    yield fadeTo(0, 0.3);
  };

  // =====================================================================
  // ESCENA 2 · Las huellas que llegan antes
  // =====================================================================
  T({ sec: 0, x0: 1030, x1: 1100, run: function* () {
  } });
  T({ sec: 0, x0: 1450, x1: 1500, run: function* () {
  } });

  // =====================================================================
  // ESCENA 3 · Tilo y el negocio de las piedras comestibles
  // =====================================================================
  T({ sec: 0, x0: 1850, x1: 1990, run: function* () {
    g.auto.x = 0;
    yield say('voz', '¡Eh! ¡Deja de pisar eso!');
    g.tilo.face = -1;
    yield tiloTo(1990, 190);
    p.face = 1;
    yield wait(0.4);
    yield say('tilo', 'Magnífico. Un visitante del espacio. Justo lo que necesitaba para mi economía.');
    yield say('tilo', '¿No hablas?');
    g.pose('idle');
    for (let i = 0; i < 4; i++) { p.face = -p.face; yield wait(0.16); }
    p.face = 1; g.unpose();
    yield say('tilo', 'Perfecto. Un cliente silencioso.');
    yield say('tilo', 'Tu cápsula atascó mi recolector. Empuja las rocas a los huecos y baja la palanca.');
    g.flags.conoceTilo = true;
    g.setObjective('Rocas a los huecos · palanca');
    g.showHint('Camina contra una roca para empujarla', 3.5);
  } });

  I({ sec: 0, get x() { return g.tilo.x; }, y: -220, r: 44, label: 'Hablar', cond: () => g.flags.conoceTilo && g.tilo.visible && !g.flags.final, run: function* () {
    g.tilo.face = Math.sign(p.pos.x - g.tilo.x) || 1;
    if (!g.flags.recolector) {
      const n = (g.flags.charlaTilo = (g.flags.charlaTilo || 0) + 1) % 3;
      if (n === 1) yield say('tilo', 'Las rocas no se mueven solas… normalmente.');
      else if (n === 2) yield say('tilo', 'Los escarabajos de polvo son ladrones profesionales.');
      else yield say('tilo', 'Esas piedras se comen. Las de allá, depende del día.');
    } else {
      yield say('tilo', 'Si una puerta da a una habitación que no existe… no entres. O entra.');
    }
  } });

  I({ sec: 0, x: sp.recolector.x, y: -220, r: 75, label: 'Bajar palanca', cond: () => g.flags.conoceTilo && !g.flags.recolector, run: function* () {
    if (!g.L.rocks.every(r => r.inSlot)) { yield say('tilo', 'Primero las rocas.'); return; }
    g.flags.recolector = true; g.sound.sfx('puerta'); g.sound.sfx('metal'); g.cam.shake = 0.3;
    g.burst(sp.recolector.x, -300, 24, [0.92, 0.9, 0.85], { speed: 110, life: 1.2, g: 200, up: 80 });
    yield wait(1.2);
    yield tiloTo(sp.recolector.x - 90, 160); g.tilo.face = 1;
    g.tilo.wave = true; yield say('tilo', '¡Funciona! Bueno, hace ruido. Es lo mismo.'); g.tilo.wave = false;
    g.tilo.face = Math.sign(p.pos.x - g.tilo.x) || 1;
    yield say('tilo', 'Toma, un sensor. Vibra cerca de lo antiguo. En las ruinas, las cosas se rehacen cuando nadie mira.');
    g.has.sensor = true; g.sound.sfx('energia');
    g.showToast('Nuevo: sensor de Tilo', 3);
    g.flags.compuerta = true;
    g.cam.fix = { x: 2760, y: -360 }; g.cam.speed = 2.5;
    yield wait(2.2);
    g.cam.fix = null; g.cam.speed = 4;
    yield wait(0.6);
    g.tilo.face = -1;
    yield say('tilo', 'Por cierto… ya te había visto caer. En un sueño. Nunca le veo la cara.');
    g.tilo.face = 1;
    yield say('tilo', 'Debería dejar de comer piedras antes de dormir.');
    g.setObjective('Explora las ruinas');
  } });

  // Secreto 4: el jardín anterior
  T({ sec: 0, x0: 2150, x1: 2300, y0: -560, y1: -470, run: function* () {
    g.findSecret('jardin', 'Un jardín anterior');
  } });

  // =====================================================================
  // ESCENA 4 · Las ruinas que no están terminadas
  // =====================================================================
  for (const py of g.L.pylons) {
    I({ sec: 0, x: py.x, y: py.y, r: 34, label: 'Activar', cond: () => !py.on, run: function* () {
      py.on = true; g.pylonsOn++; g.sound.sfx('pilon');
      g.burst(py.x, py.y - 110, 20, [0.75, 0.92, 0.97], { speed: 80, life: 1, up: 40 });
      if (!g.has.sensor) g.has.sensor = true;
      if (g.pylonsOn < 3) {
        g.setObjective(`Estructuras ${g.pylonsOn}/3`);
      } else {
        yield wait(0.5);
        g.cam.fix = { x: 4800, y: -400 }; g.cam.speed = 2;
        yield wait(1.2);
        g.flags.portal = true; g.cam.shake = 0.5;
        yield wait(2.2);
        g.cam.fix = null; g.cam.speed = 4;
        g.setObjective('Entra al santuario');
      }
    } });
  }
  I({ sec: 0, x: sp.cristalRuina.x, y: -220, r: 36, label: 'Tocar', cond: () => !g.fx.crystalTaken, run: function* () {
    if (!g.flags.cristalVisto) {
      g.flags.cristalVisto = true; g.sound.sfx('cristal');
      yield vision('blanco', 3.2);
      return;
    }
    g.sound.sfx('voz_lejana');
    yield wait(1.6);
    g.sound.sfx('romper'); g.fx.crystalTaken = true; g.cam.shake = 0.3;
    g.burst(sp.cristalRuina.x, -250, 30, [0.5, 0.82, 0.93], { speed: 140, life: 1, g: 400, up: 80 });
    g.fx.orb = 0;
    yield wait(1.6);
    g.sound.sfx('recuerdo');
    yield vision('linea', 6.5);
    g.fx.orb = -1;
    g.has.memoria = true;
    g.showToast(IS_TOUCH ? 'Nuevo: el recuerdo · toca ✦ frente a lo incompleto' : 'Nuevo: el recuerdo · E frente a lo incompleto', 5);
    g.setObjective('Recuerda el puente');
  } });
  S.ancla_puente = function* () {
    yield wait(0.4);
    g.setObjective(`Estructuras ${g.pylonsOn}/3`);
  };
  S.ancla_escalera = function* () {};
  I({ sec: 0, x: sp.inscripcion.x, y: -220, r: 34, label: 'Tocar', run: function* () {
    g.sound.sfx('cristal');
    g.burst(sp.inscripcion.x, -280, 16, [0.5, 0.82, 0.93], { speed: 50, life: 1 });
    yield wait(0.2);
  } });
  T({ sec: 0, x0: 4935, x1: 5000, cond: () => g.flags.portal, run: function* () {
    g.auto.x = 1;
    yield fadeTo(1, 0.8, '#000000');
    g.auto.x = 0;
    g.placePlayer(6060, 0, 1); g.music = 'santuario'; g.musicVar = 0;
    yield wait(0.5);
    yield fadeTo(0, 1);
    g.setObjective('Anillos 0/3');
  } });

  // =====================================================================
  // ESCENA 6 · El santuario del eco
  // =====================================================================
  I({ sec: 1, x: sp.dispositivo.x, y: 0, r: 60, label: 'Examinar', cond: () => g.ringsDone < 3, run: function* () {
    g.sound.sfx('cristal'); yield wait(0.3);
    g.flags.dispositivo = true;
    g.showHint('Faltan tres tramos. Están en lo alto.', 3);
  } });
  const anillo = function* () {
    g.ringsDone++; g.musicVar = g.ringsDone;
    g.setObjective(`Anillos ${g.ringsDone}/3`);
    if (g.ringsDone < 3) return;
    yield wait(1.2);
    g.cam.fix = { x: sp.dispositivo.x, y: -250 }; g.cam.speed = 2;
    yield wait(1.4);
    g.fx.shock = 0; g.sound.sfx('onda'); g.cam.shake = 1;
    yield wait(1.3);
    yield fadeTo(1, 0.3, '#eef6fa');
    g.cam.fix = { x: 3900, y: -360 }; g.cam.snap = true; g.envOverride = 'vision'; g.fx.ruinsVision = 1;
    yield fadeTo(0, 0.4);
    yield wait(3.4);
    yield fadeTo(1, 0.3, '#eef6fa');
    g.fx.ruinsVision = 0; g.envOverride = null; g.cam.fix = { x: 7400, y: -250 }; g.cam.snap = true;
    yield fadeTo(0, 0.5);
    g.flags.camara = true; g.cam.shake = 0.4;
    yield wait(1.6);
    g.cam.fix = null; g.cam.speed = 4;
    g.setObjective('Toma el ascensor');
  };
  S.ancla_anillo1 = anillo; S.ancla_anillo2 = anillo; S.ancla_anillo3 = anillo;
  // Secreto 3: el cristal silencioso
  I({ sec: 1, x: sp.cristalMudo.x, y: 0, r: 36, label: 'Tocar', run: function* () {
    if (g.ringsDone < 3) { g.showHint('…', 1.5); return; }
    [72, 79, 76, 74, 72].forEach((n, i) => g.sound.tone(440 * Math.pow(2, (n - 69) / 12), 0.9, { vol: 0.06, at: i * 0.32, echo: true }));
    yield wait(1.6);
    g.findSecret('cristal', 'El cristal silencioso');
  } });
  I({ sec: 1, x: sp.ascensor.x, y: 0, r: 40, label: 'Descender', cond: () => g.flags.camara, run: function* () {
    g.sound.sfx('ascensor');
    yield fadeTo(1, 1.2, '#000000');
    g.music = 'silencio';
    yield wait(1.8);
    g.placePlayer(sp.llegadaEstacion.x, 0, 1); g.music = 'estacion';
    yield fadeTo(0, 1.2);
    g.setObjective('Explora la estación');
  } });

  // =====================================================================
  // ESCENA 7 · La estación que reconoce a DIP
  // =====================================================================
  I({ sec: 2, x: sp.terminal1.x, y: 0, r: 36, label: 'Leer', run: function* () {
    g.sound.sfx('pantalla');
    yield say('pantalla', 'REGISTRO DE PASAJEROS\n▒▒▒▒▒▒ · ▒▒▒ · ▒▒▒▒▒▒▒▒\n▒▒ ▒▒▒▒ · ▒▒▒▒▒ · ▒▒▒');
  } });
  // Secreto 2: el registro incompleto
  I({ sec: 2, x: sp.terminal2.x, y: sp.terminal2.y, r: 36, label: 'Leer', run: function* () {
    g.sound.sfx('pantalla');
    yield say('pantalla', 'LISTA DE LLEGADAS\n▒▒▒▒▒▒ ········ ▒▒.▒▒.▒▒▒▒\nDIP ··········· 03.∞.0001\n▒▒▒▒ ·········· ▒▒.▒▒.▒▒▒▒\nDIP ··········· 11.04.0000\nDIP ··········· ▒▒.▒▒.▒▒▒▒\nDIP ··········· 03.∞.0001');
    g.findSecret('registro', 'La lista de llegadas');
  } });
  I({ sec: 2, x: sp.consola.x, y: 0, r: 42, label: 'Activar', cond: () => !g.flags.consola, run: function* () {
    g.flags.consola = true; g.fx.holo = 1; g.sound.sfx('energia');
    yield wait(1.2);
    yield say('pantalla', 'PASAJERO: DIP.\nESTADO: PRESENTE.\nPROCEDENCIA: NO DETERMINADA.\nDESTINO: PENDIENTE DE CREACIÓN.\nFECHA DE LLEGADA: ANTERIOR AL VIAJE.');
    yield say('estacion', 'Bienvenido de nuevo.');
    yield walkTo(sp.consola.x - 46);
    p.face = 1;
    yield say('estacion', 'Por favor, indique el motivo de su nueva llegada.');
    yield wait(1);
    g.setObjective('Busca la energía');
  } });
  I({ sec: 2, x: sp.consola.x, y: 0, r: 42, label: 'Leer', cond: () => g.flags.consola, run: function* () {
    yield say('pantalla', 'PASAJERO: DIP.\nESTADO: PRESENTE.\nFECHA DE LLEGADA: ANTERIOR AL VIAJE.');
  } });
  T({ sec: 2, x0: sp.energia.x - 40, x1: sp.energia.x + 40, y0: -380, y1: -270, run: function* () {
    g.has.energia = true; g.sound.sfx('energia');
    g.burst(sp.energia.x, -300, 20, [0.6, 0.95, 0.85], { speed: 90, life: 0.8 });
    g.showToast('Energía', 2);
    g.setObjective('Activa el núcleo');
  } });

  // =====================================================================
  // ESCENA 8 · La señal de Lunex
  // =====================================================================
  I({ sec: 2, x: sp.nucleo.x, y: 0, r: 44, label: 'Activar núcleo', cond: () => !g.flags.lunex, run: function* () {
    if (!g.has.energia) { yield say('estacion', 'Sin energía.'); return; }
    g.flags.lunex = true; g.sound.sfx('energia'); g.fx.core = 1;
    g.cam.fix = { x: 10760, y: -200 }; g.cam.speed = 2.5;
    yield wait(1.4);
    g.music = 'lunex'; g.lunex.visible = true; g.lunex.fragTarget = 0; g.sound.sfx('lunex');
    yield wait(2.2);
    yield say('lunex', 'Anomalía localizada.');
    yield wait(1);
    yield say('lunex', 'Registro de origen: incompleto.');
    yield wait(1);
    yield say('lunex', 'Inconsistencia confirmada.');
    yield wait(0.8);
    yield say('lunex', 'No deberías estar aquí.');
    yield walkTo(sp.nucleo.x + 40);
    g.lunex.fragTarget = 1; g.sound.sfx('fragmenta');
    yield wait(0.6);
    yield say('lunex', 'Este acontecimiento ya ha sido registrado.');
    g.lunex.visible = false; g.music = 'silencio'; g.sound.sfx('fragmenta');
    yield wait(1.2);
    g.alarm = 1; g.envOverride = 'alarma'; g.cam.shake = 0.6;
    yield say('estacion', 'El pasajero DIP acaba de llegar. El pasajero DIP ya llegó.');
    yield fadeTo(1, 0.8, '#000000');
    g.cam.fix = null; g.cam.speed = 4; g.envOverride = null;
    g.placePlayer(sp.inicioHuida.x, 0, 1); g.music = 'huida';
    yield fadeTo(0, 0.6);
    g.setObjective('Escapa');
  } });

  // =====================================================================
  // ESCENA 9 · La huida y la revelación
  // =====================================================================
  S.ancla_puente2 = function* () {};
  T({ sec: 3, x0: sp.salida.x - 20, x1: sp.salida.x + 60, run: function* () {
    g.auto.x = 1;
    yield fadeTo(1, 0.9, '#f4efe4');
    g.auto.x = 0; g.alarm = 0; g.music = 'silencio';
    g.flags.final = true; g.envOverride = 'final';
    g.placePlayer(2040, -220, 1);
    g.tilo.x = 2250; g.tilo.face = 1; g.tilo.visible = true;
    g.cam.fix = { x: 2160, y: -330 }; g.cam.snap = true;
    yield wait(0.6);
    yield fadeTo(0, 1.4);
    yield wait(1);
    g.tilo.face = -1;
    yield wait(1.2);
    yield say('tilo', 'He vuelto a tener ese sueño.');
    yield say('tilo', 'Esta vez oí una voz.');
    yield wait(1);
    yield say('tilo', 'Decía tu nombre.');
    yield wait(1.2);
    g.music = 'final';
    g.cam.fix = { x: 2500, y: -640 }; g.cam.speed = 1.2;
    g.sound.sfx('senal');
    for (let i = 0; i < 60; i++) { g.fx.beam = Math.min(1, g.fx.beam + 1 / 60); yield wait(1 / 60); }
    yield wait(1.6);
    g.fx.ringFlash = 1; g.sound.sfx('cristal');
    yield wait(1);
    for (let i = 0; i < 150; i++) { g.fx.route = Math.min(1, g.fx.route + 1 / 150); yield wait(1 / 60); }
    yield wait(2.5);
    g.cam.fix = { x: 2160, y: -330 }; g.cam.speed = 2;
    yield wait(1.4);
    yield say('tilo', 'Si vas a seguir provocando fenómenos cósmicos, hazlo lejos de mi jardín.');
    p.face = 1;
    yield wait(1.8);
    yield fadeTo(1, 2.6, '#000000');
    g.fx.endTitle = 0; g.mode = 'fin'; g.music = 'silencio';
  } });
}
