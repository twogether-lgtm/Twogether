import React, { useState, useRef } from 'react';
import { Gamepad2, Sparkles, HelpCircle, Star, ChevronRight, Zap, Flame, Heart, Crown, Lock, Eye, RotateCw, Plane, Smartphone, Dices, CheckCircle2, Trophy, Plus, Check, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { CouplesGamesHub, CoupleGameTabId } from './CouplesGamesHub';

import { ActiveSubscriptionRecord, ArcadeGameId, GamePlanDurationId, GameUnlockEntry } from '../types';
import {
  ARCADE_GAME_CATALOG,
  GAME_DURATION_OPTIONS,
  calculateArcadeCheckout,
  getDurationOption,
} from '../data/subscriptionData';

interface FunGamesScreenProps {
  onStartIcebreaker: () => void;
  onOpenSharedBeats: () => void;
  isVip?: boolean;
  activeSubscription?: ActiveSubscriptionRecord | null;
  unlockedGamesMap?: Partial<Record<ArcadeGameId, GameUnlockEntry>>;
  onOpenUpgradeModal?: (
    reason?: string,
    preselectedGameIds?: ArcadeGameId[],
    preferredDuration?: GamePlanDurationId
  ) => void;
  currentUserId?: string;
  currentUserName?: string;
  currentUserEmail?: string;
  onReportViolation?: (strike: { type: 'message' | 'post'; reason: string; snippet?: string }) => void;
  initialPartyRoomCode?: string | null;
  initialCoupleRoomCode?: string | null;
  initialCouplePlayMode?: 'online' | 'offline' | null;
}

export const FunGamesScreen: React.FC<FunGamesScreenProps> = ({
  onStartIcebreaker,
  onOpenSharedBeats,
  isVip = false,
  activeSubscription,
  unlockedGamesMap = {},
  onOpenUpgradeModal,
  currentUserId,
  currentUserName,
  currentUserEmail,
  onReportViolation,
  initialPartyRoomCode,
  initialCoupleRoomCode,
  initialCouplePlayMode,
}) => {
  const [mainTab, setMainTab] = useState<'couples' | 'singles'>('couples');
  const [selectedCoupleGameTab, setSelectedCoupleGameTab] = useState<CoupleGameTabId>('wheel');
  const [selectedSinglesGame, setSelectedSinglesGame] = useState<'singles_quiz' | 'singles_cards' | null>(null);
  const [isDirectoryExpanded, setIsDirectoryExpanded] = useState<boolean>(true);
  const [plannedDuration, setPlannedDuration] = useState<GamePlanDurationId>('daily');
  const [selectedSumGameIds, setSelectedSumGameIds] = useState<ArcadeGameId[]>([]);
  const gameStageRef = useRef<HTMLDivElement | null>(null);
  const [activeQuizQuestion, setActiveQuizQuestion] = useState<number | null>(null);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [streakCount, setStreakCount] = useState<number>(0);

  const isGameUnlocked = (gameId: ArcadeGameId): boolean => {
    if (isVip || activeSubscription) return true;
    const entry = unlockedGamesMap[gameId];
    return Boolean(entry && entry.expiresAtMs > Date.now());
  };

  const GAME_VISUAL_META: Record<
    ArcadeGameId,
    { accentBorder: string; accentBg: string; icon: React.ReactNode }
  > = {
    wheel: {
      accentBorder: 'border-pink-500/40',
      accentBg: 'from-pink-500/15 to-purple-500/10',
      icon: <RotateCw className="w-4 h-4 text-pink-400" />,
    },
    aviator_crash: {
      accentBorder: 'border-rose-500/40',
      accentBg: 'from-rose-500/15 to-amber-500/10',
      icon: <Plane className="w-4 h-4 text-amber-300" />,
    },
    cards: {
      accentBorder: 'border-purple-500/40',
      accentBg: 'from-purple-500/15 to-indigo-500/10',
      icon: <Flame className="w-4 h-4 text-purple-300" />,
    },
    social_viral: {
      accentBorder: 'border-red-500/40',
      accentBg: 'from-red-500/15 to-pink-500/10',
      icon: <Smartphone className="w-4 h-4 text-rose-300" />,
    },
    dice: {
      accentBorder: 'border-amber-400/40',
      accentBg: 'from-amber-500/15 to-orange-500/10',
      icon: <Dices className="w-4 h-4 text-amber-300" />,
    },
    quiz: {
      accentBorder: 'border-cyan-400/40',
      accentBg: 'from-cyan-500/15 to-blue-500/10',
      icon: <HelpCircle className="w-4 h-4 text-cyan-300" />,
    },
    singles_quiz: {
      accentBorder: 'border-fuchsia-400/40',
      accentBg: 'from-fuchsia-500/15 to-pink-500/10',
      icon: <Sparkles className="w-4 h-4 text-fuchsia-300" />,
    },
    singles_cards: {
      accentBorder: 'border-sky-400/40',
      accentBg: 'from-sky-500/15 to-indigo-500/10',
      icon: <Gamepad2 className="w-4 h-4 text-sky-300" />,
    },
  };

  const ALL_ARCADE_GAMES = ARCADE_GAME_CATALOG.map((item) => ({
    ...item,
    ...GAME_VISUAL_META[item.id],
  }));

  const activeDurationOption = getDurationOption(plannedDuration);
  const unlockedCount = ALL_ARCADE_GAMES.filter((g) => isGameUnlocked(g.id)).length;
  const allGamesUnlocked = unlockedCount === ALL_ARCADE_GAMES.length;
  const lockedSumSelection = selectedSumGameIds.filter((id) => !isGameUnlocked(id));
  const sumQuote = calculateArcadeCheckout(lockedSumSelection, plannedDuration, false);
  const allBundleQuote = calculateArcadeCheckout(
    ALL_ARCADE_GAMES.map((g) => g.id),
    plannedDuration,
    true
  );

  const toggleGameInSum = (gameId: ArcadeGameId) => {
    setSelectedSumGameIds((prev) =>
      prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId]
    );
  };

  const handleInspectGame = (game: (typeof ALL_ARCADE_GAMES)[number]) => {
    if (game.mode === 'couples' && game.coupleTab) {
      setMainTab('couples');
      setSelectedCoupleGameTab(game.coupleTab);
      setSelectedSinglesGame(null);
    } else {
      setMainTab('singles');
      setSelectedSinglesGame(game.id === 'singles_cards' ? 'singles_cards' : 'singles_quiz');
    }
    setTimeout(() => {
      gameStageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  // Subscription Wheel Immediate Exclusion Pool & Endless Gaming Loop State
  const [wheelLoopState, setWheelLoopState] = useState<{
    excludedSegmentIds: number[];
    cycleCount: number;
    lastPlayedSegmentId: number | null;
  }>(() => {
    try {
      const saved = localStorage.getItem('twogether_wheel_pool_state_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.excludedSegmentIds)) {
          return {
            excludedSegmentIds: parsed.excludedSegmentIds.filter((id: unknown) => typeof id === 'number'),
            cycleCount: typeof parsed.cycleCount === 'number' && parsed.cycleCount >= 1 ? parsed.cycleCount : 1,
            lastPlayedSegmentId: typeof parsed.lastPlayedSegmentId === 'number' ? parsed.lastPlayedSegmentId : null,
          };
        }
      }
    } catch {
      // ignore storage errors
    }
    return { excludedSegmentIds: [], cycleCount: 1, lastPlayedSegmentId: null };
  });

  const persistWheelLoopState = (next: {
    excludedSegmentIds: number[];
    cycleCount: number;
    lastPlayedSegmentId: number | null;
  }) => {
    try {
      localStorage.setItem('twogether_wheel_pool_state_v1', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleWheelGamePlayed = (segmentId: number, eligibleSegmentIds: number[]) => {
    setWheelLoopState((prev) => {
      const updatedExcluded = prev.excludedSegmentIds.includes(segmentId)
        ? prev.excludedSegmentIds
        : [...prev.excludedSegmentIds, segmentId];

      // Once every eligible game in the subscription pool has been played, roll into the next endless loop cycle
      // while keeping the just-played game excluded from the immediate next spin to prevent back-to-back repeats.
      const allEligiblePlayed =
        eligibleSegmentIds.length > 0 &&
        eligibleSegmentIds.every((id) => updatedExcluded.includes(id));

      const nextState = allEligiblePlayed
        ? {
            excludedSegmentIds: eligibleSegmentIds.length > 1 ? [segmentId] : [],
            cycleCount: prev.cycleCount + 1,
            lastPlayedSegmentId: segmentId,
          }
        : {
            excludedSegmentIds: updatedExcluded,
            cycleCount: prev.cycleCount,
            lastPlayedSegmentId: segmentId,
          };

      persistWheelLoopState(nextState);
      return nextState;
    });
  };

  const handleResetWheelPool = () => {
    const resetState = { excludedSegmentIds: [], cycleCount: 1, lastPlayedSegmentId: null };
    setWheelLoopState(resetState);
    persistWheelLoopState(resetState);
  };

  const isSinglesQuizUnlocked = isGameUnlocked('singles_quiz');
  const isSinglesCardsUnlocked = isGameUnlocked('singles_cards');
  const isAnyGameUnlocked = unlockedCount > 0;

  const quizQuestions = [
    {
      question: "What's your ideal indoor or outdoor date atmosphere?",
      options: [
        '🌳 Outdoor sunset promenade walk in a botanical garden',
        '☕ Fireside coffee or herbal tea with vintage vinyl playing',
        '🎧 Listening to lofi beats in a neon VR lounge',
        '🌌 Outdoor midnight stargazing with deep conversations',
      ],
    },
    {
      question: 'Which music era & genre best syncs with your soul?',
      options: [
        '🎷 70s & 80s Classic Soul, Funk & Motown',
        '☕ Chill Lofi, Jazzhop & Acoustic Guitar',
        '🎸 80s Rock & Timeless Pop Ballads',
        '⚡ Cyberpunk, Synthwave & Electronic',
      ],
    },
    {
      question: 'How do you prefer breaking the ice with a new match?',
      options: [
        '📻 Playing a quick retro trivia quiz together',
        '🎵 Sharing a favorite nostalgic song track',
        '🎙️ Sending a warm voice note intro',
        '💬 Direct AI soul chat in the lounge',
      ],
    },
    {
      question: 'What is your love language when deepening intimacy?',
      options: [
        '🫂 Physical touch & lingering slow kisses',
        '🗣️ Deep 2 AM pillow-talk & vulnerability',
        '🎁 Thoughtful micro-surprises & shared adventures',
        '✨ Quality undivided presence with phones away',
      ],
    },
    {
      question: 'What kind of weekend escape restores your energy best?',
      options: [
        '🏡 Remote cabin in the misty mountains with hot tub',
        '🏖️ Tropical beach bungalow with ocean soundscapes',
        '🌆 Vibrant neon city boutique hotel & rooftop jazz',
        '🌿 Peaceful countryside vineyard & bike trails',
      ],
    },
    {
      question: 'If you could master one couple hobby together, what would it be?',
      options: [
        '💃 Salsa, bachata, or slow vinyl ballroom dancing',
        '🍳 Gourmet culinary cooking & baking from scratch',
        '🎧 Music production, DJing & shared audio jams',
        '🌌 Astrophotography & midnight stargazing travels',
      ],
    },
  ];

  const handleSelectOption = (index: number) => {
    if (!isSinglesQuizUnlocked) {
      onOpenUpgradeModal?.(
        `Unlock Singles Icebreaker Quiz ($${activeDurationOption.perGameUsd.toFixed(2)} for ${activeDurationOption.shortLabel}) or sum/bundle all 8 games via Google Pay.`,
        ['singles_quiz'],
        plannedDuration
      );
      return;
    }
    setSelectedAnswer(index);
    setStreakCount((prev) => prev + 1);
    setTimeout(() => {
      if (activeQuizQuestion !== null && activeQuizQuestion < quizQuestions.length - 1) {
        setActiveQuizQuestion(activeQuizQuestion + 1);
        setSelectedAnswer(null);
      } else {
        setQuizFinished(true);
      }
    }, 400);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Hero Welcome Header & Main Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-left space-y-1">
          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
            <span className="text-cyan-300 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Twogether Interactive Games
            </span>
            <span className="text-zinc-500" aria-hidden="true">·</span>
            {allGamesUnlocked ? (
              <span className="text-amber-300 font-black flex items-center gap-1 tabular-nums">
                <Crown className="w-3.5 h-3.5 text-amber-400" /> All 8 Games Unlocked · Cycle #{wheelLoopState.cycleCount} ({wheelLoopState.excludedSegmentIds.length} Played)
              </span>
            ) : isAnyGameUnlocked ? (
              <span className="text-emerald-300 font-bold flex items-center gap-1 tabular-nums">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {unlockedCount}/8 Games Unlocked · Unlock More One-by-One or Sum All
              </span>
            ) : (
              <span className="text-amber-300 font-bold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> Pay Per Game ($0.14+) or Bundle All 8 ($1.00+)
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Fun & Games Arcade</h1>
          <p className="text-zinc-400 text-xs sm:text-sm">
            {allGamesUnlocked
              ? 'All 8 Games Active: Played wheel games are excluded from the immediate pool to guarantee an endless non-repeating loop 24/7.'
              : 'Pick your planned duration below — unlock 1 game at a time ($0.14+), sum multiple games, or pay once for all 8 games together ($1.00+).'}
          </p>
        </div>

        {/* Mode Switcher Buttons */}
        <div className="flex items-center gap-2 bg-[#171526] p-1.5 rounded-2xl border border-white/10 shrink-0">
          <button
            onClick={() => setMainTab('couples')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mainTab === 'couples'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Heart className="w-4 h-4 fill-pink-400 text-pink-400" />
            Couples Fused Arcade
          </button>

          <button
            onClick={() => setMainTab('singles')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mainTab === 'singles'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-lg shadow-cyan-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            Singles Icebreaker
          </button>
        </div>
      </div>

      {/* Visible All-Games Showcase Catalog: Pay One After the Other, Sum Selected, or Pay Once for All 8 */}
      <div className="rounded-3xl bg-[#141122]/90 border border-white/12 p-4 sm:p-5 space-y-4 text-left">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10.5px] font-mono font-black uppercase tracking-wider text-cyan-300 block">
              All 8 Interactive Games Available · {unlockedCount}/8 Unlocked
            </span>
            <h2 className="text-sm sm:text-base font-extrabold text-white">
              {allGamesUnlocked
                ? 'All 8 Games Unlocked — Choose Any Game Below'
                : 'Pay One Game After the Other, Sum Multiple, or Pay Once for All 8'}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setIsDirectoryExpanded((prev) => !prev)}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-mono font-bold text-zinc-200 cursor-pointer whitespace-nowrap"
          >
            {isDirectoryExpanded ? 'Hide Game List' : 'Show All 8 Games'}
          </button>
        </div>

        {/* Planned Duration Selector Bar */}
        {!allGamesUnlocked && (
          <div className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <span className="text-cyan-300 font-black flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Planned Duration:
              </span>
              <span className="text-zinc-400">
                ${activeDurationOption.perGameUsd.toFixed(2)}/game · Pay Once All 8: ${activeDurationOption.allGamesBundleUsd.toFixed(2)}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {GAME_DURATION_OPTIONS.map((dur) => {
                const isDurActive = plannedDuration === dur.id;
                return (
                  <button
                    key={dur.id}
                    type="button"
                    onClick={() => setPlannedDuration(dur.id)}
                    className={`px-2.5 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isDurActive
                        ? 'bg-cyan-500/20 border-cyan-400 text-white ring-1 ring-cyan-400/40'
                        : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/30'
                    }`}
                  >
                    <span className="block text-[11px] font-black">{dur.shortLabel}</span>
                    <span className="block text-[10px] font-mono text-amber-300">
                      ${dur.perGameUsd.toFixed(2)}/gm · ${dur.allGamesBundleUsd.toFixed(2)} all
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isDirectoryExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {ALL_ARCADE_GAMES.map((game) => {
              const isSelected =
                game.mode === 'couples'
                  ? mainTab === 'couples' && selectedCoupleGameTab === game.coupleTab
                  : mainTab === 'singles' && selectedSinglesGame === game.id;
              const unlockedForGame = isGameUnlocked(game.id);
              const gameUnlockRec = unlockedGamesMap[game.id];
              const isInSum = !unlockedForGame && selectedSumGameIds.includes(game.id);

              return (
                <div
                  key={game.id}
                  className={`p-3 rounded-2xl bg-gradient-to-b ${game.accentBg} border transition-all flex flex-col justify-between gap-2.5 ${
                    isInSum
                      ? 'border-pink-400 ring-1 ring-pink-400/50 shadow-lg'
                      : isSelected
                      ? 'border-white/70 ring-1 ring-white/30 shadow-lg'
                      : `${game.accentBorder} hover:border-white/40`
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-7 h-7 rounded-xl bg-black/50 border border-white/15 flex items-center justify-center shrink-0">
                          {game.icon}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-black text-white truncate">{game.title}</h3>
                          <span className="text-[10px] font-mono text-zinc-400 block truncate">
                            {game.subtitle}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[9.5px] font-mono font-bold shrink-0 ${
                          unlockedForGame
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                            : 'bg-amber-400/20 text-amber-200 border border-amber-400/35'
                        }`}
                      >
                        {unlockedForGame
                          ? gameUnlockRec
                            ? `Unlocked (${gameUnlockRec.planId === 'two_weeks' ? '14d' : gameUnlockRec.planId === 'weekly' ? '7d' : gameUnlockRec.planId === 'monthly' ? '30d' : gameUnlockRec.planId === 'yearly' ? '1yr' : '1d'})`
                            : 'Unlocked'
                          : `$${activeDurationOption.perGameUsd.toFixed(2)}/${activeDurationOption.shortLabel}`}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-300 leading-snug line-clamp-2">
                      {game.teaser}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleInspectGame(game)}
                        className={`flex-1 py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? 'bg-white text-black font-black'
                            : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                        }`}
                      >
                        <Eye className="w-3 h-3 shrink-0" />
                        <span>{unlockedForGame ? (isSelected ? 'Playing' : 'Open') : isSelected ? 'Previewing' : 'Preview'}</span>
                      </button>

                      {!unlockedForGame && onOpenUpgradeModal && (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenUpgradeModal(
                              `Pay for ${game.title} alone ($${activeDurationOption.perGameUsd.toFixed(2)} for ${activeDurationOption.label}), add more games to sum, or Pay Once for All 8 ($${activeDurationOption.allGamesBundleUsd.toFixed(2)}).`,
                              [game.id],
                              plannedDuration
                            )
                          }
                          className="py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-mono font-black text-[10.5px] shadow transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                          title={`Pay for ${game.title} ($${activeDurationOption.perGameUsd.toFixed(2)})`}
                        >
                          <Crown className="w-3 h-3 fill-black" />
                          <span>${activeDurationOption.perGameUsd.toFixed(2)}</span>
                        </button>
                      )}

                      {unlockedForGame && (
                        <span className="text-emerald-300 flex items-center" title="Game unlocked">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      )}
                    </div>

                    {!unlockedForGame && (
                      <button
                        type="button"
                        onClick={() => toggleGameInSum(game.id)}
                        className={`w-full py-1 px-2 rounded-lg text-[10.5px] font-mono font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          isInSum
                            ? 'bg-pink-500 text-white'
                            : 'bg-black/40 hover:bg-white/10 text-zinc-300 border border-white/10'
                        }`}
                      >
                        {isInSum ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        <span>{isInSum ? 'Added to Sum' : 'Add to Sum'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sum Selected Games vs Pay Once for All 8 Checkout Bar */}
        {!allGamesUnlocked && onOpenUpgradeModal && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/70 via-[#1a152e] to-amber-950/40 border border-amber-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-black text-white flex items-center gap-1.5 flex-wrap">
                {lockedSumSelection.length === 0 ? (
                  <span>Select games to Sum, tap a single game price (${activeDurationOption.perGameUsd.toFixed(2)}) one-by-one, or Pay Once for All 8!</span>
                ) : sumQuote.isAllGamesBundle ? (
                  <span className="text-emerald-300">
                    All 8 Games Bundle ({activeDurationOption.shortLabel}) · Total: ${sumQuote.finalUsd.toFixed(2)} (Save ${sumQuote.bundleSavingsUsd.toFixed(2)} vs 8 × ${activeDurationOption.perGameUsd.toFixed(2)})
                  </span>
                ) : (
                  <span>
                    {lockedSumSelection.length} Game{lockedSumSelection.length > 1 ? 's' : ''} × ${activeDurationOption.perGameUsd.toFixed(2)} ({activeDurationOption.shortLabel}) = ${sumQuote.finalUsd.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-zinc-400">
                Planned Duration: {activeDurationOption.label} · Already Unlocked: {unlockedCount}/8
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {lockedSumSelection.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenUpgradeModal(
                      `Pay Sum for ${lockedSumSelection.length} Selected Game(s) (${lockedSumSelection.length} × $${activeDurationOption.perGameUsd.toFixed(2)} = $${sumQuote.finalUsd.toFixed(2)} for ${activeDurationOption.label}) via Google Pay.`,
                      lockedSumSelection,
                      plannedDuration
                    )
                  }
                  className="px-3.5 py-2 rounded-xl bg-black hover:bg-zinc-900 border border-pink-400/60 text-white font-mono font-black text-xs shadow cursor-pointer whitespace-nowrap"
                >
                  {sumQuote.isAllGamesBundle
                    ? `Pay All 8 ($${sumQuote.finalUsd.toFixed(2)})`
                    : `Pay Sum (${lockedSumSelection.length} × $${activeDurationOption.perGameUsd.toFixed(2)} = $${sumQuote.finalUsd.toFixed(2)})`}
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  onOpenUpgradeModal(
                    `Pay Once to Unlock All 8 Games for ${activeDurationOption.label} ($${allBundleQuote.finalUsd.toFixed(2)}) via Google Pay.`,
                    ALL_ARCADE_GAMES.map((g) => g.id),
                    plannedDuration
                  )
                }
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-mono font-black text-xs shadow-lg hover:scale-[1.02] transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Crown className="w-3.5 h-3.5 fill-black" />
                <span>Pay Once All 8 (${allBundleQuote.finalUsd.toFixed(2)} / {activeDurationOption.shortLabel})</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div ref={gameStageRef}>
      {mainTab === 'couples' ? (
        <CouplesGamesHub
          onOpenSharedBeats={onOpenSharedBeats}
          isVip={isVip}
          activeSubscription={activeSubscription}
          unlockedGamesMap={unlockedGamesMap}
          onOpenUpgradeModal={onOpenUpgradeModal}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserEmail={currentUserEmail}
          onReportViolation={onReportViolation}
          initialPartyRoomCode={initialPartyRoomCode}
          initialCoupleRoomCode={initialCoupleRoomCode}
          initialCouplePlayMode={initialCouplePlayMode}
          excludedWheelGameIds={wheelLoopState.excludedSegmentIds}
          wheelCycleCount={wheelLoopState.cycleCount}
          lastPlayedWheelGameId={wheelLoopState.lastPlayedSegmentId}
          onWheelGamePlayed={handleWheelGamePlayed}
          onResetWheelPool={handleResetWheelPool}
          activeGameTabOverride={selectedCoupleGameTab}
          onGameTabChange={setSelectedCoupleGameTab}
        />
      ) : (
        <>
          {!(isSinglesQuizUnlocked && isSinglesCardsUnlocked) && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-pink-500/15 to-purple-500/15 border border-amber-400/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono font-black text-amber-300">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>UNLOCK SINGLES GAMES INDIVIDUALLY OR TOGETHER</span>
                </div>
                <p className="text-xs text-zinc-300">
                  Pay per game from $0.14/1-Day ($0.49/7-Day) one after another, sum both together, or Pay Once for All 8 Games ($1.00+ via Google Pay).
                </p>
              </div>
              {onOpenUpgradeModal && (
                <button
                  onClick={() =>
                    onOpenUpgradeModal(
                      'Unlock Singles Icebreaker Quiz & Get to Know Twogether individually or summed together via Google Pay.',
                      ['singles_quiz', 'singles_cards'],
                      plannedDuration
                    )
                  }
                  className="px-5 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-mono font-black text-xs shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Crown className="w-4 h-4 fill-black" />
                  <span>Unlock Games ($0.14+)</span>
                </button>
              )}
            </div>
          )}

          {/* Featured Icebreaker Quiz Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Icebreaker Quiz */}
        <GlassCard
          className={`p-5 relative overflow-hidden group border ${
            selectedSinglesGame === 'singles_quiz' ? 'border-pink-400 ring-1 ring-pink-400/40' : 'border-pink-500/30'
          }`}
          glowColor="pink"
        >
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-500 p-0.5 shadow-lg">
              <div className="w-full h-full bg-[#161426] rounded-[14px] flex items-center justify-center">
                <HelpCircle className="w-6 h-6 text-pink-400" />
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-pink-300 flex items-center gap-1">
              {isSinglesQuizUnlocked ? (
                <>
                  <Star className="w-3 h-3 text-pink-400 fill-pink-400" /> Unlocked
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-amber-400" /> From $0.14 / 1-Day
                </>
              )}
            </span>
          </div>

          <h3 className="text-lg font-bold text-white text-left mb-1">Icebreaker Quiz</h3>
          <p className="text-xs text-zinc-400 text-left mb-4">
            Answer quick preference questions to automatically match with single souls who share your exact taste.
          </p>

          <button
            onClick={() => {
              if (!isSinglesQuizUnlocked) {
                onOpenUpgradeModal?.(
                  `Unlock Icebreaker Quiz ($${activeDurationOption.perGameUsd.toFixed(2)} for ${activeDurationOption.shortLabel}) or sum/bundle all 8 games via Google Pay.`,
                  ['singles_quiz'],
                  plannedDuration
                );
                return;
              }
              setActiveQuizQuestion(0);
              setQuizFinished(false);
            }}
            className={`w-full py-2.5 min-h-[44px] rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              isSinglesQuizUnlocked
                ? 'bg-white/10 hover:bg-pink-500/20 border-white/15 text-white group-hover:border-pink-500/40'
                : 'bg-amber-400/15 hover:bg-amber-400/25 border-amber-400/50 text-amber-200'
            }`}
          >
            {!isSinglesQuizUnlocked && <Lock className="w-3.5 h-3.5 text-amber-300" />}
            <span>
              {isSinglesQuizUnlocked
                ? 'Play Icebreaker Quiz'
                : `Pay $${activeDurationOption.perGameUsd.toFixed(2)} (${activeDurationOption.shortLabel}) or Bundle`}
            </span>
            <ChevronRight className="w-4 h-4 text-pink-400" />
          </button>
        </GlassCard>

        {/* Card 2: Get to Know Me Card Game */}
        <GlassCard
          className={`p-5 relative overflow-hidden group border ${
            selectedSinglesGame === 'singles_cards' ? 'border-cyan-400 ring-1 ring-cyan-400/40' : 'border-cyan-500/30'
          }`}
          glowColor="cyan"
        >
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-purple-500 p-0.5 shadow-lg">
              <div className="w-full h-full bg-[#161426] rounded-[14px] flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-cyan-300 flex items-center gap-1">
              {isSinglesCardsUnlocked ? (
                <>
                  <Zap className="w-3 h-3 text-cyan-400" /> Unlocked
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-amber-400" /> From $0.14 / 1-Day
                </>
              )}
            </span>
          </div>

          <h3 className="text-lg font-bold text-white text-left mb-1">Get to Know Twogether</h3>
          <p className="text-xs text-zinc-400 text-left mb-4">
            Multiplayer card round for 2 players in the VR Lounge or direct messaging room.
          </p>

          <button
            onClick={() => {
              if (!isSinglesCardsUnlocked) {
                onOpenUpgradeModal?.(
                  `Unlock Get to Know Twogether ($${activeDurationOption.perGameUsd.toFixed(2)} for ${activeDurationOption.shortLabel}) or sum/bundle all 8 games via Google Pay.`,
                  ['singles_cards'],
                  plannedDuration
                );
                return;
              }
              onStartIcebreaker();
            }}
            className={`w-full py-2.5 min-h-[44px] rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              isSinglesCardsUnlocked
                ? 'bg-white/10 hover:bg-cyan-500/20 border-white/15 text-white group-hover:border-cyan-500/40'
                : 'bg-amber-400/15 hover:bg-amber-400/25 border-amber-400/50 text-amber-200'
            }`}
          >
            {!isSinglesCardsUnlocked && <Lock className="w-3.5 h-3.5 text-amber-300" />}
            <span>
              {isSinglesCardsUnlocked
                ? 'Challenge a Match'
                : `Pay $${activeDurationOption.perGameUsd.toFixed(2)} (${activeDurationOption.shortLabel}) or Bundle`}
            </span>
            <ChevronRight className="w-4 h-4 text-cyan-400" />
          </button>
        </GlassCard>
      </div>

      {/* Interactive Icebreaker Quiz Modal / In-Place Drawer */}
      <AnimatePresence>
        {isSinglesQuizUnlocked && activeQuizQuestion !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-6 bg-gradient-to-b from-[#1E1B2E] to-[#12101F] border border-pink-500/40 rounded-3xl shadow-2xl relative text-left"
          >
            {!quizFinished ? (
              <>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <span className="text-xs font-mono font-bold text-pink-400">
                    QUESTION {activeQuizQuestion + 1} OF {quizQuestions.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[10px] font-mono font-bold">
                      🔥 {streakCount}x Streak
                    </span>
                    <button
                      onClick={() => setActiveQuizQuestion(null)}
                      className="text-xs text-zinc-400 hover:text-white cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white mb-4">
                  {quizQuestions[activeQuizQuestion].question}
                </h3>

                <div className="space-y-2.5">
                  {quizQuestions[activeQuizQuestion].options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      className={`w-full p-3.5 rounded-2xl border text-xs sm:text-sm font-semibold text-left transition-all flex items-center justify-between ${
                        selectedAnswer === idx
                          ? 'bg-pink-500/30 border-pink-400 text-white font-bold scale-[1.02]'
                          : 'bg-white/5 border-white/10 text-zinc-200 hover:bg-white/10 hover:border-pink-500/30'
                      }`}
                    >
                      <span>{opt}</span>
                      {selectedAnswer === idx && <Sparkles className="w-4 h-4 text-pink-400 animate-spin" />}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-pink-500 to-cyan-400 p-1 flex items-center justify-center shadow-xl">
                  <Trophy className="w-8 h-8 text-black" />
                </div>
                <h3 className="text-xl font-extrabold text-white">Quiz Complete! 🎉</h3>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-mono font-bold">
                  <Zap className="w-3.5 h-3.5" /> {streakCount}x Electric Streak
                </div>
                <p className="text-xs text-zinc-300 max-w-sm mx-auto">
                  Your vibe profile has been updated! You matched 98% with <span className="text-cyan-300 font-bold">Aria Sterling</span> and <span className="text-pink-300 font-bold">Maya Lin</span>!
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setActiveQuizQuestion(0);
                      setQuizFinished(false);
                      setSelectedAnswer(null);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-extrabold text-xs shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" /> Play Next Endless Round
                  </button>
                  <button
                    onClick={() => {
                      setActiveQuizQuestion(null);
                      onOpenSharedBeats();
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-extrabold text-xs shadow-lg hover:scale-105 transition-all cursor-pointer"
                  >
                    Listen to Shared Beats Twogether
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shared Beats Teaser Section */}
      <GlassCard className="p-5 flex items-center justify-between gap-4 border border-purple-500/30" glowColor="purple">
        <div className="flex items-center gap-4 text-left">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 p-0.5 shadow-lg flex-shrink-0">
            <div className="w-full h-full bg-[#141224] rounded-[14px] flex items-center justify-center">
              <Flame className="w-7 h-7 text-pink-400 animate-pulse" />
            </div>
          </div>
          <div>
            <span className="text-[10px] font-mono text-purple-300 uppercase tracking-wider font-bold">LIVE MUSIC SYNC</span>
            <h3 className="text-base font-bold text-white">Shared Beats Room</h3>
            <p className="text-xs text-zinc-400">Sync vinyl records & lo-fi drops in real time with single souls.</p>
          </div>
        </div>

        <button
          onClick={onOpenSharedBeats}
          className="px-4 py-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-200 font-bold text-xs hover:bg-purple-500/30 transition-all flex items-center gap-1.5 whitespace-nowrap"
        >
          Listen Live <ChevronRight className="w-4 h-4 text-pink-400" />
        </button>
      </GlassCard>
        </>
      )}
      </div>
    </div>
  );
};
