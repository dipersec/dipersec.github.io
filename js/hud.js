// hud.js — HUD mínimo (fragmentos, vidas, Copias), consejos de la Guía, globos, diálogos y pantallas.
// Canvas 2D sobre el mundo; solo lee el estado del juego. Coordenadas virtuales: 360 de alto.
import { MEDALS } from './game.js';
const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
const MONO = '"Courier New", ui-monospace, monospace';
const NAMES = { dron: 'Dron', dip: 'DIP', guia: 'La Guía', copia: 'Copia de Seguridad', inspector: 'Inspector de Trámites' };
const C = { ink: '#0b1020', paper: '#f4f1ff', cian: '#7fd0ff', oro: '#ffc94a', rojo: '#ff5a4a', verde: '#58ffb0' };
const IS_TOUCH = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}.${String(Math.floor((s % 1) * 10))}`;

export class Hud {
  constructor(canvas, game, world, assets) { this.cv = canvas; this.ctx = canvas.getContext('2d'); this.g = game; this.world = world; this.assets = assets; this.wrapCache = new Map(); }
  resize(w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    this.u = this.cv.height / 360; this.W = this.cv.width / this.u; this.H = 360;
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
    if (shadow) { c.fillStyle = 'rgba(0,0,0,.55)'; c.fillText(s, x + 1, y + 1.5); }
    c.fillStyle = color; c.fillText(s, x, y);
  }

  draw() {
    const g = this.g, c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, this.cv.width, this.cv.height);
    c.setTransform(this.u, 0, 0, this.u, 0, 0); c.imageSmoothingEnabled = false; c.textBaseline = 'alphabetic';
    const W = this.W, H = this.H;
    if (g.mode === 'titulo') { this.drawTitle(W, H); return; }
    if (g.mode === 'juego') {
      this.drawLetterbox(W, H);
      if (g.letterbox < 0.5) this.drawStatus(W, H);
      this.drawBossBar(W, H);
      this.drawSection(W, H);
      this.drawBubble(W, H);
      this.drawTip(W, H);
      this.drawToast(W, H);
      this.drawDialog(W, H);
    }
    if (g.hurtFlash > 0) {
      const v = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.75);
      v.addColorStop(0, 'rgba(220,40,60,0)'); v.addColorStop(1, `rgba(220,40,60,${0.5 * g.hurtFlash})`); c.fillStyle = v; c.fillRect(0, 0, W, H);
    }
    if (g.fade.a > 0) { c.globalAlpha = g.fade.a; c.fillStyle = g.fade.color; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
    if (g.mode === 'fin') this.drawEnd(W, H);
    if (g.paused) this.drawPause(W, H);
  }

  drawTitle(W, H) {
    const c = this.ctx, g = this.g, t = g.time;
    const grd = c.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, 'rgba(5,9,20,.2)'); grd.addColorStop(1, 'rgba(5,9,20,.75)'); c.fillStyle = grd; c.fillRect(0, 0, W, H);
    c.textAlign = 'center';
    this.font(76, '900'); this.text('DIP', W / 2, 128, C.paper, 'center');
    this.font(19, 'bold'); this.text('EL SUEÑO INFINITO', W / 2, 156, C.cian, 'center');
    // burbujas de salvapantallas
    for (let i = 0; i < 7; i++) { const a = t * 0.6 + i; c.strokeStyle = `rgba(127,208,255,${0.25 + 0.2 * Math.sin(a)})`; c.lineWidth = 1.5; c.beginPath(); c.arc(W / 2 + Math.sin(a * 1.3 + i) * 120, 120 - ((t * 18 + i * 30) % 100), 4 + (i % 3) * 3, 0, 7); c.stroke(); }
    this.font(12, 'normal'); this.text('Nivel 1 · Sector Demolición', W / 2, 182, '#c7d4f5', 'center');
    if (Math.sin(t * 3) > -0.3) { this.font(14, 'bold'); this.text(IS_TOUCH ? 'Toca para empezar' : 'Pulsa Espacio para empezar', W / 2, 236, C.oro, 'center'); }
    if (g.save.done) { this.font(11, 'bold'); this.text(`T · Contrarreloj${g.save.best ? ' · mejor ' + fmt(g.save.best) : ''}`, W / 2, 258, C.cian, 'center'); }
    this.font(10, 'normal');
    this.text(IS_TOUCH ? 'Pulgar izquierdo: moverte · Saltar · Girar' : 'Flechas o WASD: moverte · Espacio: saltar · X: girar · Esc: pausa', W / 2, 330, '#9fb0d8', 'center');
    this.text('Con sonido', W / 2, 345, '#6f80a8', 'center');
  }
  drawLetterbox(W, H) { const h = Math.round(this.g.letterbox * 24); if (h > 0) { this.ctx.fillStyle = '#000'; this.ctx.fillRect(0, 0, W, h); this.ctx.fillRect(0, H - h, W, h); } }

  drawStatus(W, H) {
    const g = this.g, c = this.ctx, t = g.time;
    // fragmentos (rebota al recoger)
    const b = 1 + g.fragBump * 0.35;
    c.save(); c.translate(22, 22); c.scale(b, b);
    c.fillStyle = C.oro; c.beginPath(); c.moveTo(0, -9); c.lineTo(6, 0); c.lineTo(0, 9); c.lineTo(-6, 0); c.closePath(); c.fill();
    c.strokeStyle = '#7a4a0a'; c.lineWidth = 1.2; c.stroke(); c.restore();
    this.font(16, '900'); this.text(String(g.fragments).padStart(2, '0'), 34, 28, C.paper);
    // vidas: cabeza de DIP desde el sprite sheet
    c.save(); c.beginPath(); c.rect(80, 8, 26, 24); c.clip(); this.assets.dip.draw(c, 'idle', t, 78, 6, false, 0.55); c.restore();
    this.font(14, '900'); this.text('×' + g.lives, 108, 28, C.paper);
    // Copias de Seguridad
    for (let i = 0; i < 3; i++) {
      const x = 140 + i * 16, on = i < g.copias;
      c.fillStyle = on ? (g.superT > 0 && Math.sin(t * 20) > 0 ? '#ffe066' : 'rgba(127,208,255,.85)') : 'rgba(255,255,255,.12)';
      c.fillRect(x, 13, 11, 11); c.strokeStyle = on ? '#e9fbff' : 'rgba(255,255,255,.25)'; c.strokeRect(x + 0.5, 13.5, 10, 10);
    }
    // contrarreloj
    if (g.trial) { this.font(16, '900', MONO); this.text(fmt(g.runTime), W - 14, 28, g.runTime <= MEDALS.oro ? C.oro : C.paper, 'right'); }
  }
  drawBossBar(W, H) {
    const b = this.g.boss; if (!b.active) return;
    const c = this.ctx, w = 180, x = W / 2 - w / 2, y = 14;
    this.font(10, 'bold'); this.text('INSPECTOR DE TRÁMITES', W / 2, y + 2, '#ffd2c8', 'center');
    for (let i = 0; i < b.total; i++) {
      const on = i >= b.lost, px = x + i * (w / b.total);
      c.fillStyle = on ? C.rojo : 'rgba(255,255,255,.15)'; c.fillRect(px + 1, y + 7, w / b.total - 3, 7);
    }
  }
  drawSection(W, H) {
    const s = this.g.sectionCard; if (!s) return;
    const c = this.ctx, a = Math.max(0, Math.min(1, s.t / 0.4, (3.2 - s.t) / 0.6));
    c.globalAlpha = a;
    this.font(10, 'bold'); this.text(s.n === 4 ? 'JEFE' : `SECCIÓN ${s.n}`, W / 2, 74, C.cian, 'center');
    this.font(22, '900'); this.text(s.name, W / 2, 98, C.paper, 'center');
    c.globalAlpha = 1;
  }
  drawBubble(W, H) {
    const g = this.g, b = g.bubble; if (!b) return;
    const c = this.ctx, a = Math.max(0, Math.min(1, b.t / 0.15, (b.dur - b.t) / 0.3));
    let wx = g.player.pos.x, wy = g.player.pos.y + 2.3, wz = g.player.pos.z;
    if (b.who === 'inspector') { wx = g.boss.x; wy = g.boss.y + 3; wz = g.boss.z; }
    if (b.who === 'guia') { wy += 0.4; }
    const p = this.world.project(wx, wy, wz);
    const lines = this.wrap(b.text, 190, 11, 'bold');
    let mw = 0; this.font(11, 'bold'); for (const l of lines) mw = Math.max(mw, c.measureText(l).width);
    const bw = mw + 18, bh = lines.length * 14 + 22;
    let x = Math.max(8, Math.min(W - bw - 8, p.x * W - bw / 2)), y = Math.max(30, Math.min(H - bh - 60, p.y * H - bh - 8));
    c.globalAlpha = a;
    this.pill(x, y, bw, bh, b.who === 'copia' ? 'rgba(20,50,80,.92)' : 'rgba(250,248,255,.95)', b.who === 'copia' ? C.cian : null);
    this.font(8, 'bold'); this.text((NAMES[b.who] || '').toUpperCase(), x + 9, y + 11, b.who === 'copia' ? C.cian : '#4a5a90', 'left', false);
    this.font(11, 'bold'); lines.forEach((l, i) => this.text(l, x + 9, y + 25 + i * 14, b.who === 'copia' ? C.paper : C.ink, 'left', false));
    c.globalAlpha = 1;
  }
  drawTip(W, H) {
    const g = this.g, t = g.guiaTip; if (!t || g.dialog) return;
    const c = this.ctx, a = Math.max(0, Math.min(1, t.t / 0.2, (t.dur - t.t) / 0.4));
    const lines = this.wrap(t.text, 220, 11, 'bold');
    let mw = 0; this.font(11, 'bold'); for (const l of lines) mw = Math.max(mw, c.measureText(l).width);
    const bw = mw + 52, bh = Math.max(36, lines.length * 14 + 16), x = IS_TOUCH ? W / 2 - bw / 2 : 12, y = IS_TOUCH ? 42 : H - bh - 12;
    c.globalAlpha = a;
    this.pill(x, y, bw, bh, 'rgba(10,30,60,.9)', C.cian);
    // libro de la Guía
    c.fillStyle = '#123a5c'; c.fillRect(x + 9, y + bh / 2 - 10, 26, 20); c.fillStyle = C.cian; c.fillRect(x + 21, y + bh / 2 - 10, 2, 20);
    c.fillStyle = '#e9f6ff'; c.fillRect(x + 12, y + bh / 2 - 6, 7, 2); c.fillRect(x + 25, y + bh / 2 - 6, 7, 2); c.fillRect(x + 12, y + bh / 2 - 1, 6, 2); c.fillRect(x + 25, y + bh / 2 - 1, 5, 2);
    this.font(11, 'bold'); lines.forEach((l, i) => this.text(l, x + 42, y + bh / 2 + 4 - (lines.length - 1) * 7 + i * 14, C.paper, 'left', false));
    c.globalAlpha = 1;
  }
  drawToast(W, H) {
    const t = this.g.toast; if (!t) return;
    const c = this.ctx, a = Math.max(0, Math.min(1, t.t / 0.2, (t.dur - t.t) / 0.4));
    this.font(12, 'bold'); const w = c.measureText(t.text).width + 26;
    c.globalAlpha = a; this.pill(W / 2 - w / 2, 46, w, 24, 'rgba(255,201,74,.95)'); this.text(t.text, W / 2, 62, C.ink, 'center', false); c.globalAlpha = 1;
  }
  drawDialog(W, H) {
    const g = this.g, d = g.dialog; if (!d) return;
    const c = this.ctx, done = d.shown >= d.text.length;
    const bw = Math.min(W - 24, 540), bh = 74, x = W / 2 - bw / 2, y = IS_TOUCH ? 30 : H - bh - 30;
    this.pill(x, y, bw, bh, 'rgba(250,248,255,.96)');
    const ps = 54, px = x + 10, py = y + 10;
    c.fillStyle = '#dfe6fb'; c.fillRect(px, py, ps, ps);
    c.save(); c.beginPath(); c.rect(px, py, ps, ps); c.clip();
    if (d.who === 'dip') this.assets.dip.draw(c, done ? 'idle' : 'walk', g.time, px - 2, py + 1, false, 1.2);
    else if (d.who === 'guia') { c.fillStyle = '#123a5c'; c.fillRect(px + 10, py + 12, 34, 30); c.fillStyle = C.cian; this.font(9, 'bold'); c.textAlign = 'center'; c.fillText('GUÍA', px + 27, py + 31); }
    else if (d.who === 'dron') { c.fillStyle = '#9aa3b8'; c.beginPath(); c.arc(px + 27, py + 30, 12, 0, 7); c.fill(); c.fillStyle = '#ff3a2a'; c.beginPath(); c.arc(px + 27, py + 30, 3.5, 0, 7); c.fill(); c.fillStyle = '#c7d0e2'; c.fillRect(px + 6, py + 14, 42, 3); }
    else if (d.who === 'inspector') { c.fillStyle = '#d9c8b0'; c.fillRect(px + 12, py + 12, 30, 26); c.fillStyle = '#111'; c.fillRect(px + 14, py + 20, 26, 6); c.fillStyle = '#4a5266'; c.fillRect(px + 8, py + 40, 38, 14); }
    c.restore();
    this.font(9, 'bold'); this.text((NAMES[d.who] || '').toUpperCase(), px + ps + 10, y + 20, '#4a5a90', 'left', false);
    const lines = this.wrap(d.text, bw - ps - 34, 12, 'bold');
    this.font(12, 'bold'); let left = Math.floor(d.shown);
    lines.forEach((l, i) => { const s = l.slice(0, Math.max(0, left)); left -= l.length + 1; this.text(s, px + ps + 10, y + 37 + i * 15, C.ink, 'left', false); });
    if (done && Math.sin(g.time * 6) > 0) { c.fillStyle = '#4a5a90'; c.beginPath(); c.moveTo(x + bw - 18, y + bh - 14); c.lineTo(x + bw - 10, y + bh - 14); c.lineTo(x + bw - 14, y + bh - 9); c.fill(); }
  }
  drawPause(W, H) {
    const g = this.g, c = this.ctx;
    c.fillStyle = 'rgba(5,8,18,.82)'; c.fillRect(0, 0, W, H);
    this.font(22, '900'); this.text('PAUSA', W / 2, 52, C.paper, 'center');
    this.font(11, 'normal');
    const lines = IS_TOUCH ? ['Pulgar izquierdo: moverte · Saltar · Girar', 'Toca II para continuar'] : ['Flechas o WASD: moverte · Espacio: saltar · X: girar', 'R: reiniciar el nivel · M: sonido · Esc: continuar'];
    lines.forEach((l, i) => this.text(l, W / 2, 74 + i * 15, '#c7d4f5', 'center'));
    const pages = g.L.pages;
    this.font(11, 'bold'); this.text(`Páginas de la Guía: ${pages.filter(p => p.got).length}/4`, W / 2, 124, C.cian, 'center');
    let y = 144;
    for (const p of pages) {
      if (!p.got) { this.font(10, 'normal'); this.text('· · · página sin encontrar · · ·', W / 2, y, '#55627f', 'center'); y += 18; continue; }
      this.font(10, 'bold'); this.text(p.title, W / 2, y, C.paper, 'center');
      const ls = this.wrap(p.text, Math.min(440, W - 40), 10, 'normal'); this.font(10, 'normal');
      ls.forEach((l, i) => this.text(l, W / 2, y + 13 + i * 12, '#aebbd9', 'center')); y += 20 + ls.length * 12;
    }
  }
  drawEnd(W, H) {
    const g = this.g, r = g.result, c = this.ctx, t = g.endT || 0; if (!r) return;
    c.fillStyle = '#05070d'; c.fillRect(0, 0, W, H);
    c.globalAlpha = Math.min(1, t / 1);
    this.font(11, 'bold'); this.text(g.trial ? 'CONTRARRELOJ' : 'NIVEL 1 COMPLETADO', W / 2, 58, C.cian, 'center');
    this.font(26, '900'); this.text('Sector Demolición', W / 2, 88, C.paper, 'center');
    const rows = [
      ['Tiempo', fmt(r.t) + (r.medal ? `  · medalla de ${r.medal}` : '')],
      ['Fragmentos', String(r.frags)],
      ['Paquetes rotos', `${r.crates}/${r.total}${r.allCrates ? '  · Semilla de Sueño' : ''}`],
      ['Páginas de la Guía', `${r.pages}/4`],
      ['Caídas', String(r.deaths)],
      ['Semillas de Sueño', `${r.seeds}/2 de este nivel`]
    ];
    this.font(12, 'normal');
    rows.forEach(([k, v], i) => { const y = 124 + i * 20; this.text(k, W / 2 - 10, y, '#9fb0d8', 'right'); this.font(12, 'bold'); this.text(v, W / 2 + 10, y, C.paper); this.font(12, 'normal'); });
    if (!g.trial) { this.font(10, 'normal'); this.text(`Medallas: oro ${fmt(MEDALS.oro)} · plata ${fmt(MEDALS.plata)} · bronce ${fmt(MEDALS.bronce)}`, W / 2, 256, '#6f80a8', 'center'); }
    c.globalAlpha = Math.max(0, Math.min(1, (t - 1.5) / 1));
    this.font(11, 'bold'); this.text('Próximamente: Nivel 2 — Desierto de Caché', W / 2, 284, C.oro, 'center');
    if (t > 2.5 && Math.sin(t * 3) > -0.3) { this.font(11, 'bold'); this.text(IS_TOUCH ? 'Toca para volver al inicio' : 'Espacio: volver al inicio · T: contrarreloj', W / 2, 318, C.cian, 'center'); }
    c.globalAlpha = 1;
  }
}
