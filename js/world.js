// world.js — Render 2.5D con three.js: diorama low-poly con luz, sombras y paralaje 3D real.
// Solo DIP y Tilo son pixel art (planos con su sprite sheet). draw() solo LEE el estado del juego.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeTextures, worldUV } from './textures.js';

const FOV = 34;
const Z_SPRITE = 44;
const HEX = (h) => new THREE.Color(h);

// Clima y luz por zona (la transición entre zonas es suave)
const ENV = {
  titulo: { bg: 0xefe7d6, fog: 0xe9dfcb, near: 700, far: 5200, hs: 0xfff6e4, hg: 0x8d8578, hi: 0.71, sun: 0xfff1c9, si: 2.03, dust: 0, violet: 0, sky: 1, glow: 0 },
  cielo: { bg: 0xefe7d6, fog: 0xe9dfcb, near: 900, far: 6000, hs: 0xfff6e4, hg: 0x8d8578, hi: 0.68, sun: 0xfff1c9, si: 1.89, dust: 0, violet: 0, sky: 1, glow: 0 },
  crater: { bg: 0xefe7d6, fog: 0xe8dcc6, near: 900, far: 7500, hs: 0xfff6e4, hg: 0x8d8578, hi: 0.71, sun: 0xfff0c4, si: 2.09, dust: 0.05, violet: 0, sky: 1, glow: 0 },
  llanura: { bg: 0xf0e8d6, fog: 0xe9dfc9, near: 900, far: 7500, hs: 0xfff7e6, hg: 0x8d8578, hi: 0.71, sun: 0xfff1c9, si: 2.16, dust: 0.1, violet: 0, sky: 1, glow: 0 },
  velo: { bg: 0xe7e3da, fog: 0xe4e0d6, near: 120, far: 1500, hs: 0xf6f3ec, hg: 0x8a867f, hi: 0.74, sun: 0xfff6dc, si: 1.28, dust: 0.55, violet: 0, sky: 1, glow: 0.4 },
  vision: { bg: 0xe9f5f9, fog: 0xdcedf3, near: 300, far: 2600, hs: 0xffffff, hg: 0x9fb8c4, hi: 0.99, sun: 0xffffff, si: 1.62, dust: 0, violet: 0, sky: 1, glow: 1 },
  santuario: { bg: 0x07080c, fog: 0x07080c, near: 380, far: 1500, hs: 0x5a8fa9, hg: 0x0a0a10, hi: 0.59, sun: 0x8fd8ff, si: 0.74, dust: 0.15, violet: 0, sky: 0, glow: 1 },
  estacion: { bg: 0x0b0c10, fog: 0x0b0c10, near: 380, far: 1500, hs: 0x95a2bd, hg: 0x15161c, hi: 0.59, sun: 0xcfe6ff, si: 0.81, dust: 0, violet: 0, sky: 0, glow: 0.6 },
  alarma: { bg: 0x14080c, fog: 0x14080c, near: 380, far: 1500, hs: 0xd08a9a, hg: 0x200a10, hi: 0.56, sun: 0xff9a8a, si: 0.94, dust: 0, violet: 0, sky: 0, glow: 0.6 },
  huida: { bg: 0x120a18, fog: 0x120a18, near: 380, far: 1500, hs: 0xb98ad6, hg: 0x200a14, hi: 0.59, sun: 0xff9a9a, si: 0.94, dust: 0.1, violet: 0, sky: 0, glow: 0.8 },
  final: { bg: 0xdccbd6, fog: 0xd8c6d2, near: 900, far: 7500, hs: 0xf5e6ef, hg: 0x6d6070, hi: 0.65, sun: 0xffd9c9, si: 1.69, dust: 0.05, violet: 1, sky: 1, glow: 0.3 }
};

const MAT = {
  costra: { top: 0xece7db, side: 0xd3cbb9, front: 0xded6c5 },
  roca: { top: 0xcbc3b1, side: 0xa69e8c, front: 0xb3ab99 },
  piedra: { top: 0xdcd4c4, side: 0xb8af9c, front: 0xc8bfad },
  placa: { top: 0xe2dbcb, side: 0xb3ab98, front: 0xc4bba8 },
  placa_eco: { top: 0x34405e, side: 0x1c2232, front: 0x26304a, edge: 0x7fd0ec },
  placa_metal: { top: 0x5a606c, side: 0x353a44, front: 0x454b56, edge: 0xff8a8a },
  metal: { top: 0x7a808c, side: 0x565b66, front: 0x6a707c },
  santuario: { top: 0x1f222c, side: 0x101217, front: 0x161820, edge: 0x3d8fb0 },
  estacion: { top: 0x3b414d, side: 0x23272f, front: 0x2c313a, edge: 0x6fbfe6 },
  puerta: { top: 0x58607a, side: 0x3a4152, front: 0x4b5368, edge: 0x9fe0ff }
};

export class World {
  constructor(canvas, game, assets) {
    this.g = game; this.assets = assets;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.localClippingEnabled = true;
    this.mobile = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 10, 12000);
    this.scene.fog = new THREE.Fog(0xe9dfcb, 600, 4200);
    this.scene.background = new THREE.Color(0xefe7d6);
    this.env = {}; this.envInit = false;
    this.t = 0;
    this.mats = {};
    this.tmpV = new THREE.Vector3(); this.tmpC = new THREE.Color();
    this.tex = makeTextures(r);
    this.buildEnvMaps();
    this.setupLights();
    this.buildSky();
    this.buildTerrain();
    this.buildDecor();
    this.buildDynamic();
    this.buildSprites();
    this.buildFx();
  }

  // ---------- helpers ----------
  lam(color, o = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, flatShading: true, envMapIntensity: 0.5, ...o }); }
  phong(color, o = {}) { const { specular, shininess, ...rest } = o; return new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.25, flatShading: true, ...rest }); }
  basic(color, o = {}) { return new THREE.MeshBasicMaterial({ color, ...o }); }
  glass() { return this.mats.glass || (this.mats.glass = new THREE.MeshStandardMaterial({ color: 0x050608, roughness: 0.05, metalness: 0.05, envMapIntensity: 1.2, flatShading: true })); }
  crystalMat() { return this.mats.crystal || (this.mats.crystal = new THREE.MeshStandardMaterial({ color: 0x9adff4, emissive: 0x2a9fc8, emissiveIntensity: 0.9, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.9, flatShading: true })); }
  glowSprite(color, size, x, gy, z, opacity = 0.7, parent) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.glow, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.set(size, size, 1); s.position.set(x, -gy, z); (parent || this.scene).add(s); return s;
  }
  add(geo, mat, x, gy, z, o = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, -gy, z);
    if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
    if (o.s) m.scale.setScalar(o.s); if (o.sx || o.sy || o.sz) m.scale.set(o.sx || 1, o.sy || 1, o.sz || 1);
    m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
    (o.parent || this.scene).add(m);
    return m;
  }
  canvasTex(w, h, draw, nearest = false) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; }
    t.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    t.colorSpace = THREE.SRGBColorSpace;
    t.userData.canvas = c;
    return t;
  }

  // Reflejos: un cielo marfil para el exterior y una sala oscura con luces azules para los interiores.
  buildEnvMaps() {
    const pm = new THREE.PMREMGenerator(this.renderer);
    const mk = (top, bottom, lights) => {
      const sc = new THREE.Scene();
      const geo = new THREE.SphereGeometry(100, 32, 16), cols = [];
      const a = HEX(top), b = HEX(bottom), c = new THREE.Color();
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { c.copy(b).lerp(a, Math.min(1, Math.max(0, p.getY(i) / 100 * 0.5 + 0.5))); cols.push(c.r, c.g, c.b); }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      sc.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
      for (const [x, y, z, s, col] of lights) { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 12, 8), new THREE.MeshBasicMaterial({ color: col })); m.position.set(x, y, z); sc.add(m); }
      const rt = pm.fromScene(sc, 0.02); return rt.texture;
    };
    this.envExterior = mk(0xfaf4e6, 0x9a9184, [[-40, 60, -60, 14, 0xffffff]]);
    this.envInterior = mk(0x1a2230, 0x05060a, [[-60, 20, -40, 10, 0x6fbfe6], [60, 30, -50, 8, 0x3d8fb0], [0, 70, 0, 12, 0x9fe0ff]]);
    this.scene.environment = this.envExterior;
    pm.dispose();
  }

  setupLights() {
    this.hemi = new THREE.HemisphereLight(0xfff6e4, 0x8d8578, 1.1);
    this.scene.add(this.hemi);
    const s = this.sun = new THREE.DirectionalLight(0xfff1c9, 1.5);
    s.castShadow = true;
    s.shadow.mapSize.set(this.mobile ? 1024 : 2048, this.mobile ? 1024 : 2048);
    const c = s.shadow.camera; c.left = -720; c.right = 720; c.top = 520; c.bottom = -520; c.near = 10; c.far = 3000;
    s.shadow.bias = -0.0005; s.shadow.normalBias = 0.8; s.shadow.radius = 3;
    this.scene.add(s); this.scene.add(s.target);
  }

  // ---------- cielo marfil, sol pálido y tres anillos ----------
  buildSky() {
    const sky = this.sky = new THREE.Group(); this.scene.add(sky);
    this.skyUniforms = { top: { value: HEX(0xf6efe0) }, hor: { value: HEX(0xe7dac0) }, vio: { value: HEX(0x5b3f7a) }, violet: { value: 0 } };
    this.skyDome = new THREE.Mesh(new THREE.SphereGeometry(9000, 32, 16), new THREE.ShaderMaterial({
      uniforms: this.skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 vio; uniform float violet; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.05,0.0,1.0); vec3 c = mix(hor, top, smoothstep(0.0,1.0,h)); c = mix(c, vio, violet*0.8*(1.0-smoothstep(0.0,0.55,h))); gl_FragColor = vec4(c,1.0); }'
    }));
    this.skyDome.renderOrder = -10;
    this.scene.add(this.skyDome);
    // sol pálido con halo y neblina mineral
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.glow, color: 0xffffff, transparent: true, depthWrite: false, fog: false }));
    sun.scale.set(900, 900, 1); sun.position.set(-1500, 1500, -5400); sky.add(sun);
    const core = new THREE.Mesh(new THREE.CircleGeometry(230, 64), this.basic(0xfffcf4, { fog: false })); core.position.set(-1500, 1500, -5450); sky.add(core);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.glow, color: 0xfff6e0, transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
    halo.scale.set(2600, 2600, 1); halo.position.set(-1500, 1500, -5500); sky.add(halo);
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3400 - i * 500, 260 + i * 80), new THREE.MeshBasicMaterial({ map: this.tex.neblina, color: 0xf3ecdf, transparent: true, opacity: 0.75 - i * 0.12, depthWrite: false, fog: false }));
      m.position.set(-1300 + i * 300, 1360 + i * 150, -5300 + i * 20); sky.add(m);
    }
    this.sunDisc = core;
    // tres anillos planetarios: bandas de partículas con huecos
    this.ringsMat = new THREE.MeshBasicMaterial({ map: this.tex.anillos, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, color: 0xffffff });
    const rings = new THREE.Mesh(new THREE.PlaneGeometry(4600, 4600), this.ringsMat);
    rings.position.set(900, 520, -5000); rings.rotation.set(-1.28, 0.12, 0.2); sky.add(rings);
    this.ringMats = [{ m: this.ringsMat, base: HEX(0xffffff) }];
    // cordillera lejana y la estructura circular parcialmente enterrada (visible desde el inicio)
    const far = new THREE.MeshStandardMaterial({ color: 0x1d1e24, roughness: 0.35, metalness: 0.2, flatShading: true });
    for (let i = 0; i < 16; i++) {
      const h = 700 + ((i * 7919) % 900), x = -3200 + i * 430 + ((i * 37) % 120);
      const m = new THREE.Mesh(this.mountainGeo(320 + (i % 3) * 90, h, i), far);
      m.position.set(x, -200, -3600 - (i % 4) * 120); m.rotation.y = i * 0.7; sky.add(m);
    }
    const sx = 700, sy = 420, sz = -3150;
    const peak = new THREE.Mesh(this.mountainGeo(520, 1100, 99), far); peak.position.set(sx, -390, sz - 120); sky.add(peak);
    this.structMat = new THREE.MeshStandardMaterial({ color: 0x2a2c34, roughness: 0.25, metalness: 0.6, emissive: 0x000000 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(170, 34, 16, 64), this.structMat);
    ring.position.set(sx, sy, sz); ring.rotation.set(0.15, 0.4, 0.3); sky.add(ring);
    this.structPos = new THREE.Vector3(sx, sy, sz);
    // señal final: haz y ruta luminosa
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(12, 26, 4200, 24, 1, true), this.basic(0xdff6ff, { fog: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.beam.position.set(sx, sy + 2100, sz); sky.add(this.beam);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx, sy + 60, sz), new THREE.Vector3(sx + 500, sy + 240, sz - 100),
      new THREE.Vector3(sx + 1200, sy + 320, sz - 250), new THREE.Vector3(sx + 1900, sy + 280, sz - 400)
    ]);
    this.routeGeo = new THREE.TubeGeometry(curve, 80, 8, 4, false);
    this.route = new THREE.Mesh(this.routeGeo, this.basic(0xbfeaf7, { fog: false, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.route.geometry.setDrawRange(0, 0); sky.add(this.route);
    this.routeDot = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.glow, color: 0xdff6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.routeDot.scale.set(240, 240, 1); this.routeDot.material.opacity = 0;
    this.routeDot.position.copy(curve.getPoint(1)); sky.add(this.routeDot);
    // cápsula del intro (cae detrás de una montaña negra)
    this.meteor = new THREE.Group();
    const hull = new THREE.MeshStandardMaterial({ color: 0xc9cfd8, roughness: 0.35, metalness: 0.6 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(24, 50, 8, 20), hull);
    body.rotation.z = Math.PI / 2; this.meteor.add(body);
    this.meteorWin = this.basic(0x7fd0ec, { fog: false });
    const win = new THREE.Mesh(new THREE.CircleGeometry(9, 24), this.meteorWin); win.position.set(-5, 6, 25); this.meteor.add(win);
    const fire = new THREE.Mesh(new THREE.ConeGeometry(40, 300, 24, 1, true), this.basic(0xfff1c9, { fog: false, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    fire.rotation.z = Math.PI / 2; fire.position.x = 170; this.meteor.add(fire);
    this.glowSprite(0xfff1c9, 260, 40, 0, 0, 0.9, this.meteor);
    this.meteorBits = [];
    for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 6), hull); this.meteor.add(b); this.meteorBits.push(b); }
    this.meteor.visible = false; this.scene.add(this.meteor);
  }

  // Montaña de vidrio negro: facetas lisas y cortes demasiado regulares
  mountainGeo(r, h, seed) {
    const sides = 5 + (seed % 3);
    const g = new THREE.CylinderGeometry(r * (0.08 + (seed % 4) * 0.03), r, h, sides, 1);
    g.translate(0, h / 2, 0);
    if (seed % 2) g.rotateZ(0.04 * ((seed % 5) - 2));
    return g.toNonIndexed();
  }

  // ---------- sólidos del nivel + suelo lejano + montañas negras ----------
  buildTerrain() {
    const L = this.g.L, T = this.tex;
    this.solidMeshes = new Map();
    const std = (o) => new THREE.MeshStandardMaterial({ envMapIntensity: 0.45, ...o });
    const base = {
      costra: () => std({ color: 0xffffff, map: T.costra, bumpMap: T.costraBump, bumpScale: 2.5, roughness: 0.93 }),
      roca: () => std({ color: 0xffffff, map: T.roca, bumpMap: T.roca, bumpScale: 3, roughness: 0.9 }),
      piedra: () => std({ color: 0xffffff, map: T.piedra, bumpMap: T.piedra, bumpScale: 1.5, roughness: 0.7 }),
      placa: () => std({ color: 0xf2ece0, map: T.costra, bumpMap: T.costraBump, bumpScale: 4, roughness: 0.95 }),
      placa_eco: () => std({ color: 0x5a6a90, map: T.santuario, emissiveMap: T.santuarioLuz, emissive: 0x7fd0ec, emissiveIntensity: 1, roughness: 0.3, metalness: 0.2 }),
      placa_metal: () => std({ color: 0xb08a9a, map: T.metal, roughness: 0.4, metalness: 0.6 }),
      metal: () => std({ color: 0xc9d0dc, map: T.metal, roughness: 0.38, metalness: 0.65 }),
      santuario: () => std({ color: 0xffffff, map: T.santuario, emissiveMap: T.santuarioLuz, emissive: 0x3d8fb0, emissiveIntensity: 0.9, roughness: 0.32, metalness: 0.25 }),
      estacion: () => std({ color: 0xffffff, map: T.metal, emissiveMap: T.metalLuz, emissive: 0x6fbfe6, emissiveIntensity: 0.8, roughness: 0.42, metalness: 0.55 }),
      puerta: () => std({ color: 0xc9d4ea, map: T.metal, emissiveMap: T.metalLuz, emissive: 0x9fe0ff, emissiveIntensity: 1.2, roughness: 0.3, metalness: 0.7 })
    };
    const matCache = {};
    const mats = (name) => {
      if (name === 'vidrio') return this.glass();
      return matCache[name] || (matCache[name] = (base[name] || base.costra)());
    };
    const anchorSolids = new Set(L.anchors.flatMap(a => a.solids));
    const phaseSolids = new Set(L.phases.map(p => p.s));
    for (const s of L.solids) {
      if (s.invisible || s.pushable) continue;
      const d = s.zf - s.zb, cx = s.x + s.w / 2, cy = -(s.y + s.h / 2), cz = (s.zf + s.zb) / 2;
      const rad = Math.min(5, s.h / 3, s.w / 3, d / 3);
      const geo = rad > 1.5 ? new RoundedBoxGeometry(s.w, s.h, d, 2, rad) : new THREE.BoxGeometry(s.w, s.h, d);
      worldUV(geo, cx, cy, cz);
      let mat;
      if (phaseSolids.has(s)) {
        const col = s.mat === 'eco' ? 0x7fd0ec : 0x9fe0ff;
        mat = this.basic(col, { transparent: true, opacity: 0.75 });
      } else if (anchorSolids.has(s)) { mat = mats(s.mat).clone(); mat.transparent = true; mat.opacity = 0; mat.emissive = HEX(0x7fd0ec); mat.emissiveIntensity = 0; mat.emissiveMap = null; }
      else mat = mats(s.mat);
      const m = this.add(geo, mat, cx, s.y + s.h / 2, cz, { cast: s.h < 400 });
      const edgeCol = phaseSolids.has(s) ? 0xdff6ff : (anchorSolids.has(s) ? 0xbfeaf7 : null);
      if (edgeCol) {
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(s.w, s.h, d)), new THREE.LineBasicMaterial({ color: edgeCol, transparent: true, opacity: anchorSolids.has(s) ? 0 : 0.6 }));
        m.add(e); m.userData.edges = e;
      }
      this.solidMeshes.set(s, m);
    }
    // suelo lejano de la llanura y montañas negras con cortes demasiado lisos
    const farGeo = new THREE.PlaneGeometry(9000, 3200); farGeo.rotateX(-Math.PI / 2); worldUV(farGeo, 2300, 140, -2330, 1 / 400);
    const far = this.add(farGeo, mats('costra'), 2300, -140, -2330, { cast: false });
    const dark = new THREE.MeshStandardMaterial({ color: 0x0c0d11, roughness: 0.18, metalness: 0.05, flatShading: true, envMapIntensity: 0.9 });
    const mts = [[-500, -2100, 620], [500, -2500, 760], [1200, -1700, 640], [2100, -2300, 700], [2900, -1900, 560], [3600, -2500, 820], [4300, -2000, 600], [5100, -2400, 760], [-1300, -2600, 800]];
    mts.forEach(([x, z, h], i) => this.add(this.mountainGeo(h * 0.5, h, i + 1), dark, x, -140 + 10, z, { ry: i * 1.3, cast: false }));
    // pared trasera del cráter (une el fondo del cráter con la llanura)
    const wall = new RoundedBoxGeometry(1500, 150, 80, 2, 6); worldUV(wall, 255, 65, -770);
    this.add(wall, mats('costra'), 255, -65, -770, { cast: false });
    // dunas y piedras en el fondo cercano
    const dune = mats('costra');
    for (let i = 0; i < 26; i++) {
      const x = -200 + i * 200 + ((i * 53) % 90), z = -820 - (i % 5) * 140;
      const g = new THREE.SphereGeometry(80 + (i % 4) * 40, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); worldUV(g, x, 0, z);
      this.add(g, dune, x, -140, z, { sy: 0.25, ry: i, cast: false });
    }
  }

  buildDecor() {
    const L = this.g.L;
    this.glowers = []; this.lilies = []; this.pylonViz = []; this.refs = {};
    const stone = this.lam(0xd6cebd), stoneDark = this.lam(0xb3aa97), metal = this.lam(0x6d7380), tela = this.lam(0xa4895f);
    const dark = this.basic(0x2b2c33, { transparent: true, opacity: 0.35, depthWrite: false });
    const ellipse = new THREE.CircleGeometry(1, 12);
    for (const d of L.decor) {
      const { x, y, z } = d;
      switch (d.type) {
        case 'aguja': {
          const h = d.h || 160;
          this.add(new THREE.ConeGeometry(h * 0.11, h, 3), this.glass(), x, y - h / 2 + 4, z, { rz: ((x % 7) - 3) * 0.04, ry: x * 0.1 });
          this.add(new THREE.ConeGeometry(h * 0.07, h * 0.6, 3), this.glass(), x + h * 0.12, y - h * 0.3 + 4, z + 10, { rz: -0.2, ry: x });
          break;
        }
        case 'roca': this.add(new THREE.DodecahedronGeometry(d.r || 30, 0), this.lam(0xb9b19f), x, y + (d.r || 30) * 0.3, z, { sy: 0.7, ry: x }); break;
        case 'cristal': {
          const g = new THREE.Group(); g.position.set(x, -y, z); g.scale.setScalar(d.s || 1); this.scene.add(g);
          [[0, 26, 0, 1], [14, 14, 8, 0.7], [-12, 12, -6, 0.6]].forEach(([dx, dy, dz, s]) => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(16 * s, 0), this.crystalMat()); m.position.set(dx, dy, dz); m.scale.y = 1.8; m.rotation.z = dx * 0.02; g.add(m); });
          break;
        }
        case 'musgo': {
          const m = this.lam(0x1d2a2e, { emissive: 0x3fb0d8, emissiveIntensity: 0 });
          for (let i = 0; i < 5; i++) this.add(new THREE.BoxGeometry(10 + i * 3, 4, 8), m, x + i * 9 - 18, y - 2, z + (i % 2) * 6, { ry: i, cast: false });
          this.glowers.push({ x, y, m });
          break;
        }
        case 'capsula': {
          const g = new THREE.Group(); g.position.set(x, -y + 34, -6); g.rotation.z = -0.35; g.rotation.y = 0.25; g.scale.setScalar(1.6); this.scene.add(g);
          const hull = new THREE.MeshStandardMaterial({ color: 0xd3d8e0, roughness: 0.32, metalness: 0.7 }), trim = new THREE.MeshStandardMaterial({ color: 0x7d8594, roughness: 0.45, metalness: 0.6 });
          const b = new THREE.Mesh(new THREE.CapsuleGeometry(26, 56, 10, 28), hull); b.rotation.z = Math.PI / 2; b.castShadow = true; g.add(b);
          const band = new THREE.Mesh(new THREE.TorusGeometry(26.5, 2.5, 10, 40), trim); band.rotation.y = Math.PI / 2; band.position.x = -18; g.add(band);
          const n = new THREE.Mesh(new THREE.TorusGeometry(26.5, 2.5, 10, 40), trim); n.rotation.y = Math.PI / 2; n.position.x = 22; g.add(n);
          for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(26, 4, 34), trim); f.position.set(30, s * 24, 0); f.rotation.x = s * 0.5; g.add(f); }
          const hinge = new THREE.Group(); hinge.position.set(14, 24, 0); g.add(hinge);
          const hatch = new THREE.Mesh(new THREE.BoxGeometry(34, 4, 30), trim); hatch.position.set(-17, 2, 0); hinge.add(hatch);
          this.refs.hatch = hinge;
          this.refs.screenMat = this.basic(0x7fd0ec);
          const scr = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), this.refs.screenMat); scr.position.set(-10, 6, 31); g.add(scr);
          this.add(new THREE.CircleGeometry(110, 14), dark, x + 30, y - 1, 0, { rx: -Math.PI / 2, cast: false, receive: false });
          break;
        }
        case 'crater': {
          for (let i = 0; i < 9; i++) this.add(new THREE.DodecahedronGeometry(28 + (i % 3) * 16, 0), this.lam(0xc8bfac), x - 420 + i * 100, y + 6, -300 - (i % 3) * 60, { sy: 0.6, ry: i });
          break;
        }
        case 'muro_huella': {
          this.add(new THREE.BoxGeometry(80, 150, 14), this.glass(), x, y - 75, z);
          const fp = this.add(ellipse, this.basic(0x7fd0ec), x - 6, y - 70, z + 8, { cast: false, receive: false }); fp.scale.set(6, 10, 1);
          const fp2 = this.add(ellipse, this.basic(0x7fd0ec), x + 8, y - 78, z + 8, { cast: false, receive: false }); fp2.scale.set(3, 3, 1);
          break;
        }
        case 'losa': {
          this.add(new THREE.BoxGeometry(d.w, d.h, 10), this.glass(), x, y - d.h / 2, z);
          break;
        }
        case 'carpa': {
          this.add(new THREE.ConeGeometry(68, 82, 4), tela, x, y - 41, z, { ry: Math.PI / 4 });
          this.add(new THREE.PlaneGeometry(26, 40), this.basic(0x3a2f28), x, y - 20, z + 44, { cast: false });
          this.add(new THREE.BoxGeometry(30, 18, 20), this.lam(0x8c6b5d), x + 70, y - 9, z + 20);
          this.add(new THREE.CylinderGeometry(3, 3, 60, 5), metal, x - 70, y - 30, z + 10);
          break;
        }
        case 'planta': {
          const col = [0xd9b8c8, 0xc8d6b4, 0xe2cfa8][Math.abs(x) % 3];
          this.add(new THREE.CylinderGeometry(2, 3, 28, 5), this.lam(0x8c6b5d), x, y - 14, z);
          for (let i = 0; i < 3; i++) this.add(new THREE.IcosahedronGeometry(9 - i * 2, 0), this.lam(col), x + (i - 1) * 9, y - 30 - i * 8, z + i * 4);
          break;
        }
        case 'danio': {
          this.add(new THREE.CircleGeometry(80, 10), dark, x, y - 1, z, { rx: -Math.PI / 2, cast: false, receive: false });
          for (let i = 0; i < 4; i++) this.add(new THREE.IcosahedronGeometry(6, 0), this.lam(0x9f8f9a), x - 40 + i * 25, y - 4, z + 20 - i * 8);
          break;
        }
        case 'jardin_viejo': {
          this.add(new THREE.ConeGeometry(34, 40, 4), this.lam(0x8f8577), x - 50, y - 20, z, { ry: 0.5 });
          for (let i = 0; i < 3; i++) this.add(new THREE.BoxGeometry(4, 26, 4), metal, x + 10 + i * 12, y - 13, z + 20, { rz: 0.3 - i * 0.25 });
          for (let i = 0; i < 4; i++) { this.add(new THREE.IcosahedronGeometry(7, 0), this.lam(0xb8a8b4), x + 50 + i * 14, y - 7, z + 10); this.add(new THREE.IcosahedronGeometry(5, 0), this.lam(0xb8a8b4), x + 50 + i * 14, y - 18, z + 10); }
          break;
        }
        case 'recolector': {
          const g = new THREE.Group(); g.position.set(x, -y, 0); this.scene.add(g);
          const funnel = new THREE.Mesh(new THREE.ConeGeometry(30, 40, 6, 1, true), metal); funnel.position.set(0, 90, 0); funnel.rotation.x = Math.PI; g.add(funnel);
          const wheels = [];
          for (const wx of [-30, 30]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 10, 8), this.lam(0x3d4350)); w.rotation.x = Math.PI / 2; w.position.set(wx, 14, 46); g.add(w); wheels.push(w); }
          const lever = new THREE.Group(); lever.position.set(0, 40, 50); g.add(lever);
          const lb = new THREE.Mesh(new THREE.BoxGeometry(4, 34, 4), this.lam(0xc0392b)); lb.position.y = 17; lever.add(lb);
          lever.rotation.z = 0.6;
          this.refs.collector = { g, funnel, wheels, lever };
          break;
        }
        case 'marco': case 'portal': {
          const h = d.type === 'portal' ? 380 : 270, w = d.type === 'portal' ? 150 : 110;
          for (const s of [-1, 1]) this.add(new THREE.BoxGeometry(26, h, 70), stoneDark, x + s * w / 2, y - h / 2, -20);
          this.add(new THREE.BoxGeometry(w + 40, 30, 80), stone, x, y - h - 10, -20);
          if (d.type === 'portal') this.add(new THREE.BoxGeometry(w - 20, 8, 10), this.crystalMat(), x, y - h + 18, 20);
          break;
        }
        case 'vidrio_cristal': {
          this.add(new THREE.ConeGeometry(30, 90, 4), this.glass(), x + 10, y - 45, z - 10, { rz: -0.2 });
          const c = new THREE.Mesh(new THREE.OctahedronGeometry(12, 0), this.crystalMat()); c.scale.y = 1.6; c.position.set(x - 4, -(y - 28), z + 14); this.scene.add(c);
          this.refs.ruinCrystal = c;
          const orb = new THREE.Mesh(new THREE.SphereGeometry(8, 10, 8), this.basic(0xffffff, { transparent: true, opacity: 0.95 }));
          const halo = new THREE.Mesh(new THREE.SphereGeometry(18, 10, 8), this.basic(0xbfeaf7, { transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
          orb.add(halo); orb.visible = false; this.scene.add(orb); this.refs.orb = orb;
          break;
        }
        case 'extremo_puente': {
          const dx = d.dir;
          this.add(new THREE.BoxGeometry(40, 30, 90), stone, x + dx * 10, y + 15, -5);
          for (const pz of [-36, 30]) this.add(new THREE.BoxGeometry(6, 40, 6), stoneDark, x + dx * 18, y - 20, pz);
          break;
        }
        case 'inscripcion': {
          const tex = this.canvasTex(64, 96, (c, w, h) => {
            c.fillStyle = '#121318'; c.fillRect(0, 0, w, h); c.fillStyle = '#7fd0ec';
            for (let r = 0; r < 9; r++) for (let k = 0; k < 6; k++) if ((r * 7 + k * 3) % 5 < 3) c.fillRect(6 + k * 9, 8 + r * 9, 2 + ((r + k) % 3) * 2, 2 + (k % 2) * 3);
          });
          this.add(new THREE.BoxGeometry(60, 110, 14), [this.glass(), this.glass(), this.glass(), this.glass(), this.lam(0xffffff, { map: tex, emissive: 0x2a86a8, emissiveIntensity: 0.25 }), this.glass()], x, y - 55, z);
          break;
        }
        case 'estatua': {
          const g = new THREE.Group(); g.position.set(x, -y, z); this.scene.add(g);
          const s1 = new THREE.Mesh(new THREE.BoxGeometry(34, 22, 34), stoneDark); s1.position.y = 11; g.add(s1);
          const body = new THREE.Mesh(new THREE.CylinderGeometry(12, 18, 70, 6), stone); body.position.y = 57; g.add(body);
          const head = new THREE.Mesh(new THREE.IcosahedronGeometry(14, 0), stone); head.position.y = 104; g.add(head);
          [s1, body, head].forEach(m => { m.castShadow = false; });
          // la sombra no coincide con el cuerpo
          const sh = this.canvasTex(64, 64, (c) => {
            c.fillStyle = 'rgba(30,31,38,.55)';
            if (d.sombra === 'brazo') { c.fillRect(26, 8, 12, 50); c.fillRect(36, 10, 22, 8); c.beginPath(); c.arc(32, 8, 7, 0, 7); c.fill(); }
            else { c.fillRect(14, 10, 10, 48); c.fillRect(40, 10, 10, 48); c.beginPath(); c.arc(19, 8, 6, 0, 7); c.arc(45, 8, 6, 0, 7); c.fill(); }
          }, false);
          const shadow = new THREE.Mesh(new THREE.PlaneGeometry(90, 150), this.basic(0xffffff, { map: sh, transparent: true, depthWrite: false }));
          shadow.rotation.x = -Math.PI / 2; shadow.rotation.z = -0.9; shadow.position.set(x + 60, -y + 1, z + 40); this.scene.add(shadow);
          break;
        }
        case 'puerta_muro': {
          this.add(new THREE.BoxGeometry(160, 200, 24), stone, x, y - 100, z);
          this.add(new THREE.PlaneGeometry(50, 100), this.basic(0x2b2c33), x, y - 50, z + 13, { cast: false });
          const door = this.add(new THREE.BoxGeometry(48, 98, 4), stoneDark, x - 24, y - 50, z + 14);
          door.geometry.translate(24, 0, 0); door.rotation.y = -0.9;
          break;
        }
        case 'arco_flotante': {
          this.add(new THREE.TorusGeometry(110, 16, 4, 10, Math.PI), stone, x, y - 220, z);
          for (const s of [-1, 1]) this.add(new THREE.BoxGeometry(34, 100, 34), stoneDark, x + s * 110, y - 50, z);
          break;
        }
        case 'columna': {
          const h = d.h || 150;
          this.add(new THREE.CylinderGeometry(20, 22, h, 8), stone, x, y - h / 2, z);
          this.add(new THREE.CylinderGeometry(21, 21, 10, 8), this.glass(), x, y - h * 0.6, z);
          break;
        }
        case 'escalera_aire': {
          for (let i = 0; i < 7; i++) this.add(new THREE.BoxGeometry(46, 30 + i * 30, 70), stone, x + i * 46, y - (15 + i * 15), z);
          break;
        }
        case 'puente_roto': {
          for (const s of [-1, 1]) {
            this.add(new THREE.BoxGeometry(150, 26, 80), stone, x + s * 170, y - 220, z);
            this.add(new THREE.BoxGeometry(40, 220, 40), stoneDark, x + s * 230, y - 110, z);
          }
          break;
        }
        case 'lirio': {
          const g = new THREE.Group(); g.position.set(x, -y, z); this.scene.add(g);
          const st = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 26, 4), this.lam(0x5e6a6e)); st.position.y = 13; g.add(st);
          const petals = [];
          for (let i = 0; i < 5; i++) {
            const piv = new THREE.Group(); piv.position.y = 26; piv.rotation.y = i * 1.256; g.add(piv);
            const pm = new THREE.Mesh(new THREE.ConeGeometry(4, 16, 3), this.lam(0xe8eef2, { emissive: 0x7fd0ec, emissiveIntensity: 0.2 })); pm.position.y = 8; piv.add(pm);
            petals.push(piv);
          }
          this.lilies.push(petals);
          break;
        }
        case 'cristal_mudo': {
          const c = new THREE.Mesh(new THREE.OctahedronGeometry(16, 0), this.lam(0x7fd0ec, { emissive: 0x2a86a8, emissiveIntensity: 0.25, transparent: true, opacity: 0.85 }));
          c.scale.y = 1.7; c.position.set(x, -(y - 28), z); this.scene.add(c); this.refs.muteCrystal = c;
          break;
        }
        case 'dispositivo': this.buildDevice(d); break;
        case 'ascensor': {
          this.add(new THREE.BoxGeometry(70, 8, 70), metal, x, y - 4, z);
          for (const s of [-1, 1]) this.add(new THREE.BoxGeometry(8, 200, 8), this.lam(0x2a3a4a, { emissive: 0x3d8fb0, emissiveIntensity: 0.6 }), x + s * 36, y - 100, z - 20);
          break;
        }
        case 'fondo': {
          const tex = this.canvasTex(256, 96, (c, w, h) => {
            const t = d.tipo;
            c.fillStyle = t === 'santuario' ? '#0c0d12' : t === 'huida' ? '#1a1220' : '#1a1d24'; c.fillRect(0, 0, w, h);
            if (t === 'santuario') { c.fillStyle = '#1e5b76'; for (let i = 0; i < 70; i++) { const px = (i * 37) % w, py = (i * 53) % h; c.fillRect(px, py, 1 + (i % 3), 1); } c.fillStyle = '#16181f'; for (let i = 0; i < 8; i++) c.fillRect(i * 34, 0, 2, h); }
            else { c.strokeStyle = t === 'huida' ? '#3a2240' : '#2a303b'; for (let i = 0; i < w; i += 16) { c.beginPath(); c.moveTo(i + 0.5, 0); c.lineTo(i + 0.5, h); c.stroke(); } for (let j = 0; j < h; j += 24) { c.beginPath(); c.moveTo(0, j + 0.5); c.lineTo(w, j + 0.5); c.stroke(); } c.fillStyle = t === 'huida' ? '#7a3b5a' : '#4f8fb8'; for (let i = 0; i < 30; i++) c.fillRect((i * 41) % w, (i * 29) % h, 2, 1); }
          });
          tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(d.w / 600, 1);
          const m = this.add(new THREE.PlaneGeometry(d.w, d.h), this.lam(0xffffff, { map: tex }), x, y - d.h / 2 + 40, z, { cast: false });
          if (d.tipo === 'huida') this.refs.huidaBack = m;
          break;
        }
        case 'terminal': {
          const s = d.s || 1;
          this.add(new THREE.BoxGeometry(34 * s, 60 * s, 24), metal, x, y - 30 * s, z);
          const scr = this.lam(0x101418, { emissive: 0x6fbfe6, emissiveIntensity: 0.7 });
          this.add(new THREE.PlaneGeometry(26 * s, 18 * s), scr, x, y - 46 * s, z + 13, { cast: false });
          this.glowers.push({ x, y, m: scr, flicker: true });
          break;
        }
        case 'pantalla': {
          const tex = this.canvasTex(128, 80, (c, w, h) => {
            c.fillStyle = '#0d1a22'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2f6f8f'; c.strokeRect(2.5, 2.5, w - 5, h - 5);
            c.fillStyle = '#6fbfe6'; c.font = '8px monospace';
            if (d.img === 'nacar') {
              c.strokeStyle = '#6fbfe6'; c.beginPath(); c.arc(56, 42, 22, 0, 7); c.stroke();
              c.beginPath(); c.ellipse(56, 42, 44, 9, -0.25, 0, 7); c.stroke(); c.beginPath(); c.ellipse(56, 42, 52, 12, -0.25, 0, 7); c.stroke();
              c.fillRect(66, 34, 3, 3); c.fillText('NÁCAR', 88, 18); c.fillText('▒▒▒ ▒▒', 88, 70);
            } else {
              c.fillText('SISTEMA', 8, 14);
              for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(20 + i * 18, 46 + Math.sin(i) * 10, 3 + (i % 3) * 2, 0, 7); c.fill(); }
              c.strokeStyle = '#2f6f8f'; c.beginPath(); c.moveTo(20, 46); for (let i = 1; i < 6; i++) c.lineTo(20 + i * 18, 46 + Math.sin(i) * 10); c.stroke();
              c.fillText('VÉRTICE ?', 76, 72);
            }
          });
          this.add(new THREE.PlaneGeometry(200, 125), this.basic(0xffffff, { map: tex }), x, y, z, { cast: false });
          break;
        }
        case 'consola': {
          const s = d.s || 1;
          this.add(new THREE.BoxGeometry(70 * s, 46 * s, 40), metal, x, y - 23 * s, z);
          const top = this.lam(0x101418, { emissive: 0x6fbfe6, emissiveIntensity: 0.5 });
          this.add(new THREE.BoxGeometry(64 * s, 4, 30), top, x, y - 47 * s, z, { rx: -0.3 });
          if (!this.refs.holo) {
            const holo = new THREE.Group(); holo.position.set(x, -(y - 110), z + 10); this.scene.add(holo);
            const cap = new THREE.CylinderGeometry(16, 20, 50, 8); cap.rotateZ(Math.PI / 2);
            const lines = new THREE.LineSegments(new THREE.EdgesGeometry(cap), new THREE.LineBasicMaterial({ color: 0x9fe0ff, transparent: true, opacity: 0.8 }));
            holo.add(lines);
            const crack = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(14, 3, 3)), new THREE.LineBasicMaterial({ color: 0xff9a8a }));
            crack.position.set(-8, 14, 0); crack.rotation.z = 0.6; holo.add(crack);
            holo.visible = false; this.refs.holo = holo;
          }
          break;
        }
        case 'nucleo': {
          const g = new THREE.Group(); g.position.set(x, -y, z); this.scene.add(g);
          const coreMat = this.phong(0x30343e, { emissive: 0x000000 });
          g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(46, 1), coreMat));
          const rings = [];
          for (let i = 0; i < 3; i++) {
            const rm = this.basic(0x2a4a5a, { transparent: true, opacity: 0.8 });
            const r = new THREE.Mesh(new THREE.TorusGeometry(80 + i * 22, 3, 4, 40), rm); r.rotation.x = 1.2 + i * 0.4; g.add(r); rings.push({ r, m: rm });
          }
          this.refs.core = { g, coreMat, rings };
          break;
        }
        case 'salida': {
          this.add(new THREE.BoxGeometry(110, 230, 20), metal, x, y - 115, z - 10);
          this.add(new THREE.PlaneGeometry(80, 200), this.basic(0xfff8ec), x, y - 100, z + 1, { cast: false });
          break;
        }
      }
    }
    // huellas en la costra
    const fpMat = this.basic(0x6e6a63, { transparent: true, opacity: 0.55, depthWrite: false });
    this.ghostPrintMat = this.basic(0x6e6a63, { transparent: true, opacity: 0, depthWrite: false });
    for (const f of L.footprints) {
      const m = this.add(ellipse, f.kind === 'fantasma' ? this.ghostPrintMat : fpMat, f.x, f.y - 0.6, f.side ? -10 : 8, { rx: -Math.PI / 2, cast: false, receive: false });
      m.scale.set(5, 9, 1);
    }
    // balizas (puntos de control)
    this.beacons = L.checkpoints.map(k => {
      const m = this.lam(0x7fd0ec, { emissive: 0x2a86a8, emissiveIntensity: 0.2, transparent: true, opacity: 0.9 });
      const c = this.add(new THREE.OctahedronGeometry(8, 0), m, k.x, k.y - 14, -24, { sy: 1.8 });
      this.add(new THREE.CylinderGeometry(6, 9, 8, 5), this.lam(0x3d4350), k.x, k.y - 4, -24);
      return { k, m, c };
    });
    // pilones (estructuras activables)
    for (const p of L.pylons) {
      const g = new THREE.Group(); g.position.set(p.x, -p.y, -16); this.scene.add(g);
      const ob = new THREE.Mesh(new THREE.CylinderGeometry(10, 18, 90, 4), this.lam(0xc8bfad)); ob.position.y = 45; ob.castShadow = true; g.add(ob);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 8, 4), this.glass()); band.position.y = 30; g.add(band);
      const cm = this.lam(0x7fd0ec, { emissive: 0x2a86a8, emissiveIntensity: 0.1 });
      const cr = new THREE.Mesh(new THREE.OctahedronGeometry(12, 0), cm); cr.position.y = 108; cr.scale.y = 1.6; g.add(cr);
      const bm = this.basic(0xbfeaf7, { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(6, 10, 900, 6, 1, true), bm); beam.position.y = 560; g.add(beam);
      this.pylonViz.push({ p, cm, bm, cr });
    }
  }

  buildDevice(d) {
    const g = new THREE.Group(); g.position.set(d.x, -d.y, d.z); this.scene.add(g);
    this.device = { g, rings: [], panels: [], ver: -1 };
    const gap = 0.9;
    [170, 138, 106].forEach((r, i) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(r, 7, 4, 48, Math.PI * 2 - gap), this.lam(0x1d2029, { emissive: 0x3d8fb0, emissiveIntensity: 0.35 }));
      const fill = new THREE.Mesh(new THREE.TorusGeometry(r, 7, 4, 8, gap), this.lam(0xbfeaf7, { emissive: 0x7fd0ec, emissiveIntensity: 1, transparent: true, opacity: 0 }));
      fill.rotation.z = Math.PI * 2 - gap;
      const piv = new THREE.Group(); piv.add(m); piv.add(fill); g.add(piv);
      this.device.rings.push({ piv, fill, base: i * 1.7 });
    });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(30, 0), this.lam(0x0e0f14, { emissive: 0x3d8fb0, emissiveIntensity: 0.4 }));
    g.add(core); this.device.core = core;
    const pos = [[0, 250], [250, 0], [0, -250], [-250, 0]];
    for (let i = 0; i < 4; i++) {
      const tex = this.canvasTex(48, 48, () => {});
      const m = new THREE.Mesh(new THREE.PlaneGeometry(92, 92), this.basic(0xffffff, { map: tex }));
      m.position.set(pos[i][0], pos[i][1], -6); g.add(m);
      this.device.panels.push(tex);
    }
    // cerraduras (fragmentos de anillo que el recuerdo completa)
    this.locks = this.g.L.anchors.filter(a => a.ring !== undefined).map(a => {
      const fm = this.lam(0xbfeaf7, { emissive: 0x7fd0ec, emissiveIntensity: 0.8, transparent: true, opacity: 0 });
      const lm = new THREE.LineBasicMaterial({ color: 0xbfeaf7, transparent: true, opacity: 0.3 });
      const geo = new THREE.TorusGeometry(26, 5, 4, 10, 2.2);
      const solidM = new THREE.Mesh(geo, fm); solidM.position.set(a.x, -a.y - 10, 10); solidM.rotation.z = 0.5; this.scene.add(solidM);
      const ghost = new THREE.LineSegments(new THREE.EdgesGeometry(geo), lm); solidM.add(ghost);
      const ped = this.add(new THREE.CylinderGeometry(8, 12, 22, 5), this.lam(0x1d2029, { emissive: 0x3d8fb0, emissiveIntensity: 0.4 }), a.x, a.y + 19, 10);
      return { a, fm, lm, solidM, ped };
    });
  }
  drawPanel(tex, kind) {
    const c = tex.userData.canvas, x = c.getContext('2d'), w = c.width, h = c.height;
    x.fillStyle = '#0e1016'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#3d8fb0'; x.strokeRect(0.5, 0.5, w - 1, h - 1);
    x.fillStyle = '#7fd0ec';
    if (kind === 'montana') { x.beginPath(); x.moveTo(6, 40); x.lineTo(20, 14); x.lineTo(28, 26); x.lineTo(34, 18); x.lineTo(44, 40); x.fill(); }
    else if (kind === 'ruinas') { x.fillRect(8, 22, 6, 18); x.fillRect(18, 14, 10, 4); x.fillRect(18, 26, 4, 14); x.fillRect(30, 18, 10, 22); x.clearRect(32, 26, 6, 6); }
    else if (kind === 'ciudad') { [[6, 24, 6], [14, 14, 7], [23, 20, 6], [31, 10, 6], [39, 22, 5]].forEach(([a, b, c2]) => x.fillRect(a, b, c2, 40 - b)); }
    else if (kind === 'vacio') { x.fillStyle = '#1d3644'; x.fillRect(6, 39, 36, 1); }
    else if (kind === 'oceano') { for (let i = 0; i < 4; i++) for (let k = 0; k < 6; k++) x.fillRect(4 + k * 7 + (i % 2) * 3, 22 + i * 5, 4, 2); }
    else if (kind === 'flota') { for (let i = 0; i < 4; i++) for (let k = 0; k < 6; k++) x.fillRect(4 + k * 7 + (i % 2) * 3, 30 - i * 7 - (k % 3) * 2, 4, 2); }
    else if (kind === 'esfera') { x.fillStyle = '#05060a'; x.beginPath(); x.arc(24, 24, 12, 0, 7); x.fill(); x.strokeStyle = '#7fd0ec'; x.beginPath(); x.ellipse(24, 24, 20, 5, -0.3, 0, 7); x.stroke(); }
    tex.needsUpdate = true;
  }

  buildDynamic() {
    const L = this.g.L;
    this.rockMeshes = L.rocks.map(r => { const m = this.add(new THREE.DodecahedronGeometry(32, 0), this.lam(0xb3ab98), 0, 0, 10, { sx: 0.82, sy: 0.82 }); return m; });
    this.fragMeshes = L.fragments.map(() => this.add(new THREE.OctahedronGeometry(10, 0), this.lam(0xdff6ff, { emissive: 0x7fd0ec, emissiveIntensity: 0.7 }), 0, 0, 12));
    this.sentHeads = L.sentinels.map(s => {
      const head = this.add(new THREE.BoxGeometry(44, 22, 44), this.lam(0x4b5262), s.s.x + 30, s.s.y - 11, 0);
      const em = this.basic(0x2b2c33);
      const eye = this.add(new THREE.SphereGeometry(7, 8, 6), em, s.s.x + 30, s.s.y - 12, 24, { cast: false });
      return { s, head, eye, em };
    });
    const pg = new THREE.SphereGeometry(9, 8, 6), pm = this.basic(0xffb08a, { transparent: true, opacity: 0.9 });
    this.pulseMeshes = this.g.pulses.items.map(() => { const m = new THREE.Mesh(pg, pm); m.visible = false; this.scene.add(m); return m; });
    const bg = new THREE.SphereGeometry(5, 6, 4), bm = this.lam(0x3d4350);
    this.beetleMeshes = L.beetles.map(() => {
      const m = new THREE.Mesh(bg, bm); m.scale.set(1.4, 0.6, 1); this.scene.add(m);
      const dot = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), this.basic(0xfff1c9)); dot.position.y = 4; m.add(dot);
      return m;
    });
  }

  buildSprites() {
    const { dip, tilo } = this.assets;
    const mk = (sheet) => {
      const tex = new THREE.CanvasTexture(sheet.img);
      tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.repeat.set(1 / sheet.cols, 1 / sheet.rows);
      return tex;
    };
    this.dipTex = mk(dip);
    const dg = new THREE.PlaneGeometry(dip.fw, dip.fh); dg.translate(0, dip.fh / 2, 0);
    this.dip = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ map: this.dipTex, alphaTest: 0.5, fog: false }));
    this.scene.add(this.dip);
    // reflejo en el vidrio negro (tarda una fracción de segundo en imitar a DIP)
    const sp = this.g.L.spots.espejo;
    this.reflTex = this.dipTex.clone(); this.reflTex.needsUpdate = true;
    const planes = [new THREE.Plane(new THREE.Vector3(1, 0, 0), -sp.x0), new THREE.Plane(new THREE.Vector3(-1, 0, 0), sp.x1), new THREE.Plane(new THREE.Vector3(0, 1, 0), sp.y1), new THREE.Plane(new THREE.Vector3(0, -1, 0), -sp.y0)];
    this.refl = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ map: this.reflTex, alphaTest: 0.5, color: 0x8a96ad, transparent: true, opacity: 0.6, clippingPlanes: planes, fog: false }));
    this.refl.position.z = sp.z + 6; this.scene.add(this.refl);
    this.tiloTex = mk(tilo);
    const tg = new THREE.PlaneGeometry(tilo.fw, tilo.fh); tg.translate(0, tilo.fh / 2, 0);
    this.tiloMesh = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ map: this.tiloTex, alphaTest: 0.5, fog: false }));
    this.scene.add(this.tiloMesh);
    const sh = new THREE.CircleGeometry(13, 10); sh.rotateX(-Math.PI / 2);
    this.shadow = new THREE.Mesh(sh, this.basic(0x1d1e24, { transparent: true, opacity: 0.3, depthWrite: false }));
    this.scene.add(this.shadow);
    this.tiloShadow = new THREE.Mesh(sh, this.shadow.material); this.scene.add(this.tiloShadow);
  }

  buildFx() {
    // partículas (pool del juego) → un solo Points con buffers fijos
    const n = this.g.particles.items.length;
    this.pPos = new Float32Array(n * 3); this.pCol = new Float32Array(n * 3);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    pg.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    this.points = new THREE.Points(pg, new THREE.PointsMaterial({ size: 6, map: this.tex.dot, vertexColors: true, transparent: true, depthWrite: false, fog: false }));
    this.points.frustumCulled = false; this.scene.add(this.points);
    // polvo del velo mineral / tormenta
    const dn = 260;
    this.dustSeed = new Float32Array(dn * 4);
    for (let i = 0; i < dn * 4; i++) this.dustSeed[i] = Math.random();
    this.dPos = new Float32Array(dn * 3);
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(this.dPos, 3));
    this.dustMat = new THREE.PointsMaterial({ size: 4, map: this.tex.dot, color: 0xfffaf0, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.dust = new THREE.Points(dg, this.dustMat); this.dust.frustumCulled = false; this.scene.add(this.dust);
    // fantasmas de la versión completa de las ruinas
    this.ghostGroup = new THREE.Group(); this.scene.add(this.ghostGroup);
    this.ghostMat = this.basic(0xdff6ff, { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.ghostLine = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    for (const gh of this.g.L.ghosts) {
      const geo = new THREE.BoxGeometry(gh.w, gh.h, gh.d);
      const m = new THREE.Mesh(geo, this.ghostMat); m.position.set(gh.x + gh.w / 2, -(gh.y + gh.h / 2), gh.z); this.ghostGroup.add(m);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), this.ghostLine); m.add(e);
    }
    for (const z of [-30, -210]) { const strip = new THREE.Mesh(new THREE.PlaneGeometry(2000, 14), this.ghostMat); strip.rotation.x = -Math.PI / 2; strip.position.set(3950, 221, z); this.ghostGroup.add(strip); }
    this.ghostGroup.visible = false;
    // onda del santuario
    this.shock = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), this.basic(0xdff6ff, { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.shock.position.set(this.g.L.spots.dispositivo.x, 250, -60); this.scene.add(this.shock);
    // Lunex: silueta de líneas geométricas
    const segs = 46;
    this.lxPos = new Float32Array(segs * 2 * 3);
    this.lxA = new Float32Array(segs * 2 * 2); this.lxB = new Float32Array(segs * 2 * 2); this.lxR = new Float32Array(segs * 2 * 3);
    const A = [], B = [];
    const seg = (arr, x1, y1, x2, y2) => arr.push(x1, y1, x2, y2);
    // máscara
    const hex = (arr, cx, cy, r, n) => { for (let i = 0; i < n; i++) { const a1 = i / n * 6.283 + 0.3, a2 = (i + 1) / n * 6.283 + 0.3; seg(arr, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r * 1.2, cx + Math.cos(a2) * r, cy + Math.sin(a2) * r * 1.2); } };
    hex(A, 0, 100, 34, 6); seg(A, -18, 106, -6, 104); seg(A, 6, 104, 18, 106); seg(A, -8, 84, 8, 84); seg(A, 0, 64, 0, 52);
    seg(A, -60, 46, 60, 46); seg(A, -60, 46, -40, -40); seg(A, 60, 46, 40, -40); seg(A, -40, -40, 40, -40); seg(A, -60, 46, -86, -10); seg(A, 60, 46, 86, -10);
    // conjunto de coordenadas
    for (let i = 0; i < 6; i++) seg(B, -40 + i * 16, 70, -40 + i * 16, 130);
    for (let i = 0; i < 4; i++) seg(B, -46, 76 + i * 16, 46, 76 + i * 16);
    seg(B, 0, 64, 0, 52); seg(B, -60, 46, 60, 46); seg(B, -60, 46, -40, -40); seg(B, 60, 46, 40, -40); seg(B, -40, -40, 40, -40); seg(B, -60, 46, -86, -10); seg(B, 60, 46, 86, -10);
    while (A.length < segs * 4) { const k = A.length / 4; seg(A, -100 + (k % 10) * 22, -70 - (k % 3) * 10, -92 + (k % 10) * 22, -70 - (k % 3) * 10); }
    while (B.length < segs * 4) { const k = B.length / 4; seg(B, -100 + (k % 10) * 22, -70 - (k % 3) * 10, -100 + (k % 10) * 22, -60 - (k % 3) * 10); }
    this.lxA.set(A.slice(0, segs * 4)); this.lxB.set(B.slice(0, segs * 4));
    for (let i = 0; i < this.lxR.length; i++) this.lxR[i] = Math.random() * 2 - 1;
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(this.lxPos, 3));
    this.lunexMat = new THREE.LineBasicMaterial({ color: 0xbfeaf7, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, fog: false });
    this.lunex = new THREE.LineSegments(lg, this.lunexMat);
    this.lunex.position.set(10790, 160, 30); this.lunex.frustumCulled = false; this.scene.add(this.lunex);
  }

  resize(cssW, cssH) {
    const aspect = cssW / Math.max(1, cssH);
    const viewH = Math.max(360, Math.round(560 / aspect));
    const viewW = Math.round(viewH * aspect);
    this.g.view.w = viewW; this.g.view.h = viewH;
    this.css = [cssW, cssH];
    this.prMax = Math.min(window.devicePixelRatio || 1, this.mobile ? 1.5 : 2);
    if (!this.pr) this.pr = this.prMax;
    this.pr = Math.min(this.pr, this.prMax);
    this.renderer.setPixelRatio(this.pr);
    this.renderer.setSize(cssW, cssH, false);
    this.camera.aspect = aspect; this.camera.updateProjectionMatrix();
    this.dist = (viewH / 2) / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  }

  // punto del mundo (coordenadas de juego) → pantalla [0..1]
  project(x, y, z = Z_SPRITE) {
    const v = this.tmpV.set(x, -y, z).project(this.camera);
    return { x: (v.x + 1) / 2, y: (1 - v.y) / 2, on: v.z < 1 };
  }

  // =====================================================================
  // Resolución adaptativa: si el equipo no llega a ~40 fps, baja la nitidez del mundo (nunca la de DIP ni el HUD).
  adapt(dt) {
    this.ema = this.ema === undefined ? dt : this.ema * 0.95 + dt * 0.05;
    this.adaptT = (this.adaptT || 0) + dt;
    if (this.adaptT < 2 || !this.css) return;
    this.adaptT = 0;
    let pr = this.pr;
    if (this.ema > 1 / 40 && pr > 0.6) pr = Math.max(0.6, pr * 0.8);
    else if (this.ema < 1 / 57 && pr < this.prMax) pr = Math.min(this.prMax, pr * 1.1);
    if (Math.abs(pr - this.pr) > 0.01) { this.pr = pr; this.renderer.setPixelRatio(pr); this.renderer.setSize(this.css[0], this.css[1], false); }
  }

  draw(dt, frameDt = dt) {
    this.adapt(frameDt);
    const g = this.g, t = (this.t += dt);
    this.applyEnv(dt);
    // cámara con leve inclinación de diorama
    const sh = g.cam.shake * g.cam.shake * 14;
    const cx = g.cam.x + Math.sin(t * 47) * sh, cy = g.cam.y + Math.cos(t * 39) * sh;
    this.camera.position.set(cx, -cy + 70, this.dist);
    this.camera.lookAt(cx, -cy + 8, 0);
    this.sky.position.set(cx * 0.93, -cy * 0.45, 0);
    this.skyDome.position.copy(this.camera.position);
    this.sun.position.set(cx - 500, -cy + 900, 700); this.sun.target.position.set(cx, -cy, 0);

    this.drawIntro(t);
    this.drawSolids(t);
    this.drawEntities(t);
    this.drawSprites();
    this.drawParticles();
    this.drawFxLayers(t, dt);
    this.renderer.render(this.scene, this.camera);
  }

  applyEnv(dt) {
    const g = this.g, target = ENV[g.envName] || ENV.crater, e = this.env;
    const CK = ['bg', 'fog', 'hs', 'hg', 'sun'], NK = ['near', 'far', 'hi', 'si', 'dust', 'violet', 'sky', 'glow'];
    if (!this.envInit) { for (const key of CK) e[key] = HEX(target[key]); for (const key of NK) e[key] = target[key]; this.envInit = true; }
    const k = 1 - Math.exp(-dt * 1.6);
    for (const key of CK) e[key].lerp(this.tmpC.set(target[key]), k);
    for (const key of NK) e[key] += (target[key] - e[key]) * k;
    let alarm = 0;
    if (g.alarm > 0 || g.envName === 'huida') alarm = 0.5 + 0.5 * Math.sin(this.t * 6);
    this.scene.background.copy(e.bg);
    this.scene.fog.color.copy(e.fog); this.scene.fog.near = e.near; this.scene.fog.far = e.far;
    this.hemi.color.copy(e.hs); this.hemi.groundColor.copy(e.hg); this.hemi.intensity = e.hi * (1 - alarm * 0.25);
    this.sun.color.copy(e.sun); this.sun.intensity = e.si;
    if (alarm) this.hemi.color.lerp(this.tmpC.set(g.envName === 'huida' ? 0xd04070 : 0xff4040), alarm * 0.5);
    this.sky.visible = e.sky > 0.05;
    this.skyDome.visible = e.sky > 0.05;
    const U = this.skyUniforms;
    U.top.value.copy(e.bg).lerp(this.tmpC.set(0xffffff), 0.25); U.hor.value.copy(e.fog); U.violet.value = e.violet;
    this.scene.environment = e.sky > 0.5 ? this.envExterior : this.envInterior;
  }

  drawIntro(t) {
    const g = this.g, f = g.fx;
    this.meteor.visible = f.meteor >= 0;
    if (f.meteor >= 0) {
      const k = Math.min(1, f.meteor / 3.6);
      const e = k * k;
      this.meteor.position.set(1900 - 720 * e, 1350 - 1200 * e, -2900 + 800 * e);
      this.meteor.rotation.set(0.2, 0.3, -0.62 + Math.sin(t * 20) * 0.04);
      this.meteorWin.color.setHex(Math.sin(t * 30) > (k > 0.5 ? 0.6 : -0.4) ? 0x7fd0ec : 0x1d2a33);
      this.meteorBits.forEach((b, i) => { b.position.set(60 + (k * 400 + i * 50) * (1 + i * 0.2), (i - 2) * 30 * k + Math.sin(i) * 20, (i % 2 ? 1 : -1) * k * 60); b.rotation.set(t * (i + 1), t * 2, 0); });
    }
    const hatch = this.refs.hatch;
    if (hatch) hatch.rotation.z += ((f.hatch ? -1.9 : 0) - hatch.rotation.z) * 0.12;
    if (this.refs.screenMat) this.refs.screenMat.color.setHex(f.screenOff ? 0x1d2a33 : (Math.sin(t * 13) > 0.2 || Math.sin(t * 3.1) > 0.8 ? 0x7fd0ec : 0x2a4a5a));
  }

  drawSolids(t) {
    const g = this.g, L = g.L;
    // anclas del recuerdo: silueta luminosa → materia
    for (const a of L.anchors) {
      const latentVis = g.has.memoria ? 0.25 + 0.2 * Math.sin(t * 4 + a.x) : 0.06 + 0.04 * Math.sin(t * 2 + a.x);
      for (const s of a.solids) {
        const m = this.solidMeshes.get(s); if (!m) continue;
        const mats = m.material, e = m.userData.edges;
        let op = 0, edge = 0, glow = 0;
        if (a.state === 'latente') { edge = latentVis; }
        else if (a.state === 'formando') { const k = a.t / 1.3; edge = Math.min(1, k * 2.5); op = Math.max(0, (k - 0.45) / 0.55); glow = 1 - op * 0.5; }
        else { op = 1; edge = 0; glow = 0; }
        for (const mm of (Array.isArray(mats) ? mats : [mats])) { mm.opacity = op; mm.transparent = op < 1; mm.depthWrite = op > 0.5; mm.emissiveIntensity = glow; }
        if (e) e.material.opacity = edge;
        m.visible = op > 0 || edge > 0;
      }
    }
    // placas inestables
    for (const pl of L.plates) {
      const m = this.solidMeshes.get(pl.s); if (!m) continue;
      const bx = pl.x + 33, by = -(pl.y + 8);
      if (pl.state === 'tiembla') { m.position.set(bx + Math.sin(t * 90) * 1.5, by, m.position.z); m.visible = true; }
      else if (pl.state === 'cae') { const fall = Math.min(1, pl.t); m.position.set(bx, by - fall * fall * 500, m.position.z); m.visible = pl.t < 0.9; }
      else { m.position.set(bx, by, m.position.z); m.visible = true; }
    }
    // plataformas temporales
    for (const ph of L.phases) {
      const m = this.solidMeshes.get(ph.s); if (!m) continue;
      const on = ph.s.active, blink = ph.warn && Math.sin(t * 40) > 0;
      m.material.opacity = on ? (blink ? 0.25 : 0.75) : 0;
      if (m.userData.edges) m.userData.edges.material.opacity = on ? 0.9 : 0.18;
    }
    // puertas
    for (const d of L.doors) {
      const m = this.solidMeshes.get(d.s); if (!m) continue;
      if (d.mode === 'salta') { m.position.x = d.s.x + d.s.w / 2; m.visible = true; if (m.userData.edges) m.userData.edges.material.opacity = 0.45 + (d.flash || 0) * 2; continue; }
      const k = d.t * d.t * (3 - 2 * d.t);
      const off = d.mode === 'baja' ? -d.s.h * k : d.s.h * k;
      m.position.y = -(d.s.y + d.s.h / 2) + off;
      m.visible = k < 0.98;
    }
    // rocas
    L.rocks.forEach((r, i) => { const m = this.rockMeshes[i]; m.position.set(r.pos.x + 25, -(r.pos.y + 25), 10); m.rotation.set(0.3, r.pos.x * 0.004, r.pos.x * -0.01); });
    // recolector
    const col = this.refs.collector;
    if (col) {
      const on = g.flags.recolector, ft = g.fx.collector;
      col.lever.rotation.z += ((on ? -0.6 : 0.6) - col.lever.rotation.z) * 0.15;
      for (const w of col.wheels) w.rotation.y = on ? ft * 6 : 0;
      col.funnel.position.y = 90 + (on ? Math.sin(ft * 14) * 2 : 0);
    }
  }

  drawEntities(t) {
    const g = this.g, L = g.L;
    L.fragments.forEach((f, i) => { const m = this.fragMeshes[i]; m.position.set(f.x, -(f.y - 12), 12); m.rotation.set(t * 2, t * 3, 0); });
    for (const h of this.sentHeads) {
      const st = h.s.state;
      h.em.color.setHex(st === 'dormido' ? 0x2b2c33 : st === 'despierta' ? (Math.sin(t * 30) > 0 ? 0xffb347 : 0x5a4020) : 0xff5a4a);
      h.head.rotation.y = st === 'activo' ? Math.sin(t * 3) * 0.4 : 0;
    }
    g.pulses.items.forEach((o, i) => { const m = this.pulseMeshes[i]; m.visible = o.active; if (o.active) { m.position.set(o.x, -o.y, 10); m.scale.setScalar(1 + Math.sin(t * 30) * 0.15); } });
    L.beetles.forEach((b, i) => { const m = this.beetleMeshes[i]; m.visible = b.state !== 'escondido'; m.position.set(b.x, -(b.y - 3), 30 - i * 7); m.rotation.y = b.dir > 0 ? 0 : Math.PI; });
    // pilones
    for (const v of this.pylonViz) {
      const on = v.p.on, dust = this.env.dust || 0;
      v.cm.emissiveIntensity = on ? 1.2 + Math.sin(t * 3) * 0.2 : 0.1 + (g.sensor > 0 ? 0.15 * Math.sin(t * 8) + 0.15 : 0);
      v.bm.opacity = on ? 0.18 + dust * 0.35 : 0;
      v.cr.rotation.y = t * (on ? 1.5 : 0.3);
    }
    for (const b of this.beacons) b.m.emissiveIntensity = b.k.on ? 0.8 + Math.sin(t * 3 + b.k.x) * 0.2 : 0.15;
    // musgo de vidrio: se ilumina cuando una vibración pasa cerca
    const c = g.playerCenter();
    for (const gl of this.glowers) {
      if (gl.flicker) { gl.m.emissiveIntensity = Math.sin(t * 9 + gl.x) > -0.7 ? 0.7 : 0.15; continue; }
      const d = Math.hypot(c.x - gl.x, c.y - gl.y);
      gl.m.emissiveIntensity += ((d < 140 ? 0.9 : 0) - gl.m.emissiveIntensity) * 0.08;
    }
    // lirios minerales: se abren cuando la luz del sol queda velada
    const open = Math.min(1, (this.env.dust || 0) * 1.6);
    for (const petals of this.lilies) for (const p of petals) p.rotation.z = 0.15 + open * 1.0 + Math.sin(t + p.rotation.y) * 0.05;
    // cristal de las ruinas y el primer recuerdo
    if (this.refs.ruinCrystal) { this.refs.ruinCrystal.visible = !g.fx.crystalTaken; this.refs.ruinCrystal.rotation.y = t; }
    if (this.refs.orb) {
      const o = this.refs.orb, sp = g.L.spots.cristalRuina;
      o.visible = g.fx.orb >= 0;
      if (o.visible) o.position.set(sp.x - 4, 260 + Math.min(1, g.fx.orb) * 40 + Math.sin(t * 3) * 4, 30);
    }
    if (this.refs.muteCrystal) { const m = this.refs.muteCrystal; m.material.emissiveIntensity = g.ringsDone >= 3 ? 0.7 + Math.sin(t * 10) * 0.3 : 0.25; m.rotation.y = t * 0.5; }
    // cristal que sale despedido de la cápsula
    if (!this.refs.flyCrystal) {
      const fc = new THREE.Mesh(new THREE.OctahedronGeometry(6, 0), this.crystalMat()); fc.scale.y = 1.6; this.scene.add(fc); this.refs.flyCrystal = fc;
    }
    const fcm = this.refs.flyCrystal, k = g.fx.crystalFly;
    fcm.visible = k >= 0;
    if (k >= 0) {
      const a = g.L.spots.capsula, b = g.L.spots.cristalCrater;
      fcm.position.set(a.x + (b.x - a.x) * k, 30 + Math.sin(k * Math.PI) * 120 - k * 26, 20);
      fcm.rotation.z = k * 12;
    }
    // dispositivo del santuario
    const dv = this.device;
    if (dv) {
      const ver = g.ringsDone;
      if (ver !== dv.ver) {
        dv.ver = ver;
        this.drawPanel(dv.panels[0], ver >= 1 ? 'ruinas' : 'montana');
        this.drawPanel(dv.panels[1], ver >= 2 ? 'vacio' : 'ciudad');
        this.drawPanel(dv.panels[2], ver >= 3 ? 'flota' : 'oceano');
        this.drawPanel(dv.panels[3], 'esfera');
      }
      dv.rings.forEach((r, i) => {
        const done = this.locks[i] && this.locks[i].a.state === 'hecho';
        r.piv.rotation.z = done ? r.piv.rotation.z + (0 - r.piv.rotation.z) * 0.05 : r.base + t * (0.15 + i * 0.07) * (i % 2 ? -1 : 1);
        r.fill.material.opacity = done ? 1 : 0;
      });
      dv.core.rotation.y = t * 0.4; dv.core.material.emissiveIntensity = 0.4 + ver * 0.25;
    }
    if (this.locks) for (const lk of this.locks) {
      const a = lk.a;
      if (a.state === 'latente') { lk.fm.opacity = 0; lk.lm.opacity = g.has.memoria ? 0.35 + 0.25 * Math.sin(t * 4) : 0.15; }
      else if (a.state === 'formando') { const kk = a.t / 1.3; lk.lm.opacity = 1; lk.fm.opacity = Math.max(0, (kk - 0.4) / 0.6); }
      else { lk.fm.opacity = 1; lk.lm.opacity = 0; }
      lk.solidM.rotation.z = 0.5 + t * 0.6;
    }
    // estación
    if (this.refs.holo) { this.refs.holo.visible = g.fx.holo > 0; this.refs.holo.rotation.y = t * 0.8; }
    if (this.refs.core) {
      const on = g.fx.core;
      this.refs.core.coreMat.emissive.setHex(on ? 0x2a6a8a : 0x000000);
      this.refs.core.rings.forEach((r, i) => { r.r.rotation.z = t * (on ? 0.8 + i * 0.3 : 0.05); r.m.color.setHex(on ? 0x9fe0ff : 0x2a4a5a); });
    }
    // Lunex
    const lx = g.lunex;
    this.lunexMat.opacity = lx.a * (0.75 + Math.sin(t * 50) * 0.15);
    this.lunex.visible = lx.a > 0.01;
    if (this.lunex.visible) {
      const n = this.lxA.length / 2, mix = (Math.sin(t * 2.3) + Math.sin(t * 5.1)) > 0.6 ? 1 : 0;
      for (let i = 0; i < n; i++) {
        const ax = this.lxA[i * 2], ay = this.lxA[i * 2 + 1], bx = this.lxB[i * 2], by = this.lxB[i * 2 + 1];
        const jx = Math.sin(t * 7 + i) * 1.5, jy = Math.cos(t * 6 + i * 1.3) * 1.5;
        const fr = lx.frag * 140;
        this.lxPos[i * 3] = (mix ? bx : ax) + jx + this.lxR[i * 3] * fr;
        this.lxPos[i * 3 + 1] = (mix ? by : ay) + jy + this.lxR[i * 3 + 1] * fr;
        this.lxPos[i * 3 + 2] = this.lxR[i * 3 + 2] * fr * 0.5;
      }
      this.lunex.geometry.attributes.position.needsUpdate = true;
    }
  }

  drawSprites() {
    const g = this.g, p = g.player, dip = this.assets.dip;
    const blink = p.invuln > 0 && p.state !== 'pose' && Math.floor(g.time * 16) % 2 === 0;
    this.dip.visible = !p.hidden && !blink && g.mode !== 'titulo';
    dip.setUV(this.dipTex, p.anim, p.animTime);
    const px = Math.round(p.pos.x + p.w / 2), py = Math.round(p.pos.y + p.h);
    this.dip.position.set(px, -py, Z_SPRITE); this.dip.scale.x = p.face;
    // sombra
    this.shadow.visible = this.dip.visible && p.shadowY !== null && p.shadowY !== undefined;
    if (this.shadow.visible) {
      const hgt = p.shadowY - py, s = Math.max(0.35, 1 - hgt / 260);
      this.shadow.position.set(px, -p.shadowY + 0.8, Z_SPRITE - 18); this.shadow.scale.set(s, 1, s);
      this.shadow.material.opacity = 0.3 * s;
    }
    // reflejo retrasado en el vidrio negro
    const sp = g.L.spots.espejo, h = g.historyAt(0.32);
    this.refl.visible = !!h && g.sec === 0 && !p.hidden && Math.abs(px - (sp.x0 + sp.x1) / 2) < 260;
    if (this.refl.visible) {
      dip.setUV(this.reflTex, h.anim, h.t);
      this.refl.position.set(h.x, -h.y - 4, sp.z + 6); this.refl.scale.set(h.face * 0.92, 0.92, 1);
    }
    // Tilo
    const tl = g.tilo, ts = this.assets.tilo;
    this.tiloMesh.visible = tl.visible && g.mode !== 'titulo';
    ts.setUV(this.tiloTex, tl.anim, tl.t);
    this.tiloMesh.position.set(Math.round(tl.x), -tl.y, Z_SPRITE - 4); this.tiloMesh.scale.x = tl.face;
    this.tiloShadow.visible = this.tiloMesh.visible; this.tiloShadow.position.set(tl.x, -tl.y + 0.8, Z_SPRITE - 20);
  }

  drawParticles() {
    const items = this.g.particles.items, P = this.pPos, C = this.pCol;
    for (let i = 0; i < items.length; i++) {
      const o = items[i];
      if (!o.active) { P[i * 3 + 1] = -1e6; continue; }
      const k = o.life / o.max;
      P[i * 3] = o.x; P[i * 3 + 1] = -o.y; P[i * 3 + 2] = o.z + 30;
      C[i * 3] = o.r * (0.5 + k * 0.5); C[i * 3 + 1] = o.gg * (0.5 + k * 0.5); C[i * 3 + 2] = o.b * (0.5 + k * 0.5);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  drawFxLayers(t, dt) {
    const g = this.g, f = g.fx, cam = g.cam;
    // polvo
    const amt = this.env.dust || 0;
    this.dustMat.opacity = Math.min(0.85, amt * 1.2);
    this.dust.visible = amt > 0.02;
    if (this.dust.visible) {
      const n = this.dPos.length / 3, W = this.g.view.w * 1.6, H = this.g.view.h * 1.4;
      const dark = this.env.sky < 0.5;
      this.dustMat.color.setHex(dark ? 0x7fd0ec : 0xfffaf0);
      for (let i = 0; i < n; i++) {
        const s = this.dustSeed, sp = 40 + s[i * 4] * 120;
        const x = ((s[i * 4 + 1] * W + t * sp) % W) - W / 2 + cam.x;
        const y = ((s[i * 4 + 2] * H + t * sp * 0.15 + Math.sin(t + i) * 10) % H) - H / 2 + cam.y;
        this.dPos[i * 3] = x; this.dPos[i * 3 + 1] = -y; this.dPos[i * 3 + 2] = -240 + s[i * 4 + 3] * 360;
      }
      this.dust.geometry.attributes.position.needsUpdate = true;
    }
    // visión de las ruinas completas
    this.ghostVis = (this.ghostVis || 0) + ((f.ruinsVision ? 1 : 0) - (this.ghostVis || 0)) * Math.min(1, dt * 3);
    this.ghostGroup.visible = this.ghostVis > 0.01;
    this.ghostMat.opacity = this.ghostVis * (0.32 + Math.sin(t * 6) * 0.05);
    this.ghostLine.opacity = this.ghostVis * 0.9;
    // onda
    if (f.shock >= 0 && f.shock < 1.6) { const s = 40 + f.shock * 900; this.shock.scale.set(s, s, 1); this.shock.material.opacity = Math.max(0, 1 - f.shock / 1.6); this.shock.visible = true; }
    else this.shock.visible = false;
    // señal final
    this.beam.material.opacity = f.beam * (0.55 + Math.sin(t * 8) * 0.08);
    this.structMat.emissive.setHex(f.beam > 0 ? 0x3d8fb0 : 0x000000);
    const tube = this.routeGeo;
    const segs = 80, count = Math.floor(f.route * segs) * 4 * 6;
    tube.setDrawRange(0, count);
    this.routeDot.material.opacity = f.route >= 1 ? 0.6 + Math.sin(t * 4) * 0.3 : 0;
    for (const r of this.ringMats) { r.m.color.copy(r.base).lerp(this.tmpC.set(0x9fe8ff), Math.min(1, f.ringFlash * 1.5)); }
    // fondo de la huida parpadea con la alarma
    if (this.refs.huidaBack) this.refs.huidaBack.material.emissive?.setHex(Math.sin(t * 6) > 0 ? 0x2a0a18 : 0x000000);
  }
}
