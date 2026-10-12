// input.js — Teclado + botones táctiles. Los "pressed" duran un solo update().
export class Input {
  constructor() {
    this.keys = new Set();
    this.touch = { left: false, right: false, run: false, jump: false, act: false };
    this.pressed = { jump: false, act: false, confirm: false, pause: false, mute: false, any: false };
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if ([' ', 'arrowup', 'arrowleft', 'arrowright', 'arrowdown'].includes(k)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(k);
      this.pressed.any = true;
      if (k === ' ' || k === 'arrowup' || k === 'w' || k === 'z') { this.pressed.jump = true; this.pressed.confirm = true; }
      if (k === 'e' || k === 'x' || k === 'enter') { this.pressed.act = true; this.pressed.confirm = true; }
      if (k === 'escape' || k === 'p') this.pressed.pause = true;
      if (k === 'm') this.pressed.mute = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); for (const k in this.touch) this.touch[k] = false; });
  }
  bindTouch(root) {
    root.querySelectorAll('[data-btn]').forEach(b => {
      const name = b.dataset.btn;
      const down = (e) => {
        e.preventDefault(); b.setPointerCapture?.(e.pointerId); b.classList.add('on');
        this.touch[name] = true; this.pressed.any = true;
        if (name === 'jump') { this.pressed.jump = true; this.pressed.confirm = true; }
        if (name === 'act') { this.pressed.act = true; this.pressed.confirm = true; }
        if (name === 'pause') this.pressed.pause = true;
      };
      const up = () => { this.touch[name] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    });
  }
  // Joystick: el pulgar se apoya en cualquier punto de la mitad izquierda y se desliza.
  // Poco desplazamiento = caminar; empujar a fondo = correr.
  bindStick(zone, base, knob) {
    let id = null, ox = 0, oy = 0;
    const R = 56;
    const rest = () => { base.classList.remove('activo'); knob.style.transform = 'translate(-50%,-50%)'; base.style.left = ''; base.style.top = ''; };
    const set = (dx) => {
      const ax = Math.abs(dx);
      this.touch.left = dx < -12; this.touch.right = dx > 12; this.touch.run = ax > R * 0.8;
    };
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
      set(dx);
    });
    const end = (e) => { if (e.pointerId !== id) return; id = null; set(0); rest(); };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end); zone.addEventListener('lostpointercapture', end);
  }
  get x() {
    const k = this.keys;
    return ((k.has('arrowright') || k.has('d') || this.touch.right) ? 1 : 0) - ((k.has('arrowleft') || k.has('a') || this.touch.left) ? 1 : 0);
  }
  get run() { return this.keys.has('shift') || this.touch.run; }
  get jumpHeld() { const k = this.keys; return k.has(' ') || k.has('arrowup') || k.has('w') || k.has('z') || this.touch.jump; }
  endFrame() { for (const k in this.pressed) this.pressed[k] = false; }
}
