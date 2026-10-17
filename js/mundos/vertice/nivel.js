// nivel.js — Mundo 2 · Vértice: el planeta de las leyes rotas, como datos. Metros; y hacia arriba; avanza hacia -z.
// Islas flotantes sobre un océano celeste. Mecánica del mundo: la gravedad cambia por zonas
// (ligera: saltas el doble; invertida: caes hacia arriba y caminas por el techo; pesada: casi no despegas).
//
// Fases (documento maestro): 1 La caída invertida · 2 El valle de las cascadas ascendentes · 3 La ciudad suspendida ·
// 4 La cámara de las leyes · 5 La torre central (jefe: Arquitecto de Vértice) · 6 La memoria del océano

export const YB = 14.6;   // altura de la cámara de las leyes, la torre y la memoria del océano

export function buildVertice() {
  const L = {
    solids: [], crates: [], frags: [], bichos: [], formas: [], falling: [], registros: [], conchas: [],
    checkpoints: [], tips: [], sections: [], spots: {}, memorias: [], centinelas: [], esferas: [], ecos: [],
    puertas: [], temporales: [], piezas: [], cristales: [], campos: [], moviles: [], corrientes: [], medusas: [], tramos: [], nodos: []
  };
  const solid = (x0, x1, y0, y1, z0, z1, mat = 'isla', o = {}) => { const s = { x0, x1, y0, y1, z0, z1, mat, active: true, ...o }; L.solids.push(s); return s; };
  const floor = (zBack, zFront, top = 0, x0 = -4.2, x1 = 4.2, mat = 'isla', o = {}) => solid(x0, x1, top - 6, top, zFront, zBack, mat, o);
  const crate = (type, x, y, z) => L.crates.push({ type, x, y, z, alive: true, hits: 0, t: 0 });
  const crates = (type, x, y, z, n, dx = 1.05) => { for (let i = 0; i < n; i++) crate(type, x + (i - (n - 1) / 2) * dx, y, z); };
  const fragLine = (x0, y0, z0, x1, y1, z1, n) => { for (let i = 0; i < n; i++) { const k = n === 1 ? 0 : i / (n - 1); L.frags.push({ x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k + 0.9, z: z0 + (z1 - z0) * k, alive: true }); } };
  const fragArc = (x, y, z0, z1, h, n) => { for (let i = 0; i < n; i++) { const k = i / (n - 1); L.frags.push({ x, y: y + 0.9 + Math.sin(k * Math.PI) * h, z: z0 + (z1 - z0) * k, alive: true }); } };
  const bicho = (x, y, z, range = 1.6, o = {}) => L.bichos.push({ hx: x, hz: z, x, y, z, range, axis: 'x', dir: 1, t: Math.random() * 2, alive: true, glitch: 0, vy: 0, ...o });
  const barredor = (kind, x, y, z, range, speed = 2.2) => L.formas.push({ kind, hx: x, x, y, z, range, speed, dir: 1, alive: true, t: 0 });
  const placa = (x, top, z, w = 2.4, d = 2.4) => { const s = solid(x - w / 2, x + w / 2, top - 0.35, top, z - d / 2, z + d / 2, 'placa', { falling: true }); L.falling.push({ s, top, state: 'firme', t: 0, y: 0 }); };
  const checkpoint = (x, y, z, sec) => L.checkpoints.push({ x, y, z, sec, on: false });
  const tip = (z, text) => L.tips.push({ z, who: 'tip', text, done: false });
  const evento = (z, text) => L.tips.push({ z, who: 'evento', text, done: false });
  const registro = (id, x, y, z, title, text) => L.registros.push({ id, x, y, z, title, text, got: false });
  const concha = (x, y, z) => L.conchas.push({ x, y, z, got: false });
  const centinela = (x, y, z, o = {}) => L.centinelas.push({ hx: x, x, y, z, home: y, tipo: 'suelo', rango: 2, dir: 1, state: o.dormido ? 'dormido' : 'patrulla', t: 0, alive: true, face: 1, ...o });
  const esfera = (x, y, z, period, offset, color, brillo) => L.esferas.push({ x, y, z, period, t: -offset, r: 0, color, brillo });
  const temporal = (x, top, z, on, off, offset = 0, w = 2.6, d = 2.4) => {
    const s = solid(x - w / 2, x + w / 2, top - 0.35, top, z - d / 2, z + d / 2, 'temporal', { temp: true });
    L.temporales.push({ s, on, off, t: offset, vis: 1 });
  };
  const memoria = (id, x, y, z, ghosts, dur, o = {}) => {
    const targets = ghosts.map(([x0, x1, y0, y1, z0, z1]) => solid(x0, x1, y0, y1, z0, z1, 'memoria', { ghost: true, active: false }));
    L.memorias.push({ id, x, y, z, targets, dur, state: 'lista', t: 0, ...o });
  };
  // mecanismo: se activa girando junto a él; conecta islas (piezas fijas) o cambia campos de gravedad
  const interruptor = (id, x, y, z, ghosts, o = {}) => memoria(id, x, y, z, ghosts, Infinity, { interruptor: true, ...o });
  const campo = (tipo, x0, x1, y0, y1, z0, z1, o = {}) => L.campos.push({ tipo, x0, x1, y0, y1, z0, z1, activo: true, ...o });
  const cascada = (x, z, y0, y1, r = 1.5, o = {}) => L.corrientes.push({ x, z, y0, y1, r, fuerza: 40, max: 9, ...o });
  const movil = (x0, x1, y0, y1, z0, z1, ax, dist, period) => { const s = solid(x0, x1, y0, y1, z0, z1, 'marmol', { movil: true }); L.moviles.push({ s, ax, a: 0, b: dist, v: 0, t: 0, period }); };
  const medusa = (x, y0, z, amp = 0.8, period = 2.6) => L.medusas.push({ x, y0, y: y0, z, amp, period, t: Math.random() * 2 });
  // paredes: borde bajo visible y colisión alta invisible (se ve el cielo); `alta` = pared visible completa
  const wall = (zBack, zFront, lip, top, mat = 'roca', alta = false) => {
    for (const [x0, x1] of [[-6.5, -4.2], [4.2, 6.5]]) {
      if (alta) { solid(x0, x1, -6, top, zFront, zBack, mat, { wall: true }); continue; }
      solid(x0, x1, lip - 7, lip, zFront, zBack, mat, { wall: true });
      solid(x0, x1, lip, top, zFront, zBack, mat, { wall: true, invisible: true });
    }
  };

  L.sections = [
    { n: 1, name: 'La caída invertida', z0: 16, z1: -86, muerteY: -8, techoY: 16 },
    { n: 2, name: 'El valle de las cascadas ascendentes', z0: -86, z1: -162, muerteY: -8, techoY: 30 },
    { n: 3, name: 'La ciudad suspendida', z0: -162, z1: -246, muerteY: 0, techoY: 30 },
    { n: 4, name: 'La cámara de las leyes', z0: -246, z1: -318, muerteY: 4, techoY: 30 },
    { n: 5, name: 'La torre central', z0: -318, z1: -354, muerteY: 8, techoY: YB + 12 },
    { n: 6, name: 'La memoria del océano', z0: -354, z1: -470, muerteY: 8, techoY: 40 }
  ];
  L.tramos = [
    { z0: 16, z1: -86, y: 0, tipo: 'islas' }, { z0: -86, z1: -162, y: 3, tipo: 'cascadas' }, { z0: -162, z1: -246, y: 7, tipo: 'ciudad' },
    { z0: -246, z1: -318, y: 12, tipo: 'leyes' }, { z0: -318, z1: -354, y: YB, tipo: 'torre' }, { z0: -354, z1: -460, y: YB, tipo: 'oceano' }
  ];

  // =========================================================================
  // FASE 1 · LA CAÍDA INVERTIDA (gravedad ligera, la primera vez caminando por el techo)
  // =========================================================================
  floor(14, -14, 0);
  solid(-9, 9, -6, 2, 12, 14, 'roca'); solid(-9, 9, 2, 20, 12, 14, 'roca', { invisible: true });
  L.spots.despertar = { x: 0, y: 0, z: 4 };
  L.spots.constructor = { x: 2.6, y: 0, z: 1.5 };
  bicho(2.6, 0, 1.5, 0.4, { pasivo: true, constructor_: true, guia: true });
  checkpoint(0, 0, 3, 1);
  fragLine(0, 0, 1, 0, 0, -5, 4);
  crates('normal', 0, 0, -6.5, 2, 2.2);
  bicho(0, 0, -10.5, 1.8, { salta: 1.5 });
  tip(-8.5, 'saltador');
  // salto largo con gravedad ligera (5 m)
  campo('ligera', -4.2, 4.2, -8, 16, -24, -12);
  tip(-11.5, 'ligera');
  fragArc(0, 0, -14.5, -18.5, 3.6, 5);
  floor(-19, -44, 1.5);
  crate('fragmentos', -2.6, 1.5, -24); crate('normal', 2.6, 1.5, -22.5);
  // la medusa sirve de trampolín hacia la cornisa del registro 1
  medusa(2.6, 2.9, -29.5);
  tip(-26, 'medusa');
  solid(1.4, 4.2, 6.9, 7.2, -34, -30.6, 'marmol', { oneWay: true });
  registro(1, 2.8, 7.2, -32.3, 'Manual del Constructor, pág. 1', 'Regla 1: construir hacia arriba. Regla 2: si arriba cambia de lugar, ver regla 1.');
  bicho(-1, 1.5, -35.5, 2, { salta: 1.7 });
  crate('checkpoint', -2.8, 1.5, -41);
  fragLine(-2.6, 1.5, -30, -2.6, 1.5, -38, 4);
  // isla invertida: el campo te lleva al techo; al terminar, caes sobre la isla siguiente
  solid(-4.2, 4.2, 8.5, 10.5, -62, -42, 'isla_techo');
  campo('invertida', -4.2, 4.2, -4, 10.5, -60, -43.5);
  tip(-41.5, 'invertida');
  crate('normal', -1.6, 7.6, -48.5); crate('normal', 1.6, 7.6, -53);
  fragLine(0, 6.85, -45.5, 0, 6.85, -58.5, 7);
  floor(-58.5, -86, 0);
  concha(2.4, 0, -63);
  bicho(1.2, 0, -67, 1.6, { salta: 1.3 }); bicho(-1.2, 0, -73, 1.6, { salta: 1.6 });
  crates('normal', -2.6, 0, -70, 1); crate('tnt', 2.7, 0, -76); crate('normal', 2.7, 0, -77.1);
  fragLine(0, 0, -66, 0, 0, -84, 7);
  medusa(-2.4, 1.6, -80, 0.5, 2.2);
  wall(14, -19, 1.1, 14); wall(-19, -58.5, 2.6, 14); wall(-58.5, -86, 1.1, 14);

  // =========================================================================
  // FASE 2 · EL VALLE DE LAS CASCADAS ASCENDENTES (cascadas que suben, mecanismos que conectan islas)
  // =========================================================================
  floor(-89, -100, 0);
  fragArc(0, 0, -85.4, -89.6, 1.8, 5);                    // hueco 3 m
  checkpoint(0, 0, -90.5, 2);
  cascada(0, -102, -14, 9.6, 1.6);
  tip(-96.5, 'cascada');
  fragLine(0, 2, -102, 0, 8, -102, 4);
  floor(-106.4, -123, 6.5);
  barredor('anguila', 0, 6.5, -111.5, 3, 2.1);
  tip(-108.5, 'anguila');
  centinela(0, 6.5, -118, { rango: 2.4 });
  interruptor('puente1', 2.9, 6.5, -121.4, [[-1.6, 1.6, 6.1, 6.5, -129, -123], [-1.6, 1.6, 6.1, 6.5, -135, -129]]);
  tip(-119.6, 'interruptor');
  fragLine(0, 6.5, -124, 0, 6.5, -134, 5);
  floor(-135, -162, 6.5);
  esfera(0, 6.5, -143.5, 2.8, 0, 0xd8f0ff, 0x4ab8ff);
  tip(-139.5, 'burbuja');
  crates('normal', -2.6, 6.5, -138.5, 2, 1.05); crate('fragmentos', 2.6, 6.5, -140);
  // cascada pequeña hacia la cornisa del registro 2
  cascada(3.1, -150.5, 6.5, 13.6, 1.1);
  solid(1.6, 4.2, 12.9, 13.2, -157, -152.4, 'marmol', { oneWay: true });
  registro(2, 2.9, 13.2, -154.6, 'Aviso de tránsito', 'Las rutas entre islas se desconectan sin previo aviso. El aviso también se desconectó.');
  bicho(-1.2, 6.5, -152, 1.6, { salta: 1.4 });
  crate('checkpoint', -2.8, 6.5, -158.5);
  fragLine(-2.4, 6.5, -146, -2.4, 6.5, -156, 4);
  wall(-86, -106, 1.1, 22); wall(-106, -162, 7.6, 22);

  // =========================================================================
  // FASE 3 · LA CIUDAD SUSPENDIDA (plataformas móviles, rutas que se desconectan, drones de tránsito)
  // =========================================================================
  floor(-162, -172, 6.5, -4.2, 4.2, 'marmol');
  checkpoint(0, 6.5, -163.5, 3);
  bicho(2.6, 6.5, -168, 0.8, { pasivo: true, constructor_: true });
  evento(-165, 'constructores');
  movil(-1.6, 1.6, 6.1, 6.5, -175.6, -173, 'z', -7.4, 4.2);
  tip(-170.5, 'movil');
  floor(-184, -198, 6.5, -4.2, 4.2, 'marmol');
  centinela(0, 8.7, -191, { tipo: 'dron', rango: 2.4 });
  bicho(-2.6, 6.5, -186.5, 1, { pasivo: true, constructor_: true });
  crates('normal', 2.6, 6.5, -188, 1); crate('normal', 2.6, 7.4, -188); crate('fragmentos', -2.6, 6.5, -195);
  fragLine(0, 6.5, -185, 0, 6.5, -196, 5);
  tip(-196.5, 'temporales');
  temporal(0, 6.5, -200.4, 2.2, 1.2, 0); temporal(0, 6.5, -204.6, 2.2, 1.2, 1.7);
  floor(-207, -224, 6.5, -4.2, 4.2, 'marmol');
  centinela(0, 6.5, -214.5, { rango: 2.4 });
  crate('normal', -1.1, 6.5, -219); crate('tnt', 0, 6.5, -219); crate('normal', 1.1, 6.5, -219);
  registro(3, -3.3, 6.5, -222, 'Ley de Vértice nº 3', 'Todo lo que sube debe bajar. Excepciones: el agua, los martes y la ley nº 3.');
  // plataforma que sube al barrio alto
  movil(-1.6, 1.6, 6.1, 6.5, -227.4, -224.6, 'y', 3.5, 4.6);
  floor(-228.6, -246, 10, -4.2, 4.2, 'marmol');
  concha(-2.4, 10, -232); crate('checkpoint', 2.6, 10, -236);
  bicho(0, 10, -240, 1.4, { salta: 1.4 });
  fragLine(0, 10, -230, 0, 10, -244, 6);
  wall(-162, -228.6, 7.6, 24, 'marmol'); wall(-228.6, -246, 11.1, 24, 'marmol');

  // =========================================================================
  // FASE 4 · LA CÁMARA DE LAS LEYES (tres dispositivos cambian los campos; la ciudad se inclina)
  // =========================================================================
  L.inclinacion = { z0: -246, z1: -318, max: 0.07 };
  floor(-246, -258, 10, -4.2, 4.2, 'leyes');
  checkpoint(0, 10, -247.5, 4);
  evento(-249, 'leyes');
  // 1: gravedad ligera para subir la grada alta
  campo('ligera', -4.2, 4.2, 6, 20, -262, -252, { activo: false, id: 'c1' });
  interruptor('ley1', -2.9, 10, -251.5, [], { campos: ['c1'], ley: true });
  floor(-258, -274, YB, -4.2, 4.2, 'leyes');
  fragLine(0, 11, -256, 0, 14.6, -259, 3);
  // 2: campo invertido para cruzar el abismo por el techo
  solid(-4.2, 4.2, 21, 22.5, -290, -270, 'leyes');
  campo('invertida', -4.2, 4.2, 8, 22.5, -286, -271, { activo: false, id: 'c2' });
  interruptor('ley2', 2.9, YB, -262.5, [], { campos: ['c2'], ley: true });
  esfera(0, YB, -266.5, 3.0, 0, 0xe8d8ff, 0x9a6aff);
  fragLine(0, 18.5, -275, 0, 18.5, -284, 4);
  floor(-284.5, -294, YB, -4.2, 4.2, 'leyes');
  // 3: el campo pesado no deja saltar el hueco: hay que apagarlo
  campo('pesada', -4.2, 4.2, 8, 26, -298, -290.6, { id: 'c3' });
  interruptor('ley3', -2.9, YB, -288, [], { campos: ['c3'], ley: true });
  fragArc(0, YB, -293.6, -297.8, 1.6, 5);                // hueco 3.4 m
  floor(-297.4, -318, YB, -4.2, 4.2, 'leyes');
  L.ecos.push({ z0: -299, z1: -312, delay: 1.5, buf: [], on: false, x: 0, y: YB, z: -300, t: 0 });
  tip(-299, 'duplicado');
  centinela(0, YB, -308, { rango: 2.4 });
  crates('normal', -2.6, YB, -303, 2); crate('checkpoint', 2.6, YB, -314);
  registro(4, -3.3, YB, -315.5, 'Nota del Arquitecto', 'Si todo cae igual, nada se pierde. Lunex lo prometió. Yo solo dibujé los planos.');
  wall(-246, -318, 0, 26, 'leyes', true);

  // =========================================================================
  // FASE 5 · LA TORRE CENTRAL (jefe: Arquitecto de Vértice)
  // =========================================================================
  floor(-318, -354, YB, -9, 9, 'torre');
  checkpoint(0, YB, -319.5, 5);
  evento(-322, 'arquitecto');
  for (const [x0, x1, z0, z1] of [[-9.5, -9, -354, -318], [9, 9.5, -354, -318], [-9, -4.2, -318.6, -318], [4.2, 9, -318.6, -318], [-9, -3, -355, -354], [3, 9, -355, -354]]) solid(x0, x1, YB - 6, YB + 14, z0, z1, 'torre', { wall: true });
  L.salida = solid(-3, 3, YB, YB + 14, -355, -354, 'reja', { exit: true });
  solid(-9, 9, YB + 8.5, YB + 9.1, -354, -318, 'vidrio');
  campo('invertida', -9, 9, YB - 2, YB + 9.5, -354, -318, { activo: false, id: 'arena', oculto: true });
  L.spots.arena = { x: 0, y: YB, z: -336, gate: -318.3, camH: 12.5 };
  L.spots.arquitecto = { x: 0, y: YB + 3.6, z: -342 };
  L.nodos = [-5.5, 0, 5.5].map((x, i) => ({ x, z: i === 1 ? -334 : -328 }));

  // =========================================================================
  // FASE 6 · LA MEMORIA DEL OCÉANO (DIP recuerda un océano que fluía hacia arriba)
  // =========================================================================
  floor(-354, -362, YB);
  memoria('oceano', 2.9, YB, -359.6, [[-1.6, 1.6, YB - 0.4, YB, -368, -362], [-1.6, 1.6, YB - 0.4, YB, -374, -368], [-1.6, 1.6, YB - 0.4, YB, -378.4, -374]], 12, { grande: true });
  evento(-357, 'oceano');
  fragLine(0, YB, -363, 0, YB, -377, 6);
  floor(-378.4, -394, YB);
  barredor('corriente', 0, YB, -385.5, 3, 2.3);
  centinela(1.4, YB + 2.2, -391, { tipo: 'dron', rango: 2.2, simple: true });
  // fragmentos de isla que se sueltan
  placa(-1.2, YB, -396.4); placa(1.2, YB, -400.6); placa(-1.2, YB, -404.8);
  floor(-406.2, -420, YB);
  bicho(0, YB, -411, 1.8, { salta: 1.3 });
  crates('normal', 2.6, YB, -409, 1); crate('checkpoint', -2.8, YB, -416);
  cascada(0, -421.8, YB - 14, YB + 8.6, 1.6);
  floor(-426.4, -446, YB + 5, -7, 7, 'isla');
  for (const [x0, x1, z0, z1] of [[-7.5, -7, -446, -426.4], [7, 7.5, -446, -426.4], [-7, 7, -447, -446]]) { solid(x0, x1, YB - 1, YB + 6.1, z0, z1, 'roca', { wall: true }); solid(x0, x1, YB + 6.1, YB + 20, z0, z1, 'roca', { wall: true, invisible: true }); }
  L.spots.final = { x: 0, y: YB + 5, z: -436 };
  evento(-430, 'final');
  wall(-354, -426.4, YB + 1.1, YB + 16);
  return L;
}

export function progresoHasta(z) {
  return { puentes: z < -135, leyes: z < -318, jefe: z < -354.5 };
}

export const TIPS = {
  saltador: { k: 'Saltador del vacío: se agacha antes de brincar. Písalo.', t: 'Saltador del vacío: se agacha antes de brincar. Písalo.' },
  ligera: { k: 'Gravedad ligera: saltas el doble y caes despacio.', t: 'Gravedad ligera: saltas el doble y caes despacio.' },
  medusa: { k: 'Medusa de corriente: de lado pica, desde arriba rebota muy alto.', t: 'Medusa de corriente: de lado pica, desde arriba rebota muy alto.' },
  invertida: { k: 'Campo invertido: caerás hacia arriba. Camina por el techo.', t: 'Campo invertido: caerás hacia arriba. Camina por el techo.' },
  cascada: { k: 'Cascada ascendente: métete y te sube.', t: 'Cascada ascendente: métete y te sube.' },
  anguila: { k: 'Anguila de corriente: no se rompe. Sáltala.', t: 'Anguila de corriente: no se rompe. Sáltala.' },
  interruptor: { k: 'Mecanismo: gira junto a él (X) para conectar las islas.', t: 'Mecanismo: gira junto a él para conectar las islas.' },
  burbuja: { k: 'Burbuja de presión: salta sus ondas.', t: 'Burbuja de presión: salta sus ondas.' },
  movil: { k: 'Plataforma móvil: súbete y te lleva.', t: 'Plataforma móvil: súbete y te lleva.' },
  temporales: { k: 'Ruta inestable: las plataformas parpadean antes de irse.', t: 'Ruta inestable: las plataformas parpadean antes de irse.' },
  duplicado: { k: 'Duplicado gravitatorio: repite tus pasos. No te detengas.', t: 'Duplicado gravitatorio: repite tus pasos. No te detengas.' }
};
