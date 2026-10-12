// hud.js — HUD, diálogos, visiones y pantallas, dibujados en un canvas 2D encima del mundo.
// Solo lee el estado del juego. Coordenadas virtuales: 360 unidades de alto.
const FONT = '"Courier New", ui-monospace, Menlo, monospace';
const NAMES = { tilo: 'Tilo', voz: '¿?', estacion: 'Estación', lunex: 'LUNEX', dip: 'DIP' };
const C = { ink: '#3d4350', paper: '#f4efe4', ice: '#7fd0ec', iceL: '#bfeaf7', dark: '#16171c' };
const IS_TOUCH = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

export class Hud {
  constructor(canvas, game, world, assets) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.g = game; this.world = world; this.assets = assets;
    this.wrapCache = new Map();
  }
  resize(cssW, cssH) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = Math.round(cssW * dpr); this.cv.height = Math.round(cssH * dpr);
    this.u = this.cv.height / 360; this.VW = this.cv.width / this.u; this.VH = 360;
  }
  font(px, bold = true) { this.ctx.font = `${bold ? 'bold ' : ''}${px}px ${FONT}`; }
  wrap(text, maxW, px) {
    const key = text + '|' + maxW + '|' + px;
    let r = this.wrapCache.get(key); if (r) return r;
    this.font(px, false);
    r = [];
    for (const para of text.split('\n')) {
      let line = '';
      for (const w of para.split(' ')) {
        const test = line ? line + ' ' + w : w;
        if (this.ctx.measureText(test).width > maxW && line) { r.push(line); line = w; } else line = test;
      }
      r.push(line);
    }
    if (this.wrapCache.size > 200) this.wrapCache.clear();
    this.wrapCache.set(key, r); return r;
  }
  panel(x, y, w, h, fill = 'rgba(22,23,28,.86)', stroke = C.ice) {
    const x0 = this.ctx; x0.fillStyle = fill; x0.fillRect(x, y, w, h);
    x0.strokeStyle = stroke; x0.lineWidth = 1; x0.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  draw() {
    const g = this.g, x = this.ctx;
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, this.cv.width, this.cv.height);
    x.setTransform(this.u, 0, 0, this.u, 0, 0); x.imageSmoothingEnabled = false; x.textBaseline = 'alphabetic';
    const W = this.VW, H = this.VH;
    if (g.mode === 'titulo') { this.drawTitle(W, H); return; }
    if (g.mode === 'juego') {
      this.drawLetterbox(W, H);
      if (g.letterbox < 0.5) this.drawStatus(W, H);
      this.drawPrompt(W, H);
      this.drawZoneCard(W, H);
      this.drawHint(W, H);
      this.drawToast(W, H);
      this.drawVision(W, H);
      this.drawDialog(W, H);
    }
    // viñeta roja al recibir daño
    if (g.hurtFlash > 0) {
      const v = x.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.75);
      v.addColorStop(0, 'rgba(200,40,40,0)'); v.addColorStop(1, `rgba(200,40,40,${0.55 * g.hurtFlash})`);
      x.fillStyle = v; x.fillRect(0, 0, W, H);
    }
    // fundido
    if (g.fade.a > 0) { x.globalAlpha = g.fade.a; x.fillStyle = g.fade.color; x.fillRect(0, 0, W, H); x.globalAlpha = 1; }
    if (g.mode === 'fin') this.drawEnd(W, H);
    if (g.paused) this.drawPause(W, H);
  }

  drawTitle(W, H) {
    const x = this.ctx, t = this.g.time;
    const a = Math.min(1, t / 1.5);
    x.globalAlpha = a;
    x.fillStyle = 'rgba(244,239,228,.72)'; x.fillRect(W / 2 - 190, 80, 380, 180);
    x.strokeStyle = 'rgba(61,67,80,.5)'; x.strokeRect(W / 2 - 189.5, 80.5, 379, 179);
    x.textAlign = 'center';
    this.font(64); x.fillStyle = C.ink; x.fillText('DIP', W / 2, 132);
    x.fillStyle = C.ice; x.fillRect(W / 2 - 70, 142, 140, 2);
    this.font(13); x.fillStyle = C.ink; x.fillText('EL ÚLTIMO RECUERDO DEL UNIVERSO', W / 2, 166);
    this.font(11, false); x.fillText('Nivel 1 · Nácar — El planeta de la caída', W / 2, 190);
    if (Math.sin(t * 3) > -0.3) { this.font(12); x.fillStyle = '#2a6f8f'; x.fillText(IS_TOUCH ? 'Toca para empezar' : 'Pulsa una tecla para empezar', W / 2, 238); }
    this.font(9, false); x.fillStyle = 'rgba(61,67,80,.8)';
    x.fillText('Con sonido', W / 2, 336);
    x.globalAlpha = 1; x.textAlign = 'left';
  }

  drawLetterbox(W, H) {
    const h = Math.round(this.g.letterbox * 26); if (h <= 0) return;
    this.ctx.fillStyle = '#000'; this.ctx.fillRect(0, 0, W, h); this.ctx.fillRect(0, H - h, W, h);
  }

  drawStatus(W, H) {
    const g = this.g, x = this.ctx, p = g.player, t = g.time;
    // energía
    for (let i = 0; i < 3; i++) {
      const cx = 16 + i * 14, cy = 16, on = i < p.energy;
      x.fillStyle = on ? C.ice : 'rgba(61,67,80,.35)';
      x.beginPath(); x.moveTo(cx, cy - 6); x.lineTo(cx + 5, cy); x.lineTo(cx, cy + 6); x.lineTo(cx - 5, cy); x.closePath(); x.fill();
      x.strokeStyle = C.ink; x.lineWidth = 1; x.stroke();
    }
    let ix = 64;
    if (g.has.sensor) {
      const s = g.sensor, jit = s > 0.3 ? Math.sin(t * 60) * s * 1.5 : 0;
      x.save(); x.translate(ix + jit, 16);
      x.fillStyle = '#9aa3ad'; x.beginPath(); x.moveTo(-5, 4); x.quadraticCurveTo(0, -8, 6, 3); x.closePath(); x.fill(); x.strokeStyle = C.ink; x.stroke();
      x.strokeStyle = C.ice;
      for (let i = 0; i < 3; i++) if (s > 0.15 + i * 0.25) { x.globalAlpha = 0.5 + 0.5 * Math.sin(t * 10 - i); x.beginPath(); x.arc(0, -1, 7 + i * 4, -1.2, -0.2); x.stroke(); }
      x.globalAlpha = 1; x.restore(); ix += 26;
    }
    if (g.has.memoria) {
      const glow = g.memNear ? 0.6 + 0.4 * Math.sin(t * 6) : 0.25;
      x.fillStyle = `rgba(191,234,247,${glow})`; x.beginPath(); x.arc(ix, 16, 9, 0, 7); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(ix, 16, 4, 0, 7); x.fill();
      x.strokeStyle = C.ink; x.beginPath(); x.arc(ix, 16, 4, 0, 7); x.stroke();
      if (g.memNear) { this.font(8); x.fillStyle = C.ink; x.fillText(IS_TOUCH ? '✦' : 'E', ix + 12, 19); }
    }
    // objetivo
    if (g.objective) {
      const lines = this.wrap(g.objective, Math.min(230, W * 0.42), 9);
      this.font(9, false); x.textAlign = 'right';
      const env = g.envName, dark = ['santuario', 'estacion', 'huida', 'alarma'].includes(env);
      lines.forEach((l, i) => {
        x.fillStyle = dark ? 'rgba(22,23,28,.6)' : 'rgba(244,239,228,.65)';
        const rx = IS_TOUCH ? W - 52 : W - 12, w = x.measureText(l).width; x.fillRect(rx - w - 4, 8 + i * 12, w + 8, 12);
        x.fillStyle = dark ? '#cfe6ff' : C.ink; x.fillText(l, rx, 17 + i * 12);
      });
      x.textAlign = 'left';
    }
  }

  drawPrompt(W, H) {
    const g = this.g, it = g.prompt; if (!it || g.dialog) return;
    const x = this.ctx, pr = this.world.project(it.x, it.y - 96);
    if (!pr.on) return;
    const sx = pr.x * W, sy = pr.y * H + Math.sin(g.time * 5) * 1.5;
    const label = (IS_TOUCH ? '✦ ' : 'E · ') + it.label;
    this.font(9); const w = x.measureText(label).width + 10;
    this.panel(sx - w / 2, sy - 12, w, 15, 'rgba(244,239,228,.92)', C.ink);
    x.fillStyle = C.ink; x.textAlign = 'center'; x.fillText(label, sx, sy - 2); x.textAlign = 'left';
  }

  drawZoneCard(W, H) {
    const z = this.g.zoneCard; if (!z) return;
    const x = this.ctx, a = Math.min(1, z.t / 0.6, (4.5 - z.t) / 0.8);
    x.globalAlpha = Math.max(0, a); x.textAlign = 'center';
    const dark = ['santuario', 'estacion', 'huida', 'alarma'].includes(this.g.envName);
    x.shadowColor = dark ? 'rgba(0,0,0,.8)' : 'rgba(255,252,244,.95)'; x.shadowBlur = 8;
    this.font(10, false); x.fillStyle = dark ? C.iceL : '#2a6f8f';
    x.fillText(z.n <= 5 ? `ZONA ${z.n}` : 'ESCENA 9', W / 2, 70);
    this.font(18); if (x.measureText(z.name).width > W - 20) this.font(12);
    x.fillStyle = dark ? '#eef6fa' : C.ink; x.fillText(z.name, W / 2, 92);
    x.fillStyle = C.ice; x.fillRect(W / 2 - 40, 100, 80, 1);
    x.shadowBlur = 0; x.globalAlpha = 1; x.textAlign = 'left';
  }

  drawHint(W, H) {
    const h = this.g.hint; if (!h || this.g.dialog) return;
    const x = this.ctx, a = Math.min(1, h.t / 0.3, (h.dur - h.t) / 0.5);
    const lines = this.wrap(h.text, Math.min(420, W - 40), 10);
    const lh = 13, bh = lines.length * lh + 10, y0 = IS_TOUCH ? 44 : H - 8 - bh;
    let mw = 0; this.font(10, false); for (const l of lines) mw = Math.max(mw, x.measureText(l).width);
    x.globalAlpha = Math.max(0, a);
    this.panel(W / 2 - mw / 2 - 8, y0, mw + 16, bh, 'rgba(244,239,228,.9)', C.ink);
    x.fillStyle = C.ink; x.textAlign = 'center';
    lines.forEach((l, i) => x.fillText(l, W / 2, y0 + 15 + i * lh));
    x.textAlign = 'left'; x.globalAlpha = 1;
  }

  drawToast(W, H) {
    const t = this.g.toast; if (!t) return;
    const x = this.ctx, a = Math.min(1, t.t / 0.3, (t.dur - t.t) / 0.5);
    const lines = this.wrap(t.text, Math.min(420, W - 40), 10);
    let mw = 0; this.font(10); for (const l of lines) mw = Math.max(mw, x.measureText(l).width);
    const bh = lines.length * 13 + 10, y0 = 34 + (1 - Math.min(1, t.t / 0.3)) * -10;
    x.globalAlpha = Math.max(0, a);
    this.panel(W / 2 - mw / 2 - 10, y0, mw + 20, bh, 'rgba(22,23,28,.9)', C.ice);
    x.fillStyle = C.iceL; x.textAlign = 'center';
    lines.forEach((l, i) => x.fillText(l, W / 2, y0 + 15 + i * 13));
    x.textAlign = 'left'; x.globalAlpha = 1;
  }

  drawVision(W, H) {
    const v = this.g.vision; if (!v) return;
    const x = this.ctx, t = v.t, a = Math.min(1, t / 0.5, (v.dur - t) / 0.7);
    x.globalAlpha = Math.max(0, a);
    x.fillStyle = '#fbfaf6'; x.fillRect(0, 0, W, H);
    if (v.kind === 'blanco') {
      if (t > 1.3) { x.fillStyle = `rgba(61,67,80,${Math.min(1, (t - 1.3) / 0.6)})`; x.fillRect(Math.round(W * 0.56), Math.round(H * 0.52), 2, 2); }
    } else {
      const cx = W / 2, len = Math.min(1, Math.max(0, (t - 0.9) / 1.2)) * 160, split = Math.max(0, (t - 2.6) / 2) * 60;
      if (split > 0) { x.fillStyle = `rgba(191,234,247,${Math.min(0.6, split / 60)})`; x.fillRect(cx - split, H / 2 - len / 2, split * 2, len); }
      x.fillStyle = C.ink;
      x.fillRect(Math.round(cx - split - 1), Math.round(H / 2 - len / 2), 2, Math.round(len));
      if (split > 0) x.fillRect(Math.round(cx + split - 1), Math.round(H / 2 - len / 2), 2, Math.round(len));
    }
    x.globalAlpha = 1;
  }

  drawDialog(W, H) {
    const g = this.g, d = g.dialog; if (!d) return;
    const x = this.ctx, shown = d.text.slice(0, Math.floor(d.shown)), done = d.shown >= d.text.length;
    if (d.who === 'pantalla') {
      const lines = d.text.split('\n'); this.font(11);
      let mw = 0; for (const l of lines) mw = Math.max(mw, x.measureText(l).width);
      const bw = Math.min(W - 30, mw + 30), bh = lines.length * 15 + 22, x0 = W / 2 - bw / 2, y0 = H / 2 - bh / 2 - 20;
      this.panel(x0, y0, bw, bh, 'rgba(8,16,22,.94)', '#2f6f8f');
      x.fillStyle = C.ice; let left = Math.floor(d.shown);
      lines.forEach((l, i) => { const s = l.slice(0, Math.max(0, left)); left -= l.length + 1; x.fillText(s, x0 + 15, y0 + 22 + i * 15); });
      if (done && Math.sin(g.time * 6) > 0) x.fillRect(x0 + bw - 16, y0 + bh - 12, 6, 6);
      return;
    }
    const bw = Math.min(W - 24, 560), bh = 78, x0 = W / 2 - bw / 2, y0 = IS_TOUCH ? 30 : H - bh - 12;
    const lunex = d.who === 'lunex', station = d.who === 'estacion';
    this.panel(x0, y0, bw, bh, lunex ? 'rgba(6,10,18,.94)' : 'rgba(244,239,228,.95)', lunex ? C.ice : C.ink);
    const hasPortrait = d.who !== 'nadie';
    let tx = x0 + 12;
    if (hasPortrait) {
      const px = x0 + 8, py = y0 + 8, ps = 62;
      x.fillStyle = lunex ? '#0b1420' : '#e3ddd0'; x.fillRect(px, py, ps, ps);
      x.save(); x.beginPath(); x.rect(px, py, ps, ps); x.clip();
      if (d.who === 'tilo') this.assets.tilo.draw(x, done ? 'idle' : 'talk', g.time, px + 3, py + 2, false, 1.4);
      else if (d.who === 'dip') this.assets.dip.draw(x, 'idle', g.time, px - 2, py + 2, false, 1.4);
      else if (station) { x.strokeStyle = '#2a6f8f'; x.lineWidth = 2; for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(px + ps / 2, py + ps / 2, 8 + i * 8, -2.4 + Math.sin(g.time * 2 + i), 0.6); x.stroke(); } x.fillStyle = C.ice; x.fillRect(px + ps / 2 - 3, py + ps / 2 - 3, 6, 6); }
      else if (lunex) {
        x.strokeStyle = C.ice; x.lineWidth = 1;
        const j = () => (Math.random() - 0.5) * 2;
        x.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * 6.28 + 0.3; x.lineTo(px + 31 + Math.cos(a) * 16 + j(), py + 28 + Math.sin(a) * 19 + j()); } x.stroke();
        x.fillStyle = C.ice; x.fillRect(px + 22, py + 26, 7, 1); x.fillRect(px + 34, py + 26, 7, 1);
        x.beginPath(); x.moveTo(px + 6, py + 60); x.lineTo(px + 20, py + 48); x.lineTo(px + 42, py + 48); x.lineTo(px + 56, py + 60); x.stroke();
      } else { this.font(30); x.fillStyle = C.ink; x.textAlign = 'center'; x.fillText('?', px + ps / 2, py + 42); x.textAlign = 'left'; }
      x.restore();
      x.strokeStyle = lunex ? C.ice : C.ink; x.strokeRect(px + 0.5, py + 0.5, ps - 1, ps - 1);
      tx = px + ps + 12;
    }
    if (NAMES[d.who]) { this.font(10); x.fillStyle = lunex ? C.ice : '#2a6f8f'; x.fillText(NAMES[d.who], tx, y0 + 18); }
    const lines = this.wrap(d.text, x0 + bw - tx - 14, 11);
    this.font(11, false); x.fillStyle = lunex ? '#dff6ff' : C.ink;
    let left = Math.floor(d.shown);
    const top = NAMES[d.who] ? y0 + 34 : y0 + 22;
    if (d.who === 'nadie') x.font = `italic 11px ${FONT}`;
    lines.forEach((l, i) => { const s = l.slice(0, Math.max(0, left)); left -= l.length + 1; x.fillText(s, tx, top + i * 14); });
    if (done && Math.sin(g.time * 6) > 0) { x.fillStyle = lunex ? C.ice : C.ink; x.beginPath(); x.moveTo(x0 + bw - 18, y0 + bh - 14); x.lineTo(x0 + bw - 10, y0 + bh - 14); x.lineTo(x0 + bw - 14, y0 + bh - 9); x.fill(); }
  }

  drawPause(W, H) {
    const x = this.ctx;
    x.fillStyle = 'rgba(22,23,28,.7)'; x.fillRect(0, 0, W, H);
    x.textAlign = 'center'; this.font(20); x.fillStyle = C.paper; x.fillText('PAUSA', W / 2, H / 2 - 30);
    this.font(10, false);
    const lines = IS_TOUCH ? ['Pulgar izquierdo: moverse (a fondo, correr)', 'Saltar · ✦ acción y recuerdo', 'Toca II para continuar']
      : ['← → moverse · Shift correr', 'Espacio saltar · E acción y recuerdo', 'M sonido · R reiniciar · Esc continuar'];
    lines.forEach((l, i) => x.fillText(l, W / 2, H / 2 + i * 15));
    this.font(10); x.fillStyle = C.ice; x.fillText(`Secretos encontrados: ${this.g.secrets.size}/4`, W / 2, H / 2 + lines.length * 15 + 16);
    x.textAlign = 'left';
  }

  drawEnd(W, H) {
    const g = this.g, x = this.ctx, t = g.fx.endTitle;
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    x.textAlign = 'center';
    x.globalAlpha = Math.min(1, t / 2);
    this.font(40); x.fillStyle = '#eef6fa'; x.fillText('VÉRTICE', W / 2, 150);
    x.fillStyle = C.ice; x.fillRect(W / 2 - 60, 162, 120, 1);
    x.globalAlpha = Math.max(0, Math.min(1, (t - 2.5) / 1.5));
    this.font(10, false); x.fillStyle = '#c9d2dc';
    x.fillText('Fin del Nivel 1 · Nácar', W / 2, 190);
    const m = Math.floor(g.playTime / 60), s = Math.floor(g.playTime % 60);
    x.fillText(`Tiempo ${m}:${String(s).padStart(2, '0')} · Secretos ${g.secrets.size}/4`, W / 2, 206);
    x.globalAlpha = Math.max(0, Math.min(1, (t - 4.5) / 1.5));
    x.font = `italic 10px ${FONT}`; x.fillStyle = '#9fb3c4';
    ['¿Por qué la estación conoce a DIP?', '¿Qué sabe Lunex?', '¿Cuántas veces ha ocurrido ya la caída?'].forEach((q, i) => x.fillText(q, W / 2, 240 + i * 14));
    if (t > 6 && Math.sin(t * 3) > -0.3) { this.font(10); x.fillStyle = C.ice; x.fillText(IS_TOUCH ? 'Toca para jugar de nuevo' : 'Pulsa una tecla para jugar de nuevo', W / 2, 316); }
    x.globalAlpha = 1; x.textAlign = 'left';
  }
}
