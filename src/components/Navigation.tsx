import React, { useState, useEffect } from 'react';
import {
  Home,
  Music,
  Plus,
  Film,
  Heart,
  Crown,
  Bell,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  User,
  Gift,
  KeyRound,
  Users,
  Smartphone,
  Tv,
  Volume2,
  VolumeX,
  BellOff,
  Play,
  Pause,
  Sliders,
  Check,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VerificationBadge } from './VerificationBadge';
import { AmbientOnlineAvatar } from './AmbientOnlineAvatar';
import { ActiveSubscriptionRecord } from '../types';
import { appSoundService } from '../services/appSoundService';
import { loveSongAudioService } from '../services/loveSongAudioService';

interface NavigationProps {
  activeTab: 'home' | 'beats' | 'reels' | 'singles' | 'vip';
  setActiveTab: (tab: 'home' | 'beats' | 'reels' | 'singles' | 'vip') => void;
  onOpenCreatePost: () => void;
  onOpenChatList: () => void;
  onOpenProfile: () => void;
  isVerified?: boolean;
  isVip?: boolean;
  activeSubscription?: ActiveSubscriptionRecord | null;
  onOpenUpgradeModal?: () => void;
  giftsBalance?: number;
  pointsBalance?: number;
  onOpenGiftStore?: () => void;
  onOpenDailyReward?: () => void;
  onOpenReferral?: () => void;
  onOpenIntro?: () => void;
  onOpenAuthModal?: () => void;
  isLoggedIn?: boolean;
  userAvatar?: string;
  userName?: string;
  strikesCount?: number;
  onOpenStrikesModal?: () => void;
  onOpenMobileInstall?: () => void;
  onOpenAdsCenter?: () => void;
  isAppOwner?: boolean;
  backendViewMode?: 'frontend' | 'owner_backend';
  onToggleBackendView?: () => void;
  isMusicBarVisible?: boolean;
  onToggleMusicBar?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreatePost,
  onOpenChatList,
  onOpenProfile,
  isVerified = true,
  isVip = false,
  activeSubscription,
  onOpenUpgradeModal,
  giftsBalance = 50,
  pointsBalance = 0,
  onOpenGiftStore,
  onOpenDailyReward,
  onOpenReferral,
  onOpenIntro,
  onOpenAuthModal,
  isLoggedIn = true,
  userAvatar,
  userName = 'Alex',
  strikesCount = 0,
  onOpenStrikesModal,
  onOpenMobileInstall,
  onOpenAdsCenter,
  isAppOwner = false,
  backendViewMode = 'frontend',
  onToggleBackendView,
  isMusicBarVisible = true,
  onToggleMusicBar,
}) => {
  // Audio Channels State: Mute pop-ups vs selected background music
  const [isPopupMuted, setIsPopupMuted] = useState<boolean>(() =>
    appSoundService.getIsPopupSoundMuted()
  );
  const [musicVol, setMusicVol] = useState<number>(() =>
    appSoundService.getMusicVolume()
  );
  const [isAudioPopoverOpen, setIsAudioPopoverOpen] = useState<boolean>(false);
  const [currentSong, setCurrentSong] = useState(() =>
    loveSongAudioService.getCurrentSong()
  );
  const [isSongPlaying, setIsSongPlaying] = useState(() =>
    loveSongAudioService.getIsPlaying()
  );

  useEffect(() => {
    const unsubSound = appSoundService.subscribe((muted, vol) => {
      setIsPopupMuted(muted);
      setMusicVol(vol);
    });

    const unsubMusic = loveSongAudioService.subscribe((song, playing) => {
      setCurrentSong(song);
      setIsSongPlaying(playing);
    });

    return () => {
      unsubSound();
      unsubMusic();
    };
  }, []);

  const handleTogglePopupMute = () => {
    appSoundService.togglePopupSoundMuted();
  };

  const handleToggleMusicPlay = () => {
    loveSongAudioService.togglePlay();
  };

  const handleMusicVolumeChange = (newVol: number) => {
    setMusicVol(newVol);
    appSoundService.setMusicVolume(newVol);
    loveSongAudioService.setVolume(newVol);
  };

  return (
    <>
      {/* Top Header Bar matching Twogether App */}
      <header
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        className="sticky top-0 z-50 backdrop-blur-2xl bg-[#0F0E17]/85 border-b border-white/10 px-4 sm:px-6 pb-3"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Logo 'twogether' with 3D colorful pastel gradient spheres */}
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2 cursor-pointer group select-none shrink-0"
          >
            <img
              src="/pwa-192x192.png"
              alt="Twogether App Icon"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-xl shadow-lg shadow-pink-500/20 border border-white/15 group-hover:scale-105 transition-transform object-cover"
            />
            <div className="flex items-center gap-1">
              <span className="text-xl font-extrabold tracking-tight text-white font-sans">
                twogether
              </span>
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
            </div>
          </div>

          {/* Top Right Header Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap justify-end">
            {/* VIP Status / Subscription Approved Badge */}
            {isVip || activeSubscription ? (
              <button
                onClick={() => setActiveTab('vip')}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-black border border-amber-400 text-amber-300 font-mono text-xs font-black shadow-lg shadow-amber-500/20 hover:scale-105 transition-all cursor-pointer"
                title={
                  activeSubscription
                    ? `Active Subscription: ${activeSubscription.planName} (Approved via Google Pay)`
                    : 'VIP Member Active'
                }
              >
                <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                <span className="hidden xs:inline">VIP Approved</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </button>
            ) : (
              onOpenUpgradeModal && (
                <button
                  onClick={onOpenUpgradeModal}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-amber-400/50 text-amber-300 font-mono text-xs font-bold transition-all cursor-pointer"
                  title="Unlock VIP Membership via Google Pay"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden xs:inline">VIP Pass</span>
                </button>
              )
            )}

            {/* Independent Audio Control (Mute Pop-Up Sounds & Selected Music Manager) */}
            <div className="relative">
              <button
                onClick={() => setIsAudioPopoverOpen(!isAudioPopoverOpen)}
                className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-full border text-xs font-mono font-bold transition-all shadow-sm cursor-pointer ${
                  isPopupMuted
                    ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                    : 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300 hover:text-white'
                }`}
                title="Audio Channels: Mute Pop-Up Sounds while playing selected music"
              >
                {isPopupMuted ? (
                  <>
                    <BellOff className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] hidden sm:inline">Pop-ups Muted</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[10px] hidden sm:inline">Audio</span>
                  </>
                )}
                {isSongPlaying && (
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
                )}
              </button>

              {/* Interactive Audio Channels Popover */}
              <AnimatePresence>
                {isAudioPopoverOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    className="absolute right-0 top-10 mt-2 w-72 sm:w-80 bg-[#161426] border border-cyan-500/40 rounded-2xl p-4 shadow-2xl z-50 text-left font-sans space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white">
                        <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Independent Audio Channels</span>
                      </div>
                      <button
                        onClick={() => setIsAudioPopoverOpen(false)}
                        className="p-1 rounded-full text-zinc-400 hover:text-white bg-white/5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Channel 1: Pop-Up & Alert Sounds Mute Switch */}
                    <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                          {isPopupMuted ? (
                            <BellOff className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Bell className="w-3.5 h-3.5 text-cyan-400" />
                          )}
                          Pop-Up & Alert Sounds
                        </span>
                        <button
                          onClick={handleTogglePopupMute}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold cursor-pointer transition-colors ${
                            isPopupMuted
                              ? 'bg-amber-400 text-black shadow-sm'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white border border-white/10'
                          }`}
                        >
                          {isPopupMuted ? 'MUTED 🔕' : 'ACTIVE 🔔'}
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-tight font-mono">
                        {isPopupMuted
                          ? '✅ Pop-up sounds silenced. No chimes or ad audio will interrupt you.'
                          : 'Pop-up sounds active (alerts, notification chimes, ad audio).'}
                      </p>
                    </div>

                    {/* Channel 2: Selected Background Music Stream */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Music className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white block truncate">
                              {currentSong?.title || 'Selected Music'}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono block truncate">
                              {currentSong?.artist || 'Trending Love Hits'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={handleToggleMusicPlay}
                          className="w-7 h-7 rounded-full bg-gradient-to-r from-cyan-400 to-pink-500 text-black flex items-center justify-center flex-shrink-0 hover:scale-105 transition-transform cursor-pointer"
                        >
                          {isSongPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-black" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                          )}
                        </button>
                      </div>

                      {/* Music Volume Slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                          <span>Music Volume:</span>
                          <span className="text-pink-300 font-bold">
                            {Math.round(musicVol * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={musicVol}
                          onChange={(e) => handleMusicVolumeChange(Number(e.target.value))}
                          className="w-full accent-pink-500 cursor-pointer"
                        />
                      </div>

                      {onToggleMusicBar && (
                        <button
                          onClick={onToggleMusicBar}
                          className="w-full py-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-mono font-bold text-zinc-200 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isMusicBarVisible ? (
                            <>
                              <X className="w-3.5 h-3.5 text-rose-400" />
                              <span>Hide Floating Music Bar</span>
                            </>
                          ) : (
                            <>
                              <Music className="w-3.5 h-3.5 text-pink-400" />
                              <span>Show Floating Music Bar</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Selected music keeps playing smoothly even if pop-ups are muted.</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Opening Intro Clip Button */}
            {onOpenIntro && (
              <button
                onClick={onOpenIntro}
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/5 border border-pink-400/40 text-pink-300 hover:text-white text-xs font-mono font-bold transition-all shadow-sm"
                title="Play Opening Intro Cinematic Clip"
              >
                <Film className="w-3.5 h-3.5 text-pink-400" />
                <span>Intro</span>
              </button>
            )}

            {/* Gifts Store Button */}
            {onOpenGiftStore && (
              <button
                onClick={onOpenGiftStore}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-black border border-amber-400/40 text-amber-300 font-mono text-xs font-bold hover:scale-105 transition-all shadow-md"
                title="Open Gifts Store & Feature Store"
              >
                <Gift className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>🎁 {giftsBalance}</span>
              </button>
            )}

            {/* Daily Login Streak & Determination Points Button */}
            {onOpenDailyReward && (
              <button
                onClick={onOpenDailyReward}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 font-mono text-xs font-bold hover:scale-105 transition-all shadow-sm"
                title="Daily Login Streak (+2.5 Pts/Day)"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>⭐ {pointsBalance}P</span>
              </button>
            )}

            {/* Referral Button */}
            {onOpenReferral && (
              <button
                onClick={onOpenReferral}
                className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-purple-500/15 border border-purple-400/40 text-purple-300 hover:text-white font-mono text-xs font-bold hover:scale-105 transition-all shadow-sm"
                title="Refer Friends & Earn +10 Points"
              >
                <Users className="w-3.5 h-3.5 text-pink-400" />
                <span>Refer +10P</span>
              </button>
            )}

            {/* Mobile Install Button */}
            {onOpenMobileInstall && (
              <button
                onClick={onOpenMobileInstall}
                className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 hover:text-white font-mono text-xs font-bold hover:scale-105 transition-all shadow-sm"
                title="Use & Install on iPhone or Android"
              >
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                <span>App</span>
              </button>
            )}

            {/* Owner Back-End / Front-End Switch — Strictly visible ONLY to Verified App Owner */}
            {isAppOwner && onToggleBackendView && (
              <button
                onClick={onToggleBackendView}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border font-mono text-xs font-extrabold hover:scale-105 transition-all shadow-md cursor-pointer ${
                  backendViewMode === 'owner_backend'
                    ? 'bg-amber-400 text-black border-amber-300'
                    : 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                }`}
                title="Switch between Owner Back-End Console and User Front-End"
              >
                <Crown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {backendViewMode === 'owner_backend' ? 'Front-End View' : 'Owner Back-End'}
                </span>
              </button>
            )}

            {/* Ads Center & Monetization Button — Strictly Owner Only */}
            {isAppOwner && onOpenAdsCenter && (
              <button
                onClick={onOpenAdsCenter}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 hover:text-white font-mono text-xs font-bold hover:scale-105 transition-all shadow-sm"
                title="Ads Center (Live Earnings & M-Pesa Payouts)"
              >
                <Tv className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Ads</span>
              </button>
            )}

            {/* Community Safety Strike Counter Badge */}
            {strikesCount > 0 && onOpenStrikesModal && (
              <button
                onClick={onOpenStrikesModal}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-[11px] font-bold hover:scale-105 transition-all shadow-sm"
                title={`${strikesCount} of 7 strikes`}
              >
                <span>⚠️</span>
                <span>{strikesCount}/7</span>
              </button>
            )}

            {/* Notifications Bell */}
            <button
              onClick={() => setActiveTab('home')}
              className="relative p-2 rounded-full bg-white/5 border border-white/10 text-zinc-300 hover:text-white transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[9px] font-mono font-extrabold rounded-full border border-black shadow-md">
                54
              </span>
            </button>

            {/* Direct Chat Icon */}
            <button
              onClick={onOpenChatList}
              className="relative p-2 rounded-full bg-white/5 border border-white/10 text-zinc-300 hover:text-cyan-300 transition-colors"
              title="Chats"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full border border-black animate-pulse" />
            </button>

            {/* Profile Avatar or Direct Login Portal Trigger */}
            {isLoggedIn ? (
              <div className="relative shrink-0">
                <AmbientOnlineAvatar
                  src={userAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"}
                  alt={`${userName} Profile`}
                  size="sm"
                  isOnline={true}
                  glowColor="cyan"
                  onClick={onOpenProfile}
                />
                <div className="absolute -bottom-1 -right-1 z-20 pointer-events-none">
                  <VerificationBadge tier={isVip ? 'vip' : 'basic'} isVerified={isVerified} size="sm" />
                </div>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 text-black font-extrabold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Log In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Bottom Floating Navigation Dock */}
      <nav
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-2xl bg-[#0F0E17]/90 border-t border-white/10 px-4 py-2"
      >
        <div className="max-w-md mx-auto flex items-center justify-around">
          {/* Tab 1: Fun & Games */}
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-0.5 p-1.5 sm:p-2 rounded-2xl transition-all ${
              activeTab === 'home' ? 'text-pink-400 font-bold scale-105' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Games</span>
          </button>

          {/* Tab 2: Shared Beats (DJ Music / 3D VR) */}
          <button
            onClick={() => setActiveTab('beats')}
            className={`flex flex-col items-center gap-0.5 p-1.5 sm:p-2 rounded-2xl transition-all ${
              activeTab === 'beats' ? 'text-cyan-400 font-bold scale-105' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Music className="w-5 h-5" />
            <span className="text-[10px] font-medium">Beats</span>
          </button>

          {/* Tab 3: Messages */}
          <button
            onClick={onOpenChatList}
            className={`flex flex-col items-center gap-0.5 p-1 sm:p-1.5 rounded-2xl transition-all relative ${
              activeTab === 'singles' ? 'text-cyan-400 font-bold scale-105' : 'text-zinc-400 hover:text-white'
            }`}
            title="Message Portal / Soul Chats"
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-pink-500 rounded-full border border-black animate-ping" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-pink-500 rounded-full border border-black" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-medium text-cyan-300">Messages</span>
          </button>

          {/* Tab 4: (+) Center Posting Button */}
          <button
            onClick={onOpenCreatePost}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 text-black flex items-center justify-center font-extrabold shadow-lg shadow-pink-500/30 hover:scale-110 active:scale-95 transition-transform -mt-4 border-2 border-black flex-shrink-0"
            title="Posting Portal / Post Photos & Videos"
          >
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-black stroke-[3]" />
          </button>

          {/* Tab 5: Soul Reels / TikTok Feed */}
          <button
            onClick={() => setActiveTab('reels')}
            className={`flex flex-col items-center gap-0.5 p-1.5 sm:p-2 rounded-2xl transition-all ${
              activeTab === 'reels' ? 'text-purple-400 font-bold scale-105' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Film className="w-5 h-5" />
            <span className="text-[10px] font-medium">Reels</span>
          </button>

          {/* Tab 6: Single Souls */}
          <button
            onClick={() => setActiveTab('singles')}
            className={`flex flex-col items-center gap-0.5 p-1.5 sm:p-2 rounded-2xl transition-all ${
              activeTab === 'singles' ? 'text-amber-400 font-bold scale-105' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Heart className="w-5 h-5" />
            <span className="text-[10px] font-medium">Singles</span>
          </button>

          {/* Tab 7: Profile Portal */}
          <button
            onClick={onOpenProfile}
            className="flex flex-col items-center gap-0.5 p-1.5 sm:p-2 rounded-2xl text-zinc-400 hover:text-white transition-all relative"
            title="Open Profile Portal"
          >
            <div className="relative">
              <User className="w-5 h-5" />
              <div className="absolute -top-1 -right-1">
                <VerificationBadge tier={isVip ? 'vip' : 'basic'} isVerified={isVerified} size="sm" />
              </div>
            </div>
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>
      </nav>
    </>
  );
};
