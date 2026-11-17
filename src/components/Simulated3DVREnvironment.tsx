import React, { useState, useEffect } from 'react';
import {
  Compass,
  Move,
  Users,
  Sparkles,
  Zap,
  Radio,
  Eye,
  Disc,
  Headphones,
  Maximize2,
  Volume2,
  VolumeX,
  Heart,
  Flame,
  Music,
  Sliders,
  ShieldCheck,
  Check,
  Crown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { JamTrack, VRLoungePreferences } from '../types';
import {
  VRLoungePreferencesModal,
  DEFAULT_VR_PREFERENCES,
  VR_THEME_OPTIONS,
} from './VRLoungePreferencesModal';

export type CameraAngle = 'orbit' | 'first_person' | 'stage_front' | 'top_down';

interface Simulated3DVREnvironmentProps {
  currentTrack: JamTrack;
  isPlaying: boolean;
  onSendReaction: (emoji: string) => void;
  listenersCount?: number;
  onSelectTrackNext?: () => void;
}

interface VRAvatar {
  id: string;
  name: string;
  avatarUrl: string;
  x: number; // percentage 10 - 90
  y: number; // percentage 10 - 90
  isDancing: boolean;
  mood: string;
  isMe?: boolean;
  isVerified?: boolean;
}

export const Simulated3DVREnvironment: React.FC<Simulated3DVREnvironmentProps> = ({
  currentTrack,
  isPlaying,
  onSendReaction,
  listenersCount = 6,
  onSelectTrackNext,
}) => {
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>('orbit');
  const [myPos, setMyPos] = useState<{ x: number; y: number }>({ x: 50, y: 70 });
  const [spatialDistance, setSpatialDistance] = useState<number>(0.85); // 0 (far) to 1 (close to DJ booth)
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  // Load preferences from localStorage or use defaults
  const [preferences, setPreferences] = useState<VRLoungePreferences>(() => {
    try {
      const saved = localStorage.getItem('twogether_vr_preferences');
      if (saved) {
        return { ...DEFAULT_VR_PREFERENCES, ...JSON.parse(saved) };
      }
    } catch {
      // storage unavailable
    }
    return DEFAULT_VR_PREFERENCES;
  });

  // Simulated 3D avatars in the room
  const [avatars, setAvatars] = useState<VRAvatar[]>([
    {
      id: 'usr_me',
      name: 'You (Verified Soul)',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      x: 50,
      y: 70,
      isDancing: true,
      mood: '🎶 Vibing to Love Hits',
      isMe: true,
      isVerified: true,
    },
    {
      id: 'usr_aria',
      name: 'Aria Sterling',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
      x: 32,
      y: 52,
      isDancing: true,
      mood: '✨ Feeling the Amapiano drop',
      isVerified: true,
    },
    {
      id: 'usr_dylan',
      name: 'Dylan Wisney',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      x: 68,
      y: 48,
      isDancing: true,
      mood: '🇰🇪 Sauti Sol & Otile fan',
      isVerified: false,
    },
    {
      id: 'usr_maya',
      name: 'Maya Lin',
      avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80',
      x: 25,
      y: 65,
      isDancing: true,
      mood: '❤️ In love with this groove',
      isVerified: true,
    },
    {
      id: 'usr_ken',
      name: 'Kaelen Vance',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      x: 75,
      y: 68,
      isDancing: true,
      mood: '🥽 3D VR Headset Mode',
      isVerified: false,
    },
  ]);

  // Current room derived from user preferences theme
  const currentTheme =
    VR_THEME_OPTIONS.find((t) => t.id === preferences.environmentTheme) ||
    VR_THEME_OPTIONS[0];

  // Click on floor to walk in 3D
  const handleFloorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(12, Math.min(88, clickX));
    const clampedY = Math.max(25, Math.min(85, clickY));

    setMyPos({ x: clampedX, y: clampedY });

    // Update avatar position
    setAvatars((prev) =>
      prev.map((a) => (a.isMe ? { ...a, x: clampedX, y: clampedY } : a))
    );

    // Calculate proximity to central DJ booth at (50, 30)
    const dist = Math.sqrt(Math.pow(clampedX - 50, 2) + Math.pow(clampedY - 30, 2));
    const proximity = Math.max(0.3, Math.min(1.0, 1 - dist / 70));
    setSpatialDistance(Number(proximity.toFixed(2)));
  };

  // Camera perspective styles
  const cameraTransforms: Record<CameraAngle, { perspective: string; transform: string }> = {
    orbit: {
      perspective: '1000px',
      transform: 'rotateX(30deg) rotateY(0deg) scale(0.96)',
    },
    first_person: {
      perspective: '600px',
      transform: 'rotateX(10deg) translateY(20px) scale(1.12)',
    },
    stage_front: {
      perspective: '900px',
      transform: 'rotateX(18deg) translateY(-20px) scale(1.05)',
    },
    top_down: {
      perspective: '1400px',
      transform: 'rotateX(55deg) scale(0.88)',
    },
  };

  // Filter avatars based on user preferences
  const visibleAvatars = avatars.filter((av) => {
    if (av.isMe) return true; // always show user
    if (preferences.avatarVisibility === 'solo') return false;
    if (preferences.avatarVisibility === 'verified_only') return !!av.isVerified;
    return true; // 'all'
  });

  // Calculate distance in metres for an avatar from user
  const getDistanceMetres = (av: VRAvatar) => {
    if (av.isMe) return '0.0m';
    const deltaX = (av.x - myPos.x) * 0.25;
    const deltaY = (av.y - myPos.y) * 0.25;
    const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    return `${dist.toFixed(1)}m`;
  };

  // Determine effective proximity volume
  const effectiveVolume = preferences.proximityChatEnabled
    ? Math.round(spatialDistance * preferences.masterProximityVolume)
    : 0;

  // Calculate Stereo Panning indicator (L / Center / R)
  const panPosition = myPos.x < 42 ? 'Left Pan' : myPos.x > 58 ? 'Right Pan' : 'Center Stereo';

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-cyan-500/40 bg-[#0B0915] shadow-2xl">
      {/* 3D VR Header Controls Bar */}
      <div className="p-3.5 bg-black/60 backdrop-blur-xl border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono z-30 relative">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors shadow-sm"
            style={{
              backgroundColor: `${preferences.customLightingColor}25`,
              borderColor: `${preferences.customLightingColor}60`,
              color: preferences.customLightingColor,
            }}
          >
            <Radio className="w-4 h-4 animate-spin" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-bold block flex items-center gap-1.5">
              <span>3D Spatial Sound Lounge</span>
              <span>•</span>
              <span className="text-cyan-300">{currentTheme.badge}</span>
            </span>
            <span className="text-white font-bold">{currentTheme.name}</span>
          </div>
        </div>

        {/* Camera Angle Selector */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          <span className="text-[10px] text-zinc-400 px-1.5 flex items-center gap-1">
            <Eye className="w-3 h-3 text-cyan-400" /> Cam:
          </span>
          {(
            [
              { id: 'orbit', label: '3D Orbit' },
              { id: 'stage_front', label: 'DJ Stage' },
              { id: 'first_person', label: 'VR Headset' },
              { id: 'top_down', label: 'Skydeck' },
            ] as const
          ).map((c) => (
            <button
              key={c.id}
              onClick={() => setCameraAngle(c.id)}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                cameraAngle === c.id
                  ? 'bg-cyan-400 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* VR Quick Preferences Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreferencesOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 hover:from-cyan-500/30 hover:to-pink-500/30 border border-cyan-400/50 text-white font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>VR Preferences</span>
            <span
              className="w-2 h-2 rounded-full animate-ping ml-0.5"
              style={{ backgroundColor: preferences.customLightingColor }}
            />
          </button>
        </div>
      </div>

      {/* 3D Simulated Viewport Canvas Box */}
      <div
        onClick={handleFloorClick}
        className={`relative h-[440px] sm:h-[500px] w-full overflow-hidden cursor-crosshair select-none bg-gradient-to-b ${currentTheme.bgGradient}`}
        style={{ perspective: cameraTransforms[cameraAngle].perspective }}
      >
        {/* Atmospheric Dynamic Lighting Bloom Tint */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-700"
          style={{
            backgroundColor: preferences.customLightingColor,
            opacity: (preferences.lightingIntensity / 100) * 0.16,
            mixBlendMode: 'screen',
          }}
        />

        {/* Dynamic 3D Room Grid Floor */}
        <div
          className="absolute inset-0 transition-transform duration-700 ease-out flex items-center justify-center"
          style={{
            transform: cameraTransforms[cameraAngle].transform,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Cyber Perspective Grid Ground (Toggleable via preferences) */}
          {preferences.showGridFloor && (
            <div
              className="absolute inset-[-40%] rounded-[100px] pointer-events-none transition-all"
              style={{
                backgroundImage: `linear-gradient(${preferences.customLightingColor}30 1px, transparent 1px), linear-gradient(90deg, ${preferences.customLightingColor}30 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
                transform: 'rotateX(60deg) translateZ(-60px)',
                maskImage: 'radial-gradient(circle, black 40%, transparent 80%)',
              }}
            />
          )}

          {/* Central 3D Stage & Holographic DJ Console at top-center (x: 50%, y: 28%) */}
          <div
            className="absolute top-[16%] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
            style={{ transform: 'translateZ(40px)' }}
          >
            {/* Pulsing Light Beams shooting upward with custom lighting color */}
            <div className="relative flex items-center justify-center mb-2">
              <div
                className={`w-32 h-32 rounded-full blur-2xl transition-all ${
                  isPlaying && preferences.ambientAudioReactive
                    ? 'animate-pulse scale-110'
                    : 'opacity-40'
                }`}
                style={{
                  backgroundColor: `${preferences.customLightingColor}60`,
                }}
              />
              <div
                className={`absolute w-20 h-20 rounded-full blur-xl ${
                  isPlaying ? 'animate-ping' : ''
                }`}
                style={{
                  backgroundColor: `${preferences.customLightingColor}80`,
                }}
              />
            </div>

            {/* 3D Holographic DJ Booth */}
            <div
              className="relative p-3 rounded-2xl bg-black/85 border-2 shadow-2xl flex items-center gap-3 backdrop-blur-xl transition-all"
              style={{
                borderColor: `${preferences.customLightingColor}90`,
                boxShadow: `0 0 25px ${preferences.customLightingColor}40`,
              }}
            >
              {/* Spinning 3D Vinyl */}
              <motion.div
                animate={{ rotate: isPlaying ? 360 : 0 }}
                transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
                className="w-12 h-12 rounded-full bg-zinc-900 border-2 border-pink-400 p-1 flex items-center justify-center shadow-lg"
              >
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-cyan-400 to-pink-500 p-0.5">
                  <img
                    src={currentTrack.coverUrl}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </motion.div>

              {/* DJ Booth Marquee */}
              <div className="text-left font-mono">
                <div className="flex items-center gap-1 text-[9px] text-cyan-300">
                  <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" />
                  <span>3D DJ STAGE • {isPlaying ? 'LIVE STREAM' : 'PAUSED'}</span>
                </div>
                <p className="text-xs font-black text-white truncate max-w-[140px]">
                  {currentTrack.title}
                </p>
                <p className="text-[10px] text-zinc-400 truncate max-w-[140px]">
                  {currentTrack.artist}
                </p>
              </div>

              {/* Holographic Speaker Towers on sides */}
              <div className="flex items-center gap-1 text-cyan-400">
                <span
                  className={`w-1.5 h-6 rounded-full ${
                    isPlaying ? 'animate-bounce' : ''
                  }`}
                  style={{ backgroundColor: preferences.customLightingColor }}
                />
                <span className={`w-1.5 h-9 rounded-full bg-pink-400 ${isPlaying ? 'animate-pulse' : ''}`} />
                <span className={`w-1.5 h-7 rounded-full bg-amber-400 ${isPlaying ? 'animate-bounce' : ''}`} />
              </div>
            </div>
          </div>

          {/* Render 3D Spatial Avatars with Preferences Applied */}
          {visibleAvatars.map((av) => {
            // Dance animation styles based on preference
            const danceAnim =
              preferences.danceAnimationStyle === 'beat_sync' && isPlaying
                ? { y: [0, -8, 0] }
                : preferences.danceAnimationStyle === 'chill_sway' && isPlaying
                ? { x: [-3, 3, -3], rotate: [-2, 2, -2] }
                : {};

            const danceTransition =
              preferences.danceAnimationStyle === 'beat_sync'
                ? { repeat: Infinity, duration: 0.58, ease: 'easeInOut' }
                : preferences.danceAnimationStyle === 'chill_sway'
                ? { repeat: Infinity, duration: 2.4, ease: 'easeInOut' }
                : undefined;

            return (
              <motion.div
                key={av.id}
                initial={false}
                animate={{
                  left: `${av.x}%`,
                  top: `${av.y}%`,
                  ...danceAnim,
                }}
                transition={{
                  left: { type: 'spring', damping: 20, stiffness: 120 },
                  top: { type: 'spring', damping: 20, stiffness: 120 },
                  ...(danceTransition ? { y: danceTransition, x: danceTransition, rotate: danceTransition } : {}),
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer pointer-events-auto select-none"
                style={{
                  transform: `translateZ(${av.isMe ? 35 : 20}px)`,
                }}
              >
                {/* Mood Speech Bubble (Configurable via preferences) */}
                {preferences.showMoodBubbles && (
                  <div className="mb-1.5 px-2 py-0.5 rounded-full bg-black/80 border border-white/20 text-[9px] font-mono text-zinc-300 shadow-md whitespace-nowrap opacity-90 group-hover:opacity-100 transition-opacity">
                    {av.mood}
                  </div>
                )}

                {/* Avatar Head & Holographic Ring */}
                <div className="relative">
                  {/* 3D Pulse Aura */}
                  <div
                    className={`absolute -inset-1 rounded-full blur-sm transition-colors ${
                      av.isMe ? 'animate-pulse' : 'bg-white/20'
                    }`}
                    style={
                      av.isMe
                        ? {
                            backgroundColor: `${preferences.customLightingColor}70`,
                            boxShadow: `0 0 14px ${preferences.customLightingColor}`,
                          }
                        : {}
                    }
                  />

                  {/* Avatar Profile Image */}
                  <div
                    className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 shadow-lg transition-transform ${
                      av.isMe ? 'scale-105' : 'border-white/40'
                    }`}
                    style={
                      av.isMe
                        ? { borderColor: preferences.customLightingColor }
                        : {}
                    }
                  >
                    <img
                      src={av.avatarUrl}
                      alt={av.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Personal Avatar Accessory & Halo (User-customized via preferences) */}
                  {av.isMe && preferences.personalAccessory !== 'none' && (
                    <>
                      {preferences.personalAccessory === 'gold_crown' && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-sm drop-shadow-md animate-bounce">
                          👑
                        </div>
                      )}
                      {preferences.personalAccessory === 'neon_ring' && (
                        <div
                          className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full border-2 animate-spin-slow"
                          style={{
                            borderColor: preferences.customLightingColor,
                            boxShadow: `0 0 8px ${preferences.customLightingColor}`,
                          }}
                        />
                      )}
                      {preferences.personalAccessory === 'dj_headphones' && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-sm drop-shadow-md">
                          🎧
                        </div>
                      )}
                      {preferences.personalAccessory === 'cyber_visor' && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs drop-shadow-md">
                          🥽
                        </div>
                      )}
                    </>
                  )}

                  {/* Verified Soul Badge Pin */}
                  {preferences.showVerificationBadges && av.isVerified && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-cyan-400 text-black flex items-center justify-center text-[9px] font-black shadow-md border border-black">
                      <ShieldCheck className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Name & Distance Label (Configurable via preferences) */}
                {preferences.showNameTags && (
                  <span
                    className={`text-[10px] font-mono font-bold mt-1 px-1.5 py-0.5 rounded flex items-center gap-1 ${
                      av.isMe ? 'text-cyan-300 bg-cyan-950/70 border border-cyan-400/30' : 'text-zinc-300 bg-black/60'
                    }`}
                  >
                    <span>{av.name}</span>
                    {preferences.showDistanceTags && !av.isMe && (
                      <span className="text-[9px] text-zinc-400">
                        • {getDistanceMetres(av)}
                      </span>
                    )}
                  </span>
                )}

                {/* Ground Shadow Ring */}
                <div className="w-8 h-2 rounded-full bg-black/60 blur-[2px] mt-0.5" />
              </motion.div>
            );
          })}
        </div>

        {/* Click to Walk Guide Tooltip */}
        <div className="absolute bottom-3 left-4 z-20 pointer-events-none flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] font-mono text-zinc-300">
          <Move className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Click anywhere to walk</span>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-400">{panPosition}</span>
        </div>

        {/* Spatial Audio Proximity Indicator */}
        <div className="absolute bottom-3 right-4 z-20 pointer-events-none flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] font-mono">
          {preferences.proximityChatEnabled ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-zinc-300">
                Proximity: <strong className="text-cyan-300">{effectiveVolume}%</strong>
                <span className="text-zinc-400 text-[9px] ml-1">
                  ({preferences.proximityRadius} mode)
                </span>
              </span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-rose-300">Proximity Muted</span>
            </>
          )}
        </div>

        {/* Quick Reaction Buttons */}
        <div className="absolute top-3 right-4 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-2xl border border-white/10">
          {['❤️', '🔥', '🇰🇪', '✨', '🎧'].map((emoji) => (
            <button
              key={emoji}
              onClick={(e) => {
                e.stopPropagation();
                onSendReaction(emoji);
              }}
              className="w-7 h-7 rounded-xl hover:bg-white/20 transition-transform active:scale-125 flex items-center justify-center text-sm cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Preferences Modal */}
      <VRLoungePreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        preferences={preferences}
        onSavePreferences={(updated) => setPreferences(updated)}
      />
    </div>
  );
};
