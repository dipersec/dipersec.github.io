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
  get x() {
    const k = this.keys;
    return ((k.has('arrowright') || k.has('d') || this.touch.right) ? 1 : 0) - ((k.has('arrowleft') || k.has('a') || this.touch.left) ? 1 : 0);
  }
  get run() { return this.keys.has('shift') || this.touch.run; }
  get jumpHeld() { const k = this.keys; return k.has(' ') || k.has('arrowup') || k.has('w') || k.has('z') || this.touch.jump; }
  endFrame() { for (const k in this.pressed) this.pressed[k] = false; }
}
