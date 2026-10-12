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
    j.add(CONFIG, 'jumpHeight', 1, 6, 0.05).name('altura (m)');
    j.add(CONFIG, 'timeToApex', 0.2, 0.7, 0.01).name('tiempo a la cima');
    j.add(CONFIG, 'fallMult', 1, 3, 0.05).name('peso al caer');
    j.add(CONFIG, 'cutMult', 0.2, 1, 0.05).name('corte al soltar');
    j.add(CONFIG, 'coyote', 0, 0.25, 0.01); j.add(CONFIG, 'buffer', 0, 0.25, 0.01);
    j.add(CONFIG, 'bounceMult', 0.4, 1.5, 0.05).name('rebote');
    const m = gui.addFolder('Movimiento');
    m.add(CONFIG, 'maxSpeed', 3, 15, 0.1).name('velocidad');
    m.add(CONFIG, 'accelTime', 0.02, 0.4, 0.01).name('aceleración (s)');
    m.add(CONFIG, 'decelTime', 0.02, 0.4, 0.01).name('frenado (s)');
    m.add(CONFIG, 'airControl', 0, 1, 0.05).name('control en el aire');
    m.add(CONFIG, 'spinTime', 0.2, 0.8, 0.01).name('giro (s)'); m.add(CONFIG, 'spinRadius', 0.6, 2.5, 0.05).name('alcance del giro');
    const c = gui.addFolder('Cámara');
    c.add(CONFIG, 'camDist', 3, 12, 0.1); c.add(CONFIG, 'camHeight', 1, 8, 0.1); c.add(CONFIG, 'camLookAhead', 0, 8, 0.1);
    c.add(CONFIG, 'camFollowXZ', 1, 15, 0.1); c.add(CONFIG, 'camFollowY', 1, 15, 0.1); c.add(CONFIG, 'camAnchorDrop', 0, 4, 0.1);
    c.add(CONFIG, 'shakeAmp', 0, 1, 0.01); c.add(CONFIG, 'shakeDecay', 0.5, 4, 0.1);
    c.add(CONFIG, 'camFov', 40, 80, 1).onChange(() => { world.camera.fov = CONFIG.camFov; world.camera.updateProjectionMatrix(); });
    const f = gui.addFolder('Juice');
    f.add(CONFIG, 'squashLand', 0.5, 1, 0.01); f.add(CONFIG, 'stretchJump', 1, 1.5, 0.01);
    f.add(CONFIG, 'squashTime', 0.05, 0.4, 0.01); f.add(CONFIG, 'hitStop', 0, 0.2, 0.005); f.add(CONFIG, 'magnetRadius', 0, 4, 0.1);
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
