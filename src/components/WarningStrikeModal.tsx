import React from 'react';
import { AlertTriangle, ShieldAlert, X, Shield, CheckCircle2, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WarningStrike } from '../types';

interface WarningStrikeModalProps {
  isOpen: boolean;
  onClose: () => void;
  strike: WarningStrike | null;
  totalStrikes: number;
}

export const WarningStrikeModal: React.FC<WarningStrikeModalProps> = ({
  isOpen,
  onClose,
  strike,
  totalStrikes,
}) => {
  if (!isOpen || !strike) return null;

  const remaining = Math.max(0, 7 - totalStrikes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md bg-[#161224] border-2 border-rose-500/60 rounded-3xl overflow-hidden shadow-2xl p-6 relative text-left"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-white/5 rounded-full transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon Badge */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 flex-shrink-0 animate-pulse">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] font-mono font-bold text-rose-400 uppercase tracking-widest block">
              COMMUNITY SAFETY STRIKE {totalStrikes} OF 7
            </span>
            <h2 className="text-xl font-black text-white">Content Blocked by AI</h2>
          </div>
        </div>

        {/* Strikes Progress Meter */}
        <div className="bg-black/50 p-3 rounded-2xl border border-white/10 mb-4">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-zinc-400">Warning Strikes Status:</span>
            <span className="text-rose-400 font-extrabold">{totalStrikes} / 7 Strikes</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div
                key={idx}
                className={`h-2.5 rounded-full transition-all ${
                  idx < totalStrikes
                    ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                    : 'bg-white/15'
                }`}
              />
            ))}
          </div>
          <p className="text-[10px] text-zinc-400 font-mono text-center">
            {remaining > 0 ? (
              <span>{remaining} more warning strike{remaining > 1 ? 's' : ''} will result in a <strong>permanent account ban</strong>.</span>
            ) : (
              <span className="text-rose-400 font-bold">Limit reached: Account will be suspended.</span>
            )}
          </p>
        </div>

        {/* Violation Specifics */}
        <div className="space-y-2.5 text-xs text-zinc-300 bg-white/5 p-3.5 rounded-2xl border border-white/10 mb-4">
          <div className="flex items-center justify-between text-[11px] font-mono border-b border-white/10 pb-1.5">
            <span className="text-zinc-400">VIOLATION TYPE:</span>
            <span className="text-rose-300 font-bold uppercase">{strike.contentType} Content</span>
          </div>
          <p className="text-zinc-200 leading-relaxed">
            <strong className="text-white">Reason:</strong> {strike.reason}
          </p>
          {strike.previewSnippet && (
            <p className="text-[11px] font-mono text-zinc-400 bg-black/40 p-2 rounded-lg truncate">
              Detected snippet: "{strike.previewSnippet}"
            </p>
          )}
        </div>

        {/* Apple & Android Policy Explainer */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-200 text-[11px] space-y-1 mb-5">
          <span className="font-bold block font-mono flex items-center gap-1 text-amber-300">
            <Shield className="w-3.5 h-3.5" /> Mobile App Safety Policy:
          </span>
          <p className="leading-snug">
            To ensure Twogether remains accepted and safe on Apple iOS and Android phones:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-zinc-300 text-[10.5px]">
            <li><strong>Widely naked nudes or exposed private parts are strictly prohibited.</strong></li>
            <li>If clothing, swimwear, or a top hides private parts completely, it is allowed.</li>
          </ul>
        </div>

        {/* Acknowledge Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-600 to-purple-600 text-white font-extrabold text-xs shadow-lg hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>I Understand & Agree to Policy</span>
        </button>
      </motion.div>
    </div>
  );
};
