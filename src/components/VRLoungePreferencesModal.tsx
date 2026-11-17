import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Volume1,
  Users,
  Eye,
  Compass,
  Check,
  RotateCcw,
  X,
  Radio,
  Layers,
  ShieldCheck,
  Disc,
  Headphones,
  Crown,
  Smile,
  Zap,
  Activity,
  Play,
  Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { VRLoungePreferences } from '../types';

export const DEFAULT_VR_PREFERENCES: VRLoungePreferences = {
  environmentTheme: 'cyberpunk_nairobi',
  customLightingColor: '#06b6d4',
  lightingIntensity: 75,
  showGridFloor: true,
  gridParticleDensity: 'medium',
  ambientAudioReactive: true,

  avatarVisibility: 'all',
  showNameTags: true,
  showDistanceTags: true,
  showVerificationBadges: true,
  showMoodBubbles: true,
  danceAnimationStyle: 'beat_sync',
  personalAccessory: 'gold_crown',

  proximityChatEnabled: true,
  masterProximityVolume: 80,
  proximityRadius: 'social',
  spatialStereoPanning: true,
  falloffCurve: 'logarithmic',
};

export const VR_THEME_OPTIONS = [
  {
    id: 'cyberpunk_nairobi',
    name: 'Nairobi Cyberpunk Skyline',
    badge: '🇰🇪 Kenya Skydeck',
    bgGradient: 'from-purple-950/80 via-[#0B0915] to-cyan-950/80',
    accentColor: '#06b6d4',
    description: 'Neon synth towers with glowing Nairobi skyscraper silhouettes.',
  },
  {
    id: 'deep_space',
    name: 'Deep Space Nebula Zenith',
    badge: '🌌 Zero-G Orbit',
    bgGradient: 'from-indigo-950/80 via-[#090812] to-slate-950/90',
    accentColor: '#a855f7',
    description: 'Floating orbital platform amidst cosmic stardust & violet nebulae.',
  },
  {
    id: 'sunset_oasis',
    name: 'Sunset Glass Oasis',
    badge: '🌅 Diani Beach Horizon',
    bgGradient: 'from-amber-950/80 via-[#100A18] to-rose-950/80',
    accentColor: '#f43f5e',
    description: 'Warm coral dusk reflecting over translucent floating glass decks.',
  },
  {
    id: 'tokyo_neo',
    name: 'Neo-Tokyo Shibuya Horizon',
    badge: '🇯🇵 Neon Cyber Rain',
    bgGradient: 'from-fuchsia-950/80 via-[#0a0518] to-blue-950/80',
    accentColor: '#d946ef',
    description: 'Brisk midnight rain with neon billboard holographic projections.',
  },
  {
    id: 'paris_midnight',
    name: 'Parisian Midnight Mirage',
    badge: '🇫🇷 Seine Rooftop',
    bgGradient: 'from-blue-950/80 via-[#080d1a] to-emerald-950/80',
    accentColor: '#38bdf8',
    description: 'Starlit bohemian lounge overlooking glistening moonlit avenues.',
  },
  {
    id: 'golden_vip',
    name: 'Golden VIP Skylounge',
    badge: '👑 Royal Penthouse',
    bgGradient: 'from-amber-900/60 via-[#120f0a] to-zinc-950',
    accentColor: '#f59e0b',
    description: 'Opulent gold-leaf trim, floating champagne tables, and velvet light.',
  },
];

export const LIGHTING_COLOR_PALETTES = [
  { id: '#06b6d4', name: 'Electric Cyan', border: 'border-cyan-400', bg: 'bg-cyan-400' },
  { id: '#f43f5e', name: 'Cyber Rose', border: 'border-rose-400', bg: 'bg-rose-400' },
  { id: '#f59e0b', name: 'Imperial Gold', border: 'border-amber-400', bg: 'bg-amber-400' },
  { id: '#10b981', name: 'Emerald Mirage', border: 'border-emerald-400', bg: 'bg-emerald-400' },
  { id: '#a855f7', name: 'Ultraviolet', border: 'border-purple-400', bg: 'bg-purple-400' },
  { id: '#38bdf8', name: 'Arctic Ice', border: 'border-sky-400', bg: 'bg-sky-400' },
];

export const ACCESSORY_OPTIONS = [
  { id: 'gold_crown', name: 'Celestial Crown', icon: '👑', desc: 'Floating golden aura crown' },
  { id: 'neon_ring', name: 'Neon Halo Ring', icon: '💫', desc: 'Spinning electric aura circle' },
  { id: 'dj_headphones', name: 'DJ Glow Headset', icon: '🎧', desc: 'Illuminated RGB sound cans' },
  { id: 'cyber_visor', name: 'Cyberpunk Visor', icon: '🥽', desc: 'HUD visor with neon readout' },
  { id: 'none', name: 'Minimalist Clean', icon: '✨', desc: 'Natural avatar without accessories' },
] as const;

interface VRLoungePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: VRLoungePreferences;
  onSavePreferences: (updated: VRLoungePreferences) => void;
}

export const VRLoungePreferencesModal: React.FC<VRLoungePreferencesModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onSavePreferences,
}) => {
  const [activeTab, setActiveTab] = useState<'env' | 'avatar' | 'proximity'>('env');
  const [localPrefs, setLocalPrefs] = useState<VRLoungePreferences>(preferences);
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [isAudioTesting, setIsAudioTesting] = useState(false);

  // Sync when preferences change or modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalPrefs(preferences);
      setIsSavedNotice(false);
    }
  }, [isOpen, preferences]);

  // Handle saving and persisting
  const handleSave = () => {
    onSavePreferences(localPrefs);
    try {
      localStorage.setItem('twogether_vr_preferences', JSON.stringify(localPrefs));
    } catch {
      // storage unavailable
    }
    setIsSavedNotice(true);
    setTimeout(() => {
      setIsSavedNotice(false);
      onClose();
    }, 600);
  };

  // Reset to default settings
  const handleReset = () => {
    setLocalPrefs(DEFAULT_VR_PREFERENCES);
  };

  // Interactive Web Audio Spatial Proximity Test
  const handleTestSpatialAudio = () => {
    if (!localPrefs.proximityChatEnabled) return;
    setIsAudioTesting(true);

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        setTimeout(() => setIsAudioTesting(false), 1200);
        return;
      }

      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      // Pan calculation
      let panNode: any = null;
      if (localPrefs.spatialStereoPanning && audioCtx.createStereoPanner) {
        panNode = audioCtx.createStereoPanner();
        // Sweep stereo pan: Left -> Center -> Right
        panNode.pan.setValueAtTime(-0.8, audioCtx.currentTime);
        panNode.pan.linearRampToValueAtTime(0.8, audioCtx.currentTime + 1.2);
      }

      const volMultiplier = (localPrefs.masterProximityVolume / 100);
      const radiusFactor = localPrefs.proximityRadius === 'whisper' ? 0.4 : localPrefs.proximityRadius === 'social' ? 0.75 : 1.0;
      const targetGain = 0.15 * volMultiplier * radiusFactor;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
      osc.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.6); // E5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 1.2); // A5

      gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(Math.max(0.001, targetGain), audioCtx.currentTime + 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.3);

      if (panNode) {
        osc.connect(gainNode);
        gainNode.connect(panNode);
        panNode.connect(audioCtx.destination);
      } else {
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
      }

      osc.start();
      osc.stop(audioCtx.currentTime + 1.4);

      setTimeout(() => {
        setIsAudioTesting(false);
      }, 1400);
    } catch {
      setIsAudioTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vr-preferences-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-fade-in"
    >
      <GlassCard
        className="w-full max-w-2xl max-h-[90vh] flex flex-col p-0 border border-cyan-500/40 shadow-2xl rounded-3xl overflow-hidden bg-[#0D0B18]"
        glowColor="cyan"
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-black/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/40 shadow-lg shadow-cyan-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Spatial Audio & 3D Optics
                </span>
                <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
                  v2.4
                </span>
              </div>
              <h2 id="vr-preferences-title" className="text-lg sm:text-xl font-black text-white tracking-wide">
                VR Lounge Preferences
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close VR Preferences"
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Visualizer Preview Header */}
        <div className="px-4 py-3 bg-black/50 border-b border-white/10 flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-full border flex items-center justify-center text-xs shadow-md transition-colors"
              style={{
                borderColor: localPrefs.customLightingColor,
                backgroundColor: `${localPrefs.customLightingColor}20`,
                boxShadow: `0 0 12px ${localPrefs.customLightingColor}60`,
              }}
            >
              {localPrefs.personalAccessory === 'gold_crown' && '👑'}
              {localPrefs.personalAccessory === 'neon_ring' && '💫'}
              {localPrefs.personalAccessory === 'dj_headphones' && '🎧'}
              {localPrefs.personalAccessory === 'cyber_visor' && '🥽'}
              {localPrefs.personalAccessory === 'none' && '👤'}
            </div>
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <span>Active Presence</span>
                <span className="text-[10px] text-zinc-400">
                  ({localPrefs.avatarVisibility === 'all' ? 'Public Crowd' : localPrefs.avatarVisibility === 'verified_only' ? 'Verified Only' : 'Private Bubble'})
                </span>
              </div>
              <span className="text-[10px] text-zinc-400">
                Light Tint: <strong style={{ color: localPrefs.customLightingColor }}>{localPrefs.customLightingColor}</strong> ({localPrefs.lightingIntensity}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-cyan-300 flex items-center gap-1.5">
              <Volume2 className="w-3 h-3 text-cyan-400" />
              <span>{localPrefs.proximityChatEnabled ? `${localPrefs.masterProximityVolume}% (${localPrefs.proximityRadius})` : 'Muted'}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 p-1.5 bg-black/70 border-b border-white/10 gap-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('env')}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'env'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-500/10'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="truncate">Environment</span>
          </button>

          <button
            onClick={() => setActiveTab('avatar')}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'avatar'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-md shadow-purple-500/10'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span className="truncate">Avatar Display</span>
          </button>

          <button
            onClick={() => setActiveTab('proximity')}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'proximity'
                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-md shadow-pink-500/10'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-pink-400" />
            <span className="truncate">Proximity Chat</span>
          </button>
        </div>

        {/* Modal Body / Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-sm text-zinc-300">
          {/* TAB 1: ENVIRONMENT BACKGROUND */}
          {activeTab === 'env' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Virtual Skybox Themes */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-mono font-bold uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> 3D Virtual Environment Skybox
                  </label>
                  <span className="text-[11px] text-zinc-500 font-mono">6 Themes Available</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {VR_THEME_OPTIONS.map((theme) => {
                    const isSelected = localPrefs.environmentTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() =>
                          setLocalPrefs((prev) => ({
                            ...prev,
                            environmentTheme: theme.id,
                            customLightingColor: theme.accentColor,
                          }))
                        }
                        className={`text-left p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-950/30 shadow-lg shadow-cyan-500/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                            {theme.name}
                          </span>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-cyan-400 text-black flex items-center justify-center text-xs">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-cyan-300 border border-white/10 inline-block mb-1.5">
                          {theme.badge}
                        </span>
                        <p className="text-[11px] text-zinc-400 leading-snug">
                          {theme.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Atmospheric Lighting Tint */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> Custom Lighting Tint
                    </label>
                    <span className="text-[10px] font-mono text-zinc-400">
                      Color: {localPrefs.customLightingColor}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {LIGHTING_COLOR_PALETTES.map((palette) => {
                      const isChosen = localPrefs.customLightingColor.toLowerCase() === palette.id.toLowerCase();
                      return (
                        <button
                          key={palette.id}
                          onClick={() =>
                            setLocalPrefs((prev) => ({ ...prev, customLightingColor: palette.id }))
                          }
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                            isChosen
                              ? `${palette.border} bg-white/15 text-white font-bold ring-1 ${palette.border}`
                              : 'border-white/10 bg-black/40 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full shadow-sm"
                            style={{ backgroundColor: palette.id }}
                          />
                          <span>{palette.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Lighting Intensity Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                    <span className="text-zinc-400">Atmospheric Light Intensity & Bloom:</span>
                    <strong className="text-cyan-400">{localPrefs.lightingIntensity}%</strong>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    step="5"
                    value={localPrefs.lightingIntensity}
                    onChange={(e) =>
                      setLocalPrefs((prev) => ({
                        ...prev,
                        lightingIntensity: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                    <span>Muted / Moody (20%)</span>
                    <span>Radiant Cyber Bloom (100%)</span>
                  </div>
                </div>
              </div>

              {/* Grid Floor & Dynamic Reactive Lighting Toggles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div>
                    <h4 className="text-xs font-bold text-white">3D Holographic Perspective Floor</h4>
                    <p className="text-[11px] text-zinc-400">
                      Renders depth-projected neon floor coordinates for walking.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setLocalPrefs((prev) => ({ ...prev, showGridFloor: !prev.showGridFloor }))
                    }
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      localPrefs.showGridFloor ? 'bg-cyan-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                        localPrefs.showGridFloor ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div>
                    <h4 className="text-xs font-bold text-white">Audio-Reactive Wall Pulses</h4>
                    <p className="text-[11px] text-zinc-400">
                      Surrounding environment walls and beams vibrate in sync with DJ bass drops.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setLocalPrefs((prev) => ({
                        ...prev,
                        ambientAudioReactive: !prev.ambientAudioReactive,
                      }))
                    }
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      localPrefs.ambientAudioReactive ? 'bg-cyan-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                        localPrefs.ambientAudioReactive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: AVATAR DISPLAY SETTINGS */}
          {activeTab === 'avatar' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Avatar Visibility Filter */}
              <div>
                <label className="text-xs font-mono font-bold uppercase text-purple-400 tracking-wider flex items-center gap-1.5 mb-2.5">
                  <Eye className="w-3.5 h-3.5" /> Avatar Visibility Scope
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      id: 'all',
                      label: 'All Avatars',
                      badge: '🌐 Public Room',
                      desc: 'Full crowd presence with all verified and guest souls.',
                    },
                    {
                      id: 'verified_only',
                      label: 'Verified Only',
                      badge: '🛡️ High Trust',
                      desc: 'Only display verified members with active soul tokens.',
                    },
                    {
                      id: 'solo',
                      label: 'Solo Bubble',
                      badge: '🧘 Private Sanctuary',
                      desc: 'Hide all other avatars. Listen and relax in private space.',
                    },
                  ].map((mode) => {
                    const isSelected = localPrefs.avatarVisibility === mode.id;
                    return (
                      <button
                        key={mode.id}
                        onClick={() =>
                          setLocalPrefs((prev) => ({
                            ...prev,
                            avatarVisibility: mode.id as any,
                          }))
                        }
                        className={`text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-purple-400 bg-purple-950/40 shadow-lg shadow-purple-500/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white">{mode.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                        </div>
                        <span className="text-[10px] font-mono text-purple-300 block mb-1">
                          {mode.badge}
                        </span>
                        <p className="text-[11px] text-zinc-400 leading-snug">{mode.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Personal Avatar Accessory & Headpiece */}
              <div>
                <label className="text-xs font-mono font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1.5 mb-2.5">
                  <Crown className="w-3.5 h-3.5" /> Your Avatar Headpiece & Aura Halo
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ACCESSORY_OPTIONS.map((item) => {
                    const isSelected = localPrefs.personalAccessory === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() =>
                          setLocalPrefs((prev) => ({
                            ...prev,
                            personalAccessory: item.id as any,
                          }))
                        }
                        className={`text-left p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-400 bg-amber-950/30 shadow-md'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <span className="text-2xl p-2 rounded-xl bg-black/40 border border-white/10 flex-shrink-0">
                          {item.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dance Animation Style */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <label className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-pink-400" /> Avatar Dance Animation Style
                </label>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  {[
                    { id: 'beat_sync', label: '🕺 Beat-Sync', desc: 'Bounces to BPM' },
                    { id: 'chill_sway', label: '🌊 Chill Sway', desc: 'Smooth oscillation' },
                    { id: 'still', label: '🧘 Attentive', desc: 'Stationary posture' },
                  ].map((style) => {
                    const isSelected = localPrefs.danceAnimationStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        onClick={() =>
                          setLocalPrefs((prev) => ({
                            ...prev,
                            danceAnimationStyle: style.id as any,
                          }))
                        }
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-pink-400 bg-pink-950/40 text-pink-300 font-bold'
                            : 'border-white/10 bg-black/40 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span className="block font-bold text-white text-xs">{style.label}</span>
                        <span className="text-[10px] text-zinc-400">{style.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Avatar Overhead HUD Elements */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold uppercase text-zinc-400 tracking-wider">
                  Overhead Tag Elements
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Name Tags */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                    <span className="text-white">Show Name Tags</span>
                    <input
                      type="checkbox"
                      checked={localPrefs.showNameTags}
                      onChange={(e) =>
                        setLocalPrefs((prev) => ({ ...prev, showNameTags: e.target.checked }))
                      }
                      className="w-4 h-4 accent-cyan-400 cursor-pointer"
                    />
                  </label>

                  {/* Distance Metres */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                    <span className="text-white">Show Distance Tags (e.g. 4.2m)</span>
                    <input
                      type="checkbox"
                      checked={localPrefs.showDistanceTags}
                      onChange={(e) =>
                        setLocalPrefs((prev) => ({ ...prev, showDistanceTags: e.target.checked }))
                      }
                      className="w-4 h-4 accent-cyan-400 cursor-pointer"
                    />
                  </label>

                  {/* Verification Badges */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                    <span className="text-white">Show Verified Soul Badges (👑/🛡️)</span>
                    <input
                      type="checkbox"
                      checked={localPrefs.showVerificationBadges}
                      onChange={(e) =>
                        setLocalPrefs((prev) => ({
                          ...prev,
                          showVerificationBadges: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 accent-cyan-400 cursor-pointer"
                    />
                  </label>

                  {/* Mood Thought Bubbles */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                    <span className="text-white">Show Mood & Thought Bubbles</span>
                    <input
                      type="checkbox"
                      checked={localPrefs.showMoodBubbles}
                      onChange={(e) =>
                        setLocalPrefs((prev) => ({ ...prev, showMoodBubbles: e.target.checked }))
                      }
                      className="w-4 h-4 accent-cyan-400 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: PROXIMITY CHAT VOLUME */}
          {activeTab === 'proximity' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Master Proximity Enable Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-pink-950/30 to-purple-950/20 border border-pink-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center border border-pink-500/40">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Spatial Proximity Chat Voice</h4>
                    <p className="text-[11px] text-zinc-400">
                      Hear other avatars speak louder as you walk closer to them in 3D.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() =>
                    setLocalPrefs((prev) => ({
                      ...prev,
                      proximityChatEnabled: !prev.proximityChatEnabled,
                    }))
                  }
                  className={`w-14 h-7 rounded-full transition-colors relative cursor-pointer ${
                    localPrefs.proximityChatEnabled ? 'bg-pink-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                      localPrefs.proximityChatEnabled ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Master Proximity Volume Slider */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 flex items-center gap-2">
                    {localPrefs.masterProximityVolume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : localPrefs.masterProximityVolume < 50 ? (
                      <Volume1 className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-pink-400" />
                    )}
                    Master Proximity Chat Gain:
                  </span>
                  <strong className="text-pink-400 font-bold text-sm">
                    {localPrefs.masterProximityVolume}%
                  </strong>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={localPrefs.masterProximityVolume}
                  disabled={!localPrefs.proximityChatEnabled}
                  onChange={(e) =>
                    setLocalPrefs((prev) => ({
                      ...prev,
                      masterProximityVolume: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-pink-500 cursor-pointer disabled:opacity-40"
                />

                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>Mute (0%)</span>
                  <span>Whisper (25%)</span>
                  <span>Optimal (80%)</span>
                  <span>Boost (100%)</span>
                </div>
              </div>

              {/* Acoustic Falloff Radius Selection */}
              <div>
                <label className="text-xs font-mono font-bold uppercase text-pink-400 tracking-wider flex items-center gap-1.5 mb-2.5">
                  <Compass className="w-3.5 h-3.5" /> Acoustic Distance Sensitivity Radius
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'whisper',
                      label: 'Intimate Whisper',
                      distance: '3 Metres',
                      badge: '🤫 Private',
                      desc: 'Sharp audio falloff. Hear only souls standing directly adjacent to you.',
                    },
                    {
                      id: 'social',
                      label: 'Social Lounge',
                      distance: '8 Metres',
                      badge: '👥 Standard',
                      desc: 'Natural room acoustics. Enjoy cluster group chats without background roar.',
                    },
                    {
                      id: 'concert',
                      label: 'Concert Stadium',
                      distance: '25 Metres',
                      badge: '🏟️ Arena Wide',
                      desc: 'Expansive acoustic envelope. Hear shoutouts across the entire venue.',
                    },
                  ].map((rad) => {
                    const isSelected = localPrefs.proximityRadius === rad.id;
                    return (
                      <button
                        key={rad.id}
                        disabled={!localPrefs.proximityChatEnabled}
                        onClick={() =>
                          setLocalPrefs((prev) => ({
                            ...prev,
                            proximityRadius: rad.id as any,
                          }))
                        }
                        className={`text-left p-3 rounded-2xl border transition-all cursor-pointer disabled:opacity-40 ${
                          isSelected
                            ? 'border-pink-400 bg-pink-950/40 shadow-lg shadow-pink-500/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white">{rad.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-pink-400" />}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-pink-300 mb-1">
                          <span>{rad.distance}</span>
                          <span>•</span>
                          <span>{rad.badge}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-snug">{rad.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Spatial Panning & Falloff Curve Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 3D Stereo Panning */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-white">Binaural L/R Stereo Panning</h5>
                    <p className="text-[10px] text-zinc-400">
                      Pans voices to left or right ear according to avatar position on floor.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localPrefs.spatialStereoPanning}
                    disabled={!localPrefs.proximityChatEnabled}
                    onChange={(e) =>
                      setLocalPrefs((prev) => ({
                        ...prev,
                        spatialStereoPanning: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-pink-500 cursor-pointer"
                  />
                </div>

                {/* Falloff Curve */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-white">Falloff Physics Curve</h5>
                    <p className="text-[10px] text-zinc-400">
                      {localPrefs.falloffCurve === 'logarithmic'
                        ? 'Logarithmic (Realistic acoustic drop)'
                        : 'Linear (Steady drop)'}
                    </p>
                  </div>
                  <button
                    disabled={!localPrefs.proximityChatEnabled}
                    onClick={() =>
                      setLocalPrefs((prev) => ({
                        ...prev,
                        falloffCurve: prev.falloffCurve === 'logarithmic' ? 'linear' : 'logarithmic',
                      }))
                    }
                    className="px-2 py-1 rounded-lg bg-black/60 border border-white/20 text-[10.5px] font-mono text-cyan-300 hover:text-white cursor-pointer"
                  >
                    {localPrefs.falloffCurve === 'logarithmic' ? 'Logarithmic' : 'Linear'}
                  </button>
                </div>
              </div>

              {/* Interactive Audio Test Trigger */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-pink-950/40 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-left font-mono">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Disc className="w-4 h-4 text-cyan-400 animate-spin" />
                    <span>Acoustic Calibration Test</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Plays an 880Hz spatial binaural sweep to audition your volume and stereo settings.
                  </p>
                </div>

                <button
                  onClick={handleTestSpatialAudio}
                  disabled={isAudioTesting || !localPrefs.proximityChatEnabled}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    isAudioTesting
                      ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/40 animate-pulse'
                      : !localPrefs.proximityChatEnabled
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-400 to-pink-500 text-black hover:scale-105 active:scale-95 shadow-md'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>{isAudioTesting ? 'Playing 3D Test...' : 'Test Proximity Audio'}</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-black/80 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 font-mono">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-400 to-pink-500 text-black shadow-lg shadow-cyan-500/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isSavedNotice ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Preferences Saved!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Apply Preferences</span>
                </>
              )}
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
