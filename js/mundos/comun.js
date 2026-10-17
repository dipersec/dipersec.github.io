// comun.js — Escenas que comparten todos los mundos.
import { STATE, setState } from '../player.js';
import { CONFIG } from '../config.js';
import { wait, fadeTo } from '../director.js';

// Muerte: menos de 1.5 s hasta volver a jugar, con un comentario distinto cada vez
export function reaparecer(g, msgSinVidas) {
  return function* () {
    const p = g.player;
    g.deaths++; g.deathsHere++;
    yield wait(0.35);
    yield fadeTo(1, CONFIG.respawnFade, '#0d0a14');
    g.lives--;
    // ayuda dinámica: 5 muertes → una concha de regalo; 10 → punto de control extra
    if (g.deathsHere >= 10 && !g.flags.extraCk && g.safe.length) {
      const far = g.safe.reduce((a, b) => (b.z < a.z ? b : a));
      if (far.z < g.checkpoint.z - 6) { g.checkpoint = { x: far.x, y: far.y, z: far.z, sec: g.section.n }; g.flags.extraCk = true; g.showToast('Punto de control extra'); }
    }
    const k = g.checkpoint;
    g.placePlayer(k.x, k.y + 0.05, k.z); setState(p, STATE.IDLE); p.invuln = 1.2; p.hidden = false;
    if (g.lives <= 0) { g.lives = 4; g.fragments = 0; g.showToast(msgSinVidas, 2.5); }
    if (g.deathsHere >= 5 && !g.flags.ayuda5 && g.conchas === 0) { g.flags.ayuda5 = true; g.conchas = 1; g.sound.sfx('concha'); }
    for (const e of g.L.ecos) { e.on = false; e.buf.length = 0; e.vis = 0; }
    g.ondas.clear();
    if (g.chase.on || (k.sec === 6 && g.L.chase && !g.chase.done && g.flags.jefe)) { g.chase.on = true; g.resetChase(k.z); }
    if (g.boss.active) g.boss.place();
    yield wait(0.08);
    yield fadeTo(0, 0.3);
    const [who, text] = g.deathLine();
    g.say(who, text, 2.6);
  };
}
