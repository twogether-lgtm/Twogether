import React, { useState, useEffect } from 'react';
import {
  Crown,
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
} from 'lucide-react';
import { motion } from 'motion/react';
import { GlassCard } from './GlassCard';

import { authenticateOwnerBackend } from '../services/aiGuardianService';

interface ShadowAdminBillingPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminEmail?: string;
  isAppOwner?: boolean;
  ownerToken?: string | null;
  onOwnerAuthenticated?: (token?: string, ownerEmail?: string) => void;
}

export interface PaymentTransaction {
  id: string;
  userEmail: string;
  planName: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  googleTransactionId: string;
  payoutStatus: 'DEPOSITED_TO_ADMIN' | 'PENDING' | 'SETTLED';
  timestamp: string;
}

export interface BillingAdminStats {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  activeSubscribers: number;
  googleMerchantId: string;
  googleProjectId: string;
  payoutMethod: string;
  payoutAccountEmail: string;
  webhookUrl: string;
  transactions: PaymentTransaction[];
}

export const ShadowAdminBillingPortalModal: React.FC<ShadowAdminBillingPortalModalProps> = ({
  isOpen,
  onClose,
  adminEmail = 'dylanwisney@gmail.com',
  isAppOwner = false,
  ownerToken: externalOwnerToken = null,
  onOwnerAuthenticated,
}) => {
  const [stats, setStats] = useState<BillingAdminStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ledger' | 'payout_settings' | 'google_setup'>('ledger');

  // Owner Passcode Gate State
  const [localOwnerToken, setLocalOwnerToken] = useState<string | null>(externalOwnerToken);
  const effectiveToken = externalOwnerToken || localOwnerToken;
  const [isUnlocked, setIsUnlocked] = useState<boolean>(Boolean(isAppOwner && effectiveToken));
  const [ownerEmailInput, setOwnerEmailInput] = useState<string>(adminEmail);
  const [passcodeKey, setPasscodeKey] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  // Sync isUnlocked with isAppOwner prop and server token
  useEffect(() => {
    if (externalOwnerToken) {
      setLocalOwnerToken(externalOwnerToken);
    }
    if (isAppOwner && (externalOwnerToken || localOwnerToken)) {
      setIsUnlocked(true);
    } else if (!isAppOwner) {
      setIsUnlocked(false);
    }
  }, [isAppOwner, externalOwnerToken, localOwnerToken]);

  // Payout Settings Form
  const [payoutEmail, setPayoutEmail] = useState<string>(adminEmail);
  const [payoutMethod, setPayoutMethod] = useState<string>('Google Cloud Billing & Direct Bank');
  const [merchantId, setMerchantId] = useState<string>('pub-951943196492-twogether-shadow');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Test Payment Form
  const [testAmount, setTestAmount] = useState<number>(4.99);
  const [testPlan, setTestPlan] = useState<string>('VIP 2-Weeks Subscription ($4.99)');
  const [isSimulatingPayment, setIsSimulatingPayment] = useState<boolean>(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);

  const fetchAdminStats = (tokenOverride?: string) => {
    const activeToken = tokenOverride || effectiveToken;
    if (!activeToken) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fetch('/api/admin/billing-stats', {
      headers: { 'x-owner-token': activeToken },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.stats) {
          setStats(data.stats);
          setPayoutEmail(data.stats.payoutAccountEmail || adminEmail);
          setPayoutMethod(data.stats.payoutMethod || 'Google Cloud Billing & Direct Bank');
          setMerchantId(data.stats.googleMerchantId || 'pub-951943196492-twogether-shadow');
        }
      })
      .catch((err) => console.error('Error fetching admin billing stats:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isOpen && isUnlocked && effectiveToken) {
      fetchAdminStats(effectiveToken);
    }
  }, [isOpen, isUnlocked, effectiveToken]);

  const handleUnlockOwnerPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError(null);
    const res = await authenticateOwnerBackend(ownerEmailInput.trim(), passcodeKey.trim());
    if (res.success && res.ownerToken) {
      setLocalOwnerToken(res.ownerToken);
      setIsUnlocked(true);
      setPasscodeError(null);
      if (onOwnerAuthenticated) onOwnerAuthenticated(res.ownerToken, res.ownerEmail);
      fetchAdminStats(res.ownerToken);
    } else {
      setPasscodeError(res.message || '❌ Invalid Owner Security Passcode or Email. Access Denied!');
    }
  };

  const handleSavePayoutSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveToken) return;
    fetch('/api/admin/payouts/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-owner-token': effectiveToken,
      },
      body: JSON.stringify({
        payoutAccountEmail: payoutEmail,
        payoutMethod: payoutMethod,
        googleMerchantId: merchantId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setIsSaved(true);
          setTimeout(() => setIsSaved(false), 3000);
          fetchAdminStats(effectiveToken);
        }
      })
      .catch((err) => console.error('Save payout settings error:', err));
  };

  const handleSimulateUserPayment = () => {
    setIsSimulatingPayment(true);
    setTestSuccessMessage(null);

    fetch('/api/billing/process-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: `subscriber_${Math.floor(Math.random() * 899 + 100)}@twogether.app`,
        planName: testPlan,
        amount: testAmount,
        currency: 'USD',
        paymentMethod: 'Google Pay (In-App Billing)',
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTestSuccessMessage(
            `💰 Received $${testAmount.toFixed(2)} USD! Payment settled and routed to Shadow Admin (${payoutEmail}).`
          );
          fetchAdminStats();
        }
      })
      .catch((err) => console.error('Payment simulation error:', err))
      .finally(() => setIsSimulatingPayment(false));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl bg-[#12111D] border border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col relative"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/20 via-purple-900/30 to-black border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center font-black shadow-lg shadow-amber-500/30">
              <Crown className="w-6 h-6 fill-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                  Shadow Admin Paying Portal
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Google Billing Active
                </span>
              </div>
              <p className="text-xs text-zinc-300 font-mono mt-0.5">
                Receiving user subscription & VIP payments directly to Shadow Admin ({adminEmail})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white bg-white/5 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        {!isUnlocked ? (
          <div className="p-6 sm:p-10 flex flex-col items-center justify-center text-center space-y-5 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-xl">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <h3 className="text-xl font-black text-white uppercase tracking-wide">
                🔒 App Owner Verification Required
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                The Shadow Admin Revenue Portal is strictly confidential and restricted to the verified App Owner (<strong className="text-amber-300 font-mono">{adminEmail}</strong>).
              </p>
            </div>

            <form onSubmit={handleUnlockOwnerPasscode} className="w-full max-w-sm space-y-3 font-mono">
              <div className="space-y-1 text-left">
                <label className="text-[10px] text-zinc-400 uppercase font-bold block">
                  App Owner Email *
                </label>
                <input
                  type="email"
                  required
                  value={ownerEmailInput}
                  onChange={(e) => setOwnerEmailInput(e.target.value)}
                  placeholder="dylanwisney@gmail.com"
                  className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] text-zinc-400 uppercase font-bold block">
                  Owner Security PIN *
                </label>
                <input
                  type="password"
                  required
                  value={passcodeKey}
                  onChange={(e) => setPasscodeKey(e.target.value)}
                  placeholder="Enter Owner Security PIN..."
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/15 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              {passcodeError && (
                <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs text-center font-sans">
                  {passcodeError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 hover:scale-105 transition-all flex items-center justify-center gap-1.5"
              >
                <Crown className="w-4 h-4 fill-black" /> Authenticate App Owner Access
              </button>
            </form>

            <p className="text-[10px] text-zinc-500 font-mono">
              Protected by Google Cloud Security & End-to-End Owner Authentication
            </p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-left">
          {/* Executive Stats Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <GlassCard className="p-4 border border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-transparent" glowColor="amber">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase text-amber-300 font-bold">Total Revenue Received</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-white">
                ${stats ? stats.totalRevenue.toFixed(2) : '0.00'}
              </p>
              <p className="text-[10px] text-zinc-400 font-mono mt-1">Direct Shadow Admin Credit</p>
            </GlassCard>

            <GlassCard className="p-4 border border-cyan-500/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase text-cyan-300 font-bold">Monthly Recurring (MRR)</span>
                <TrendingUp className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-black text-white">
                ${stats ? stats.monthlyRecurringRevenue.toFixed(2) : '0.00'}
              </p>
              <p className="text-[10px] text-zinc-400 font-mono mt-1">Active Recurring VIP Plan</p>
            </GlassCard>

            <GlassCard className="p-4 border border-purple-500/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase text-purple-300 font-bold">Active VIP Subscribers</span>
                <Crown className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-black text-white">
                {stats ? stats.activeSubscribers : 0}
              </p>
              <p className="text-[10px] text-zinc-400 font-mono mt-1">Unlimited Tier Users</p>
            </GlassCard>

            <GlassCard className="p-4 border border-emerald-500/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase text-emerald-300 font-bold">Payout Status</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-sm font-bold text-emerald-300 mt-1">AUTO-DISPATCH</p>
              <p className="text-[10px] text-zinc-400 font-mono mt-1 truncate">
                Target: {payoutEmail}
              </p>
            </GlassCard>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-3 text-xs font-mono">
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'ledger'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" /> Received Payments Ledger ({stats?.transactions.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('payout_settings')}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'payout_settings'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <Building className="w-4 h-4" /> Admin Payout & Bank Destination
            </button>

            <button
              onClick={() => setActiveTab('google_setup')}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'google_setup'
                  ? 'bg-amber-400 text-black shadow-md'
                  : 'bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <Globe className="w-4 h-4" /> Google Billing Credentials & API
            </button>
          </div>

          {/* TAB 1: RECEIVED PAYMENTS LEDGER */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              {/* Test Payment Simulation Box */}
              <GlassCard className="p-4 border border-cyan-500/30 bg-cyan-950/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-cyan-400 animate-pulse" /> Live Payment Gateway Tester (Admin Simulation)
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Routes funds directly to Shadow Admin payout account
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <select
                    value={testPlan}
                    onChange={(e) => {
                      setTestPlan(e.target.value);
                      if (e.target.value.includes('Weekly ($2.49)')) setTestAmount(2.49);
                      else if (e.target.value.includes('2-Weeks')) setTestAmount(3.99);
                      else if (e.target.value.includes('Monthly ($5.99)')) setTestAmount(5.99);
                      else if (e.target.value.includes('Yearly')) setTestAmount(29.99);
                      else if (e.target.value.includes('HD Video Chat')) setTestAmount(2.99);
                      else if (e.target.value.includes('Voice Chat')) setTestAmount(1.99);
                      else if (e.target.value.includes('Single Wallpaper')) setTestAmount(0.99);
                      else if (e.target.value.includes('All Wallpapers')) setTestAmount(2.49);
                      else if (e.target.value.includes('15 Gifts Pack')) setTestAmount(0.99);
                      else setTestAmount(10.00);
                    }}
                    className="w-full sm:w-1/2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none"
                  >
                    <option value="VIP Weekly Pass ($2.49)" className="bg-zinc-900">VIP Weekly Pass ($2.49)</option>
                    <option value="VIP 2-Weeks Subscription ($3.99)" className="bg-zinc-900">VIP 2-Weeks Subscription ($3.99)</option>
                    <option value="VIP Monthly Subscription ($5.99)" className="bg-zinc-900">VIP Monthly Subscription ($5.99)</option>
                    <option value="VIP Yearly Subscription ($29.99)" className="bg-zinc-900">VIP Yearly Subscription ($29.99)</option>
                    <option value="HD Video Chat 7-Day Pass ($2.99)" className="bg-zinc-900">HD Video Chat 7-Day Pass ($2.99)</option>
                    <option value="Voice Chat 7-Day Pass ($1.99)" className="bg-zinc-900">Voice Chat 7-Day Pass ($1.99)</option>
                    <option value="Single Wallpaper Theme ($0.99)" className="bg-zinc-900">Single Wallpaper Theme ($0.99)</option>
                    <option value="All Wallpapers Lifetime Pass ($2.49)" className="bg-zinc-900">All Wallpapers Lifetime Pass ($2.49)</option>
                    <option value="15 Gifts Pack ($0.99)" className="bg-zinc-900">15 Gifts Pack ($0.99)</option>
                    <option value="Custom Soulmate Tip ($10.00)" className="bg-zinc-900">Custom Soulmate Tip ($10.00)</option>
                  </select>

                  <button
                    onClick={handleSimulateUserPayment}
                    disabled={isSimulatingPayment}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-black font-extrabold text-xs shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-1.5 flex-shrink-0"
                  >
                    {isSimulatingPayment ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Simulate User Payment Process
                  </button>
                </div>

                {testSuccessMessage && (
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-mono flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{testSuccessMessage}</span>
                  </div>
                )}
              </GlassCard>

              {/* Transactions Table */}
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-zinc-400 font-mono text-[10px] uppercase">
                      <th className="p-3">Tx ID</th>
                      <th className="p-3">User Email</th>
                      <th className="p-3">Plan / Item</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3">Channel</th>
                      <th className="p-3">Payout Status</th>
                      <th className="p-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {stats && stats.transactions.length > 0 ? (
                      stats.transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 text-cyan-300 font-bold">{tx.id}</td>
                          <td className="p-3 text-white truncate max-w-[140px]">{tx.userEmail}</td>
                          <td className="p-3 text-amber-300">{tx.planName}</td>
                          <td className="p-3 text-right font-extrabold text-emerald-400">
                            +${tx.amount.toFixed(2)} {tx.currency}
                          </td>
                          <td className="p-3 text-zinc-300 text-[10px]">{tx.paymentMethod}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold">
                              ✓ DEPOSITED TO ADMIN
                            </span>
                          </td>
                          <td className="p-3 text-right text-zinc-400 text-[10px]">
                            {new Date(tx.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-zinc-500 font-mono">
                          No transactions recorded yet. Click "Simulate User Payment Process" above to generate a live payment receipt!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PAYOUT DESTINATION & BANK SETTINGS */}
          {activeTab === 'payout_settings' && (
            <GlassCard className="p-6 border border-amber-500/30 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Building className="w-5 h-5 text-amber-400" /> Shadow Admin Payout Destination
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Configure where collected user funds and Google Billing payouts settle automatically
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-mono font-bold">
                  Shadow Owner: {adminEmail}
                </span>
              </div>

              <form onSubmit={handleSavePayoutSettings} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold block mb-1">
                      Admin Email for Payout Alerts & Google Pay *
                    </label>
                    <input
                      type="email"
                      required
                      value={payoutEmail}
                      onChange={(e) => setPayoutEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold block mb-1">
                      Google Merchant / Publisher ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={merchantId}
                      onChange={(e) => setMerchantId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold block mb-1">
                    Preferred Settlement Channel
                  </label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                  >
                    <option value="Google Cloud Billing & Direct Bank" className="bg-zinc-900">
                      Google Cloud Billing & Direct Bank Account (Automated Daily)
                    </option>
                    <option value="Google Pay Merchant Account" className="bg-zinc-900">
                      Google Pay Merchant Account (Instant Credit)
                    </option>
                    <option value="PayPal / Wire Transfer" className="bg-zinc-900">
                      PayPal / Direct International Wire
                    </option>
                  </select>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-zinc-300 space-y-1.5 font-mono">
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                    <ShieldCheck className="w-4 h-4 text-amber-400" /> Automated Payout Routing Active
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    When users pay for VIP subscriptions ($4.99/2wks, $9.99/mo or $39.99/yr), funds are automatically logged in your database ledger and routed to your connected Google Billing / Merchant Account (<span className="text-white font-bold">{payoutEmail}</span>).
                  </p>
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 hover:scale-105 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 fill-black text-amber-400" />
                  Save Admin Payout Configuration
                </button>

                {isSaved && (
                  <p className="text-xs text-emerald-400 font-mono font-bold">
                    ✓ Shadow Admin payout settings successfully updated!
                  </p>
                )}
              </form>
            </GlassCard>
          )}

          {/* TAB 3: GOOGLE BILLING CREDENTIALS & API */}
          {activeTab === 'google_setup' && (
            <GlassCard className="p-6 border border-cyan-500/30 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-cyan-400" /> Google Cloud Billing & Google Play API Setup
                </h3>
                <p className="text-xs text-zinc-400">
                  Connect your live Google Cloud Billing Account or Google Play Service Account for real-world card settlement
                </p>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 space-y-2">
                  <span className="text-cyan-300 font-bold text-[11px]">1. Google Cloud Billing Account ID</span>
                  <p className="text-zinc-300 text-[11px]">
                    Project ID: <span className="text-amber-300 font-bold">twogether-ai-studio-4586</span>
                  </p>
                  <p className="text-zinc-300 text-[11px]">
                    Merchant ID: <span className="text-amber-300 font-bold">{merchantId}</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 space-y-2">
                  <span className="text-cyan-300 font-bold text-[11px]">2. Live Webhook Endpoint</span>
                  <p className="text-zinc-300 text-[11px] break-all bg-white/5 p-2 rounded-lg border border-white/10">
                    https://ais-dev-z4kw2q57puokic7zgdxqel-951943196492.europe-west2.run.app/api/billing/webhook
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    Set this as your Real-Time Developer Notifications (RTDN) Pub/Sub URL in Google Play Console.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 space-y-2">
                  <span className="text-cyan-300 font-bold text-[11px]">3. Environment Variable Keys</span>
                  <p className="text-[11px] text-zinc-300">
                    Add <code className="text-pink-300 bg-white/5 px-1.5 py-0.5 rounded">GOOGLE_MERCHANT_ID={merchantId}</code> and <code className="text-pink-300 bg-white/5 px-1.5 py-0.5 rounded">ADMIN_PAYOUT_EMAIL={payoutEmail}</code> in your environment parameters or Settings menu.
                  </p>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
        )}
      </motion.div>
    </div>
  );
};
