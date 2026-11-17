import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CloudRain,
  Building2,
  Waves,
  Flame,
  Sparkles,
  Volume2,
  VolumeX,
  Power,
  ChevronDown,
  ChevronUp,
  Headphones,
} from 'lucide-react';
import { GlassCard } from './GlassCard';

export type AmbienceSoundscapeId =
  | 'rainy_cafe'
  | 'neon_city'
  | 'beach_sunset'
  | 'velvet_hearth'
  | 'cosmic_nebula';

export interface AmbienceSoundscapeOption {
  id: AmbienceSoundscapeId;
  name: string;
  tagline: string;
  moodTag: string;
  accentGradient: string;
  borderActive: string;
  badgeColor: string;
  iconKey: 'rain' | 'city' | 'beach' | 'fire' | 'space';
}

export const VR_AMBIENCE_SOUNDSCAPES: AmbienceSoundscapeOption[] = [
  {
    id: 'rainy_cafe',
    name: 'Rainy Cafe',
    tagline: 'Soft window rainfall & warm acoustic room glow',
    moodTag: 'Cozy Lo-Fi',
    accentGradient: 'from-sky-500/25 via-slate-900/70 to-indigo-950/60',
    borderActive: 'border-sky-400/70 shadow-[0_0_20px_rgba(56,189,248,0.28)]',
    badgeColor: 'bg-sky-400/20 text-sky-200 border-sky-400/40',
    iconKey: 'rain',
  },
  {
    id: 'neon_city',
    name: 'Neon City',
    tagline: 'Midnight skydeck synth hum & cyberpunk skyline breeze',
    moodTag: 'Cyber Synth',
    accentGradient: 'from-fuchsia-500/25 via-[#140a24] to-cyan-950/60',
    borderActive: 'border-fuchsia-400/70 shadow-[0_0_20px_rgba(217,70,239,0.28)]',
    badgeColor: 'bg-fuchsia-400/20 text-fuchsia-200 border-fuchsia-400/40',
    iconKey: 'city',
  },
  {
    id: 'beach_sunset',
    name: 'Beach Sunset',
    tagline: 'Rhythmic Diani shoreline waves & warm evening tide',
    moodTag: 'Ocean Breeze',
    accentGradient: 'from-amber-500/25 via-[#1c1018] to-rose-950/60',
    borderActive: 'border-amber-400/70 shadow-[0_0_20px_rgba(251,191,36,0.28)]',
    badgeColor: 'bg-amber-400/20 text-amber-200 border-amber-400/40',
    iconKey: 'beach',
  },
  {
    id: 'velvet_hearth',
    name: 'Midnight Hearth',
    tagline: 'Intimate crackling ember warmth for slow love jams',
    moodTag: 'Romantic Warmth',
    accentGradient: 'from-orange-500/25 via-[#1b0d0a] to-red-950/60',
    borderActive: 'border-orange-400/70 shadow-[0_0_20px_rgba(249,115,22,0.28)]',
    badgeColor: 'bg-orange-400/20 text-orange-200 border-orange-400/40',
    iconKey: 'fire',
  },
  {
    id: 'cosmic_nebula',
    name: 'Cosmic Nebula',
    tagline: 'Weightless 432Hz celestial space drift & starlight',
    moodTag: 'Zero-G Space',
    accentGradient: 'from-purple-500/25 via-[#0e0b22] to-cyan-950/50',
    borderActive: 'border-purple-400/70 shadow-[0_0_20px_rgba(168,85,247,0.28)]',
    badgeColor: 'bg-purple-400/20 text-purple-200 border-purple-400/40',
    iconKey: 'space',
  },
];

interface VRLoungeAmbienceSelectorProps {
  onAmbienceChange?: (soundscapeId: AmbienceSoundscapeId | null, isActive: boolean) => void;
}

function renderSoundscapeIcon(iconKey: AmbienceSoundscapeOption['iconKey'], active: boolean) {
  const cls = `w-4 h-4 ${active ? 'text-white' : 'text-zinc-300'}`;
  switch (iconKey) {
    case 'rain':
      return <CloudRain className={cls} />;
    case 'city':
      return <Building2 className={cls} />;
    case 'beach':
      return <Waves className={cls} />;
    case 'fire':
      return <Flame className={cls} />;
    case 'space':
      return <Sparkles className={cls} />;
  }
}

export const VRLoungeAmbienceSelector: React.FC<VRLoungeAmbienceSelectorProps> = ({
  onAmbienceChange,
}) => {
  const [selectedId, setSelectedId] = useState<AmbienceSoundscapeId>(() => {
    try {
      const saved = localStorage.getItem('twogether_vr_ambience_id') as AmbienceSoundscapeId | null;
      if (saved && VR_AMBIENCE_SOUNDSCAPES.some((s) => s.id === saved)) return saved;
    } catch {
      // ignore storage errors
    }
    return 'rainy_cafe';
  });

  const [isAmbiencePlaying, setIsAmbiencePlaying] = useState<boolean>(false);
  const [ambienceVolume, setAmbienceVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('twogether_vr_ambience_vol');
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed;
      }
    } catch {
      // ignore
    }
    return 0.35;
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const activeNodesRef = useRef<Array<{ stop?: () => void; disconnect: () => void }>>([]);
  const crackleTimerRef = useRef<number | null>(null);

  const stopSoundscapeEngine = useCallback(() => {
    if (crackleTimerRef.current !== null) {
      window.clearInterval(crackleTimerRef.current);
      crackleTimerRef.current = null;
    }
    for (const node of activeNodesRef.current) {
      try {
        node.stop?.();
      } catch {
        // ignore already stopped
      }
      try {
        node.disconnect();
      } catch {
        // ignore
      }
    }
    activeNodesRef.current = [];
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    masterGainRef.current = null;
  }, []);

  const startSoundscapeEngine = useCallback(
    (soundscapeId: AmbienceSoundscapeId, targetVol: number, muted: boolean) => {
      stopSoundscapeEngine();

      try {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtxClass) return;

        const ctx = new AudioCtxClass();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const masterGain = ctx.createGain();
        const effectiveVol = muted ? 0 : targetVol * 0.45;
        masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
        masterGain.gain.exponentialRampToValueAtTime(
          Math.max(0.001, effectiveVol),
          ctx.currentTime + 0.55
        );
        masterGain.connect(ctx.destination);

        audioCtxRef.current = ctx;
        masterGainRef.current = masterGain;

        const trackNode = (node: { stop?: () => void; disconnect: () => void }) => {
          activeNodesRef.current.push(node);
          return node;
        };

        // Shared 4-second seamless pink/brown noise buffer helper
        const createNoiseSource = (brownFactor = 0.02) => {
          const bufferSize = ctx.sampleRate * 4;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          let lastOut = 0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + brownFactor * white) / (1 + brownFactor);
            data[i] = lastOut * 3.0;
          }
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          src.loop = true;
          return trackNode(src) as AudioBufferSourceNode;
        };

        if (soundscapeId === 'rainy_cafe') {
          // Gentle Rain Patter Layer
          const rainNoise = createNoiseSource(0.08);
          const rainFilter = ctx.createBiquadFilter();
          rainFilter.type = 'bandpass';
          rainFilter.frequency.value = 1150;
          rainFilter.Q.value = 0.55;
          const rainGain = ctx.createGain();
          rainGain.gain.value = 0.65;

          rainNoise.connect(rainFilter);
          rainFilter.connect(rainGain);
          rainGain.connect(masterGain);
          rainNoise.start();
          trackNode(rainFilter);
          trackNode(rainGain);

          // Warm indoor cafe room tone
          const warmOsc = trackNode(ctx.createOscillator()) as OscillatorNode;
          warmOsc.type = 'sine';
          warmOsc.frequency.value = 110;
          const warmGain = trackNode(ctx.createGain()) as GainNode;
          warmGain.gain.value = 0.08;
          warmOsc.connect(warmGain);
          warmGain.connect(masterGain);
          warmOsc.start();
        } else if (soundscapeId === 'neon_city') {
          // Cyberpunk Synth Chord Pad + Skyline Air
          [130.81, 164.81, 196.0, 246.94].forEach((freq, i) => {
            const osc = trackNode(ctx.createOscillator()) as OscillatorNode;
            osc.type = i % 2 === 0 ? 'triangle' : 'sine';
            osc.frequency.value = freq;
            const filter = trackNode(ctx.createBiquadFilter()) as BiquadFilterNode;
            filter.type = 'lowpass';
            filter.frequency.value = 620;

            const padGain = trackNode(ctx.createGain()) as GainNode;
            padGain.gain.value = 0.09;

            osc.connect(filter);
            filter.connect(padGain);
            padGain.connect(masterGain);
            osc.start();
          });

          const cityAir = createNoiseSource(0.04);
          const airFilter = trackNode(ctx.createBiquadFilter()) as BiquadFilterNode;
          airFilter.type = 'lowpass';
          airFilter.frequency.value = 420;
          const airGain = trackNode(ctx.createGain()) as GainNode;
          airGain.gain.value = 0.35;
          cityAir.connect(airFilter);
          airFilter.connect(airGain);
          airGain.connect(masterGain);
          cityAir.start();
        } else if (soundscapeId === 'beach_sunset') {
          // Ocean Wave Swells via slow LFO modulating filter & gain
          const oceanNoise = createNoiseSource(0.03);
          const waveFilter = trackNode(ctx.createBiquadFilter()) as BiquadFilterNode;
          waveFilter.type = 'lowpass';
          waveFilter.frequency.value = 540;

          const waveGain = trackNode(ctx.createGain()) as GainNode;
          waveGain.gain.value = 0.55;

          const lfo = trackNode(ctx.createOscillator()) as OscillatorNode;
          lfo.type = 'sine';
          lfo.frequency.value = 0.13; // ~7.7s natural wave cycle

          const lfoGain = trackNode(ctx.createGain()) as GainNode;
          lfoGain.gain.value = 0.32;
          lfo.connect(lfoGain);
          lfoGain.connect(waveGain.gain);

          const lfoFilterGain = trackNode(ctx.createGain()) as GainNode;
          lfoFilterGain.gain.value = 260;
          lfo.connect(lfoFilterGain);
          lfoFilterGain.connect(waveFilter.frequency);

          oceanNoise.connect(waveFilter);
          waveFilter.connect(waveGain);
          waveGain.connect(masterGain);

          oceanNoise.start();
          lfo.start();
        } else if (soundscapeId === 'velvet_hearth') {
          // Warm low rumble + sporadic soft ember crackles
          const rumble = createNoiseSource(0.015);
          const lowPass = trackNode(ctx.createBiquadFilter()) as BiquadFilterNode;
          lowPass.type = 'lowpass';
          lowPass.frequency.value = 220;
          const rumbleGain = trackNode(ctx.createGain()) as GainNode;
          rumbleGain.gain.value = 0.7;
          rumble.connect(lowPass);
          lowPass.connect(rumbleGain);
          rumbleGain.connect(masterGain);
          rumble.start();

          crackleTimerRef.current = window.setInterval(() => {
            if (!audioCtxRef.current || !masterGainRef.current || Math.random() > 0.65) return;
            try {
              const t = audioCtxRef.current.currentTime;
              const osc = audioCtxRef.current.createOscillator();
              const popGain = audioCtxRef.current.createGain();
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(1400 + Math.random() * 2200, t);
              popGain.gain.setValueAtTime(0.08, t);
              popGain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
              osc.connect(popGain);
              popGain.connect(masterGainRef.current);
              osc.start(t);
              osc.stop(t + 0.04);
            } catch {
              // ignore crackle tick errors
            }
          }, 260);
        } else if (soundscapeId === 'cosmic_nebula') {
          // Celestial 432Hz + harmonic fifth drone
          [216, 324, 432, 648].forEach((freq, idx) => {
            const osc = trackNode(ctx.createOscillator()) as OscillatorNode;
            osc.type = 'sine';
            osc.frequency.value = freq;
            const g = trackNode(ctx.createGain()) as GainNode;
            g.gain.value = idx < 2 ? 0.1 : 0.045;
            osc.connect(g);
            g.connect(masterGain);
            osc.start();
          });
        }
      } catch {
        // Web Audio unavailable
      }
    },
    [stopSoundscapeEngine]
  );

  useEffect(() => {
    try {
      localStorage.setItem('twogether_vr_ambience_id', selectedId);
      localStorage.setItem('twogether_vr_ambience_vol', String(ambienceVolume));
    } catch {
      // ignore
    }
  }, [selectedId, ambienceVolume]);

  useEffect(() => {
    if (isAmbiencePlaying) {
      startSoundscapeEngine(selectedId, ambienceVolume, isMuted);
    } else {
      stopSoundscapeEngine();
    }
    onAmbienceChange?.(isAmbiencePlaying ? selectedId : null, isAmbiencePlaying);
  }, [isAmbiencePlaying, selectedId, startSoundscapeEngine, stopSoundscapeEngine]);

  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      const target = isMuted ? 0.0001 : Math.max(0.0001, ambienceVolume * 0.45);
      masterGainRef.current.gain.setTargetAtTime(target, audioCtxRef.current.currentTime, 0.08);
    }
  }, [ambienceVolume, isMuted]);

  useEffect(() => {
    return () => {
      stopSoundscapeEngine();
    };
  }, [stopSoundscapeEngine]);

  const activeOption =
    VR_AMBIENCE_SOUNDSCAPES.find((s) => s.id === selectedId) || VR_AMBIENCE_SOUNDSCAPES[0];

  const handleSelectCard = (id: AmbienceSoundscapeId) => {
    if (selectedId === id && isAmbiencePlaying) {
      setIsAmbiencePlaying(false);
    } else {
      setSelectedId(id);
      setIsAmbiencePlaying(true);
      setIsMuted(false);
    }
  };

  return (
    <GlassCard className="p-4 sm:p-5 border border-purple-500/35 space-y-3.5" glowColor="purple">
      {/* Top Ambience Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-left">
          <div
            className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 transition-all ${
              isAmbiencePlaying
                ? 'bg-gradient-to-br from-cyan-400/25 to-pink-500/25 border-cyan-400/60 text-cyan-300 shadow-md shadow-cyan-500/20'
                : 'bg-white/5 border-white/15 text-zinc-400'
            }`}
          >
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-purple-300">
                VR Lounge Soundscape Layer
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold border ${
                  isAmbiencePlaying
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                    : 'bg-zinc-800/80 text-zinc-400 border-white/10'
                }`}
              >
                {isAmbiencePlaying ? `PLAYING: ${activeOption.name.toUpperCase()}` : 'AMBIENCE OFF'}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-white">
              Virtual Environment Ambience Selector
            </h3>
          </div>
        </div>

        {/* Volume, Power & Collapse Controls */}
        <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="text-zinc-300 hover:text-white cursor-pointer"
              title={isMuted ? 'Unmute Ambience' : 'Mute Ambience'}
            >
              {isMuted || ambienceVolume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : ambienceVolume}
              onChange={(e) => {
                setIsMuted(false);
                setAmbienceVolume(parseFloat(e.target.value));
              }}
              className="w-20 sm:w-24 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-400"
              title="Background Ambience Volume"
            />
            <span className="text-[10px] text-zinc-300 w-8 text-right">
              {isMuted ? '0%' : `${Math.round(ambienceVolume * 100)}%`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsAmbiencePlaying(!isAmbiencePlaying)}
            className={`px-3.5 py-2 rounded-xl font-extrabold flex items-center gap-1.5 cursor-pointer transition-all ${
              isAmbiencePlaying
                ? 'bg-gradient-to-r from-cyan-400 to-purple-500 text-black shadow-md'
                : 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {isAmbiencePlaying ? 'Pause Ambience' : `Play ${activeOption.name}`}
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white cursor-pointer"
            title={isExpanded ? 'Collapse Soundscapes' : 'Expand Soundscapes'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Soundscape Selection Grid */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
          {VR_AMBIENCE_SOUNDSCAPES.map((sc) => {
            const isSelected = selectedId === sc.id;
            const isPlayingThis = isSelected && isAmbiencePlaying;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => handleSelectCard(sc.id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 bg-gradient-to-br ${
                  sc.accentGradient
                } ${
                  isPlayingThis
                    ? sc.borderActive
                    : isSelected
                    ? 'border-white/40'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                      isPlayingThis
                        ? 'bg-white/20 border-white/40'
                        : 'bg-black/40 border-white/10'
                    }`}
                  >
                    {renderSoundscapeIcon(sc.iconKey, isPlayingThis)}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${sc.badgeColor}`}
                  >
                    {isPlayingThis ? 'LIVE' : sc.moodTag}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-black text-white flex items-center justify-between">
                    <span>{sc.name}</span>
                    {isPlayingThis && (
                      <span className="flex items-end gap-0.5 h-3">
                        <span className="w-0.5 h-2 bg-cyan-300 animate-pulse rounded-full" />
                        <span className="w-0.5 h-3 bg-pink-400 animate-pulse rounded-full" />
                        <span className="w-0.5 h-1.5 bg-purple-300 animate-pulse rounded-full" />
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-zinc-300 leading-snug mt-0.5 line-clamp-2">
                    {sc.tagline}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
};
