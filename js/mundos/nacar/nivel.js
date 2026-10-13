// nivel.js — Mundo 1 · Nácar: el planeta de la caída, como datos. Metros; y hacia arriba; el nivel avanza hacia -z.
// Alcance de salto a velocidad máxima ≈ 4.6 m (config.jumpReach). Huecos obligatorios: 2.8–3.4 m (60–75 %).
//
// Fases (documento maestro): 1 Cráter del impacto · 2 Jardín de Tilo · 3 Ruinas incompletas ·
// 4 Santuario del eco · 5 Estación de llegada (jefe: Guardián de la Estación) · 6 La señal de Lunex (huida)

export const R = 4.2;  // altura de la meseta de las ruinas y el santuario

export function buildNacar() {
  const L = {
    solids: [], crates: [], frags: [], bichos: [], formas: [], falling: [], registros: [], conchas: [],
    checkpoints: [], tips: [], decor: [], sections: [], spots: {}, memorias: [], centinelas: [], esferas: [],
    ecos: [], puertas: [], temporales: [], piezas: [], tramos: [], cristales: [], columnas: []
  };
  const solid = (x0, x1, y0, y1, z0, z1, mat = 'arena', o = {}) => { const s = { x0, x1, y0, y1, z0, z1, mat, active: true, ...o }; L.solids.push(s); return s; };
  // suelo con cara superior en "top" entre zBack (atrás, mayor) y zFront (adelante, menor)
  const floor = (zBack, zFront, top = 0, x0 = -4.2, x1 = 4.2, mat = 'arena', o = {}) => solid(x0, x1, top - 6, top, zFront, zBack, mat, o);
  const crate = (type, x, y, z, o = {}) => { const c = { type, x, y, z, alive: true, hits: 0, t: 0, ...o }; L.crates.push(c); return c; };
  const crates = (type, x, y, z, n, dx = 1.05) => { for (let i = 0; i < n; i++) crate(type, x + (i - (n - 1) / 2) * dx, y, z); };
  const fragLine = (x0, y0, z0, x1, y1, z1, n) => { for (let i = 0; i < n; i++) { const k = n === 1 ? 0 : i / (n - 1); L.frags.push({ x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k + 0.9, z: z0 + (z1 - z0) * k, alive: true }); } };
  const fragArc = (x, y, z0, z1, h, n) => { for (let i = 0; i < n; i++) { const k = i / (n - 1); L.frags.push({ x, y: y + 0.9 + Math.sin(k * Math.PI) * h, z: z0 + (z1 - z0) * k, alive: true }); } };
  // escarabajos: pasivos (no muerden), normales o ladrones (roban partículas, o llevan una pieza)
  const bicho = (x, y, z, range = 1.6, o = {}) => { const b = { hx: x, hz: z, x, y, z, range, axis: 'x', dir: 1, t: Math.random() * 2, alive: true, glitch: 0, vy: 0, ...o }; L.bichos.push(b); return b; };
  // barredores: fragmentos móviles de vidrio negro o recolectoras fuera de control
  const barredor = (kind, x, y, z, range, speed = 2.2) => L.formas.push({ kind, hx: x, x, y, z, range, speed, dir: 1, alive: true, t: 0 });
  const placa = (x, top, z, w = 2.4, d = 2.4) => { const s = solid(x - w / 2, x + w / 2, top - 0.35, top, z - d / 2, z + d / 2, 'placa', { falling: true }); L.falling.push({ s, top, state: 'firme', t: 0, y: 0 }); };
  const checkpoint = (x, y, z, sec) => L.checkpoints.push({ x, y, z, sec, on: false });
  const tip = (z, text, o = {}) => L.tips.push({ z, who: 'tip', text, done: false, ...o });
  const evento = (z, text, o = {}) => L.tips.push({ z, who: 'evento', text, done: false, ...o });
  const registro = (id, x, y, z, title, text) => L.registros.push({ id, x, y, z, title, text, got: false });
  const concha = (x, y, z, first = false) => L.conchas.push({ x, y, z, got: false, first });
  // recuerdos: un ancla (donde DIP recuerda) y las piezas que se materializan; dur en segundos
  const memoria = (id, x, y, z, ghosts, dur, o = {}) => {
    const targets = ghosts.map(([x0, x1, y0, y1, z0, z1]) => solid(x0, x1, y0, y1, z0, z1, 'memoria', { ghost: true, active: false }));
    const m = { id, x, y, z, targets, dur, state: o.hidden ? 'oculta' : 'lista', t: 0, ...o }; L.memorias.push(m); return m;
  };
  const centinela = (x, y, z, o = {}) => L.centinelas.push({ hx: x, x, y, z, home: y, tipo: 'suelo', rango: 2, dir: 1, state: o.dormido ? 'dormido' : 'patrulla', t: 0, alive: true, face: 1, ...o });
  const esfera = (x, y, z, period = 2.8, offset = 0) => L.esferas.push({ x, y, z, period, t: -offset, r: 0, wave: false, warn: 0 });
  const puerta = (z, period, open, offset = 0, x0 = -4.2, x1 = 4.2, top = 3.6, y = 0) => {
    const s = solid(x0, x1, y, y + top, z - 0.4, z + 0.4, 'puerta', { door: true });
    L.puertas.push({ s, z, period, open, t: offset, k: 0, x0, x1, y, top });
  };
  const temporal = (x, top, z, on, off, offset = 0, w = 2.6, d = 2.4) => {
    const s = solid(x - w / 2, x + w / 2, top - 0.35, top, z - d / 2, z + d / 2, 'temporal', { temp: true });
    L.temporales.push({ s, on, off, t: offset, vis: 1 });
  };
  // pared lateral: con `lip`, la colisión es invisible y alta, y solo se ve un borde bajo (deja ver el paisaje)
  const wall = (side, zBack, zFront, top = 7, mat = 'roca', base = -6, lip = null) => {
    const [x0, x1] = side < 0 ? [-6.5, -4.2] : [4.2, 6.5];
    if (lip === null) return solid(x0, x1, base, top, zFront, zBack, mat, { wall: true });
    solid(x0, x1, base, lip, zFront, zBack, mat, { wall: true });
    return solid(x0, x1, lip, top + 3, zFront, zBack, mat, { wall: true, invisible: true });
  };

  L.sections = [
    { n: 1, name: 'El cráter del impacto', z0: 16, z1: -62 },
    { n: 2, name: 'El jardín de Tilo', z0: -62, z1: -130 },
    { n: 3, name: 'Las ruinas incompletas', z0: -130, z1: -198 },
    { n: 4, name: 'El santuario del eco', z0: -198, z1: -268 },
    { n: 5, name: 'La estación de llegada', z0: -268, z1: -337 },
    { n: 6, name: 'La señal de Lunex', z0: -337, z1: -480 }
  ];
  L.tramos = [
    { z0: 16, z1: -62, y: 0, tipo: 'crater' }, { z0: -62, z1: -130, y: 0, tipo: 'jardin' },
    { z0: -130, z1: -198, y: R, tipo: 'ruinas' }, { z0: -198, z1: -268, y: R, tipo: 'santuario' },
    { z0: -268, z1: -337, y: 0, tipo: 'estacion' }, { z0: -337, z1: -470, y: 0, tipo: 'escape' }
  ];

  // =========================================================================
  // FASE 1 · EL CRÁTER DEL IMPACTO (enseñar: moverse, saltar, girar, cajas, bordes, puntos de control)
  // =========================================================================
  floor(16, -24, 0);
  solid(-9, 9, 0, 7, 13, 16, 'roca');                        // borde del cráter detrás del inicio
  L.spots.capsula = { x: 2.9, y: 0, z: 8.8 };
  solid(2, 3.8, 0, 1.2, 7.8, 9.8, 'capsula', { invisible: true });
  L.spots.despertar = { x: -0.4, y: 0, z: 5 };
  checkpoint(0, 0, 4, 1);
  tip(3, 'mover');
  fragLine(0, 0, 1, 0, 0, -5, 4);
  tip(-4, 'saltar');
  solid(-4.2, 4.2, 0, 1.0, -16, -8, 'roca');                 // repisa: primer salto
  fragArc(0, 0, -6.4, -9.4, 1.2, 3);
  crates('normal', 0, 1.0, -12.5, 3);
  tip(-10.5, 'girar');
  fragLine(-2.6, 1, -10, -2.6, 1, -15, 3);
  bicho(-1.4, 0, -19.5, 1.6, { pasivo: true }); bicho(1.6, 0, -22, 1.1, { pasivo: true });
  tip(-17, 'escarabajos');
  crate('rebote', 2.8, 0, -20.5); fragArc(2.8, 1, -20.5, -20.51, 3.8, 4);
  crate('fragmentos', -2.8, 0, -23);
  // hondonada con placas frágiles (si caes, sales saltando)
  solid(-4.2, 4.2, -7, -1.2, -34, -24, 'arena');
  tip(-23, 'placas');
  placa(-1.1, 0, -26.6); placa(1.1, 0, -30.8);
  fragLine(-1.1, 0, -26.6, 1.1, 0, -30.8, 3);
  floor(-34, -48, 0);
  crate('checkpoint', -2.6, 0, -36.5);
  barredor('fragmento', 0, 0, -42, 3.0, 1.8);
  tip(-38.5, 'fragmento');
  fragLine(-2.9, 0, -39, -2.9, 0, -46, 4);
  // primer hueco mortal: 3.0 m (65 % del alcance)
  fragArc(0, 0, -47.2, -51.8, 1.8, 5);
  floor(-51, -62, 0);
  crate('cristal', 1.6, 0, -54); crate('cristal', 1.6, 0.9, -54);
  crates('normal', -1.4, 0, -58, 2);
  // hueco lateral del cráter con el registro 1
  solid(4.2, 10, -6, 0, -60, -52.6, 'arena');
  solid(10, 10.6, 0, 1.1, -60, -52.6, 'roca'); solid(10, 10.6, 1.1, 9, -60, -52.6, 'roca', { invisible: true });
  crates('normal', 6.2, 0, -56.3, 1); crate('normal', 6.2, 0.9, -56.3);
  registro(1, 8.6, 0, -56.3, 'Registro de la cápsula · 001', 'Velocidad de entrada: excesiva. Pasajero: dormido. Recomendación: despertar antes del impacto. Recomendación ignorada.');
  wall(-1, 13, -62, 7, 'roca', -6, 1.1); wall(1, 13, -52.6, 7, 'roca', -6, 1.1); wall(1, -60, -62, 7, 'roca', -6, 1.1);

  // =========================================================================
  // FASE 2 · EL JARDÍN DE TILO (plaza: reparar el recolector con 3 piezas; luego recolectoras y ladrones)
  // =========================================================================
  floor(-62, -96, 0, -9, 9, 'jardin');
  for (const [x0, x1, z0, z1] of [[-11, -9, -96, -62], [9, 11, -96, -62], [-9, -4.2, -63, -62], [4.2, 9, -63, -62], [-9, -4.2, -97, -96], [4.2, 9, -97, -96]]) {
    solid(x0, x1, -6, 1.1, z0, z1, 'roca', { wall: true }); solid(x0, x1, 1.1, 10, z0, z1, 'roca', { wall: true, invisible: true });
  }
  checkpoint(0, 0, -64.5, 2);
  L.spots.tilo = { x: -3.2, y: 0, z: -71 };
  solid(-3.75, -2.65, 0, 1.2, -71.55, -70.45, 'tilo', { invisible: true });
  evento(-66.5, 'conocerTilo');
  // el recolector descompuesto tapa la salida de la plaza
  L.spots.recolector = { x: 0, y: 0, z: -93.5 };
  L.recolector = solid(-4.2, 4.2, 0, 4.2, -95.8, -91.2, 'maquina', { invisible: true });
  // pieza A: en lo alto de la roca comestible (se llega con la caja de rebote)
  solid(5.4, 7.6, 0, 3.6, -80.2, -78, 'piedra');
  crate('rebote', 4.2, 0, -74.6);
  L.piezas.push({ id: 'A', x: 6.5, y: 3.6, z: -79.1, got: false, free: true });
  // pieza B: la lleva un escarabajo ladrón que corre por la plaza
  const ladron = bicho(-4.5, 0, -82, 2.8, { ladron: true, lleva: 'B', axis: 'x', speed: 3 });
  L.piezas.push({ id: 'B', x: ladron.x, y: 0, z: ladron.z, got: false, free: false, carrier: ladron });
  // pieza C: detrás de un cerco de cajas (y una TNT)
  crates('normal', -6.4, 0, -88.2, 3); crate('normal', -6.4, 0.9, -88.2); crate('tnt', -4.4, 0, -90.4); crate('normal', -4.4, 0, -91.5);
  L.piezas.push({ id: 'C', x: -7.4, y: 0, z: -91, got: false, free: true });
  bicho(3.4, 0, -86.5, 2.2, { pasivo: true });
  fragLine(-6, 0, -68, -6, 0, -78, 5); fragLine(3, 0, -88, 6.5, 0, -88, 4);
  crates('normal', 6.6, 0, -68.6, 2); crate('fragmentos', 6.6, 0, -71.4);
  // después de la plaza
  floor(-96, -112, 0);
  concha(2.4, 0, -99.5, true);
  bicho(-1.6, 0, -101.5, 1.8, { ladron: true, speed: 3.2 });
  barredor('recolectora', 0, 0, -107.5, 3.0, 2.0);
  tip(-104.5, 'recolectora');
  fragLine(-2.8, 0, -103, -2.8, 0, -111, 4);
  // suelo quebradizo sobre el vacío
  placa(-1.3, 0, -114.2); placa(1.3, 0, -118.3);
  fragLine(-1.3, 0, -114.2, 1.3, 0, -118.3, 3);
  floor(-119.6, -136, 0);
  tip(-121.5, 'tnt');
  crate('normal', -1.1, 0, -124); crate('tnt', 0, 0, -124); crate('normal', 1.1, 0, -124); crate('normal', 0, 0.9, -124);
  crate('checkpoint', 2.7, 0, -127.4);
  fragLine(-2.8, 0, -122, -2.8, 0, -127, 3);
  // escalinata de piedra hacia la meseta de las ruinas
  solid(-2.6, 2.6, 0, 1.4, -133.2, -130.6, 'ruina');
  solid(-2.6, 2.6, 0, 2.8, -135.8, -133.2, 'ruina');
  fragLine(0, 1.4, -131.9, 0, 2.8, -134.5, 2);
  wall(-1, -96, -136, 7, 'roca', -6, 1.1); wall(1, -96, -136, 7, 'roca', -6, 1.1);

  // =========================================================================
  // FASE 3 · LAS RUINAS INCOMPLETAS (primer cristal de memoria: recordar plataformas; centinelas dormidos)
  // =========================================================================
  floor(-135.8, -146, R, -4.2, 4.2, 'ruina');
  checkpoint(0, R, -137.5, 3);
  L.cristales.push({ x: 0, y: R, z: -141.6, got: false, primero: true });
  evento(-140.6, 'primerRecuerdo');
  // plataforma incompleta: se ve como pista desde el principio; con el recuerdo se vuelve sólida 9 s
  memoria('ruinas1', 2.6, R, -144.4, [[-1.7, 1.7, R - 0.4, R, -153.4, -147.4]], 9);
  fragLine(0, R, -148, 0, R, -153, 3);
  floor(-154.8, -170, R, -4.2, 4.2, 'ruina');
  tip(-156, 'centinela');
  centinela(0, R, -161.5, { dormido: true, rango: 2.2 });
  crate('normal', -2.9, R, -158.6); crate('normal', -2.9, R, -162.4); crate('fragmentos', 2.9, R, -165);
  crate('checkpoint', -2.7, R, -168.2);
  fragLine(2.9, R, -157, 2.9, R, -163, 3);
  // hueco 3.2 m
  fragArc(0, R, -169.4, -173.8, 1.8, 5);
  floor(-173.2, -198, R, -4.2, 4.2, 'ruina');
  // registro 2: en una cornisa a la que solo se llega recordando un escalón
  memoria('cornisa', -1.2, R, -175.8, [[-4.2, -2.4, R, R + 1.3, -179.6, -177.6]], 8);
  solid(-4.2, -1.9, R + 2.6, R + 3.0, -183.4, -180.2, 'ruina', { oneWay: true });
  registro(2, -3.1, R + 3.0, -181.8, 'Inscripción de las ruinas', 'Construimos la mitad de todo. La otra mitad la recordaría alguien más.');
  centinela(0, R, -187, { rango: 2.6 });
  crates('normal', 2.6, R, -184, 2); crate('cristal', -2.8, R, -191);
  fragLine(-1, R, -189, -1, R, -196, 4);
  wall(-1, -136, -198, R + 4, 'ruina', -6, R + 0.9); wall(1, -136, -198, R + 4, 'ruina', -6, R + 0.9);
  for (let z = -140; z > -198; z -= 9) L.columnas.push({ x: -4.6, y: R, z, h: 2 + (z * 7 % 3 + 3) % 3 }, { x: 4.6, y: R, z: z - 4.5, h: 1.5 + ((z * 3) % 2 + 2) % 2 });

  // =========================================================================
  // FASE 4 · EL SANTUARIO DEL ECO (un eco repite tus pasos; esferas resonantes; plataformas temporales; puente)
  // =========================================================================
  floor(-198, -226, R, -4.2, 4.2, 'santuario');
  checkpoint(0, R, -199.5, 4);
  L.ecos.push({ z0: -201.5, z1: -225, delay: 1.5, buf: [], on: false, x: 0, y: R, z: -200, t: 0 });
  tip(-201.5, 'eco');
  crates('normal', -2, R, -206.5, 2); crate('fragmentos', 2.8, R, -208.6);
  esfera(0, R, -214.5, 2.8);
  tip(-209.8, 'esfera');
  fragLine(-2.6, R, -211, -2.6, R, -219, 4); fragLine(2.6, R, -211, 2.6, R, -219, 4);
  crate('normal', 1.8, R, -220.5); crate('rebote', -2.2, R, -221.5);
  crate('checkpoint', 2.6, R, -224.2);
  // plataformas temporales sobre el vacío (parpadean antes de irse)
  tip(-225.2, 'temporales');
  temporal(0, R, -228.4, 2.4, 1.3, 0); temporal(0, R, -232.2, 2.4, 1.3, 1.85);
  temporal(0, R, -236.0, 2.4, 1.3, 0); temporal(0, R, -239.8, 2.4, 1.3, 1.85);
  fragLine(0, R, -228.4, 0, R, -239.8, 4);
  floor(-241.4, -249.6, R, -4.2, 4.2, 'santuario');
  concha(-2.6, R, -244.2);
  // el puente del recuerdo: 12 m de abismo
  memoria('puente', 2.9, R, -248.2, [[-1.5, 1.5, R - 0.4, R, -254, -249.6], [-1.5, 1.5, R - 0.4, R, -258.2, -254], [-1.5, 1.5, R - 0.4, R, -262.4, -258.2]], 10, { grande: true });
  evento(-246.8, 'puente');
  fragLine(0, R, -251, 0, R, -261, 6);
  floor(-262.4, -268.8, R, -4.2, 4.2, 'santuario');
  // bajada a la estación
  solid(-2.6, 2.6, 0, R - 1.4, -271.4, -268.8, 'estacion');
  solid(-2.6, 2.6, 0, R - 2.8, -274, -271.4, 'estacion');
  wall(-1, -198, -268.8, R + 4, 'santuario', -6, R + 0.9); wall(1, -198, -268.8, R + 4, 'santuario', -6, R + 0.9);

  // =========================================================================
  // FASE 5 · LA ESTACIÓN DE LLEGADA (drones, puertas contradictorias, el núcleo y el Guardián)
  // =========================================================================
  floor(-268.8, -300, 0, -4.2, 4.2, 'estacion');
  checkpoint(0, 0, -275.5, 5);
  tip(-277.5, 'dron');
  centinela(0, 2.2, -284, { tipo: 'dron', rango: 2.6 });
  fragLine(-2.8, 0, -278, -2.8, 0, -285, 4);
  puerta(-289, 3.4, 1.9, 0);
  tip(-287, 'puerta');
  crate('normal', -2.8, 0, -291.6); crate('normal', 2.8, 0, -291.6); crate('tnt', 2.8, 0, -293.4);
  fragLine(0, 0, -290.5, 0, 0, -295, 3);
  puerta(-296, 3.0, 1.7, 1.3);
  registro(4, -3.3, 0, -298.4, 'Registro de la estación · llegadas', 'Llegadas previstas hoy: 1. Llegadas confirmadas: 1. Llegadas que todavía no ocurren: 1. Por favor, no pregunte cómo.');
  concha(3.2, 0, -298.4);
  wall(-1, -268.8, -300, 7, 'estacion'); wall(1, -268.8, -300, 7, 'estacion');
  // arena del Guardián
  floor(-300, -337, 0, -10, 10, 'estacion');
  checkpoint(0, 0, -301, 5);
  solid(-10.5, -10, 0, 7, -337, -300, 'estacion', { wall: true }); solid(10, 10.5, 0, 7, -337, -300, 'estacion', { wall: true });
  solid(-10, -4.2, 0, 7, -300.6, -300, 'estacion', { wall: true }); solid(4.2, 10, 0, 7, -300.6, -300, 'estacion', { wall: true });
  solid(-10, -3, 0, 7, -338, -337, 'estacion', { wall: true }); solid(3, 10, 0, 7, -338, -337, 'estacion', { wall: true });
  L.salida = solid(-3, 3, 0, 7, -338, -337, 'puerta', { exit: true });
  L.spots.nucleo = { x: 0, y: 0, z: -305.5 };
  evento(-303, 'nucleo');
  L.spots.arena = { x: 0, z: -319, gate: -300.3 };
  L.spots.guardian = { x: 0, z: -327 };
  L.towers = [{ x: -5, z: -325, top: 2.0 }, { x: 5, z: -325, top: 2.0 }];
  for (const t of L.towers) solid(t.x - 0.8, t.x + 0.8, 0, t.top, t.z - 0.8, t.z + 0.8, 'torre');
  // escalones de memoria hacia cada torre (aparecen en la fase 2 del jefe)
  for (const [i, sx] of [[0, -1], [1, 1]]) {
    const x0 = sx < 0 ? -5.8 : 4.2, x1 = sx < 0 ? -4.2 : 5.8;
    memoria('torre' + i, sx * 2.4, 0, -316.4, [[x0, x1, 0, 0.9, -319, -317], [x0, x1, 0, 1.8, -321, -319], [x0, x1, 0, 2.7, -323.4, -321]], 9, { hidden: true, jefe: i });
  }

  // =========================================================================
  // FASE 6 · LA SEÑAL DE LUNEX (huida: la estación se reconfigura detrás de DIP; la cámara lo mira de frente)
  // =========================================================================
  L.chase = { start: -341, end: -446, zona: [-337, -446] };
  floor(-337, -350, 0, -4.2, 4.2, 'estacion');
  fragLine(0, 0, -339, 0, 0, -349, 5);
  evento(-352, 'lunex');
  fragArc(0, 0, -349.4, -353.4, 1.6, 5);                 // hueco 2.8 m
  floor(-352.8, -372, 0, -4.2, 4.2, 'estacion');
  crate('normal', -2.6, 0, -356); crate('fragmentos', 2.6, 0, -357);
  puerta(-362, 2.1, 1.5, 0.4);
  centinela(1.4, 0, -368, { rango: 2.2, simple: true, vel: 2.2 });
  // plataformas inestables
  placa(0, 0, -374.6); placa(0, 0, -378.8);
  floor(-380.4, -404, 0, 0, 4.2, 'estacion');
  floor(-380.4, -386, 0, -4.2, 0, 'estacion'); floor(-392.2, -404, 0, -4.2, 0, 'estacion');
  fragLine(2.4, 0, -381, 2.4, 0, -391, 5);
  barredor('fragmento', -1.2, 0, -398, 2.4, 2.2);
  fragArc(0, 0, -403.4, -407.8, 1.8, 5);                 // hueco 3.2 m
  floor(-407.2, -446, 0, -4.2, 4.2, 'estacion');
  checkpoint(0, 0, -408.8, 6);
  barredor('fragmento', 1.2, 0, -414, 2.4, 2.4);
  fragLine(0, 0, -410, 0, 0, -430, 9);
  // bolsillo arriesgado con el registro 3
  solid(-6.6, -4.2, -6, 0, -424, -420, 'estacion');
  solid(-7.2, -6.6, 0, 4, -424, -420, 'estacion');
  registro(3, -5.6, 0, -422, 'Diario de Tilo (página manchada)', 'Día 412: hoy comí una piedra azul. Sabía a martes. Volví a soñar con el pequeño que cae del cielo.');
  centinela(1.2, 0, -427, { rango: 2.4, simple: true, vel: 2.4 });
  crate('normal', -2.8, 0, -434); crate('normal', 2.8, 0, -434); crate('checkpoint', -2.8, 0, -440);
  L.spots.chaseEnd = { z: -443 };
  wall(-1, -337, -420, 7, 'estacion'); wall(-1, -424, -446, 7, 'estacion'); wall(1, -337, -446, 7, 'estacion');
  // el final: la plataforma de la señal
  floor(-446, -462, 0, -7, 7, 'jardin');
  for (const [x0, x1, z0, z1] of [[-7.5, -7, -462, -446], [7, 7.5, -462, -446], [-7, 7, -463, -462]]) {
    solid(x0, x1, -6, 1.1, z0, z1, 'roca', { wall: true }); solid(x0, x1, 1.1, 10, z0, z1, 'roca', { wall: true, invisible: true });
  }
  L.spots.tiloFinal = { x: 2.2, y: 0, z: -451.5 };
  L.spots.senal = { x: 0, y: 0, z: -458 };
  evento(-447.5, 'final');
  return L;
}

// Estado que se da por hecho al empezar (o continuar) en un punto del nivel
export function progresoHasta(z) {
  return {
    tilo: z < -66.5,                 // ya conoció a Tilo
    recolector: z < -96,             // el recolector ya está reparado
    recordar: z < -140.6,            // ya tiene el primer recuerdo
    jefe: z < -337.5                 // el Guardián ya está desactivado
  };
}

// Consejos breves según el control activo (k: teclado · t: táctil)
export const TIPS = {
  mover: { k: 'Muévete con las flechas o WASD.', t: 'Muévete con el pulgar izquierdo.' },
  saltar: { k: 'Espacio: saltar. Mantén para llegar más alto.', t: 'Saltar. Mantén para llegar más alto.' },
  girar: { k: 'X: girar. Rompe cajas y aparta enemigos.', t: 'Girar: rompe cajas y aparta enemigos.' },
  escarabajos: { k: 'Escarabajos de polvo. No muerden. Todavía.', t: 'Escarabajos de polvo. No muerden. Todavía.' },
  placas: { k: 'Placas frágiles: se hunden si te quedas.', t: 'Placas frágiles: se hunden si te quedas.' },
  fragmento: { k: 'Fragmento de vidrio negro: esquívalo o sáltalo.', t: 'Fragmento de vidrio negro: esquívalo o sáltalo.' },
  recolectora: { k: 'Recolectora fuera de control. No se rompe.', t: 'Recolectora fuera de control. No se rompe.' },
  tnt: { k: 'TNT: al pisarla cuenta 3. Girando explota al instante.', t: 'TNT: al pisarla cuenta 3. Girando explota al instante.' },
  recordar: { k: 'C: recordar. Junto a un ancla, lo incompleto se vuelve real un rato.', t: 'Recordar: junto a un ancla, lo incompleto se vuelve real un rato.' },
  centinela: { k: 'Centinela dormido. Si despierta, esquiva su carga y písalo mientras se recupera.', t: 'Centinela dormido. Si despierta, esquiva su carga y písalo mientras se recupera.' },
  eco: { k: 'Un eco repite tus pasos. No te detengas.', t: 'Un eco repite tus pasos. No te detengas.' },
  esfera: { k: 'Esfera resonante: salta sus ondas.', t: 'Esfera resonante: salta sus ondas.' },
  temporales: { k: 'Plataformas temporales: parpadean antes de irse.', t: 'Plataformas temporales: parpadean antes de irse.' },
  dron: { k: 'Dron de mantenimiento: se lanza en picada. Apártate.', t: 'Dron de mantenimiento: se lanza en picada. Apártate.' },
  puerta: { k: 'Puertas de la estación: dicen lo contrario de lo que hacen.', t: 'Puertas de la estación: dicen lo contrario de lo que hacen.' }
};
