import React, { useState, useEffect } from 'react';
import {
  Crown,
  Star,
  Sparkles,
  CheckCircle2,
  Heart,
  Zap,
  Eye,
  Trophy,
  ChevronRight,
  Lock,
  MessageCircle,
  Phone,
  Camera,
  Check,
  ShieldCheck,
  Bell,
  BellOff,
  Music,
} from 'lucide-react';
import { motion } from 'motion/react';
import { GlassCard } from './GlassCard';
import { BASIC_LIMITS, VIP_PRICING } from '../data/subscriptionData';
import { ActiveSubscriptionRecord } from '../types';
import { appSoundService } from '../services/appSoundService';
import { GoogleGIcon, GooglePayLogo } from './GooglePayComponents';

interface VIPDashboardScreenProps {
  onOpenSingleSouls: () => void;
  isVip?: boolean;
  activeSubscription?: ActiveSubscriptionRecord | null;
  postsUsed?: number;
  chatsUsed?: number;
  callsUsed?: number;
  onOpenUpgradeModal?: () => void;
  onToggleVip?: () => void;
  onOpenAdminBillingPortal?: () => void;
  isAppOwner?: boolean;
  onAuthenticateOwner?: () => void;
  onOpenAdsCenter?: () => void;
}

export const VIPDashboardScreen: React.FC<VIPDashboardScreenProps> = ({
  onOpenSingleSouls,
  isVip = false,
  activeSubscription,
  postsUsed = 0,
  chatsUsed = 0,
  callsUsed = 0,
  onOpenUpgradeModal,
  onToggleVip,
  onOpenAdminBillingPortal,
  isAppOwner = false,
  onAuthenticateOwner,
  onOpenAdsCenter,
}) => {
  const [isPopupMuted, setIsPopupMuted] = useState<boolean>(() =>
    appSoundService.getIsPopupSoundMuted()
  );

  useEffect(() => {
    return appSoundService.subscribe((muted) => setIsPopupMuted(muted));
  }, []);
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Ads Center & 5-Minute Ad Monetization Portal Card — Strictly Owner Only */}
      {isAppOwner && onOpenAdsCenter && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-cyan-900/30 to-black border border-emerald-400/40 flex items-center justify-between text-left shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-400 text-black flex items-center justify-center font-black">
              📺
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-300 uppercase font-mono flex items-center gap-1.5">
                Owner Ads Center & Monetization
                <span className="px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300 text-[9px]">LIVE EARNINGS</span>
              </p>
              <p className="text-[10px] text-zinc-300">
                5-Min Pop-Up Ads Revenue & $3.89/mo escape subscriptions with instant M-Pesa payouts
              </p>
            </div>
          </div>
          <button
            onClick={onOpenAdsCenter}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1 cursor-pointer"
          >
            Open Ads Center →
          </button>
        </div>
      )}
      {/* Shadow Admin Revenue Portal Gateway Card — Strictly hidden from regular users, only visible to App Owner */}
      {isAppOwner && onOpenAdminBillingPortal && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-purple-900/30 to-black border border-amber-400/40 flex items-center justify-between text-left shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black">
              👑
            </div>
            <div>
              <p className="text-xs font-bold text-amber-200 uppercase font-mono flex items-center gap-1.5">
                Shadow Admin Revenue Portal
                <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[9px]">OWNER ACTIVE</span>
              </p>
              <p className="text-[10px] text-zinc-300">View received user subscription funds & manage Google Billing payout accounts</p>
            </div>
          </div>
          <button
            onClick={onOpenAdminBillingPortal}
            className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-black font-extrabold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1"
          >
            Open Revenue Portal →
          </button>
        </div>
      )}

      {/* Golden Crown VIP Banner Card */}
      <GlassCard className="p-6 relative overflow-hidden border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-purple-900/20 to-black/60" glowColor="amber">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Crown className="w-48 h-48 text-amber-400" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold">
              <Crown className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
              {isVip ? 'PREMIUM VIP MEMBER' : 'BASIC TIER ACTIVE'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Your Twogether Subscription</h1>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-lg">
              {isVip
                ? 'Enjoy unlimited free posts, text chats, voice & video calls, and all cool chat wallpapers!'
                : 'Free tier includes quota limits: 5 posts per 3 weeks, 10 chats per 3 weeks, 3 calls per 3 weeks, & 3 free wallpapers.'}
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 bg-black/60 border border-amber-400/30 p-4 rounded-2xl backdrop-blur-xl w-full sm:w-auto">
            <div className="flex items-center gap-1 text-amber-300">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-[11px] font-mono font-bold text-amber-200">
              {isVip ? 'VIP ACTIVE ($1.00/day, $3.50/wk, $14.50/mo)' : 'BASIC (FREE)'}
            </span>

            <button
              onClick={onOpenUpgradeModal}
              className="mt-1 w-full px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 text-black font-extrabold text-xs shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5 fill-black" />
              {isVip ? 'Manage VIP Membership' : 'Upgrade to VIP (From $1.00)'}
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Active Approved Subscription Card (Google Pay) */}
      {activeSubscription && (
        <div className="p-4 rounded-2xl bg-black/80 border-2 border-emerald-500/50 shadow-xl text-left space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center p-1.5 shadow-md shrink-0">
                <GoogleGIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{activeSubscription.planName}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/40">
                    APPROVED & ACTIVE
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  Google Play Order ID: <strong className="text-zinc-200">{activeSubscription.googleOrderId}</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={onOpenUpgradeModal}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono text-zinc-200 border border-white/20 transition-all cursor-pointer"
              >
                Change / Renew Plan
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-zinc-500 text-[10px] block">PAYMENT METHOD</span>
              <span className="text-emerald-400 font-bold text-[11px]">Google Pay (Play Billing)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-zinc-500 text-[10px] block">DURATION</span>
              <span className="text-white font-bold text-[11px]">{activeSubscription.durationLabel}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-zinc-500 text-[10px] block">ACTIVATED AT</span>
              <span className="text-zinc-300 font-bold text-[11px]">{activeSubscription.activatedAt}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-zinc-500 text-[10px] block">REMAINING DAYS</span>
              <span className="text-amber-400 font-bold text-[11px]">
                {Math.max(0, Math.ceil((activeSubscription.expiresAtMs - Date.now()) / (1000 * 60 * 60 * 24)))} Days Left
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Independent Audio Settings: Mute Pop-up Sounds while keeping music uninterrupted */}
      <GlassCard className="p-4 border border-purple-500/30 text-left bg-gradient-to-r from-purple-950/30 via-black to-black shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                isPopupMuted
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                  : 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400'
              }`}
            >
              {isPopupMuted ? (
                <BellOff className="w-5 h-5 text-amber-400" />
              ) : (
                <Bell className="w-5 h-5 text-cyan-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-extrabold text-white">
                  Mute Pop-Up Sounds
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold border ${
                    isPopupMuted
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                  }`}
                >
                  {isPopupMuted ? '🔕 POP-UPS MUTED' : '🔔 POP-UPS ACTIVE'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 mt-0.5">
                Mute unprompted sounds (ad chimes, notifications, and alert pops) while your selected love songs & background music continue playing uninterrupted.
              </p>
            </div>
          </div>

          <button
            onClick={() => appSoundService.togglePopupSoundMuted()}
            className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              isPopupMuted
                ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
            }`}
          >
            {isPopupMuted ? (
              <>
                <BellOff className="w-4 h-4 fill-black" />
                <span>Pop-ups Muted (Click to Unmute)</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                <span>Mute Pop-up Sounds</span>
              </>
            )}
          </button>
        </div>
      </GlassCard>

      {/* Plan Quota Usage Trackers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
        {/* Posts Quota */}
        <GlassCard className="p-4 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-cyan-300 font-bold flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-cyan-400" /> Feed Posts
            </span>
            <span className={isVip ? 'text-amber-300 font-extrabold' : 'text-zinc-300 font-bold'}>
              {isVip ? 'UNLIMITED' : `${postsUsed} / ${BASIC_LIMITS.posts.max}`}
            </span>
          </div>
          <p className="text-[10px] text-zinc-400">
            {isVip ? 'Post unlimited videos & photos freely.' : `Basic limit: ${BASIC_LIMITS.posts.max} posts per 3 weeks (${BASIC_LIMITS.posts.days} days).`}
          </p>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full ${isVip ? 'bg-amber-400 w-full' : 'bg-cyan-400'}`}
              style={{ width: isVip ? '100%' : `${Math.min(100, (postsUsed / BASIC_LIMITS.posts.max) * 100)}%` }}
            />
          </div>
        </GlassCard>

        {/* Chats Quota */}
        <GlassCard className="p-4 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-pink-300 font-bold flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-pink-400" /> Text Chats
            </span>
            <span className={isVip ? 'text-amber-300 font-extrabold' : 'text-zinc-300 font-bold'}>
              {isVip ? 'UNLIMITED' : `${chatsUsed} / ${BASIC_LIMITS.chats.max}`}
            </span>
          </div>
          <p className="text-[10px] text-zinc-400">
            {isVip ? 'Chat with all single soulmates freely.' : `Basic limit: ${BASIC_LIMITS.chats.max} chats per 3 weeks (${BASIC_LIMITS.chats.days} days).`}
          </p>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full ${isVip ? 'bg-amber-400 w-full' : 'bg-pink-400'}`}
              style={{ width: isVip ? '100%' : `${Math.min(100, (chatsUsed / BASIC_LIMITS.chats.max) * 100)}%` }}
            />
          </div>
        </GlassCard>

        {/* Voice & Video Calls Quota */}
        <GlassCard className="p-4 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-purple-300 font-bold flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-purple-400" /> Voice & Video
            </span>
            <span className={isVip ? 'text-amber-300 font-extrabold' : 'text-zinc-300 font-bold'}>
              {isVip ? 'UNLIMITED' : `${callsUsed} / ${BASIC_LIMITS.calls.max}`}
            </span>
          </div>
          <p className="text-[10px] text-zinc-400">
            {isVip ? 'Unlimited high-fidelity calls.' : `Basic limit: ${BASIC_LIMITS.calls.max} calls per 3 weeks (${BASIC_LIMITS.calls.days} days).`}
          </p>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full ${isVip ? 'bg-amber-400 w-full' : 'bg-purple-400'}`}
              style={{ width: isVip ? '100%' : `${Math.min(100, (callsUsed / BASIC_LIMITS.calls.max) * 100)}%` }}
            />
          </div>
        </GlassCard>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Profile Views', value: '1,280', icon: Eye, color: 'text-cyan-400' },
          { label: 'Soul Matches', value: '98%', icon: Heart, color: 'text-pink-400' },
          { label: 'Reels Likes', value: '4,520', icon: Zap, color: 'text-amber-400' },
          { label: '100% Badge Status', value: 'VERIFIED ✓', icon: CheckCircle2, color: 'text-blue-400' },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={idx} className="p-3.5 text-left border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-zinc-400 font-mono uppercase">{stat.label}</span>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-lg font-extrabold text-white">{stat.value}</p>
            </GlassCard>
          );
        })}
      </div>

      {/* Priority Matches for VIP */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-left">
          <div>
            <h2 className="text-lg font-bold text-white">VIP Priority Matches</h2>
            <p className="text-xs text-zinc-400">High compatibility 100% verified single souls ready to connect</p>
          </div>
          <button
            onClick={onOpenSingleSouls}
            className="text-xs text-cyan-300 font-bold hover:underline flex items-center gap-1"
          >
            See All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { name: 'Aria Sterling', age: 24, match: '99%', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', badge: 'VR Lounge Host' },
            { name: 'Maya Lin', age: 22, match: '96%', img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80', badge: 'Cyber Producer' },
            { name: 'Zephyrine Chen', age: 25, match: '94%', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80', badge: '3D Artist' },
          ].map((item, idx) => (
            <GlassCard key={idx} className="p-3 text-left flex items-center gap-3 border border-white/10 group hover:border-amber-400/50 transition-all">
              <img src={item.img} alt={item.name} className="w-14 h-14 rounded-xl object-cover border border-amber-400/40" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white truncate flex items-center gap-1">
                    {item.name}, {item.age}
                    <CheckCircle2 className="w-3.5 h-3.5 fill-blue-500 text-white" />
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-pink-400">{item.match}</span>
                </div>
                <p className="text-[10px] text-zinc-400 truncate">{item.badge}</p>
                <button
                  onClick={onOpenSingleSouls}
                  className="mt-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold hover:bg-amber-500/30"
                >
                  Connect VIP
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
};

