// world.js — Render 3D del Sector Demolición con three.js (HD: PBR, sombras suaves, niebla, ACES).
// Solo DIP es pixel art: un billboard con su sprite sheet de 48 px. draw() solo LEE el estado del juego.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeTextures, makeScreens, worldUV } from './textures.js';
import { CONFIG } from './config.js';

const HEX = (h) => new THREE.Color(h);
const ENV = {
  titulo: { bg: 0x0b1226, fog: 0x141c38, near: 20, far: 140, hs: 0x5a6fb0, hg: 0x2a2030, hi: 0.9, moon: 0xaec4ff, mi: 1.6, top: 0x050914, hor: 0x2a2f5e },
  calle: { bg: 0x0b1226, fog: 0x161f3e, near: 18, far: 120, hs: 0x5a6fb0, hg: 0x2a2030, hi: 0.95, moon: 0xaec4ff, mi: 1.7, top: 0x050914, hor: 0x2c3366 },
  tejado: { bg: 0x10132c, fog: 0x1d1c44, near: 22, far: 140, hs: 0x6a6fc0, hg: 0x2a2036, hi: 1.0, moon: 0xc4c8ff, mi: 1.9, top: 0x070818, hor: 0x3b2f6e },
  persecucion: { bg: 0x0a0716, fog: 0x1a0d2e, near: 14, far: 90, hs: 0x7a5ab0, hg: 0x1a1020, hi: 0.9, moon: 0xc8a8ff, mi: 1.6, top: 0x04020a, hor: 0x3a1450 },
  jefe: { bg: 0x0d1428, fog: 0x1a2340, near: 22, far: 110, hs: 0x8fa0d8, hg: 0x2a2a36, hi: 1.1, moon: 0xdde6ff, mi: 2.0, top: 0x060a16, hor: 0x2d3b6e },
  fin: { bg: 0x05070d, fog: 0x0a0d18, near: 10, far: 60, hs: 0x3a4570, hg: 0x101018, hi: 0.6, moon: 0x8899cc, mi: 1, top: 0x020306, hor: 0x101830 }
};

export class World {
  constructor(canvas, game, assets) {
    this.g = game; this.assets = assets;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.mobile = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CONFIG.camFov, 16 / 9, 0.1, 400);
    this.scene.fog = new THREE.Fog(0x161f3e, 18, 120);
    this.scene.background = new THREE.Color(0x0b1226);
    this.t = 0; this.env = null; this.tmpC = new THREE.Color(); this.tmpV = new THREE.Vector3(); this.tmpM = new THREE.Matrix4();
    this.tmpQ = new THREE.Quaternion(); this.tmpE = new THREE.Euler(); this.tmpS = new THREE.Vector3();
    this.tex = makeTextures(r);
    this.screens = makeScreens(r); this.screenT = 0;
    this.buildEnv(); this.buildLights(); this.buildSky(); this.buildSolids(); this.buildCity();
    this.buildCrates(); this.buildCollectibles(); this.buildEnemies(); this.buildProps(); this.buildBoss(); this.buildDip(); this.buildFx();
  }

  // ---------- helpers ----------
  std(o) { return new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, envMapIntensity: 0.6, ...o }); }
  basic(color, o = {}) { return new THREE.MeshBasicMaterial({ color, ...o }); }
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

  buildEnv() {
    const pm = new THREE.PMREMGenerator(this.renderer), sc = new THREE.Scene();
    const geo = new THREE.SphereGeometry(100, 32, 16), cols = [], a = HEX(0x2a3a7a), b = HEX(0x120c1c), c = new THREE.Color(), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { c.copy(b).lerp(a, Math.min(1, Math.max(0, p.getY(i) / 100 * 0.5 + 0.5))); cols.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    sc.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    for (const [x, y, z, s, col] of [[-60, 10, -40, 9, 0xffb860], [60, 14, -30, 8, 0xffb860], [0, 70, 0, 12, 0xaec4ff], [30, 6, 60, 6, 0x7fb8ff]]) { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 12, 8), new THREE.MeshBasicMaterial({ color: col })); m.position.set(x, y, z); sc.add(m); }
    this.scene.environment = pm.fromScene(sc, 0.02).texture; pm.dispose();
  }
  buildLights() {
    this.hemi = new THREE.HemisphereLight(0x5a6fb0, 0x2a2030, 0.95); this.scene.add(this.hemi);
    const m = this.moon = new THREE.DirectionalLight(0xaec4ff, 1.7);
    m.castShadow = true; m.shadow.mapSize.set(this.mobile ? 1024 : 2048, this.mobile ? 1024 : 2048);
    const c = m.shadow.camera; c.left = -18; c.right = 18; c.top = 18; c.bottom = -18; c.near = 1; c.far = 80;
    m.shadow.bias = -0.0004; m.shadow.normalBias = 0.03; m.shadow.radius = 3;
    this.scene.add(m); this.scene.add(m.target);
    // luz cálida que acompaña a DIP (el brillo de las farolas del barrio)
    this.warm = new THREE.PointLight(0xffb060, 18, 14, 2); this.scene.add(this.warm);
  }

  // ---------- cielo nocturno ----------
  buildSky() {
    this.skyU = { top: { value: HEX(0x050914) }, hor: { value: HEX(0x2c3366) } };
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
      uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 hor; varying vec3 vP; void main(){ float h = clamp(vP.y*1.8+0.1,0.0,1.0); gl_FragColor = vec4(mix(hor, top, smoothstep(0.0,1.0,h)),1.0); }'
    }));
    this.dome.renderOrder = -10; this.scene.add(this.dome);
    const n = 500, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, b = 0.15 + Math.random() * 1.2; pos[i * 3] = Math.cos(a) * Math.cos(b) * 280; pos[i * 3 + 1] = Math.sin(b) * 280; pos[i * 3 + 2] = Math.sin(a) * Math.cos(b) * 280; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.6, map: this.tex.dot, color: 0xdfe8ff, transparent: true, depthWrite: false, fog: false, sizeAttenuation: true }));
    this.dome.add(this.stars);
    const moon = new THREE.Mesh(new THREE.CircleGeometry(9, 48), this.basic(0xf2f4ff, { fog: false }));
    moon.position.set(-60, 90, -200); moon.lookAt(0, 0, 0); this.dome.add(moon);
    this.glow(0xaec4ff, 70, -60, 90, -201, 0.5, this.dome);
  }

  // ---------- sólidos del nivel ----------
  buildSolids() {
    const T = this.tex, L = this.g.L;
    const fach = this.std({ map: T.fachada, emissiveMap: T.fachadaLuz, emissive: 0xffffff, emissiveIntensity: 1 });
    const M = {
      asfalto: [fach, this.std({ map: T.asfalto, roughness: 0.55, metalness: 0.1 })],
      acera: [this.std({ map: T.losa, color: 0x9aa3b8 }), this.std({ map: T.losa, color: 0xc3c9d8, roughness: 0.7 })],
      azotea: [fach, this.std({ map: T.losa, color: 0xb6bccc, roughness: 0.75 })],
      fachada: [fach],
      metal: [this.std({ map: T.metal, color: 0x9fb0c8, roughness: 0.35, metalness: 0.75 })],
      rejilla: [this.std({ map: T.metal, color: 0xc8b48a, roughness: 0.4, metalness: 0.7, emissive: 0x3a2a10, emissiveIntensity: 0.4 })],
      pretil: [this.std({ map: T.losa, color: 0x8a92a6 })],
      oficina: [fach, this.std({ map: T.oficina, roughness: 0.3, metalness: 0.1 })],
      torre: [this.std({ color: 0xd8dce6, roughness: 0.6 })]
    };
    this.solidMeshes = new Map(); this.solidBuckets = new Map();
    for (const s of L.solids) {
      if (s.crate || s.invisible) continue;
      const w = s.x1 - s.x0, h = s.y1 - s.y0, d = s.z1 - s.z0, cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2, cz = (s.z0 + s.z1) / 2;
      const set = M[s.mat] || M.asfalto;
      let geo, mat;
      if (set.length > 1) {
        // suelos: superficie arriba con su textura a escala real; los costados son fachadas de edificio
        geo = new THREE.BoxGeometry(w, h, d); mat = [set[0], set[0], set[1], set[0], set[0], set[0]];
        worldUV(geo, cx, cy, cz, 1 / 4);
        const n = geo.attributes.normal, uv = geo.attributes.uv, pp = geo.attributes.position;
        for (let i = 0; i < pp.count; i++) if (Math.abs(n.getY(i)) < 0.5) { const ax = Math.abs(n.getX(i)); uv.setXY(i, ((ax > 0.5 ? pp.getZ(i) + cz : pp.getX(i) + cx)) / 12, (pp.getY(i) + cy) / 12); }
      } else {
        const rad = Math.min(0.08, w / 4, h / 4, d / 4);
        geo = rad > 0.02 ? new RoundedBoxGeometry(w, h, d, 2, rad) : new THREE.BoxGeometry(w, h, d); mat = set[0];
        worldUV(geo, cx, cy, cz, s.mat === 'fachada' ? 1 / 12 : 1 / 2);
      }
      const cast = ['metal', 'rejilla', 'pretil', 'torre'].includes(s.mat);
      // lo que nunca cambia (no cae ni lo borra el vacío) se fusiona por material
      const erasable = !s.wall && s.z0 < -200 && s.z0 > -332;
      if (!s.falling && !erasable) { this.bucketSolid(geo, mat, cx, cy, cz, cast); continue; }
      const m = this.mesh(geo, mat, cx, cy, cz, { cast });
      this.solidMeshes.set(s, m);
    }
    for (const [mat, b] of this.solidBuckets) {
      const m = new THREE.Mesh(mergeGeometries(b.list, false), mat); m.receiveShadow = true; m.castShadow = b.cast; this.scene.add(m);
    }
  }

  // separa una geometría con grupos (una cara por material) y la guarda en el cubo de su material
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

  // ---------- ciudad: edificios altos, pantallas con salvapantallas, farolas, formateadoras gigantes ----------
  buildCity() {
    const T = this.tex, g = this.g, L = g.L;
    const fac = this.std({ map: T.fachada, emissiveMap: T.fachadaLuz, emissive: 0xffffff, emissiveIntensity: 1.1 });
    const rnd = (() => { let s = 7; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); })();
    // Todo lo estático de la ciudad se fusiona por material: pocas draw calls aunque haya cientos de piezas
    const buckets = new Map();
    const put = (mat, geo, x, y, z, ry = 0) => { geo.rotateY(ry); geo.translate(x, y, z); if (!buckets.has(mat)) buckets.set(mat, []); buckets.get(mat).push(geo); };
    const glows = { warm: [], warmFloor: [], blue: [] };
    const scrMats = this.screens.map(sc => this.basic(0xffffff, { map: sc.t, toneMapped: false }));
    for (const st of L.streets) {
      for (let z = st.z0 - 2; z > st.z1; z -= 7 + rnd() * 5) {
        for (const side of [-1, 1]) {
          const w = 6 + rnd() * 5, d = 6 + rnd() * 3, h = st.roofs ? 2 + rnd() * 10 : 9 + rnd() * 18;
          const x = side * (st.roofs ? 9 + rnd() * 4 + w / 2 : 6.5 + w / 2), base = st.roofs ? st.y - 2 : 0;
          const geo = new THREE.BoxGeometry(w, h + 30, d); worldUV(geo, x, base + (h - 30) / 2, z - d / 2, 1 / 12);
          put(fac, geo, x, base + (h - 30) / 2, z - d / 2);
          // pantalla con salvapantallas viejo mirando al corredor
          if (rnd() < 0.45) {
            const k = Math.floor(rnd() * 3), sw = 2.6 + rnd() * 1.6;
            const sx = x - side * (w / 2 + 0.05), sy = st.roofs ? st.y + 2 + rnd() * 3 : 3 + rnd() * 3, sz = z - d / 2 - 1 - rnd() * (d - 2);
            put(scrMats[k], new THREE.PlaneGeometry(sw, sw * 0.625), sx, sy, sz, side < 0 ? Math.PI / 2 : -Math.PI / 2);
            glows.blue.push(sx - side * 0.3, sy, sz);
          }
        }
      }
    }
    // horizonte lejano
    const far = this.std({ map: T.fachada, emissiveMap: T.fachadaLuz, emissive: 0xffffff, emissiveIntensity: 0.7, color: 0x6a7090 });
    for (let i = 0; i < 70; i++) {
      const side = i % 2 ? 1 : -1, x = side * (30 + rnd() * 50), z = 20 - i * 6 - rnd() * 6, h = 20 + rnd() * 50, w = 8 + rnd() * 10;
      const geo = new THREE.BoxGeometry(w, h, w); worldUV(geo, x, h / 2 - 10, z, 1 / 14);
      put(far, geo, x, h / 2 - 10, z);
    }
    // farolas cálidas
    const poleM = this.std({ color: 0x2a3040, metalness: 0.7, roughness: 0.4 }), lampM = this.basic(0xffd59a, { toneMapped: false });
    for (const st of L.streets) {
      if (st.roofs) continue;
      for (let z = st.z0 - 6; z > st.z1; z -= 13) for (const side of [-1, 1]) {
        const x = side * 3.95, y = st.y;
        put(poleM, new THREE.CylinderGeometry(0.07, 0.09, 4.2, 10), x, y + 2.1, z);
        put(poleM, new THREE.BoxGeometry(0.9, 0.08, 0.1), x - side * 0.4, y + 4.15, z);
        put(lampM, new THREE.SphereGeometry(0.18, 12, 8), x - side * 0.8, y + 4.0, z);
        glows.warm.push(x - side * 0.8, y + 4.0, z); glows.warmFloor.push(x - side * 0.8, y + 0.05, z);
      }
    }
    for (const [mat, list] of buckets) {
      const merged = mergeGeometries(list.map(q => q.index ? q.toNonIndexed() : q).map(q => { if (!q.attributes.uv) q.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(q.attributes.position.count * 2), 2)); return q; }), false);
      const m = new THREE.Mesh(merged, mat); m.receiveShadow = mat !== lampM; m.castShadow = mat === poleM; this.scene.add(m);
    }
    // brillos como nubes de puntos (una draw call por color)
    const pts = (arr, color, size, opacity) => {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      const p = new THREE.Points(geo, new THREE.PointsMaterial({ map: this.tex.glow, color, size, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
      this.scene.add(p);
    };
    pts(glows.warm, 0xffb060, 3.2, 0.55); pts(glows.warmFloor, 0xffb060, 5, 0.12); pts(glows.blue, 0x7fb8ff, 5, 0.22);
    // formateadoras gigantes al fondo (avanzan despacio)
    this.giants = [];
    for (const [x, z] of [[-55, -150], [60, -60], [-40, 30]]) {
      const grp = new THREE.Group(); grp.position.set(x, 0, z); this.scene.add(grp);
      const bodyM = this.std({ color: 0x8a909c, metalness: 0.6, roughness: 0.4 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 14, 32), bodyM); body.position.y = 7; grp.add(body);
      const brush = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 2, 32), this.std({ color: 0x3a3f4a })); brush.position.y = 1; grp.add(brush);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), this.basic(0xff3a2a, { toneMapped: false })); eye.position.set(0, 11, 9); grp.add(eye);
      this.glow(0xff3a2a, 14, 0, 11, 9.5, 0.8, grp);
      this.giants.push({ grp, x, z });
    }
  }

  // ---------- cajas (InstancedMesh por tipo; TNT individuales por su cuenta atrás) ----------
  buildCrates() {
    const L = this.g.L, T = this.tex;
    const geo = new RoundedBoxGeometry(0.9, 0.9, 0.9, 3, 0.06); geo.translate(0, 0.45, 0);
    this.crateSets = {};
    for (const type of ['normal', 'rebote', 'fragmentos', 'checkpoint', 'cristal']) {
      const list = L.crates.filter(c => c.type === type); if (!list.length) continue;
      const mat = type === 'cristal'
        ? this.std({ map: T.caja.cristal, transparent: true, opacity: 0.75, roughness: 0.05, metalness: 0.1, envMapIntensity: 1.5 })
        : this.std({ map: T.caja[type], roughness: 0.55, emissive: 0xffffff, emissiveMap: T.caja[type], emissiveIntensity: 0.18 });
      const im = new THREE.InstancedMesh(geo, mat, list.length); im.castShadow = true; im.receiveShadow = true;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      if (type === 'cristal') for (let i = 0; i < list.length; i++) im.setColorAt(i, HEX(0xffffff));
      this.scene.add(im); this.crateSets[type] = { im, list };
    }
    this.tntMeshes = L.crates.filter(c => c.type === 'tnt').map(c => {
      const m = this.mesh(geo, this.std({ map: T.caja.tnt, roughness: 0.55, emissive: 0xffffff, emissiveMap: T.caja.tnt, emissiveIntensity: 0.25 }), c.x, c.y, c.z);
      return { c, m };
    });
    this.shardIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.16, 0.06), this.std({ color: 0xffffff, roughness: 0.6 }), this.g.shards.items.length);
    this.shardIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scene.add(this.shardIM);
    this.shardCols = [HEX(0x3f86cc), HEX(0xa8eaff), HEX(0xd8442f)];
    for (let i = 0; i < this.shardIM.count; i++) this.shardIM.setColorAt(i, this.shardCols[0]);
  }

  // ---------- fragmentos, copias, páginas, puntos de control ----------
  buildCollectibles() {
    const g = this.g, L = g.L;
    const fg = new THREE.OctahedronGeometry(0.2, 0); fg.scale(1, 1.4, 1);
    const fm = this.std({ color: 0xffd36a, emissive: 0xffa82a, emissiveIntensity: 1.6, roughness: 0.2, metalness: 0.3 });
    const n = L.frags.length + g.popFrags.items.length;
    this.fragIM = new THREE.InstancedMesh(fg, fm, n); this.fragIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scene.add(this.fragIM);
    this.fragGlowPos = new Float32Array(n * 3);
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(this.fragGlowPos, 3));
    this.fragGlow = new THREE.Points(gg, new THREE.PointsMaterial({ size: 0.9, map: this.tex.glow, color: 0xffb040, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.fragGlow.frustumCulled = false; this.scene.add(this.fragGlow);
    const cg = new RoundedBoxGeometry(0.5, 0.5, 0.5, 2, 0.05);
    const cm = new THREE.MeshStandardMaterial({ map: this.tex.copia, transparent: true, opacity: 0.85, roughness: 0.1, emissive: 0x6fd0ff, emissiveIntensity: 0.35, envMapIntensity: 1.5 });
    this.copiaPick = L.copias.map(c => { const m = this.mesh(cg, cm, c.x, c.y + 1, c.z); this.glow(0x8fe0ff, 1.6, 0, 0, 0, 0.6, m); return { c, m }; });
    const cm2 = cm.clone();
    this.copiaMates = [0, 1, 2].map(() => { const m = this.mesh(cg, cm2, 0, 0, 0, { cast: false }); m.scale.setScalar(0.75); m.visible = false; return m; });
    this.copiaMat2 = cm2;
    const pm = new THREE.MeshStandardMaterial({ map: this.tex.pagina, side: THREE.DoubleSide, emissive: 0x7fd0ff, emissiveIntensity: 0.4, roughness: 0.6 });
    this.pageMeshes = L.pages.map(p => { const m = this.mesh(new THREE.PlaneGeometry(0.55, 0.7), pm, p.x, p.y + 1, p.z, { cast: false }); this.glow(0x7fd0ff, 1.8, 0, 0, 0, 0.6, m); return { p, m }; });
    this.ckMeshes = L.checkpoints.map(k => {
      const m = this.mesh(new THREE.TorusGeometry(0.7, 0.05, 8, 40), this.basic(0x3a6f9a, { toneMapped: false }), k.x, k.y + 0.05, k.z, { cast: false, rx: -Math.PI / 2 });
      return { k, m };
    });
  }

  buildEnemies() {
    const L = this.g.L;
    // cuerpo + patas fusionados en una sola geometría (una draw call por bicho)
    const parts = [];
    const bodyG = new THREE.SphereGeometry(0.32, 16, 12); bodyG.scale(1.2, 0.7, 1); bodyG.translate(0, 0.3, 0); parts.push(bodyG);
    for (let i = 0; i < 6; i++) { const l = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 5); l.rotateX(i < 3 ? 0.8 : -0.8); l.translate((i % 3 - 1) * 0.22, 0.14, i < 3 ? 0.22 : -0.22); parts.push(l); }
    const body = mergeGeometries(parts.map(q => q.toNonIndexed()));
    const ghostG = new THREE.SphereGeometry(0.32, 12, 8); ghostG.scale(1.2, 0.7, 1);
    const bm = this.std({ color: 0x3a1a4a, emissive: 0xff2aa0, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.4 });
    const ghost = this.basic(0x2affe0, { transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
    this.bichoMeshes = L.bichos.map(b => {
      const grp = new THREE.Group(); this.scene.add(grp);
      const m = new THREE.Mesh(body, bm); m.castShadow = true; grp.add(m);
      const gh = new THREE.Mesh(ghostG, ghost); gh.position.set(0.06, 0.3, 0); grp.add(gh);
      grp.add(this.blob(0.45));
      return { b, grp, gh };
    });
    this.formaMeshes = L.formas.map(f => ({ f, grp: this.makeForma(1) }));
  }
  makeForma(s) {
    const grp = new THREE.Group(); this.scene.add(grp);
    const bodyM = this.std({ color: 0x9aa0ac, metalness: 0.6, roughness: 0.35 });
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.85 * s, 0.95 * s, 0.8 * s, 28), bodyM); b.position.y = 0.55 * s; b.castShadow = true; grp.add(b);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.6 * s, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), bodyM); top.position.y = 0.95 * s; grp.add(top);
    const brush = new THREE.Mesh(new THREE.CylinderGeometry(1.0 * s, 1.0 * s, 0.15 * s, 28), this.std({ color: 0x2a2e38 })); brush.position.y = 0.1; grp.add(brush);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.7 * s, 0.14 * s, 0.05), this.basic(0xff3a2a, { toneMapped: false })); eye.position.set(0, 0.75 * s, 0.9 * s); grp.add(eye);
    this.glow(0xff3a2a, 1.8 * s, 0, 0.75 * s, 1.0 * s, 0.6, grp);
    grp.add(this.blob(1.1 * s));
    return grp;
  }
  blob(r) {
    const g = new THREE.CircleGeometry(r, 20); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, this.basic(0x000000, { transparent: true, opacity: 0.4, depthWrite: false })); m.position.y = 0.02; return m;
  }

  // ---------- utilería de las escenas ----------
  buildProps() {
    const sp = this.g.L.spots, T = this.tex;
    const sofa = this.sofa = new THREE.Group(); this.scene.add(sofa);
    const fab = this.std({ color: 0xc0504a, roughness: 0.9 });
    const add = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.08), fab); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; sofa.add(m); };
    add(2.2, 0.45, 0.9, 0, 0.3, 0); add(2.2, 0.8, 0.25, 0, 0.7, 0.4); add(0.25, 0.6, 0.9, -1.1, 0.5, 0); add(0.25, 0.6, 0.9, 1.1, 0.5, 0);
    sofa.position.set(sp.sofa.x, 0, sp.sofa.z + 0.3);
    this.mesh(new THREE.PlaneGeometry(2.4, 1.6), this.basic(0xffc27a, { toneMapped: false }), -2.4, 2.4, 13.45, { cast: false });
    this.glow(0xffb060, 5, -2.4, 2.4, 13.3, 0.4);
    const dr = this.drone = new THREE.Group(); this.scene.add(dr);
    const dm = this.std({ color: 0xd0d6e2, metalness: 0.7, roughness: 0.3 });
    dr.add(new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), dm));
    this.rotors = [];
    for (const [x, z] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.05), dm); r.position.set(x, 0.15, z); dr.add(r); this.rotors.push(r); }
    const de = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), this.basic(0xff3a2a)); de.position.set(0, 0, 0.24); dr.add(de);
    dr.visible = false;
    this.notice = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), this.basic(0xffffff, { map: T.aviso, side: THREE.DoubleSide })); this.notice.visible = false; this.scene.add(this.notice);
    const gb = this.book = new THREE.Group(); this.scene.add(gb);
    const cover = this.std({ map: T.guia, emissive: 0x2a7fbf, emissiveIntensity: 0.5 });
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.55), cover); l.position.x = -0.22; l.rotation.z = 0.25; gb.add(l);
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.55), cover); r.position.x = 0.22; r.rotation.z = -0.25; gb.add(r);
    this.glow(0x7fd0ff, 1.6, 0, 0.2, 0, 0.7, gb); gb.visible = false;
    this.packet = new THREE.Group(); this.scene.add(this.packet);
    const pk = this.std({ color: 0x7fd0ff, emissive: 0x2a8fff, emissiveIntensity: 1.2, roughness: 0.2, metalness: 0.4 });
    for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.8, 1.2, 2, 0.08), pk); m.position.x = i * 1.5; this.packet.add(m); }
    this.glow(0x7fd0ff, 6, 3, 0, 0, 0.5, this.packet); this.packet.visible = false;
  }

  // ---------- el Inspector de Trámites ----------
  buildBoss() {
    const g = this.g, b = this.boss = new THREE.Group(); this.scene.add(b);
    const suit = this.std({ color: 0x4a5266, roughness: 0.6 }), skin = this.std({ color: 0xd9c8b0, roughness: 0.8 }), red = this.std({ color: 0xc0392b, roughness: 0.4 });
    this.bossMats = [suit, skin, red];
    const torso = new THREE.Mesh(new RoundedBoxGeometry(1.3, 1.1, 0.8, 3, 0.12), suit); torso.position.y = 1.2; b.add(torso);
    const legs = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.65, 0.6, 2, 0.08), suit); legs.position.y = 0.33; b.add(legs);
    const head = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.6, 0.6, 3, 0.1), skin); head.position.y = 2.0; b.add(head);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.05), this.basic(0x111111)); visor.position.set(0, 2.05, 0.31); b.add(visor);
    this.bossArms = [];
    for (const s of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(s * 0.8, 1.6, 0); b.add(arm);
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 10), suit); a.position.y = -0.4; arm.add(a);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 16), red); st.position.y = -0.95; arm.add(st);
      this.bossArms.push(arm);
    }
    const tower = this.bossTower = new THREE.Group(); tower.position.set(0, 1.4, -0.6); b.add(tower);
    const paper = this.std({ color: 0xf2f2ea, roughness: 0.9 });
    for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.5), paper); f.position.set((i % 2) * 0.06, i * 0.13, 0); f.rotation.y = i * 0.2; tower.add(f); }
    b.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.bossStars = [0, 1, 2].map(() => this.glow(0xffe680, 0.5, 0, 0, 0, 0.9, b));
    b.add(this.blob(1));
    b.visible = false;
    const formG = new THREE.PlaneGeometry(0.5, 0.65), formM = this.std({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.9, emissive: 0x555555 });
    const sealG = new THREE.CylinderGeometry(0.3, 0.3, 0.22, 16), sealM = this.std({ color: 0xd8302a, emissive: 0x801010, emissiveIntensity: 0.6 });
    const ringG = new THREE.RingGeometry(0.45, 0.6, 32); ringG.rotateX(-Math.PI / 2);
    this.shotMeshes = g.boss.shots.items.map(() => {
      const f = new THREE.Mesh(formG, formM), s = new THREE.Mesh(sealG, sealM), r = new THREE.Mesh(ringG, this.basic(0xff5040, { transparent: true, opacity: 0.7, depthWrite: false }));
      f.castShadow = s.castShadow = true; this.scene.add(f); this.scene.add(s); this.scene.add(r); f.visible = s.visible = r.visible = false;
      this.glow(0xff5040, 1.4, 0, 0.3, 0, 0.6, s);
      return { f, s, r };
    });
    const fG = new RoundedBoxGeometry(1.6, 0.8, 1.6, 2, 0.06), fM = this.std({ color: 0xe8b24a, roughness: 0.7 });
    this.folderMeshes = Array.from({ length: 24 }, () => { const m = this.mesh(fG, fM, 0, -50, 0); m.visible = false; return m; });
    this.folderMarks = Array.from({ length: 24 }, () => { const m = this.blob(0.9); this.scene.add(m); m.visible = false; return m; });
    this.bossFormas = g.boss.formas.map(() => { const m = this.makeForma(1.1); m.visible = false; return m; });
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
  }

  buildFx() {
    const n = this.g.particles.items.length;
    this.pPos = new Float32Array(n * 3); this.pCol = new Float32Array(n * 3);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    this.points = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.22, map: this.tex.dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.points.frustumCulled = false; this.scene.add(this.points);
    this.voidWall = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, fog: false }));
    this.voidWall.visible = false; this.scene.add(this.voidWall);
    this.voidEdge = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), this.basic(0x8a2aff, { transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    this.voidEdge.visible = false; this.scene.add(this.voidEdge);
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
    const tr = Math.min(1, c.shake), sh = tr * tr * CONFIG.shakeAmp;
    const cx = v.cx + (c.x - v.cx) * a + (Math.random() * 2 - 1) * sh, cy = v.cy + (c.y - v.cy) * a + (Math.random() * 2 - 1) * sh, cz = v.cz + (c.z - v.cz) * a;
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(c.look.x, c.look.y, c.look.z);
    this.camera.rotation.z += (Math.random() * 2 - 1) * 0.03 * tr * tr;
    this.dome.position.copy(this.camera.position);
    const p = g.player, px = v.px + (p.pos.x - v.px) * a, py = v.py + (p.pos.y - v.py) * a, pz = v.pz + (p.pos.z - v.pz) * a;
    this.moon.position.set(px - 12, py + 30, pz + 14); this.moon.target.position.set(px, py, pz - 4);
    this.warm.position.set(px + 2, py + 4, pz + 1);
    this.screenT += dt;
    if (this.screenT > 0.1) { this.screenT = 0; for (const s of this.screens) { s.draw(s.x, t, s.state, false); s.t.needsUpdate = true; } }
    this.drawSolids(t);
    this.drawCrates(t);
    this.drawCollectibles(t, px, py, pz);
    this.drawEnemies(t);
    this.drawProps(t, px, py, pz);
    this.drawBoss(t);
    this.drawDip(t, px, py, pz);
    this.drawParticles();
    this.drawVoid(t);
    for (const gi of this.giants) { gi.grp.position.z = gi.z - Math.min(40, t * 0.15); gi.grp.rotation.y = Math.sin(t * 0.2) * 0.2; }
    this.renderer.render(this.scene, this.camera);
  }

  applyEnv(dt) {
    const g = this.g;
    const name = g.mode === 'titulo' ? 'titulo' : g.mode === 'fin' ? 'fin' : g.boss.active || g.boss.defeated ? 'jefe' : g.chase.on ? 'persecucion' : g.section.n === 2 ? 'tejado' : 'calle';
    const T = ENV[name], e = this.env || (this.env = { bg: HEX(T.bg), fog: HEX(T.fog), hs: HEX(T.hs), hg: HEX(T.hg), moon: HEX(T.moon), top: HEX(T.top), hor: HEX(T.hor), near: T.near, far: T.far, hi: T.hi, mi: T.mi });
    const k = 1 - Math.exp(-dt * 1.5);
    for (const key of ['bg', 'fog', 'hs', 'hg', 'moon', 'top', 'hor']) e[key].lerp(this.tmpC.set(T[key]), k);
    for (const key of ['near', 'far', 'hi', 'mi']) e[key] += (T[key] - e[key]) * k;
    this.scene.background.copy(e.bg); this.scene.fog.color.copy(e.fog); this.scene.fog.near = e.near; this.scene.fog.far = e.far;
    this.hemi.color.copy(e.hs); this.hemi.groundColor.copy(e.hg); this.hemi.intensity = e.hi;
    this.moon.color.copy(e.moon); this.moon.intensity = e.mi;
    this.skyU.top.value.copy(e.top); this.skyU.hor.value.copy(e.hor);
  }

  drawSolids(t) {
    const g = this.g;
    for (const f of g.L.falling) {
      const m = this.solidMeshes.get(f.s); if (!m) continue;
      m.position.y = (f.s.y0 + f.s.y1) / 2 + (f.state === 'tiembla' ? Math.sin(t * 80) * 0.03 : 0);
      m.visible = f.s.active || f.state === 'cae';
    }
    if (g.chase.on || g.chase.done) for (const [s, m] of this.solidMeshes) if (!s.falling) m.visible = !s.erased;
    if (g.gate && !this.gateMesh) {
      const gs = g.gate; this.gateMesh = this.mesh(new THREE.BoxGeometry(gs.x1 - gs.x0, gs.y1 - gs.y0, 0.2), this.std({ color: 0x7a8296, metalness: 0.8, roughness: 0.3, transparent: true, opacity: 0.7 }), 0, (gs.y0 + gs.y1) / 2, (gs.z0 + gs.z1) / 2);
    }
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
    for (const { c, m } of this.copiaPick) { m.visible = !c.got; m.position.y = c.y + 1 + Math.sin(t * 2) * 0.12; m.rotation.y = t * 1.5; }
    this.copiaMat2.emissive.setHex(g.superT > 0 ? (Math.sin(t * 20) > 0 ? 0xffe066 : 0x6fd0ff) : 0x6fd0ff);
    this.copiaMates.forEach((m, k) => {
      m.visible = k < g.copias && !g.player.hidden && g.mode === 'juego';
      const a = t * 2 + k * 2.1;
      m.position.set(px + Math.cos(a) * 0.7, py + 1.6 + Math.sin(t * 3 + k) * 0.1 + k * 0.15, pz + Math.sin(a) * 0.7);
      m.rotation.y = t;
    });
    for (const { p, m } of this.pageMeshes) { m.visible = !p.got; m.rotation.y = t * 1.8; m.position.y = p.y + 1 + Math.sin(t * 2.4) * 0.1; }
    for (const { k, m } of this.ckMeshes) { m.material.color.setHex(k.on ? 0x58ffb0 : 0x3a6f9a); m.rotation.z = t * (k.on ? 1.5 : 0.3); }
  }

  drawEnemies(t) {
    const ch = this.g.chase;
    for (const { b, grp, gh } of this.bichoMeshes) {
      grp.visible = b.alive && !(ch.on && b.z > ch.z);
      if (!grp.visible) continue;
      grp.position.set(b.x, b.y, b.z);
      grp.rotation.y = b.launched ? b.spinA : (b.axis === 'x' ? (b.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (b.dir > 0 ? 0 : Math.PI));
      grp.rotation.z = b.launched ? b.spinA * 0.7 : 0;
      gh.position.x = b.glitch > 0 ? (Math.random() - 0.5) * 0.4 : 0.05; gh.visible = b.glitch > 0 || Math.sin(t * 13 + b.hz) > 0.6;
    }
    for (const { f, grp } of this.formaMeshes) {
      grp.visible = f.alive && !(ch.on && f.z > ch.z);
      grp.position.set(f.x, f.y, f.z); grp.rotation.y = f.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  }

  drawProps(t, px, py, pz) {
    const g = this.g, f = g.fx, sp = g.L.spots;
    const d = f.drone;
    this.drone.visible = d !== undefined && d >= 0 && d < 3;
    if (this.drone.visible) {
      const k = Math.min(1, d), away = d >= 2 ? d - 2 : 0;
      this.drone.position.set(sp.sofa.x + (1 - k) * 6 + away * 8, 2.6 + (1 - k) * 4 + away * 6 + Math.sin(t * 6) * 0.05, sp.sofa.z - (1 - k) * 14 + 0.6);
      for (const r of this.rotors) r.rotation.y = t * 40;
    }
    this.notice.visible = f.notice > 0;
    if (this.notice.visible) { this.notice.position.set(px, py + 1.55, pz + 0.12); this.notice.rotation.y = Math.atan2(this.camera.position.x - px, this.camera.position.z - pz); }
    this.book.visible = f.guiaBook >= 0;
    if (this.book.visible) { const k = Math.min(1, f.guiaBook / 0.6); this.book.position.set(px - 1.2, 0.6 + (1 - k * k) * 5 + Math.sin(t * 3) * 0.05, pz + 0.6); this.book.rotation.y = t * 0.6; }
    this.sofa.visible = g.mode === 'titulo' || !g.flags.sofaGone || (f.sofaFly >= 0 && f.sofaFly < 2.5);
    if (f.sofaFly >= 0) {
      const k = f.sofaFly;
      this.sofa.position.set(Math.sin(k * 3) * 2, 1.5 + k * 3, pz - 6 + k * 14); this.sofa.rotation.set(k * 3, k * 4, k * 2);
    }
    this.packet.visible = f.packet >= 0;
    if (this.packet.visible) {
      const k = f.packet, a = sp.arena;
      if (k < 0.5) this.packet.position.set(18 - k * 2 * 18 - 3, 1.0, a.z + 2);
      else { const q = (k - 0.5) * 2; this.packet.position.set(-3 - q * 25, 1 + q * q * 30, a.z + 2 - q * 30); }
    }
  }

  drawBoss(t) {
    const g = this.g, b = g.boss, m = this.boss;
    m.visible = (b.active || (b.defeated && !b.gone)) && g.mode === 'juego';
    if (m.visible) {
      m.position.set(b.x, b.y, b.z);
      const p = g.player.pos; m.rotation.y = Math.atan2(p.x - b.x, p.z - b.z);
      const throwA = Math.sin(t * 6);
      this.bossArms[0].rotation.x = b.phase === 1 ? -1.2 + throwA * 0.6 : -0.3; this.bossArms[1].rotation.x = b.phase === 1 ? -1.2 - throwA * 0.6 : -0.3;
      this.bossTower.visible = b.phase === 1;
      const fl = b.flash > 0 && Math.sin(t * 50) > 0 ? 0xffffff : 0x000000;
      for (const mm of this.bossMats) mm.emissive.setHex(fl);
      this.bossStars.forEach((s, i) => { s.visible = b.stun > 0; const a = t * 5 + i * 2.1; s.position.set(Math.cos(a) * 0.6, 2.6, Math.sin(a) * 0.6); });
    }
    b.shots.items.forEach((o, i) => {
      const sm = this.shotMeshes[i], on = o.active && m.visible;
      sm.f.visible = on && o.kind === 'form'; sm.s.visible = on && o.kind === 'seal'; sm.r.visible = on && !o.landed && !o.back;
      if (!on) return;
      const mesh = o.kind === 'form' ? sm.f : sm.s;
      mesh.position.set(o.x, o.y, o.z);
      if (o.kind === 'form') mesh.rotation.set(t * 7, t * 5, 0); else mesh.rotation.set(o.landed ? 0 : t * 4, 0, 0);
      sm.r.position.set(o.tx, 0.03, o.tz); sm.r.scale.setScalar(0.8 + Math.sin(t * 12) * 0.1);
    });
    for (let i = 0; i < this.folderMeshes.length; i++) {
      const fm = this.folderMeshes[i], mark = this.folderMarks[i], f = b.folders[i];
      fm.visible = !!f && f.state !== 'espera' && f.state !== 'fuera' && m.visible;
      mark.visible = !!f && (f.state === 'espera' || f.state === 'cae') && m.visible;
      if (f) { fm.position.set(f.x, f.y + 0.4, f.z); mark.position.set(f.x, 0.04, f.z); mark.material.opacity = f.state === 'cae' ? 0.55 : 0.3; }
    }
    b.formas.forEach((f, i) => { const fm = this.bossFormas[i]; fm.visible = f.alive && b.active; fm.position.set(f.x, 0, f.z); fm.rotation.y = f.a; });
  }

  drawDip(t, px, py, pz) {
    const g = this.g, p = g.player, sheet = this.assets.dip;
    const blink = p.invuln > 0 && p.state !== 'dead' && Math.floor(t * 16) % 2 === 0;
    const riding = g.fx.rider;
    this.dip.visible = (!p.hidden || riding) && !blink && g.mode === 'juego' && p.state !== 'dead';
    sheet.setUV(this.dipTex, riding ? 'idle' : p.anim, p.animTime);
    if (riding) { const pk = this.packet.position; this.dip.position.set(pk.x + 3, pk.y + 0.4, pk.z); }
    else this.dip.position.set(px, py, pz);
    // billboard cilíndrico + mirar hacia donde corre + squash/stretch + giro de compilación
    const cam = this.camera.position;
    let ry = Math.atan2(cam.x - this.dip.position.x, cam.z - this.dip.position.z);
    if (p.spin > 0) ry += (1 - p.spin / CONFIG.spinTime) * Math.PI * 4;
    this.dip.rotation.set(0, ry, 0);
    const sq = p.sq || 1;
    this.dip.scale.set(p.face / Math.sqrt(sq), sq, 1);
    // sombra bajo DIP siempre visible (también en el aire): marca dónde va a caer
    const gy = p.shadowY;
    this.dipShadow.visible = this.dip.visible && gy !== null && gy !== undefined && !riding;
    if (this.dipShadow.visible) {
      const hgt = Math.max(0, py - gy), s = Math.max(0.45, 1 - hgt / 8);
      this.dipShadow.position.set(px, gy + 0.03, pz); this.dipShadow.scale.set(s, 1, s); this.dipShadow.material.opacity = 0.55 * s;
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
  drawVoid(t) {
    const ch = this.g.chase;
    this.voidWall.visible = this.voidEdge.visible = ch.on;
    if (!ch.on) return;
    this.voidWall.position.set(0, 4, ch.z + 0.6);
    this.voidEdge.position.set(0, 4, ch.z - 0.2); this.voidEdge.material.opacity = 0.25 + Math.sin(t * 9) * 0.1;
  }
}
