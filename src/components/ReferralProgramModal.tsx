import React, { useState, useEffect } from 'react';
import { Share2, Copy, Check, Sparkles, Users, Gift, MessageCircle, Send, Trophy, ArrowRight, X, Heart, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { GlassCard } from './GlassCard';

interface ReferralProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEarnPoints: (points: number, reason: string) => void;
  pointsBalance: number;
  userName?: string;
  onOpenGiftsStore?: () => void;
}

export const ReferralProgramModal: React.FC<ReferralProgramModalProps> = ({
  isOpen,
  onClose,
  onEarnPoints,
  pointsBalance,
  userName = 'Alex',
  onOpenGiftsStore,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [referredCount, setReferredCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('twogether_referred_friends_count');
      return saved ? Number(saved) : 2;
    } catch {
      return 2;
    }
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSimulatingJoin, setIsSimulatingJoin] = useState<boolean>(false);

  const cleanUsername = userName.toLowerCase().replace(/\s+/g, '_');
  const referralCode = `twg_${cleanUsername}_soul`;
  const referralLink = `https://twogether.love/join?ref=${referralCode}`;

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  if (!isOpen) return null;

  const playChime = () => {
    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        const ctx = new AudioCtxClass();
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
        });
      }
    } catch {
      // ignore
    }
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      playChime();
      setToastMessage('📋 Referral link copied to clipboard! Share it with friends to earn +10 points.');
      setTimeout(() => setToastMessage(null), 3500);
    } catch {
      setCopied(true);
      setToastMessage('📋 Referral link ready: ' + referralLink);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Twogether — The Social Vibe & Soulmate App!',
          text: `Hey! Connect with me on Twogether. Join using my referral invite link: ${referralLink}`,
          url: referralLink,
        });
        setToastMessage('✨ Shared invite successfully!');
        setTimeout(() => setToastMessage(null), 3000);
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleSimulateFriendJoined = () => {
    if (isSimulatingJoin) return;
    setIsSimulatingJoin(true);

    const demoFriends = [
      'Chloe Taylor',
      'Liam Vance',
      'Maya Sterling',
      'Noah Brooks',
      'Elena Rossi',
      'Lucas Moreau',
    ];
    const friendName = demoFriends[Math.floor(Math.random() * demoFriends.length)];

    setTimeout(() => {
      const nextCount = referredCount + 1;
      setReferredCount(nextCount);
      try {
        localStorage.setItem('twogether_referred_friends_count', String(nextCount));
      } catch {}

      onEarnPoints(10, `Referral bonus from ${friendName}`);
      playChime();

      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#fbbf24', '#ec4899', '#10b981'],
        });
      } catch {}

      setIsSimulatingJoin(false);
      setToastMessage(`🎉 ${friendName} just joined via your referral link! +10 Points added to your balance.`);
      setTimeout(() => setToastMessage(null), 4500);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-lg overflow-y-auto">
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        className="w-full max-w-lg bg-[#14131F] border border-cyan-500/40 rounded-3xl overflow-hidden shadow-2xl relative p-5 sm:p-7 my-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-white/5 rounded-full transition-all cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-mono font-bold">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>EXCLUSIVE REFERRAL PROGRAM</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Refer a Friend, Earn <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-cyan-400">10 Points</span>
          </h2>
          <p className="text-xs text-zinc-300 max-w-md mx-auto leading-relaxed">
            Share your unique invite link with friends, lovers, and crushes. Whenever someone joins via your link, you instantly receive <strong className="text-amber-300">10 Determination Points</strong>!
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
            <span className="text-[10px] font-mono text-zinc-400 uppercase block">Friends Joined</span>
            <span className="text-xl font-black text-white font-mono">{referredCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-center">
            <span className="text-[10px] font-mono text-cyan-300 uppercase block">Referral Earned</span>
            <span className="text-xl font-black text-cyan-300 font-mono">+{referredCount * 10} Pts</span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-center">
            <span className="text-[10px] font-mono text-amber-300 uppercase block">Total Balance</span>
            <span className="text-xl font-black text-amber-300 font-mono">⭐ {pointsBalance}</span>
          </div>
        </div>

        {/* Toast Alert */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 mb-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 text-xs font-mono font-bold flex items-center gap-2 shadow-lg"
            >
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 animate-spin" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sharing Link Box */}
        <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3 mb-5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-300 font-bold flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-cyan-400" /> Your Personal Referral Link:
            </span>
            <span className="text-[10px] text-amber-300 font-bold bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
              +10 Points / Signup
            </span>
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2 rounded-xl">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="bg-transparent text-xs font-mono text-zinc-200 w-full outline-none select-all truncate"
            />
            <button
              onClick={handleCopyLink}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1 cursor-pointer flex-shrink-0 ${
                copied
                  ? 'bg-emerald-500 text-black font-extrabold'
                  : 'bg-cyan-500 text-black hover:bg-cyan-400 font-extrabold'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          {/* Social Quick Share Buttons */}
          <div className="pt-1">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-2 font-bold">
              Instant Share Via:
            </span>
            <div className="grid grid-cols-4 gap-2">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join me on Twogether! Here is my invite link to connect: ${referralLink}`)}`}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 flex flex-col items-center justify-center text-center gap-1 transition-all"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-[9px] font-bold">WhatsApp</span>
              </a>

              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I'm vibing on Twogether! Connect with me here:`)}&url=${encodeURIComponent(referralLink)}`}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:bg-blue-500/25 flex flex-col items-center justify-center text-center gap-1 transition-all"
              >
                <Send className="w-4 h-4 text-blue-400" />
                <span className="text-[9px] font-bold">X (Twitter)</span>
              </a>

              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join me on Twogether!')}`}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 flex flex-col items-center justify-center text-center gap-1 transition-all"
              >
                <Send className="w-4 h-4 text-cyan-400" />
                <span className="text-[9px] font-bold">Telegram</span>
              </a>

              <button
                onClick={handleNativeShare}
                className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 flex flex-col items-center justify-center text-center gap-1 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-purple-400" />
                <span className="text-[9px] font-bold">More...</span>
              </button>
            </div>
          </div>
        </div>

        {/* How It Works List */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 mb-5 text-xs text-zinc-300">
          <div className="flex items-center gap-2 font-bold text-white">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>How Your Referral Points Work:</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-zinc-400">
            <li className="flex items-start gap-1.5">
              <span className="text-cyan-400 font-bold">1.</span>
              <span>Share your referral link with anyone.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-cyan-400 font-bold">2.</span>
              <span>When they sign up, your account is credited with <strong className="text-white">+10 Points</strong> instantly.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-cyan-400 font-bold">3.</span>
              <span>Accumulate points to generate valuable Gifts (<strong className="text-amber-300">25 Points = 1 Gift</strong>) or unlock exclusive features!</span>
            </li>
          </ul>
        </div>

        {/* Interactive Action Buttons */}
        <div className="space-y-2.5">
          {/* Simulate Friend Joined Button for testing & verification */}
          <button
            onClick={handleSimulateFriendJoined}
            disabled={isSimulatingJoin}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-black font-extrabold text-xs shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>{isSimulatingJoin ? 'Processing referral...' : 'Simulate Friend Joining (+10 Points Instant Reward)'}</span>
          </button>

          {onOpenGiftsStore && (
            <button
              onClick={() => {
                onClose();
                onOpenGiftsStore();
              }}
              className="w-full py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5 fill-amber-400" />
              <span>Go to Gifts Store & Convert Points (25 Pts = 1 Gift)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-2 text-zinc-400 hover:text-white text-xs font-mono transition-colors cursor-pointer"
          >
            Close Referral Window
          </button>
        </div>
      </motion.div>
    </div>
  );
};
