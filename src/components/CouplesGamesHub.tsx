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
  Trophy,
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { GlassCard } from './GlassCard';
import { VerificationBadge } from './VerificationBadge';
import { appSoundService } from '../services/appSoundService';
import { inspectUserAction } from '../services/aiGuardianService';
import { socketService } from '../services/socket';

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

interface CouplesGamesHubProps {
  onOpenSharedBeats?: () => void;
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
    isSubscriptionOnly: false,
    badge: 'ALL',
    color: '#ec4899',
    gradient: 'from-pink-500 to-purple-600',
    description: 'Explore all available intimate game variations across the full spectrum',
  },
  {
    id: 'mild',
    label: 'Mild & Sweet Romance',
    shortLabel: 'Mild Vybe',
    icon: '🌸',
    isSubscriptionOnly: false,
    badge: 'BASIC FREE',
    color: '#10b981',
    gradient: 'from-emerald-500 to-teal-600',
    description: 'Gentle affection, soft hugs, nostalgic slow dance, forehead kisses (5-prompt loop, rests near 2h so next day brings more vybe)',
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
  rewardPoints: number;
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
    rewardPoints: 60,
    intensity: 'Spicy',
    vybeLevel: 'spicy',
  },
  {
    id: 2,
    category: 'Wild Dare',
    icon: '🔥',
    forWhom: 'Partner 2',
    cardPrompt: 'Slowly unbutton or unzip one article of partner’s clothing using only your teeth, maintaining eye contact.',
    rewardPoints: 85,
    intensity: 'Very Naughty & Healthy',
    vybeLevel: 'extra_hot',
  },
  {
    id: 3,
    category: 'Midnight Desire',
    icon: '💋',
    forWhom: 'Both Partners',
    cardPrompt: 'Whisper into partner’s ear the exact naughty scenario you want to unfold tonight once the lights go out.',
    rewardPoints: 90,
    intensity: 'Very Naughty & Healthy',
    vybeLevel: 'most_spicy',
  },
  {
    id: 4,
    category: 'Golden Nostalgia (50+)',
    icon: '💃',
    forWhom: 'Both Soulmates',
    cardPrompt: 'Put on a classic 70s soul record or 80s love ballad and slow dance cheek-to-cheek in the living room for one full song.',
    rewardPoints: 75,
    intensity: 'Mild',
    vybeLevel: 'mild',
  },
  {
    id: 5,
    category: 'Spicy Truth',
    icon: '🌶️',
    forWhom: 'Partner 2',
    cardPrompt: 'Have you ever had a naughty dream about me that made you wake up breathing heavily? Describe the opening scene.',
    rewardPoints: 70,
    intensity: 'Spicy',
    vybeLevel: 'spicy',
  },
  {
    id: 6,
    category: 'Wild Dare',
    icon: '🔥',
    forWhom: 'Partner 1',
    cardPrompt: 'Give your partner a 60-second sensual shoulder and collarbone kiss trail without using your hands to hold them.',
    rewardPoints: 80,
    intensity: 'Very Naughty & Healthy',
    vybeLevel: 'more_spicy',
  },
  {
    id: 7,
    category: 'Midnight Desire',
    icon: '💋',
    forWhom: 'Both Partners',
    cardPrompt: 'Confess one naughty bedroom boundary or fantasy you have secretly wanted to explore with me in a safe, loving atmosphere.',
    rewardPoints: 95,
    intensity: 'Very Naughty & Healthy',
    vybeLevel: 'extremely_hot',
  },
  {
    id: 8,
    category: 'Golden Nostalgia (50+)',
    icon: '💃',
    forWhom: 'Both Soulmates',
    cardPrompt: 'Dim all the lamps, light a single candle, and tell the story of the first time you realized physical attraction was turning into real soul love.',
    rewardPoints: 80,
    intensity: 'Mild',
    vybeLevel: 'mild',
  },
  {
    id: 9,
    category: 'Spicy Truth',
    icon: '🌶️',
    forWhom: 'Partner 1',
    cardPrompt: 'What kind of kiss from me makes you completely melt and lose all train of thought?',
    rewardPoints: 65,
    intensity: 'Spicy',
    vybeLevel: 'spicy',
  },
  {
    id: 10,
    category: 'Wild Dare',
    icon: '🔥',
    forWhom: 'Partner 2',
    cardPrompt: 'Trace your lips 1 millimeter away from partner’s lips for 30 seconds without actually letting your lips touch. Feel the electric heat.',
    rewardPoints: 85,
    intensity: 'Very Naughty & Healthy',
    vybeLevel: 'hot',
  },
  {
    id: 11,
    category: 'Midnight Desire',
    icon: '💋',
    forWhom: 'Both Partners',
    cardPrompt: 'Set a phone timer for 3 minutes. Take turns whispering one naughty thing you love about each other every 10 seconds.',
    rewardPoints: 90,
    intensity: 'Very Naughty & Healthy',
    vybeLevel: 'hot',
  },
  {
    id: 12,
    category: 'Golden Nostalgia (50+)',
    icon: '💃',
    forWhom: 'Both Soulmates',
    cardPrompt: 'Share a glass of wine or hot tea while seated so close your thighs are touching, tracing slow circles on each other’s hands.',
    rewardPoints: 70,
    intensity: 'Mild',
    vybeLevel: 'mild',
  },
  {
    id: 13,
    category: 'Wild Dare',
    icon: '🍑',
    forWhom: 'Partner 1',
    cardPrompt: 'Perform a slow 45-second lap seduction sway to a low-bpm Afrobeats or lo-fi rhythm with zero talking and deep eye lock.',
    rewardPoints: 95,
    intensity: 'Very Naughty & Healthy',
    vybeLevel: 'most_spicy',
  },
  {
    id: 14,
    category: 'Spicy Truth',
    icon: '🫦',
    forWhom: 'Partner 2',
    cardPrompt: 'Describe in exact sensory detail the last time looking at me across the room made your heart race with pure attraction.',
    rewardPoints: 85,
    intensity: 'Very Naughty & Healthy',
    vybeLevel: 'extra_hot',
  },
  {
    id: 15,
    category: 'Midnight Desire',
    icon: '💥',
    forWhom: 'Both Partners',
    cardPrompt: 'Play out an alter-ego fantasy: introduce yourselves as two strangers meeting in a luxury hotel lounge who cannot resist each other.',
    rewardPoints: 110,
    intensity: 'Very Naughty & Healthy',
    vybeLevel: 'extremely_hot',
  },
  {
    id: 16,
    category: 'Wild Dare',
    icon: '🔥',
    forWhom: 'Both Soulmates',
    cardPrompt: 'Alternate slow warm breaths and light fingertip chills down each other’s bare spines for 60 uninterrupted seconds.',
    rewardPoints: 80,
    intensity: 'Very Naughty & Healthy',
    vybeLevel: 'hot',
  },
  {
    id: 17,
    category: 'Golden Nostalgia (50+)',
    icon: '🌸',
    forWhom: 'Both Soulmates',
    cardPrompt: 'Hold both of your partner’s hands, look into their eyes for 30 seconds, and name three small habits they do that make you feel deeply cherished.',
    rewardPoints: 75,
    intensity: 'Mild',
    vybeLevel: 'mild',
  },
  {
    id: 18,
    category: 'Golden Nostalgia (50+)',
    icon: '💞',
    forWhom: 'Partner 1',
    cardPrompt: 'Place a warm lingering kiss on partner’s forehead and describe your happiest peaceful morning waking up next to them.',
    rewardPoints: 75,
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
  rewardPoints: number;
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
    rewardPoints: 75,
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
    rewardPoints: 75,
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
    rewardPoints: 75,
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
    rewardPoints: 75,
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
    rewardPoints: 75,
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
    rewardPoints: 150,
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
    rewardPoints: 150,
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
    rewardPoints: 150,
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
    rewardPoints: 150,
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
  onOpenUpgradeModal,
  currentUserId,
  currentUserName,
  currentUserEmail,
  onReportViolation,
  initialPartyRoomCode,
  initialCoupleRoomCode,
  initialCouplePlayMode,
}) => {
  // Navigation & Synergy Points
  const [activeGameTab, setActiveGameTab] = useState<'wheel' | 'cards' | 'social_viral' | 'dice' | 'quiz'>('wheel');
  const [synergyPoints, setSynergyPoints] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('twogether_synergy_pts');
      return saved ? Number(saved) : 1580;
    } catch {
      return 1580;
    }
  });

  // Sound Synth & Spin Interval Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const spinTickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (spinTickIntervalRef.current) {
        clearInterval(spinTickIntervalRef.current);
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Play mechanical ticking sound as wheel pegs pass pointer (respects app popup mute)
  const playMechanicalTick = useCallback((pitchVariance = 0) => {
    try {
      if (appSoundService.getIsPopupSoundMuted()) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(8);
        }
        return;
      }

      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtxClass();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(540 + pitchVariance, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.025);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.035);

      // Light haptic feedback if supported on mobile
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(8);
      }
    } catch {
      // ignore
    }
  }, []);

  // Play triumphant completion chime (respects app popup mute)
  const playWinChime = useCallback(() => {
    try {
      if (appSoundService.getIsPopupSoundMuted()) return;

      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtxClass();
      const ctx = audioCtxRef.current;

      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.45);
      });
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
  // BASIC QUOTA (5 PLAYS) & 2-HOUR DAILY REST TRACKER vs VIP THROUGHOUT
  // -------------------------------------------------------------
  const [basicPlayCount, setBasicPlayCount] = useState<number>(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const savedDate = localStorage.getItem('twogether_basic_game_date');
      if (savedDate !== today) {
        localStorage.setItem('twogether_basic_game_date', today);
        localStorage.setItem('twogether_basic_game_plays', '0');
        localStorage.setItem('twogether_basic_game_session_start', String(Date.now()));
        return 0;
      }
      const savedPlays = localStorage.getItem('twogether_basic_game_plays');
      return savedPlays ? parseInt(savedPlays, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [basicSessionStart] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('twogether_basic_game_session_start');
      if (saved) return Number(saved);
      const now = Date.now();
      localStorage.setItem('twogether_basic_game_session_start', String(now));
      return now;
    } catch {
      return Date.now();
    }
  });

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

  // Determine VIP vs Basic Status
  const isVipOrPass = Boolean(isVip || has1DaySpicyPass);
  const elapsedMinutes = Math.floor((Date.now() - basicSessionStart) / (60 * 1000));
  // Basic resting limit: triggers if basic plays reach 5 or session draws near 2 hours (~105-120 mins)
  const isBasicLimitReached = !isVipOrPass && (basicPlayCount >= 5 || elapsedMinutes >= 105);

  // Interactive Game Timer
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentSegment = NAUGHTY_WHEEL_SEGMENTS[winningSegmentIndex] || NAUGHTY_WHEEL_SEGMENTS[0];
  
  // In Basic mode, prompt cycles through the 5 sample prompts. In VIP, it is endless throughout.
  const currentBasicSamplePrompt = BASIC_SAMPLE_PROMPTS[basicPromptCycleIdx % BASIC_SAMPLE_PROMPTS.length];
  const currentPromptText =
    connectionMode === 'party_10' && syncedPartyPromptText
      ? syncedPartyPromptText
      : !isVipOrPass
      ? currentBasicSamplePrompt.text
      : (activeCustomDare?.text || currentSegment.prompts[activePromptIndex % currentSegment.prompts.length] || currentSegment.prompts[0]);

  // REAL SPINNING WHEEL PHYSICS & MECHANICS - Faster, multiple 360 spins, true lottery randomness
  const spinPhysicalWheel = () => {
    if (isSpinning) return;

    // Check if Basic daily limit is reached
    if (isBasicLimitReached) {
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal('Your 5 Free Basic Plays / ~2h daily allowance is complete! Unlock Endless Spicy & Extremely Hot Vybes Throughout via Google Pay ($0.99 / $5.99)!');
      }
      return;
    }

    // Check if player selected a subscription-only spicy tier without VIP
    const tierMeta = SPICY_VYBE_TIERS.find((t) => t.id === intensityFilter);
    if (tierMeta?.isSubscriptionOnly && !isVipOrPass) {
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal(`Unlock ${tierMeta.label} ($0.99 1-Day Pass or $5.99 VIP via Google Pay) for endless uncapped vybes throughout!`);
      }
      return;
    }

    setIsSpinning(true);
    setIsTimerRunning(false);
    setActiveCustomDare(null);

    // Filter target segments based on tier
    let targetSegments = NAUGHTY_WHEEL_SEGMENTS;
    if (!isVipOrPass) {
      // Basic free user only spins mild segments (Segments 5, 11)
      targetSegments = NAUGHTY_WHEEL_SEGMENTS.filter((s) => s.vybeLevel === 'mild');
      if (targetSegments.length === 0) targetSegments = [NAUGHTY_WHEEL_SEGMENTS[5], NAUGHTY_WHEEL_SEGMENTS[11]];
    } else {
      // VIP subscriber can filter by any specific vybe level or play all
      if (intensityFilter !== 'all') {
        const matched = NAUGHTY_WHEEL_SEGMENTS.filter((s) => s.vybeLevel === intensityFilter);
        if (matched.length > 0) targetSegments = matched;
      }
    }

    // True lottery pick
    const chosenSegment = targetSegments[Math.floor(Math.random() * targetSegments.length)];
    const chosenIndex = chosenSegment.id;

    // 12 segments = 30 degrees per slice.
    const sliceAngle = 360 / 12; // 30 deg
    const sliceCenter = chosenIndex * sliceAngle + sliceAngle / 2;
    const targetModAngle = (360 - sliceCenter) % 360;

    // Multiple 360-degree fast rotations (5 to 7 full 360° spins = 1800° to 2520°)
    const fullSpins = 5 + Math.floor(Math.random() * 3);
    const currentMod = wheelRotation % 360;
    let delta = targetModAngle - currentMod;
    if (delta < 0) delta += 360;

    const finalAngle = wheelRotation + fullSpins * 360 + delta;
    setWheelRotation(finalAngle);

    // Faster spin: 2.4 seconds total duration
    const spinDuration = 2400; // 2.4 seconds
    const startTime = Date.now();
    let lastTickAngle = wheelRotation;

    if (spinTickIntervalRef.current) {
      clearInterval(spinTickIntervalRef.current);
    }

    const tickInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / spinDuration);

      // Smooth cubic-bezier ease out
      const easeOut = 1 - Math.pow(1 - progress, 3.2);
      const currentSimAngle = wheelRotation + (finalAngle - wheelRotation) * easeOut;

      // Realistic mechanical peg ticks
      if (Math.abs(currentSimAngle - lastTickAngle) >= 15) {
        lastTickAngle = currentSimAngle;
        playMechanicalTick((Math.random() - 0.5) * 60);

        // Flapper twitch
        setFlapperTwitch((prev) => (prev > 0 ? -12 : 14));
        setTimeout(() => setFlapperTwitch(0), 30);
      }

      if (elapsed >= spinDuration) {
        clearInterval(tickInterval);
        spinTickIntervalRef.current = null;
        setFlapperTwitch(0);
        setIsSpinning(false);
        setWinningSegmentIndex(chosenIndex);
        const nextVipPromptIdx = Math.floor(Math.random() * chosenSegment.prompts.length);
        setActivePromptIndex(nextVipPromptIdx);
        setSyncedPartyPromptText(null);

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
            : chosenSegment.prompts[nextVipPromptIdx] || chosenSegment.prompts[0];
          lastSyncedSpinTsRef.current = Date.now();
          socketService.syncPartySpin({
            roomCode: partyRoomCode,
            segmentId: chosenIndex,
            wheelRotation: finalAngle,
            promptIndex: isVipOrPass ? nextVipPromptIdx : nextBasicIdx,
            promptText: landedPromptText,
            updatedBy: localPhoneName.trim() || 'Host Phone',
          });
        } else if (
          showCoupleSharePortal &&
          (connectionMode === 'online_remote' || connectionMode === 'proximity_fusion')
        ) {
          const landedPromptText = !isVipOrPass
            ? BASIC_SAMPLE_PROMPTS[nextBasicIdx].text
            : chosenSegment.prompts[nextVipPromptIdx] || chosenSegment.prompts[0];
          lastCoupleSpinTsRef.current = Date.now();
          socketService.syncCoupleSpin({
            roomCode: coupleRoomCode,
            segmentId: chosenIndex,
            wheelRotation: finalAngle,
            promptIndex: isVipOrPass ? nextVipPromptIdx : nextBasicIdx,
            promptText: landedPromptText,
            updatedBy: couplePartnerOneName.trim() || 'Partner',
          });
        } else {
          // Rotate turn between Partner 1 & Partner 2 in offline Pass & Play mode
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
      }
    }, 20);
    spinTickIntervalRef.current = tickInterval;
  };

  // Next endless prompt variation inside current winning wedge
  const nextPromptVariation = () => {
    setSyncedPartyPromptText(null);
    if (!isVipOrPass) {
      const nextIdx = (basicPromptCycleIdx + 1) % BASIC_SAMPLE_PROMPTS.length;
      setBasicPromptCycleIdx(nextIdx);
      setTimerSeconds(BASIC_SAMPLE_PROMPTS[nextIdx].duration);
    } else {
      setActivePromptIndex((prev) => prev + 1);
      setTimerSeconds(currentSegment.suggestedDurationSec);
    }
    setIsTimerRunning(false);
  };

  // Complete Challenge & Award Synergy Points (2x for VIP!)
  const handleCompleteChallenge = () => {
    const pointsAwarded = isVipOrPass ? 150 : 75;
    setSynergyPoints((prev) => {
      const updated = prev + pointsAwarded;
      try {
        localStorage.setItem('twogether_synergy_pts', String(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    if (!isVipOrPass) {
      setBasicPlayCount((prev) => {
        const next = prev + 1;
        try {
          localStorage.setItem('twogether_basic_game_plays', String(next));
        } catch {}
        return next;
      });
    }

    playWinChime();
    try {
      confetti({
        particleCount: isVipOrPass ? 90 : 60,
        spread: 90,
        origin: { y: 0.55 },
        colors: isVipOrPass ? ['#fbbf24', '#f59e0b', '#ec4899', '#a855f7'] : ['#10b981', '#fbbf24', '#ec4899'],
      });
    } catch {
      // ignore
    }
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
  // CARDS DECK STATE & LOGIC (SUBSCRIPTION & BASIC 5-SAMPLE LOOP)
  // -------------------------------------------------------------
  const [deckCardIndex, setDeckCardIndex] = useState<number>(0);
  const [cardDeckIntensity, setCardDeckIntensity] = useState<'all' | 'spicy' | 'golden'>('all');

  const filteredCards = ENDLESS_CARDS_DECK.filter((c) => {
    if (!isVipOrPass) {
      return c.vybeLevel === 'mild';
    }
    if (intensityFilter !== 'all') {
      return c.vybeLevel === intensityFilter;
    }
    if (cardDeckIntensity === 'golden') return c.category.includes('Golden');
    if (cardDeckIntensity === 'spicy') return c.intensity === 'Very Naughty & Healthy';
    return true;
  }).slice(0, !isVipOrPass ? 5 : ENDLESS_CARDS_DECK.length);

  const activeCard =
    filteredCards.length > 0
      ? filteredCards[deckCardIndex % filteredCards.length] || filteredCards[0]
      : ENDLESS_CARDS_DECK[3];

  const handleNextCard = () => {
    if (isBasicLimitReached) {
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal(
          'Your 5 Free Basic Plays / ~2h daily allowance is complete! Unlock Endless Truth & Dare Spicy Cards Throughout via Google Pay ($0.99 / $5.99)!'
        );
      }
      return;
    }
    if (filteredCards.length === 0) return;
    setDeckCardIndex((prev) => (prev + 1) % filteredCards.length);
  };
  const handlePrevCard = () => {
    if (isBasicLimitReached) {
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal(
          'Your 5 Free Basic Plays / ~2h daily allowance is complete! Unlock Endless Truth & Dare Spicy Cards Throughout via Google Pay ($0.99 / $5.99)!'
        );
      }
      return;
    }
    if (filteredCards.length === 0) return;
    setDeckCardIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
  };
  const handleShuffleDeck = () => {
    if (isBasicLimitReached) {
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal(
          'Your 5 Free Basic Plays / ~2h daily allowance is complete! Unlock Endless Truth & Dare Spicy Cards Throughout via Google Pay ($0.99 / $5.99)!'
        );
      }
      return;
    }
    if (filteredCards.length === 0) return;
    setDeckCardIndex(Math.floor(Math.random() * filteredCards.length));
  };

  // -------------------------------------------------------------
  // NAUGHTY CRAVING DICE STATE & LOGIC (SUBSCRIPTION GATED)
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

    if (isBasicLimitReached) {
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal(
          'Your 5 Free Basic Plays / ~2h daily allowance is complete! Unlock Endless Spicy Craving Dice Throughout via Google Pay ($0.99 / $5.99)!'
        );
      }
      return;
    }

    const tierMeta = SPICY_VYBE_TIERS.find((t) => t.id === intensityFilter);
    if (tierMeta?.isSubscriptionOnly && !isVipOrPass) {
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal(
          `Unlock ${tierMeta.label} Craving Dice ($0.99 1-Day Pass or $5.99 VIP via Google Pay) for endless uncapped passion rolls throughout!`
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

    let rollStep = 0;
    const interval = setInterval(() => {
      setDiceAction(activeActionPool[Math.floor(Math.random() * activeActionPool.length)]);
      setDiceLocation(activeLocationPool[Math.floor(Math.random() * activeLocationPool.length)]);
      playMechanicalTick(Math.random() * 80);
      rollStep++;
      if (rollStep > 12) {
        clearInterval(interval);
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
    setFingersUp((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
    playMechanicalTick(Math.random() * 80);
  };

  const handleResetFingers = () => {
    setFingersUp(Array(10).fill(true));
    setFingerQuestionIdx(0);
  };

  const handleNextFingerQuestion = () => {
    if (isBasicLimitReached) {
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal(
          'Your 5 Free Basic Plays / ~2h daily allowance is complete! Unlock Endless Put A Finger Down & Spicy Confessions via Google Pay ($0.99 / $5.99)!'
        );
      }
      return;
    }
    setFingerQuestionIdx((prev) => (prev + 1) % visibleFingerQuestions.length);
  };

  // Generate Endless Tastier, Funner Viral Challenges (VIP Subscription Feature)
  const handleGenerateViralChallenge = () => {
    if (!isVipOrPass) {
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal(
          'Unlock the AI Tastier Viral Challenge Generator & All 6 Spicy Vybe Levels ($0.99 1-Day Pass or $5.99 VIP via Google Pay)!'
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
          'Award yourselves +150 VIP Synergy PTS upon completion!',
        ],
        trendingSoundtrack: 'Lagos to Tokyo Viral Sound • 122 BPM',
        rewardPoints: 150,
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

  // -------------------------------------------------------------
  // WHO KNOWS ME BEST ENDLESS QUIZ (MILD 5-SAMPLE LOOP vs VIP SPICY)
  // -------------------------------------------------------------
  const [quizQuestionIndex, setQuizQuestionIndex] = useState<number>(0);
  const [quizSelectedAnswer, setQuizSelectedAnswer] = useState<number | null>(null);
  const [, setQuizScore] = useState<number>(0);

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

  const ALL_VIP_QUIZ_POOL = [...VIP_QUIZ_QUESTIONS, ...BASIC_QUIZ_QUESTIONS];
  const filteredVipQuiz =
    intensityFilter === 'all'
      ? ALL_VIP_QUIZ_POOL
      : ALL_VIP_QUIZ_POOL.filter((q) => q.vybeLevel === intensityFilter);
  const activeQuizPool = !isVipOrPass
    ? BASIC_QUIZ_QUESTIONS
    : filteredVipQuiz.length > 0
    ? filteredVipQuiz
    : ALL_VIP_QUIZ_POOL;

  const currentQuiz = activeQuizPool[quizQuestionIndex % activeQuizPool.length] || BASIC_QUIZ_QUESTIONS[0];

  // Shared Spin-the-Wheel–Style Subscription Helpers for All Game Tabs
  const renderSubscriptionBanner = (modeBasicText: string, modeVipText: string) =>
    isVipOrPass ? (
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-purple-500/20 border-2 border-amber-400/50 flex flex-wrap items-center justify-between gap-3 text-left shadow-xl shadow-amber-500/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center font-black shadow-md shrink-0">
            <Crown className="w-5 h-5 fill-black" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-amber-300 font-mono tracking-wide">
                👑 VIP PREMIUM SUBSCRIPTION ACTIVE: ENDLESS SPICY THROUGHOUT
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/40 text-[10px] font-mono font-bold">
                2x PTS BONUS (+150 PTS)
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 font-sans">
              {modeVipText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAiSpicyGenerator(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-mono text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            title="Generate instant AI spicy challenge"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>⚡ AI Spicy Generator</span>
          </button>
          <button
            onClick={() => setShowCustomDareModal(true)}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-zinc-200 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Send custom dare to your partner"
          >
            <span>✍️ Custom Dare</span>
          </button>
        </div>
      </div>
    ) : (
      <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
            <span>🟢</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-emerald-300 font-mono">
                {modeBasicText}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 text-[10px] font-mono">
                {Math.max(0, 5 - basicPlayCount)}/5 daily plays left
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Basic experience repeats mild sample prompts and rests near 2h so next day brings more vybe. VIP unlocks endless throughout!
            </p>
          </div>
        </div>

        {onOpenUpgradeModal && (
          <button
            onClick={() =>
              onOpenUpgradeModal(
                'Unlock Endless Spicy, More Spicy, Hot, Extra Hot & Extremely Hot Vybes Throughout via Google Pay ($0.99 / $5.99)!'
              )
            }
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-mono font-black text-xs shadow-lg hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Crown className="w-3.5 h-3.5 fill-black" />
            <span>Unlock VIP ($0.99 / $5.99)</span>
          </button>
        )}
      </div>
    );

  const renderBasicLimitGate = () =>
    isBasicLimitReached ? (
      <div className="p-5 rounded-3xl bg-gradient-to-b from-indigo-950/80 via-purple-950/80 to-[#120f20] border-2 border-pink-500/60 shadow-2xl text-center space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5 shadow-xl flex items-center justify-center">
          <div className="w-full h-full bg-[#151025] rounded-full flex items-center justify-center text-2xl">
            🌙
          </div>
        </div>

        <div className="space-y-1.5 max-w-lg mx-auto">
          <span className="px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-300 text-xs font-mono font-extrabold uppercase tracking-wider">
            Basic Daily Allowance Concluded
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            Basic Energy Rested Until Tomorrow
          </h3>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
            You’ve played through your <strong>5 free basic plays (or ~2 hours intimacy session)</strong> for today! Content is resting until tomorrow so it brings more fresh vybe next day.
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-black/40 border border-white/10 max-w-md mx-auto flex items-center justify-around text-xs font-mono">
          <div>
            <span className="text-zinc-500 block text-[10px]">Today&apos;s Plays</span>
            <strong className="text-amber-300 font-bold">{basicPlayCount} / 5 Plays</strong>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <span className="text-zinc-500 block text-[10px]">Session Time</span>
            <strong className="text-cyan-300 font-bold">~{elapsedMinutes} mins (~2 hrs)</strong>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <span className="text-zinc-500 block text-[10px]">Energy Refresh</span>
            <strong className="text-emerald-300 font-bold">Tomorrow 00:00 🔋</strong>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-pink-500/15 to-purple-500/15 border border-amber-400/40 max-w-lg mx-auto space-y-2 text-left">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-xs font-bold text-amber-300 font-mono">
              Don&apos;t want the vybe to end tonight?
            </span>
          </div>
          <p className="text-xs text-zinc-200 leading-relaxed font-sans">
            VIP subscription is completely <strong>endless throughout 24/7</strong> with zero repetition or 2-hour limits! Unlocks all spicy levels: <strong>Spicy 🌶️, More Spicy 🌶️🔥, Most Spicy 🌶️🌶️🔥, Hot 🔥, Extra Hot 🔥💋 & Extremely Hot 💥🫦</strong> plus 2x Synergy Points!
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            {onOpenUpgradeModal && (
              <button
                onClick={() =>
                  onOpenUpgradeModal(
                    'Unlock Endless Spicy, More Spicy, Hot, Extra Hot & Extremely Hot Vybes Throughout via Google Pay ($0.99 / $5.99)!'
                  )
                }
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-mono font-black text-xs shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Crown className="w-4 h-4 fill-black" />
                <span>Unlock VIP with Google Pay ($0.99 / $5.99)</span>
              </button>
            )}
            <button
              onClick={() => setShowVipPreviewDrawer(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 text-xs font-mono font-bold transition-all cursor-pointer"
            >
              👀 Preview VIP Endless Spectrum
            </button>
          </div>
        </div>
      </div>
    ) : null;

  const renderSpicyVybeTierBar = (contextLabel: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-zinc-400 font-bold text-xs font-mono flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-pink-400" /> {contextLabel}:
        </span>
        <span className="text-[11px] font-mono text-zinc-400">
          {isVipOrPass ? '👑 All VIP Vybes Unlocked Endless' : '🔒 Basic: Mild Romance Only'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 text-xs font-mono">
        {SPICY_VYBE_TIERS.map((tier) => {
          const isActive = intensityFilter === tier.id;
          const isLocked = tier.isSubscriptionOnly && !isVipOrPass;

          return (
            <button
              key={tier.id}
              onClick={() => {
                if (isLocked) {
                  if (onOpenUpgradeModal) {
                    onOpenUpgradeModal(
                      `Unlock ${tier.label} ($0.99 1-Day Pass or $5.99 VIP via Google Pay) for endless uncapped vybes throughout!`
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
                  <Lock className="w-2.5 h-2.5" /> VIP
                </span>
              )}

              <span className="text-base sm:text-lg">{tier.icon}</span>
              <span className="text-[10.5px] leading-tight font-extrabold truncate w-full">
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

          {/* Couples-Only Portal Quick Trigger & Synergy Points Badge */}
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

            <div className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-purple-500/20 border border-amber-400/40 text-amber-200 font-mono text-xs font-bold flex items-center gap-1.5 shadow-lg">
              <Trophy className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>{synergyPoints.toLocaleString()} Synergy PTS</span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Main Game Mode Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-white/10 pb-2 overflow-x-auto text-xs font-mono">
        <button
          onClick={() => setActiveGameTab('wheel')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeGameTab === 'wheel'
              ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white shadow-lg shadow-pink-500/25 font-black'
              : 'bg-white/5 text-zinc-300 hover:bg-white/10'
          }`}
        >
          <RotateCw className="w-4 h-4" /> 🎡 Realistic Naughty Wheel
        </button>

        <button
          onClick={() => setActiveGameTab('cards')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeGameTab === 'cards'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25 font-black'
              : 'bg-white/5 text-zinc-300 hover:bg-white/10'
          }`}
        >
          <Flame className="w-4 h-4 text-pink-400" /> 🃏 Endless Truth & Dare
        </button>

        <button
          onClick={() => setActiveGameTab('social_viral')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeGameTab === 'social_viral'
              ? 'bg-gradient-to-r from-red-500 via-pink-500 to-amber-500 text-white shadow-lg shadow-pink-500/25 font-black'
              : 'bg-white/5 text-zinc-300 hover:bg-white/10'
          }`}
        >
          <Smartphone className="w-4 h-4 text-pink-400" /> 📱 Viral TikTok / Social Challenges
        </button>

        <button
          onClick={() => setActiveGameTab('dice')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeGameTab === 'dice'
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg shadow-amber-500/25 font-black'
              : 'bg-white/5 text-zinc-300 hover:bg-white/10'
          }`}
        >
          <Dices className="w-4 h-4 text-amber-300" /> 🎲 Craving Dice
        </button>

        <button
          onClick={() => setActiveGameTab('quiz')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeGameTab === 'quiz'
              ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-lg shadow-cyan-500/25 font-black'
              : 'bg-white/5 text-zinc-300 hover:bg-white/10'
          }`}
        >
          <HelpCircle className="w-4 h-4" /> 🧠 Who Knows Me Best?
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

          {/* VIP PREMIUM ACTIVE BANNER vs BASIC QUOTA TRACKER */}
          {isVipOrPass ? (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-purple-500/20 border-2 border-amber-400/50 flex flex-wrap items-center justify-between gap-3 text-left shadow-xl shadow-amber-500/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center font-black shadow-md shrink-0">
                  <Crown className="w-5 h-5 fill-black" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-amber-300 font-mono tracking-wide">
                      👑 VIP PREMIUM SUBSCRIPTION ACTIVE: ENDLESS SPICY THROUGHOUT
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/40 text-[10px] font-mono font-bold">
                      2x PTS BONUS (+150 PTS)
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 font-sans">
                    All 6 Spicy Vybe Levels Unlocked 24/7 • No 2-Hour Cooldown • Endless Non-Repeating Prompts
                  </p>
                </div>
              </div>

              {/* VIP Quick Tool Triggers */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAiSpicyGenerator(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-mono text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Generate instant AI spicy challenge"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>⚡ AI Spicy Generator</span>
                </button>
                <button
                  onClick={() => setShowCustomDareModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-zinc-200 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Send custom dare to your partner"
                >
                  <span>✍️ Custom Dare</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                  <span>🟢</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-emerald-300 font-mono">
                      BASIC MODE (FREE): 5-Prompt Repeating Sample Loop
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 text-[10px] font-mono">
                      {Math.max(0, 5 - basicPlayCount)}/5 daily plays left
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Basic experience repeats mild sample prompts and rests near 2h so next day brings more vybe. VIP unlocks endless throughout!
                  </p>
                </div>
              </div>

              {onOpenUpgradeModal && (
                <button
                  onClick={() =>
                    onOpenUpgradeModal(
                      'Unlock Endless Spicy, More Spicy, Hot, Extra Hot & Extremely Hot Vybes Throughout via Google Pay ($0.99 / $5.99)!'
                    )
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-mono font-black text-xs shadow-lg hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Crown className="w-3.5 h-3.5 fill-black" />
                  <span>Unlock VIP ($0.99 / $5.99)</span>
                </button>
              )}
            </div>
          )}

          {/* BASIC DAILY ALLOWANCE REACHED (RESTING UNTIL TOMORROW) VIEW */}
          {isBasicLimitReached && (
            <div className="p-5 rounded-3xl bg-gradient-to-b from-indigo-950/80 via-purple-950/80 to-[#120f20] border-2 border-pink-500/60 shadow-2xl text-center space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5 shadow-xl flex items-center justify-center">
                <div className="w-full h-full bg-[#151025] rounded-full flex items-center justify-center text-2xl">
                  🌙
                </div>
              </div>

              <div className="space-y-1.5 max-w-lg mx-auto">
                <span className="px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-300 text-xs font-mono font-extrabold uppercase tracking-wider">
                  Basic Daily Allowance Concluded
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Basic Energy Rested Until Tomorrow
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                  You’ve played through your <strong>5 free basic plays (or ~2 hours intimacy session)</strong> for today! Content is resting until tomorrow so it brings more fresh vybe next day.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 max-w-md mx-auto flex items-center justify-around text-xs font-mono">
                <div>
                  <span className="text-zinc-500 block text-[10px]">Today&apos;s Plays</span>
                  <strong className="text-amber-300 font-bold">{basicPlayCount} / 5 Plays</strong>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div>
                  <span className="text-zinc-500 block text-[10px]">Session Time</span>
                  <strong className="text-cyan-300 font-bold">~{elapsedMinutes} mins (~2 hrs)</strong>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div>
                  <span className="text-zinc-500 block text-[10px]">Energy Refresh</span>
                  <strong className="text-emerald-300 font-bold">Tomorrow 00:00 🔋</strong>
                </div>
              </div>

              {/* VIP Pitch: Don't stop the vybe tonight */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-pink-500/15 to-purple-500/15 border border-amber-400/40 max-w-lg mx-auto space-y-2 text-left">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-amber-300 font-mono">
                    Don&apos;t want the vybe to end tonight?
                  </span>
                </div>
                <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                  VIP subscription is completely <strong>endless throughout 24/7</strong> with zero repetition or 2-hour limits! Unlocks all spicy levels: <strong>Spicy 🌶️, More Spicy 🌶️🔥, Most Spicy 🌶️🌶️🔥, Hot 🔥, Extra Hot 🔥💋 & Extremely Hot 💥🫦</strong> plus 2x Synergy Points!
                </p>
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                  {onOpenUpgradeModal && (
                    <button
                      onClick={() =>
                        onOpenUpgradeModal(
                          'Unlock Endless Spicy, More Spicy, Hot, Extra Hot & Extremely Hot Vybes Throughout via Google Pay ($0.99 / $5.99)!'
                        )
                      }
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-mono font-black text-xs shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Crown className="w-4 h-4 fill-black" />
                      <span>Unlock VIP with Google Pay ($0.99 / $5.99)</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowVipPreviewDrawer(true)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 text-xs font-mono font-bold transition-all cursor-pointer"
                  >
                    👀 Preview VIP Endless Spectrum
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Spiciness & Nastiness Tier Filter Bar (All 6 Distinct Vybe Levels) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-bold text-xs font-mono flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-pink-400" /> Intimacy & Spicy Vybe Level:
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                {isVipOrPass ? '👑 All VIP Vybes Unlocked Endless' : '🔒 Basic: Mild Romance Only'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 text-xs font-mono">
              {SPICY_VYBE_TIERS.map((tier) => {
                const isActive = intensityFilter === tier.id;
                const isLocked = tier.isSubscriptionOnly && !isVipOrPass;

                return (
                  <button
                    key={tier.id}
                    onClick={() => {
                      if (isLocked) {
                        if (onOpenUpgradeModal) {
                          onOpenUpgradeModal(
                            `Unlock ${tier.label} ($0.99 1-Day Pass or $5.99 VIP via Google Pay) for endless uncapped vybes throughout!`
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
                    {/* Lock Badge for Subscription Tiers */}
                    {isLocked && (
                      <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-black font-black text-[9px] flex items-center gap-0.5 shadow">
                        <Lock className="w-2.5 h-2.5" /> VIP
                      </span>
                    )}

                    <span className="text-base sm:text-lg">{tier.icon}</span>
                    <span className="text-[10.5px] leading-tight font-extrabold truncate w-full">
                      {tier.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* The Real Physical Wheel SVG Component (Col 1-7) */}
            <GlassCard className="lg:col-span-7 p-4 sm:p-6 text-center space-y-4 flex flex-col items-center justify-center border border-pink-500/40 relative overflow-hidden">
              <div className="flex items-center justify-between w-full">
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> True Lottery Random Spin
                </span>
                <span className="px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-300 font-mono text-[10px]">
                  Fast 2.4s Kinetic Rotation
                </span>
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

                {/* Rotating Wheel Body - Smooth 2.4s Fast Spin */}
                <div
                  className="w-full h-full rounded-full cursor-pointer select-none"
                  style={{
                    transform: `rotate(${wheelRotation}deg)`,
                    transition: isSpinning ? 'transform 2.4s cubic-bezier(0.12, 0.98, 0.22, 1)' : 'none',
                  }}
                  onClick={spinPhysicalWheel}
                  title="Click or Tap to Spin the Wheel!"
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

                      return (
                        <g key={seg.id}>
                          {/* Segment Wedge */}
                          <path
                            d={pathData}
                            fill={seg.color}
                            fillOpacity={isHighlighted ? 0.98 : 0.82}
                            stroke="#0f0e17"
                            strokeWidth="2.5"
                          />

                          {/* High-Contrast Pill Backdrop & Visible Readable Text */}
                          <g transform={`rotate(${midAngleDeg}, 200, 200)`}>
                            <rect
                              x="134"
                              y="44"
                              width="132"
                              height="26"
                              rx="13"
                              fill="rgba(12, 10, 22, 0.88)"
                              stroke="rgba(255, 255, 255, 0.45)"
                              strokeWidth="1.2"
                              filter="url(#shadow)"
                            />
                            <text
                              x="200"
                              y="61"
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="11.5"
                              fontWeight="900"
                              fontFamily="sans-serif"
                              letterSpacing="0.2px"
                              style={{ textShadow: '0 2px 4px rgba(0,0,0,1)' }}
                            >
                              {seg.emoji} {seg.shortLabel}
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
                      {isSpinning ? 'SPINNING' : 'SPIN'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Action Buttons below wheel */}
              <div className="w-full flex items-center justify-center gap-3 pt-1">
                <button
                  onClick={spinPhysicalWheel}
                  disabled={isSpinning}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 text-white font-extrabold text-xs shadow-lg shadow-pink-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Flame className="w-4 h-4 fill-white" />
                  <span>{isSpinning ? 'Spinning Naughty Wheel...' : 'Spin Naughty Wheel'}</span>
                </button>
              </div>
            </GlassCard>

            {/* Current Active Trending Game Card (Col 8-12) */}
            <GlassCard className="lg:col-span-5 p-5 space-y-4 border border-pink-500/40 flex flex-col justify-between h-full bg-gradient-to-b from-[#18152b] to-[#12101e]">
              <div className="space-y-3">
                {/* Header: Segment Title & Emoji */}
                <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl">{currentSegment.emoji}</span>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-pink-400 font-extrabold tracking-wider block">
                        Trending Game #{currentSegment.id + 1}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                        {currentSegment.title}
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

                {/* Specific Challenge Prompt */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-300 uppercase font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Challenge Variation #{activePromptIndex + 1}:
                    </span>
                    <button
                      onClick={nextPromptVariation}
                      className="text-[11px] font-mono text-pink-300 hover:text-white flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Shuffle className="w-3 h-3" /> Next Variation
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-white font-medium leading-relaxed italic">
                    &quot;{currentPromptText}&quot;
                  </p>
                </div>

                {/* Interactive Countdown Timer */}
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-mono text-zinc-300">
                      Timer: <strong className="text-white text-sm font-mono">{timerSeconds}s</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                      className="px-3 py-1.5 rounded-xl bg-amber-400 text-black font-extrabold text-xs shadow hover:scale-105 transition-all flex items-center gap-1 cursor-pointer"
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

              {/* Action Completion & Award Points */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <button
                  onClick={handleCompleteChallenge}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-black font-black text-xs sm:text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PartyPopper className="w-4 h-4 fill-black" /> Complete Challenge (+75 Pts)
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={spinPhysicalWheel}
                    disabled={isSpinning}
                    className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-pink-400" /> Spin Next Game
                  </button>
                  <button
                    onClick={nextPromptVariation}
                    className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-cyan-400" /> Alternate Rule
                  </button>
                </div>
              </div>
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
                onClick={() => setCardDeckIntensity('all')}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                  cardDeckIntensity === 'all'
                    ? 'bg-purple-500 text-white font-extrabold shadow-md'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                {isVipOrPass ? `All Cards (${filteredCards.length})` : `Basic Sample (${filteredCards.length}/5)`}
              </button>
              <button
                onClick={() => {
                  if (!isVipOrPass) {
                    if (onOpenUpgradeModal) {
                      onOpenUpgradeModal(
                        'Unlock Spicy Very Naughty & Healthy Truth & Dare Cards ($0.99 1-Day Pass or $5.99 VIP via Google Pay)!'
                      );
                    }
                    playMechanicalTick(60);
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
                {!isVipOrPass && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black font-black text-[9px]">VIP</span>
                )}
              </button>
              <button
                onClick={() => setCardDeckIntensity('golden')}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                  cardDeckIntensity === 'golden'
                    ? 'bg-amber-400 text-black font-extrabold shadow-md'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                💃 Golden Soulmates (50+)
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
                    <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/40 text-xs font-mono font-bold flex items-center gap-1">
                      <span>{activeCard.icon}</span> {activeCard.category}
                    </span>
                    <div className="flex items-center gap-2">
                      {!isVipOrPass && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-bold">
                          BASIC 5-SAMPLE LOOP
                        </span>
                      )}
                      <span className="text-xs text-amber-300 font-mono font-bold">
                        +{isVipOrPass ? 150 : 75} Synergy PTS {isVipOrPass ? '(2x VIP)' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 py-4">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-300 font-bold block">
                      Target: {activeCard.forWhom}
                    </span>
                    <p className="text-base sm:text-xl font-bold text-white leading-relaxed">
                      &quot;{activeCard.cardPrompt}&quot;
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
                      onClick={() => {
                        if (isBasicLimitReached) {
                          if (onOpenUpgradeModal) {
                            onOpenUpgradeModal(
                              'Your 5 Free Basic Plays / ~2h daily allowance is complete! Unlock Endless Truth & Dare Spicy Cards Throughout via Google Pay ($0.99 / $5.99)!'
                            );
                          }
                          return;
                        }
                        handleCompleteChallenge();
                      }}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-extrabold text-xs sm:text-sm shadow-xl hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Completed (+{isVipOrPass ? 150 : 75} Pts)
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

                  {!isVipOrPass && onOpenUpgradeModal && (
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-[11px] font-mono">
                      <span className="text-zinc-400">🔒 Want 6 Spicy Levels & Midnight Dares?</span>
                      <button
                        onClick={() =>
                          onOpenUpgradeModal(
                            'Unlock All Endless Spicy Truth & Dare Decks 24/7 via Google Pay ($0.99 / $5.99)!'
                          )
                        }
                        className="text-amber-300 hover:text-amber-200 font-bold underline cursor-pointer"
                      >
                        Unlock VIP →
                      </button>
                    </div>
                  )}
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
            'BASIC MODE (FREE): 5-Challenge Mild Viral Loop',
            'All 6 Spicy Viral Tiers + AI Challenge Generator Unlocked 24/7 • 2x VIP Synergy Points'
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
                <span>🖐️</span> Put A Finger Down ({isVipOrPass ? '10' : '5 Free'} Fingers)
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
              {!isVipOrPass && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black font-black text-[9px]">
                  VIP
                </span>
              )}
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-300 font-mono text-xs font-bold flex items-center gap-1">
                        <Video className="w-3.5 h-3.5 text-pink-400" /> {activeViral.platform}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 font-mono text-[11px] font-bold">
                        {activeViral.vibe}
                      </span>
                      {!isVipOrPass && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-bold">
                          BASIC 5-SAMPLE LOOP
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-mono text-zinc-400">
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
                      {activeViral.setup}
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
                          <span>{rule}</span>
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
                      onClick={playTrendingVibeBeat}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isPlayingVibeBeat
                          ? 'bg-pink-500 text-white animate-pulse'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {isPlayingVibeBeat ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span>{isPlayingVibeBeat ? 'Playing...' : 'Preview Vibe'}</span>
                    </button>
                  </div>

                  {/* Action Completion, Social Sharing & Next */}
                  <div className="space-y-2.5 pt-2 border-t border-white/10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        onClick={() => {
                          if (isBasicLimitReached) {
                            if (onOpenUpgradeModal) {
                              onOpenUpgradeModal(
                                'Your 5 Free Basic Plays / ~2h daily allowance is complete! Unlock Endless Viral & Spicy Challenges Throughout via Google Pay ($0.99 / $5.99)!'
                              );
                            }
                            return;
                          }
                          handleCompleteChallenge();
                        }}
                        className="py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-black font-black text-xs sm:text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <PartyPopper className="w-4 h-4 fill-black" /> Complete Challenge (+{isVipOrPass ? 150 : 75} Pts)
                      </button>

                      <button
                        onClick={() => {
                          const text = `🔥 We just crushed the "${activeViral.title}" on Twogether! ${activeViral.hashtag}`;
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(text);
                          }
                          setViralToast('📸 Caption copied! Ready to post on Twogether Feed or Reels & Stories.');
                          playWinChime();
                        }}
                        className="py-3 px-4 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black text-xs sm:text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" /> Post / Share to Feed
                      </button>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-2">
                      <button
                        onClick={() => {
                          if (isBasicLimitReached) {
                            if (onOpenUpgradeModal) {
                              onOpenUpgradeModal(
                                'Your 5 Free Basic Plays / ~2h daily allowance is complete! Unlock Endless Viral Challenges Throughout via Google Pay ($0.99 / $5.99)!'
                              );
                            }
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
                          if (isBasicLimitReached) {
                            if (onOpenUpgradeModal) {
                              onOpenUpgradeModal(
                                'Your 5 Free Basic Plays / ~2h daily allowance is complete! Unlock Endless Viral Challenges Throughout via Google Pay ($0.99 / $5.99)!'
                              );
                            }
                            return;
                          }
                          const nextIdx = Math.floor(Math.random() * activeViralPool.length);
                          setActiveViralIndex(nextIdx);
                          playMechanicalTick(Math.random() * 80);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Shuffle className="w-3.5 h-3.5" /> Random Shuffle
                      </button>

                      <button
                        onClick={() => {
                          if (isBasicLimitReached) {
                            if (onOpenUpgradeModal) {
                              onOpenUpgradeModal(
                                'Your 5 Free Basic Plays / ~2h daily allowance is complete! Unlock Endless Viral Challenges Throughout via Google Pay ($0.99 / $5.99)!'
                              );
                            }
                            return;
                          }
                          setActiveViralIndex((prev) => (prev + 1) % activeViralPool.length);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>Next</span> <ChevronRight className="w-4 h-4" />
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
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-mono font-bold">
                  <span>🖐️</span> Viral Social Game • Put A Finger Down
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
                  <span className="font-bold text-amber-300">
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
                  💡 Tap any finger above to raise or lower it!
                </p>
              </div>

              {/* Active Viral Prompt */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-amber-500/10 border border-pink-400/30 text-center space-y-2">
                <span className="text-[11px] font-mono uppercase text-pink-400 font-bold block">
                  Question #{(fingerQuestionIdx % visibleFingerQuestions.length) + 1} of {visibleFingerQuestions.length}{' '}
                  {!isVipOrPass ? '(Basic 5-Sample Loop)' : '(All 10 VIP Unlocked)'}:
                </span>
                <p className="text-base sm:text-lg font-bold text-white leading-relaxed">
                  &quot;{visibleFingerQuestions[fingerQuestionIdx % visibleFingerQuestions.length]}&quot;
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
                    const firstUp = fingersUp.findIndex((f) => f);
                    if (firstUp !== -1) {
                      handleToggleFinger(firstUp);
                    }
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-pink-500 text-white font-extrabold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Put 1 Finger Down ✊</span>
                </button>

                <button
                  onClick={handleNextFingerQuestion}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-400 text-black font-extrabold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Next Question</span> <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleResetFingers}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 text-zinc-300 hover:text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset (10 Up)
                </button>
              </div>

              {/* Complete Reward */}
              <button
                onClick={() => {
                  if (isBasicLimitReached) {
                    if (onOpenUpgradeModal) {
                      onOpenUpgradeModal(
                        'Your 5 Free Basic Plays / ~2h daily allowance is complete! Unlock Endless Put A Finger Down Throughout via Google Pay ($0.99 / $5.99)!'
                      );
                    }
                    return;
                  }
                  handleCompleteChallenge();
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-black font-black text-xs sm:text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <PartyPopper className="w-4 h-4 fill-black" /> Complete Put A Finger Down (+{isVipOrPass ? 150 : 75} Synergy PTS)
              </button>
            </GlassCard>
          )}
        </div>
      )}

      {activeGameTab === 'dice' && (
        <div className="space-y-4">
          {renderSubscriptionBanner(
            'BASIC MODE (FREE): 5-Sample Mild Craving Dice Loop',
            'All 6 Spicy Craving Dice Pools Unlocked 24/7 • No 2-Hour Cooldown • 2x Synergy Points'
          )}

          {renderBasicLimitGate()}

          {renderSpicyVybeTierBar('Craving Dice Spicy Vybe Level')}

          <GlassCard className="p-6 sm:p-8 border border-amber-400/40 text-center space-y-6 max-w-xl mx-auto bg-gradient-to-b from-[#1c1825] to-[#120f1c]">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-mono font-bold mb-2">
                <Dices className="w-4 h-4 text-amber-400" />{' '}
                {isVipOrPass ? 'Endless Naughty Dice Generator (VIP)' : 'Basic Sample Romance Dice (Mild)'}
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">Roll for Passion & Action</h3>
              <p className="text-xs text-zinc-300 max-w-md mx-auto">
                {isVipOrPass
                  ? 'Roll the twin passion dice to generate hundreds of spicy, hot & extremely hot action + location pairings.'
                  : 'Basic Free rolls gentle 5-sample affection pairings. Unlock VIP for Spicy, Hot & Extremely Hot Bedroom Dice!'}
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
                  🎲 Die 1: {isVipOrPass ? 'Sensual Action' : 'Mild Affection'}
                </span>
                <span className="text-lg sm:text-xl font-black text-white font-sans">{diceAction}</span>
              </div>

              {/* Die 2: Target Location */}
              <div
                className={`p-5 rounded-3xl bg-gradient-to-br from-amber-600/30 via-orange-600/20 to-black border-2 border-amber-400/50 shadow-2xl flex flex-col items-center justify-center gap-2 ${
                  isRollingDice ? 'animate-bounce' : ''
                }`}
              >
                <span className="text-[10px] font-mono uppercase text-amber-300 font-extrabold tracking-wider">
                  🎯 Die 2: {isVipOrPass ? 'Intimate Location' : 'Sweet Spot'}
                </span>
                <span className="text-lg sm:text-xl font-black text-white font-sans">{diceLocation}</span>
              </div>
            </div>

            {/* Prompt Synthesis */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-zinc-200">
              Current Command: Deliver a <strong className="text-pink-400">{diceAction}</strong> directly on partner’s{' '}
              <strong className="text-amber-400">{diceLocation}</strong>!
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={rollNaughtyDice}
                disabled={isRollingDice}
                className={`w-full sm:w-auto px-8 py-3 rounded-2xl font-black text-xs sm:text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isBasicLimitReached
                    ? 'bg-amber-400 text-black'
                    : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-pink-500 text-black'
                }`}
              >
                {isBasicLimitReached ? <Lock className="w-4 h-4" /> : <Dices className={`w-4 h-4 ${isRollingDice ? 'animate-spin' : ''}`} />}
                <span>
                  {isBasicLimitReached
                    ? 'Daily Free Rolls Complete — Unlock VIP'
                    : isRollingDice
                    ? 'Rolling Dice...'
                    : `Roll Craving Dice (Roll #${diceRollCount})`}
                </span>
              </button>
              <button
                onClick={() => {
                  if (isBasicLimitReached) {
                    if (onOpenUpgradeModal) {
                      onOpenUpgradeModal(
                        'Your 5 Free Basic Plays / ~2h daily allowance is complete! Unlock Endless Spicy Craving Dice Throughout via Google Pay ($0.99 / $5.99)!'
                      );
                    }
                    return;
                  }
                  handleCompleteChallenge();
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-xs hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PartyPopper className="w-4 h-4" /> Complete (+{isVipOrPass ? 150 : 75} Pts)
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
            'BASIC MODE (FREE): 5-Question Mild Compatibility Loop',
            'All 6 Spicy Intimacy Quiz Levels Unlocked 24/7 • No 2-Hour Cooldown • 2x VIP Synergy Points'
          )}

          {renderBasicLimitGate()}

          {renderSpicyVybeTierBar('Quiz Spicy Intimacy Level')}

          <GlassCard className="p-6 sm:p-8 border border-cyan-400/40 text-left space-y-5 max-w-xl mx-auto bg-gradient-to-b from-[#161c2e] to-[#0f1422]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest block">
                  {isVipOrPass ? 'Endless Couples Spicy Intimacy Quiz (VIP)' : 'Basic Sample Couples Compatibility Quiz'}
                </span>
                <h3 className="text-lg font-black text-white">Who Knows Me Best?</h3>
              </div>
              <div className="flex items-center gap-2">
                {!isVipOrPass && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-bold">
                    5-SAMPLE LOOP
                  </span>
                )}
                <span className="text-xs font-mono text-zinc-400">
                  Round {(quizQuestionIndex % activeQuizPool.length) + 1} / {activeQuizPool.length}
                </span>
              </div>
            </div>

            <h4 className="text-sm sm:text-base font-bold text-white">
              {currentQuiz.q}
            </h4>

            <div className="space-y-2">
              {currentQuiz.options.map((opt, oIdx) => {
                const isSelected = quizSelectedAnswer === oIdx;
                return (
                  <button
                    key={oIdx}
                    onClick={() => {
                      if (isBasicLimitReached) {
                        if (onOpenUpgradeModal) {
                          onOpenUpgradeModal(
                            'Your 5 Free Basic Plays / ~2h daily allowance is complete! Unlock Endless Spicy Quiz Rounds Throughout via Google Pay ($0.99 / $5.99)!'
                          );
                        }
                        return;
                      }
                      setQuizSelectedAnswer(oIdx);
                      playWinChime();
                      setQuizScore((prev) => prev + 1);
                    }}
                    className={`w-full p-3 rounded-2xl border text-xs sm:text-sm font-semibold text-left transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                        : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:border-cyan-400/30'
                    }`}
                  >
                    <span>{opt}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                  </button>
                );
              })}
            </div>

            {quizSelectedAnswer !== null && (
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-xs text-cyan-200 font-mono">
                💡 Intimacy Insight: {currentQuiz.expl}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
              {!isVipOrPass && onOpenUpgradeModal && (
                <button
                  onClick={() =>
                    onOpenUpgradeModal(
                      'Unlock Deep Spicy, Hot & Extremely Hot Compatibility Questions 24/7 via Google Pay ($0.99 / $5.99)!'
                    )
                  }
                  className="text-[11px] font-mono text-amber-300 hover:text-amber-200 font-bold underline cursor-pointer"
                >
                  👑 Unlock Spicy VIP Questions
                </button>
              )}

              <button
                onClick={() => {
                  if (isBasicLimitReached) {
                    if (onOpenUpgradeModal) {
                      onOpenUpgradeModal(
                        'Your 5 Free Basic Plays / ~2h daily allowance is complete! Unlock Endless Spicy Quiz Questions Throughout via Google Pay ($0.99 / $5.99)!'
                      );
                    }
                    return;
                  }
                  if (quizSelectedAnswer !== null) {
                    handleCompleteChallenge();
                  }
                  setQuizQuestionIndex((prev) => prev + 1);
                  setQuizSelectedAnswer(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-cyan-400 text-black font-extrabold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
              >
                <span>Next Intimate Question (+{isVipOrPass ? 150 : 75} Pts)</span>
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
                    : '🚀 Send Command Dare (+150 PTS Reward)'}
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
                    <h3 className="text-lg font-black text-white">VIP Endless Intimacy Spectrum</h3>
                    <p className="text-xs text-zinc-400 font-mono">Compare Free Basic Mode vs VIP Subscription</p>
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
                {/* Basic Card */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-300">🟢 Basic Free Mode</span>
                    <span className="text-[10px] text-zinc-400 font-mono">Free Forever</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-zinc-300 font-sans">
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-400">✓</span> Mild & Sweet Romance prompts only
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-400">⏱</span> Fixed 5-prompt repeating sample cycle
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-400">🌙</span> Rests near 2 hours so next day brings more vybe
                    </li>
                    <li className="flex items-start gap-1.5 text-zinc-500">
                      <span>✕</span> Locked out of all 5 spicy & hot levels
                    </li>
                    <li className="flex items-start gap-1.5 text-zinc-500">
                      <span>✕</span> Standard 1x Synergy points (+75 PTS)
                    </li>
                  </ul>
                </div>

                {/* VIP Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-500/20 via-pink-500/20 to-purple-500/10 border-2 border-amber-400/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-300">👑 VIP Subscription</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black font-black text-[10px]">
                      $0.99 Pass / $5.99 Mo
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-white font-sans">
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">✓</span> <strong>Endless Throughout 24/7</strong> (No 2-hour daily limits)
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">✓</span> Unlocks <strong>Spicy 🌶️, More Spicy 🌶️🔥, Most Spicy 🌶️🌶️🔥, Hot 🔥, Extra Hot 🔥💋 & Extremely Hot 💥🫦</strong>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">✓</span> <strong>⚡ AI Spicy Vybe Generator</strong> for endless spontaneous challenges
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">✓</span> <strong>✍️ Custom Partner Dare Box</strong>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">✓</span> <strong>2x Synergy Points (+150 PTS)</strong>
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
                        'Unlock Endless Spicy, More Spicy, Hot, Extra Hot & Extremely Hot Vybes Throughout via Google Pay ($0.99 / $5.99)!'
                      );
                    }}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-pink-500 text-black font-mono font-black text-xs sm:text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Crown className="w-4 h-4 fill-black" />
                    <span>Upgrade with Google Pay ($0.99 1-Day Pass or $5.99/mo) — Play Endless Throughout</span>
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
