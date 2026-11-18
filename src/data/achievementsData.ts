import { AchievementBadgeDefinition, AchievementBadgeId, AchievementStats } from '../types';

export const ACHIEVEMENT_BADGES: AchievementBadgeDefinition[] = [
  {
    id: 'jam_legend',
    title: 'Jam Legend',
    tagline: 'Play or sync 3 tracks in Shared Beats Jam Sessions.',
    milestoneHint: 'Play 3 songs or live beats in the Beats Jam Room',
    category: 'music',
    rarity: 'Legendary',
    targetCount: 3,
    statKey: 'jamsPlayed',
    unitLabel: 'jams',
  },
  {
    id: 'vr_lounger',
    title: 'VR Lounger',
    tagline: 'Explore spatial rooms & mingle in the 3D VR Soul Lounge.',
    milestoneHint: 'Move, react, or chat 3 times inside the VR Soul Lounge',
    category: 'vr',
    rarity: 'Epic',
    targetCount: 3,
    statKey: 'vrActions',
    unitLabel: 'VR actions',
  },
  {
    id: 'arcade_ace',
    title: 'Arcade Ace',
    tagline: 'Complete 3 interactive game rounds across Twogether Arcade.',
    milestoneHint: 'Spin the Wheel, play Cards, Roll Dice, or complete a Quiz',
    category: 'games',
    rarity: 'Rare',
    targetCount: 3,
    statKey: 'gamesCompleted',
    unitLabel: 'rounds',
  },
  {
    id: 'soul_spark',
    title: 'Soul Spark',
    tagline: 'Spark genuine connections with 5 Soul Match messages or calls.',
    milestoneHint: 'Send 5 messages or voice/video sparks in Soul Matches',
    category: 'social',
    rarity: 'Core',
    targetCount: 5,
    statKey: 'messagesSent',
    unitLabel: 'sparks',
  },
  {
    id: 'reel_creator',
    title: 'Reel Creator',
    tagline: 'Publish a Soul Reel or engage with 3 reels & comments.',
    milestoneHint: 'Like, comment, or create 3 moments in the Reels Feed',
    category: 'social',
    rarity: 'Rare',
    targetCount: 3,
    statKey: 'reelsEngaged',
    unitLabel: 'reels',
  },
  {
    id: 'verified_soul',
    title: 'Verified Soul',
    tagline: 'Pass 3D Face, Voice Print & Liveness biometric verification.',
    milestoneHint: 'Complete your 3-step Soul Biometric Verification scan',
    category: 'trust',
    rarity: 'Epic',
    targetCount: 1,
    statKey: 'isVerified',
    unitLabel: 'scan',
  },
  {
    id: 'generous_heart',
    title: 'Generous Heart',
    tagline: 'Send a soul gift or invite friends into the Twogether orbit.',
    milestoneHint: 'Send a gift to a creator or share an invite referral',
    category: 'social',
    rarity: 'Rare',
    targetCount: 1,
    statKey: 'giftsShared',
    unitLabel: 'gifts',
  },
  {
    id: 'vip_luminary',
    title: 'VIP Luminary',
    tagline: 'Activate VIP Pass or unlock endless access across the platform.',
    milestoneHint: 'Activate any VIP plan or unlock arcade game access',
    category: 'trust',
    rarity: 'Legendary',
    targetCount: 1,
    statKey: 'isVip',
    unitLabel: 'pass',
  },
];

export const ACHIEVEMENT_BADGE_MAP: Record<AchievementBadgeId, AchievementBadgeDefinition> =
  ACHIEVEMENT_BADGES.reduce((acc, badge) => {
    acc[badge.id] = badge;
    return acc;
  }, {} as Record<AchievementBadgeId, AchievementBadgeDefinition>);

export function computeStatValue(stats: AchievementStats, key: keyof AchievementStats): number {
  const raw = stats[key];
  if (typeof raw === 'boolean') return raw ? 1 : 0;
  return Math.max(0, Number(raw) || 0);
}
