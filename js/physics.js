// physics.js — Colisiones AABB 3D propias, resueltas por ejes (X, Z y luego Y).
// Un sólido es { x0, x1, y0, y1, z0, z1, active }. Una entidad tiene pos (pies, al centro), vel, hw, hd, h.
const EPS = 1e-4;
const on = (s) => s.active !== false;

export function overlaps(e, s, px = e.pos.x, py = e.pos.y, pz = e.pos.z) {
  return px - e.hw < s.x1 - EPS && px + e.hw > s.x0 + EPS &&
         pz - e.hd < s.z1 - EPS && pz + e.hd > s.z0 + EPS &&
         py < s.y1 - EPS && py + e.h > s.y0 + EPS;
}
export const boxHit = (ax0, ax1, ay0, ay1, az0, az1, s) => ax0 < s.x1 && ax1 > s.x0 && ay0 < s.y1 && ay1 > s.y0 && az0 < s.z1 && az1 > s.z0;

// stepHeight: escalones bajos se suben solos estando en el suelo.
export function moveAndCollide(e, solids, dt, stepHeight = 0) {
  e.hitWall = null;
  const horiz = (axis) => {
    const v = axis === 'x' ? e.vel.x : e.vel.z;
    if (v === 0) return;
    e.pos[axis] += v * dt;
    for (const s of solids) {
      if (!on(s) || s.oneWay || s === e.self || !overlaps(e, s)) continue;
      // escalón: si el borde superior está a poca altura y estamos en el suelo, subirlo
      if (e.onGround && s.y1 - e.pos.y <= stepHeight && !solids.some(o => o !== s && on(o) && !o.oneWay && overlaps(e, o, e.pos.x, s.y1 + 0.01, e.pos.z))) {
        e.pos.y = s.y1; continue;
      }
      if (axis === 'x') e.pos.x = v > 0 ? s.x0 - e.hw : s.x1 + e.hw;
      else e.pos.z = v > 0 ? s.z0 - e.hd : s.z1 + e.hd;
      if (axis === 'x') e.vel.x = 0; else e.vel.z = 0;
      e.hitWall = s;
    }
  };
  horiz('x'); horiz('z');
  const prevY = e.pos.y;
  e.pos.y += e.vel.y * dt;
  e.onGround = false; e.ground = null; e.ceiling = null;
  const inv = e.gdir === -1;   // gravedad invertida: el "suelo" es la cara de abajo de los sólidos
  for (const s of solids) {
    if (!on(s) || s === e.self) continue;
    if (s.oneWay) {
      if (!inv && e.vel.y <= 0 && prevY >= s.y1 - 0.02 && overlaps(e, s)) { e.pos.y = s.y1; e.vel.y = 0; e.onGround = true; e.ground = s; }
      continue;
    }
    if (!overlaps(e, s)) continue;
    if (!inv) {
      if (e.vel.y <= 0 && prevY >= s.y1 - 0.05) { e.pos.y = s.y1; e.onGround = true; e.ground = s; e.landVel = e.vel.y; }
      else if (e.vel.y > 0) { e.pos.y = s.y0 - e.h; e.ceiling = s; }
      else { e.pos.y = s.y1; e.onGround = true; e.ground = s; }
    } else {
      if (e.vel.y >= 0 && prevY + e.h <= s.y0 + 0.05) { e.pos.y = s.y0 - e.h; e.onGround = true; e.ground = s; e.landVel = e.vel.y; }
      else if (e.vel.y < 0) { e.pos.y = s.y1; e.ceiling = s; }
      else { e.pos.y = s.y0 - e.h; e.onGround = true; e.ground = s; }
    }
    e.vel.y = 0;
  }
}

// Altura del suelo justo debajo de un punto (para la sombra que siempre marca dónde vas a caer).
export function groundBelow(x, y, z, solids, r = 0.2) {
  let best = -Infinity;
  for (const s of solids) {
    if (!on(s) || s.noShadow || x + r < s.x0 || x - r > s.x1 || z + r < s.z0 || z - r > s.z1 || s.y1 > y + 0.05) continue;
    if (s.y1 > best) best = s.y1;
  }
  return best === -Infinity ? null : best;
}

// Superficie justo encima (para la sombra cuando la gravedad está invertida).
export function groundAbove(x, y, z, solids, r = 0.2) {
  let best = Infinity;
  for (const s of solids) {
    if (!on(s) || s.noShadow || x + r < s.x0 || x - r > s.x1 || z + r < s.z0 || z - r > s.z1 || s.y0 < y - 0.05) continue;
    if (s.y0 < best) best = s.y0;
  }
  return best === Infinity ? null : best;
}
