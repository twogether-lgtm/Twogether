import React, { useState, useEffect } from 'react';
import {
  Heart,
  X,
  Sparkles,
  CheckCircle2,
  MessageCircle,
  MessageSquare,
  Music,
  MapPin,
  Send,
  Phone,
  Video,
  Image as ImageIcon,
  Crown,
  Mic,
  MicOff,
  PhoneOff,
  VideoOff,
  Palette,
  ExternalLink,
  Share2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { SoulProfile, ChatMessage } from '../types';
import { CHAT_WALLPAPERS } from '../data/subscriptionData';
import { VerificationBadge } from './VerificationBadge';
import { ProfilePortalModal } from './ProfilePortalModal';
import { AmbientOnlineAvatar } from './AmbientOnlineAvatar';
import { GpsDistanceBadge } from './GpsDistanceBadge';
import { GpsLocationVerificationModal } from './GpsLocationVerificationModal';
import { ShareModal } from './ShareModal';
import {
  SharePayload,
  createProfileSharePayload,
  createJamSessionSharePayload,
} from '../services/shareService';
import { TRENDING_LOVE_SONGS } from '../data/loveSongsData';
import { loveSongAudioService } from '../services/loveSongAudioService';

interface SoulMatchesScreenProps {
  initialChatProfile?: SoulProfile | null;
  isVerified?: boolean;
  onStartVerification?: () => void;
  isVip?: boolean;
  chatsUsed?: number;
  maxChatsBasic?: number;
  chatsDaysInterval?: number;
  callsUsed?: number;
  maxCallsBasic?: number;
  callsDaysInterval?: number;
  onIncrementChats?: () => void;
  onIncrementCalls?: () => void;
  onOpenUpgradeModal?: (reason: string) => void;
  activeWallpaperId?: string;
  onOpenWallpaperModal?: () => void;
  unlockedFeatures?: string[];
  giftsBalance?: number;
  onSpendGifts?: (amount: number, featureName: string, featureKey: string) => boolean;
  onUnlockFeatureDirectly?: (featureKey: string, priceStr?: string) => void;
  onReportViolation?: (strike: { type: 'message'; reason: string; snippet?: string }) => void;
  currentUserId?: string;
  currentUserName?: string;
  currentUserEmail?: string;
}

export const SoulMatchesScreen: React.FC<SoulMatchesScreenProps> = ({
  initialChatProfile,
  isVerified = true,
  onStartVerification,
  isVip = false,
  chatsUsed = 0,
  maxChatsBasic = 10,
  chatsDaysInterval = 21,
  callsUsed = 0,
  maxCallsBasic = 3,
  callsDaysInterval = 21,
  onIncrementChats,
  onIncrementCalls,
  onOpenUpgradeModal,
  activeWallpaperId = 'cyber_midnight',
  onOpenWallpaperModal,
  unlockedFeatures = [],
  giftsBalance = 0,
  onSpendGifts,
  onUnlockFeatureDirectly,
  onReportViolation,
  currentUserId = 'usr_verified_1',
  currentUserName = 'Dylan Wisney',
  currentUserEmail = 'dylan.wisney@gmail.com',
}) => {
  const [profiles, setProfiles] = useState<SoulProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [activeChatProfile, setActiveChatProfile] = useState<SoulProfile | null>(initialChatProfile || null);
  const [selectedPortalProfile, setSelectedPortalProfile] = useState<SoulProfile | null>(null);
  const [selectedGpsSoulmate, setSelectedGpsSoulmate] = useState<SoulProfile | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('grid');

  // Share Feature State (Browser Web Share API & External Platforms)
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);

  const handleShareProfile = (profile: SoulProfile) => {
    const payload = createProfileSharePayload(profile);
    setSharePayload(payload);
    setIsShareModalOpen(true);
  };

  const handleShareJamSession = (customSession?: {
    title: string;
    artist?: string;
    genre?: string;
    roomName?: string;
    coverUrl?: string;
    flag?: string;
  }) => {
    const currentSong = loveSongAudioService.getCurrentSong() || TRENDING_LOVE_SONGS[0];
    const session = customSession || {
      title: currentSong.title,
      artist: currentSong.artist,
      genre: currentSong.genre,
      roomName: '3D VR Love Lounge',
      activeListeners: 24,
      coverUrl: currentSong.coverUrl,
      flag: currentSong.flag,
    };
    const payload = createJamSessionSharePayload(session);
    setSharePayload(payload);
    setIsShareModalOpen(true);
  };

  // À La Carte Pass Unlock Modal State
  const [passUnlockModal, setPassUnlockModal] = useState<{
    type: 'voice' | 'video' | 'chats';
    pendingCall?: { type: 'voice' | 'video'; profile: SoulProfile };
  } | null>(null);
  const [passModalError, setPassModalError] = useState<string | null>(null);

  // Voice/Video Call state
  const [activeCall, setActiveCall] = useState<{ type: 'voice' | 'video'; profile: SoulProfile } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callTimer, setCallTimer] = useState(0);

  useEffect(() => {
    let interval: any;
    if (activeCall) {
      interval = setInterval(() => setCallTimer((prev) => prev + 1), 1000);
    } else {
      setCallTimer(0);
    }
    return () => clearInterval(interval);
  }, [activeCall]);

  const activeWallpaper = CHAT_WALLPAPERS.find((w) => w.id === activeWallpaperId) || CHAT_WALLPAPERS[0];


  useEffect(() => {
    if (initialChatProfile) {
      handleOpenChat(initialChatProfile);
    }
  }, [initialChatProfile]);

  useEffect(() => {
    fetch('/api/profiles')
      .then((res) => res.json())
      .then((data) => {
        if (data.profiles) setProfiles(data.profiles);
      })
      .catch((err) => console.error('Profiles fetch error:', err));
  }, []);

  const currentProfile = profiles[currentIndex] || {
    id: 'profile_01',
    name: 'Aria Sterling',
    age: 24,
    tagline: 'Cyberpunk architect & lofi vinyl collector 🎧',
    bio: 'Passionate about generative art, deep late-night conversations in VR, and exploring futuristic electronic music. Verified 3D Soul scanned!',
    location: 'Neo-Tokyo / London',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    coverImage: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80',
    matchScore: 98,
    isSoulVerified: true,
    topGenres: ['Synthwave', 'Ambient Lofi', 'Cyberpunk Electro'],
    zodiac: 'Scorpio',
    interests: ['VR Lounge', '3D Graphics', 'Jam Sessions', 'Stargazing'],
    distanceKm: 3.2,
  };

  const handleNextProfile = () => {
    if (profiles.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % profiles.length);
  };

  const handleOpenChat = (profile: SoulProfile) => {
    setActiveChatProfile(profile);
    setChatMessages([
      {
        id: '1',
        sender: 'soulmate',
        text: `Hey! I noticed we both love ${profile.topGenres[0]} and VR Lounges. Let us sync Twogether! ✨`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const isVoiceActive = isVip || unlockedFeatures.includes('voice_pass_7d') || unlockedFeatures.includes('voice_pass_30d');
  const isVideoActive = isVip || unlockedFeatures.includes('video_pass_7d') || unlockedFeatures.includes('video_pass_30d');
  const isChatsActive = isVip || unlockedFeatures.includes('chats_pass_14d') || unlockedFeatures.includes('chats_pack_25');

  const handleStartCall = (type: 'voice' | 'video') => {
    const isAllowed = type === 'voice'
      ? (isVoiceActive || callsUsed < maxCallsBasic)
      : (isVideoActive || callsUsed < maxCallsBasic);

    if (!isAllowed) {
      if (activeChatProfile) {
        setPassUnlockModal({ type, pendingCall: { type, profile: activeChatProfile } });
      }
      return;
    }

    if (onIncrementCalls) onIncrementCalls();
    if (activeChatProfile) {
      setActiveCall({ type, profile: activeChatProfile });
    }
  };

  const handleSendAiChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeChatProfile) return;

    if (!isChatsActive && chatsUsed >= maxChatsBasic) {
      setPassUnlockModal({ type: 'chats' });
      return;
    }

    const userText = chatInput.trim();

    // AI Action Guardian & Anti-Nudity Scan before sending
    try {
      const modRes = await fetch('/api/moderation/scan-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: userText,
          context: 'message',
          userId: currentUserId,
          userName: currentUserName,
          userEmail: currentUserEmail,
        }),
      });
      const modData = await modRes.json();
      if (modData.isViolating) {
        setChatInput('');
        if (onReportViolation) {
          onReportViolation({
            type: 'message',
            reason: modData.reason || 'Prohibited unclad nudity or explicit language detected in message.',
            snippet: userText,
          });
        }
        return;
      }
    } catch {
      // Proceed on network failure
    }

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (onIncrementChats) onIncrementChats();
    setChatInput('');
    setIsAiTyping(true);

    try {
      const response = await fetch('/api/ai-soulmate/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          partnerName: activeChatProfile.name,
          history: chatMessages,
        }),
      });
      const data = await response.json();

      setIsAiTyping(false);
      if (data.reply) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `a_${Date.now()}`,
            sender: 'soulmate',
            text: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      setIsAiTyping(false);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          sender: 'soulmate',
          text: `I hear you! Let's listen to some music together in the Beats room! 🎶`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  // Image Upload Moderation Handler (Anti-Nudity Guard)
  const handleUploadImageChat = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChatProfile) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (!base64) return;

      try {
        const modRes = await fetch('/api/moderation/scan-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            context: 'message',
            userId: currentUserId,
            userName: currentUserName,
            userEmail: currentUserEmail,
          }),
        });
        const modData = await modRes.json();
        if (modData.isViolating) {
          if (onReportViolation) {
            onReportViolation({
              type: 'message',
              reason:
                modData.reason ||
                'Prohibited unclad nudity: Widely naked photos are strictly banned. Private parts must be completely covered.',
              snippet: 'Photo attachment in chat',
            });
          }
          return;
        }
      } catch {
        // Proceed if offline
      }

      // Safe image approved!
      const imgMsg: ChatMessage = {
        id: `u_img_${Date.now()}`,
        sender: 'user',
        text: `📷 [Sent Photo Attachment]`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, imgMsg]);
      if (onIncrementChats) onIncrementChats();
    };
    reader.readAsDataURL(file);
  };

  if (!isVerified) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <GlassCard className="p-8 md:p-10 border-blue-500/40" glowColor="blue">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-400/40 flex items-center justify-center mx-auto mb-4 shadow-xl">
            <CheckCircle2 className="w-10 h-10 fill-blue-500 text-white" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-mono text-xs uppercase tracking-widest mb-3 border border-blue-400/30">
            Strict Security Policy Enforced
          </span>

          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
            100% Verification Required
          </h2>

          <p className="text-zinc-300 text-sm leading-relaxed mb-6">
            To protect all members and eliminate fake accounts, <span className="text-blue-400 font-bold">no profile shall be seen by single soulmates unless 100% verified</span>.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left text-xs space-y-2 mb-6">
            <p className="text-blue-300 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-500" /> Complete Onboarding Scan to Unlock:
            </p>
            <p className="text-zinc-400 pl-6">• Receive your Official Blue Checkmark Badge</p>
            <p className="text-zinc-400 pl-6">• View 100% verified single soulmates in discovery feed</p>
            <p className="text-zinc-400 pl-6">• Allow single soulmates to discover and chat with your profile</p>
          </div>

          <button
            onClick={onStartVerification}
            className="w-full py-4 rounded-xl font-extrabold text-sm bg-gradient-to-r from-blue-500 via-cyan-400 to-pink-500 text-black shadow-xl shadow-blue-500/25 hover:scale-105 transition-all"
          >
            Start 100% Verification Scan Now
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-mono uppercase tracking-widest mb-2">
          <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400" />
          Single Souls Discovery Engine
        </div>
        <h1 className="text-3xl font-extrabold text-white">SINGLE SOULS</h1>
        <p className="text-zinc-400 text-sm max-w-xl mx-auto mb-4">
          Connect with 3D biometrically verified single souls. Explore photo/video posts, hear voice intros, and chat with AI soulmates.
        </p>

        {/* View Mode Switcher */}
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 p-1 rounded-2xl backdrop-blur-xl">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              viewMode === 'grid' ? 'bg-gradient-to-r from-pink-500 to-cyan-400 text-black font-bold shadow-lg' : 'text-zinc-400 hover:text-white'
            }`}
          >
            All Single Souls Grid
          </button>
          <button
            onClick={() => setViewMode('single')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              viewMode === 'single' ? 'bg-gradient-to-r from-pink-500 to-cyan-400 text-black font-bold shadow-lg' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Resonance Card Stack
          </button>
        </div>

        {/* Quick Action Share Banner: Share Live 3D VR Music Jam Sessions */}
        <div className="mt-4 p-3 rounded-2xl bg-gradient-to-r from-purple-950/40 via-black/80 to-cyan-950/40 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-left shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-lg">
              <Music className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  Synchronized Love Music Jam
                  <span className="px-1.5 py-0.2 rounded bg-cyan-400/20 text-cyan-300 font-mono text-[9px] font-bold">
                    3D VR AUDIO
                  </span>
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 mt-0.5">
                Share live music jam sessions or single soul profiles to WhatsApp, X, Telegram & external platforms via Browser Share API.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleShareJamSession()}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md hover:scale-105 transition-all cursor-pointer shrink-0"
            title="Share Live 3D VR Music Jam Session via Browser Share API"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Music Jam Session</span>
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <GlassCard key={profile.id} className="p-0 overflow-hidden flex flex-col justify-between group cursor-pointer" glowColor="pink">
              <div className="relative h-56 w-full" onClick={() => setSelectedPortalProfile(profile)}>
                <img src={profile.coverImage} alt={profile.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-pink-500/40 text-[10px] font-bold text-pink-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-pink-400" /> {profile.matchScore}% Resonance
                </div>

                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 text-[10px] font-mono font-bold flex items-center gap-1 shadow-lg">
                  <VerificationBadge tier={profile.tier} isVerified={profile.isSoulVerified} size="sm" showLabel />
                </div>

                <div className="absolute bottom-3 left-3 right-3 flex items-end gap-3">
                  <AmbientOnlineAvatar
                    src={profile.avatar}
                    alt={profile.name}
                    size="md"
                    isOnline={profile.isOnline ?? true}
                    glowColor="cyan"
                    onClick={() => setSelectedPortalProfile(profile)}
                  />
                  <div className="text-left min-w-0 flex-1">
                    <h3 className="text-base font-bold text-white leading-tight flex items-center gap-1.5 truncate">
                      {profile.name}, {profile.age}
                      <VerificationBadge tier={profile.tier} isVerified={profile.isSoulVerified} size="md" />
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-zinc-300 flex items-center gap-1 truncate">
                        <MapPin className="w-2.5 h-2.5 text-pink-400 shrink-0" /> {profile.location}
                      </p>
                      <GpsDistanceBadge
                        soulmate={profile}
                        onClick={(p) => setSelectedGpsSoulmate(p)}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 text-left flex-1 flex flex-col justify-between">
                <div onClick={() => setSelectedPortalProfile(profile)} className="space-y-1 mb-3">
                  <p className="text-xs text-cyan-300 font-semibold">{profile.tagline}</p>
                  <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2 bg-white/5 p-2.5 rounded-xl border border-white/5">
                    {profile.bio}
                  </p>
                  {profile.soulmateAim && (
                    <p className="text-[11px] text-pink-300 font-medium italic line-clamp-1">
                      Target Aim: {profile.soulmateAim}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setSelectedPortalProfile(profile)}
                    className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-1 transition-all"
                  >
                    View Portal
                  </button>
                  <button
                    onClick={() => handleOpenChat(profile)}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-cyan-400 text-black font-bold text-xs flex items-center justify-center gap-1 hover:opacity-90 transition-opacity shadow-lg"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Chat AI
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareProfile(profile);
                    }}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-cyan-300 hover:text-white transition-all cursor-pointer hover:scale-105 shrink-0"
                    title={`Share ${profile.name}'s Profile to External Platforms`}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        /* Main Glass Profile Card Stack */
      <GlassCard className="p-0 overflow-hidden max-w-xl mx-auto relative text-left" glowColor="pink">
        {/* Cover Image */}
        <div className="relative h-64 w-full cursor-pointer" onClick={() => setSelectedPortalProfile(currentProfile)}>
          <img src={currentProfile.coverImage} alt="Cover" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F0E17] via-[#0F0E17]/40 to-transparent" />

          {/* Match Score Badge */}
          <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-pink-500/40 text-xs font-bold text-pink-300 flex items-center gap-1.5 shadow-lg">
            <Sparkles className="w-4 h-4 text-pink-400" />
            {currentProfile.matchScore}% SOUL RESONANCE
          </div>

          {/* Verified Badge */}
          <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[11px] font-mono font-bold text-white flex items-center gap-1.5 shadow-lg">
            <VerificationBadge tier={currentProfile.tier} isVerified={currentProfile.isSoulVerified} size="md" showLabel />
          </div>
        </div>

        {/* Profile Content Body */}
        <div className="p-6 md:p-8 -mt-12 relative z-10 text-left">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div
              className="flex items-end gap-4 cursor-pointer"
              onClick={() => setSelectedPortalProfile(currentProfile)}
            >
              <AmbientOnlineAvatar
                src={currentProfile.avatar}
                alt={currentProfile.name}
                size="lg"
                isOnline={currentProfile.isOnline ?? true}
                glowColor="pink"
              />
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  {currentProfile.name}, {currentProfile.age}
                  <VerificationBadge tier={currentProfile.tier} isVerified={currentProfile.isSoulVerified} size="lg" />
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-pink-400" /> {currentProfile.location}
                  </span>
                  <GpsDistanceBadge
                    soulmate={currentProfile}
                    onClick={(p) => setSelectedGpsSoulmate(p)}
                    size="sm"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedPortalProfile(currentProfile)}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-xs font-mono font-bold hover:bg-cyan-500/30 transition-all flex items-center gap-1"
            >
              Portal <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <p className="text-sm font-semibold text-cyan-300 mb-2">{currentProfile.tagline}</p>
          <p className="text-xs text-zinc-300 leading-relaxed mb-4 bg-white/5 border border-white/10 p-4 rounded-xl">
            {currentProfile.bio}
          </p>

          {currentProfile.soulmateAim && (
            <div className="p-3 mb-6 rounded-xl bg-pink-500/10 border border-pink-500/20 text-xs text-pink-200">
              <span className="font-bold uppercase font-mono text-[10px] text-pink-400 block mb-0.5">Soulmate Goal</span>
              {currentProfile.soulmateAim}
            </div>
          )}

          {/* Top Genres & Interests Pills */}
          <div className="space-y-3 mb-8">
            <div>
              <p className="text-[10px] text-zinc-400 font-mono uppercase mb-1.5 flex items-center gap-1">
                <Music className="w-3 h-3 text-purple-400" /> Musical Frequencies:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {currentProfile.topGenres.map((g) => (
                  <span key={g} className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs">
                    {g}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-zinc-400 font-mono uppercase mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" /> Soul Interests:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {currentProfile.interests.map((i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs">
                    {i}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3 pt-4 border-t border-white/10">
            <button
              onClick={handleNextProfile}
              className="w-13 h-13 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
              title="Pass Profile"
            >
              <X className="w-5 h-5" />
            </button>

            <button
              onClick={() => handleShareProfile(currentProfile)}
              className="w-13 h-13 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/25 hover:text-white flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
              title={`Share ${currentProfile.name}'s Profile to External Platforms`}
            >
              <Share2 className="w-5 h-5" />
            </button>

            <button
              onClick={() => handleOpenChat(currentProfile)}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 hover:scale-105 transition-all"
            >
              <MessageCircle className="w-5 h-5" /> Start AI Chat
            </button>

            <button
              onClick={handleNextProfile}
              className="w-13 h-13 rounded-2xl bg-pink-500/20 border border-pink-500/40 text-pink-400 hover:bg-pink-500/30 flex items-center justify-center transition-all hover:scale-110 shadow-lg shadow-pink-500/20 cursor-pointer"
              title="Resonate / Like"
            >
              <Heart className="w-6 h-6 fill-pink-400" />
            </button>
          </div>
        </div>
      </GlassCard>
      )}

      {/* AI Soulmate Chat Modal */}
      <AnimatePresence>
        {activeChatProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-[#1B1A26] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[580px] relative"
            >
              {/* Chat Header */}
              <div className="p-3.5 bg-white/10 border-b border-white/10 flex items-center justify-between backdrop-blur-xl relative z-10">
                <div className="flex items-center gap-2.5">
                  <img src={activeChatProfile.avatar} alt="Avatar" className="w-10 h-10 rounded-xl object-cover border border-cyan-400/40" />
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      {activeChatProfile.name}
                      <CheckCircle2 className="w-3.5 h-3.5 fill-blue-500 text-white" />
                    </h3>
                    <p className="text-[10px] text-cyan-300 font-mono">Gemini AI Soul Persona</p>
                  </div>
                </div>

                {/* Call, Share & Theme Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleShareProfile(activeChatProfile)}
                    title={`Share ${activeChatProfile.name}'s Profile to External Platforms`}
                    className="p-2 rounded-xl bg-white/10 text-zinc-300 hover:text-white hover:bg-white/20 border border-white/15 transition-all cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-cyan-300" />
                  </button>

                  <button
                    onClick={() =>
                      handleShareJamSession({
                        title: `${activeChatProfile.name}'s ${activeChatProfile.topGenres[0] || 'Soul'} VR Jam`,
                        artist: activeChatProfile.topGenres.join(' · '),
                        genre: activeChatProfile.topGenres[0] || 'Romance Lounge',
                        roomName: `${activeChatProfile.name}'s 3D VR Room`,
                      })
                    }
                    title="Share 3D VR Music Jam with this Soulmate"
                    className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-400/30 transition-all cursor-pointer"
                  >
                    <Music className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleStartCall('voice')}
                    title="Start Voice Chat"
                    className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-400/30 transition-all"
                  >
                    <Phone className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleStartCall('video')}
                    title="Start Video Chat"
                    className="p-2 rounded-xl bg-pink-500/20 text-pink-300 hover:bg-pink-500/30 border border-pink-400/30 transition-all"
                  >
                    <Video className="w-4 h-4" />
                  </button>

                  <button
                    onClick={onOpenWallpaperModal}
                    title="Change Chat Wallpaper Theme"
                    className="p-2 rounded-xl bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-400/30 transition-all flex items-center gap-1 text-[10px] font-mono font-bold"
                  >
                    <Palette className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setActiveChatProfile(null)}
                    className="p-2 text-zinc-400 hover:text-white rounded-xl bg-white/5 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Active Wallpaper Background Container */}
              <div className={`flex-1 overflow-y-auto p-4 space-y-3 relative ${activeWallpaper.bgCss}`}>
                {/* Wallpaper Badge */}
                <div className="text-center my-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[9px] font-mono text-zinc-400">
                    Theme: {activeWallpaper.name} {activeWallpaper.isVipOnly && '✨ VIP'}
                  </span>
                </div>

                {chatMessages.map((m) => {
                  const isUser = m.sender === 'user';
                  return (
                    <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed shadow-lg ${
                          isUser
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-br-none'
                            : 'bg-black/60 backdrop-blur-md border border-white/15 text-zinc-200 rounded-bl-none'
                        }`}
                      >
                        <p>{m.text}</p>
                        <span className="text-[9px] text-white/50 block text-right mt-1 font-mono">{m.timestamp}</span>
                      </div>
                    </div>
                  );
                })}

                {isAiTyping && (
                  <div className="flex justify-start">
                    <div className="p-3 rounded-2xl bg-black/60 backdrop-blur-md border border-white/15 text-xs text-cyan-300 animate-pulse flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Resonating thoughts...
                    </div>
                  </div>
                )}
              </div>

              {/* VIP Best Experience vs Normal Module Banner */}
              {isVip ? (
                <div className="px-3 py-1.5 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-black border-t border-amber-400/30 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-amber-300 font-bold flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-bounce" />
                    VIP GOLD EXPERIENCE: Unlimited Chats • Instant 0.1s AI Speed • 4K Streaming
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-extrabold border border-amber-400/40">
                    BEST TIER ACTIVE
                  </span>
                </div>
              ) : (
                <div className="px-3 py-1.5 bg-zinc-900/90 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-zinc-400">
                    Normal Mode: {chatsUsed} / {maxChatsBasic} chats used (Standard AI Speed)
                  </span>
                  {onOpenUpgradeModal && (
                    <button
                      type="button"
                      onClick={() => onOpenUpgradeModal('Upgrade to VIP for the Best-of-the-Best Experience')}
                      className="text-amber-300 font-extrabold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Crown className="w-3 h-3 text-amber-300 fill-amber-300" />
                      Get VIP Best Experience →
                    </button>
                  )}
                </div>
              )}

              {/* Apple & Android Anti-Nudity Safety Guard Toolbar */}
              <div className="px-3 py-1.5 bg-black/90 border-t border-white/10 flex items-center justify-between gap-2 text-[10px] font-mono">
                <span className="text-zinc-400 truncate flex items-center gap-1 text-[9.5px]">
                  <span>🛡️</span>
                  <span>Anti-Nudity: Covered swimwear/tops allowed. Widely naked banned (7 strikes = ban + $10 fine).</span>
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const imgMsg: ChatMessage = {
                        id: `u_covered_${Date.now()}`,
                        sender: 'user',
                        text: '📷 [Photo: Beach Swimsuit - Private parts completely covered ✅ Approved by AI]',
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      };
                      setChatMessages((prev) => [...prev, imgMsg]);
                    }}
                    className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[9.5px] font-bold border border-emerald-400/30 cursor-pointer"
                    title="Test compliant photo where swimwear/clothing covers private parts completely"
                  >
                    + Covered (Allowed ✅)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onReportViolation) {
                        onReportViolation({
                          type: 'message',
                          reason: 'Prohibited unclad nudity: Widely naked photo detected. Exposed private parts are strictly prohibited under Apple & Android store policy.',
                          snippet: 'Prohibited nude photo attachment',
                        });
                      }
                    }}
                    className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-[9.5px] font-bold border border-rose-500/30 cursor-pointer"
                    title="Test prohibited nude photo violation to test strike and ban system"
                  >
                    + Nude (Test Strike ❌)
                  </button>
                </div>
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendAiChat} className="p-3 bg-black/80 border-t border-white/10 flex items-center gap-2">
                <label
                  title="Attach Photo (Anti-Nudity Guard Active)"
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-cyan-300 cursor-pointer transition-all flex items-center justify-center flex-shrink-0"
                >
                  <ImageIcon className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadImageChat}
                    className="hidden"
                  />
                </label>
                <input
                  type="text"
                  placeholder={
                    !isVip && chatsUsed >= maxChatsBasic
                      ? `Quota limit reached (${maxChatsBasic}/${maxChatsBasic}). Upgrade to VIP!`
                      : `Chat with ${activeChatProfile.name}...`
                  }
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={!isVip && chatsUsed >= maxChatsBasic}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!isVip && chatsUsed >= maxChatsBasic}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold hover:opacity-90 flex items-center gap-1.5 shadow-lg shadow-pink-500/20 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Voice / Video Call Modal */}
      <AnimatePresence>
        {activeCall && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-[#12111D] border border-cyan-400/40 rounded-3xl p-6 text-center space-y-6 relative shadow-2xl overflow-hidden"
            >
              {/* Top Call Info */}
              <div className="space-y-1">
                <span className="inline-block px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] uppercase tracking-widest border border-cyan-400/30">
                  {activeCall.type === 'video' ? 'Live Video Call' : 'Encrypted Voice Chat'}
                </span>
                <p className="text-xs text-zinc-400 font-mono">
                  Duration: {Math.floor(callTimer / 60)}:{('0' + (callTimer % 60)).slice(-2)}
                </p>
              </div>

              {/* Avatar or Video View */}
              <div className="relative w-36 h-36 mx-auto rounded-3xl overflow-hidden border-2 border-cyan-400/60 shadow-2xl">
                <img
                  src={activeCall.profile.avatar}
                  alt={activeCall.profile.name}
                  className={`w-full h-full object-cover ${isVideoOff && activeCall.type === 'video' ? 'opacity-20 blur-sm' : ''}`}
                />
                {!isMuted && (
                  <div className="absolute inset-0 border-4 border-cyan-400 rounded-3xl animate-ping opacity-30 pointer-events-none" />
                )}
                {isVideoOff && activeCall.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-xs font-mono">
                    Video Paused
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-white flex items-center justify-center gap-1.5">
                  {activeCall.profile.name}
                  <VerificationBadge tier={activeCall.profile.tier} isVerified={activeCall.profile.isSoulVerified} size="lg" />
                </h3>
                <p className="text-xs text-cyan-300 font-mono mt-1">
                  Connected via Twogether High-Fidelity Audio
                </p>
              </div>

              {/* Acoustic Waveforms */}
              <div className="flex items-center justify-center gap-1.5 h-8">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-gradient-to-t from-cyan-400 to-pink-500 rounded-full animate-bounce"
                    style={{
                      height: isMuted ? '4px' : `${Math.sin(i + callTimer) * 16 + 20}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>

              {/* Call Controls */}
              <div className="flex items-center justify-center gap-4 pt-4 border-t border-white/10">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold transition-all ${
                    isMuted ? 'bg-amber-500/30 border border-amber-400/50 text-amber-300' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-cyan-400" />}
                </button>

                {activeCall.type === 'video' && (
                  <button
                    onClick={() => setIsVideoOff(!isVideoOff)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold transition-all ${
                      isVideoOff ? 'bg-amber-500/30 border border-amber-400/50 text-amber-300' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5 text-pink-400" />}
                  </button>
                )}

                <button
                  onClick={() => setActiveCall(null)}
                  className="w-14 h-14 rounded-2xl bg-rose-600 text-white hover:bg-rose-700 flex items-center justify-center transition-all shadow-lg shadow-rose-600/30 hover:scale-105"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rich Profile Portal Modal */}
      <ProfilePortalModal
        profile={selectedPortalProfile}
        isOpen={!!selectedPortalProfile}
        onClose={() => setSelectedPortalProfile(null)}
        onStartChat={(prof) => handleOpenChat(prof)}
        onShareProfile={(prof) => handleShareProfile(prof)}
        onStartCall={(prof, type) => {
          const isAllowed = type === 'voice'
            ? (isVoiceActive || callsUsed < maxCallsBasic)
            : (isVideoActive || callsUsed < maxCallsBasic);

          if (!isAllowed) {
            setPassUnlockModal({ type, pendingCall: { type, profile: prof } });
            return;
          }
          if (onIncrementCalls) onIncrementCalls();
          setActiveCall({ type, profile: prof });
        }}
      />

      {/* GPS Location & Google Maps Verification Modal */}
      <GpsLocationVerificationModal
        soulmate={selectedGpsSoulmate}
        isOpen={!!selectedGpsSoulmate}
        onClose={() => setSelectedGpsSoulmate(null)}
      />

      {/* À La Carte Pass Unlock Modal (Voice / Video / Chats) */}
      <AnimatePresence>
        {passUnlockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-[#181726] border border-amber-400/40 rounded-3xl p-6 shadow-2xl relative text-left"
            >
              <button
                onClick={() => setPassUnlockModal(null)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-white/5 rounded-full cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-pink-500 text-black flex items-center justify-center shadow-lg">
                  {passUnlockModal.type === 'voice' && <Phone className="w-5 h-5" />}
                  {passUnlockModal.type === 'video' && <Video className="w-5 h-5" />}
                  {passUnlockModal.type === 'chats' && <MessageSquare className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {passUnlockModal.type === 'voice' && 'Unlock Voice Chat'}
                    {passUnlockModal.type === 'video' && 'Unlock HD Video Chat'}
                    {passUnlockModal.type === 'chats' && 'Unlock Direct Messaging'}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Choose an exact pass or unlock with Points • No VIP required!
                  </p>
                </div>
              </div>

              {/* Passes Cards */}
              {passModalError && (
                <div className="p-2.5 my-2 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs font-mono font-bold">
                  ❌ {passModalError}
                </div>
              )}
              <div className="space-y-2.5 my-4">
                {passUnlockModal.type === 'voice' && (
                  <>
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/40 transition-all flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">Voice Chat 7-Day Pass</span>
                          <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-mono">7 Days</span>
                        </div>
                        <p className="text-[10.5px] text-zinc-400 mt-0.5">Unlimited HD voice calls & audio speed dating</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => {
                            if (giftsBalance < 40) {
                              setPassModalError(`Insufficient Points: You have ${giftsBalance} Points. 40 Points needed.`);
                              return;
                            }
                            if (onSpendGifts) onSpendGifts(40, 'Voice Chat 7-Day Pass', 'voice_pass_7d');
                            const pending = passUnlockModal.pendingCall;
                            setPassUnlockModal(null);
                            if (pending) {
                              if (onIncrementCalls) onIncrementCalls();
                              setActiveCall(pending);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-mono font-bold hover:scale-105 transition-all cursor-pointer"
                        >
                          40 Pts
                        </button>
                        <button
                          onClick={() => {
                            if (onUnlockFeatureDirectly) onUnlockFeatureDirectly('voice_pass_7d', '$1.99 USD');
                            const pending = passUnlockModal.pendingCall;
                            setPassUnlockModal(null);
                            if (pending) {
                              if (onIncrementCalls) onIncrementCalls();
                              setActiveCall(pending);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-cyan-400 text-black text-xs font-mono font-bold hover:scale-105 transition-all cursor-pointer"
                        >
                          $1.99
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/40 transition-all flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">Voice Chat 30-Day Pass</span>
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono">30 Days</span>
                        </div>
                        <p className="text-[10.5px] text-zinc-400 mt-0.5">Unlimited voice calls for an entire month</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => {
                            if (giftsBalance < 80) {
                              setPassModalError(`Insufficient Points: You have ${giftsBalance} Points. 80 Points needed.`);
                              return;
                            }
                            if (onSpendGifts) onSpendGifts(80, 'Voice Chat 30-Day Pass', 'voice_pass_30d');
                            const pending = passUnlockModal.pendingCall;
                            setPassUnlockModal(null);
                            if (pending) {
                              if (onIncrementCalls) onIncrementCalls();
                              setActiveCall(pending);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-mono font-bold hover:scale-105 transition-all cursor-pointer"
                        >
                          80 Pts
                        </button>
                        <button
                          onClick={() => {
                            if (onUnlockFeatureDirectly) onUnlockFeatureDirectly('voice_pass_30d', '$3.99 USD');
                            const pending = passUnlockModal.pendingCall;
                            setPassUnlockModal(null);
                            if (pending) {
                              if (onIncrementCalls) onIncrementCalls();
                              setActiveCall(pending);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-cyan-400 text-black text-xs font-mono font-bold hover:scale-105 transition-all cursor-pointer"
                        >
                          $3.99
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {passUnlockModal.type === 'video' && (
                  <>
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-400/40 transition-all flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">HD Video Chat 7-Day Pass</span>
                          <span className="px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 text-[9px] font-mono">7 Days</span>
                        </div>
                        <p className="text-[10.5px] text-zinc-400 mt-0.5">Face-to-face HD private video calls with camera filters</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => {
                            if (giftsBalance < 60) {
                              setPassModalError(`Insufficient Points: You have ${giftsBalance} Points. 60 Points needed.`);
                              return;
                            }
                            if (onSpendGifts) onSpendGifts(60, 'HD Video Chat 7-Day Pass', 'video_pass_7d');
                            const pending = passUnlockModal.pendingCall;
                            setPassUnlockModal(null);
                            if (pending) {
                              if (onIncrementCalls) onIncrementCalls();
                              setActiveCall(pending);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-mono font-bold hover:scale-105 transition-all cursor-pointer"
                        >
                          60 Pts
                        </button>
                        <button
                          onClick={() => {
                            if (onUnlockFeatureDirectly) onUnlockFeatureDirectly('video_pass_7d', '$2.99 USD');
                            const pending = passUnlockModal.pendingCall;
                            setPassUnlockModal(null);
                            if (pending) {
                              if (onIncrementCalls) onIncrementCalls();
                              setActiveCall(pending);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-pink-500 text-white text-xs font-mono font-bold hover:scale-105 transition-all cursor-pointer"
                        >
                          $2.99
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-400/40 transition-all flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">HD Video Chat 30-Day Pass</span>
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono">30 Days</span>
                        </div>
                        <p className="text-[10.5px] text-zinc-400 mt-0.5">Unlimited video dates with all matches for 1 month</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => {
                            if (giftsBalance < 120) {
                              setPassModalError(`Insufficient Points: You have ${giftsBalance} Points. 120 Points needed.`);
                              return;
                            }
                            if (onSpendGifts) onSpendGifts(120, 'HD Video Chat 30-Day Pass', 'video_pass_30d');
                            const pending = passUnlockModal.pendingCall;
                            setPassUnlockModal(null);
                            if (pending) {
                              if (onIncrementCalls) onIncrementCalls();
                              setActiveCall(pending);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-mono font-bold hover:scale-105 transition-all cursor-pointer"
                        >
                          120 Pts
                        </button>
                        <button
                          onClick={() => {
                            if (onUnlockFeatureDirectly) onUnlockFeatureDirectly('video_pass_30d', '$5.99 USD');
                            const pending = passUnlockModal.pendingCall;
                            setPassUnlockModal(null);
                            if (pending) {
                              if (onIncrementCalls) onIncrementCalls();
                              setActiveCall(pending);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-pink-500 text-white text-xs font-mono font-bold hover:scale-105 transition-all cursor-pointer"
                        >
                          $5.99
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {passUnlockModal.type === 'chats' && (
                  <>
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/40 transition-all flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">Unlimited Match Chats (14 Days)</span>
                          <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-mono">14 Days</span>
                        </div>
                        <p className="text-[10.5px] text-zinc-400 mt-0.5">Chat with unlimited matches without basic quotas</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => {
                            if (giftsBalance < 40) {
                              setPassModalError(`Insufficient Points: You have ${giftsBalance} Points. 40 Points needed.`);
                              return;
                            }
                            if (onSpendGifts) onSpendGifts(40, 'Unlimited Match Chats 14-Day Pass', 'chats_pass_14d');
                            setPassUnlockModal(null);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-mono font-bold hover:scale-105 transition-all cursor-pointer"
                        >
                          40 Pts
                        </button>
                        <button
                          onClick={() => {
                            if (onUnlockFeatureDirectly) onUnlockFeatureDirectly('chats_pass_14d', '$1.99 USD');
                            setPassUnlockModal(null);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-cyan-400 text-black text-xs font-mono font-bold hover:scale-105 transition-all cursor-pointer"
                        >
                          $1.99
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/40 transition-all flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">25 Direct Chats Booster Pack</span>
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono">No Expiry</span>
                        </div>
                        <p className="text-[10.5px] text-zinc-400 mt-0.5">25 permanent conversation credits</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => {
                            if (giftsBalance < 20) {
                              setPassModalError(`Insufficient Points: You have ${giftsBalance} Points. 20 Points needed.`);
                              return;
                            }
                            if (onSpendGifts) onSpendGifts(20, '25 Direct Chats Booster Pack', 'chats_pack_25');
                            setPassUnlockModal(null);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-mono font-bold hover:scale-105 transition-all cursor-pointer"
                        >
                          20 Pts
                        </button>
                        <button
                          onClick={() => {
                            if (onUnlockFeatureDirectly) onUnlockFeatureDirectly('chats_pack_25', '$0.99 USD');
                            setPassUnlockModal(null);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-cyan-400 text-black text-xs font-mono font-bold hover:scale-105 transition-all cursor-pointer"
                        >
                          $0.99
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Or VIP Full Pass footer */}
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-mono text-[11px]">
                  My Points: <strong className="text-amber-300">🎁 {giftsBalance} Pts</strong>
                </span>
                <button
                  onClick={() => {
                    setPassUnlockModal(null);
                    if (onOpenUpgradeModal) onOpenUpgradeModal('Unlock Unlimited Voice & Video Calls, All Wallpapers & VIP Gold Badge!');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[11px] font-bold hover:bg-amber-500/30 flex items-center gap-1 cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 fill-amber-300" /> Full VIP All-Inclusive
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share to External Platforms & Browser Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        payload={sharePayload}
      />
    </div>
  );
};
