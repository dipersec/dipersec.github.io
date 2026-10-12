// story.js — Escenas del Nivel 1 como guiones (generadores) que avanzan dentro de update().
// Regla del documento: ninguna escena dura más de 30 s; el resto se cuenta jugando.
import { STATE, setState } from './player.js';
import { TIPS } from './level1.js';
import { CONFIG } from './config.js';

const wait = (s) => ({ t: s, update(dt) { this.t -= dt; return this.t <= 0; } });
const until = (fn) => ({ update: () => fn() });
const say = (who, text) => ({ start(g) { g.openDialog(who, text); }, update(dt, g) { return !g.dialog; } });
const fadeTo = (a, dur, color) => ({
  start(g) { if (color) g.fade.color = color; g.fade.target = a; g.fade.speed = Math.abs(a - g.fade.a) / Math.max(0.01, dur) || 99; },
  update(dt, g) { return g.fade.a === g.fade.target; }
});

export class Director {
  constructor(game) { this.g = game; this.tasks = []; this.scripts = {}; }
  get blocking() { return this.tasks.some(t => t.blocking); }
  run(script, opts = {}) {
    const fn = typeof script === 'string' ? this.scripts[script] : script;
    if (!fn) return;
    if (opts.unique !== false && this.tasks.some(t => t.fn === fn)) return;
    this.tasks.push({ fn, it: fn(this.g), wait: null, blocking: opts.block !== false });
  }
  update(dt) {
    for (let i = 0; i < this.tasks.length; i++) {
      const t = this.tasks[i];
      if (t.wait && !t.wait.update(dt, this.g)) continue;
      const r = t.it.next();
      if (r.done) { this.tasks.splice(i--, 1); continue; }
      t.wait = r.value || wait(0);
      t.wait.start?.(this.g);
    }
  }
}

export function setupStory(g) {
  const S = g.director.scripts, p = g.player, sp = g.L.spots;
  g.tipsText = TIPS;

  // ---------- Escena de apertura (≈25 s) ----------
  S.apertura = function* () {
    g.musicOverride = 'apertura';
    g.placePlayer(sp.sofa.x, 0.55, sp.sofa.z); p.poseAnim = 'idle'; setState(p, STATE.POSE); p.face = 1;
    g.cam.fix = { x: 2.2, y: 1.9, z: 0.8, lx: 0, ly: 1.1, lz: 5.2 }; g.cam.snap = true; g.cam.speed = 2;
    g.fx.bubbles = true;
    yield fadeTo(0, 1.2);
    yield wait(1.4);
    g.fx.drone = 0; g.sound.sfx('dron');
    yield until(() => g.fx.drone >= 1);
    g.fx.notice = 1; g.sound.sfx('sello'); g.fx.bubbles = false; g.addTrauma(0.15);
    yield say('dron', 'Notificación oficial. Su sector será formateado en cinco minutos para construir el Servidor de Anuncios Intergaláctico.');
    yield say('dip', '¿Qué? ¡Nadie me avisó!');
    yield say('dron', 'El aviso estuvo publicado 50 años en el Archivo de Avisos, carpeta 9, subcarpeta "No abrir". Que tenga un día optimizado.');
    g.fx.drone = 2;
    g.fx.guiaBook = 0; g.sound.sfx('caida');
    yield wait(0.8);
    yield say('guia', '¡No entres en pánico! Primera recomendación: corre.');
    g.fx.guiaBook = -1; g.fx.notice = 0; g.flags.sofaGone = true;
    g.cam.fix = null; g.musicOverride = null;
    setState(p, STATE.FALLING); p.vel.z = -3; p.vel.y = 6; p.onGround = false;
    g.timerOn = true;
  };

  // ---------- Muerte: menos de 1.5 s, con un comentario distinto ----------
  S.reaparecer = function* () {
    g.deaths++; g.deathsHere++;
    yield wait(0.35);
    yield fadeTo(1, CONFIG.respawnFade, '#05070d');
    g.lives--;
    // ayuda dinámica: 5 muertes → Copia de regalo; 10 → punto de control extra
    if (g.deathsHere >= 10 && !g.flags.extraCk && g.safe.length) {
      const far = g.safe.reduce((a, b) => (b.z < a.z ? b : a));
      if (far.z < g.checkpoint.z - 6) { g.checkpoint = { x: far.x, y: far.y, z: far.z, sec: g.section.n }; g.flags.extraCk = true; g.showToast('Punto de control extra'); }
    }
    const k = g.checkpoint;
    g.placePlayer(k.x, k.y + 0.05, k.z); setState(p, STATE.IDLE); p.invuln = 1.2; p.hidden = false;
    if (g.lives <= 0) { g.lives = 4; g.fragments = 0; g.showToast('Sin vidas. El sueño continúa.', 2.5); }
    if (g.deathsHere >= 5 && !g.flags.ayuda5 && g.copias === 0) { g.flags.ayuda5 = true; g.copias = 1; g.sound.sfx('copia'); }
    if (g.chase.on || (k.sec === 3 && !g.chase.done)) { g.chase.on = true; g.resetChase(k.z); }
    if (g.boss.active) g.boss.place();
    yield wait(0.08);
    yield fadeTo(0, 0.3);
    const [who, text] = g.deathLine();
    g.say(who, text, 2.6);
  };

  // ---------- Sección 3: la persecución del vacío ----------
  S.persecucion = function* () {
    g.chase.on = true; g.chase.z = p.pos.z + 10; g.chase.speed = 4.5;
    g.sound.sfx('vacio'); g.addTrauma(0.5);
    yield wait(0.25);
    if (!g.trial) g.tip(g.touchUI ? '¡No entres en pánico! Corre hacia la cámara (pulgar hacia abajo).' : '¡No entres en pánico! Corre hacia la cámara (↓ o S).', 4);
  };
  S.persecucion.free = true;
  S.finPersecucion = function* () { g.sound.sfx('vacio'); g.addTrauma(0.3); };
  // el sofá de DIP pasa volando hacia el vacío
  g.L.tips.push({ z: sp.sofaVuela.z, who: 'evento', text: 'sofa', done: false });
  const showTip = g.showTip.bind(g);
  g.showTip = (t) => {
    if (t.who === 'evento' && t.text === 'sofa') { g.fx.sofaFly = 0; g.say('dip', '¡Mi sofá! ¡Mi sofá también!', 2.4); return; }
    showTip(t);
  };

  // ---------- Jefe: Inspector de Trámites ----------
  g.L.tips.push({ z: sp.arena.gate, who: 'evento', text: 'jefe', done: false });
  const showTip2 = g.showTip;
  g.showTip = (t) => { if (t.text === 'jefe') { g.director.run('jefeIntro'); return; } showTip2(t); };
  S.jefeIntro = function* () {
    g.gate = { x0: -10, x1: 10, y0: 0, y1: 8, z0: -331, z1: -330.4, active: true, mat: 'reja' }; g.solids.push(g.gate);
    g.cam.fix = { x: 0, y: 6, z: -341, lx: 0, ly: 2, lz: -353 }; g.cam.speed = 3;
    yield wait(0.9);
    if (!g.trial) g.say('inspector', 'Sector Demolición. Usted no tiene el formulario para seguir existiendo.', 3);
    yield wait(g.trial ? 0.5 : 2.4);
    g.cam.fix = null; g.boss.start();
  };
  S.jefeFase2 = function* () {
    g.boss.shots.clear();
    g.say('inspector', '¡Orden! ¡Necesito un orden!', 2);
    g.addTrauma(0.5); g.sound.sfx('papel');
    for (let i = 0; i < 18; i++) g.burst(g.boss.x, 2.5 + Math.random() * 2, g.boss.z, 2, [1, 1, 1], { speed: 5, life: 1, g: 6 });
    yield wait(0.6);
    const tw = g.L.towers[0], b = g.boss;
    b.hop = { x0: b.x, y0: b.y, z0: b.z, x1: tw.x, y1: tw.top, z1: tw.z, t: 0, dur: 1.1, done: () => b.rainStairs(0) };
    yield until(() => !b.hop);
    if (!g.trial) g.tip('Suben por las carpetas. Literalmente.', 2.6);
  };
  S.jefeFase3 = function* () {
    const b = g.boss;
    b.hop = { x0: b.x, y0: b.y, z0: b.z, x1: 0, y1: 0, z1: sp.inspector.z, t: 0, dur: 1, done: null };
    for (const f of b.folders) f.s.active = false; b.folders = [];
    yield until(() => !b.hop);
    g.say('inspector', '¡Formateadoras! Borren a ese salvapantallas.', 2.4);
    b.callFormas();
    if (!g.trial) g.tip('Si las formateadoras borran todo… que lo borren a él.', 3);
  };
  S.jefeDerrotado = function* () {
    const b = g.boss;
    g.timerOn = false;
    g.cam.fix = { x: b.x + 3, y: 3, z: b.z + 7, lx: b.x, ly: 1.4, lz: b.z }; g.cam.speed = 3;
    if (!g.trial) yield say('inspector', 'Esto… no está en el reglamento… Formulario de queja… por triplicado…');
    for (let i = 0; i < 6; i++) { g.burst(b.x, 1.5, b.z, 14, [1, 1, 1], { speed: 7, life: 1.2, g: 5, size: 1.4 }); g.sound.sfx('papel'); yield wait(0.12); }
    b.gone = true; g.sound.sfx('explosion'); g.addTrauma(0.6);
    yield wait(0.9);
    // Cierre: autostop en un paquete de datos
    g.fx.packet = 0; g.sound.sfx('paquete');
    g.cam.fix = { x: p.pos.x + 4, y: 3.2, z: p.pos.z + 7, lx: p.pos.x, ly: 1.5, lz: p.pos.z - 2 };
    p.poseAnim = 'project'; setState(p, STATE.POSE); p.face = 1;
    yield until(() => g.fx.packet >= 0.5);
    p.hidden = true; g.fx.rider = true;
    if (!g.trial) yield say('guia', 'Felicidades. Ahora eres un vagabundo galáctico sin casa, sin plan y sin seguro.');
    yield until(() => g.fx.packet >= 1);
    yield fadeTo(1, 0.8, '#05070d');
    g.finishLevel();
  };
}
