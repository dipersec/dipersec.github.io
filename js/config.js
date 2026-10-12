// config.js — Todos los valores de "game feel" en un solo lugar (unidades: metros y segundos; DIP mide 1.8).
// Se afinan en vivo con el panel de depuración (tecla ` o ?debug en la URL).
export const CONFIG = {
  // Salto definido por diseño: altura + tiempo al punto más alto → gravedad y velocidad derivadas
  jumpHeight: 2.7,
  timeToApex: 0.38,
  fallMult: 1.9,       // caer más rápido que subir: da peso
  cutMult: 0.45,       // soltar el salto mientras sube
  maxFall: 30,
  coyote: 0.1,
  buffer: 0.12,
  bounceMult: 0.85,    // rebote al pisar cajas y enemigos (fracción de la velocidad de salto)
  bounceBoxMult: 1.25, // caja de rebote
  // Movimiento
  maxSpeed: 7,
  accelTime: 0.12,     // s hasta la velocidad máxima
  decelTime: 0.08,     // s hasta frenar
  airControl: 0.65,
  stepHeight: 0.3,     // sube bordillos sin saltar
  // Giro de compilación
  spinTime: 0.4,
  spinCooldown: 0.2,
  spinRadius: 1.25,
  // Cámara (corredor: detrás y arriba; en la persecución, delante mirando a DIP)
  camDist: 6.8,
  camHeight: 3.4,
  camLookAhead: 3,
  camFollowXZ: 8,
  camFollowY: 4,
  camYawLambda: 4,
  camFov: 58,
  camAnchorDrop: 1.5,
  shakeDecay: 1.6,
  shakeAmp: 0.32,
  // Juice
  squashLand: 0.76,
  stretchJump: 1.2,
  squashTime: 0.15,
  hitStop: 0.07,
  runDustEvery: 0.24,
  magnetRadius: 1.6,
  // Muerte
  respawnFade: 0.22,
  // Bucle
  step: 1 / 60
};

export const gravity = () => 2 * CONFIG.jumpHeight / (CONFIG.timeToApex ** 2);
export const jumpVel = () => 2 * CONFIG.jumpHeight / CONFIG.timeToApex;
// Alcance horizontal de un salto a velocidad máxima (para medir huecos: colocar al 60–85 %)
export const jumpReach = () => CONFIG.maxSpeed * CONFIG.timeToApex * (1 + 1 / Math.sqrt(CONFIG.fallMult));
