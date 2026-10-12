// main.js — Precarga, arranque y bucle con requestAnimationFrame.
import { buildDipSheet, buildTiloSheet } from './sprites.js';
import { Sound } from './audio.js';
import { Input } from './input.js';
import { Game } from './game.js';
import { World } from './world.js';
import { Hud } from './hud.js';

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
  const game = new Game(sound, input);
  const world = new World($('#mundo'), game, assets);
  const hud = new Hud($('#hud'), game, world, assets);
  window.__dip = game;
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

  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    game.update(dt);
    input.endFrame();
    world.draw(dt);
    hud.draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

boot().catch((e) => {
  console.error(e);
  label.textContent = 'No se pudo iniciar el juego en este navegador (se necesita WebGL).';
});
