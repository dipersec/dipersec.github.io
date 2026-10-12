// level.js — Nivel 1: Nácar, el planeta de la caída. Versión compacta del recorrido completo.
// Coordenadas en px del sprite (DIP mide 86 px). El eje y crece hacia abajo; un sólido {x,y,w,h}
// tiene su cara superior en y. El plano de juego es z = 0; la profundidad solo es visual.
//
// Secciones (cada una es un tramo del mismo mundo, separadas por transiciones):
//   0 superficie  · zonas 1-3: cráter, camino de huellas + jardín de Tilo, ruinas incompletas
//   1 santuario   · zona 4: el santuario del eco
//   2 estación    · zona 5: la estación de llegada
//   3 huida       · salida de emergencia

export function buildLevel() {
  const L = {
    solids: [], decor: [], rocks: [], plates: [], phases: [], anchors: [], pylons: [], fragments: [],
    sentinels: [], doors: [], checkpoints: [], beetles: [], footprints: [], interact: [], triggers: [],
    zones: [], sections: [], spots: {}
  };
  const solid = (x, y, w, h, mat = 'costra', o = {}) => {
    const s = { x, y, w, h, mat, active: true, zf: 40, zb: -70, ...o };
    L.solids.push(s); return s;
  };
  const ground = (x, y, w, mat = 'costra', o = {}) => solid(x, y, w, 520, mat, { zb: -760, ...o });
  const interior = (x, y, w, mat, o = {}) => solid(x, y, w, 420, mat, { zb: -150, ...o });
  const deco = (type, x, y, z = 0, o = {}) => { const d = { type, x, y, z, ...o }; L.decor.push(d); return d; };
  const plate = (x, y, o = {}) => { const s = solid(x, y, 66, 16, o.mat || 'placa', { zb: -50, plate: true }); L.plates.push({ s, x, y, t: 0, state: 'firme', respawn: o.respawn ?? 3 }); };
  const phase = (x, y, w, offset, cycle, mat) => { const s = solid(x, y, w, 14, mat, { zb: -40, phase: true }); L.phases.push({ s, offset, cycle }); };
  const checkpoint = (x, y, sec) => L.checkpoints.push({ x, y, sec, on: false });
  const fragment = (x0, x1, y, speed = 70) => L.fragments.push({ x0, x1, y, x: x0, dir: 1, speed, w: 18, h: 18 });
  const sentinel = (x, y, zone, sec) => {
    const s = solid(x, y - 70, 60, 70, 'metal', { zb: -40 });
    L.sentinels.push({ s, x: x + 30, y: y - 50, zone, sec, state: 'dormido', t: 0, cool: 0 });
  };

  // ---------- Secciones y zonas ----------
  L.sections = [
    { id: 'superficie', x0: -260, x1: 4980, yMin: -1000, yMax: 130, killY: 380, env: 'exterior' },
    { id: 'santuario', x0: 5880, x1: 7780, yMin: -560, yMax: 90, killY: 300, env: 'interior' },
    { id: 'estacion', x0: 8980, x1: 10980, yMin: -400, yMax: 90, killY: 300, env: 'interior' },
    { id: 'huida', x0: 11880, x1: 13840, yMin: -400, yMax: 90, killY: 300, env: 'interior' }
  ];
  L.zones = [
    { n: 1, sec: 0, x0: -260, x1: 990, name: 'El cráter del impacto', env: 'crater' },
    { n: 2, sec: 0, x0: 990, x1: 2900, name: 'El jardín de Tilo', env: 'llanura' },
    { n: 3, sec: 0, x0: 2900, x1: 4980, name: 'Las ruinas incompletas', env: 'velo' },
    { n: 4, sec: 1, x0: 5880, x1: 7780, name: 'El santuario del eco', env: 'santuario' },
    { n: 5, sec: 2, x0: 8980, x1: 10980, name: 'La estación de llegada', env: 'estacion' },
    { n: 6, sec: 3, x0: 11880, x1: 13840, name: 'Salida de emergencia', env: 'huida' }
  ];

  // =====================================================================
  // ZONA 1 · EL CRÁTER DEL IMPACTO (seguro, para experimentar)
  // =====================================================================
  solid(-470, -640, 350, 1060, 'roca', { zb: -760 });        // pared del cráter
  ground(-120, 0, 540);                                       // fondo del cráter
  ground(420, 70, 60);                                        // hoyo pequeño (se sale saltando)
  ground(480, 0, 300);
  ground(780, -50, 100);                                      // escalones de salida
  ground(880, -95, 100);
  ground(980, -140, 820);                                     // llanura 980..1800
  // Secreto 1: astilla de vidrio flotante frente a una pared con una huella vertical
  solid(700, -150, 56, 16, 'vidrio', { oneWay: true, zb: -30 });
  solid(615, -250, 64, 30, 'vidrio', { zb: -40 });
  deco('muro_huella', 650, -250, -60);
  L.spots.capsula = { x: 210, y: 0 };
  L.spots.cristalCrater = { x: 345, y: 0 };
  deco('capsula', 210, 0, 0);
  deco('crater', 330, 0, 0);
  checkpoint(130, 0, 0);
  deco('aguja', -60, 0, -160, { h: 170 }); deco('aguja', 560, 0, -220, { h: 240 }); deco('aguja', 900, -95, -300, { h: 200 });
  deco('roca', 40, 0, -120, { r: 40 }); deco('roca', 640, 0, -90, { r: 26 }); deco('roca', 1100, -140, -200, { r: 50 });
  deco('musgo', 600, 0, -40); deco('musgo', 840, -50, -30);

  // =====================================================================
  // ZONA 2 · CAMINO DE HUELLAS + JARDÍN DE TILO
  // =====================================================================
  for (let i = 0; i < 8; i++) L.footprints.push({ x: 1040 + i * 42, y: -140, side: i % 2, kind: 'a' });
  for (let i = 0; i < 6; i++) L.footprints.push({ x: 1460 + i * 42, y: -140, side: i % 2, kind: 'b' });
  L.footprints.push({ x: 1880, y: -220, side: 0, kind: 'fantasma' });
  deco('losa', 1250, -140, -46, { w: 150, h: 190 });         // vidrio negro que refleja tarde
  L.spots.espejo = { x0: 1175, x1: 1325, y0: -330, y1: -140, z: -45 };
  deco('aguja', 1380, -140, -80, { h: 130 }); deco('aguja', 1420, -140, -140, { h: 220 }); deco('aguja', 1700, -140, -110, { h: 150 });
  deco('cristal', 1560, -140, -70, { s: 0.8 });
  for (const bx of [1150, 1520, 2060, 2600]) L.beetles.push({ hx: bx, x: bx, y: bx < 1800 ? -140 : -220, dir: 1, state: 'pasea', t: Math.random() * 3, hidden: 0 });

  // Desnivel y jardín
  ground(1800, -220, 400);                                    // 1800..2200
  ground(2200, -170, 70);                                     // hueco A (para la roca)
  ground(2270, -220, 430);                                    // 2270..2700
  ground(2700, -170, 70);                                     // hueco B
  ground(2770, -220, 380);                                    // 2770..3150
  checkpoint(1850, -220, 0);
  L.rocks.push(mkRock(solid, 2300, -220, 2200, 2270));
  L.rocks.push(mkRock(solid, 2540, -220, 2700, 2770));
  const collector = solid(2400, -290, 90, 70, 'metal', { zb: -50 });
  L.spots.recolector = { x: 2445, y: -220, s: collector };
  deco('recolector', 2445, -220, 0);
  // Campamento de Tilo
  deco('carpa', 1955, -220, -30);
  solid(1905, -300, 100, 12, 'tela', { oneWay: true, zb: -60, invisible: true });
  solid(2040, -385, 62, 22, 'roca', { oneWay: true, zb: -50 });
  solid(2112, -466, 200, 40, 'roca', { zb: -90 });            // meseta escondida (secreto 4)
  deco('jardin_viejo', 2210, -466, -40);
  for (const px of [1830, 2120, 2330, 2600, 2650]) deco('planta', px, -220, -60 - (px % 3) * 30);
  deco('danio', 1880, -220, -40);
  deco('roca', 2160, -220, -220, { r: 60 }); deco('aguja', 2620, -220, -300, { h: 260 }); deco('musgo', 2050, -220, -50);
  L.spots.tilo = { x: 2160, y: -220 };
  L.spots.campamento = { x: 2010, y: -220 };
  // Compuerta hacia las ruinas (Tilo la abre)
  const gate = solid(2880, -460, 40, 240, 'piedra', { zb: -50 });
  L.doors.push({ id: 'compuerta', s: gate, open: false, t: 0, mode: 'baja' });
  deco('marco', 2900, -220, 0);

  // =====================================================================
  // ZONA 3 · LAS RUINAS INCOMPLETAS (velo mineral)
  // =====================================================================
  checkpoint(3010, -220, 0);
  ground(3150, -110, 200, 'costra');                          // foso seguro bajo las placas
  plate(3150, -220); plate(3217, -220); plate(3284, -220);
  ground(3350, -220, 210, 'piedra');                          // 3350..3560
  fragment(4170, 4290, -220, 60);
  L.pylons.push({ id: 1, x: 3420, y: -220, on: false });
  L.spots.cristalRuina = { x: 3520, y: -220 };
  deco('vidrio_cristal', 3520, -220, -20);
  // Puente imposible: ambos extremos, sin la sección central
  const puente = solid(3560, -220, 220, 22, 'piedra', { zb: -50, active: false });
  L.anchors.push({ id: 'puente', solids: [puente], x: 3670, y: -230, sec: 0, state: 'latente', t: 0 });
  deco('extremo_puente', 3560, -220, 0, { dir: 1 }); deco('extremo_puente', 3780, -220, 0, { dir: -1 });
  ground(3780, -220, 1200, 'piedra');                         // 3780..4980
  checkpoint(3810, -220, 0);
  L.spots.inscripcion = { x: 3850, y: -220 };
  deco('inscripcion', 3850, -220, -30);
  // Escalera que termina en el aire (el recuerdo la completa)
  solid(3900, -260, 40, 40, 'piedra', { zb: -60 });
  solid(3940, -300, 40, 80, 'piedra', { zb: -60 });
  solid(3980, -340, 40, 120, 'piedra', { zb: -60 });
  solid(4020, -380, 40, 160, 'piedra', { zb: -60 });
  const e1 = solid(4060, -420, 40, 200, 'piedra', { zb: -60, active: false });
  const e2 = solid(4100, -460, 40, 240, 'piedra', { zb: -60, active: false });
  L.anchors.push({ id: 'escalera', solids: [e1, e2], x: 4100, y: -440, sec: 0, state: 'latente', t: 0 });
  solid(4160, -520, 130, 24, 'vidrio', { zb: -60 });
  L.pylons.push({ id: 2, x: 4225, y: -520, on: false });
  // Centinela dormido con ruta alternativa por arriba
  sentinel(4500, -220, { x: 4330, y: -310, w: 380, h: 92 }, 0);
  solid(4300, -322, 70, 14, 'vidrio', { oneWay: true, zb: -40 });
  solid(4410, -392, 80, 14, 'vidrio', { oneWay: true, zb: -40 });
  solid(4545, -392, 80, 14, 'vidrio', { oneWay: true, zb: -40 });
  solid(4665, -322, 70, 14, 'vidrio', { oneWay: true, zb: -40 });
  L.pylons.push({ id: 3, x: 4790, y: -220, on: false });
  const portal = solid(4860, -560, 60, 340, 'piedra', { zb: -80 });
  L.doors.push({ id: 'portal', s: portal, open: false, t: 0, mode: 'baja' });
  deco('portal', 4890, -220, 0);
  solid(4980, -1000, 160, 1400, 'roca', { zb: -760 });
  // Decorado de ruinas imposibles
  deco('estatua', 3060, -220, -150, { sombra: 'brazo' }); deco('estatua', 4380, -220, -190, { sombra: 'doble' });
  deco('puerta_muro', 3260, -220, -240); deco('arco_flotante', 3670, -220, -300);
  deco('columna', 3400, -220, -140, { h: 150 }); deco('columna', 3990, -220, -240, { h: 230 }); deco('columna', 4600, -220, -160, { h: 120 });
  deco('escalera_aire', 3200, -220, -420); deco('puente_roto', 4250, -220, -520);
  deco('lirio', 3380, -220, -40); deco('lirio', 3820, -220, -50); deco('lirio', 4700, -220, -40);
  deco('musgo', 3540, -220, -30); deco('musgo', 4150, -220, -40); deco('cristal', 3990, -220, -90, { s: 1 });
  deco('aguja', 3120, -220, -300, { h: 280 }); deco('aguja', 4700, -220, -320, { h: 300 });

  // Fantasmas de la versión completa del planeta (visión del santuario)
  L.ghosts = [
    { x: 3560, y: -242, w: 220, h: 22, z: 0, d: 80 }, { x: 4060, y: -420, w: 80, h: 200, z: 0, d: 80 },
    { x: 3600, y: -520, w: 140, h: 300, z: -300, d: 60 }, { x: 3200, y: -460, w: 150, h: 240, z: -240, d: 60 },
    { x: 4230, y: -420, w: 300, h: 200, z: -520, d: 80 }, { x: 3940, y: -560, w: 100, h: 330, z: -240, d: 60 },
    { x: 3360, y: -600, w: 90, h: 380, z: -140, d: 60 }, { x: 4560, y: -600, w: 90, h: 380, z: -160, d: 60 }
  ];

  // =====================================================================
  // ZONA 4 · EL SANTUARIO DEL ECO (interior semienterrado)
  // =====================================================================
  solid(5860, -800, 140, 1200, 'santuario', { zb: -150 });
  interior(6000, 0, 300, 'santuario');
  checkpoint(6060, 0, 1);
  L.spots.cristalMudo = { x: 6200, y: 0 };
  deco('cristal_mudo', 6200, 0, -40);
  phase(6320, -30, 60, 0, 2.4, 'eco'); phase(6410, -30, 60, 0.5, 2.4, 'eco');
  interior(6500, 0, 1260, 'santuario');
  checkpoint(6540, 0, 1);
  solid(6520, -70, 50, 70, 'santuario', { zb: -60 });
  solid(6570, -160, 130, 22, 'santuario', { zb: -60 });
  L.anchors.push({ id: 'anillo1', solids: [], x: 6640, y: -190, sec: 1, state: 'latente', t: 0, ring: 0 });
  plate(6720, -245, { mat: 'placa_eco', respawn: 2.2 });
  solid(6800, -330, 140, 22, 'santuario', { zb: -60 });
  L.anchors.push({ id: 'anillo2', solids: [], x: 6870, y: -360, sec: 1, state: 'latente', t: 0, ring: 1 });
  L.spots.dispositivo = { x: 6870, y: -250 };
  deco('dispositivo', 6870, -250, -110);
  fragment(7010, 7190, 0, 80);
  sentinel(7280, 0, { x: 7140, y: -90, w: 300, h: 92 }, 1);
  solid(7140, -100, 70, 14, 'santuario', { oneWay: true, zb: -40 });
  solid(7250, -170, 80, 14, 'santuario', { oneWay: true, zb: -40 });
  solid(7385, -170, 80, 14, 'santuario', { oneWay: true, zb: -40 });
  solid(7520, -120, 110, 22, 'santuario', { zb: -60 });
  L.anchors.push({ id: 'anillo3', solids: [], x: 7575, y: -150, sec: 1, state: 'latente', t: 0, ring: 2 });
  const camara = solid(7660, -560, 40, 560, 'santuario', { zb: -80 });
  L.doors.push({ id: 'camara', s: camara, open: false, t: 0, mode: 'sube' });
  L.spots.ascensor = { x: 7720, y: 0 };
  deco('ascensor', 7720, 0, -20);
  solid(7780, -800, 140, 1200, 'santuario', { zb: -150 });
  solid(5860, -700, 1920, 140, 'santuario', { zb: -150, techo: true });
  deco('fondo', 6820, 0, -150, { w: 2000, h: 700, tipo: 'santuario' });

  // =====================================================================
  // ZONA 5 · LA ESTACIÓN DE LLEGADA
  // =====================================================================
  solid(8860, -700, 140, 1100, 'estacion', { zb: -150 });
  interior(9000, 0, 1980, 'estacion');
  solid(9000, -560, 1980, 160, 'estacion', { zb: -150, techo: true });
  checkpoint(9060, 0, 2);
  L.spots.llegadaEstacion = { x: 9060, y: 0 };
  L.spots.terminal1 = { x: 9220, y: 0 };
  deco('terminal', 9220, 0, -30);
  const d1 = solid(9420, -400, 30, 400, 'puerta', { zb: -40 });
  L.doors.push({ id: 'd1', s: d1, open: false, t: 0, mode: 'sube' });
  fragment(9480, 9610, 0, 70);
  solid(9625, -60, 50, 60, 'metal', { zb: -50 });
  solid(9690, -165, 110, 14, 'metal', { oneWay: true, zb: -50 });
  L.spots.terminal2 = { x: 9745, y: -165 };
  deco('terminal', 9745, -165, -30, { s: 0.8 });
  deco('pantalla', 9560, -250, -130, { img: 'nacar' }); deco('pantalla', 9850, -250, -130, { img: 'sistema' });
  solid(9845, -80, 55, 80, 'metal', { zb: -50 });
  solid(9905, -170, 45, 14, 'metal', { oneWay: true, zb: -40 });
  const d2 = solid(9960, -260, 30, 260, 'puerta', { zb: -40 });
  L.doors.push({ id: 'd2', s: d2, open: true, t: 1, mode: 'sube' });
  checkpoint(10010, 0, 2);
  L.spots.consola = { x: 10130, y: 0 };
  deco('consola', 10130, 0, -40);
  phase(10200, -90, 60, 0, 2.2, 'luz'); phase(10285, -180, 60, 0.5, 2.2, 'luz');
  solid(10370, -270, 90, 16, 'metal', { zb: -50 });
  L.spots.energia = { x: 10415, y: -270 };
  const d3 = solid(10520, -400, 30, 400, 'puerta', { zb: -40 });
  L.doors.push({ id: 'd3', s: d3, open: false, t: 0, mode: 'sube' });
  L.spots.nucleo = { x: 10700, y: 0 };
  deco('nucleo', 10790, -210, -70);
  deco('consola', 10690, 0, -40, { s: 0.8 });
  solid(10980, -700, 140, 1100, 'estacion', { zb: -150 });
  deco('fondo', 9990, 0, -150, { w: 2100, h: 600, tipo: 'estacion' });

  // =====================================================================
  // HUIDA · la estación se vuelve inestable
  // =====================================================================
  solid(11760, -700, 140, 1100, 'estacion', { zb: -150 });
  interior(11900, 0, 400, 'estacion');
  solid(11900, -560, 1940, 160, 'estacion', { zb: -150, techo: true });
  checkpoint(11960, 0, 3);
  L.spots.inicioHuida = { x: 11960, y: 0 };
  phase(12330, -30, 60, 0, 1.8, 'luz'); phase(12415, -30, 60, 0.5, 1.8, 'luz');
  interior(12500, 0, 450, 'estacion');
  const ds = solid(12620, -400, 30, 400, 'puerta', { zb: -40 });
  L.doors.push({ id: 'cambiante', s: ds, open: false, t: 0, mode: 'salta', xs: [12620, 12790], period: 1.5, k: 0 });
  const puente2 = solid(12950, 0, 220, 22, 'estacion', { zb: -50, active: false });
  L.anchors.push({ id: 'puente2', solids: [puente2], x: 13060, y: -10, sec: 3, state: 'latente', t: 0 });
  interior(13170, 0, 250, 'estacion');
  checkpoint(13200, 0, 3);
  fragment(13230, 13390, 0, 95);
  plate(13420, 0, { mat: 'placa_metal', respawn: 2.4 }); plate(13487, 0, { mat: 'placa_metal', respawn: 2.4 }); plate(13554, 0, { mat: 'placa_metal', respawn: 2.4 });
  interior(13620, 0, 220, 'estacion');
  L.spots.salida = { x: 13740, y: 0 };
  deco('salida', 13740, 0, -30);
  solid(13840, -700, 140, 1100, 'estacion', { zb: -150 });
  deco('fondo', 12860, 0, -150, { w: 2100, h: 600, tipo: 'huida' });

  return L;
}

function mkRock(solid, x, y, slot0, slot1) {
  const s = solid(x, y - 50, 50, 50, 'roca', { pushable: true, zb: -10, zf: 36 });
  const r = { s, pos: { x, y: y - 50 }, vel: { x: 0, y: 0 }, w: 50, h: 50, self: s, push: 0, slot0, slot1, inSlot: false, onGround: true };
  s.ent = r;
  return r;
}
