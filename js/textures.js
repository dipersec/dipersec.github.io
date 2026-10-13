// textures.js — Texturas procedurales HD (se generan una vez al cargar). Solo DIP es pixel art;
// todo lo demás se dibuja a 512 px con ruido, vetas y mapas de emisión para que se vea limpio de cerca.
import * as THREE from 'three';

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function finish(c, renderer, { color = true, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.userData.canvas = c;
  return t;
}
function grain(x, w, h, r, base, amount) {
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  const img = x.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * amount; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  x.putImageData(img, 0, 0);
}
// manchas suaves (variación de tono a gran escala)
function blotches(x, r, n, w, h, colors, alpha) {
  for (let i = 0; i < n; i++) {
    const cx = r() * w, cy = r() * h, rad = 30 + r() * 120, g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, colors[Math.floor(r() * colors.length)]); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalAlpha = alpha; x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); x.globalAlpha = 1;
  }
}
const make = (w, h, draw) => { const c = canvas(w, h); draw(c.getContext('2d'), w, h); return c; };

export function makeTextures(renderer) {
  const T = {};
  const tex = (c, o) => finish(c, renderer, o);
  // Arena mineral nacarada: ondas de viento y destellos de mica
  T.arena = tex(make(512, 512, (x, w, h) => {
    const r = rng(3); grain(x, w, h, r, '#c8ab9f', 16);
    blotches(x, r, 18, w, h, ['rgba(214,170,190,1)', 'rgba(180,150,140,1)', 'rgba(236,208,196,1)'], 0.35);
    x.strokeStyle = 'rgba(120,86,80,.18)'; x.lineWidth = 2;
    for (let i = 0; i < 26; i++) { const y0 = r() * h; x.beginPath(); for (let X = 0; X <= w; X += 16) x.lineTo(X, y0 + Math.sin(X / 40 + i) * 6); x.stroke(); }
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(255,${235 + r() * 20},${240 + r() * 15},${0.4 + r() * 0.6})`; x.fillRect(r() * w, r() * h, 1.5, 1.5); }
  }));
  // Roca estratificada oscura (paredes del cráter y laderas)
  T.roca = tex(make(512, 512, (x, w, h) => {
    const r = rng(5); grain(x, w, h, r, '#6e5e78', 18);
    for (let y = 0; y < h; y += 6 + r() * 18) { x.fillStyle = `rgba(${r() < 0.5 ? '30,24,36' : '120,96,110'},${0.12 + r() * 0.2})`; x.fillRect(0, y, w, 3 + r() * 8); }
    x.strokeStyle = 'rgba(16,12,20,.55)'; x.lineWidth = 2;
    for (let i = 0; i < 18; i++) { let X = r() * w, Y = r() * h; x.beginPath(); x.moveTo(X, Y); for (let k = 0; k < 5; k++) { X += (r() - 0.5) * 50; Y += r() * 40; x.lineTo(X, Y); } x.stroke(); }
  }));
  // Jardín: tierra con piedritas de colores (las que come Tilo)
  T.jardin = tex(make(512, 512, (x, w, h) => {
    const r = rng(7); grain(x, w, h, r, '#8c6f62', 18);
    blotches(x, r, 14, w, h, ['rgba(110,140,100,1)', 'rgba(160,120,96,1)'], 0.3);
    const cols = ['#e8a25a', '#7fc0e8', '#e86a8a', '#9ad86a', '#f2d070', '#b08ae8'];
    for (let i = 0; i < 140; i++) { x.fillStyle = cols[Math.floor(r() * cols.length)]; x.beginPath(); x.ellipse(r() * w, r() * h, 2 + r() * 5, 2 + r() * 4, r() * 3, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(r() * w, r() * h, 1, 1); }
  }));
  // Piedra de las ruinas: sillares claros con glifos (mapa de emisión aparte)
  {
    const r = rng(9), c = canvas(512, 512), x = c.getContext('2d'), e = canvas(512, 512), ex = e.getContext('2d');
    grain(x, 512, 512, r, '#d7cbc4', 12); ex.fillStyle = '#000'; ex.fillRect(0, 0, 512, 512);
    blotches(x, r, 10, 512, 512, ['rgba(190,170,190,1)', 'rgba(230,214,200,1)'], 0.35);
    x.strokeStyle = 'rgba(90,76,90,.45)'; x.lineWidth = 3;
    for (let j = 0; j < 4; j++) { x.beginPath(); x.moveTo(0, j * 128); x.lineTo(512, j * 128); x.stroke(); for (let i = 0; i < 3; i++) { const X = (i * 170 + (j % 2) * 85) % 512; x.beginPath(); x.moveTo(X, j * 128); x.lineTo(X, j * 128 + 128); x.stroke(); } }
    ex.strokeStyle = '#7fe6ff'; ex.lineWidth = 3; x.strokeStyle = 'rgba(70,90,110,.6)'; x.lineWidth = 3;
    for (let i = 0; i < 7; i++) {
      const gx = 30 + r() * 440, gy = 20 + Math.floor(r() * 4) * 128 + 30;
      for (const ctx of [x, ex]) { ctx.beginPath(); ctx.arc(gx, gy, 12, 0, Math.PI * (1 + r())); ctx.moveTo(gx - 16, gy + 22); ctx.lineTo(gx + 16, gy + 22); ctx.moveTo(gx, gy - 4); ctx.lineTo(gx, gy + 30); ctx.stroke(); }
    }
    T.ruina = finish(c, renderer); T.ruinaLuz = finish(e, renderer);
  }
  // Santuario: piedra pulida oscura con anillos de luz
  {
    const r = rng(11), c = canvas(512, 512), x = c.getContext('2d'), e = canvas(512, 512), ex = e.getContext('2d');
    grain(x, 512, 512, r, '#3e3c5e', 10); ex.fillStyle = '#000'; ex.fillRect(0, 0, 512, 512);
    blotches(x, r, 12, 512, 512, ['rgba(110,100,170,1)', 'rgba(40,36,70,1)'], 0.4);
    for (const ctx of [x, ex]) { ctx.strokeStyle = ctx === x ? 'rgba(200,190,255,.35)' : '#9a8cff'; ctx.lineWidth = 3; for (const rad of [70, 120, 170, 230]) { ctx.beginPath(); ctx.arc(256, 256, rad, 0, Math.PI * 2); ctx.stroke(); } }
    T.santuario = finish(c, renderer); T.santuarioLuz = finish(e, renderer);
  }
  // Estación: paneles metálicos con juntas, remaches y franjas de luz
  {
    const r = rng(13), c = canvas(512, 512), x = c.getContext('2d'), e = canvas(512, 512), ex = e.getContext('2d');
    grain(x, 512, 512, r, '#7d8698', 10); ex.fillStyle = '#000'; ex.fillRect(0, 0, 512, 512);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const X = i * 128, Y = j * 128; x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.04 + r() * 0.06})`; x.fillRect(X + 3, Y + 3, 122, 122);
      x.strokeStyle = 'rgba(30,34,46,.7)'; x.lineWidth = 3; x.strokeRect(X + 2, Y + 2, 124, 124);
      x.fillStyle = 'rgba(40,44,58,.8)'; for (const [a, b] of [[10, 10], [118, 10], [10, 118], [118, 118]]) { x.beginPath(); x.arc(X + a, Y + b, 3, 0, 7); x.fill(); }
    }
    for (let i = 0; i < 4; i++) { const Y = i * 128 + 62; x.fillStyle = '#2a3242'; x.fillRect(0, Y, 512, 4); ex.fillStyle = '#5ae0ff'; ex.globalAlpha = 0.9; if (r() < 0.6) ex.fillRect(0, Y, 512, 4); ex.globalAlpha = 1; }
    T.estacion = finish(c, renderer); T.estacionLuz = finish(e, renderer);
  }
  // Placa frágil agrietada
  T.placa = tex(make(256, 256, (x, w, h) => {
    const r = rng(17); grain(x, w, h, r, '#b8a0a8', 14);
    x.strokeStyle = 'rgba(40,24,36,.75)'; x.lineWidth = 2.5;
    for (let i = 0; i < 9; i++) { let X = 128, Y = 128; x.beginPath(); x.moveTo(X, Y); const a = r() * 7; for (let k = 0; k < 4; k++) { X += Math.cos(a + (r() - 0.5)) * 34; Y += Math.sin(a + (r() - 0.5)) * 34; x.lineTo(X, Y); } x.stroke(); }
  }));
  // Metal liso (torres, rejas, maquinaria)
  T.metal = tex(make(256, 256, (x, w, h) => {
    const r = rng(19); grain(x, w, h, r, '#8892a4', 12);
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${r() * 0.06})`; x.fillRect(0, r() * h, w, 1); }
  }));

  // Cajas al estilo clásico: madera con cantoneras metálicas (una por tipo, se reconocen al instante)
  const crateTex = (draw) => finish(make(256, 256, draw), renderer, { repeat: false });
  const wood = (x, base = '#c27a3a', dark = '#7a4318') => {
    const r = rng(23); grain(x, 256, 256, r, base, 22);
    for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, i * 64 + 62, 256, 3); }
    x.strokeStyle = 'rgba(90,50,20,.35)'; x.lineWidth = 1.2;
    for (let i = 0; i < 26; i++) { const y = r() * 256; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(80, y + (r() - 0.5) * 10, 170, y + (r() - 0.5) * 10, 256, y); x.stroke(); }
    x.strokeStyle = dark; x.lineWidth = 20; x.strokeRect(10, 10, 236, 236);
    x.lineWidth = 16; x.beginPath(); x.moveTo(24, 24); x.lineTo(232, 232); x.moveTo(232, 24); x.lineTo(24, 232); x.stroke();
    x.fillStyle = '#c9ccd6'; for (const [a, b] of [[0, 0], [212, 0], [0, 212], [212, 212]]) { x.fillRect(a, b, 44, 44); x.fillStyle = '#7d8292'; x.fillRect(a + 18, b + 18, 8, 8); x.fillStyle = '#c9ccd6'; }
  };
  const badge = (x, fill, draw) => { x.fillStyle = fill; x.beginPath(); x.arc(128, 128, 58, 0, 7); x.fill(); x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 6; x.stroke(); draw(); };
  T.caja = {
    normal: crateTex(x => wood(x)),
    rebote: crateTex(x => { wood(x, '#c98a46'); badge(x, '#3fbf86', () => { x.fillStyle = '#f2fff8'; for (const y of [150, 108]) { x.beginPath(); x.moveTo(128, y - 40); x.lineTo(172, y + 6); x.lineTo(84, y + 6); x.fill(); } }); }),
    fragmentos: crateTex(x => { wood(x, '#d4a24a', '#7a5212'); badge(x, '#fff1c4', () => { x.fillStyle = '#9a5a10'; x.font = 'bold 92px Georgia, serif'; x.textAlign = 'center'; x.fillText('?', 128, 160); }); }),
    checkpoint: crateTex(x => { wood(x, '#d9d6e2', '#6b6f82'); badge(x, '#2bb37a', () => { x.fillStyle = '#fff'; x.font = 'bold 96px Georgia, serif'; x.textAlign = 'center'; x.fillText('C', 128, 162); }); }),
    tnt: crateTex(x => { const r = rng(29); grain(x, 256, 256, r, '#d8482a', 16); x.strokeStyle = '#4a1408'; x.lineWidth = 18; x.strokeRect(9, 9, 238, 238); x.fillStyle = '#ffe9b8'; x.fillRect(30, 92, 196, 72); x.fillStyle = '#7a1a0a'; x.font = 'bold 66px Impact, Arial Black, sans-serif'; x.textAlign = 'center'; x.fillText('TNT', 128, 152); }),
    cristal: crateTex(x => { x.fillStyle = 'rgba(200,236,255,.55)'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#effbff'; x.lineWidth = 12; x.strokeRect(6, 6, 244, 244); x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 4; x.beginPath(); x.moveTo(40, 60); x.lineTo(120, 30); x.moveTo(60, 200); x.lineTo(200, 120); x.stroke(); })
  };
  T.tntNum = [1, 2, 3].map(n => crateTex(x => { const r = rng(31); grain(x, 256, 256, r, n === 1 ? '#ff6a3a' : '#d8482a', 14); x.strokeStyle = '#4a1408'; x.lineWidth = 18; x.strokeRect(9, 9, 238, 238); x.fillStyle = '#fff'; x.font = 'bold 150px Impact, Arial Black, sans-serif'; x.textAlign = 'center'; x.fillText(String(n), 128, 186); }));
  // Brillo suave y punto para partículas
  T.glow = finish(make(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }), renderer, { repeat: false });
  T.dot = finish(make(32, 32, (x) => { const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); }), renderer, { repeat: false });
  // Tablilla de registro con glifos
  T.registro = finish(make(128, 160, (x) => {
    const g = x.createLinearGradient(0, 0, 0, 160); g.addColorStop(0, '#2a2f52'); g.addColorStop(1, '#151834'); x.fillStyle = g; x.fillRect(0, 0, 128, 160);
    x.strokeStyle = '#9fe8ff'; x.lineWidth = 5; x.strokeRect(4, 4, 120, 152);
    x.fillStyle = '#bff2ff'; for (let i = 0; i < 8; i++) x.fillRect(18, 24 + i * 15, 40 + (i * 29) % 52, 5);
    x.beginPath(); x.arc(96, 128, 12, 0, 7); x.strokeStyle = '#ffd6f0'; x.lineWidth = 3; x.stroke();
  }), renderer, { repeat: false });
  // Letreros de las puertas (dicen lo contrario de lo que hacen)
  const cartel = (txt, col) => finish(make(256, 96, (x) => { x.fillStyle = '#10141e'; x.fillRect(0, 0, 256, 96); x.strokeStyle = col; x.lineWidth = 5; x.strokeRect(5, 5, 246, 86); x.fillStyle = col; x.font = 'bold 40px Arial Black, Arial, sans-serif'; x.textAlign = 'center'; x.fillText(txt, 128, 62); }), renderer, { repeat: false });
  T.cartelAbierto = cartel('ABIERTO', '#6affb8'); T.cartelCerrado = cartel('CERRADO', '#ff6a6a');
  // Pantalla de la cápsula y tablero de llegadas de la estación
  T.pantalla = finish(make(256, 160, (x) => {
    x.fillStyle = '#071a22'; x.fillRect(0, 0, 256, 160); x.fillStyle = '#5ae0ff'; x.font = 'bold 22px monospace';
    x.fillText('PASAJERO: DIP', 16, 40); x.fillText('DESTINO: ???', 16, 76); x.fillStyle = '#ff8a8a'; x.fillText('DAÑOS: SÍ', 16, 112);
    x.fillStyle = 'rgba(90,224,255,.15)'; for (let y = 0; y < 160; y += 4) x.fillRect(0, y, 256, 1);
  }), renderer, { repeat: false });
  T.llegadas = finish(make(512, 256, (x) => {
    x.fillStyle = '#0a0f18'; x.fillRect(0, 0, 512, 256); x.fillStyle = '#ffd36a'; x.font = 'bold 34px monospace'; x.fillText('LLEGADAS', 24, 50);
    x.font = 'bold 26px monospace';
    const rows = [['DIP', 'PRESENTE', '#6affb8'], ['DIP', 'EN CAMINO', '#ffd36a'], ['DIP', 'ANTES DEL VIAJE', '#ff8ac0']];
    rows.forEach(([a, b, c], i) => { x.fillStyle = '#e6ecff'; x.fillText(a, 24, 104 + i * 50); x.fillStyle = c; x.fillText(b, 160, 104 + i * 50); });
    x.fillStyle = 'rgba(255,255,255,.05)'; for (let y = 0; y < 256; y += 4) x.fillRect(0, y, 512, 1);
  }), renderer, { repeat: false });
  // Rayas del escarabajo ladrón
  T.rayas = tex(make(64, 64, (x) => { x.fillStyle = '#f2c84a'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#2a2230'; for (let i = 0; i < 64; i += 16) x.fillRect(i, 0, 8, 64); }));
  // Rejilla de la reconfiguración (pared de la huida)
  T.rejilla = tex(make(256, 256, (x) => { x.fillStyle = 'rgba(0,0,0,0)'; x.clearRect(0, 0, 256, 256); x.strokeStyle = '#ffffff'; x.lineWidth = 3; for (let i = 0; i <= 256; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); } }));
  // Signos de estado sobre los centinelas
  const signo = (txt, col) => finish(make(64, 64, (x) => { x.fillStyle = col; x.font = 'bold 54px Arial Black, Arial, sans-serif'; x.textAlign = 'center'; x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.6)'; x.strokeText(txt, 32, 52); x.fillText(txt, 32, 52); }), renderer, { repeat: false });
  T.alerta = signo('!', '#ff5a4a'); T.zzz = signo('z', '#bfe8ff'); T.duda = signo('?', '#ffd36a');
  return T;
}

// UV en coordenadas de mundo: la textura queda continua y a escala real en cualquier bloque.
export function worldUV(geo, ox, oy, oz, scale = 1 / 4) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + ox, y = p.getY(i) + oy, z = p.getZ(i) + oz;
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, x * scale, z * scale);
    else if (az >= ax) uv.setXY(i, x * scale, y * scale);
    else uv.setXY(i, z * scale, y * scale);
  }
  uv.needsUpdate = true;
  return geo;
}
