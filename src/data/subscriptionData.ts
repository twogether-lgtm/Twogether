import { ArcadeGameId, ChatWallpaper, GamePlanDurationId, GameUnlockEntry } from '../types';

export const CHAT_WALLPAPERS: ChatWallpaper[] = [
  {
    id: 'cyber_midnight',
    name: 'Midnight Cyberpunk',
    category: 'free',
    previewUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=600&q=80',
    bgCss: 'bg-gradient-to-b from-[#0F0E17] via-[#1B1A26] to-[#0A0911]',
    isVipOnly: false,
  },
  {
    id: 'lofi_sunset',
    name: 'Lofi Sunset Neon',
    category: 'free',
    previewUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    bgCss: 'bg-gradient-to-b from-purple-950/90 via-pink-950/70 to-[#0F0E17]',
    isVipOnly: false,
  },
  {
    id: 'minimal_glass',
    name: 'Minimal Dark Glass',
    category: 'free',
    previewUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80',
    bgCss: 'bg-gradient-to-b from-zinc-900 via-zinc-950 to-black',
    isVipOnly: false,
  },
  {
    id: 'holo_aurora',
    name: 'Holographic Aurora',
    category: 'vip',
    previewUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    bgCss: 'bg-gradient-to-tr from-cyan-950 via-teal-900/80 to-purple-950',
    isVipOnly: true,
  },
  {
    id: 'golden_luxe',
    name: 'Golden VIP Luxe',
    category: 'vip',
    previewUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    bgCss: 'bg-gradient-to-b from-amber-950/80 via-yellow-950/60 to-black',
    isVipOnly: true,
  },
  {
    id: 'matrix_rain',
    name: 'Neon Matrix Code',
    category: 'vip',
    previewUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
    bgCss: 'bg-gradient-to-b from-emerald-950/90 via-black to-emerald-950/80',
    isVipOnly: true,
  },
  {
    id: 'rose_crystal',
    name: 'Rose Gold Quartz',
    category: 'vip',
    previewUrl: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=600&q=80',
    bgCss: 'bg-gradient-to-b from-rose-950/80 via-purple-950/70 to-[#0F0E17]',
    isVipOnly: true,
  },
  {
    id: 'cosmic_nebula',
    name: 'Deep Space Nebula',
    category: 'vip',
    previewUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
    bgCss: 'bg-gradient-to-br from-indigo-950 via-blue-950 to-purple-950',
    isVipOnly: true,
  },
];

export const BASIC_LIMITS = {
  posts: { max: 5, days: 21 }, // 3 weeks
  chats: { max: 10, days: 21 }, // 3 weeks
  calls: { max: 3, days: 21 }, // 3 weeks
};

export const VIP_PRICING = {
  daily: '$1.00 / 24 hours (1-Day Momentum Pass)',
  weekly: '$3.50 / week (7-Day Pass)',
  twoWeeks: '$7.00 / 2 weeks (14-Day Bi-Weekly Pass)',
  adFreeMonthly: '$3.89 / month (Escape Pop-Up Ads & Zero Interruptions)',
  monthly: '$14.50 / month (30-Day Monthly VIP)',
  yearly: '$99.50 / year (Best Value Annual VIP)',
  weeklyTrial: '7-Day Free Trial Available',
  currencyNote: 'All subscriptions are stated in USD ($) but can be paid with any local currency equivalent at live bank rates.',
};

export interface FeaturePassItem {
  key: string;
  name: string;
  category: 'calls' | 'wallpaper' | 'chats' | 'posts' | 'games' | 'music';
  durationLabel: string;
  durationDays?: number; // e.g. 7, 14, 30, or undefined for permanent
  usdPrice: number;
  pointsCost: number; // Fair gift cost
  description: string;
  badge?: string;
  iconName: string;
}

export const A_LA_CARTE_PRICING: FeaturePassItem[] = [
  // 1. Voice Chat Passes (without needing VIP)
  {
    key: 'voice_pass_7d',
    name: 'Voice Chat 7-Day Pass',
    category: 'calls',
    durationLabel: '7 Days Unlimited',
    durationDays: 7,
    usdPrice: 1.49,
    pointsCost: 15,
    description: 'Unlimited HD voice calls, live audio notes & voice speed dating for 1 week',
    badge: 'Popular Voice 🎙️',
    iconName: 'Phone',
  },
  {
    key: 'voice_pass_30d',
    name: 'Voice Chat 30-Day Monthly Pass',
    category: 'calls',
    durationLabel: '30 Days Unlimited',
    durationDays: 30,
    usdPrice: 2.99,
    pointsCost: 30,
    description: 'Unlimited voice calls with all matches for a full month',
    badge: 'Best Monthly',
    iconName: 'PhoneCall',
  },

  // 2. Video Chat Passes (without needing VIP)
  {
    key: 'video_pass_7d',
    name: 'HD Video Chat 7-Day Pass',
    category: 'calls',
    durationLabel: '7 Days Unlimited',
    durationDays: 7,
    usdPrice: 1.99,
    pointsCost: 20,
    description: 'Face-to-face HD private video calls with camera filters & night mode for 7 days',
    badge: 'Hot Video 🔥',
    iconName: 'Video',
  },
  {
    key: 'video_pass_30d',
    name: 'HD Video Chat 30-Day Pass',
    category: 'calls',
    durationLabel: '30 Days Unlimited',
    durationDays: 30,
    usdPrice: 3.99,
    pointsCost: 40,
    description: 'Full monthly video dates access with zero restrictions',
    badge: 'Video Pro',
    iconName: 'Camera',
  },

  // 3. Chat Wallpapers (without needing VIP)
  {
    key: 'wallpaper_single',
    name: 'Custom Chat Wallpaper (Single Theme)',
    category: 'wallpaper',
    durationLabel: 'Permanent Unlock',
    usdPrice: 0.79,
    pointsCost: 8,
    description: 'Permanently unlock any VIP or custom uploaded wallpaper theme for your chat rooms',
    badge: 'Permanent 🎨',
    iconName: 'Image',
  },
  {
    key: 'all_wallpapers',
    name: 'All Chat Wallpapers All-Access',
    category: 'wallpaper',
    durationLabel: 'Permanent Lifetime Access',
    usdPrice: 1.99,
    pointsCost: 20,
    description: 'Unlock all 8+ current and all future animated, neon, and aesthetic chat wallpapers forever',
    badge: 'Best Value',
    iconName: 'Palette',
  },

  // 4. Match Chats & Messaging (without needing VIP)
  {
    key: 'chats_pass_14d',
    name: 'Unlimited Match Chats 14-Day Pass',
    category: 'chats',
    durationLabel: '14 Days Unlimited',
    durationDays: 14,
    usdPrice: 1.49,
    pointsCost: 15,
    description: 'Chat with unlimited verified singles without 3-week basic quota restrictions',
    badge: 'Chat Booster 💬',
    iconName: 'MessageSquare',
  },
  {
    key: 'chats_pack_25',
    name: '25 Direct Chats Booster Pack',
    category: 'chats',
    durationLabel: 'No Expiry (25 Chats)',
    usdPrice: 0.79,
    pointsCost: 8,
    description: 'Add 25 extra chat conversations to your account that never expire',
    badge: 'Starter Pack',
    iconName: 'MessageCircle',
  },

  // 5. Reels & Stories Posts (without needing VIP)
  {
    key: 'posts_pack_10',
    name: '10 Extra Reels & Stories Posts Booster',
    category: 'posts',
    durationLabel: '30 Days Validity',
    durationDays: 30,
    usdPrice: 0.79,
    pointsCost: 8,
    description: 'Publish 10 extra video reels or photo stories beyond basic quota',
    badge: 'Creator Pack 📸',
    iconName: 'Flame',
  },

  // 6. Couples Games & Intimacy Cards (without needing VIP)
  {
    key: 'spicy_games_1day',
    name: '1-Day Extra Spicy & Nastiest Games Momentum Pass',
    category: 'games',
    durationLabel: '24 Hours Momentum',
    durationDays: 1,
    usdPrice: 1.00,
    pointsCost: 10,
    description: 'Instant 24h all-access to all Extra Spicy, Vybing & Nastiest Couple Challenges, 10-Device Party Mode & Naughty Wheel',
    badge: 'Momentum 24H 🌶️',
    iconName: 'Flame',
  },
  {
    key: 'spicy_decks',
    name: '100+ Couples Games & Intimacy Cards (14 Days)',
    category: 'games',
    durationLabel: '14 Days All-Access',
    durationDays: 14,
    usdPrice: 1.99,
    pointsCost: 20,
    description: 'Access spicy couples question decks, truth/dare, and retro 70s/80s music trivia',
    badge: 'Intimacy 🎮',
    iconName: 'Gamepad2',
  },

  // 7. Live DJ Music Jam Sessions (without needing VIP)
  {
    key: 'music_jams',
    name: 'Live Music DJ Jam Sessions Pass',
    category: 'music',
    durationLabel: '14 Days Unlimited',
    durationDays: 14,
    usdPrice: 1.29,
    pointsCost: 12,
    description: 'Stream unlimited lo-fi/cyberpunk beats & sync live audio rooms with your soulmate',
    badge: 'Audio Sync 🎧',
    iconName: 'Music',
  },

  // 8. Ad-Free & Continuous Love Music Pass ($3.89 Monthly)
  {
    key: 'ad_free_monthly',
    name: 'Escape Pop-Up Ads & Continuous Love Music Pass',
    category: 'music',
    durationLabel: '30 Days Ad-Free Monthly',
    durationDays: 30,
    usdPrice: 3.89,
    pointsCost: 38,
    description: 'Escape pop-up ads forever. Continuous streaming of trending love songs with zero interruptions for 30 days',
    badge: 'Zero Ads 🚫',
    iconName: 'Tv',
  },
];

export interface ArcadeGameCatalogItem {
  id: ArcadeGameId;
  mode: 'couples' | 'singles';
  coupleTab?: 'wheel' | 'aviator_crash' | 'cards' | 'social_viral' | 'dice' | 'quiz';
  title: string;
  subtitle: string;
  teaser: string;
}

export const ARCADE_GAME_CATALOG: ArcadeGameCatalogItem[] = [
  {
    id: 'wheel',
    mode: 'couples',
    coupleTab: 'wheel',
    title: '4×360° Aviator Wheel',
    subtitle: 'Couples · Blind Spin & 3D Flip',
    teaser: '12 escalating dares with tactile peg audio & unknown 4-turn lock.',
  },
  {
    id: 'aviator_crash',
    mode: 'couples',
    coupleTab: 'aviator_crash',
    title: 'Aviator Heat Crash',
    subtitle: 'Couples · Unknown Multiplier',
    teaser: 'Lock in your intensity multiplier up to 12.0x before the crash point.',
  },
  {
    id: 'cards',
    mode: 'couples',
    coupleTab: 'cards',
    title: 'Endless Truth & Dare',
    subtitle: 'Couples · 6 Heat Card Decks',
    teaser: 'Zero-repeat Truth, Dare & Midnight Desire cards scaled by heat.',
  },
  {
    id: 'social_viral',
    mode: 'couples',
    coupleTab: 'social_viral',
    title: 'Viral Social Quests',
    subtitle: 'Couples · TikTok & 10 Fingers',
    teaser: 'Trending Reels challenges + interactive Put A Finger Down confessions.',
  },
  {
    id: 'dice',
    mode: 'couples',
    coupleTab: 'dice',
    title: 'Craving Dice',
    subtitle: 'Couples · Twin Sensual Dice',
    teaser: 'Roll action + body-zone dice for endless spontaneous commands.',
  },
  {
    id: 'quiz',
    mode: 'couples',
    coupleTab: 'quiz',
    title: 'Who Knows Me Best?',
    subtitle: 'Couples · Intimacy Quiz',
    teaser: 'Attunement questions & relationship insights tailored to your tier.',
  },
  {
    id: 'singles_quiz',
    mode: 'singles',
    title: 'Singles Icebreaker Quiz',
    subtitle: 'Singles · Vibe Match Test',
    teaser: 'Answer vibe & date-night prompts to discover top compatible matches.',
  },
  {
    id: 'singles_cards',
    mode: 'singles',
    title: 'Get to Know Twogether',
    subtitle: 'Singles · 2-Player VR Cards',
    teaser: 'Live 2-player multiplayer card rounds inside VR Lounge or DMs.',
  },
];

export interface GameDurationOption {
  id: GamePlanDurationId;
  shortLabel: string;
  label: string;
  durationMs: number;
  perGameUsd: number;
  allGamesBundleUsd: number;
  heatCeilingLabel: string;
}

export const GAME_DURATION_OPTIONS: GameDurationOption[] = [
  {
    id: 'daily',
    shortLabel: '1-Day',
    label: '1 Day (24h)',
    durationMs: 24 * 60 * 60 * 1000,
    perGameUsd: 0.14,
    allGamesBundleUsd: 1.00,
    heatCeilingLabel: 'Spicy · Most Spicy (3.5x)',
  },
  {
    id: 'weekly',
    shortLabel: '7-Day',
    label: '7 Days Weekly',
    durationMs: 7 * 24 * 60 * 60 * 1000,
    perGameUsd: 0.49,
    allGamesBundleUsd: 3.50,
    heatCeilingLabel: 'Hot & Extra Hot (6.5x)',
  },
  {
    id: 'two_weeks',
    shortLabel: '14-Day',
    label: '14 Days Bi-Weekly',
    durationMs: 14 * 24 * 60 * 60 * 1000,
    perGameUsd: 0.99,
    allGamesBundleUsd: 7.00,
    heatCeilingLabel: 'Hot & Extra Hot (6.5x)',
  },
  {
    id: 'monthly',
    shortLabel: '30-Day',
    label: '30 Days Monthly',
    durationMs: 30 * 24 * 60 * 60 * 1000,
    perGameUsd: 1.99,
    allGamesBundleUsd: 14.50,
    heatCeilingLabel: 'Extremely Hot VIP (12.0x)',
  },
  {
    id: 'yearly',
    shortLabel: '1-Year',
    label: '1 Year (365 Days)',
    durationMs: 365 * 24 * 60 * 60 * 1000,
    perGameUsd: 13.99,
    allGamesBundleUsd: 99.50,
    heatCeilingLabel: 'All 6 Tiers Endless (12.0x)',
  },
];

export function getDurationOption(durationId: GamePlanDurationId): GameDurationOption {
  return GAME_DURATION_OPTIONS.find((opt) => opt.id === durationId) || GAME_DURATION_OPTIONS[0];
}

export interface ArcadeCheckoutQuote {
  duration: GameDurationOption;
  selectedGameIds: ArcadeGameId[];
  effectiveUnlockedIds: ArcadeGameId[];
  rawSumUsd: number;
  finalUsd: number;
  isAllGamesBundle: boolean;
  bundleCapTriggered: boolean;
  bundleSavingsUsd: number;
  summaryTitle: string;
}

export function calculateArcadeCheckout(
  selectedIds: ArcadeGameId[],
  durationId: GamePlanDurationId,
  forceAllBundle = false
): ArcadeCheckoutQuote {
  const duration = getDurationOption(durationId);
  const validSet = new Set<ArcadeGameId>(
    selectedIds.filter((id) => ARCADE_GAME_CATALOG.some((item) => item.id === id))
  );
  const uniqueIds = Array.from(validSet);
  const allGameIds = ARCADE_GAME_CATALOG.map((g) => g.id);

  const perGameCents = Math.round(duration.perGameUsd * 100);
  const allBundleCents = Math.round(duration.allGamesBundleUsd * 100);
  const rawIfAllSeparateCents = allGameIds.length * perGameCents;

  if (forceAllBundle || uniqueIds.length >= allGameIds.length) {
    const rawIfSeparate = Number((rawIfAllSeparateCents / 100).toFixed(2));
    return {
      duration,
      selectedGameIds: allGameIds,
      effectiveUnlockedIds: allGameIds,
      rawSumUsd: rawIfSeparate,
      finalUsd: duration.allGamesBundleUsd,
      isAllGamesBundle: true,
      bundleCapTriggered: false,
      bundleSavingsUsd: Math.max(0, Number(((rawIfAllSeparateCents - allBundleCents) / 100).toFixed(2))),
      summaryTitle: `All 8 Games Bundle (${duration.shortLabel})`,
    };
  }

  const rawSumCents = uniqueIds.length * perGameCents;
  const rawSumUsd = Number((rawSumCents / 100).toFixed(2));
  const bundleCapTriggered = uniqueIds.length > 0 && rawSumCents >= allBundleCents;
  const finalUsd = bundleCapTriggered ? duration.allGamesBundleUsd : rawSumUsd;
  const effectiveUnlockedIds = bundleCapTriggered ? allGameIds : uniqueIds;
  const isAllGamesBundle = bundleCapTriggered;
  const bundleSavingsUsd = bundleCapTriggered
    ? Math.max(0, Number(((rawIfAllSeparateCents - allBundleCents) / 100).toFixed(2)))
    : 0;

  let summaryTitle = `0 Games Selected (${duration.shortLabel})`;
  if (bundleCapTriggered) {
    summaryTitle = `All 8 Games Capped Bundle (${duration.shortLabel})`;
  } else if (uniqueIds.length === 1) {
    const single = ARCADE_GAME_CATALOG.find((g) => g.id === uniqueIds[0]);
    summaryTitle = `${single ? single.title : '1 Game'} (${duration.shortLabel})`;
  } else if (uniqueIds.length > 1) {
    summaryTitle = `${uniqueIds.length} Games × $${duration.perGameUsd.toFixed(2)} (${duration.shortLabel})`;
  }

  return {
    duration,
    selectedGameIds: uniqueIds,
    effectiveUnlockedIds,
    rawSumUsd,
    finalUsd,
    isAllGamesBundle,
    bundleCapTriggered,
    bundleSavingsUsd,
    summaryTitle,
  };
}

export const UNLOCKED_GAMES_STORAGE_KEY = 'twogether_unlocked_games_v1';

export function loadActiveUnlockedGamesMap(): Partial<Record<ArcadeGameId, GameUnlockEntry>> {
  try {
    const raw = localStorage.getItem(UNLOCKED_GAMES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const now = Date.now();
    const cleaned: Partial<Record<ArcadeGameId, GameUnlockEntry>> = {};
    for (const key of Object.keys(parsed) as ArcadeGameId[]) {
      const entry = parsed[key];
      if (entry && typeof entry.expiresAtMs === 'number' && entry.expiresAtMs > now) {
        cleaned[key] = entry;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

export function saveUnlockedGamesMap(map: Partial<Record<ArcadeGameId, GameUnlockEntry>>): void {
  try {
    localStorage.setItem(UNLOCKED_GAMES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

