// sprites.js — Gestor de sprite sheets y generación del pixel art de los personajes.
//
// Hoja de DIP · frames de 48 × 86 px (versión SNES 48 px, sin cambios de diseño)
//   fila 0 reposo (6) · 1 caminar (6) · 2 correr (6) · 3 salto (3: agacharse, subir, caer)
//   fila 4 recuerdo (2: sacar la mano, proyectar) · 5 empujar (6) · 6 daño (1)
// Hoja de TILO · frames de 40 × 60 px
//   fila 0 reposo (4) · 1 hablar (2) · 2 caminar (4) · 3 brazos arriba (2)
//
// Los frames se dibujan con SVG, se rasterizan a la paleta fija y se pegan en una sola imagen
// por personaje. Después solo se leen por coordenadas (nunca una imagen por frame).

export class SpriteSheet {
  constructor(img, frameW, frameH, anims) {
    this.img = img; this.fw = frameW; this.fh = frameH; this.anims = anims;
    this.cols = img.width / frameW; this.rows = img.height / frameH;
  }
  frame(anim, t) {
    const a = this.anims[anim];
    const n = a.loop ? Math.floor(t * a.fps) % a.frames : Math.min(a.frames - 1, Math.floor(t * a.fps));
    return { col: (a.start || 0) + n, row: a.row };
  }
  // Para la textura 3D: mueve la ventana UV al frame que toca.
  setUV(texture, anim, t) {
    const f = this.frame(anim, t);
    texture.offset.set(f.col / this.cols, 1 - (f.row + 1) / this.rows);
  }
  // Para el HUD 2D (retratos de diálogo).
  draw(ctx, anim, t, x, y, flip = false, scale = 1) {
    const f = this.frame(anim, t);
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (flip) ctx.scale(-1, 1);
    ctx.drawImage(this.img, f.col * this.fw, f.row * this.fh, this.fw, this.fh, flip ? -this.fw * scale : 0, 0, this.fw * scale, this.fh * scale);
    ctx.restore();
  }
}

// ---------- DIP (dibujo original del sprite SNES 48 px) ----------
const DIP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 -10 300 540" width="300" height="540">
<g data-part="body">
  <g stroke="#3d4350" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" fill="#6aaccb">
    <g data-part="legL"><path d="M136 430 L132 510 Q132 522 145 522 L161 522 Q171 522 171 512 L172 438 Z"/></g>
    <g data-part="legR"><path d="M172 438 L173 512 Q173 522 183 522 L199 522 Q211 522 211 510 L208 430 Z"/></g>
    <path d="M159 250 L159 300 Q151 330 153 380 Q151 414 136 438 Q172 450 208 438 Q193 414 191 380 Q193 330 185 300 L185 250 Z"/>
    <path d="M156 286 Q131 291 119 316 Q104 350 109 381 Q113 397 128 399 L126 424 L163 427 Q158 380 160 330 Q161 300 156 286 Z" fill="#f6c3ae"/>
    <path d="M188 286 Q213 291 225 316 Q240 350 235 381 Q231 397 216 399 L218 424 L181 427 Q186 380 184 330 Q183 300 188 286 Z" fill="#f6c3ae"/>
    <path d="M126 417 L163 420 L163 431 L125 428 Z M218 417 L181 420 L181 431 L219 428 Z" fill="#eceef1"/>
    <path d="M161 262 Q145 274 139 298 Q150 306 157 300 Q156 284 163 276 Z M183 262 Q199 274 205 298 Q194 306 187 300 Q188 284 181 276 Z" fill="#eceef1"/>
    <path d="M157 300 Q161 330 159 360 Q158 395 162 418 M187 300 Q183 330 185 360 Q186 395 182 418" fill="none" stroke-width="10.2"/>
    <path d="M157 300 Q161 330 159 360 Q158 395 162 418 M187 300 Q183 330 185 360 Q186 395 182 418" fill="none" stroke="#eceef1" stroke-width="5"/>
    <path d="M208 246 C214 266 232 274 248 262 C258 254 262 238 258 228 Z"/>
    <path d="M262 138 C284 134 293 158 289 180 C286 200 271 213 257 206 Z"/>
    <path d="M89 138 C72 132 62 148 69 161 C74 168 84 167 87 163 Z"/>
    <g data-part="hair">
      <path d="M187 86 Q183 58 186 34" fill="none" stroke-width="27.2"/>
      <path d="M187 86 Q183 58 186 34" fill="none" stroke="#6aaccb" stroke-width="22"/>
    </g>
    <path d="M204 92 Q224 76 244 74 M216 100 Q238 92 256 94 M166 90 Q160 76 150 72" fill="none" stroke-width="27.2"/>
    <path d="M204 92 Q224 76 244 74 M216 100 Q238 92 256 94 M166 90 Q160 76 150 72" fill="none" stroke="#6aaccb" stroke-width="18"/>
    <path d="M178 84 C236 82 280 112 280 165 C280 220 246 266 178 266 C112 266 76 222 76 168 C76 114 120 86 178 84 Z"/>
    <path d="M120 98 L118 112 Q122 128 134 124 Q142 120 142 108 L142 92 Z M152 90 L154 116 Q160 132 172 126 Q178 120 176 108 L176 88 Z M184 90 L188 118 Q194 134 206 128 Q212 122 208 110 L204 92 Z M214 96 L222 116 Q230 130 240 124 Q246 118 240 106 L230 98 Z" stroke="none"/>
    <path d="M120 98 L118 112 Q122 128 134 124 Q142 120 142 108 L142 92 M152 90 L154 116 Q160 132 172 126 Q178 120 176 108 L176 88 M184 90 L188 118 Q194 134 206 128 Q212 122 208 110 L204 92 M214 96 L222 116 Q230 130 240 124 Q246 118 240 106 L230 98" fill="none"/>
  </g>
  <circle cx="68" cy="146" r="7" fill="none" stroke="#3d4350" stroke-width="2.2"/>
  <g data-part="eyes">
    <circle cx="137" cy="168" r="18" fill="#3d4350"/>
    <circle cx="210" cy="168" r="13" fill="#3d4350"/>
  </g>
  <path d="M116 184 Q123 194 139 192" fill="none" stroke="#3d4350" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M166 229 Q176 231 186 226" fill="none" stroke="#3d4350" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="100" cy="122" r="2.2" fill="#3d4350"/>
  <circle cx="108" cy="116" r="2.2" fill="#3d4350"/>
  <circle cx="111" cy="126" r="2.2" fill="#3d4350"/>
  <g data-part="arm" display="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M216 312 L288 334" fill="none" stroke="#3d4350" data-base="28" stroke-width="33.2"/>
    <path d="M216 312 L288 334" fill="none" stroke="#f6c3ae" stroke-width="28"/>
    <path d="M292 320 L286 348" fill="none" stroke="#3d4350" data-base="7" stroke-width="12"/>
    <path d="M292 320 L286 348" fill="none" stroke="#eceef1" stroke-width="7"/>
    <path d="M296 330 L326 330 Q334 330 334 338 L334 346 Q334 354 326 354 L300 354 Z" fill="#6aaccb" stroke="#3d4350" stroke-width="2.6"/>
    <g data-part="glow" display="none"><circle cx="318" cy="342" r="22" fill="#bfeaf7"/></g>
    <circle cx="318" cy="342" r="8" fill="none" stroke="#7fd0ec" stroke-width="7"/>
    <circle cx="318" cy="342" r="2.5" fill="#ffffff"/>
  </g>
</g>
</svg>`;

const DIP_PAL = ['#6aaccb', '#f6c3ae', '#eceef1', '#3d4350', '#7fd0ec', '#bfeaf7', '#ffffff'];
const DIP_W = 48, DIP_H = 86;

function parseSvg(str) {
  return new DOMParser().parseFromString(str, 'image/svg+xml').documentElement;
}

// Misma lógica de poses que el sprite original (piernas, pelo, parpadeo, brazo con anillo).
function dipPose(tpl, o) {
  const u = 300 / DIP_W;
  const clone = tpl.cloneNode(true);
  const q = (p) => clone.querySelector(`[data-part="${p}"]`);
  const dy = (o.dy || 0) * u, sy = o.sy || 1, lean = o.lean || 0;
  q('body').setAttribute('transform', `translate(0 ${dy}) rotate(${lean} 172 522) translate(172 522) scale(${1 / Math.sqrt(sy)} ${sy}) translate(-172 -522)`);
  q('legL').setAttribute('transform', `rotate(${o.lL || 0} 152 440)`);
  q('legR').setAttribute('transform', `rotate(${o.lR || 0} 192 440)`);
  q('hair').setAttribute('transform', `rotate(${o.hair || 0} 186 84)`);
  if (o.arm) q('arm').removeAttribute('display');
  if (o.glow) q('glow').removeAttribute('display');
  if (o.blink) q('eyes').setAttribute('transform', 'translate(0 168) scale(1 0.15) translate(0 -168)');
  const sw = 2.6, L = u * 1.15;
  clone.querySelectorAll('[stroke-width]').forEach(el => {
    if (el.hasAttribute('stroke') && el.getAttribute('stroke') !== '#3d4350') return;
    const v = parseFloat(el.getAttribute('stroke-width'));
    if (el.hasAttribute('data-base')) el.setAttribute('stroke-width', parseFloat(el.getAttribute('data-base')) + 2 * L);
    else if (Math.abs(v - 27.2) < 0.01) el.setAttribute('stroke-width', 22 + 2 * L);
    else if (Math.abs(v - 10.2) < 0.01) el.setAttribute('stroke-width', 5 + 2 * L);
    else el.setAttribute('stroke-width', Math.max(v, L * (v < sw ? 0.8 : 1)));
  });
  clone.querySelectorAll('[r]').forEach(el => { if (el.getAttribute('r') === '2.2') el.setAttribute('r', L * 0.6); });
  return new XMLSerializer().serializeToString(clone);
}

// Rasteriza a la paleta exacta, limpia píxeles sueltos y añade el contorno exterior.
function raster(svgStr, w, h, palHex, lineIdx) {
  const pal = palHex.map(c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)));
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onerror = rej;
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h);
      const d = x.getImageData(0, 0, w, h), p = d.data, k = new Int8Array(w * h).fill(-1);
      for (let j = 0; j < w * h; j++) {
        const i = j * 4; if (p[i + 3] < 120) continue;
        let bi = 0, bd = 1e9;
        pal.forEach((q, qi) => { const dd = (p[i] - q[0]) ** 2 + (p[i + 1] - q[1]) ** 2 + (p[i + 2] - q[2]) ** 2; if (dd < bd) { bd = dd; bi = qi; } });
        k[j] = bi;
      }
      const at = (X, Y) => (X < 0 || Y < 0 || X >= w || Y >= h) ? -1 : k[Y * w + X];
      for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
        const j = Y * w + X; if (k[j] < 0) continue;
        if ([at(X - 1, Y), at(X + 1, Y), at(X, Y - 1), at(X, Y + 1)].filter(v => v >= 0).length <= 1) k[j] = -1;
      }
      const out = Int8Array.from(k);
      for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
        const j = Y * w + X; if (k[j] >= 0) continue;
        if ([at(X - 1, Y), at(X + 1, Y), at(X, Y - 1), at(X, Y + 1)].some(v => v >= 0 && v !== lineIdx)) out[j] = lineIdx;
      }
      for (let j = 0; j < w * h; j++) {
        const i = j * 4, v = out[j];
        if (v < 0) { p[i + 3] = 0; continue; }
        const q = pal[v]; p[i] = q[0]; p[i + 1] = q[1]; p[i + 2] = q[2]; p[i + 3] = 255;
      }
      x.putImageData(d, 0, 0); URL.revokeObjectURL(url); res(c);
    };
    img.src = url;
  });
}

async function buildSheet(rows, fw, fh, render) {
  const cols = Math.max(...rows.map(r => r.length));
  const sheet = document.createElement('canvas');
  sheet.width = cols * fw; sheet.height = rows.length * fh;
  const sx = sheet.getContext('2d');
  for (let r = 0; r < rows.length; r++) {
    const frames = await Promise.all(rows[r].map(render));
    frames.forEach((f, i) => sx.drawImage(f, i * fw, r * fh));
  }
  return sheet;
}

export async function buildDipSheet() {
  const tpl = parseSvg(DIP_SVG);
  const S = Math.sin, T = Math.PI * 2;
  const r6 = (f) => [0, 1, 2, 3, 4, 5].map(f);
  const rows = [
    r6(i => ({ dy: [0, 0, 1, 1, 1, 0][i], hair: [-3, -1, 2, 3, 1, -2][i], blink: i === 4 })),
    r6(i => ({ lL: 16 * S(T * i / 6), lR: -16 * S(T * i / 6), dy: -Math.round(Math.abs(S(T * i / 6)) * 1.5), hair: -4 * S(T * i / 6), lean: 2 })),
    r6(i => ({ lL: 28 * S(T * i / 6), lR: -28 * S(T * i / 6), dy: -Math.round(Math.abs(S(T * i / 6)) * 3), hair: -6 - 4 * S(T * i / 6), lean: 7 })),
    [{ sy: 0.9, hair: 4 }, { sy: 1.05, lL: -10, lR: 10, hair: 10 }, { lL: 8, lR: -8, hair: -10 }],
    [{ arm: true, lean: -2, hair: -2 }, { arm: true, glow: true, lean: -4, hair: -6, lL: -6, lR: 6 }],
    r6(i => ({ arm: true, lL: 12 * S(T * i / 6), lR: -12 * S(T * i / 6), lean: 9, hair: -3 })),
    [{ lean: -9, sy: 0.94, blink: true, hair: 8, lL: -8, lR: 8 }]
  ];
  const sheet = await buildSheet(rows, DIP_W, DIP_H, o => raster(dipPose(tpl, o), DIP_W, DIP_H, DIP_PAL, 3));
  return new SpriteSheet(sheet, DIP_W, DIP_H, {
    idle: { row: 0, frames: 6, fps: 5, loop: true },
    walk: { row: 1, frames: 6, fps: 10, loop: true },
    run: { row: 2, frames: 6, fps: 14, loop: true },
    crouch: { row: 3, start: 0, frames: 1, fps: 1 },
    rise: { row: 3, start: 1, frames: 1, fps: 1 },
    fall: { row: 3, start: 2, frames: 1, fps: 1 },
    project: { row: 4, frames: 2, fps: 6.5 },
    push: { row: 5, frames: 6, fps: 7, loop: true },
    hurt: { row: 6, frames: 1, fps: 1 }
  });
}

// ---------- TILO (habitante de Nácar) ----------
const TILO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" width="200" height="300">
<g data-part="body">
 <g stroke="#3d4350" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">
  <path d="M150 104 L168 70" fill="none" stroke-width="13"/>
  <path d="M150 104 L168 70" fill="none" stroke="#9aa3ad" stroke-width="6"/>
  <circle cx="170" cy="64" r="10" fill="#9aa3ad"/>
  <rect x="120" y="100" width="56" height="98" rx="10" fill="#a4895f"/>
  <path d="M128 132 L170 132" fill="none"/>
  <g data-part="legL"><rect x="70" y="232" width="27" height="62" rx="9" fill="#5e4a41"/></g>
  <g data-part="legR"><rect x="103" y="232" width="27" height="62" rx="9" fill="#5e4a41"/></g>
  <path d="M100 126 C56 126 38 196 44 250 L156 250 C162 196 144 126 100 126 Z" fill="#8c6b5d"/>
  <path d="M48 226 L152 226" fill="none"/>
  <path d="M84 130 L100 158 L116 130" fill="none"/>
  <path d="M30 184 L66 184 L70 232 Q50 244 26 232 Z" fill="#a4895f"/>
  <circle cx="40" cy="180" r="8" fill="#7fd0ec"/>
  <circle cx="56" cy="178" r="7" fill="#e8dcc4"/>
  <g data-part="armL">
   <path d="M64 150 Q40 176 42 208" fill="none" stroke-width="24"/>
   <path d="M64 150 Q40 176 42 208" fill="none" stroke="#c7b28c" stroke-width="14"/>
  </g>
  <g data-part="armR">
   <path d="M136 150 Q160 174 158 204" fill="none" stroke-width="24"/>
   <path d="M136 150 Q160 174 158 204" fill="none" stroke="#c7b28c" stroke-width="14"/>
   <path d="M158 204 L186 166" fill="none" stroke-width="8"/>
   <path d="M174 160 Q194 146 198 172 Z" fill="#9aa3ad"/>
   <circle cx="188" cy="162" r="5" fill="#7fd0ec"/>
  </g>
  <path d="M62 42 L50 10 L82 30 Z" fill="#c7b28c"/>
  <path d="M138 42 L150 10 L118 30 Z" fill="#c7b28c"/>
  <ellipse cx="100" cy="84" rx="60" ry="52" fill="#c7b28c"/>
  <path d="M42 62 Q100 42 158 62" fill="none" stroke-width="11"/>
  <circle cx="77" cy="56" r="16" fill="#7fd0ec"/>
  <circle cx="123" cy="56" r="16" fill="#7fd0ec"/>
 </g>
 <g data-part="eyes"><circle cx="80" cy="92" r="10" fill="#3d4350"/><circle cx="120" cy="92" r="10" fill="#3d4350"/></g>
 <ellipse cx="100" cy="106" rx="9" ry="7" fill="#8c6b5d" stroke="#3d4350" stroke-width="5"/>
 <path data-part="mouth" d="M84 122 Q100 132 116 122" fill="none" stroke="#3d4350" stroke-width="7" stroke-linecap="round"/>
 <ellipse data-part="mouthO" display="none" cx="100" cy="124" rx="11" ry="9" fill="#3d4350"/>
</g>
</svg>`;

const TILO_PAL = ['#c7b28c', '#8c6b5d', '#5e4a41', '#a4895f', '#3d4350', '#7fd0ec', '#9aa3ad', '#e8dcc4'];
const TILO_W = 40, TILO_H = 60;

function tiloPose(tpl, o) {
  const clone = tpl.cloneNode(true);
  const q = (p) => clone.querySelector(`[data-part="${p}"]`);
  q('body').setAttribute('transform', `translate(0 ${(o.dy || 0) * 5})`);
  q('legL').setAttribute('transform', `rotate(${o.lL || 0} 84 236)`);
  q('legR').setAttribute('transform', `rotate(${o.lR || 0} 116 236)`);
  q('armL').setAttribute('transform', `rotate(${o.aL || 0} 64 150)`);
  q('armR').setAttribute('transform', `rotate(${o.aR || 0} 136 150)`);
  if (o.open) { q('mouth').setAttribute('display', 'none'); q('mouthO').removeAttribute('display'); }
  if (o.blink) q('eyes').setAttribute('transform', 'translate(0 92) scale(1 0.2) translate(0 -92)');
  return new XMLSerializer().serializeToString(clone);
}

export async function buildTiloSheet() {
  const tpl = parseSvg(TILO_SVG);
  const rows = [
    [{ dy: 0 }, { dy: 1, aR: -4 }, { dy: 1, aR: -6, blink: true }, { dy: 0, aR: -2 }],
    [{ open: true, aL: 40 }, { aL: 22, dy: 1 }],
    [{ lL: 18, lR: -18, dy: -1 }, { dy: 0 }, { lL: -18, lR: 18, dy: -1 }, { dy: 0 }],
    [{ aL: 110, aR: -110, open: true, dy: -2 }, { aL: 80, aR: -80, dy: 0 }]
  ];
  const sheet = await buildSheet(rows, TILO_W, TILO_H, o => raster(tiloPose(tpl, o), TILO_W, TILO_H, TILO_PAL, 4));
  return new SpriteSheet(sheet, TILO_W, TILO_H, {
    idle: { row: 0, frames: 4, fps: 3, loop: true },
    talk: { row: 1, frames: 2, fps: 6, loop: true },
    walk: { row: 2, frames: 4, fps: 10, loop: true },
    wave: { row: 3, frames: 2, fps: 8, loop: true }
  });
}
