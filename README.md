# DIP · El último recuerdo del universo

Plataformas 3D de acción en corredor, al estilo clásico de cajas y saltos, con cámara detrás de DIP. La fuente de verdad narrativa es el *Documento maestro*. Está hecho el **Mundo 1: Nácar, el planeta de la caída**, completo y jugable de principio a fin. Los otros seis mundos tienen la estructura preparada y se muestran como "próximamente".

## Requisitos y cómo jugar
- Un navegador con WebGL (Chrome, Edge, Firefox o Safari recientes, en computador o celular).
- Sirve la carpeta con cualquier servidor estático, por ejemplo `python3 -m http.server`, y abre `index.html`. También funciona en GitHub Pages.
- three.js (`three@0.160.0`) se carga desde jsdelivr. Todo lo demás se genera por código: el sprite, el mundo, las texturas y el sonido. No hay paso de compilación.

| Acción | Teclado | Táctil | Mando |
|---|---|---|---|
| Moverse | WASD o flechas | joystick (pulgar en la mitad izquierda) | stick o cruceta |
| Saltar (mantener = más alto) | Espacio, K o Z | Saltar | A |
| Girar | X, J, Shift o E | Girar | X / B |
| Recordar (junto a un ancla) | C, Q o L | Recordar (aparece solo cuando sirve) | Y |
| Pausa · sonido · volver al punto de control | Esc o P · M · R (en pausa) | II | Start |

**Menús.** En el título puedes elegir *Continuar* (si hay partida guardada), *Nueva partida*, *Contrarreloj* (después de terminar Nácar) y *Ajustes*. En la pausa puedes volver al punto de control, ir al menú, abrir los ajustes (volumen y **reducir efectos visuales intensos**) y leer los registros encontrados.

**URLs de prueba**
- `?seccion=1..6` empieza en una fase, con todo lo anterior resuelto.
- `?contrarreloj` activa el modo contrarreloj.
- `?debug` (o la tecla `` ` ``) abre el panel de afinado en vivo, que también mide fps y draw calls.

## Nácar, fase por fase
1. **El cráter del impacto.** DIP despierta junto a su cápsula ("Aterrizaje completado. Daños: sí."). Se aprenden el movimiento, el salto, el giro, las cajas, las placas frágiles y el fragmento de vidrio negro. Los escarabajos de polvo todavía no muerden.
2. **El jardín de Tilo.** Tilo come piedras y su recolector está descompuesto. Hay que llevarle 3 piezas: una está en lo alto (se llega con la caja de rebote), otra la lleva un escarabajo ladrón y la tercera está detrás de un cerco de cajas con TNT. Después vienen las recolectoras fuera de control, los ladrones de partículas y el suelo quebradizo.
3. **Las ruinas incompletas.** El primer cristal de memoria le da a DIP la habilidad **Recordar**: junto a un ancla, una plataforma incompleta se vuelve real durante 9 s, con temporizador visible. También aparecen los centinelas dormidos y un registro en una cornisa a la que solo se llega recordando.
4. **El santuario del eco.** Un eco repite los pasos de DIP con retraso, las esferas resonantes lanzan ondas que hay que saltar y hay plataformas temporales. Termina con el **puente del recuerdo** sobre 12 m de abismo.
5. **La estación de llegada.** Hay drones que bajan en picada y puertas que dicen lo contrario de lo que hacen. En el núcleo aparece el registro *"PASAJERO: DIP. ESTADO: PRESENTE. DESTINO: PENDIENTE DE CREACIÓN. FECHA DE LLEGADA: ANTERIOR AL VIAJE."* Ahí está el jefe, el **Guardián de la Estación**, con 7 golpes en 3 fases:
   - **Fase 1:** salta sus ondas y devuélvele sus células con el giro.
   - **Fase 2:** recuerda los escalones que faltan y písale la cabeza.
   - **Fase 3:** sus drones dudan con sus órdenes contradictorias; llévalos hasta él.

   Al final no se destruye: se desactiva.
6. **La señal de Lunex.** Es la huida: la estación se reconfigura detrás de DIP, la cámara lo mira de frente y la proyección de Lunex aparece en la pared ("No te odio, pequeño. Temo lo que puedas recordar."). Al llegar, Tilo confiesa que soñó con DIP antes de conocerlo, y se abre la ruta a Vértice.

**Coleccionables y ayuda.**
- Partículas: 100 dan una vida.
- Cajas para romper.
- 4 registros (humor y algo de filosofía).
- Conchas de nácar: cada una absorbe un golpe, y con 3 tienes 8 s de "Nácar pleno".
- Si mueres 5 veces en el mismo tramo, recibes una concha de regalo; con 10, aparece un punto de control extra.
- Volver a tener el control después de morir toma unos 1 s.

## Arquitectura
```
index.html               canvas + HUD + menús (título, pausa, ajustes) + controles táctiles
js/main.js               precarga, menús y bucle de paso fijo (60 Hz) con render interpolado
js/config.js             CONFIG de game feel: salto por altura y tiempo, coyote, buffer, cámara, juice
js/physics.js            AABB 3D por ejes, escalones y plataformas de un solo sentido
js/player.js             máquina de estados de DIP + capa del giro
js/input.js              teclado, joystick analógico, botones táctiles y mando
js/game.js               núcleo común: cajas, partículas, cámara, muertes, huida, guardado
js/memoria.js            sistema de recuerdos reutilizable (anclas → piezas que se materializan)
js/enemigos.js           escarabajos, barredores, centinelas y drones, ondas, eco, puertas, plataformas temporales
js/director.js           escenas como generadores (no bloquean el bucle)
js/guardado.js           guardado validado: mundo, punto de control, habilidades, registros y ajustes
js/world.js              render HD común (three.js): sólidos fusionados, instancing, sombras, cielo nacarado
js/hud.js                HUD, objetivo, temporizador del recuerdo, globos, diálogos y pantalla final
js/textures.js           texturas procedurales HD
js/audio.js              Web Audio sintetizado: música por zona, efectos y voces por personaje
js/sprites.js            sprite SNES de DIP (48 px) sin cambios de diseño
js/mundos/registro.js    los 7 mundos (solo los "listos" se juegan)
js/mundos/nacar/         nivel.js (datos), historia.js (escenas y textos), guardian.js (jefe), escena.js (paisaje y personajes)
```
- **Agregar un mundo** consiste en crear `js/mundos/<mundo>/` con las mismas cuatro piezas y marcarlo como `listo` en el registro. La física, la cámara, la memoria, los enemigos y el HUD no cambian.
- **Visual.** Solo DIP es pixel art. Tilo, el Guardián, Lunex y todo el mundo son 3D HD, con tone mapping ACES, sombras suaves, materiales nacarados iridiscentes y resolución adaptativa. La geometría estática se fusiona por material y lo lejano se recorta por distancia, así que hay entre 70 y 190 draw calls según la fase.
- **Nombres.** Son los exactos del documento: DIP, Lunex, Nácar, Vértice, Horalia, Lúmen, Miral, El Archivo y El Umbral.

## Probado y pendiente
- **Probado con simulación determinista en navegador sin interfaz:**
  - Mecánicas base: cajas, rebote (~5 m), TNT, escarabajos y ladrones.
  - Piezas de Tilo y reparación del recolector.
  - Recordar: activar, cruzar y que se acabe el tiempo.
  - Centinela: dormido, detecta, ataca, se recupera y se le pisa.
  - Ondas, eco, puertas y plataformas temporales.
  - Jefe completo (7 golpes).
  - Huida: un bot llega en ~17 s sin morir, con ~7 m de margen.
  - Final y guardado/continuar.
- **Pendiente:**
  - Medir fps en un celular real (en la simulación sin GPU no se puede).
  - Los mundos 2 a 7.
