import React, { useState } from 'react';
import { ShieldCheck, Check, Sparkles, X, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';

export const GoogleGIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export const GooglePayLogo: React.FC<{ textColor?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  textColor = 'text-white',
  size = 'md',
}) => {
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  return (
    <span className="inline-flex items-center gap-1 font-sans select-none tracking-tight">
      <GoogleGIcon className={iconSize} />
      <span className={`font-semibold tracking-normal ${textColor} ${textSize}`}>Pay</span>
    </span>
  );
};

export const GooglePayBadge: React.FC<{ variant?: 'dark' | 'light' }> = ({ variant = 'dark' }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] font-bold border ${
      variant === 'dark'
        ? 'bg-black/80 text-white border-white/20 shadow-sm'
        : 'bg-white text-black border-zinc-200 shadow-sm'
    }`}
  >
    <GooglePayLogo size="sm" textColor={variant === 'dark' ? 'text-white' : 'text-black'} />
    <span className="text-zinc-400">|</span>
    <span className="text-emerald-400 flex items-center gap-0.5">
      <Lock className="w-2.5 h-2.5" /> ONLY
    </span>
  </span>
);

export interface GooglePayButtonProps {
  onClick: () => void;
  amountLabel: string;
  planName?: string;
  disabled?: boolean;
  isProcessing?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const GooglePayButton: React.FC<GooglePayButtonProps> = ({
  onClick,
  amountLabel,
  disabled = false,
  isProcessing = false,
  className = '',
  size = 'md',
  fullWidth = true,
}) => {
  const padding = size === 'sm' ? 'py-2 px-3 text-xs' : size === 'lg' ? 'py-4 px-6 text-sm' : 'py-3 px-4 text-xs';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isProcessing}
      className={`
        ${fullWidth ? 'w-full' : ''}
        ${padding}
        rounded-2xl bg-black hover:bg-zinc-900 border-2 border-white/30 text-white font-bold
        shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-95 transition-all
        flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isProcessing ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-zinc-300">Processing with Google Pay...</span>
        </>
      ) : (
        <>
          <span className="text-zinc-300 font-medium">Buy with</span>
          <GooglePayLogo size={size === 'sm' ? 'sm' : 'md'} />
          <span className="font-extrabold text-white ml-1 font-mono">({amountLabel})</span>
        </>
      )}
    </button>
  );
};

export interface GooglePayCheckoutSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPayment: () => void;
  itemName: string;
  itemDescription?: string;
  amountLabel: string;
  usdAmount: number;
  userEmail?: string;
  isProcessing?: boolean;
}

export const GooglePayCheckoutSheet: React.FC<GooglePayCheckoutSheetProps> = ({
  isOpen,
  onClose,
  onConfirmPayment,
  itemName,
  itemDescription,
  amountLabel,
  userEmail = 'dylanwisney@gmail.com',
  isProcessing = false,
}) => {
  const [authStep, setAuthStep] = useState<'review' | 'authenticating' | 'complete'>('review');

  if (!isOpen) return null;

  const handlePay = () => {
    setAuthStep('authenticating');
    setTimeout(() => {
      setAuthStep('complete');
      setTimeout(() => {
        onConfirmPayment();
        setAuthStep('review');
      }, 500);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="w-full max-w-md bg-[#161522] border-t sm:border border-white/20 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl relative text-left"
      >
        {/* Top Handle / Close */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center p-1 shadow-md">
              <GoogleGIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <GooglePayLogo size="sm" textColor="text-white" />
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold px-1.5 py-0.2 rounded bg-emerald-500/20">
                  Exclusive In-App Billing
                </span>
              </div>
              <p className="text-[10px] font-mono text-zinc-400">Google Play Billing Protected</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing || authStep !== 'review'}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Account Tile */}
        <div className="p-3 rounded-2xl bg-black/50 border border-white/10 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-md">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block truncate">{userEmail}</span>
              <span className="text-[10px] text-zinc-400 font-mono">Google Account (Verified)</span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </span>
        </div>

        {/* Order Breakdown Item */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 mb-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase text-amber-300 font-bold block mb-0.5">
                Item to Purchase
              </span>
              <h4 className="text-sm font-black text-white">{itemName}</h4>
              {itemDescription && (
                <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">{itemDescription}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-base font-black text-amber-400 font-mono block">
                {amountLabel}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Tax Included</span>
            </div>
          </div>

          {/* Payment Method Selected: Google Pay Saved Method */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-zinc-300">
              <div className="w-6 h-4 rounded bg-zinc-800 border border-white/20 flex items-center justify-center text-[8px] font-bold text-white">
                GPay
              </div>
              <span className="text-white font-semibold">Google Pay Balance / Card</span>
            </div>
            <span className="text-[11px] text-zinc-400">•••• 4242</span>
          </div>
        </div>

        {/* Google Security & Privacy Guarantee */}
        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-400/20 mb-4 flex items-center gap-2 text-[10.5px] font-mono text-blue-300">
          <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span>Google Pay encryption tokenizes your card. No external gateway used.</span>
        </div>

        {/* Action Button */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handlePay}
            disabled={isProcessing || authStep !== 'review'}
            className="w-full py-4 rounded-2xl bg-black hover:bg-zinc-900 border-2 border-white/40 text-white font-extrabold text-sm shadow-xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {authStep === 'authenticating' ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="font-mono text-zinc-200">Authorizing via Google Pay...</span>
              </>
            ) : authStep === 'complete' ? (
              <>
                <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
                <span className="font-mono text-emerald-300">Payment Approved!</span>
              </>
            ) : (
              <>
                <GoogleGIcon className="w-4 h-4" />
                <span>Pay {amountLabel} with Google Pay</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={authStep !== 'review'}
            className="w-full py-2 text-center text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
};
