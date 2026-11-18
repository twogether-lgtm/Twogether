// App Sound Service: Manages independent audio channels
// Channel 1: Selected Background Music (Love Songs / DJ Beats) - Plays uninterrupted
// Channel 2: Pop-Up & Alert Sound FX (Chimes, Ad audio, Modal sounds) - Can be muted independently

class AppSoundService {
  private isPopupSoundMuted: boolean = false;
  private musicVolume: number = 0.8;
  private listeners: ((isPopupMuted: boolean, musicVol: number) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedMute = localStorage.getItem('twogether_mute_popup_sounds');
        this.isPopupSoundMuted = savedMute === 'true';

        const savedVol = localStorage.getItem('twogether_music_volume');
        if (savedVol !== null) {
          this.musicVolume = Math.max(0, Math.min(1, Number(savedVol)));
        }
      } catch {
        this.isPopupSoundMuted = false;
      }
    }
  }

  public getIsPopupSoundMuted(): boolean {
    return this.isPopupSoundMuted;
  }

  public setPopupSoundMuted(muted: boolean) {
    this.isPopupSoundMuted = muted;
    try {
      localStorage.setItem('twogether_mute_popup_sounds', String(muted));
    } catch {}
    this.notify();
  }

  public togglePopupSoundMuted(): boolean {
    const next = !this.isPopupSoundMuted;
    this.setPopupSoundMuted(next);
    return next;
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('twogether_music_volume', String(this.musicVolume));
    } catch {}
    this.notify();
  }

  public subscribe(cb: (isPopupMuted: boolean, musicVol: number) => void) {
    this.listeners.push(cb);
    cb(this.isPopupSoundMuted, this.musicVolume);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.isPopupSoundMuted, this.musicVolume));
  }

  private sharedCtx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private getAudioContext(): AudioContext | null {
    try {
      const AudioCtxClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return null;
      if (!this.sharedCtx || this.sharedCtx.state === 'closed') {
        this.sharedCtx = new AudioCtxClass();
        this.noiseBuffer = null;
      }
      if (this.sharedCtx.state === 'suspended') {
        this.sharedCtx.resume().catch(() => {});
      }
      return this.sharedCtx;
    } catch {
      return null;
    }
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const length = Math.floor(ctx.sampleRate * 0.6);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  // Subtle, crisp mechanical detent click for wheel peg crossings & UI taps
  public playWheelPegClick(speedRatio = 0.7, pitchVariance = 0) {
    if (this.isPopupSoundMuted) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const clampedSpeed = Math.max(0.15, Math.min(1, speedRatio));

      // 1. Micro bandpass-filtered noise snap (crisp flapper-on-peg tactile texture)
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = this.getNoiseBuffer(ctx);
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1750 + clampedSpeed * 550 + pitchVariance, now);
      bandpass.Q.setValueAtTime(3.2, now);

      const noiseGain = ctx.createGain();
      const peakNoise = 0.045 + clampedSpeed * 0.03;
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.linearRampToValueAtTime(peakNoise, now + 0.0018);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.017);

      noiseSrc.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSrc.start(now);
      noiseSrc.stop(now + 0.02);

      // 2. Soft damped woody/metallic resonant ping for body
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      const startFreq = 580 + clampedSpeed * 180 + pitchVariance;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(165, now + 0.018);

      const peakOsc = 0.04 + clampedSpeed * 0.022;
      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.linearRampToValueAtTime(peakOsc, now + 0.0015);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.021);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.024);
    } catch {
      // audio context unavailable
    }
  }

  // Subtle aerodynamic/mechanical rotor whirring bed that follows spin velocity & fades cleanly
  public startWheelWhirring(): { updateSpeed: (speedNorm: number) => void; stop: () => void } {
    const noop = { updateSpeed: () => {}, stop: () => {} };
    if (this.isPopupSoundMuted) return noop;

    const ctx = this.getAudioContext();
    if (!ctx) return noop;

    try {
      const now = ctx.currentTime;

      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = this.getNoiseBuffer(ctx);
      noiseSrc.loop = true;

      const rotorFilter = ctx.createBiquadFilter();
      rotorFilter.type = 'bandpass';
      rotorFilter.frequency.setValueAtTime(430, now);
      rotorFilter.Q.setValueAtTime(2.5, now);

      const whirGain = ctx.createGain();
      whirGain.gain.setValueAtTime(0.0001, now);
      whirGain.gain.linearRampToValueAtTime(0.026, now + 0.08);

      // Soft low-level bearing hum
      const humOsc = ctx.createOscillator();
      humOsc.type = 'triangle';
      humOsc.frequency.setValueAtTime(148, now);
      const humGain = ctx.createGain();
      humGain.gain.setValueAtTime(0.0001, now);
      humGain.gain.linearRampToValueAtTime(0.012, now + 0.08);

      noiseSrc.connect(rotorFilter);
      rotorFilter.connect(whirGain);
      whirGain.connect(ctx.destination);

      humOsc.connect(humGain);
      humGain.connect(ctx.destination);

      noiseSrc.start(now);
      humOsc.start(now);

      let stopped = false;

      return {
        updateSpeed: (speedNorm: number) => {
          if (stopped) return;
          try {
            const t = ctx.currentTime;
            if (this.isPopupSoundMuted) {
              whirGain.gain.setTargetAtTime(0.0001, t, 0.03);
              humGain.gain.setTargetAtTime(0.0001, t, 0.03);
              return;
            }
            const norm = Math.max(0, Math.min(1, speedNorm));
            rotorFilter.frequency.setTargetAtTime(135 + norm * 310, t, 0.045);
            whirGain.gain.setTargetAtTime(0.004 + norm * 0.024, t, 0.045);
            humOsc.frequency.setTargetAtTime(64 + norm * 92, t, 0.045);
            humGain.gain.setTargetAtTime(0.002 + norm * 0.011, t, 0.045);
          } catch {
            // ignore
          }
        },
        stop: () => {
          if (stopped) return;
          stopped = true;
          try {
            const t = ctx.currentTime;
            whirGain.gain.cancelScheduledValues(t);
            whirGain.gain.setValueAtTime(Math.max(0.0001, whirGain.gain.value), t);
            whirGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);

            humGain.gain.cancelScheduledValues(t);
            humGain.gain.setValueAtTime(Math.max(0.0001, humGain.gain.value), t);
            humGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);

            setTimeout(() => {
              try {
                noiseSrc.stop();
                noiseSrc.disconnect();
                humOsc.stop();
                humOsc.disconnect();
                rotorFilter.disconnect();
                whirGain.disconnect();
                humGain.disconnect();
              } catch {
                // already stopped
              }
            }, 85);
          } catch {
            // ignore
          }
        },
      };
    } catch {
      return noop;
    }
  }

  // Safe Pop-Up / Alert Sound Player
  // Will ONLY produce sound if isPopupSoundMuted is false.
  // Never interrupts or overrides selected background music.
  public playAlertChime(type: 'celebration' | 'success' | 'click' | 'warning' = 'success') {
    if (this.isPopupSoundMuted) {
      // Pop-up sounds muted by user request!
      return;
    }

    if (type === 'click') {
      this.playWheelPegClick(0.65, 0);
      return;
    }

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      if (type === 'celebration') {
        const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
        });
      } else if (type === 'success') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'warning') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(329.63, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // audio context unavailable
    }
  }
}

export const appSoundService = new AppSoundService();
