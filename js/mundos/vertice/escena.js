// escena.js — Lo que se ve solo en Vértice: océano celeste abajo, islas flotantes, nubes, cascadas que suben,
// ciudad blanca de cúpulas doradas, la cámara de las leyes, la torre central, el Arquitecto, los nodos y Lunex.
// Lo estático se fusiona por material: pocas draw calls aunque haya cientos de piezas.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { texCanvas, worldUV } from '../../textures.js';
import { YB } from './nivel.js';

export class EscenaVertice {
  constructor(w) {
    this.w = w; this.g = w.g;
    this.ENV = {
      titulo: { bg: 0xcfeeff, fog: 0xcfeeff, near: 40, far: 220, hs: 0xe8f6ff, hg: 0x6a8aa8, hi: 1.15, sun: 0xfff2dc, si: 2.6, top: 0x2f6ad8, hor: 0xd8f4ff, band: 0.35, stars: 0 },
      islas: { bg: 0xcfeeff, fog: 0xcfeeff, near: 40, far: 220, hs: 0xe8f6ff, hg: 0x6a8aa8, hi: 1.15, sun: 0xfff2dc, si: 2.6, top: 0x2f6ad8, hor: 0xd8f4ff, band: 0.35, stars: 0 },
      cascadas: { bg: 0xc4f0f4, fog: 0xc4f0f4, near: 36, far: 200, hs: 0xe0fff8, hg: 0x5a8a8a, hi: 1.15, sun: 0xfff4e0, si: 2.5, top: 0x2a78c8, hor: 0xd0f8f4, band: 0.4, stars: 0 },
      ciudad: { bg: 0xf6e6d0, fog: 0xf6e6d0, near: 36, far: 200, hs: 0xfff4e8, hg: 0x8a7a6a, hi: 1.15, sun: 0xffe2b8, si: 2.7, top: 0x3a6ac8, hor: 0xfbe8d0, band: 0.45, stars: 0 },
      leyes: { bg: 0x2a3a78, fog: 0x2a3a78, near: 26, far: 140, hs: 0xa8b8ff, hg: 0x1a2040, hi: 1.0, sun: 0xd8e0ff, si: 1.8, top: 0x0c1438, hor: 0x5a6ac8, band: 0.9, stars: 0.6 },
      jefe: { bg: 0x9ab8f0, fog: 0x9ab8f0, near: 30, far: 160, hs: 0xe0e8ff, hg: 0x4a5a80, hi: 1.15, sun: 0xfff0dc, si: 2.4, top: 0x1a3a9a, hor: 0xb8d4ff, band: 0.7, stars: 0.2 },
      oceano: { bg: 0xb8e8ff, fog: 0xb8e8ff, near: 34, far: 200, hs: 0xe8f8ff, hg: 0x4a7aa8, hi: 1.15, sun: 0xfff0e0, si: 2.4, top: 0x1f5ab8, hor: 0xc8eeff, band: 0.6, stars: 0.1 },
      final: { bg: 0xffe6d8, fog: 0xffe6d8, near: 40, far: 240, hs: 0xfff4ec, hg: 0x7a7aa0, hi: 1.2, sun: 0xffe0c0, si: 2.6, top: 0x3a4ab8, hor: 0xffe2d4, band: 0.9, stars: 0.2 },
      fin: { bg: 0xeaf6ff, fog: 0xeaf6ff, near: 10, far: 80, hs: 0xffffff, hg: 0x8090a0, hi: 1, sun: 0xffffff, si: 1.5, top: 0xd8ecff, hor: 0xffffff, band: 0.3, stars: 0 }
    };
  }
  envName() {
    const g = this.g;
    if (g.mode === 'titulo') return 'titulo';
    if (g.mode === 'fin') return 'fin';
    if (g.boss.active) return 'jefe';
    if (g.player.pos.z < -426) return 'final';
    return ['islas', 'islas', 'cascadas', 'ciudad', 'leyes', 'jefe', 'oceano'][g.section.n] || 'islas';
  }
  speaker(who) {
    const g = this.g, p = g.player.pos;
    if (who === 'arquitecto') return { x: g.boss.x, y: g.boss.y + 2.4, z: g.boss.z };
    if (who === 'constructor') {
      let best = null, bd = 1e9;
      for (const b of g.L.bichos) if (b.constructor_ && b.alive) { const d = Math.hypot(b.x - p.x, b.z - p.z); if (d < bd) { bd = d; best = b; } }
      if (best && bd < 14) return { x: best.x, y: best.y + 1.6, z: best.z };
      return null;
    }
    return null;
  }

  // materiales de los sólidos propios de Vértice (los usa world.buildSolids)
  materiales() {
    const w = this.w, r = w.renderer;
    const pasto = texCanvas(r, 512, 512, (x, W, H, { rng, grain, blotches }) => {
      const R = rng(41); grain(x, W, H, R, '#6ec28a', 16);
      blotches(x, R, 18, W, H, ['rgba(120,220,170,1)', 'rgba(80,170,140,1)', 'rgba(170,230,160,1)'], 0.4);
      for (let i = 0; i < 900; i++) { x.strokeStyle = `rgba(${R() < 0.5 ? '40,120,80' : '200,255,210'},${0.25 + R() * 0.3})`; x.lineWidth = 1; const X = R() * W, Y = R() * H; x.beginPath(); x.moveTo(X, Y); x.lineTo(X + (R() - 0.5) * 3, Y - 4 - R() * 5); x.stroke(); }
      const flores = ['#fff6a8', '#ffffff', '#b8d8ff', '#ffb8e0'];
      for (let i = 0; i < 70; i++) { x.fillStyle = flores[Math.floor(R() * 4)]; x.beginPath(); x.arc(R() * W, R() * H, 2 + R() * 2, 0, 7); x.fill(); }
    });
    const piedra = texCanvas(r, 512, 512, (x, W, H, { rng, grain }) => {
      const R = rng(43); grain(x, W, H, R, '#b8b0c8', 14);
      for (let y = 0; y < H; y += 8 + R() * 22) { x.fillStyle = `rgba(${R() < 0.5 ? '90,80,120' : '230,224,240'},${0.15 + R() * 0.2})`; x.fillRect(0, y, W, 3 + R() * 9); }
      x.fillStyle = 'rgba(130,220,255,.5)'; for (let i = 0; i < 40; i++) x.fillRect(R() * W, R() * H, 2 + R() * 4, 2 + R() * 4);
    });
    const marmol = texCanvas(r, 512, 512, (x, W, H, { rng, grain }) => {
      const R = rng(47); grain(x, W, H, R, '#f2eee8', 6);
      x.strokeStyle = 'rgba(160,150,170,.35)'; x.lineWidth = 1.5;
      for (let i = 0; i < 14; i++) { let X = R() * W, Y = 0; x.beginPath(); x.moveTo(X, Y); while (Y < H) { X += (R() - 0.5) * 30; Y += 20; x.lineTo(X, Y); } x.stroke(); }
      x.strokeStyle = 'rgba(200,160,80,.7)'; x.lineWidth = 3; for (let i = 0; i <= W; i += 128) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(W, i); x.stroke(); }
    });
    const leyesE = texCanvas(r, 512, 512, (x) => {
      x.fillStyle = '#000'; x.fillRect(0, 0, 512, 512); x.strokeStyle = '#7ab8ff'; x.lineWidth = 3;
      for (let i = 0; i < 6; i++) { const y = 40 + i * 80; x.beginPath(); x.moveTo(0, y); x.lineTo(180, y); x.lineTo(220, y + 40); x.lineTo(512, y + 40); x.stroke(); }
      x.font = 'bold 34px serif'; x.fillStyle = '#ffd36a'; ['↑', '↓', '⟳', '≡'].forEach((s, i) => x.fillText(s, 60 + i * 120, 30 + (i % 2) * 260));
    }, { color: true });
    const leyes = texCanvas(r, 512, 512, (x, W, H, { rng, grain }) => {
      const R = rng(53); grain(x, W, H, R, '#2a3468', 10);
      x.strokeStyle = 'rgba(160,190,255,.35)'; x.lineWidth = 3;
      for (let i = 0; i < 6; i++) { const y = 40 + i * 80; x.beginPath(); x.moveTo(0, y); x.lineTo(180, y); x.lineTo(220, y + 40); x.lineTo(512, y + 40); x.stroke(); }
    });
    const rocaIsla = w.std({ map: piedra, roughness: 0.85 });
    this.texPasto = pasto;
    return {
      isla: [rocaIsla, w.std({ map: pasto, roughness: 0.9 })],
      isla_techo: [w.std({ map: piedra, roughness: 0.6, emissive: 0x3a6aff, emissiveIntensity: 0.12 })],
      marmol: [w.std({ map: marmol, roughness: 0.35, metalness: 0.05 })],
      leyes: [w.std({ map: leyes, emissiveMap: leyesE, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.3 })],
      torre: [w.std({ map: marmol, color: 0xe8ecff, roughness: 0.3, metalness: 0.1 })],
      roca: [rocaIsla]
    };
  }

  build() {
    const w = this.w, L = this.g.L;
    this.buildOceano();
    this.buildPaisaje();
    this.buildCielo();
    this.buildArquitecto();
    this.buildNodos();
    this.buildLunex();
    const sal = L.salida;
    this.salidaMesh = new THREE.Mesh(new THREE.BoxGeometry(sal.x1 - sal.x0, sal.y1 - sal.y0, 0.6), w.M.reja[0]);
    this.salidaMesh.position.set(0, (sal.y0 + sal.y1) / 2, (sal.z0 + sal.z1) / 2); w.scene.add(this.salidaMesh);
    w.lejos(this.salidaMesh, sal.z0);
  }

  // ---------- el océano celeste, muy abajo ----------
  buildOceano() {
    const w = this.w;
    this.oceanoU = { time: { value: 0 }, c1: { value: new THREE.Color(0x4ab8f0) }, c2: { value: new THREE.Color(0xc8f4ff) } };
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400, 1, 1), new THREE.ShaderMaterial({
      uniforms: this.oceanoU, fog: false, transparent: false,
      vertexShader: 'varying vec2 vU; varying vec3 vW; void main(){ vU = uv; vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }',
      fragmentShader: `uniform float time; uniform vec3 c1; uniform vec3 c2; varying vec2 vU; varying vec3 vW;
        void main(){
          vec2 p = vW.xz * 0.03;
          float w = sin(p.x * 3.0 + time * 0.6) * sin(p.y * 2.3 - time * 0.4) + sin((p.x + p.y) * 5.0 + time) * 0.4;
          float d = clamp(length(vW.xz - cameraPosition.xz) / 600.0, 0.0, 1.0);
          vec3 c = mix(c1, c2, 0.5 + 0.35 * w);
          c = mix(c, vec3(0.85, 0.95, 1.0), d * 0.85);
          float spark = smoothstep(0.92, 1.0, sin(p.x * 17.0 + time * 2.0) * sin(p.y * 13.0 - time * 1.7));
          gl_FragColor = vec4(c + spark * 0.35 * (1.0 - d), 1.0);
        }`
    }));
    m.rotation.x = -Math.PI / 2; m.position.y = -70; w.scene.add(m); this.oceano = m;
  }

  // ---------- islas flotantes, nubes, ciudad, cámara de las leyes, torre ----------
  buildPaisaje() {
    const w = this.w, L = this.g.L, M = w.M;
    const rnd = (() => { let s = 23; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); })();
    const buckets = new Map();
    const put = (mat, geo, x, y, z, ry = 0, rx = 0, rz = 0) => { if (rx) geo.rotateX(rx); if (rz) geo.rotateZ(rz); if (ry) geo.rotateY(ry); geo.translate(x, y, z); if (!buckets.has(mat)) buckets.set(mat, []); buckets.get(mat).push(geo); };
    const roca = M.isla[0], pasto = M.isla[1], marmol = M.marmol[0], torre = M.torre[0];
    const oro = w.std({ color: 0xf2c060, metalness: 0.9, roughness: 0.25 });
    const glowCyan = [], glowOro = [];
    // la parte de abajo de cada isla del recorrido: una roca invertida (se ve que flota)
    for (const s of L.solids) {
      if (s.wall || s.invisible || s.ghost || s.temp || s.movil || s.crate || s.falling) continue;
      if (!['isla', 'marmol'].includes(s.mat) || s.y1 - s.y0 < 4) continue;
      const w0 = s.x1 - s.x0, d0 = s.z1 - s.z0, r = Math.max(w0, d0) * 0.62;
      const geo = new THREE.ConeGeometry(r, 7 + r * 0.9, 9, 1); geo.rotateX(Math.PI); geo.scale(w0 / Math.max(w0, d0), 1, d0 / Math.max(w0, d0));
      worldUV(geo, (s.x0 + s.x1) / 2, s.y0, (s.z0 + s.z1) / 2, 1 / 6);
      put(roca, geo, (s.x0 + s.x1) / 2, s.y0 - (7 + r * 0.9) / 2 + 0.4, (s.z0 + s.z1) / 2);
    }
    // islas lejanas con su pasto y cascadas que suben
    const lejanas = [];
    for (let i = 0; i < 46; i++) {
      const side = i % 2 ? 1 : -1, x = side * (24 + rnd() * 110), z = 30 - i * 11 - rnd() * 10, y = -10 + rnd() * 40, r = 4 + rnd() * 12;
      const top = new THREE.CylinderGeometry(r, r * 0.92, 2, 10); worldUV(top, x, y, z, 1 / 8); put(pasto, top, x, y, z);
      const under = new THREE.ConeGeometry(r * 0.92, r * 1.6, 9, 1); under.rotateX(Math.PI); worldUV(under, x, y, z, 1 / 8); put(roca, under, x, y - 1 - r * 0.8, z);
      if (rnd() < 0.45) { const h = 4 + rnd() * 10; put(torre, new THREE.CylinderGeometry(0.9, 1.1, h, 10), x + (rnd() - 0.5) * r, y + 1 + h / 2, z + (rnd() - 0.5) * r); }
      lejanas.push({ x, y, z, r });
      if (rnd() < 0.35) glowCyan.push(x, y - 6, z);
    }
    this.lejanas = lejanas;
    // ciudad suspendida: torres blancas con cúpulas doradas a los lados de la fase 3
    for (let z = -164; z > -246; z -= 6 + rnd() * 4) for (const side of [-1, 1]) {
      const x = side * (9 + rnd() * 16), h = 6 + rnd() * 16, r = 1.4 + rnd() * 1.6, base = 2 + rnd() * 6;
      put(torre, new THREE.CylinderGeometry(r, r * 1.08, h, 14), x, base + h / 2, z);
      put(oro, new THREE.SphereGeometry(r * 1.05, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), x, base + h, z);
      put(oro, new THREE.ConeGeometry(0.15, 2, 6), x, base + h + r + 0.8, z);
      const under = new THREE.ConeGeometry(r * 1.6, 6, 8); under.rotateX(Math.PI); put(roca, under, x, base - 3, z);
      glowOro.push(x, base + h + r + 1.8, z);
    }
    // puentes colgantes rotos entre torres (rutas que se desconectan)
    for (let z = -170; z > -240; z -= 18) put(marmol, new THREE.BoxGeometry(6, 0.25, 1.2), -12 + rnd() * 4, 9 + rnd() * 6, z, rnd() * 0.4, 0, (rnd() - 0.5) * 0.4);
    // cámara de las leyes: columnas de luz y anillos de las leyes girando
    for (let z = -250; z > -316; z -= 10) for (const side of [-1, 1]) { put(M.leyes[0], new THREE.BoxGeometry(0.8, 18, 0.8), side * 4.8, YB + 4, z); glowCyan.push(side * 4.8, YB + 13, z); }
    this.anillos = [];
    for (const [z, rr] of [[-262, 6], [-284, 7], [-306, 6.5]]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.18, 10, 80), w.basic(0xffd36a, { toneMapped: false }));
      ring.position.set(0, YB + 12, z); w.scene.add(ring); w.lejos(ring, z, true); this.anillos.push(ring);
    }
    // torre central detrás de la arena
    put(torre, new THREE.CylinderGeometry(9, 12, 70, 24), -42, YB + 8, -336);
    put(oro, new THREE.TorusGeometry(10, 0.5, 8, 48), -42, YB + 24, -336, 0, Math.PI / 2);
    put(oro, new THREE.ConeGeometry(4, 14, 16), -42, YB + 50, -336);
    const pie = new THREE.ConeGeometry(12, 30, 10); pie.rotateX(Math.PI); put(roca, pie, -42, YB - 42, -336);
    // plataforma final: pilares y cristales
    for (let i = 0; i < 6; i++) { const a = -0.4 - i / 5 * (Math.PI - 0.8); put(marmol, new THREE.CylinderGeometry(0.35, 0.4, 3, 10), Math.cos(a) * 6.2, YB + 6.5, -436 + Math.sin(a) * 6.2); glowOro.push(Math.cos(a) * 6.2, YB + 8.2, -436 + Math.sin(a) * 6.2); }
    w.mergeInto(buckets, { cast: [torre, marmol] });
    w.points(glowCyan, 0x9fe8ff, 6, 0.35); w.points(glowOro, 0xffd890, 3, 0.55);
    // nubes (sprites suaves en una sola draw call)
    const nube = texCanvas(w.renderer, 128, 64, (x) => {
      for (let i = 0; i < 9; i++) { const cx = 20 + Math.random() * 88, cy = 26 + Math.random() * 14, r = 14 + Math.random() * 14, g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 64); }
    }, { repeat: false });
    const n = 70, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 120); pos[i * 3 + 1] = -30 + Math.random() * 60; pos[i * 3 + 2] = 40 - Math.random() * 520; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.nubes = new THREE.Points(geo, new THREE.PointsMaterial({ map: nube, size: 40, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true }));
    w.scene.add(this.nubes);
    // cascadas que suben a lo lejos (decorado)
    this.cascadasLejos = [];
    for (let i = 0; i < 10; i++) {
      const isla = lejanas[i * 4 + 2]; if (!isla) continue;
      const tex = w.agua().clone(); tex.needsUpdate = true; tex.repeat.set(2, 6);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2, 60, 16, 1, true), new THREE.MeshBasicMaterial({ map: tex, color: 0xb8ecff, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      m.position.set(isla.x, isla.y - 30, isla.z); w.scene.add(m); this.cascadasLejos.push(tex);
    }
    // la isla lejana que cambia al final (revelación)
    const il = this.islaLejana = new THREE.Group(); il.position.set(-55, YB + 14, -500); w.scene.add(il);
    const t1 = new THREE.Mesh(new THREE.CylinderGeometry(9, 8, 2.4, 12), pasto); il.add(t1);
    const u1 = new THREE.Mesh(new THREE.ConeGeometry(8, 14, 9), roca); u1.rotation.x = Math.PI; u1.position.y = -8; il.add(u1);
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 9, 12), torre); tw.position.set(2, 5.7, 0); il.add(tw);
    const dm = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), oro); dm.position.set(2, 10.2, 0); il.add(dm);
    this.islaGlow = w.glow(0xb89aff, 40, 0, 0, 0, 0, il);
    // columnas del océano que suben al final
    this.columnas = [];
    for (let i = 0; i < 7; i++) {
      const tex = w.agua().clone(); tex.needsUpdate = true; tex.repeat.set(3, 8);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(2.5 + i % 3, 4 + i % 3, 120, 18, 1, true), new THREE.MeshBasicMaterial({ map: tex, color: 0x9fe8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      const a = -0.5 - i / 6 * (Math.PI - 1);
      m.position.set(Math.cos(a) * (26 + (i % 2) * 14), -60, -440 + Math.sin(a) * (30 + (i % 3) * 10)); w.scene.add(m); this.columnas.push({ m, tex });
    }
  }

  buildCielo() {
    const w = this.w, dome = w.dome;
    const sol = new THREE.Mesh(new THREE.CircleGeometry(14, 48), w.basic(0xfffaf0, { fog: false }));
    sol.position.set(120, 150, -260); sol.lookAt(0, 0, 0); dome.add(sol);
    w.glow(0xfff0d0, 120, 120, 150, -262, 0.5, dome);
    const luna = new THREE.Mesh(new THREE.SphereGeometry(18, 32, 16), new THREE.MeshStandardMaterial({ color: 0xe8f4ff, roughness: 1, emissive: 0x8ab8e0, emissiveIntensity: 0.5, fog: false }));
    luna.position.set(-170, 110, -200); dome.add(luna);
  }

  // ---------- el Arquitecto: figura geométrica flotante con brújula y núcleo ----------
  buildArquitecto() {
    const w = this.w;
    const grp = this.arq = new THREE.Group(); w.scene.add(grp); grp.visible = false;
    const blanco = w.std({ color: 0xf4f6ff, roughness: 0.3, metalness: 0.2 }), oro = w.std({ color: 0xf2c060, metalness: 0.9, roughness: 0.2 });
    this.arqMats = [blanco, oro];
    this.arqCubos = [];
    for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new RoundedBoxGeometry(1.5 - i * 0.25, 0.55, 1.5 - i * 0.25, 2, 0.08), i % 2 ? oro : blanco); c.position.y = -0.9 + i * 0.6; c.castShadow = true; grp.add(c); this.arqCubos.push(c); }
    this.arqCoreM = w.nacar({ color: 0xffffff, emissive: 0x6ad8ff, emissiveIntensity: 0.4 });
    const core = this.arqCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), this.arqCoreM); core.position.y = 1.6; grp.add(core);
    this.arqGlow = w.glow(0x9fe8ff, 3.5, 0, 1.6, 0, 0.5, grp);
    this.brujula = new THREE.Group(); this.brujula.position.y = 1.6; grp.add(this.brujula);
    this.brujula.add(new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.06, 8, 64), oro));
    for (const a of [0, Math.PI / 2]) { const pt = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.8, 6), oro); pt.position.set(Math.cos(a) * 1.8, Math.sin(a) * 1.8, 0); pt.rotation.z = a - Math.PI / 2; this.brujula.add(pt); }
    const ojo = this.arqOjoM = w.basic(0x9ff0ff, { toneMapped: false });
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.05), ojo); visor.position.set(0, 0.95, 0.66); grp.add(visor);
    // el símbolo que pide durante la ventana segura
    this.simTex = Object.fromEntries(['triangulo', 'circulo', 'cuadrado'].map(s => [s, this.simboloTex(s)]));
    this.arqSimbolo = w.sprite(this.simTex.triangulo, 1.6, grp); this.arqSimbolo.position.y = 3.6; this.arqSimbolo.visible = false;
    this.arqStars = [0, 1, 2].map(() => w.glow(0xffe680, 0.5, 0, 0, 0, 0.9, grp));
    // bloques que reubica
    const bm = w.std({ map: w.M.marmol[0].map, roughness: 0.35 });
    this.bloqueMeshes = Array.from({ length: 14 }, () => { const m = w.mesh(new RoundedBoxGeometry(1.6, 1.6, 1.6, 2, 0.08), bm, 0, -50, 0); m.visible = false; return m; });
    this.bloqueMarcas = Array.from({ length: 14 }, () => { const m = w.blob(0.95); w.scene.add(m); m.visible = false; return m; });
    // rayo del nodo al Arquitecto
    this.rayo = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.rayo.visible = false; w.scene.add(this.rayo);
  }
  simboloTex(s) {
    const col = { triangulo: '#ffd36a', circulo: '#7fe6ff', cuadrado: '#ff9ad6' }[s];
    return texCanvas(this.w.renderer, 128, 128, (x) => {
      x.fillStyle = 'rgba(14,20,50,.85)'; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.fill();
      x.strokeStyle = '#fff'; x.lineWidth = 5; x.stroke();
      x.fillStyle = col; x.strokeStyle = '#fff'; x.lineWidth = 4; x.beginPath();
      if (s === 'triangulo') { x.moveTo(64, 22); x.lineTo(104, 96); x.lineTo(24, 96); x.closePath(); }
      else if (s === 'circulo') x.arc(64, 64, 36, 0, 7);
      else x.rect(30, 30, 68, 68);
      x.fill(); x.stroke();
    }, { repeat: false });
  }
  buildNodos() {
    const w = this.w, b = this.g.boss;
    const pedM = w.M.torre[0];
    this.nodoMeshes = b.nodos.map(n => {
      const grp = new THREE.Group(); grp.position.set(n.x, n.y, n.z); if (n.techo) grp.rotation.x = Math.PI; w.scene.add(grp);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.5, 12), pedM); ped.position.y = 0.25; grp.add(ped);
      const crM = w.nacar({ emissive: 0x6ad8ff, emissiveIntensity: 0.3 });
      const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), crM); cr.position.y = 0.95; grp.add(cr);
      const sim = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: this.simTex.circulo, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
      sim.position.y = 1.8; grp.add(sim);
      w.lejos(grp, n.z, true);
      return { n, grp, cr, crM, sim };
    });
  }
  buildLunex() {
    const w = this.w, grp = this.lunex = new THREE.Group(); w.scene.add(grp); grp.visible = false;
    this.lunexMats = [];
    const add = (geo, color, opacity) => { const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false }); this.lunexMats.push([m, opacity]); const mesh = new THREE.Mesh(geo, m); grp.add(mesh); return mesh; };
    this.lunexRings = [add(new THREE.TorusGeometry(6, 0.16, 6, 96), 0x3a4ad8, 0.9), add(new THREE.TorusGeometry(4.6, 0.12, 6, 96), 0x2a9ad8, 0.85), add(new THREE.TorusGeometry(7.6, 0.1, 6, 96), 0x8a4ad8, 0.7)];
    this.lunexEye = add(new THREE.OctahedronGeometry(1.6, 0), 0x1a2470, 0.85);
    add(new THREE.RingGeometry(0.5, 1.0, 32), 0x5ae0ff, 0.95);
  }

  // =====================================================================
  draw(t, dt, px, py, pz) {
    const g = this.g, fx = g.fx, w = this.w;
    this.oceanoU.time.value = t;
    this.oceano.position.x = w.camera.position.x; this.oceano.position.z = w.camera.position.z;
    this.nubes.position.x = Math.sin(t * 0.02) * 6;
    for (const tex of this.cascadasLejos) tex.offset.y = -t * 0.8;
    for (const [i, r] of this.anillos.entries()) { r.rotation.set(Math.PI / 2 + Math.sin(t * 0.4 + i) * 0.5, t * (0.2 + i * 0.1), Math.cos(t * 0.3) * 0.3); }
    this.salidaMesh.visible = (fx.salida || 0) < 1;
    this.salidaMesh.position.y = (g.L.salida.y0 + g.L.salida.y1) / 2 + (fx.salida || 0) * 12;
    this.drawArquitecto(t, dt);
    // final: el océano sube y una isla lejana cambia
    const o = fx.oceano || 0;
    for (const [i, c] of this.columnas.entries()) { c.m.material.opacity = Math.min(0.75, o * 1.2); c.m.position.y = -70 + o * (55 + i * 3); c.tex.offset.y = -t * 1.6; c.m.visible = o > 0; }
    const il = fx.islaLejana || 0;
    this.islaLejana.rotation.z = il * Math.PI * 0.85; this.islaLejana.position.y = YB + 14 + Math.sin(il * Math.PI) * 6;
    this.islaGlow.material.opacity = Math.sin(Math.min(1, il) * Math.PI) * 0.6;
    const lx = fx.lunex;
    this.lunex.visible = lx > 0;
    if (this.lunex.visible) {
      this.lunex.position.set(-30, YB + 22, -470); this.lunex.lookAt(w.camera.position);
      this.lunexRings[0].rotation.set(t * 0.4, 0, 0); this.lunexRings[1].rotation.set(0, t * 0.6, 0); this.lunexRings[2].rotation.set(t * 0.2, t * 0.3, 0);
      this.lunexEye.rotation.set(t * 0.3, t * 0.5, 0);
      for (const [m, op] of this.lunexMats) m.opacity = op * Math.min(1, lx);
    }
  }
  drawArquitecto(t, dt) {
    const g = this.g, b = g.boss, m = this.arq, fx = g.fx;
    m.visible = (fx.arquitectoSube > 0 || b.active || b.defeated) && g.mode === 'juego';
    const rise = b.active || b.defeated ? 1 : (fx.arquitectoSube || 0), er = 1 - Math.pow(1 - rise, 3);
    m.position.set(b.x, b.y - 8 * (1 - er) - b.off * 3, b.z);
    const p = g.player.pos;
    if (b.active) m.rotation.y = Math.atan2(p.x - b.x, p.z - b.z);
    const abierta = b.estado === 'ventana' && b.active;
    this.arqCubos.forEach((c, i) => { c.rotation.y = t * (0.5 + i * 0.3) * (i % 2 ? -1 : 1) * (1 - b.off); c.position.y = -0.9 + i * 0.6 + (abierta && i === 3 ? 0.4 : 0); });
    this.brujula.rotation.set(Math.sin(t) * 0.3, t * (abierta ? 3 : 1) * (1 - b.off), 0);
    this.arqCoreM.emissiveIntensity = b.off > 0 ? 0.4 * (1 - b.off) : abierta ? 2 + Math.sin(t * 10) * 0.6 : 0.5;
    this.arqGlow.material.opacity = abierta ? 0.9 : 0.4 * (1 - b.off);
    this.arqCore.rotation.set(t, t * 1.3, 0);
    const flash = b.flash > 0 && Math.sin(t * 50) > 0;
    for (const mm of this.arqMats) mm.emissive.setHex(flash ? 0xffffff : 0x000000);
    this.arqOjoM.color.setHex(b.off > 0.5 ? 0x203040 : b.stun > 0 ? 0xffd36a : abierta ? 0x6affb8 : 0x9ff0ff);
    this.arqSimbolo.visible = abierta;
    if (abierta) { this.arqSimbolo.material.map = this.simTex[b.ventana.simbolo]; this.arqSimbolo.scale.setScalar(1.6 + Math.sin(t * 6) * 0.1); }
    this.arqStars.forEach((s, i) => { s.visible = b.stun > 0 && b.active; const a = t * 5 + i * 2.1; s.position.set(Math.cos(a) * 1, 2.6, Math.sin(a) * 1); });
    for (const o of this.nodoMeshes) {
      const n = o.n, on = n.on && b.active;
      o.sim.visible = on; o.crM.emissiveIntensity = on ? 1.2 + Math.sin(t * 6) * 0.3 : 0.25;
      if (on) { const want = this.simTex[n.simbolo]; if (o.sim.material.map !== want) { o.sim.material.map = want; o.sim.material.needsUpdate = true; } o.sim.rotation.y = Math.atan2(this.w.camera.position.x - n.x, this.w.camera.position.z - n.z); }
      o.cr.rotation.y = t * 2;
    }
    for (let i = 0; i < this.bloqueMeshes.length; i++) {
      const bm = this.bloqueMeshes[i], mk = this.bloqueMarcas[i], q = b.bloques[i];
      bm.visible = !!q && q.estado !== 'espera'; mk.visible = !!q && q.estado !== 'posado';
      if (q) { bm.position.set(q.x, q.y + 0.8, q.z); mk.position.set(q.x, YB + 0.04, q.z); mk.material.opacity = q.estado === 'cae' ? 0.6 : 0.35; }
    }
    const r = fx.rayo;
    this.rayo.visible = !!r && r.t > 0;
    if (r && r.t > 0) {
      r.t -= dt;
      const a = new THREE.Vector3(r.x, r.y, r.z), c = new THREE.Vector3(b.x, b.y + 1.6, b.z), d = c.clone().sub(a);
      this.rayo.position.copy(a).addScaledVector(d, 0.5); this.rayo.scale.set(1, d.length(), 1);
      this.rayo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      this.rayo.material.opacity = Math.min(1, r.t * 2.5);
    }
  }
}
