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

  // Safe Pop-Up / Alert Sound Player
  // Will ONLY produce sound if isPopupSoundMuted is false.
  // Never interrupts or overrides selected background music.
  public playAlertChime(type: 'celebration' | 'success' | 'click' | 'warning' = 'success') {
    if (this.isPopupSoundMuted) {
      // Pop-up sounds muted by user request!
      return;
    }

    try {
      const AudioCtxClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      const ctx = new AudioCtxClass();

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
      }
    } catch {
      // audio context unavailable
    }
  }
}

export const appSoundService = new AppSoundService();
