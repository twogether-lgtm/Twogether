import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Heart,
  Sparkles,
  Flame,
  RotateCw,
  HelpCircle,
  CheckCircle2,
  Users,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Shuffle,
  ChevronRight,
  ChevronLeft,
  PartyPopper,
  Lock,
  Crown,
  Dices,
  Clock,
  ShieldCheck,
  Smartphone,
  Video,
  Share2,
  Copy,
  Check,
  Link2,
  PlusCircle,
  AlertCircle,
  Send,
  LogOut,
  Wifi,
  WifiOff,
  Download,
  Plane,
  EyeOff,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { GlassCard } from './GlassCard';
import { VerificationBadge } from './VerificationBadge';
import { appSoundService } from '../services/appSoundService';
import { inspectUserAction } from '../services/aiGuardianService';
import { socketService } from '../services/socket';
import { ActiveSubscriptionRecord, ArcadeGameId, GamePlanDurationId, GameUnlockEntry } from '../types';

interface PartyPhoneDevice {
  socketId: string;
  deviceId: string;
  playerName: string;
  phoneLabel: string;
  isHost: boolean;
  joinedAt: number;
}

interface PartyRoomStatePayload {
  code: string;
  maxPhones: number;
  connectedCount: number;
  isFull: boolean;
  devices: PartyPhoneDevice[];
  currentTurnPlayer: string;
  lastSpin?: {
    segmentId: number;
    wheelRotation: number;
    promptIndex: number;
    promptText: string;
    updatedBy: string;
    timestamp: number;
  } | null;
}

interface CouplePortalPartner {
  socketId: string;
  deviceId: string;
  partnerName: string;
  deviceLabel: string;
  isHost: boolean;
  joinedAt: number;
}

interface CouplePortalStatePayload {
  code: string;
  maxPartners: number;
  playType: 'online' | 'offline';
  connectedCount: number;
  isFull: boolean;
  partners: CouplePortalPartner[];
  currentTurnPlayer: string;
  lastSpin?: {
    segmentId: number;
    wheelRotation: number;
    promptIndex: number;
    promptText: string;
    updatedBy: string;
    timestamp: number;
  } | null;
}

function normalizePartyRoomInput(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  let candidate = trimmed;
  if (trimmed.includes('partyRoom=')) {
    try {
      const queryPart = trimmed.includes('?') ? trimmed.split('?')[1] : trimmed;
      const param = new URLSearchParams(queryPart).get('partyRoom');
      if (param) candidate = param;
    } catch {
      // fall back to raw
    }
  }
  return candidate
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 28);
}

function normalizeCoupleRoomInput(raw: string): { code: string; mode?: 'online' | 'offline' } {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return { code: '' };
  let candidate = trimmed;
  let mode: 'online' | 'offline' | undefined;
  if (trimmed.includes('coupleRoom=')) {
    try {
      const queryPart = trimmed.includes('?') ? trimmed.split('?')[1] : trimmed;
      const params = new URLSearchParams(queryPart);
      const param = params.get('coupleRoom');
      if (param) candidate = param;
      const m = params.get('coupleMode');
      if (m === 'online' || m === 'offline') mode = m;
    } catch {
      // ignore
    }
  }
  return {
    code: candidate
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '')
      .slice(0, 28),
    mode,
  };
}

function generatePartyRoomCode(): string {
  return `TWOGETHER-${Math.floor(1000 + Math.random() * 9000)}`;
}

function generateCoupleRoomCode(): string {
  return `COUPLE-${Math.floor(1000 + Math.random() * 9000)}`;
}

export type CoupleGameTabId =
  | 'wheel'
  | 'aviator_crash'
  | 'cards'
  | 'social_viral'
  | 'dice'
  | 'quiz';

interface CouplesGamesHubProps {
  onOpenSharedBeats?: () => void;
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
  excludedWheelGameIds?: number[];
  wheelCycleCount?: number;
  lastPlayedWheelGameId?: number | null;
  onWheelGamePlayed?: (segmentId: number, eligibleSegmentIds: number[]) => void;
  onResetWheelPool?: () => void;
  activeGameTabOverride?: CoupleGameTabId;
  onGameTabChange?: (tab: CoupleGameTabId) => void;
}

const SPICY_LEVEL_RANK: Record<SpicyVybeLevel, number> = {
  all: 0,
  mild: 0,
  spicy: 1,
  more_spicy: 2,
  most_spicy: 3,
  hot: 4,
  extra_hot: 5,
  extremely_hot: 6,
};

interface SubscriptionCapabilityProfile {
  planKey: string;
  tierLabel: string;
  maxVybeRank: number;
  maxHeatLabel: string;
  multiplierCap: number;
  allowsZeroRepeat: boolean;
  unlocksAviatorCrash: boolean;
  nextUpgradeHint: string;
}

function secureRandomFloat(): number {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return arr[0] / (0xffffffff + 1);
  }
  return Math.random();
}

function resolveSubscriptionCapabilities(
  isVipFlag: boolean,
  has1DayPass: boolean,
  activeSub?: ActiveSubscriptionRecord | null,
  activeGameUnlock?: GameUnlockEntry | null
): SubscriptionCapabilityProfile {
  let effectivePlanId = activeSub?.planId || '';
  if (!effectivePlanId && activeGameUnlock && activeGameUnlock.expiresAtMs > Date.now()) {
    effectivePlanId = activeGameUnlock.planId;
  }
  if (!effectivePlanId && isVipFlag) {
    try {
      const savedSub = localStorage.getItem('twogether_active_subscription');
      if (savedSub) {
        const parsed: ActiveSubscriptionRecord = JSON.parse(savedSub);
        if (parsed && parsed.expiresAtMs > Date.now()) {
          effectivePlanId = parsed.planId;
        }
      }
      if (!effectivePlanId) {
        const unlocked = JSON.parse(localStorage.getItem('twogether_unlocked_features') || '[]');
        if (Array.isArray(unlocked)) {
          if (unlocked.includes('spicy_decks')) effectivePlanId = 'weekly';
          else if (unlocked.includes('spicy_games_1day')) effectivePlanId = 'daily';
        }
      }
    } catch {
      // ignore
    }
  }

  if (effectivePlanId === 'monthly' || effectivePlanId === 'yearly' || (isVipFlag && !effectivePlanId)) {
    return {
      planKey: effectivePlanId || 'vip_unlimited',
      tierLabel: effectivePlanId === 'yearly' ? 'Annual Unlimited VIP ($99.50/yr)' : 'Monthly VIP Unlimited ($14.50/mo)',
      maxVybeRank: 6,
      maxHeatLabel: 'Extremely Hot & Unfiltered',
      multiplierCap: 12.0,
      allowsZeroRepeat: true,
      unlocksAviatorCrash: true,
      nextUpgradeHint: 'Maximum tier unlocked: zero repeats + all 6 nasty tiers + 12.0x Aviator boost!',
    };
  }

  if (effectivePlanId === 'weekly' || effectivePlanId === 'two_weeks') {
    return {
      planKey: effectivePlanId,
      tierLabel: effectivePlanId === 'two_weeks' ? 'Bi-Weekly Heat Pass ($7.00)' : 'Weekly VIP Heat Pass ($3.50)',
      maxVybeRank: 5,
      maxHeatLabel: 'Hot & Extra Hot',
      multiplierCap: 6.5,
      allowsZeroRepeat: true,
      unlocksAviatorCrash: true,
      nextUpgradeHint: 'Upgrade to Monthly VIP ($14.50) to unlock Extremely Hot & 12.0x Aviator boost!',
    };
  }

  if (effectivePlanId === 'daily' || effectivePlanId === 'ad_free_monthly' || has1DayPass) {
    return {
      planKey: effectivePlanId || 'daily',
      tierLabel: effectivePlanId === 'ad_free_monthly' ? 'Ad-Free Music & Spicy Pass ($3.89)' : '1-Day Momentum Pass ($1.00)',
      maxVybeRank: 3,
      maxHeatLabel: 'Spicy · More Spicy · Most Spicy',
      multiplierCap: 3.5,
      allowsZeroRepeat: true,
      unlocksAviatorCrash: true,
      nextUpgradeHint: 'Upgrade to Weekly ($3.50) or Monthly VIP ($14.50) for Hot, Extra Hot & Extremely Hot!',
    };
  }

  return {
    planKey: 'unsubscribed',
    tierLabel: 'Paid Subscription Required',
    maxVybeRank: -1,
    maxHeatLabel: 'Subscription Required ($1.00+)',
    multiplierCap: 0,
    allowsZeroRepeat: false,
    unlocksAviatorCrash: false,
    nextUpgradeHint:
      'Subscribe with Google Pay ($1.00 1-Day · $3.50 Weekly · $3.89 Ad-Free · $7.00 Bi-Weekly · $14.50 Monthly · $99.50 Annual) to unlock all games!',
  };
}

// -------------------------------------------------------------
// ENDLESS PROCEDURAL ACTIVITY SYNTHESIZER (ZERO REPETITION)
// -------------------------------------------------------------
const SYNTH_OPENERS: Record<number, string[]> = {
  0: ['Warm cheek kiss & say why you adore', 'Hold both hands close and gaze lovingly while praising', 'Play a slow living-room melody and sway gently holding'],
  1: ['Trace soft fingertips along', 'Whisper your favorite secret admiration against', 'Hold lingering eye contact for 30s while grazing lips near'],
  2: ['Contrast an ice-cool fingertip trail with warm breath over', 'Blindfold your partner and deliver three unpredictable kisses on', 'Playfully nibble and soothe with slow kisses around'],
  3: ['Drop all hesitation and kiss with magnetic rhythm along', 'Dare your partner to stay completely still for 45s while you tease', 'Swap accessories or remove one outer layer before leaning slowly into'],
  4: ['Warm silky massage oil in your palms and knead deeply along', 'Pin partner gently against the couch cushions and whisper a bold craving near', 'Hover your lips 1mm away without touching for 25s along'],
  5: ['Take full playful control for a 45-second breathless seduction sequence across', 'Lock eyes with zero talking while kissing slowly from the jawline down to', 'Give a bold 15-second whisper command for your partner to obey around'],
  6: ['Initiate an uninhibited strangers-in-a-midnight-suite fantasy starting at', 'Commit to 60 uninterrupted seconds of deep breathless closeness sweeping over', 'Confess the exact unfiltered midnight scenario you crave right now while holding'],
};

const SYNTH_ZONES: Record<number, string[]> = {
  0: ['their cheek & temple', 'their fingertips & palm', 'their forehead & shoulders'],
  1: ['their jawline & collarbone', 'behind the ear & neck pulse', 'their wrists & lower arm'],
  2: ['their warm neck & shoulders', 'their parted lower lip', 'the small of their lower back'],
  3: ['their waist & upper hips', 'their bare spine line', 'their pulse point behind the ear'],
  4: ['their lower back & glutes', 'their inner wrists & neck', 'their hips & upper thigh'],
  5: ['their collarbone, lips & hips', 'their inner thigh & waist', 'their ear, mouth & jawline'],
  6: ['every sensitive pulse point from lips to waist', 'their lower back, hips & parted lips', 'their bare neck, spine & upper thighs'],
};

const SYNTH_TWISTS: string[] = [
  '— switch lead roles immediately when the countdown ends.',
  'while keeping unbroken eye contact for maximum oxytocin synergy.',
  'accompanied by slow synchronized deep breathing.',
  'before trading one bold unspoken fantasy whisper.',
  'ending with a 10-second slow-melting kiss.',
];

function synthesizeUniqueActivity(
  rank: number,
  seedOffset: number,
  alreadySeen: Set<string>,
  forPartner?: string
): { key: string; text: string; benefit: string; durationSec: number } {
  const safeRank = Math.max(0, Math.min(6, rank));
  const openers = SYNTH_OPENERS[safeRank] || SYNTH_OPENERS[1];
  const zones = SYNTH_ZONES[safeRank] || SYNTH_ZONES[1];

  for (let attempt = 0; attempt < 36; attempt++) {
    const oIdx = Math.floor(secureRandomFloat() * openers.length);
    const zIdx = Math.floor(secureRandomFloat() * zones.length);
    const tIdx = Math.floor(secureRandomFloat() * SYNTH_TWISTS.length);
    const baseKey = `synth_${safeRank}_${oIdx}_${zIdx}_${tIdx}`;
    const finalKey = attempt === 35 ? `${baseKey}_${seedOffset}` : baseKey;
    if (!alreadySeen.has(finalKey) || attempt === 35) {
      const targetPrefix = forPartner ? `${forPartner}: ` : '';
      const roundTag = attempt === 35 ? ` (Remix #${seedOffset + 1})` : '';
      return {
        key: finalKey,
        text: `${targetPrefix}${openers[oIdx]} ${zones[zIdx]} ${SYNTH_TWISTS[tIdx]}${roundTag}`,
        benefit:
          safeRank >= 4
            ? 'Triggers intense dopamine-oxytocin surge & amplifies sensory anticipation.'
            : 'Builds spontaneous novelty, mutual trust, and warm tactile connection.',
        durationSec: safeRank >= 4 ? 60 : 45,
      };
    }
  }
  return {
    key: `synth_${safeRank}_${Date.now()}`,
    text: 'Deliver a 45-second spontaneous slow sensual kiss with unbroken eye contact.',
    benefit: 'Boosts mutual physical harmony & intimacy chemistry.',
    durationSec: 45,
  };
}

// -------------------------------------------------------------
// 6 DISTINCT SPICY & NAUGHTY VYBE LEVELS (BASIC vs VIP SUBSCRIPTION)
// -------------------------------------------------------------
export type SpicyVybeLevel =
  | 'all'
  | 'mild'            // Free Basic Mode (repeating 5 prompts, rests near 2 hrs)
  | 'spicy'           // 👑 VIP Subscription
  | 'more_spicy'      // 👑 VIP Subscription
  | 'most_spicy'      // 👑 VIP Subscription
  | 'hot'             // 👑 VIP Subscription
  | 'extra_hot'       // 👑 VIP Subscription
  | 'extremely_hot';  // 👑 VIP Subscription

export interface SpicyVybeTierInfo {
  id: SpicyVybeLevel;
  label: string;
  shortLabel: string;
  icon: string;
  isSubscriptionOnly: boolean;
  badge: string;
  color: string;
  gradient: string;
  description: string;
}

export const SPICY_VYBE_TIERS: SpicyVybeTierInfo[] = [
  {
    id: 'all',
    label: 'All Vybes (Full Spectrum)',
    shortLabel: 'All Vybes',
    icon: '✨',
    isSubscriptionOnly: true,
    badge: 'PLAN',
    color: '#ec4899',
    gradient: 'from-pink-500 to-purple-600',
    description: 'Explore all unlocked intimate game variations included in your active subscription',
  },
  {
    id: 'mild',
    label: 'Mild & Sweet Romance',
    shortLabel: 'Mild Vybe',
    icon: '🌸',
    isSubscriptionOnly: true,
    badge: 'PLAN',
    color: '#10b981',
    gradient: 'from-emerald-500 to-teal-600',
    description: 'Gentle affection, soft hugs, nostalgic slow dance & forehead kisses — unlocked on all paid plans ($1.00+)',
  },
  {
    id: 'spicy',
    label: 'Spicy Vybe',
    shortLabel: 'Spicy',
    icon: '🌶️',
    isSubscriptionOnly: true,
    badge: '👑 VIP',
    color: '#f97316',
    gradient: 'from-orange-500 to-amber-500',
    description: 'Neck kisses, sensual ear whispers, teasing glances, light hip grasps & lingering lip touches',
  },
  {
    id: 'more_spicy',
    label: 'More Spicy Vybe',
    shortLabel: 'More Spicy',
    icon: '🌶️🔥',
    isSubscriptionOnly: true,
    badge: '👑 VIP',
    color: '#ef4444',
    gradient: 'from-rose-500 to-red-600',
    description: 'Ice cube temperature play, blindfolded touch & guess, sweet forbidden fruit bites with teeth',
  },
  {
    id: 'most_spicy',
    label: 'Most Spicy Vybe',
    shortLabel: 'Most Spicy',
    icon: '🌶️🌶️🔥',
    isSubscriptionOnly: true,
    badge: '👑 VIP',
    color: '#dc2626',
    gradient: 'from-red-600 to-rose-700',
    description: 'Strip accessory or confess, slow living-room lap dance, raw bedroom fantasy revelations',
  },
  {
    id: 'hot',
    label: 'Hot Vybe',
    shortLabel: 'Hot',
    icon: '🔥',
    isSubscriptionOnly: true,
    badge: '👑 VIP',
    color: '#ea580c',
    gradient: 'from-amber-500 via-orange-600 to-red-600',
    description: 'Steamy shower hydro-whispers, warm oil sensual massage, 1mm lips breathing graze with zero touch',
  },
  {
    id: 'extra_hot',
    label: 'Extra Hot Vybe',
    shortLabel: 'Extra Hot',
    icon: '🔥💋',
    isSubscriptionOnly: true,
    badge: '👑 VIP',
    color: '#e11d48',
    gradient: 'from-rose-600 via-pink-600 to-purple-600',
    description: '60s stare & unfiltered craving confession, 10s command obedience, unbuttoning with teeth',
  },
  {
    id: 'extremely_hot',
    label: 'Extremely Hot & Naughtiest',
    shortLabel: 'Extremely Hot',
    icon: '💥🫦',
    isSubscriptionOnly: true,
    badge: '👑 VIP',
    color: '#9333ea',
    gradient: 'from-purple-600 via-pink-600 to-red-600',
    description: 'Alter-ego strangers at the bar roleplay, midnight unfiltered desire, uninhibited couples bedroom chemistry',
  },
];

// -------------------------------------------------------------
// 5 BASIC SAMPLE REPEATING PROMPTS (MILD / SWEET ROMANCE)
// In Basic mode, repeats a 5-prompt cycle and rests near 2 hours
// so next day brings more vybe. VIP unlocks endless throughout.
// -------------------------------------------------------------
export interface BasicPromptItem {
  id: string;
  title: string;
  icon: string;
  text: string;
  duration: number;
  benefit: string;
}

export const BASIC_SAMPLE_PROMPTS: BasicPromptItem[] = [
  {
    id: 'b1',
    title: 'Warm Cheek Kiss & Sweet Confession',
    icon: '🌸',
    text: 'Trace a warm butterfly kiss across partner’s cheek and whisper what made you fall in love with them.',
    duration: 45,
    benefit: 'Stimulates facial oxytocin nerve receptors and releases reassuring bonding hormones.',
  },
  {
    id: 'b2',
    title: '45s Breathing & Heartbeat Sync',
    icon: '💓',
    text: 'Gaze into partner’s eyes for 45 seconds while breathing in sync, holding both their hands over your heart.',
    duration: 45,
    benefit: 'Deepens autonomic nervous system synchronization and lowers resting heart rate.',
  },
  {
    id: 'b3',
    title: 'Nostalgic Slow Dance in Living Room',
    icon: '💃',
    text: 'Put on a favorite slow ballad or classic love song and slow dance cheek-to-cheek in the living room for one full song.',
    duration: 90,
    benefit: 'Soothes daily stress through rhythmic vestibular alignment and warm embrace.',
  },
  {
    id: 'b4',
    title: 'Gentle Workday Tension Release Massage',
    icon: '💆',
    text: 'Give partner a soothing, gentle 2-minute shoulder and neck massage to release all workday stress.',
    duration: 120,
    benefit: 'Reduces cortisol levels by up to 35% through caring tactile touch.',
  },
  {
    id: 'b5',
    title: 'Forehead Kiss & Sweetest Memory',
    icon: '💋',
    text: 'Place a lingering warm kiss on partner’s forehead and reveal your sweetest, happiest memory together.',
    duration: 60,
    benefit: 'Reinforces positive autobiographical memory recall and emotional safety.',
  },
];

// -------------------------------------------------------------
// 12 TRENDING VERY NAUGHTY HEALTHY WHEEL WEDGES & ENDLESS VARIATIONS
// -------------------------------------------------------------
export interface NaughtyWheelSegment {
  id: number;
  title: string;
  shortLabel: string;
  emoji: string;
  color: string;
  gradient: string;
  description: string;
  healthyBenefit: string;
  intensity: number; // 1 to 5
  vybeLevel: SpicyVybeLevel;
  suggestedDurationSec: number;
  prompts: string[];
}

export const NAUGHTY_WHEEL_SEGMENTS: NaughtyWheelSegment[] = [
  {
    id: 0,
    title: 'Ice & Warm Breath Sensation',
    shortLabel: 'Ice & Breath',
    emoji: '🧊',
    color: '#06b6d4',
    gradient: 'from-cyan-500 to-blue-600',
    description: 'Temperature contrast sensory teasing along neck, jawline, and collarbone.',
    healthyBenefit: 'Stimulates sensory cutaneous receptors, releases natural endorphins & heightens anticipation.',
    intensity: 4,
    vybeLevel: 'more_spicy',
    suggestedDurationSec: 60,
    prompts: [
      'Gently trace a single ice cube from partner’s jawline down to their collarbone, then instantly melt the chill with a lingering slow warm breath.',
      'Hold an ice cube in your mouth for 10 seconds, then place a cooling kiss on partner’s neck, followed immediately by pressing warm lips over it.',
      'Close eyes and let partner alternate warm breaths and cool fingertip chills along your spine for 45 uninterrupted seconds.',
    ],
  },
  {
    id: 1,
    title: '60s Stare & Secret Craving',
    shortLabel: '60s Craving',
    emoji: '🫦',
    color: '#ec4899',
    gradient: 'from-pink-500 to-rose-600',
    description: 'Continuous unbroken eye contact, followed by an unfiltered sensual whisper.',
    healthyBenefit: 'Deepens limbic synchrony, oxytocin release, and breaks down psychological intimacy barriers.',
    intensity: 4,
    vybeLevel: 'extra_hot',
    suggestedDurationSec: 60,
    prompts: [
      'Gaze directly into each other’s eyes for 60 full seconds without speaking or looking away. When the timer chimes, whisper the single naughtiest physical craving you have for tonight.',
      'Hold eye contact while breathing in sync. At the end, reveal the exact part of your partner’s body that magnetically pulls your thoughts when you are apart.',
      'Place hand over partner’s heartbeat, maintain deep eye contact for 45s, and whisper 3 things that turn you on most about their confidence.',
    ],
  },
  {
    id: 2,
    title: 'Sensual Slow Lap Dance',
    shortLabel: 'Lap Seduction',
    emoji: '🍑',
    color: '#a855f7',
    gradient: 'from-purple-500 to-indigo-600',
    description: 'A 45-second slow rhythmic seduction dance to a sensual lo-fi or R&B track.',
    healthyBenefit: 'Fosters playful body confidence, rhythmic physical alignment, and joyful sensual laughter.',
    intensity: 5,
    vybeLevel: 'most_spicy',
    suggestedDurationSec: 45,
    prompts: [
      'Partner 1 sits comfortably while Partner 2 performs a slow, hypnotic 45-second lap sway or dance without breaking eye contact.',
      'Put on a 70s soulful track or slow lo-fi groove and take turns giving each other a 30-second seductive living-room rhythm tease.',
      'Stand close, lock hands behind partner’s neck/waist, and slow-grind through one full chorus with zero rushing.',
    ],
  },
  {
    id: 3,
    title: 'Blindfolded Touch & Guess',
    shortLabel: 'Blind Touch',
    emoji: '🙈',
    color: '#f59e0b',
    gradient: 'from-amber-500 to-orange-600',
    description: 'Deprive visual sensory input to amplify touch sensitivity and playful curiosity.',
    healthyBenefit: 'Enhances tactile sensory processing up to 300% and builds total vulnerability and trust.',
    intensity: 4,
    vybeLevel: 'more_spicy',
    suggestedDurationSec: 90,
    prompts: [
      'Partner 1 closes their eyes or wears a blindfold. Partner 2 gently touches 3 separate mystery spots using lips, fingertips, or hair. Partner 1 must guess where and with what!',
      'While blindfolded, identify whether your partner is kissing you with lips, tongue, or fingertips across your neck and collarbone.',
      'Guide partner’s blindfolded hands to explore your face and shoulders, guessing the exact emotional expression you are holding.',
    ],
  },
  {
    id: 4,
    title: 'Forbidden Sweet Bite',
    shortLabel: 'Sweet Bite',
    emoji: '🍓',
    color: '#ef4444',
    gradient: 'from-red-500 to-pink-600',
    description: 'Feeding each other treats using only lips and teeth — zero hands allowed.',
    healthyBenefit: 'Engages oral motor pleasure, mutual care-giving dynamics, and teasing anticipation.',
    intensity: 3,
    vybeLevel: 'more_spicy',
    suggestedDurationSec: 60,
    prompts: [
      'Place a piece of strawberry, chocolate, or grape between your lips and feed it directly into your partner’s mouth without using hands.',
      'Drizzle or place a small sweet treat on partner’s collarbone or lip and tease-lick it away with lingering slow nibbles.',
      'Share a single piece of fruit, biting from opposite sides until your lips meet in an intimate lingering kiss.',
    ],
  },
  {
    id: 5,
    title: 'Naughty Tension Release Massage',
    shortLabel: 'Sensual Massage',
    emoji: '💆',
    color: '#10b981',
    gradient: 'from-emerald-500 to-teal-600',
    description: 'Targeted slow-stroke tension release with warm oil, lotion, or firm palms.',
    healthyBenefit: 'Reduces cortisol stress hormone, increases dopamine, and relaxes muscular defenses.',
    intensity: 3,
    vybeLevel: 'mild',
    suggestedDurationSec: 120,
    prompts: [
      'Warm your hands together and give partner a slow, firm 2-minute massage starting at the base of their skull, working down into the shoulders and lower back.',
      'Use slow circular thumb strokes along partner’s lower back and glutes, asking them to sigh out all workday stress.',
      'Trace warm, rhythmic fingertip pressures along partner’s inner wrists, forearms, and neck while whispering words of deep adoration.',
    ],
  },
  {
    id: 6,
    title: 'Strangers at the Bar Roleplay',
    shortLabel: 'Stranger Flirt',
    emoji: '🎭',
    color: '#8b5cf6',
    gradient: 'from-violet-500 to-purple-700',
    description: 'Create alluring alter-egos and flirt like complete strangers who just spotted each other.',
    healthyBenefit: 'Rekindles honeymoon-stage novelty neurochemistry, playful mystery, and romantic thrill.',
    intensity: 5,
    vybeLevel: 'extremely_hot',
    suggestedDurationSec: 120,
    prompts: [
      'Pretend you have never met before. Partner 1 sits across the room; Partner 2 walks up with a cheeky opening line and tries to flirt their way into a first kiss.',
      'Adopt alter-ego secret identities (e.g. international jazz musician & mysterious gallery curator) and trade naughty compliments.',
      'Send each other provocative text messages from across the same room as if you are secretly watching each other from afar.',
    ],
  },
  {
    id: 7,
    title: 'Steamy Shower & Hydro Whispers',
    shortLabel: 'Steam & Whispers',
    emoji: '🚿',
    color: '#0284c7',
    gradient: 'from-sky-500 to-cyan-600',
    description: 'Hydro-sensory intimacy, warm water droplets, or planning a steamy candlelit wash.',
    healthyBenefit: 'Combines soothing thermal therapy with profound full-body vulnerability and closeness.',
    intensity: 5,
    vybeLevel: 'hot',
    suggestedDurationSec: 90,
    prompts: [
      'Commit to taking a shared candlelit warm shower or bath together tonight, washing each other’s hair and shoulders with tender slow strokes.',
      'If not near water, place a warm damp towel across partner’s neck, lean in close, and whisper a steamy fantasy you want to try in the water.',
      'Wash your partner’s hands slowly in warm running water with aromatic soap, looking into their eyes the entire time.',
    ],
  },
  {
    id: 8,
    title: 'Strip Accessory or Confess',
    shortLabel: 'Strip or Confess',
    emoji: '🎲',
    color: '#f43f5e',
    gradient: 'from-rose-500 to-pink-700',
    description: 'Remove one item of clothing/accessory OR answer an unfiltered intimate confession.',
    healthyBenefit: 'Healthy balance of physical and emotional exposure, empowering mutual self-disclosure.',
    intensity: 4,
    vybeLevel: 'most_spicy',
    suggestedDurationSec: 60,
    prompts: [
      'Remove one piece of clothing/accessory (watch, socks, shirt, jewelry) OR answer: What is the most daring sexual fantasy you have ever thought of while alone?',
      'Remove your outermost layer OR reveal: What first attracted you physically to me that made your heart skip a beat?',
      'Let your partner choose one item for you to take off, OR confess the naughtiest thought you had about them today.',
    ],
  },
  {
    id: 9,
    title: 'Featherlight Spine Tease',
    shortLabel: 'Feather Trace',
    emoji: '🍯',
    color: '#eab308',
    gradient: 'from-yellow-500 to-amber-600',
    description: 'Ultralight touch tracing along the spine and sensitive nerve pathways.',
    healthyBenefit: 'Triggers ASMR tingles, stimulates high-density C-tactile afferent nerves, and induces goosebumps.',
    intensity: 3,
    vybeLevel: 'spicy',
    suggestedDurationSec: 60,
    prompts: [
      'Use the very tips of your fingernails or a soft feather/cloth to trace light spiral patterns down partner’s spine without breaking contact.',
      'Trace light circles around partner’s belly button, slowly spiraling outwards while pausing just above the waistband.',
      'Lightly blow cool air over partner’s freshly traced skin to cause a wave of electric goosebumps down their arms and back.',
    ],
  },
  {
    id: 10,
    title: '10-Second Craving Command',
    shortLabel: '10s Command',
    emoji: '🛌',
    color: '#d946ef',
    gradient: 'from-fuchsia-500 to-purple-600',
    description: 'One partner has 10 seconds to make any healthy naughty request — partner playfully obeys.',
    healthyBenefit: 'Practices clear desire communication, consensual playful surrender, and erotic leadership.',
    intensity: 5,
    vybeLevel: 'extra_hot',
    suggestedDurationSec: 30,
    prompts: [
      'Partner 1 commands Partner 2 to perform any 10-second healthy naughty action (kiss a specific spot, whisper a command, pull partner close). Partner 2 playfully complies!',
      'Take turns giving 15-second gentle commands: "Kiss me like we just reunited after months apart," or "Bite my lower lip gently."',
      'Command your partner to freeze completely for 30 seconds while you have full permission to kiss them anywhere you want.',
    ],
  },
  {
    id: 11,
    title: 'Golden Hour Lingering Kiss',
    shortLabel: 'Golden Slow Kiss',
    emoji: '💋',
    color: '#fb7185',
    gradient: 'from-rose-400 to-red-500',
    description: 'An uninterrupted, lingering slow kiss with zero words — pure heart resonance.',
    healthyBenefit: 'Releases massive oxytocin floods, lowers heart rate variability, and synchronizes breathing.',
    intensity: 4,
    vybeLevel: 'mild',
    suggestedDurationSec: 90,
    prompts: [
      'Kiss deeply and slowly for 90 uninterrupted seconds. No talking, no rushing, just feeling the warmth of each other’s lips and shared breath.',
      'Start with soft butterfly kisses across partner’s cheeks and eyelids, culminating in a passionate, slow-melting French kiss.',
      'Place both hands gently on partner’s face and deliver three distinct kissing styles: gentle & sweet, playful & biting, deep & passionate.',
    ],
  },
];

// -------------------------------------------------------------
// ENDLESS TRUTH, DARE & DESIRE CARDS DECK (TIERED BY VYBE LEVEL)
// -------------------------------------------------------------
export interface CardDeckItem {
  id: number;
  category: 'Spicy Truth' | 'Wild Dare' | 'Midnight Desire' | 'Golden Nostalgia (50+)';
  icon: string;
  forWhom: string;
  cardPrompt: string;
  intensity: 'Mild' | 'Spicy' | 'Very Naughty & Healthy';
  vybeLevel: SpicyVybeLevel;
}

const ENDLESS_CARDS_DECK: CardDeckItem[] = [
  {
    id: 1,
    category: 'Spicy Truth',
    icon: '🌶️',
    forWhom: 'Partner 1',
    cardPrompt: 'What is the absolute favorite part of my body to touch, and what physical sensation do you experience when you touch it?',
    intensity: 'Spicy',
    vybeLevel: 'spicy',
  },
  {
    id: 2,
    category: 'Wild Dare',
    icon: '🔥',
    forWhom: 'Partner 2',
    cardPrompt: 'Slowly unbutton or unzip one article of partner’s clothing using only your teeth, maintaining eye contact.',
    intensity: 'Very Naughty & Healthy',
    vybeLevel: 'extra_hot',
  },
  {
    id: 3,
    category: 'Midnight Desire',
    icon: '💋',
    forWhom: 'Both Partners',
    cardPrompt: 'Whisper into partner’s ear the exact naughty scenario you want to unfold tonight once the lights go out.',
    intensity: 'Very Naughty & Healthy',
    vybeLevel: 'most_spicy',
  },
  {
    id: 4,
    category: 'Golden Nostalgia (50+)',
    icon: '💃',
    forWhom: 'Both Soulmates',
    cardPrompt: 'Put on a classic 70s soul record or 80s love ballad and slow dance cheek-to-cheek in the living room for one full song.',
    intensity: 'Mild',
    vybeLevel: 'mild',
  },
  {
    id: 5,
    category: 'Spicy Truth',
    icon: '🌶️',
    forWhom: 'Partner 2',
    cardPrompt: 'Have you ever had a naughty dream about me that made you wake up breathing heavily? Describe the opening scene.',
    intensity: 'Spicy',
    vybeLevel: 'spicy',
  },
  {
    id: 6,
    category: 'Wild Dare',
    icon: '🔥',
    forWhom: 'Partner 1',
    cardPrompt: 'Give your partner a 60-second sensual shoulder and collarbone kiss trail without using your hands to hold them.',
    intensity: 'Very Naughty & Healthy',
    vybeLevel: 'more_spicy',
  },
  {
    id: 7,
    category: 'Midnight Desire',
    icon: '💋',
    forWhom: 'Both Partners',
    cardPrompt: 'Confess one naughty bedroom boundary or fantasy you have secretly wanted to explore with me in a safe, loving atmosphere.',
    intensity: 'Very Naughty & Healthy',
    vybeLevel: 'extremely_hot',
  },
  {
    id: 8,
    category: 'Golden Nostalgia (50+)',
    icon: '💃',
    forWhom: 'Both Soulmates',
    cardPrompt: 'Dim all the lamps, light a single candle, and tell the story of the first time you realized physical attraction was turning into real soul love.',
    intensity: 'Mild',
    vybeLevel: 'mild',
  },
  {
    id: 9,
    category: 'Spicy Truth',
    icon: '🌶️',
    forWhom: 'Partner 1',
    cardPrompt: 'What kind of kiss from me makes you completely melt and lose all train of thought?',
    intensity: 'Spicy',
    vybeLevel: 'spicy',
  },
  {
    id: 10,
    category: 'Wild Dare',
    icon: '🔥',
    forWhom: 'Partner 2',
    cardPrompt: 'Trace your lips 1 millimeter away from partner’s lips for 30 seconds without actually letting your lips touch. Feel the electric heat.',
    intensity: 'Very Naughty & Healthy',
    vybeLevel: 'hot',
  },
  {
    id: 11,
    category: 'Midnight Desire',
    icon: '💋',
    forWhom: 'Both Partners',
    cardPrompt: 'Set a phone timer for 3 minutes. Take turns whispering one naughty thing you love about each other every 10 seconds.',
    intensity: 'Very Naughty & Healthy',
    vybeLevel: 'hot',
  },
  {
    id: 12,
    category: 'Golden Nostalgia (50+)',
    icon: '💃',
    forWhom: 'Both Soulmates',
    cardPrompt: 'Share a glass of wine or hot tea while seated so close your thighs are touching, tracing slow circles on each other’s hands.',
    intensity: 'Mild',
    vybeLevel: 'mild',
  },
  {
    id: 13,
    category: 'Wild Dare',
    icon: '🍑',
    forWhom: 'Partner 1',
    cardPrompt: 'Perform a slow 45-second lap seduction sway to a low-bpm Afrobeats or lo-fi rhythm with zero talking and deep eye lock.',
    intensity: 'Very Naughty & Healthy',
    vybeLevel: 'most_spicy',
  },
  {
    id: 14,
    category: 'Spicy Truth',
    icon: '🫦',
    forWhom: 'Partner 2',
    cardPrompt: 'Describe in exact sensory detail the last time looking at me across the room made your heart race with pure attraction.',
    intensity: 'Very Naughty & Healthy',
    vybeLevel: 'extra_hot',
  },
  {
    id: 15,
    category: 'Midnight Desire',
    icon: '💥',
    forWhom: 'Both Partners',
    cardPrompt: 'Play out an alter-ego fantasy: introduce yourselves as two strangers meeting in a luxury hotel lounge who cannot resist each other.',
    intensity: 'Very Naughty & Healthy',
    vybeLevel: 'extremely_hot',
  },
  {
    id: 16,
    category: 'Wild Dare',
    icon: '🔥',
    forWhom: 'Both Soulmates',
    cardPrompt: 'Alternate slow warm breaths and light fingertip chills down each other’s bare spines for 60 uninterrupted seconds.',
    intensity: 'Very Naughty & Healthy',
    vybeLevel: 'hot',
  },
  {
    id: 17,
    category: 'Golden Nostalgia (50+)',
    icon: '🌸',
    forWhom: 'Both Soulmates',
    cardPrompt: 'Hold both of your partner’s hands, look into their eyes for 30 seconds, and name three small habits they do that make you feel deeply cherished.',
    intensity: 'Mild',
    vybeLevel: 'mild',
  },
  {
    id: 18,
    category: 'Golden Nostalgia (50+)',
    icon: '💞',
    forWhom: 'Partner 1',
    cardPrompt: 'Place a warm lingering kiss on partner’s forehead and describe your happiest peaceful morning waking up next to them.',
    intensity: 'Mild',
    vybeLevel: 'mild',
  },
];

// -------------------------------------------------------------
// NAUGHTY CRAVING DICE ACTIONS & LOCATIONS
// -------------------------------------------------------------
const DICE_ACTIONS = [
  'Slow Sensual Kiss',
  'Gentle Warm Nibble',
  'Ice Cube Tease',
  'Featherlight Caress',
  'Warm Breath Trail',
  'Firm Squeeze & Hold',
  'Erotic Whisper',
  'Oil Massage Stroke',
  'Butterfly Lip Lick',
  'Lingering Bite',
];

const DICE_LOCATIONS = [
  'Collarbone & Neck',
  'Lower Back & Glutes',
  'Ear & Jawline',
  'Inner Thigh',
  'Lips & Tongue',
  'Shoulders & Nape',
  'Palm & Fingertips',
  'Navel & Waistline',
  'Behind the Knees',
  'Across the Heart',
];

// -------------------------------------------------------------
// MILD BASIC DICE SAMPLES vs VIP NAUGHTY CRAVING DICE
// -------------------------------------------------------------
const MILD_DICE_ACTIONS = [
  'Warm Cheek Kiss',
  'Gentle Shoulder Squeeze',
  'Forehead Kiss & Smile',
  'Slow Hand Caress',
  'Tender Hug & Whisper',
];

const MILD_DICE_LOCATIONS = [
  'Cheek & Temple',
  'Hands & Fingertips',
  'Shoulders & Upper Back',
  'Forehead & Hairline',
  'Over the Heart',
];

const DICE_ACTIONS_BY_VYBE: Record<SpicyVybeLevel, string[]> = {
  all: DICE_ACTIONS,
  mild: MILD_DICE_ACTIONS,
  spicy: ['Slow Sensual Kiss', 'Warm Breath Trail', 'Featherlight Caress'],
  more_spicy: ['Ice Cube Tease', 'Butterfly Lip Lick', 'Gentle Warm Nibble'],
  most_spicy: ['Firm Squeeze & Hold', 'Erotic Whisper', 'Lingering Bite'],
  hot: ['Oil Massage Stroke', 'Warm Breath Trail', 'Slow Sensual Kiss'],
  extra_hot: ['Lingering Bite', 'Ice Cube Tease', 'Firm Squeeze & Hold'],
  extremely_hot: ['Erotic Whisper', 'Lingering Bite', 'Oil Massage Stroke', 'Slow Sensual Kiss'],
};

const DICE_LOCATIONS_BY_VYBE: Record<SpicyVybeLevel, string[]> = {
  all: DICE_LOCATIONS,
  mild: MILD_DICE_LOCATIONS,
  spicy: ['Collarbone & Neck', 'Shoulders & Nape', 'Palm & Fingertips'],
  more_spicy: ['Ear & Jawline', 'Lips & Tongue', 'Navel & Waistline'],
  most_spicy: ['Lower Back & Glutes', 'Inner Thigh', 'Collarbone & Neck'],
  hot: ['Behind the Knees', 'Across the Heart', 'Lower Back & Glutes'],
  extra_hot: ['Inner Thigh', 'Lips & Tongue', 'Ear & Jawline'],
  extremely_hot: ['Inner Thigh', 'Lower Back & Glutes', 'Lips & Tongue', 'Navel & Waistline'],
};

// -------------------------------------------------------------
// VIRAL SOCIAL MEDIA COUPLE CHALLENGES (TIKTOK / REELS TRENDS)
// -------------------------------------------------------------
export interface ViralSocialChallengeItem {
  id: string;
  title: string;
  hashtag: string;
  platform: string;
  vibe: string;
  vybeLevel: SpicyVybeLevel;
  setup: string;
  rules: string[];
  trendingSoundtrack: string;
}

const VIRAL_SOCIAL_CHALLENGES: ViralSocialChallengeItem[] = [
  {
    id: 'vc_finger',
    title: 'Put A Finger Down: Sweet Couple Check',
    hashtag: '#PutAFingerDown #CoupleGoals #TwogetherCheck',
    platform: 'TikTok Viral Sensation 🌸',
    vibe: 'Mild & Playful',
    vybeLevel: 'mild',
    setup: 'Hold up 10 fingers together on camera or live. Take turns asking sweet couple questions — who puts fingers down first owes a warm kiss!',
    rules: [
      'Both partners hold up both hands with 10 fingers extended.',
      'Tap through the confession prompts and put a finger down if guilty.',
      'Whoever has more fingers up gets a 20-second forehead & cheek kiss!',
    ],
    trendingSoundtrack: 'Viral Finger Down Lo-Fi Beat • 112 BPM',
  },
  {
    id: 'vc_phone',
    title: 'Pass The Phone: Couple Roasts & Flattery',
    hashtag: '#PassThePhone #SoulmateRoast #ViralReels',
    platform: 'Instagram Reels & TikTok ✨',
    vibe: 'Cheeky Roasts & Flattery',
    vybeLevel: 'mild',
    setup: 'Pass the phone back and forth, introducing partner with a hilarious roast followed by a sweet compliment.',
    rules: [
      'Partner 1 starts: "I\'m passing the phone to the person who takes 45 minutes to pick a movie."',
      'Partner 2 takes the phone and delivers a loving roast back.',
      'End with both leaning in for a sweet 5-second hug & kiss on camera!',
    ],
    trendingSoundtrack: 'Pass The Phone Trap Symphony • 120 BPM',
  },
  {
    id: 'vc_telepathy',
    title: '3-2-1 Couple Telepathy (Say The Same Word)',
    hashtag: '#CouplesTelepathy #BrainwaveSync',
    platform: 'Trending TikTok Audio 🧠',
    vibe: 'Mental Mind-Meld',
    vybeLevel: 'mild',
    setup: 'On the count of 3, both blurt out the first word that comes to mind for each given category. Test your soulmate synchronization!',
    rules: [
      'Category 1: A midnight craving food',
      'Category 2: Our favorite cozy hangout spot',
      'Category 3: One word that describes our chemistry',
      'Match 3 out of 3 = 100% Soulmate Telepathy confirmed!',
    ],
    trendingSoundtrack: 'Tokyo Drift Synthwave Bass • 128 BPM',
  },
  {
    id: 'vc_makeup',
    title: 'Blindfold Makeup & Hair Styling Disaster',
    hashtag: '#BlindfoldMakeup #CoupleGoalsFail',
    platform: 'YouTube Shorts & TikTok 💄',
    vibe: 'Pure Comedy & Affection',
    vybeLevel: 'mild',
    setup: 'One partner is blindfolded and has 90 seconds to do the other’s makeup (lipstick, blush, hair styling) with zero peeking.',
    rules: [
      'Partner 1 puts on blindfold. Partner 2 sits patiently without giving clues.',
      'Apply lipstick and gentle cheek touches by feeling facial contours.',
      'Reveal the masterpiece on camera and rate the aesthetic out of 10!',
    ],
    trendingSoundtrack: 'Playful Upbeat Funk Drop • 116 BPM',
  },
  {
    id: 'vc_pose',
    title: '3-Second Couple Pose Countdown',
    hashtag: '#3SecondPose #CoupleAcrobatics',
    platform: 'Instagram Reels Trend 📸',
    vibe: 'Fast Reflexes & Cuddles',
    vybeLevel: 'mild',
    setup: 'When the audio countdown rings, snap into the commanded pose within 3 seconds without falling over!',
    rules: [
      'Round 1: The Titanic Front Deck Embrace',
      'Round 2: The Classic Hollywood Dip Embrace',
      'Round 3: Piggyback Ride with Cheeks Pressed',
      'Hold each pose steady for 3 seconds on camera!',
    ],
    trendingSoundtrack: 'Countdown 3-2-1 Boom • 124 BPM',
  },
  {
    id: 'vc_outfit',
    title: 'Spicy Outfit Swap & Seduction Runway',
    hashtag: '#OutfitSwap #CoupleRunway #SpicyVibe',
    platform: 'TikTok High Fashion 🌶️',
    vibe: 'Spicy & Teasing',
    vybeLevel: 'spicy',
    setup: 'Swap clothes or strip down to oversized shirt/sunglasses and perform a bold, slow-motion hallway strut right into your partner’s arms.',
    rules: [
      'Wear partner’s oversized jacket or shirt.',
      'Record a slow-motion 15-second hallway walk ending with a deep neck kiss.',
      'Sync to an international drill or Baile funk beat!',
    ],
    trendingSoundtrack: 'Rio Favela Baile & Phonk • 132 BPM',
  },
  {
    id: 'vc_ice_whisper',
    title: 'Ice Cube Neck & Whisper Challenge',
    hashtag: '#IceCubeChallenge #SpicyCouples #TwogetherVIP',
    platform: 'Viral After-Dark Reels 🌶️🔥',
    vibe: 'More Spicy Temperature Play',
    vybeLevel: 'more_spicy',
    setup: 'Partner 1 traces an ice cube along Partner 2’s neck and collarbone while whispering unfiltered midnight desires on camera.',
    rules: [
      'Partner 2 sits blindfolded without flinching for 30 seconds.',
      'Partner 1 alternates ice chills with warm lip kisses along the collarbone.',
      'Rate the goosebumps reaction out of 10!',
    ],
    trendingSoundtrack: 'Midnight R&B Sub-Bass • 96 BPM',
  },
  {
    id: 'vc_whisper_ear',
    title: 'Don’t Laugh / Don’t Blush Ear Whisper Test',
    hashtag: '#DontBlushChallenge #HotCouples',
    platform: 'TikTok Viral Hot Trend 🔥',
    vibe: 'Hot & Unfiltered',
    vybeLevel: 'hot',
    setup: 'Hold unbroken eye contact on camera while partner whispers the boldest bedroom fantasy in your ear. First to blush loses!',
    rules: [
      'Frame both faces close together in front of the camera.',
      'Take 20-second turns whispering raw attraction confessions.',
      'Whoever blushes or bites their lip first owes a 45-second lap tease!',
    ],
    trendingSoundtrack: 'Sensual Late Night Synth • 92 BPM',
  },
  {
    id: 'vc_one_mm_kiss',
    title: '1-Millimeter Hover Kiss Tension Check',
    hashtag: '#HoverKissChallenge #ExtraHotCouple',
    platform: 'Viral TikTok Intimacy 💋',
    vibe: 'Extra Hot Magnetic Tension',
    vybeLevel: 'extra_hot',
    setup: 'Hover your lips 1mm from your partner’s mouth for 30 seconds while breathing each other’s air—zero touching until the drop hits!',
    rules: [
      'Set a 30-second audio drop timer.',
      'Hold faces 1 millimeter apart with hands on partner’s waist or jawline.',
      'When the beat drops, melt into a passionate deep kiss!',
    ],
    trendingSoundtrack: 'Slow Tension Beat Drop • 100 BPM',
  },
];

const FINGER_DOWN_QUESTIONS = [
  'Put a finger down if you fell in love first.',
  'Put a finger down if you take 3x longer to get ready for a date.',
  'Put a finger down if you steal all the blankets at night.',
  'Put a finger down if you are the more romantic kisser.',
  'Put a finger down if you get jealous faster.',
  'Put a finger down if you made the first move on Twogether.',
  'Put a finger down if you secretly stole your partner’s hoodie or shirt.',
  'Put a finger down if you are the naughtier one in private.',
  'Put a finger down if you can never decide what to eat for dinner.',
  'Put a finger down if you are 100% convinced you found your ultimate soulmate.',
];

export const CouplesGamesHub: React.FC<CouplesGamesHubProps> = ({
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
  excludedWheelGameIds,
  wheelCycleCount,
  lastPlayedWheelGameId,
  onWheelGamePlayed,
  onResetWheelPool,
  activeGameTabOverride,
  onGameTabChange,
}) => {
  // Navigation
  const [activeGameTab, setActiveGameTab] = useState<CoupleGameTabId>(
    activeGameTabOverride || 'wheel'
  );

  useEffect(() => {
    if (activeGameTabOverride) {
      setActiveGameTab(activeGameTabOverride);
    }
  }, [activeGameTabOverride]);

  const selectGameTab = (tab: CoupleGameTabId) => {
    setActiveGameTab(tab);
    onGameTabChange?.(tab);
  };

  // Sound Synth & Spin / Aviator Animation Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const spinRafRef = useRef<number | null>(null);
  const whirControllerRef = useRef<{ updateSpeed: (speedNorm: number) => void; stop: () => void } | null>(null);
  const crashRafRef = useRef<number | null>(null);
  const dareFlipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (spinRafRef.current !== null) {
        cancelAnimationFrame(spinRafRef.current);
        spinRafRef.current = null;
      }
      if (whirControllerRef.current) {
        whirControllerRef.current.stop();
        whirControllerRef.current = null;
      }
      if (dareFlipTimeoutRef.current) {
        clearTimeout(dareFlipTimeoutRef.current);
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Play subtle tactile mechanical peg-click sound as wheel pegs pass pointer (respects app popup mute)
  const playMechanicalTick = useCallback((pitchVariance = 0, speedRatio = 0.72) => {
    try {
      appSoundService.playWheelPegClick(speedRatio, pitchVariance);
      // Light haptic feedback if supported on mobile
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(8);
      }
    } catch {
      // ignore
    }
  }, []);

  // Play triumphant completion chime (respects app popup mute & shares AudioContext)
  const playWinChime = useCallback(() => {
    try {
      appSoundService.playAlertChime('celebration');
    } catch {
      // ignore
    }
  }, []);

  // -------------------------------------------------------------
  // REAL PHYSICAL WHEEL STATE & LOGIC
  // -------------------------------------------------------------
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winningSegmentIndex, setWinningSegmentIndex] = useState<number>(0);
  const [activePromptIndex, setActivePromptIndex] = useState<number>(0);
  const [flapperTwitch, setFlapperTwitch] = useState<number>(0);
  const [intensityFilter, setIntensityFilter] = useState<SpicyVybeLevel>('all');

  // Multiplayer & Connection Modes (Offline, Online Away, 2-Device Proximity, Party up to 10 devices)
  const [connectionMode, setConnectionMode] = useState<'offline_pass' | 'online_remote' | 'proximity_fusion' | 'party_10'>(() => {
    if (initialPartyRoomCode) return 'party_10';
    if (initialCoupleRoomCode) {
      return initialCouplePlayMode === 'offline' ? 'offline_pass' : 'online_remote';
    }
    return 'offline_pass';
  });
  const [partyDeviceId] = useState<string>(() => {
    try {
      const existing = sessionStorage.getItem('twogether_party_device_id');
      if (existing) return existing;
      const created = `phone-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem('twogether_party_device_id', created);
      return created;
    } catch {
      return `phone-${Math.random().toString(36).slice(2, 10)}`;
    }
  });
  const [localPhoneName, setLocalPhoneName] = useState<string>(
    () => (currentUserName && currentUserName.trim()) || `Phone ${Math.floor(10 + Math.random() * 89)}`
  );
  const [partyRoomCode, setPartyRoomCode] = useState<string>(() => {
    const fromProp = initialPartyRoomCode ? normalizePartyRoomInput(initialPartyRoomCode) : '';
    return fromProp || 'TWOGETHER-VIP-77';
  });
  const [partyDevices, setPartyDevices] = useState<PartyPhoneDevice[]>([]);
  const [connectedDevicesCount, setConnectedDevicesCount] = useState<number>(1);
  const [currentTurnPlayer, setCurrentTurnPlayer] = useState<string>('Alex');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [partyRoomError, setPartyRoomError] = useState<string | null>(null);
  const [copiedJoinLink, setCopiedJoinLink] = useState<boolean>(false);
  const [partyStatusBanner, setPartyStatusBanner] = useState<string | null>(null);
  const [syncedPartyPromptText, setSyncedPartyPromptText] = useState<string | null>(null);
  const lastSyncedSpinTsRef = useRef<number>(0);

  // Couples-Only Share Portal State (Online 2-Device Sync or Offline Pass-and-Play Portal)
  const [showCoupleSharePortal, setShowCoupleSharePortal] = useState<boolean>(() => Boolean(initialCoupleRoomCode));
  const [couplePortalType, setCouplePortalType] = useState<'online' | 'offline'>(() =>
    initialCouplePlayMode === 'offline' ? 'offline' : 'online'
  );
  const [coupleRoomCode, setCoupleRoomCode] = useState<string>(() => {
    const parsed = initialCoupleRoomCode ? normalizeCoupleRoomInput(initialCoupleRoomCode).code : '';
    return parsed || 'COUPLE-2209';
  });
  const [couplePartners, setCouplePartners] = useState<CouplePortalPartner[]>([]);
  const [couplePartnerOneName, setCouplePartnerOneName] = useState<string>(() => {
    try {
      return localStorage.getItem('twogether_couple_p1') || (currentUserName && currentUserName.trim()) || 'Alex';
    } catch {
      return (currentUserName && currentUserName.trim()) || 'Alex';
    }
  });
  const [couplePartnerTwoName, setCouplePartnerTwoName] = useState<string>(() => {
    try {
      return localStorage.getItem('twogether_couple_p2') || 'Aria';
    } catch {
      return 'Aria';
    }
  });
  const [coupleJoinInput, setCoupleJoinInput] = useState<string>('');
  const [couplePortalError, setCouplePortalError] = useState<string | null>(null);
  const [couplePortalBanner, setCouplePortalBanner] = useState<string | null>(null);
  const [copiedCoupleLink, setCopiedCoupleLink] = useState<boolean>(false);
  const lastCoupleSpinTsRef = useRef<number>(0);

  const partyOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://ais-dev-z4kw2q57puokic7zgdxqel-951943196492.europe-west2.run.app';
  const partyJoinUrl = `${partyOrigin}/?tab=home&partyRoom=${encodeURIComponent(partyRoomCode)}`;
  const couplePortalUrl = `${partyOrigin}/?tab=home&coupleRoom=${encodeURIComponent(coupleRoomCode)}&coupleMode=${couplePortalType}`;

  useEffect(() => {
    if (initialPartyRoomCode) {
      const normalized = normalizePartyRoomInput(initialPartyRoomCode);
      if (normalized) {
        setPartyRoomCode(normalized);
        setConnectionMode('party_10');
        setShowCoupleSharePortal(false);
        setActiveGameTab('wheel');
      }
    }
  }, [initialPartyRoomCode]);

  useEffect(() => {
    if (initialCoupleRoomCode) {
      const parsed = normalizeCoupleRoomInput(initialCoupleRoomCode);
      if (parsed.code) {
        setCoupleRoomCode(parsed.code);
        const mode = initialCouplePlayMode || parsed.mode || 'online';
        setCouplePortalType(mode);
        setConnectionMode(mode === 'offline' ? 'offline_pass' : 'online_remote');
        setShowCoupleSharePortal(true);
        setActiveGameTab('wheel');
      }
    }
  }, [initialCoupleRoomCode, initialCouplePlayMode]);

  useEffect(() => {
    try {
      localStorage.setItem('twogether_couple_p1', couplePartnerOneName);
      localStorage.setItem('twogether_couple_p2', couplePartnerTwoName);
    } catch {}
  }, [couplePartnerOneName, couplePartnerTwoName]);

  const couplePartnerOneRef = useRef(couplePartnerOneName);
  couplePartnerOneRef.current = couplePartnerOneName;

  useEffect(() => {
    if (connectionMode === 'party_10' || !showCoupleSharePortal) {
      setCouplePortalError(null);
      return;
    }

    // In offline Pass & Play portal, partner join over internet is optional; online mode pairs via socket
    if (couplePortalType === 'offline' && connectionMode === 'offline_pass') {
      return;
    }

    const deviceLabel =
      typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent)
        ? 'Partner Mobile'
        : 'Partner Device';

    socketService.joinCouplePortalRoom({
      roomCode: coupleRoomCode,
      partnerName: couplePartnerOneRef.current.trim() || 'Partner',
      deviceId: partyDeviceId,
      deviceLabel,
      playType: couplePortalType,
    });

    const handleCoupleState = (state: CouplePortalStatePayload) => {
      if (!state || state.code !== coupleRoomCode) return;
      setCouplePortalError(null);
      setCouplePartners(state.partners || []);
      if (state.playType === 'online' || state.playType === 'offline') {
        setCouplePortalType(state.playType);
      }
      if (state.currentTurnPlayer) {
        setCurrentTurnPlayer(state.currentTurnPlayer);
      }
      if (state.lastSpin && state.lastSpin.timestamp > lastCoupleSpinTsRef.current) {
        lastCoupleSpinTsRef.current = state.lastSpin.timestamp;
        setWinningSegmentIndex(state.lastSpin.segmentId);
        setWheelRotation(state.lastSpin.wheelRotation);
        setActivePromptIndex(state.lastSpin.promptIndex);
        setSyncedPartyPromptText(state.lastSpin.promptText);
      }
    };

    const handleCoupleSpinSynced = (payload: {
      code: string;
      segmentId: number;
      wheelRotation: number;
      promptIndex: number;
      promptText: string;
      updatedBy: string;
      currentTurnPlayer?: string;
      timestamp: number;
    }) => {
      if (!payload || payload.code !== coupleRoomCode) return;
      if (payload.timestamp <= lastCoupleSpinTsRef.current) return;
      lastCoupleSpinTsRef.current = payload.timestamp;
      setWinningSegmentIndex(payload.segmentId);
      setWheelRotation(payload.wheelRotation);
      setActivePromptIndex(payload.promptIndex);
      setSyncedPartyPromptText(payload.promptText);
      if (payload.currentTurnPlayer) {
        setCurrentTurnPlayer(payload.currentTurnPlayer);
      }
      setCouplePortalBanner(`💑 ${payload.updatedBy} spun! Synced live between you two.`);
      setTimeout(() => setCouplePortalBanner(null), 3500);
    };

    const handleCoupleError = (err: { code?: string; message?: string }) => {
      if (err?.code && err.code !== coupleRoomCode) return;
      setCouplePortalError(err?.message || 'Couples portal is capped at 2 partners only.');
    };

    socketService.socket.on('couple-portal-state', handleCoupleState);
    socketService.socket.on('couple-spin-synced', handleCoupleSpinSynced);
    socketService.socket.on('couple-portal-error', handleCoupleError);

    return () => {
      socketService.socket.off('couple-portal-state', handleCoupleState);
      socketService.socket.off('couple-spin-synced', handleCoupleSpinSynced);
      socketService.socket.off('couple-portal-error', handleCoupleError);
      socketService.leaveCouplePortalRoom(coupleRoomCode, partyDeviceId);
    };
  }, [connectionMode, showCoupleSharePortal, couplePortalType, coupleRoomCode, partyDeviceId]);

  const localPhoneNameRef = useRef(localPhoneName);
  localPhoneNameRef.current = localPhoneName;

  useEffect(() => {
    if (connectionMode !== 'party_10') {
      setPartyRoomError(null);
      setSyncedPartyPromptText(null);
      return;
    }

    const phoneLabel =
      typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent)
        ? 'Mobile Phone'
        : 'Web Device';

    socketService.joinPartyGameRoom({
      roomCode: partyRoomCode,
      playerName: localPhoneNameRef.current.trim() || 'Player Phone',
      deviceId: partyDeviceId,
      phoneLabel,
    });

    const handleRoomState = (state: PartyRoomStatePayload) => {
      if (!state || state.code !== partyRoomCode) return;
      setPartyRoomError(null);
      setPartyDevices(state.devices || []);
      setConnectedDevicesCount(state.connectedCount || state.devices?.length || 1);
      if (state.currentTurnPlayer) {
        setCurrentTurnPlayer(state.currentTurnPlayer);
      }
      if (state.lastSpin && state.lastSpin.timestamp > lastSyncedSpinTsRef.current) {
        lastSyncedSpinTsRef.current = state.lastSpin.timestamp;
        setWinningSegmentIndex(state.lastSpin.segmentId);
        setWheelRotation(state.lastSpin.wheelRotation);
        setActivePromptIndex(state.lastSpin.promptIndex);
        setSyncedPartyPromptText(state.lastSpin.promptText);
      }
    };

    const handleSpinSynced = (payload: {
      code: string;
      segmentId: number;
      wheelRotation: number;
      promptIndex: number;
      promptText: string;
      updatedBy: string;
      currentTurnPlayer?: string;
      timestamp: number;
    }) => {
      if (!payload || payload.code !== partyRoomCode) return;
      if (payload.timestamp <= lastSyncedSpinTsRef.current) return;
      lastSyncedSpinTsRef.current = payload.timestamp;
      setWinningSegmentIndex(payload.segmentId);
      setWheelRotation(payload.wheelRotation);
      setActivePromptIndex(payload.promptIndex);
      setSyncedPartyPromptText(payload.promptText);
      if (payload.currentTurnPlayer) {
        setCurrentTurnPlayer(payload.currentTurnPlayer);
      }
      setPartyStatusBanner(`${payload.updatedBy} spun the wheel! Synced across connected phones.`);
      setTimeout(() => setPartyStatusBanner(null), 4000);
    };

    const handleRoomError = (err: { code?: string; message?: string }) => {
      if (err?.code && err.code !== partyRoomCode) return;
      setPartyRoomError(err?.message || 'Unable to join party room (max 10 phones).');
    };

    socketService.socket.on('party-room-state', handleRoomState);
    socketService.socket.on('party-spin-synced', handleSpinSynced);
    socketService.socket.on('party-room-error', handleRoomError);

    return () => {
      socketService.socket.off('party-room-state', handleRoomState);
      socketService.socket.off('party-spin-synced', handleSpinSynced);
      socketService.socket.off('party-room-error', handleRoomError);
      socketService.leavePartyGameRoom(partyRoomCode, partyDeviceId);
    };
  }, [connectionMode, partyRoomCode, partyDeviceId]);

  useEffect(() => {
    if (connectionMode !== 'party_10') return;
    const trimmed = localPhoneName.trim();
    if (!trimmed) return;
    const timer = setTimeout(() => {
      const phoneLabel =
        typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent)
          ? 'Mobile Phone'
          : 'Web Device';
      socketService.joinPartyGameRoom({
        roomCode: partyRoomCode,
        playerName: trimmed,
        deviceId: partyDeviceId,
        phoneLabel,
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [connectionMode, partyRoomCode, partyDeviceId, localPhoneName]);

  const handleCopyPartyLink = async () => {
    try {
      await navigator.clipboard.writeText(partyJoinUrl);
      setCopiedJoinLink(true);
      setPartyStatusBanner('Joining link copied! Send it to up to 9 friends to join on their phones.');
      setTimeout(() => setCopiedJoinLink(false), 2500);
      setTimeout(() => setPartyStatusBanner(null), 4000);
    } catch {
      setPartyStatusBanner(`Share link: ${partyJoinUrl}`);
      setTimeout(() => setPartyStatusBanner(null), 5000);
    }
  };

  const handleSharePartyLink = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Join my 10-Phone Party Wheel (${partyRoomCode})`,
          text: `Tap my joining link to connect your phone to our Twogether 10-Phone Party Room (${connectedDevicesCount}/10 phones connected):`,
          url: partyJoinUrl,
        });
        setPartyStatusBanner('Joining link shared! Friends tapping the link will land straight in this room.');
        setTimeout(() => setPartyStatusBanner(null), 4000);
        return;
      } catch {
        // User dismissed or unsupported, fallback to copy
      }
    }
    await handleCopyPartyLink();
  };

  const handleCreateNewPartyRoom = () => {
    const freshCode = generatePartyRoomCode();
    setSyncedPartyPromptText(null);
    setPartyRoomError(null);
    setPartyRoomCode(freshCode);
    setConnectionMode('party_10');
    setPartyStatusBanner(`New 10-Phone Party Room ${freshCode} created! Copy & send your joining link.`);
    setTimeout(() => setPartyStatusBanner(null), 4000);
  };

  const handleJoinRoomByInput = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const normalized = normalizePartyRoomInput(joinCodeInput);
    if (!normalized) {
      setPartyRoomError('Paste a valid joining link or room code (e.g. TWOGETHER-4821).');
      return;
    }
    setPartyRoomError(null);
    try {
      const res = await fetch(`/api/games/party/${encodeURIComponent(normalized)}`);
      if (res.ok) {
        const data = await res.json();
        const alreadyJoined = Array.isArray(data?.devices)
          ? data.devices.some((d: PartyPhoneDevice) => d.deviceId === partyDeviceId)
          : false;
        if (data?.isFull && !alreadyJoined) {
          setPartyRoomError(
            `Room ${normalized} already has 10/10 phones connected. Ask your host to tap "New Room Link" or start a new table.`
          );
          return;
        }
      }
    } catch {
      // Proceed to WebSocket join if REST preflight unavailable
    }
    setSyncedPartyPromptText(null);
    setPartyRoomCode(normalized);
    setJoinCodeInput('');
    setConnectionMode('party_10');
    setPartyStatusBanner(`Connected your phone to Party Room ${normalized}!`);
    setTimeout(() => setPartyStatusBanner(null), 3500);
  };

  // Couples-Only Portal Actions (Copy, Share, Switch Online/Offline, Join Partner, Offline Date Pack)
  const handleSelectCouplePortalType = (type: 'online' | 'offline') => {
    setCouplePortalType(type);
    setConnectionMode(type === 'offline' ? 'offline_pass' : 'online_remote');
    setShowCoupleSharePortal(true);
    setCouplePortalError(null);
    if (socketService.socket.connected) {
      socketService.setCouplePortalType(coupleRoomCode, type);
    }
    setCouplePortalBanner(
      type === 'online'
        ? '🌐 Couples Online Portal active — share this private 2-partner link to play synced apart!'
        : '📴 Couples Offline Portal ready — play Pass & Play together or save/share for offline date night!'
    );
    setTimeout(() => setCouplePortalBanner(null), 4000);
  };

  const handleCopyCoupleLink = async () => {
    try {
      await navigator.clipboard.writeText(couplePortalUrl);
      setCopiedCoupleLink(true);
      setCouplePortalBanner('Couples-only invite link copied! Strictly private for 2 partners.');
      setTimeout(() => setCopiedCoupleLink(false), 2500);
      setTimeout(() => setCouplePortalBanner(null), 4000);
    } catch {
      setCouplePortalBanner(`Couples Portal link: ${couplePortalUrl}`);
      setTimeout(() => setCouplePortalBanner(null), 5000);
    }
  };

  const handleShareCoupleLink = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Twogether Couples-Only Portal (${couplePortalType === 'online' ? 'Online' : 'Offline'})`,
          text:
            couplePortalType === 'online'
              ? `Join our private Couples-Only Online Portal (${coupleRoomCode}) so we can spin & play live together:`
              : `Open our Couples-Only Offline Portal (${coupleRoomCode}) for our Pass & Play date night:`,
          url: couplePortalUrl,
        });
        setCouplePortalBanner('Couples Portal link shared with your partner!');
        setTimeout(() => setCouplePortalBanner(null), 3500);
        return;
      } catch {
        // Fallback to copy
      }
    }
    await handleCopyCoupleLink();
  };

  const handleCreateNewCouplePortal = () => {
    const freshCode = generateCoupleRoomCode();
    setSyncedPartyPromptText(null);
    setCouplePortalError(null);
    setCoupleRoomCode(freshCode);
    setShowCoupleSharePortal(true);
    setCouplePortalBanner(`New Couples-Only Portal ${freshCode} created!`);
    setTimeout(() => setCouplePortalBanner(null), 3500);
  };

  const handleJoinCouplePortalByInput = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = normalizeCoupleRoomInput(coupleJoinInput);
    if (!parsed.code) {
      setCouplePortalError('Paste your partner’s Couples Portal link or code (e.g. COUPLE-2209).');
      return;
    }
    setCouplePortalError(null);
    try {
      const res = await fetch(`/api/games/couple/${encodeURIComponent(parsed.code)}`);
      if (res.ok) {
        const data = await res.json();
        const alreadyIn = Array.isArray(data?.partners)
          ? data.partners.some((p: CouplePortalPartner) => p.deviceId === partyDeviceId)
          : false;
        if (data?.isFull && !alreadyIn) {
          setCouplePortalError(
            `Couples Portal ${parsed.code} already has both partners (2/2 connected). Ask for a fresh Couples-Only link.`
          );
          return;
        }
        if (parsed.mode === 'offline' || parsed.mode === 'online') {
          setCouplePortalType(parsed.mode);
          setConnectionMode(parsed.mode === 'offline' ? 'offline_pass' : 'online_remote');
        } else if (data?.playType === 'offline' || data?.playType === 'online') {
          setCouplePortalType(data.playType);
          setConnectionMode(data.playType === 'offline' ? 'offline_pass' : 'online_remote');
        } else {
          setCouplePortalType('online');
          setConnectionMode('online_remote');
        }
      }
    } catch {
      // Proceed cleanly
    }
    setSyncedPartyPromptText(null);
    setCoupleRoomCode(parsed.code);
    setCoupleJoinInput('');
    setShowCoupleSharePortal(true);
    setCouplePortalBanner(`💑 Joined private Couples Portal ${parsed.code}!`);
    setTimeout(() => setCouplePortalBanner(null), 3500);
  };

  const handleDownloadOfflineCouplePack = () => {
    const p1 = couplePartnerOneName.trim() || 'Partner 1';
    const p2 = couplePartnerTwoName.trim() || 'Partner 2';
    const promptLines = BASIC_SAMPLE_PROMPTS.map((p, i) => `  ${i + 1}. ${p.text} (${p.duration}s)`).join('\n');
    const wheelLines = NAUGHTY_WHEEL_SEGMENTS.slice(0, 8)
      .map((seg) => `- [${seg.shortLabel}] ${seg.prompts[0]}`)
      .join('\n');
    const content = [
      `TWOGETHER — COUPLES-ONLY OFFLINE PORTAL PACK`,
      `Portal Code: ${coupleRoomCode}`,
      `Partners: ${p1} & ${p2}`,
      `Mode: Offline Pass & Play (Zero Internet Required)`,
      ``,
      `WARM-UP PASS & PLAY PROMPTS:`,
      promptLines,
      ``,
      `WHEEL HIGHLIGHTS:`,
      wheelLines,
      ``,
      `Offline Partner Link (open whenever back online): ${couplePortalUrl}`,
    ].join('\n');

    try {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `twogether-couples-offline-${coupleRoomCode.toLowerCase()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setCouplePortalBanner('📴 Offline Couples Pass & Play pack downloaded! Ready with zero Wi-Fi.');
      setTimeout(() => setCouplePortalBanner(null), 4000);
    } catch {
      setCouplePortalBanner('Offline Pass & Play mode is ready directly on this screen!');
      setTimeout(() => setCouplePortalBanner(null), 3500);
    }
  };

  const [has1DaySpicyPass] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('twogether_has_1day_spicy_pass');
      if (saved) {
        const diff = Date.now() - Number(saved);
        return diff < 24 * 60 * 60 * 1000;
      }
    } catch {}
    return false;
  });

  // -------------------------------------------------------------
  // PAID SUBSCRIPTION ENFORCEMENT (ALL GAMES REQUIRE PAID PLAN)
  // -------------------------------------------------------------
  const [basicPromptCycleIdx, setBasicPromptCycleIdx] = useState<number>(0);

  // VIP Feature States: AI Naughty Generator, Custom Partner Dare, VIP Teaser Drawer
  const [showAiSpicyGenerator, setShowAiSpicyGenerator] = useState<boolean>(false);
  const [aiGeneratorHeat, setAiGeneratorHeat] = useState<SpicyVybeLevel>('hot');
  const [generatedAiPrompt, setGeneratedAiPrompt] = useState<string | null>(null);
  const [isGeneratingAiPrompt, setIsGeneratingAiPrompt] = useState<boolean>(false);

  const [showCustomDareModal, setShowCustomDareModal] = useState<boolean>(false);
  const [customDareText, setCustomDareText] = useState<string>('');
  const [customDareDuration, setCustomDareDuration] = useState<number>(60);
  const [isCheckingCustomDare, setIsCheckingCustomDare] = useState<boolean>(false);
  const [dareSafetyError, setDareSafetyError] = useState<string | null>(null);
  const [activeCustomDare, setActiveCustomDare] = useState<{ text: string; from: string; duration: number } | null>(null);

  const [showVipPreviewDrawer, setShowVipPreviewDrawer] = useState<boolean>(false);

  // Determine Subscription Capability Profile & Non-Repeating Seen Vault
  const activeGameUnlockEntry = unlockedGamesMap[activeGameTab] || null;
  const isTabUnlocked = (tabId: CoupleGameTabId): boolean => {
    if (isVip || activeSubscription || has1DaySpicyPass) return true;
    const rec = unlockedGamesMap[tabId];
    return Boolean(rec && rec.expiresAtMs > Date.now());
  };
  const subProfile = resolveSubscriptionCapabilities(
    Boolean(isVip),
    has1DaySpicyPass,
    activeSubscription,
    activeGameUnlockEntry
  );
  const isVipOrPass = subProfile.allowsZeroRepeat;
  const requiresPaidSubscription = !isVipOrPass;
  const isBasicLimitReached = requiresPaidSubscription;

  const openSubscriptionPaywall = useCallback(
    (gameLabel?: string, explicitGameIds?: ArcadeGameId[]) => {
      playMechanicalTick(60);
      if (onOpenUpgradeModal) {
        const targetIds: ArcadeGameId[] =
          explicitGameIds && explicitGameIds.length > 0
            ? explicitGameIds
            : gameLabel === 'All Arcade Games'
            ? ['wheel', 'aviator_crash', 'cards', 'social_viral', 'dice', 'quiz', 'singles_quiz', 'singles_cards']
            : [activeGameTab];
        onOpenUpgradeModal(
          gameLabel
            ? `Unlock ${gameLabel} individually ($0.14/1-Day · $0.49/7-Day · $1.99/30-Day) — or sum games / Pay Once for All 8 ($1.00+) via Google Pay.`
            : 'Unlock this game ($0.14+) or bundle all 8 games via Google Pay ($1.00+).',
          targetIds
        );
      }
    },
    [onOpenUpgradeModal, playMechanicalTick, activeGameTab]
  );

  // Zero-Repetition Played History Store (Persisted per game mode)
  const [seenActivityIds, setSeenActivityIds] = useState<Record<string, string[]>>(() => {
    try {
      const raw = localStorage.getItem('twogether_seen_activity_ids_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return { wheel: [], cards: [], viral: [], dice: [], quiz: [], aviator: [] };
  });

  const markActivitySeen = useCallback((mode: string, activityKey: string) => {
    setSeenActivityIds((prev) => {
      const currentList = prev[mode] || [];
      if (currentList.includes(activityKey)) return prev;
      const updated = { ...prev, [mode]: [...currentList, activityKey] };
      try {
        localStorage.setItem('twogether_seen_activity_ids_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Fallback local exclusion pool state when rendered outside FunGamesScreen
  const [internalWheelExcludedIds, setInternalWheelExcludedIds] = useState<number[]>([]);
  const [internalWheelCycleCount, setInternalWheelCycleCount] = useState<number>(1);
  const [internalLastPlayedWheelId, setInternalLastPlayedWheelId] = useState<number | null>(null);

  const activeExcludedWheelIds = excludedWheelGameIds ?? internalWheelExcludedIds;
  const activeWheelCycleCount = wheelCycleCount ?? internalWheelCycleCount;
  const activeLastPlayedWheelId =
    lastPlayedWheelGameId !== undefined ? lastPlayedWheelGameId : internalLastPlayedWheelId;

  const recordWheelGamePlayed = useCallback(
    (segmentId: number, eligibleIds: number[]) => {
      if (onWheelGamePlayed) {
        onWheelGamePlayed(segmentId, eligibleIds);
        return;
      }
      setInternalLastPlayedWheelId(segmentId);
      setInternalWheelExcludedIds((prev) => {
        const updated = prev.includes(segmentId) ? prev : [...prev, segmentId];
        const allDone = eligibleIds.length > 0 && eligibleIds.every((id) => updated.includes(id));
        if (allDone) {
          setInternalWheelCycleCount((c) => c + 1);
          return eligibleIds.length > 1 ? [segmentId] : [];
        }
        return updated;
      });
    },
    [onWheelGamePlayed]
  );

  const handleResetSeenVault = (mode?: string) => {
    setSeenActivityIds((prev) => {
      const next = mode
        ? { ...prev, [mode]: [] }
        : { wheel: [], cards: [], viral: [], dice: [], quiz: [], aviator: [] };
      try {
        localStorage.setItem('twogether_seen_activity_ids_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
    if (!mode || mode === 'wheel') {
      if (onResetWheelPool) {
        onResetWheelPool();
      } else {
        setInternalWheelExcludedIds([]);
        setInternalWheelCycleCount(1);
        setInternalLastPlayedWheelId(null);
      }
    }
    playMechanicalTick(40);
  };

  // Extra Synthesized Card & Quiz Pools (Appended live when curated bank completes)
  const [synthesizedCards, setSynthesizedCards] = useState<CardDeckItem[]>([]);
  const [synthesizedWheelPrompt, setSynthesizedWheelPrompt] = useState<string | null>(null);

  // Aviator Blind Wheel & 4x 360° Spin States
  const [isAviatorBlindMode, setIsAviatorBlindMode] = useState<boolean>(true);
  const [wheelSpinPhase, setWheelSpinPhase] = useState<'IDLE' | 'SPINNING_BLIND' | 'LOCKED'>('IDLE');
  const [wheelTurnCount, setWheelTurnCount] = useState<number>(0);
  const [aviatorWheelMultiplier, setAviatorWheelMultiplier] = useState<number>(1.0);
  const [dareFlipStage, setDareFlipStage] = useState<'IDLE' | 'FLIPPING_BACK' | 'REVEALED'>('IDLE');
  const [dareFlipKey, setDareFlipKey] = useState<number>(0);

  // Aviator Heat Crash Mini-Game States (Tab 6)
  const [crashFlightState, setCrashFlightState] = useState<'READY' | 'FLYING' | 'LOCKED' | 'CRASHED'>('READY');
  const [crashMultiplier, setCrashMultiplier] = useState<number>(1.0);
  const [crashHeatLabel, setCrashHeatLabel] = useState<string>('🌸 Mild Warmup');
  const [crashResultDare, setCrashResultDare] = useState<{
    title: string;
    text: string;
    benefit: string;
    vybeLabel: string;
    wonMultiplier: number;
    wasCrashPenalty: boolean;
  } | null>(null);
  const secretCrashPointRef = useRef<number>(2.5);
  const crashStartTsRef = useRef<number>(0);

  // Interactive Game Timer
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (crashRafRef.current !== null) {
        cancelAnimationFrame(crashRafRef.current);
      }
    };
  }, []);

  const currentSegment = NAUGHTY_WHEEL_SEGMENTS[winningSegmentIndex] || NAUGHTY_WHEEL_SEGMENTS[0];

  const currentBasicSamplePrompt = BASIC_SAMPLE_PROMPTS[basicPromptCycleIdx % BASIC_SAMPLE_PROMPTS.length];
  const currentPromptText =
    connectionMode === 'party_10' && syncedPartyPromptText
      ? syncedPartyPromptText
      : !isVipOrPass
      ? currentBasicSamplePrompt.text
      : activeCustomDare?.text ||
        synthesizedWheelPrompt ||
        currentSegment.prompts[activePromptIndex % currentSegment.prompts.length] ||
        currentSegment.prompts[0];

  // 4x 360° REAL SPINNING WHEEL WITH AVIATOR-STYLE UNKNOWN BLIND LOCK
  const spinPhysicalWheel = () => {
    if (isSpinning) return;

    if (requiresPaidSubscription) {
      openSubscriptionPaywall('4×360° Aviator Wheel');
      return;
    }

    const tierMeta = SPICY_VYBE_TIERS.find((t) => t.id === intensityFilter);
    const tierRank = SPICY_LEVEL_RANK[intensityFilter] ?? 0;
    if (tierMeta?.isSubscriptionOnly && (!isVipOrPass || tierRank > subProfile.maxVybeRank)) {
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal(
          `Your current plan covers ${subProfile.maxHeatLabel}. Upgrade ($3.50 Weekly / $14.50 VIP via Google Pay) to unlock ${tierMeta.label} and endless non-repeating dares!`
        );
      }
      return;
    }

    if (dareFlipTimeoutRef.current) {
      clearTimeout(dareFlipTimeoutRef.current);
      dareFlipTimeoutRef.current = null;
    }
    setIsSpinning(true);
    setWheelSpinPhase('SPINNING_BLIND');
    setDareFlipStage('FLIPPING_BACK');
    setWheelTurnCount(1);
    setAviatorWheelMultiplier(1.0);
    setIsTimerRunning(false);
    setActiveCustomDare(null);
    setSynthesizedWheelPrompt(null);

    // Build tier-filtered segments respecting chosen subscription nastiness ceiling
    const getEligibleWheelSegments = (): NaughtyWheelSegment[] => {
      if (!isVipOrPass) {
        const mild = NAUGHTY_WHEEL_SEGMENTS.filter((s) => s.vybeLevel === 'mild');
        return mild.length > 0 ? mild : [NAUGHTY_WHEEL_SEGMENTS[5], NAUGHTY_WHEEL_SEGMENTS[11]];
      }
      if (intensityFilter !== 'all') {
        const matched = NAUGHTY_WHEEL_SEGMENTS.filter(
          (s) => s.vybeLevel === intensityFilter && (SPICY_LEVEL_RANK[s.vybeLevel] ?? 0) <= subProfile.maxVybeRank
        );
        if (matched.length > 0) return matched;
      }
      const withinPlan = NAUGHTY_WHEEL_SEGMENTS.filter(
        (s) => (SPICY_LEVEL_RANK[s.vybeLevel] ?? 0) <= subProfile.maxVybeRank
      );
      return withinPlan.length > 0 ? withinPlan : NAUGHTY_WHEEL_SEGMENTS;
    };

    const targetSegments = getEligibleWheelSegments();
    const eligibleSegmentIds = targetSegments.map((s) => s.id);

    // Exclude games already played in the active subscription wheel cycle (and never repeat the immediate prior game)
    let immediatePoolSegments = targetSegments;
    if (isVipOrPass) {
      const unplayedSegments = targetSegments.filter(
        (s) => !activeExcludedWheelIds.includes(s.id) && s.id !== activeLastPlayedWheelId
      );
      if (unplayedSegments.length > 0) {
        immediatePoolSegments = unplayedSegments;
      } else {
        const nonAdjacentSegments = targetSegments.filter((s) => s.id !== activeLastPlayedWheelId);
        immediatePoolSegments = nonAdjacentSegments.length > 0 ? nonAdjacentSegments : targetSegments;
      }
    }

    // Zero-repetition lookup across all curated prompts in the immediate unplayed segments
    const seenSet = new Set<string>(seenActivityIds.wheel || []);
    const unseenCandidates: Array<{ segment: NaughtyWheelSegment; promptIdx: number; key: string }> = [];
    immediatePoolSegments.forEach((seg) => {
      seg.prompts.forEach((_p, pIdx) => {
        const key = `wheel_${seg.id}_${pIdx}`;
        if (!seenSet.has(key)) {
          unseenCandidates.push({ segment: seg, promptIdx: pIdx, key });
        }
      });
    });

    let chosenSegment: NaughtyWheelSegment;
    let chosenPromptIdx = 0;
    let chosenKey = '';
    let generatedFreshText: string | null = null;

    if (!isVipOrPass) {
      chosenSegment = targetSegments[Math.floor(secureRandomFloat() * targetSegments.length)];
    } else if (unseenCandidates.length > 0) {
      const pick = unseenCandidates[Math.floor(secureRandomFloat() * unseenCandidates.length)];
      chosenSegment = pick.segment;
      chosenPromptIdx = pick.promptIdx;
      chosenKey = pick.key;
    } else {
      // Curated pool 100% seen for remaining games in this cycle: synthesize brand-new activity within chosen tier!
      chosenSegment = immediatePoolSegments[Math.floor(secureRandomFloat() * immediatePoolSegments.length)];
      const segRank = Math.min(subProfile.maxVybeRank, SPICY_LEVEL_RANK[chosenSegment.vybeLevel] ?? subProfile.maxVybeRank);
      const synth = synthesizeUniqueActivity(segRank, seenSet.size, seenSet);
      generatedFreshText = synth.text;
      chosenKey = synth.key;
    }

    const chosenIndex = chosenSegment.id;

    // 12 segments = 30 degrees per slice.
    const sliceAngle = 360 / 12;
    const sliceCenter = chosenIndex * sliceAngle + sliceAngle / 2;
    const targetModAngle = (360 - sliceCenter) % 360;

    // Strict 4 full 360° revolutions (4 * 360 = 1440°) + blind unknown target angle
    const fullSpins = 4;
    const currentMod = wheelRotation % 360;
    let delta = targetModAngle - currentMod;
    if (delta < 0) delta += 360;

    const finalAngle = wheelRotation + fullSpins * 360 + delta;
    setWheelRotation(finalAngle);

    // Pre-sample secret Aviator crash-lock multiplier unknowingly (hidden until 4th 360° turn stops!)
    const targetMultiplier = isVipOrPass
      ? Number((1.25 + Math.pow(secureRandomFloat(), 1.55) * (subProfile.multiplierCap - 1.25)).toFixed(2))
      : Number((1.0 + secureRandomFloat() * 0.5).toFixed(2));

    const spinDuration = 2800; // Smooth 2.8s for 4 crisp 360° turns
    const startTs = performance.now();
    const startAngle = wheelRotation;
    let lastTickAngle = startAngle;
    let prevEase = 0;

    // Exact CSS cubic-bezier(0.12, 0.98, 0.22, 1) evaluator synced frame-for-frame with wheel CSS transition
    const evalSpinEase = (tNorm: number): number => {
      if (tNorm <= 0) return 0;
      if (tNorm >= 1) return 1;
      const cx1 = 0.12;
      const cy1 = 0.98;
      const cx2 = 0.22;
      const cy2 = 1.0;
      const sampleX = (u: number) => {
        const inv = 1 - u;
        return 3 * inv * inv * u * cx1 + 3 * inv * u * u * cx2 + u * u * u;
      };
      const sampleY = (u: number) => {
        const inv = 1 - u;
        return 3 * inv * inv * u * cy1 + 3 * inv * u * u * cy2 + u * u * u;
      };
      let lo = 0;
      let hi = 1;
      for (let iter = 0; iter < 8; iter++) {
        const mid = 0.5 * (lo + hi);
        if (sampleX(mid) < tNorm) lo = mid;
        else hi = mid;
      }
      return sampleY(0.5 * (lo + hi));
    };

    if (spinRafRef.current !== null) {
      cancelAnimationFrame(spinRafRef.current);
      spinRafRef.current = null;
    }
    if (whirControllerRef.current) {
      whirControllerRef.current.stop();
      whirControllerRef.current = null;
    }

    // Start subtle velocity-tracked mechanical whirring rotor audio & initial crisp detent click
    whirControllerRef.current = appSoundService.startWheelWhirring();
    playMechanicalTick(18, 0.95);

    const stepSpinFrame = (nowTs: number) => {
      const elapsed = nowTs - startTs;
      const progress = Math.min(1, elapsed / spinDuration);
      const easeOut = evalSpinEase(progress);
      const dtEase = Math.max(0, easeOut - prevEase);
      prevEase = easeOut;
      const speedNorm = Math.min(1, Math.max(0, dtEase * 24));
      const currentSimAngle = startAngle + (finalAngle - startAngle) * easeOut;

      whirControllerRef.current?.updateSpeed(speedNorm);

      // Update live 4-turn telemetry & climbing Aviator multiplier
      const degTraveled = Math.max(0, currentSimAngle - startAngle);
      setWheelTurnCount(Math.min(4, Math.floor(degTraveled / 360) + 1));
      const climbingMult = 1 + (targetMultiplier - 1) * Math.min(1, progress * 1.04);
      setAviatorWheelMultiplier(Number(climbingMult.toFixed(2)));

      // Trigger crisp detent peg-click for every 15 degrees crossed (matching the 24 rim pegs)
      if (currentSimAngle - lastTickAngle >= 15) {
        lastTickAngle += Math.floor((currentSimAngle - lastTickAngle) / 15) * 15;
        playMechanicalTick((Math.random() - 0.5) * 35 - progress * 55, 0.25 + speedNorm * 0.75);
        setFlapperTwitch((prev) => (prev > 0 ? -12 : 14));
        setTimeout(() => setFlapperTwitch(0), 28);
      }

      if (elapsed < spinDuration) {
        spinRafRef.current = requestAnimationFrame(stepSpinFrame);
        return;
      }

      spinRafRef.current = null;
      if (whirControllerRef.current) {
        whirControllerRef.current.stop();
        whirControllerRef.current = null;
      }
      setFlapperTwitch(0);
      setIsSpinning(false);
        setWheelTurnCount(4);
        setWheelSpinPhase('LOCKED');
        setAviatorWheelMultiplier(targetMultiplier);
        setWinningSegmentIndex(chosenIndex);
        setActivePromptIndex(chosenPromptIdx);
        if (generatedFreshText) {
          setSynthesizedWheelPrompt(generatedFreshText);
        }
        if (chosenKey && isVipOrPass) {
          markActivitySeen('wheel', chosenKey);
        }
        if (isVipOrPass) {
          recordWheelGamePlayed(chosenIndex, eligibleSegmentIds);
        }
        setSyncedPartyPromptText(null);

        // Kick off 3D glassmorphic flip reveal sequence: hold glass crest back for 520ms then flip 180->0 to reveal Dare
        setDareFlipKey((prev) => prev + 1);
        setDareFlipStage('FLIPPING_BACK');
        if (dareFlipTimeoutRef.current) {
          clearTimeout(dareFlipTimeoutRef.current);
        }
        dareFlipTimeoutRef.current = setTimeout(() => {
          setDareFlipStage('REVEALED');
          dareFlipTimeoutRef.current = null;
        }, 520);

        const nextBasicIdx = (basicPromptCycleIdx + 1) % BASIC_SAMPLE_PROMPTS.length;
        if (!isVipOrPass) {
          setBasicPromptCycleIdx(nextBasicIdx);
          setTimerSeconds(BASIC_SAMPLE_PROMPTS[nextBasicIdx].duration);
        } else {
          setTimerSeconds(chosenSegment.suggestedDurationSec);
        }

        if (connectionMode === 'party_10') {
          const landedPromptText = !isVipOrPass
            ? BASIC_SAMPLE_PROMPTS[nextBasicIdx].text
            : generatedFreshText || chosenSegment.prompts[chosenPromptIdx] || chosenSegment.prompts[0];
          lastSyncedSpinTsRef.current = Date.now();
          socketService.syncPartySpin({
            roomCode: partyRoomCode,
            segmentId: chosenIndex,
            wheelRotation: finalAngle,
            promptIndex: isVipOrPass ? chosenPromptIdx : nextBasicIdx,
            promptText: landedPromptText,
            updatedBy: localPhoneName.trim() || 'Host Phone',
          });
        } else if (
          showCoupleSharePortal &&
          (connectionMode === 'online_remote' || connectionMode === 'proximity_fusion')
        ) {
          const landedPromptText = !isVipOrPass
            ? BASIC_SAMPLE_PROMPTS[nextBasicIdx].text
            : generatedFreshText || chosenSegment.prompts[chosenPromptIdx] || chosenSegment.prompts[0];
          lastCoupleSpinTsRef.current = Date.now();
          socketService.syncCoupleSpin({
            roomCode: coupleRoomCode,
            segmentId: chosenIndex,
            wheelRotation: finalAngle,
            promptIndex: isVipOrPass ? chosenPromptIdx : nextBasicIdx,
            promptText: landedPromptText,
            updatedBy: couplePartnerOneName.trim() || 'Partner',
          });
        } else {
          const p1 = couplePartnerOneName.trim() || 'Alex';
          const p2 = couplePartnerTwoName.trim() || 'Aria';
          setCurrentTurnPlayer((prev) => (prev === p1 ? p2 : p1));
        }

        playWinChime();
        try {
          confetti({
            particleCount: isVipOrPass ? 70 : 40,
            spread: 70,
            origin: { y: 0.6 },
            colors: isVipOrPass ? ['#ec4899', '#fbbf24', '#f43f5e', '#a855f7'] : ['#10b981', '#06b6d4', '#ec4899'],
          });
        } catch {
          // ignore
        }
    };
    spinRafRef.current = requestAnimationFrame(stepSpinFrame);
  };

  // Next unseen prompt variation inside current winning wedge
  const nextPromptVariation = () => {
    if (requiresPaidSubscription) {
      openSubscriptionPaywall('4×360° Aviator Wheel');
      return;
    }
    setSyncedPartyPromptText(null);
    setSynthesizedWheelPrompt(null);
    const seenSet = new Set<string>(seenActivityIds.wheel || []);
    const unseenIdx = currentSegment.prompts.findIndex((_, idx) => !seenSet.has(`wheel_${currentSegment.id}_${idx}`));
    if (unseenIdx !== -1) {
      setActivePromptIndex(unseenIdx);
      markActivitySeen('wheel', `wheel_${currentSegment.id}_${unseenIdx}`);
    } else {
      const rank = Math.min(subProfile.maxVybeRank, SPICY_LEVEL_RANK[currentSegment.vybeLevel] ?? 2);
      const synth = synthesizeUniqueActivity(rank, seenSet.size, seenSet);
      setSynthesizedWheelPrompt(synth.text);
      markActivitySeen('wheel', synth.key);
    }
    setTimerSeconds(currentSegment.suggestedDurationSec);
    setIsTimerRunning(false);
  };

  // Complete Challenge Celebration (Requires Paid Subscription)
  const handleCompleteChallenge = (_bonusMultiplier = 1) => {
    if (requiresPaidSubscription) {
      openSubscriptionPaywall('Couples Arcade');
      return;
    }

    playWinChime();
    try {
      confetti({
        particleCount: 90,
        spread: 90,
        origin: { y: 0.55 },
        colors: ['#fbbf24', '#f59e0b', '#ec4899', '#a855f7'],
      });
    } catch {
      // ignore
    }
  };

  // -------------------------------------------------------------
  // AVIATOR HEAT CRASH DARES GAME ENGINE (TAB 6)
  // -------------------------------------------------------------
  const getHeatLabelForMultiplier = (mult: number, maxRank: number): { rank: number; label: string } => {
    const bands = [
      { rank: 0, label: '🌸 Mild Warmup' },
      { rank: 1, label: '🌶️ Spicy Tease' },
      { rank: 2, label: '🌶️🔥 More Spicy' },
      { rank: 3, label: '🌶️🌶️🔥 Most Spicy' },
      { rank: 4, label: '🔥 Hot Seduction' },
      { rank: 5, label: '🔥💋 Extra Hot' },
      { rank: 6, label: '💥 Extremely Hot Nasty' },
    ];
    const desiredRank = mult < 1.35 ? 0 : mult < 1.85 ? 1 : mult < 2.5 ? 2 : mult < 3.4 ? 3 : mult < 5.0 ? 4 : mult < 7.5 ? 5 : 6;
    const cappedRank = Math.min(maxRank, desiredRank);
    return bands[cappedRank] || bands[0];
  };

  const assignCrashOrLockedDare = (mult: number, wasCrash: boolean) => {
    const band = getHeatLabelForMultiplier(
      wasCrash ? Math.max(mult, 2.2) : mult,
      subProfile.maxVybeRank
    );
    const seenAviator = new Set<string>(seenActivityIds.aviator || []);
    const synth = synthesizeUniqueActivity(
      wasCrash ? Math.min(subProfile.maxVybeRank, Math.max(1, band.rank + 1)) : band.rank,
      seenAviator.size + Math.floor(mult * 100),
      seenAviator
    );
    markActivitySeen('aviator', synth.key);
    setCrashResultDare({
      title: wasCrash ? `✈️ Flew Away Penalty (${mult.toFixed(2)}x Crash!)` : `✅ Locked Heat Dare @ ${mult.toFixed(2)}x`,
      text: synth.text,
      benefit: synth.benefit,
      vybeLabel: band.label,
      wonMultiplier: mult,
      wasCrashPenalty: wasCrash,
    });
  };

  const startHeatFlight = () => {
    if (crashFlightState === 'FLYING') return;
    if (requiresPaidSubscription) {
      openSubscriptionPaywall('Aviator Heat Crash');
      return;
    }

    const cap = subProfile.multiplierCap;
    // Heavy-tailed Aviator random crash formula (1.12x up to subscription multiplierCap)
    const u = secureRandomFloat();
    const rawCrash = 1.12 + Math.pow(u, 1.8) * (cap - 1.12);
    secretCrashPointRef.current = Number(Math.max(1.15, Math.min(cap, rawCrash)).toFixed(2));
    crashStartTsRef.current = performance.now();
    setCrashResultDare(null);
    setCrashMultiplier(1.0);
    setCrashHeatLabel('🌸 Mild Warmup');
    setCrashFlightState('FLYING');

    let lastSoundMult = 1.0;

    const step = (now: number) => {
      const elapsedSec = (now - crashStartTsRef.current) / 1000;
      const currentMult = Number(Math.pow(1.28, elapsedSec).toFixed(2));
      const band = getHeatLabelForMultiplier(currentMult, subProfile.maxVybeRank);

      if (currentMult >= secretCrashPointRef.current) {
        setCrashMultiplier(secretCrashPointRef.current);
        setCrashHeatLabel(band.label);
        setCrashFlightState('CRASHED');
        playMechanicalTick(-180);
        assignCrashOrLockedDare(secretCrashPointRef.current, true);
        crashRafRef.current = null;
        return;
      }

      setCrashMultiplier(currentMult);
      setCrashHeatLabel(band.label);
      if (currentMult - lastSoundMult >= 0.28) {
        lastSoundMult = currentMult;
        playMechanicalTick(Math.min(350, (currentMult - 1) * 75));
      }
      crashRafRef.current = requestAnimationFrame(step);
    };

    crashRafRef.current = requestAnimationFrame(step);
  };

  const lockHeatDare = () => {
    if (crashFlightState !== 'FLYING') return;
    if (crashRafRef.current !== null) {
      cancelAnimationFrame(crashRafRef.current);
      crashRafRef.current = null;
    }
    setCrashFlightState('LOCKED');
    playWinChime();
    assignCrashOrLockedDare(crashMultiplier, false);
  };

  // Countdown timer logic
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current as NodeJS.Timeout);
            setIsTimerRunning(false);
            playWinChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, playWinChime]);

  // -------------------------------------------------------------
  // CARDS DECK STATE & LOGIC (ZERO-REPEAT + SUBSCRIPTION SCALED)
  // -------------------------------------------------------------
  const [deckCardIndex, setDeckCardIndex] = useState<number>(0);
  const [cardDeckIntensity, setCardDeckIntensity] = useState<'all' | 'spicy' | 'golden'>('all');

  const combinedCardsDeck = [...ENDLESS_CARDS_DECK, ...synthesizedCards];
  const filteredCards = combinedCardsDeck.filter((c) => {
    if (!isVipOrPass) {
      return c.vybeLevel === 'mild';
    }
    const cRank = SPICY_LEVEL_RANK[c.vybeLevel] ?? 0;
    if (cRank > subProfile.maxVybeRank) return false;
    if (intensityFilter !== 'all') {
      return c.vybeLevel === intensityFilter;
    }
    if (cardDeckIntensity === 'golden') return c.category.includes('Golden');
    if (cardDeckIntensity === 'spicy') return c.intensity === 'Very Naughty & Healthy';
    return true;
  }).slice(0, !isVipOrPass ? 5 : combinedCardsDeck.length);

  const activeCard =
    filteredCards.length > 0
      ? filteredCards[deckCardIndex % filteredCards.length] || filteredCards[0]
      : ENDLESS_CARDS_DECK[3];

  const drawUnseenOrSynthesizeCard = () => {
    const seenCards = new Set<string>(seenActivityIds.cards || []);
    if (!isVipOrPass) {
      setDeckCardIndex((prev) => (prev + 1) % Math.max(1, filteredCards.length));
      return;
    }
    const unseenIdx = filteredCards.findIndex((c) => !seenCards.has(`card_${c.id}`));
    if (unseenIdx !== -1) {
      markActivitySeen('cards', `card_${filteredCards[unseenIdx].id}`);
      setDeckCardIndex(unseenIdx);
      return;
    }
    // Every curated card seen -> synthesize brand-new unique card!
    const targetVybe: SpicyVybeLevel =
      intensityFilter !== 'all'
        ? intensityFilter
        : (['spicy', 'more_spicy', 'most_spicy', 'hot', 'extra_hot', 'extremely_hot'].find(
            (lvl) => (SPICY_LEVEL_RANK[lvl as SpicyVybeLevel] ?? 0) === subProfile.maxVybeRank
          ) as SpicyVybeLevel) || 'spicy';
    const synthRank = Math.min(subProfile.maxVybeRank, SPICY_LEVEL_RANK[targetVybe] ?? 1);
    const synth = synthesizeUniqueActivity(
      synthRank,
      seenCards.size + synthesizedCards.length,
      seenCards,
      secureRandomFloat() > 0.5 ? 'Partner 1' : 'Partner 2'
    );
    const newCardId = 1000 + synthesizedCards.length + Math.floor(secureRandomFloat() * 900);
    const newCard: CardDeckItem = {
      id: newCardId,
      category: synthRank >= 4 ? 'Midnight Desire' : 'Wild Dare',
      icon: synthRank >= 5 ? '💥' : '🔥',
      forWhom: secureRandomFloat() > 0.5 ? 'Both Partners' : 'Partner Turn',
      cardPrompt: synth.text,
      intensity: synthRank >= 2 ? 'Very Naughty & Healthy' : 'Spicy',
      vybeLevel: targetVybe,
    };
    markActivitySeen('cards', `card_${newCardId}`);
    setSynthesizedCards((prev) => [...prev, newCard]);
    setDeckCardIndex(filteredCards.length);
  };

  const handleNextCard = () => {
    if (requiresPaidSubscription) {
      openSubscriptionPaywall('Endless Truth & Dare Cards');
      return;
    }
    drawUnseenOrSynthesizeCard();
  };
  const handlePrevCard = () => {
    if (requiresPaidSubscription) {
      openSubscriptionPaywall('Endless Truth & Dare Cards');
      return;
    }
    if (filteredCards.length === 0) return;
    setDeckCardIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
  };
  const handleShuffleDeck = () => {
    if (requiresPaidSubscription) {
      openSubscriptionPaywall('Endless Truth & Dare Cards');
      return;
    }
    drawUnseenOrSynthesizeCard();
  };

  // -------------------------------------------------------------
  // NAUGHTY CRAVING DICE STATE & LOGIC (ZERO-REPEAT + SUBSCRIPTION GATED)
  // -------------------------------------------------------------
  const [diceAction, setDiceAction] = useState<string>(() =>
    isVipOrPass ? 'Slow Sensual Kiss' : MILD_DICE_ACTIONS[0]
  );
  const [diceLocation, setDiceLocation] = useState<string>(() =>
    isVipOrPass ? 'Collarbone & Neck' : MILD_DICE_LOCATIONS[0]
  );
  const [isRollingDice, setIsRollingDice] = useState<boolean>(false);
  const [diceRollCount, setDiceRollCount] = useState<number>(1);

  const rollNaughtyDice = () => {
    if (isRollingDice) return;

    if (requiresPaidSubscription) {
      openSubscriptionPaywall('Craving Dice');
      return;
    }

    const tierMeta = SPICY_VYBE_TIERS.find((t) => t.id === intensityFilter);
    const tierRank = SPICY_LEVEL_RANK[intensityFilter] ?? 0;
    if (tierMeta?.isSubscriptionOnly && (!isVipOrPass || tierRank > subProfile.maxVybeRank)) {
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal(
          `Your current plan covers ${subProfile.maxHeatLabel}. Upgrade ($3.50 Weekly / $14.50 VIP) to unlock ${tierMeta.label} Craving Dice!`
        );
      }
      return;
    }

    setIsRollingDice(true);

    const activeActionPool = !isVipOrPass
      ? MILD_DICE_ACTIONS
      : DICE_ACTIONS_BY_VYBE[intensityFilter] || DICE_ACTIONS;
    const activeLocationPool = !isVipOrPass
      ? MILD_DICE_LOCATIONS
      : DICE_LOCATIONS_BY_VYBE[intensityFilter] || DICE_LOCATIONS;

    // Pick unseen action + location pairing when subscribed
    const seenDice = new Set<string>(seenActivityIds.dice || []);
    const allPairs: Array<{ act: string; loc: string; key: string }> = [];
    activeActionPool.forEach((act) => {
      activeLocationPool.forEach((loc) => {
        const key = `${act}::${loc}`;
        if (!seenDice.has(key)) allPairs.push({ act, loc, key });
      });
    });

    const chosenPair =
      allPairs.length > 0
        ? allPairs[Math.floor(secureRandomFloat() * allPairs.length)]
        : {
            act: activeActionPool[Math.floor(secureRandomFloat() * activeActionPool.length)],
            loc: activeLocationPool[Math.floor(secureRandomFloat() * activeLocationPool.length)],
            key: `combo_${Date.now()}`,
          };

    let rollStep = 0;
    const interval = setInterval(() => {
      setDiceAction(activeActionPool[Math.floor(Math.random() * activeActionPool.length)]);
      setDiceLocation(activeLocationPool[Math.floor(Math.random() * activeLocationPool.length)]);
      playMechanicalTick(Math.random() * 80);
      rollStep++;
      if (rollStep > 12) {
        clearInterval(interval);
        setDiceAction(chosenPair.act);
        setDiceLocation(chosenPair.loc);
        if (isVipOrPass) {
          markActivitySeen('dice', chosenPair.key);
        }
        setIsRollingDice(false);
        setDiceRollCount((prev) => prev + 1);
        playWinChime();
        try {
          confetti({
            particleCount: isVipOrPass ? 65 : 35,
            spread: 60,
            origin: { y: 0.6 },
            colors: isVipOrPass ? ['#ec4899', '#a855f7', '#fbbf24'] : ['#10b981', '#06b6d4', '#ec4899'],
          });
        } catch {
          // ignore
        }
      }
    }, 80);
  };

  // -------------------------------------------------------------
  // VIRAL SOCIAL CHALLENGES STATE & GENERATOR (SUBSCRIPTION GATED)
  // -------------------------------------------------------------
  const [viralChallenges, setViralChallenges] = useState<ViralSocialChallengeItem[]>(VIRAL_SOCIAL_CHALLENGES);
  const [activeViralIndex, setActiveViralIndex] = useState<number>(0);
  const [viralSubTab, setViralSubTab] = useState<'challenges' | 'finger_down'>('challenges');
  const [fingersUp, setFingersUp] = useState<boolean[]>(Array(10).fill(true));
  const [fingerQuestionIdx, setFingerQuestionIdx] = useState<number>(0);
  const [isGeneratingViral, setIsGeneratingViral] = useState<boolean>(false);
  const [viralToast, setViralToast] = useState<string | null>(null);
  const [isPlayingVibeBeat, setIsPlayingVibeBeat] = useState<boolean>(false);

  const visibleViralChallenges = viralChallenges.filter((vc) => {
    if (!isVipOrPass) {
      return vc.vybeLevel === 'mild';
    }
    const vcRank = SPICY_LEVEL_RANK[vc.vybeLevel] ?? 0;
    if (vcRank > subProfile.maxVybeRank) return false;
    if (intensityFilter !== 'all') {
      return vc.vybeLevel === intensityFilter;
    }
    return true;
  });
  const activeViralPool =
    visibleViralChallenges.length > 0
      ? visibleViralChallenges
      : viralChallenges.filter((vc) => vc.vybeLevel === 'mild');
  const visibleFingerQuestions = isVipOrPass
    ? FINGER_DOWN_QUESTIONS
    : FINGER_DOWN_QUESTIONS.slice(0, 5);

  const playTrendingVibeBeat = useCallback(() => {
    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtxClass();
      const ctx = audioCtxRef.current;

      setIsPlayingVibeBeat(true);
      // Play a lively 4-bar rhythmic syncopated loop
      const tempo = 0.18;
      const pitches = [180, 220, 260, 320, 240, 280, 360, 440];
      pitches.forEach((freq, idx) => {
        const t = ctx.currentTime + idx * tempo;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.16);
      });

      setTimeout(() => {
        setIsPlayingVibeBeat(false);
      }, pitches.length * tempo * 1000);
    } catch {
      setIsPlayingVibeBeat(false);
    }
  }, []);

  const handleToggleFinger = (idx: number) => {
    if (requiresPaidSubscription) {
      openSubscriptionPaywall('Put A Finger Down');
      return;
    }
    setFingersUp((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
    playMechanicalTick(Math.random() * 80);
  };

  const handleResetFingers = () => {
    if (requiresPaidSubscription) {
      openSubscriptionPaywall('Put A Finger Down');
      return;
    }
    setFingersUp(Array(10).fill(true));
    setFingerQuestionIdx(0);
  };

  const handleNextFingerQuestion = () => {
    if (requiresPaidSubscription) {
      openSubscriptionPaywall('Put A Finger Down');
      return;
    }
    setFingerQuestionIdx((prev) => (prev + 1) % visibleFingerQuestions.length);
  };

  // Generate Endless Tastier, Funner Viral Challenges (VIP Subscription Feature)
  const handleGenerateViralChallenge = () => {
    if (!isVipOrPass) {
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal(
          'Unlock the AI Tastier Viral Challenge Generator & All 6 Spicy Vybe Levels ($1.00 1-Day Pass or $14.50 VIP via Google Pay)!'
        );
      }
      playMechanicalTick(60);
      return;
    }

    setIsGeneratingViral(true);
    setTimeout(() => {
      const adjectives = ['Electric', 'Spicy', 'Hilarious', 'Wild', 'Intimate', 'Teasing', 'Unfiltered'];
      const actions = [
        'Slow-motion 30-second cheek nuzzle while whispering',
        'Blindfolded couple cocktail or dessert tasting test with',
        '30-second eye contact stare with water in mouth while partner tells',
        'Acting out your spiciest couple fantasy using dramatic soap-opera acting and',
        'Slow lap sway in living room to',
        'Pass the phone roast trading 3 cheeky compliments and',
        'Syncing heartbeat breaths while partner kisses',
      ];
      const details = [
        'partner’s favorite collarbone spot to an Afrobeats groove',
        'unfiltered midnight confessions to a Brazilian Baile funk rhythm',
        'ridiculous pickup lines and slow lip grazing',
        'vintage vinyl 70s soul records in candlelight',
        'a 15-second TikTok runway strut in partner’s oversized clothes',
        'gentle ear whispers while tracing back spine nerve endings',
      ];
      const tags = ['#ViralCoupleCheck', '#TwogetherVibe', '#SpicyGoals', '#GenZCouples', '#TrendingIntimacy'];

      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const act = actions[Math.floor(Math.random() * actions.length)];
      const det = details[Math.floor(Math.random() * details.length)];
      const tag = tags[Math.floor(Math.random() * tags.length)];

      const newChallenge: ViralSocialChallengeItem = {
        id: `gen_vc_${Date.now()}`,
        title: `${adj} Couple Viral Vibe Quest`,
        hashtag: `${tag} #TwogetherChallenge`,
        platform: 'TikTok & Reels Trend 🔥',
        vibe: `${adj} & Tasty`,
        vybeLevel: intensityFilter === 'all' || intensityFilter === 'mild' ? 'spicy' : intensityFilter,
        setup: `${act} ${det}. Record or play live!`,
        rules: [
          'Set phone camera upright or play in real-time in front of each other.',
          'Execute the challenge with full emotional energy and eye contact.',
          'Celebrate your victory together with a lingering kiss upon completion!',
        ],
        trendingSoundtrack: 'Lagos to Tokyo Viral Sound • 122 BPM',
      };

      setViralChallenges((prev) => [newChallenge, ...prev]);
      setActiveViralIndex(0);
      setIsGeneratingViral(false);
      playWinChime();

      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ef4444', '#ec4899', '#f59e0b', '#06b6d4'],
        });
      } catch {
        // ignore
      }
    }, 450);
  };

  const advanceViralNonRepeating = (mode: 'next' | 'random') => {
    if (!isVipOrPass) {
      const nextIdx =
        mode === 'random'
          ? Math.floor(secureRandomFloat() * activeViralPool.length)
          : (activeViralIndex + 1) % activeViralPool.length;
      setActiveViralIndex(nextIdx);
      playMechanicalTick(40);
      return;
    }

    const seenViral = new Set<string>(seenActivityIds.viral || []);
    const unseenIndices = activeViralPool
      .map((item, idx) => (!seenViral.has(item.id) ? idx : -1))
      .filter((idx) => idx !== -1);

    if (unseenIndices.length > 0) {
      const pickedIdx =
        mode === 'random'
          ? unseenIndices[Math.floor(secureRandomFloat() * unseenIndices.length)]
          : unseenIndices[0];
      markActivitySeen('viral', activeViralPool[pickedIdx].id);
      setActiveViralIndex(pickedIdx);
      playMechanicalTick(45);
      return;
    }

    // All curated viral challenges played -> synthesize a zero-repeat viral quest within chosen subscription rank
    const targetVybe: SpicyVybeLevel =
      intensityFilter !== 'all' && intensityFilter !== 'mild'
        ? intensityFilter
        : subProfile.maxVybeRank >= 5
        ? 'extra_hot'
        : subProfile.maxVybeRank >= 4
        ? 'hot'
        : 'spicy';
    const synthRank = Math.min(subProfile.maxVybeRank, SPICY_LEVEL_RANK[targetVybe] ?? 1);
    const synth = synthesizeUniqueActivity(synthRank, seenViral.size + viralChallenges.length, seenViral);
    const freshId = `synth_vc_${Date.now()}_${viralChallenges.length}`;
    const freshViral: ViralSocialChallengeItem = {
      id: freshId,
      title: `Fresh Zero-Repeat Viral Quest #${viralChallenges.length + 1}`,
      hashtag: '#TwogetherEndless #ZeroRepeatVibe #CouplesTrend',
      platform: 'TikTok & Reels Endless',
      vibe: `${subProfile.maxHeatLabel}`,
      vybeLevel: targetVybe,
      setup: synth.text,
      rules: [
        'Guaranteed fresh zero-repeat challenge unlocked by your subscription.',
        'Frame together or play face-to-face for maximum eye-contact chemistry.',
        'Celebrate together with an unbroken 5-second hug & kiss upon completion!',
      ],
      trendingSoundtrack: 'Midnight Velvet Couple Drop · 118 BPM',
    };
    markActivitySeen('viral', freshId);
    setViralChallenges((prev) => [freshViral, ...prev]);
    setActiveViralIndex(0);
    playWinChime();
  };

  // -------------------------------------------------------------
  // WHO KNOWS ME BEST ENDLESS QUIZ (PAID SUBSCRIPTION REQUIRED)
  // -------------------------------------------------------------
  const [quizQuestionIndex, setQuizQuestionIndex] = useState<number>(0);
  const [quizSelectedAnswer, setQuizSelectedAnswer] = useState<number | null>(null);

  const BASIC_QUIZ_QUESTIONS = [
    {
      vybeLevel: 'mild' as SpicyVybeLevel,
      q: 'What simple daily gesture from me instantly melts away your stress?',
      options: [
        'A long warm hug in the kitchen before dinner',
        'Waking up to a sweet good-morning forehead kiss',
        'Having my hand squeezed gently while walking together',
        'A surprise favorite coffee or tea brought without asking',
      ],
      correct: 0,
      expl: 'Predictable everyday warmth builds deep emotional safety and lowers cortisol.',
    },
    {
      vybeLevel: 'mild' as SpicyVybeLevel,
      q: 'Which cozy date night vibe makes us feel closest emotionally?',
      options: [
        'Cooking a messy homemade meal while dancing to classic hits',
        'Stargazing wrapped in one blanket on the porch or couch',
        'A sunset walk holding hands with zero phones',
        'Reading or listening to vinyl records side by side',
      ],
      correct: 1,
      expl: 'Unhurried shared presence activates oxytocin and long-term bonding!',
    },
    {
      vybeLevel: 'mild' as SpicyVybeLevel,
      q: 'What non-verbal cue tells you immediately that I am craving affection?',
      options: [
        'Pulling you closer by your waist or hand',
        'Resting my head softly against your shoulder',
        'Holding unbroken eye contact with a small smile',
        'Tracing slow circles on your palm or knee',
      ],
      correct: 2,
      expl: 'Reading micro-cues boosts partner attunement by over 40%!',
    },
    {
      vybeLevel: 'mild' as SpicyVybeLevel,
      q: 'Which nostalgic memory of ours still gives you butterflies every time?',
      options: [
        'The nervous excitement of our very first kiss',
        'Our favorite spontaneous road trip or weekend getaway',
        'Laughing until we cried over something silly late at night',
        'The moment we both knew this was real soulmate love',
      ],
      correct: 0,
      expl: 'Reliving peak romantic memories keeps honeymoon chemistry vibrant!',
    },
    {
      vybeLevel: 'mild' as SpicyVybeLevel,
      q: 'What compliment from me makes your confidence skyrocket all day?',
      options: [
        'Telling you how irresistible you look right now',
        'Appreciating how safe and peaceful I feel in your arms',
        'Praising how effortlessly you make my life brighter',
        'Whispering how lucky I am to wake up next to you',
      ],
      correct: 1,
      expl: 'Specific admiration cements deep mutual desire and gratitude.',
    },
  ];

  const VIP_QUIZ_QUESTIONS = [
    {
      vybeLevel: 'spicy' as SpicyVybeLevel,
      q: 'Which touch turns me on faster than anything else in the world?',
      options: [
        'A slow lingering kiss behind the ear while hands trace my hips',
        'Fingertips gently feathering down my bare spine',
        'Deep eye contact while gently holding my neck & jawline',
        'Warm breaths whispered over my collarbone in the dark',
      ],
      correct: 0,
      expl: 'Neck and ear stimulation trigger high dopamine & parasympathetic intimacy release!',
    },
    {
      vybeLevel: 'more_spicy' as SpicyVybeLevel,
      q: 'What is our dream fantasy location for an intimate midnight date?',
      options: [
        'A private glass-roof cabin under the starry northern lights',
        'A candlelit cliffside hot spring overlooking the ocean',
        'A secluded luxury penthouse with retro vinyl and velvet couches',
        'A private sailboat under the moonlight with warm blankets',
      ],
      correct: 1,
      expl: 'Hydro-thermal settings provide peak sensory relaxation & vulnerability.',
    },
    {
      vybeLevel: 'most_spicy' as SpicyVybeLevel,
      q: 'When we kiss deeply, what rhythm feels most electrifying?',
      options: [
        'Slow, soft, and lingering with gentle pauses',
        'Passionate, intense, and demanding with playful lip bites',
        'Alternating between gentle whispers and deep kisses',
        'Teasing and grazing without rushing to full lips',
      ],
      correct: 2,
      expl: 'Alternating tempo keeps both nervous systems excited and engaged!',
    },
    {
      vybeLevel: 'hot' as SpicyVybeLevel,
      q: 'Which sensory teasing surprise drives my anticipation completely wild?',
      options: [
        'Blindfolding me and guiding my hands slowly',
        'Warm massage oil along my lower back and shoulders',
        'Ice cube chills melted instantly by your warm lips',
        'Being pulled close against the door for a breathless kiss',
      ],
      correct: 2,
      expl: 'Sensory contrast triples tactile nerve responsiveness!',
    },
    {
      vybeLevel: 'extra_hot' as SpicyVybeLevel,
      q: 'In private roleplay or bedroom fantasy, what excites my curiosity most?',
      options: [
        'Playing strangers meeting at a midnight hotel lounge',
        'Trading 10-second playful commands with total surrender',
        'Unfiltered whispered confessions with all lights dimmed',
        'Slow rhythmic lap teasing with deep eye lock',
      ],
      correct: 0,
      expl: 'Playful novelty re-ignites dopamine reward pathways in long-term couples!',
    },
    {
      vybeLevel: 'extremely_hot' as SpicyVybeLevel,
      q: 'What instant late-night move guarantees zero hesitation from me?',
      options: [
        'Whispering exactly what you want to do once the door locks',
        'Tangling fingers in my hair while kissing my jawline',
        'Slowly guiding my hands where you want them most',
        'Pulling me into your lap and refusing to break eye contact',
      ],
      correct: 3,
      expl: 'Clear confident desire eliminates guesswork and skyrockets chemistry!',
    },
  ];

  const [synthesizedQuizQuestions, setSynthesizedQuizQuestions] = useState<typeof BASIC_QUIZ_QUESTIONS>([]);

  const ALL_VIP_QUIZ_POOL = [...VIP_QUIZ_QUESTIONS, ...BASIC_QUIZ_QUESTIONS, ...synthesizedQuizQuestions];
  const planScopedQuiz = ALL_VIP_QUIZ_POOL.filter(
    (q) => (SPICY_LEVEL_RANK[q.vybeLevel] ?? 0) <= subProfile.maxVybeRank
  );
  const filteredVipQuiz =
    intensityFilter === 'all'
      ? planScopedQuiz
      : planScopedQuiz.filter((q) => q.vybeLevel === intensityFilter);
  const activeQuizPool = !isVipOrPass
    ? BASIC_QUIZ_QUESTIONS
    : filteredVipQuiz.length > 0
    ? filteredVipQuiz
    : planScopedQuiz;

  const currentQuiz = activeQuizPool[quizQuestionIndex % activeQuizPool.length] || BASIC_QUIZ_QUESTIONS[0];

  const advanceQuizNonRepeating = () => {
    if (!isVipOrPass) {
      setQuizQuestionIndex((prev) => (prev + 1) % BASIC_QUIZ_QUESTIONS.length);
      setQuizSelectedAnswer(null);
      return;
    }

    const seenQuiz = new Set<string>(seenActivityIds.quiz || []);
    const unseenIdx = activeQuizPool.findIndex((q) => !seenQuiz.has(`quiz_${q.q.slice(0, 48)}`));
    if (unseenIdx !== -1) {
      markActivitySeen('quiz', `quiz_${activeQuizPool[unseenIdx].q.slice(0, 48)}`);
      setQuizQuestionIndex(unseenIdx);
      setQuizSelectedAnswer(null);
      return;
    }

    // All curated questions seen -> synthesize a fresh zero-repeat quiz prompt scaled to chosen plan!
    const targetVybe: SpicyVybeLevel =
      intensityFilter !== 'all'
        ? intensityFilter
        : subProfile.maxVybeRank >= 6
        ? 'extremely_hot'
        : subProfile.maxVybeRank >= 4
        ? 'hot'
        : 'spicy';
    const synthRank = Math.min(subProfile.maxVybeRank, SPICY_LEVEL_RANK[targetVybe] ?? 1);
    const synth = synthesizeUniqueActivity(synthRank, seenQuiz.size + synthesizedQuizQuestions.length, seenQuiz);
    const freshQuestion = {
      vybeLevel: targetVybe,
      q: `Midnight Attunement Check #${seenQuiz.size + 1}: Which surprise moment would make me melt immediately tonight?`,
      options: [
        synth.text,
        'Unbroken 60-second forehead-to-forehead breathing followed by a whispered confession',
        'A slow candlelight shoulder & neck massage with zero phones in the room',
        'Pulling me close and letting me take full lead for the next 2 minutes',
      ],
      correct: 0,
      expl: synth.benefit,
    };
    markActivitySeen('quiz', `quiz_${freshQuestion.q.slice(0, 48)}`);
    setSynthesizedQuizQuestions((prev) => [...prev, freshQuestion]);
    setQuizQuestionIndex(activeQuizPool.length);
    setQuizSelectedAnswer(null);
  };

  const totalSeenAcrossGames =
    (seenActivityIds.wheel?.length || 0) +
    (seenActivityIds.cards?.length || 0) +
    (seenActivityIds.viral?.length || 0) +
    (seenActivityIds.dice?.length || 0) +
    (seenActivityIds.quiz?.length || 0) +
    (seenActivityIds.aviator?.length || 0);

  // Shared Subscription Banner & Zero-Repeat Vault Header for All Game Tabs
  const renderSubscriptionBanner = (_modeBasicText: string, modeVipText: string) =>
    isVipOrPass ? (
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-purple-500/20 border-2 border-amber-400/50 flex flex-wrap items-center justify-between gap-3 text-left shadow-xl shadow-amber-500/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center font-black shadow-md shrink-0">
            <Crown className="w-5 h-5 fill-black" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-amber-300 font-mono tracking-wide">
                {subProfile.tierLabel.toUpperCase()} ACTIVE
              </span>
              <span className="text-[11px] font-mono text-amber-100/90 tabular-nums">
                · 0 Repeats ({totalSeenAcrossGames} Fresh Played)
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 font-sans">
              Ceiling: <strong className="text-white">{subProfile.maxHeatLabel}</strong> · {modeVipText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {subProfile.maxVybeRank < 6 && onOpenUpgradeModal && (
            <button
              onClick={() => onOpenUpgradeModal(subProfile.nextUpgradeHint)}
              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-black shadow-md flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
            >
              <Crown className="w-3.5 h-3.5 fill-black" />
              <span>Unlock Full Extreme</span>
            </button>
          )}
          <button
            onClick={() => handleResetSeenVault()}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-zinc-200 font-mono text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap"
            title="Reset played history if you want to replay favorites"
          >
            Reset Vault
          </button>
          <button
            onClick={() => setShowAiSpicyGenerator(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-mono text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
            title="Generate instant AI spicy challenge"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>⚡ AI Spicy Generator</span>
          </button>
          <button
            onClick={() => setShowCustomDareModal(true)}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-zinc-200 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
            title="Send custom dare to your partner"
          >
            <span>✍️ Custom Dare</span>
          </button>
        </div>
      </div>
    ) : (
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/40 flex flex-wrap items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-amber-300 font-mono">
                UNLOCK THIS GAME OR BUNDLE ALL 8
              </span>
              <span className="text-[11px] font-mono text-zinc-300 tabular-nums">
                · From $0.14/game (1-Day) · $1.00 All 8 (1-Day) · $3.50 Wk · $7.00 Bi-Wk · $14.50 Mo · $99.50 Yr
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Pay for just this game now ($0.14+), sum multiple games, or Pay Once for All 8 via Google Pay.
            </p>
          </div>
        </div>

        {onOpenUpgradeModal && (
          <button
            onClick={() => openSubscriptionPaywall(undefined, [activeGameTab])}
            className="px-4 py-2 min-h-[40px] rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-mono font-black text-xs shadow-lg hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Crown className="w-3.5 h-3.5 fill-black" />
            <span>Pay This Game ($0.14+) or Bundle</span>
          </button>
        )}
      </div>
    );

  const renderBasicLimitGate = () =>
    requiresPaidSubscription ? (
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-purple-950/75 to-[#120f20] border border-amber-400/45 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs font-mono font-black text-amber-300">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Preview Mode · Paid Subscription Required to Play ($1.00 – $99.50)</span>
          </div>
          <p className="text-[11px] text-zinc-300 font-sans">
            Inspect the game below before choosing a plan: $1.00 Day (Most Spicy · 3.5x) · $3.50 Weekly (Extra Hot · 6.5x) · $14.50 VIP (All 6 Tiers · 12.0x).
          </p>
        </div>

        <button
          onClick={() => setShowVipPreviewDrawer(true)}
          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-zinc-100 text-[11px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          Compare All 6 Plans
        </button>
      </div>
    ) : null;

  const renderSpicyVybeTierBar = (contextLabel: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-1.5">
        <span className="text-zinc-400 font-bold text-xs font-mono flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-pink-400" /> {contextLabel}:
        </span>
        <span className="text-[11px] font-mono text-zinc-300">
          {isVipOrPass ? `Unlocked Ceiling: ${subProfile.maxHeatLabel}` : 'Locked — Paid Subscription Required'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 text-xs font-mono">
        {SPICY_VYBE_TIERS.map((tier) => {
          const isActive = isVipOrPass && intensityFilter === tier.id;
          const tierRank = SPICY_LEVEL_RANK[tier.id] ?? 0;
          const isLocked = !isVipOrPass || (tier.isSubscriptionOnly && tierRank > subProfile.maxVybeRank);

          return (
            <button
              key={tier.id}
              onClick={() => {
                if (isLocked) {
                  if (onOpenUpgradeModal) {
                    const neededPlan =
                      tierRank >= 6
                        ? 'Monthly/Annual VIP ($14.50+)'
                        : tierRank >= 4
                        ? 'Weekly VIP ($3.50+)'
                        : '1-Day Pass ($1.00+)';
                    onOpenUpgradeModal(
                      `Unlock ${tier.label} with ${neededPlan} via Google Pay for endless non-repeating vybes!`
                    );
                  }
                  playMechanicalTick(60);
                } else {
                  setIntensityFilter(tier.id);
                  playMechanicalTick(20);
                }
              }}
              className={`p-2 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 border text-center relative group ${
                isActive
                  ? `bg-gradient-to-b ${tier.gradient} text-white font-black shadow-lg border-white/40 scale-102`
                  : isLocked
                  ? 'bg-black/40 border-white/5 text-zinc-400 hover:border-amber-400/40 hover:text-white'
                  : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
              }`}
              title={tier.description}
            >
              {isLocked && (
                <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-black font-black text-[9px] flex items-center gap-0.5 shadow">
                  <Lock className="w-2.5 h-2.5" /> {tierRank >= 6 ? 'VIP' : tierRank >= 4 ? 'WK+' : 'PAID'}
                </span>
              )}

              <span className="text-base sm:text-lg">{tier.icon}</span>
              <span className="text-[10.5px] leading-tight font-extrabold truncate w-full whitespace-nowrap">
                {tier.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 space-y-6 text-left select-none">
      {/* Combined Couple Fusion Header */}
      <GlassCard className="p-4 sm:p-5 border border-pink-500/40 relative overflow-hidden" glowColor="pink">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-pink-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <div className="w-12 h-12 rounded-2xl p-0.5 bg-gradient-to-tr from-cyan-400 to-purple-500 shadow-xl overflow-hidden z-10 border-2 border-black">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
                  alt="Alex"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <div className="w-7 h-7 rounded-full bg-pink-500 text-white flex items-center justify-center -mx-2.5 z-20 shadow-lg border-2 border-black animate-pulse">
                <Heart className="w-3.5 h-3.5 fill-white" />
              </div>
              <div className="w-12 h-12 rounded-2xl p-0.5 bg-gradient-to-tr from-pink-500 to-amber-400 shadow-xl overflow-hidden z-10 border-2 border-black">
                <img
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80"
                  alt="Aria"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white">Alex & Aria</h2>
                <span className="px-2 py-0.2 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-300 font-mono text-[11px] font-bold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-pink-400" /> Naughty Arcade
                </span>
                <VerificationBadge tier={isVip ? 'vip' : 'basic'} isVerified={true} size="sm" />
              </div>
              <p className="text-[11px] text-zinc-300 font-mono flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-cyan-400" /> Endless Trending Naughty & Healthy Couple Games
              </p>
            </div>
          </div>

          {/* Couples-Only Portal Quick Trigger */}
          <div className="flex items-center gap-2 flex-wrap self-end sm:self-center relative z-10">
            <button
              type="button"
              onClick={() => {
                if (connectionMode === 'party_10') {
                  setConnectionMode(couplePortalType === 'offline' ? 'offline_pass' : 'online_remote');
                }
                setShowCoupleSharePortal((prev) => !prev);
              }}
              className={`px-3 py-1.5 rounded-2xl font-mono text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer shadow-lg ${
                showCoupleSharePortal && connectionMode !== 'party_10'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-pink-300/60'
                  : 'bg-pink-500/15 hover:bg-pink-500/25 border-pink-400/40 text-pink-200'
              }`}
              title="Open Couples-Only Share Portal to invite your partner Online or play Offline"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Couples Share Portal</span>
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Main Game Mode Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-white/10 pb-2 overflow-x-auto text-xs font-mono">
        <button
          onClick={() => selectGameTab('wheel')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
            activeGameTab === 'wheel'
              ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white shadow-lg shadow-pink-500/25 font-black'
              : 'bg-white/5 text-zinc-300 hover:bg-white/10'
          }`}
        >
          <RotateCw className="w-4 h-4" /> 🎡 4×360 Aviator Wheel {isTabUnlocked('wheel') ? '✓' : '🔒'}
        </button>

        <button
          onClick={() => selectGameTab('aviator_crash')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
            activeGameTab === 'aviator_crash'
              ? 'bg-gradient-to-r from-rose-500 via-red-500 to-amber-500 text-white shadow-lg shadow-rose-500/25 font-black'
              : 'bg-white/5 text-zinc-300 hover:bg-white/10'
          }`}
        >
          <Plane className="w-4 h-4 text-amber-300" /> ✈️ Aviator Heat Crash {isTabUnlocked('aviator_crash') ? '✓' : '🔒'}
        </button>

        <button
          onClick={() => selectGameTab('cards')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
            activeGameTab === 'cards'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25 font-black'
              : 'bg-white/5 text-zinc-300 hover:bg-white/10'
          }`}
        >
          <Flame className="w-4 h-4 text-pink-400" /> 🃏 Endless Truth & Dare {isTabUnlocked('cards') ? '✓' : '🔒'}
        </button>

        <button
          onClick={() => selectGameTab('social_viral')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
            activeGameTab === 'social_viral'
              ? 'bg-gradient-to-r from-red-500 via-pink-500 to-amber-500 text-white shadow-lg shadow-pink-500/25 font-black'
              : 'bg-white/5 text-zinc-300 hover:bg-white/10'
          }`}
        >
          <Smartphone className="w-4 h-4 text-pink-400" /> 📱 Viral Social Quests {isTabUnlocked('social_viral') ? '✓' : '🔒'}
        </button>

        <button
          onClick={() => selectGameTab('dice')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
            activeGameTab === 'dice'
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg shadow-amber-500/25 font-black'
              : 'bg-white/5 text-zinc-300 hover:bg-white/10'
          }`}
        >
          <Dices className="w-4 h-4 text-amber-300" /> 🎲 Craving Dice {isTabUnlocked('dice') ? '✓' : '🔒'}
        </button>

        <button
          onClick={() => selectGameTab('quiz')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
            activeGameTab === 'quiz'
              ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-lg shadow-cyan-500/25 font-black'
              : 'bg-white/5 text-zinc-300 hover:bg-white/10'
          }`}
        >
          <HelpCircle className="w-4 h-4" /> 🧠 Who Knows Me Best? {isTabUnlocked('quiz') ? '✓' : '🔒'}
        </button>
      </div>

      {/* =============================================================
          MODE 1: REALISTIC NAUGHTY SPINNING WHEEL (12 SLICES, PINS, REAL FLAPPER, PHYSICS)
          ============================================================= */}
      {activeGameTab === 'wheel' && (
        <div className="space-y-4">
          {/* Connection & Multiplayer Mode Selector */}
          <div className="p-3 rounded-2xl bg-[#141221] border border-white/10 flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-zinc-400 font-bold flex items-center gap-1 mr-1">
                <Users className="w-3.5 h-3.5 text-cyan-400" /> Mode:
              </span>
              <button
                onClick={() => {
                  setConnectionMode('offline_pass');
                  setCouplePortalType('offline');
                  setShowCoupleSharePortal(true);
                }}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer font-bold ${
                  connectionMode === 'offline_pass'
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
                title="Couples Offline Pass & Play portal"
              >
                📴 Offline (Pass & Play)
              </button>
              <button
                onClick={() => {
                  setConnectionMode('online_remote');
                  setCouplePortalType('online');
                  setShowCoupleSharePortal(true);
                }}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer font-bold ${
                  connectionMode === 'online_remote'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
                title="Couples Online Remote portal"
              >
                🌐 Online Remote (Couples Away)
              </button>
              <button
                onClick={() => {
                  setConnectionMode('proximity_fusion');
                  setCouplePortalType('online');
                  setShowCoupleSharePortal(true);
                }}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer font-bold ${
                  connectionMode === 'proximity_fusion'
                    ? 'bg-pink-500 text-white shadow-md'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
                title="Two partner devices synced nearby"
              >
                🔗 2-Device Proximity Fusion
              </button>
              <button
                onClick={() => {
                  setConnectionMode('party_10');
                  setShowCoupleSharePortal(false);
                }}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer font-bold ${
                  connectionMode === 'party_10'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
                title="Group party room with up to 10 devices"
              >
                👥 Party Room (Max 10 Devices)
              </button>
            </div>

            {/* Room Status Indicator */}
            <div className="flex items-center gap-2">
              {connectionMode === 'party_10' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold">
                  Room: {partyRoomCode} • {connectedDevicesCount}/10 Phones Connected
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCoupleSharePortal((prev) => !prev)}
                  className="px-2.5 py-0.5 rounded-full bg-pink-500/20 hover:bg-pink-500/30 text-pink-200 border border-pink-400/40 text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
                >
                  <Heart className="w-3 h-3 fill-pink-400 text-pink-400" />
                  Couples Portal ({couplePortalType === 'online' ? 'Online 2-Sync' : 'Offline'}) • {showCoupleSharePortal ? 'Hide' : 'Share'}
                </button>
              )}
              <span className="text-[10px] text-zinc-400">
                Turn: <strong className="text-white font-bold">{currentTurnPlayer}</strong>
              </span>
            </div>
          </div>

          {/* COUPLES-ONLY SHARE PORTAL (STRICTLY 2 PARTNERS — PLAY ONLINE OR OFFLINE) */}
          {connectionMode !== 'party_10' && showCoupleSharePortal && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/12 via-[#181228] to-cyan-500/12 border border-pink-400/40 space-y-3.5 text-left shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-pink-300 font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-pink-400 fill-pink-400" />
                      Couples-Only Share Portal (2 Partners Max)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-200 text-[10px] font-mono font-bold">
                      {couplePortalType === 'online'
                        ? `ONLINE SYNC • ${Math.max(1, couplePartners.length)} / 2 PARTNERS`
                        : 'OFFLINE READY • SAME COUCH / NO WI-FI'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Private just for the two of you—switch between <strong>Online Remote Sync</strong> or <strong>Offline Pass &amp; Play</strong> anytime.
                  </p>
                </div>

                {/* Online vs Offline Couple Switcher */}
                <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => handleSelectCouplePortalType('online')}
                    className={`px-2.5 py-1.5 rounded-lg font-mono text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all ${
                      couplePortalType === 'online'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Wifi className="w-3.5 h-3.5" />
                    Play Online
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectCouplePortalType('offline')}
                    className={`px-2.5 py-1.5 rounded-lg font-mono text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all ${
                      couplePortalType === 'offline'
                        ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-black shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <WifiOff className="w-3.5 h-3.5" />
                    Play Offline
                  </button>
                </div>
              </div>

              {couplePortalError && (
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-400/50 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-300" />
                  <span>{couplePortalError}</span>
                </div>
              )}

              {couplePortalBanner && (
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs flex items-center gap-2 font-mono">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" />
                  <span>{couplePortalBanner}</span>
                </div>
              )}

              {/* Shareable Couples-Only Portal Link */}
              <div className="p-3 rounded-xl bg-black/45 border border-pink-400/25 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-pink-200 truncate select-all">
                    {couplePortalUrl}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={handleCopyCoupleLink}
                      className="px-3 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-mono text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      {copiedCoupleLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCoupleLink ? 'Copied!' : 'Copy Partner Link'}
                    </button>
                    <button
                      type="button"
                      onClick={handleShareCoupleLink}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-mono text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send to Partner
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-zinc-400 font-mono">
                      Couple Code: <strong className="text-pink-300">{coupleRoomCode}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleCreateNewCouplePortal}
                      className="text-cyan-300 hover:text-cyan-200 underline font-mono cursor-pointer"
                    >
                      New Couple Link
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Join our private Couples-Only ${couplePortalType === 'online' ? 'Online Sync' : 'Offline Date Night'} Portal on Twogether: ${couplePortalUrl}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 font-mono font-bold transition-all"
                    >
                      WhatsApp Partner
                    </a>
                    <a
                      href={`sms:?&body=${encodeURIComponent(`Tap our private Couples-Only Portal (${coupleRoomCode}): ${couplePortalUrl}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 font-mono font-bold transition-all"
                    >
                      SMS Partner
                    </a>
                    {couplePortalType === 'offline' && (
                      <button
                        type="button"
                        onClick={handleDownloadOfflineCouplePack}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Download className="w-3 h-3" />
                        Save Offline Pack
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Couple Names / Join Partner's Portal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 block mb-0.5">Partner 1 (You)</label>
                    <input
                      type="text"
                      value={couplePartnerOneName}
                      onChange={(e) => setCouplePartnerOneName(e.target.value)}
                      maxLength={20}
                      placeholder="Partner 1 name"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-pink-400/60"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 block mb-0.5">
                      {couplePortalType === 'offline' ? 'Partner 2 (Same Couch)' : 'Partner 2 Label'}
                    </label>
                    <input
                      type="text"
                      value={couplePartnerTwoName}
                      onChange={(e) => setCouplePartnerTwoName(e.target.value)}
                      maxLength={20}
                      placeholder="Partner 2 name"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400/60"
                    />
                  </div>
                </div>

                <form onSubmit={handleJoinCouplePortalByInput} className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] font-mono text-zinc-400 block mb-0.5">
                      Join Partner&apos;s Couples Link / Code
                    </label>
                    <input
                      type="text"
                      value={coupleJoinInput}
                      onChange={(e) => setCoupleJoinInput(e.target.value)}
                      placeholder="Paste ?coupleRoom= link or COUPLE-XXXX..."
                      className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-purple-400/60"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-mono text-xs font-black shrink-0 cursor-pointer transition-all"
                  >
                    Connect
                  </button>
                </form>
              </div>

              {/* Strictly 2-Partner Slots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[0, 1].map((slotIdx) => {
                  const connected = couplePortalType === 'online' ? couplePartners[slotIdx] : undefined;
                  const displayName =
                    connected?.partnerName ||
                    (slotIdx === 0 ? couplePartnerOneName.trim() || 'Partner 1' : couplePartnerTwoName.trim() || 'Partner 2');
                  const isTurn = displayName === currentTurnPlayer;
                  const isWaitingRemote = couplePortalType === 'online' && slotIdx === 1 && !connected;

                  return (
                    <div
                      key={`couple-portal-slot-${slotIdx}`}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all ${
                        isWaitingRemote
                          ? 'bg-black/35 border-dashed border-pink-400/30 text-zinc-400'
                          : isTurn
                          ? 'bg-pink-500/20 border-pink-400 text-white shadow-md shadow-pink-500/15'
                          : 'bg-white/10 border-white/20 text-zinc-100'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Heart
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isWaitingRemote ? 'text-zinc-500' : 'text-pink-400 fill-pink-400'
                            }`}
                          />
                          <span className="font-bold truncate">
                            {isWaitingRemote ? 'Waiting for your partner...' : displayName}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                          {couplePortalType === 'offline'
                            ? `Offline Pass & Play • Partner #${slotIdx + 1}`
                            : connected
                            ? `Online Synced • ${connected.deviceLabel}`
                            : 'Send partner link above to connect'}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black shrink-0 bg-black/40 border border-white/15">
                        {isWaitingRemote ? 'SLOT 2/2' : isTurn ? 'ACTIVE TURN' : slotIdx === 0 ? 'PARTNER 1' : 'PARTNER 2'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 10-PHONE PARTY ROOM JOINING LINK & LIVE DEVICE ROSTER */}
          {connectionMode === 'party_10' && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-[#171326] to-purple-500/10 border border-amber-400/35 space-y-3.5 text-left shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-amber-300 font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <Link2 className="w-4 h-4 text-amber-400" />
                      10-Phone Party Room — Send Joining Link to Play
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-bold">
                      {connectedDevicesCount} / 10 PHONES LIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    To play across up to 10 phones in real time, send this joining link to your friends or open it on each phone.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCreateNewPartyRoom}
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-100 text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
                    title="Generate a fresh 10-phone party room link"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-amber-300" />
                    New Room Link
                  </button>
                  <button
                    onClick={() => setConnectionMode('offline_pass')}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-200 text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
                    title="Leave this party room"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Leave
                  </button>
                </div>
              </div>

              {partyRoomError && (
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-400/50 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-300" />
                  <span>{partyRoomError}</span>
                </div>
              )}

              {partyStatusBanner && (
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs flex items-center gap-2 font-mono">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" />
                  <span>{partyStatusBanner}</span>
                </div>
              )}

              {/* Shareable Joining Link Bar */}
              <div className="p-3 rounded-xl bg-black/45 border border-amber-400/25 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-amber-200 truncate select-all">
                    {partyJoinUrl}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleCopyPartyLink}
                      className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      {copiedJoinLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedJoinLink ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button
                      onClick={handleSharePartyLink}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-mono text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send Link
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="text-zinc-400 font-mono">
                    Room Code: <strong className="text-amber-300">{partyRoomCode}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Join my 10-Phone Party Room on Twogether! Tap to play on your phone: ${partyJoinUrl}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 font-mono font-bold transition-all"
                    >
                      Send via WhatsApp
                    </a>
                    <a
                      href={`sms:?&body=${encodeURIComponent(`Join my 10-Phone Party Room (${partyRoomCode}) on Twogether: ${partyJoinUrl}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 font-mono font-bold transition-all"
                    >
                      Send via SMS
                    </a>
                  </div>
                </div>
              </div>

              {/* Player Name & Join Another Link / Code */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-mono text-zinc-400 shrink-0">Your Phone:</label>
                  <input
                    type="text"
                    value={localPhoneName}
                    onChange={(e) => setLocalPhoneName(e.target.value)}
                    maxLength={24}
                    placeholder="Your name on this phone"
                    className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400/60"
                  />
                </div>
                <form onSubmit={handleJoinRoomByInput} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value)}
                    placeholder="Paste friend's joining link or room code..."
                    className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400/60"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-black shrink-0 cursor-pointer transition-all"
                  >
                    Join Room
                  </button>
                </form>
              </div>

              {/* Live 10-Phone Slots Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {Array.from({ length: 10 }).map((_, slotIdx) => {
                  const device = partyDevices[slotIdx];
                  const isMe = device?.deviceId === partyDeviceId;
                  const isTurn = device && device.playerName === currentTurnPlayer;
                  return (
                    <div
                      key={`party-slot-${slotIdx}`}
                      className={`p-2 rounded-xl border text-[11px] transition-all ${
                        device
                          ? isTurn
                            ? 'bg-amber-400/20 border-amber-400 text-white shadow-md shadow-amber-500/15'
                            : isMe
                            ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-100'
                            : 'bg-white/10 border-white/20 text-zinc-100'
                          : 'bg-black/30 border-dashed border-white/10 text-zinc-500'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-mono text-[10px] font-bold">
                          <Smartphone className="w-3 h-3 inline mr-0.5" />#{slotIdx + 1}
                        </span>
                        {device?.isHost && (
                          <span className="px-1 py-0.2 rounded bg-amber-400/30 text-amber-200 text-[9px] font-mono font-black">
                            HOST
                          </span>
                        )}
                        {!device?.isHost && isMe && (
                          <span className="px-1 py-0.2 rounded bg-cyan-400/30 text-cyan-200 text-[9px] font-mono font-black">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="font-bold truncate">
                        {device ? device.playerName : 'Open Slot'}
                      </div>
                      <div className="text-[9px] text-zinc-400 truncate">
                        {device ? (isTurn ? 'Spin Turn' : device.phoneLabel) : 'Send link'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {renderSubscriptionBanner(
            'BASIC MODE (FREE): 5-Prompt Repeating Sample Loop',
            'Zero Repeats · 4× 360° Aviator Blind Spin · Nasty Scaling Unlocked'
          )}

          {renderBasicLimitGate()}

          {renderSpicyVybeTierBar('Intimacy & Spicy Vybe Level')}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* The Real Physical Wheel SVG Component (Col 1-7) */}
            <GlassCard className="lg:col-span-7 p-4 sm:p-6 text-center space-y-3.5 flex flex-col items-center justify-center border border-pink-500/40 relative overflow-hidden">
              <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                <span className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> 4×360° (1440°) Blind Wheel
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setIsAviatorBlindMode((prev) => !prev);
                    playMechanicalTick(30);
                  }}
                  className={`px-2.5 py-1 rounded-xl font-mono text-[10.5px] font-bold border flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap ${
                    isAviatorBlindMode
                      ? 'bg-rose-500/20 border-rose-400/50 text-rose-200'
                      : 'bg-white/5 border-white/15 text-zinc-300 hover:text-white'
                  }`}
                  title="Aviator Unknown Mode hides slice names during the 4 full rotations so outcomes land unpredictably"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>{isAviatorBlindMode ? 'Aviator Blind: ON' : 'Aviator Blind: OFF'}</span>
                </button>
              </div>

              {/* Crisp Aviator + 4x360° Live Telemetry Strip */}
              <div className="w-full space-y-2">
                <div className="w-full grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-black/45 border border-white/10 font-mono text-left">
                  <div>
                    <span className="text-[9.5px] uppercase tracking-wider text-zinc-400 block">4× 360° Turn</span>
                    <strong className="text-xs sm:text-sm text-cyan-300 font-black tabular-nums">
                      {wheelTurnCount}/4 · {wheelTurnCount * 360}°
                    </strong>
                  </div>
                  <div>
                    <span className="text-[9.5px] uppercase tracking-wider text-zinc-400 block">Target Status</span>
                    <strong className="text-xs sm:text-sm text-pink-300 font-black whitespace-nowrap">
                      {isSpinning
                        ? isAviatorBlindMode
                          ? 'UNKNOWN'
                          : 'SPINNING'
                        : wheelSpinPhase === 'LOCKED'
                        ? 'LOCKED'
                        : 'READY'}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[9.5px] uppercase tracking-wider text-zinc-400 block">Aviator Boost</span>
                    <strong className="text-xs sm:text-sm text-amber-300 font-black tabular-nums">
                      {aviatorWheelMultiplier.toFixed(2)}x
                    </strong>
                  </div>
                </div>

                {(() => {
                  const poolForFilter = !isVipOrPass
                    ? NAUGHTY_WHEEL_SEGMENTS.filter((s) => s.vybeLevel === 'mild')
                    : intensityFilter !== 'all'
                    ? NAUGHTY_WHEEL_SEGMENTS.filter(
                        (s) =>
                          s.vybeLevel === intensityFilter &&
                          (SPICY_LEVEL_RANK[s.vybeLevel] ?? 0) <= subProfile.maxVybeRank
                      )
                    : NAUGHTY_WHEEL_SEGMENTS.filter(
                        (s) => (SPICY_LEVEL_RANK[s.vybeLevel] ?? 0) <= subProfile.maxVybeRank
                      );
                  const eligiblePool = poolForFilter.length > 0 ? poolForFilter : NAUGHTY_WHEEL_SEGMENTS;
                  const unplayedCount = eligiblePool.filter(
                    (s) => !activeExcludedWheelIds.includes(s.id) && s.id !== activeLastPlayedWheelId
                  ).length;

                  return (
                    <div className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2 text-[10.5px] font-mono tabular-nums">
                      <span className="text-zinc-300">
                        {isVipOrPass ? (
                          <>
                            Pool: <strong className="text-emerald-300">{Math.max(1, unplayedCount)}/{eligiblePool.length}</strong> Unplayed Left
                          </>
                        ) : (
                          <span>Wheel Locked · Paid Plan Required</span>
                        )}
                      </span>
                      <span className="text-amber-300 font-bold">
                        {isVipOrPass ? `Endless Cycle #${activeWheelCycleCount}` : 'Subscribe ($1.00+) to Spin'}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Wheel Container with Pointer / Flapper */}
              <div className="relative w-[300px] h-[300px] sm:w-[350px] sm:h-[350px] my-1 flex items-center justify-center">
                {/* Physical Top Pointer Needle / Flapper (12 o'clock) with Realistic Twitch */}
                <div
                  className="absolute -top-3 z-30 flex flex-col items-center pointer-events-none drop-shadow-[0_4px_12px_rgba(236,72,153,0.8)]"
                  style={{
                    transformOrigin: '50% 0%',
                    transform: `rotate(${flapperTwitch}deg)`,
                    transition: 'transform 0.05s ease-out',
                  }}
                >
                  {/* Flapper Mount Pin */}
                  <div className="w-5 h-5 rounded-full bg-gradient-to-b from-amber-200 via-amber-400 to-yellow-600 border-2 border-white shadow-md flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-black rounded-full" />
                  </div>
                  {/* Flapper Needle */}
                  <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[24px] border-t-amber-400 -mt-1" />
                </div>

                {/* Rotating Wheel Body - Smooth 2.8s 4x360° Spin */}
                <div
                  className="w-full h-full rounded-full cursor-pointer select-none"
                  style={{
                    transform: `rotate(${wheelRotation}deg)`,
                    transition: isSpinning ? 'transform 2.8s cubic-bezier(0.12, 0.98, 0.22, 1)' : 'none',
                  }}
                  onClick={spinPhysicalWheel}
                  title="Click or Tap for a 4×360° Blind Spin!"
                >
                  <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-2xl">
                    <defs>
                      {/* Radial Metallic Gradient for Outer Rim */}
                      <radialGradient id="outerRimGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="85%" stopColor="#1e1b2e" />
                        <stop offset="93%" stopColor="#fbbf24" />
                        <stop offset="97%" stopColor="#fef08a" />
                        <stop offset="100%" stopColor="#b45309" />
                      </radialGradient>

                      {/* Drop shadows */}
                      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.5" />
                      </filter>
                    </defs>

                    {/* Outer Rim Circle */}
                    <circle cx="200" cy="200" r="192" fill="url(#outerRimGrad)" />
                    <circle cx="200" cy="200" r="185" fill="#141221" stroke="#fbbf24" strokeWidth="3" />

                    {/* 12 Distinct Radial Wedges */}
                    {NAUGHTY_WHEEL_SEGMENTS.map((seg, i) => {
                      const sliceAngle = 360 / 12; // 30 deg
                      const startAngle = (i * sliceAngle - 90) * (Math.PI / 180);
                      const endAngle = ((i + 1) * sliceAngle - 90) * (Math.PI / 180);

                      const x1 = 200 + 176 * Math.cos(startAngle);
                      const y1 = 200 + 176 * Math.sin(startAngle);
                      const x2 = 200 + 176 * Math.cos(endAngle);
                      const y2 = 200 + 176 * Math.sin(endAngle);

                      const pathData = `M 200 200 L ${x1} ${y1} A 176 176 0 0 1 ${x2} ${y2} Z`;

                      const midAngleDeg = i * sliceAngle + sliceAngle / 2;
                      const isHighlighted = !isSpinning && winningSegmentIndex === i;
                      const isBlindCloaked = isSpinning && isAviatorBlindMode;
                      const isPlayedInPool = isVipOrPass && activeExcludedWheelIds.includes(seg.id);

                      return (
                        <g key={seg.id}>
                          {/* Segment Wedge */}
                          <path
                            d={pathData}
                            fill={isBlindCloaked ? '#1d1631' : seg.color}
                            fillOpacity={
                              isBlindCloaked ? 0.94 : isHighlighted ? 0.98 : isPlayedInPool ? 0.42 : 0.85
                            }
                            stroke={isBlindCloaked ? '#fbbf24' : '#0f0e17'}
                            strokeWidth={isBlindCloaked ? '1.8' : '2.5'}
                          />

                          {/* High-Contrast Pill Backdrop & Visible / Mystery Blind Text */}
                          <g transform={`rotate(${midAngleDeg}, 200, 200)`}>
                            <rect
                              x="134"
                              y="44"
                              width="132"
                              height="26"
                              rx="13"
                              fill={
                                isBlindCloaked
                                  ? 'rgba(244, 63, 94, 0.25)'
                                  : isPlayedInPool
                                  ? 'rgba(12, 10, 22, 0.62)'
                                  : 'rgba(12, 10, 22, 0.88)'
                              }
                              stroke={
                                isBlindCloaked
                                  ? 'rgba(251, 191, 36, 0.65)'
                                  : isPlayedInPool
                                  ? 'rgba(255, 255, 255, 0.2)'
                                  : 'rgba(255, 255, 255, 0.45)'
                              }
                              strokeWidth="1.2"
                              filter="url(#shadow)"
                            />
                            <text
                              x="200"
                              y="61"
                              textAnchor="middle"
                              fill={isPlayedInPool && !isBlindCloaked && !isHighlighted ? '#a1a1aa' : '#ffffff'}
                              fontSize="11.5"
                              fontWeight="900"
                              fontFamily="sans-serif"
                              letterSpacing="0.2px"
                              style={{ textShadow: '0 2px 4px rgba(0,0,0,1)' }}
                            >
                              {isBlindCloaked
                                ? '❓ UNKNOWN'
                                : isPlayedInPool && !isHighlighted
                                ? `✓ ${seg.shortLabel}`
                                : `${seg.emoji} ${seg.shortLabel}`}
                            </text>
                          </g>
                        </g>
                      );
                    })}

                    {/* 24 Golden Perimeter Pins/Pegs along rim */}
                    {Array.from({ length: 24 }).map((_, pinIdx) => {
                      const pinAngle = (pinIdx * (360 / 24) - 90) * (Math.PI / 180);
                      const px = 200 + 184 * Math.cos(pinAngle);
                      const py = 200 + 184 * Math.sin(pinAngle);
                      return (
                        <circle
                          key={pinIdx}
                          cx={px}
                          cy={py}
                          r="3.5"
                          fill="#fef08a"
                          stroke="#78350f"
                          strokeWidth="1.2"
                        />
                      );
                    })}

                    {/* Center Metallic Decorative Hub */}
                    <circle cx="200" cy="200" r="48" fill="#141221" stroke="#fbbf24" strokeWidth="4" />
                    <circle cx="200" cy="200" r="42" fill="url(#outerRimGrad)" />
                  </svg>
                </div>

                {/* Central Tactile SPIN Button in the Hub */}
                <div className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-cyan-400 p-1 shadow-2xl z-20 flex items-center justify-center">
                  <button
                    onClick={spinPhysicalWheel}
                    disabled={isSpinning}
                    className="w-full h-full rounded-full bg-[#141221] text-white font-black text-xs uppercase flex flex-col items-center justify-center gap-0.5 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-pink-400/50 shadow-inner group"
                  >
                    <RotateCw
                      className={`w-4 h-4 text-pink-400 ${
                        isSpinning ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'
                      }`}
                    />
                    <span className="text-[10px] tracking-widest text-amber-300 font-mono">
                      SPIN
                    </span>
                  </button>
                </div>
              </div>

              {/* Action Button below wheel (Strictly "Spin") */}
              <div className="w-full flex items-center justify-center gap-3 pt-1">
                <button
                  onClick={spinPhysicalWheel}
                  disabled={isSpinning}
                  className="px-10 py-3 min-h-[44px] rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 text-white font-black text-sm tracking-wide shadow-lg shadow-pink-500/30 hover:scale-105 active:scale-95 disabled:opacity-65 transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>Spin</span>
                </button>
              </div>
            </GlassCard>

            {/* Current Active Dare Card with 3D Glassmorphic Framer Motion Flip Sequence (Col 8-12) */}
            <div className="lg:col-span-5 h-full [perspective:1200px]">
              <motion.div
                key={`dare-flip-${dareFlipKey}`}
                initial={false}
                animate={{
                  rotateY: dareFlipStage === 'FLIPPING_BACK' ? 180 : 0,
                  scale: dareFlipStage === 'FLIPPING_BACK' ? 0.96 : 1,
                }}
                transition={{
                  duration: 0.65,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{ transformStyle: 'preserve-3d' }}
                className="relative w-full h-full"
              >
                {/* BACK FACE (3D Glassmorphic Mystery Crest shown while spinning & right before challenge reveal) */}
                <div
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                  className="absolute inset-0 z-20 rounded-3xl p-6 border border-white/25 bg-gradient-to-br from-pink-500/20 via-[#1a1230]/90 to-cyan-500/20 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center text-center gap-4 overflow-hidden pointer-events-none"
                >
                  <motion.div
                    animate={{ x: ['-120%', '140%'] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 pointer-events-none"
                  />
                  <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/30 backdrop-blur-md flex items-center justify-center shadow-lg">
                    <Sparkles className="w-8 h-8 text-amber-300 animate-pulse" />
                  </div>
                  <div className="space-y-1.5 relative z-10">
                    <span className="px-3 py-1 rounded-lg bg-pink-500/25 border border-pink-400/40 text-pink-200 font-mono text-[10px] font-black uppercase tracking-widest">
                      {isSpinning ? '4× 360° Blind Locking...' : 'Dare Selected · Flipping Reveal'}
                    </span>
                    <h3 className="text-xl font-black text-white tracking-tight">
                      {isSpinning ? 'Selecting Unknown Dare' : currentSegment.title}
                    </h3>
                    <p className="text-xs text-zinc-300 font-mono tabular-nums">
                      Boost Locked: {aviatorWheelMultiplier.toFixed(2)}x · Turn {wheelTurnCount}/4
                    </p>
                  </div>
                </div>

                {/* FRONT FACE (Revealed Dare Challenge Card) */}
                <div className="h-full [backface-visibility:hidden]">
                <GlassCard
                  className="p-5 space-y-4 border border-pink-500/40 flex flex-col justify-between h-full bg-gradient-to-b from-[#18152b] to-[#12101e]"
                >
                  <div className="space-y-3">
                    {/* Header: Segment Title & Emoji */}
                    <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl">{isSpinning && isAviatorBlindMode ? '❓' : currentSegment.emoji}</span>
                        <div>
                          <span className="text-[10px] font-mono uppercase text-pink-400 font-extrabold tracking-wider block">
                            {isSpinning && isAviatorBlindMode
                              ? 'Flying Blind (4×360°)...'
                              : synthesizedWheelPrompt
                              ? `Fresh Synthesized Quest · ${aviatorWheelMultiplier.toFixed(2)}x`
                              : `Dare #${currentSegment.id + 1} · ${aviatorWheelMultiplier.toFixed(2)}x Boost`}
                          </span>
                          <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                            {isSpinning && isAviatorBlindMode ? 'Locking Secret Dare...' : currentSegment.title}
                          </h3>
                        </div>
                      </div>

                      {/* Intensity Rating */}
                      <div className="flex items-center gap-0.5" title={`Intensity: ${currentSegment.intensity}/5`}>
                        {Array.from({ length: 5 }).map((_, fIdx) => (
                          <span
                            key={fIdx}
                            className={`text-xs ${
                              fIdx < currentSegment.intensity ? 'opacity-100' : 'opacity-20 grayscale'
                            }`}
                          >
                            🌶️
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Healthy Intimacy Scientific Benefit */}
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-200 text-[11px] font-mono flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold uppercase text-[10px] text-emerald-300 block">
                          Healthy Connection Benefit:
                        </span>
                        <p className="text-[10.5px] leading-snug">{currentSegment.healthyBenefit}</p>
                      </div>
                    </div>

                    {/* Specific Challenge Prompt (Staggered Glass Reveal after 3D flip) */}
                    <motion.div
                      key={`prompt-reveal-${dareFlipKey}-${dareFlipStage}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: dareFlipStage === 'REVEALED' ? 0.18 : 0 }}
                      className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 backdrop-blur-md"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-cyan-300 uppercase font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />{' '}
                          {isVipOrPass ? `0-Repeat Activity #${(seenActivityIds.wheel?.length || 0) + 1}` : 'Subscription Preview'}:
                        </span>
                        <button
                          onClick={nextPromptVariation}
                          className="text-[11px] font-mono text-pink-300 hover:text-white flex items-center gap-1 cursor-pointer font-bold whitespace-nowrap"
                        >
                          <Shuffle className="w-3 h-3" /> Next Unseen
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-white font-medium leading-relaxed italic">
                        {!isVipOrPass
                          ? '"Subscribe with Google Pay ($1.00+) to unlock the 4×360° Aviator blind spin & zero-repeat dares."'
                          : isSpinning && isAviatorBlindMode
                          ? '"Turning 4 full 360° revolutions blindly — surprise dare reveals on lock!"'
                          : `"${currentPromptText}"`}
                      </p>
                    </motion.div>

                    {/* Interactive Countdown Timer */}
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-mono text-zinc-300">
                          Timer: <strong className="text-white text-sm font-mono tabular-nums">{timerSeconds}s</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (requiresPaidSubscription) {
                              openSubscriptionPaywall('4×360° Aviator Wheel Timer');
                              return;
                            }
                            setIsTimerRunning(!isTimerRunning);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-400 text-black font-extrabold text-xs shadow hover:scale-105 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          {isTimerRunning ? <Pause className="w-3 h-3 fill-black" /> : <Play className="w-3 h-3 fill-black" />}
                          <span>{isTimerRunning ? 'Pause' : 'Start Timer'}</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsTimerRunning(false);
                            setTimerSeconds(currentSegment.suggestedDurationSec);
                          }}
                          className="p-1.5 rounded-xl bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title="Reset Timer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action Completion */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <button
                      onClick={() => handleCompleteChallenge(aviatorWheelMultiplier)}
                      className="w-full py-3 min-h-[44px] rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-black font-black text-xs sm:text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {!isVipOrPass ? <Lock className="w-4 h-4" /> : <PartyPopper className="w-4 h-4 fill-black" />}
                      <span>
                        {isVipOrPass ? 'Complete Challenge' : 'Subscribe ($1.00+) to Play'}
                      </span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={spinPhysicalWheel}
                        disabled={isSpinning}
                        className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-pink-400" /> Spin
                      </button>
                      <button
                        onClick={nextPromptVariation}
                        className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                      >
                        <Shuffle className="w-3.5 h-3.5 text-cyan-400" /> Fresh Unseen
                      </button>
                    </div>
                  </div>
                </GlassCard>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODE 6: AVIATOR HEAT CRASH DARES (UNKNOWN CRASH ESCALATION)
          ============================================================= */}
      {activeGameTab === 'aviator_crash' && (
        <div className="space-y-4">
          {renderSubscriptionBanner(
            'BASIC MODE: Mild Aviator Warmup (1.5x Cap)',
            'Unknown Crash Trajectory · Heat & Nasty Escalation Locked to Subscription'
          )}

          {renderBasicLimitGate()}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Flight Radar & Trajectory Curve (Col 1-7) */}
            <GlassCard className="lg:col-span-7 p-5 border border-rose-500/40 bg-gradient-to-b from-[#1a0f1f] to-[#0f0a16] space-y-4 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-black text-white uppercase tracking-wider">
                    Aviator Heat Crash Trajectory
                  </span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-lg text-[10.5px] font-mono font-black border ${
                    crashFlightState === 'FLYING'
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200 animate-pulse'
                      : crashFlightState === 'LOCKED'
                      ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                      : crashFlightState === 'CRASHED'
                      ? 'bg-rose-500/20 border-rose-400/50 text-rose-200'
                      : 'bg-white/10 border-white/15 text-zinc-300'
                  }`}
                >
                  STATE: {crashFlightState}
                </span>
              </div>

              {/* Trajectory Chart Stage */}
              {(() => {
                const cap = Math.max(1.5, subProfile.multiplierCap);
                const normProgress = Math.min(1, Math.max(0.02, (crashMultiplier - 1) / (cap - 1)));
                const tipX = 24 + normProgress * 272;
                const tipY = 128 - Math.pow(normProgress, 0.85) * 98;
                const ctrlX = 24 + normProgress * 150;
                const ctrlY = 128 - normProgress * 18;
                const strokeColor =
                  crashFlightState === 'CRASHED'
                    ? '#f43f5e'
                    : crashFlightState === 'LOCKED'
                    ? '#22d3ee'
                    : '#f59e0b';

                return (
                  <div className="relative rounded-2xl bg-black/55 border border-white/10 p-4 overflow-hidden">
                    <div className="flex items-baseline justify-between gap-3 mb-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-zinc-400 block">
                          Live Escalation Multiplier
                        </span>
                        <span
                          className={`text-3xl sm:text-4xl font-black font-mono tabular-nums tracking-tight ${
                            crashFlightState === 'CRASHED'
                              ? 'text-rose-400'
                              : crashFlightState === 'LOCKED'
                              ? 'text-cyan-300'
                              : 'text-amber-300'
                          }`}
                        >
                          {crashMultiplier.toFixed(2)}x
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono uppercase text-zinc-400 block">
                          Current Heat Tier
                        </span>
                        <strong className="text-xs sm:text-sm font-black text-pink-200">
                          {crashHeatLabel}
                        </strong>
                      </div>
                    </div>

                    <svg viewBox="0 0 320 150" className="w-full h-36 sm:h-44 overflow-visible">
                      <defs>
                        <linearGradient id="aviatorFillGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.38" />
                          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
                        </linearGradient>
                      </defs>

                      {/* Baseline grid lines */}
                      <line x1="20" y1="130" x2="302" y2="130" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
                      <line x1="20" y1="80" x2="302" y2="80" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                      <line x1="20" y1="30" x2="302" y2="30" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />

                      {/* Area Under Curve */}
                      <path
                        d={`M 24 128 Q ${ctrlX} ${ctrlY} ${tipX} ${tipY} L ${tipX} 130 L 24 130 Z`}
                        fill="url(#aviatorFillGrad)"
                      />

                      {/* Ascending Trajectory Curve */}
                      <path
                        d={`M 24 128 Q ${ctrlX} ${ctrlY} ${tipX} ${tipY}`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />

                      {/* Plane Marker at Tip */}
                      <circle cx={tipX} cy={tipY} r="7" fill={strokeColor} fillOpacity="0.28" />
                      <circle cx={tipX} cy={tipY} r="4" fill="#ffffff" stroke={strokeColor} strokeWidth="2" />
                    </svg>

                    <div className="flex items-center justify-between text-[10.5px] font-mono text-zinc-400 pt-1">
                      <span>Plan Max Ceiling: <strong className="text-white">{subProfile.maxHeatLabel}</strong></span>
                      <span className="tabular-nums">Max Boost: <strong className="text-amber-300">{cap.toFixed(1)}x</strong></span>
                    </div>
                  </div>
                );
              })()}

              {/* Launch / Lock Controls (Min 44px Touch Targets) */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                {crashFlightState === 'FLYING' ? (
                  <button
                    onClick={lockHeatDare}
                    className="w-full py-3.5 min-h-[44px] rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-teal-400 text-black font-mono font-black text-xs sm:text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer tabular-nums"
                  >
                    <Zap className="w-4 h-4 fill-black" />
                    <span>Lock Dare Now ({crashMultiplier.toFixed(2)}x · {crashHeatLabel})</span>
                  </button>
                ) : (
                  <button
                    onClick={startHeatFlight}
                    className="w-full py-3.5 min-h-[44px] rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white font-mono font-black text-xs sm:text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {!isVipOrPass ? <Lock className="w-4 h-4" /> : <Plane className="w-4 h-4" />}
                    <span>
                      {!isVipOrPass
                        ? 'Subscribe to Launch Aviator ($1.00+)'
                        : crashFlightState === 'READY'
                        ? 'Launch Heat Flight (Unknown Crash Point)'
                        : 'Fly Next Zero-Repeat Round'}
                    </span>
                  </button>
                )}
              </div>
            </GlassCard>

            {/* Aviator Outcome & Subscription Heat Ladder (Col 8-12) */}
            <GlassCard className="lg:col-span-5 p-5 border border-amber-400/40 bg-gradient-to-b from-[#171225] to-[#0e0b18] flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="border-b border-white/10 pb-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold block">
                    Secret Crash Lock Outcome
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {crashResultDare ? crashResultDare.title : 'Ready for Unknown Takeoff'}
                  </h3>
                </div>

                {crashResultDare ? (
                  <div className="space-y-3">
                    <div
                      className={`p-4 rounded-2xl border space-y-2 ${
                        crashResultDare.wasCrashPenalty
                          ? 'bg-rose-500/15 border-rose-400/45'
                          : 'bg-cyan-500/15 border-cyan-400/45'
                      }`}
                    >
                      <span className="text-[10.5px] font-mono font-black uppercase text-amber-200 block">
                        {crashResultDare.vybeLabel} · {crashResultDare.wonMultiplier.toFixed(2)}x Multiplier
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-white leading-relaxed italic">
                        &quot;{crashResultDare.text}&quot;
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-200 text-[11px] font-mono">
                      <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-emerald-400" />
                      {crashResultDare.benefit}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-zinc-300 space-y-2 leading-relaxed">
                    <p>
                      Tap <strong className="text-white">Launch Heat Flight</strong> and watch the plane climb unknowably from{' '}
                      <strong className="text-emerald-300">Mild</strong> through <strong className="text-rose-300">{subProfile.maxHeatLabel}</strong>.
                    </p>
                    <p>
                      Hit <strong className="text-cyan-300">Lock Dare Now</strong> before the hidden crash point to lock your chosen multiplier—or get caught by a surprise crash penalty dare! Zero repeats guaranteed on paid plans.
                    </p>
                  </div>
                )}
              </div>

              {crashResultDare && (
                <button
                  onClick={() => handleCompleteChallenge(crashResultDare.wonMultiplier)}
                  className="w-full py-3 min-h-[44px] rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-black text-xs sm:text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer tabular-nums"
                >
                  <PartyPopper className="w-4 h-4 fill-black" />
                  <span>Complete Aviator Dare</span>
                </button>
              )}
            </GlassCard>
          </div>
        </div>
      )}

      {/* =============================================================
          MODE 2: ENDLESS TRUTH, DARE & DESIRE CARDS DECK
          ============================================================= */}
      {activeGameTab === 'cards' && (
        <div className="space-y-4">
          {renderSubscriptionBanner(
            'BASIC MODE (FREE): 5-Card Repeating Mild Sample Deck',
            'All 6 Spicy Deck Tiers Unlocked 24/7 • No 2-Hour Cooldown • Endless Truth, Dare & Desire Cards'
          )}

          {renderBasicLimitGate()}

          {renderSpicyVybeTierBar('Card Deck Spicy Vybe Level')}

          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-mono">
            <span className="text-zinc-400 font-bold flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-pink-400" /> Card Deck Category:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => {
                  if (requiresPaidSubscription) {
                    openSubscriptionPaywall('Endless Truth & Dare Cards');
                    return;
                  }
                  setCardDeckIntensity('all');
                }}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                  cardDeckIntensity === 'all' && isVipOrPass
                    ? 'bg-purple-500 text-white font-extrabold shadow-md'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                {isVipOrPass ? `All Cards (${filteredCards.length})` : '🔒 All Cards (Paid)'}
              </button>
              <button
                onClick={() => {
                  if (!isVipOrPass) {
                    openSubscriptionPaywall('Spicy Truth & Dare Cards');
                    return;
                  }
                  setCardDeckIntensity('spicy');
                }}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                  cardDeckIntensity === 'spicy' && isVipOrPass
                    ? 'bg-rose-500 text-white font-extrabold shadow-md'
                    : !isVipOrPass
                    ? 'bg-black/40 border border-white/10 text-zinc-400 hover:border-amber-400/50 hover:text-amber-300'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                {!isVipOrPass && <Lock className="w-3 h-3 text-amber-400" />}
                <span>🌶️ Very Naughty & Healthy</span>
              </button>
              <button
                onClick={() => {
                  if (requiresPaidSubscription) {
                    openSubscriptionPaywall('Golden Soulmates Cards');
                    return;
                  }
                  setCardDeckIntensity('golden');
                }}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                  cardDeckIntensity === 'golden' && isVipOrPass
                    ? 'bg-amber-400 text-black font-extrabold shadow-md'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                {!isVipOrPass && <Lock className="w-3 h-3 text-amber-400" />}
                <span>💃 Golden Soulmates (50+)</span>
              </button>
            </div>
          </div>

          <div className="max-w-xl mx-auto">
            {activeCustomDare && isVipOrPass && (
              <div className="mb-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 to-pink-500/20 border border-amber-400/50 flex items-center justify-between gap-2 text-xs">
                <div className="text-left">
                  <span className="text-[10px] font-mono uppercase text-amber-300 font-bold block">
                    ⚡ Active VIP Bonus Dare ({activeCustomDare.from}):
                  </span>
                  <p className="text-white font-bold">&quot;{activeCustomDare.text}&quot;</p>
                </div>
                <button
                  onClick={() => setActiveCustomDare(null)}
                  className="text-zinc-400 hover:text-white text-xs font-bold px-2 py-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={activeCard.id}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.96 }}
                transition={{ duration: 0.25 }}
              >
                <GlassCard className="p-6 sm:p-8 border border-purple-500/40 relative overflow-hidden space-y-6 text-center shadow-2xl bg-gradient-to-b from-[#1b1733] to-[#120f24]">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-purple-300 text-xs font-mono font-bold flex items-center gap-1">
                      <span>{activeCard.icon}</span> {activeCard.category}
                    </span>
                    <div className="flex items-center gap-2">
                      {!isVipOrPass && (
                        <span className="text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3" /> PAID SUBSCRIPTION REQUIRED
                        </span>
                      )}
                      {isVipOrPass && (
                        <span className="text-xs text-amber-300 font-mono font-bold">
                          {subProfile.tierLabel.split(' ')[0]} Endless Deck
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 py-4">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-300 font-bold block">
                      Target: {activeCard.forWhom}
                    </span>
                    <p className="text-base sm:text-xl font-bold text-white leading-relaxed">
                      {isVipOrPass
                        ? `"${activeCard.cardPrompt}"`
                        : '"Subscribe with Google Pay ($1.00+) to draw & reveal zero-repeat Truth, Dare & Midnight Desire cards."'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      onClick={handlePrevCard}
                      className="p-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
                      title="Previous Card"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleCompleteChallenge()}
                      className="px-6 py-3 min-h-[44px] rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-extrabold text-xs sm:text-sm shadow-xl hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      {!isVipOrPass ? <Lock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>{isVipOrPass ? 'Completed' : 'Subscribe to Play Cards ($1.00+)'}</span>
                    </button>
                    <button
                      onClick={handleNextCard}
                      className="p-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
                      title="Next Card"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleShuffleDeck}
                      className="p-3 rounded-2xl bg-white/5 border border-white/10 text-amber-300 hover:text-white transition-all cursor-pointer"
                      title="Shuffle Random Card"
                    >
                      <Shuffle className="w-5 h-5" />
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* =============================================================
          MODE 2.5: VIRAL TIKTOK & REELS COUPLES CHALLENGES & PUT A FINGER DOWN
          ============================================================= */}
      {activeGameTab === 'social_viral' && (
        <div className="space-y-4 max-w-2xl mx-auto">
          {renderSubscriptionBanner(
            'PAID SUBSCRIPTION REQUIRED FOR VIRAL QUESTS',
            'All 6 Spicy Viral Tiers + AI Challenge Generator Unlocked 24/7 • Endless Zero-Repeat Loop'
          )}

          {renderBasicLimitGate()}

          {renderSpicyVybeTierBar('Viral Challenge Spicy Vybe Level')}

          {/* Sub-mode Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-mono">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setViralSubTab('challenges')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viralSubTab === 'challenges'
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md'
                    : 'bg-white/5 text-zinc-300 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> 🔥 Trending TikTok Challenges
              </button>
              <button
                onClick={() => setViralSubTab('finger_down')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viralSubTab === 'finger_down'
                    ? 'bg-gradient-to-r from-pink-500 to-amber-500 text-white shadow-md'
                    : 'bg-white/5 text-zinc-300 hover:text-white'
                }`}
              >
                <span>🖐️</span> Put A Finger Down ({isVipOrPass ? '10 Fingers Unlocked' : '🔒 Paid Plan'})
              </button>
            </div>

            <button
              onClick={handleGenerateViralChallenge}
              disabled={isGeneratingViral}
              className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer ml-auto ${
                isVipOrPass
                  ? 'bg-gradient-to-r from-amber-400 via-pink-500 to-purple-500 text-white'
                  : 'bg-black/50 border border-amber-400/50 text-amber-300'
              }`}
            >
              {!isVipOrPass && <Lock className="w-3 h-3 text-amber-400" />}
              <Sparkles className={`w-3.5 h-3.5 ${isGeneratingViral ? 'animate-spin' : ''}`} />
              <span>{isGeneratingViral ? 'Generating...' : '✨ Generate Tastier Challenge'}</span>
            </button>
          </div>

          {/* Toast Notification */}
          {viralToast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs font-mono font-bold flex items-center justify-between"
            >
              <span>{viralToast}</span>
              <button onClick={() => setViralToast(null)} className="text-zinc-400 hover:text-white font-bold ml-2">
                ✕
              </button>
            </motion.div>
          )}

          {/* SUB-TAB A: VIRAL CHALLENGE CARDS */}
          {viralSubTab === 'challenges' && (
            (() => {
              const activeViral = activeViralPool[activeViralIndex % activeViralPool.length] || activeViralPool[0];
              return (
                <GlassCard className="p-6 sm:p-8 border border-pink-500/40 relative overflow-hidden space-y-6 shadow-2xl bg-gradient-to-b from-[#1f1224] via-[#160d1a] to-[#0d0710]">
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                      <span className="text-pink-300 font-bold flex items-center gap-1">
                        <Video className="w-3.5 h-3.5 text-pink-400" /> {activeViral.platform}
                      </span>
                      <span className="text-zinc-500" aria-hidden="true">·</span>
                      <span className="text-amber-300 font-bold">
                        {activeViral.vibe}
                      </span>
                      {!isVipOrPass && (
                        <>
                          <span className="text-zinc-500" aria-hidden="true">·</span>
                          <span className="text-amber-300 text-[10px] font-bold flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Subscription Required
                          </span>
                        </>
                      )}
                    </div>

                    <span className="text-xs font-mono text-zinc-400 tabular-nums">
                      Challenge {(activeViralIndex % activeViralPool.length) + 1} of {activeViralPool.length}
                    </span>
                  </div>

                  {/* Title & Hashtags */}
                  <div className="space-y-2">
                    <span className="text-xs font-mono text-cyan-400 font-bold block">
                      {activeViral.hashtag}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                      {activeViral.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                      {isVipOrPass
                        ? activeViral.setup
                        : 'Subscribe via Google Pay ($1.00+) to unlock all trending viral TikTok & Reels challenges with zero repeats.'}
                    </p>
                  </div>

                  {/* Step-by-Step Rules Checklist */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 text-left">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-pink-300 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-pink-400" /> Challenge Rules & Gameplay:
                    </span>
                    <ul className="space-y-1.5 text-xs text-zinc-200">
                      {activeViral.rules.map((rule, rIdx) => (
                        <li key={rIdx} className="flex items-start gap-2">
                          <span className="text-pink-400 font-mono font-bold">•</span>
                          <span>{isVipOrPass ? rule : 'Included upon subscription activation.'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Trending Sound / Vibe Audio Preview */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/15 to-pink-500/15 border border-purple-400/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-pink-500/30 border border-pink-400/50 flex items-center justify-center shrink-0">
                        <Volume2 className="w-4 h-4 text-pink-300" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono uppercase text-pink-300 font-bold block">
                          Trending Couple Audio
                        </span>
                        <p className="text-xs font-bold text-white truncate">
                          {activeViral.trendingSoundtrack}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (requiresPaidSubscription) {
                          openSubscriptionPaywall('Viral Social Quests Audio');
                          return;
                        }
                        playTrendingVibeBeat();
                      }}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isPlayingVibeBeat
                          ? 'bg-pink-500 text-white animate-pulse'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {!isVipOrPass ? (
                        <Lock className="w-3 h-3 text-amber-300" />
                      ) : isPlayingVibeBeat ? (
                        <Pause className="w-3 h-3" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      <span>{isPlayingVibeBeat ? 'Playing...' : isVipOrPass ? 'Preview Vibe' : 'Unlock Audio'}</span>
                    </button>
                  </div>

                  {/* Action Completion, Social Sharing & Next */}
                  <div className="space-y-2.5 pt-2 border-t border-white/10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        onClick={() => handleCompleteChallenge()}
                        className="py-3 min-h-[44px] px-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-black font-black text-xs sm:text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {!isVipOrPass ? <Lock className="w-4 h-4" /> : <PartyPopper className="w-4 h-4 fill-black" />}
                        <span>
                          {isVipOrPass ? 'Complete Challenge' : 'Subscribe to Play ($1.00+)'}
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          if (requiresPaidSubscription) {
                            openSubscriptionPaywall('Viral Social Quests');
                            return;
                          }
                          const text = `🔥 We just crushed the "${activeViral.title}" on Twogether! ${activeViral.hashtag}`;
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(text);
                          }
                          setViralToast('📸 Caption copied! Ready to post on Twogether Feed or Reels & Stories.');
                          playWinChime();
                        }}
                        className="py-3 min-h-[44px] px-4 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black text-xs sm:text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" /> Post / Share to Feed
                      </button>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-2">
                      <button
                        onClick={() => {
                          if (requiresPaidSubscription) {
                            openSubscriptionPaywall('Viral Social Quests');
                            return;
                          }
                          setActiveViralIndex((prev) => (prev > 0 ? prev - 1 : activeViralPool.length - 1));
                        }}
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" /> Previous
                      </button>

                      <button
                        onClick={() => {
                          if (requiresPaidSubscription) {
                            openSubscriptionPaywall('Viral Social Quests');
                            return;
                          }
                          advanceViralNonRepeating('random');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Shuffle className="w-3.5 h-3.5" /> Unseen Shuffle
                      </button>

                      <button
                        onClick={() => {
                          if (requiresPaidSubscription) {
                            openSubscriptionPaywall('Viral Social Quests');
                            return;
                          }
                          advanceViralNonRepeating('next');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>Next Unseen</span> <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              );
            })()
          )}

          {/* SUB-TAB B: PUT A FINGER DOWN (10 FINGERS INTERACTIVE) */}
          {viralSubTab === 'finger_down' && (
            <GlassCard className="p-6 sm:p-8 border border-amber-400/40 text-center space-y-6 shadow-2xl bg-gradient-to-b from-[#21151e] via-[#150d18] to-[#0c0610]">
              {/* Header */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-amber-300 text-xs font-mono font-bold">
                  <span>🖐️</span> Viral Social Game · Put A Finger Down
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">Couples Confession Edition</h3>
                <p className="text-xs text-zinc-300 max-w-md mx-auto">
                  Hold 10 fingers up with your partner. Listen to the prompt and tap a finger to put it down if it applies to you!
                </p>
              </div>

              {/* 10 Fingers Interactive Graphic */}
              <div className="p-4 rounded-3xl bg-black/40 border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400">Left Hand (Alex)</span>
                  <span className="font-bold text-amber-300 tabular-nums">
                    Fingers Standing: {fingersUp.filter(Boolean).length} / 10
                  </span>
                  <span className="text-zinc-400">Right Hand (Aria)</span>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {fingersUp.map((isUp, fIdx) => (
                    <button
                      key={fIdx}
                      onClick={() => handleToggleFinger(fIdx)}
                      className={`h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        isUp
                          ? 'bg-gradient-to-b from-amber-400/20 to-pink-500/20 border-amber-400 text-white shadow-lg shadow-amber-500/20 scale-100'
                          : 'bg-black/60 border-zinc-700/50 text-zinc-600 scale-95 opacity-50'
                      }`}
                      title={isUp ? 'Click to put down' : 'Click to raise back up'}
                    >
                      <span className="text-2xl">{isUp ? '☝️' : '✊'}</span>
                      <span className="text-[10px] font-mono font-bold">
                        #{fIdx + 1}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-zinc-400 font-mono">
                  {isVipOrPass
                    ? 'Tap any finger above to raise or lower it.'
                    : 'Subscription required ($1.00+) to play interactive fingers & confession rounds.'}
                </p>
              </div>

              {/* Active Viral Prompt */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-amber-500/10 border border-pink-400/30 text-center space-y-2">
                <span className="text-[11px] font-mono uppercase text-pink-400 font-bold block tabular-nums">
                  {isVipOrPass
                    ? `Question #${(fingerQuestionIdx % visibleFingerQuestions.length) + 1} of ${visibleFingerQuestions.length} (All 10 VIP Unlocked):`
                    : 'Paid Subscription Required:'}
                </span>
                <p className="text-base sm:text-lg font-bold text-white leading-relaxed">
                  {isVipOrPass
                    ? `"${visibleFingerQuestions[fingerQuestionIdx % visibleFingerQuestions.length]}"`
                    : '"Subscribe with Google Pay ($1.00+) to unlock all Put A Finger Down confession rounds."'}
                </p>
              </div>

              {/* Dynamic Chemistry Rating */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-mono text-zinc-300">
                {fingersUp.filter(Boolean).length >= 8 && (
                  <span className="text-cyan-300 font-bold">
                    😇 8–10 Fingers Up: Gentle Honeymoon Bliss!
                  </span>
                )}
                {fingersUp.filter(Boolean).length >= 4 && fingersUp.filter(Boolean).length < 8 && (
                  <span className="text-amber-300 font-bold">
                    🔥 4–7 Fingers Up: High Chemistry & Seductive Dynamic!
                  </span>
                )}
                {fingersUp.filter(Boolean).length < 4 && (
                  <span className="text-rose-400 font-bold">
                    🫦 Under 4 Fingers: Obsessively In Love, Dangerous Chemistry & Unhinged Passion!
                  </span>
                )}
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => {
                    if (requiresPaidSubscription) {
                      openSubscriptionPaywall('Put A Finger Down');
                      return;
                    }
                    const firstUp = fingersUp.findIndex((f) => f);
                    if (firstUp !== -1) {
                      handleToggleFinger(firstUp);
                    }
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] rounded-xl bg-pink-500 text-white font-extrabold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {!isVipOrPass && <Lock className="w-3.5 h-3.5" />}
                  <span>Put 1 Finger Down ✊</span>
                </button>

                <button
                  onClick={handleNextFingerQuestion}
                  className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] rounded-xl bg-amber-400 text-black font-extrabold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Next Question</span> <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleResetFingers}
                  className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl bg-white/10 text-zinc-300 hover:text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset (10 Up)
                </button>
              </div>

              {/* Complete Reward */}
              <button
                onClick={() => handleCompleteChallenge()}
                className="w-full py-3 min-h-[44px] rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-black text-xs sm:text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {!isVipOrPass ? <Lock className="w-4 h-4" /> : <PartyPopper className="w-4 h-4 fill-black" />}
                <span>
                  {isVipOrPass
                    ? 'Complete Put A Finger Down'
                    : 'Subscribe ($1.00+) to Play Put A Finger Down'}
                </span>
              </button>
            </GlassCard>
          )}
        </div>
      )}

      {activeGameTab === 'dice' && (
        <div className="space-y-4">
          {renderSubscriptionBanner(
            'PAID SUBSCRIPTION REQUIRED FOR CRAVING DICE',
            'All 6 Spicy Craving Dice Pools Unlocked 24/7 • No Cooldown • Zero-Repeat Rolls'
          )}

          {renderBasicLimitGate()}

          {renderSpicyVybeTierBar('Craving Dice Spicy Vybe Level')}

          <GlassCard className="p-6 sm:p-8 border border-amber-400/40 text-center space-y-6 max-w-xl mx-auto bg-gradient-to-b from-[#1c1825] to-[#120f1c]">
            <div>
              <div className="inline-flex items-center gap-1.5 text-amber-300 text-xs font-mono font-bold mb-2">
                {isVipOrPass ? <Dices className="w-4 h-4 text-amber-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
                <span>{isVipOrPass ? 'Endless Naughty Dice Generator' : 'Craving Dice · Paid Subscription Only'}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">Roll for Passion & Action</h3>
              <p className="text-xs text-zinc-300 max-w-md mx-auto">
                {isVipOrPass
                  ? 'Roll the twin passion dice to generate hundreds of spicy, hot & extremely hot action + location pairings.'
                  : 'Subscribe via Google Pay ($1.00+) to roll twin Craving Dice scaled to your chosen heat plan.'}
              </p>
            </div>

            {/* Dice Visualizer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
              {/* Die 1: Action */}
              <div
                className={`p-5 rounded-3xl bg-gradient-to-br from-pink-600/30 via-purple-600/20 to-black border-2 border-pink-400/50 shadow-2xl flex flex-col items-center justify-center gap-2 ${
                  isRollingDice ? 'animate-bounce' : ''
                }`}
              >
                <span className="text-[10px] font-mono uppercase text-pink-300 font-extrabold tracking-wider">
                  🎲 Die 1: Sensual Action
                </span>
                <span className="text-lg sm:text-xl font-black text-white font-sans">
                  {isVipOrPass ? diceAction : '🔒 Paid Plan'}
                </span>
              </div>

              {/* Die 2: Target Location */}
              <div
                className={`p-5 rounded-3xl bg-gradient-to-br from-amber-600/30 via-orange-600/20 to-black border-2 border-amber-400/50 shadow-2xl flex flex-col items-center justify-center gap-2 ${
                  isRollingDice ? 'animate-bounce' : ''
                }`}
              >
                <span className="text-[10px] font-mono uppercase text-amber-300 font-extrabold tracking-wider">
                  🎯 Die 2: Intimate Location
                </span>
                <span className="text-lg sm:text-xl font-black text-white font-sans">
                  {isVipOrPass ? diceLocation : '🔒 Google Pay'}
                </span>
              </div>
            </div>

            {/* Prompt Synthesis */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-zinc-200">
              {isVipOrPass ? (
                <>
                  Current Command: Deliver a <strong className="text-pink-400">{diceAction}</strong> directly on partner’s{' '}
                  <strong className="text-amber-400">{diceLocation}</strong>!
                </>
              ) : (
                <span>Subscribe ($1.00+) to roll and reveal interactive twin Craving Dice commands.</span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={rollNaughtyDice}
                disabled={isRollingDice}
                className="w-full sm:w-auto px-8 py-3 min-h-[44px] rounded-2xl font-black text-xs sm:text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-amber-400 via-yellow-400 to-pink-500 text-black"
              >
                {!isVipOrPass ? <Lock className="w-4 h-4" /> : <Dices className={`w-4 h-4 ${isRollingDice ? 'animate-spin' : ''}`} />}
                <span>
                  {!isVipOrPass
                    ? 'Subscribe to Roll Dice ($1.00+)'
                    : isRollingDice
                    ? 'Rolling Dice...'
                    : `Roll Craving Dice (Roll #${diceRollCount})`}
                </span>
              </button>
              <button
                onClick={() => handleCompleteChallenge()}
                className="w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-xs hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {!isVipOrPass ? <Lock className="w-4 h-4" /> : <PartyPopper className="w-4 h-4" />}
                <span>{isVipOrPass ? 'Complete' : 'Locked'}</span>
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* =============================================================
          MODE 4: WHO KNOWS ME BEST ENDLESS QUIZ
          ============================================================= */}
      {activeGameTab === 'quiz' && (
        <div className="space-y-4">
          {renderSubscriptionBanner(
            'PAID SUBSCRIPTION REQUIRED FOR COMPATIBILITY QUIZ',
            'All 6 Spicy Intimacy Quiz Levels Unlocked 24/7 • No Cooldown • Endless Rounds'
          )}

          {renderBasicLimitGate()}

          {renderSpicyVybeTierBar('Quiz Spicy Intimacy Level')}

          <GlassCard className="p-6 sm:p-8 border border-cyan-400/40 text-left space-y-5 max-w-xl mx-auto bg-gradient-to-b from-[#161c2e] to-[#0f1422]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest block">
                  {isVipOrPass ? 'Endless Couples Spicy Intimacy Quiz' : 'Couples Intimacy Quiz · Paid Plan Required'}
                </span>
                <h3 className="text-lg font-black text-white">Who Knows Me Best?</h3>
              </div>
              <div className="flex items-center gap-2">
                {!isVipOrPass && (
                  <span className="text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Paid Plan
                  </span>
                )}
                <span className="text-xs font-mono text-zinc-400 tabular-nums">
                  Round {(quizQuestionIndex % activeQuizPool.length) + 1} / {activeQuizPool.length}
                </span>
              </div>
            </div>

            <h4 className="text-sm sm:text-base font-bold text-white">
              {isVipOrPass
                ? currentQuiz.q
                : 'Subscribe with Google Pay ($1.00+) to unlock all endless intimacy quiz questions.'}
            </h4>

            <div className="space-y-2">
              {currentQuiz.options.map((opt, oIdx) => {
                const isSelected = isVipOrPass && quizSelectedAnswer === oIdx;
                return (
                  <button
                    key={oIdx}
                    onClick={() => {
                      if (requiresPaidSubscription) {
                        openSubscriptionPaywall('Who Knows Me Best Quiz');
                        return;
                      }
                      setQuizSelectedAnswer(oIdx);
                      playWinChime();
                    }}
                    className={`w-full p-3 rounded-2xl border text-xs sm:text-sm font-semibold text-left transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                        : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:border-cyan-400/30'
                    }`}
                  >
                    <span>{isVipOrPass ? opt : `🔒 Answer Option ${oIdx + 1} — Subscribe to Unlock`}</span>
                    {!isVipOrPass ? (
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {isVipOrPass && quizSelectedAnswer !== null && (
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-xs text-cyan-200 font-mono">
                💡 Intimacy Insight: {currentQuiz.expl}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
              {!isVipOrPass && onOpenUpgradeModal && (
                <button
                  onClick={() => openSubscriptionPaywall('Who Knows Me Best Quiz')}
                  className="text-[11px] font-mono text-amber-300 hover:text-amber-200 font-bold underline cursor-pointer"
                >
                  👑 Subscribe ($1.00+) to Unlock Quiz
                </button>
              )}

              <button
                onClick={() => {
                  if (requiresPaidSubscription) {
                    openSubscriptionPaywall('Who Knows Me Best Quiz');
                    return;
                  }
                  if (quizSelectedAnswer !== null) {
                    handleCompleteChallenge();
                  }
                  advanceQuizNonRepeating();
                }}
                className="px-5 py-2.5 min-h-[44px] rounded-xl bg-cyan-400 text-black font-extrabold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
              >
                {!isVipOrPass && <Lock className="w-3.5 h-3.5" />}
                <span>{isVipOrPass ? 'Next Unseen Question' : 'Subscribe to Play ($1.00+)'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* =============================================================
          MODAL 1: VIP AI NAUGHTY & SPICY VYBE GENERATOR
          ============================================================= */}
      <AnimatePresence>
        {showAiSpicyGenerator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#20152a] to-[#120b18] border-2 border-pink-500/50 p-6 space-y-5 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-amber-400 text-black flex items-center justify-center font-black">
                    <Sparkles className="w-4 h-4 fill-black" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">⚡ AI Spicy Vybe Generator</h3>
                    <p className="text-[10px] text-zinc-400 font-mono">Instant spontaneous challenges crafted for your exact heat level</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAiSpicyGenerator(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Heat Level Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-zinc-300 font-bold block">
                  Select Intensity / Heat Level:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {(['spicy', 'more_spicy', 'most_spicy', 'hot', 'extra_hot', 'extremely_hot'] as SpicyVybeLevel[]).map((level) => {
                    const tierMeta = SPICY_VYBE_TIERS.find((t) => t.id === level);
                    const isSelected = aiGeneratorHeat === level;
                    return (
                      <button
                        key={level}
                        onClick={() => {
                          setAiGeneratorHeat(level);
                          playMechanicalTick(30);
                        }}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'bg-gradient-to-b from-pink-500 to-rose-600 border-white text-white font-black shadow-lg scale-102'
                            : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <span className="text-sm">{tierMeta?.icon}</span>
                        <span className="text-[10px] font-bold truncate w-full">{tierMeta?.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Generated Prompt Output Card */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 min-h-[90px] flex items-center justify-center text-center">
                {isGeneratingAiPrompt ? (
                  <div className="flex items-center gap-2 text-pink-300 font-mono text-xs animate-pulse">
                    <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Synthesizing spontaneous provocative challenge...</span>
                  </div>
                ) : generatedAiPrompt ? (
                  <p className="text-sm sm:text-base font-bold text-white leading-relaxed italic">
                    &quot;{generatedAiPrompt}&quot;
                  </p>
                ) : (
                  <p className="text-xs text-zinc-400 font-mono">
                    Pick your desired heat level and tap generate below!
                  </p>
                )}
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                <button
                  onClick={() => {
                    setIsGeneratingAiPrompt(true);
                    playMechanicalTick(50);
                    setTimeout(() => {
                      const AI_LIBRARY: Record<SpicyVybeLevel, string[]> = {
                        all: ['Whisper your dirtiest physical secret while tracing partner’s collarbone.'],
                        mild: ['Trace a gentle cheek kiss and reveal what first made you blush when meeting.'],
                        spicy: [
                          'Trace your lips 1 millimeter along partner’s neckline without kissing for 30s, exhaling slow warm breaths.',
                          'Whisper three things that make you weak in the knees whenever you watch your partner get ready.',
                          'Pull partner into your lap, wrap your arms around their waist, and whisper a secret desire you have kept hidden today.',
                        ],
                        more_spicy: [
                          'Hold an ice cube in your mouth for 10 seconds, then place a slow cooling kiss on partner’s collarbone followed by warm lips.',
                          'Blindfold your partner and feed them fruit or chocolate using only your lips and teeth — zero hands allowed.',
                          'Trace featherlight fingernail circles around partner’s navel, pausing just above the waistband for 45 seconds.',
                        ],
                        most_spicy: [
                          'Perform a 45-second slow living-room lap seduction sway to a sensual lo-fi rhythm with zero talking and deep eye contact.',
                          'Remove one article of partner’s clothing or accessories using only your teeth, or confess your single naughtiest fantasy.',
                          'Command your partner to freeze completely for 45 seconds while you deliver slow teasing kisses anywhere you choose.',
                        ],
                        hot: [
                          'Commit to a shared candlelit warm shower wash together tonight, tracing slow water droplets down each other’s backs.',
                          'Warm scented massage oil in your palms and give partner a slow, firm lower back and hip massage with circular pressure.',
                          'Press partner against the door or headboard, look into their eyes for 30s, and whisper the exact scenario you want tonight.',
                        ],
                        extra_hot: [
                          'Slowly unbutton partner’s shirt or waistband with your teeth while maintaining intense unbroken eye contact.',
                          '60-second unbroken stare while breathing in sync, followed by an unfiltered sensual whisper and a lingering lower-lip bite.',
                          '10-Second Craving Command: one partner gives an irresistible physical command — the other playfully complies right now!',
                        ],
                        extremely_hot: [
                          'Strangers Roleplay: Pretend you just met at a private midnight lounge. Seduce partner within 60 seconds using alluring alter-egos.',
                          'Unfiltered Bedroom Confession: Reveal in complete sensory detail what you want partner to do to you once the lights go out tonight.',
                          'A 90-second breathless French kiss with fingers tangled in partner’s hair, pulling hips tight in sync with deep passionate rhythm.',
                        ],
                      };
                      const pool = AI_LIBRARY[aiGeneratorHeat] || AI_LIBRARY['hot'];
                      const pick = pool[Math.floor(Math.random() * pool.length)];
                      setGeneratedAiPrompt(pick);
                      setIsGeneratingAiPrompt(false);
                      playWinChime();
                      try {
                        confetti({
                          particleCount: 50,
                          spread: 70,
                          origin: { y: 0.5 },
                          colors: ['#ec4899', '#fbbf24', '#f43f5e'],
                        });
                      } catch {}
                    }, 350);
                  }}
                  disabled={isGeneratingAiPrompt}
                  className="w-full sm:flex-1 py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white font-mono font-black text-xs shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGeneratingAiPrompt ? 'Generating...' : '⚡ Generate Spontaneous Vybe'}</span>
                </button>

                {generatedAiPrompt && (
                  <button
                    onClick={() => {
                      setActiveCustomDare({
                        text: generatedAiPrompt,
                        from: '⚡ AI Naughty Generator',
                        duration: 60,
                      });
                      setTimerSeconds(60);
                      setIsTimerRunning(false);
                      setShowAiSpicyGenerator(false);
                      playWinChime();
                    }}
                    className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-emerald-500 text-black font-mono font-black text-xs shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Play as Main Challenge</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =============================================================
          MODAL 2: CUSTOM PARTNER DARE / COMMAND BOX
          ============================================================= */}
      <AnimatePresence>
        {showCustomDareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#1b1733] to-[#100d20] border-2 border-purple-500/50 p-6 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-500 text-white flex items-center justify-center font-black">
                    <span>✍️</span>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Create Custom Partner Secret Dare</h3>
                    <p className="text-[10px] text-zinc-400 font-mono">Send a custom intimate command directly to your partner</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCustomDareModal(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Quick Template Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-zinc-400 block">Popular Quick Dares:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Bite my lower lip gently for 15s',
                    'Whisper your single darkest craving',
                    'Sensual slow neck massage with warm breath',
                    'Blindfold me and deliver 3 mystery touches',
                    'Slow lap dance for 45s without breaking eye contact',
                  ].map((chip, cIdx) => (
                    <button
                      key={cIdx}
                      onClick={() => setCustomDareText(chip)}
                      className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Dare Input */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-zinc-300 font-bold block">
                  Write Your Secret Command:
                </label>
                <textarea
                  value={customDareText}
                  onChange={(e) => setCustomDareText(e.target.value)}
                  placeholder="e.g. Come sit in my lap, unbutton my top button, and whisper what we are going to do tonight..."
                  rows={3}
                  className="w-full p-3 rounded-2xl bg-black/50 border border-white/15 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Duration Selector */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400 font-bold">Suggested Duration:</span>
                <div className="flex items-center gap-1.5">
                  {[30, 45, 60, 90, 120].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => setCustomDareDuration(sec)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                        customDareDuration === sec
                          ? 'bg-pink-500 text-white font-extrabold shadow'
                          : 'bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {dareSafetyError && (
                <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs font-medium">
                  🛡️ {dareSafetyError}
                </div>
              )}

              {/* Send Button */}
              <button
                onClick={async () => {
                  const trimmed = customDareText.trim();
                  if (!trimmed || isCheckingCustomDare) return;
                  setDareSafetyError(null);
                  setIsCheckingCustomDare(true);
                  const inspection = await inspectUserAction({
                    userId: currentUserId || 'usr_verified_1',
                    userName: currentUserName || currentTurnPlayer,
                    userEmail: currentUserEmail,
                    actionType: 'game_dare',
                    text: trimmed,
                  });
                  setIsCheckingCustomDare(false);

                  if (inspection.isViolating) {
                    setDareSafetyError(
                      inspection.reason || 'Blocked by AI Guardian: Keep dares safe, respectful, and good-vybes only.'
                    );
                    if (onReportViolation) {
                      onReportViolation({
                        type: 'message',
                        reason: inspection.reason,
                        snippet: trimmed,
                      });
                    }
                    return;
                  }

                  setActiveCustomDare({
                    text: trimmed,
                    from: currentTurnPlayer,
                    duration: customDareDuration,
                  });
                  setTimerSeconds(customDareDuration);
                  setIsTimerRunning(false);
                  setShowCustomDareModal(false);
                  setCustomDareText('');
                  playWinChime();
                  try {
                    confetti({
                      particleCount: 50,
                      spread: 70,
                      origin: { y: 0.6 },
                      colors: ['#a855f7', '#ec4899', '#fbbf24'],
                    });
                  } catch {}
                }}
                disabled={!customDareText.trim() || isCheckingCustomDare}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 text-white font-mono font-black text-xs sm:text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>
                  {isCheckingCustomDare
                    ? '🛡️ AI Guardian Reviewing Command...'
                    : '🚀 Send Command Dare'}
                </span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =============================================================
          MODAL 3: VIP PREVIEW SPECTRUM DRAWER
          ============================================================= */}
      <AnimatePresence>
        {showVipPreviewDrawer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-gradient-to-b from-[#1c1228] to-[#0c0812] border-2 border-amber-400/50 p-6 space-y-5 shadow-2xl relative text-left"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <Crown className="w-6 h-6 text-amber-400" />
                  <div>
                    <h3 className="text-lg font-black text-white">Paid Subscription Spectrum</h3>
                    <p className="text-xs text-zinc-400 font-mono">Compare Unsubscribed Lock vs Paid Plans ($1.00 – $99.50)</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVipPreviewDrawer(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Comparison Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Free Unsubscribed Card */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-amber-400" /> Unsubscribed Tier
                    </span>
                    <span className="text-[10px] text-rose-300 font-mono font-bold">Games Locked</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-zinc-300 font-sans">
                    <li className="flex items-start gap-1.5 text-rose-300">
                      <span>✕</span> All Couples &amp; Singles games require a paid plan
                    </li>
                    <li className="flex items-start gap-1.5 text-zinc-400">
                      <span>✕</span> Wheel, Aviator Crash &amp; Cards locked
                    </li>
                    <li className="flex items-start gap-1.5 text-zinc-400">
                      <span>✕</span> Viral Quests, Craving Dice &amp; Quizzes locked
                    </li>
                    <li className="flex items-start gap-1.5 text-zinc-400">
                      <span>✕</span> No custom dares or AI spicy generator
                    </li>
                  </ul>
                </div>

                {/* VIP Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-500/20 via-pink-500/20 to-purple-500/10 border-2 border-amber-400/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-300">👑 Paid Subscription</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black font-black text-[10px]">
                      $1.00 – $99.50
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-white font-sans">
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">✓</span> <strong>All 8 Games Unlocked Endless 24/7</strong> (Zero repeats)
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">✓</span> <strong>4×360° Aviator Wheel</strong> &amp; <strong>Heat Crash</strong>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">✓</span> <strong>Truth &amp; Dare, Viral Quests, Dice &amp; Quizzes</strong>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">✓</span> <strong>⚡ AI Spicy Generator</strong> &amp; <strong>Custom Dares</strong>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">✓</span> <strong>Up to 12.0x Aviator Heat Boost</strong> scaled by plan
                    </li>
                  </ul>
                </div>
              </div>

              {/* All 6 Tiers Detailed Breakdown */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-zinc-300 block">The 6 Spicy Vybe Tiers:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {SPICY_VYBE_TIERS.filter((t) => t.id !== 'all').map((tier) => (
                    <div key={tier.id} className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-start gap-2">
                      <span className="text-xl">{tier.icon}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <strong className="text-white font-bold">{tier.label}</strong>
                          <span className={`text-[9px] font-mono font-bold px-1.5 rounded ${tier.isSubscriptionOnly ? 'bg-amber-400/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                            {tier.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-snug">{tier.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upgrade Trigger via Google Pay */}
              {onOpenUpgradeModal && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setShowVipPreviewDrawer(false);
                      onOpenUpgradeModal(
                        'Unlock Endless Spicy, More Spicy, Hot, Extra Hot & Extremely Hot Vybes Throughout via Google Pay ($1.00 / $14.50)!'
                      );
                    }}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-pink-500 text-black font-mono font-black text-xs sm:text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Crown className="w-4 h-4 fill-black" />
                    <span>Upgrade with Google Pay ($1.00 1-Day Pass or $14.50/mo) — Play Endless Throughout</span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
