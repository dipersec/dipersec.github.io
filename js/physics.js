// physics.js — Físicas con vectores (pos, vel) + colisiones AABB resueltas por ejes separados.
// Unidades: píxeles del sprite (DIP mide 86 px) y segundos. El eje y crece hacia abajo.
export const GRAVITY = 1500;       // px/s²
export const MAX_FALL_SPEED = 900; // px/s
export const JUMP_SPEED = 600;     // px/s  → salto de ~120 px
export const JUMP_CUT = 220;       // soltar el salto antes corta la subida
export const WALK_SPEED = 120;     // px/s
export const RUN_SPEED = 220;      // px/s
export const PUSH_SPEED = 60;      // px/s
export const GROUND_ACCEL = 1300;  // px/s²
export const AIR_ACCEL = 900;      // px/s²

// a: entidad { pos:{x,y}, w, h } · b: sólido { x, y, w, h }
export const aabb = (a, b) => a.pos.x < b.x + b.w && a.pos.x + a.w > b.x && a.pos.y < b.y + b.h && a.pos.y + a.h > b.y;
export const overlapRect = (ax, ay, aw, ah, b) => ax < b.x + b.w && ax + aw > b.x && ay < b.y + b.h && ay + ah > b.y;
const on = (s) => s.active !== false;

// Mueve la entidad y la saca de los sólidos: primero X, luego Y.
// e.self: sólido propio que se ignora (rocas empujables). Devuelve el sólido contra el que chocó en X.
export function moveAndCollide(e, solids, dt) {
  e.hitWall = 0; e.wallRef = null;
  e.pos.x += e.vel.x * dt;
  for (const s of solids) {
    if (!on(s) || s.oneWay || s === e.self || !aabb(e, s)) continue;
    const dir = e.vel.x !== 0 ? Math.sign(e.vel.x) : (e.pos.x + e.w / 2 < s.x + s.w / 2 ? 1 : -1);
    if (dir > 0) e.pos.x = s.x - e.w; else e.pos.x = s.x + s.w;
    e.hitWall = dir; e.wallRef = s; e.vel.x = 0;
  }
  const prevBottom = e.pos.y + e.h;
  e.pos.y += e.vel.y * dt;
  e.onGround = false; e.ground = null;
  for (const s of solids) {
    if (!on(s) || s === e.self) continue;
    if (s.oneWay) {
      if (e.vel.y >= 0 && prevBottom <= s.y + 1 && aabb(e, s)) { e.pos.y = s.y - e.h; e.vel.y = 0; e.onGround = true; e.ground = s; }
      continue;
    }
    if (!aabb(e, s)) continue;
    if (e.vel.y > 0 || prevBottom <= s.y + 1) { e.pos.y = s.y - e.h; e.onGround = true; e.ground = s; }
    else e.pos.y = s.y + s.h;
    e.vel.y = 0;
  }
}

// Altura del suelo justo debajo de un punto (para la sombra). Devuelve null si no hay.
export function groundBelow(x, y, solids, maxDist = 600) {
  let best = null;
  for (const s of solids) {
    if (!on(s) || x < s.x || x > s.x + s.w || s.y < y - 2 || s.y > y + maxDist) continue;
    if (best === null || s.y < best) best = s.y;
  }
  return best;
}
