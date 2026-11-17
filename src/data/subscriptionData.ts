import { ChatWallpaper } from '../types';

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
  daily: '$0.99 / 24 hours (1-Day Momentum Pass)',
  weekly: '$2.49 / week (Fair & Accessible)',
  twoWeeks: '$3.99 / 2 weeks (Bi-Weekly Pass)',
  adFreeMonthly: '$3.89 / month (Escape 5-Minute Pop-Up Ads & Zero Interruptions)',
  monthly: '$5.99 / month (Well-Priced VIP)',
  yearly: '$29.99 / year (Best Value)',
  weeklyTrial: '7-Day Free Trial Available',
  currencyNote: 'All subscriptions are stated in USD ($) but can be paid with any local currency equivalent at live bank rates. We pride ourselves on reasonable, fair pricing — not expensive, not cheap.',
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
    usdPrice: 0.99,
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
    name: 'Ad-Free 5-Min Escape & Continuous Love Music Pass',
    category: 'music',
    durationLabel: '30 Days Ad-Free Monthly',
    durationDays: 30,
    usdPrice: 3.89,
    pointsCost: 38,
    description: 'Escape all 5-minute video and pop-up ads forever. Continuous streaming of trending love songs with zero interruptions for 30 days',
    badge: 'Zero Ads 🚫',
    iconName: 'Tv',
  },
];

