import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, Sparkles, Heart, SkipForward, RotateCcw, X, Zap } from 'lucide-react';

interface OpeningIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Built-in cinematic image assets imported so Vite production builds bundle them cleanly
import INTRO_SCENE_1_IMG from '../assets/images/twogether_opening_cinematic_1790850368762.jpg';
import INTRO_SCENE_2_IMG from '../assets/images/twogether_soul_resonance_1790850382927.jpg';

export const OpeningIntroModal: React.FC<OpeningIntroModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Directly play the intro clip itself without interstitial tap-to-enter
  const [currentScene, setCurrentScene] = useState<number>(0); // 0, 1, 2
  const [progress, setProgress] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const sceneRef = useRef<number>(0);

  const TOTAL_DURATION_MS = 7200; // 7.2 second short clip

  // -------------------------------------------------------------
  // Web Audio Cinematic Soundtrack Synthesizer
  // Produces sub-bass swells, heartbeat pulses, and crystalline chimes
  // -------------------------------------------------------------
  const startCinematicAudio = useCallback(() => {
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;

      const ctx = new AudioCtxClass();
      audioCtxRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(isMuted ? 0 : 0.35, ctx.currentTime);
      masterGain.connect(ctx.destination);
      gainNodeRef.current = masterGain;

      // 1. Warm Sub-Bass drone with resonant filter sweep
      const subOsc = ctx.createOscillator();
      const subFilter = ctx.createBiquadFilter();
      const subGain = ctx.createGain();

      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(55, ctx.currentTime);
      subOsc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 5.5);

      subFilter.type = 'lowpass';
      subFilter.frequency.setValueAtTime(160, ctx.currentTime);
      subFilter.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 5.2);

      subGain.gain.setValueAtTime(0.01, ctx.currentTime);
      subGain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 1.2);
      subGain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 7.0);

      subOsc.connect(subFilter);
      subFilter.connect(subGain);
      subGain.connect(masterGain);
      subOsc.start();
      subOsc.stop(ctx.currentTime + 7.2);

      // 2. Heartbeat pulses
      const playThump = (time: number, freq: number, intensity: number) => {
        const thumpOsc = ctx.createOscillator();
        const thumpGain = ctx.createGain();
        thumpOsc.type = 'sine';
        thumpOsc.frequency.setValueAtTime(freq, time);
        thumpOsc.frequency.exponentialRampToValueAtTime(30, time + 0.18);

        thumpGain.gain.setValueAtTime(intensity, time);
        thumpGain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

        thumpOsc.connect(thumpGain);
        thumpGain.connect(masterGain);
        thumpOsc.start(time);
        thumpOsc.stop(time + 0.25);
      };

      [0.5, 0.8, 2.0, 2.3, 3.6, 3.9, 5.0, 5.3].forEach((t) => {
        playThump(ctx.currentTime + t, 90, 0.38);
      });

      // 3. Ethereal Arpeggiated Chimes
      const chimeNotes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
      chimeNotes.forEach((freq, idx) => {
        const chimeOsc = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        const noteTime = ctx.currentTime + 1.0 + idx * 0.45;

        chimeOsc.type = 'sine';
        chimeOsc.frequency.setValueAtTime(freq, noteTime);

        chimeGain.gain.setValueAtTime(0.001, noteTime);
        chimeGain.gain.linearRampToValueAtTime(0.12, noteTime + 0.05);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 1.2);

        chimeOsc.connect(chimeGain);
        chimeGain.connect(masterGain);
        chimeOsc.start(noteTime);
        chimeOsc.stop(noteTime + 1.3);
      });

      // 4. Climax Crystal Chord
      const chordFrequencies = [261.63, 329.63, 392.0, 493.88, 587.33];
      chordFrequencies.forEach((freq) => {
        const chordOsc = ctx.createOscillator();
        const chordGain = ctx.createGain();
        const chordTime = ctx.currentTime + 4.8;

        chordOsc.type = 'triangle';
        chordOsc.frequency.setValueAtTime(freq, chordTime);

        chordGain.gain.setValueAtTime(0.001, chordTime);
        chordGain.gain.linearRampToValueAtTime(0.18, chordTime + 0.3);
        chordGain.gain.exponentialRampToValueAtTime(0.001, chordTime + 2.2);

        chordOsc.connect(chordGain);
        chordGain.connect(masterGain);
        chordOsc.start(chordTime);
        chordOsc.stop(chordTime + 2.4);
      });
    } catch {
      // Audio context might fail in autoplay-restricted webviews
    }
  }, [isMuted]);

  // Handle Mute toggle
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(
        nextMuted ? 0 : 0.35,
        audioCtxRef.current.currentTime
      );
    }
  };

  // Skip or close intro
  const handleClose = () => {
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    onClose();
  };

  // Replay intro clip from start
  const handleReplay = () => {
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    setProgress(0);
    setCurrentScene(0);
    sceneRef.current = 0;
    startTimeRef.current = Date.now();
    startCinematicAudio();
  };

  // Start clip playback immediately when opened
  useEffect(() => {
    if (!isOpen) return;

    startTimeRef.current = Date.now();
    setProgress(0);
    setCurrentScene(0);
    sceneRef.current = 0;
    startCinematicAudio();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const currentPct = Math.min(100, (elapsed / TOTAL_DURATION_MS) * 100);
      setProgress(currentPct);

      if (elapsed < 2300) {
        if (sceneRef.current !== 0) {
          sceneRef.current = 0;
          setCurrentScene(0);
        }
      } else if (elapsed < 4800) {
        if (sceneRef.current !== 1) {
          sceneRef.current = 1;
          setCurrentScene(1);
        }
      } else {
        if (sceneRef.current !== 2) {
          sceneRef.current = 2;
          setCurrentScene(2);
        }
      }

      if (elapsed >= TOTAL_DURATION_MS) {
        clearInterval(interval);
        timerRef.current = setTimeout(() => {
          handleClose();
        }, 800);
      }
    }, 40);

    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen]);

  // Dynamic Canvas Waveform & Stardust Background
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      radius: Math.random() * 2 + 1,
      color: Math.random() > 0.5 ? '#38bdf8' : '#f472b6',
      alpha: Math.random() * 0.6 + 0.2,
    }));

    let step = 0;
    const render = () => {
      step += 0.03;
      ctx.clearRect(0, 0, width, height);

      // Connecting lines
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.x += p1.vx;
        p1.y += p1.vy;
        if (p1.x < 0) p1.x = width;
        if (p1.x > width) p1.x = 0;
        if (p1.y < 0) p1.y = height;
        if (p1.y > height) p1.y = 0;

        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = p1.color;
        ctx.globalAlpha = p1.alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p1.color;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = '#c084fc';
            ctx.globalAlpha = (1 - dist / 110) * 0.2;
            ctx.stroke();
          }
        }
      }

      // Dynamic resonance pulse rings in center
      const centerX = width / 2;
      const centerY = height / 2;
      for (let w = 0; w < 3; w++) {
        const radius = ((step * 45 + w * 65) % 180) + 30;
        const alpha = Math.max(0, 1 - radius / 210) * 0.45;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = w % 2 === 0 ? '#06b6d4' : '#ec4899';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = alpha;
        ctx.stroke();
      }

      ctx.globalAlpha = 1.0;
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', onResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl overflow-hidden select-none">
      {/* Background Interactive Stardust & Waveform Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-80"
      />

      {/* Cinematic Background Imagery with smooth zoom & cross-fade */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Scene 0 Image */}
        <motion.div
          animate={{
            opacity: currentScene === 0 ? 0.65 : 0,
            scale: currentScene === 0 ? [1, 1.08] : 1,
          }}
          transition={{ duration: 2.8, ease: 'easeOut' }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${INTRO_SCENE_1_IMG})` }}
        />

        {/* Scene 1 Image */}
        <motion.div
          animate={{
            opacity: currentScene === 1 ? 0.65 : 0,
            scale: currentScene === 1 ? [1, 1.1] : 1,
          }}
          transition={{ duration: 2.8, ease: 'easeOut' }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${INTRO_SCENE_2_IMG})` }}
        />

        {/* Scene 2 Climax Overlay Video / Light Leaks */}
        <motion.div
          animate={{
            opacity: currentScene === 2 ? 0.4 : 0,
          }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 bg-gradient-to-tr from-pink-600/30 via-purple-600/20 to-cyan-500/30 mix-blend-screen"
        />

        {/* Film grain and vignette overlay */}
        <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/90 pointer-events-none" />
      </div>

      {/* -------------------------------------------------------------
          CINEMATIC INTRO CLIP DISPLAY (Directly Playing)
          ------------------------------------------------------------- */}
      <div className="relative z-20 w-full h-full flex flex-col justify-between p-4 sm:p-8">
        {/* Top Navigation & Status Bar */}
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-3">
          {/* Segmented Progress Bar */}
          <div className="w-full grid grid-cols-3 gap-1.5 h-1.5">
            {[0, 1, 2].map((segIdx) => {
              let segFill = 0;
              if (currentScene > segIdx) segFill = 100;
              else if (currentScene === segIdx) {
                const sceneStartPct = (segIdx / 3) * 100;
                const scenePct = ((progress - sceneStartPct) / 33.33) * 100;
                segFill = Math.min(100, Math.max(0, scenePct));
              }
              return (
                <div
                  key={segIdx}
                  className="h-full bg-white/20 rounded-full overflow-hidden backdrop-blur-sm"
                >
                  <div
                    className="h-full bg-gradient-to-r from-pink-400 to-cyan-400 transition-all duration-75"
                    style={{ width: `${segFill}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Top Controls: Logo badge, Mute toggle, Skip button */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-pink-500 to-cyan-400 p-0.5 flex items-center justify-center">
                <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-cyan-300" />
                </div>
              </div>
              <span className="text-xs font-mono font-bold tracking-widest text-white uppercase">
                Twogether Intro
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-mono">
                Scene {currentScene + 1}/3
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Mute/Unmute */}
              <button
                onClick={toggleMute}
                className="p-2 rounded-full bg-black/60 border border-white/20 text-white hover:bg-white/20 transition-all cursor-pointer backdrop-blur-md"
                title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                )}
              </button>

              {/* Skip Intro Button */}
              <button
                onClick={handleClose}
                className="px-3.5 py-1.5 rounded-full bg-black/60 border border-white/20 hover:border-white/40 text-xs font-mono text-white flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md hover:bg-white/10"
              >
                <span>Skip Intro</span>
                <SkipForward className="w-3.5 h-3.5 text-zinc-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Central Animated Content per Scene */}
        <div className="relative my-auto flex flex-col items-center justify-center text-center px-4 max-w-xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {currentScene === 0 && (
              <motion.div
                key="scene_0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6 }}
                className="space-y-4"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400/30 text-pink-300 text-xs font-mono">
                  <Heart className="w-3.5 h-3.5 fill-pink-400" /> Two Souls in Orbit
                </div>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-2xl">
                  A NEW ERA OF <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400">
                    GENUINE CONNECTION
                  </span>
                </h2>
                <p className="text-xs sm:text-base text-zinc-300 max-w-md mx-auto leading-relaxed">
                  Say goodbye to superficial swipes. Experience synchronized heart resonance powered by AI and authentic live audio.
                </p>
              </motion.div>
            )}

            {currentScene === 1 && (
              <motion.div
                key="scene_1"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.6 }}
                className="space-y-4"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-xs font-mono">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" /> Next-Gen Superpowers
                </div>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-2xl">
                  VOICE RESONANCE & <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400">
                    BIOMETRIC INTIMACY
                  </span>
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-md mx-auto text-xs font-mono">
                  <span className="px-2.5 py-1 rounded-lg bg-black/60 border border-white/10 text-cyan-300">
                    🎙️ Voice-Print Verified
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-black/60 border border-white/10 text-pink-300">
                    ✨ Live Audio Jam Rooms
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-black/60 border border-white/10 text-purple-300">
                    🔥 100+ Couples Games
                  </span>
                </div>
              </motion.div>
            )}

            {currentScene === 2 && (
              <motion.div
                key="scene_2"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.7 }}
                className="space-y-4"
              >
                <div className="relative inline-block mb-2">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400 p-1 shadow-2xl shadow-pink-500/50 mx-auto flex items-center justify-center animate-bounce">
                    <div className="w-full h-full bg-[#0F0E17] rounded-full flex items-center justify-center">
                      <Heart className="w-10 h-10 text-pink-400 fill-pink-500" />
                    </div>
                  </div>
                </div>
                <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight font-sans">
                  twogether
                </h2>
                <p className="text-sm sm:text-lg text-cyan-300 font-mono font-bold tracking-wide">
                  Welcome to Twogether • Your Orbit Begins Now
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleClose}
                    className="px-6 py-3 rounded-full bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold text-sm shadow-lg shadow-pink-500/30 hover:scale-105 transition-all cursor-pointer"
                  >
                    Enter App Now →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Controls / Status */}
        <div className="w-full max-w-3xl mx-auto flex items-center justify-between text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Audio {isMuted ? '(Muted)' : '(Playing)'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReplay}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Replay from start"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Close intro"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
