// debug.js — Panel de afinado en vivo (lil-gui). Se abre con la tecla ` o con ?debug en la URL.
// Se carga solo cuando se pide: no pesa en el juego normal.
import { CONFIG, gravity, jumpVel, jumpReach } from './config.js';

export function setupDebug(game, world) {
  let gui = null, info = null, t = 0, frames = 0;
  const stats = { fps: 0, drawCalls: 0, triangles: 0, resolucion: 1, gravedad: 0, velSalto: 0, alcance: 0 };
  async function open() {
    if (gui) { gui._hidden ? gui.show() : gui.hide(); return; }
    const { default: GUI } = await import('https://cdn.jsdelivr.net/npm/lil-gui@0.19.2/+esm');
    gui = new GUI({ title: 'Afinado · DIP' });
    const j = gui.addFolder('Salto');
    j.add(CONFIG, 'jumpHeight', 60, 220, 1).name('altura (px)');
    j.add(CONFIG, 'timeToApex', 0.2, 0.7, 0.01).name('tiempo a la cima');
    j.add(CONFIG, 'fallMult', 1, 3, 0.05).name('peso al caer');
    j.add(CONFIG, 'cutMult', 0.2, 1, 0.05).name('corte al soltar');
    j.add(CONFIG, 'coyote', 0, 0.25, 0.01);
    j.add(CONFIG, 'buffer', 0, 0.25, 0.01);
    const m = gui.addFolder('Movimiento');
    m.add(CONFIG, 'walkSpeed', 60, 220, 1).name('caminar');
    m.add(CONFIG, 'runSpeed', 120, 400, 1).name('correr');
    m.add(CONFIG, 'accelTime', 0.02, 0.4, 0.01).name('aceleración (s)');
    m.add(CONFIG, 'decelTime', 0.02, 0.4, 0.01).name('frenado (s)');
    m.add(CONFIG, 'airControl', 0, 1, 0.05).name('control en el aire');
    const c = gui.addFolder('Cámara');
    c.add(CONFIG, 'camFollowX', 1, 15, 0.1); c.add(CONFIG, 'camFollowY', 1, 15, 0.1);
    c.add(CONFIG, 'camLookAhead', 0, 160, 1); c.add(CONFIG, 'camAnchorDrop', 0, 200, 1);
    c.add(CONFIG, 'shakeAmp', 0, 30, 0.5); c.add(CONFIG, 'shakeDecay', 0.5, 4, 0.1);
    const f = gui.addFolder('Juice');
    f.add(CONFIG, 'squashLand', 0.5, 1, 0.01); f.add(CONFIG, 'stretchJump', 1, 1.5, 0.01);
    f.add(CONFIG, 'squashTime', 0.05, 0.4, 0.01); f.add(CONFIG, 'hitStop', 0, 0.2, 0.005);
    info = gui.addFolder('Medición');
    for (const k of Object.keys(stats)) info.add(stats, k).listen().disable();
    gui.add({ copiar: () => navigator.clipboard?.writeText(JSON.stringify(CONFIG, null, 2)) }, 'copiar').name('Copiar CONFIG');
  }
  (function tick(now) {
    frames++;
    if (now - t > 1000) {
      stats.fps = frames; frames = 0; t = now;
      const r = world.renderer.info.render;
      stats.drawCalls = r.calls; stats.triangles = r.triangles; stats.resolucion = +(world.pr || 1).toFixed(2);
      stats.gravedad = Math.round(gravity()); stats.velSalto = Math.round(jumpVel()); stats.alcance = Math.round(jumpReach());
    }
    requestAnimationFrame(tick);
  })(performance.now());
  window.addEventListener('keydown', (e) => { if (e.key === '`' || e.key === 'º' || e.key === '|') open(); });
  if (new URLSearchParams(location.search).has('debug')) open();
}
