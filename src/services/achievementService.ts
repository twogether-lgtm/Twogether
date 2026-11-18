import { useEffect, useState } from 'react';
import {
  AchievementBadgeDefinition,
  AchievementBadgeId,
  AchievementStats,
  EarnedBadgeRecord,
} from '../types';
import { ACHIEVEMENT_BADGES, computeStatValue } from '../data/achievementsData';

const STATS_STORAGE_KEY = 'twogether_achievement_stats_v1';
const EARNED_STORAGE_KEY = 'twogether_earned_badges_v1';

const DEFAULT_STATS: AchievementStats = {
  jamsPlayed: 0,
  vrActions: 0,
  gamesCompleted: 0,
  messagesSent: 0,
  reelsEngaged: 0,
  giftsShared: 0,
  isVerified: false,
  isVip: false,
};

export const ACHIEVEMENT_UNLOCKED_EVENT = 'twogether:achievement-unlocked';
export const ACHIEVEMENTS_UPDATED_EVENT = 'twogether:achievements-updated';

export function getAchievementStats(): AchievementStats {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_STATS, ...parsed };
      }
    }
  } catch {
    // ignore storage read error
  }
  return { ...DEFAULT_STATS };
}

export function getEarnedBadges(): EarnedBadgeRecord[] {
  try {
    const raw = localStorage.getItem(EARNED_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item) => item && typeof item.badgeId === 'string' && typeof item.unlockedAt === 'string'
        );
      }
    }
  } catch {
    // ignore storage read error
  }
  return [];
}

export function getEarnedBadgeIds(): AchievementBadgeId[] {
  return getEarnedBadges().map((b) => b.badgeId);
}

function saveStatsAndBadges(stats: AchievementStats, earned: EarnedBadgeRecord[]): void {
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    localStorage.setItem(EARNED_STORAGE_KEY, JSON.stringify(earned));
  } catch {
    // ignore storage quota errors
  }
}

function evaluateAndUnlockBadges(
  stats: AchievementStats,
  currentEarned: EarnedBadgeRecord[]
): { earned: EarnedBadgeRecord[]; newlyUnlocked: AchievementBadgeDefinition[] } {
  const existingSet = new Set(currentEarned.map((e) => e.badgeId));
  const nextEarned = [...currentEarned];
  const newlyUnlocked: AchievementBadgeDefinition[] = [];
  const unlockedAt = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  for (const badge of ACHIEVEMENT_BADGES) {
    const val = computeStatValue(stats, badge.statKey);
    if (val >= badge.targetCount && !existingSet.has(badge.id)) {
      existingSet.add(badge.id);
      nextEarned.push({ badgeId: badge.id, unlockedAt });
      newlyUnlocked.push(badge);
    }
  }

  return { earned: nextEarned, newlyUnlocked };
}

function dispatchAchievementEvents(newlyUnlocked: AchievementBadgeDefinition[]): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ACHIEVEMENTS_UPDATED_EVENT));
  for (const badge of newlyUnlocked) {
    window.dispatchEvent(
      new CustomEvent(ACHIEVEMENT_UNLOCKED_EVENT, {
        detail: { badge },
      })
    );
  }
}

export function recordAchievementProgress(increments: {
  jamsPlayed?: number;
  vrActions?: number;
  gamesCompleted?: number;
  messagesSent?: number;
  reelsEngaged?: number;
  giftsShared?: number;
  isVerified?: boolean;
  isVip?: boolean;
}): AchievementBadgeDefinition[] {
  const currentStats = getAchievementStats();
  const nextStats: AchievementStats = {
    jamsPlayed: currentStats.jamsPlayed + (increments.jamsPlayed || 0),
    vrActions: currentStats.vrActions + (increments.vrActions || 0),
    gamesCompleted: currentStats.gamesCompleted + (increments.gamesCompleted || 0),
    messagesSent: currentStats.messagesSent + (increments.messagesSent || 0),
    reelsEngaged: currentStats.reelsEngaged + (increments.reelsEngaged || 0),
    giftsShared: currentStats.giftsShared + (increments.giftsShared || 0),
    isVerified: increments.isVerified !== undefined ? increments.isVerified : currentStats.isVerified,
    isVip: increments.isVip !== undefined ? increments.isVip : currentStats.isVip,
  };

  const currentEarned = getEarnedBadges();
  const { earned, newlyUnlocked } = evaluateAndUnlockBadges(nextStats, currentEarned);
  saveStatsAndBadges(nextStats, earned);
  dispatchAchievementEvents(newlyUnlocked);
  return newlyUnlocked;
}

export function syncFlagsWithAchievements(flags: {
  isVerified?: boolean;
  isVip?: boolean;
  chatsUsed?: number;
  postsUsed?: number;
  callsUsed?: number;
}): AchievementBadgeDefinition[] {
  const currentStats = getAchievementStats();
  const minMessages = (flags.chatsUsed || 0) + (flags.callsUsed || 0);
  const nextStats: AchievementStats = {
    ...currentStats,
    messagesSent: Math.max(currentStats.messagesSent, minMessages),
    reelsEngaged: Math.max(currentStats.reelsEngaged, flags.postsUsed || 0),
    isVerified: currentStats.isVerified || Boolean(flags.isVerified),
    isVip: currentStats.isVip || Boolean(flags.isVip),
  };

  const changed =
    nextStats.messagesSent !== currentStats.messagesSent ||
    nextStats.reelsEngaged !== currentStats.reelsEngaged ||
    nextStats.isVerified !== currentStats.isVerified ||
    nextStats.isVip !== currentStats.isVip;

  const currentEarned = getEarnedBadges();
  const { earned, newlyUnlocked } = evaluateAndUnlockBadges(nextStats, currentEarned);
  if (changed || newlyUnlocked.length > 0) {
    saveStatsAndBadges(nextStats, earned);
    dispatchAchievementEvents(newlyUnlocked);
  }
  return newlyUnlocked;
}

export interface AchievementProgressItem {
  badge: AchievementBadgeDefinition;
  current: number;
  target: number;
  percent: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export function getBadgeProgressList(
  stats: AchievementStats,
  earned: EarnedBadgeRecord[]
): AchievementProgressItem[] {
  const earnedMap = new Map(earned.map((e) => [e.badgeId, e.unlockedAt]));
  return ACHIEVEMENT_BADGES.map((badge) => {
    const raw = computeStatValue(stats, badge.statKey);
    const unlockedAt = earnedMap.get(badge.id);
    const unlocked = Boolean(unlockedAt) || raw >= badge.targetCount;
    const clamped = Math.min(badge.targetCount, raw);
    const percent = Math.round((clamped / badge.targetCount) * 100);
    return {
      badge,
      current: unlocked ? badge.targetCount : clamped,
      target: badge.targetCount,
      percent: unlocked ? 100 : percent,
      unlocked,
      unlockedAt,
    };
  });
}

export function useAchievements() {
  const [stats, setStats] = useState<AchievementStats>(() => getAchievementStats());
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadgeRecord[]>(() => getEarnedBadges());

  useEffect(() => {
    const refresh = () => {
      setStats(getAchievementStats());
      setEarnedBadges(getEarnedBadges());
    };
    window.addEventListener(ACHIEVEMENTS_UPDATED_EVENT, refresh);
    return () => {
      window.removeEventListener(ACHIEVEMENTS_UPDATED_EVENT, refresh);
    };
  }, []);

  const progressList = getBadgeProgressList(stats, earnedBadges);
  const earnedIds = progressList.filter((item) => item.unlocked).map((item) => item.badge.id);

  return {
    stats,
    earnedBadges,
    earnedIds,
    progressList,
    unlockedCount: earnedIds.length,
    totalCount: ACHIEVEMENT_BADGES.length,
  };
}
