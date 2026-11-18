import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Radio,
  Sparkles,
  Music,
  Search,
  Globe,
  Plus,
  Sliders,
  Headphones,
  Calendar,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  Lock,
  Unlock,
  KeyRound,
  Shield,
  Copy,
  Check,
  LogIn,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { GlassCard } from './GlassCard';
import { socketService } from '../services/socket';
import {
  mockSpectatorSocketService,
  JamSpectatorsSnapshot,
} from '../services/mockSpectatorSocketService';
import { JamTrack } from '../types';
import { Simulated3DVREnvironment } from './Simulated3DVREnvironment';
import { AudioReactiveVisualizerOverlay, VisualizerMode } from './AudioReactiveVisualizerOverlay';
import { JamVocalVideoFeed } from './JamVocalVideoFeed';
import { ScheduledJamsPanel } from './ScheduledJamsPanel';
import { TRENDING_LOVE_SONGS } from '../data/loveSongsData';
import { loveSongAudioService } from '../services/loveSongAudioService';

const GLOBAL_REGIONS = [
  { id: 'all', label: '🌍 All World Love Hits', subtitle: 'Trending Worldwide Romance' },
  { id: 'kenya', label: '🇰🇪 Kenya (East African Love)', subtitle: 'Bien, Otile Brown, Sauti Sol & Nyashinski' },
  { id: 'africa', label: '🇳🇬 West Africa (Afrobeats)', subtitle: 'Burna Boy, Rema, Wizkid & Tems' },
  { id: 'south_africa', label: '🇿🇦 South Africa (Amapiano Love)', subtitle: 'Tyla & Kabza De Small' },
  { id: 'latin', label: '💃 Latin America (Reggaeton & Bachata)', subtitle: 'Bad Bunny, Karol G & Romeo Santos' },
  { id: 'brazil', label: '🇧🇷 Brazil (Bossa Nova & MPB)', subtitle: 'Astrud Gilberto, Anitta & Jobim' },
  { id: 'global_us_uk', label: '🇺🇸 Billboard Top (US & UK)', subtitle: 'Teddy Swims, Sabrina & Billie Eilish' },
  { id: 'asia_kpop', label: '🇰🇷 East Asia (K-Pop & Tokyo)', subtitle: 'Jungkook, NewJeans & Fujii Kaze' },
  { id: 'south_asia', label: '🇮🇳 South Asia (Bollywood & Desi)', subtitle: 'Arijit Singh, Diljit Dosanjh & Pasoori' },
  { id: 'caribbean', label: '🇯🇲 Caribbean (Lovers Rock)', subtitle: 'Bob Marley, Chronixx & Shenseea' },
  { id: 'europe', label: '🇫🇷 Europe (French & Italian)', subtitle: 'Aya Nakamura, Mahmood & Blanco' },
  { id: 'middle_east', label: '🇪🇬 Middle East (Arab Soul)', subtitle: 'Amr Diab & Elyanna' },
];

interface JamSessionScreenProps {
  initialRoomId?: string | null;
  currentUserName?: string;
  currentUserAvatar?: string;
}

function parseJamRoomInput(raw?: string | null): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  let candidate = trimmed;
  if (trimmed.includes('jamRoom=') || trimmed.includes('jamSession=')) {
    try {
      const queryPart = trimmed.includes('?') ? trimmed.split('?')[1] : trimmed;
      const params = new URLSearchParams(queryPart);
      candidate = params.get('jamRoom') || params.get('jamSession') || trimmed;
    } catch {
      // keep raw
    }
  }
  return candidate
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48);
}

function generatePrivateJamRoomId(): string {
  return `PRIVATE-JAM-${Math.floor(1000 + Math.random() * 9000)}`;
}

export const JamSessionScreen: React.FC<JamSessionScreenProps> = ({
  initialRoomId,
  currentUserName,
  currentUserAvatar,
}) => {
  // Mode Toggle: 2D Collaborative Board vs 3D Simulated VR Lounge
  const [viewMode, setViewMode] = useState<'2d_board' | '3d_vr'>('2d_board');

  // Audio Reactive Visualizer Overlay State
  const [isVisualizerEnabled, setIsVisualizerEnabled] = useState<boolean>(true);
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('spectrum_bars');
  const [visualizerColor, setVisualizerColor] = useState<'neon' | 'rose' | 'gold'>('neon');

  // Initial seed with trending Kenyan & International love songs
  const initialLoveTracks: JamTrack[] = TRENDING_LOVE_SONGS.map((ls) => ({
    id: ls.id,
    title: `${ls.title} (${ls.flag})`,
    artist: ls.artist,
    coverUrl: ls.coverUrl,
    audioUrl: ls.audioUrl,
    duration: ls.duration,
    genre: `${ls.genre} • ${ls.year}`,
    bpm: ls.bpm,
  }));

  const [tracks, setTracks] = useState<JamTrack[]>(initialLoveTracks);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [customSongTitle, setCustomSongTitle] = useState<string>('');
  const [customArtist, setCustomArtist] = useState<string>('');
  const [customAudioUrl, setCustomAudioUrl] = useState<string>('');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);

  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [position, setPosition] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.8);
  const [listeners, setListeners] = useState<number>(4);
  const [spectatorsSnapshot, setSpectatorsSnapshot] = useState<JamSpectatorsSnapshot>(() =>
    mockSpectatorSocketService.getSnapshot(initialLoveTracks[0]?.id || 'track_01')
  );
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);

  // Room-Level Security State (Private 4-Digit Numeric Passcode)
  const [jamDeviceId] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem('twogether_jam_device_id');
      if (saved) return saved;
      const created = `jamdev_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem('twogether_jam_device_id', created);
      return created;
    } catch {
      return `jamdev_${Math.random().toString(36).slice(2, 10)}`;
    }
  });
  const [roomId, setRoomId] = useState<string>(() => parseJamRoomInput(initialRoomId) || 'lofi-beats-room');
  const [isRoomPrivate, setIsRoomPrivate] = useState<boolean>(false);
  const [isRoomHost, setIsRoomHost] = useState<boolean>(false);
  const [hasRoomAccess, setHasRoomAccess] = useState<boolean>(() => !parseJamRoomInput(initialRoomId));
  const [roomHostName, setRoomHostName] = useState<string>('Session Host');
  const [isCheckingRoomSecurity, setIsCheckingRoomSecurity] = useState<boolean>(Boolean(parseJamRoomInput(initialRoomId)));
  const [verifiedRoomPin, setVerifiedRoomPin] = useState<string>('');

  // Host Passcode Setup Modal State
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);
  const [hostPinDraft, setHostPinDraft] = useState<string>('');
  const [showHostPinDigits, setShowHostPinDigits] = useState<boolean>(false);
  const [securityModalError, setSecurityModalError] = useState<string | null>(null);
  const [isSavingSecurity, setIsSavingSecurity] = useState<boolean>(false);
  const [copiedPrivateInvite, setCopiedPrivateInvite] = useState<boolean>(false);

  // Guest PIN Entry & Join Room Input State
  const [guestPinInput, setGuestPinInput] = useState<string>('');
  const [showGuestPinDigits, setShowGuestPinDigits] = useState<boolean>(false);
  const [guestPinError, setGuestPinError] = useState<string | null>(null);
  const [pinShakeKey, setPinShakeKey] = useState<number>(0);
  const [isVerifyingGuestPin, setIsVerifyingGuestPin] = useState<boolean>(false);
  const [joinRoomInput, setJoinRoomInput] = useState<string>('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tracksRef = useRef<JamTrack[]>(tracks);
  const currentTrackIndexRef = useRef<number>(currentTrackIndex);
  tracksRef.current = tracks;
  currentTrackIndexRef.current = currentTrackIndex;

  const jamOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://ais-dev-z4kw2q57puokic7zgdxqel-951943196492.europe-west2.run.app';
  const jamInviteUrl = `${jamOrigin}/?tab=beats&jamRoom=${encodeURIComponent(roomId)}`;

  // Fetch World Music Tracks / Search
  const fetchTracks = (query = '', genre = 'all', region = 'all') => {

    // 1. Instant match from comprehensive worldwide love songs catalog
    const matchedLoveTracks: JamTrack[] = TRENDING_LOVE_SONGS.filter((s) => {
      const matchRegion =
        region === 'all' ||
        s.region === region ||
        s.country === region ||
        s.countryLabel.toLowerCase().includes(region.toLowerCase());
      const matchGenre = genre === 'all' || s.genre.toLowerCase().includes(genre.toLowerCase());
      const matchQuery =
        !query ||
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        s.artist.toLowerCase().includes(query.toLowerCase()) ||
        s.countryLabel.toLowerCase().includes(query.toLowerCase()) ||
        s.language.toLowerCase().includes(query.toLowerCase()) ||
        s.genre.toLowerCase().includes(query.toLowerCase());

      return matchRegion && matchGenre && matchQuery;
    }).map((ls) => ({
      id: ls.id,
      title: `${ls.title} (${ls.flag})`,
      artist: `${ls.artist} • ${ls.countryLabel}`,
      coverUrl: ls.coverUrl,
      audioUrl: ls.audioUrl,
      duration: ls.duration,
      genre: `${ls.genre} • ${ls.year}`,
      bpm: ls.bpm,
    }));

    if (matchedLoveTracks.length > 0) {
      setTracks(matchedLoveTracks);
      setCurrentTrackIndex(0);
    }

    // 2. Also search backend endpoint
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (genre && genre !== 'all') params.append('genre', genre);
    if (region && region !== 'all') params.append('region', region);

    fetch(`/api/music/search?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.tracks && data.tracks.length > 0) {
          if (matchedLoveTracks.length === 0) {
            setTracks(data.tracks);
            setCurrentTrackIndex(0);
          }
        }
      })
      .catch((err) => console.error('Tracks fetch error:', err));
  };

  useEffect(() => {
    fetchTracks(searchQuery, 'all', selectedRegion);
  }, [selectedRegion]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTracks(searchQuery, 'all', selectedRegion);
  };

  const handleAddCustomSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSongTitle.trim()) return;

    const newSong: JamTrack = {
      id: `user_added_${Date.now()}`,
      title: customSongTitle.trim(),
      artist: customArtist.trim() || 'Global Artist Request',
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
      audioUrl:
        customAudioUrl.trim() ||
        'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c2a820875c.mp3?filename=funky-disco-10452.mp3',
      duration: 210,
      genre: 'Custom World Soulmate Request 🎶',
      bpm: 120,
    };

    setTracks((prev) => [newSong, ...prev]);
    setCustomSongTitle('');
    setCustomArtist('');
    setCustomAudioUrl('');
    setShowCustomModal(false);
    handleSelectTrack(0);
  };

  const currentTrack = tracks[currentTrackIndex] || {
    id: 'track_01',
    title: 'Neon Midnight Pulse',
    artist: 'Cyber Aura ft. Luna',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    duration: 180,
    genre: 'Cyberwave / Synth',
    bpm: 120,
  };

  // Fetch Room Security Status before joining Socket Room
  useEffect(() => {
    let cancelled = false;
    setIsCheckingRoomSecurity(true);
    setGuestPinError(null);
    setGuestPinInput('');

    fetch(`/api/jam/room/${encodeURIComponent(roomId)}/security?deviceId=${encodeURIComponent(jamDeviceId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const priv = Boolean(data?.isPrivate);
        const access = priv ? Boolean(data?.hasAccess) : true;
        setIsRoomPrivate(priv);
        setIsRoomHost(Boolean(data?.isHost));
        setRoomHostName(data?.hostName || 'Session Host');
        setHasRoomAccess(access);
        if (!access) {
          setIsPlaying(false);
          if (audioRef.current) audioRef.current.pause();
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsRoomPrivate(false);
          setHasRoomAccess(true);
        }
      })
      .finally(() => {
        if (!cancelled) setIsCheckingRoomSecurity(false);
      });

    return () => {
      cancelled = true;
    };
  }, [roomId, jamDeviceId]);

  // Socket Listener for Music State Sync, Room Listeners, Reactions & Security Gate
  useEffect(() => {
    const handleAuthRequired = (payload: { roomId?: string; hostName?: string; message?: string }) => {
      if (payload?.roomId && payload.roomId !== roomId) return;
      setIsRoomPrivate(true);
      setHasRoomAccess(false);
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.pause();
      if (payload?.hostName) setRoomHostName(payload.hostName);
      if (payload?.message) setGuestPinError(payload.message);
    };

    const handleSecurityUpdated = (payload: { roomId?: string; isPrivate?: boolean; hostName?: string }) => {
      if (payload?.roomId && payload.roomId !== roomId) return;
      setIsRoomPrivate(Boolean(payload?.isPrivate));
      if (payload?.hostName) setRoomHostName(payload.hostName);
      if (!payload?.isPrivate) {
        setHasRoomAccess(true);
        setGuestPinError(null);
      }
    };

    socketService.socket.on('vr-room-auth-required', handleAuthRequired);
    socketService.socket.on('jam-room-security-updated', handleSecurityUpdated);

    if (!hasRoomAccess) {
      return () => {
        socketService.socket.off('vr-room-auth-required', handleAuthRequired);
        socketService.socket.off('jam-room-security-updated', handleSecurityUpdated);
      };
    }

    const joinJamRoom = () => {
      socketService.joinVRLounge(
        roomId,
        currentUserName || undefined,
        currentUserAvatar || undefined,
        jamDeviceId,
        verifiedRoomPin || undefined
      );
    };
    joinJamRoom();
    socketService.socket.on('connect', joinJamRoom);

    const handleMusicChanged = (data: { isPlaying?: boolean; position?: number; trackId?: string }) => {
      if (typeof data.isPlaying === 'boolean') {
        setIsPlaying(data.isPlaying);
      }
      if (data.position !== undefined) {
        setPosition(data.position);
        if (audioRef.current) {
          audioRef.current.currentTime = data.position;
        }
      }
      if (data.trackId && tracksRef.current.length > 0) {
        const idx = tracksRef.current.findIndex((t) => t.id === data.trackId);
        if (idx !== -1 && idx !== currentTrackIndexRef.current) {
          setCurrentTrackIndex(idx);
        }
      }
    };

    const handleNewReaction = (data: { id?: string; emoji: string; x?: number }) => {
      setReactions((prev) => [
        ...prev.slice(-15),
        { id: data.id || `rx_${Date.now()}_${Math.random()}`, emoji: data.emoji, x: data.x || Math.random() * 80 + 10 },
      ]);
    };

    const handleRoomState = (data: { users?: unknown[] } | unknown[]) => {
      const usersList = Array.isArray(data) ? data : data?.users;
      if (Array.isArray(usersList)) {
        setListeners(Math.max(1, usersList.length));
      }
    };

    socketService.socket.on('music-state-changed', handleMusicChanged);
    socketService.socket.on('new-reaction', handleNewReaction);
    socketService.socket.on('vr-room-state', handleRoomState);
    socketService.socket.on('vr-users-update', handleRoomState);

    return () => {
      socketService.socket.off('vr-room-auth-required', handleAuthRequired);
      socketService.socket.off('jam-room-security-updated', handleSecurityUpdated);
      socketService.socket.off('connect', joinJamRoom);
      socketService.socket.off('music-state-changed', handleMusicChanged);
      socketService.socket.off('new-reaction', handleNewReaction);
      socketService.socket.off('vr-room-state', handleRoomState);
      socketService.socket.off('vr-users-update', handleRoomState);
    };
  }, [roomId, hasRoomAccess, jamDeviceId, currentUserName, currentUserAvatar, verifiedRoomPin]);

  // Real-time Mock + Live Socket Subscription for Current Spectators viewing this specific Jam
  useEffect(() => {
    if (!hasRoomAccess) return;
    const activeJamId = currentTrack.id || 'track_01';
    const unsubscribe = mockSpectatorSocketService.subscribe(activeJamId, (snapshot) => {
      setSpectatorsSnapshot(snapshot);
    });
    return () => {
      unsubscribe();
    };
  }, [currentTrack.id, hasRoomAccess]);

  // Audio Playback Sync
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying && hasRoomAccess) {
      loveSongAudioService.pause();
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrackIndex, hasRoomAccess]);

  // Volume Sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Audio Position Updates
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setPosition(audioRef.current.currentTime);
    }
  };

  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    socketService.syncMusic(roomId, currentTrack.id, position, nextState);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPos = parseFloat(e.target.value);
    setPosition(newPos);
    if (audioRef.current) {
      audioRef.current.currentTime = newPos;
    }
    socketService.syncMusic(roomId, currentTrack.id, newPos, isPlaying);
  };

  const handleSelectTrack = (index: number) => {
    if (!tracks[index]) return;
    setCurrentTrackIndex(index);
    setPosition(0);
    setIsPlaying(true);
    socketService.syncMusic(roomId, tracks[index].id, 0, true);
  };

  const handleStartScheduledTrack = (trackId?: string, trackTitle?: string) => {
    const byId = trackId ? tracks.findIndex((t) => t.id === trackId) : -1;
    if (byId !== -1) {
      handleSelectTrack(byId);
      return;
    }
    if (trackTitle) {
      const normalized = trackTitle.toLowerCase();
      const byTitle = tracks.findIndex((t) => t.title.toLowerCase().includes(normalized));
      if (byTitle !== -1) {
        handleSelectTrack(byTitle);
        return;
      }
    }
    if (tracks.length > 0) {
      handleSelectTrack(currentTrackIndex);
    }
  };

  const sendReaction = useCallback((emoji: string) => {
    const x = Math.random() * 80 + 10;
    if (socketService.socket.connected) {
      socketService.sendReaction(roomId, emoji, x);
    } else {
      setReactions((prev) => [
        ...prev.slice(-15),
        { id: `local_${Date.now()}_${Math.random()}`, emoji, x },
      ]);
    }
  }, [roomId]);

  const handleSaveHostRoomSecurity = async (lockRoom: boolean, targetRoomId = roomId) => {
    setSecurityModalError(null);
    if (lockRoom && !/^\d{4}$/.test(hostPinDraft)) {
      setSecurityModalError('Please enter an exact 4-digit numeric passcode (0–9).');
      return;
    }

    setIsSavingSecurity(true);
    try {
      const res = await fetch(`/api/jam/room/${encodeURIComponent(targetRoomId)}/security`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPrivate: lockRoom,
          pin: lockRoom ? hostPinDraft : null,
          hostDeviceId: jamDeviceId,
          hostName: currentUserName || 'Jam Host',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setSecurityModalError(data?.message || 'Could not update room passcode settings.');
        return;
      }
      setRoomId(targetRoomId);
      setIsRoomPrivate(Boolean(data.isPrivate));
      setIsRoomHost(true);
      setHasRoomAccess(true);
      setRoomHostName(data.hostName || currentUserName || 'Jam Host');
      if (lockRoom) {
        setVerifiedRoomPin(hostPinDraft);
      } else {
        setVerifiedRoomPin('');
      }
      setIsSecurityModalOpen(false);
      setAudioNotice(
        lockRoom
          ? `🔒 Private Jam Room ${targetRoomId} locked with a 4-digit numeric passcode!`
          : `🔓 Room ${targetRoomId} is now unlocked and public.`
      );
      setTimeout(() => setAudioNotice(null), 4500);
    } catch {
      setSecurityModalError('Network error saving room passcode. Please retry.');
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const triggerPinErrorShake = () => {
    setPinShakeKey((prev) => prev + 1);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([35, 30, 35]);
    }
  };

  const handleVerifyGuestPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuestPinError(null);
    if (!/^\d{4}$/.test(guestPinInput)) {
      setGuestPinError('Enter all 4 numeric digits (0–9) to join this private Jam Session.');
      triggerPinErrorShake();
      return;
    }
    setIsVerifyingGuestPin(true);
    try {
      const res = await fetch(`/api/jam/room/${encodeURIComponent(roomId)}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: guestPinInput,
          deviceId: jamDeviceId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.hasAccess) {
        setGuestPinError(data?.message || 'Incorrect 4-digit passcode. Access denied.');
        triggerPinErrorShake();
        return;
      }
      setVerifiedRoomPin(guestPinInput);
      setHasRoomAccess(true);
      setGuestPinInput('');
      setGuestPinError(null);
      setPinShakeKey(0);
      setAudioNotice(`🔓 Passcode verified! Welcome to Private Jam Room ${roomId}.`);
      setTimeout(() => setAudioNotice(null), 4000);
    } catch {
      setGuestPinError('Unable to verify passcode right now. Please try again.');
      triggerPinErrorShake();
    } finally {
      setIsVerifyingGuestPin(false);
    }
  };

  const handleSwitchJamRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const target = parseJamRoomInput(joinRoomInput);
    if (!target) return;
    setVerifiedRoomPin('');
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.pause();
    setRoomId(target);
    setJoinRoomInput('');
  };

  const handleOpenCreatePrivateRoom = () => {
    const freshPrivateId = roomId === 'lofi-beats-room' ? generatePrivateJamRoomId() : roomId;
    if (roomId === 'lofi-beats-room') {
      setRoomId(freshPrivateId);
      setHasRoomAccess(true);
      setIsRoomHost(true);
    }
    setSecurityModalError(null);
    setIsSecurityModalOpen(true);
  };

  const handleCopyPrivateInvite = async () => {
    try {
      await navigator.clipboard.writeText(jamInviteUrl);
      setCopiedPrivateInvite(true);
      setTimeout(() => setCopiedPrivateInvite(false), 2500);
    } catch {
      setAudioNotice(`Private invite link: ${jamInviteUrl}`);
      setTimeout(() => setAudioNotice(null), 4500);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  // Spin Random World Vibe
  const spinRandomWorldVibe = () => {
    if (tracks.length === 0) return;
    const randomIdx = Math.floor(Math.random() * tracks.length);
    handleSelectTrack(randomIdx);
    sendReaction('✨');
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#a855f7', '#ec4899', '#fbbf24'],
      });
    } catch {}
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Hidden Audio Element with Resilient Error Recovery */}
      <audio
        ref={audioRef}
        src={currentTrack.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onError={() => {
          setIsPlaying(false);
          setAudioNotice('Track stream unavailable — tap another beat or pad to jam.');
          setTimeout(() => setAudioNotice(null), 4000);
        }}
        onEnded={() => {
          if (tracks.length === 0) return;
          const nextIdx = (currentTrackIndex + 1) % tracks.length;
          handleSelectTrack(nextIdx);
        }}
      />

      {audioNotice && (
        <div className="px-4 py-2 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs font-mono flex items-center justify-between">
          <span>⚡ {audioNotice}</span>
          <button
            type="button"
            onClick={() => setAudioNotice(null)}
            className="text-amber-300 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Room-Level Privacy & 4-Digit Numeric Passcode Control Bar */}
      <GlassCard className="p-4 border border-purple-500/35 space-y-3" glowColor="purple">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                isRoomPrivate
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                  : 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
              }`}
            >
              {isRoomPrivate ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </div>

            <div className="text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-black text-white">
                  Room: <span className="text-cyan-300">{roomId}</span>
                </span>
                {isRoomPrivate ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/45 text-amber-200 text-[10px] font-mono font-bold">
                    🔒 PRIVATE • 4-DIGIT PIN REQUIRED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 text-[10px] font-mono font-bold">
                    🔓 PUBLIC OPEN JAM
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 font-sans">
                {isRoomPrivate
                  ? `Hosted by ${roomHostName} • Guests must enter the 4-digit numeric passcode before joining.`
                  : 'Lock your Jam Session with a 4-digit numeric password to invite only close friends.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleOpenCreatePrivateRoom}
              className={`px-3 py-2 rounded-xl font-mono text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all ${
                isRoomPrivate
                  ? 'bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 text-amber-200'
                  : 'bg-gradient-to-r from-amber-400 to-pink-500 text-black shadow-md hover:scale-[1.02]'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              {isRoomPrivate
                ? isRoomHost
                  ? 'Manage 4-Digit PIN'
                  : 'Room Security'
                : 'Set 4-Digit Room PIN'}
            </button>

            {isRoomPrivate && hasRoomAccess && (
              <button
                type="button"
                onClick={handleCopyPrivateInvite}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-mono font-bold text-white flex items-center gap-1.5 cursor-pointer transition-all"
                title="Copy Private Jam Session link (guests will still be prompted for the 4-digit PIN)"
              >
                {copiedPrivateInvite ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-300" />}
                {copiedPrivateInvite ? 'Invite Copied!' : 'Copy Private Link'}
              </button>
            )}

            <form onSubmit={handleSwitchJamRoom} className="flex items-center gap-1.5">
              <input
                type="text"
                value={joinRoomInput}
                onChange={(e) => setJoinRoomInput(e.target.value)}
                placeholder="Join Jam Room ID or link..."
                className="w-40 sm:w-48 px-2.5 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-black flex items-center gap-1 cursor-pointer transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                Join
              </button>
            </form>
          </div>
        </div>
      </GlassCard>

      {/* GUEST 4-DIGIT NUMERIC PASSCODE LOCK GATE */}
      {(isCheckingRoomSecurity || (isRoomPrivate && !hasRoomAccess)) ? (
        <GlassCard className="max-w-lg mx-auto p-6 sm:p-8 border-2 border-amber-400/50 text-center space-y-5 shadow-2xl" glowColor="purple">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-400/25 to-pink-500/25 border border-amber-400/50 flex items-center justify-center shadow-lg">
            <Shield className="w-8 h-8 text-amber-300" />
          </div>

          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-200 text-[10px] font-mono font-black uppercase tracking-widest">
              <Lock className="w-3 h-3" /> Private Jam Session Locked
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Enter 4-Digit Passcode to Join
            </h2>
            <p className="text-xs text-zinc-300 font-sans">
              Room <strong className="text-cyan-300 font-mono">{roomId}</strong> (hosted by{' '}
              <strong className="text-white">{roomHostName}</strong>) is secured with a 4-digit numeric password.
            </p>
          </div>

          {isCheckingRoomSecurity ? (
            <div className="py-4 text-xs font-mono text-cyan-300 animate-pulse">
              Checking room security status...
            </div>
          ) : (
            <form onSubmit={handleVerifyGuestPin} className="space-y-4">
              {/* Subtle Error Shake Container for 4-Digit Password Entry */}
              <motion.div
                key={`pin-entry-shake-${pinShakeKey}`}
                initial={pinShakeKey > 0 ? { x: 0 } : false}
                animate={
                  pinShakeKey > 0
                    ? { x: [0, -9, 9, -7, 7, -4, 4, 0] }
                    : { x: 0 }
                }
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="space-y-4"
              >
                {/* Visual 4-Digit Indicators */}
                <div className="flex items-center justify-center gap-3">
                  {[0, 1, 2, 3].map((slot) => {
                    const char = guestPinInput[slot] || '';
                    return (
                      <div
                        key={`guest-pin-box-${slot}`}
                        className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center text-xl font-mono font-black transition-all ${
                          guestPinError
                            ? 'bg-rose-500/15 border-rose-400/80 text-rose-200 shadow-md shadow-rose-500/15'
                            : char
                            ? 'bg-amber-400/15 border-amber-400 text-amber-200 shadow-md shadow-amber-500/15'
                            : 'bg-black/50 border-white/15 text-zinc-600'
                        }`}
                      >
                        {char ? (showGuestPinDigits ? char : '•') : '—'}
                      </div>
                    );
                  })}
                </div>

                <div className="relative max-w-xs mx-auto">
                  <input
                    type={showGuestPinDigits ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    autoFocus
                    value={guestPinInput}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setGuestPinInput(digitsOnly);
                      if (guestPinError) setGuestPinError(null);
                    }}
                    placeholder="Enter 4-digit PIN (e.g. 4829)"
                    className={`w-full px-4 py-3 pr-10 rounded-2xl bg-black/60 border text-center text-white font-mono text-base tracking-[0.35em] focus:outline-none transition-colors ${
                      guestPinError
                        ? 'border-rose-400 focus:border-rose-300'
                        : 'border-white/20 focus:border-amber-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowGuestPinDigits((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                    title={showGuestPinDigits ? 'Hide digits' : 'Show digits'}
                  >
                    {showGuestPinDigits ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>

              {guestPinError && (
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-400/50 text-rose-200 text-xs font-mono flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-300" />
                  <span>{guestPinError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setGuestPinInput('');
                    setGuestPinError(null);
                    setRoomId('lofi-beats-room');
                  }}
                  className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-mono font-bold text-zinc-300 cursor-pointer transition-all"
                >
                  Back to Public Jam
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingGuestPin || guestPinInput.length !== 4}
                  className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 text-black font-mono text-xs font-black shadow-lg disabled:opacity-50 cursor-pointer transition-all"
                >
                  {isVerifyingGuestPin ? 'Verifying PIN...' : 'Unlock & Join Session'}
                </button>
              </div>
            </form>
          )}
        </GlassCard>
      ) : (
      <>
      {/* World Music Search Bar & Gen-Z Hubs */}
      <GlassCard className="p-5 border border-cyan-500/30 space-y-4" glowColor="cyan">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search every music across the world (Lagos Afrobeats, Rio Phonk, Tokyo City Pop, UK Drill, K-Pop, 70s Soul...)"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-zinc-400 text-xs focus:outline-none focus:border-cyan-400 font-sans"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
            <button
              type="submit"
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-extrabold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" /> Search World
            </button>

            <button
              type="button"
              onClick={spinRandomWorldVibe}
              className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-amber-500 text-white font-extrabold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Spin World Vibe
            </button>

            <button
              type="button"
              onClick={() => setShowCustomModal(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-pink-500/20 border border-pink-500/40 text-pink-300 font-bold text-xs hover:bg-pink-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Request Song
            </button>

            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-purple-500/25 border border-purple-400/50 text-purple-200 font-bold text-xs hover:bg-purple-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-purple-500/20"
            >
              <Calendar className="w-3.5 h-3.5" /> Schedule Jam
            </button>
          </div>
        </form>

        {/* Worldwide Trending Love Songs & Music Hubs */}
        <div className="space-y-1.5 pt-1 border-t border-white/10">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span className="font-bold flex items-center gap-1.5 text-pink-300">
              <Headphones className="w-3.5 h-3.5 text-pink-400" /> Trending Love Songs Across The World:
            </span>
            <span className="text-[10px] text-zinc-500">12+ Continents & Worldwide Hits</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono no-scrollbar">
            {GLOBAL_REGIONS.map((reg) => {
              const isSelected = selectedRegion === reg.id;
              return (
                <button
                  key={reg.id}
                  onClick={() => setSelectedRegion(reg.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-400 to-purple-500 text-black shadow-lg shadow-cyan-500/20 font-black'
                      : 'bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10'
                  }`}
                >
                  <span>{reg.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {/* Header Banner & Mode Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono uppercase tracking-widest mb-2">
            <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            Synchronized Gen-Z World Jam & Love Lounge
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">SHARED WORLD BEATS & LOVE SONGS</h1>
          <p className="text-zinc-400 text-xs sm:text-sm">
            Listen to trending international & Kenyan love hits, DJ in real time, and explore in simulated 3D VR!
          </p>
        </div>

        {/* View Mode Toggle (2D Music Board vs 3D Simulated VR Lounge) */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1 rounded-2xl bg-black/60 border border-white/15 flex items-center gap-1 shadow-lg">
            <button
              onClick={() => setViewMode('2d_board')}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === '2d_board'
                  ? 'bg-gradient-to-r from-cyan-400 to-purple-500 text-black shadow-md shadow-cyan-500/30 font-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>2D Music Board</span>
            </button>

            <button
              onClick={() => setViewMode('3d_vr')}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === '3d_vr'
                  ? 'bg-gradient-to-r from-pink-500 to-amber-400 text-black shadow-md shadow-pink-500/30 font-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-black" />
              <span>3D Simulated VR Lounge</span>
            </button>
          </div>

          {/* Live Listeners, Current Spectators & Volume Controls */}
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-2xl backdrop-blur-xl flex-wrap">
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-16 sm:w-20 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                title="Volume"
              />
            </div>

            <div className="h-5 w-px bg-white/10" />

            <div className="text-left text-xs font-mono">
              <span className="font-bold text-cyan-400">{listeners} Souls</span>
            </div>

            <div className="h-5 w-px bg-white/10" />

            <div
              className="flex items-center gap-1.5 text-xs font-mono"
              title={`Current spectators viewing ${currentTrack.title}`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-black text-emerald-300 tabular-nums">
                {spectatorsSnapshot.count}
              </span>
              <span className="text-zinc-300 hidden sm:inline">Spectators</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Jam Spectators Live Presence Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-purple-500/10 border border-emerald-400/30 backdrop-blur-xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex -space-x-2 flex-shrink-0">
            {spectatorsSnapshot.activeViewers.slice(0, 4).map((viewer) => (
              <img
                key={viewer.id}
                src={viewer.avatar}
                alt={viewer.name}
                title={viewer.name}
                className="w-7 h-7 rounded-full object-cover border-2 border-[#0F0E17]"
              />
            ))}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono font-black uppercase tracking-wider">
                <Eye className="w-3 h-3" /> Current Spectators
              </span>
              <span className="text-xs font-black text-white truncate">
                {currentTrack.title}
              </span>
            </div>
            <p className="text-[11px] font-mono text-zinc-300 truncate mt-0.5">
              ⚡ {spectatorsSnapshot.lastEventText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0 font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-emerald-400/35 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-black text-emerald-300 tabular-nums">
              {spectatorsSnapshot.count}
            </span>
            <span className="text-[10px] text-zinc-400 uppercase">Viewing Live</span>
            {spectatorsSnapshot.delta !== 0 && (
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  spectatorsSnapshot.delta > 0
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {spectatorsSnapshot.delta > 0 ? (
                  <TrendingUp className="w-2.5 h-2.5" />
                ) : (
                  <TrendingDown className="w-2.5 h-2.5" />
                )}
                {spectatorsSnapshot.delta > 0
                  ? `+${spectatorsSnapshot.delta}`
                  : spectatorsSnapshot.delta}
              </span>
            )}
          </div>

          <div className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] text-zinc-300">
            Peak: <strong className="text-cyan-300 tabular-nums">{spectatorsSnapshot.peakCount}</strong>
          </div>
        </div>
      </div>

      {/* Audio Reactive Visualizer Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 sm:px-4 rounded-2xl bg-white/5 border border-white/10 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-pink-300 font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-spin" />
            Audio Reactive Visualizer Overlay:
          </span>
          <button
            onClick={() => setIsVisualizerEnabled(!isVisualizerEnabled)}
            className={`px-2 py-0.5 rounded-md font-bold text-[10px] transition-all cursor-pointer ${
              isVisualizerEnabled
                ? 'bg-emerald-500 text-black shadow-sm'
                : 'bg-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            {isVisualizerEnabled ? 'ACTIVE • ON' : 'DISABLED • OFF'}
          </button>
        </div>

        {isVisualizerEnabled && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-zinc-400 text-[10.5px]">Style:</span>
            <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10">
              <button
                onClick={() => setVisualizerMode('spectrum_bars')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  visualizerMode === 'spectrum_bars'
                    ? 'bg-cyan-400 text-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Spectrum Bars
              </button>
              <button
                onClick={() => setVisualizerMode('love_halo')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  visualizerMode === 'love_halo'
                    ? 'bg-pink-500 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Love Halo ❤️
              </button>
              <button
                onClick={() => setVisualizerMode('plasma_wave')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  visualizerMode === 'plasma_wave'
                    ? 'bg-amber-400 text-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Plasma Wave
              </button>
            </div>

            <span className="text-zinc-400 text-[10.5px] ml-1">Color:</span>
            <div className="flex items-center gap-1">
              {(['neon', 'rose', 'gold'] as const).map((col) => (
                <button
                  key={col}
                  onClick={() => setVisualizerColor(col)}
                  className={`px-1.5 py-0.5 rounded text-[9.5px] uppercase font-bold border ${
                    visualizerColor === col
                      ? 'border-white bg-white/20 text-white'
                      : 'border-white/10 text-zinc-400 bg-black/30'
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Live User Video Feed & Real-Time Vocal Energy Emoji Reaction Studio */}
      <JamVocalVideoFeed
        isMusicPlaying={isPlaying}
        trackTitle={currentTrack.title}
        onEmitReaction={sendReaction}
      />

      {/* Schedule Jam & Friend Live Countdown Board */}
      <ScheduledJamsPanel
        tracks={tracks}
        currentTrack={currentTrack}
        externalOpenModal={isScheduleModalOpen}
        onOpenExternalModal={() => setIsScheduleModalOpen(true)}
        onCloseExternalModal={() => setIsScheduleModalOpen(false)}
        onStartTrackById={handleStartScheduledTrack}
      />

      {/* Main Mode View Container */}
      {viewMode === '3d_vr' ? (
        <div className="space-y-6">
          {/* Simulated 3D VR Environment with Audio Reactive Visualizer */}
          <div className="relative">
            <Simulated3DVREnvironment
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onSendReaction={sendReaction}
              listenersCount={listeners}
              onSelectTrackNext={() => {
                const next = (currentTrackIndex + 1) % tracks.length;
                handleSelectTrack(next);
              }}
            />

            {/* Audio Reactive Visualizer Overlay */}
            {isVisualizerEnabled && (
              <div className="absolute bottom-10 inset-x-0 pointer-events-none z-20">
                <AudioReactiveVisualizerOverlay
                  isPlaying={isPlaying}
                  songBpm={currentTrack.bpm || 104}
                  audioElement={audioRef.current}
                  mode={visualizerMode}
                  colorScheme={visualizerColor}
                  height="130px"
                />
              </div>
            )}
          </div>

          {/* Quick 3D VR Control Dock & Soundpad Triggers */}
          <GlassCard className="p-4 sm:p-5 border border-cyan-500/30 space-y-3" glowColor="cyan">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-400 to-pink-500 text-black flex items-center justify-center font-black shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-black" />
                  ) : (
                    <Play className="w-5 h-5 fill-black ml-0.5" />
                  )}
                </button>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-white truncate max-w-[200px]">
                    {currentTrack.title}
                  </h4>
                  <p className="text-cyan-300 text-[11px] truncate max-w-[200px]">
                    {currentTrack.artist} • {currentTrack.bpm} BPM
                  </p>
                </div>
              </div>

            </div>

            {/* Scrubber Bar */}
            <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
              <span>{formatTime(position)}</span>
              <input
                type="range"
                min="0"
                max={currentTrack.duration || 180}
                value={position}
                onChange={handleSeek}
                className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <span>{formatTime(currentTrack.duration || 180)}</span>
            </div>
          </GlassCard>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Music Player Card */}
          <div className="lg:col-span-7 space-y-6">
            <GlassCard className="p-6 sm:p-8 text-center relative overflow-hidden shadow-2xl" glowColor="purple">
              {/* Audio Reactive Visualizer Overlay */}
              {isVisualizerEnabled && (
                <div className="absolute inset-x-0 bottom-4 pointer-events-none z-10">
                  <AudioReactiveVisualizerOverlay
                    isPlaying={isPlaying}
                    songBpm={currentTrack.bpm || 104}
                    audioElement={audioRef.current}
                    mode={visualizerMode}
                    colorScheme={visualizerColor}
                    height="110px"
                  />
                </div>
              )}

              {/* Floating Reaction Overlay Canvas */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                <AnimatePresence>
                  {reactions.map((rec) => (
                    <motion.div
                      key={rec.id}
                      initial={{ y: 250, opacity: 1, scale: 0.8 }}
                      animate={{ y: -50, opacity: 0, scale: 1.5 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 2.2, ease: 'easeOut' }}
                      className="absolute text-3xl"
                      style={{ left: `${rec.x}%` }}
                    >
                      {rec.emoji}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

            {/* Glowing Rotating Vinyl Record */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 mx-auto mb-6 flex items-center justify-center">
              {/* Outer Glow Ring */}
              <div
                className={`absolute inset-0 rounded-full blur-2xl transition-all duration-700 ${
                  isPlaying
                    ? 'bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-pink-500/40 scale-105'
                    : 'bg-transparent'
                }`}
              />

              {/* Vinyl Disk */}
              <motion.div
                animate={{ rotate: isPlaying ? 360 : 0 }}
                transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                className="relative w-full h-full rounded-full bg-gradient-to-tr from-zinc-900 via-zinc-950 to-zinc-900 p-3 shadow-2xl border border-white/20 flex items-center justify-center"
              >
                {/* Vinyl Grooves */}
                <div className="w-full h-full rounded-full border-4 border-dashed border-white/10 flex items-center justify-center">
                  <div className="w-3/4 h-3/4 rounded-full border-4 border-dotted border-white/10 flex items-center justify-center">
                    {/* Album Art Center */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-white/30 shadow-inner">
                      <img
                        src={currentTrack.coverUrl}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Center Spindle Hole */}
              <div className="absolute w-5 h-5 bg-zinc-900 rounded-full border-2 border-cyan-400 shadow-md z-10" />
            </div>

            {/* Bouncing Audio Visualizer Bars */}
            <div className="flex items-end justify-center gap-1.5 h-8 mb-4">
              {[40, 75, 55, 90, 65, 80, 45, 95, 60, 85, 50, 70].map((height, i) => (
                <div
                  key={i}
                  className={`w-1.5 rounded-full transition-all duration-150 ${
                    isPlaying
                      ? 'bg-gradient-to-t from-cyan-500 to-pink-500 animate-pulse'
                      : 'bg-white/10 h-2'
                  }`}
                  style={{
                    height: isPlaying ? `${Math.max(8, (height * (i % 2 === 0 ? 0.9 : 1.1)) % 32)}px` : '4px',
                  }}
                />
              ))}
            </div>

            {/* Track Info */}
            <h2 className="text-xl sm:text-2xl font-black text-white mb-1">{currentTrack.title}</h2>
            <p className="text-cyan-400 text-sm font-semibold mb-2">{currentTrack.artist}</p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-300 mb-6">
              <span>{currentTrack.genre}</span>
              <span>•</span>
              <span>{currentTrack.bpm} BPM</span>
            </div>

            {/* Scrubber Bar */}
            <div className="mb-6">
              <input
                type="range"
                min="0"
                max={currentTrack.duration}
                value={position}
                onChange={handleSeek}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-xs font-mono text-zinc-400 mt-2">
                <span>{formatTime(position)}</span>
                <span>{formatTime(currentTrack.duration)}</span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-6 mb-8">
              <button
                onClick={() => handleSelectTrack((currentTrackIndex - 1 + tracks.length) % tracks.length)}
                className="p-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                title="Previous Track"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 text-black flex items-center justify-center shadow-lg shadow-purple-500/25 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 fill-black" />
                ) : (
                  <Play className="w-8 h-8 fill-black translate-x-0.5" />
                )}
              </button>

              <button
                onClick={() => handleSelectTrack((currentTrackIndex + 1) % tracks.length)}
                className="p-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                title="Next Track"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            {/* Emoji Reaction Bar */}
            <div className="flex items-center justify-center gap-2.5 pt-4 border-t border-white/10 flex-wrap">
              <span className="text-xs text-zinc-400 font-mono">LIVE REACTIONS:</span>
              {['🔥', '💖', '✨', '🎸', '⚡', '🌌', '💎', '🚀'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="text-xl p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 hover:scale-125 transition-all cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Synchronized Playlist & Regional Channels */}
        <div className="lg:col-span-5 space-y-6">
          <GlassCard className="p-6 border border-cyan-400/30" glowColor="cyan">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Music className="w-5 h-5 text-cyan-400" /> Synchronized Playlist ({tracks.length})
              </h3>
              <span className="text-[11px] font-mono text-cyan-300 font-bold">100% Synced</span>
            </div>

            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1 no-scrollbar">
              {tracks.map((t, idx) => {
                const isSelected = idx === currentTrackIndex;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTrack(idx)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 border-cyan-400/60 shadow-lg'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                      <img src={t.coverUrl} alt={t.title} className="w-full h-full object-cover" />
                      {isSelected && isPlaying && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Radio className="w-5 h-5 text-cyan-400 animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <p className={`text-xs sm:text-sm font-bold truncate ${isSelected ? 'text-cyan-300' : 'text-white'}`}>
                        {t.title}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">{t.artist}</p>
                      <span className="text-[10px] font-mono text-zinc-500 block truncate">
                        {t.genre}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono text-zinc-400 block">{formatTime(t.duration)}</span>
                      {isSelected && (
                        <span className="text-[10px] font-mono text-pink-400 font-bold">NOW PLAYING</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>
      )}

      {/* Request Custom Song Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <GlassCard className="max-w-md w-full p-6 space-y-4 border border-cyan-500/40" glowColor="cyan">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Music className="w-5 h-5 text-cyan-400" /> Request Any World Song
              </h3>
              <button
                onClick={() => setShowCustomModal(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-300 font-sans">
              Enter any song title, international artist name, or direct stream link to instantly add it to your synchronized shared room playlist!
            </p>

            <form onSubmit={handleAddCustomSong} className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold block mb-1">
                  Song Title *
                </label>
                <input
                  type="text"
                  required
                  value={customSongTitle}
                  onChange={(e) => setCustomSongTitle(e.target.value)}
                  placeholder="e.g. Asake - Lonely At The Top / NewJeans - Super Shy / Rema - Calm Down"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold block mb-1">
                  Artist Name / Origin
                </label>
                <input
                  type="text"
                  value={customArtist}
                  onChange={(e) => setCustomArtist(e.target.value)}
                  placeholder="e.g. Burna Boy (Nigeria) / Bad Bunny (Puerto Rico) / Central Cee (UK)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold block mb-1">
                  Direct Stream Link (Optional MP3 / Audio Stream)
                </label>
                <input
                  type="url"
                  value={customAudioUrl}
                  onChange={(e) => setCustomAudioUrl(e.target.value)}
                  placeholder="https://example.com/stream.mp3 (Default high-fidelity vibe if empty)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-extrabold text-xs shadow-lg hover:scale-105 transition-all cursor-pointer"
                >
                  Add to World Playlist
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
      </>
      )}

      {/* Room-Level 4-Digit Numeric Passcode Configuration Modal */}
      {isSecurityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <GlassCard className="max-w-md w-full p-6 space-y-4 border border-amber-400/45" glowColor="purple">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" /> Private Jam Room Security
              </h3>
              <button
                type="button"
                onClick={() => setIsSecurityModalOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-mono flex items-center justify-between">
              <span className="text-zinc-300">
                Room: <strong className="text-cyan-300">{roomId}</strong>
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isRoomPrivate
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                }`}
              >
                {isRoomPrivate ? 'LOCKED' : 'OPEN'}
              </span>
            </div>

            <p className="text-xs text-zinc-300 font-sans">
              Set a <strong>4-digit numeric password</strong> (0–9) so guests must enter the passcode before joining or listening to this private Jam Session.
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold block">
                4-Digit Numeric Passcode *
              </label>
              <div className="relative">
                <input
                  type={showHostPinDigits ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={hostPinDraft}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setHostPinDraft(digits);
                    if (securityModalError) setSecurityModalError(null);
                  }}
                  placeholder="Enter 4 digits (e.g. 2026)"
                  className="w-full px-4 py-2.5 pr-10 rounded-xl bg-black/55 border border-white/20 text-center text-white font-mono text-lg tracking-[0.4em] focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowHostPinDigits((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                  title={showHostPinDigits ? 'Hide passcode' : 'Show passcode'}
                >
                  {showHostPinDigits ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span>{hostPinDraft.length}/4 digits entered</span>
                <button
                  type="button"
                  onClick={() => {
                    const randomPin = String(Math.floor(1000 + Math.random() * 9000));
                    setHostPinDraft(randomPin);
                    setShowHostPinDigits(true);
                    setSecurityModalError(null);
                  }}
                  className="text-amber-300 hover:text-amber-200 underline cursor-pointer"
                >
                  Generate Random 4-Digit PIN
                </button>
              </div>
            </div>

            {securityModalError && (
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-400/50 text-rose-200 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-300" />
                <span>{securityModalError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              {isRoomPrivate && isRoomHost && (
                <button
                  type="button"
                  disabled={isSavingSecurity}
                  onClick={() => handleSaveHostRoomSecurity(false)}
                  className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-xs font-mono font-bold text-rose-200 cursor-pointer"
                >
                  Unlock (Public)
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsSecurityModalOpen(false)}
                className="w-full sm:flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingSecurity || hostPinDraft.length !== 4}
                onClick={() => handleSaveHostRoomSecurity(true)}
                className="w-full sm:flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-pink-500 text-black font-black text-xs shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {isSavingSecurity
                  ? 'Securing...'
                  : isRoomPrivate
                  ? 'Update 4-Digit PIN'
                  : 'Lock Room with PIN'}
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
