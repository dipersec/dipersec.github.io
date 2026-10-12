// config.js — Todos los valores de "game feel" en un solo lugar. Se afinan en vivo con el panel
// de depuración (tecla ` o ?debug en la URL). Unidades: px del sprite (DIP mide 86 px) y segundos.
export const CONFIG = {
  // Salto definido por diseño: altura + tiempo al punto más alto → gravedad y velocidad derivadas
  jumpHeight: 125,     // px (~1.45× la altura de DIP)
  timeToApex: 0.38,    // s
  fallMult: 1.8,       // caer más rápido que subir: da peso
  cutMult: 0.45,       // soltar el salto mientras sube
  maxFall: 950,        // px/s, velocidad terminal
  coyote: 0.1,         // s para saltar después de dejar el borde
  buffer: 0.12,        // s que cuenta un salto pulsado antes de aterrizar
  // Movimiento horizontal
  walkSpeed: 125,      // px/s
  runSpeed: 230,       // px/s
  pushSpeed: 60,       // px/s
  accelTime: 0.12,     // s hasta la velocidad máxima
  decelTime: 0.08,     // s hasta frenar
  airControl: 0.65,    // fracción de la aceleración en el aire
  // Cámara
  camFollowX: 5,       // lambda del suavizado horizontal
  camFollowY: 3.2,     // lambda del suavizado vertical
  camLookAhead: 70,    // px hacia donde mira DIP
  camLookLambda: 2.2,
  camAnchorDrop: 60,   // px que puede caer DIP bajo el ancla antes de que la cámara lo siga en el aire
  shakeDecay: 1.6,     // trauma por segundo
  shakeAmp: 9,         // px de temblor con trauma 1
  // Juice
  squashLand: 0.78,    // escala Y al aterrizar
  stretchJump: 1.18,   // escala Y al despegar
  squashTime: 0.16,    // s que tarda en volver a 1
  hitStop: 0.07,       // s de congelamiento al recibir daño
  runDustEvery: 0.22,  // s entre nubes de pisadas al correr
  // Bucle
  step: 1 / 60         // paso fijo de la física
};

export const gravity = () => 2 * CONFIG.jumpHeight / (CONFIG.timeToApex ** 2);
export const jumpVel = () => 2 * CONFIG.jumpHeight / CONFIG.timeToApex;
// Alcance horizontal aproximado de un salto corriendo (para diseñar huecos)
export const jumpReach = () => CONFIG.runSpeed * CONFIG.timeToApex * (1 + 1 / Math.sqrt(CONFIG.fallMult));
