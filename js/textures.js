// textures.js — Texturas procedurales en alta definición (se generan una vez en la precarga del mundo).
import * as THREE from 'three';

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function finish(c, renderer, { color = true, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return t;
}

// Grano fino + manchas suaves (base de todos los materiales minerales)
function grain(x, w, h, r, base, amount, blobs) {
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  for (let i = 0; i < blobs; i++) {
    const cx = r() * w, cy = r() * h, rad = 20 + r() * 90;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    const v = r() > 0.5 ? 255 : 0;
    g.addColorStop(0, `rgba(${v},${v},${v},${0.03 + r() * 0.04})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  const img = x.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * amount; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  x.putImageData(img, 0, 0);
}
function cracks(x, w, h, r, n, color, width) {
  x.strokeStyle = color; x.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    let px = r() * w, py = r() * h, a = r() * Math.PI * 2;
    x.lineWidth = width * (0.5 + r()); x.beginPath(); x.moveTo(px, py);
    const steps = 6 + r() * 14;
    for (let k = 0; k < steps; k++) { a += (r() - 0.5) * 1.1; px += Math.cos(a) * 9; py += Math.sin(a) * 9; x.lineTo(px, py); }
    x.stroke();
  }
}

export function makeTextures(renderer) {
  const T = {};
  // Costra blanca: mineral con grietas finas
  {
    const r = rng(7), c = canvas(512, 512), x = c.getContext('2d');
    grain(x, 512, 512, r, '#efe9dd', 14, 60);
    cracks(x, 512, 512, r, 26, 'rgba(120,108,92,.35)', 1.1);
    for (let i = 0; i < 140; i++) { x.fillStyle = `rgba(150,138,120,${0.15 + r() * 0.25})`; x.beginPath(); x.arc(r() * 512, r() * 512, 0.8 + r() * 2.2, 0, 7); x.fill(); }
    T.costra = finish(c, renderer);
    const b = canvas(512, 512), bx = b.getContext('2d'); bx.drawImage(c, 0, 0);
    bx.globalCompositeOperation = 'saturation'; bx.fillStyle = '#000'; bx.fillRect(0, 0, 512, 512);
    T.costraBump = finish(b, renderer, { color: false });
  }
  // Roca
  {
    const r = rng(11), c = canvas(512, 512), x = c.getContext('2d');
    grain(x, 512, 512, r, '#c9c0ad', 26, 90);
    cracks(x, 512, 512, r, 18, 'rgba(80,72,60,.35)', 1.6);
    T.roca = finish(c, renderer);
  }
  // Piedra de las ruinas: sillares lisos con juntas
  {
    const r = rng(23), c = canvas(512, 512), x = c.getContext('2d');
    grain(x, 512, 512, r, '#e4dccd', 10, 40);
    x.strokeStyle = 'rgba(110,100,86,.45)'; x.lineWidth = 2;
    for (let row = 0; row < 4; row++) {
      const y = row * 128 + 0.5; x.beginPath(); x.moveTo(0, y); x.lineTo(512, y); x.stroke();
      const off = row % 2 ? 0 : 96;
      for (let k = 0; k < 3; k++) { const xx = off + k * 192; x.beginPath(); x.moveTo(xx, y); x.lineTo(xx, y + 128); x.stroke(); }
    }
    x.fillStyle = 'rgba(40,44,56,.55)'; x.fillRect(0, 250, 512, 6);
    T.piedra = finish(c, renderer);
  }
  // Paneles de metal (estación)
  {
    const r = rng(31), c = canvas(512, 512), x = c.getContext('2d');
    grain(x, 512, 512, r, '#3a404c', 8, 20);
    x.strokeStyle = 'rgba(10,12,16,.8)'; x.lineWidth = 3;
    for (let i = 0; i <= 512; i += 128) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(512, i); x.stroke(); }
    x.fillStyle = 'rgba(180,190,205,.35)';
    for (let i = 0; i < 512; i += 128) for (let j = 0; j < 512; j += 128) for (const [dx, dy] of [[8, 8], [120, 8], [8, 120], [120, 120]]) { x.beginPath(); x.arc(i + dx, j + dy, 2.5, 0, 7); x.fill(); }
    T.metal = finish(c, renderer);
    const e = canvas(512, 512), ex = e.getContext('2d'); ex.fillStyle = '#000'; ex.fillRect(0, 0, 512, 512);
    ex.fillStyle = '#6fbfe6'; for (let j = 0; j < 512; j += 128) ex.fillRect(20, j + 60, 88, 3);
    T.metalLuz = finish(e, renderer);
  }
  // Piedra negra con glifos (santuario)
  {
    const r = rng(41), c = canvas(512, 512), x = c.getContext('2d');
    grain(x, 512, 512, r, '#15171d', 10, 40);
    T.santuario = finish(c, renderer);
    const e = canvas(512, 512), ex = e.getContext('2d'); ex.fillStyle = '#000'; ex.fillRect(0, 0, 512, 512);
    ex.strokeStyle = '#3d8fb0'; ex.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
      let px = Math.round(r() * 16) * 32, py = Math.round(r() * 16) * 32; ex.beginPath(); ex.moveTo(px, py);
      for (let k = 0; k < 4; k++) { if (r() > 0.5) px += (r() > 0.5 ? 32 : -32); else py += (r() > 0.5 ? 32 : -32); ex.lineTo(px, py); }
      ex.stroke();
    }
    T.santuarioLuz = finish(e, renderer);
  }
  // Brillo suave (halos de cristales, partículas)
  {
    const c = canvas(128, 128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    T.glow = finish(c, renderer, { repeat: false });
    const p = canvas(32, 32), px = p.getContext('2d'), pg = px.createRadialGradient(16, 16, 0, 16, 16, 16);
    pg.addColorStop(0, 'rgba(255,255,255,1)'); pg.addColorStop(0.5, 'rgba(255,255,255,.8)'); pg.addColorStop(1, 'rgba(255,255,255,0)');
    px.fillStyle = pg; px.fillRect(0, 0, 32, 32);
    T.dot = finish(p, renderer, { repeat: false });
  }
  // Huella
  {
    const c = canvas(64, 128), x = c.getContext('2d');
    x.filter = 'blur(1.5px)'; x.fillStyle = 'rgba(96,88,76,.75)';
    x.beginPath(); x.ellipse(32, 78, 18, 40, 0, 0, 7); x.fill();
    x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.ellipse(32, 66, 6, 14, 0, 0, 7); x.fill();
    T.huella = finish(c, renderer, { repeat: false });
  }
  // Anillos planetarios: bandas de partículas con huecos
  {
    const r = rng(53), S = 1024, c = canvas(S, S), x = c.getContext('2d'), cx = S / 2;
    const bands = [[0.62, 0.70, [226, 219, 205]], [0.74, 0.83, [214, 222, 226]], [0.88, 0.92, [160, 214, 234]]];
    for (const [a, b, col] of bands) {
      for (let i = 0; i < 9000; i++) {
        const rad = (a + (b - a) * r()) * cx, ang = r() * Math.PI * 2;
        const al = 0.25 + r() * 0.6 * (0.6 + 0.4 * Math.cos(ang));
        x.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${al})`;
        x.fillRect(cx + Math.cos(ang) * rad, cx + Math.sin(ang) * rad, 1.5 + r() * 1.5, 1.5 + r() * 1.5);
      }
    }
    T.anillos = finish(c, renderer, { repeat: false });
  }
  // Banda de neblina
  {
    const c = canvas(256, 64), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 64);
    const g2 = x.createLinearGradient(0, 0, 256, 0); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(0.2, 'rgba(0,0,0,0)'); g2.addColorStop(0.8, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = g2; x.fillRect(0, 0, 256, 64);
    T.neblina = finish(c, renderer, { repeat: false });
  }
  return T;
}

// UV en coordenadas de mundo: la textura queda continua y a escala real en cualquier bloque.
export function worldUV(geo, ox, oy, oz, scale = 1 / 256) {
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
