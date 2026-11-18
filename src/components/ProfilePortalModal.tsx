import React, { useState } from 'react';
import {
  X,
  MapPin,
  Briefcase,
  Target,
  Heart,
  MessageCircle,
  Phone,
  Video,
  ExternalLink,
  Instagram,
  Music,
  Globe,
  Youtube,
  Twitter,
  Play,
  Image as ImageIcon,
  Film,
  Sparkles,
  Share2,
  CheckCircle2,
  Crown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { SoulProfile } from '../types';
import { VerificationBadge } from './VerificationBadge';
import { AmbientOnlineAvatar } from './AmbientOnlineAvatar';
import { GpsDistanceBadge } from './GpsDistanceBadge';
import { GpsLocationVerificationModal } from './GpsLocationVerificationModal';
import { AchievementProfileStrip } from './AchievementBadges';
import { useAchievements } from '../services/achievementService';

interface ProfilePortalModalProps {
  profile: SoulProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onStartChat?: (profile: SoulProfile) => void;
  onStartCall?: (profile: SoulProfile, type: 'voice' | 'video') => void;
  onShareProfile?: (profile: SoulProfile) => void;
  isCurrentUser?: boolean;
}

export const ProfilePortalModal: React.FC<ProfilePortalModalProps> = ({
  profile,
  isOpen,
  onClose,
  onStartChat,
  onStartCall,
  onShareProfile,
  isCurrentUser = false,
}) => {
  const [activeTab, setActiveTab] = useState<'about' | 'gallery' | 'socials'>('about');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<{ url: string; title: string } | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
  const { earnedIds } = useAchievements();

  if (!isOpen || !profile) return null;

  const isVip = profile.tier === 'vip';
  const profileBadgeIds = isCurrentUser
    ? Array.from(new Set([...(profile.badges || []), ...earnedIds]))
    : profile.badges || [];

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl overflow-y-auto">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        className="w-full max-w-2xl bg-[#12111D] border border-white/15 rounded-3xl overflow-hidden shadow-2xl relative my-auto max-h-[90vh] flex flex-col"
      >
        {/* Cover Photo Header */}
        <div className="relative h-44 sm:h-52 w-full overflow-hidden shrink-0">
          <img
            src={profile.coverImage || profile.avatar}
            alt="Cover"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12111D] via-[#12111D]/40 to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 text-zinc-300 hover:text-white bg-black/50 backdrop-blur-md rounded-full border border-white/20 transition-all z-20 hover:scale-110"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Match Score Badge */}
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-pink-500/40 text-pink-300 font-mono text-xs font-bold flex items-center gap-1.5 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            {profile.matchScore}% Soul Match
          </div>
        </div>

        {/* Profile Info Header & Avatar Overlay */}
        <div className="px-6 -mt-16 sm:-mt-20 relative z-10 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              {/* Profile Avatar with Ambient Online Lighting Aura */}
              <div className="relative shrink-0">
                <AmbientOnlineAvatar
                  src={profile.avatar}
                  alt={profile.name}
                  size="xl"
                  isOnline={profile.isOnline ?? true}
                  glowColor="emerald"
                />
                <div className="absolute -bottom-1 -right-1 z-20">
                  <VerificationBadge tier={profile.tier} isVerified={profile.isSoulVerified} size="md" />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {profile.name}, {profile.age}
                  </h2>
                  <VerificationBadge tier={profile.tier} isVerified={profile.isSoulVerified} size="lg" showLabel />
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-300 font-mono">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                    {profile.location || 'Neo-Tokyo'}
                  </span>

                  {/* GPS Distance Badge Trigger */}
                  <GpsDistanceBadge
                    soulmate={profile}
                    onClick={() => setIsGpsModalOpen(true)}
                    size="sm"
                  />
                </div>

                <p className="text-xs text-cyan-300 font-mono italic">
                  "{profile.tagline || 'Seeking soulful alignment'}"
                </p>

                {profileBadgeIds.length > 0 && (
                  <div className="pt-1">
                    <AchievementProfileStrip
                      badgeIds={profileBadgeIds}
                      maxVisible={4}
                      compact={true}
                      ownerName={profile.name}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action Buttons */}
            {!isCurrentUser && (
              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                <button
                  onClick={() => setIsLiked(!isLiked)}
                  className={`p-3 rounded-2xl border transition-all ${
                    isLiked
                      ? 'bg-pink-500 text-white border-pink-400 shadow-lg shadow-pink-500/30'
                      : 'bg-white/10 text-zinc-300 hover:text-white border-white/15'
                  }`}
                  title="Resonate / Like Profile"
                >
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-white' : ''}`} />
                </button>

                {onShareProfile && (
                  <button
                    onClick={() => onShareProfile(profile)}
                    className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-cyan-300 hover:text-white border border-white/15 hover:scale-105 transition-all cursor-pointer"
                    title="Share Profile to External Platforms via Browser Share"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                )}

                {onStartChat && (
                  <button
                    onClick={() => {
                      onClose();
                      onStartChat(profile);
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg hover:scale-105 transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat Now
                  </button>
                )}

                {onStartCall && (
                  <button
                    onClick={() => {
                      onClose();
                      onStartCall(profile, 'voice');
                    }}
                    className="p-3 rounded-2xl bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-400/30 transition-all"
                    title="Voice Call"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 px-6 mt-6 shrink-0 text-xs font-mono">
          <button
            onClick={() => setActiveTab('about')}
            className={`pb-3 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'about'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Profile & Aim
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`pb-3 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'gallery'
                ? 'border-pink-400 text-pink-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> Media Gallery ({profile.galleryPhotos?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('socials')}
            className={`pb-3 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'socials'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> Social Bundles
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
          {activeTab === 'about' && (
            <div className="space-y-5">
              {/* Earned Achievement Badges Card */}
              {profileBadgeIds.length > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-900/20 to-cyan-500/10 border border-amber-400/30 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-300 uppercase tracking-wide">
                    <span>Earned Digital Badges</span>
                    <span className="text-zinc-300">{profileBadgeIds.length} Badges</span>
                  </div>
                  <AchievementProfileStrip
                    badgeIds={profileBadgeIds}
                    maxVisible={8}
                    compact={false}
                    ownerName={profile.name}
                  />
                </div>
              )}

              {/* Soulmate Aim Highlight Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-cyan-500/15 border border-pink-500/30 space-y-1.5 relative overflow-hidden">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-pink-300 uppercase tracking-wide">
                  <Target className="w-4 h-4 text-pink-400" />
                  Aim of Soulmate on Twogether
                </div>
                <p className="text-xs sm:text-sm text-zinc-100 font-medium leading-relaxed">
                  {profile.soulmateAim ||
                    'Looking for a genuine, creative partner to build deep emotional connection, share musical vibrations, and travel together.'}
                </p>
              </div>

              {/* Occupation / Work Area */}
              <GlassCard className="p-4 space-y-1.5 border border-white/10">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300 uppercase">
                  <Briefcase className="w-4 h-4 text-cyan-400" />
                  Work Area & Profession
                </div>
                <p className="text-xs text-zinc-200 font-medium">
                  {profile.workArea || 'Digital Creator & Sound Producer'}
                </p>
              </GlassCard>

              {/* Bio & Philosophy */}
              <GlassCard className="p-4 space-y-1.5 border border-white/10">
                <div className="text-xs font-mono font-bold text-purple-300 uppercase">
                  About & Soul Philosophy
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                  {profile.bio || 'Exploring life through art, music, and authentic conversations.'}
                </p>
              </GlassCard>

              {/* Hobbies & Interests */}
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold text-amber-300 uppercase">
                  Hobbies & Favorite Passions
                </div>
                <div className="flex flex-wrap gap-2">
                  {(profile.hobbies || profile.interests || ['Music Production', 'Photography', 'VR Gaming', 'Coffee']).map(
                    (hobby, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-zinc-200 hover:border-amber-400/50 hover:text-amber-200 transition-all"
                      >
                        ⚡ {hobby}
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Music Top Genres & Zodiac */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">Top Music Genres</span>
                  <div className="flex flex-wrap gap-1">
                    {(profile.topGenres || ['Synthwave', 'Ambient']).map((g, i) => (
                      <span key={i} className="text-[11px] text-cyan-300 font-bold">
                        #{g}{i < (profile.topGenres?.length || 1) - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">Zodiac Sign</span>
                  <p className="text-xs text-pink-300 font-bold">{profile.zodiac || 'Scorpio ♏'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gallery' && (
            <div className="space-y-6">
              {/* Photo Gallery Grid */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-bold text-pink-300 uppercase flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-pink-400" /> Photo Showcase
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(
                    profile.galleryPhotos || [
                      profile.avatar,
                      profile.coverImage,
                      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
                      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80',
                    ]
                  ).map((photoUrl, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.03 }}
                      onClick={() => setSelectedPhoto(photoUrl)}
                      className="aspect-square rounded-2xl overflow-hidden border border-white/10 cursor-pointer relative group"
                    >
                      <img src={photoUrl} alt={`Photo ${idx}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                        Preview Photo
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Video Clips Showcase */}
              {profile.galleryVideos && profile.galleryVideos.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-cyan-400" /> Video Clips & Reels
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profile.galleryVideos.map((vid, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveVideo({ url: vid.url, title: vid.title })}
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/40 cursor-pointer flex items-center gap-3 transition-all"
                      >
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-400/30 shrink-0">
                          <Play className="w-5 h-5 fill-cyan-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">{vid.title}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">Duration: {vid.duration}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'socials' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">
                Connect directly across official social media handles & verified platforms:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profile.socialLinks?.instagram && (
                  <a
                    href={
                      profile.socialLinks.instagram.startsWith('http')
                        ? profile.socialLinks.instagram
                        : `https://instagram.com/${profile.socialLinks.instagram.replace('@', '')}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-amber-500/10 border border-pink-500/30 hover:border-pink-400 flex items-center justify-between text-white transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Instagram className="w-5 h-5 text-pink-400" />
                      <div>
                        <p className="text-xs font-bold">Instagram</p>
                        <p className="text-[10px] text-zinc-300 font-mono">
                          {profile.socialLinks.instagram.startsWith('@')
                            ? profile.socialLinks.instagram
                            : profile.socialLinks.instagram.startsWith('http')
                            ? '@' + profile.socialLinks.instagram.split('/').filter(Boolean).pop()
                            : `@${profile.socialLinks.instagram}`}
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-pink-300" />
                  </a>
                )}

                {profile.socialLinks?.tiktok && (
                  <a
                    href={
                      profile.socialLinks.tiktok.startsWith('http')
                        ? profile.socialLinks.tiktok
                        : `https://tiktok.com/@${profile.socialLinks.tiktok.replace('@', '')}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400 flex items-center justify-between text-white transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Film className="w-5 h-5 text-cyan-400" />
                      <div>
                        <p className="text-xs font-bold">TikTok Feed</p>
                        <p className="text-[10px] text-zinc-300 font-mono">
                          {profile.socialLinks.tiktok.startsWith('@')
                            ? profile.socialLinks.tiktok
                            : profile.socialLinks.tiktok.startsWith('http')
                            ? '@' + profile.socialLinks.tiktok.split('/').filter(Boolean).pop()
                            : `@${profile.socialLinks.tiktok}`}
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-cyan-300" />
                  </a>
                )}

                {profile.socialLinks?.spotify && (
                  <a
                    href={profile.socialLinks.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-400 flex items-center justify-between text-white transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Music className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="text-xs font-bold">Spotify Artist / Playlist</p>
                        <p className="text-[10px] text-emerald-300 font-mono">Shared Music & Jam</p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-emerald-300" />
                  </a>
                )}

                {profile.socialLinks?.website && (
                  <a
                    href={profile.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 hover:border-purple-400 flex items-center justify-between text-white transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="text-xs font-bold">Personal Portfolio</p>
                        <p className="text-[10px] text-purple-300 font-mono truncate max-w-[130px] sm:max-w-[180px]">
                          {profile.socialLinks.website}
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-purple-300" />
                  </a>
                )}

                {profile.socialLinks?.youtube && (
                  <a
                    href={profile.socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 hover:border-rose-400 flex items-center justify-between text-white transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Youtube className="w-5 h-5 text-rose-400" />
                      <div>
                        <p className="text-xs font-bold">YouTube Channel</p>
                        <p className="text-[10px] text-rose-300 font-mono">Live Streams & Videos</p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-rose-300" />
                  </a>
                )}

                {profile.socialLinks?.twitter && (
                  <a
                    href={
                      profile.socialLinks.twitter.startsWith('http')
                        ? profile.socialLinks.twitter
                        : `https://x.com/${profile.socialLinks.twitter.replace('@', '')}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 hover:border-blue-400 flex items-center justify-between text-white transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Twitter className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-xs font-bold">X / Twitter</p>
                        <p className="text-[10px] text-blue-300 font-mono">
                          {profile.socialLinks.twitter.startsWith('@')
                            ? profile.socialLinks.twitter
                            : profile.socialLinks.twitter.startsWith('http')
                            ? '@' + profile.socialLinks.twitter.split('/').filter(Boolean).pop()
                            : `@${profile.socialLinks.twitter}`}
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-blue-300" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Photo Lightbox Popup */}
        <AnimatePresence>
          {selectedPhoto && (
            <div
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 cursor-pointer"
              onClick={() => setSelectedPhoto(null)}
            >
              <motion.img
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                src={selectedPhoto}
                alt="Enlarged"
                className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/20"
              />
            </div>
          )}
        </AnimatePresence>

        {/* Video Player Modal */}
        <AnimatePresence>
          {activeVideo && (
            <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="w-full max-w-lg bg-black border border-cyan-400/40 rounded-3xl overflow-hidden p-4 space-y-3 relative"
              >
                <div className="flex items-center justify-between text-white">
                  <h4 className="text-xs font-bold truncate">{activeVideo.title}</h4>
                  <button onClick={() => setActiveVideo(null)} className="p-1 rounded-full bg-white/10 hover:bg-white/20">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <video src={activeVideo.url} controls autoPlay className="w-full rounded-2xl aspect-video bg-black" />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>

    {/* GPS Location Verification Modal */}
    <GpsLocationVerificationModal
      soulmate={profile}
      isOpen={isGpsModalOpen}
      onClose={() => setIsGpsModalOpen(false)}
    />
    </>
  );
};
