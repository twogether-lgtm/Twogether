import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, Lock, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AchievementBadgeDefinition,
  AchievementBadgeId,
  AchievementRarity,
} from '../types';
import { ACHIEVEMENT_BADGE_MAP } from '../data/achievementsData';
import {
  ACHIEVEMENT_UNLOCKED_EVENT,
  AchievementProgressItem,
  useAchievements,
} from '../services/achievementService';

const RARITY_STYLES: Record<
  AchievementRarity,
  {
    ring: string;
    surface: string;
    text: string;
    glow: string;
  }
> = {
  Legendary: {
    ring: 'border-amber-400/60',
    surface: 'from-amber-500/20 via-yellow-500/10 to-orange-500/15',
    text: 'text-amber-300',
    glow: 'shadow-amber-500/20',
  },
  Epic: {
    ring: 'border-fuchsia-400/55',
    surface: 'from-fuchsia-500/20 via-purple-500/10 to-pink-500/15',
    text: 'text-fuchsia-300',
    glow: 'shadow-fuchsia-500/20',
  },
  Rare: {
    ring: 'border-cyan-400/55',
    surface: 'from-cyan-500/20 via-sky-500/10 to-teal-500/15',
    text: 'text-cyan-300',
    glow: 'shadow-cyan-500/20',
  },
  Core: {
    ring: 'border-emerald-400/55',
    surface: 'from-emerald-500/20 via-teal-500/10 to-cyan-500/15',
    text: 'text-emerald-300',
    glow: 'shadow-emerald-500/20',
  },
};

export const AchievementBadgeEmblem: React.FC<{
  badgeId: AchievementBadgeId;
  size?: 'sm' | 'md' | 'lg';
  locked?: boolean;
}> = ({ badgeId, size = 'md', locked = false }) => {
  const def = ACHIEVEMENT_BADGE_MAP[badgeId];
  const style = RARITY_STYLES[def?.rarity || 'Core'];
  const dimClass =
    size === 'sm' ? 'w-6 h-6 rounded-lg' : size === 'lg' ? 'w-12 h-12 rounded-2xl' : 'w-8 h-8 rounded-xl';
  const svgDim = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';

  const renderGlyph = () => {
    switch (badgeId) {
      case 'jam_legend':
        return (
          <svg viewBox="0 0 24 24" className={svgDim} fill="none" stroke="currentColor" strokeWidth="1.9">
            <circle cx="12" cy="13" r="7.5" />
            <circle cx="12" cy="13" r="2.2" fill="currentColor" />
            <path d="M7.5 6.5L10 3l2 2.2L14 3l2.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'vr_lounger':
        return (
          <svg viewBox="0 0 24 24" className={svgDim} fill="none" stroke="currentColor" strokeWidth="1.9">
            <rect x="2.5" y="7" width="19" height="10" rx="3.5" />
            <path d="M8.5 17l2-3h3l2 3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="7.8" cy="11.5" r="1.3" fill="currentColor" />
            <circle cx="16.2" cy="11.5" r="1.3" fill="currentColor" />
          </svg>
        );
      case 'arcade_ace':
        return (
          <svg viewBox="0 0 24 24" className={svgDim} fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M12 2.5l8 4.5v5.5c0 4.5-3.4 7.9-8 9-4.6-1.1-8-4.5-8-9V7l8-4.5z" strokeLinejoin="round" />
            <path d="M12 7.5l1.6 3.2 3.4.5-2.5 2.4.6 3.4-3.1-1.6-3.1 1.6.6-3.4-2.5-2.4 3.4-.5L12 7.5z" fill="currentColor" />
          </svg>
        );
      case 'soul_spark':
        return (
          <svg viewBox="0 0 24 24" className={svgDim} fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M12 3l2.1 5.6L19.5 11l-5.4 2.4L12 19l-2.1-5.6L4.5 11l5.4-2.4L12 3z" strokeLinejoin="round" />
          </svg>
        );
      case 'reel_creator':
        return (
          <svg viewBox="0 0 24 24" className={svgDim} fill="none" stroke="currentColor" strokeWidth="1.9">
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="M10 9.5l5 2.5-5 2.5v-5z" fill="currentColor" />
          </svg>
        );
      case 'verified_soul':
        return (
          <svg viewBox="0 0 24 24" className={svgDim} fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M12 3l7 3v5.8c0 4.2-3 7.6-7 8.9-4-1.3-7-4.7-7-8.9V6l7-3z" />
            <path d="M8.8 12.2l2.2 2.2 4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'generous_heart':
        return (
          <svg viewBox="0 0 24 24" className={svgDim} fill="none" stroke="currentColor" strokeWidth="1.9">
            <path
              d="M12 20s-7-4.4-7-10.2A4.3 4.3 0 019.3 5.5c1.3 0 2.2.6 2.7 1.5.5-.9 1.4-1.5 2.7-1.5A4.3 4.3 0 0119 9.8C19 15.6 12 20 12 20z"
              strokeLinejoin="round"
            />
          </svg>
        );
      case 'vip_luminary':
        return (
          <svg viewBox="0 0 24 24" className={svgDim} fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M4 17l2-9 6 4 6-4 2 9H4z" strokeLinejoin="round" />
            <path d="M5 20h14" strokeLinecap="round" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`${dimClass} bg-gradient-to-br ${
        locked ? 'from-white/5 to-white/0 border-white/15 text-zinc-500' : `${style.surface} ${style.ring} ${style.text}`
      } border flex items-center justify-center shrink-0 shadow-md ${locked ? '' : style.glow}`}
    >
      {renderGlyph()}
    </div>
  );
};

interface AchievementProfileStripProps {
  badgeIds: AchievementBadgeId[];
  maxVisible?: number;
  compact?: boolean;
  ownerName?: string;
}

export const AchievementProfileStrip: React.FC<AchievementProfileStripProps> = ({
  badgeIds,
  maxVisible = 3,
  compact = true,
  ownerName,
}) => {
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadgeDefinition | null>(null);
  const validBadges = badgeIds
    .map((id) => ACHIEVEMENT_BADGE_MAP[id])
    .filter((b): b is AchievementBadgeDefinition => Boolean(b));

  if (validBadges.length === 0) return null;

  const displayed = validBadges.slice(0, maxVisible);
  const extraCount = validBadges.length - displayed.length;

  return (
    <>
      <div
        className="flex items-center flex-wrap gap-1.5"
        onClick={(e) => e.stopPropagation()}
        aria-label={ownerName ? `${ownerName} achievement badges` : 'Achievement badges'}
      >
        {displayed.map((badge) => {
          const style = RARITY_STYLES[badge.rarity];
          return (
            <button
              key={badge.id}
              type="button"
              onClick={() => setSelectedBadge(badge)}
              title={`${badge.title} (${badge.rarity}): ${badge.tagline}`}
              className={`inline-flex items-center gap-1.5 ${
                compact ? 'pr-2 pl-1 py-0.5 text-[10px]' : 'pr-2.5 pl-1.5 py-1 text-[11px]'
              } rounded-lg bg-black/55 hover:bg-black/80 border ${style.ring} text-white font-mono font-bold transition-transform hover:scale-[1.03] cursor-pointer whitespace-nowrap shrink-0`}
            >
              <AchievementBadgeEmblem badgeId={badge.id} size="sm" />
              <span className={style.text}>{badge.title}</span>
            </button>
          );
        })}

        {extraCount > 0 && (
          <button
            type="button"
            onClick={() => setSelectedBadge(validBadges[maxVisible])}
            className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-[10px] font-mono font-bold text-zinc-200 cursor-pointer whitespace-nowrap"
          >
            +{extraCount} more
          </button>
        )}
      </div>

      <AnimatePresence>
        {selectedBadge && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-[#161326] border border-white/20 p-5 text-left space-y-4 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <AchievementBadgeEmblem badgeId={selectedBadge.id} size="lg" />
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                      {selectedBadge.rarity} Digital Badge · Earned
                    </span>
                    <h4 className="text-base font-black text-white">{selectedBadge.title}</h4>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBadge(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">{selectedBadge.tagline}</p>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>Milestone: {selectedBadge.milestoneHint}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export const AchievementShowcasePanel: React.FC<{
  onNavigateHint?: (category: AchievementBadgeDefinition['category']) => void;
}> = ({ onNavigateHint }) => {
  const { progressList, unlockedCount, totalCount } = useAchievements();
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'in_progress'>('all');

  const filtered = progressList.filter((item) => {
    if (filter === 'unlocked') return item.unlocked;
    if (filter === 'in_progress') return !item.unlocked;
    return true;
  });

  const overallPercent = Math.round((unlockedCount / totalCount) * 100);

  return (
    <div className="space-y-4 text-left">
      {/* Summary Header Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-900/25 to-cyan-500/15 border border-amber-400/35 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Digital Achievement Badges</h3>
              <p className="text-[11px] text-zinc-300 font-mono tabular-nums">
                {unlockedCount} of {totalCount} Unlocked ({overallPercent}%) · Shown on your Profile Card
              </p>
            </div>
          </div>
        </div>

        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-pink-400 to-cyan-400 rounded-full transition-all duration-500"
            style={{ width: `${overallPercent}%` }}
          />
        </div>

        <div className="flex items-center gap-1.5 pt-1">
          {(
            [
              { id: 'all', label: `All (${totalCount})` },
              { id: 'unlocked', label: `Earned (${unlockedCount})` },
              { id: 'in_progress', label: `In Progress (${totalCount - unlockedCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-white text-black'
                  : 'bg-black/40 text-zinc-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Badge Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((item: AchievementProgressItem) => {
          const { badge, current, target, percent, unlocked, unlockedAt } = item;
          const rarityStyle = RARITY_STYLES[badge.rarity];

          return (
            <div
              key={badge.id}
              onClick={() => !unlocked && onNavigateHint?.(badge.category)}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                unlocked
                  ? `bg-gradient-to-br ${rarityStyle.surface} ${rarityStyle.ring} shadow-lg`
                  : 'bg-white/5 border-white/10 hover:border-white/25 cursor-pointer'
              }`}
            >
              <div className="flex items-start gap-3">
                <AchievementBadgeEmblem badgeId={badge.id} size="md" locked={!unlocked} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <h4 className="text-xs font-black text-white truncate">{badge.title}</h4>
                    {unlocked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 block">
                    {badge.rarity} · {unlocked ? `Unlocked ${unlockedAt || 'Active'}` : badge.milestoneHint}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono tabular-nums">
                  <span className={unlocked ? rarityStyle.text : 'text-zinc-400'}>
                    {unlocked ? 'Milestone Reached' : 'Progress'}
                  </span>
                  <span className="text-white font-bold">
                    {current} / {target} {badge.unitLabel}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-black/50 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      unlocked
                        ? 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                        : 'bg-gradient-to-r from-pink-500 to-amber-400'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const AchievementUnlockToast: React.FC<{
  onOpenProfileBadges?: () => void;
}> = ({ onOpenProfileBadges }) => {
  const [queue, setQueue] = useState<AchievementBadgeDefinition[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ badge?: AchievementBadgeDefinition }>;
      const badge = custom.detail?.badge;
      if (!badge) return;
      setQueue((prev) => [...prev, badge]);
    };
    window.addEventListener(ACHIEVEMENT_UNLOCKED_EVENT, handler);
    return () => window.removeEventListener(ACHIEVEMENT_UNLOCKED_EVENT, handler);
  }, []);

  const current = queue[0] || null;

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => {
      setQueue((prev) => prev.slice(1));
    }, 5200);
    return () => clearTimeout(timer);
  }, [current]);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.94 }}
          className="fixed bottom-20 sm:bottom-6 right-4 z-[60] max-w-xs w-[calc(100%-2rem)] p-3.5 rounded-2xl bg-[#161327]/95 backdrop-blur-xl border border-amber-400/60 shadow-2xl flex items-center gap-3 text-left"
        >
          <AchievementBadgeEmblem badgeId={current.id} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-300 uppercase">
              <Sparkles className="w-3 h-3" />
              <span>Digital Badge Earned</span>
            </div>
            <p className="text-xs font-black text-white truncate">{current.title}</p>
            <p className="text-[11px] text-zinc-300 truncate">{current.tagline}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onOpenProfileBadges && (
              <button
                type="button"
                onClick={() => {
                  setQueue((prev) => prev.slice(1));
                  onOpenProfileBadges();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-amber-400 text-black text-[10px] font-mono font-black hover:bg-amber-300 cursor-pointer"
              >
                View
              </button>
            )}
            <button
              type="button"
              onClick={() => setQueue((prev) => prev.slice(1))}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white cursor-pointer"
              aria-label="Dismiss badge notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
