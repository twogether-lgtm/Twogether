import { LoveSong, TRENDING_LOVE_SONGS } from '../data/loveSongsData';

class LoveSongAudioService {
  private audio: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private synthGain: GainNode | null = null;
  private synthInterval: NodeJS.Timeout | null = null;
  private isSynthesizing = false;
  private currentSong: LoveSong = TRENDING_LOVE_SONGS[0];
  private isPlaying = false;
  private listeners: ((song: LoveSong, isPlaying: boolean, progress: number) => void)[] = [];
  private progressInterval: NodeJS.Timeout | null = null;
  private duration = 210;
  private currentTime = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.audio.volume = 0.75;

      this.audio.addEventListener('timeupdate', () => {
        if (this.audio) {
          this.currentTime = this.audio.currentTime;
          this.duration = this.audio.duration || 210;
          this.notify();
        }
      });

      this.audio.addEventListener('ended', () => {
        this.nextSong();
      });

      this.audio.addEventListener('error', () => {
        // Fallback to warm Web Audio acoustic love synth only if playback was actively requested
        if (this.isPlaying) {
          this.startLoveSongSynth();
        }
      });
    }
  }

  public subscribe(cb: (song: LoveSong, isPlaying: boolean, progress: number) => void) {
    this.listeners.push(cb);
    cb(this.currentSong, this.isPlaying, this.getProgress());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    const progress = this.getProgress();
    this.listeners.forEach((cb) => cb(this.currentSong, this.isPlaying, progress));
  }

  public getProgress(): number {
    return this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
  }

  public getCurrentSong(): LoveSong {
    return this.currentSong;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public getDuration(): number {
    return this.duration;
  }

  public async playSong(song?: LoveSong) {
    if (song) {
      this.currentSong = song;
    }

    this.stopLoveSongSynth();

    if (!this.audio) return;

    try {
      this.audio.src = this.currentSong.audioUrl;
      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        await playPromise;
        this.isPlaying = true;
        this.notify();
      }
    } catch {
      // Browser autoplay policy might block audio before gesture, or audio URL blocked.
      // Activate rich romantic Web Audio fallback synthesizer
      this.startLoveSongSynth();
      this.isPlaying = true;
      this.notify();
    }
  }

  public pause() {
    if (this.audio) {
      this.audio.pause();
    }
    this.stopLoveSongSynth();
    this.isPlaying = false;
    this.notify();
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.playSong();
    }
  }

  public nextSong(playlist?: LoveSong[]) {
    const list = playlist && playlist.length > 0 ? playlist : TRENDING_LOVE_SONGS;
    const idx = list.findIndex((s) => s.id === this.currentSong.id);
    const nextIdx = (idx + 1) % list.length;
    this.playSong(list[nextIdx]);
  }

  public prevSong(playlist?: LoveSong[]) {
    const list = playlist && playlist.length > 0 ? playlist : TRENDING_LOVE_SONGS;
    const idx = list.findIndex((s) => s.id === this.currentSong.id);
    const prevIdx = (idx - 1 + list.length) % list.length;
    this.playSong(list[prevIdx]);
  }

  public shuffleSong(playlist?: LoveSong[]) {
    const list = playlist && playlist.length > 0 ? playlist : TRENDING_LOVE_SONGS;
    if (list.length <= 1) return;
    let nextIdx = Math.floor(Math.random() * list.length);
    if (list[nextIdx].id === this.currentSong.id) {
      nextIdx = (nextIdx + 1) % list.length;
    }
    this.playSong(list[nextIdx]);
  }

  public setVolume(vol: number) {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, vol));
    }
    if (this.synthGain && this.audioCtx) {
      this.synthGain.gain.setValueAtTime(vol * 0.25, this.audioCtx.currentTime);
    }
  }

  // -------------------------------------------------------------
  // Romantic Acoustic Web Audio Synthesizer (Zero-Failure Fallback)
  // Generates warm soulful chords, acoustic plucks & 808 heartbeat pulses
  // -------------------------------------------------------------
  private startLoveSongSynth() {
    try {
      if (this.isSynthesizing) return;
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.audioCtx = new AudioCtxClass();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.synthGain = this.audioCtx.createGain();
      this.synthGain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
      this.synthGain.connect(this.audioCtx.destination);

      this.isSynthesizing = true;
      this.currentTime = 0;
      this.duration = this.currentSong.duration || 210;

      // Chord progression for sweet love songs (I - V - vi - IV romantic progression)
      const chordNotes = [
        [261.63, 329.63, 392.0], // C Major (Warmth)
        [196.0, 246.94, 293.66], // G Major (Hope)
        [220.0, 261.63, 329.63], // A Minor (Tender Soul)
        [174.61, 220.0, 261.63], // F Major (Romance)
      ];

      let chordStep = 0;

      const playChord = () => {
        if (!this.audioCtx || !this.synthGain || !this.isSynthesizing) return;
        const notes = chordNotes[chordStep % chordNotes.length];
        const t = this.audioCtx.currentTime;

        notes.forEach((freq, idx) => {
          const osc = this.audioCtx!.createOscillator();
          const noteGain = this.audioCtx!.createGain();

          osc.type = idx === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, t);

          noteGain.gain.setValueAtTime(0.01, t);
          noteGain.gain.linearRampToValueAtTime(0.12, t + 0.1);
          noteGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

          osc.connect(noteGain);
          noteGain.connect(this.synthGain!);
          osc.start(t);
          osc.stop(t + 1.9);
        });

        // Add soft heartbeat pulse on kick frequency
        const kickOsc = this.audioCtx.createOscillator();
        const kickGain = this.audioCtx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(80, t);
        kickOsc.frequency.exponentialRampToValueAtTime(35, t + 0.15);
        kickGain.gain.setValueAtTime(0.18, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        kickOsc.connect(kickGain);
        kickGain.connect(this.synthGain);
        kickOsc.start(t);
        kickOsc.stop(t + 0.25);

        chordStep++;
        this.currentTime += 2;
        if (this.currentTime >= this.duration) {
          this.currentTime = 0;
          this.nextSong();
        }
        this.notify();
      };

      playChord();
      this.synthInterval = setInterval(playChord, 2000);
    } catch {
      // ignore
    }
  }

  private stopLoveSongSynth() {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    if (this.synthGain && this.audioCtx) {
      try {
        this.synthGain.disconnect();
      } catch {}
    }
    this.isSynthesizing = false;
  }
}

export const loveSongAudioService = new LoveSongAudioService();
