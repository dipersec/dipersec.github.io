// audio.js — Sonido sintetizado con Web Audio (original, sin archivos). Buses separados: música, efectos e interfaz.
// Los efectos repetidos varían su tono ±7 % y las partículas suben un semitono por recogida seguida.
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class Sound {
  constructor() { this.ctx = null; this.muted = false; this.vol = 0.8; this.music = 'silencio'; this.nextNote = 0; this.step = 0; this.musicFast = false; }

  init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : this.vol;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 0.85; this.sfxBus.connect(this.master);
    this.musBus = ctx.createGain(); this.musBus.gain.value = 0.3; this.musBus.connect(this.master);
    this.uiBus = ctx.createGain(); this.uiBus.gain.value = 0.6; this.uiBus.connect(this.master);
    const delay = ctx.createDelay(1); delay.delayTime.value = 0.28;
    const fb = ctx.createGain(); fb.gain.value = 0.3; const wet = ctx.createGain(); wet.gain.value = 0.3;
    delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(this.master);
    this.echo = delay;
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    // ambiente: viento del desierto mineral y rumor de la reconfiguración en la huida
    this.hum = this.loopNoise('bandpass', 380, 0.03);
    this.voidRumble = this.loopNoise('lowpass', 90, 0);
  }
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); }
  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol, this.ctx.currentTime, 0.05); }
  setVolume(v) { this.vol = 0.8 * v; if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol, this.ctx.currentTime, 0.05); }
  loopNoise(type, freq, gain) {
    const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(this.master); src.start();
    return { g, f };
  }

  tone(freq, dur, { type = 'sine', vol = 0.2, at = 0, attack = 0.005, slide = 0, echo = false, bus } = {}) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || this.sfxBus); if (echo) g.connect(this.echo);
    o.start(t); o.stop(t + dur + 0.05);
  }
  burst(dur, { type = 'bandpass', freq = 1800, q = 1, vol = 0.25, at = 0, slide = 0 } = {}) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + at, s = ctx.createBufferSource(); s.buffer = this.noise;
    s.playbackRate.value = 0.85 + Math.random() * 0.3;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxBus);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  sfx(name) {
    if (!this.ctx) return;
    const v = 0.93 + Math.random() * 0.14; // variación de tono ±7 %
    switch (name) {
      case 'paso': this.burst(0.04, { freq: 2600 * v, q: 3, vol: 0.06 }); break;
      case 'salto': this.tone(330 * v, 0.16, { type: 'square', vol: 0.06, slide: 2 }); break;
      case 'caida': this.burst(0.09, { type: 'lowpass', freq: 520 * v, vol: 0.22 }); break;
      case 'caida_fuerte': this.burst(0.2, { type: 'lowpass', freq: 340 * v, vol: 0.4 }); this.tone(70 * v, 0.25, { vol: 0.2, slide: 0.6 }); break;
      case 'giro': this.burst(0.32, { type: 'bandpass', freq: 900 * v, q: 2, slide: 3, vol: 0.18 }); this.tone(520 * v, 0.3, { type: 'triangle', vol: 0.04, slide: 1.8 }); break;
      case 'caja': this.burst(0.12, { type: 'highpass', freq: 1600 * v, vol: 0.25 }); this.tone(180 * v, 0.1, { type: 'square', vol: 0.06, slide: 0.5 }); break;
      case 'rebote': this.tone(260 * v, 0.22, { type: 'sine', vol: 0.16, slide: 2.6 }); break;
      case 'cristal_raja': this.burst(0.1, { type: 'highpass', freq: 4000, vol: 0.15 }); this.tone(2400 * v, 0.12, { vol: 0.05 }); break;
      case 'cristal': this.burst(0.35, { type: 'highpass', freq: 3500, vol: 0.22 }); [2093, 2637, 3136].forEach((f, i) => this.tone(f * v, 0.35, { vol: 0.05, at: i * 0.04 })); break;
      case 'tnt': this.tone(1320, 0.09, { type: 'square', vol: 0.08 }); break;
      case 'explosion': this.burst(1.0, { type: 'lowpass', freq: 1400, slide: 0.08, vol: 0.7 }); this.tone(55, 0.9, { vol: 0.35, slide: 0.5 }); break;
      case 'bicho': this.tone(900 * v, 0.08, { type: 'square', vol: 0.07, slide: 0.3 }); this.burst(0.08, { freq: 3000, q: 6, vol: 0.12 }); break;
      case 'copia': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.07, at: i * 0.05, echo: true })); break;
      case 'copia_rompe': this.burst(0.25, { type: 'highpass', freq: 2500, vol: 0.25 }); this.tone(400, 0.3, { type: 'square', vol: 0.06, slide: 0.4 }); break;
      case 'vida': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.18, { type: 'square', vol: 0.05, at: i * 0.07, bus: this.uiBus })); break;
      case 'muerte': this.tone(600, 0.5, { type: 'triangle', vol: 0.1, slide: 0.2 }); this.burst(0.08, { freq: 1800, q: 4, vol: 0.18, at: 0.45 }); break;
      case 'checkpoint': [784, 988, 1175].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.07, at: i * 0.08, echo: true })); break;
      case 'pagina': [659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.4, { vol: 0.07, at: i * 0.09, echo: true, bus: this.uiBus })); break;
      case 'guia': this.tone(1200, 0.05, { type: 'square', vol: 0.03, bus: this.uiBus }); this.tone(1600, 0.05, { type: 'square', vol: 0.03, at: 0.05, bus: this.uiBus }); break;
      case 'crujido': this.burst(0.1, { type: 'highpass', freq: 2200, vol: 0.12 }); break;
      case 'placa': this.burst(0.3, { type: 'lowpass', freq: 400, vol: 0.25 }); break;
      case 'dron': this.tone(180, 1.2, { type: 'sawtooth', vol: 0.03, attack: 0.2 }); this.tone(184, 1.2, { type: 'sawtooth', vol: 0.03, attack: 0.2 }); break;
      case 'sello': this.burst(0.15, { type: 'lowpass', freq: 600, vol: 0.4 }); this.tone(110, 0.2, { vol: 0.2, slide: 0.6 }); break;
      case 'papel': this.burst(0.3, { type: 'bandpass', freq: 3000 * v, q: 1, vol: 0.1, slide: 0.5 }); break;
      case 'jefe_golpe': this.tone(150, 0.4, { type: 'square', vol: 0.12, slide: 0.5 }); this.burst(0.3, { type: 'lowpass', freq: 800, vol: 0.4 }); break;
      case 'aturdido': [880, 740, 880, 740].forEach((f, i) => this.tone(f, 0.12, { type: 'triangle', vol: 0.05, at: i * 0.1 })); break;
      case 'burbuja': this.tone(700 * v, 0.12, { vol: 0.05, slide: 1.8 }); break;
      case 'vacio': this.burst(1.2, { type: 'lowpass', freq: 200, slide: 0.5, vol: 0.4 }); break;
      case 'tip': this.tone(1040, 0.06, { type: 'sine', vol: 0.04, bus: this.uiBus }); this.tone(1560, 0.08, { type: 'sine', vol: 0.035, at: 0.06, bus: this.uiBus }); break;
      case 'seccion': [523, 784, 1046].forEach((f, i) => this.tone(f, 0.5, { type: 'sine', vol: 0.05, at: i * 0.1, echo: true, bus: this.uiBus })); break;
      case 'cri': this.tone(2200 * v, 0.05, { type: 'square', vol: 0.03, slide: 1.4 }); break;
      case 'robo': [1400, 1800, 1200].forEach((f, i) => this.tone(f * v, 0.06, { type: 'square', vol: 0.04, at: i * 0.05 })); break;
      case 'pieza': [784, 1046, 1318].forEach((f, i) => this.tone(f, 0.22, { type: 'triangle', vol: 0.07, at: i * 0.06 })); this.burst(0.08, { type: 'highpass', freq: 5000, vol: 0.1 }); break;
      case 'pieza_suelta': this.tone(600, 0.2, { type: 'triangle', vol: 0.06, slide: 1.6 }); break;
      case 'clang': this.tone(820 * v, 0.25, { type: 'square', vol: 0.05, slide: 0.98 }); this.tone(1230 * v, 0.2, { type: 'triangle', vol: 0.04 }); break;
      case 'alerta': this.tone(1320, 0.08, { type: 'square', vol: 0.06 }); this.tone(1760, 0.1, { type: 'square', vol: 0.06, at: 0.1 }); break;
      case 'embestida': this.burst(0.4, { type: 'bandpass', freq: 600, q: 1, slide: 3, vol: 0.3 }); break;
      case 'picada': this.tone(900, 0.5, { type: 'sawtooth', vol: 0.04, slide: 0.3 }); break;
      case 'golpe_suelo': this.burst(0.2, { type: 'lowpass', freq: 400, vol: 0.35 }); this.tone(80, 0.2, { vol: 0.15, slide: 0.6 }); break;
      case 'centinela_cae': this.burst(0.35, { type: 'lowpass', freq: 900, vol: 0.35 }); [440, 330, 220].forEach((f, i) => this.tone(f, 0.15, { type: 'square', vol: 0.04, at: i * 0.07 })); break;
      case 'onda': this.tone(110, 0.6, { type: 'sine', vol: 0.18, slide: 0.5 }); this.tone(660, 0.5, { type: 'sine', vol: 0.04, slide: 1.5, echo: true }); break;
      case 'eco': [392, 466, 523].forEach((f, i) => this.tone(f, 0.6, { type: 'sine', vol: 0.04, at: i * 0.12, echo: true })); break;
      case 'eco_fin': this.tone(523, 0.4, { type: 'sine', vol: 0.03, slide: 0.5, echo: true }); break;
      case 'puerta': this.burst(0.25, { type: 'bandpass', freq: 500, q: 2, vol: 0.18, slide: 1.6 }); break;
      case 'puerta_aviso': this.tone(980, 0.06, { type: 'square', vol: 0.03 }); this.tone(980, 0.06, { type: 'square', vol: 0.03, at: 0.12 }); break;
      case 'temporal': this.tone(700, 0.15, { type: 'sine', vol: 0.03, slide: 0.5 }); break;
      case 'recordar': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.5, { type: 'sine', vol: 0.06, at: i * 0.04, echo: true })); this.burst(0.5, { type: 'highpass', freq: 6000, vol: 0.06, slide: 0.5 }); break;
      case 'recordar_grande': [392, 523, 659, 784, 1046, 1318, 1568].forEach((f, i) => this.tone(f, 0.9, { type: 'sine', vol: 0.06, at: i * 0.05, echo: true })); this.tone(98, 1.2, { type: 'triangle', vol: 0.12 }); break;
      case 'recordar_vacio': this.tone(330, 0.15, { type: 'sine', vol: 0.04, slide: 0.8, bus: this.uiBus }); break;
      case 'memoria_tic': this.tone(1568, 0.05, { type: 'sine', vol: 0.04, bus: this.uiBus }); break;
      case 'memoria_fin': this.tone(784, 0.5, { type: 'sine', vol: 0.05, slide: 0.5, echo: true }); break;
      case 'concha': [659, 831, 988, 1318].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.07, at: i * 0.05, echo: true })); break;
      case 'concha_rompe': this.burst(0.25, { type: 'highpass', freq: 3000, vol: 0.25 }); this.tone(500, 0.3, { type: 'triangle', vol: 0.07, slide: 0.4 }); break;
      case 'registro': [659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.4, { vol: 0.07, at: i * 0.09, echo: true, bus: this.uiBus })); break;
      case 'capsula': [880, 0, 880, 1175].forEach((f, i) => f && this.tone(f, 0.08, { type: 'square', vol: 0.04, at: i * 0.09, bus: this.uiBus })); break;
      case 'tilo_hola': this.tone(500, 0.12, { type: 'sine', vol: 0.08, slide: 1.8 }); this.tone(700, 0.15, { type: 'sine', vol: 0.08, slide: 1.6, at: 0.14 }); break;
      case 'maquina': this.burst(1.2, { type: 'lowpass', freq: 300, vol: 0.3 }); [110, 0, 147, 0, 196].forEach((f, i) => f && this.tone(f, 0.2, { type: 'square', vol: 0.06, at: i * 0.15 })); break;
      case 'cristal_llama': [1318, 1568, 2093].forEach((f, i) => this.tone(f, 0.8, { type: 'sine', vol: 0.05, at: i * 0.15, echo: true })); break;
      case 'nucleo': this.tone(110, 1.4, { type: 'sawtooth', vol: 0.05, slide: 4, attack: 0.3 }); break;
      case 'guardian_despierta': this.burst(1.6, { type: 'lowpass', freq: 200, vol: 0.5 }); this.tone(55, 1.6, { type: 'sawtooth', vol: 0.08, slide: 2, attack: 0.4 }); break;
      case 'carga': this.tone(220, 0.75, { type: 'sawtooth', vol: 0.05, slide: 3, attack: 0.1 }); break;
      case 'golpe_guardian': this.burst(0.6, { type: 'lowpass', freq: 500, vol: 0.6 }); this.tone(60, 0.6, { vol: 0.3, slide: 0.5 }); break;
      case 'celula': this.tone(660, 0.4, { type: 'sine', vol: 0.06, slide: 1.5 }); break;
      case 'celula_cae': this.tone(1320, 0.3, { type: 'sine', vol: 0.06, echo: true }); break;
      case 'devolver': this.tone(880, 0.3, { type: 'square', vol: 0.06, slide: 2 }); this.burst(0.2, { type: 'bandpass', freq: 3000, vol: 0.15 }); break;
      case 'orden': this.tone(330, 0.12, { type: 'square', vol: 0.06 }); this.tone(262, 0.2, { type: 'square', vol: 0.06, at: 0.13 }); break;
      case 'apagado': [440, 349, 262, 196, 131].forEach((f, i) => this.tone(f, 0.4, { type: 'triangle', vol: 0.07, at: i * 0.18 })); break;
      case 'reconfigura': this.burst(1.4, { type: 'bandpass', freq: 900, q: 0.7, slide: 0.3, vol: 0.4 }); this.tone(70, 1.2, { type: 'sawtooth', vol: 0.06, slide: 0.6 }); break;
      case 'lunex': [262, 330, 392, 494].forEach((f, i) => this.tone(f, 2.6, { type: 'sine', vol: 0.05, at: i * 0.2, attack: 0.4, echo: true })); this.tone(65, 3, { type: 'triangle', vol: 0.1, attack: 0.6 }); break;
      case 'senal': [523, 659, 784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 1.6, { type: 'sine', vol: 0.06, at: i * 0.12, echo: true })); break;
      case 'gravedad': this.tone(220 * v, 0.45, { type: 'sine', vol: 0.08, slide: 2.2, echo: true }); this.tone(330 * v, 0.45, { type: 'triangle', vol: 0.04, slide: 0.5 }); break;
      case 'cascada': this.burst(0.8, { type: 'bandpass', freq: 1400, q: 0.6, slide: 1.8, vol: 0.18 }); break;
      case 'interruptor': [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.3, { type: 'square', vol: 0.05, at: i * 0.06 })); this.burst(0.15, { type: 'lowpass', freq: 600, vol: 0.3 }); break;
      case 'medusa': this.tone(300 * v, 0.35, { type: 'sine', vol: 0.12, slide: 2.4 }); this.tone(600 * v, 0.2, { type: 'sine', vol: 0.05, slide: 1.8, at: 0.05 }); break;
      case 'nodo_bien': [659, 880, 1175, 1568].forEach((f, i) => this.tone(f, 0.4, { type: 'triangle', vol: 0.07, at: i * 0.05, echo: true })); break;
      case 'nodo_mal': this.tone(180, 0.35, { type: 'sawtooth', vol: 0.08, slide: 0.6 }); this.burst(0.2, { type: 'highpass', freq: 3000, vol: 0.2 }); break;
      case 'aviso_inversion': [880, 0, 880, 0, 1175].forEach((f, i) => f && this.tone(f, 0.12, { type: 'square', vol: 0.05, at: i * 0.18, bus: this.uiBus })); break;
      case 'ventana': [523, 784, 1046].forEach((f, i) => this.tone(f, 0.6, { type: 'sine', vol: 0.07, at: i * 0.08, echo: true })); break;
      case 'paquete': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.5, { type: 'triangle', vol: 0.06, at: i * 0.08, echo: true })); break;
    }
  }
  // escalera de tono: sube un semitono por fragmento recogido seguido
  fragment(n) { if (this.ctx) { this.tone(NOTE(84 + n), 0.09, { type: 'square', vol: 0.045 }); this.tone(NOTE(91 + n), 0.07, { type: 'sine', vol: 0.03, at: 0.03 }); } }
  blip(who) {
    if (!this.ctx) return;
    const r = Math.random();
    const f = { dip: 500, tilo: 760, lunex: 220, guardian: 140, capsula: 980, registro: 1240, constructor: 620, arquitecto: 300 }[who] || 600;
    const type = { tilo: 'sine', lunex: 'triangle', guardian: 'sawtooth', constructor: 'square', arquitecto: 'triangle' }[who] || 'square';
    this.tone(f * (0.9 + r * 0.25), who === 'lunex' ? 0.09 : 0.045, { type, vol: who === 'tilo' ? 0.05 : 0.025, slide: who === 'tilo' ? 1.3 : 0, echo: who === 'lunex', bus: this.uiBus });
  }

  // ---------- música original, programada con el reloj de audio ----------
  update(dt, amb) {
    if (!this.ctx) return;
    this.music = amb.music;
    this.voidRumble.g.gain.setTargetAtTime(amb.chase ? 0.18 : 0, this.ctx.currentTime, 0.3);
    const now = this.ctx.currentTime;
    if (this.nextNote < now) this.nextNote = now + 0.05;
    while (this.nextNote < now + 0.12) this.scheduleStep(this.nextNote, amb.fast);
  }
  scheduleStep(t, fast) {
    const at = t - this.ctx.currentTime, s = this.step++, m = this.music;
    const play = (n, dur, o = {}) => this.tone(NOTE(n), dur, { bus: this.musBus, at, ...o });
    const hat = (vol = 0.04) => { if (!this.ctx) return; this.burst(0.03, { type: 'highpass', freq: 7000, vol, at }); };
    let len = 0.125;
    if (m === 'titulo' || m === 'fin') {
      len = 0.32;
      const ch = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]][(s >> 3) % 4];
      play(ch[s % 4] + 12, 0.6, { type: 'triangle', vol: 0.05, attack: 0.02, echo: true });
      if (s % 8 === 0) play(ch[0] - 12, 2.4, { type: 'sine', vol: 0.1, attack: 0.05 });
    } else if (m === 'nivel') {
      len = fast ? 0.095 : 0.125;   // ~120 bpm en semicorcheas
      const bars = [[50, 57, 54, 57], [47, 54, 50, 54], [43, 50, 47, 50], [45, 52, 49, 52]];
      const bar = bars[(s >> 4) % 4];
      if (s % 2 === 0) play(bar[(s >> 1) % 4], 0.14, { type: 'square', vol: 0.05 });
      if (s % 4 === 2) hat(); if (s % 8 === 0) this.burst(0.08, { type: 'lowpass', freq: 160, vol: 0.35, at });
      const mel = [74, 0, 78, 81, 0, 78, 76, 0, 74, 76, 78, 0, 81, 83, 81, 0];
      const n = mel[s % 16]; if (n && (s >> 4) % 2 === 1) play(n - ((s >> 5) % 2 ? 3 : 0), 0.14, { type: 'triangle', vol: 0.05, echo: s % 4 === 0 });
      if (s % 32 === 0) play(bar[0] + 24, 1.6, { type: 'sine', vol: 0.03, attack: 0.2, echo: true });
    } else if (m === 'ruinas') {
      len = fast ? 0.1 : 0.14;
      const bar = [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 55]][(s >> 4) % 4];
      if (s % 4 === 0) play(bar[0], 0.5, { type: 'triangle', vol: 0.07 });
      if (s % 2 === 1) play(bar[(s >> 1) % 4] + 24, 0.25, { type: 'sine', vol: 0.035, echo: true });
      if (s % 8 === 4) this.burst(0.06, { type: 'lowpass', freq: 180, vol: 0.25, at });
      if (s % 4 === 2) hat(0.025);
    } else if (m === 'vertice') {
      // aérea y luminosa (lidio en re): arpegio que sube y bajo suave
      len = fast ? 0.1 : 0.13;
      const bar = [[50, 57, 64, 68], [48, 55, 62, 66], [52, 59, 66, 69], [47, 54, 61, 66]][(s >> 4) % 4];
      if (s % 4 === 0) play(bar[0], 0.6, { type: 'triangle', vol: 0.07 });
      play(bar[s % 4] + 12 + ((s >> 2) % 2) * 12, 0.18, { type: 'sine', vol: 0.035, echo: s % 8 === 0 });
      if (s % 8 === 4) hat(0.025); if (s % 16 === 0) this.burst(0.08, { type: 'lowpass', freq: 180, vol: 0.25, at });
      const mel = [0, 81, 0, 0, 78, 0, 76, 0, 0, 74, 0, 76, 78, 0, 0, 0];
      if ((s >> 4) % 2 === 1 && mel[s % 16]) play(mel[s % 16], 0.3, { type: 'triangle', vol: 0.045, echo: true });
    } else if (m === 'leyes') {
      len = fast ? 0.11 : 0.15;
      const bar = [[43, 50, 55, 58], [41, 48, 53, 56], [46, 53, 58, 61], [45, 52, 57, 60]][(s >> 4) % 4];
      if (s % 4 === 0) play(bar[0], 0.7, { type: 'sawtooth', vol: 0.04 });
      if (s % 2 === 0) play(bar[(s >> 1) % 4] + 24, 0.2, { type: 'square', vol: 0.025, echo: true });
      if (s % 8 === 0) this.burst(0.1, { type: 'lowpass', freq: 160, vol: 0.35, at });
      if (s % 4 === 2) hat(0.03);
    } else if (m === 'persecucion') {
      len = fast ? 0.085 : 0.1;
      play([45, 45, 57, 45, 48, 45, 57, 47][s % 8], 0.09, { type: 'sawtooth', vol: 0.05 });
      if (s % 2 === 0) hat(0.05); if (s % 4 === 0) this.burst(0.08, { type: 'lowpass', freq: 150, vol: 0.4, at });
      if (s % 8 === 4) play([69, 72, 71, 68][(s >> 3) % 4], 0.3, { type: 'square', vol: 0.035 });
    } else if (m === 'jefe') {
      len = fast ? 0.1 : 0.13;
      play([38, 38, 50, 38, 41, 38, 50, 40][s % 8], 0.12, { type: 'sawtooth', vol: 0.06 });
      if (s % 4 === 0) this.burst(0.1, { type: 'lowpass', freq: 140, vol: 0.45, at });
      if (s % 4 === 2) hat(0.05);
      if (s % 16 === 0) play([62, 65, 64, 60][(s >> 4) % 4], 0.9, { type: 'square', vol: 0.035 });
    } else if (m === 'apertura') {
      len = 0.4;
      if (s % 2 === 0) play([67, 71, 74, 72, 69, 72][(s >> 1) % 6], 0.7, { type: 'sine', vol: 0.05, echo: true });
      if (s % 8 === 0) play(43, 3, { type: 'triangle', vol: 0.06 });
    } else len = 0.25;
    this.nextNote = t + len;
  }
}
