import React, { useState, useEffect } from 'react';
import { Gift, Sparkles, CheckCircle2, Calendar, Trophy, Flame, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { GlassCard } from './GlassCard';

interface DailyLoginRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimReward: (gifts: number, points: number) => void;
  pointsBalance: number;
}

interface DailyRewardDay {
  day: number;
  gifts: number;
  points: number;
  label: string;
  isMilestone?: boolean;
}

const STREAK_SCHEDULE: DailyRewardDay[] = [
  { day: 1, gifts: 0, points: 2.5, label: 'Day 1' },
  { day: 2, gifts: 0, points: 2.5, label: 'Day 2' },
  { day: 3, gifts: 0, points: 2.5, label: 'Day 3' },
  { day: 4, gifts: 0, points: 2.5, label: 'Day 4' },
  { day: 5, gifts: 0, points: 2.5, label: 'Day 5' },
  { day: 6, gifts: 0, points: 2.5, label: 'Day 6' },
  { day: 7, gifts: 1, points: 2.5, label: 'Day 7 (2.5 Pts + 1 Gift Milestone)', isMilestone: true },
];

export const DailyLoginRewardModal: React.FC<DailyLoginRewardModalProps> = ({
  isOpen,
  onClose,
  onClaimReward,
  pointsBalance,
}) => {
  const [streakDay, setStreakDay] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('twogether_daily_streak_count');
      return saved ? Math.min(7, Math.max(1, Number(saved))) : 1;
    } catch {
      return 1;
    }
  });

  const [hasClaimedToday, setHasClaimedToday] = useState<boolean>(() => {
    try {
      const last = localStorage.getItem('twogether_last_daily_login');
      if (last) {
        const diff = Date.now() - Number(last);
        return diff < 24 * 60 * 60 * 1000;
      }
    } catch {
      // ignore
    }
    return false;
  });

  const [isOpeningBox, setIsOpeningBox] = useState<boolean>(false);
  const [rewardClaimedAnimation, setRewardClaimedAnimation] = useState<boolean>(false);
  const [timeRemainingStr, setTimeRemainingStr] = useState<string>('');

  useEffect(() => {
    const updateCountdown = () => {
      try {
        const last = localStorage.getItem('twogether_last_daily_login');
        if (last) {
          const nextClaim = Number(last) + 24 * 60 * 60 * 1000;
          const remaining = nextClaim - Date.now();
          if (remaining > 0) {
            const hrs = Math.floor(remaining / (1000 * 60 * 60));
            const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((remaining % (1000 * 60)) / 1000);
            setTimeRemainingStr(`${hrs}h ${mins}m ${secs}s`);
            setHasClaimedToday(true);
          } else {
            setHasClaimedToday(false);
            setTimeRemainingStr('Available Now!');
          }
        } else {
          setHasClaimedToday(false);
          setTimeRemainingStr('Available Now!');
        }
      } catch {
        // ignore
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  const currentReward = STREAK_SCHEDULE[streakDay - 1] || STREAK_SCHEDULE[0];

  const handleClaim = () => {
    if (hasClaimedToday || isOpeningBox) return;
    setIsOpeningBox(true);

    // Audio chime
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
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.09 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.09);
          osc.stop(ctx.currentTime + idx * 0.09 + 0.45);
        });
      }
    } catch {
      // ignore
    }

    setTimeout(() => {
      onClaimReward(currentReward.gifts, currentReward.points);
      setHasClaimedToday(true);
      setRewardClaimedAnimation(true);
      setIsOpeningBox(false);

      try {
        localStorage.setItem('twogether_last_daily_login', String(Date.now()));
        const nextStreak = streakDay >= 7 ? 1 : streakDay + 1;
        localStorage.setItem('twogether_daily_streak_count', String(nextStreak));
        setStreakDay(nextStreak);
      } catch {
        // ignore
      }

      try {
        confetti({
          particleCount: 65,
          spread: 80,
          origin: { y: 0.55 },
          colors: ['#ec4899', '#fbbf24', '#06b6d4', '#10b981'],
        });
      } catch {
        // ignore
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        className="w-full max-w-lg"
      >
        <GlassCard className="p-6 sm:p-7 border border-amber-400/50 relative overflow-hidden shadow-2xl bg-gradient-to-b from-[#181427] via-[#110e1d] to-black" glowColor="amber">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center space-y-2 mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-mono font-bold">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>24-Hour Daily Login Reward</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Orbit Check-In Rewards
            </h2>
            <p className="text-xs text-zinc-300 max-w-sm mx-auto">
              Open Twogether once every 24 hours to claim valuable gifts & hard-earned points. Keep your streak alive!
            </p>
          </div>

          {/* Central Animated Gift Box */}
          <div className="relative py-4 my-2 flex flex-col items-center justify-center text-center">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/30 via-pink-500/20 to-cyan-400/20 rounded-full blur-xl animate-pulse" />
              <div className={`w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-500 to-pink-500 p-0.5 shadow-2xl flex items-center justify-center ${isOpeningBox ? 'animate-bounce' : ''}`}>
                <div className="w-full h-full bg-[#181428] rounded-[22px] flex items-center justify-center relative overflow-hidden">
                  <Gift className="w-12 h-12 text-amber-300" />
                  <span className="absolute -bottom-1 text-[9px] font-mono font-extrabold text-amber-400 uppercase tracking-widest">
                    DAY {streakDay}
                  </span>
                </div>
              </div>
            </div>

            {/* Current Day Reward preview */}
            <div className="mt-3 text-center">
              <span className="text-xs font-mono text-zinc-400">Today's Daily Login Reward:</span>
              <div className="flex items-center justify-center gap-2 mt-0.5">
                <span className="px-3 py-1 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 text-xs font-bold font-mono">
                  ⭐ +{currentReward.points} Points
                </span>
                {currentReward.gifts > 0 && (
                  <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-bold font-mono">
                    🎁 +{currentReward.gifts} Bonus Milestone Gift
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 7-Day Progressive Streak Bar */}
          <div className="my-5">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-2">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-pink-400" />
                Streak Progress: <strong className="text-white">{streakDay}/7 Days</strong>
              </span>
              <span className="text-cyan-300 font-bold">Each Day = 2.5 Points • 25 Pts = 1 Gift (10 Days Dedication)</span>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {STREAK_SCHEDULE.map((item) => {
                const isPast = item.day < streakDay;
                const isCurrent = item.day === streakDay;
                return (
                  <div
                    key={item.day}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-between ${
                      isPast
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : isCurrent
                        ? 'bg-amber-400/20 border-amber-400 text-amber-200 shadow-md scale-105'
                        : 'bg-white/5 border-white/10 text-zinc-400'
                    }`}
                  >
                    <span className="text-[9px] font-mono font-bold">D{item.day}</span>
                    <Sparkles className={`w-3.5 h-3.5 my-1 ${isPast ? 'text-emerald-400' : isCurrent ? 'text-cyan-300 animate-pulse' : 'text-zinc-500'}`} />
                    <span className="text-[8.5px] font-mono font-extrabold block">
                      +{item.points}P
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Claim / Timer Action Button */}
          <div className="space-y-2 pt-2">
            {!hasClaimedToday ? (
              <button
                onClick={handleClaim}
                disabled={isOpeningBox}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-pink-500 text-black font-black text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 fill-black" />
                <span>
                  {isOpeningBox
                    ? 'Opening Daily Gift Box...'
                    : `Claim Day ${streakDay} Login (+${currentReward.points} Points${currentReward.gifts > 0 ? ` & +${currentReward.gifts} Gift` : ''})`}
                </span>
              </button>
            ) : (
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Claimed for Today! (+2.5 Points added)</span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" /> Next Login Reward In: <strong className="text-white">{timeRemainingStr}</strong>
                </p>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Continue to App
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
