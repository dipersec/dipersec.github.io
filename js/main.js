// main.js — Precarga, arranque, menús (título, pausa, ajustes) y bucle con requestAnimationFrame.
import { buildDipSheet } from './sprites.js';
import { Sound } from './audio.js';
import { Input } from './input.js';
import { Game } from './game.js';
import { World } from './world.js';
import { Hud } from './hud.js';
import { CONFIG } from './config.js';
import { setupDebug } from './debug.js';

const $ = (s) => document.querySelector(s);
const bar = $('#carga-barra'), label = $('#carga-texto');
const IS_TOUCH = matchMedia('(pointer: coarse)').matches;

// Precarga: el sprite de DIP se genera por código (SVG → pixel art) antes del primer update().
async function preload() {
  label.textContent = 'Recordando a DIP…';
  const dip = await buildDipSheet();
  bar.style.width = '50%';
  return { dip };
}

function setupMenus(game) {
  const body = document.body, s = game.save;
  const on = (id, fn) => $(id).addEventListener('click', (e) => { e.preventDefault(); e.currentTarget.blur(); if (!game.sound.ctx) { game.sound.init(); game.aplicarAjustes(); } game.sound.resume(); fn(); });
  // título
  const pintarTitulo = () => {
    $('#b-continuar').style.display = s.progreso ? '' : 'none';
    $('#b-nueva').classList.toggle('principal', !s.progreso);
    $('#b-nueva').innerHTML = s.progreso ? 'Nueva partida <kbd>N</kbd>' : 'Empezar <kbd>Espacio</kbd>';
    $('#b-contrarreloj').style.display = s.completados[game.M.id] ? '' : 'none';
    if (IS_TOUCH) document.querySelectorAll('.menu kbd').forEach(k => k.remove());
  };
  pintarTitulo();
  on('#b-continuar', () => game.continuar());
  on('#b-nueva', () => game.start(false));
  on('#b-contrarreloj', () => game.start(true));
  // pausa
  on('#b-seguir', () => { game.paused = false; });
  on('#b-reiniciar', () => game.reiniciarDesdeControl());
  on('#b-titulo', () => { location.href = location.pathname; });
  $('#ayuda-controles').textContent = IS_TOUCH
    ? 'Pulgar izquierdo: moverte · Saltar · Girar · Recordar (aparece junto a un ancla)'
    : 'Flechas o WASD: moverte · Espacio: saltar · X: girar · C: recordar · M: sonido · Esc: continuar';
  // ajustes (desde el título o la pausa)
  const vol = $('#a-volumen'), ef = $('#a-efectos');
  vol.value = game.ajustes.volumen; ef.checked = game.ajustes.efectosReducidos;
  const abrir = () => body.classList.add('ajustes-abiertos'), cerrar = () => body.classList.remove('ajustes-abiertos');
  on('#b-ajustes-t', abrir); on('#b-ajustes-p', abrir); on('#b-cerrar-ajustes', cerrar);
  vol.addEventListener('input', () => { game.ajustes.volumen = +vol.value; game.aplicarAjustes(); game.writeSave(); });
  ef.addEventListener('change', () => { game.ajustes.efectosReducidos = ef.checked; game.writeSave(); });
  // los registros encontrados se leen en la pausa
  const pintarRegistros = () => {
    const regs = game.L.registros, el = $('#registros');
    el.innerHTML = `<h3>Registros encontrados: ${regs.filter(r => r.got).length}/${regs.length}</h3>`;
    for (const r of regs) {
      const p = document.createElement('p');
      if (r.got) { const b = document.createElement('b'); b.textContent = r.title; p.append(b, r.text); }
      else p.textContent = '· · · registro sin encontrar · · ·';
      el.append(p);
    }
  };
  let last = '';
  return () => {
    const st = `${game.mode}|${game.paused}`;
    if (st !== last) {
      last = st;
      body.classList.toggle('titulo', game.mode === 'titulo');
      body.classList.toggle('jugando', game.mode === 'juego' && !game.paused);
      body.classList.toggle('pausado', game.mode === 'juego' && game.paused);
      if (game.paused) pintarRegistros(); else if (game.mode !== 'titulo') cerrar();
      if (game.mode === 'titulo') pintarTitulo();
    }
    body.classList.toggle('puede-recordar', game.mode === 'juego' && !game.paused && !!game.memorias.near && !game.director.blocking);
  };
}

async function boot() {
  const assets = await preload();
  label.textContent = 'Encendiendo Nácar…';
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
  const syncMenus = setupMenus(game);
  const q = new URLSearchParams(location.search), sec = Number(q.get('seccion'));
  if (sec >= 1 && sec <= 6) game.skipTo(sec);
  else if (q.has('contrarreloj') && game.save.completados[game.M.id]) game.start(true);

  const resize = () => {
    const r = $('#juego').getBoundingClientRect();
    world.resize(r.width, r.height); hud.resize(r.width, r.height);
  };
  resize(); window.addEventListener('resize', resize);

  // El audio solo puede arrancar tras un gesto del jugador
  const unlock = () => { if (!sound.ctx) { sound.init(); game.aplicarAjustes(); } sound.resume(); };
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
  $('#hud').addEventListener('pointerdown', (e) => { if (game.mode === 'titulo') return; e.preventDefault(); input.pressed.confirm = true; input.pressed.any = true; });
  if (IS_TOUCH) document.body.classList.add('tactil');
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
    world.draw(frame);
    hud.draw();
    syncMenus();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

boot().catch((e) => {
  console.error(e);
  label.textContent = 'No se pudo iniciar el juego en este navegador (se necesita WebGL).';
});
