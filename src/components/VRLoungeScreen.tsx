import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Users,
  Send,
  Sparkles,
  Move,
  MessageSquare,
  Compass,
  ShieldCheck,
  Sliders,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { socketService } from '../services/socket';
import { VRLoungeRoom, VRLoungeUser, ReactionEvent, VRLoungePreferences } from '../types';
import {
  VRLoungePreferencesModal,
  DEFAULT_VR_PREFERENCES,
  VR_THEME_OPTIONS,
} from './VRLoungePreferencesModal';

interface VRLoungeScreenProps {
  currentUserId?: string;
  currentUserName?: string;
  onReportViolation?: (strike: { type: 'message'; reason: string; snippet?: string }) => void;
}

export const VRLoungeScreen: React.FC<VRLoungeScreenProps> = ({
  currentUserId = 'usr_verified_1',
  currentUserName = 'My Verified Soul',
  onReportViolation,
}) => {
  const rooms: VRLoungeRoom[] = [
    {
      id: 'neon-city-lounge',
      name: 'Neon Cyberpunk City',
      theme: 'cyberpunk',
      bgGradient: 'from-cyan-900/60 via-[#0F0E17] to-purple-950/80',
      description: 'Holographic skydeck with synth soundscapes and neon rain.',
      activeUsersCount: 8,
    },
    {
      id: 'space-zenith',
      name: 'Deep Space Zenith',
      theme: 'space',
      bgGradient: 'from-indigo-950/70 via-[#0F0E17] to-slate-950/90',
      description: 'Zero-G lounge overlooking a glowing nebula.',
      activeUsersCount: 5,
    },
    {
      id: 'sunset-glass-oasis',
      name: 'Sunset Glass Oasis',
      theme: 'oasis',
      bgGradient: 'from-amber-950/60 via-[#0F0E17] to-pink-950/80',
      description: 'Translucent glass gazebo facing a perpetual twilight horizon.',
      activeUsersCount: 12,
    },
  ];

  const [activeRoom, setActiveRoom] = useState<VRLoungeRoom>(rooms[0]);
  const [users, setUsers] = useState<VRLoungeUser[]>([]);
  const [myPosition, setMyPosition] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [reactions, setReactions] = useState<ReactionEvent[]>([]);
  const [chatMessages, setChatMessages] = useState<{ id: string; senderName: string; text: string; timestamp: string }[]>([
    { id: '1', senderName: 'Aria Sterling', text: 'Welcome to the Neon Lounge! Click anywhere to walk around ✨', timestamp: '10:02' },
    { id: '2', senderName: 'Kaelen Vance', text: 'The glassmorphic lighting here is incredible!', timestamp: '10:04' },
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  // Load preferences from localStorage or defaults
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

  const loungeRef = useRef<HTMLDivElement | null>(null);

  // Join Room & Setup Sockets
  useEffect(() => {
    socketService.joinVRLounge(activeRoom.id, 'My Verified Soul', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80');

    socketService.socket.on('vr-users-update', (updatedUsers: VRLoungeUser[]) => {
      setUsers(updatedUsers);
    });

    socketService.socket.on('avatar-moved', (data: { userId: string; x: number; y: number }) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === data.userId ? { ...u, x: data.x, y: data.y } : u))
      );
    });

    socketService.socket.on('new-reaction', (rec: ReactionEvent) => {
      setReactions((prev) => [...prev.slice(-12), rec]);
    });

    socketService.socket.on('new-room-chat', (msg: any) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    socketService.socket.on(
      'action-blocked',
      (data: { category?: string; reason?: string; snippet?: string }) => {
        if (onReportViolation) {
          onReportViolation({
            type: 'message',
            reason:
              data.reason ||
              'Message blocked by AI Guardian (zero discrimination, illegal business, scams, or harm allowed).',
            snippet: data.snippet,
          });
        }
      }
    );

    return () => {
      socketService.socket.off('vr-users-update');
      socketService.socket.off('avatar-moved');
      socketService.socket.off('new-reaction');
      socketService.socket.off('new-room-chat');
      socketService.socket.off('action-blocked');
    };
  }, [activeRoom, onReportViolation]);

  // Handle click on spatial lounge floor plan
  const handleFloorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!loungeRef.current) return;
    const rect = loungeRef.current.getBoundingClientRect();
    const x = Math.min(92, Math.max(8, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(92, Math.max(8, ((e.clientY - rect.top) / rect.height) * 100));

    setMyPosition({ x, y });
    socketService.moveAvatar(x, y);
  };

  const sendReaction = (emoji: string) => {
    socketService.sendReaction(activeRoom.id, emoji, myPosition.x, myPosition.y);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socketService.sendRoomChat(activeRoom.id, chatInput.trim(), currentUserId, currentUserName);
    setChatInput('');
  };

  // Filter avatars based on preference
  const visibleUsers = users.filter((u) => {
    const isMe = u.id === socketService.socket.id;
    if (isMe) return true;
    if (preferences.avatarVisibility === 'solo') return false;
    if (preferences.avatarVisibility === 'verified_only') return u.badgeVerified;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono uppercase tracking-widest mb-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            Real-Time Spatial VR Lounge
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-wide">VR SOUL LOUNGE</h1>
          <p className="text-zinc-400 text-sm">
            Step into translucent 3D social environments. Click anywhere to move your avatar in spatial real-time.
          </p>
        </div>

        {/* Room Switcher Pills & Preferences Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-2xl backdrop-blur-xl">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setActiveRoom(room)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeRoom.id === room.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {room.name.split(' ')[0]}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsPreferencesOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 hover:from-cyan-500/30 hover:to-pink-500/30 border border-cyan-400/50 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Preferences</span>
            <span
              className="w-2 h-2 rounded-full animate-ping ml-0.5"
              style={{ backgroundColor: preferences.customLightingColor }}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Spatial Floor Plan Stage */}
        <div className="lg:col-span-8">
          <GlassCard className="p-4 relative" glowColor="cyan">
            {/* Lounge Environment Stage */}
            <div
              ref={loungeRef}
              onClick={handleFloorClick}
              className={`
                relative w-full aspect-[16/10] rounded-2xl overflow-hidden cursor-crosshair
                bg-gradient-to-br ${activeRoom.bgGradient}
                border border-white/15 shadow-2xl flex items-center justify-center select-none
              `}
            >
              {/* Custom Lighting Tint Bloom Overlay */}
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-700"
                style={{
                  backgroundColor: preferences.customLightingColor,
                  opacity: (preferences.lightingIntensity / 100) * 0.15,
                  mixBlendMode: 'screen',
                }}
              />

              {/* Floor Perspective Grid Overlay (Toggleable via preferences) */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-black/60 pointer-events-none" />
              {preferences.showGridFloor && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `linear-gradient(${preferences.customLightingColor}20 1px, transparent 1px), linear-gradient(90deg, ${preferences.customLightingColor}20 1px, transparent 1px)`,
                    backgroundSize: '32px 32px',
                  }}
                />
              )}

              {/* Spatial Centerpiece / Hologram */}
              <div
                className="absolute w-36 h-36 rounded-full border-2 border-dashed flex items-center justify-center animate-spin-slow pointer-events-none"
                style={{ borderColor: `${preferences.customLightingColor}50` }}
              >
                <div
                  className="w-24 h-24 rounded-full border flex items-center justify-center backdrop-blur-md"
                  style={{
                    backgroundColor: `${preferences.customLightingColor}20`,
                    borderColor: `${preferences.customLightingColor}80`,
                  }}
                >
                  <Sparkles
                    className="w-8 h-8 animate-pulse"
                    style={{ color: preferences.customLightingColor }}
                  />
                </div>
              </div>

              {/* Floating Reactions Overlay */}
              <AnimatePresence>
                {reactions.map((rec) => (
                  <motion.div
                    key={rec.id}
                    initial={{ scale: 0.5, opacity: 1, y: 0 }}
                    animate={{ scale: 1.5, opacity: 0, y: -60 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2, ease: 'easeOut' }}
                    className="absolute text-3xl pointer-events-none z-30"
                    style={{ left: `${rec.x}%`, top: `${rec.y}%` }}
                  >
                    {rec.emoji}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Spatial Users Avatars */}
              {visibleUsers.map((u) => {
                const isMe = u.id === socketService.socket.id;
                return (
                  <motion.div
                    key={u.id}
                    animate={{ left: `${u.x}%`, top: `${u.y}%` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center group pointer-events-auto"
                  >
                    {/* User Label Popup */}
                    {preferences.showNameTags && (
                      <div className="mb-1.5 px-2.5 py-1 rounded-full bg-black/80 border border-cyan-400/40 text-[10px] font-mono text-cyan-300 backdrop-blur-md shadow-lg flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {preferences.showVerificationBadges && u.badgeVerified && (
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        )}
                        <span>{u.name}</span>
                        {isMe && <span className="text-pink-400 font-bold">(You)</span>}
                      </div>
                    )}

                    {/* Avatar Ring */}
                    <div
                      className={`relative w-12 h-12 rounded-full p-0.5 shadow-xl ${
                        isMe ? 'ring-2 ring-offset-2 ring-offset-black' : 'border border-white/30'
                      }`}
                      style={isMe ? { ringColor: preferences.customLightingColor } : {}}
                    >
                      <img src={u.avatar} alt={u.name} className="w-full h-full object-cover rounded-full" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-black" />

                      {/* Personal Avatar Accessory */}
                      {isMe && preferences.personalAccessory !== 'none' && (
                        <>
                          {preferences.personalAccessory === 'gold_crown' && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs">
                              👑
                            </div>
                          )}
                          {preferences.personalAccessory === 'neon_ring' && (
                            <div
                              className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-1.5 rounded-full border border-cyan-400 animate-spin-slow"
                              style={{ borderColor: preferences.customLightingColor }}
                            />
                          )}
                          {preferences.personalAccessory === 'dj_headphones' && (
                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs">
                              🎧
                            </div>
                          )}
                          {preferences.personalAccessory === 'cyber_visor' && (
                            <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px]">
                              🥽
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* HUD Instruction Prompt */}
              <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] text-zinc-300 flex items-center gap-2 pointer-events-none font-mono">
                <Move className="w-3.5 h-3.5 text-cyan-400" />
                <span>Click anywhere to walk</span>
              </div>

              {/* Spatial Proximity Audio Status in Bottom Right */}
              <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] font-mono pointer-events-none flex items-center gap-2">
                {preferences.proximityChatEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-zinc-300">
                      Proximity:{' '}
                      <strong className="text-cyan-300">
                        {preferences.masterProximityVolume}% ({preferences.proximityRadius})
                      </strong>
                    </span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-rose-300">Proximity Muted</span>
                  </>
                )}
              </div>
            </div>

            {/* Reaction Controller Bar */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
              <span className="text-xs text-zinc-400 font-mono">EXPRESS IN LOUNGE:</span>
              <div className="flex gap-2">
                {['🔥', '💖', '✨', '🎸', '⚡', '🌌', '💎'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => sendReaction(emoji)}
                    className="text-lg p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 hover:scale-125 transition-all cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Spatial Chat & Room Attendees Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <GlassCard className="p-4 h-[480px] flex flex-col" glowColor="purple">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-white text-sm">Spatial Chat</h3>
              </div>
              <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                {visibleUsers.length} In Room
              </span>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="bg-white/5 border border-white/5 p-2.5 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <span className="font-semibold text-purple-300">{msg.senderName}</span>
                    <span className="font-mono">{msg.timestamp}</span>
                  </div>
                  <p className="text-zinc-200">{msg.text}</p>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="pt-3 border-t border-white/10 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Broadcast to VR room..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </GlassCard>
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
