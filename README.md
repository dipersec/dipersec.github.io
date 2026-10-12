# DIP · El Sueño Infinito — Nivel 1: Sector Demolición

Plataformas 3D de acción en un corredor con cámara detrás. DIP es un salvapantallas que se quedó dormido en el sofá. Su sector va a ser formateado para construir el Servidor de Anuncios Intergaláctico, y él tiene que correr.

## Jugar
Abre `index.html` desde un servidor (GitHub Pages o `python3 -m http.server`). three.js (`three@0.160.0`) se carga desde jsdelivr. Todo lo demás se genera por código: el sprite, el mundo, las texturas y el sonido.

| Acción | Teclado | Táctil | Mando |
|---|---|---|---|
| Moverse | WASD o flechas | joystick (pulgar en la mitad izquierda) | stick o cruceta |
| Saltar (mantener = más alto) | Espacio, K o Z | Saltar | A |
| Giro de compilación | X, J, Shift o E | Girar | X / B |
| Pausa · sonido · reiniciar | Esc o P · M · R | II | Start |

**URLs de prueba**
- `?seccion=1..4` empieza en una sección: calles, tejados, persecución o jefe.
- `?contrarreloj` activa el modo contrarreloj (sin escenas).
- `?debug` (o la tecla `` ` ``) abre el panel lil-gui con todos los valores de `js/config.js` y mide fps, draw calls, triángulos y alcance del salto.

## Recorrido
1. **Calles del sector.** Arranca en el sofá con el dron, el aviso de demolición y la Guía. Se aprenden el salto, el giro, las cajas y los bichos. Hay un callejón lateral con secreto.
2. **Tejados.** Saltos medidos al 60–85 % del alcance, plataformas que caen, TNT, cajas de rebote y de cristal.
3. **Persecución del vacío.** La cámara gira y mira a DIP de frente, y el vacío borra la calle detrás de él. Hay huecos, formateadoras (siempre queda un carril libre) y una página en un bolsillo arriesgado.
4. **Jefe: Inspector de Trámites.** Tiene 7 golpes en tres fases: devolver sellos con el giro, subir por las carpetas y pisarle la cabeza, y hacer que sus propias formateadoras lo borren. El cierre es el autostop en un paquete de datos.

**Coleccionables:** fragmentos (100 dan una vida), cajas rotas, 4 páginas de la Guía y Copias de Seguridad (absorben un golpe; con 3 seguidas, 8 s de invulnerabilidad). Al final se dan medallas por tiempo (oro 150 s, plata 190 s, bronce 240 s). El progreso se guarda en `localStorage` (`dip-suenio`).

**Ayuda dinámica:** tras 5 muertes en el mismo tramo se regala una Copia, y tras 10 aparece un punto de control extra. Volver a tener el control después de morir toma unos 1 s, y cada muerte tiene un comentario distinto.

## Arquitectura (skills `juegos` + `pulir-plataformas-3d`)
```
index.html      canvas + HUD + joystick y botones táctiles + aviso de girar el celular
js/main.js      precarga y bucle de paso fijo (60 Hz) con interpolación del render
js/config.js    CONFIG: salto por altura y tiempo, coyote, buffer, corte, cámara, juice
js/physics.js   AABB 3D por ejes (X, Z, Y), escalones y plataformas de un solo sentido
js/player.js    máquina de estados de DIP + capa del giro
js/input.js     teclado, joystick analógico, botones y mando (zona muerta 0.15)
js/level1.js    el nivel como datos: sólidos, cajas, enemigos, páginas, controles, tips
js/game.js      mecánicas, cajas/TNT, persecución, cámara, muertes, medallas
js/boss.js      Inspector de Trámites (3 fases)
js/story.js     escenas como guiones (generadores), ninguna dura más de 30 s
js/world.js     render HD three.js: geometría fusionada, instancing, sombras, cielo nocturno
js/hud.js       HUD, globos, diálogos, pausa y pantallas
js/textures.js  texturas procedurales (asfalto, fachadas, cajas, pantallas de salvapantallas)
js/audio.js     Web Audio sintetizado con buses (música, sfx, ui) y escalera de tonos
js/sprites.js   sprite SNES de DIP (48 px) sin cambios de diseño
js/debug.js     panel lil-gui
js/pool.js      object pools (partículas, esquirlas, disparos)
```
- Solo DIP es pixel art. Es un billboard cilíndrico con filtro nearest y squash & stretch. El mundo se renderiza en HD con tone mapping ACES, sombras suaves, mapa de entorno y resolución adaptativa.
- Rendimiento: de 451 draw calls se bajó a 30–162 según la sección, gracias a la geometría estática fusionada por material y al instancing.
- Los nombres e íconos son propios. No se usa nada de Star Wars, la Guía del autoestopista ni Tron.

Pendiente: Modo Espejo, final verdadero y niveles 2–5.
