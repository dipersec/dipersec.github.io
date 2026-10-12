# DIP · Nivel 1: Nácar

*El último recuerdo del universo* — acción y exploración arcade en 2.5D. Es la versión compacta del nivel completo: las 5 zonas y las 9 escenas del documento de diseño, de principio a fin.

## Jugar
Abre `index.html` desde un servidor (GitHub Pages o `python3 -m http.server`). three.js se carga desde jsdelivr (`three@0.160.0`). Todo lo demás se genera por código: los sprites, el mundo y el sonido.

| Acción | Teclado | Táctil |
|---|---|---|
| Caminar / correr | ← → o A D · Shift | joystick: pulgar en la mitad izquierda (a fondo corre) |
| Saltar (mantén para llegar más alto) | Espacio o ↑ | Saltar |
| Examinar, hablar, proyectar el recuerdo | E | ✦ |
| Avanzar diálogo | Espacio, E o Enter | tocar la pantalla |
| Pausa / sonido | Esc · M | II |

**Pruebas de juego:** `index.html?zona=N` (N = 1 a 6) empieza en esa zona con todo lo anterior resuelto. Sirve para revisar los criterios del documento (orientación, diversión, ritmo, claridad e intriga) sin rejugar todo.

## Recorrido
1. **Cráter del impacto.** Intro de la caída, la pantalla de la cápsula y los controles básicos. Secreto: la huella en la pared vertical.
2. **Camino de huellas y jardín de Tilo.** Las huellas repetidas, la huella que aparece al saltar, Tilo, las rocas que se empujan, la palanca y el sensor. Secreto: el jardín anterior (en lo alto, sobre la carpa).
3. **Ruinas incompletas.** Velo mineral, placas inestables, el cristal, el **primer recuerdo**, el puente imposible, la escalera que termina en el aire, el centinela dormido (con ruta por arriba) y las 3 estructuras que abren la puerta.
4. **Santuario del eco.** Plataformas temporales y los 3 anillos que se completan con el recuerdo. Luego la visión de las ruinas completas y el ascensor. Secreto: el cristal silencioso.
5. **Estación de llegada.** Una puerta que se abre antes de tiempo y otra que se cierra (se pasa por arriba), el registro de la cápsula, la cápsula de energía y Lunex. Secreto: la lista de llegadas.
6. **Huida.** Puertas que cambian de lugar, plataformas que aparecen y desaparecen y un puente que hay que recordar. Al salir, Tilo, la señal hacia el cielo y **VÉRTICE**.

## Arquitectura (skill `juegos`)
```
index.html      canvas del mundo + canvas del HUD + botones táctiles
js/main.js      precarga (sprites) y bucle requestAnimationFrame con dt limitado
js/game.js      estado + update(): mecánicas, cámara, triggers (sin dibujo)
js/player.js    máquina de estados de DIP (reposo, correr, saltar, caer, aterrizar, empujar, recordar, daño)
js/physics.js   vectores pos/vel, gravedad, AABB resuelto por ejes (X y luego Y)
js/level.js     el nivel como datos: sólidos, anclas del recuerdo, placas, centinelas, puertas…
js/story.js     las 9 escenas como guiones (generadores) + interacciones y secretos
js/world.js     render three.js: diorama low-poly, luz y sombras, paralaje real, clima por zona
js/hud.js       HUD, diálogos, visiones y pantallas (canvas 2D)
js/sprites.js   SpriteSheet + generación del pixel art (DIP 48×86, Tilo 40×60)
js/textures.js  texturas procedurales HD (costra, roca, piedra, metal, glifos, anillos)
js/pool.js      object pool (partículas, pulsos de los centinelas)
js/audio.js     Web Audio sintetizado: viento, pasos, cristales, voces y música por zona
```
- El sprite de DIP es el SNES de 48 px sin cambios de diseño, generado con el mismo SVG y la misma paleta. Se agregaron dos filas con el mismo dibujo: empujar y daño.
- Solo DIP y Tilo son pixel art. El mundo se renderiza en HD: antialiasing, materiales PBR con reflejos del cielo, texturas procedurales, sombras suaves y resolución adaptativa (baja sola si el equipo no llega a ~40 fps).
