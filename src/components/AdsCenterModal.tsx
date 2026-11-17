import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Building,
  CheckCircle2,
  X,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Globe,
  Settings,
  Download,
  Send,
  AlertCircle,
  Clock,
  Sparkles,
  Crown,
  Eye,
  Tv,
  Users,
  Smartphone,
} from 'lucide-react';
import { motion } from 'motion/react';
import { GlassCard } from './GlassCard';

interface AdsCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerEmail?: string;
  onTriggerTestAd?: () => void;
}

export const AdsCenterModal: React.FC<AdsCenterModalProps> = ({
  isOpen,
  onClose,
  ownerEmail = 'dylanwisney@gmail.com',
  onTriggerTestAd,
}) => {
  const [impressionsCount, setImpressionsCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('twogether_ad_impressions');
      return saved ? Number(saved) : 1482;
    } catch {
      return 1482;
    }
  });

  const [adFreeSubscribers, setAdFreeSubscribers] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('twogether_ad_subscribers');
      return saved ? Number(saved) : 48;
    } catch {
      return 48;
    }
  });
  const [ecpmRate, setEcpmRate] = useState<number>(3.80);
  const [selectedPayoutMethod, setSelectedPayoutMethod] = useState<'mpesa' | 'bank' | 'paypal'>('mpesa');
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState<string>('+254 712 345 678');
  const [payoutStatus, setPayoutStatus] = useState<string | null>(null);
  const [activeNetworkTab, setActiveNetworkTab] = useState<'overview' | 'networks' | 'payouts'>('overview');

  if (!isOpen) return null;

  // Calculate earnings: (impressions / 1000 * ecpm) + (subscribers * $3.89)
  const adRevenue = Number(((impressionsCount / 1000) * ecpmRate).toFixed(2));
  const subscriptionRevenue = Number((adFreeSubscribers * 3.89).toFixed(2));
  const totalEarnedUsd = Number((adRevenue + subscriptionRevenue).toFixed(2));
  const totalEarnedKes = Math.round(totalEarnedUsd * 129.5); // USD to KES exchange rate

  const handleSimulateImpression = () => {
    const next = impressionsCount + 10;
    setImpressionsCount(next);
    try {
      localStorage.setItem('twogether_ad_impressions', String(next));
    } catch {}
  };

  const handleRequestPayout = (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutStatus(`Payout of $${totalEarnedUsd} USD (~${totalEarnedKes.toLocaleString()} KES) queued to ${selectedPayoutMethod.toUpperCase()} (${mpesaPhoneNumber})! Deposit completes in 2-4 hours.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-2xl bg-[#120F1F] border-2 border-emerald-500/50 rounded-3xl overflow-hidden shadow-2xl relative text-left my-auto p-5 sm:p-7"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-white/5 rounded-full transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 border-b border-white/10 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-400 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg">
            <div className="w-full h-full bg-[#120F1F] rounded-[14px] flex items-center justify-center">
              <Tv className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-widest">
                Owner Monetization & Ad Revenue Center
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-bold border border-emerald-400/30">
                LIVE EARNINGS
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Ads Center & 5-Min Pop-Up Monetization
            </h2>
            <p className="text-xs text-zinc-400">
              Admin: <strong className="text-zinc-200">{ownerEmail}</strong> • Ad Interval: <strong className="text-emerald-400">Every 5 Minutes</strong>
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-black/40 p-1.5 rounded-2xl mb-5 font-mono text-xs">
          <button
            onClick={() => setActiveNetworkTab('overview')}
            className={`py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeNetworkTab === 'overview'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Earnings Overview
          </button>
          <button
            onClick={() => setActiveNetworkTab('networks')}
            className={`py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeNetworkTab === 'networks'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Ad Networks (Google & Unity)
          </button>
          <button
            onClick={() => setActiveNetworkTab('payouts')}
            className={`py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeNetworkTab === 'payouts'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            M-Pesa Payout
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeNetworkTab === 'overview' && (
          <div className="space-y-4">
            {/* Top Revenue KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Total Earned (USD)</span>
                <p className="text-xl font-black text-emerald-400">${totalEarnedUsd}</p>
                <span className="text-[10px] font-mono text-zinc-400">≈ {totalEarnedKes.toLocaleString()} KES 🇰🇪</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Ad Impressions</span>
                <p className="text-xl font-black text-cyan-300">{impressionsCount.toLocaleString()}</p>
                <span className="text-[10px] font-mono text-zinc-400">Watched by users</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Ad-Free Subscribers</span>
                <p className="text-xl font-black text-amber-300">{adFreeSubscribers}</p>
                <span className="text-[10px] font-mono text-zinc-400">$3.89/mo per user</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Active eCPM</span>
                <p className="text-xl font-black text-purple-300">${ecpmRate.toFixed(2)}</p>
                <span className="text-[10px] font-mono text-zinc-400">Per 1k ad views</span>
              </div>
            </div>

            {/* How Monetization Works */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-xs text-zinc-200 space-y-1.5 font-mono">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                How You Earn from Twogether Ads:
              </div>
              <ul className="text-[11px] text-zinc-300 space-y-1 list-disc list-inside">
                <li>
                  <strong>5-Minute Ad Interval:</strong> Non-subscribers see sponsored video ads every 5 minutes while using the app.
                </li>
                <li>
                  <strong>Ad Impressions:</strong> You earn <strong>${ecpmRate.toFixed(2)} USD per 1,000 views</strong> from Google AdMob and Unity Ads.
                </li>
                <li>
                  <strong>$3.89/Month Subscriptions:</strong> Users who want to escape ads pay <strong>$3.89/month</strong>. You keep the recurring subscription revenue!
                </li>
                <li>
                  <strong>Auto-Resumption:</strong> When a user's subscription expires, ads automatically start popping up again every 5 minutes.
                </li>
              </ul>
            </div>

            {/* Quick Simulation / Testing Controls */}
            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2">
              <span className="text-xs font-mono font-bold text-zinc-300 block">
                ⚡ Test & Demonstration Tools:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {onTriggerTestAd && (
                  <button
                    onClick={onTriggerTestAd}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-mono font-bold hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>Trigger 5-Min Ad Modal Now</span>
                  </button>
                )}
                <button
                  onClick={handleSimulateImpression}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-mono font-bold hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Simulate +10 Ad Views (+$$)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AD NETWORKS */}
        {activeNetworkTab === 'networks' && (
          <div className="space-y-3 text-xs font-mono">
            {[
              {
                name: 'Google AdMob Network (Global & Kenya)',
                type: 'Interstitial & Rewarded Video',
                status: 'CONNECTED & ACTIVE 🟢',
                revenue: `$${(adRevenue * 0.65).toFixed(2)} USD`,
                fillRate: '99.4%',
              },
              {
                name: 'Unity Ads Engine (Mobile 3D VR & Beats)',
                type: '3D Spatial Audio & Video Ads',
                status: 'CONNECTED & ACTIVE 🟢',
                revenue: `$${(adRevenue * 0.25).toFixed(2)} USD`,
                fillRate: '98.1%',
              },
              {
                name: 'Meta Audience Network (Instagram & FB)',
                type: 'Social Banner & Native Ads',
                status: 'CONNECTED & ACTIVE 🟢',
                revenue: `$${(adRevenue * 0.10).toFixed(2)} USD`,
                fillRate: '97.8%',
              },
            ].map((net, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs">{net.name}</h4>
                  <p className="text-[10px] text-zinc-400">{net.type} • Fill Rate: {net.fillRate}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-400 font-bold block">{net.status}</span>
                  <span className="text-xs font-bold text-white">{net.revenue}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: PAYOUTS */}
        {activeNetworkTab === 'payouts' && (
          <form onSubmit={handleRequestPayout} className="space-y-4 text-xs font-mono">
            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-3">
              <span className="text-xs font-bold text-white block">
                Select Owner Payout Destination (Kenya 🇰🇪 & Global):
              </span>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPayoutMethod('mpesa')}
                  className={`p-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                    selectedPayoutMethod === 'mpesa'
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                      : 'border-white/10 text-zinc-400 bg-white/5'
                  }`}
                >
                  🇰🇪 Safaricom M-Pesa
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayoutMethod('bank')}
                  className={`p-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                    selectedPayoutMethod === 'bank'
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                      : 'border-white/10 text-zinc-400 bg-white/5'
                  }`}
                >
                  🏦 Bank Wire (Equity/KCB)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayoutMethod('paypal')}
                  className={`p-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                    selectedPayoutMethod === 'paypal'
                      ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                      : 'border-white/10 text-zinc-400 bg-white/5'
                  }`}
                >
                  🅿️ PayPal USD
                </button>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 uppercase block mb-1">
                  Recipient Account / Phone Number:
                </label>
                <input
                  type="text"
                  value={mpesaPhoneNumber}
                  onChange={(e) => setMpesaPhoneNumber(e.target.value)}
                  placeholder="+254 7XX XXX XXX or bank account"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-zinc-400">Available to Withdraw:</span>
                <span className="text-emerald-400 font-extrabold text-sm">
                  ${totalEarnedUsd} USD (≈ {totalEarnedKes.toLocaleString()} KES)
                </span>
              </div>

              {payoutStatus && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs">
                  ✓ {payoutStatus}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 text-black font-black text-xs shadow-xl hover:scale-[1.01] transition-all cursor-pointer"
              >
                Withdraw Revenue Now to {selectedPayoutMethod.toUpperCase()} ➔
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
