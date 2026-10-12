// level1.js — Nivel 1: Sector Demolición, como datos. Unidades en metros, y hacia arriba, el nivel avanza hacia -z.
// Alcance de salto a velocidad máxima ≈ 4.6 m (config.jumpReach). Huecos obligatorios: 2.8–3.9 m (60–85 %).
//
// Secciones: 1 Calles de pantallas · 2 Tejados de oficinas · 3 Persecución del vacío · Jefe: Inspector de Trámites

export function buildLevel1() {
  const L = {
    solids: [], crates: [], frags: [], bichos: [], formas: [], falling: [], pages: [], copias: [],
    checkpoints: [], tips: [], decor: [], sections: [], spots: {}, bounds: { x0: -5.2, x1: 5.2 }
  };
  const solid = (x0, x1, y0, y1, z0, z1, mat = 'asfalto', o = {}) => { const s = { x0, x1, y0, y1, z0, z1, mat, active: true, ...o }; L.solids.push(s); return s; };
  // suelo con cara superior en "top" entre z0 (atrás, mayor) y z1 (adelante, menor)
  const floor = (zBack, zFront, top = 0, x0 = -4.2, x1 = 4.2, mat = 'asfalto', o = {}) => solid(x0, x1, top - 6, top, zFront, zBack, mat, o);
  const crate = (type, x, y, z) => { L.crates.push({ type, x, y, z, alive: true, hits: 0, t: 0 }); };
  const crates = (type, x, y, z, n, dx = 1.05) => { for (let i = 0; i < n; i++) crate(type, x + (i - (n - 1) / 2) * dx, y, z); };
  const fragLine = (x0, y0, z0, x1, y1, z1, n) => { for (let i = 0; i < n; i++) { const k = n === 1 ? 0 : i / (n - 1); L.frags.push({ x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k + 0.9, z: z0 + (z1 - z0) * k, alive: true }); } };
  const fragArc = (x, y, z0, z1, h, n) => { for (let i = 0; i < n; i++) { const k = i / (n - 1); L.frags.push({ x, y: y + 0.9 + Math.sin(k * Math.PI) * h, z: z0 + (z1 - z0) * k, alive: true }); } };
  const bicho = (x, y, z, range = 1.6, axis = 'x') => L.bichos.push({ hx: x, hz: z, x, y, z, range, axis, dir: 1, t: Math.random() * 2, alive: true, glitch: 0, vy: 0 });
  const formateadora = (x, y, z, range, speed = 2.2) => L.formas.push({ hx: x, x, y, z, range, speed, dir: 1, alive: true, t: 0 });
  const fallPlat = (x, top, z, w = 2.4, d = 2.4) => { const s = solid(x - w / 2, x + w / 2, top - 0.35, top, z - d / 2, z + d / 2, 'rejilla', { falling: true }); L.falling.push({ s, top, state: 'firme', t: 0, y: 0 }); };
  const checkpoint = (x, y, z, sec) => L.checkpoints.push({ x, y, z, sec, on: false });
  const tip = (z, who, text, o = {}) => L.tips.push({ z, who, text, done: false, ...o });
  const page = (id, x, y, z, title, text) => L.pages.push({ id, x, y, z, title, text, got: false });
  const deco = (type, o) => L.decor.push({ type, ...o });

  L.sections = [
    { n: 1, name: 'Calles de pantallas', z0: 8, z1: -104, cam: 'detras' },
    { n: 2, name: 'Tejados de oficinas', z0: -104, z1: -214, cam: 'detras' },
    { n: 3, name: 'Persecución del vacío', z0: -214, z1: -330, cam: 'frente' },
    { n: 4, name: 'Inspector de Trámites', z0: -330, z1: -362, cam: 'jefe' }
  ];

  // =========================================================================
  // INICIO: el sofá de DIP frente a su casa
  // =========================================================================
  floor(15, -34, 0);
  solid(-6, 6, 0, 4.5, 13.5, 15, 'fachada');                 // fachada de la casa (cierra el inicio)
  L.spots.sofa = { x: 0, y: 0, z: 5.2 };
  deco('sofa', { x: 0, y: 0, z: 5.6 });
  deco('casa', { x: 0, z: 13.4 });
  checkpoint(0, 0, 3, 1);

  // =========================================================================
  // SECCIÓN 1 · CALLES DE PANTALLAS (introducir: correr, saltar, girar, cajas)
  // =========================================================================
  tip(1.5, 'guia', 'mover');
  fragLine(0, 0, 0, 0, 0, -8, 5);
  crate('normal', 0, 0, -6);
  tip(-5, 'guia', 'saltar');
  crates('normal', 0, 0, -10, 3);
  tip(-9, 'guia', 'girar');
  bicho(0, 0, -15, 1.8);
  fragLine(-1.6, 0, -13, -1.6, 0, -20, 4);
  crate('rebote', 1.8, 0, -19);
  fragArc(1.8, 1, -19, -19.01, 3.8, 4);                    // columna sobre la caja de rebote
  tip(-18, 'guia', 'rebote');
  crate('fragmentos', -1.8, 0, -24);
  crate('normal', 0, 0, -26); crate('normal', 0, 0.9, -26);
  bicho(-1.5, 0, -30, 1.4);
  // primer hueco: poco profundo, se sale saltando
  solid(-4.2, 4.2, -7, -1.1, -36.8, -34, 'asfalto');
  tip(-31, 'guia', 'hueco');
  fragArc(0, 0, -33.4, -37.4, 1.4, 5);
  floor(-36.8, -60, 0);
  crate('checkpoint', -2.2, 0, -39);
  crate('cristal', 1.6, 0, -43); crate('cristal', 1.6, 0.9, -43);
  tip(-41, 'guia', 'cristal');
  bicho(1.2, 0, -47, 1.8); bicho(-1.2, 0, -51, 1.8);
  fragLine(0, 0, -45, 0, 0, -57, 6);
  crates('normal', 0, 0, -55, 2, 2.4);
  // hueco mortal: 3.0 m (65 % del alcance)
  fragArc(0, 0, -59.2, -63.8, 1.8, 5);
  floor(-63, -104, 0);
  crate('normal', -1.2, 0, -66); crate('fragmentos', 1.2, 0, -66);
  formateadora(0, 0, -72, 3.2, 1.8);
  tip(-69, 'guia', 'formateadora');
  fragLine(-2.8, 0, -68, -2.8, 0, -78, 5);
  // callejón lateral con la página 1 (sale del corredor)
  solid(4.2, 10, -6, 0, -84, -76, 'acera');
  solid(10, 10.6, 0, 7, -84, -76, 'fachada');
  crates('normal', 6, 0, -80, 2, 1.05); crate('normal', 6, 0.9, -80);
  page(1, 8.6, 0, -80, 'Formateadoras', 'Máquinas diseñadas para eliminar lo inútil. Ningún estudio ha podido determinar para qué sirven ellas.');
  bicho(0, 0, -86, 2.2); bicho(2, 0, -91, 1.2);
  crates('normal', -1.8, 0, -90, 2); crate('fragmentos', 2.4, 0, -95);
  // página 3: detrás de las cajas al pie de la escalera de incendios
  crates('normal', -3.6, 0, -98, 1); crate('normal', -3.6, 0.9, -98);
  page(3, -3.7, 0, -100.4, 'Salvapantallas', 'Programas creados para proteger pantallas de un daño que ya no existe. Considerados inútiles. Esta página no está de acuerdo.');
  // escalera de incendios hacia los tejados (desarrollar: saltos en altura)
  solid(-1.5, 2.5, 0, 1.4, -104, -100.6, 'metal');
  solid(-1.5, 2.5, 0, 2.8, -107.6, -104, 'metal');
  solid(-1.5, 2.5, 0, 4.2, -111, -107.6, 'metal');
  fragLine(0.5, 1.4, -101.5, 0.5, 4.2, -110, 5);

  // =========================================================================
  // SECCIÓN 2 · TEJADOS DE OFICINAS (desarrollar + giro: TNT, plataformas que caen, Copia)
  // =========================================================================
  const R = 5.4;  // altura de los tejados
  checkpoint(0.5, 4.2, -109.5, 2);
  floor(-111, -128, R, -4.2, 4.2, 'azotea');
  fragLine(0, R, -113, 0, R, -126, 7);
  bicho(-1, R, -121, 1.8);
  // hueco 3.0 m
  fragArc(0, R, -127.2, -131.8, 1.8, 5);
  floor(-131, -146, R, -4.2, 4.2, 'azotea');
  tip(-133, 'guia', 'tnt');
  crate('normal', -1.1, R, -138); crate('tnt', 0, R, -138); crate('normal', 1.1, R, -138);
  crate('normal', 0, R + 0.9, -138);
  L.copias.push({ x: 2.6, y: R, z: -143, got: false, first: true });
  fragLine(-2.6, R, -134, -2.6, R, -145, 5);
  // plataformas que caen sobre el vacío entre edificios
  tip(-146.5, 'guia', 'caen');
  fallPlat(0, R, -149.2); fallPlat(0, R, -153.8);
  fragLine(0, R, -149.2, 0, R, -153.8, 3);
  floor(-156.4, -172, R + 0.8, -4.2, 4.2, 'azotea');
  crate('checkpoint', -2.4, R + 0.8, -159);
  bicho(0, R + 0.8, -164, 2.2); bicho(1.5, R + 0.8, -168, 1.2);
  crates('normal', 2.6, R + 0.8, -162, 1); crate('fragmentos', -2.6, R + 0.8, -167);
  fragLine(0, R + 0.8, -158, 0, R + 0.8, -170, 6);
  // hueco 3.4 m (74 %) con caída de 0.8
  fragArc(0, R + 0.8, -171.4, -176.2, 1.6, 5);
  floor(-175.4, -190, R, -4.2, 4.2, 'azotea');
  crate('rebote', -1.6, R, -180);
  // valla publicitaria alta con la página 2 (se llega con la caja de rebote)
  solid(-4.2, -1.8, R + 3.6, R + 4.0, -185.5, -182.5, 'metal', { oneWay: true });
  deco('valla', { x: -3, y: R + 4.0, z: -184 });
  page(2, -3, R + 4.0, -184, 'El Flujo', 'Energía que conecta todo el código del universo. Su manual de usuario se perdió en una actualización.');
  bicho(1.4, R, -186, 1.6);
  // puente de cajas de cristal sobre un hueco de 4 m: se pisan una vez cada una
  tip(-188, 'guia', 'puente_cristal');
  solid(-4.2, 4.2, -9, R - 7, -194, -190, 'azotea', { noShadow: true });
  crate('cristal', 0, R - 0.9, -191.4); crate('cristal', 0, R - 0.9, -193.0);
  floor(-194, -208, R, -4.2, 4.2, 'azotea');
  crates('normal', 0, R, -199, 3); crate('tnt', 2.6, R, -203); crate('normal', -2.6, R, -203);
  fragLine(0, R, -196, 0, R, -206, 5);
  // bajada al callejón (escalera)
  solid(-2, 2, 0, 3.6, -211, -208, 'metal');
  solid(-2, 2, 0, 1.8, -214, -211, 'metal');

  // =========================================================================
  // SECCIÓN 3 · PERSECUCIÓN DEL VACÍO (prueba: la cámara mira a DIP de frente)
  // =========================================================================
  floor(-214, -240, 0);
  checkpoint(0, 0, -216, 3);
  L.copias.push({ x: -2.2, y: 0, z: -219.5, got: false });
  L.spots.chaseStart = { z: -222 };
  fragLine(0, 0, -224, 0, 0, -238, 7);
  fragArc(0, 0, -239.4, -243.4, 1.6, 5);                   // hueco 2.8 m
  floor(-242.8, -262, 0);
  crates('normal', -2.4, 0, -248, 1); crate('fragmentos', 2.4, 0, -252);
  formateadora(0, 0, -256, 3.0, 2.6);
  // hueco lateral (media calle)
  floor(-262, -290, 0, 0, 4.2);
  floor(-262, -268, 0, -4.2, 0); floor(-271.2, -290, 0, -4.2, 0);
  fragLine(2.4, 0, -263, 2.4, 0, -272, 5);
  L.spots.sofaVuela = { z: -276 };
  fragArc(0, 0, -289.4, -293.8, 1.8, 5);                   // hueco 3.2 m
  floor(-293.2, -330, 0);
  formateadora(-1.2, 0, -300, 2.4, 2.2); formateadora(1.2, 0, -313, 2.4, 2.4);
  fragLine(0, 0, -296, 0, 0, -316, 9);
  checkpoint(0, 0, -294.5, 3);
  // bolsillo lateral arriesgado con la página 4
  solid(-6.6, -4.2, -6, 0, -308, -304, 'acera');
  solid(-7.2, -6.6, 0, 4, -308, -304, 'fachada');
  page(4, -5.6, 0, -306, 'Soldados de Compilación', 'Entrenados durante años para acertar. Los resultados del entrenamiento están pendientes.');
  crate('normal', -2.8, 0, -318); crate('normal', 2.8, 0, -318); crate('checkpoint', -2.8, 0, -324);
  L.spots.chaseEnd = { z: -326 };

  // =========================================================================
  // JEFE · INSPECTOR DE TRÁMITES (plaza de oficinas)
  // =========================================================================
  floor(-330, -362, 0, -10, 10, 'oficina');
  checkpoint(0, 0, -333, 4);
  solid(-10.5, -10, 0, 6, -362, -330, 'fachada'); solid(10, 10.5, 0, 6, -362, -330, 'fachada');
  solid(-10.5, 10.5, 0, 8, -363, -362, 'fachada');
  L.spots.arena = { x: 0, z: -347, gate: -331 };
  L.spots.inspector = { x: 0, z: -353 };
  L.towers = [
    { x: -4.5, z: -354, top: 2.0 }, { x: 4.5, z: -354, top: 2.0 }
  ];
  for (const t of L.towers) solid(t.x - 0.8, t.x + 0.8, 0, t.top, t.z - 0.8, t.z + 0.8, 'torre');
  // escaleras de carpetas que caen en la fase 2 (posición y cuántas apiladas)
  L.folderStairs = [
    [[-7.2, -348.4], [-7.2, -348.4], [-6.6, -351.2, 3]],
    [[7.2, -348.4], [7.2, -348.4], [6.6, -351.2, 3]]
  ];

  // Paredes laterales del corredor (fachadas) con huecos para el callejón y el bolsillo secreto
  const wall = (side, zBack, zFront, top = 7, base = -6) => side < 0
    ? solid(-6.5, -4.2, base, top, zFront, zBack, 'fachada', { wall: true })
    : solid(4.2, 6.5, base, top, zFront, zBack, 'fachada', { wall: true });
  wall(-1, 13.5, -104); wall(1, 13.5, -76); wall(1, -84, -104);
  wall(-1, -214, -304); wall(-1, -308, -330); wall(1, -214, -330);
  // pretiles en los tejados (no se suben sin saltar)
  for (const [zb, zf, top] of [[-111, -128, R], [-131, -146, R], [-156.4, -172, R + 0.8], [-175.4, -190, R], [-194, -208, R]]) {
    solid(-4.6, -4.2, top, top + 0.7, zf, zb, 'pretil'); solid(4.2, 4.6, top, top + 0.7, zf, zb, 'pretil');
  }

  // Tramos de mundo para el decorado (edificios a los lados, altura del suelo)
  L.streets = [
    { z0: 8, z1: -104, y: 0 }, { z0: -104, z1: -214, y: R, roofs: true }, { z0: -214, z1: -330, y: 0 }
  ];
  return L;
}

// Textos de la Guía (cortos, con chiste) según el control activo
export const TIPS = {
  mover: { k: 'Muévete con las flechas o WASD.', t: 'Muévete con el pulgar izquierdo.' },
  saltar: { k: 'Espacio salta. Mantén para saltar más alto.', t: 'Saltar. Mantén para saltar más alto.' },
  girar: { k: 'X gira. Rompe cajas y despeina enemigos.', t: 'Girar: rompe cajas y despeina enemigos.' },
  rebote: { k: 'Caja de rebote. Hace exactamente lo que crees.', t: 'Caja de rebote. Hace exactamente lo que crees.' },
  hueco: { k: 'Esto es un hueco. Recomendación: no caer.', t: 'Esto es un hueco. Recomendación: no caer.' },
  cristal: { k: 'Caja de cristal: aguanta un pisotón. Dos, no.', t: 'Caja de cristal: aguanta un pisotón. Dos, no.' },
  formateadora: { k: 'Formateadora. No se rompe. Tú sí.', t: 'Formateadora. No se rompe. Tú sí.' },
  tnt: { k: 'Esta caja es inofensiva. Actualización: esta caja explota.', t: 'Esta caja es inofensiva. Actualización: esta caja explota.' },
  caen: { k: 'Plataformas de oficina. Se caen si te quedas.', t: 'Plataformas de oficina. Se caen si te quedas.' },
  puente_cristal: { k: 'Puente de cristal. Un pisotón por caja. Ni uno más.', t: 'Puente de cristal. Un pisotón por caja. Ni uno más.' }
};
