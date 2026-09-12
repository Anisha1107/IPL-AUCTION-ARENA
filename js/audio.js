// Web Audio API Sound Effects Synthesizer for IPL Auction Arena
// Zero external sound file dependency ensures 100% offline & event reliability

class SoundFX {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound(forceState) {
    this.enabled = forceState !== undefined ? forceState : !this.enabled;
    return this.enabled;
  }

  // Crisp high-tech bid beep
  playBid() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  // Resonant wooden auction gavel impact with sub-bass punch
  playGavel() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Sub thump
    const oscSub = this.ctx.createOscillator();
    const gainSub = this.ctx.createGain();
    oscSub.type = 'triangle';
    oscSub.frequency.setValueAtTime(120, now);
    oscSub.frequency.exponentialRampToValueAtTime(30, now + 0.25);
    gainSub.gain.setValueAtTime(0.8, now);
    gainSub.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    oscSub.connect(gainSub);
    gainSub.connect(this.ctx.destination);
    oscSub.start(now);
    oscSub.stop(now + 0.3);

    // Wood click / crack noise
    const bufferSize = this.ctx.sampleRate * 0.1;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 3;

    const gainNoise = this.ctx.createGain();
    gainNoise.gain.setValueAtTime(0.7, now);
    gainNoise.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    whiteNoise.connect(filter);
    filter.connect(gainNoise);
    gainNoise.connect(this.ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.13);
  }

  // Dramatic triple gavel strike: Going 1, Going 2, SOLD!
  playTripleGavel() {
    if (!this.enabled) return;
    this.playGavel();
    setTimeout(() => this.playGavel(), 400);
    setTimeout(() => this.playGavel(), 800);
  }

  // Victory celebration fanfare chord progression for SOLD
  playSoldFanfare() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    this.playGavel();

    const notes = [
      { f: 523.25, t: 0.05, d: 0.15 }, // C5
      { f: 659.25, t: 0.2, d: 0.15 },  // E5
      { f: 783.99, t: 0.35, d: 0.2 },  // G5
      { f: 1046.50, t: 0.55, d: 0.6 }  // C6 (Triumph hold)
    ];

    notes.forEach(note => {
      const now = this.ctx.currentTime + note.t;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, now);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + note.d + 0.05);
    });
  }

  // Dramatic low dual buzzer for UNSOLD
  playUnsoldBuzzer() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [0, 0.25].forEach(offset => {
      const t = now + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(146.83, t); // D3
      osc.frequency.linearRampToValueAtTime(110, t + 0.2); // A2

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  // Clock tick for live auction countdown
  playTick() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Warning alarm tick when timer <= 5s
  playWarningTick() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(980, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }
}

window.soundFX = new SoundFX();
