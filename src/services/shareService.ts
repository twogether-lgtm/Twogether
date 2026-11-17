import { SoulProfile } from '../types';

export interface SharePayload {
  title: string;
  text: string;
  url: string;
  type: 'profile' | 'jam_session';
  profile?: SoulProfile;
  jamSession?: {
    title: string;
    artist?: string;
    genre?: string;
    roomName?: string;
    activeListeners?: number;
    coverUrl?: string;
    flag?: string;
  };
}

/**
 * Checks if the browser Web Share API is available in the current context.
 */
export function isBrowserShareSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/**
 * Executes browser share via navigator.share with safety checks.
 */
export async function executeBrowserShare(payload: SharePayload): Promise<{
  success: boolean;
  sharedViaWebShare: boolean;
  canceled?: boolean;
  error?: string;
}> {
  if (isBrowserShareSupported()) {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      return { success: true, sharedViaWebShare: true };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { success: false, sharedViaWebShare: true, canceled: true };
      }
      return { success: false, sharedViaWebShare: false, error: err?.message || 'Share failed' };
    }
  }
  return { success: false, sharedViaWebShare: false };
}

/**
 * Creates share payload for a Soul Profile.
 */
export function createProfileSharePayload(profile: SoulProfile): SharePayload {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://twogether.app';
  const url = `${baseUrl}/?tab=singles&profileId=${encodeURIComponent(profile.id)}`;
  const title = `Meet ${profile.name} on Twogether`;
  const text = `Check out ${profile.name} (${profile.age}) on Twogether! Match score: ${profile.matchScore}% · Top musical vibe: ${profile.topGenres?.slice(0, 2).join(', ') || 'Eclectic'}. Connect & sync beats:`;

  return {
    title,
    text,
    url,
    type: 'profile',
    profile,
  };
}

/**
 * Creates share payload for a 3D VR Music Jam Session.
 */
export function createJamSessionSharePayload(session: {
  title: string;
  artist?: string;
  genre?: string;
  roomName?: string;
  activeListeners?: number;
  coverUrl?: string;
  flag?: string;
}): SharePayload {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://twogether.app';
  const url = `${baseUrl}/?tab=beats&jamSession=${encodeURIComponent(session.title)}`;
  const title = `🎧 Live 3D VR Music Jam: ${session.title}`;
  const text = `Join my Live 3D VR Music Jam Session on Twogether! Vibrating to "${session.title}" by ${session.artist || 'Trending Artists'} in the ${session.roomName || 'Neon Love Lounge'}. Listen & sync beats together:`;

  return {
    title,
    text,
    url,
    type: 'jam_session',
    jamSession: session,
  };
}

/**
 * Generates platform-specific direct share URLs.
 */
export function getPlatformShareUrl(platform: 'whatsapp' | 'twitter' | 'telegram' | 'facebook' | 'email' | 'sms', payload: SharePayload): string {
  const encodedUrl = encodeURIComponent(payload.url);
  const fullText = `${payload.text} ${payload.url}`;
  const encodedFullText = encodeURIComponent(fullText);
  const encodedTextOnly = encodeURIComponent(payload.text);

  switch (platform) {
    case 'whatsapp':
      return `https://api.whatsapp.com/send?text=${encodedFullText}`;
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodedTextOnly}&url=${encodedUrl}`;
    case 'telegram':
      return `https://t.me/share/url?url=${encodedUrl}&text=${encodedTextOnly}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case 'email':
      return `mailto:?subject=${encodeURIComponent(payload.title)}&body=${encodeURIComponent(`${payload.text}\n\n${payload.url}`)}`;
    case 'sms':
      return `sms:?body=${encodedFullText}`;
  }
}
