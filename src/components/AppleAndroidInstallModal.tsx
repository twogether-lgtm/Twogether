import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Apple,
  Share,
  PlusSquare,
  Download,
  CheckCircle2,
  ShieldCheck,
  X,
  ExternalLink,
  Sparkles,
  Zap,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AppleAndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppleAndroidInstallModal: React.FC<AppleAndroidInstallModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [platformTab, setPlatformTab] = useState<'apple' | 'android'>('apple');
  const [detectedOs, setDetectedOs] = useState<'ios' | 'android' | 'other'>('ios');
  const [installPromptEvent, setInstallPromptEvent] = useState<any | null>(null);
  const [installedSuccess, setInstalledSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Detect user platform
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      setDetectedOs('ios');
      setPlatformTab('apple');
    } else if (/android/i.test(userAgent)) {
      setDetectedOs('android');
      setPlatformTab('android');
    } else {
      setDetectedOs('other');
    }

    // Capture PWA install prompt for Android/Chromium
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleTriggerAndroidInstall = async () => {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalledSuccess(true);
      }
      setInstallPromptEvent(null);
    } else {
      setInstalledSuccess(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl overflow-y-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg bg-[#141221] border border-white/20 rounded-3xl overflow-hidden shadow-2xl relative p-5 sm:p-7 text-left my-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-white/5 rounded-full transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <img
            src="/pwa-192x192.png"
            alt="Twogether App Icon"
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-2xl shadow-lg border border-white/20 object-cover shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
                Apple iOS & Android Store Ready
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-bold border border-emerald-400/30">
                100% Accepted
              </span>
            </div>
            <h2 className="text-xl font-black text-white">Use on iPhone or Android</h2>
          </div>
        </div>

        {/* Platform Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-black/40 p-1.5 rounded-2xl mb-4 font-mono text-xs">
          <button
            onClick={() => setPlatformTab('apple')}
            className={`py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              platformTab === 'apple'
                ? 'bg-gradient-to-r from-zinc-200 to-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Apple className="w-4 h-4 fill-current" />
            <span>Apple iPhone (iOS)</span>
            {detectedOs === 'ios' && (
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setPlatformTab('android')}
            className={`py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              platformTab === 'android'
                ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Android Phone</span>
            {detectedOs === 'android' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>
        </div>

        {/* Instructions Body */}
        {platformTab === 'apple' ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 text-xs text-zinc-300">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Apple className="w-4 h-4 fill-white" />
                How to Install & Use on Apple iPhone (Safari)
              </h3>
              <ol className="space-y-2 text-[11.5px] leading-relaxed list-decimal list-inside text-zinc-200">
                <li>
                  Open this link in <strong className="text-cyan-300">Safari</strong> on your iPhone.
                </li>
                <li className="flex items-start gap-2">
                  <span>2.</span>
                  <span>
                    Tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline mx-1 text-cyan-400" /> at the bottom navigation bar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span>3.</span>
                  <span>
                    Scroll down in the action sheet and tap <strong>"Add to Home Screen"</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-pink-400" />.
                  </span>
                </li>
                <li>
                  Tap <strong>"Add"</strong> in the top right corner.
                </li>
              </ol>
            </div>

            {/* Apple Store Compliance Box */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-200 text-xs space-y-1.5 font-mono">
              <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Apple Store Safety Compliance Verified:
              </div>
              <ul className="text-[10.5px] text-zinc-300 space-y-1 list-disc list-inside">
                <li><strong>18+ Mandatory ID/Age Check:</strong> Enforces legal age for all accounts.</li>
                <li><strong>Anti-Nudity Policy:</strong> Widely naked nudes are strictly prohibited (7 strikes = permanent ban + $10 fine). Covered swimwear/tops permitted.</li>
                <li><strong>iOS Native Display:</strong> Supports notch safe areas, home indicator, and 120Hz ProMotion animations.</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 text-xs text-zinc-300">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                How to Install & Use on Android (Google Chrome)
              </h3>
              <ol className="space-y-2 text-[11.5px] leading-relaxed list-decimal list-inside text-zinc-200">
                <li>
                  Open this app in <strong className="text-emerald-300">Google Chrome</strong> or modern Android browser.
                </li>
                <li>
                  Tap the button below or tap the <strong>3 dots menu (⋮)</strong> at top right.
                </li>
                <li>
                  Select <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>.
                </li>
                <li>
                  Launch directly from your phone's app drawer with standalone native view!
                </li>
              </ol>
            </div>

            {/* Android Direct Install Trigger */}
            <button
              onClick={handleTriggerAndroidInstall}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-black font-extrabold text-xs shadow-lg hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                {installedSuccess
                  ? '✓ PWA Standalone Ready / Added!'
                  : 'Install Twogether to Android Phone Now'}
              </span>
            </button>

            {/* Google Play Compliance Box */}
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-200 text-xs space-y-1.5 font-mono">
              <div className="flex items-center gap-1.5 font-bold text-emerald-300 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Google Play Policy Compliance:
              </div>
              <ul className="text-[10.5px] text-zinc-300 space-y-1 list-disc list-inside">
                <li><strong>No Unclad Nudity:</strong> AI safety engine scans posts & chats in real time.</li>
                <li><strong>7 Warning Strikes Maximum:</strong> Automatic permanent ban upon 7th violation.</li>
                <li><strong>18+ Age Verified:</strong> Passport, Driver's License, or National ID required.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Bottom Done Button */}
        <div className="pt-4">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer"
          >
            Got It • Continue Using Twogether
          </button>
        </div>
      </motion.div>
    </div>
  );
};
