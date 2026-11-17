import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  X,
  Music,
  Sparkles,
  Users,
  Radio,
  Globe,
  Smartphone,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  SharePayload,
  isBrowserShareSupported,
  executeBrowserShare,
  getPlatformShareUrl,
} from '../services/shareService';
import { VerificationBadge } from './VerificationBadge';
import { AmbientOnlineAvatar } from './AmbientOnlineAvatar';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: SharePayload | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  payload,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  if (!isOpen || !payload) return null;

  const hasNativeShare = isBrowserShareSupported();

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(payload.url);
      } else {
        // Fallback for older environments
        const textArea = document.createElement('textarea');
        textArea.value = payload.url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setCopied(true);
      setShareFeedback('Link copied to clipboard!');
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#ec4899', '#a855f7'],
        });
      } catch {}
      setTimeout(() => setCopied(false), 2500);
      setTimeout(() => setShareFeedback(null), 3000);
    } catch {
      setShareFeedback('Failed to copy. Please manually select the URL.');
    }
  };

  const handleNativeShare = async () => {
    const res = await executeBrowserShare(payload);
    if (res.success) {
      setShareFeedback('Shared successfully via browser share!');
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.5 },
          colors: ['#34D399', '#38BDF8', '#F472B6'],
        });
      } catch {}
      setTimeout(() => {
        setShareFeedback(null);
        onClose();
      }, 1500);
    } else if (res.canceled) {
      setShareFeedback('Share dialog closed.');
      setTimeout(() => setShareFeedback(null), 2000);
    } else {
      setShareFeedback('Native share unavailable. Use direct options below.');
    }
  };

  const handleOpenPlatform = (platform: 'whatsapp' | 'twitter' | 'telegram' | 'facebook' | 'email' | 'sms') => {
    const targetUrl = getPlatformShareUrl(platform, payload);
    try {
      const anchor = document.createElement('a');
      anchor.href = targetUrl;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setShareFeedback(`Opening ${platform} share...`);
      setTimeout(() => setShareFeedback(null), 2500);
    } catch {
      handleCopyLink();
    }
  };

  const isProfile = payload.type === 'profile' && !!payload.profile;
  const isJam = payload.type === 'jam_session' && !!payload.jamSession;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl overflow-y-auto">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        className="w-full max-w-lg bg-[#141224] border border-pink-500/30 rounded-3xl overflow-hidden shadow-2xl relative my-auto p-5 sm:p-7 text-left"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-white/5 rounded-full border border-white/10 transition-all cursor-pointer z-10"
          title="Close Share Dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 font-mono text-xs font-bold mb-2">
            <Share2 className="w-3.5 h-3.5 text-pink-400" />
            {isProfile ? 'SHARE SOUL PROFILE' : 'SHARE 3D VR MUSIC JAM'}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            {isProfile ? `Share ${payload.profile?.name}'s Profile` : `Share Music Jam Session`}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Share to external apps, social networks, or use your device&apos;s native share menu.
          </p>
        </div>

        {/* Rich Preview Card */}
        <div className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3 relative overflow-hidden">
          {isProfile && payload.profile && (
            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                <AmbientOnlineAvatar
                  src={payload.profile.avatar}
                  alt={payload.profile.name}
                  size="lg"
                  isOnline={payload.profile.isOnline ?? true}
                  glowColor="pink"
                />
                <div className="absolute -bottom-1 -right-1 z-10">
                  <VerificationBadge
                    tier={payload.profile.tier}
                    isVerified={payload.profile.isSoulVerified}
                    size="sm"
                  />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                    {payload.profile.name}, {payload.profile.age}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-pink-500/20 text-pink-300 font-mono text-[10px] font-bold shrink-0 border border-pink-400/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-pink-400" />
                    {payload.profile.matchScore}% Match
                  </span>
                </div>
                <p className="text-xs text-cyan-300 font-medium truncate mt-0.5">
                  {payload.profile.tagline || payload.profile.location}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {payload.profile.topGenres?.slice(0, 3).map((g) => (
                    <span
                      key={g}
                      className="px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-mono"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isJam && payload.jamSession && (
            <div className="flex items-center gap-3.5">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-cyan-400/40 shadow-lg group">
                <img
                  src={
                    payload.jamSession.coverUrl ||
                    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80'
                  }
                  alt={payload.jamSession.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Music className="w-6 h-6 text-cyan-300 animate-pulse" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[9px] font-bold uppercase border border-cyan-400/40 flex items-center gap-1">
                    <Radio className="w-2.5 h-2.5 animate-pulse text-cyan-400" />
                    Live 3D Jam
                  </span>
                  {payload.jamSession.flag && (
                    <span className="text-xs">{payload.jamSession.flag}</span>
                  )}
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {payload.jamSession.genre || 'Afro-Soul & Lofi'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white truncate">
                  {payload.jamSession.title}
                </h3>
                <p className="text-xs text-zinc-300 truncate">
                  {payload.jamSession.artist || 'Soul Beats Collective'}
                </p>
                <p className="text-[10px] text-pink-300 font-mono mt-1 flex items-center gap-1">
                  <Users className="w-3 h-3 text-pink-400" />
                  {payload.jamSession.activeListeners || 18} Soulmates listening live in VR
                </p>
              </div>
            </div>
          )}

          <div className="pt-1 text-[11px] text-zinc-400 border-t border-white/5 flex items-center justify-between font-mono">
            <span>Powered by Twogether</span>
            <span className="text-pink-400">#TwogetherSingles</span>
          </div>
        </div>

        {/* Feedback Alert Toast */}
        <AnimatePresence>
          {shareFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mb-4 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-mono font-bold flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                {shareFeedback}
              </span>
              <button
                onClick={() => setShareFeedback(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Primary Action: Native Web Share API */}
        {hasNativeShare ? (
          <button
            onClick={handleNativeShare}
            className="w-full py-3.5 mb-4 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 text-white font-extrabold text-sm shadow-xl shadow-pink-500/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Open Browser / Device Share Menu</span>
          </button>
        ) : (
          <div className="mb-4 p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-zinc-400 font-mono flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Browser Share API ready. Choose your platform below or copy link:</span>
          </div>
        )}

        {/* Direct One-Click Platform Share Buttons */}
        <div className="space-y-2 mb-5">
          <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
            Direct Share to External Platforms
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {/* WhatsApp */}
            <button
              onClick={() => handleOpenPlatform('whatsapp')}
              className="p-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 cursor-pointer group"
              title="Share to WhatsApp"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400 group-hover:scale-110 transition-transform">
                💬
              </div>
              <span className="text-[10px] font-bold font-mono">WhatsApp</span>
            </button>

            {/* X (Twitter) */}
            <button
              onClick={() => handleOpenPlatform('twitter')}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-zinc-200 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 cursor-pointer group"
              title="Post on X (Twitter)"
            >
              <div className="w-7 h-7 rounded-lg bg-black/40 flex items-center justify-center text-sm font-bold text-white group-hover:scale-110 transition-transform">
                𝕏
              </div>
              <span className="text-[10px] font-bold font-mono">X / Tweet</span>
            </button>

            {/* Telegram */}
            <button
              onClick={() => handleOpenPlatform('telegram')}
              className="p-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 cursor-pointer group"
              title="Share to Telegram"
            >
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center text-sm font-bold text-sky-400 group-hover:scale-110 transition-transform">
                ✈️
              </div>
              <span className="text-[10px] font-bold font-mono">Telegram</span>
            </button>

            {/* Facebook */}
            <button
              onClick={() => handleOpenPlatform('facebook')}
              className="p-2.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 cursor-pointer group"
              title="Share to Facebook"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center text-sm font-bold text-blue-400 group-hover:scale-110 transition-transform">
                f
              </div>
              <span className="text-[10px] font-bold font-mono">Facebook</span>
            </button>

            {/* Messages / SMS */}
            <button
              onClick={() => handleOpenPlatform('sms')}
              className="p-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 cursor-pointer group"
              title="Send via SMS / Messages"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-400 group-hover:scale-110 transition-transform">
                📱
              </div>
              <span className="text-[10px] font-bold font-mono">SMS</span>
            </button>

            {/* Email */}
            <button
              onClick={() => handleOpenPlatform('email')}
              className="p-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 cursor-pointer group"
              title="Send via Email"
            >
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-400 group-hover:scale-110 transition-transform">
                ✉️
              </div>
              <span className="text-[10px] font-bold font-mono">Email</span>
            </button>
          </div>
        </div>

        {/* Copy Link Field */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
            Direct Shareable URL
          </label>
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/70 border border-white/15 focus-within:border-cyan-400/60 transition-colors">
            <input
              type="text"
              readOnly
              value={payload.url}
              className="flex-1 bg-transparent px-3 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none truncate"
            />
            <button
              onClick={handleCopyLink}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
