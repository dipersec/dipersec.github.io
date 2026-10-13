// input.js — Teclado, joystick táctil y mando. Movimiento analógico (x, y) relativo a la cámara.
// Los "pressed" duran un solo paso de lógica.
export class Input {
  constructor() {
    this.keys = new Set();
    this.stick = { x: 0, y: 0 };
    this.touch = { jump: false, spin: false, recordar: false };
    this.pressed = { jump: false, spin: false, recordar: false, confirm: false, pause: false, mute: false, any: false, restart: false, trial: false, nueva: false };
    this.pad = { x: 0, y: 0, jump: false, prev: [] };
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if ([' ', 'arrowup', 'arrowleft', 'arrowright', 'arrowdown'].includes(k)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(k);
      this.pressed.any = true;
      if (k === ' ' || k === 'k' || k === 'z') { this.pressed.jump = true; this.pressed.confirm = true; }
      if (k === 'x' || k === 'j' || k === 'shift' || k === 'e') { this.pressed.spin = true; }
      if (k === 'c' || k === 'q' || k === 'l') this.pressed.recordar = true;
      if (k === 'n') this.pressed.nueva = true;
      if (k === 'enter' || k === 'e') this.pressed.confirm = true;
      if (k === 'escape' || k === 'p') this.pressed.pause = true;
      if (k === 'm') this.pressed.mute = true;
      if (k === 'r') this.pressed.restart = true;
      if (k === 't') this.pressed.trial = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.stick.x = this.stick.y = 0; this.touch.jump = this.touch.spin = this.touch.recordar = false; });
  }
  bindTouch(root) {
    root.querySelectorAll('[data-btn]').forEach(b => {
      const name = b.dataset.btn;
      const down = (e) => {
        e.preventDefault(); b.setPointerCapture?.(e.pointerId); b.classList.add('on');
        this.touch[name] = true; this.pressed.any = true;
        if (name === 'jump') { this.pressed.jump = true; this.pressed.confirm = true; navigator.vibrate?.(8); }
        if (name === 'spin') { this.pressed.spin = true; this.pressed.confirm = true; navigator.vibrate?.(8); }
        if (name === 'recordar') this.pressed.recordar = true;
        if (name === 'pause') this.pressed.pause = true;
      };
      const up = () => { this.touch[name] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    });
  }
  // Joystick: el pulgar se apoya en cualquier punto de la mitad izquierda y se desliza (analógico).
  bindStick(zone, base, knob) {
    let id = null, ox = 0, oy = 0;
    const R = 56;
    const rest = () => { base.classList.remove('activo'); knob.style.transform = 'translate(-50%,-50%)'; base.style.left = ''; base.style.top = ''; };
    zone.addEventListener('pointerdown', (e) => {
      if (id !== null) return;
      e.preventDefault(); id = e.pointerId; zone.setPointerCapture?.(id);
      const r = zone.getBoundingClientRect(); ox = e.clientX - r.left; oy = e.clientY - r.top;
      base.style.left = ox + 'px'; base.style.top = oy + 'px'; base.classList.add('activo');
      this.pressed.any = true; this.pressed.confirm = true;
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const r = zone.getBoundingClientRect();
      let dx = e.clientX - r.left - ox, dy = e.clientY - r.top - oy;
      const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      const m = Math.hypot(dx, dy) / R;
      const k = m < 0.15 ? 0 : Math.min(1, (m - 0.15) / 0.7) / Math.max(m, 1e-6);
      this.stick.x = dx / R * k; this.stick.y = -dy / R * k;
    });
    const end = (e) => { if (e.pointerId !== id) return; id = null; this.stick.x = this.stick.y = 0; rest(); };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end); zone.addEventListener('lostpointercapture', end);
  }
  // Mando: stick izquierdo o cruceta, A saltar, X/B girar, Y recordar, Start pausa (zona muerta 0.15)
  poll() {
    const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
    if (!gp) { this.pad.x = this.pad.y = 0; this.pad.jump = false; return; }
    const dz = 0.15, b = (i) => !!gp.buttons[i]?.pressed;
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, m = Math.hypot(ax, ay);
    const k = m < dz ? 0 : (m - dz) / (1 - dz) / m;
    this.pad.x = ax * k; this.pad.y = -ay * k;
    if (b(14)) this.pad.x = -1; if (b(15)) this.pad.x = 1; if (b(12)) this.pad.y = 1; if (b(13)) this.pad.y = -1;
    this.pad.jump = b(0);
    const edge = (i) => b(i) && !this.pad.prev[i];
    if (edge(0)) { this.pressed.jump = true; this.pressed.confirm = true; this.pressed.any = true; }
    if (edge(2) || edge(1)) { this.pressed.spin = true; this.pressed.any = true; }
    if (edge(3)) { this.pressed.recordar = true; this.pressed.any = true; }
    if (edge(9)) this.pressed.pause = true;
    this.pad.prev = gp.buttons.map(q => q.pressed);
  }
  // Vector de movimiento: x a la derecha de la pantalla, y hacia el fondo de la pantalla
  get move() {
    const k = this.keys;
    let x = ((k.has('arrowright') || k.has('d')) ? 1 : 0) - ((k.has('arrowleft') || k.has('a')) ? 1 : 0);
    let y = ((k.has('arrowup') || k.has('w')) ? 1 : 0) - ((k.has('arrowdown') || k.has('s')) ? 1 : 0);
    if (!x && !y) { x = this.stick.x || this.pad.x; y = this.stick.y || this.pad.y; }
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    return { x, y };
  }
  get jumpHeld() { const k = this.keys; return k.has(' ') || k.has('k') || k.has('z') || this.touch.jump || this.pad.jump; }
  endFrame() { for (const k in this.pressed) this.pressed[k] = false; }
}
