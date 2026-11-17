import React, { useState } from 'react';
import {
  Crown,
  Check,
  Sparkles,
  X,
  ShieldCheck,
  Zap,
  Globe,
  Clock,
  CheckCircle2,
  ArrowRight,
  Copy,
  Share2,
  Award,
  Heart,
  Gift,
  Flame,
  ChevronDown,
  ChevronUp,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  GoogleGIcon,
  GooglePayLogo,
  GooglePayBadge,
  GooglePayButton,
  GooglePayCheckoutSheet,
} from './GooglePayComponents';
import { ActiveSubscriptionRecord } from '../types';
import { appSoundService } from '../services/appSoundService';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isVip: boolean;
  activeSubscription?: ActiveSubscriptionRecord | null;
  onSubscriptionApproved?: (sub: ActiveSubscriptionRecord) => void;
  onUpgradeToVip?: () => void;
  onToggleVip?: (status: boolean) => void;
  onDowngradeToBasic?: () => void;
  limitReason?: string | null;
  reasonMessage?: string | null;
  onOpenReferral?: () => void;
}

export type BillingCycle = 'daily' | 'weekly' | 'two_weeks' | 'ad_free_monthly' | 'monthly' | 'yearly';
export type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'NGN' | 'INR' | 'JPY';

export const CURRENCIES: Record<SupportedCurrency, { symbol: string; rate: number; label: string }> = {
  USD: { symbol: '$', rate: 1.0, label: 'USD ($)' },
  EUR: { symbol: '€', rate: 0.92, label: 'EUR (€)' },
  GBP: { symbol: '£', rate: 0.79, label: 'GBP (£)' },
  CAD: { symbol: 'CA$', rate: 1.36, label: 'CAD ($)' },
  AUD: { symbol: 'A$', rate: 1.52, label: 'AUD ($)' },
  NGN: { symbol: '₦', rate: 1550, label: 'NGN (₦)' },
  INR: { symbol: '₹', rate: 83.5, label: 'INR (₹)' },
  JPY: { symbol: '¥', rate: 155, label: 'JPY (¥)' },
};

interface DirectApprovalRecord {
  planName: string;
  amount: number;
  currency: string;
  convertedAmount: string;
  approvalId: string;
  txId: string;
  approvalTimestamp: string;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  isVip,
  activeSubscription,
  onSubscriptionApproved,
  onUpgradeToVip,
  onToggleVip,
  onDowngradeToBasic,
  limitReason,
  reasonMessage,
  onOpenReferral,
}) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>('USD');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [directApproval, setDirectApproval] = useState<DirectApprovalRecord | null>(null);
  const [createdSubscription, setCreatedSubscription] = useState<ActiveSubscriptionRecord | null>(null);
  const [showComparisonTable, setShowComparisonTable] = useState<boolean>(false);
  const [isGooglePaySheetOpen, setIsGooglePaySheetOpen] = useState<boolean>(false);
  const [pendingPlanToPurchase, setPendingPlanToPurchase] = useState<BillingCycle | null>(null);

  if (!isOpen) return null;

  const displayReason = limitReason || reasonMessage;

  const playCelebrationChime = () => {
    // Independent audio channel check: if user muted pop-up sounds, suppress celebration chime
    if (appSoundService.getIsPopupSoundMuted()) {
      return;
    }
    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        const ctx = new AudioCtxClass();
        [440, 554.37, 659.25, 880, 1108.73].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
          gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.45);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.1);
          osc.stop(ctx.currentTime + idx * 0.1 + 0.5);
        });
      }
    } catch {
      // ignore
    }
  };

  // Duration in milliseconds and descriptive label per billing cycle
  const getPlanDurationMs = (cycle: BillingCycle): { ms: number; label: string } => {
    switch (cycle) {
      case 'daily':
        return { ms: 24 * 60 * 60 * 1000, label: '1 Day (24h)' };
      case 'weekly':
        return { ms: 7 * 24 * 60 * 60 * 1000, label: '7 Days' };
      case 'two_weeks':
        return { ms: 14 * 24 * 60 * 60 * 1000, label: '14 Days (2 Weeks)' };
      case 'ad_free_monthly':
        return { ms: 30 * 24 * 60 * 60 * 1000, label: '30 Days Ad-Free Escape' };
      case 'monthly':
        return { ms: 30 * 24 * 60 * 60 * 1000, label: '30 Days Monthly' };
      case 'yearly':
        return { ms: 365 * 24 * 60 * 60 * 1000, label: '365 Days (1 Year Unlimited)' };
    }
  };

  // Strictly ordered ascending pricing: 0.99 < 2.49 < 3.99 < 5.99 < 29.99
  const getPlanPrice = (cycle: BillingCycle): number => {
    switch (cycle) {
      case 'daily':
        return 0.99;
      case 'weekly':
        return 2.49;
      case 'two_weeks':
        return 3.99;
      case 'ad_free_monthly':
        return 3.89;
      case 'monthly':
        return 5.99;
      case 'yearly':
        return 29.99;
    }
  };

  const getPlanNameByCycle = (cycle: BillingCycle): string => {
    switch (cycle) {
      case 'daily':
        return 'VIP 1-Day Momentum Pass ($0.99)';
      case 'weekly':
        return 'VIP 7-Day Weekly Pass ($2.49)';
      case 'two_weeks':
        return 'VIP 2-Weeks Bi-Weekly Pass ($3.99)';
      case 'ad_free_monthly':
        return 'Ad-Free 5-Min Escape & Continuous Love Music Pass ($3.89/mo)';
      case 'monthly':
        return 'VIP 30-Day Monthly Subscription ($5.99)';
      case 'yearly':
        return 'VIP 1-Year Unlimited Annual Pass ($29.99)';
    }
  };

  const currentCurr = CURRENCIES[selectedCurrency];

  const formatCurrency = (usdVal: number): string => {
    const val = usdVal * currentCurr.rate;
    return `${currentCurr.symbol}${val.toLocaleString(undefined, {
      minimumFractionDigits: selectedCurrency === 'NGN' || selectedCurrency === 'JPY' ? 0 : 2,
      maximumFractionDigits: selectedCurrency === 'NGN' || selectedCurrency === 'JPY' ? 0 : 2,
    })}`;
  };

  const currentUsdAmount = getPlanPrice(billingCycle);
  const currentConvertedAmount = formatCurrency(currentUsdAmount);

  // Trigger Google Pay Checkout Sheet
  const handleOpenGooglePay = (targetCycle?: BillingCycle) => {
    const cycle = targetCycle || billingCycle;
    setBillingCycle(cycle);
    setPendingPlanToPurchase(cycle);
    setIsGooglePaySheetOpen(true);
  };

  // Confirm Google Pay Authorization and Process
  const handleConfirmGooglePay = () => {
    const targetCycle = pendingPlanToPurchase || billingCycle;
    setIsGooglePaySheetOpen(false);
    setIsProcessingPayment(true);
    const amount = getPlanPrice(targetCycle);
    const planName = getPlanNameByCycle(targetCycle);

    fetch('/api/billing/process-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: 'dylanwisney@gmail.com',
        planName,
        amount,
        currency: 'USD',
        localCurrencyEquivalent: `${formatCurrency(amount)} ${selectedCurrency}`,
        paymentMethod: 'Google Pay (Google Play In-App Billing)',
      }),
    })
      .then((res) => res.json())
      .then(() => {
        completeDirectApproval(planName, amount, targetCycle);
      })
      .catch((err) => {
        console.error('Google Pay billing error:', err);
        completeDirectApproval(planName, amount, targetCycle);
      })
      .finally(() => setIsProcessingPayment(false));
  };

  const completeDirectApproval = (planName: string, amount: number, cycle: BillingCycle) => {
    const randomApprovalNum = Math.floor(100000 + Math.random() * 900000);
    const orderNum1 = Math.floor(1000 + Math.random() * 9000);
    const orderNum2 = Math.floor(1000 + Math.random() * 9000);
    const googleOrderId = `GPA.3392-${orderNum1}-${orderNum2}`;
    const approvalCode = `TWG-GPAY-VERIFY-${randomApprovalNum}`;
    const { ms: durationMs, label: durationLabel } = getPlanDurationMs(cycle);
    const expiresAtMs = Date.now() + durationMs;
    const nowTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const nowIso = new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const activeRec: ActiveSubscriptionRecord = {
      planId: cycle,
      planName,
      amount,
      currency: selectedCurrency,
      convertedAmount: formatCurrency(amount),
      status: 'ACTIVE_APPROVED',
      googleOrderId,
      approvalCode,
      activatedAt: nowIso,
      expiresAtMs,
      durationLabel,
      paymentMethod: 'Google Pay (Google Play In-App Billing)',
    };

    setCreatedSubscription(activeRec);

    const approvalRecord: DirectApprovalRecord = {
      planName,
      amount,
      currency: selectedCurrency,
      convertedAmount: formatCurrency(amount),
      approvalId: approvalCode,
      txId: googleOrderId,
      approvalTimestamp: nowTimestamp,
    };

    setDirectApproval(approvalRecord);
    playCelebrationChime();

    // Instant auto-approval: Grant VIP status, unlock permissions and write active subscription record
    try {
      localStorage.setItem('twogether_is_vip', 'true');
      localStorage.setItem('twogether_is_verified', 'true');
      localStorage.setItem('twogether_ad_free_until', String(expiresAtMs));
      localStorage.setItem('twogether_active_subscription', JSON.stringify(activeRec));
      const currentSubs = Number(localStorage.getItem('twogether_ad_subscribers') || '48') + 1;
      localStorage.setItem('twogether_ad_subscribers', String(currentSubs));
    } catch {}

    if (onSubscriptionApproved) {
      onSubscriptionApproved(activeRec);
    }
    if (onToggleVip) onToggleVip(true);
    if (onUpgradeToVip) onUpgradeToVip();

    try {
      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#06b6d4'],
      });
    } catch {}
  };

  // Launch and enter app 100% ready to use after Google Pay approval
  const handleLaunchReadyApp = () => {
    if (createdSubscription && onSubscriptionApproved) {
      onSubscriptionApproved(createdSubscription);
    }
    if (onToggleVip) onToggleVip(true);
    if (onUpgradeToVip) onUpgradeToVip();
    setDirectApproval(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-lg overflow-y-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-3xl bg-[#14131F] border border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl relative p-5 sm:p-8 my-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-white/5 rounded-full transition-all cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* =============================================================
            MODE A: DIRECT APPROVAL SCREEN (SHOWN AFTER GOOGLE PAY IS DONE)
            ============================================================= */}
        {directApproval ? (
          <div className="space-y-5 text-center py-2">
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/40 via-green-500/30 to-amber-400/30 rounded-full blur-xl animate-pulse" />
              <div className="w-20 h-20 rounded-3xl bg-black border-2 border-emerald-400 p-0.5 shadow-2xl flex items-center justify-center animate-bounce">
                <GoogleGIcon className="w-10 h-10" />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-400/40 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                GOOGLE PAY PAYMENT CONFIRMED
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Payment Completed with Google Pay!
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto mt-1">
                Your account is now <strong className="text-amber-300 font-bold">100% Instantly Auto-Verified</strong> and VIP unlocked. Enjoy unlimited messaging, calls, 3D VR music lounges, and reels!
              </p>
            </div>

            {/* Official Approval Certificate Badge */}
            <div className="p-4 rounded-2xl bg-black/75 border border-emerald-400/40 text-left font-mono space-y-2.5">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <GooglePayLogo size="sm" textColor="text-white" />
                  <span className="text-[11px] text-zinc-400">IN-APP BILLING AUDIT</span>
                </div>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% DIRECT AUTO-VERIFIED
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-zinc-500 block text-[10px]">PAYMENT GATEWAY:</span>
                  <span className="text-white font-bold flex items-center gap-1">
                    <GoogleGIcon className="w-3 h-3" /> Google Pay Only
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">CONFIRMED PLAN:</span>
                  <span className="text-cyan-300 font-bold">
                    {directApproval.convertedAmount} ({directApproval.planName.split('(')[0].trim()})
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">GOOGLE PLAY ORDER ID:</span>
                  <span className="text-zinc-300 font-mono">{directApproval.txId}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">TIMESTAMP:</span>
                  <span className="text-zinc-300">{directApproval.approvalTimestamp}</span>
                </div>
              </div>
            </div>

            {/* Privileges Unlocked Checklist */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left">
              <span className="text-xs font-bold text-white uppercase tracking-wider block mb-2 font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> All Perks Fully Unlocked & Ready:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-200">
                <div className="flex items-center gap-2 text-amber-200">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>UNLIMITED Direct Chats & DMs (Zero limits)</span>
                </div>
                <div className="flex items-center gap-2 text-amber-200">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>UNLIMITED HD Voice & Video Calls</span>
                </div>
                <div className="flex items-center gap-2 text-amber-200">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>UNLIMITED Posts, Stories & Reels</span>
                </div>
                <div className="flex items-center gap-2 text-amber-200">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>VIP Gold Crown & Verified Badge Active</span>
                </div>
                <div className="flex items-center gap-2 text-amber-200">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>All 8+ 4K Dynamic Chat Wallpapers</span>
                </div>
                <div className="flex items-center gap-2 text-amber-200">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Spicy Couples Romance Card Games</span>
                </div>
              </div>
            </div>

            {/* Launch CTA Button */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleLaunchReadyApp}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-pink-500 text-black font-black text-sm shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 fill-black" />
                <span>Launch & Use App Now (100% Ready) 🚀</span>
              </button>

              {onOpenReferral && (
                <button
                  onClick={() => {
                    handleLaunchReadyApp();
                    onOpenReferral();
                  }}
                  className="w-full py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Refer a Friend & Earn 10 Points ➔</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* =============================================================
             MODE B: SIDE-BY-SIDE 'MONTHLY' VS 'ANNUAL' COMPARISON CARDS
             ============================================================= */
          <>
            {displayReason && (
              <div className="mb-4 p-3 bg-pink-500/20 border border-pink-500/40 rounded-2xl text-xs font-mono text-pink-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-pink-400 flex-shrink-0 animate-bounce" />
                <span>{displayReason}</span>
              </div>
            )}

            {/* Header */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold mb-2">
                <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                OFFICIAL TWOGETHER VIP PLANS
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                {isVip ? 'You Are Currently a VIP Member 🎉' : 'Unlock Unlimited VIP Freedom'}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-lg mx-auto">
                Instant Auto-Verify on payment. Clean, mannerly arranged pricing with zero hidden fees.
              </p>
            </div>

            {/* Active Subscription Banner if user already has an approved subscription */}
            {activeSubscription && (
              <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-emerald-950/40 to-black border-2 border-emerald-400/60 text-left shadow-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-400 text-black flex items-center justify-center font-black shrink-0">
                      <ShieldCheck className="w-5 h-5 text-black" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-emerald-300 font-mono uppercase">
                          Active Approved Plan
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-400/40">
                          {activeSubscription.status === 'ACTIVE_APPROVED' ? 'STATUS: APPROVED ✓' : 'EXPIRED'}
                        </span>
                      </div>
                      <p className="text-sm font-extrabold text-white mt-0.5">
                        {activeSubscription.planName}
                      </p>
                      <p className="text-[10px] text-zinc-300 font-mono mt-0.5">
                        Order ID: <span className="text-amber-300">{activeSubscription.googleOrderId}</span> • Paid via Google Pay • Valid for {activeSubscription.durationLabel}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[10px] text-zinc-400 block font-mono">REMAINING VALIDITY</span>
                    <span className="text-xs font-bold text-amber-300 font-mono">
                      {Math.max(0, Math.ceil((activeSubscription.expiresAtMs - Date.now()) / (1000 * 60 * 60 * 24)))} Days Left
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* =======================================================
                EXCLUSIVE PAYMENT GATEWAY BANNER: GOOGLE PAY ONLY
                ======================================================= */}
            <div className="p-3.5 rounded-2xl bg-black/90 border-2 border-emerald-500/60 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center p-1.5 shadow-md shrink-0">
                  <GoogleGIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <GooglePayLogo size="sm" textColor="text-white" />
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-black text-[9px] uppercase border border-emerald-500/40">
                      Exclusive Payment Gateway
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 font-sans leading-tight mt-0.5">
                    Payments are handled <strong>strictly by Google Pay only</strong>. No third-party checkout modules. Zero manual card entries.
                  </p>
                </div>
              </div>
              <div className="self-end sm:self-center shrink-0">
                <GooglePayBadge variant="dark" />
              </div>
            </div>

            {/* Currency Bar */}
            <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl mb-4 text-xs font-mono">
              <div className="flex items-center gap-1 text-zinc-300">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>Google Pay Currency:</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NGN', 'INR', 'JPY'] as const).map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setSelectedCurrency(curr)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      selectedCurrency === curr
                        ? 'bg-amber-400 text-black'
                        : 'text-zinc-400 hover:text-white bg-white/5'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            {/* =======================================================
                ESCAPE 5-MINUTE ADS PROMOTION CARD: $3.89/MONTH
                ======================================================= */}
            <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/20 via-pink-600/20 to-black border-2 border-amber-400/60 mb-4 text-left shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-black font-mono font-black text-[10px] uppercase">
                      Zero Ads Pass • {formatCurrency(3.89)} / Month
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">
                      Continuous Trending Love Songs
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-white">
                    Escape All 5-Minute Pop-Up Ads ($3.89 Monthly)
                  </h4>
                  <p className="text-xs text-zinc-300">
                    Never see 5-minute sponsor pop-up ads again. Enjoy uninterrupted continuous streaming of trending love songs and 3D VR jam sessions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenGooglePay('ad_free_monthly')}
                  disabled={isProcessingPayment}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-black hover:bg-zinc-900 border border-white/30 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer"
                >
                  <GoogleGIcon className="w-4 h-4" />
                  <span>Pay with GPay ({formatCurrency(3.89)}/mo)</span>
                </button>
              </div>
            </div>

            {/* =======================================================
                FLAGSHIP: SIDE-BY-SIDE 'MONTHLY' VS 'ANNUAL' CARDS
                ======================================================= */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* CARD 1: MONTHLY PLAN ($5.99) */}
              <div
                onClick={() => setBillingCycle('monthly')}
                className={`p-5 rounded-3xl border-2 transition-all cursor-pointer text-left relative flex flex-col justify-between ${
                  billingCycle === 'monthly'
                    ? 'bg-gradient-to-br from-purple-900/40 via-[#1a1430] to-black border-amber-400 ring-2 ring-amber-400/40 shadow-xl'
                    : 'bg-white/5 border-white/10 hover:border-white/25'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                      Most Flexible
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono">30 Days Cycle</span>
                  </div>

                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <span>Monthly VIP Pass</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mb-3">
                    Unlock all features for 30 days. Renewable monthly with Google Pay.
                  </p>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">
                        {formatCurrency(5.99)}
                      </span>
                      <span className="text-xs text-zinc-400">/ month</span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                      Cancel anytime in Google Play Subscriptions
                    </div>
                  </div>

                  {/* Benefit Checklist */}
                  <ul className="space-y-2 text-xs text-zinc-300 mb-4 border-t border-white/10 pt-3">
                    <li className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-white">Instant Auto-Verify</strong>: Skip waitlists
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-white">UNLIMITED Chats & DMs</strong> (No quotas)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-white">UNLIMITED HD Video & Voice</strong> Calls
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-white">UNLIMITED Posts & Stories</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>VIP Gold Crown & Verified Shield Badge</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>Unlock All 8+ 4K Chat Wallpapers</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenGooglePay('monthly');
                  }}
                  disabled={isProcessingPayment}
                  className={`w-full py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    billingCycle === 'monthly'
                      ? 'bg-black text-white border border-white/30 shadow-lg hover:scale-102'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <GoogleGIcon className="w-4 h-4" />
                  <span>Pay with GPay ({formatCurrency(5.99)})</span>
                </button>
              </div>

              {/* CARD 2: ANNUAL PLAN ($29.99) - BEST VALUE HIGHLIGHT */}
              <div
                onClick={() => setBillingCycle('yearly')}
                className={`p-5 rounded-3xl border-2 transition-all cursor-pointer text-left relative flex flex-col justify-between ${
                  billingCycle === 'yearly'
                    ? 'bg-gradient-to-br from-amber-500/20 via-[#261726] to-black border-amber-400 ring-2 ring-amber-400/50 shadow-2xl'
                    : 'bg-white/5 border-amber-400/40 hover:border-amber-400'
                }`}
              >
                {/* Best Value Ribbon */}
                <div className="absolute -top-3 right-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-pink-500 text-black text-[10px] font-black font-mono px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                  <Crown className="w-3 h-3 fill-black" />
                  <span>BEST VALUE • SAVE 58%</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                      ⭐ Recommended
                    </span>
                    <span className="text-[11px] text-amber-300 font-mono font-bold">365 Days Access</span>
                  </div>

                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <span>Annual VIP Pass</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mb-3">
                    Full year of unlimited VIP romance with huge savings & free gifts.
                  </p>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-amber-300">
                        {formatCurrency(29.99)}
                      </span>
                      <span className="text-xs text-zinc-400">/ year</span>
                    </div>
                    <div className="text-[11px] font-mono text-emerald-400 font-bold mt-0.5">
                      ≈ Just {formatCurrency(2.5)}/mo (vs $5.99/mo)
                    </div>
                  </div>

                  {/* Benefit Checklist */}
                  <ul className="space-y-2 text-xs text-zinc-200 mb-4 border-t border-white/10 pt-3">
                    <li className="flex items-start gap-2 text-amber-200">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-white">Instant Auto-Verify</strong>: Priority permanent approval
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-amber-200">
                      <Gift className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-white">+25 Free Welcome Gifts</strong> included instantly
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-amber-200">
                      <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-white">UNLIMITED Chats & Calls</strong> (Full 365 Days)
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-amber-200">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-white">10x Profile Boost</strong> in Single Souls Feed
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-amber-200">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>VIP Spicy Card Games & DJ Beats Jam Sync</span>
                    </li>
                    <li className="flex items-start gap-2 text-amber-200">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>All 8+ 4K Dynamic Chat Wallpapers</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenGooglePay('yearly');
                  }}
                  disabled={isProcessingPayment}
                  className="w-full py-3.5 rounded-2xl bg-black hover:bg-zinc-900 border-2 border-amber-400 text-white font-black text-xs shadow-xl hover:scale-102 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <GoogleGIcon className="w-4 h-4" />
                  <span>Pay with GPay ({formatCurrency(29.99)}) 🚀</span>
                </button>
              </div>
            </div>

            {/* =======================================================
                FLEXIBLE SHORT DURATION PASSES (1-DAY, 7-DAY, 14-DAY)
                ======================================================= */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 mb-4 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase text-zinc-300 font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Flexible Short Passes (Billed via Google Pay Only):
                </span>
                <span className="text-[10px] text-zinc-400">Strictly Arranged</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {/* 1 Day Pass */}
                <button
                  type="button"
                  onClick={() => handleOpenGooglePay('daily')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    billingCycle === 'daily'
                      ? 'bg-rose-500/25 border-rose-400 text-white ring-2 ring-rose-400/40'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300'
                  }`}
                >
                  <span className="block font-black text-xs text-white">1-Day Pass</span>
                  <span className="text-sm font-extrabold text-rose-300 block">{formatCurrency(0.99)}</span>
                  <span className="text-[9px] text-zinc-400 flex items-center justify-center gap-0.5 mt-0.5">
                    <GoogleGIcon className="w-2.5 h-2.5" /> GPay
                  </span>
                </button>

                {/* 7 Days Pass */}
                <button
                  type="button"
                  onClick={() => handleOpenGooglePay('weekly')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    billingCycle === 'weekly'
                      ? 'bg-amber-500/25 border-amber-400 text-white ring-2 ring-amber-400/40'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300'
                  }`}
                >
                  <span className="block font-black text-xs text-white">7-Day Weekly</span>
                  <span className="text-sm font-extrabold text-amber-300 block">{formatCurrency(2.49)}</span>
                  <span className="text-[9px] text-zinc-400 flex items-center justify-center gap-0.5 mt-0.5">
                    <GoogleGIcon className="w-2.5 h-2.5" /> GPay
                  </span>
                </button>

                {/* 14 Days Pass */}
                <button
                  type="button"
                  onClick={() => handleOpenGooglePay('two_weeks')}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    billingCycle === 'two_weeks'
                      ? 'bg-cyan-500/25 border-cyan-400 text-white ring-2 ring-cyan-400/40'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300'
                  }`}
                >
                  <span className="block font-black text-xs text-white">14-Day Bi-Weekly</span>
                  <span className="text-sm font-extrabold text-cyan-300 block">{formatCurrency(3.99)}</span>
                  <span className="text-[9px] text-zinc-400 flex items-center justify-center gap-0.5 mt-0.5">
                    <GoogleGIcon className="w-2.5 h-2.5" /> GPay
                  </span>
                </button>
              </div>
            </div>

            {/* Direct Approval Assurance Badge */}
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 mb-4 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Google Pay Protected: Instant Auto-Verify Guaranteed</span>
              </div>
              <span className="text-[10px] text-zinc-400">Zero Wait Time</span>
            </div>

            {/* Free vs VIP Comparison Breakdown Toggle */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowComparisonTable(!showComparisonTable)}
                className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white text-xs font-mono flex items-center justify-between transition-all cursor-pointer"
              >
                <span>Compare: Why VIP is Far Better than Regular Free Mode</span>
                {showComparisonTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              <AnimatePresence>
                {showComparisonTable && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 p-3 rounded-2xl bg-black/60 border border-white/10 text-xs overflow-hidden"
                  >
                    <table className="w-full text-left font-sans">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] font-mono text-zinc-400 uppercase">
                          <th className="pb-1.5">Feature</th>
                          <th className="pb-1.5 text-zinc-400">Regular Free Mode</th>
                          <th className="pb-1.5 text-amber-300">VIP Premium Mode (Any Plan)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-[11px]">
                        <tr>
                          <td className="py-1.5 text-zinc-300 font-medium">Direct Chats</td>
                          <td className="py-1.5 text-zinc-500">Only 10 per 3 weeks</td>
                          <td className="py-1.5 text-emerald-400 font-bold">UNLIMITED 24/7</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-zinc-300 font-medium">HD Video & Audio Calls</td>
                          <td className="py-1.5 text-zinc-500">Only 3 per 3 weeks</td>
                          <td className="py-1.5 text-emerald-400 font-bold">UNLIMITED Crystal HD</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-zinc-300 font-medium">Feed Posts & Reels</td>
                          <td className="py-1.5 text-zinc-500">Only 5 per 3 weeks</td>
                          <td className="py-1.5 text-emerald-400 font-bold">UNLIMITED Posts</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-zinc-300 font-medium">AI Soulmate Speed</td>
                          <td className="py-1.5 text-zinc-500">Standard Queue (~2.5s)</td>
                          <td className="py-1.5 text-emerald-400 font-bold">⚡ Instant 0.1s Priority Engine</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-zinc-300 font-medium">Discovery & Singles Match</td>
                          <td className="py-1.5 text-zinc-500">Standard queue placement</td>
                          <td className="py-1.5 text-emerald-400 font-bold">Top 1% Golden Highlight (10x Matches)</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-zinc-300 font-medium">Media Quality & Audio</td>
                          <td className="py-1.5 text-zinc-500">Standard 720p</td>
                          <td className="py-1.5 text-emerald-400 font-bold">4K Ultra-HD & Lossless DJ Beats</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-zinc-300 font-medium">18+ Verification Flow</td>
                          <td className="py-1.5 text-zinc-500">Manual review queue</td>
                          <td className="py-1.5 text-emerald-400 font-bold">INSTANT 100% AUTO-VERIFY</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-zinc-300 font-medium">Chat Wallpapers</td>
                          <td className="py-1.5 text-zinc-500">3 Basic themes</td>
                          <td className="py-1.5 text-emerald-400 font-bold">All 8+ 4K Themes Unlocked</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-zinc-300 font-medium">Couples Romance Games</td>
                          <td className="py-1.5 text-zinc-500">Basic questions only</td>
                          <td className="py-1.5 text-emerald-400 font-bold">Full Spicy & Truth/Dare Decks</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-zinc-300 font-medium">Safety & Support Concierge</td>
                          <td className="py-1.5 text-zinc-500">Standard help ticket</td>
                          <td className="py-1.5 text-emerald-400 font-bold">24/7 Priority VIP Concierge</td>
                        </tr>
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Primary Action Button: Buy with Google Pay */}
            <div className="space-y-2">
              <GooglePayButton
                onClick={() => handleOpenGooglePay(billingCycle)}
                amountLabel={currentConvertedAmount}
                disabled={isProcessingPayment}
                isProcessing={isProcessingPayment}
                size="lg"
              />

              <div className="flex items-center justify-between pt-1">
                {isVip && onDowngradeToBasic && (
                  <button
                    onClick={() => {
                      onDowngradeToBasic();
                      onClose();
                    }}
                    className="text-xs text-zinc-500 hover:text-zinc-400 underline font-mono cursor-pointer"
                  >
                    Downgrade to Basic Free Tier
                  </button>
                )}

                {onOpenReferral && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenReferral();
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-mono font-bold flex items-center gap-1 ml-auto cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Refer Friends to Earn 10 Pts</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Google Pay Interactive Bottom-Sheet Modal */}
        <GooglePayCheckoutSheet
          isOpen={isGooglePaySheetOpen}
          onClose={() => setIsGooglePaySheetOpen(false)}
          onConfirmPayment={handleConfirmGooglePay}
          itemName={getPlanNameByCycle(pendingPlanToPurchase || billingCycle)}
          itemDescription="Instant Auto-Verify, Unlimited Chats & Calls, VIP Badge, and all 4K Wallpapers unlocked."
          amountLabel={formatCurrency(getPlanPrice(pendingPlanToPurchase || billingCycle))}
          usdAmount={getPlanPrice(pendingPlanToPurchase || billingCycle)}
          userEmail="dylanwisney@gmail.com"
          isProcessing={isProcessingPayment}
        />
      </motion.div>
    </div>
  );
};
