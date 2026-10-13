// director.js — Ejecuta escenas escritas como generadores. Cada `yield` devuelve una espera
// (tiempo, condición, diálogo o fundido) y la escena continúa dentro de update(), sin bloquear el bucle.
export const wait = (s) => ({ t: s, update(dt) { this.t -= dt; return this.t <= 0; } });
export const until = (fn) => ({ update: () => fn() });
export const say = (who, text) => ({ start(g) { g.openDialog(who, text); }, update(dt, g) { return !g.dialog; } });
export const fadeTo = (a, dur, color) => ({
  start(g) { if (color) g.fade.color = color; g.fade.target = a; g.fade.speed = Math.abs(a - g.fade.a) / Math.max(0.01, dur) || 99; },
  update(dt, g) { return g.fade.a === g.fade.target; }
});

export class Director {
  constructor(game) { this.g = game; this.tasks = []; this.scripts = {}; }
  get blocking() { return this.tasks.some(t => t.blocking); }
  run(script, opts = {}) {
    const fn = typeof script === 'string' ? this.scripts[script] : script;
    if (!fn) { console.warn('Escena inexistente:', script); return; }
    if (opts.unique !== false && this.tasks.some(t => t.fn === fn)) return;
    this.tasks.push({ fn, it: fn(this.g), wait: null, blocking: opts.block !== false && !fn.free });
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
