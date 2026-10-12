// player.js — Máquina de estados + físicas de DIP.
import { moveAndCollide } from './physics.js';
import { CONFIG, gravity, jumpVel } from './config.js';

const moveToward = (a, b, d) => Math.abs(b - a) <= d ? b : a + Math.sign(b - a) * d;

export const STATE = {
  IDLE: 'idle', RUNNING: 'running', JUMPING: 'jumping', FALLING: 'falling', LANDING: 'landing',
  PUSHING: 'pushing', CASTING: 'casting', HURT: 'hurt', DEAD: 'dead', POSE: 'pose'
};
const GROUNDED = new Set([STATE.IDLE, STATE.RUNNING, STATE.LANDING, STATE.PUSHING]);
const CAST_FIRE = 0.16, CAST_END = 0.5, LAND_TIME = 0.09, HURT_LOCK = 0.35, INVULN = 1.3;

export function createPlayer(x, y) {
  return {
    pos: { x, y }, vel: { x: 0, y: 0 }, w: 22, h: 72,
    face: 1, state: STATE.IDLE, stateTime: 0, anim: 'idle', animTime: 0,
    onGround: true, ground: null, hitWall: 0, wallRef: null,
    energy: 3, invuln: 0, jumpBuffer: 0, castFired: false, running: false,
    poseAnim: 'idle', stepTimer: 0, pushTarget: null
  };
}

export function setState(p, s) {
  if (p.state === s) return;
  p.state = s; p.stateTime = 0;
  if (s === STATE.CASTING) p.castFired = false;
}

// El estado decide la animación; nunca el input directo.
function animFor(p) {
  switch (p.state) {
    case STATE.IDLE: return 'idle';
    case STATE.RUNNING: return p.running ? 'run' : 'walk';
    case STATE.JUMPING: return 'rise';
    case STATE.FALLING: return 'fall';
    case STATE.LANDING: return 'crouch';
    case STATE.PUSHING: return 'push';
    case STATE.CASTING: return 'project';
    case STATE.HURT: case STATE.DEAD: return 'hurt';
    case STATE.POSE: return p.poseAnim;
  }
  return 'idle';
}

// input: { x, run, jumpPressed, jumpHeld, castPressed }
// hooks: { onJump, onLand, onStep, onCastFire, onPush }
export function updatePlayer(p, input, solids, dt, hooks) {
  p.stateTime += dt;
  p.invuln = Math.max(0, p.invuln - dt);
  p.jumpBuffer = input.jumpPressed ? CONFIG.buffer : Math.max(0, p.jumpBuffer - dt);
  p.coyote = p.onGround ? CONFIG.coyote : Math.max(0, (p.coyote || 0) - dt);

  const locked = p.state === STATE.DEAD || p.state === STATE.POSE ||
    (p.state === STATE.HURT && p.stateTime < HURT_LOCK) || (p.state === STATE.CASTING && p.onGround);
  const dir = locked ? 0 : input.x;
  if (dir !== 0 && p.state !== STATE.CASTING) p.face = dir;
  p.running = input.run && dir !== 0;

  // Velocidad horizontal: acelera en accelTime, frena en decelTime (más rápido), menos control en el aire
  let target = dir * (p.running ? CONFIG.runSpeed : CONFIG.walkSpeed);
  if (p.state === STATE.PUSHING) target = dir * CONFIG.pushSpeed;
  const top = p.running ? CONFIG.runSpeed : CONFIG.walkSpeed;
  const rate = (dir !== 0 ? top / CONFIG.accelTime : top / CONFIG.decelTime) * (p.onGround ? 1 : CONFIG.airControl);
  if (p.state === STATE.PUSHING) p.vel.x = target * 1.2; // un poco más rápido que la roca: el contacto no se pierde
  else if (p.state !== STATE.HURT || p.stateTime > HURT_LOCK) p.vel.x = moveToward(p.vel.x, target, rate * dt);

  // Salto: desde el suelo o en el tiempo coyote justo después de dejar un borde
  const canJump = (GROUNDED.has(p.state) && p.onGround) || (p.state === STATE.FALLING && p.coyote > 0);
  if (p.jumpBuffer > 0 && canJump) {
    p.vel.y = -jumpVel(); p.jumpBuffer = 0; p.coyote = 0; p.onGround = false; p.cut = false;
    setState(p, STATE.JUMPING); hooks.onJump?.();
  }
  // Salto variable: soltar el botón mientras sube recorta la velocidad (una sola vez)
  if (p.state === STATE.JUMPING && !input.jumpHeld && !p.cut && p.vel.y < 0) { p.vel.y *= CONFIG.cutMult; p.cut = true; }

  // Recuerdo (proyectar): desde el suelo
  if (input.castPressed && GROUNDED.has(p.state) && p.onGround) { setState(p, STATE.CASTING); p.vel.x = 0; }

  // Gravedad: más fuerte al caer (peso)
  const g = gravity() * (p.vel.y > 0 ? CONFIG.fallMult : 1);
  p.vel.y = Math.min(p.vel.y + g * dt, CONFIG.maxFall);
  const wasGround = p.onGround;
  p.lastFallSpeed = p.vel.y;
  moveAndCollide(p, solids, dt);

  // Empuje: contacto lateral con un sólido empujable mientras se camina hacia él
  p.pushTarget = null;
  if (p.onGround && p.wallRef && p.wallRef.pushable && dir !== 0 && p.hitWall === dir) p.pushTarget = p.wallRef;

  // Transiciones
  switch (p.state) {
    case STATE.IDLE:
    case STATE.RUNNING:
    case STATE.PUSHING:
      if (!p.onGround) { setState(p, STATE.FALLING); break; }
      if (p.pushTarget) { setState(p, STATE.PUSHING); hooks.onPush?.(p.pushTarget, dir); break; }
      setState(p, dir !== 0 ? STATE.RUNNING : STATE.IDLE);
      break;
    case STATE.JUMPING:
      if (p.vel.y >= 0) setState(p, STATE.FALLING);
      if (p.onGround) { setState(p, STATE.LANDING); hooks.onLand?.(); }
      break;
    case STATE.FALLING:
      if (p.onGround) { setState(p, STATE.LANDING); hooks.onLand?.(); }
      break;
    case STATE.LANDING:
      if (!p.onGround) setState(p, STATE.FALLING);
      else if (p.stateTime >= LAND_TIME || dir !== 0) setState(p, dir !== 0 ? STATE.RUNNING : STATE.IDLE);
      break;
    case STATE.CASTING:
      if (!p.castFired && p.stateTime >= CAST_FIRE) { p.castFired = true; hooks.onCastFire?.(); }
      if (p.stateTime >= CAST_END) setState(p, p.onGround ? STATE.IDLE : STATE.FALLING);
      break;
    case STATE.HURT:
      if (p.stateTime >= HURT_LOCK && p.onGround) setState(p, STATE.IDLE);
      break;
  }

  // Pasos secos sobre la costra
  if (p.state === STATE.RUNNING || p.state === STATE.PUSHING) {
    p.stepTimer -= dt;
    if (p.stepTimer <= 0) { p.stepTimer = p.running ? 0.21 : 0.32; hooks.onStep?.(); }
  } else p.stepTimer = 0.05;

  const a = animFor(p);
  if (a !== p.anim) { p.anim = a; p.animTime = 0; } else p.animTime += dt;
  return wasGround;
}

export function hurtPlayer(p, fromX) {
  if (p.invuln > 0 || p.state === STATE.DEAD || p.state === STATE.POSE) return false;
  p.energy -= 1; p.invuln = INVULN;
  const d = p.pos.x + p.w / 2 < fromX ? -1 : 1;
  p.vel.x = d * 200; p.vel.y = -330; p.onGround = false;
  setState(p, STATE.HURT);
  return true;
}
