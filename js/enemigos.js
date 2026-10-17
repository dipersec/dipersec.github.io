// enemigos.js — Amenazas reutilizables, configuradas por parámetros desde los datos del nivel.
// Cada una tiene estados legibles: patrullar → detectar (aviso visual y sonoro) → atacar → recuperarse → recibir daño.
import { STATE, bounce, setState } from './player.js';
import { overlaps } from './physics.js';
import { CONFIG } from './config.js';

const tocaArriba = (p, top) => p.vel.y < -1 && p.pos.y > top - 0.45;

// ---------- escarabajos: pasivos, ladrones o comunes ----------
export function updateBichos(g, dt) {
  const p = g.player;
  for (const b of g.L.bichos) {
    if (!b.alive) continue;
    b.t += dt; b.cd = Math.max(0, (b.cd || 0) - dt);
    if (b.launched) {
      b.vy -= 20 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.spinA = (b.spinA || 0) + dt * 18;
      if (b.t > 1.4) b.alive = false;
      continue;
    }
    if (g.chase.on && b.z > g.chase.z) continue;
    let speed = b.speed || 1.4;
    const dx = p.pos.x - b.x, dz = p.pos.z - b.z, d = Math.hypot(dx, dz);
    // los ladrones huyen de DIP (hasta que los acorralas contra el borde de su zona)
    if (b.ladron && !p.hidden && d < 3.6) { b.dir = dx > 0 ? -1 : 1; speed *= 1.35; }
    if (b.huye > 0) { b.huye -= dt; speed *= 1.6; }
    const k = b.axis === 'x' ? 'x' : 'z', home = b.axis === 'x' ? b.hx : b.hz;
    b[k] += b.dir * speed * dt;
    if (Math.abs(b[k] - home) > b.range) { b[k] = home + Math.sign(b[k] - home) * b.range; b.dir *= -1; }
    b.glitch = Math.max(0, b.glitch - dt);
    // saltadores del vacío: brincan cada cierto tiempo (se ve venir: se agachan antes)
    if (b.salta) {
      if (b.hy === undefined) b.hy = b.y;
      b.vy = (b.vy || 0) - 20 * dt; b.y += b.vy * dt;
      if (b.y <= b.hy) { b.y = b.hy; b.vy = 0; b.hopT = (b.hopT || 0) + dt; if (b.hopT > b.salta) { b.hopT = 0; b.vy = 7.5; } }
    }
    if (b.t > 1.1 + Math.random() * 0.4) { b.t = 0; b.glitch = 0.12; }
    if (b.lleva) { const pz = g.L.piezas.find(q => q.carrier === b); if (pz) { pz.x = b.x; pz.y = b.y + 0.7; pz.z = b.z; } }
    if (p.hidden || p.state === STATE.DEAD) continue;
    if (Math.abs(dx) < 0.62 && Math.abs(dz) < 0.62 && p.pos.y < b.y + 0.8 && p.pos.y + p.h > b.y) {
      if (p.vel.y < -1 && p.pos.y > b.y + 0.25) { killBicho(g, b, p.pos.x, p.pos.z); bounce(p, g.input.jumpHeld ? 1.05 : CONFIG.bounceMult); }
      else if (p.spin > 0) continue;
      else if (b.pasivo || b.lleva) {
        // no muerden: solo empujan un poco
        if (b.cd <= 0) { b.cd = 0.5; g.sound.sfx('cri'); }
        p.vel.x += Math.sign(dx || 1) * 3; p.vel.z += Math.sign(dz || 1) * 1.5;
      } else if (b.ladron) {
        if (b.cd <= 0) {
          b.cd = 1.2;
          const n = Math.min(5, g.fragments);
          if (n > 0) {
            g.fragments -= n; b.robado = (b.robado || 0) + n; b.huye = 2.2; g.sound.sfx('robo');
            g.burst(p.pos.x, p.pos.y + 1, p.pos.z, 8, [1, 0.85, 0.4], { speed: 3, life: 0.4 });
            if (!g.flags.avisoRobo) { g.flags.avisoRobo = true; g.say(g.flags.tilo ? 'tilo' : 'dip', g.flags.tilo ? '¡Ladrón! Salta encima y te devuelve todo. Con intereses.' : '¡Eh! ¡Eso era mío!', 2.6); }
          }
          p.vel.x += Math.sign(dx || 1) * 3;
        }
      } else g.hurt(b.x, b.z, 'bicho');
    }
  }
}
export function killBicho(g, b, fx, fz, launch = false) {
  g.sound.sfx('bicho'); g.hitStop = Math.max(g.hitStop, 0.05); g.addTrauma(0.15);
  g.burst(b.x, b.y + 0.3, b.z, 12, b.ladron ? [1, 0.8, 0.3] : [0.85, 0.75, 0.6], { speed: 4, life: 0.4, size: 1 });
  if (launch) {
    const dx = b.x - fx, dz = b.z - fz, d = Math.hypot(dx, dz) || 1;
    b.launched = true; b.t = 0; b.vx = dx / d * 12; b.vz = dz / d * 12 - 4; b.vy = 7;
  } else b.alive = false;
  const n = 1 + (b.robado || 0) + (b.ladron ? 2 : 0); b.robado = 0;
  for (let i = 0; i < n; i++) g.giveFrag(b.x, b.y + 0.5, b.z);
  if (b.lleva) {
    const pz = g.L.piezas.find(q => q.carrier === b);
    if (pz) { pz.carrier = null; pz.free = true; pz.x = Math.max(-8, Math.min(8, b.x)); pz.y = 0; pz.z = b.z; pz.pop = 0; g.sound.sfx('pieza_suelta'); }
    b.lleva = null;
  }
}

// ---------- barredores: fragmentos móviles y recolectoras (no se rompen) ----------
export function updateBarredores(g, dt) {
  const p = g.player;
  for (const f of g.L.formas) {
    if (!f.alive) continue;
    f.t += dt;
    if (g.chase.on && f.z > g.chase.z) continue;
    f.x += f.dir * f.speed * dt;
    if (Math.abs(f.x - f.hx) > f.range) { f.x = f.hx + Math.sign(f.x - f.hx) * f.range; f.dir *= -1; }
    if (p.hidden || p.state === STATE.DEAD) continue;
    if (Math.abs(p.pos.x - f.x) < 1.05 && Math.abs(p.pos.z - f.z) < 0.95 && p.pos.y < f.y + 1.1) {
      if (p.vel.y < -1 && p.pos.y > f.y + 0.7) { bounce(p, 0.9); g.sound.sfx('clang'); }
      else g.hurt(f.x, f.z, f.kind);
    }
  }
}

// ---------- centinelas (de suelo y drones) ----------
export function updateCentinelas(g, dt) {
  const p = g.player, vivo = !p.hidden && p.state !== STATE.DEAD;
  for (const c of g.L.centinelas) {
    if (!c.alive) continue;
    if (c.launched) { c.vy -= 20 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.spinA = (c.spinA || 0) + dt * 14; c.t += dt; if (c.t > 1.4) c.alive = false; continue; }
    if (g.chase.on && c.z > g.chase.z) continue;
    c.t += dt;
    const dron = c.tipo === 'dron', base = dron ? c.home - 2.2 : c.home;
    const dx = p.pos.x - c.x, dz = p.pos.z - c.z, d = Math.hypot(dx, dz), dy = p.pos.y - base;
    switch (c.state) {
      case 'dormido':
        if (vivo && d < 2.8 && Math.abs(dy) < 2) despertar(g, c);
        break;
      case 'patrulla': {
        c.x += c.dir * (c.vel || 1.3) * dt;
        if (Math.abs(c.x - c.hx) > c.rango) { c.x = c.hx + Math.sign(c.x - c.hx) * c.rango; c.dir *= -1; }
        c.face = c.dir;
        // vuelve a su altura de patrulla (los drones suben tras recuperarse)
        if (dron) c.y += (c.home - c.y) * (1 - Math.exp(-dt * 3));
        if (!c.simple && vivo && d < (dron ? 5.2 : 5.6) && Math.abs(dy) < 2.2 && c.t > 0.6) despertar(g, c);
        break;
      }
      case 'detecta':
        c.face = Math.sign(dx) || c.face;
        if (c.t > (dron ? 0.75 : 0.65)) {
          c.state = 'ataca'; c.t = 0; g.sound.sfx(dron ? 'picada' : 'embestida');
          const lead = 0.25;
          c.tx = Math.max(-3.8, Math.min(3.8, p.pos.x + p.vel.x * lead)); c.tz = p.pos.z + p.vel.z * lead;
          c.sx = c.x; c.sz = c.z; c.sy = c.y;
          const L = Math.hypot(c.tx - c.x, c.tz - c.z) || 1;
          if (!dron && L > 5.5) { c.tx = c.x + (c.tx - c.x) / L * 5.5; c.tz = c.z + (c.tz - c.z) / L * 5.5; }
        }
        break;
      case 'ataca': {
        const dur = dron ? 0.6 : 0.55, k = Math.min(1, c.t / dur), e = dron ? k : 1 - (1 - k) * (1 - k);
        c.x = c.sx + (c.tx - c.sx) * e; c.z = c.sz + (c.tz - c.sz) * e;
        if (dron) c.y = c.sy + (base + 0.1 - c.sy) * (k * k);
        if (!dron && k < 1 && Math.random() < 0.6) g.burst(c.x, c.y + 0.1, c.z, 1, [0.8, 0.7, 0.6], { speed: 1.5, life: 0.4, up: 0.5 });
        if (k >= 1) { c.state = 'recupera'; c.t = 0; g.sound.sfx('golpe_suelo'); g.addTrauma(0.15); g.burst(c.x, c.y + 0.1, c.z, 10, [0.8, 0.75, 0.7], { speed: 3, life: 0.5, up: 1 }); }
        break;
      }
      case 'recupera':
        if (c.t > 1.7) { c.state = 'patrulla'; c.t = 0; c.hx = Math.max(-3.2, Math.min(3.2, c.x)); }
        break;
    }
    if (!vivo) continue;
    // contacto
    const top = c.y + (dron ? 0.7 : 1.35), bottom = dron ? c.y - 0.2 : c.y;
    if (Math.abs(dx) < 0.85 && Math.abs(dz) < 0.85 && p.pos.y < top && p.pos.y + p.h > bottom) {
      if (tocaArriba(p, top)) {
        if (c.state === 'recupera' || c.state === 'dormido') { matarCentinela(g, c, p.pos.x, p.pos.z, false); bounce(p, g.input.jumpHeld ? 1.05 : CONFIG.bounceMult); }
        else { bounce(p, 0.85); g.sound.sfx('clang'); c.cd = 0.3; }
      } else if (p.spin > 0) {
        // el giro solo lo derriba si está aturdido; si no, rebota en su coraza
        if (c.state === 'recupera' || c.state === 'dormido') matarCentinela(g, c, p.pos.x, p.pos.z, true);
      } else if (c.state !== 'recupera' && c.state !== 'dormido') g.hurt(c.x, c.z, dron ? 'dron' : 'centinela');
      else { p.vel.x += Math.sign(dx || 1) * 2; }
    }
  }
}
function despertar(g, c) { c.state = 'detecta'; c.t = 0; g.sound.sfx('alerta'); }
export function matarCentinela(g, c, fx, fz, launch) {
  g.sound.sfx('centinela_cae'); g.hitStop = Math.max(g.hitStop, 0.07); g.addTrauma(0.25);
  g.burst(c.x, c.y + 0.6, c.z, 18, [0.75, 0.9, 1], { speed: 5, life: 0.6, size: 1.2 });
  if (launch) { const dx = c.x - fx, dz = c.z - fz, d = Math.hypot(dx, dz) || 1; c.launched = true; c.t = 0; c.vx = dx / d * 11; c.vz = dz / d * 11 - 3; c.vy = 7; }
  else c.alive = false;
  for (let i = 0; i < 3; i++) g.giveFrag(c.x, c.y + 0.8, c.z);
}
export function spinCentinelas(g, pp) {
  for (const c of g.L.centinelas) {
    if (!c.alive || c.launched) continue;
    const d = Math.hypot(c.x - pp.x, c.z - pp.z), top = c.y + (c.tipo === 'dron' ? 0.7 : 1.35);
    if (d > CONFIG.spinRadius + 0.5 || pp.y > top || pp.y + 1.6 < c.y - 0.2) continue;
    if (c.state === 'recupera' || c.state === 'dormido') matarCentinela(g, c, pp.x, pp.z, true);
    else if (!c.cd || c.cd <= 0) { c.cd = 0.4; g.sound.sfx('clang'); g.burst(c.x, c.y + 0.8, c.z, 6, [1, 1, 0.8], { speed: 3, life: 0.25 }); }
  }
}

// ---------- ondas en el suelo (esferas resonantes y el Guardián) ----------
export function lanzarOnda(g, x, y, z, speed = 6.5, max = 7) {
  g.ondas.spawn(o => { o.x = x; o.y = y; o.z = z; o.r = 0.5; o.speed = speed; o.max = max; o.hit = false; });
}
export function updateOndas(g, dt) {
  const p = g.player;
  g.ondas.forEachActive(o => {
    o.r += o.speed * dt;
    if (o.r > o.max) { o.active = false; return; }
    if (o.hit || p.hidden || p.state === STATE.DEAD) return;
    const d = Math.hypot(p.pos.x - o.x, p.pos.z - o.z);
    if (Math.abs(d - o.r) < 0.42 && p.pos.y < o.y + 0.45 && p.pos.y > o.y - 1) { o.hit = true; g.hurt(o.x, o.z, 'onda'); }
  });
}
export function updateEsferas(g, dt) {
  const p = g.player;
  for (const s of g.L.esferas) {
    s.t += dt;
    s.warn = s.t > s.period - 0.65 && s.t > 0;
    if (s.t >= s.period) {
      s.t = 0;
      if (Math.abs(p.pos.z - s.z) < 22 && !(g.chase.on && s.z > g.chase.z)) { lanzarOnda(g, s.x, s.y, s.z, 6, 6.5); g.sound.sfx('onda'); s.pulse = 1; }
    }
    s.pulse = Math.max(0, (s.pulse || 0) - dt * 3);
  }
}

// ---------- el eco: repite el camino de DIP con retraso ----------
export function updateEcos(g, dt) {
  const p = g.player;
  for (const e of g.L.ecos) {
    const dentro = !p.hidden && p.state !== STATE.DEAD && p.pos.z <= e.z0 && p.pos.z >= e.z1;
    if (!dentro) {
      if (e.on) { e.on = false; e.buf.length = 0; g.sound.sfx('eco_fin'); }
      e.vis = Math.max(0, (e.vis || 0) - dt * 3);
      continue;
    }
    if (!e.on) { e.on = true; e.buf.length = 0; g.sound.sfx('eco'); }
    e.buf.push(p.pos.x, p.pos.y, p.pos.z, p.anim === 'run' || p.anim === 'walk' ? 1 : 0);
    const lag = Math.round(e.delay / CONFIG.step) * 4;
    if (e.buf.length <= lag) { e.vis = 0; continue; }
    const i = e.buf.length - lag - 4;
    e.x = e.buf[i]; e.y = e.buf[i + 1]; e.z = e.buf[i + 2]; e.moving = e.buf[i + 3];
    if (e.buf.length > lag + 400) e.buf.splice(0, e.buf.length - lag - 40);
    e.vis = Math.min(1, (e.vis || 0) + dt * 2);
    if (e.vis > 0.6 && Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 0.6 && Math.abs(p.pos.y - e.y) < 1.1) g.hurt(e.x, e.z, 'eco');
  }
}

// ---------- puertas contradictorias y plataformas temporales ----------
export function updatePuertas(g, dt) {
  const p = g.player;
  for (const d of g.L.puertas) {
    if (g.chase.on && d.z > g.chase.z) continue;
    d.t += dt;
    const ph = d.t % d.period, abierta = ph < d.open;
    d.warn = abierta && d.open - ph < 0.55;
    if (d.warn && !d.warned) { d.warned = true; g.sound.sfx('puerta_aviso'); }
    if (!abierta) d.warned = false;
    const prev = d.k; d.k += ((abierta ? 1 : 0) - d.k) * (1 - Math.exp(-dt * 9));
    const cerrada = d.k < 0.5;
    if (cerrada && !d.s.active) {
      d.s.active = true; g.sound.sfx('puerta');
      // si DIP está justo debajo, se le aparta hacia el lado más cercano (nunca queda atrapado)
      if (overlaps(p, d.s)) p.pos.z = p.pos.z > d.z ? d.s.z1 + p.hd + 0.01 : d.s.z0 - p.hd - 0.01;
    } else if (!cerrada && d.s.active) { d.s.active = false; if (prev < 0.5) g.sound.sfx('puerta'); }
  }
}
export function updateTemporales(g, dt) {
  for (const q of g.L.temporales) {
    q.t += dt;
    const cyc = q.on + q.off, ph = ((q.t % cyc) + cyc) % cyc, on = ph < q.on;
    q.warn = on && ph > q.on - 0.75;
    if (q.s.active && !on) g.sound.sfx('temporal');
    q.s.active = on;
    q.vis += ((on ? 1 : 0) - q.vis) * (1 - Math.exp(-dt * 14));
  }
}
export function updateFalling(g, dt) {
  const p = g.player;
  for (const f of g.L.falling) {
    f.t += dt;
    if (f.state === 'tiembla' && f.t > 0.5) { f.state = 'cae'; f.t = 0; f.vy = 0; g.sound.sfx('placa'); }
    if (f.state === 'cae') {
      f.vy -= 22 * dt; f.y += f.vy * dt; f.s.y0 = f.top - 0.35 + f.y; f.s.y1 = f.top + f.y;
      if (f.t > 1.2) f.s.active = false;
      if (f.t > 3.2 && !(p.pos.z < f.s.z1 + 0.5 && p.pos.z > f.s.z0 - 0.5 && Math.abs(p.pos.x - (f.s.x0 + f.s.x1) / 2) < 2)) {
        f.state = 'firme'; f.t = 0; f.y = 0; f.s.y0 = f.top - 0.35; f.s.y1 = f.top; f.s.active = !f.s.erased;
      }
    }
  }
}
export { setState };

// ---------- medusas de corriente: flotan subiendo y bajando; desde arriba rebotan, de lado pican ----------
export function updateMedusas(g, dt) {
  const p = g.player;
  for (const q of g.L.medusas) {
    q.t = (q.t || 0) + dt; q.squash = Math.max(0, (q.squash || 0) - dt * 4);
    q.y = q.y0 + Math.sin(q.t / q.period * Math.PI * 2) * q.amp;
    if (p.hidden || p.state === STATE.DEAD) continue;
    if (Math.abs(p.pos.x - q.x) > 0.85 || Math.abs(p.pos.z - q.z) > 0.85) continue;
    if ((p.gdir || 1) > 0 && p.vel.y < -0.5 && p.pos.y > q.y - 0.1 && p.pos.y < q.y + 0.6) {
      bounce(p, 1.35); q.squash = 1; g.sound.sfx('medusa'); g.burst(q.x, q.y + 0.3, q.z, 10, [0.7, 0.95, 1], { speed: 3, life: 0.4 });
    } else if (p.pos.y < q.y + 0.4 && p.pos.y + p.h > q.y - 0.9) g.hurt(q.x, q.z, 'medusa');
  }
}
