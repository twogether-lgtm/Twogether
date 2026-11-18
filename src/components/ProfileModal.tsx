import React, { useState } from 'react';
import {
  X,
  Camera,
  Mic,
  Video,
  Sparkles,
  User,
  Crown,
  ExternalLink,
  ShieldCheck,
  Zap,
  Image as ImageIcon,
  MessageSquare,
  Phone,
  Flame,
  CheckCircle2,
  Edit3,
  Save,
  Briefcase,
  Target,
  MapPin,
  Heart,
  Globe,
  Instagram,
  Music,
  Film,
  Twitter,
  Youtube,
  Plus,
  Trash2,
  Gift,
  Lock,
  LogOut,
  KeyRound,
  Award,
} from 'lucide-react';
import { motion } from 'motion/react';
import { GlassCard } from './GlassCard';
import { VerificationBadge } from './VerificationBadge';
import { ProfilePortalModal } from './ProfilePortalModal';
import { AchievementProfileStrip, AchievementShowcasePanel } from './AchievementBadges';
import { useAchievements } from '../services/achievementService';
import { SoulProfile, SocialLinks } from '../types';
import { syncUserProfileWithGuardian } from '../services/aiGuardianService';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  isVerified: boolean;
  onStartVerification: () => void;
  isVip?: boolean;
  onOpenUpgradeModal?: (reason?: string) => void;
  postsUsed?: number;
  maxPostsBasic?: number;
  postsDaysInterval?: number;
  chatsUsed?: number;
  maxChatsBasic?: number;
  chatsDaysInterval?: number;
  callsUsed?: number;
  maxCallsBasic?: number;
  callsDaysInterval?: number;
  onOpenWallpaperModal?: () => void;
  onOpenAdminBillingPortal?: () => void;
  giftsBalance?: number;
  onOpenGiftStore?: () => void;
  isAppOwner?: boolean;
  onOpenIntroModal?: () => void;
  onLogout?: () => void;
  onOpenAuthModal?: (mode?: 'login' | 'register' | 'forgot_password') => void;
  userId?: string;
  userEmail?: string;
  onReportViolation?: (strike: { type: 'message' | 'post'; reason: string; snippet?: string }) => void;
  initialTab?: 'quotas' | 'achievements' | 'edit';
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  isVerified,
  onStartVerification,
  isVip = false,
  onOpenUpgradeModal,
  postsUsed = 1,
  maxPostsBasic = 5,
  postsDaysInterval = 21,
  chatsUsed = 2,
  maxChatsBasic = 10,
  chatsDaysInterval = 21,
  callsUsed = 1,
  maxCallsBasic = 3,
  callsDaysInterval = 21,
  onOpenWallpaperModal,
  onOpenAdminBillingPortal,
  giftsBalance = 50,
  onOpenGiftStore,
  isAppOwner = false,
  onOpenIntroModal,
  onLogout,
  onOpenAuthModal,
  userId = 'usr_verified_1',
  userEmail = 'dylan.wisney@gmail.com',
  onReportViolation,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<'quotas' | 'achievements' | 'edit'>(initialTab || 'quotas');
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const { earnedIds, unlockedCount, totalCount } = useAchievements();

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Editable Profile State
  const [name, setName] = useState('Alex Chen');
  const [age, setAge] = useState(25);
  const [tagline, setTagline] = useState('Audio engineer, generative artist & ambient lo-fi lover 🎧');
  const [bio, setBio] = useState('Pioneering spatial soundscapes and neural art. Verified on Twogether to meet inspiring souls and co-create live music tracks.');
  const [location, setLocation] = useState('London / Neo-Tokyo');
  const [workArea, setWorkArea] = useState('Senior Spatial Audio Engineer @ Twogether Studio');
  const [soulmateAim, setSoulmateAim] = useState('Find a genuine soulmate to share deep conversations, co-create music in the Beats room, and go to live ambient concerts.');
  const [hobbies, setHobbies] = useState<string[]>([
    'Synth Production',
    '3D Graphics',
    'Vinyl Scanning',
    'Coffee Roasting',
    'VR Gaming',
  ]);
  const [newHobby, setNewHobby] = useState('');

  const [socials, setSocials] = useState<SocialLinks>({
    instagram: 'alex_twogether',
    tiktok: 'alex_twogether',
    spotify: 'https://open.spotify.com/artist/alextwogether',
    twitter: 'alex_twogether',
    youtube: 'https://youtube.com/@alex_twogether',
    website: 'https://alextwogether.design',
  });

  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  if (!isOpen) return null;

  const handleAddHobby = () => {
    if (newHobby.trim() && !hobbies.includes(newHobby.trim())) {
      setHobbies([...hobbies, newHobby.trim()]);
      setNewHobby('');
    }
  };

  const handleRemoveHobby = (hobbyToRemove: string) => {
    setHobbies(hobbies.filter((h) => h !== hobbyToRemove));
  };

  const handleSaveProfile = async () => {
    setProfileSaveError(null);
    setIsSavingProfile(true);
    const res = await syncUserProfileWithGuardian({
      id: userId,
      name,
      email: userEmail,
      age,
      location,
      tagline,
      bio,
      tier: isVip ? 'vip' : 'basic',
      isVerified,
      actionLabel: 'profile_update',
    });
    setIsSavingProfile(false);

    if (res.isViolating) {
      const reason =
        res.reason ||
        'Profile edit blocked by AI Guardian: zero discrimination, illegal business, scams, or harm allowed.';
      setProfileSaveError(reason);
      if (onReportViolation) {
        onReportViolation({
          type: 'post',
          reason,
          snippet: `${tagline} | ${bio}`.slice(0, 80),
        });
      }
      return;
    }

    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2500);
  };

  const userProfile: SoulProfile = {
    id: 'user_me',
    name,
    age,
    tagline,
    bio,
    location,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    coverImage: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80',
    matchScore: 100,
    isSoulVerified: isVerified,
    tier: isVip ? 'vip' : 'basic',
    badges: earnedIds,
    soulmateAim,
    workArea,
    hobbies,
    galleryPhotos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    ],
    socialLinks: socials,
    topGenres: ['Ambient Lofi', 'Synthwave', 'Deep House'],
    zodiac: 'Scorpio ♏',
    interests: hobbies,
    distanceKm: 0,
    isOnline: true,
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl overflow-y-auto">
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 10 }}
          className="w-full max-w-xl bg-[#141221] border border-white/20 rounded-3xl overflow-hidden shadow-2xl p-5 sm:p-6 relative text-left my-auto max-h-[92vh] flex flex-col space-y-4"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-white/10 rounded-full z-10 transition-transform hover:scale-110"
          >
            <X className="w-5 h-5" />
          </button>

          {/* User Avatar & Header */}
          <div className="text-center space-y-2 pt-1 shrink-0">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-2xl p-1 bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 shadow-2xl overflow-hidden">
              <img
                src={userProfile.avatar}
                alt="My Avatar"
                className="w-full h-full object-cover rounded-xl"
              />
              <div className="absolute bottom-1 right-1">
                <VerificationBadge tier={isVip ? 'vip' : 'basic'} isVerified={isVerified} size="md" />
              </div>
            </div>

            <div className="space-y-0.5">
              <h2 className="text-xl font-black text-white flex items-center justify-center gap-2">
                {name}, {age}
                <VerificationBadge tier={isVip ? 'vip' : 'basic'} isVerified={isVerified} size="lg" showLabel />
              </h2>
              <p className="text-xs text-cyan-300 font-mono font-bold">@{socials.instagram || 'alex_twogether'}</p>
              {earnedIds.length > 0 && (
                <div className="flex justify-center pt-1">
                  <AchievementProfileStrip badgeIds={earnedIds} maxVisible={4} compact ownerName={name} />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                onClick={() => setIsPortalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-xs font-mono font-bold hover:bg-cyan-500/30 transition-all shadow-md hover:scale-105 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" /> View Public Soulmate Portal <ExternalLink className="w-3 h-3" />
              </button>

              {onOpenAdminBillingPortal && isAppOwner && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAdminBillingPortal();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-400 text-black border border-amber-300 text-xs font-mono font-black hover:bg-amber-300 transition-all shadow-md hover:scale-105 cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 fill-black" /> Shadow Admin Revenue Portal
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs between Quotas, Achievements, and Profile Editor */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 border-b border-white/10 pb-2 shrink-0 text-xs font-mono flex-wrap">
            <button
              onClick={() => setActiveTab('quotas')}
              className={`px-3 sm:px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'quotas'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" /> Usage & Status
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`px-3 sm:px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'achievements'
                  ? 'bg-gradient-to-r from-amber-400 to-pink-500 text-black font-black shadow-lg'
                  : 'bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <Award className={`w-3.5 h-3.5 ${activeTab === 'achievements' ? 'text-black' : 'text-amber-300'}`} />
              <span>Badges ({unlockedCount}/{totalCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3 sm:px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'edit'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                  : 'bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-cyan-300" /> Edit Profile
            </button>
          </div>

          {/* Scrollable Content Area */}
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            {activeTab === 'quotas' && (
              <div className="space-y-3">
                {/* VIP Status & Upgrade Box */}
                <GlassCard className="p-4 border border-amber-400/40 relative overflow-hidden" glowColor={isVip ? 'amber' : 'pink'}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-2xl ${isVip ? 'bg-amber-400/20 text-amber-300' : 'bg-pink-500/20 text-pink-300'} border border-amber-400/30`}>
                        <Crown className="w-6 h-6 fill-amber-300" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Membership Plan</span>
                        <p className={`text-sm font-black ${isVip ? 'text-amber-300' : 'text-white'}`}>
                          {isVip ? 'VIP Gold Unlimited ($1.00/day, $3.50/wk, $14.50/mo)' : 'Basic Free Tier'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onClose();
                        if (onOpenUpgradeModal) onOpenUpgradeModal('Manage VIP Subscription');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-pink-500 text-black text-xs font-extrabold shadow-lg hover:scale-105 transition-all"
                    >
                      {isVip ? 'VIP Active' : '✨ Upgrade VIP'}
                    </button>
                  </div>
                </GlassCard>

                {/* Verification Credentials & Biometrics Scan Box */}
                <GlassCard className="p-4 border border-blue-400/40" glowColor="cyan">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <VerificationBadge tier={isVip ? 'vip' : 'basic'} isVerified={isVerified} size="lg" />
                      <div>
                        <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Biometric Credentials</span>
                        <p className={`text-xs font-extrabold ${isVerified ? 'text-blue-400' : 'text-amber-400'}`}>
                          {isVerified ? '100% BLUE CHECKMARK VERIFIED' : 'UNVERIFIED — 100% SCAN REQUIRED'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onClose();
                        onStartVerification();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-mono font-bold text-white transition-all"
                    >
                      {isVerified ? 'Re-Scan 3D' : 'Verify Now'}
                    </button>
                  </div>

                  {/* Checkpoints List */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg text-zinc-300">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Camera className="w-3.5 h-3.5 text-cyan-400" /> 3D Spatial Facial Depth
                      </span>
                      <span className={isVerified ? 'text-emerald-400 font-bold font-mono text-[11px]' : 'text-zinc-500 font-mono text-[11px]'}>
                        {isVerified ? '648 Landmarks' : 'Unverified'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg text-zinc-300">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Mic className="w-3.5 h-3.5 text-purple-400" /> Acoustic Voice Print
                      </span>
                      <span className={isVerified ? 'text-emerald-400 font-bold font-mono text-[11px]' : 'text-zinc-500 font-mono text-[11px]'}>
                        {isVerified ? 'Harmonics Matched' : 'Unverified'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg text-zinc-300">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Video className="w-3.5 h-3.5 text-pink-400" /> Micro-Gesture Liveness
                      </span>
                      <span className={isVerified ? 'text-emerald-400 font-bold font-mono text-[11px]' : 'text-zinc-500 font-mono text-[11px]'}>
                        {isVerified ? 'Anti-Spoof Cleared' : 'Unverified'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-cyan-950/35 border border-cyan-400/25 p-2 rounded-lg text-cyan-200">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Lock className="w-3.5 h-3.5 text-cyan-300" /> Approval Document Vault
                      </span>
                      <span className="text-emerald-300 font-bold font-mono text-[10px]">
                        {isVerified ? '🔒 Sealed & Hidden (Users & Admin Blocked)' : 'Pending 18+ Check'}
                      </span>
                    </div>
                  </div>
                </GlassCard>

                {/* Gifts Wallet & Feature Store Card */}
                <GlassCard className="p-4 border border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-purple-900/20 to-black text-left flex flex-col sm:flex-row items-center justify-between gap-3" glowColor="amber">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center font-extrabold shadow-lg shadow-amber-500/20 flex-shrink-0">
                      <Gift className="w-6 h-6 fill-black" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-200 font-mono">
                          MY GIFTS WALLET
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black font-extrabold text-[9px] uppercase">
                          NON-REDEEMABLE
                        </span>
                      </div>
                      <p className="text-sm font-mono font-extrabold text-white mt-0.5">
                        🎁 {giftsBalance.toLocaleString()} Gifts Balance
                      </p>
                      <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                        Gifts are strictly in-app tokens to buy exclusive features or gift single souls!
                      </p>
                    </div>
                  </div>

                  {onOpenGiftStore && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenGiftStore();
                      }}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-extrabold text-xs shadow-md shadow-amber-500/20 hover:scale-105 transition-all flex items-center justify-center gap-1.5 flex-shrink-0"
                    >
                      <Gift className="w-3.5 h-3.5 fill-black" /> Gift Store & Features
                    </button>
                  )}
                </GlassCard>

                {/* Quotas & Daily Usage Tracking Staffs */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-300 uppercase font-bold flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      My Usage & Quota Staffs (Private to You):
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      Auto-Reset Cycles
                    </span>
                  </div>

                  {/* Post Quota */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-zinc-300 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-pink-400" /> Reels / Posts Created
                      </span>
                      <span className={isVip ? 'text-amber-300 font-bold' : 'text-cyan-300 font-bold'}>
                        {isVip ? `${postsUsed} (UNLIMITED)` : `${postsUsed} / ${maxPostsBasic} per 3 weeks (${postsDaysInterval}d)`}
                      </span>
                    </div>
                    {!isVip && (
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                          style={{ width: `${Math.min(100, (postsUsed / maxPostsBasic) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Chat Quota */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-zinc-300 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-cyan-400" /> AI Matches Chatted
                      </span>
                      <span className={isVip ? 'text-amber-300 font-bold' : 'text-cyan-300 font-bold'}>
                        {isVip ? `${chatsUsed} (UNLIMITED)` : `${chatsUsed} / ${maxChatsBasic} per 3 weeks (${chatsDaysInterval}d)`}
                      </span>
                    </div>
                    {!isVip && (
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                          style={{ width: `${Math.min(100, (chatsUsed / maxChatsBasic) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Calls Quota */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-zinc-300 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-purple-400" /> Voice & Video Calls
                      </span>
                      <span className={isVip ? 'text-amber-300 font-bold' : 'text-cyan-300 font-bold'}>
                        {isVip ? `${callsUsed} (UNLIMITED)` : `${callsUsed} / ${maxCallsBasic} per 3 weeks (${callsDaysInterval}d)`}
                      </span>
                    </div>
                    {!isVip && (
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-amber-400 rounded-full"
                          style={{ width: `${Math.min(100, (callsUsed / maxCallsBasic) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Chat Wallpaper Customizer Button */}
                {onOpenWallpaperModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenWallpaperModal();
                    }}
                    className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 border border-purple-400/30 hover:border-purple-300 flex items-center justify-between text-xs font-bold text-white transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <ImageIcon className="w-4 h-4 text-pink-400" />
                      <span>Customize Chat Wallpapers & Themes</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-cyan-300" />
                  </button>
                )}

                {/* Watch Opening Intro Clip Button */}
                {onOpenIntroModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenIntroModal();
                    }}
                    className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 border border-pink-400/30 hover:border-pink-300 flex items-center justify-between text-xs font-bold text-white transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Film className="w-4 h-4 text-pink-400" />
                      <span>Watch Cinematic Opening Intro Clip</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-cyan-300" />
                  </button>
                )}

                {/* Account Security, Passcode & Recovery Button */}
                {onOpenAuthModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAuthModal('forgot_password');
                    }}
                    className="w-full p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/40 flex items-center justify-between text-xs font-bold text-zinc-200 hover:text-white transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <KeyRound className="w-4 h-4 text-cyan-400" />
                      <span>Security Passcode & Recovery Questions</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-cyan-300" />
                  </button>
                )}

                {/* Official Logout Button */}
                {onLogout && (
                  <button
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                    className="w-full p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 hover:border-rose-400 hover:bg-rose-500/20 flex items-center justify-between text-xs font-bold text-rose-300 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <LogOut className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
                      <span>Log Out of Twogether Account</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-80">Switch Member</span>
                  </button>
                )}
              </div>
            )}

            {activeTab === 'achievements' && (
              <AchievementShowcasePanel />
            )}

            {activeTab === 'edit' && (
              <div className="space-y-4 text-xs font-mono">
                {/* Basic Details */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-zinc-400 font-bold block">Display Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium focus:border-cyan-400 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-bold block">Age</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium focus:border-cyan-400 outline-none"
                    />
                  </div>
                </div>

                {/* Tagline */}
                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold block">Tagline / Sound Quote</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium focus:border-cyan-400 outline-none"
                    placeholder="e.g., Audio engineer & lo-fi producer 🎧"
                  />
                </div>

                {/* Location & Work Area */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-bold flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-pink-400" /> Location / City
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium focus:border-cyan-400 outline-none"
                      placeholder="e.g., London / Neo-Tokyo"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-bold flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-cyan-400" /> Profession / Work
                    </label>
                    <input
                      type="text"
                      value={workArea}
                      onChange={(e) => setWorkArea(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium focus:border-cyan-400 outline-none"
                      placeholder="e.g., Spatial Audio Engineer"
                    />
                  </div>
                </div>

                {/* Main Aim on App */}
                <div className="space-y-1">
                  <label className="text-pink-300 font-bold flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-pink-400" /> Main Aim on Twogether App
                  </label>
                  <textarea
                    rows={2}
                    value={soulmateAim}
                    onChange={(e) => setSoulmateAim(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-sans text-xs focus:border-pink-400 outline-none"
                    placeholder="What are you primarily looking for on this platform?"
                  />
                </div>

                {/* Bio */}
                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold block">Soul Bio & Philosophy</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-sans text-xs focus:border-cyan-400 outline-none"
                    placeholder="Write a few paragraphs describing yourself..."
                  />
                </div>

                {/* Hobbies & Passions */}
                <div className="space-y-2">
                  <label className="text-amber-300 font-bold block">Hobbies & Passions</label>
                  <div className="flex flex-wrap gap-2">
                    {hobbies.map((hobby, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-zinc-200 flex items-center gap-1 text-[11px]"
                      >
                        ⚡ {hobby}
                        <button
                          onClick={() => handleRemoveHobby(hobby)}
                          className="hover:text-rose-400 transition-colors ml-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={newHobby}
                      onChange={(e) => setNewHobby(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddHobby()}
                      placeholder="Add a hobby or passion..."
                      className="flex-1 p-2 rounded-xl bg-white/5 border border-white/10 text-white font-sans text-xs outline-none focus:border-amber-400"
                    />
                    <button
                      onClick={handleAddHobby}
                      className="px-3 py-2 rounded-xl bg-amber-400 text-black font-extrabold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>

                {/* Social Media Handles */}
                <div className="space-y-3 pt-2">
                  <label className="text-purple-300 font-bold flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-purple-400" /> Social Media Handles & Links
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-zinc-400 text-[10px] flex items-center gap-1">
                        <Instagram className="w-3 h-3 text-pink-400" /> Instagram Username
                      </span>
                      <input
                        type="text"
                        value={socials.instagram || ''}
                        onChange={(e) => setSocials({ ...socials, instagram: e.target.value })}
                        className="w-full p-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-pink-400"
                        placeholder="e.g., alex_twogether"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-400 text-[10px] flex items-center gap-1">
                        <Film className="w-3 h-3 text-cyan-400" /> TikTok Username
                      </span>
                      <input
                        type="text"
                        value={socials.tiktok || ''}
                        onChange={(e) => setSocials({ ...socials, tiktok: e.target.value })}
                        className="w-full p-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-cyan-400"
                        placeholder="e.g., alex_twogether"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-400 text-[10px] flex items-center gap-1">
                        <Music className="w-3 h-3 text-emerald-400" /> Spotify Link
                      </span>
                      <input
                        type="text"
                        value={socials.spotify || ''}
                        onChange={(e) => setSocials({ ...socials, spotify: e.target.value })}
                        className="w-full p-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-emerald-400"
                        placeholder="https://open.spotify.com/..."
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-400 text-[10px] flex items-center gap-1">
                        <Twitter className="w-3 h-3 text-blue-400" /> Twitter / X Handle
                      </span>
                      <input
                        type="text"
                        value={socials.twitter || ''}
                        onChange={(e) => setSocials({ ...socials, twitter: e.target.value })}
                        className="w-full p-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-blue-400"
                        placeholder="e.g., alex_twogether"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-400 text-[10px] flex items-center gap-1">
                        <Youtube className="w-3 h-3 text-rose-500" /> YouTube Channel Link
                      </span>
                      <input
                        type="text"
                        value={socials.youtube || ''}
                        onChange={(e) => setSocials({ ...socials, youtube: e.target.value })}
                        className="w-full p-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-rose-400"
                        placeholder="https://youtube.com/@..."
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-400 text-[10px] flex items-center gap-1">
                        <Globe className="w-3 h-3 text-amber-400" /> Personal Website
                      </span>
                      <input
                        type="text"
                        value={socials.website || ''}
                        onChange={(e) => setSocials({ ...socials, website: e.target.value })}
                        className="w-full p-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-amber-400"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-2 space-y-2">
                  {profileSaveError && (
                    <p className="text-xs text-rose-300 bg-rose-500/20 border border-rose-500/40 rounded-xl p-2.5 font-mono">
                      🛡️ {profileSaveError}
                    </p>
                  )}

                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 hover:scale-[1.02] transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 text-black" />
                    {isSavingProfile ? 'AI Guardian Auditing Changes...' : 'Save & Update Soulmate Profile'}
                  </button>

                  {isSavedNotice && (
                    <p className="text-xs text-emerald-400 font-bold text-center mt-2 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Profile updated &amp; cleared by Good Vybes AI Guardian!
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-white/10 border border-white/15 text-white font-bold text-xs hover:bg-white/15 transition-all shrink-0"
          >
            Close Profile Portal
          </button>
        </motion.div>
      </div>

      {/* Full Profile Portal Modal for Current User */}
      <ProfilePortalModal
        profile={userProfile}
        isOpen={isPortalOpen}
        onClose={() => setIsPortalOpen(false)}
        isCurrentUser={true}
      />
    </>
  );
};



