import React, { useState } from 'react';
import { X, Camera, Image, Sparkles, Flame, Coins, CreditCard, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (reel: any) => void;
  isVip?: boolean;
  postsUsed?: number;
  maxPostsBasic?: number;
  postsDaysInterval?: number;
  onOpenUpgradeModal?: (reason: string) => void;
  onIncrementPosts?: () => void;
  unlockedFeatures?: string[];
  giftsBalance?: number;
  onSpendGifts?: (amount: number, featureName: string, featureKey: string) => boolean;
  onUnlockFeatureDirectly?: (featureKey: string, priceStr?: string) => void;
  onReportViolation?: (strike: { type: 'post'; reason: string; snippet?: string }) => void;
  currentUserId?: string;
  currentUserName?: string;
  currentUserEmail?: string;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
  isVip = false,
  postsUsed = 0,
  maxPostsBasic = 5,
  postsDaysInterval = 21,
  onOpenUpgradeModal,
  onIncrementPosts,
  unlockedFeatures = [],
  giftsBalance = 0,
  onSpendGifts,
  onUnlockFeatureDirectly,
  onReportViolation,
  currentUserId = 'usr_verified_1',
  currentUserName = 'Dylan Wisney',
  currentUserEmail = 'dylan.wisney@gmail.com',
}) => {
  const [caption, setCaption] = useState('');
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('video');
  const [mediaUrl, setMediaUrl] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [hashtags, setHashtags] = useState('#SingleLife #100PercentVerified #LofiVibes');
  const [isPublishing, setIsPublishing] = useState(false);
  const [showBoosterOffer, setShowBoosterOffer] = useState(false);
  const [postWarning, setPostWarning] = useState<string | null>(null);

  const samplePresets = [
    {
      label: 'Beach Swimsuit (Covered - Allowed ✅)',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
      type: 'photo',
      note: 'Swimwear covering private parts completely',
    },
    {
      label: 'Casual Denim & Top (Allowed ✅)',
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80',
      type: 'photo',
      note: 'Fully clothed portrait',
    },
    {
      label: 'Cyberpunk Neon Video (Allowed ✅)',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-lighting-1232-large.mp4',
      type: 'video',
      note: 'Neon motion clip',
    },
    {
      label: 'Prohibited Nude Test (Flagged ❌)',
      url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=80&test=explicit_nude_unclad',
      type: 'photo',
      note: 'Widely naked unclad test sample',
    },
  ];

  if (!isOpen) return null;

  // Extra posts from boosters
  const hasPostsBooster = unlockedFeatures.includes('posts_pack_10');
  const effectiveMaxPosts = hasPostsBooster ? maxPostsBasic + 10 : maxPostsBasic;
  const isPostQuotaReached = !isVip && postsUsed >= effectiveMaxPosts;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVid = file.type.startsWith('video');
    setMediaType(isVid ? 'video' : 'photo');

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) {
        setImageBase64(result);
        setMediaUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isPostQuotaReached) {
      setShowBoosterOffer(true);
      return;
    }

    setIsPublishing(true);

    const chosenUrl = mediaUrl || samplePresets[0].url;
    const hashtagList = hashtags.split(' ').filter((h) => h.startsWith('#'));

    // Anti-Nudity & Good Vybes AI Guardian Scan before publishing
    try {
      const modRes = await fetch('/api/moderation/scan-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `${caption} ${hashtags}`,
          mediaUrl: chosenUrl,
          imageBase64: imageBase64,
          context: 'post',
          userId: currentUserId,
          userName: currentUserName,
          userEmail: currentUserEmail,
        }),
      });
      const modData = await modRes.json();
      if (modData.isViolating) {
        setIsPublishing(false);
        if (onReportViolation) {
          onReportViolation({
            type: 'post',
            reason:
              modData.reason ||
              'Content blocked by AI Guardian (zero discrimination, illegal business, scams, harm, or nudity).',
            snippet: caption || 'Media post',
          });
        }
        onClose();
        return;
      }
    } catch {
      // Proceed on network error
    }

    try {
      const response = await fetch('/api/reels/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: caption || 'Ready to match with a verified single soul! ✨',
          mediaUrl: chosenUrl,
          mediaType,
          hashtags: hashtagList,
          userId: currentUserId,
          userName: currentUserName,
        }),
      });
      const data = await response.json();
      setIsPublishing(false);

      if (!response.ok || data.isViolating) {
        if (onReportViolation) {
          onReportViolation({
            type: 'post',
            reason: data.message || 'Post blocked by 24/7 AI Guardian.',
            snippet: caption || 'Media post',
          });
        }
        onClose();
        return;
      }

      if (data.success && data.reel) {
        if (onIncrementPosts) onIncrementPosts();
        onPostCreated(data.reel);
        onClose();
        setCaption('');
        setMediaUrl('');
      }
    } catch {
      setIsPublishing(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg bg-[#1B1A26] border border-white/15 rounded-3xl overflow-hidden shadow-2xl p-6 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-white/5 rounded-full cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-pink-500 p-0.5 flex items-center justify-center">
            <Camera className="w-5 h-5 text-black" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Post to Single Souls Feed</h2>
            <p className="text-xs text-zinc-400">Share your video clip or photo story with verified singles</p>
          </div>
        </div>

        {/* Quota Status Bar */}
        <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs font-mono mb-4">
          <span className="text-zinc-400">
            Posts Used: <strong className={isPostQuotaReached ? 'text-rose-400' : 'text-cyan-300'}>{postsUsed} / {isVip ? '∞' : effectiveMaxPosts}</strong>
          </span>
          <span className="text-[10px] text-zinc-500">
            {isVip ? 'VIP Unlimited' : `Cycle: 3 Weeks (${postsDaysInterval}d)`}
          </span>
        </div>

        {/* Quota Reached Booster Offer Card */}
        <AnimatePresence>
          {showBoosterOffer && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-2xl bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-black border border-pink-400/40 mb-4 space-y-2.5 text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-pink-400" /> Unlock 10 Extra Posts Booster
                </span>
                <span className="text-[10px] font-mono text-zinc-400">Valid 30 Days</span>
              </div>
              <p className="text-[11px] text-zinc-300">
                You reached the basic post limit ({effectiveMaxPosts} posts). Unlock 10 extra reels instantly without having to get VIP!
              </p>
              {postWarning && (
                <p className="text-[10.5px] font-mono text-rose-300 bg-rose-500/20 px-2 py-1 rounded border border-rose-500/30">
                  {postWarning}
                </p>
              )}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (giftsBalance < 20) {
                      setPostWarning(`Insufficient Points: ${giftsBalance}/20 Points available. Earn points via daily login or upgrade to VIP!`);
                      return;
                    }
                    if (onSpendGifts) onSpendGifts(20, '10 Extra Reels & Stories Posts', 'posts_pack_10');
                    setShowBoosterOffer(false);
                    setPostWarning(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-mono font-bold hover:scale-105 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Coins className="w-3.5 h-3.5" /> 20 Points
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onUnlockFeatureDirectly) onUnlockFeatureDirectly('posts_pack_10', '$0.99 USD');
                    setShowBoosterOffer(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-cyan-400 text-black text-xs font-mono font-bold hover:scale-105 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" /> $0.99 USD
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBoosterOffer(false);
                    onClose();
                    if (onOpenUpgradeModal) onOpenUpgradeModal('Unlock Unlimited Posts & Stories with VIP Unlimited!');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-mono hover:bg-white/20 transition-all flex items-center gap-1 cursor-pointer ml-auto"
                >
                  <Crown className="w-3 h-3 text-amber-300" /> Get VIP
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Caption Input */}
          <div>
            <label className="text-xs font-mono text-cyan-300 block mb-1">Caption & Soul Tagline</label>
            <textarea
              rows={3}
              placeholder="What's your current vibe? (e.g., Single & looking for someone to share lofi beats in VR...)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Hashtags */}
          <div>
            <label className="text-xs font-mono text-purple-300 block mb-1">Hashtags</label>
            <input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Upload Custom File from Device (Apple iPhone or Android) */}
          <div>
            <label className="text-xs font-mono text-zinc-300 block mb-1.5 flex items-center justify-between">
              <span>Upload Photo / Video from Device</span>
              <span className="text-[10px] text-cyan-400">iPhone & Android Ready</span>
            </label>
            <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-cyan-400/50 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono cursor-pointer transition-all">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>{imageBase64 ? '✓ Media Attached (Tap to replace)' : 'Choose Photo / Video from Gallery'}</span>
            </label>
            {mediaUrl && (
              <div className="mt-2 relative rounded-xl overflow-hidden max-h-32 border border-white/10 bg-black flex items-center justify-center">
                {mediaType === 'video' ? (
                  <video src={mediaUrl} className="max-h-32 w-auto object-contain" controls autoPlay muted loop />
                ) : (
                  <img src={mediaUrl} alt="Preview" className="max-h-32 w-auto object-contain" />
                )}
              </div>
            )}
          </div>

          {/* Media Presets */}
          <div>
            <label className="text-xs font-mono text-zinc-300 block mb-2">Or Choose Verified Preset / Test Sample</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              {samplePresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setMediaUrl(preset.url);
                    setMediaType(preset.type as any);
                    setImageBase64(null);
                  }}
                  className={`p-2.5 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                    mediaUrl === preset.url
                      ? 'border-cyan-400 bg-cyan-500/20 text-white font-bold'
                      : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20'
                  }`}
                >
                  <p className="truncate font-semibold text-white">{preset.label}</p>
                  <span className="text-[10px] text-zinc-400 uppercase font-mono block">{preset.note}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Apple & Android Anti-Nudity Safety Notice */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-200 text-[11px] space-y-1">
            <span className="font-bold font-mono flex items-center gap-1.5 text-amber-300">
              <span>🛡️</span> Apple & Android Store Content Safety:
            </span>
            <p className="leading-snug text-zinc-300">
              Widely naked nudes or unclad private parts are strictly banned. If you receive <strong>7 warnings</strong>, your account is permanently banned and requires a <strong>$10 appeal fine</strong> to restore. Clothing/swimwear covering private parts completely is allowed.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isPublishing}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-400 text-white font-bold text-sm shadow-xl shadow-pink-500/25 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPublishing ? (
                <span>Publishing to Feed...</span>
              ) : isPostQuotaReached ? (
                <span className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-300" /> Unlock 10 Extra Posts ($0.99 / 20 Pts)
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Share Reel & Match
                </span>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
