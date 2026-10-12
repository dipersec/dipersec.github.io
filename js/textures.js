// textures.js — Texturas procedurales HD del Sector Demolición (se generan una vez al cargar).
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

export function makeTextures(renderer) {
  const T = {};
  // Asfalto nocturno con línea discontinua
  {
    const r = rng(3), c = canvas(512, 512), x = c.getContext('2d');
    grain(x, 512, 512, r, '#2a2f3d', 22);
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.1})`; x.beginPath(); x.ellipse(r() * 512, r() * 512, 10 + r() * 50, 6 + r() * 20, r() * 3, 0, 7); x.fill(); }
    x.fillStyle = 'rgba(240,210,120,.75)'; for (let y = 0; y < 512; y += 128) x.fillRect(250, y + 20, 12, 70);
    T.asfalto = finish(c, renderer);
  }
  // Losas de acera / azotea
  {
    const r = rng(5), c = canvas(512, 512), x = c.getContext('2d');
    grain(x, 512, 512, r, '#5d6474', 18);
    x.strokeStyle = 'rgba(20,24,34,.6)'; x.lineWidth = 3;
    for (let i = 0; i <= 512; i += 128) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(512, i); x.stroke(); }
    for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(20,24,34,${0.1 + r() * 0.15})`; x.fillRect(r() * 512, r() * 512, 2 + r() * 30, 2 + r() * 4); }
    T.losa = finish(c, renderer);
  }
  // Fachada de oficinas con ventanas (algunas encendidas con luz cálida) + mapa de emisión
  {
    const r = rng(9), c = canvas(512, 512), x = c.getContext('2d');
    const e = canvas(512, 512), ex = e.getContext('2d');
    grain(x, 512, 512, r, '#323a4f', 12);
    ex.fillStyle = '#000'; ex.fillRect(0, 0, 512, 512);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      const wx = i * 64 + 10, wy = j * 64 + 12;
      x.fillStyle = '#141824'; x.fillRect(wx, wy, 44, 38);
      x.fillStyle = 'rgba(120,140,180,.18)'; x.fillRect(wx + 2, wy + 2, 18, 34);
      const lit = r();
      if (lit > 0.62) { const warm = lit > 0.8; ex.fillStyle = warm ? '#ffbf6a' : '#7fb8ff'; ex.globalAlpha = 0.55 + r() * 0.45; ex.fillRect(wx, wy, 44, 38); ex.globalAlpha = 1; }
    }
    T.fachada = finish(c, renderer); T.fachadaLuz = finish(e, renderer);
  }
  // Metal (escaleras de incendio, rejillas)
  {
    const r = rng(13), c = canvas(256, 256), x = c.getContext('2d');
    grain(x, 256, 256, r, '#4a5466', 14);
    x.strokeStyle = 'rgba(10,12,18,.8)'; x.lineWidth = 2;
    for (let i = 0; i < 256; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); }
    T.metal = finish(c, renderer);
  }
  // Baldosas de oficina (arena del jefe)
  {
    const r = rng(17), c = canvas(512, 512), x = c.getContext('2d');
    grain(x, 512, 512, r, '#c9ccd6', 8);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if ((i + j) % 2) { x.fillStyle = 'rgba(150,156,175,.35)'; x.fillRect(i * 128, j * 128, 128, 128); }
    x.strokeStyle = 'rgba(80,86,104,.5)'; x.lineWidth = 2;
    for (let i = 0; i <= 512; i += 128) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(512, i); x.stroke(); }
    T.oficina = finish(c, renderer);
  }
  // Cajas: paquetes de datos (una cara por tipo)
  const crateTex = (draw) => { const c = canvas(256, 256), x = c.getContext('2d'); draw(x); return finish(c, renderer, { repeat: false }); };
  const frame = (x, base, edge) => {
    x.fillStyle = base; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = edge; x.lineWidth = 18; x.strokeRect(9, 9, 238, 238);
    x.lineWidth = 6; x.strokeStyle = 'rgba(255,255,255,.25)'; x.strokeRect(26, 26, 204, 204);
  };
  T.caja = {
    normal: crateTex(x => { frame(x, '#2f6fb0', '#1b3e66'); x.fillStyle = '#bfe3ff'; x.font = 'bold 54px monospace'; x.textAlign = 'center'; x.fillText('0101', 128, 112); x.fillText('1010', 128, 168); }),
    rebote: crateTex(x => { frame(x, '#2f9a7a', '#1a5a47'); x.fillStyle = '#d9fff2'; for (const y of [150, 90]) { x.beginPath(); x.moveTo(128, y - 50); x.lineTo(188, y + 10); x.lineTo(68, y + 10); x.fill(); } }),
    fragmentos: crateTex(x => { frame(x, '#c08a2a', '#6e4b12'); x.fillStyle = '#fff2c4'; x.beginPath(); x.moveTo(128, 50); x.lineTo(178, 128); x.lineTo(128, 206); x.lineTo(78, 128); x.fill(); x.fillStyle = '#6e4b12'; x.font = 'bold 40px monospace'; x.textAlign = 'center'; x.fillText('?', 128, 142); }),
    checkpoint: crateTex(x => { frame(x, '#d9dde8', '#7a8296'); x.fillStyle = '#2bb37a'; x.font = 'bold 120px monospace'; x.textAlign = 'center'; x.fillText('C', 128, 170); }),
    tnt: crateTex(x => { frame(x, '#c0392b', '#5e1a14'); x.fillStyle = '#ffe1c4'; x.font = 'bold 64px monospace'; x.textAlign = 'center'; x.fillText('TNT', 128, 120); x.font = 'bold 26px monospace'; x.fillText('DIGITAL', 128, 168); }),
    cristal: crateTex(x => { x.fillStyle = 'rgba(160,230,255,.55)'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#e8fbff'; x.lineWidth = 12; x.strokeRect(6, 6, 244, 244); x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 4; x.beginPath(); x.moveTo(40, 60); x.lineTo(120, 30); x.moveTo(60, 200); x.lineTo(200, 120); x.stroke(); })
  };
  T.tntNum = [1, 2, 3].map(n => crateTex(x => { frame(x, n === 1 ? '#ff5a3a' : '#c0392b', '#5e1a14'); x.fillStyle = '#fff'; x.font = 'bold 150px monospace'; x.textAlign = 'center'; x.fillText(String(n), 128, 182); }));
  // Brillo suave y punto para partículas
  {
    const c = canvas(128, 128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); T.glow = finish(c, renderer, { repeat: false });
    const p = canvas(32, 32), px = p.getContext('2d'), pg = px.createRadialGradient(16, 16, 0, 16, 16, 16);
    pg.addColorStop(0, 'rgba(255,255,255,1)'); pg.addColorStop(0.5, 'rgba(255,255,255,.8)'); pg.addColorStop(1, 'rgba(255,255,255,0)');
    px.fillStyle = pg; px.fillRect(0, 0, 32, 32); T.dot = finish(p, renderer, { repeat: false });
    const b = canvas(64, 64), bx = b.getContext('2d');
    bx.strokeStyle = 'rgba(255,255,255,.9)'; bx.lineWidth = 3; bx.beginPath(); bx.arc(32, 32, 26, 0, 7); bx.stroke();
    bx.fillStyle = 'rgba(255,255,255,.5)'; bx.beginPath(); bx.arc(22, 22, 6, 0, 7); bx.fill(); T.burbuja = finish(b, renderer, { repeat: false });
  }
  // Cara de la Copia de Seguridad (cansada)
  {
    const c = canvas(128, 128), x = c.getContext('2d');
    x.fillStyle = 'rgba(170,230,255,.35)'; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = '#e9fbff'; x.lineWidth = 6; x.strokeRect(4, 4, 120, 120);
    x.fillStyle = '#1c3550';
    x.fillRect(32, 50, 20, 8); x.fillRect(76, 50, 20, 8);            // párpados caídos
    x.fillRect(36, 58, 12, 10); x.fillRect(80, 58, 12, 10);
    x.fillRect(46, 92, 36, 6);                                      // boca resignada
    T.copia = finish(c, renderer, { repeat: false });
  }
  // Página de la Guía y portada del libro
  {
    const c = canvas(128, 160), x = c.getContext('2d');
    x.fillStyle = '#e9f6ff'; x.fillRect(0, 0, 128, 160);
    x.fillStyle = '#5ab0e8'; for (let i = 0; i < 9; i++) x.fillRect(14, 22 + i * 14, 60 + (i * 37) % 40, 5);
    x.strokeStyle = '#2b7fbf'; x.lineWidth = 6; x.strokeRect(3, 3, 122, 154);
    T.pagina = finish(c, renderer, { repeat: false });
    const g = canvas(128, 160), gx = g.getContext('2d');
    gx.fillStyle = '#123a5c'; gx.fillRect(0, 0, 128, 160);
    gx.fillStyle = '#7fd0ff'; gx.font = 'bold 22px monospace'; gx.textAlign = 'center'; gx.fillText('LA', 64, 56); gx.fillText('GUÍA', 64, 84);
    gx.strokeStyle = 'rgba(255,255,255,.4)'; gx.beginPath(); gx.moveTo(10, 130); gx.lineTo(118, 100); gx.stroke();
    T.guia = finish(g, renderer, { repeat: false });
    const a = canvas(256, 128), ax = a.getContext('2d');
    ax.fillStyle = '#fffdf2'; ax.fillRect(0, 0, 256, 128); ax.strokeStyle = '#c0392b'; ax.lineWidth = 6; ax.strokeRect(6, 6, 244, 116);
    ax.fillStyle = '#c0392b'; ax.font = 'bold 26px monospace'; ax.textAlign = 'center'; ax.fillText('AVISO', 128, 48);
    ax.fillStyle = '#333'; ax.font = '16px monospace'; ax.fillText('FORMATEO EN 5 MIN', 128, 82);
    T.aviso = finish(a, renderer, { repeat: false });
  }
  return T;
}

// Salvapantallas animados para las pantallas del barrio (peces, tuberías, logo que rebota)
export function makeScreens(renderer) {
  const make = (draw) => {
    const c = canvas(128, 80), x = c.getContext('2d'), t = finish(c, renderer, { repeat: false });
    const s = { x, t, draw, state: {} }; draw(x, 0, s.state, true); t.needsUpdate = true; return s;
  };
  const peces = make((x, time, st) => {
    x.fillStyle = '#062a4a'; x.fillRect(0, 0, 128, 80);
    for (let i = 0; i < 5; i++) {
      const px = ((time * (18 + i * 7) + i * 40) % 160) - 16, py = 14 + i * 13 + Math.sin(time * 2 + i) * 3;
      x.fillStyle = ['#ff9f43', '#feca57', '#54a0ff', '#ff6b6b', '#1dd1a1'][i];
      x.beginPath(); x.ellipse(px, py, 8, 4, 0, 0, 7); x.fill();
      x.beginPath(); x.moveTo(px - 7, py); x.lineTo(px - 13, py - 4); x.lineTo(px - 13, py + 4); x.fill();
    }
    x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(((time * 10) % 128), 74 - ((time * 20) % 70), 2, 2);
  });
  const tuberias = make((x, time, st, init) => {
    if (init || !st.p || st.n > 260) { x.fillStyle = '#05060a'; x.fillRect(0, 0, 128, 80); st.p = { x: 64, y: 40, d: 0, c: '#1dd1a1' }; st.n = 0; }
    const p = st.p, dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    for (let k = 0; k < 2; k++) {
      if (Math.random() < 0.08) p.d = (p.d + (Math.random() < 0.5 ? 1 : 3)) % 4;
      p.x += dirs[p.d][0] * 2; p.y += dirs[p.d][1] * 2;
      if (p.x < 2 || p.x > 126 || p.y < 2 || p.y > 78) { p.x = Math.random() * 120 + 4; p.y = Math.random() * 72 + 4; p.c = ['#1dd1a1', '#feca57', '#54a0ff', '#ff6b6b'][Math.floor(Math.random() * 4)]; }
      x.fillStyle = p.c; x.fillRect(p.x - 2, p.y - 2, 5, 5); st.n++;
    }
  });
  const logo = make((x, time, st, init) => {
    if (init) { st.x = 20; st.y = 20; st.vx = 26; st.vy = 18; st.c = 0; }
    st.x += st.vx * 0.1; st.y += st.vy * 0.1;
    if (st.x < 2 || st.x > 92) { st.vx *= -1; st.c++; } if (st.y < 2 || st.y > 64) { st.vy *= -1; st.c++; }
    x.fillStyle = '#000'; x.fillRect(0, 0, 128, 80);
    x.fillStyle = ['#ff6b6b', '#feca57', '#1dd1a1', '#54a0ff', '#c56cf0'][st.c % 5];
    x.font = 'bold 18px monospace'; x.fillText('DIP', st.x, st.y + 14); x.fillRect(st.x, st.y + 17, 34, 3);
  });
  return [peces, tuberias, logo];
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
