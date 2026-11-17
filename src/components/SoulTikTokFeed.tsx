import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Gift,
  Music,
  CheckCircle2,
  Volume2,
  VolumeX,
  Plus,
  Send,
  X,
  Sparkles,
  MapPin,
  Flame,
  Radio,
  Play,
  Bot,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { ReelPost, SoulProfile } from '../types';
import { CreatePostModal } from './CreatePostModal';
import { VerificationBadge } from './VerificationBadge';
import { ProfilePortalModal } from './ProfilePortalModal';
import { AmbientOnlineAvatar } from './AmbientOnlineAvatar';
import { GpsDistanceBadge } from './GpsDistanceBadge';
import { GpsLocationVerificationModal } from './GpsLocationVerificationModal';

interface SoulTikTokFeedProps {
  onOpenChatWithProfile: (profile: SoulProfile) => void;
  onOpenProfileModal: () => void;
  giftsBalance?: number;
  onSendGift?: (amount: number, recipientName?: string) => boolean;
  onOpenGiftStore?: () => void;
  onReportViolation?: (strike: { type: 'post' | 'message'; reason: string; snippet?: string }) => void;
  currentUserId?: string;
  currentUserName?: string;
  currentUserEmail?: string;
}

export const SoulTikTokFeed: React.FC<SoulTikTokFeedProps> = ({
  onOpenChatWithProfile,
  onOpenProfileModal,
  giftsBalance = 50,
  onSendGift,
  onOpenGiftStore,
  onReportViolation,
  currentUserId,
  currentUserName,
  currentUserEmail,
}) => {
  const [reels, setReels] = useState<ReelPost[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [filter, setFilter] = useState<'for-you' | 'near-me' | 'verified' | 'live'>('for-you');
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedPortalProfile, setSelectedPortalProfile] = useState<SoulProfile | null>(null);
  const [selectedGpsSoulmate, setSelectedGpsSoulmate] = useState<SoulProfile | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [heartBurst, setHeartBurst] = useState<{ id: string; x: number; y: number }[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const audioVoiceRef = useRef<HTMLAudioElement | null>(null);

  // Fetch Reels Feed
  const loadReels = () => {
    fetch('/api/reels')
      .then((res) => res.json())
      .then((data) => {
        if (data.reels) {
          setReels(data.reels);
        }
      })
      .catch((err) => console.error('Error fetching reels:', err));
  };

  useEffect(() => {
    loadReels();
  }, []);

  // Handle Video Auto-play / Pause based on active index
  useEffect(() => {
    videoRefs.current.forEach((vid, idx) => {
      if (!vid) return;
      if (idx === activeIndex) {
        vid.muted = isMuted;
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, [activeIndex, isMuted, reels]);

  // Double tap heart burst gesture
  const handleDoubleTap = (e: React.MouseEvent, reelId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const burstId = `${Date.now()}_${Math.random()}`;
    setHeartBurst((prev) => [...prev, { id: burstId, x, y }]);

    setTimeout(() => {
      setHeartBurst((prev) => prev.filter((h) => h.id !== burstId));
    }, 1000);

    handleLikeReel(reelId);
  };

  // Like Reel
  const handleLikeReel = async (reelId: string) => {
    setReels((prev) =>
      prev.map((r) => {
        if (r.id === reelId) {
          const nextLiked = !r.isLiked;
          return {
            ...r,
            isLiked: nextLiked,
            likesCount: r.likesCount + (nextLiked ? 1 : -1),
          };
        }
        return r;
      })
    );

    try {
      await fetch('/api/reels/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reelId }),
      });
    } catch (err) {}
  };

  // Toggle Follow
  const toggleFollow = (authorId: string) => {
    setFollowingMap((prev) => ({
      ...prev,
      [authorId]: !prev[authorId],
    }));
  };

  // Send Gift
  const handleSendGift = (reelId: string, authorName?: string) => {
    // Check if user has enough gifts (costs 2 gifts to send, $0.40 value)
    if (onSendGift) {
      const success = onSendGift(2, authorName || 'Single Soul Creator');
      if (!success) {
        if (onOpenGiftStore) onOpenGiftStore();
        return;
      }
    }

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#00F2FE', '#FF0844', '#BB86FC', '#FFD700'],
      });
    } catch {
      // ignore confetti error
    }

    setReels((prev) =>
      prev.map((r) => (r.id === reelId ? { ...r, giftsCount: r.giftsCount + 1 } : r))
    );
  };

  // Play Voice Intro
  const handleToggleVoice = (voiceUrl?: string, reelId?: string) => {
    if (!voiceUrl) return;

    if (playingVoiceId === reelId) {
      if (audioVoiceRef.current) audioVoiceRef.current.pause();
      setPlayingVoiceId(null);
    } else {
      if (audioVoiceRef.current) audioVoiceRef.current.pause();
      audioVoiceRef.current = new Audio(voiceUrl);
      audioVoiceRef.current.play();
      setPlayingVoiceId(reelId || null);

      audioVoiceRef.current.onended = () => setPlayingVoiceId(null);
    }
  };

  const filteredReels = reels.filter((r) => {
    if (filter === 'near-me') return r.author.distanceKm <= 3.5;
    if (filter === 'verified') return r.author.isSoulVerified;
    if (filter === 'live') return r.mediaType === 'video';
    return true;
  });

  return (
    <div className="relative max-w-md mx-auto h-[calc(100vh-80px)] overflow-hidden bg-black md:rounded-3xl border border-white/10 shadow-2xl">
      {/* Top Header Filter Bar Overlay */}
      <div className="absolute top-0 inset-x-0 z-30 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { key: 'for-you', label: 'For You' },
            { key: 'near-me', label: 'Near Me' },
            { key: 'verified', label: '3D Verified' },
            { key: 'live', label: 'Reels' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                filter === tab.key
                  ? 'bg-gradient-to-r from-cyan-400 to-pink-500 text-black shadow-lg shadow-cyan-500/20 scale-105'
                  : 'text-zinc-300 bg-white/10 hover:bg-white/20 backdrop-blur-md'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Post Story/Reel Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="p-2 rounded-full bg-gradient-to-tr from-pink-500 to-cyan-400 text-black font-bold hover:scale-110 transition-transform shadow-lg"
          title="Post Single Soul Reel"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Main Snap Vertical Scroll Reel Container */}
      <div
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-none"
        onScroll={(e) => {
          const container = e.currentTarget;
          const index = Math.round(container.scrollTop / container.clientHeight);
          if (index !== activeIndex && index >= 0 && index < filteredReels.length) {
            setActiveIndex(index);
          }
        }}
      >
        {filteredReels.map((reel, idx) => {
          const isCurrent = idx === activeIndex;
          const isFollowing = followingMap[reel.author.id];

          return (
            <div
              key={reel.id}
              className="relative w-full h-full snap-start snap-always flex items-center justify-center bg-zinc-950 overflow-hidden"
              onDoubleClick={(e) => handleDoubleTap(e, reel.id)}
            >
              {/* Media Content (Video or Photo) */}
              {reel.mediaType === 'video' ? (
                <video
                  ref={(el) => (videoRefs.current[idx] = el)}
                  src={reel.mediaUrl}
                  className="w-full h-full object-cover"
                  loop
                  playsInline
                  muted={isMuted}
                />
              ) : (
                <div className="relative w-full h-full">
                  <img
                    src={reel.mediaUrl}
                    alt={reel.caption}
                    className="w-full h-full object-cover scale-105 transition-transform duration-10000"
                  />
                </div>
              )}

              {/* Gradient Dark Overlay for Typography Contrast */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90 pointer-events-none" />

              {/* Double-Tap Heart Burst Particles */}
              <AnimatePresence>
                {heartBurst.map((h) => (
                  <motion.div
                    key={h.id}
                    initial={{ scale: 0.2, opacity: 1, y: 0 }}
                    animate={{ scale: 2, opacity: 0, y: -40 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="absolute z-40 text-pink-500 pointer-events-none drop-shadow-[0_0_15px_rgba(255,8,68,0.8)]"
                    style={{ left: h.x - 30, top: h.y - 30 }}
                  >
                    <Heart className="w-16 h-16 fill-pink-500" />
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Mute/Unmute Float Trigger */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="absolute top-16 right-4 z-30 p-2.5 rounded-full bg-black/60 border border-white/20 text-white backdrop-blur-md hover:scale-110 transition-all"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-zinc-400" /> : <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />}
              </button>

              {/* Right Side Action Bar (TikTok Style) */}
              <div className="absolute right-3 bottom-20 z-30 flex flex-col items-center gap-5">
                {/* Author Avatar + Follow Badge with Ambient Online Lighting */}
                <div className="relative group">
                  <AmbientOnlineAvatar
                    src={reel.author.avatar}
                    alt={reel.author.name}
                    size="md"
                    isOnline={reel.author.isOnline ?? true}
                    glowColor="cyan"
                    onClick={() => setSelectedPortalProfile(reel.author)}
                  />
                  <button
                    onClick={() => toggleFollow(reel.author.id)}
                    className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 p-1 rounded-full border border-black shadow-lg transition-transform hover:scale-125 z-20 ${
                      isFollowing ? 'bg-emerald-500 text-black' : 'bg-pink-500 text-white'
                    }`}
                  >
                    {isFollowing ? <UserCheck className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  </button>
                </div>

                {/* Like Button */}
                <button
                  onClick={() => handleLikeReel(reel.id)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border transition-all group-hover:scale-110 ${
                      reel.isLiked
                        ? 'bg-pink-500/20 border-pink-500 text-pink-500 shadow-lg shadow-pink-500/30'
                        : 'bg-black/50 border-white/20 text-white'
                    }`}
                  >
                    <Heart className={`w-6 h-6 ${reel.isLiked ? 'fill-pink-500 text-pink-500' : ''}`} />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-white shadow-black drop-shadow-md">
                    {reel.likesCount}
                  </span>
                </button>

                {/* Gift Sparkle Button */}
                <button
                  onClick={() => handleSendGift(reel.id, reel.author.name)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500/30 to-purple-500/30 border border-amber-400/50 text-amber-300 flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-all shadow-lg shadow-amber-500/20">
                    <Gift className="w-6 h-6 text-amber-300 animate-bounce" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-amber-300 shadow-black drop-shadow-md">
                    Send Gift
                  </span>
                </button>

                {/* Chat Proposal / Direct Match */}
                <button
                  onClick={() => onOpenChatWithProfile(reel.author)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-r from-pink-500 to-cyan-400 text-black flex items-center justify-center font-bold shadow-lg shadow-pink-500/30 group-hover:scale-110 transition-all">
                    <Bot className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-cyan-300 shadow-black drop-shadow-md">
                    AI Match
                  </span>
                </button>

                {/* Spinning Music Vinyl Disc */}
                <div className="mt-2">
                  <motion.div
                    animate={{ rotate: isCurrent ? 360 : 0 }}
                    transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
                    className="w-10 h-10 rounded-full bg-zinc-900 border-2 border-cyan-400 p-1 flex items-center justify-center shadow-lg"
                  >
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-pink-500 to-cyan-400 p-1">
                      {reel.author.avatar && (
                        <img src={reel.author.avatar} alt="Audio" className="w-full h-full object-cover rounded-full" />
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Bottom Creator Info & Caption Bar Overlay */}
              <div className="absolute bottom-4 left-4 right-16 z-30 text-left space-y-2">
                {/* Author Name + Verified Soul Badge + Distance */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    onClick={() => setSelectedPortalProfile(reel.author)}
                    className="font-extrabold text-base text-white hover:text-cyan-300 cursor-pointer flex items-center gap-1.5"
                  >
                    {reel.author.name}, {reel.author.age}
                  </span>

                  <VerificationBadge
                    tier={reel.author.tier}
                    isVerified={reel.author.isSoulVerified}
                    size="md"
                    showLabel
                  />

                  <GpsDistanceBadge
                    soulmate={reel.author}
                    onClick={(p) => setSelectedGpsSoulmate(p)}
                    size="sm"
                  />
                </div>

                {/* Tagline */}
                <p className="text-xs font-semibold text-cyan-300">{reel.author.tagline}</p>

                {/* Caption & Hashtags */}
                <p className="text-xs text-zinc-200 leading-relaxed max-w-xs drop-shadow-md">
                  {reel.caption}{' '}
                  <span className="text-pink-400 font-semibold block mt-1">
                    {reel.hashtags.join(' ')}
                  </span>
                </p>

                {/* Voice Intro Player Pill */}
                {reel.voiceNoteUrl && (
                  <button
                    onClick={() => handleToggleVoice(reel.voiceNoteUrl, reel.id)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-200 text-xs font-mono backdrop-blur-md hover:bg-purple-500/30 transition-all shadow-lg"
                  >
                    {playingVoiceId === reel.id ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-pink-400 animate-bounce" /> Listening to Voice Print...
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" /> Listen 10s Voice Intro 🎙️
                      </>
                    )}
                  </button>
                )}

                {/* Audio Track Marquee */}
                <div className="flex items-center gap-2 text-[11px] text-zinc-300 font-mono pt-1">
                  <Music className="w-3.5 h-3.5 text-cyan-400 animate-pulse flex-shrink-0" />
                  <span className="truncate">
                    {reel.audioTrack.title} — {reel.audioTrack.artist}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPostCreated={(newReel) => {
          setReels((prev) => [newReel, ...prev]);
          setActiveIndex(0);
        }}
        onReportViolation={onReportViolation}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserEmail={currentUserEmail}
      />

      {/* Profile Portal Modal */}
      <ProfilePortalModal
        profile={selectedPortalProfile}
        isOpen={!!selectedPortalProfile}
        onClose={() => setSelectedPortalProfile(null)}
        onStartChat={(prof) => onOpenChatWithProfile(prof)}
      />

      {/* GPS Location & Google Maps Verification Modal */}
      <GpsLocationVerificationModal
        soulmate={selectedGpsSoulmate}
        isOpen={!!selectedGpsSoulmate}
        onClose={() => setSelectedGpsSoulmate(null)}
      />
    </div>
  );
};
