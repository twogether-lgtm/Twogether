import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  Activity,
  Radio,
  Sliders,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';

interface VideoOverlayReaction {
  id: string;
  emoji: string;
  label: string;
  energyPercent: number;
  x: number;
  colorClass: string;
}

interface JamVocalVideoFeedProps {
  isMusicPlaying: boolean;
  trackTitle: string;
  onEmitReaction: (emoji: string) => void;
  compact?: boolean;
}

type SensitivityLevel = 'chill' | 'balanced' | 'sensitive';

const SENSITIVITY_MULTIPLIER: Record<SensitivityLevel, number> = {
  chill: 0.78,
  balanced: 1.0,
  sensitive: 1.35,
};

export const JamVocalVideoFeed: React.FC<JamVocalVideoFeedProps> = ({
  isMusicPlaying,
  trackTitle,
  onEmitReaction,
  compact = false,
}) => {
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [autoReactEnabled, setAutoReactEnabled] = useState(true);
  const [sensitivity, setSensitivity] = useState<SensitivityLevel>('balanced');
  const [vocalEnergy, setVocalEnergy] = useState<number>(0);
  const [spectralBands, setSpectralBands] = useState<number[]>(Array(16).fill(6));
  const [currentVocalTier, setCurrentVocalTier] = useState<'IDLE' | 'SOULFUL' | 'MELODIC' | 'FIRE'>('IDLE');
  const [lastTriggeredInfo, setLastTriggeredInfo] = useState<{ emoji: string; label: string } | null>(null);
  const [overlayReactions, setOverlayReactions] = useState<VideoOverlayReaction[]>([]);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [micOnlyFallback, setMicOnlyFallback] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastReactionTsRef = useRef<number>(0);
  const smoothedEnergyRef = useRef<number>(0);

  // Refs synced with latest state for the animation loop
  const autoReactRef = useRef(autoReactEnabled);
  const isMicMutedRef = useRef(isMicMuted);
  const sensitivityRef = useRef(sensitivity);
  const onEmitReactionRef = useRef(onEmitReaction);

  useEffect(() => {
    autoReactRef.current = autoReactEnabled;
  }, [autoReactEnabled]);

  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMicMuted;
      });
    }
    if (isMicMuted) {
      setVocalEnergy(0);
      setCurrentVocalTier('IDLE');
    }
  }, [isMicMuted]);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  useEffect(() => {
    onEmitReactionRef.current = onEmitReaction;
  }, [onEmitReaction]);

  const spawnVocalReaction = useCallback(
    (emoji: string, label: string, energyPercent: number, colorClass: string) => {
      const id = `voc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const x = 14 + Math.random() * 72;

      setOverlayReactions((prev) => [
        ...prev.slice(-10),
        { id, emoji, label, energyPercent, x, colorClass },
      ]);
      setLastTriggeredInfo({ emoji, label });
      onEmitReactionRef.current(emoji);

      setTimeout(() => {
        setOverlayReactions((prev) => prev.filter((item) => item.id !== id));
      }, 2300);
    },
    []
  );

  const classifyAndTrigger = useCallback(
    (energy: number, highMidRatio: number) => {
      const now = Date.now();
      const cooldownMs = energy >= 72 ? 950 : 1350;
      if (now - lastReactionTsRef.current < cooldownMs) return;

      if (energy >= 68) {
        lastReactionTsRef.current = now;
        const emoji = energy >= 86 ? '🔥' : highMidRatio > 0.55 ? '⚡' : '🔥';
        spawnVocalReaction(
          emoji,
          energy >= 86 ? 'Peak Vocal Fire!' : 'High Energy Belt!',
          energy,
          'bg-rose-500/85 border-amber-300 text-white'
        );
      } else if (energy >= 38) {
        lastReactionTsRef.current = now;
        const emoji = highMidRatio > 0.48 ? '🎶' : '🎤';
        spawnVocalReaction(
          emoji,
          highMidRatio > 0.48 ? 'Melodic Flow' : 'Live Vocals',
          energy,
          'bg-cyan-500/85 border-cyan-200 text-black'
        );
      } else if (energy >= 17) {
        lastReactionTsRef.current = now;
        const emoji = highMidRatio > 0.45 ? '✨' : '💖';
        spawnVocalReaction(
          emoji,
          emoji === '💖' ? 'Soulful Harmony' : 'Smooth Vibe',
          energy,
          'bg-pink-500/85 border-pink-200 text-white'
        );
      }
    },
    [spawnVocalReaction]
  );

  const stopFeed = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    smoothedEnergyRef.current = 0;
    setIsStreamActive(false);
    setMicOnlyFallback(false);
    setVocalEnergy(0);
    setSpectralBands(Array(16).fill(6));
    setCurrentVocalTier('IDLE');
  }, []);

  useEffect(() => {
    return () => {
      stopFeed();
    };
  }, [stopFeed]);

  // Attach active MediaStream to <video> whenever stream starts or video element mounts
  useEffect(() => {
    if (isStreamActive && videoRef.current && streamRef.current && isVideoEnabled) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isStreamActive, isVideoEnabled, micOnlyFallback]);

  const startVocalAnalysisLoop = useCallback(
    (stream: MediaStream) => {
      try {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtxClass) return;

        const ctx = new AudioCtxClass();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.72;
        source.connect(analyser);

        audioCtxRef.current = ctx;
        analyserRef.current = analyser;

        const timeData = new Uint8Array(analyser.fftSize);
        const freqData = new Uint8Array(analyser.frequencyBinCount);
        const sampleRate = ctx.sampleRate || 48000;
        const hzPerBin = sampleRate / analyser.fftSize;

        // Vocal band: ~90 Hz to ~3600 Hz
        const minVocalBin = Math.max(1, Math.floor(90 / hzPerBin));
        const midSplitBin = Math.max(minVocalBin + 1, Math.floor(900 / hzPerBin));
        const maxVocalBin = Math.min(freqData.length - 1, Math.ceil(3600 / hzPerBin));

        let lastUiTick = 0;

        const tick = (ts: number) => {
          if (!analyserRef.current) return;

          analyserRef.current.getByteTimeDomainData(timeData);
          analyserRef.current.getByteFrequencyData(freqData);

          // 1. Time-domain RMS amplitude
          let sumSq = 0;
          for (let i = 0; i < timeData.length; i++) {
            const normalized = (timeData[i] - 128) / 128;
            sumSq += normalized * normalized;
          }
          const rms = Math.sqrt(sumSq / timeData.length);

          // 2. Vocal band spectral average (90 Hz - 3.6 kHz)
          let vocalSum = 0;
          let highVocalSum = 0;
          let highBinsCount = 0;
          for (let b = minVocalBin; b <= maxVocalBin; b++) {
            vocalSum += freqData[b];
            if (b >= midSplitBin) {
              highVocalSum += freqData[b];
              highBinsCount++;
            }
          }
          const totalBins = Math.max(1, maxVocalBin - minVocalBin + 1);
          const avgVocalMag = vocalSum / (totalBins * 255);
          const highRatio =
            vocalSum > 0
              ? (highVocalSum / Math.max(1, highBinsCount)) / (vocalSum / totalBins)
              : 0.4;

          const multiplier = SENSITIVITY_MULTIPLIER[sensitivityRef.current];
          const combinedRaw = (rms * 185 + avgVocalMag * 95) * multiplier;
          const clampedRaw = isMicMutedRef.current ? 0 : Math.min(100, Math.max(0, combinedRaw));

          // Fast attack, smooth decay
          smoothedEnergyRef.current =
            clampedRaw > smoothedEnergyRef.current
              ? smoothedEnergyRef.current * 0.45 + clampedRaw * 0.55
              : smoothedEnergyRef.current * 0.8 + clampedRaw * 0.2;

          const energyRounded = Math.round(smoothedEnergyRef.current);

          if (ts - lastUiTick > 65) {
            lastUiTick = ts;
            setVocalEnergy(energyRounded);
            setCurrentVocalTier(
              energyRounded >= 68
                ? 'FIRE'
                : energyRounded >= 38
                ? 'MELODIC'
                : energyRounded >= 17
                ? 'SOULFUL'
                : 'IDLE'
            );

            // Extract 16 bars across vocal band
            const bars: number[] = [];
            for (let k = 0; k < 16; k++) {
              const binIdx = Math.min(
                maxVocalBin,
                minVocalBin + Math.floor((k / 16) * (maxVocalBin - minVocalBin + 1))
              );
              const val = isMicMutedRef.current
                ? 5
                : Math.max(6, Math.round((freqData[binIdx] / 255) * 100));
              bars.push(val);
            }
            setSpectralBands(bars);
          }

          if (autoReactRef.current && !isMicMutedRef.current && energyRounded >= 17) {
            classifyAndTrigger(energyRounded, highRatio);
          }

          rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
      } catch {
        // Web Audio setup unavailable
      }
    },
    [classifyAndTrigger]
  );

  const handleStartLiveFeed = async (audioOnly = false) => {
    setDeviceError(null);
    stopFeed();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setDeviceError('Camera/microphone capture is not supported in this browser context.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: audioOnly ? false : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      setMicOnlyFallback(audioOnly || stream.getVideoTracks().length === 0);
      setIsVideoEnabled(!audioOnly && stream.getVideoTracks().length > 0);
      setIsMicMuted(false);
      setIsStreamActive(true);
      startVocalAnalysisLoop(stream);
    } catch {
      // Retry audio-only if camera wasn't available/allowed
      if (!audioOnly) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          streamRef.current = audioStream;
          setMicOnlyFallback(true);
          setIsVideoEnabled(false);
          setIsMicMuted(false);
          setIsStreamActive(true);
          startVocalAnalysisLoop(audioStream);
          return;
        } catch {
          // Both camera and mic blocked
        }
      }
      setDeviceError(
        'Camera/Mic permission was blocked or unavailable. Grant microphone access in your browser to analyze live vocals, or test vocal thresholds below.'
      );
    }
  };

  const handleToggleCameraTrack = () => {
    if (!streamRef.current) return;
    const videoTracks = streamRef.current.getVideoTracks();
    if (videoTracks.length === 0) return;
    const next = !isVideoEnabled;
    videoTracks.forEach((t) => {
      t.enabled = next;
    });
    setIsVideoEnabled(next);
  };

  const handleSimulateVocalSample = (targetEnergy: number) => {
    setVocalEnergy(targetEnergy);
    setCurrentVocalTier(
      targetEnergy >= 68 ? 'FIRE' : targetEnergy >= 38 ? 'MELODIC' : 'SOULFUL'
    );
    setSpectralBands(
      Array.from({ length: 16 }).map((_, idx) =>
        Math.min(100, Math.max(12, Math.round(targetEnergy * (0.55 + ((idx % 4) * 0.14)))))
      )
    );
    if (autoReactEnabled) {
      lastReactionTsRef.current = 0; // immediate preview response
      classifyAndTrigger(targetEnergy, targetEnergy >= 70 ? 0.62 : 0.5);
    }
    setTimeout(() => {
      if (!isStreamActive) {
        setVocalEnergy(0);
        setCurrentVocalTier('IDLE');
        setSpectralBands(Array(16).fill(6));
      }
    }, 900);
  };

  const tierGlowStyle =
    currentVocalTier === 'FIRE'
      ? 'ring-2 ring-amber-400 shadow-[0_0_28px_rgba(245,158,11,0.45)]'
      : currentVocalTier === 'MELODIC'
      ? 'ring-2 ring-cyan-400 shadow-[0_0_24px_rgba(6,182,212,0.4)]'
      : currentVocalTier === 'SOULFUL'
      ? 'ring-2 ring-pink-400 shadow-[0_0_24px_rgba(236,72,153,0.4)]'
      : 'border-white/15';

  return (
    <GlassCard
      className={`p-4 sm:p-5 border border-cyan-500/35 space-y-3.5 ${
        compact ? '' : 'mb-2'
      }`}
      glowColor="cyan"
    >
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-mono text-[10px] font-bold uppercase">
              <Activity className="w-3 h-3" />
              Live Vocal Energy AI
            </span>
            {isStreamActive && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/25 border border-rose-400/50 text-rose-200 font-mono text-[10px] font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                {micOnlyFallback ? 'MIC LIVE' : 'CAM + MIC LIVE'}
              </span>
            )}
          </div>
          <h3 className="text-sm sm:text-base font-black text-white mt-1">
            Live Jam Video Feed &amp; Auto-Vocal Reactions
          </h3>
          <p className="text-[11px] text-zinc-400">
            Sing, rap, or vibe along to <span className="text-cyan-300 font-semibold">{trackTitle}</span> — vocal peaks auto-fire 🔥 / 🎶 / 💖 over your video!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
          <button
            type="button"
            onClick={() => setAutoReactEnabled(!autoReactEnabled)}
            className={`px-3 py-1.5 rounded-xl font-bold border flex items-center gap-1.5 cursor-pointer transition-all ${
              autoReactEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Auto-Emoji: {autoReactEnabled ? 'ON' : 'OFF'}
          </button>

          {!isStreamActive ? (
            <button
              type="button"
              onClick={() => handleStartLiveFeed(false)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-pink-500 text-black font-extrabold flex items-center gap-1.5 shadow-md hover:brightness-110 cursor-pointer transition-all"
            >
              <Video className="w-3.5 h-3.5" />
              Start Live Jam Cam
            </button>
          ) : (
            <>
              {!micOnlyFallback && (
                <button
                  type="button"
                  onClick={handleToggleCameraTrack}
                  className={`p-2 rounded-xl border cursor-pointer transition-all ${
                    isVideoEnabled
                      ? 'bg-white/10 text-white border-white/20'
                      : 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                  }`}
                  title={isVideoEnabled ? 'Mute Camera' : 'Enable Camera'}
                >
                  {isVideoEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMicMuted(!isMicMuted)}
                className={`p-2 rounded-xl border cursor-pointer transition-all ${
                  !isMicMuted
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40'
                    : 'bg-rose-500/25 text-rose-200 border-rose-400/50'
                }`}
                title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={stopFeed}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 font-bold cursor-pointer transition-all"
              >
                Stop Feed
              </button>
            </>
          )}
        </div>
      </div>

      {deviceError && (
        <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-[11px] font-mono">
          {deviceError}
        </div>
      )}

      {/* Video Stage + Floating Vocal Emoji Overlay Canvas */}
      <div
        className={`relative rounded-2xl overflow-hidden bg-[#090814] border transition-all duration-200 ${
          compact ? 'h-48 sm:h-56' : 'h-64 sm:h-72'
        } ${tierGlowStyle}`}
      >
        {isStreamActive && isVideoEnabled && !micOnlyFallback ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover -scale-x-100"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#120e24] via-[#0c1122] to-[#1d0f24] text-center relative">
            <div
              className="w-20 h-20 rounded-full border-2 border-cyan-400/40 flex items-center justify-center relative transition-transform duration-150"
              style={{
                transform: `scale(${1 + vocalEnergy / 280})`,
                boxShadow:
                  vocalEnergy > 20
                    ? '0 0 32px rgba(6,182,212,0.45)'
                    : '0 0 12px rgba(6,182,212,0.15)',
              }}
            >
              {isStreamActive ? (
                <Mic className="w-8 h-8 text-cyan-300" />
              ) : (
                <Video className="w-8 h-8 text-zinc-400" />
              )}
              {isMusicPlaying && (
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs shadow">
                  🎶
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-white mt-3">
              {isStreamActive
                ? 'Audio-Only Vocal Jam Active'
                : 'Enable Your Jam Camera & Mic'}
            </p>
            <p className="text-[11px] text-zinc-400 max-w-sm mt-0.5">
              {isStreamActive
                ? 'Microphone vocal analyzer is live — watch 🔥, 🎶, and 💖 react to your voice energy!'
                : 'Click "Start Live Jam Cam" to broadcast your video feed with automatic vocal-triggered reactions.'}
            </p>
            {!isStreamActive && (
              <button
                type="button"
                onClick={() => handleStartLiveFeed(true)}
                className="mt-2.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-mono font-bold text-cyan-200 cursor-pointer transition-all"
              >
                Use Mic-Only Mode
              </button>
            )}
          </div>
        )}

        {/* Top Left HUD Pill: Vocal Energy Level */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-2.5 py-1 rounded-xl bg-black/65 backdrop-blur-md border border-white/15 font-mono text-[10px]">
          <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-zinc-300">Vocal:</span>
          <strong
            className={
              currentVocalTier === 'FIRE'
                ? 'text-amber-300'
                : currentVocalTier === 'MELODIC'
                ? 'text-cyan-300'
                : currentVocalTier === 'SOULFUL'
                ? 'text-pink-300'
                : 'text-zinc-400'
            }
          >
            {vocalEnergy}% ({currentVocalTier})
          </strong>
        </div>

        {/* Top Right HUD Pill: Last Auto-Triggered Reaction */}
        {lastTriggeredInfo && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 text-[11px] font-mono text-white">
            <span className="text-base">{lastTriggeredInfo.emoji}</span>
            <span className="font-bold">{lastTriggeredInfo.label}</span>
          </div>
        )}

        {/* Floating Vocal-Triggered Emoji Reactions OVER the User Video Feed */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
          <AnimatePresence>
            {overlayReactions.map((rec) => (
              <motion.div
                key={rec.id}
                initial={{ y: 185, opacity: 0, scale: 0.6 }}
                animate={{ y: -25, opacity: [0, 1, 1, 0], scale: [0.8, 1.25, 1.15, 0.95] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2.1, ease: 'easeOut' }}
                className="absolute bottom-6 flex flex-col items-center gap-1"
                style={{ left: `${rec.x}%`, transform: 'translateX(-50%)' }}
              >
                <span className="text-4xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]">
                  {rec.emoji}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-black border shadow-lg whitespace-nowrap ${rec.colorClass}`}
                >
                  {rec.label} • {rec.energyPercent}%
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Bottom Audio-Frequency Vocal Meter Bar inside Video Frame */}
        <div className="absolute bottom-0 inset-x-0 z-20 p-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent space-y-1.5">
          <div className="flex items-end gap-1 h-7">
            {spectralBands.map((barVal, idx) => (
              <div
                key={idx}
                className={`flex-1 rounded-t transition-all duration-75 ${
                  barVal >= 68
                    ? 'bg-gradient-to-t from-orange-500 to-amber-300'
                    : barVal >= 38
                    ? 'bg-gradient-to-t from-cyan-500 to-teal-300'
                    : 'bg-gradient-to-t from-pink-500 to-purple-400'
                }`}
                style={{ height: `${Math.max(10, barVal)}%` }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-[9.5px] font-mono text-zinc-300">
            <span>💖 17–37% Soulful</span>
            <span>🎶 38–67% Melodic</span>
            <span>🔥 68%+ Peak Fire</span>
          </div>
        </div>
      </div>

      {/* Bottom Sensitivity & Quick Vocal Test Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[10.5px] font-mono">
        <div className="flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-zinc-400">Mic Sensitivity:</span>
          {(['chill', 'balanced', 'sensitive'] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setSensitivity(lvl)}
              className={`px-2 py-0.5 rounded-lg font-bold capitalize border cursor-pointer transition-all ${
                sensitivity === lvl
                  ? 'bg-cyan-400 text-black border-cyan-300'
                  : 'bg-white/5 text-zinc-300 border-white/10 hover:text-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-zinc-400 flex items-center gap-1">
            <Radio className="w-3 h-3 text-pink-400" /> Test Thresholds:
          </span>
          <button
            type="button"
            onClick={() => handleSimulateVocalSample(26)}
            className="px-2 py-0.5 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 border border-pink-400/35 text-pink-200 font-bold cursor-pointer"
          >
            💖 Soul (26%)
          </button>
          <button
            type="button"
            onClick={() => handleSimulateVocalSample(52)}
            className="px-2 py-0.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/35 text-cyan-200 font-bold cursor-pointer"
          >
            🎶 Melodic (52%)
          </button>
          <button
            type="button"
            onClick={() => handleSimulateVocalSample(84)}
            className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/45 text-amber-200 font-bold cursor-pointer"
          >
            🔥 Peak (84%)
          </button>
        </div>
      </div>
    </GlassCard>
  );
};
