/**
 * Pure Web Audio API Ambient Sound Synthesizer
 * Generates soothing ambient focus sounds (Brown Noise, Gentle Rain, Binaural Alpha Wave)
 * completely in-browser without any external audio file downloads.
 */

class AmbientSoundEngine {
  constructor() {
    this.ctx = null;
    this.currentSound = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.volume = 0.35;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, Number(val)));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  stop() {
    if (this.currentSound) {
      try {
        if (this.currentSound.source) this.currentSound.source.stop();
        if (this.currentSound.oscLeft) this.currentSound.oscLeft.stop();
        if (this.currentSound.oscRight) this.currentSound.oscRight.stop();
      } catch {}
      this.currentSound = null;
    }
    this.isPlaying = false;
  }

  // Play Brown Noise (Deep focus rumble, calm noise)
  playBrownNoise() {
    this.init();
    this.stop();

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Gain compensation
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Low-pass filter for smooth warmth
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.gainNode);
    whiteNoise.start();

    this.currentSound = { source: whiteNoise };
    this.isPlaying = true;
  }

  // Play Gentle Rain (Filtered pink noise with random drops modulation)
  playRain() {
    this.init();
    this.stop();

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const rainSource = this.ctx.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1000, this.ctx.currentTime);
    bandpass.Q.setValueAtTime(0.7, this.ctx.currentTime);

    rainSource.connect(bandpass);
    bandpass.connect(this.gainNode);
    rainSource.start();

    this.currentSound = { source: rainSource };
    this.isPlaying = true;
  }

  // Play 10Hz Alpha Wave Binaural Beat (Carrier: 216Hz, Beat: 10Hz) for relaxed concentration
  playBinauralAlpha() {
    this.init();
    this.stop();

    const merger = this.ctx.createChannelMerger(2);

    const oscLeft = this.ctx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(216, this.ctx.currentTime); // Left: 216 Hz

    const oscRight = this.ctx.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(226, this.ctx.currentTime); // Right: 226 Hz (10Hz delta)

    oscLeft.connect(merger, 0, 0);
    oscRight.connect(merger, 0, 1);
    merger.connect(this.gainNode);

    oscLeft.start();
    oscRight.start();

    this.currentSound = { oscLeft, oscRight };
    this.isPlaying = true;
  }
}

window.ambientEngine = new AmbientSoundEngine();
