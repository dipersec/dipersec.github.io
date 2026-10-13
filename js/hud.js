// hud.js — HUD mínimo (partículas, vidas, conchas), objetivo, recuerdo activo, avisos, globos, diálogos y pantallas.
// Canvas 2D sobre el mundo; solo lee el estado del juego. Coordenadas virtuales: 360 de alto.
import { MUNDOS } from './mundos/registro.js';
const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
const MONO = '"Courier New", ui-monospace, monospace';
const C = { ink: '#1a1426', paper: '#fbf6ff', cian: '#9fe8ff', oro: '#ffd36a', rojo: '#ff6a5a', verde: '#6affc8', rosa: '#ffc8ee', lila: '#c8b8ff' };
const IS_TOUCH = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}.${String(Math.floor((s % 1) * 10))}`;

export class Hud {
  constructor(canvas, game, world, assets) { this.cv = canvas; this.ctx = canvas.getContext('2d'); this.g = game; this.world = world; this.assets = assets; this.wrapCache = new Map(); }
  get NAMES() { return this.g.M.nombres; }
  resize(w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    // 360 unidades de alto en horizontal; en vertical manda el ancho (mínimo 400) para que nada se corte
    this.u = Math.min(this.cv.height / 360, this.cv.width / 400); this.W = this.cv.width / this.u; this.H = this.cv.height / this.u;
  }
  font(px, w = 'bold', fam = FONT) { this.ctx.font = `${w} ${px}px ${fam}`; }
  wrap(text, maxW, px, w = 'normal') {
    const key = text + maxW + px + w; let r = this.wrapCache.get(key); if (r) return r;
    this.font(px, w); r = [];
    for (const para of text.split('\n')) { let line = ''; for (const word of para.split(' ')) { const t = line ? line + ' ' + word : word; if (this.ctx.measureText(t).width > maxW && line) { r.push(line); line = word; } else line = t; } r.push(line); }
    if (this.wrapCache.size > 300) this.wrapCache.clear(); this.wrapCache.set(key, r); return r;
  }
  pill(x, y, w, h, fill, stroke) {
    const c = this.ctx, r = Math.min(h / 2, 10);
    c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.2; c.stroke(); }
  }
  text(s, x, y, color, align = 'left', shadow = true) {
    const c = this.ctx; c.textAlign = align;
    if (shadow) { c.fillStyle = 'rgba(20,10,30,.5)'; c.fillText(s, x + 1, y + 1.5); }
    c.fillStyle = color; c.fillText(s, x, y);
  }
  gem(x, y, s, color = C.rosa) {
    const c = this.ctx; c.save(); c.translate(x, y); c.scale(s, s);
    const gr = c.createLinearGradient(-6, -9, 6, 9); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, color); gr.addColorStop(1, '#b8a8ff');
    c.fillStyle = gr; c.beginPath(); c.moveTo(0, -9); c.lineTo(6, 0); c.lineTo(0, 9); c.lineTo(-6, 0); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(80,40,90,.7)'; c.lineWidth = 1.2; c.stroke(); c.restore();
  }
  shell(x, y, on, hot) {
    const c = this.ctx; c.save(); c.translate(x, y);
    c.beginPath(); c.moveTo(-6, 4); c.quadraticCurveTo(-7, -6, 0, -7); c.quadraticCurveTo(7, -6, 6, 4); c.closePath();
    if (on) { const gr = c.createLinearGradient(-6, -7, 6, 4); gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, hot ? '#ffe8a0' : C.rosa); gr.addColorStop(1, C.lila); c.fillStyle = gr; } else c.fillStyle = 'rgba(255,255,255,.14)';
    c.fill(); c.strokeStyle = on ? '#fff' : 'rgba(255,255,255,.3)'; c.lineWidth = 1; c.stroke();
    if (on) { c.strokeStyle = 'rgba(120,80,140,.5)'; c.beginPath(); for (const a of [-3, 0, 3]) { c.moveTo(0, 3); c.lineTo(a * 1.3, -5); } c.stroke(); }
    c.restore();
  }

  draw() {
    const g = this.g, c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, this.cv.width, this.cv.height);
    c.setTransform(this.u, 0, 0, this.u, 0, 0); c.imageSmoothingEnabled = false; c.textBaseline = 'alphabetic';
    const W = this.W, H = this.H;
    if (g.mode === 'titulo') { this.drawTitle(W, H); return; }
    if (g.mode === 'juego') {
      this.drawLetterbox(W, H);
      if (g.letterbox < 0.5) { this.drawStatus(W, H); this.drawObjetivo(W, H); this.drawRecuerdo(W, H); this.drawPrompt(W, H); }
      this.drawBossBar(W, H);
      this.drawSection(W, H);
      this.drawBubble(W, H);
      this.drawTip(W, H);
      this.drawToast(W, H);
      this.drawDialog(W, H);
    }
    if (g.fx.flash > 0 && g.efectos) { c.fillStyle = `rgba(240,250,255,${g.fx.flash * 0.55})`; c.fillRect(0, 0, W, H); }
    if (g.hurtFlash > 0) {
      const v = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.75);
      v.addColorStop(0, 'rgba(220,40,80,0)'); v.addColorStop(1, `rgba(220,40,80,${0.5 * g.hurtFlash})`); c.fillStyle = v; c.fillRect(0, 0, W, H);
    }
    if (g.fade.a > 0) { c.globalAlpha = g.fade.a; c.fillStyle = g.fade.color; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
    if (g.mode === 'fin') this.drawEnd(W, H);
    if (g.paused) { c.fillStyle = 'rgba(14,10,24,.7)'; c.fillRect(0, 0, W, H); }
  }

  drawTitle(W, H) {
    const c = this.ctx, g = this.g, t = g.time;
    const grd = c.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, 'rgba(30,20,60,.55)'); grd.addColorStop(0.55, 'rgba(30,20,60,.1)'); grd.addColorStop(1, 'rgba(30,20,60,.6)'); c.fillStyle = grd; c.fillRect(0, 0, W, H);
    const y0 = Math.min(H * 0.3, H * 0.52 - 70);
    this.font(82, '900'); this.text('DIP', W / 2, y0, C.paper, 'center');
    const iri = c.createLinearGradient(W / 2 - 150, 0, W / 2 + 150, 0);
    iri.addColorStop(0, '#ffc8ee'); iri.addColorStop(0.5 + Math.sin(t) * 0.2, '#c8f0ff'); iri.addColorStop(1, '#d8c8ff');
    this.font(16, 'bold'); c.textAlign = 'center'; c.fillStyle = 'rgba(20,10,30,.5)'; c.fillText('EL ÚLTIMO RECUERDO DEL UNIVERSO', W / 2 + 1, y0 + 26.5); c.fillStyle = iri; c.fillText('EL ÚLTIMO RECUERDO DEL UNIVERSO', W / 2, y0 + 25);
    this.font(11, 'normal'); this.text('Mundo 1 · Nácar, el planeta de la caída', W / 2, y0 + 46, '#efe6ff', 'center');
    if (!IS_TOUCH) {
      this.font(10, 'normal');
      this.text('Flechas o WASD: moverte · Espacio: saltar · X: girar · C: recordar · Esc: pausa', W / 2, H - 24, '#efe6ff', 'center');
    }
    this.text('Mejor con sonido', W / 2, H - 10, '#d8cce8', 'center');
  }
  drawLetterbox(W, H) { const h = Math.round(this.g.letterbox * 24); if (h > 0) { this.ctx.fillStyle = '#0d0a14'; this.ctx.fillRect(0, 0, W, h); this.ctx.fillRect(0, H - h, W, h); } }

  drawStatus(W, H) {
    const g = this.g, c = this.ctx, t = g.time;
    this.gem(22, 22, 1 + g.fragBump * 0.35);
    this.font(16, '900'); this.text(String(g.fragments).padStart(2, '0'), 34, 28, C.paper);
    c.save(); c.beginPath(); c.rect(80, 8, 26, 24); c.clip(); this.assets.dip.draw(c, 'idle', t, 78, 6, false, 0.55); c.restore();
    this.font(14, '900'); this.text('×' + g.lives, 108, 28, C.paper);
    for (let i = 0; i < 3; i++) this.shell(148 + i * 17, 20, i < g.conchas, g.superT > 0 && Math.sin(t * 20) > 0);
    if (g.trial) { this.font(16, '900', MONO); this.text(fmt(g.runTime), W - 14, 28, g.runTime <= g.M.medallas.oro ? C.oro : C.paper, 'right'); }
  }
  drawObjetivo(W, H) {
    const g = this.g, o = g.objetivo; if (!o) return;
    const c = this.ctx, n = g.L.piezas.filter(q => q.got).length, x = 12, y = 40;
    this.pill(x, y, 150, 22, 'rgba(26,20,38,.72)', 'rgba(255,211,106,.6)');
    c.save(); c.translate(x + 13, y + 11); c.rotate(t2(g.time)); c.fillStyle = C.oro; c.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 4.5 : 6.5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.fill(); c.fillStyle = '#5a3a10'; c.beginPath(); c.arc(0, 0, 2, 0, 7); c.fill(); c.restore();
    this.font(10, 'bold'); this.text(`Piezas del recolector  ${n}/3`, x + 26, y + 15, C.paper, 'left', false);
  }
  drawRecuerdo(W, H) {
    const g = this.g, m = g.memorias.activa; if (!m) return;
    const c = this.ctx, w = 150, x = W / 2 - w / 2, y = g.boss.active ? 40 : 14, k = Math.max(0, m.t / m.dur);
    const warn = m.t < 1.6 && Math.sin(g.time * 20) > 0;
    this.pill(x, y, w, 22, 'rgba(26,20,48,.78)', warn ? C.oro : C.cian);
    this.font(10, 'bold'); this.text('RECUERDO', x + 10, y + 15, warn ? C.oro : C.cian, 'left', false);
    c.fillStyle = 'rgba(255,255,255,.15)'; c.fillRect(x + 70, y + 9, 52, 5);
    c.fillStyle = warn ? C.oro : C.cian; c.fillRect(x + 70, y + 9, 52 * k, 5);
    this.font(10, 'bold', MONO); this.text(`${Math.ceil(m.t)} s`, x + w - 8, y + 15, C.paper, 'right', false);
  }
  drawPrompt(W, H) {
    const g = this.g, m = g.memorias.near; if (!m || g.dialog) return;
    const p = this.world.project(m.x, m.y + 1.9, m.z); if (!p.on) return;
    const c = this.ctx, puede = g.memorias.puede;
    const label = !puede ? 'Algo falta aquí…' : IS_TOUCH ? 'Recordar' : 'C · Recordar';
    this.font(11, 'bold'); const w = c.measureText(label).width + 18;
    const x = p.x * W - w / 2, y = p.y * H - 22 + Math.sin(g.time * 4) * 2;
    this.pill(x, y, w, 20, puede ? 'rgba(20,40,60,.88)' : 'rgba(40,36,50,.75)', puede ? C.cian : 'rgba(255,255,255,.3)');
    this.text(label, x + w / 2, y + 14, puede ? C.paper : '#c8c0d8', 'center', false);
  }
  drawBossBar(W, H) {
    const g = this.g, b = g.boss; if (!b.active) return;
    const c = this.ctx, w = 190, x = W / 2 - w / 2, y = 14;
    this.font(10, 'bold'); this.text('GUARDIÁN DE LA ESTACIÓN', W / 2, y + 2, '#d8f4ff', 'center');
    for (let i = 0; i < b.total; i++) {
      const on = i >= b.lost, px = x + i * (w / b.total);
      c.fillStyle = on ? '#7fe6ff' : 'rgba(255,255,255,.15)'; c.fillRect(px + 1, y + 7, w / b.total - 3, 7);
    }
    if (b.phase === 3 && b.ordenT > 0) {
      const a = Math.min(1, b.ordenT / 0.3, (2.6 - b.ordenT) / 0.15 + 0.2);
      c.globalAlpha = Math.max(0, Math.min(1, a));
      this.font(9, 'bold'); this.text('ORDEN NUEVA', W / 2, 64, C.oro, 'center');
      this.font(15, '900'); this.text(b.orden, W / 2, 82, C.paper, 'center');
      c.globalAlpha = 1;
    }
  }
  drawSection(W, H) {
    const s = this.g.sectionCard; if (!s) return;
    const c = this.ctx, a = Math.max(0, Math.min(1, s.t / 0.4, (3.2 - s.t) / 0.6));
    c.globalAlpha = a;
    this.font(10, 'bold'); this.text(`NÁCAR · FASE ${s.n}`, W / 2, 112, C.cian, 'center');
    this.font(22, '900'); this.text(s.name, W / 2, 136, C.paper, 'center');
    c.globalAlpha = 1;
  }
  drawBubble(W, H) {
    const g = this.g, b = g.bubble; if (!b) return;
    const c = this.ctx, a = Math.max(0, Math.min(1, b.t / 0.15, (b.dur - b.t) / 0.3));
    const lines = this.wrap(b.text, 200, 11, 'bold');
    let mw = 0; this.font(11, 'bold'); for (const l of lines) mw = Math.max(mw, c.measureText(l).width);
    const bw = mw + 18, bh = lines.length * 14 + 22;
    let x, y;
    if (b.who === 'lunex') { x = W / 2 - bw / 2; y = H * 0.6; }
    else {
      const sp = this.world.escena.speaker(b.who) || { x: g.player.pos.x, y: g.player.pos.y + 2.3, z: g.player.pos.z };
      const p = this.world.project(sp.x, sp.y, sp.z);
      x = Math.max(8, Math.min(W - bw - 8, p.x * W - bw / 2)); y = Math.max(30, Math.min(H - bh - 60, p.y * H - bh - 8));
    }
    c.globalAlpha = a;
    const dark = b.who === 'lunex';
    this.pill(x, y, bw, bh, dark ? 'rgba(14,20,44,.9)' : 'rgba(253,250,255,.95)', dark ? '#e8f4ff' : null);
    this.font(8, 'bold'); this.text((this.NAMES[b.who] || '').toUpperCase(), x + 9, y + 11, dark ? C.cian : b.who === 'tilo' ? '#b0602a' : '#5a4a90', 'left', false);
    this.font(11, 'bold'); lines.forEach((l, i) => this.text(l, x + 9, y + 25 + i * 14, dark ? C.paper : C.ink, 'left', false));
    c.globalAlpha = 1;
  }
  drawTip(W, H) {
    const g = this.g, t = g.guiaTip; if (!t || g.dialog) return;
    const c = this.ctx, a = Math.max(0, Math.min(1, t.t / 0.2, (t.dur - t.t) / 0.4));
    const lines = this.wrap(t.text, 230, 11, 'bold');
    let mw = 0; this.font(11, 'bold'); for (const l of lines) mw = Math.max(mw, c.measureText(l).width);
    const bw = mw + 44, bh = Math.max(32, lines.length * 14 + 14), x = IS_TOUCH ? W / 2 - bw / 2 : 12, y = IS_TOUCH ? 42 : H - bh - 12;
    c.globalAlpha = a;
    this.pill(x, y, bw, bh, 'rgba(24,18,44,.88)', C.lila);
    c.fillStyle = C.lila; c.beginPath(); c.arc(x + 17, y + bh / 2, 9, 0, 7); c.fill();
    this.font(12, '900'); this.text('i', x + 17, y + bh / 2 + 4.5, C.ink, 'center', false);
    this.font(11, 'bold'); lines.forEach((l, i) => this.text(l, x + 33, y + bh / 2 + 4 - (lines.length - 1) * 7 + i * 14, C.paper, 'left', false));
    c.globalAlpha = 1;
  }
  drawToast(W, H) {
    const t = this.g.toast; if (!t) return;
    const c = this.ctx, a = Math.max(0, Math.min(1, t.t / 0.2, (t.dur - t.t) / 0.4));
    this.font(12, 'bold'); const w = c.measureText(t.text).width + 26;
    c.globalAlpha = a; this.pill(W / 2 - w / 2, 46, w, 24, 'rgba(255,224,150,.96)'); this.text(t.text, W / 2, 62, C.ink, 'center', false); c.globalAlpha = 1;
  }
  portrait(who, px, py, ps, done) {
    const c = this.ctx, g = this.g, cx = px + ps / 2, cy = py + ps / 2;
    if (who === 'dip') { this.assets.dip.draw(c, done ? 'idle' : 'walk', g.time, px - 2, py + 1, false, 1.2); return; }
    if (who === 'tilo') {
      c.fillStyle = '#e0a070'; c.beginPath(); c.ellipse(cx, cy + 6, 21, 22, 0, 0, 7); c.fill();
      c.fillStyle = '#f6dcb8'; c.beginPath(); c.ellipse(cx, cy + 14, 13, 11, 0, 0, 7); c.fill();
      for (const s of [-1, 1]) { c.fillStyle = '#e0a070'; c.beginPath(); c.moveTo(cx + s * 12, cy - 12); c.lineTo(cx + s * 20, cy - 24); c.lineTo(cx + s * 6, cy - 16); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(cx + s * 8, cy - 1, 6.5, 0, 7); c.fill(); c.fillStyle = '#1a1420'; c.beginPath(); c.arc(cx + s * 8, cy, 3.2, 0, 7); c.fill(); }
      c.strokeStyle = '#5a2a2a'; c.lineWidth = 1.6; c.beginPath(); c.arc(cx, cy + 6, 4, 0.2, Math.PI - 0.2); c.stroke(); return;
    }
    if (who === 'lunex') {
      c.fillStyle = '#0e1430'; c.fillRect(px, py, ps, ps);
      c.strokeStyle = '#e8f4ff'; c.lineWidth = 1.5; for (const r of [20, 14]) { c.beginPath(); c.ellipse(cx, cy, r, r * 0.55 + Math.sin(g.time * 2) * 2, g.time * 0.5, 0, 7); c.stroke(); }
      c.fillStyle = '#9fe8ff'; c.beginPath(); c.moveTo(cx, cy - 7); c.lineTo(cx + 6, cy); c.lineTo(cx, cy + 7); c.lineTo(cx - 6, cy); c.fill(); return;
    }
    if (who === 'guardian') {
      c.fillStyle = '#d8d0c8'; c.fillRect(px + 10, py + 30, 34, 22);
      c.strokeStyle = '#6a7488'; c.lineWidth = 5; c.beginPath(); c.arc(cx, cy - 6, 12, 0, 7); c.stroke();
      c.fillStyle = '#9ff0ff'; c.beginPath(); c.arc(cx, cy - 6, 6, 0, 7); c.fill(); return;
    }
    if (who === 'capsula') {
      c.fillStyle = '#071a22'; c.fillRect(px + 6, py + 10, ps - 12, ps - 20); c.strokeStyle = '#5ae0ff'; c.lineWidth = 2; c.strokeRect(px + 6, py + 10, ps - 12, ps - 20);
      c.fillStyle = '#5ae0ff'; for (let i = 0; i < 4; i++) c.fillRect(px + 11, py + 16 + i * 7, 18 + (i * 11) % 16, 3); return;
    }
    if (who === 'registro') {
      c.fillStyle = '#2a2f52'; c.fillRect(px + 12, py + 6, 30, 42); c.strokeStyle = '#9fe8ff'; c.lineWidth = 2; c.strokeRect(px + 12, py + 6, 30, 42);
      c.fillStyle = '#bff2ff'; for (let i = 0; i < 5; i++) c.fillRect(px + 16, py + 12 + i * 7, 14 + (i * 7) % 9, 2.5);
    }
  }
  drawDialog(W, H) {
    const g = this.g, d = g.dialog; if (!d) return;
    const c = this.ctx, done = d.shown >= d.text.length, reg = d.who === 'registro';
    const bw = Math.min(W - 24, 560), bh = 78, x = W / 2 - bw / 2, y = IS_TOUCH ? 30 : H - bh - 30;
    this.pill(x, y, bw, bh, reg ? 'rgba(10,16,30,.95)' : 'rgba(253,250,255,.96)', reg ? C.cian : null);
    const ps = 54, px = x + 10, py = y + 12;
    c.fillStyle = reg ? '#131a30' : '#efe6fb'; c.fillRect(px, py, ps, ps);
    c.save(); c.beginPath(); c.rect(px, py, ps, ps); c.clip(); this.portrait(d.who, px, py, ps, done); c.restore();
    this.font(9, 'bold'); this.text((this.NAMES[d.who] || '').toUpperCase(), px + ps + 10, y + 21, reg ? C.cian : '#5a4a90', 'left', false);
    const fam = reg ? MONO : FONT, lines = this.wrap(d.text, bw - ps - 34, 12, 'bold');
    this.font(12, 'bold', fam); let left = Math.floor(d.shown);
    lines.forEach((l, i) => { const s = l.slice(0, Math.max(0, left)); left -= l.length + 1; this.text(s, px + ps + 10, y + 38 + i * 15, reg ? '#d8f6ff' : C.ink, 'left', false); });
    if (done && Math.sin(g.time * 6) > 0) { c.fillStyle = reg ? C.cian : '#5a4a90'; c.beginPath(); c.moveTo(x + bw - 18, y + bh - 14); c.lineTo(x + bw - 10, y + bh - 14); c.lineTo(x + bw - 14, y + bh - 9); c.fill(); }
  }
  drawEnd(W, H) {
    const g = this.g, r = g.result, c = this.ctx, t = g.endT || 0; if (!r) return;
    const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#f4eefc'); bg.addColorStop(1, '#e2d4f2'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.save(); c.translate(0, (H - 360) / 2);
    c.globalAlpha = Math.min(1, t / 1);
    this.font(11, 'bold'); this.text(g.trial ? 'CONTRARRELOJ' : 'MUNDO 1 COMPLETADO', W / 2, 46, '#6a5aa0', 'center', false);
    this.font(28, '900'); this.text('Nácar', W / 2, 76, C.ink, 'center', false);
    const rows = [
      ['Tiempo', fmt(r.t) + (r.medal ? `  · medalla de ${r.medal}` : '')],
      ['Partículas', String(r.frags)],
      ['Cajas rotas', `${r.crates}/${r.total}`],
      ['Registros', `${r.registros}/${r.totalRegistros}`],
      ['Caídas', String(r.deaths)]
    ];
    rows.forEach(([k, v], i) => { const y = 104 + i * 18; this.font(12, 'normal'); this.text(k, W / 2 - 10, y, '#6a5a80', 'right', false); this.font(12, 'bold'); this.text(v, W / 2 + 10, y, C.ink, 'left', false); });
    c.globalAlpha = Math.max(0, Math.min(1, (t - 0.8) / 0.8));
    this.font(11, 'bold'); this.text('Habilidad: Reconstrucción por memoria', W / 2, 206, '#2a7a9a', 'center', false);
    this.font(10, 'normal'); this.text('«La estación registró a DIP antes del viaje. ¿Cómo?»', W / 2, 222, '#6a5a80', 'center', false);
    // los siete mundos: solo Nácar está hecho; los demás se muestran como próximos, sin fingir que existen
    const n = MUNDOS.length, cw = Math.min(78, (W - 30) / n), x0 = W / 2 - (cw * n) / 2;
    MUNDOS.forEach((m, i) => {
      const x = x0 + i * cw, done = g.save.completados[m.id];
      this.pill(x + 3, 238, cw - 6, 40, done ? 'rgba(106,255,200,.25)' : 'rgba(26,20,38,.08)', done ? '#2a9a7a' : 'rgba(26,20,38,.2)');
      this.font(9, 'bold'); this.text(`${m.n} · ${m.nombre}`, x + cw / 2, 254, done ? C.ink : '#8a7aa0', 'center', false);
      this.font(8, 'normal'); this.text(done ? 'completado' : 'próximamente', x + cw / 2, 268, done ? '#2a7a6a' : '#9a8ab0', 'center', false);
    });
    c.globalAlpha = Math.max(0, Math.min(1, (t - 1.5) / 1));
    this.font(11, 'bold'); this.text('Siguiente: Vértice, el planeta de las leyes rotas (próximamente)', W / 2, 300, '#a0602a', 'center', false);
    if (t > 2.5 && Math.sin(t * 3) > -0.3) { this.font(11, 'bold'); this.text(IS_TOUCH ? 'Toca para volver al inicio' : 'Espacio: volver al inicio · T: contrarreloj', W / 2, 330, '#5a4a90', 'center', false); }
    c.globalAlpha = 1; c.restore();
  }
}
const t2 = (t) => t * 1.5;
