import React, { useState } from 'react';
import { X, Lock, Crown, Check, Sparkles, Coins, CreditCard, Palette, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CHAT_WALLPAPERS } from '../data/subscriptionData';
import { ChatWallpaper } from '../types';

interface WallpaperSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWallpaperId: string;
  onSelectWallpaper: (wallpaper: ChatWallpaper) => void;
  isVip: boolean;
  onOpenUpgradeModal: (reason: string) => void;
  unlockedFeatures?: string[];
  giftsBalance?: number;
  onSpendGifts?: (amount: number, featureName: string, featureKey: string) => boolean;
  onUnlockFeatureDirectly?: (featureKey: string, priceStr?: string) => void;
}

export const WallpaperSelectorModal: React.FC<WallpaperSelectorModalProps> = ({
  isOpen,
  onClose,
  activeWallpaperId,
  onSelectWallpaper,
  isVip,
  onOpenUpgradeModal,
  unlockedFeatures = [],
  giftsBalance = 0,
  onSpendGifts,
  onUnlockFeatureDirectly,
}) => {
  const [selectedLockedWallpaper, setSelectedLockedWallpaper] = useState<ChatWallpaper | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const [errorNote, setErrorNote] = useState<string | null>(null);

  if (!isOpen) return null;

  // Check if wallpaper is unlocked (either free, user is VIP, specific wallpaper unlocked, or all_wallpapers pass active)
  const isWallpaperUnlocked = (wp: ChatWallpaper) => {
    if (!wp.isVipOnly) return true;
    if (isVip) return true;
    if (unlockedFeatures.includes(wp.id)) return true;
    if (unlockedFeatures.includes('all_wallpapers')) return true;
    return false;
  };

  // Unlock single wallpaper with points
  const handleUnlockSingleWithPoints = (wp: ChatWallpaper) => {
    setErrorNote(null);
    if (giftsBalance < 20) {
      setErrorNote(`Insufficient Points: You need 20 Points to unlock '${wp.name}'. Your balance is ${giftsBalance} Points.`);
      setTimeout(() => setErrorNote(null), 4000);
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      if (onSpendGifts) {
        onSpendGifts(20, `Wallpaper: ${wp.name}`, wp.id);
      }
      setIsProcessing(false);
      setSelectedLockedWallpaper(null);
      onSelectWallpaper(wp);
      setSuccessNote(`🎨 Unlocked '${wp.name}' permanently for 20 Points!`);
      setTimeout(() => setSuccessNote(null), 3500);
    }, 400);
  };

  // Direct card unlock for single wallpaper ($0.99)
  const handleUnlockSingleWithCard = (wp: ChatWallpaper) => {
    setIsProcessing(true);
    setTimeout(() => {
      if (onUnlockFeatureDirectly) {
        onUnlockFeatureDirectly(wp.id, '$0.99 USD');
      }
      setIsProcessing(false);
      setSelectedLockedWallpaper(null);
      onSelectWallpaper(wp);
      setSuccessNote(`💳 Unlocked '${wp.name}' permanently for $0.99 USD!`);
      setTimeout(() => setSuccessNote(null), 3500);
    }, 500);
  };

  // Unlock all wallpapers with gifts (20 Gifts) or card ($2.49)
  const handleUnlockAllWallpapers = (method: 'points' | 'card') => {
    if (method === 'points') {
      if (giftsBalance < 20) {
        setSuccessNote(`❌ Insufficient Gifts (${giftsBalance}/20 Gifts needed). Buy a pack or convert points!`);
        setTimeout(() => setSuccessNote(null), 3500);
        return;
      }
      setIsProcessing(true);
      setTimeout(() => {
        if (onSpendGifts) {
          onSpendGifts(20, 'All Chat Wallpapers All-Access', 'all_wallpapers');
        }
        setIsProcessing(false);
        setSelectedLockedWallpaper(null);
        setSuccessNote('🎉 Unlocked ALL 8+ Wallpapers permanently for 20 Gifts!');
        setTimeout(() => setSuccessNote(null), 3500);
      }, 400);
    } else {
      setIsProcessing(true);
      setTimeout(() => {
        if (onUnlockFeatureDirectly) {
          onUnlockFeatureDirectly('all_wallpapers', '$2.49 USD');
        }
        setIsProcessing(false);
        setSelectedLockedWallpaper(null);
        setSuccessNote('🎉 Unlocked ALL 8+ Wallpapers permanently for $2.49 USD!');
        setTimeout(() => setSuccessNote(null), 3500);
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg bg-[#181726] border border-white/15 rounded-3xl overflow-hidden shadow-2xl p-6 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-white/5 rounded-full cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-purple-500 p-0.5 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Chat Wallpapers & Themes</h2>
            <p className="text-xs text-zinc-400">
              Customize your chat vibe • Unlock individually or via Points (No VIP needed!)
            </p>
          </div>
        </div>

        {/* Success Alert */}
        <AnimatePresence>
          {successNote && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 mb-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-mono font-bold flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{successNote}</span>
            </motion.div>
          )}
          {errorNote && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 mb-3 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs font-mono font-bold flex items-center gap-2"
            >
              <span>❌ {errorNote}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wallpaper Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[340px] overflow-y-auto p-1 mb-4">
          {CHAT_WALLPAPERS.map((wp) => {
            const isSelected = wp.id === activeWallpaperId;
            const isUnlocked = isWallpaperUnlocked(wp);

            return (
              <div
                key={wp.id}
                onClick={() => {
                  if (!isUnlocked) {
                    setSelectedLockedWallpaper(wp);
                  } else {
                    onSelectWallpaper(wp);
                  }
                }}
                className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all h-28 flex flex-col justify-end p-2 ${
                  isSelected
                    ? 'border-cyan-400 shadow-lg shadow-cyan-500/30 scale-[1.02]'
                    : !isUnlocked
                    ? 'border-amber-500/40 opacity-80 hover:opacity-100'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                {/* Background image preview */}
                <img
                  src={wp.previewUrl}
                  alt={wp.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                {/* Badges */}
                <div className="absolute top-1.5 right-1.5 z-10 flex gap-1">
                  {isUnlocked ? (
                    <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/80 text-black text-[9px] font-extrabold shadow">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-500/90 text-black text-[9px] font-extrabold flex items-center gap-0.5 shadow">
                      <Lock className="w-2.5 h-2.5" /> $0.99 / 20 Pts
                    </span>
                  )}
                </div>

                {isSelected && (
                  <div className="absolute top-1.5 left-1.5 z-10 w-5 h-5 rounded-full bg-cyan-400 text-black flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                {!isUnlocked && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center text-amber-300 gap-1 z-10">
                    <Lock className="w-5 h-5 text-amber-400" />
                    <span className="text-[9px] font-mono font-bold uppercase">Unlock Theme</span>
                  </div>
                )}

                <div className="relative z-10">
                  <p className="text-[11px] font-bold text-white truncate drop-shadow">{wp.name}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Locked Wallpaper Unlock Sheet */}
        <AnimatePresence>
          {selectedLockedWallpaper && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="p-4 rounded-2xl bg-white/10 border border-amber-400/40 mb-3 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-pink-400" /> Unlock &apos;{selectedLockedWallpaper.name}&apos;
                  </h4>
                  <p className="text-[11px] text-zinc-300 font-mono mt-0.5">
                    Permanent lifetime access • No monthly VIP subscription required!
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLockedWallpaper(null)}
                  className="text-zinc-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono font-bold">
                {/* Option 1: 20 Points */}
                <button
                  onClick={() => handleUnlockSingleWithPoints(selectedLockedWallpaper)}
                  disabled={isProcessing}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:scale-[1.02] transition-transform flex items-center justify-between cursor-pointer shadow-md"
                >
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4" /> 20 Points
                  </span>
                  <span className="text-[10px] uppercase font-mono">Unlock Now</span>
                </button>

                {/* Option 2: $0.99 USD Direct Card */}
                <button
                  onClick={() => handleUnlockSingleWithCard(selectedLockedWallpaper)}
                  disabled={isProcessing}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black hover:scale-[1.02] transition-transform flex items-center justify-between cursor-pointer shadow-md"
                >
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" /> $0.99 USD
                  </span>
                  <span className="text-[10px] uppercase font-mono">Buy with Card</span>
                </button>
              </div>

              {/* Option 3: Unlock ALL Wallpapers Pass */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-zinc-300 font-mono">
                  Or unlock <strong>ALL 8+ Themes</strong> permanently:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUnlockAllWallpapers('points')}
                    className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-amber-300 font-mono text-[10px] cursor-pointer"
                  >
                    20 Gifts
                  </button>
                  <button
                    onClick={() => handleUnlockAllWallpapers('card')}
                    className="px-2 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-400/40 font-mono text-[10px] cursor-pointer"
                  >
                    $2.49 USD
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer info */}
        <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between text-xs">
          <span className="text-zinc-400 font-mono">
            Balance: <strong className="text-amber-300">🎁 {giftsBalance} Gifts</strong>
          </span>

          <button
            onClick={() => onOpenUpgradeModal('Unlock ALL Wallpapers, unlimited voice & video calls, and VIP Gold Badge!')}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[11px] font-bold hover:bg-amber-500/30 flex items-center gap-1 cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5 fill-amber-300" /> Full VIP Unlimited
          </button>
        </div>
      </motion.div>
    </div>
  );
};
