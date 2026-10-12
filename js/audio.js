// audio.js — Sonido sintetizado con Web Audio (original, sin archivos). Buses separados: música, efectos e interfaz.
// Los efectos repetidos varían su tono ±7 % y los fragmentos suben un semitono por recogida seguida.
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class Sound {
  constructor() { this.ctx = null; this.muted = false; this.music = 'silencio'; this.nextNote = 0; this.step = 0; this.musicFast = false; }

  init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0.8;
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
    // ambiente: zumbido de la ciudad y rumor del vacío en la persecución
    this.hum = this.loopNoise('lowpass', 220, 0.03);
    this.voidRumble = this.loopNoise('lowpass', 90, 0);
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
      case 'paquete': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.5, { type: 'triangle', vol: 0.06, at: i * 0.08, echo: true })); break;
    }
  }
  // escalera de tono: sube un semitono por fragmento recogido seguido
  fragment(n) { if (this.ctx) { this.tone(NOTE(84 + n), 0.09, { type: 'square', vol: 0.045 }); this.tone(NOTE(91 + n), 0.07, { type: 'sine', vol: 0.03, at: 0.03 }); } }
  blip(who) {
    if (!this.ctx) return;
    const r = Math.random();
    const f = { dip: 500, guia: 900, dron: 300, copia: 380, inspector: 160 }[who] || 600;
    this.tone(f * (0.9 + r * 0.25), 0.045, { type: who === 'inspector' ? 'sawtooth' : 'square', vol: 0.025, bus: this.uiBus });
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
      const bars = [[48, 55, 52, 55], [45, 52, 48, 52], [41, 48, 45, 48], [43, 50, 47, 50]];
      const bar = bars[(s >> 4) % 4];
      if (s % 2 === 0) play(bar[(s >> 1) % 4], 0.14, { type: 'square', vol: 0.05 });
      if (s % 4 === 2) hat(); if (s % 8 === 0) this.burst(0.08, { type: 'lowpass', freq: 160, vol: 0.35, at });
      const mel = [72, 0, 76, 79, 0, 76, 74, 0, 72, 74, 76, 0, 79, 81, 79, 0];
      const n = mel[s % 16]; if (n && (s >> 4) % 2 === 1) play(n - ((s >> 5) % 2 ? 2 : 0), 0.12, { type: 'triangle', vol: 0.05 });
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
