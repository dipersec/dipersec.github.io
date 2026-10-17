// player.js — Máquina de estados + control de DIP en el corredor 3D.
// Estado único por paso: reposo, correr, saltar, caer, aterrizar, daño, muerto, pose. El giro es una capa
// que se suma a cualquier estado (se mantiene el control horizontal mientras gira).
import { moveAndCollide } from './physics.js';
import { CONFIG, gravity, jumpVel } from './config.js';

export const STATE = { IDLE: 'idle', RUNNING: 'running', JUMPING: 'jumping', FALLING: 'falling', LANDING: 'landing', HURT: 'hurt', DEAD: 'dead', POSE: 'pose' };
const GROUNDED = new Set([STATE.IDLE, STATE.RUNNING, STATE.LANDING]);
const moveToward = (a, b, d) => Math.abs(b - a) <= d ? b : a + Math.sign(b - a) * d;

export function createPlayer(x, y, z) {
  return {
    pos: { x, y, z }, vel: { x: 0, y: 0, z: 0 }, hw: 0.32, hd: 0.32, h: 1.55,
    state: STATE.IDLE, stateTime: 0, anim: 'idle', animTime: 0, face: 1,
    onGround: true, ground: null, coyote: 0, jumpBuffer: 0, cut: false,
    spin: 0, spinCd: 0, proj: 0, sq: 1, invuln: 0, hidden: false, poseAnim: 'idle', landVel: 0
  };
}
export function setState(p, s) { if (p.state !== s) { p.state = s; p.stateTime = 0; } }

function animFor(p) {
  if (p.spin > 0 || p.proj > 0) return 'project';
  switch (p.state) {
    case STATE.RUNNING: return Math.hypot(p.vel.x, p.vel.z) > 4.5 ? 'run' : 'walk';
    case STATE.JUMPING: return 'rise';
    case STATE.FALLING: return 'fall';
    case STATE.LANDING: return 'crouch';
    case STATE.HURT: case STATE.DEAD: return 'hurt';
    case STATE.POSE: return p.poseAnim;
  }
  return 'idle';
}

// wish: dirección deseada en el plano (x, z), ya relativa a la cámara, magnitud 0..1
// input: { jumpPressed, jumpHeld, spinPressed } · hooks: { onJump, onLand, onSpin }
export function updatePlayer(p, wish, input, solids, dt, hooks) {
  p.stateTime += dt;
  p.invuln = Math.max(0, p.invuln - dt);
  p.spin = Math.max(0, p.spin - dt);
  p.spinCd = Math.max(0, p.spinCd - dt);
  p.proj = Math.max(0, p.proj - dt);
  p.jumpBuffer = input.jumpPressed ? CONFIG.buffer : Math.max(0, p.jumpBuffer - dt);
  p.coyote = p.onGround ? CONFIG.coyote : Math.max(0, p.coyote - dt);
  const locked = p.state === STATE.DEAD || p.state === STATE.POSE || (p.state === STATE.HURT && p.stateTime < 0.25);

  // Movimiento: acelera en accelTime, frena en decelTime, menos control en el aire
  const wx = locked ? 0 : wish.x, wz = locked ? 0 : wish.z, has = wx * wx + wz * wz > 0.0004;
  const top = CONFIG.maxSpeed;
  const rate = (has ? top / CONFIG.accelTime : top / CONFIG.decelTime) * (p.onGround ? 1 : CONFIG.airControl);
  if (p.state !== STATE.HURT || p.stateTime > 0.25) {
    p.vel.x = moveToward(p.vel.x, wx * top, rate * dt);
    p.vel.z = moveToward(p.vel.z, wz * top, rate * dt);
  }

  // Salto con coyote y buffer
  const canJump = !locked && ((GROUNDED.has(p.state) && p.onGround) || (p.state === STATE.FALLING && p.coyote > 0));
  const gd = p.gdir || 1, gm = p.gmul || 1;   // dirección y fuerza de la gravedad local (campos de Vértice)
  if (p.jumpBuffer > 0 && canJump) {
    p.vel.y = jumpVel() * gd; p.jumpBuffer = 0; p.coyote = 0; p.onGround = false; p.cut = false;
    setState(p, STATE.JUMPING); hooks.onJump?.();
  }
  if (p.state === STATE.JUMPING && !input.jumpHeld && !p.cut && p.vel.y * gd > 0) { p.vel.y *= CONFIG.cutMult; p.cut = true; }

  // Giro de compilación
  if (input.spinPressed && !locked && p.spin <= 0 && p.spinCd <= 0) { p.spin = CONFIG.spinTime; p.spinCd = CONFIG.spinTime + CONFIG.spinCooldown; hooks.onSpin?.(); }

  // Gravedad con peso al caer (más suave mientras gira en el aire)
  const falling = p.vel.y * gd < 0;
  const g = gravity() * gm * (falling ? CONFIG.fallMult : 1) * (p.spin > 0 && falling ? 0.6 : 1);
  p.vel.y -= g * gd * dt;
  if (p.vel.y * gd < -CONFIG.maxFall) p.vel.y = -CONFIG.maxFall * gd;
  const wasGround = p.onGround, vyBefore = p.vel.y * gd;
  moveAndCollide(p, solids, dt, wasGround && gd > 0 ? CONFIG.stepHeight : 0);
  p.landVel = vyBefore;

  switch (p.state) {
    case STATE.IDLE: case STATE.RUNNING:
      if (!p.onGround) { setState(p, STATE.FALLING); break; }
      setState(p, has ? STATE.RUNNING : STATE.IDLE); break;
    case STATE.JUMPING:
      if (p.vel.y * gd <= 0) setState(p, STATE.FALLING);
      if (p.onGround && p.stateTime > 0.05) { setState(p, STATE.LANDING); hooks.onLand?.(vyBefore); }
      break;
    case STATE.FALLING:
      if (p.onGround) { setState(p, STATE.LANDING); hooks.onLand?.(vyBefore); }
      break;
    case STATE.LANDING:
      if (!p.onGround) setState(p, STATE.FALLING);
      else if (p.stateTime > 0.08 || has) setState(p, has ? STATE.RUNNING : STATE.IDLE);
      break;
    case STATE.HURT:
      if (p.stateTime > 0.4 && p.onGround) setState(p, STATE.IDLE);
      break;
  }
  p.sq += (1 - p.sq) * (1 - Math.exp(-dt * 4.6 / CONFIG.squashTime));
  const a = animFor(p);
  if (a !== p.anim) { p.anim = a; p.animTime = 0; } else p.animTime += dt;
  return wasGround;
}

// Rebote al pisar una caja o un enemigo
export function bounce(p, mult = CONFIG.bounceMult) {
  p.vel.y = jumpVel() * mult * (p.gdir || 1); p.onGround = false; p.cut = true; p.coyote = 0;
  setState(p, STATE.JUMPING); p.sq = CONFIG.stretchJump;
}
