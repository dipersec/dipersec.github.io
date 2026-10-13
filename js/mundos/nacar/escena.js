// escena.js — Lo que se ve solo en Nácar: paisaje (desierto mineral, montañas de vidrio negro, ruinas
// incompletas, santuario, estación), personajes en 3D HD (Tilo, el Guardián, la proyección de Lunex) y utilería.
// Todo lo estático se fusiona por material: pocas draw calls aunque haya cientos de piezas.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { worldUV } from '../../textures.js';
import { R } from './nivel.js';

export class EscenaNacar {
  constructor(w) {
    this.w = w; this.g = w.g;
    // Paletas por zona: cielo (top/hor), niebla, luz del sol y del cielo; band = intensidad del brillo nacarado
    this.ENV = {
      titulo: { bg: 0xe2bcc6, fog: 0xe2bcc6, near: 30, far: 170, hs: 0xe0d0ff, hg: 0x7a5a60, hi: 1.05, sun: 0xffd8b8, si: 2.3, top: 0x2c2556, hor: 0xf2c6cc, band: 0.8, stars: 0.35 },
      crater: { bg: 0xe2bcc6, fog: 0xe2bcc6, near: 28, far: 160, hs: 0xe0d0ff, hg: 0x7a5a60, hi: 1.05, sun: 0xffd8b8, si: 2.3, top: 0x2c2556, hor: 0xf2c6cc, band: 0.8, stars: 0.3 },
      jardin: { bg: 0xeccab0, fog: 0xeccab0, near: 28, far: 160, hs: 0xf0dcc8, hg: 0x6a5a40, hi: 1.1, sun: 0xffe2b0, si: 2.5, top: 0x353068, hor: 0xf6d2b0, band: 0.6, stars: 0.2 },
      ruinas: { bg: 0xd2bce0, fog: 0xd2bce0, near: 26, far: 150, hs: 0xdcd0ff, hg: 0x5a4a6a, hi: 1.05, sun: 0xffe0d0, si: 2.2, top: 0x272255, hor: 0xdcbcea, band: 0.9, stars: 0.35 },
      santuario: { bg: 0x5a62a8, fog: 0x5a62a8, near: 20, far: 120, hs: 0x9aa4ff, hg: 0x2a2440, hi: 0.95, sun: 0xc8d0ff, si: 1.6, top: 0x0f1232, hor: 0x7a8ce0, band: 1.0, stars: 0.8 },
      estacion: { bg: 0x3e6878, fog: 0x3e6878, near: 22, far: 120, hs: 0x9ad8ff, hg: 0x283040, hi: 1.0, sun: 0xd8f0ff, si: 1.8, top: 0x0c1626, hor: 0x5aa8b8, band: 0.5, stars: 0.7 },
      jefe: { bg: 0x46707e, fog: 0x46707e, near: 26, far: 120, hs: 0xa8e0ff, hg: 0x303846, hi: 1.15, sun: 0xe0f4ff, si: 2.1, top: 0x0e1a2c, hor: 0x62b0c0, band: 0.5, stars: 0.6 },
      escape: { bg: 0xb8a8d8, fog: 0xc8b8e4, near: 16, far: 100, hs: 0xe8e0ff, hg: 0x40304a, hi: 1.1, sun: 0xfff0f8, si: 2.0, top: 0x1c1236, hor: 0xf4eefc, band: 1.2, stars: 0.4 },
      final: { bg: 0xf0d6e0, fog: 0xf0d6e0, near: 24, far: 150, hs: 0xfff0ff, hg: 0x6a5060, hi: 1.2, sun: 0xffe8d0, si: 2.4, top: 0x241e50, hor: 0xf8dce4, band: 1.2, stars: 0.5 },
      fin: { bg: 0xf4eefc, fog: 0xf4eefc, near: 10, far: 80, hs: 0xffffff, hg: 0x807080, hi: 1, sun: 0xffffff, si: 1.5, top: 0xe8e0f8, hor: 0xffffff, band: 0.3, stars: 0 }
    };
  }
  envName() {
    const g = this.g;
    if (g.mode === 'titulo') return 'titulo';
    if (g.mode === 'fin') return 'fin';
    if (g.boss.active) return 'jefe';
    if (g.chase.on) return 'escape';
    if (g.player.pos.z < -444) return 'final';
    return ['crater', 'crater', 'jardin', 'ruinas', 'santuario', 'estacion', 'escape'][g.section.n] || 'crater';
  }
  // posición del que habla (para los globos de diálogo)
  speaker(who) {
    const g = this.g, sp = g.L.spots;
    if (who === 'tilo') { const t = g.fx.tiloFinal ? sp.tiloFinal : sp.tilo; return { x: t.x, y: 1.9, z: t.z }; }
    if (who === 'guardian') return { x: g.boss.x, y: g.boss.y + 3.4, z: g.boss.z };
    if (who === 'capsula') return { x: sp.capsula.x, y: 2, z: sp.capsula.z };
    return null;
  }

  build() {
    const w = this.w, T = w.tex, L = this.g.L;
    this.mats = {
      vidrio: w.std({ color: 0x17131f, metalness: 0.95, roughness: 0.1, envMapIntensity: 1.6 }),
      arena: w.std({ map: T.arena, roughness: 0.95 }),
      roca: w.std({ map: T.roca, roughness: 0.9 }),
      ruina: w.M.ruina[0], santuario: w.M.santuario[0], estacion: w.M.estacion[0],
      metal: w.std({ map: T.metal, color: 0x9aa4b8, metalness: 0.85, roughness: 0.3 }),
      oscuro: w.std({ color: 0x2a3040, metalness: 0.8, roughness: 0.35 }),
      luz: w.basic(0x9ff0ff, { toneMapped: false }),
      luzCalida: w.basic(0xffd8a0, { toneMapped: false }),
      fantasma: w.nacar({ color: 0xe8f6ff, emissive: 0x6ad0ff, emissiveIntensity: 0.3, transparent: true, opacity: 0.22, depthWrite: false })
    };
    this.buildPaisaje();
    this.buildCielo();
    this.buildCapsula();
    this.tiloA = this.makeTilo(); this.tiloA.grp.position.set(L.spots.tilo.x, 0, L.spots.tilo.z);
    this.tiloB = this.makeTilo(); this.tiloB.grp.position.set(L.spots.tiloFinal.x, 0, L.spots.tiloFinal.z); this.tiloB.grp.visible = false;
    this.buildRecolector();
    this.buildEstacion();
    this.buildGuardian();
    this.buildLunex();
    this.buildSenal();
    this.buildReconfiguracion();
    const sp = L.spots;
    w.lejos(this.capsula, sp.capsula.z, true); w.lejos(this.recolector, sp.recolector.z, true); w.lejos(this.nucleo, sp.nucleo.z, true);
    w.lejos(this.guardian, -320); w.lejos(this.senal, sp.senal.z, true);
    for (const r of this.anillos) w.lejos(r, r.position.z, true);
  }

  // ---------- paisaje fusionado ----------
  buildPaisaje() {
    const w = this.w, L = this.g.L, m = this.mats;
    const rnd = (() => { let s = 11; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); })();
    const buckets = new Map();
    const put = (mat, geo, x, y, z, ry = 0, rx = 0, rz = 0) => { if (rx) geo.rotateX(rx); if (rz) geo.rotateZ(rz); if (ry) geo.rotateY(ry); geo.translate(x, y, z); if (!buckets.has(mat)) buckets.set(mat, []); buckets.get(mat).push(geo); };
    const glowPink = [], glowCyan = [], glowWarm = [];
    // montañas de vidrio negro: agujas facetadas a lo lejos, a ambos lados de todo el recorrido
    for (let i = 0; i < 90; i++) {
      const side = i % 2 ? 1 : -1, z = 40 - i * 6 - rnd() * 8, x = side * (45 + rnd() * 90), h = 25 + rnd() * 70, r = 8 + rnd() * 16;
      const geo = new THREE.ConeGeometry(r, h, 4 + Math.floor(rnd() * 3), 1); put(m.vidrio, geo, x, h / 2 - 6, z, rnd() * 3, (rnd() - 0.5) * 0.25, (rnd() - 0.5) * 0.25);
      if (rnd() < 0.5) { const g2 = new THREE.ConeGeometry(r * 0.5, h * 0.6, 4, 1); put(m.vidrio, g2, x + (rnd() - 0.5) * r * 2, h * 0.3 - 6, z + (rnd() - 0.5) * r * 2, rnd() * 3, (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.4); }
    }
    // borde del cráter: laderas rocosas alrededor del inicio
    for (let a = 0; a < Math.PI * 2; a += 0.22) {
      const x = Math.cos(a) * 26, z = 6 + Math.sin(a) * 26;
      if (Math.abs(x) < 7 && z < 0) continue;
      const geo = new THREE.ConeGeometry(7 + rnd() * 5, 9 + rnd() * 8, 6, 1); put(m.roca, geo, x, 2, z, rnd() * 3);
    }
    // dunas y laderas a los lados del corredor
    for (const tr of L.tramos) {
      if (tr.tipo === 'estacion' || tr.tipo === 'escape') continue;
      for (let z = tr.z0; z > tr.z1; z -= 7 + rnd() * 6) for (const side of [-1, 1]) {
        const r = 6 + rnd() * 6, plaza = (tr.tipo === 'jardin' && z < -60 && z > -99) || (side > 0 && z < -50 && z > -62);
        const sx = side * ((plaza ? 11 : 5.2) + r * 0.85 + rnd() * 3);
        const geo = new THREE.SphereGeometry(r, 14, 8); geo.scale(1, 0.35 + rnd() * 0.2, 1.4);
        worldUV(geo, sx, -1, z, 1 / 6);
        put(tr.y > 0 ? m.roca : m.arena, geo, sx, tr.y > 0 ? -6 + rnd() * 3 : -1.2, z);
        // cristales minerales que brillan
        if (rnd() < 0.55) {
          const cx = sx - side * (r * 0.5), cy = tr.y > 0 ? tr.y - 0.5 : 0.5, n = 2 + Math.floor(rnd() * 4);
          for (let k = 0; k < n; k++) { const cg = new THREE.OctahedronGeometry(0.4 + rnd() * 0.8, 0); cg.scale(0.6, 2 + rnd() * 1.5, 0.6); put(rnd() < 0.5 ? this.cristalM(0) : this.cristalM(1), cg, cx + (rnd() - 0.5) * 2, cy + 0.6, z + (rnd() - 0.5) * 2, 0, (rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.6); }
          (rnd() < 0.5 ? glowPink : glowCyan).push(cx, cy + 1.5, z);
        }
      }
    }
    // pilares de roca que sostienen la meseta de las ruinas (se ve que flota sobre el abismo)
    for (let z = -138; z > -268; z -= 8 + rnd() * 4) for (const side of [-1, 1]) {
      const geo = new THREE.CylinderGeometry(1.2 + rnd(), 2.4 + rnd(), 46, 7); worldUV(geo, side * 5.5, -25, z, 1 / 6);
      put(m.roca, geo, side * (5.2 + rnd() * 1.5), -24.6, z);
    }
    // jardín: árboles minerales y piedras comestibles de colores
    const stoneCols = [0xe8a25a, 0x7fc0e8, 0xe86a8a, 0x9ad86a, 0xf2d070, 0xb08ae8];
    const stoneMats = stoneCols.map(c => w.std({ color: c, roughness: 0.35, metalness: 0.1 }));
    const stalk = w.std({ color: 0x8a6a5a, roughness: 0.7 });
    for (let i = 0; i < 26; i++) {
      const z = -63 - rnd() * 33, x = (rnd() < 0.5 ? -1 : 1) * (7 + rnd() * 6);
      const h = 1.5 + rnd() * 2.5; put(stalk, new THREE.CylinderGeometry(0.08, 0.14, h, 6), x, h / 2, z);
      const sg = new THREE.IcosahedronGeometry(0.5 + rnd() * 0.5, 0); put(stoneMats[Math.floor(rnd() * 6)], sg, x, h + 0.4, z, rnd() * 3);
      glowWarm.push(x, h + 0.4, z);
    }
    for (let i = 0; i < 70; i++) {
      const z = -63 - rnd() * 33, x = (rnd() - 0.5) * 17;
      if (Math.abs(x) < 1.5 || (x < -5 && z < -86) || (x > 4 && z > -82 && z < -73)) continue;
      const sg = new THREE.IcosahedronGeometry(0.12 + rnd() * 0.18, 0); sg.scale(1, 0.7, 1); put(stoneMats[Math.floor(rnd() * 6)], sg, x, 0.08, z, rnd() * 3);
    }
    // ruinas: columnas rotas, arcos y bloques "incompletos" flotando (pista de lo que se puede recordar)
    for (const c of L.columnas) {
      const geo = new THREE.CylinderGeometry(0.45, 0.5, c.h, 10); worldUV(geo, c.x, c.y + c.h / 2, c.z, 1 / 3);
      put(m.ruina, geo, c.x, c.y + c.h / 2, c.z);
      put(m.ruina, new THREE.BoxGeometry(1.2, 0.3, 1.2), c.x, c.y + 0.15, c.z);
      if (rnd() < 0.5) put(this.mats.fantasma, new THREE.CylinderGeometry(0.45, 0.45, 2.2, 10), c.x, c.y + c.h + 1.4, c.z);
    }
    for (let z = -150; z > -196; z -= 15) {
      const arc = new THREE.TorusGeometry(5.2, 0.4, 8, 24, Math.PI); worldUV(arc, 0, R + 5, z, 1 / 3); put(m.ruina, arc, 0, R + 2.6, z);
      put(this.mats.fantasma, new THREE.BoxGeometry(2.2, 1.2, 1.2), (rnd() - 0.5) * 6, R + 7.5 + rnd() * 2, z - 4, rnd() * 3);
    }
    // santuario: pilares y anillos gigantes suspendidos
    for (let z = -202; z > -266; z -= 11) {
      for (const side of [-1, 1]) { const geo = new THREE.CylinderGeometry(0.5, 0.6, 6.5, 12); worldUV(geo, side * 4.8, R + 3.2, z, 1 / 3); put(m.santuario, geo, side * 4.8, R + 3.2, z); glowCyan.push(side * 4.8, R + 6.7, z); }
    }
    this.anillos = [];
    for (const z of [-212, -236, -256]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(7, 0.22, 12, 80), w.basic(0xb8a8ff, { toneMapped: false, transparent: true, opacity: 0.75 }));
      ring.position.set(0, R + 7, z); this.w.scene.add(ring); this.anillos.push(ring);
    }
    // estación: costillas del andén sobre el corredor, tuberías y franjas de luz
    for (let z = -276; z > -446; z -= 9) {
      if (z < -299 && z > -339) continue;
      const rib = new THREE.TorusGeometry(5.6, 0.28, 8, 24, Math.PI); put(m.oscuro, rib, 0, 0, z);
      put(m.luz, new THREE.BoxGeometry(0.1, 0.1, 3), 0, 5.55, z - 1.5);
      glowCyan.push(0, 5.4, z - 1.5);
      for (const side of [-1, 1]) put(m.metal, new THREE.CylinderGeometry(0.18, 0.18, 9, 8), side * 5.9, 3.5, z - 4.5, 0, Math.PI / 2);
    }
    // arena del Guardián: columnas y luces del andén
    for (const [x, z] of [[-9, -304], [9, -304], [-9, -318], [9, -318], [-9, -332], [9, -332]]) {
      put(m.estacion, new THREE.BoxGeometry(1, 9, 1), x, 4.5, z); put(m.luz, new THREE.BoxGeometry(1.05, 0.15, 1.05), x, 7.5, z); glowCyan.push(x, 7.6, z);
    }
    // plataforma final: piedra y cristales
    for (let i = 0; i < 9; i++) { const a = -0.3 - i / 8 * (Math.PI - 0.6); const cg = new THREE.OctahedronGeometry(0.45, 0); cg.scale(0.6, 2.2, 0.6); put(this.cristalM(i % 2), cg, Math.cos(a) * 6.2, 0.9, -455 + Math.sin(a) * 6.2, 0, Math.sin(a) * 0.25, -Math.cos(a) * 0.25); }
    w.mergeInto(buckets, { cast: [m.ruina, stalk, m.metal] });
    w.points(glowPink, 0xffa8e0, 4.5, 0.32); w.points(glowCyan, 0x9fe8ff, 3.6, 0.4); w.points(glowWarm, 0xffd0a0, 2.6, 0.35);
  }
  cristalM(i) {
    if (!this._cr) this._cr = [this.w.nacar({ color: 0xffd8f0, emissive: 0xff8ad0, emissiveIntensity: 0.45 }), this.w.nacar({ color: 0xd8f4ff, emissive: 0x6ad8ff, emissiveIntensity: 0.45 })];
    return this._cr[i];
  }

  // ---------- cielo: planeta con anillos y lunas ----------
  buildCielo() {
    const w = this.w, dome = w.dome;
    const planet = new THREE.Mesh(new THREE.SphereGeometry(48, 48, 24), new THREE.MeshStandardMaterial({ color: 0xf2e6f4, roughness: 0.9, emissive: 0x6a5a8a, emissiveIntensity: 0.35, fog: false }));
    planet.position.set(-150, 120, -260); dome.add(planet);
    const ringG = new THREE.RingGeometry(62, 96, 96);
    const ring = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: 0xffd8f0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, fog: false, depthWrite: false }));
    ring.position.copy(planet.position); ring.rotation.set(1.2, 0.3, 0.4); dome.add(ring);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, roughness: 1, emissive: 0x4a6a9a, emissiveIntensity: 0.4, fog: false }));
    moon.position.set(140, 160, -120); dome.add(moon);
    w.glow(0xffe0f0, 160, -150, 120, -262, 0.25, dome);
  }

  // ---------- la cápsula de DIP ----------
  buildCapsula() {
    const w = this.w, s = this.g.L.spots.capsula;
    const grp = this.capsula = new THREE.Group(); grp.position.set(s.x, 0, s.z); grp.rotation.set(0.25, -0.5, 0.18); grp.scale.setScalar(0.8); w.scene.add(grp);
    const hull = w.std({ color: 0xf6f2fc, metalness: 0.1, roughness: 0.3, emissive: 0x3a3048, emissiveIntensity: 0.35 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), hull); body.scale.set(1.05, 0.85, 1.6); body.position.y = 0.55; body.castShadow = body.receiveShadow = true; grp.add(body);
    const burn = new THREE.Mesh(new THREE.SphereGeometry(1.01, 32, 20, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), w.std({ color: 0x3a2a2a, roughness: 1 })); burn.scale.copy(body.scale); burn.position.copy(body.position); grp.add(burn);
    for (const sx of [-1, 1]) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.9), hull); fin.position.set(sx * 0.95, 0.6, -1.1); fin.rotation.z = sx * 0.5; grp.add(fin); }
    this.pantallaM = new THREE.MeshBasicMaterial({ map: w.tex.pantalla, toneMapped: false, transparent: true, opacity: 0.2 });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.56), this.pantallaM); scr.position.set(-0.75, 0.9, 0.45); scr.rotation.y = -1.1; grp.add(scr);
    this.pantallaGlow = w.glow(0x5ae0ff, 2.2, -0.8, 0.9, 0.5, 0.1, grp);
    const scorch = new THREE.Mesh(new THREE.CircleGeometry(3.2, 32), w.basic(0x2a1a22, { transparent: true, opacity: 0.45, depthWrite: false })); scorch.rotation.x = -Math.PI / 2; scorch.position.set(s.x, 0.03, s.z); w.scene.add(scorch);
  }

  // ---------- Tilo: recolector de piedras, redondo y con ojos enormes (HD, no pixel) ----------
  makeTilo() {
    const w = this.w, grp = new THREE.Group(); w.scene.add(grp);
    const skin = w.std({ color: 0xe0a070, roughness: 0.55 }), belly = w.std({ color: 0xf6dcb8, roughness: 0.6 });
    const body = new THREE.Group(); grp.add(body);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 20), skin); b.scale.set(1, 1.05, 0.92); b.position.y = 0.72; b.castShadow = true; body.add(b);
    const bel = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), belly); bel.scale.set(1, 1.05, 0.6); bel.position.set(0, 0.62, 0.27); body.add(bel);
    const eyeW = w.std({ color: 0xffffff, roughness: 0.2 }), pupil = w.basic(0x1a1420);
    const eyes = [];
    for (const sx of [-1, 1]) {
      const e = new THREE.Group(); e.position.set(sx * 0.2, 1.0, 0.42); body.add(e);
      const ew = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), eyeW); ew.scale.z = 0.6; e.add(ew);
      const pu = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), pupil); pu.position.set(0, -0.01, 0.08); e.add(pu);
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), w.basic(0xffffff)); sh.position.set(0.03, 0.03, 0.12); e.add(sh);
      eyes.push(e);
    }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 16, Math.PI), w.basic(0x5a2a2a)); mouth.position.set(0, 0.84, 0.48); mouth.rotation.z = Math.PI; body.add(mouth);
    for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 10), skin); ear.position.set(sx * 0.32, 1.28, 0); ear.rotation.z = -sx * 0.5; body.add(ear); }
    const feet = [];
    for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), skin); f.scale.set(1, 0.6, 1.3); f.position.set(sx * 0.25, 0.1, 0.08); f.castShadow = true; grp.add(f); feet.push(f); }
    const arms = [];
    for (const sx of [-1, 1]) { const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.28, 4, 8), skin); a.position.set(sx * 0.55, 0.72, 0.05); a.rotation.z = sx * 0.6; body.add(a); arms.push(a); }
    // canasta a la espalda con piedras de colores
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.5, 14, 1, true), w.std({ color: 0x8a5a32, roughness: 0.9, side: THREE.DoubleSide })); basket.position.set(0, 0.95, -0.48); basket.rotation.x = -0.25; body.add(basket);
    const cols = [0xe8a25a, 0x7fc0e8, 0xe86a8a, 0x9ad86a, 0xf2d070];
    for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), w.std({ color: cols[i % 5], roughness: 0.3 })); s.position.set((i % 3 - 1) * 0.15, 1.22 + (i > 2 ? 0.08 : 0), -0.5 + (i > 2 ? 0.08 : -0.06)); body.add(s); }
    grp.add(w.blob(0.6));
    return { grp, body, eyes, feet, arms };
  }
  animTilo(o, t, look) {
    const g = this.g, hop = g.fx.tiloSalta;
    o.body.position.y = Math.abs(Math.sin(t * 2.2)) * 0.04 + Math.sin(Math.min(1, hop) * Math.PI) * 0.5;
    o.body.rotation.z = Math.sin(t * 1.4) * 0.05;
    const blink = (t % 3.4) < 0.12 ? 0.1 : 1; o.eyes.forEach(e => (e.scale.y = blink));
    if (look) o.grp.rotation.y = Math.atan2(look.x - o.grp.position.x, look.z - o.grp.position.z);
    o.arms.forEach((a, i) => (a.rotation.x = Math.sin(t * 3 + i) * 0.3 - (g.dialog && g.dialog.who === 'tilo' ? 0.8 : 0)));
  }

  // ---------- el recolector descompuesto ----------
  buildRecolector() {
    const w = this.w, s = this.g.L.spots.recolector;
    const grp = this.recolector = new THREE.Group(); grp.position.set(s.x, 0, s.z); w.scene.add(grp);
    const body = w.std({ color: 0xd88a3a, metalness: 0.5, roughness: 0.45, map: w.tex.metal });
    const b = new THREE.Mesh(new RoundedBoxGeometry(7.6, 2.8, 3.6, 3, 0.25), body); b.position.y = 1.9; b.castShadow = b.receiveShadow = true; grp.add(b);
    for (const sx of [-1, 1]) { const tr = new THREE.Mesh(new RoundedBoxGeometry(1.2, 1, 4.2, 3, 0.3), this.mats.oscuro); tr.position.set(sx * 3.2, 0.5, 0); tr.castShadow = true; grp.add(tr); }
    const mouth = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 1.2, 20, 1, true), w.std({ color: 0x3a3030, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4 })); mouth.rotation.x = Math.PI / 2; mouth.position.set(0, 1.9, 2.2); grp.add(mouth);
    const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 1.6, 12), this.mats.oscuro); chim.position.set(2.4, 4, -0.6); grp.add(chim);
    this.recolLuces = [];
    for (const sx of [-2.6, -1.3, 1.3, 2.6]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), w.basic(0xff4a3a, { toneMapped: false })); l.position.set(sx, 3.1, 1.82); grp.add(l); this.recolLuces.push(l); }
    this.recolChim = chim;
  }

  // ---------- estación: núcleo, tablero de llegadas, puerta de salida ----------
  buildEstacion() {
    const w = this.w, L = this.g.L, s = L.spots.nucleo;
    const grp = this.nucleo = new THREE.Group(); grp.position.set(s.x, 0, s.z); w.scene.add(grp);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 1.1, 12), this.mats.estacion); ped.position.y = 0.55; ped.castShadow = ped.receiveShadow = true; grp.add(ped);
    this.nucleoM = w.nacar({ emissive: 0x5ae0ff, emissiveIntensity: 0.2 });
    this.nucleoOrb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 16), this.nucleoM); this.nucleoOrb.position.y = 1.6; grp.add(this.nucleoOrb);
    this.nucleoGlow = w.glow(0x5ae0ff, 3, 0, 1.6, 0, 0.2, grp);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ map: w.tex.llegadas, toneMapped: false }));
    board.position.set(0, 9.5, -336.6); w.scene.add(board);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.4, 0.3), this.mats.oscuro); frame.position.set(0, 9.5, -336.8); w.scene.add(frame);
    const sal = L.salida;
    this.salidaMesh = new THREE.Mesh(new THREE.BoxGeometry(sal.x1 - sal.x0, sal.y1 - sal.y0, 0.6), w.M.reja[0]);
    this.salidaMesh.position.set(0, (sal.y0 + sal.y1) / 2, (sal.z0 + sal.z1) / 2); this.salidaMesh.castShadow = true; w.scene.add(this.salidaMesh);
  }

  // ---------- el Guardián de la Estación ----------
  buildGuardian() {
    const w = this.w, g = this.g;
    const grp = this.guardian = new THREE.Group(); grp.scale.setScalar(1.15); w.scene.add(grp); grp.visible = false;
    const piedra = w.std({ color: 0xd8d0c8, roughness: 0.55, map: w.tex.ruina });
    const metal = w.std({ color: 0x6a7488, metalness: 0.85, roughness: 0.3, map: w.tex.metal });
    this.gMats = [piedra, metal];
    const base = new THREE.Mesh(new RoundedBoxGeometry(1.9, 0.6, 1.5, 3, 0.15), metal); base.position.y = 0.3; grp.add(base);
    const torso = new THREE.Mesh(new RoundedBoxGeometry(2.0, 1.4, 1.4, 4, 0.3), piedra); torso.position.y = 1.3; grp.add(torso);
    this.gCoreM = w.nacar({ emissive: 0x5ae0ff, emissiveIntensity: 0.6 });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 16), this.gCoreM); core.position.set(0, 1.35, 0.68); grp.add(core);
    this.gCoreGlow = w.glow(0x5ae0ff, 2.4, 0, 1.35, 0.8, 0.6, grp);
    const head = new THREE.Group(); head.position.y = 2.25; grp.add(head); this.gHead = head;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.12, 12, 32), metal); head.add(ring);
    this.gEyeM = w.basic(0x9ff0ff, { toneMapped: false });
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), this.gEyeM); head.add(eye);
    this.gArms = [];
    for (const sx of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(sx * 1.25, 1.75, 0); grp.add(arm);
      const up = new THREE.Mesh(new RoundedBoxGeometry(0.55, 1.1, 0.55, 2, 0.12), piedra); up.position.y = -0.45; arm.add(up);
      const fist = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.6, 0.75, 2, 0.15), metal); fist.position.y = -1.15; arm.add(fist);
      this.gArms.push(arm);
    }
    grp.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.gStars = [0, 1, 2].map(() => w.glow(0xffe680, 0.5, 0, 0, 0, 0.9, grp));
    grp.add(w.blob(1.2));
    // células de energía (lo que se le devuelve con el giro)
    const cg = new THREE.CapsuleGeometry(0.18, 0.3, 6, 12), cm = w.nacar({ emissive: 0x5ae0ff, emissiveIntensity: 1.2 });
    const ringG = new THREE.RingGeometry(0.45, 0.6, 32); ringG.rotateX(-Math.PI / 2);
    this.shotMeshes = g.boss.shots.items.map(() => {
      const s = new THREE.Mesh(cg, cm), r = new THREE.Mesh(ringG, w.basic(0x5ae0ff, { transparent: true, opacity: 0.7, depthWrite: false }));
      s.castShadow = true; w.scene.add(s); w.scene.add(r); s.visible = r.visible = false;
      w.glow(0x5ae0ff, 1.4, 0, 0, 0, 0.6, s);
      return { s, r };
    });
    this.bossDrones = g.boss.formas.map(() => { const d = w.makeDron(); d.grp.visible = false; d.shadow.visible = false; return d; });
  }

  // ---------- Lunex: proyección geométrica en el cielo ----------
  buildLunex() {
    const w = this.w, grp = this.lunex = new THREE.Group(); w.scene.add(grp); grp.visible = false;
    this.lunexMats = [];
    // tinta azul profunda: se lee sobre la pared blanca de la reconfiguración
    const add = (geo, color, opacity) => { const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false }); this.lunexMats.push([m, opacity]); const mesh = new THREE.Mesh(geo, m); grp.add(mesh); return mesh; };
    this.lunexRings = [add(new THREE.TorusGeometry(6, 0.16, 6, 96), 0x3a4ad8, 0.9), add(new THREE.TorusGeometry(4.6, 0.12, 6, 96), 0x2a9ad8, 0.85), add(new THREE.TorusGeometry(7.6, 0.1, 6, 96), 0x8a4ad8, 0.7)];
    this.lunexEye = add(new THREE.OctahedronGeometry(1.6, 0), 0x1a2470, 0.85);
    add(new THREE.RingGeometry(0.5, 1.0, 32), 0x5ae0ff, 0.95);
    const g = w.glow(0xd8e8ff, 22, 0, 0, 0, 0.35, grp); this.lunexMats.push([g.material, 0.35]);
  }
  // ---------- la señal hacia Vértice ----------
  buildSenal() {
    const w = this.w, s = this.g.L.spots.senal;
    const grp = this.senal = new THREE.Group(); grp.position.set(s.x, 0, s.z); w.scene.add(grp);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 1.2, 16), this.mats.ruina); ped.position.y = 0.6; ped.castShadow = ped.receiveShadow = true; grp.add(ped);
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), this.cristalM(1)); orb.position.y = 2.2; grp.add(orb); this.senalOrb = orb;
    this.beamM = new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.2, 200, 24, 1, true), this.beamM); beam.position.y = 100; grp.add(beam);
    this.senalRings = [0, 1, 2].map(i => { const r = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.06, 6, 48), new THREE.MeshBasicMaterial({ color: 0xffd8f0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); r.rotation.x = Math.PI / 2; grp.add(r); return r; });
  }
  // ---------- la estación se reconfigura (pared de la huida) ----------
  buildReconfiguracion() {
    const w = this.w;
    this.wall = new THREE.Group(); w.scene.add(this.wall); this.wall.visible = false;
    const solid = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), new THREE.MeshBasicMaterial({ color: 0xf4eefc, side: THREE.DoubleSide, fog: false }));
    solid.position.z = 0.8; this.wall.add(solid);
    const grid = w.tex.rejilla; grid.repeat.set(10, 7);
    this.wallGrid = new THREE.MeshBasicMaterial({ map: grid, color: 0xb89aff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const gm = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), this.wallGrid); gm.position.z = -0.2; this.wall.add(gm);
    this.wallCubes = [];
    const cm = w.nacar({ emissive: 0xb89aff, emissiveIntensity: 0.8 });
    for (let i = 0; i < 14; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), cm); c.userData = { x: (Math.random() - 0.5) * 9, y: Math.random() * 6, s: 0.5 + Math.random() }; this.wall.add(c); this.wallCubes.push(c); }
  }

  // =====================================================================
  draw(t, dt, px, py, pz) {
    const g = this.g, fx = g.fx, L = g.L, w = this.w;
    for (const r of this.anillos) { r.rotation.x = Math.PI / 2 + Math.sin(t * 0.3 + r.position.z) * 0.25; r.rotation.y = t * 0.15; }
    // cápsula: la pantalla se enciende en la apertura
    this.pantallaM.opacity = 0.25 + fx.pantalla * (0.7 + Math.sin(t * 9) * 0.05); this.pantallaGlow.material.opacity = 0.1 + fx.pantalla * 0.4;
    // Tilo
    const pp = { x: px, z: pz };
    this.tiloA.grp.visible = !fx.tiloFinal && pz > -140 && pz < L.spots.tilo.z + 30;
    if (this.tiloA.grp.visible) this.animTilo(this.tiloA, t, Math.abs(pz - L.spots.tilo.z) < 16 ? pp : null);
    this.tiloB.grp.visible = !!fx.tiloFinal;
    if (this.tiloB.grp.visible) this.animTilo(this.tiloB, t, pp);
    // recolector: se aparta al repararse
    const k = fx.recolector, e = k * k * (3 - 2 * k);
    this.recolector.position.x = L.spots.recolector.x + e * 7.4;
    this.recolector.rotation.z = k > 0 ? Math.sin(t * 20) * 0.01 * (1 - e) : 0.03;
    for (const l of this.recolLuces) l.material.color.setHex(k > 0.4 ? 0x6affb8 : (Math.sin(t * 3) > 0 ? 0xff4a3a : 0x601010));
    if (Math.random() < dt * (k > 0 ? 6 : 2) && pz > -140) {
      const c = this.recolChim.getWorldPosition(w.tmpV);
      g.particles.spawn(o => { o.x = c.x; o.y = c.y + 0.9; o.z = c.z; o.vx = 0.2; o.vy = 1.4; o.vz = 0; o.life = o.max = 1.6; o.g = 0; o.drag = 0.4; o.r = k > 0 ? 0.7 : 0.35; o.gg = k > 0 ? 0.7 : 0.3; o.b = k > 0 ? 0.75 : 0.32; o.size = 3; });
    }
    // núcleo
    this.nucleoM.emissiveIntensity = 0.2 + fx.nucleo * (1.4 + Math.sin(t * 4) * 0.3); this.nucleoGlow.material.opacity = 0.15 + fx.nucleo * 0.6;
    this.nucleoOrb.position.y = 1.6 + Math.sin(t * 2) * 0.06; this.nucleoOrb.rotation.y = t;
    this.salidaMesh.visible = fx.salida < 1; this.salidaMesh.position.y = (L.salida.y0 + L.salida.y1) / 2 + fx.salida * 7;
    this.drawGuardian(t);
    // Lunex en el cielo, delante de la cámara de la huida
    const lx = fx.lunex;
    this.lunex.visible = lx > 0;
    if (this.lunex.visible) {
      // se proyecta sobre la pared que se reconfigura detrás de DIP (lo que ve la cámara de la huida)
      if (g.chase.on) { this.lunex.position.set(0, 4.4 + Math.sin(t * 0.8) * 0.2, g.chase.z - 0.7); this.lunex.scale.setScalar(0.55); }
      else { this.lunex.position.set(0, 13 + Math.sin(t * 0.8) * 0.4, pz + 26); this.lunex.scale.setScalar(1); }
      this.lunex.lookAt(w.camera.position);
      this.lunexRings[0].rotation.set(t * 0.4, 0, 0); this.lunexRings[1].rotation.set(0, t * 0.6, 0); this.lunexRings[2].rotation.set(t * 0.2, t * 0.3, 0);
      this.lunexEye.rotation.set(t * 0.3, t * 0.5, 0); this.lunexEye.scale.setScalar(1 + Math.sin(t * 3) * 0.05);
      const flick = 0.85 + Math.sin(t * 37) * 0.1;
      for (const [m, o] of this.lunexMats) m.opacity = o * lx * flick;
    }
    // señal
    const s = fx.senal;
    this.beamM.opacity = s > 0 ? Math.min(0.55, s * 0.8) : 0;
    this.senalOrb.rotation.y = t * (s > 0 ? 4 : 1); this.senalOrb.position.y = 2.2 + (s > 0 ? s * 1.2 : 0) + Math.sin(t * 2) * 0.1;
    this.senalRings.forEach((r, i) => { const q = s > 0 ? ((t * 0.5 + i / 3) % 1) : 0; r.position.y = 2 + q * 30; r.scale.setScalar(1 + q * 2); r.material.opacity = s > 0 ? (1 - q) * 0.7 : 0; });
    // pared de reconfiguración
    const ch = g.chase;
    this.wall.visible = ch.on;
    if (ch.on) {
      this.wall.position.set(0, 4, ch.z - 0.2);
      this.wallGrid.opacity = 0.45 + Math.sin(t * 9) * 0.15; this.wallGrid.map.offset.y = t * 0.3;
      for (const c of this.wallCubes) { const u = c.userData; c.position.set(u.x, u.y + Math.sin(t * u.s * 3) * 0.6, -0.8 - Math.abs(Math.sin(t * u.s * 2 + u.x)) * 1.6); c.rotation.set(t * u.s, t * u.s * 1.3, 0); }
    }
  }

  drawGuardian(t) {
    const g = this.g, b = g.boss, m = this.guardian, fx = g.fx;
    m.visible = (fx.guardianSube > 0 || b.active || b.defeated) && g.mode === 'juego';
    if (!m.visible) { for (const sm of this.shotMeshes) sm.s.visible = sm.r.visible = false; for (const d of this.bossDrones) d.grp.visible = d.shadow.visible = false; return; }
    const rise = b.active || b.defeated ? 1 : fx.guardianSube, er = 1 - Math.pow(1 - rise, 3);
    m.position.set(b.x, b.y - 4 * (1 - er), b.z);
    const p = g.player.pos;
    if (b.active) m.rotation.y = Math.atan2(p.x - b.x, p.z - b.z);
    const charge = b.charge > 0 ? 1 - b.charge / 0.8 : 0, off = b.off;
    // brazos: arriba al cargar, abajo al golpear; caídos al desactivarse
    for (const [i, a] of this.gArms.entries()) a.rotation.x = off > 0 ? 0.4 * off : charge > 0 ? -2.4 * charge : b.phase === 3 ? Math.sin(t * 3 + i) * 0.3 : -0.2 + Math.sin(t * 1.5 + i) * 0.08;
    this.gHead.rotation.set(off * 0.6, 0, Math.sin(t * 0.8) * 0.05);
    m.rotation.x = off * 0.15;
    const flash = b.flash > 0 && Math.sin(t * 50) > 0;
    for (const mm of this.gMats) mm.emissive.setHex(flash ? 0xffffff : 0x000000);
    const coreI = off > 0 ? 0.6 * (1 - off) : 0.6 + charge * 2.4 + (b.stun > 0 ? Math.sin(t * 20) : 0);
    this.gCoreM.emissiveIntensity = coreI; this.gCoreGlow.material.opacity = 0.2 + Math.min(1, coreI / 2) * 0.6;
    this.gEyeM.color.setHex(off > 0.5 ? 0x1a2a30 : charge > 0 ? 0xff6a4a : b.stun > 0 ? 0xffd36a : 0x9ff0ff);
    this.gStars.forEach((s, i) => { s.visible = b.stun > 0 && b.active; const a = t * 5 + i * 2.1; s.position.set(Math.cos(a) * 0.7, 3.0, Math.sin(a) * 0.7); });
    b.shots.items.forEach((o, i) => {
      const sm = this.shotMeshes[i], on = o.active && b.active;
      sm.s.visible = on; sm.r.visible = on && !o.landed && !o.back;
      if (!on) return;
      sm.s.position.set(o.x, o.y + (o.landed && !o.back ? 0.25 + Math.abs(Math.sin(t * 6)) * 0.1 : 0), o.z); sm.s.rotation.set(o.landed ? Math.PI / 2 : t * 6, t * 3, 0);
      sm.r.position.set(o.tx, 0.03, o.tz); sm.r.scale.setScalar(0.8 + Math.sin(t * 12) * 0.1);
    });
    b.formas.forEach((f, i) => {
      const d = this.bossDrones[i]; d.grp.visible = d.shadow.visible = f.alive && b.active;
      if (!d.grp.visible) return;
      d.grp.position.set(f.x, 0.9 + Math.sin(t * 5 + i) * 0.1, f.z); d.grp.rotation.y = f.a; d.ring.rotation.z = t * 8;
      d.shadow.position.set(f.x, 0.03, f.z);
      d.sign.visible = f.duda > 0; if (d.sign.visible) { d.sign.material.map = this.w.tex.duda; d.sign.position.y = 0.95; }
      d.eyeMat.color.setHex(f.duda > 0 ? 0xffd36a : 0xff6a4a);
    });
  }
}
