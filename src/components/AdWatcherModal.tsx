import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Zap,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Crown,
  Volume2,
  VolumeX,
  CreditCard,
  Gift,
  Flame,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { GoogleGIcon, GooglePayLogo } from './GooglePayComponents';

interface AdWatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeToAdFree: () => void;
  onEarnPoints?: (amount: number, reason: string) => void;
  hasAdFreeSubscription: boolean;
}

interface SponsorAd {
  id: string;
  brand: string;
  tagline: string;
  headline: string;
  description: string;
  ctaText: string;
  imageBannerUrl: string;
  videoPlaceholderUrl?: string;
  category: string;
  badge: string;
}

const SPONSOR_ADS: SponsorAd[] = [
  {
    id: 'ad_apple_music',
    brand: 'Apple Music Kenya & Global',
    tagline: '100 Million Love Songs in Spatial Audio',
    headline: 'Stream Otile Brown, Sauti Sol & Teddy Swims in Dolby Atmos',
    description: 'Listen to every trending Kenyan love hit and international billboard love song in lossless audio quality with zero latency.',
    ctaText: 'Start Free 3-Month Trial',
    imageBannerUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    category: 'Streaming & Love Music',
    badge: 'SPONSORED BY APPLE MUSIC',
  },
  {
    id: 'ad_mpesa_romance',
    brand: 'Safaricom M-Pesa Kenya 🇰🇪',
    tagline: 'Send Love & Romance Gifts Instantly',
    headline: 'Seamless Mobile Money for Couples & Dates Across Kenya',
    description: 'Send quick date-night treats, roses, and dinner bills instantly with M-Pesa Global and Lipa Na M-Pesa with 0 hassle.',
    ctaText: 'Open M-Pesa Super App',
    imageBannerUrl: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=800&q=80',
    category: 'Mobile Finance 🇰🇪',
    badge: 'SPONSORED BY SAFARICOM M-PESA',
  },
  {
    id: 'ad_beats_audio',
    brand: 'Beats Studio Pro 🎧',
    tagline: 'Immersive Sound for Soulmates',
    headline: 'Personalized Spatial Audio & Active Noise Cancelling',
    description: 'Tune into your soulmate’s voice and shared beats in ultra-fidelity with up to 40 hours of battery life and plush leather cushions.',
    ctaText: 'Explore Beats Pro Edition',
    imageBannerUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
    category: 'Premium Audio Gear',
    badge: 'SPONSORED BY BEATS BY DRE',
  },
  {
    id: 'ad_airbnb_escapes',
    brand: 'Airbnb Romantic Escapes',
    tagline: 'Find Your Next Couple’s Getaway',
    headline: 'Secluded Beach Villas in Diani & Mountain Cabins in Naivasha',
    description: 'Book unforgettable romantic weekend stays, stargazing domes, and private oceanfront villas tailored for two.',
    ctaText: 'Discover Stays for Two',
    imageBannerUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    category: 'Travel & Romance',
    badge: 'SPONSORED BY AIRBNB',
  },
];

export const AdWatcherModal: React.FC<AdWatcherModalProps> = ({
  isOpen,
  onClose,
  onUpgradeToAdFree,
  onEarnPoints,
  hasAdFreeSubscription,
}) => {
  const [countdown, setCountdown] = useState<number>(5);
  const [canSkip, setCanSkip] = useState<boolean>(false);
  const [currentAdIndex, setCurrentAdIndex] = useState<number>(0);
  const [isAdSoundMuted, setIsAdSoundMuted] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      // Pick random ad
      const randIdx = Math.floor(Math.random() * SPONSOR_ADS.length);
      setCurrentAdIndex(randIdx);
      setCountdown(5);
      setCanSkip(false);

      // Countdown timer for 5 seconds
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanSkip(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen || hasAdFreeSubscription) return null;

  const currentAd = SPONSOR_ADS[currentAdIndex];

  const handleSkipOrClose = () => {
    if (!canSkip) return;
    if (onEarnPoints) {
      onEarnPoints(5, 'Sponsored Ad Watched (+5 Points)');
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {}
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg bg-[#141022] border-2 border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl relative text-left"
      >
        {/* Top Ad Status Bar */}
        <div className="bg-gradient-to-r from-amber-500/20 via-purple-600/20 to-black p-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black font-mono font-extrabold text-[10px] uppercase">
              Sponsored Ad
            </span>
            <span className="text-xs font-mono text-zinc-300 font-bold">
              {currentAd.badge}
            </span>
          </div>

          {/* Countdown & Skip button */}
          <div className="flex items-center gap-2">
            {canSkip ? (
              <button
                onClick={handleSkipOrClose}
                className="px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Continue (+5 Pts)</span>
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-amber-300 font-mono text-xs font-bold border border-white/10 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                <span>Skip in {countdown}s</span>
              </span>
            )}
          </div>
        </div>

        {/* Ad Media Banner / Video Simulated Frame */}
        <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-black group">
          <img
            src={currentAd.imageBannerUrl}
            alt={currentAd.brand}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141022] via-transparent to-black/40" />

          {/* Audio toggle button */}
          <button
            onClick={() => setIsAdSoundMuted(!isAdSoundMuted)}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 text-xs hover:bg-black/80 transition-all cursor-pointer"
          >
            {isAdSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Brand Logo & Headline Overlay */}
          <div className="absolute bottom-3 left-4 right-4 text-left">
            <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-widest block mb-0.5">
              {currentAd.category}
            </span>
            <h3 className="text-lg sm:text-xl font-black text-white drop-shadow-md">
              {currentAd.brand}
            </h3>
            <p className="text-xs text-zinc-300 font-medium drop-shadow-md">
              {currentAd.tagline}
            </p>
          </div>
        </div>

        {/* Ad Details Body */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="space-y-1.5">
            <h4 className="text-sm font-extrabold text-white">
              {currentAd.headline}
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {currentAd.description}
            </p>
          </div>

          {/* Reward notice */}
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-between text-xs font-mono">
            <span className="text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Watch reward: +5 Determination Points
            </span>
            <span className="text-zinc-400 text-[10px]">
              Every 5 minutes for non-paying users
            </span>
          </div>

          {/* ========================================================
              CRITICAL: ESCAPE ADS PROMOTION & $3.89/MONTH PLAN
              ======================================================== */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-purple-900/30 to-black border-2 border-amber-400/50 space-y-2 text-left shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-extrabold text-amber-300 flex items-center gap-1.5 uppercase">
                <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                Never See 5-Minute Ads Again
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-400 text-black font-mono font-black text-xs">
                $3.89 / Month
              </span>
            </div>

            <p className="text-[11px] text-zinc-300 leading-snug">
              To escape all 5-minute video and banner ads, subscribe to our <strong>Ad-Free Music & Love Pass for $3.89 monthly</strong>. Billed strictly via Google Pay with instant in-app activation.
            </p>

            <button
              onClick={() => {
                onClose();
                onUpgradeToAdFree();
              }}
              className="w-full py-3 rounded-xl bg-black hover:bg-zinc-900 border border-white/30 text-white font-black text-xs shadow-lg hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <GoogleGIcon className="w-4 h-4" />
              <span>Subscribe with Google Pay ($3.89/mo) & Remove Ads ➔</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
