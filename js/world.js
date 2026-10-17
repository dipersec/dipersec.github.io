// world.js — Render 3D común a todos los mundos (three.js, HD: PBR, sombras suaves, niebla, ACES).
// Solo DIP es pixel art: un billboard con su sprite sheet de 48 px. draw() solo LEE el estado del juego.
// Lo propio de cada mundo (paisaje, personajes, jefe) vive en mundos/<mundo>/escena.js.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeTextures, worldUV } from './textures.js';
import { CONFIG } from './config.js';

const HEX = (h) => new THREE.Color(h);
const ni = (q) => (q.index ? q.toNonIndexed() : q);

export class World {
  constructor(canvas, game, assets) {
    this.g = game; this.assets = assets;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.1;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.mobile = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CONFIG.camFov, 16 / 9, 0.1, 600);
    this.scene.fog = new THREE.Fog(0xd9b8c4, 25, 150);
    this.scene.background = new THREE.Color(0xd9b8c4);
    this.t = 0; this.env = null; this.tmpC = new THREE.Color(); this.tmpV = new THREE.Vector3(); this.tmpM = new THREE.Matrix4();
    this.tmpQ = new THREE.Quaternion(); this.tmpE = new THREE.Euler(); this.tmpS = new THREE.Vector3();
    this.tex = makeTextures(r);
    this.escena = new game.M.Escena(this);
    this.lejanos = [];   // objetos con z fija que se ocultan cuando quedan lejos de DIP
    this.buildEnv(); this.buildLights(); this.buildSky(); this.buildSolids();
    this.escena.build();
    this.buildCrates(); this.buildCollectibles(); this.buildEnemies(); this.buildMemoria(); this.buildMecanismos(); this.buildFisica(); this.buildDip(); this.buildFx();
  }

  // ---------- helpers ----------
  std(o) { return new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, envMapIntensity: 0.7, ...o }); }
  basic(color, o = {}) { return new THREE.MeshBasicMaterial({ color, ...o }); }
  nacar(o = {}) {
    return new THREE.MeshPhysicalMaterial({ color: 0xf4eef8, roughness: 0.18, metalness: 0.1, iridescence: 1, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 620], clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: 1.3, ...o });
  }
  mesh(geo, mat, x, y, z, o = {}) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz;
    m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
    (o.parent || this.scene).add(m); return m;
  }
  glow(color, size, x, y, z, opacity = 0.7, parent) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.glow, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.set(size, size, 1); s.position.set(x, y, z); (parent || this.scene).add(s); return s;
  }
  sprite(map, size, parent) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, depthTest: false }));
    s.scale.set(size, size, 1); s.renderOrder = 20; (parent || this.scene).add(s); return s;
  }
  blob(r) {
    const g = new THREE.CircleGeometry(r, 20); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, this.basic(0x000000, { transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide })); m.position.y = 0.02; return m;
  }
  // puntos brillantes en una sola draw call
  points(arr, color, size, opacity, parent) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({ map: this.tex.glow, color, size, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    (parent || this.scene).add(p); return p;
  }
  // fusiona geometrías por material (pocas draw calls aunque haya cientos de piezas)
  mergeInto(buckets, { cast = [], noShadow = [] } = {}) {
    for (const [mat, list] of buckets) {
      const merged = mergeGeometries(list.map(q => (q.index ? q.toNonIndexed() : q)).map(q => { if (!q.attributes.uv) q.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(q.attributes.position.count * 2), 2)); return q; }), false);
      const m = new THREE.Mesh(merged, mat); m.receiveShadow = !noShadow.includes(mat); m.castShadow = cast.includes(mat); this.scene.add(m);
    }
  }

  buildEnv() {
    const pm = new THREE.PMREMGenerator(this.renderer), sc = new THREE.Scene();
    const geo = new THREE.SphereGeometry(100, 32, 16), cols = [], c = new THREE.Color(), p = geo.attributes.position;
    const top = HEX(0x3a3070), hor = HEX(0xf4c8d0), low = HEX(0x4a3a44);
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 100; if (y > 0) c.copy(hor).lerp(top, Math.pow(y, 0.6)); else c.copy(hor).lerp(low, Math.min(1, -y * 3)); cols.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    sc.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    for (const [x, y, z, s, col] of [[-50, 22, -70, 14, 0xffe2c8], [60, 30, 40, 9, 0xb8d8ff], [0, 80, 0, 18, 0xffffff], [-70, 8, 30, 8, 0xffb8d8]]) { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 12, 8), new THREE.MeshBasicMaterial({ color: col })); m.position.set(x, y, z); sc.add(m); }
    this.scene.environment = pm.fromScene(sc, 0.02).texture; pm.dispose();
  }
  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xd8c8ff, 0x7a5a5a, 1.0); this.scene.add(this.hemi);
    const m = this.sun = new THREE.DirectionalLight(0xffdcc0, 2.2);
    m.castShadow = true; m.shadow.mapSize.set(this.mobile ? 1024 : 2048, this.mobile ? 1024 : 2048);
    const c = m.shadow.camera; c.left = -18; c.right = 18; c.top = 18; c.bottom = -18; c.near = 1; c.far = 90;
    m.shadow.bias = -0.0004; m.shadow.normalBias = 0.03; m.shadow.radius = 3;
    this.scene.add(m); this.scene.add(m.target);
    this.fill = new THREE.PointLight(0xffc8e8, 10, 12, 2); this.scene.add(this.fill);
  }
  // cielo: degradado + banda iridiscente cerca del horizonte (el "nácar" del planeta)
  buildSky() {
    this.skyU = { top: { value: HEX(0x2a2350) }, hor: { value: HEX(0xf0c3c8) }, band: { value: 0.6 }, time: { value: 0 } };
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), new THREE.ShaderMaterial({
      uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform float band; uniform float time; varying vec3 vP;
        void main(){
          float h = clamp(vP.y*1.6+0.08,0.0,1.0);
          vec3 c = mix(hor, top, smoothstep(0.0,1.0,h));
          float a = atan(vP.z, vP.x);
          float b = exp(-pow((vP.y-0.12)*7.0,2.0)) * band;
          vec3 iri = 0.5+0.5*cos(6.2831*(vec3(0.0,0.33,0.67)+a*0.6+vP.y*3.0+time*0.02));
          c += iri*b*0.22*(0.6+0.4*sin(a*5.0+time*0.1));
          gl_FragColor = vec4(c,1.0);
        }`
    }));
    this.dome.renderOrder = -10; this.scene.add(this.dome);
    const n = 600, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, b = 0.35 + Math.random() * 1.1; pos[i * 3] = Math.cos(a) * Math.cos(b) * 380; pos[i * 3 + 1] = Math.sin(b) * 380; pos[i * 3 + 2] = Math.sin(a) * Math.cos(b) * 380; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({ size: 1.6, map: this.tex.dot, color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, fog: false });
    this.dome.add(new THREE.Points(sg, this.starMat));
  }

  // ---------- sólidos del nivel ----------
  buildSolids() {
    const T = this.tex, L = this.g.L;
    const roca = this.std({ map: T.roca, roughness: 0.9 });
    const ruina = this.std({ map: T.ruina, emissiveMap: T.ruinaLuz, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.75 });
    const sant = this.std({ map: T.santuario, emissiveMap: T.santuarioLuz, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.2 });
    const est = this.std({ map: T.estacion, emissiveMap: T.estacionLuz, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.4, metalness: 0.55 });
    this.M = {
      arena: [roca, this.std({ map: T.arena, roughness: 0.92 })],
      jardin: [roca, this.std({ map: T.jardin, roughness: 0.95 })],
      roca: [roca], ruina: [ruina], santuario: [sant], estacion: [est],
      placa: [this.std({ map: T.placa, roughness: 0.8 })],
      piedra: [this.std({ color: 0xe0905a, roughness: 0.5, map: T.roca })],
      torre: [this.std({ map: T.metal, color: 0xb8c0d0, roughness: 0.35, metalness: 0.8 })],
      reja: [this.std({ map: T.metal, color: 0x9aa4b8, metalness: 0.85, roughness: 0.3 })],
      vidrio: [new THREE.MeshPhysicalMaterial({ color: 0xd8f4ff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.5 })],
      ...(this.escena.materiales?.() || {})
    };
    this.solidMeshes = new Map(); this.solidBuckets = new Map();
    const Z = L.chase ? L.chase.zona : null;
    for (const s of L.solids) {
      if (s.crate || s.invisible || s.ghost || s.door || s.temp || s.exit) continue;
      const movil = this.g.L.moviles.find(q => q.s === s);
      const w = s.x1 - s.x0, h = s.y1 - s.y0, d = s.z1 - s.z0, cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2, cz = (s.z0 + s.z1) / 2;
      const set = this.M[s.mat] || this.M.arena;
      let geo, mat;
      if (set.length > 1) {
        geo = new THREE.BoxGeometry(w, h, d); mat = [set[0], set[0], set[1], set[0], set[0], set[0]];
        worldUV(geo, cx, cy, cz, 1 / 5);
        const n = geo.attributes.normal, uv = geo.attributes.uv, pp = geo.attributes.position;
        for (let i = 0; i < pp.count; i++) if (Math.abs(n.getY(i)) < 0.5) { const ax = Math.abs(n.getX(i)); uv.setXY(i, ((ax > 0.5 ? pp.getZ(i) + cz : pp.getX(i) + cx)) / 8, (pp.getY(i) + cy) / 8); }
      } else {
        const rad = Math.min(0.08, w / 4, h / 4, d / 4);
        geo = rad > 0.02 && !s.wall ? new RoundedBoxGeometry(w, h, d, 2, rad) : new THREE.BoxGeometry(w, h, d); mat = set[0];
        worldUV(geo, cx, cy, cz, s.wall || h > 3 ? 1 / 6 : 1 / 3);
      }
      const cast = ['torre', 'piedra', 'placa'].includes(s.mat) || (!s.wall && h < 3 && s.y1 > 0.5);
      const erasable = Z && !s.wall && s.z0 < Z[0] && s.z0 > Z[1];
      if (!s.falling && !erasable && !movil && s.mat !== 'vidrio') { this.bucketSolid(geo, mat, cx, cy, cz, cast); continue; }
      const m = this.mesh(geo, mat, cx, cy, cz, { cast });
      this.solidMeshes.set(s, m);
    }
    for (const [mat, b] of this.solidBuckets) {
      const m = new THREE.Mesh(mergeGeometries(b.list, false), mat); m.receiveShadow = true; m.castShadow = b.cast; this.scene.add(m);
    }
  }
  bucketSolid(geo, mat, x, y, z, cast) {
    const add = (g, m) => {
      g.translate(x, y, z);
      if (!this.solidBuckets.has(m)) this.solidBuckets.set(m, { list: [], cast: false });
      const b = this.solidBuckets.get(m); b.list.push(g); b.cast = b.cast || cast;
    };
    if (!Array.isArray(mat)) { add(geo.index ? geo.toNonIndexed() : geo, mat); return; }
    const idx = geo.index.array, attrs = ['position', 'normal', 'uv'];
    for (const gr of geo.groups) {
      const out = new THREE.BufferGeometry();
      for (const a of attrs) {
        const src = geo.attributes[a], n = src.itemSize, arr = new Float32Array(gr.count * n);
        for (let i = 0; i < gr.count; i++) { const v = idx[gr.start + i]; for (let k = 0; k < n; k++) arr[i * n + k] = src.array[v * n + k]; }
        out.setAttribute(a, new THREE.BufferAttribute(arr, n));
      }
      add(out, mat[gr.materialIndex]);
    }
  }

  // ---------- cajas (InstancedMesh por tipo; TNT individuales por su cuenta atrás) ----------
  buildCrates() {
    const L = this.g.L, T = this.tex;
    const geo = new RoundedBoxGeometry(0.9, 0.9, 0.9, 3, 0.05); geo.translate(0, 0.45, 0);
    this.crateSets = {};
    for (const type of ['normal', 'rebote', 'fragmentos', 'checkpoint', 'cristal']) {
      const list = L.crates.filter(c => c.type === type); if (!list.length) continue;
      const mat = type === 'cristal'
        ? this.std({ map: T.caja.cristal, transparent: true, opacity: 0.78, roughness: 0.05, metalness: 0.1, envMapIntensity: 1.6 })
        : this.std({ map: T.caja[type], roughness: 0.62, emissive: 0xffffff, emissiveMap: T.caja[type], emissiveIntensity: 0.08 });
      const im = new THREE.InstancedMesh(geo, mat, list.length); im.castShadow = true; im.receiveShadow = true;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      if (type === 'cristal') for (let i = 0; i < list.length; i++) im.setColorAt(i, HEX(0xffffff));
      this.scene.add(im); this.crateSets[type] = { im, list };
    }
    this.tntMeshes = L.crates.filter(c => c.type === 'tnt').map(c => {
      const m = this.mesh(geo, this.std({ map: T.caja.tnt, roughness: 0.55, emissive: 0xffffff, emissiveMap: T.caja.tnt, emissiveIntensity: 0.15 }), c.x, c.y, c.z);
      this.lejos(m, c.z);
      return { c, m };
    });
    this.shardIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.18, 0.06), this.std({ color: 0xffffff, roughness: 0.6 }), this.g.shards.items.length);
    this.shardIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scene.add(this.shardIM);
    this.shardCols = [HEX(0xc27a3a), HEX(0xd8f2ff), HEX(0xd8482a)];
    for (let i = 0; i < this.shardIM.count; i++) this.shardIM.setColorAt(i, this.shardCols[0]);
  }

  // ---------- partículas, conchas, registros, piezas, cristales, puntos de control ----------
  buildCollectibles() {
    const g = this.g, L = g.L;
    const fg = new THREE.OctahedronGeometry(0.2, 0); fg.scale(1, 1.35, 1);
    const fm = this.nacar({ color: 0xfff0f8, emissive: 0xff9ad6, emissiveIntensity: 0.55, roughness: 0.12 });
    const n = L.frags.length + g.popFrags.items.length;
    this.fragIM = new THREE.InstancedMesh(fg, fm, n); this.fragIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scene.add(this.fragIM);
    this.fragGlowPos = new Float32Array(n * 3);
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(this.fragGlowPos, 3));
    this.fragGlow = new THREE.Points(gg, new THREE.PointsMaterial({ size: 0.9, map: this.tex.glow, color: 0xffb8e8, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.fragGlow.frustumCulled = false; this.scene.add(this.fragGlow);
    // concha de nácar: media esfera con brillo iridiscente
    const cg = new THREE.SphereGeometry(0.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); cg.scale(1, 0.55, 1.15);
    const ribs = new THREE.TorusGeometry(0.3, 0.025, 6, 24, Math.PI); ribs.rotateX(Math.PI / 2); ribs.scale(1, 1, 1.15);
    const conchaGeo = mergeGeometries([ni(cg), ni(ribs)].map(q => { q.deleteAttribute('uv'); return q; }));
    const cm = this.nacar({ side: THREE.DoubleSide, emissive: 0xffc8ee, emissiveIntensity: 0.25 });
    this.conchaPick = L.conchas.map(c => { const m = this.mesh(conchaGeo, cm, c.x, c.y + 1, c.z); this.glow(0xffd0f0, 1.6, 0, 0, 0, 0.55, m); this.lejos(m, c.z); return { c, m }; });
    this.conchaMat2 = cm.clone();
    this.conchaMates = [0, 1, 2].map(() => { const m = this.mesh(conchaGeo, this.conchaMat2, 0, 0, 0, { cast: false }); m.scale.setScalar(0.7); m.visible = false; return m; });
    const rm = new THREE.MeshStandardMaterial({ map: this.tex.registro, emissive: 0xffffff, emissiveMap: this.tex.registro, emissiveIntensity: 0.7, roughness: 0.4 });
    this.registroMeshes = L.registros.map(p => { const m = this.mesh(new THREE.BoxGeometry(0.5, 0.64, 0.06), rm, p.x, p.y + 1, p.z, { cast: false }); this.glow(0x9fe8ff, 1.9, 0, 0, 0, 0.55, m); this.lejos(m, p.z); return { p, m }; });
    // piezas del recolector: engranajes dorados
    const gear = [new THREE.CylinderGeometry(0.26, 0.26, 0.12, 20)];
    for (let i = 0; i < 8; i++) { const b = new THREE.BoxGeometry(0.1, 0.12, 0.12); b.translate(0.3, 0, 0); b.rotateY(i * Math.PI / 4); gear.push(b); }
    const gearGeo = mergeGeometries(gear.map(q => { const k = ni(q); k.deleteAttribute('uv'); return k; })); gearGeo.rotateX(Math.PI / 2);
    const gm = this.std({ color: 0xf2c060, metalness: 0.9, roughness: 0.25, emissive: 0x6a4010, emissiveIntensity: 0.5 });
    this.piezaMeshes = L.piezas.map(q => { const m = this.mesh(gearGeo, gm, q.x, q.y + 1, q.z); this.glow(0xffd070, 1.4, 0, 0, 0, 0.6, m); return { q, m }; });
    // cristales de memoria
    const crG = new THREE.OctahedronGeometry(0.42, 0); crG.scale(0.8, 1.5, 0.8);
    this.cristalMeshes = L.cristales.map(c => {
      const grp = new THREE.Group(); grp.position.set(c.x, c.y, c.z); this.scene.add(grp);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.9, 8), this.M.ruina[0]); ped.position.y = 0.45; ped.castShadow = ped.receiveShadow = true; grp.add(ped);
      const cr = new THREE.Mesh(crG, this.nacar({ color: 0xe8f4ff, emissive: 0x8ad8ff, emissiveIntensity: 0.9, transparent: true, opacity: 0.92 })); cr.position.y = 1.9; grp.add(cr);
      const gl = this.glow(0xa8e8ff, 3.2, 0, 1.9, 0, 0.8, grp);
      this.lejos(grp, c.z);
      return { c, grp, cr, gl };
    });
    const ckMat = this.nacar({ emissive: 0x6a7a9a, emissiveIntensity: 0.4 });
    this.ckMeshes = L.checkpoints.map(k => {
      const m = this.mesh(new THREE.TorusGeometry(0.7, 0.06, 10, 48), ckMat.clone(), k.x, k.y + 0.06, k.z, { cast: false, rx: -Math.PI / 2 });
      this.lejos(m, k.z, true);
      return { k, m };
    });
  }

  // ---------- enemigos comunes ----------
  buildEnemies() {
    const L = this.g.L, T = this.tex;
    // escarabajo: caparazón + patas fusionados (una draw call por bicho)
    const parts = [];
    const shell = new THREE.SphereGeometry(0.32, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55); shell.scale(1.15, 0.9, 1.25); shell.translate(0, 0.18, 0); parts.push(shell);
    const head = new THREE.SphereGeometry(0.14, 12, 8); head.translate(0, 0.2, 0.38); parts.push(head);
    for (let i = 0; i < 6; i++) { const l = new THREE.CylinderGeometry(0.025, 0.02, 0.32, 5); l.rotateZ(i < 3 ? 0.9 : -0.9); l.translate(i < 3 ? 0.3 : -0.3, 0.1, (i % 3 - 1) * 0.2); parts.push(l); }
    const body = mergeGeometries(parts.map(q => { const k = ni(q); k.deleteAttribute('uv'); return k; }));
    const pasivo = this.std({ color: 0xc8a890, roughness: 0.45, metalness: 0.2 });
    const ladron = this.std({ color: 0xf2c84a, roughness: 0.4, metalness: 0.2, emissive: 0x3a2a00, emissiveIntensity: 0.3 });
    const comun = this.std({ color: 0x8a5a9a, roughness: 0.35, metalness: 0.3 });
    const sackG = new THREE.SphereGeometry(0.2, 12, 8);
    const sackM = this.std({ color: 0x7a5a3a, roughness: 0.9 });
    // variantes de otros mundos: saltador del vacío (bola con orejas) y constructor (robot con casco)
    const salG = mergeGeometries([new THREE.SphereGeometry(0.34, 18, 12).translate(0, 0.34, 0), new THREE.ConeGeometry(0.08, 0.4, 8).translate(-0.15, 0.78, 0), new THREE.ConeGeometry(0.08, 0.4, 8).translate(0.15, 0.78, 0)].map(q => { const k = ni(q); k.deleteAttribute('uv'); return k; }));
    const salM = this.std({ color: 0x6a5ad8, roughness: 0.4, emissive: 0x2a1a6a, emissiveIntensity: 0.4 });
    const conG = mergeGeometries([new RoundedBoxGeometry(0.6, 0.55, 0.5, 2, 0.1).translate(0, 0.42, 0), new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.7, 0), new THREE.CylinderGeometry(0.06, 0.06, 0.2, 6).translate(-0.15, 0.1, 0), new THREE.CylinderGeometry(0.06, 0.06, 0.2, 6).translate(0.15, 0.1, 0)].map(q => { const k = ni(q); k.deleteAttribute('uv'); return k; }));
    const conM = this.std({ color: 0xe8b84a, roughness: 0.4, metalness: 0.3 });
    this.bichoMeshes = L.bichos.map(b => {
      const grp = new THREE.Group(); this.scene.add(grp);
      const m = new THREE.Mesh(b.salta ? salG : b.constructor_ ? conG : body, b.salta ? salM : b.constructor_ ? conM : b.ladron ? ladron : b.pasivo ? pasivo : comun); m.castShadow = true; grp.add(m);
      if (b.salta || b.constructor_) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.04), this.basic(0x9ff0ff, { toneMapped: false })); e.position.set(0, b.salta ? 0.42 : 0.5, b.salta ? 0.33 : 0.27); grp.add(e); grp.userData.squ = m; }
      if (b.ladron) { const s = new THREE.Mesh(sackG, sackM); s.position.set(0, 0.42, -0.2); grp.add(s); grp.userData.sack = s; for (let i = 0; i < 3; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.08), this.basic(0x2a2230)); st.position.set(0, 0.36, -0.15 + i * 0.16); grp.add(st); } }
      grp.add(this.blob(0.45));
      this.lejos(grp, b.z);
      return { b, grp };
    });
    // barredores: fragmento de vidrio negro o recolectora fuera de control
    this.formaMeshes = L.formas.map(f => { const grp = f.kind === 'recolectora' ? this.makeRecolectora(1) : this.makeFragmento(); this.lejos(grp, f.z); return { f, grp }; });
    // centinelas
    this.centMeshes = L.centinelas.map(c => { const o = c.tipo === 'dron' ? this.makeDron() : this.makeCentinela(); this.lejos(o.grp, c.z); if (o.shadow) this.lejos(o.shadow, c.z); return { c, ...o }; });
    // esferas resonantes
    this.esferaMeshes = L.esferas.map(s => {
      const grp = new THREE.Group(); grp.position.set(s.x, s.y, s.z); this.scene.add(grp);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 0.5, 10), this.M.santuario[0]); ped.position.y = 0.25; ped.receiveShadow = true; grp.add(ped);
      const mat = this.nacar({ color: s.color || 0xd8d0ff, emissive: s.brillo || 0x9a7aff, emissiveIntensity: 0.6 });
      const sph = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 16), mat); sph.position.y = 1.1; sph.castShadow = true; grp.add(sph);
      const gl = this.glow(s.brillo || 0xb89aff, 2.6, 0, 1.1, 0, 0.6, grp);
      this.lejos(grp, s.z, true);
      return { s, sph, gl, mat };
    });
    // ondas (anillos en el suelo)
    const ringG = new THREE.RingGeometry(0.88, 1, 64); ringG.rotateX(-Math.PI / 2);
    this.ondaMeshes = this.g.ondas.items.map(() => { const m = new THREE.Mesh(ringG, this.basic(0xd8b8ff, { transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.visible = false; this.scene.add(m); return m; });
    // eco: el reflejo de DIP (mismo sprite, en tono fantasma)
    const sheet = this.assets.dip, h = 1.8, w = h * sheet.fw / sheet.fh;
    this.ecoTex = null;
    this.ecoMeshes = L.ecos.map(e => {
      const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x9adcff, transparent: true, opacity: 0.6, alphaTest: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      m.visible = false; this.scene.add(m); return { e, m };
    });
  }
  makeFragmento() {
    const grp = new THREE.Group(); this.scene.add(grp);
    const mat = this.std({ color: 0x15121c, metalness: 0.95, roughness: 0.08, envMapIntensity: 1.6 });
    const parts = [];
    for (let i = 0; i < 4; i++) { const o = new THREE.OctahedronGeometry(0.35 + i * 0.08, 0); o.scale(0.6, 1.8 - i * 0.2, 0.6); o.rotateZ((i - 1.5) * 0.35); o.translate((i - 1.5) * 0.35, 0.75, 0); parts.push(ni(o)); }
    const m = new THREE.Mesh(mergeGeometries(parts), mat); m.castShadow = true; grp.add(m); grp.userData.spin = m;
    this.glow(0xff7ab8, 1.6, 0, 0.6, 0, 0.35, grp);
    grp.add(this.blob(1));
    return grp;
  }
  makeRecolectora(s) {
    const grp = new THREE.Group(); this.scene.add(grp);
    const bodyM = this.std({ color: 0xd88a3a, metalness: 0.5, roughness: 0.4, map: this.tex.metal });
    const b = new THREE.Mesh(new RoundedBoxGeometry(1.5 * s, 0.9 * s, 1.1 * s, 3, 0.12), bodyM); b.position.y = 0.65 * s; b.castShadow = true; grp.add(b);
    const blades = new THREE.Group(); blades.position.set(0, 0.45 * s, 0.6 * s); grp.add(blades);
    const bm = this.std({ color: 0xc8ccd6, metalness: 0.9, roughness: 0.25 });
    for (let i = 0; i < 6; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(1.5 * s, 0.06, 0.18), bm); bl.rotation.x = i * Math.PI / 3; blades.add(bl); }
    grp.userData.blades = blades;
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.7 * s, 0.12 * s, 0.05), this.basic(0xff4a3a, { toneMapped: false })); eye.position.set(0, 0.95 * s, 0.56 * s); grp.add(eye);
    this.glow(0xff5a3a, 1.4 * s, 0, 0.95 * s, 0.6 * s, 0.5, grp);
    grp.add(this.blob(1.0 * s));
    return grp;
  }
  makeCentinela() {
    const grp = new THREE.Group(); this.scene.add(grp);
    const stone = this.std({ color: 0xcfc6c2, roughness: 0.6, map: this.tex.ruina });
    const body = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.95, 0.9, 3, 0.14), stone); body.position.y = 0.75; body.castShadow = true; grp.add(body);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.42, 4), stone); crown.position.y = 1.42; crown.rotation.y = Math.PI / 4; crown.castShadow = true; grp.add(crown);
    const eyeMat = this.basic(0x7fe6ff, { toneMapped: false });
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.06), eyeMat); eye.position.set(0, 0.86, 0.46); grp.add(eye);
    const legs = [];
    for (const [x, z] of [[-0.4, 0.3], [0.4, 0.3], [-0.4, -0.3], [0.4, -0.3]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.4, 6), stone); l.position.set(x, 0.2, z); l.castShadow = true; grp.add(l); legs.push(l); }
    const gl = this.glow(0x7fe6ff, 1.2, 0, 0.86, 0.5, 0.5, grp);
    const sign = this.sprite(this.tex.alerta, 0.7, grp); sign.position.y = 2.1; sign.visible = false;
    const stars = [0, 1, 2].map(() => this.glow(0xffe680, 0.45, 0, 0, 0, 0.9, grp));
    grp.add(this.blob(0.7));
    return { grp, eyeMat, gl, sign, stars, legs };
  }
  makeDron() {
    const grp = new THREE.Group(); this.scene.add(grp);
    const m = this.std({ color: 0xe8ecf4, metalness: 0.6, roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), m); body.castShadow = true; grp.add(body);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 32), m); ring.rotation.x = Math.PI / 2; grp.add(ring);
    const eyeMat = this.basic(0x7fe6ff, { toneMapped: false });
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), eyeMat); eye.position.set(0, 0, 0.32); grp.add(eye);
    const gl = this.glow(0x7fe6ff, 1.0, 0, 0, 0.35, 0.6, grp);
    const sign = this.sprite(this.tex.alerta, 0.6, grp); sign.position.y = 0.9; sign.visible = false;
    const stars = [0, 1, 2].map(() => this.glow(0xffe680, 0.4, 0, 0, 0, 0.9, grp));
    const shadow = this.blob(0.5); this.scene.add(shadow);
    return { grp, eyeMat, gl, sign, stars, ring, shadow };
  }

  // ---------- recuerdos: anclas y piezas fantasma ----------
  buildMemoria() {
    const L = this.g.L;
    this.memMeshes = new Map();
    const faceM = this.nacar({ color: 0xe8f6ff, emissive: 0x6ad0ff, emissiveIntensity: 0.4, transparent: true, opacity: 0.95 });
    const edgeM = new THREE.LineBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const m of L.memorias) for (const s of m.targets) {
      const w = s.x1 - s.x0, h = s.y1 - s.y0, d = s.z1 - s.z0;
      const geo = new RoundedBoxGeometry(w, h, d, 2, 0.06);
      const grp = new THREE.Group(); grp.position.set((s.x0 + s.x1) / 2, s.y0, (s.z0 + s.z1) / 2); this.scene.add(grp);
      geo.translate(0, h / 2, 0);
      const face = new THREE.Mesh(geo, faceM.clone()); face.castShadow = true; face.receiveShadow = true; grp.add(face);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0)), edgeM.clone()); grp.add(edges);
      this.lejos(grp, grp.position.z);
      this.memMeshes.set(s, { grp, face, edges, mem: m });
    }
    const pedM = this.M.ruina[0], ringM = this.basic(0x9fe8ff, { transparent: true, opacity: 0.9, toneMapped: false, side: THREE.DoubleSide });
    this.anclaMeshes = L.memorias.map(m => {
      const grp = new THREE.Group(); grp.position.set(m.x, m.y, m.z); this.scene.add(grp);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.35, 12), pedM); ped.position.y = 0.17; ped.castShadow = ped.receiveShadow = true; grp.add(ped);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 8, 48), ringM.clone()); ring.position.y = 1.1; grp.add(ring);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 8, 40), ringM.clone()); ring2.position.y = 1.1; grp.add(ring2);
      const core = new THREE.Mesh(m.interruptor ? new THREE.BoxGeometry(0.34, 0.34, 0.34) : new THREE.OctahedronGeometry(0.16, 0), this.nacar(m.interruptor ? { color: 0xffe8a0, emissive: 0xffb830, emissiveIntensity: 0.8 } : { emissive: 0x9fe8ff, emissiveIntensity: 1 })); core.position.y = 1.1; grp.add(core);
      if (m.interruptor) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8), this.std({ color: 0xd8b060, metalness: 0.9, roughness: 0.3 })); arm.position.y = 0.6; grp.add(arm); }
      const gl = this.glow(0x9fe8ff, 2.2, 0, 1.1, 0, 0.5, grp);
      this.lejos(grp, m.z);
      return { m, grp, ring, ring2, core, gl };
    });
  }

  // ---------- puertas y plataformas temporales ----------
  buildMecanismos() {
    const L = this.g.L, T = this.tex;
    const panel = this.std({ map: T.estacion, emissiveMap: T.estacionLuz, emissive: 0xffffff, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.35 });
    this.puertaMeshes = L.puertas.map(d => {
      const w = d.x1 - d.x0, grp = new THREE.Group(); grp.position.set((d.x0 + d.x1) / 2, d.y, d.z); this.scene.add(grp);
      const door = new THREE.Mesh(new THREE.BoxGeometry(w, d.top, 0.5), panel); door.position.y = d.top / 2; door.castShadow = true; grp.add(door);
      const frameM = this.std({ color: 0x3a4256, metalness: 0.8, roughness: 0.3 });
      for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.3, d.top + 1.4, 0.7), frameM); f.position.set(sx * (w / 2 + 0.15), (d.top + 1.4) / 2, 0); f.castShadow = true; grp.add(f); }
      const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.4, 0.7), frameM); top.position.y = d.top + 1.2; grp.add(top);
      const signM = new THREE.MeshBasicMaterial({ map: T.cartelCerrado, toneMapped: false });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.64), signM); sign.position.set(0, d.top + 1.2, 0.36); grp.add(sign);
      const sign2 = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.64), signM); sign2.position.set(0, d.top + 1.2, -0.36); sign2.rotation.y = Math.PI; grp.add(sign2);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), this.basic(0xffd36a, { toneMapped: false })); lamp.position.set(w / 2 - 0.3, d.top + 1.2, 0.4); grp.add(lamp);
      this.lejos(grp, d.z, true);
      return { d, door, signM, lamp };
    });
    const tm = this.nacar({ color: 0xd8d0ff, emissive: 0x7a6aff, emissiveIntensity: 0.4, transparent: true, opacity: 1 });
    this.tempMeshes = L.temporales.map(q => {
      const s = q.s, w = s.x1 - s.x0, h = s.y1 - s.y0, d = s.z1 - s.z0;
      const m = this.mesh(new RoundedBoxGeometry(w, h, d, 2, 0.06), tm.clone(), (s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, (s.z0 + s.z1) / 2);
      this.lejos(m, q.s.z0);
      return { q, m };
    });
  }

  // textura de agua que sube (cascadas); la crea quien la necesite primero
  agua() {
    if (this.aguaTex) return this.aguaTex;
    const wc = document.createElement('canvas'); wc.width = 64; wc.height = 256; const x = wc.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, 'rgba(160,230,255,.15)'); gr.addColorStop(0.5, 'rgba(220,250,255,.75)'); gr.addColorStop(1, 'rgba(160,230,255,.15)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.5})`; x.fillRect(Math.random() * 64, Math.random() * 256, 2, 10 + Math.random() * 30); }
    this.aguaTex = new THREE.CanvasTexture(wc); this.aguaTex.wrapS = this.aguaTex.wrapT = THREE.RepeatWrapping; this.aguaTex.colorSpace = THREE.SRGBColorSpace;
    return this.aguaTex;
  }

  // ---------- cascadas ascendentes, campos de gravedad y medusas ----------
  buildFisica() {
    const L = this.g.L;
    this.agua();
    this.corrMeshes = L.corrientes.map(c => {
      const h = c.y1 - c.y0, tex = this.aguaTex.clone(); tex.needsUpdate = true; tex.repeat.set(2, h / 6);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(c.r * 0.85, c.r, h, 24, 1, true), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, color: 0x9fe8ff }));
      m.position.set(c.x, c.y0 + h / 2, c.z); this.scene.add(m);
      const top = this.glow(0xc8f4ff, c.r * 3, c.x, c.y1, c.z, 0.5);
      this.lejos(m, c.z); this.lejos(top, c.z);
      return { c, m, tex, top };
    });
    const col = { invertida: 0xb89aff, ligera: 0x9fe8ff, pesada: 0xffa060 };
    this.campoMeshes = L.campos.filter(c => !c.oculto).map(c => {
      const w = c.x1 - c.x0, h = c.y1 - c.y0, d = c.z1 - c.z0;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: col[c.tipo], transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      m.position.set((c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2, (c.z0 + c.z1) / 2); this.scene.add(m);
      const n = Math.round(w * d * 0.6), pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { pos[i * 3] = c.x0 + Math.random() * w; pos[i * 3 + 1] = c.y0 + Math.random() * h; pos[i * 3 + 2] = c.z0 + Math.random() * d; }
      const pts = this.points(pos, col[c.tipo], 0.5, 0.55);
      this.lejos(m, (c.z0 + c.z1) / 2); this.lejos(pts, (c.z0 + c.z1) / 2);
      return { c, m, pts, base: pos.slice() };
    });
    const jm = this.nacar({ color: 0xc8f0ff, emissive: 0x5ac8ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 });
    this.medusaMeshes = L.medusas.map(q => {
      const grp = new THREE.Group(); this.scene.add(grp);
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), jm); bell.scale.y = 0.8; grp.add(bell);
      const tents = [];
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, tt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.01, 0.9, 5), jm); tt.position.set(Math.cos(a) * 0.35, -0.45, Math.sin(a) * 0.35); grp.add(tt); tents.push(tt); }
      this.glow(0x9fe8ff, 2.2, 0, 0.1, 0, 0.5, grp);
      this.lejos(grp, q.z);
      return { q, grp, bell, tents };
    });
  }

  // ---------- DIP (billboard pixel art) ----------
  buildDip() {
    const sheet = this.assets.dip;
    const tex = this.dipTex = new THREE.CanvasTexture(sheet.img);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(1 / sheet.cols, 1 / sheet.rows);
    const h = 1.8, w = h * sheet.fw / sheet.fh;
    const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
    this.dip = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, toneMapped: false, fog: false }));
    this.dip.castShadow = true;
    this.dip.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
    this.scene.add(this.dip);
    this.dipShadow = this.blob(0.42); this.scene.add(this.dipShadow);
    // el eco usa la misma hoja con su propia ventana de UV
    this.ecoTex = tex.clone(); this.ecoTex.needsUpdate = true;
    for (const { m } of this.ecoMeshes) { m.material.map = this.ecoTex; m.material.needsUpdate = true; }
  }

  buildFx() {
    const n = this.g.particles.items.length;
    this.pPos = new Float32Array(n * 3); this.pCol = new Float32Array(n * 3);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    this.points = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.22, map: this.tex.dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.points.frustumCulled = false; this.scene.add(this.points);
    this.gateMesh = null;
  }

  resize(cssW, cssH) {
    this.css = [cssW, cssH];
    this.prMax = Math.min(window.devicePixelRatio || 1, this.mobile ? 1.5 : 2);
    if (!this.pr) this.pr = this.prMax;
    this.pr = Math.min(this.pr, this.prMax);
    this.renderer.setPixelRatio(this.pr); this.renderer.setSize(cssW, cssH, false);
    this.camera.aspect = cssW / Math.max(1, cssH);
    this.camera.fov = this.camera.aspect < 1 ? CONFIG.camFov + 18 : CONFIG.camFov;
    this.camera.updateProjectionMatrix();
    this.g.view.w = cssW; this.g.view.h = cssH;
  }
  project(x, y, z) { const v = this.tmpV.set(x, y, z).project(this.camera); return { x: (v.x + 1) / 2, y: (1 - v.y) / 2, on: v.z < 1 && v.z > -1 }; }
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

  // =====================================================================
  draw(dt) {
    this.adapt(dt);
    const g = this.g, t = (this.t += dt), a = g.alpha, v = g.prev, c = g.cam;
    this.applyEnv(dt);
    this.skyU.time.value = t;
    const tr = Math.min(1, c.shake), sh = tr * tr * CONFIG.shakeAmp;
    const cx = v.cx + (c.x - v.cx) * a + (Math.random() * 2 - 1) * sh, cy = v.cy + (c.y - v.cy) * a + (Math.random() * 2 - 1) * sh, cz = v.cz + (c.z - v.cz) * a;
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(c.look.x, c.look.y, c.look.z);
    this.camera.rotation.z += (Math.random() * 2 - 1) * 0.03 * tr * tr + (c.roll || 0);
    this.dome.position.copy(this.camera.position);
    const p = g.player, px = v.px + (p.pos.x - v.px) * a, py = v.py + (p.pos.y - v.py) * a, pz = v.pz + (p.pos.z - v.pz) * a;
    const fz = g.mode === 'titulo' ? 6 : pz;
    this.sun.position.set(px - 14, py + 26, fz + 18); this.sun.target.position.set(px, py, fz - 4);
    this.fill.position.set(px + 1.5, py + 3, pz + 2);
    this.drawSolids(t);
    this.drawCrates(t);
    this.drawCollectibles(t, px, py, pz);
    this.drawEnemies(t);
    this.drawMemoria(t);
    this.drawMecanismos(t);
    this.drawFisica(t);
    this.escena.draw(t, dt, px, py, pz);
    this.cull(g.mode === 'titulo' ? 6 : pz);
    this.drawDip(t, px, py, pz);
    this.drawParticles();
    this.renderer.render(this.scene, this.camera);
  }

  // recorte por distancia: lo que está a más de ~70 m por delante o 25 m por detrás no se dibuja
  // fijo = nadie más toca su visibilidad (se enciende y apaga solo por distancia)
  lejos(obj, z, fijo = false) { this.lejanos.push({ obj, z, fijo }); return obj; }
  cull(pz) {
    const back = this.g.chase.on ? 70 : 25, front = this.g.chase.on ? 25 : 75;
    for (const o of this.lejanos) {
      const cerca = o.z <= pz + back && o.z >= pz - front;
      if (o.fijo) o.obj.visible = cerca; else if (!cerca) o.obj.visible = false;
    }
  }

  applyEnv(dt) {
    const T = this.escena.ENV[this.escena.envName()];
    const e = this.env || (this.env = { bg: HEX(T.bg), fog: HEX(T.fog), hs: HEX(T.hs), hg: HEX(T.hg), sun: HEX(T.sun), top: HEX(T.top), hor: HEX(T.hor), near: T.near, far: T.far, hi: T.hi, si: T.si, band: T.band, stars: T.stars });
    const k = 1 - Math.exp(-dt * 1.4);
    for (const key of ['bg', 'fog', 'hs', 'hg', 'sun', 'top', 'hor']) e[key].lerp(this.tmpC.set(T[key]), k);
    for (const key of ['near', 'far', 'hi', 'si', 'band', 'stars']) e[key] += (T[key] - e[key]) * k;
    this.scene.background.copy(e.bg); this.scene.fog.color.copy(e.fog); this.scene.fog.near = e.near; this.scene.fog.far = e.far;
    this.hemi.color.copy(e.hs); this.hemi.groundColor.copy(e.hg); this.hemi.intensity = e.hi;
    this.sun.color.copy(e.sun); this.sun.intensity = e.si;
    this.skyU.top.value.copy(e.top); this.skyU.hor.value.copy(e.hor); this.skyU.band.value = e.band; this.starMat.opacity = e.stars;
  }

  drawSolids(t) {
    const g = this.g;
    for (const f of g.L.falling) {
      const m = this.solidMeshes.get(f.s); if (!m) continue;
      m.position.y = (f.s.y0 + f.s.y1) / 2 + (f.state === 'tiembla' ? Math.sin(t * 80) * 0.03 : 0);
      m.visible = (f.s.active || f.state === 'cae') && !f.s.erased;
    }
    if (g.chase.on || g.chase.done) for (const [s, m] of this.solidMeshes) if (!s.falling) m.visible = !s.erased;
    for (const q of g.L.moviles) { const m = this.solidMeshes.get(q.s); if (m) m.position.set((q.s.x0 + q.s.x1) / 2, (q.s.y0 + q.s.y1) / 2, (q.s.z0 + q.s.z1) / 2); }
    if (g.gate && !this.gateMesh) {
      const gs = g.gate; this.gateMesh = new THREE.Group(); this.scene.add(this.gateMesh);
      for (let x = gs.x0 + 0.4; x < gs.x1; x += 0.8) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, gs.y1 - gs.y0, 8), this.M.reja[0]); b.position.set(x, (gs.y0 + gs.y1) / 2, (gs.z0 + gs.z1) / 2); this.gateMesh.add(b); }
    }
    if (this.gateMesh) this.gateMesh.visible = !!(g.gate && g.gate.active);
  }

  drawCrates(t) {
    const g = this.g, M = this.tmpM, Q = this.tmpQ, S = this.tmpS, V = this.tmpV;
    for (const type in this.crateSets) {
      const { im, list } = this.crateSets[type];
      for (let i = 0; i < list.length; i++) {
        const c = list[i], vis = c.alive && !c.s.erased;
        const sq = c.squash || 0, sy = vis ? 1 - sq * 0.25 : 0.0001, sx = vis ? 1 + sq * 0.12 : 0.0001;
        Q.identity(); S.set(sx, sy, sx); V.set(c.x, c.y, c.z);
        M.compose(V, Q, S); im.setMatrixAt(i, M);
        if (type === 'cristal') im.setColorAt(i, this.tmpC.set(c.hits >= 1 ? 0xffb0b0 : 0xffffff));
      }
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
    for (const { c, m } of this.tntMeshes) {
      m.visible = c.alive && !c.s.erased; m.position.y = c.y;
      if (c.fuse !== undefined && c.alive) {
        const n = Math.max(1, Math.min(3, Math.ceil(c.fuse))), tex = this.tex.tntNum[n - 1];
        if (m.material.map !== tex) { m.material.map = tex; m.material.emissiveMap = tex; m.material.needsUpdate = true; }
        m.material.emissiveIntensity = 0.3 + (Math.sin(t * (8 + (3 - c.fuse) * 10)) > 0 ? 0.9 : 0);
        const s = 1 + Math.max(0, Math.sin(t * 20)) * 0.05; m.scale.set(s, s, s);
      }
    }
    const items = g.shards.items;
    for (let i = 0; i < items.length; i++) {
      const o = items[i];
      if (!o.active) { M.makeScale(0, 0, 0); this.shardIM.setMatrixAt(i, M); continue; }
      this.tmpE.set(o.rx, o.ry, 0); Q.setFromEuler(this.tmpE); S.setScalar(Math.min(1, o.life * 2)); V.set(o.x, o.y, o.z);
      M.compose(V, Q, S); this.shardIM.setMatrixAt(i, M); this.shardIM.setColorAt(i, this.shardCols[o.kind]);
    }
    this.shardIM.instanceMatrix.needsUpdate = true; if (this.shardIM.instanceColor) this.shardIM.instanceColor.needsUpdate = true;
  }

  drawCollectibles(t, px, py, pz) {
    const g = this.g, M = this.tmpM, Q = this.tmpQ, S = this.tmpS, V = this.tmpV, L = g.L;
    let i = 0;
    this.tmpE.set(0, t * 2.5, 0); Q.setFromEuler(this.tmpE);
    const put = (x, y, z, s) => { S.setScalar(s); V.set(x, y, z); M.compose(V, Q, S); this.fragIM.setMatrixAt(i, M); this.fragGlowPos[i * 3] = x; this.fragGlowPos[i * 3 + 1] = s > 0.01 ? y : -999; this.fragGlowPos[i * 3 + 2] = z; i++; };
    for (const f of L.frags) put(f.x, f.y + Math.sin(t * 3 + f.z) * 0.08, f.z, f.alive ? 1 : 0.0001);
    for (const o of g.popFrags.items) put(o.x, o.y, o.z, o.active ? 1 : 0.0001);
    this.fragIM.instanceMatrix.needsUpdate = true; this.fragGlow.geometry.attributes.position.needsUpdate = true;
    for (const { c, m } of this.conchaPick) { m.visible = !c.got; m.position.y = c.y + 1 + Math.sin(t * 2) * 0.12; m.rotation.y = t * 1.5; m.rotation.x = 0.4; }
    this.conchaMat2.emissive.setHex(g.superT > 0 ? (Math.sin(t * 20) > 0 ? 0xffe8a0 : 0xffc8ee) : 0xffc8ee);
    this.conchaMates.forEach((m, k) => {
      m.visible = k < g.conchas && !g.player.hidden && g.mode === 'juego';
      const a = t * 2 + k * 2.1;
      m.position.set(px + Math.cos(a) * 0.75, py + 1.5 + Math.sin(t * 3 + k) * 0.1 + k * 0.15, pz + Math.sin(a) * 0.75);
      m.rotation.set(0.5, t * 2, 0);
    });
    for (const { p, m } of this.registroMeshes) { m.visible = !p.got; m.rotation.y = t * 1.6; m.position.y = p.y + 1 + Math.sin(t * 2.4) * 0.1; }
    for (const { q, m } of this.piezaMeshes) {
      m.visible = !q.got && (q.free || !!q.carrier);
      const lift = q.pop !== undefined && q.pop < 1 ? Math.sin(q.pop * Math.PI) * 1.6 : 0;
      m.position.set(q.x, q.y + (q.carrier ? 0.25 : 0.8) + lift + Math.sin(t * 3) * 0.08, q.z); m.rotation.y = t * 2.2;
    }
    for (const o of this.cristalMeshes) {
      const c = o.c;
      o.grp.visible = !c.got || (c.vuela !== undefined && c.vuela < 1);
      o.cr.rotation.y = t * 1.2;
      if (c.vuela !== undefined && c.vuela < 1) {
        const k = c.vuela, e = k * k;
        o.cr.position.set((px - c.x) * e, 1.9 + (py + 1.2 - c.y - 1.9) * e + Math.sin(k * Math.PI) * 1.2, (pz - c.z) * e); o.cr.scale.setScalar(1 - k * 0.7);
        o.gl.position.copy(o.cr.position);
      } else if (!c.got) { o.cr.position.set(0, 1.9 + Math.sin(t * 2) * 0.12, 0); o.gl.position.copy(o.cr.position); }
    }
    for (const { k, m } of this.ckMeshes) { m.material.emissive.setHex(k.on ? 0x6affc8 : 0x6a7a9a); m.material.emissiveIntensity = k.on ? 0.9 : 0.35; m.rotation.z = t * (k.on ? 1.5 : 0.3); }
  }

  drawEnemies(t) {
    const g = this.g, ch = g.chase;
    for (const { b, grp } of this.bichoMeshes) {
      grp.visible = b.alive && !(ch.on && b.z > ch.z);
      if (!grp.visible) continue;
      grp.position.set(b.x, b.y + (b.glitch > 0 ? 0.06 : 0) + Math.abs(Math.sin(t * 14 + b.hz)) * 0.03, b.z);
      grp.rotation.y = b.launched ? b.spinA : (b.axis === 'x' ? (b.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (b.dir > 0 ? 0 : Math.PI));
      grp.rotation.z = b.launched ? b.spinA * 0.7 : 0;
      if (grp.userData.sack) grp.userData.sack.scale.setScalar(0.6 + Math.min(1, (b.robado || 0) / 8) * 0.8);
      if (b.salta) { const pre = b.y <= (b.hy ?? b.y) + 0.01 && (b.hopT || 0) > b.salta - 0.35; grp.userData.squ.scale.set(pre ? 1.2 : 1, pre ? 0.75 : 1 + Math.min(0.25, Math.abs(b.vy || 0) * 0.03), pre ? 1.2 : 1); grp.position.y = b.y; }
    }
    for (const { f, grp } of this.formaMeshes) {
      grp.visible = f.alive && !(ch.on && f.z > ch.z);
      grp.position.set(f.x, f.y, f.z);
      if (f.kind === 'recolectora') { grp.rotation.y = f.dir > 0 ? Math.PI / 2 : -Math.PI / 2; grp.userData.blades.rotation.x = t * 14; }
      else { grp.userData.spin.rotation.y = t * 2.2; grp.position.y = f.y + 0.15 + Math.sin(t * 3) * 0.08; }
    }
    for (const o of this.centMeshes) {
      const c = o.c, dron = c.tipo === 'dron';
      o.grp.visible = c.alive && !(ch.on && c.z > ch.z);
      if (o.shadow) o.shadow.visible = o.grp.visible;
      if (!o.grp.visible) continue;
      o.grp.position.set(c.x, c.y + (dron ? Math.sin(t * 4 + c.hx) * 0.08 : 0), c.z);
      const pp = g.player.pos;
      const want = c.state === 'patrulla' ? (c.face > 0 ? Math.PI / 2 : -Math.PI / 2) : Math.atan2(pp.x - c.x, pp.z - c.z);
      o.grp.rotation.y = c.launched ? c.spinA : want;
      o.grp.rotation.z = c.launched ? c.spinA * 0.5 : c.state === 'recupera' ? Math.sin(t * 6) * 0.12 : 0;
      const col = c.state === 'dormido' ? 0x3a5a7a : c.state === 'detecta' || c.state === 'ataca' ? 0xff4a3a : c.state === 'recupera' ? 0xffd36a : 0x7fe6ff;
      o.eyeMat.color.setHex(col); o.gl.material.color.setHex(col); o.gl.material.opacity = c.state === 'dormido' ? 0.15 : 0.6;
      o.sign.visible = c.state === 'detecta' || c.state === 'dormido';
      if (o.sign.visible) {
        o.sign.material.map = c.state === 'dormido' ? this.tex.zzz : this.tex.alerta;
        o.sign.position.y = (dron ? 0.9 : 2.1) + (c.state === 'dormido' ? Math.sin(t * 2) * 0.12 : Math.abs(Math.sin(t * 12)) * 0.15);
        o.sign.scale.setScalar(c.state === 'dormido' ? 0.45 : 0.75);
      }
      o.stars.forEach((s, i) => { s.visible = c.state === 'recupera'; const a = t * 5 + i * 2.1; s.position.set(Math.cos(a) * 0.5, dron ? 0.6 : 1.85, Math.sin(a) * 0.5); });
      if (o.legs) o.legs.forEach((l, i) => { l.position.y = 0.2 + (c.state === 'patrulla' || c.state === 'ataca' ? Math.max(0, Math.sin(t * 14 + i * 1.6)) * 0.08 : 0); });
      if (o.ring) o.ring.rotation.z = t * 6;
      if (o.shadow) o.shadow.position.set(c.x, c.home - 2.2 + 0.03, c.z);
    }
    for (const o of this.esferaMeshes) {
      const s = o.s, warn = s.warn ? (Math.sin(t * 30) > 0 ? 1 : 0.4) : 0;
      o.mat.emissiveIntensity = 0.5 + warn * 1.2 + s.pulse * 2;
      o.sph.scale.setScalar(1 + s.pulse * 0.25 + warn * 0.06); o.sph.position.y = 1.1 + Math.sin(t * 1.5 + s.z) * 0.08;
      o.gl.material.opacity = 0.4 + warn * 0.4 + s.pulse * 0.5;
    }
    this.g.ondas.items.forEach((o, i) => {
      const m = this.ondaMeshes[i]; m.visible = o.active;
      if (!o.active) return;
      m.position.set(o.x, o.y + 0.06, o.z); m.scale.set(o.r, 1, o.r); m.material.opacity = 0.9 * (1 - o.r / o.max) + 0.1;
    });
    const sheet = this.assets.dip;
    for (const { e, m } of this.ecoMeshes) {
      m.visible = (e.vis || 0) > 0.02 && g.mode === 'juego';
      if (!m.visible) continue;
      sheet.setUV(this.ecoTex, e.moving ? 'run' : 'idle', t);
      m.position.set(e.x, e.y, e.z);
      m.rotation.y = Math.atan2(this.camera.position.x - e.x, this.camera.position.z - e.z);
      m.material.opacity = 0.55 * e.vis * (0.75 + Math.sin(t * 20) * 0.25);
    }
  }

  drawMemoria(t) {
    const g = this.g;
    for (const [s, o] of this.memMeshes) {
      const m = o.mem;
      o.grp.visible = m.state !== 'oculta' && !s.erased;
      if (!o.grp.visible) continue;
      if (s.active) {
        const f = s.form === undefined ? 1 : s.form, e = 1 - Math.pow(1 - f, 3);
        const blink = s.warn ? (Math.sin(t * (m.t < 0.8 ? 40 : 22)) > 0 ? 1 : 0.35) : 1;
        o.face.visible = true; o.face.scale.set(0.6 + 0.4 * e, e, 0.6 + 0.4 * e);
        o.face.material.opacity = 0.95 * blink; o.face.material.emissiveIntensity = 0.35 + (1 - f) * 1.5;
        o.edges.material.opacity = 0.5 * blink;
      } else {
        // pista: contorno que respira y caras casi invisibles
        o.face.visible = true; o.face.scale.set(1, 1, 1); o.face.material.opacity = 0.08 + Math.sin(t * 2 + s.z0) * 0.03; o.face.material.emissiveIntensity = 0.2;
        o.edges.material.opacity = 0.35 + Math.sin(t * 2 + s.z0) * 0.15;
      }
    }
    const near = g.memorias.near, puede = g.memorias.puede;
    for (const o of this.anclaMeshes) {
      const m = o.m;
      o.grp.visible = m.state !== 'oculta';
      if (!o.grp.visible) continue;
      const activa = m.state === 'activa', cerca = near === m || g.memorias.nearSwitch === m;
      const k = activa && m.dur !== Infinity ? Math.max(0, m.t / m.dur) : 1;
      o.ring.rotation.set(Math.PI / 2 + Math.sin(t) * 0.2, t * (activa ? 3 : 0.8), 0);
      o.ring2.rotation.set(Math.PI / 2, -t * 1.6, Math.sin(t * 1.3) * 0.4);
      o.ring.scale.setScalar(activa ? 0.4 + 0.6 * k : 1 + (cerca ? Math.sin(t * 8) * 0.08 : 0));
      o.core.rotation.y = t * 2; o.core.position.y = 1.1 + Math.sin(t * 2.4) * 0.08;
      const col = m.interruptor ? (activa ? 0x6affb8 : 0xffc850) : !puede ? 0x7a8aa0 : activa ? (m.t < 1.6 && Math.sin(t * 22) > 0 ? 0xffd36a : 0x9fe8ff) : 0x9fe8ff;
      if (m.interruptor) { o.core.rotation.set(t, t * 1.3, 0); o.ring.scale.setScalar(activa ? 1.3 : 1 + Math.sin(t * 4) * 0.06); }
      o.ring.material.color.setHex(col); o.ring2.material.color.setHex(col); o.gl.material.color.setHex(col);
      o.gl.material.opacity = cerca ? 0.9 : activa ? 0.6 : puede ? 0.45 : 0.18;
      o.gl.scale.setScalar(cerca ? 2.8 + Math.sin(t * 8) * 0.3 : 2.2);
    }
  }

  drawMecanismos(t) {
    const g = this.g;
    for (const o of this.puertaMeshes) {
      const d = o.d; o.door.visible = !d.s.erased;
      o.door.position.y = d.top / 2 + d.k * (d.top + 0.1);
      o.door.scale.y = 1 - d.k * 0.75;
      // el letrero dice lo contrario de lo que hace la puerta
      const want = d.k > 0.5 ? this.tex.cartelCerrado : this.tex.cartelAbierto;
      if (o.signM.map !== want) { o.signM.map = want; o.signM.needsUpdate = true; }
      o.lamp.material.color.setHex(d.warn ? (Math.sin(t * 30) > 0 ? 0xff4a3a : 0x401010) : d.k > 0.5 ? 0x6affb8 : 0xff6a6a);
    }
    for (const { q, m } of this.tempMeshes) {
      const blink = q.warn ? (Math.sin(t * 28) > 0 ? 1 : 0.3) : 1;
      m.visible = q.vis > 0.03 && !q.s.erased;
      m.scale.set(1, Math.max(0.05, q.vis), 1); m.material.opacity = q.vis * blink;
      m.material.emissiveIntensity = 0.3 + (q.warn ? 0.9 : 0);
    }
  }

  drawFisica(t) {
    for (const o of this.corrMeshes) { const on = o.c.activo !== false; o.m.visible = on; o.top.visible = on; o.tex.offset.y = -t * 1.4; }
    for (const o of this.campoMeshes) {
      const on = !!o.c.activo; o.m.visible = on; o.pts.visible = on;
      if (!on || Math.abs(o.c.z0 - this.g.player.pos.z) > 80) continue;
      const a = o.pts.geometry.attributes.position, c = o.c, dir = c.tipo === 'invertida' ? 1 : c.tipo === 'pesada' ? -1 : 0.4, h = c.y1 - c.y0;
      for (let i = 0; i < a.count; i++) a.setY(i, c.y0 + (((o.base[i * 3 + 1] - c.y0) + t * 1.6 * dir) % h + h) % h);
      a.needsUpdate = true;
    }
    for (const o of this.medusaMeshes) {
      const q = o.q; o.grp.visible = q.alive !== false;
      o.grp.position.set(q.x, q.y, q.z);
      const pul = 1 + Math.sin(t * 3 + q.z) * 0.08 + (q.squash || 0) * 0.3; o.bell.scale.set(pul, 0.8 / pul, pul);
      o.tents.forEach((tt, i) => (tt.rotation.x = Math.sin(t * 4 + i) * 0.3));
    }
  }

  drawDip(t, px, py, pz) {
    const g = this.g, p = g.player, sheet = this.assets.dip;
    const blink = p.invuln > 0 && p.state !== 'dead' && Math.floor(t * 16) % 2 === 0;
    this.dip.visible = !p.hidden && !blink && g.mode === 'juego' && p.state !== 'dead';
    sheet.setUV(this.dipTex, p.anim, p.animTime);
    this.dip.position.set(px, py, pz);
    // billboard cilíndrico + mirar hacia donde corre + squash/stretch + giro
    const cam = this.camera.position;
    let ry = Math.atan2(cam.x - this.dip.position.x, cam.z - this.dip.position.z);
    if (p.spin > 0) ry += (1 - p.spin / CONFIG.spinTime) * Math.PI * 4;
    this.dip.rotation.set(0, ry, 0);
    const sq = p.sq || 1, fl = this.dipFlip = (this.dipFlip ?? 1) + ((p.gdir || 1) - (this.dipFlip ?? 1)) * 0.22;
    this.dip.scale.set(p.face / Math.sqrt(sq), sq * fl, 1);
    if (fl < 1) this.dip.position.y = py + (1 - fl) / 2 * p.h * 1.16;
    // sombra bajo DIP siempre visible (también en el aire): marca dónde va a caer
    const gy = p.shadowY;
    this.dipShadow.visible = this.dip.visible && gy !== null && gy !== undefined;
    if (this.dipShadow.visible) {
      const hgt = Math.max(0, py - gy), s = Math.max(0.45, 1 - hgt / 8);
      const inv = (p.gdir || 1) < 0, hgt2 = inv ? Math.max(0, gy - (py + p.h)) : hgt, s2 = Math.max(0.45, 1 - hgt2 / 8);
      this.dipShadow.position.set(px, inv ? gy - 0.03 : gy + 0.03, pz); this.dipShadow.scale.set(s2, 1, s2); this.dipShadow.material.opacity = 0.5 * s2;
    }
  }

  drawParticles() {
    const items = this.g.particles.items, P = this.pPos, C = this.pCol;
    for (let i = 0; i < items.length; i++) {
      const o = items[i];
      if (!o.active) { P[i * 3 + 1] = -999; continue; }
      const k = o.life / o.max;
      P[i * 3] = o.x; P[i * 3 + 1] = o.y; P[i * 3 + 2] = o.z;
      C[i * 3] = o.r * k; C[i * 3 + 1] = o.gg * k; C[i * 3 + 2] = o.b * k;
    }
    this.points.geometry.attributes.position.needsUpdate = true; this.points.geometry.attributes.color.needsUpdate = true;
  }
}
