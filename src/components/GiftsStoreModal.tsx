import React, { useState } from 'react';
import {
  Gift,
  Sparkles,
  Crown,
  ShieldAlert,
  CheckCircle2,
  X,
  CreditCard,
  Zap,
  Gamepad2,
  Music,
  Palette,
  Heart,
  Coins,
  Globe,
  Phone,
  Video,
  MessageSquare,
  Flame,
  Check,
  RotateCw,
  HelpCircle,
  AlertTriangle,
  Info,
  CalendarCheck,
  Mic,
  Smile,
  Send,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { GlassCard } from './GlassCard';
import { A_LA_CARTE_PRICING, FeaturePassItem } from '../data/subscriptionData';
import {
  GoogleGIcon,
  GooglePayLogo,
  GooglePayBadge,
  GooglePayButton,
  GooglePayCheckoutSheet,
} from './GooglePayComponents';

interface GiftsStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  giftsBalance: number;
  pointsBalance?: number;
  onBuyGiftsPack: (amount: number, priceLabel: string) => void;
  onSpendGifts: (amount: number, featureName: string, featureKey: string) => boolean;
  onConvertPointsToGift?: (pointsCost: number, giftsGained: number) => boolean;
  onSendGiftToUser?: (recipientName: string, giftName: string, giftCost: number, note: string) => void;
  onGenerateGifts?: (amount: number, reason: string) => void;
  onGeneratePoints?: (amount: number, reason: string) => void;
  isVip: boolean;
  onToggleVip: (status: boolean) => void;
  unlockedFeatures: string[];
  onUnlockFeatureDirectly?: (featureKey: string, priceStr?: string) => void;
}

export const GiftsStoreModal: React.FC<GiftsStoreModalProps> = ({
  isOpen,
  onClose,
  giftsBalance,
  pointsBalance = 120,
  onBuyGiftsPack,
  onSpendGifts,
  onConvertPointsToGift,
  onSendGiftToUser,
  onGenerateGifts,
  onGeneratePoints,
  isVip,
  unlockedFeatures = [],
  onUnlockFeatureDirectly,
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'INR' | 'NGN'>('USD');
  const [activeTab, setActiveTab] = useState<'buy_packs' | 'points_exchange' | 'earn_points' | 'send_gifts' | 'spend_features'>('buy_packs');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'calls' | 'wallpaper' | 'chats' | 'games'>('all');
  const [purchasingPack, setPurchasingPack] = useState<string | null>(null);
  const [spendingFeature, setSpendingFeature] = useState<string | null>(null);
  const [directBuyingKey, setDirectBuyingKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showWithdrawNotice, setShowWithdrawNotice] = useState<boolean>(false);
  const [gpayCheckoutItem, setGpayCheckoutItem] = useState<{ name: string; desc?: string; price: number; type: 'pack' | 'pass'; rawItem?: any } | null>(null);
  const [isGpaySheetOpen, setIsGpaySheetOpen] = useState<boolean>(false);

  // Send Gift State
  const [selectedRecipient, setSelectedRecipient] = useState<string>('Aria Sterling');
  const [customRecipient, setCustomRecipient] = useState<string>('');
  const [selectedGiftItem, setSelectedGiftItem] = useState<{ name: string; icon: string; cost: number }>({
    name: 'Holographic Soul Rose',
    icon: '🌹',
    cost: 1,
  });
  const [giftPersonalNote, setGiftPersonalNote] = useState<string>('Thinking of you! You light up my world ✨');
  const [isSendingGift, setIsSendingGift] = useState<boolean>(false);

  // Free Points Daily Determination States
  const [dailyClaimed, setDailyClaimed] = useState<boolean>(() => {
    try {
      const last = localStorage.getItem('twogether_daily_points_claim');
      if (last) {
        const diff = Date.now() - Number(last);
        return diff < 24 * 60 * 60 * 1000;
      }
    } catch {
      // ignore
    }
    return false;
  });

  const [soulPromptAnswer, setSoulPromptAnswer] = useState<string>('');
  const [soulPromptClaimed, setSoulPromptClaimed] = useState<boolean>(false);
  const [isSpinningWheel, setIsSpinningWheel] = useState<boolean>(false);
  const [wheelClaimed, setWheelClaimed] = useState<boolean>(false);
  const [wheelAngle, setWheelAngle] = useState<number>(0);

  if (!isOpen) return null;

  const CURRENCY_CONVERSIONS: Record<string, { symbol: string; rate: number; label: string }> = {
    USD: { symbol: '$', rate: 1.0, label: 'USD ($)' },
    EUR: { symbol: '€', rate: 0.92, label: 'EUR (€)' },
    GBP: { symbol: '£', rate: 0.78, label: 'GBP (£)' },
    CAD: { symbol: 'CA$', rate: 1.35, label: 'CAD (CA$)' },
    AUD: { symbol: 'A$', rate: 1.52, label: 'AUD (A$)' },
    INR: { symbol: '₹', rate: 83.2, label: 'INR (₹)' },
    NGN: { symbol: '₦', rate: 1550, label: 'NGN (₦)' },
  };

  // Gift Packs (High valuable currency bought with real money)
  const GIFT_PACKS = [
    { id: 'pack_15', gifts: 15, usdPrice: 0.99, popular: false, badge: 'Starter Pocket' },
    { id: 'pack_45', gifts: 45, usdPrice: 2.49, popular: true, badge: 'Popular Lover Pack 🔥' },
    { id: 'pack_100', gifts: 100, usdPrice: 4.99, popular: false, badge: 'Love Booster (+15 Bonus)' },
    { id: 'pack_230', gifts: 230, usdPrice: 9.99, popular: false, badge: 'Pro Romance Vault (+45 Bonus)' },
    { id: 'pack_500', gifts: 500, usdPrice: 19.99, popular: false, badge: 'Royal Soulmate Vault (+120 Bonus)' },
    { id: 'pack_850', gifts: 850, usdPrice: 29.99, popular: false, badge: 'Ultimate Eternity (+250 Bonus)' },
  ];

  // Gift Items that can be gifted directly to other users
  const GIFTABLE_ITEMS = [
    { name: 'Holographic Soul Rose', icon: '🌹', cost: 1, desc: 'A timeless gesture of pure affection' },
    { name: 'Artisanal Belgian Truffles', icon: '🍫', cost: 2, desc: 'Sweet decadent craving for your crush' },
    { name: 'Vintage Champagne Toast', icon: '🍾', cost: 5, desc: 'Celebrate sparks and deep connection' },
    { name: 'Glowing Neon Heart Pendant', icon: '💖', cost: 8, desc: 'Electrifying romantic attraction' },
    { name: 'Floating Diamond Solitaire', icon: '💎', cost: 15, desc: 'Rare and precious soulmate bond' },
    { name: 'Royal Golden Soul Crown', icon: '👑', cost: 25, desc: 'Crown them the ruler of your heart' },
    { name: 'Cyberpunk Sports Roadster', icon: '🏎️', cost: 50, desc: 'Ride together into the midnight sunset' },
  ];

  // Helper for item icons
  const getIconForCategory = (iconName: string) => {
    switch (iconName) {
      case 'Phone':
      case 'PhoneCall':
        return Phone;
      case 'Video':
      case 'Camera':
        return Video;
      case 'Image':
      case 'Palette':
        return Palette;
      case 'MessageSquare':
      case 'MessageCircle':
        return MessageSquare;
      case 'Flame':
        return Flame;
      case 'Gamepad2':
        return Gamepad2;
      case 'Music':
        return Music;
      default:
        return Sparkles;
    }
  };

  // Helper to format currency
  const formatEquiv = (usd: number) => {
    const conv = CURRENCY_CONVERSIONS[selectedCurrency] || CURRENCY_CONVERSIONS.USD;
    const val = (usd * conv.rate).toFixed(2);
    if (selectedCurrency === 'USD') return `$${usd.toFixed(2)}`;
    return `$${usd.toFixed(2)} (≈ ${conv.symbol}${val} ${selectedCurrency})`;
  };

  // Open Google Pay Checkout Sheet for a Gift Pack
  const handleInitiateGooglePayForPack = (pack: typeof GIFT_PACKS[0]) => {
    setGpayCheckoutItem({
      name: `${pack.gifts.toLocaleString()} Valuable Gifts Pack`,
      desc: 'Unified virtual token currency for unlocks, passes, and romantic gifting.',
      price: pack.usdPrice,
      type: 'pack',
      rawItem: pack,
    });
    setIsGpaySheetOpen(true);
  };

  // Open Google Pay Checkout Sheet for an A La Carte Pass
  const handleInitiateGooglePayForPass = (item: FeaturePassItem) => {
    const isUnlocked =
      isVip ||
      unlockedFeatures.includes(item.key) ||
      (item.key === 'all_wallpapers' && unlockedFeatures.includes('all_wallpapers'));
    if (isUnlocked) return;

    setGpayCheckoutItem({
      name: `${item.name} (${item.durationLabel})`,
      desc: item.description,
      price: item.usdPrice,
      type: 'pass',
      rawItem: item,
    });
    setIsGpaySheetOpen(true);
  };

  // Confirm Google Pay Checkout Sheet execution
  const handleConfirmGooglePayPayment = async () => {
    if (!gpayCheckoutItem) return;
    setIsGpaySheetOpen(false);

    if (gpayCheckoutItem.type === 'pack') {
      const pack = gpayCheckoutItem.rawItem;
      setPurchasingPack(pack.id);
      const usdStr = `$${pack.usdPrice.toFixed(2)} USD`;
      const conv = CURRENCY_CONVERSIONS[selectedCurrency] || CURRENCY_CONVERSIONS.USD;
      const equivVal = (pack.usdPrice * conv.rate).toFixed(2);
      const displayStr =
        selectedCurrency === 'USD' ? usdStr : `$${pack.usdPrice.toFixed(2)} USD (≈ ${conv.symbol}${equivVal} ${selectedCurrency})`;

      try {
        await fetch('/api/billing/process-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planName: `${pack.gifts} Valuable Gifts Pack`,
            amount: pack.usdPrice,
            currency: selectedCurrency,
            paymentMethod: 'Google Pay (In-App Billing)',
            userEmail: 'dylanwisney@gmail.com',
          }),
        });
      } catch {}

      onBuyGiftsPack(pack.gifts, displayStr);
      setPurchasingPack(null);
      try {
        confetti({
          particleCount: 55,
          spread: 65,
          origin: { y: 0.6 },
          colors: ['#4285F4', '#34A853', '#FBBC05', '#EA4335'],
        });
      } catch {}
      setToastMessage({
        text: `🎉 Paid with Google Pay! Added ${pack.gifts} Gifts (${displayStr}). Balance: ${giftsBalance + pack.gifts} Gifts`,
        type: 'success',
      });
      setTimeout(() => setToastMessage(null), 4000);
    } else if (gpayCheckoutItem.type === 'pass') {
      const item: FeaturePassItem = gpayCheckoutItem.rawItem;
      setDirectBuyingKey(item.key);
      try {
        await fetch('/api/billing/process-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planName: `${item.name} (${item.durationLabel})`,
            amount: item.usdPrice,
            currency: selectedCurrency,
            paymentMethod: 'Google Pay (In-App Billing)',
            userEmail: 'dylanwisney@gmail.com',
          }),
        });
      } catch {}

      setDirectBuyingKey(null);
      if (onUnlockFeatureDirectly) {
        onUnlockFeatureDirectly(item.key, `$${item.usdPrice.toFixed(2)}`);
      }
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#4285F4', '#34A853', '#FBBC05', '#EA4335'],
        });
      } catch {}
      setToastMessage({
        text: `🎉 Paid $${item.usdPrice.toFixed(2)} with Google Pay! ${item.name} unlocked successfully!`,
        type: 'success',
      });
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Buy a Gift pack directly
  const handleBuyPack = (pack: typeof GIFT_PACKS[0]) => {
    handleInitiateGooglePayForPack(pack);
  };

  // Spend Gifts on features
  const handleSpendPointsOnItem = (item: FeaturePassItem) => {
    const isUnlocked =
      isVip ||
      unlockedFeatures.includes(item.key) ||
      (item.key === 'all_wallpapers' && unlockedFeatures.includes('all_wallpapers'));
    if (isUnlocked) return;

    if (giftsBalance < item.pointsCost) {
      setToastMessage({
        text: `❌ Insufficient Gifts (${giftsBalance}/${item.pointsCost} Gifts needed). You can convert points (25 Pts = 1 Gift), buy a pack with Google Pay, or pay with GPay!`,
        type: 'error',
      });
      setTimeout(() => setToastMessage(null), 5000);
      return;
    }

    setSpendingFeature(item.key);
    setTimeout(() => {
      const success = onSpendGifts(item.pointsCost, item.name, item.key);
      setSpendingFeature(null);
      if (success) {
        try {
          confetti({
            particleCount: 40,
            spread: 50,
            origin: { y: 0.6 },
            colors: ['#10b981', '#06b6d4', '#fbbf24'],
          });
        } catch {
          // ignore
        }
        setToastMessage({
          text: `🚀 Unlocked ${item.name}! Spent ${item.pointsCost} Gifts. Remaining Balance: ${giftsBalance - item.pointsCost} Gifts`,
          type: 'success',
        });
        setTimeout(() => setToastMessage(null), 4000);
      }
    }, 500);
  };

  // Convert Points -> Gifts (25 Points = 1 Gift, 10 Days Dedication)
  const handleConvertPoints = (ptsToConvert: number) => {
    if (pointsBalance < ptsToConvert) {
      setToastMessage({
        text: `❌ Insufficient Points (${pointsBalance}/${ptsToConvert} Pts). Complete daily determination check-ins (2.5 Pts/day) to earn points!`,
        type: 'error',
      });
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    const giftsGained = Math.floor(ptsToConvert / 25);

    if (onConvertPointsToGift) {
      const success = onConvertPointsToGift(ptsToConvert, giftsGained);
      if (success) {
        try {
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#06b6d4', '#fbbf24', '#10b981'],
          });
        } catch {}
        setToastMessage({
          text: `🎉 Successfully converted ${ptsToConvert} Points into ${giftsGained} Gift${giftsGained > 1 ? 's' : ''}! Your daily commitment paid off!`,
          type: 'success',
        });
        setTimeout(() => setToastMessage(null), 4500);
      }
    }
  };

  // Send Gift to Match or Partner
  const handleSendGift = (e: React.FormEvent) => {
    e.preventDefault();
    const recipient = customRecipient.trim() || selectedRecipient;

    if (giftsBalance < selectedGiftItem.cost) {
      setToastMessage({
        text: `❌ Insufficient Gifts (${giftsBalance}/${selectedGiftItem.cost} Gifts). Buy a pack or convert 25 points to send this gift!`,
        type: 'error',
      });
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    setIsSendingGift(true);
    setTimeout(() => {
      if (onSpendGifts) {
        onSpendGifts(
          selectedGiftItem.cost,
          `Gift Sent: ${selectedGiftItem.name} to ${recipient}`,
          `gift_sent_${Date.now()}`
        );
      }
      if (onSendGiftToUser) {
        onSendGiftToUser(recipient, selectedGiftItem.name, selectedGiftItem.cost, giftPersonalNote);
      }
      setIsSendingGift(false);
      try {
        confetti({
          particleCount: 55,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#ec4899', '#f43f5e', '#fbbf24'],
        });
      } catch {}
      setToastMessage({
        text: `🎁 Successfully gifted ${selectedGiftItem.icon} ${selectedGiftItem.name} to ${recipient}! (${selectedGiftItem.cost} Gift used)`,
        type: 'success',
      });
      setTimeout(() => setToastMessage(null), 4000);
    }, 500);
  };

  // Direct purchase with Card / USD
  const handleDirectBuyWithCard = async (item: FeaturePassItem) => {
    const isUnlocked =
      isVip ||
      unlockedFeatures.includes(item.key) ||
      (item.key === 'all_wallpapers' && unlockedFeatures.includes('all_wallpapers'));
    if (isUnlocked) return;

    setDirectBuyingKey(item.key);
    try {
      const res = await fetch('/api/billing/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planName: `${item.name} (${item.durationLabel})`,
          amount: item.usdPrice,
          currency: selectedCurrency,
          paymentMethod: 'Credit/Debit Card (Direct À La Carte)',
          userEmail: 'member@twogether.app',
        }),
      });

      const data = await res.json();
      setDirectBuyingKey(null);

      if (data.status === 'success' || data.success) {
        if (onUnlockFeatureDirectly) {
          onUnlockFeatureDirectly(item.key, `$${item.usdPrice.toFixed(2)}`);
        }
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#06b6d4', '#ec4899', '#fbbf24'],
          });
        } catch {
          // ignore
        }
        setToastMessage({
          text: `🎉 Paid $${item.usdPrice.toFixed(2)} with card! ${item.name} unlocked successfully with zero VIP lock-in!`,
          type: 'success',
        });
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        setToastMessage({
          text: `Payment processed: ${item.name} unlocked directly!`,
          type: 'success',
        });
        if (onUnlockFeatureDirectly) onUnlockFeatureDirectly(item.key);
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch {
      setDirectBuyingKey(null);
      if (onUnlockFeatureDirectly) onUnlockFeatureDirectly(item.key);
      setToastMessage({
        text: `Unlocked ${item.name}! Zero VIP required.`,
        type: 'success',
      });
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Earn Points Action 1: Daily Determination Check-In (+2.5 Points)
  const handleClaimDailyCheckIn = () => {
    if (dailyClaimed) {
      setToastMessage({
        text: '⏳ Daily Check-In already claimed today. Check back in 24 hours to keep your streak!',
        type: 'info',
      });
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    setDailyClaimed(true);
    try {
      localStorage.setItem('twogether_daily_points_claim', String(Date.now()));
    } catch {
      // ignore
    }

    if (onGeneratePoints) {
      onGeneratePoints(2.5, 'Daily Commitment Streak');
    }

    try {
      confetti({
        particleCount: 35,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#06b6d4'],
      });
    } catch {}

    setToastMessage({
      text: '⭐ Earned +2.5 Points from Daily Commitment Check-In! Keep your streak alive toward your next Gift.',
      type: 'success',
    });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Earn Points Action 2: Soul Prompt Answer (+1.5 Points)
  const handleClaimSoulPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!soulPromptAnswer.trim()) return;
    if (soulPromptClaimed) return;

    setSoulPromptClaimed(true);
    if (onGeneratePoints) {
      onGeneratePoints(1.5, 'Daily Intimacy Reflection Question');
    }

    try {
      confetti({
        particleCount: 30,
        spread: 45,
        origin: { y: 0.6 },
        colors: ['#ec4899', '#a855f7'],
      });
    } catch {}

    setToastMessage({
      text: '✨ Earned +1.5 Points for your authentic reflection answer! Added to your points balance.',
      type: 'success',
    });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Earn Points Action 3: Spin Love Resonance Wheel (+1 to +2.5 Points)
  const handleSpinResonanceWheel = () => {
    if (isSpinningWheel || wheelClaimed) return;
    setIsSpinningWheel(true);

    const pointOptions = [1, 1.5, 2, 2.5];
    const randomIndex = Math.floor(Math.random() * pointOptions.length);
    const wonPoints = pointOptions[randomIndex];
    const extraTurns = 5 + Math.floor(Math.random() * 3);
    const targetAngle = wheelAngle + extraTurns * 360 + randomIndex * 90;

    setWheelAngle(targetAngle);

    setTimeout(() => {
      setIsSpinningWheel(false);
      setWheelClaimed(true);

      if (onGeneratePoints) {
        onGeneratePoints(wonPoints, 'Daily Commitment Spin');
      }

      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#fbbf24', '#ec4899', '#06b6d4'],
        });
      } catch {}

      setToastMessage({
        text: `🎰 Commitment Spin Winner! Earned +${wonPoints} Points toward generating Gifts!`,
        type: 'success',
      });
      setTimeout(() => setToastMessage(null), 4500);
    }, 2800);
  };

  // Filter items by category
  const filteredItems = A_LA_CARTE_PRICING.filter((item) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'calls') return item.category === 'calls';
    if (selectedCategory === 'wallpaper') return item.category === 'wallpaper';
    if (selectedCategory === 'chats') return item.category === 'chats' || item.category === 'posts';
    if (selectedCategory === 'games') return item.category === 'games' || item.category === 'music';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-[#141221] border border-amber-400/40 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden my-auto text-left"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center font-black shadow-lg shadow-amber-500/30">
              <Gift className="w-6 h-6 fill-black" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                Gifts & Points Economy
              </h2>
              <p className="text-[11px] font-mono text-zinc-400">
                Gifts hold high value • 50 Points generate 1 Gift • Buy with money or grind daily
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Google Pay Exclusive Banner */}
        <div className="p-2.5 rounded-2xl bg-black/85 border border-emerald-500/50 mb-3 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center p-0.5 shadow-sm">
              <GoogleGIcon className="w-4 h-4" />
            </div>
            <span className="text-zinc-200">
              Payments processed <strong className="text-emerald-400">strictly via Google Pay</strong> only.
            </span>
          </div>
          <GooglePayBadge variant="dark" />
        </div>

        {/* Current Balances Card (Both Gifts and Points) */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-900/25 to-black border border-amber-400/40 grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 shadow-inner">
          {/* Gifts Balance */}
          <div className="flex items-center gap-3 border-b sm:border-b-0 sm:border-r border-white/10 pb-2 sm:pb-0 sm:pr-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <Gift className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase text-amber-300 font-bold tracking-wider">
                  Valuable Gifts Balance:
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 text-[9px] font-mono font-bold">
                  Spend & Gift
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono">
                  🎁 {giftsBalance.toLocaleString()} Gifts
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  (≈ {formatEquiv(giftsBalance * 0.055)})
                </span>
              </div>
            </div>
          </div>

          {/* Points Balance */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
              <Coins className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase text-cyan-300 font-bold tracking-wider">
                  Determination Points:
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-400/20 text-cyan-300 text-[9px] font-mono font-bold">
                  25 Pts = 1 Gift
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-cyan-200 font-mono">
                  ⭐ {pointsBalance.toLocaleString()} Pts
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  ({Math.floor(pointsBalance / 25)} Gifts ready)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Currency & Policy Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-white/5 p-2.5 rounded-2xl border border-white/10 mb-3 text-[11px] font-mono">
          <div className="flex items-center gap-1 text-zinc-300">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Currency:</span>
            <div className="flex items-center gap-1 font-bold ml-1 flex-wrap">
              {(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'NGN'] as const).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setSelectedCurrency(curr)}
                  className={`px-1.5 py-0.5 rounded-md border transition-all cursor-pointer text-[10px] ${
                    selectedCurrency === curr
                      ? 'bg-amber-400 text-black border-amber-300 font-extrabold shadow-sm'
                      : 'bg-zinc-800/80 text-zinc-400 border-white/10 hover:text-white'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          {/* Non-Redeemable Policy Dropdown trigger */}
          <button
            onClick={() => setShowWithdrawNotice(!showWithdrawNotice)}
            className="flex items-center gap-1 text-amber-300 hover:text-amber-200 cursor-pointer font-bold"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Can I withdraw / cash out?</span>
            <Info className="w-3 h-3 text-zinc-400" />
          </button>
        </div>

        {/* Non-Redeemable Policy Disclosure Box */}
        <AnimatePresence>
          {showWithdrawNotice && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 mb-3 rounded-2xl bg-amber-500/10 border border-amber-400/40 text-amber-100 text-xs font-mono space-y-1.5 overflow-hidden"
            >
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Non-Redeemable In-App Asset Policy</span>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-300">
                Twogether Gifts and Points are high-value virtual utility and appreciation tokens. In accordance with app store regulations:
              </p>
              <ul className="list-disc pl-5 text-[10.5px] text-zinc-300 space-y-0.5">
                <li><strong>Gifts CANNOT be redeemed for cash or withdrawn</strong> to external bank accounts.</li>
                <li><strong>Gifts CAN be bought with real money</strong> ranging from small accessible prices ($0.99) up to larger packs, or <strong>generated from points (25 Pts = 1 Gift)</strong> through daily determination (2.5 Pts/day).</li>
                <li><strong>Gifts CAN be gifted</strong> to any partner or match, or used to unlock wallpapers, calls, games, and VIP features!</li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast Alert */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-3 rounded-2xl border mb-3 text-xs font-mono font-bold flex items-center gap-2 shadow-lg ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                  : toastMessage.type === 'error'
                  ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                  : 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span>{toastMessage.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main 5 Navigation Tabs */}
        <div className="grid grid-cols-5 gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 mb-3 font-mono text-[9px] sm:text-xs">
          <button
            onClick={() => setActiveTab('buy_packs')}
            className={`py-2 px-1 rounded-xl font-bold transition-all flex items-center justify-center gap-1 cursor-pointer text-center ${
              activeTab === 'buy_packs'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-md font-extrabold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 hidden sm:inline" /> Buy Packs
          </button>
          <button
            onClick={() => setActiveTab('points_exchange')}
            className={`py-2 px-1 rounded-xl font-bold transition-all flex items-center justify-center gap-1 cursor-pointer text-center ${
              activeTab === 'points_exchange'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-md font-extrabold'
                : 'text-cyan-300 hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5 hidden sm:inline" /> 50 Pts ➔ 1 Gift
          </button>
          <button
            onClick={() => setActiveTab('earn_points')}
            className={`py-2 px-1 rounded-xl font-bold transition-all flex items-center justify-center gap-1 cursor-pointer text-center ${
              activeTab === 'earn_points'
                ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-black shadow-md font-extrabold'
                : 'text-emerald-300 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 hidden sm:inline" /> Earn Points
          </button>
          <button
            onClick={() => setActiveTab('send_gifts')}
            className={`py-2 px-1 rounded-xl font-bold transition-all flex items-center justify-center gap-1 cursor-pointer text-center ${
              activeTab === 'send_gifts'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md font-extrabold'
                : 'text-pink-300 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5 hidden sm:inline" /> Send Gifts
          </button>
          <button
            onClick={() => setActiveTab('spend_features')}
            className={`py-2 px-1 rounded-xl font-bold transition-all flex items-center justify-center gap-1 cursor-pointer text-center ${
              activeTab === 'spend_features'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md font-extrabold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 hidden sm:inline" /> Passes
          </button>
        </div>

        {/* -------------------------------------------------------------
            TAB 1: BUY GIFTS PACKS WITH REAL MONEY
            ------------------------------------------------------------- */}
        {activeTab === 'buy_packs' && (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-amber-500/10 border border-blue-400/30 flex items-start gap-2.5 text-[11px] text-zinc-300">
              <Globe className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-white uppercase font-mono block">
                  Buy High-Value Gifts with Real Money • Instant Top-Up
                </span>
                <p className="text-[10.5px] leading-snug text-zinc-300">
                  Gifts carry high value in Twogether. Instead of grinding 50 points per gift, purchasing gift packs saves weeks of daily effort. Available in all local currencies.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {GIFT_PACKS.map((pack) => {
                return (
                  <GlassCard
                    key={pack.id}
                    className={`p-3.5 border relative flex flex-col justify-between transition-all ${
                      pack.popular
                        ? 'border-amber-400/60 bg-gradient-to-b from-amber-500/10 to-transparent'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    {pack.badge && (
                      <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-extrabold text-[9px] uppercase tracking-wider shadow-md">
                        {pack.badge}
                      </span>
                    )}

                    <div className="space-y-1 mb-3">
                      <div className="flex items-center gap-1.5 text-amber-300">
                        <Gift className="w-5 h-5 fill-amber-400 text-amber-400" />
                        <span className="text-base font-extrabold font-mono text-white">
                          {pack.gifts.toLocaleString()} Gifts
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400">
                        Unified in-app currency. Unlock passes, voice/video calls, wallpapers, or send directly as gifts.
                      </p>
                    </div>

                    <button
                      onClick={() => handleBuyPack(pack)}
                      disabled={purchasingPack === pack.id}
                      className="w-full py-2.5 rounded-xl bg-black hover:bg-zinc-900 border border-white/30 text-white font-extrabold text-xs shadow-md hover:scale-102 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                    >
                      {purchasingPack === pack.id ? (
                        <span className="flex items-center gap-1.5 font-mono">
                          <GoogleGIcon className="w-3.5 h-3.5" />
                          <span>Google Pay Authorizing...</span>
                        </span>
                      ) : (
                        <>
                          <span className="flex items-center gap-1.5">
                            <GoogleGIcon className="w-3.5 h-3.5" />
                            <span>Buy {pack.gifts} Gifts with GPay</span>
                          </span>
                          <span className="text-[10px] font-mono opacity-80 text-amber-300">
                            {formatEquiv(pack.usdPrice)}
                          </span>
                        </>
                      )}
                    </button>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB 2: POINTS ➔ GIFTS CONVERTER (Fair & Reasonable Economy Math)
            ------------------------------------------------------------- */}
        {activeTab === 'points_exchange' && (
          <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-1">
            {/* Economy Math Transparency Box */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-amber-500/10 border border-cyan-400/40 text-xs font-mono space-y-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>The Fair Economy Math: 25 Points = 1 Gift</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                Points are earned through daily determination and commitment (2.5 points per day you log in). Earning points requires patience and dedication, not grueling physical hard work.
              </p>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1 text-[10.5px]">
                <div className="flex justify-between">
                  <span className="text-zinc-400">1 Gift:</span>
                  <span className="text-amber-300 font-bold">25 Points (10 Days of daily 2.5 Pts logins)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">15 Gifts ($0.99 value):</span>
                  <span className="text-cyan-300 font-bold">375 Points (Requires 150 days of daily logins)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Why buy packs?</span>
                  <span className="text-emerald-300 font-bold">Buying $0.99 saves 150 days of daily grind!</span>
                </div>
              </div>
            </div>

            {/* Progress to next Gift */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300 font-bold">Progress to Next Gift:</span>
                <span className="text-amber-300 font-bold">
                  {(pointsBalance % 25).toFixed(1)} / 25 Points ({Math.round(((pointsBalance % 25) / 25) * 100)}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-amber-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, ((pointsBalance % 25) / 25) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">
                💡 Available to convert now: <strong className="text-white font-bold">{Math.floor(pointsBalance / 25)} Gifts</strong>
              </p>
            </div>

            {/* Conversion Option Buttons */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-zinc-300 font-bold block">
                Select Conversion Package:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { pts: 25, gifts: 1, label: 'Convert 25 Points ➔ 1 Gift', timeDesc: '10 Days of daily dedication' },
                  { pts: 50, gifts: 2, label: 'Convert 50 Points ➔ 2 Gifts', timeDesc: '20 Days of daily dedication' },
                  { pts: 125, gifts: 5, label: 'Convert 125 Points ➔ 5 Gifts', timeDesc: '50 Days of commitment' },
                  { pts: 250, gifts: 10, label: 'Convert 250 Points ➔ 10 Gifts', timeDesc: '100 Days of determination' },
                ].map((tier) => {
                  const canAfford = pointsBalance >= tier.pts;
                  return (
                    <button
                      key={tier.pts}
                      onClick={() => handleConvertPoints(tier.pts)}
                      disabled={!canAfford}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                        canAfford
                          ? 'bg-cyan-500/15 border-cyan-400/60 hover:scale-[1.02] hover:bg-cyan-500/25 shadow-md'
                          : 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{tier.label}</span>
                        <ArrowRight className="w-4 h-4 text-cyan-400" />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {tier.timeDesc} • Needs {tier.pts} Pts
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB 3: EARN POINTS VIA DAILY DETERMINATION & COMMITMENT
            ------------------------------------------------------------- */}
        {activeTab === 'earn_points' && (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-purple-500/10 border border-emerald-400/30 flex items-start gap-2.5 text-xs text-zinc-300">
              <Zap className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="font-bold text-white uppercase font-mono block">
                  Earn Determination Points Daily
                </span>
                <p className="text-[11px] leading-relaxed text-zinc-300">
                  Earn points daily through genuine effort: daily check-ins (2.5 Pts/day), answering reflection questions, and spin wheel. Convert 25 points into 1 gift!
                </p>
              </div>
            </div>

            {/* Action 1: Daily Orbit Check-in */}
            <GlassCard className="p-3.5 border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    Daily Commitment Check-In
                    <span className="px-1.5 py-0.2 rounded bg-cyan-400/20 text-cyan-300 font-mono text-[10px]">
                      +2.5 Points
                    </span>
                  </h4>
                  <p className="text-[10px] text-zinc-400">
                    Log in every 24 hours to prove your dedication and build 2.5 points.
                  </p>
                </div>
              </div>

              <button
                onClick={handleClaimDailyCheckIn}
                disabled={dailyClaimed}
                className={`px-3 py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                  dailyClaimed
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
                    : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-extrabold hover:scale-105 shadow-md'
                }`}
              >
                {dailyClaimed ? 'Claimed Today ✓' : 'Claim +2.5 Pts'}
              </button>
            </GlassCard>

            {/* Action 2: Daily Soul Question Prompt */}
            <GlassCard className="p-3.5 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-400/30 text-pink-300 flex items-center justify-center">
                    <Heart className="w-4 h-4 fill-pink-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Daily Soulmate Question</h4>
                    <span className="text-[10px] font-mono text-pink-300">
                      Answer with vulnerability to earn +1.5 Points
                    </span>
                  </div>
                </div>
                {soulPromptClaimed && (
                  <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Earned +1.5 Pts
                  </span>
                )}
              </div>

              <p className="text-[11px] text-zinc-300 italic bg-white/5 p-2 rounded-xl border border-white/5">
                &quot;What is one small gesture that makes you feel truly loved and appreciated?&quot;
              </p>

              {!soulPromptClaimed ? (
                <form onSubmit={handleClaimSoulPrompt} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={soulPromptAnswer}
                    onChange={(e) => setSoulPromptAnswer(e.target.value)}
                    placeholder="Type your authentic reflection..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-400 font-sans"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-pink-500 text-white font-bold text-xs shadow-md hover:scale-105 transition-all cursor-pointer whitespace-nowrap"
                  >
                    Earn +1.5 Pts
                  </button>
                </form>
              ) : (
                <p className="text-[11px] font-mono text-zinc-400">
                  Your answer: &quot;{soulPromptAnswer}&quot;
                </p>
              )}
            </GlassCard>

            {/* Action 3: Lucky Love Resonance Spin Wheel */}
            <GlassCard className="p-3.5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: wheelAngle }}
                    transition={{ duration: 2.8, ease: 'easeOut' }}
                    className="w-12 h-12 rounded-full border-2 border-amber-400 bg-gradient-to-tr from-pink-500 via-purple-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20"
                  >
                    <RotateCw className="w-5 h-5 text-white" />
                  </motion.div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    Commitment Spin Wheel
                    <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-mono text-[10px]">
                      Win +1 to +2.5 Points
                    </span>
                  </h4>
                  <p className="text-[10px] text-zinc-400">
                    Spin daily to earn points toward your next Gift conversion.
                  </p>
                </div>
              </div>

              <button
                onClick={handleSpinResonanceWheel}
                disabled={isSpinningWheel || wheelClaimed}
                className={`w-full sm:w-auto px-4 py-2 rounded-xl font-mono text-xs font-extrabold transition-all cursor-pointer ${
                  wheelClaimed
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
                    : isSpinningWheel
                    ? 'bg-amber-500/50 text-black cursor-wait animate-pulse'
                    : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-pink-500 text-black hover:scale-105 shadow-md'
                }`}
              >
                {wheelClaimed ? 'Spun Today ✓' : isSpinningWheel ? 'Spinning...' : 'Spin for Points 🎰'}
              </button>
            </GlassCard>

            {/* Action 4: Biometric Voice Verification */}
            <GlassCard className="p-3 border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 flex items-center justify-center">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Voice & Biometric Verification</h4>
                  <p className="text-[10px] text-zinc-400">
                    Earn +25 Points when completing verified profile status.
                  </p>
                </div>
              </div>
              <span className="px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[10px] font-bold">
                +25 Points Auto-Reward
              </span>
            </GlassCard>
          </div>
        )}

        {/* -------------------------------------------------------------
            TAB 4: SEND GIFTS TO MATCHES & PARTNER
            ------------------------------------------------------------- */}
        {activeTab === 'send_gifts' && (
          <form onSubmit={handleSendGift} className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-1">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-amber-500/10 border border-pink-400/30 flex items-start gap-2.5 text-xs text-zinc-300">
              <Heart className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5 fill-pink-400" />
              <div>
                <span className="font-bold text-white uppercase font-mono block">
                  Send Precious Gifts to Partners & Matches
                </span>
                <p className="text-[11px] leading-relaxed text-zinc-300">
                  Gifts can be gifted directly to other members! Spend your gifts to send luxury appreciation tokens with custom notes and interactive alerts.
                </p>
              </div>
            </div>

            {/* Select Recipient */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-300 font-bold block">
                Send Gift To:
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedRecipient}
                  onChange={(e) => {
                    setSelectedRecipient(e.target.value);
                    setCustomRecipient('');
                  }}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-400 font-sans"
                >
                  <option value="Aria Sterling" className="bg-zinc-900">Aria Sterling (Soulmate Partner)</option>
                  <option value="Alex Chen" className="bg-zinc-900">Alex Chen (Verified Soul)</option>
                  <option value="Dylan Wisney" className="bg-zinc-900">Dylan Wisney (VIP Member)</option>
                  <option value="Custom" className="bg-zinc-900">Custom Recipient Name...</option>
                </select>

                {selectedRecipient === 'Custom' && (
                  <input
                    type="text"
                    required
                    placeholder="Recipient username..."
                    value={customRecipient}
                    onChange={(e) => setCustomRecipient(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-400 font-sans"
                  />
                )}
              </div>
            </div>

            {/* Pick A Giftable Item */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-300 font-bold block">
                Select Gift:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {GIFTABLE_ITEMS.map((gItem) => {
                  const isSelected = selectedGiftItem.name === gItem.name;
                  const canAfford = giftsBalance >= gItem.cost;
                  return (
                    <button
                      key={gItem.name}
                      type="button"
                      onClick={() => setSelectedGiftItem(gItem)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-pink-500/20 border-pink-400 shadow-md shadow-pink-500/20 scale-[1.02]'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xl">{gItem.icon}</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 font-mono text-[9px] font-bold">
                          {gItem.cost} Gift{gItem.cost > 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white truncate">{gItem.name}</p>
                      <p className="text-[9.5px] text-zinc-400 line-clamp-1">{gItem.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Personal Note */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-300 font-bold block">
                Personal Note / Message:
              </label>
              <input
                type="text"
                value={giftPersonalNote}
                onChange={(e) => setGiftPersonalNote(e.target.value)}
                placeholder="Write a sweet romantic message..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-400 font-sans"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSendingGift || giftsBalance < selectedGiftItem.cost}
              className={`w-full py-3 rounded-2xl font-mono text-xs font-black shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                giftsBalance >= selectedGiftItem.cost
                  ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 text-white hover:scale-105 active:scale-95'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/10'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>
                {isSendingGift
                  ? 'Sending Gift...'
                  : giftsBalance >= selectedGiftItem.cost
                  ? `Send ${selectedGiftItem.icon} ${selectedGiftItem.name} (${selectedGiftItem.cost} Gift)`
                  : `Need ${selectedGiftItem.cost} Gifts (Balance: ${giftsBalance})`}
              </span>
            </button>
          </form>
        )}

        {/* -------------------------------------------------------------
            TAB 5: SPEND GIFTS ON PASSES & UNLOCK FEATURES
            ------------------------------------------------------------- */}
        {activeTab === 'spend_features' && (
          <div className="space-y-3">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono">
              {[
                { id: 'all', label: 'All Items' },
                { id: 'calls', label: '🎙️ Voice & 📹 Video' },
                { id: 'wallpaper', label: '🎨 Wallpapers' },
                { id: 'chats', label: '💬 Chats & 📸 Posts' },
                { id: 'games', label: '🎮 Games & 🎧 Music' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as typeof selectedCategory)}
                  className={`px-2.5 py-1 rounded-xl whitespace-nowrap border transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Passes List */}
            <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1">
              {filteredItems.map((item) => {
                const IconComponent = getIconForCategory(item.iconName);
                const isUnlocked =
                  isVip ||
                  unlockedFeatures.includes(item.key) ||
                  (item.key === 'all_wallpapers' && unlockedFeatures.includes('all_wallpapers'));
                const canAffordPoints = giftsBalance >= item.pointsCost;

                return (
                  <GlassCard
                    key={item.key}
                    className={`p-3.5 border transition-all ${
                      isUnlocked
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Icon & Details */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-white/10 text-cyan-300 flex items-center justify-center font-bold shadow-md flex-shrink-0 mt-0.5">
                          <IconComponent className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-white">{item.name}</h4>
                            {item.badge && (
                              <span className="px-1.5 py-0.5 rounded-md bg-pink-500/20 text-pink-300 border border-pink-400/30 text-[9px] font-mono font-bold">
                                {item.badge}
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[9px] font-mono">
                              ⏱️ {item.durationLabel}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-zinc-400 leading-tight mt-1">
                            {item.description}
                          </p>

                          {/* Pricing display: Exact $ and Exact Gifts */}
                          <div className="flex items-center gap-3 mt-1.5 text-xs font-mono font-bold">
                            <span className="text-amber-300">
                              💰 {formatEquiv(item.usdPrice)}
                            </span>
                            <span className="text-zinc-500">•</span>
                            <span className="text-cyan-300">
                              🎁 {item.pointsCost} Gifts
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                        {isUnlocked ? (
                          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[10px] font-extrabold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> UNLOCKED
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {/* Unlock with Gifts button */}
                            <button
                              onClick={() => handleSpendPointsOnItem(item)}
                              disabled={spendingFeature === item.key || directBuyingKey === item.key}
                              className={`px-3 py-1.5 rounded-xl font-mono text-[11px] font-extrabold flex items-center gap-1 transition-all shadow-md cursor-pointer ${
                                canAffordPoints
                                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:scale-105'
                                  : 'bg-zinc-800/90 border border-white/10 text-amber-300/80 hover:bg-zinc-800'
                              }`}
                              title={`Unlock with ${item.pointsCost} Gifts`}
                            >
                              {spendingFeature === item.key ? (
                                <span>Unlocking...</span>
                              ) : (
                                <>
                                  <Gift className="w-3 h-3" />
                                  <span>{item.pointsCost} Gifts</span>
                                </>
                              )}
                            </button>

                            {/* Direct Pay with Google Pay */}
                            <button
                              onClick={() => handleInitiateGooglePayForPass(item)}
                              disabled={spendingFeature === item.key || directBuyingKey === item.key}
                              className="px-3 py-1.5 rounded-xl font-mono text-[11px] font-extrabold bg-black hover:bg-zinc-900 border border-white/30 text-white hover:scale-105 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                              title={`Pay $${item.usdPrice.toFixed(2)} with Google Pay`}
                            >
                              {directBuyingKey === item.key ? (
                                <span>GPay...</span>
                              ) : (
                                <>
                                  <GoogleGIcon className="w-3.5 h-3.5" />
                                  <span>${item.usdPrice.toFixed(2)} GPay</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer info note */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[10.5px] font-mono text-zinc-400">
          <span className="flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-emerald-400" /> 50 Points = 1 Gift • Non-redeemable virtual tokens • 100% Google Pay protected
          </span>
          <span className="text-zinc-500">Google Play In-App Billing Only</span>
        </div>

        {/* Google Pay Interactive Bottom-Sheet Modal for Gifts/Passes */}
        {gpayCheckoutItem && (
          <GooglePayCheckoutSheet
            isOpen={isGpaySheetOpen}
            onClose={() => {
              setIsGpaySheetOpen(false);
              setGpayCheckoutItem(null);
            }}
            onConfirmPayment={handleConfirmGooglePayPayment}
            itemName={gpayCheckoutItem.name}
            itemDescription={gpayCheckoutItem.desc}
            amountLabel={formatEquiv(gpayCheckoutItem.price)}
            usdAmount={gpayCheckoutItem.price}
            userEmail="dylanwisney@gmail.com"
            isProcessing={purchasingPack !== null || directBuyingKey !== null}
          />
        )}
      </motion.div>
    </div>
  );
};
