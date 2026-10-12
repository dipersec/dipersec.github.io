// main.js — Precarga, arranque y bucle con requestAnimationFrame.
import { buildDipSheet, buildTiloSheet } from './sprites.js';
import { Sound } from './audio.js';
import { Input } from './input.js';
import { Game } from './game.js';
import { World } from './world.js';
import { Hud } from './hud.js';
import { CONFIG } from './config.js';
import { setupDebug } from './debug.js';

const $ = (s) => document.querySelector(s);
const bar = $('#carga-barra'), label = $('#carga-texto');

// Precarga: los sprites se generan por código (SVG → pixel art) antes del primer update().
async function preload() {
  const steps = [['dip', buildDipSheet], ['tilo', buildTiloSheet]];
  const out = {};
  for (let i = 0; i < steps.length; i++) {
    label.textContent = i === 0 ? 'Rasterizando a DIP…' : 'Despertando a Tilo…';
    out[steps[i][0]] = await steps[i][1]();
    bar.style.width = `${((i + 1) / (steps.length + 1)) * 100}%`;
  }
  return out;
}

async function boot() {
  const assets = await preload();
  label.textContent = 'Construyendo Nácar…';
  await new Promise(r => requestAnimationFrame(r));
  const sound = new Sound();
  const input = new Input();
  input.bindTouch($('#juego'));
  input.bindStick($('#stick'), $('#stick-base'), $('#stick-knob'));
  const game = new Game(sound, input);
  const world = new World($('#mundo'), game, assets);
  const hud = new Hud($('#hud'), game, world, assets);
  window.__dip = game; window.__world = world;
  setupDebug(game, world);
  const zona = Number(new URLSearchParams(location.search).get('zona'));
  if (zona >= 1 && zona <= 6) game.skipTo(zona);

  const resize = () => {
    const r = $('#juego').getBoundingClientRect();
    world.resize(r.width, r.height); hud.resize(r.width, r.height);
  };
  resize(); window.addEventListener('resize', resize);

  // El audio solo puede arrancar tras un gesto del jugador
  const unlock = () => { if (!sound.ctx) sound.init(); sound.resume(); };
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
  $('#hud').addEventListener('pointerdown', (e) => { e.preventDefault(); input.pressed.confirm = true; input.pressed.any = true; });
  if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('tactil');
  window.addEventListener('touchstart', () => document.body.classList.add('tactil'), { once: true, passive: true });

  bar.style.width = '100%';
  $('#carga').classList.add('lista');
  setTimeout(() => $('#carga').remove(), 700); // solo para retirar la pantalla de carga del DOM

  // Bucle: física con paso fijo de 60 Hz (el salto es idéntico en cualquier pantalla) y render interpolado.
  // El hit-stop congela la lógica unos milisegundos mientras el render sigue.
  let last = performance.now(), acc = 0;
  function loop(now) {
    const frame = Math.min((now - last) / 1000, 0.25); last = now;
    input.poll();
    if (game.hitStop > 0) game.hitStop = Math.max(0, game.hitStop - frame);
    else acc += frame;
    let steps = 0;
    while (acc >= CONFIG.step && steps < 8) {
      game.savePrev(); game.update(CONFIG.step); acc -= CONFIG.step;
      if (steps++ === 0) input.endFrame();
    }
    if (steps === 8) acc = 0;
    game.alpha = acc / CONFIG.step;
    world.draw(frame, frame);
    hud.draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

boot().catch((e) => {
  console.error(e);
  label.textContent = 'No se pudo iniciar el juego en este navegador (se necesita WebGL).';
});
