// audio.js — Sonido sintetizado con Web Audio (sin archivos). El silencio también es diseño:
// la música no suena todo el tiempo y el patrón intenta repetirse sin lograrlo del todo.
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class Sound {
  constructor() { this.ctx = null; this.muted = false; this.music = 'silencio'; this.nextNote = 0; this.step = 0; this.melodyVar = 0; }

  async init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 0.9; this.sfxBus.connect(this.master);
    this.musBus = ctx.createGain(); this.musBus.gain.value = 0.32; this.musBus.connect(this.master);
    // eco suave para la música y los cristales
    const delay = ctx.createDelay(1); delay.delayTime.value = 0.33;
    const fb = ctx.createGain(); fb.gain.value = 0.35; const wet = ctx.createGain(); wet.gain.value = 0.4;
    delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(this.master);
    this.echo = delay;
    // ruido base
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    // viento (ruido filtrado en bucle)
    this.wind = this.loopNoise('lowpass', 420, 0);
    // zumbido grave de máquinas / cápsula
    this.drone = this.loopOsc('sawtooth', 46, 'lowpass', 160, 0);
    // vibración de cristales cercanos
    this.hum = this.loopOsc('sine', 523.25, null, 0, 0);
    // alarma (dos tonos)
    this.alarm = this.loopOsc('square', 660, 'lowpass', 1400, 0);
  }
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); }
  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, this.ctx.currentTime, 0.05); }

  loopNoise(type, freq, gain) {
    const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(this.master); src.start();
    return { g, f };
  }
  loopOsc(type, freq, ftype, ffreq, gain) {
    const ctx = this.ctx, o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = gain;
    if (ftype) { const f = ctx.createBiquadFilter(); f.type = ftype; f.frequency.value = ffreq; o.connect(f); f.connect(g); } else o.connect(g);
    g.connect(this.master); o.start();
    return { o, g };
  }
  level(node, v, tc = 0.3) { if (this.ctx) node.g.gain.setTargetAtTime(v, this.ctx.currentTime, tc); }

  // ---------- efectos ----------
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
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxBus);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  sfx(name) {
    if (!this.ctx) return;
    const r = Math.random();
    switch (name) {
      case 'paso': this.burst(0.05, { freq: 2200 + r * 900, q: 2.5, vol: 0.13 }); break;
      case 'salto': this.tone(300 * (0.93 + r * 0.14), 0.14, { type: 'triangle', vol: 0.09, slide: 1.8 }); break;
      case 'caida': this.burst(0.11, { type: 'lowpass', freq: 460 + r * 120, vol: 0.24 }); break;
      case 'caida_fuerte': this.burst(0.22, { type: 'lowpass', freq: 320 + r * 80, vol: 0.4 }); this.tone(70 * (0.95 + r * 0.1), 0.25, { vol: 0.18, slide: 0.6 }); break;
      case 'empujar': this.burst(0.22, { type: 'lowpass', freq: 260 + r * 80, vol: 0.18 }); break;
      case 'interactuar': this.tone(880, 0.07, { type: 'square', vol: 0.05 }); this.tone(1320, 0.08, { type: 'square', vol: 0.04, at: 0.06 }); break;
      case 'cristal': [1318, 1975, 2637].forEach((f, i) => this.tone(f, 1.6, { vol: 0.07, at: i * 0.04, echo: true })); break;
      case 'voz_lejana': for (let i = 0; i < 7; i++) this.tone(180 + Math.random() * 120, 0.5, { type: 'triangle', vol: 0.03, at: i * 0.22, attack: 0.15, echo: true }); break;
      case 'recuerdo': [523, 659, 784, 988, 1175].forEach((f, i) => this.tone(f, 2.2, { vol: 0.06, at: i * 0.12, attack: 0.3, echo: true })); break;
      case 'proyectar': this.tone(660, 0.5, { vol: 0.08, slide: 1.5, attack: 0.05, echo: true }); this.burst(0.4, { type: 'highpass', freq: 3000, vol: 0.06 }); break;
      case 'nada': this.tone(330, 0.25, { type: 'triangle', vol: 0.06, slide: 0.7 }); break;
      case 'reconstruir': [392, 523, 659, 784].forEach((f, i) => this.tone(f, 1.4, { vol: 0.07, at: 0.1 + i * 0.09, attack: 0.2, echo: true })); this.burst(1.0, { type: 'bandpass', freq: 600, slide: 4, vol: 0.12 }); break;
      case 'placa': this.burst(0.25, { type: 'highpass', freq: 1400, vol: 0.2 }); this.burst(0.3, { type: 'lowpass', freq: 300, vol: 0.2, at: 0.05 }); break;
      case 'crujido': this.burst(0.08, { type: 'highpass', freq: 2500, vol: 0.12 }); break;
      case 'dano': this.tone(220, 0.25, { type: 'square', vol: 0.09, slide: 0.5 }); break;
      case 'pulso': this.tone(140, 0.4, { type: 'sawtooth', vol: 0.07, slide: 2 }); break;
      case 'despertar': this.tone(90, 0.6, { type: 'sawtooth', vol: 0.08, slide: 3 }); break;
      case 'puerta': this.burst(0.9, { type: 'lowpass', freq: 200, slide: 2, vol: 0.3 }); this.tone(55, 0.9, { type: 'sawtooth', vol: 0.06 }); break;
      case 'checkpoint': this.tone(784, 0.5, { vol: 0.07, echo: true }); this.tone(1175, 0.6, { vol: 0.06, at: 0.1, echo: true }); break;
      case 'secreto': [659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.6, { vol: 0.06, at: i * 0.1, echo: true })); break;
      case 'pilon': this.tone(196, 1.6, { vol: 0.12, attack: 0.05 }); this.tone(392, 1.6, { vol: 0.06, attack: 0.3, echo: true }); break;
      case 'romper': this.burst(0.5, { type: 'highpass', freq: 3500, vol: 0.18 }); [2093, 2637, 3136].forEach((f, i) => this.tone(f, 0.5, { vol: 0.05, at: i * 0.05 })); break;
      case 'impacto': this.burst(1.6, { type: 'lowpass', freq: 900, slide: 0.1, vol: 0.6 }); this.tone(60, 1.4, { vol: 0.3, slide: 0.5 }); break;
      case 'metal': this.burst(0.06, { type: 'bandpass', freq: 3000 + r * 3000, q: 8, vol: 0.12 }); this.tone(900 + r * 900, 0.15, { type: 'square', vol: 0.03 }); break;
      case 'pantalla': this.tone(1760, 0.04, { type: 'square', vol: 0.03 }); break;
      case 'onda': this.tone(110, 2.4, { vol: 0.18, slide: 0.5, attack: 0.02 }); [440, 554, 659, 880].forEach((f, i) => this.tone(f, 2.2, { vol: 0.05, at: i * 0.15, echo: true })); this.burst(2, { type: 'bandpass', freq: 400, slide: 6, vol: 0.15 }); break;
      case 'ascensor': this.tone(70, 2.5, { type: 'sawtooth', vol: 0.08, slide: 0.6, attack: 0.3 }); break;
      case 'energia': [523, 784, 1046].forEach((f, i) => this.tone(f, 0.4, { type: 'triangle', vol: 0.07, at: i * 0.07 })); break;
      case 'senal': [196, 294, 392, 587, 784].forEach((f, i) => this.tone(f, 3.5, { vol: 0.08, at: i * 0.25, attack: 0.6, echo: true })); break;
      case 'lunex': for (let i = 0; i < 8; i++) this.tone([880, 1175, 988, 1319][i % 4], 0.07, { type: 'square', vol: 0.035, at: i * 0.09 }); break;
      case 'fragmenta': this.burst(0.6, { type: 'bandpass', freq: 2000, q: 4, slide: 0.2, vol: 0.15 }); break;
    }
  }
  // voz por carácter en los diálogos
  blip(who) {
    if (!this.ctx) return;
    const r = Math.random();
    if (who === 'tilo') this.tone(520 + r * 260, 0.05, { type: 'triangle', vol: 0.05 });
    else if (who === 'estacion') this.tone(392, 0.06, { type: 'sine', vol: 0.05 });
    else if (who === 'lunex') this.tone([660, 990, 1320][Math.floor(r * 3)], 0.04, { type: 'square', vol: 0.03 });
    else if (who === 'pantalla') this.tone(1200 + r * 400, 0.025, { type: 'square', vol: 0.02 });
    else this.tone(300 + r * 80, 0.04, { type: 'triangle', vol: 0.025 });
  }

  // ---------- ambiente + música (programada con el reloj de audio) ----------
  update(dt, amb) {
    if (!this.ctx) return;
    this.level(this.wind, amb.wind * 0.22, 0.6);
    this.wind.f.frequency.setTargetAtTime(300 + amb.wind * 500, this.ctx.currentTime, 0.8);
    this.level(this.drone, amb.drone * 0.12, 0.4);
    this.level(this.hum, amb.hum * 0.05, 0.15);
    this.hum.o.frequency.setTargetAtTime(523.25 + Math.sin(this.ctx.currentTime * 7) * 6, this.ctx.currentTime, 0.05);
    this.level(this.alarm, amb.alarm * 0.04, 0.05);
    if (amb.alarm > 0) this.alarm.o.frequency.setValueAtTime(Math.floor(this.ctx.currentTime * 2.2) % 2 ? 660 : 494, this.ctx.currentTime);
    this.music = amb.music; this.musicVar = amb.musicVar || 0;
    const now = this.ctx.currentTime;
    if (this.nextNote < now) this.nextNote = now + 0.05;
    while (this.nextNote < now + 0.15) this.scheduleStep(this.nextNote);
  }
  scheduleStep(t) {
    const at = t - this.ctx.currentTime, s = this.step++, m = this.music, v = this.musicVar;
    const play = (n, dur, o = {}) => this.tone(NOTE(n), dur, { bus: this.musBus, at, ...o });
    let stepLen = 0.5;
    if (m === 'superficie') {
      // una frase de tres notas cada cierto tiempo, siempre un poco distinta
      stepLen = 0.6;
      const bar = s % 16;
      if (bar === 0) this.melodyVar = Math.floor(Math.random() * 3);
      const phrase = [[69, 72, 76], [69, 72, 74], [69, 71, 76]][this.melodyVar];
      if (bar < 3 && Math.random() > 0.08) play(phrase[bar] - 12 * (bar === 2 && Math.random() < 0.3), 2.2, { vol: 0.05, attack: 0.4, echo: true });
    } else if (m === 'santuario') {
      // pocas notas; cambia con cada anillo completado
      stepLen = 0.55;
      const sets = [[57, 60, 64, 62], [57, 60, 64, 67], [57, 62, 64, 69, 67], [57, 60, 64, 67, 71, 69]];
      const n = sets[Math.min(v, 3)];
      if (s % 2 === 0) play(n[(s / 2) % n.length] + (Math.random() < 0.12 ? 2 : 0), 1.4, { vol: 0.08, attack: 0.03, echo: true });
      if (s % 8 === 0) play(45, 4, { vol: 0.06, type: 'triangle', attack: 0.5 });
    } else if (m === 'estacion') {
      stepLen = 0.25;
      if (s % 4 === 0 || Math.random() < 0.1) play([72, 79, 76, 74][(s / 4 | 0) % 4] + (Math.random() < 0.15 ? 1 : 0), 0.18, { type: 'square', vol: 0.025 });
      if (s % 16 === 0) play(36, 3.5, { type: 'sawtooth', vol: 0.03, attack: 0.6 });
    } else if (m === 'lunex') {
      stepLen = 0.125;
      play([81, 76, 72, 69, 81, 77, 72, 69][s % 8], 0.08, { type: 'square', vol: 0.03 });
      if (s % 8 === 0) play(45, 0.9, { type: 'sawtooth', vol: 0.05 });
    } else if (m === 'huida') {
      stepLen = 0.18;
      play(s % 2 ? 45 : 57, 0.15, { type: 'sawtooth', vol: 0.05 });
      if (s % 4 === 0) play([69, 72, 71, 68][(s / 4 | 0) % 4], 0.3, { type: 'square', vol: 0.03 });
    } else if (m === 'final') {
      stepLen = 0.8;
      const n = [57, 64, 69, 71, 72, 71, 69, 64];
      play(n[s % 8], 2.5, { vol: 0.06, attack: 0.5, echo: true });
    }
    this.nextNote = t + stepLen;
  }
}
