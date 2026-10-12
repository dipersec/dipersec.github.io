// pool.js — Object pooling: nada de new/push/filter en el bucle para efectos frecuentes.
export class Pool {
  constructor(create, size) { this.items = Array.from({ length: size }, () => ({ active: false, ...create() })); }
  spawn(init) {
    for (const o of this.items) if (!o.active) { o.active = true; init(o); return o; }
    return null;
  }
  forEachActive(fn) { for (const o of this.items) if (o.active) fn(o); }
  clear() { for (const o of this.items) o.active = false; }
}
