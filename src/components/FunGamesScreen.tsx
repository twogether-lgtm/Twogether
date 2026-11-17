import React, { useState } from 'react';
import { Gamepad2, Sparkles, HelpCircle, Trophy, Star, ChevronRight, Zap, Flame, Heart, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { CouplesGamesHub } from './CouplesGamesHub';

interface FunGamesScreenProps {
  onStartIcebreaker: () => void;
  onOpenSharedBeats: () => void;
  isVip?: boolean;
  onOpenUpgradeModal?: (reason?: string) => void;
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
  const [activeQuizQuestion, setActiveQuizQuestion] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [streakCount, setStreakCount] = useState<number>(0);

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
    setSelectedAnswer(index);
    setQuizScore((prev) => prev + 25);
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
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              Twogether Interactive Games
            </div>

            {isVip ? (
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-mono font-black flex items-center gap-1 shadow-md">
                <Crown className="w-3.5 h-3.5 fill-black" /> VIP MODE: ENDLESS SPICY THROUGHOUT
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-white/10 text-zinc-300 text-xs font-mono font-bold flex items-center gap-1 border border-white/10">
                🟢 BASIC MODE: 5-Prompt Loop (~2h Daily Rest)
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Fun & Games Arcade</h1>
          <p className="text-zinc-400 text-xs sm:text-sm">
            {isVip
              ? '👑 VIP Subscription Active: Enjoy endless Spicy, More Spicy, Hot, Extra Hot & Extremely Hot vybes throughout 24/7!'
              : 'Basic mode repeats 5 sample prompts and rests near 2h so next day brings more vybe. VIP unlocks endless spicy vybes throughout!'}
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

      {mainTab === 'couples' ? (
        <CouplesGamesHub
          onOpenSharedBeats={onOpenSharedBeats}
          isVip={isVip}
          onOpenUpgradeModal={onOpenUpgradeModal}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserEmail={currentUserEmail}
          onReportViolation={onReportViolation}
          initialPartyRoomCode={initialPartyRoomCode}
          initialCoupleRoomCode={initialCoupleRoomCode}
          initialCouplePlayMode={initialCouplePlayMode}
        />
      ) : (
        <>
          {/* Featured Icebreaker Quiz Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Icebreaker Quiz */}
        <GlassCard className="p-5 relative overflow-hidden group border border-pink-500/30" glowColor="pink">
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
            <Star className="w-3 h-3 text-pink-400 fill-pink-400" /> TOP GAME
          </div>

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-500 p-0.5 mb-4 shadow-lg">
            <div className="w-full h-full bg-[#161426] rounded-[14px] flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-pink-400" />
            </div>
          </div>

          <h3 className="text-lg font-bold text-white text-left mb-1">Icebreaker Quiz</h3>
          <p className="text-xs text-zinc-400 text-left mb-4">
            Answer 3 quick preference questions to automatically match with single souls who share your exact taste.
          </p>

          <button
            onClick={() => {
              setActiveQuizQuestion(0);
              setQuizFinished(false);
            }}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-pink-500/20 border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all group-hover:border-pink-500/40"
          >
            Play Icebreaker Quiz <ChevronRight className="w-4 h-4 text-pink-400" />
          </button>
        </GlassCard>

        {/* Card 2: Get to Know Me Card Game */}
        <GlassCard className="p-5 relative overflow-hidden group border border-cyan-500/30" glowColor="cyan">
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" /> POPULAR
          </div>

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-purple-500 p-0.5 mb-4 shadow-lg">
            <div className="w-full h-full bg-[#161426] rounded-[14px] flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-cyan-400" />
            </div>
          </div>

          <h3 className="text-lg font-bold text-white text-left mb-1">Get to Know Twogether</h3>
          <p className="text-xs text-zinc-400 text-left mb-4">
            Multiplayer card round for 2 players in the VR Lounge or direct messaging room.
          </p>

          <button
            onClick={onStartIcebreaker}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-cyan-500/20 border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all group-hover:border-cyan-500/40"
          >
            Challenge a Match <ChevronRight className="w-4 h-4 text-cyan-400" />
          </button>
        </GlassCard>
      </div>

      {/* Interactive Icebreaker Quiz Modal / In-Place Drawer */}
      <AnimatePresence>
        {activeQuizQuestion !== null && (
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
                      ⚡ {quizScore} pts • 🔥 {streakCount}x Streak
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
                  <Zap className="w-3.5 h-3.5" /> Score: {quizScore} pts • {streakCount}x Electric Streak
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
  );
};
