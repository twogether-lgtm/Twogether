import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Music,
  Sparkles,
  Share2,
  Trash2,
  Play,
  Check,
  X,
  Plus,
  Radio,
  Globe,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { JamTrack, ScheduledJamEvent } from '../types';
import { socketService } from '../services/socket';

interface ScheduledJamsPanelProps {
  tracks: JamTrack[];
  currentTrack: JamTrack;
  externalOpenModal?: boolean;
  onCloseExternalModal?: () => void;
  onOpenExternalModal?: () => void;
  onStartTrackById: (trackId?: string, trackTitle?: string) => void;
}

const FRIEND_DIRECTORY = [
  'Aria Sterling',
  'Kaelen Vance',
  'Zephyrine Chen',
  'Maya Lin',
  'Liam Vance',
  'Chloe M.',
];

const AMBIENCE_THEMES = [
  { id: 'Rainy Cafe', emoji: '🌧️', label: 'Rainy Cafe' },
  { id: 'Neon City', emoji: '🌆', label: 'Neon City' },
  { id: 'Beach Sunset', emoji: '🌅', label: 'Beach Sunset' },
  { id: 'Midnight Hearth', emoji: '🔥', label: 'Midnight Hearth' },
  { id: 'Cosmic Nebula', emoji: '🌌', label: 'Cosmic Nebula' },
];

const VIBE_TAGS = [
  '💖 Romance & Afro-Soul',
  '🔥 Late Night Heat',
  '🌧️ Cozy Lofi & Ballads',
  '⚡ High-Energy Bass',
  '🎶 Good Vybes Jam',
];

function getLocalUserIdentity(): { name: string; avatar: string; id: string } {
  try {
    const raw = localStorage.getItem('twogether_current_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        id: parsed.id || 'usr_verified_1',
        name: parsed.name || 'Dylan Wisney',
        avatar:
          parsed.avatar ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    id: 'usr_verified_1',
    name: 'Dylan Wisney',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  };
}

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function formatCountdown(targetIso: string, nowMs: number): {
  isLive: boolean;
  isEndedLongAgo: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  compact: string;
} {
  const targetMs = new Date(targetIso).getTime();
  const diffMs = targetMs - nowMs;

  if (diffMs <= 0) {
    return {
      isLive: true,
      isEndedLongAgo: diffMs < -4 * 60 * 60 * 1000,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      compact: 'LIVE NOW',
    };
  }

  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  const compact =
    days > 0
      ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
      : hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;

  return {
    isLive: false,
    isEndedLongAgo: false,
    days,
    hours,
    minutes,
    seconds,
    compact,
  };
}

export const ScheduledJamsPanel: React.FC<ScheduledJamsPanelProps> = ({
  tracks,
  currentTrack,
  externalOpenModal = false,
  onCloseExternalModal,
  onOpenExternalModal,
  onStartTrackById,
}) => {
  const currentUser = useMemo(() => getLocalUserIdentity(), []);
  const [events, setEvents] = useState<ScheduledJamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [sharedEventId, setSharedEventId] = useState<string | null>(null);
  const [rsvpPendingId, setRsvpPendingId] = useState<string | null>(null);

  // Modal Form State
  const [title, setTitle] = useState('');
  const [selectedTrackId, setSelectedTrackId] = useState(currentTrack.id);
  const [ambienceTheme, setAmbienceTheme] = useState('Neon City');
  const [vibeTag, setVibeTag] = useState(VIBE_TAGS[0]);
  const [scheduledLocalInput, setScheduledLocalInput] = useState(() =>
    toDatetimeLocalValue(new Date(Date.now() + 30 * 60 * 1000))
  );
  const [invitedFriends, setInvitedFriends] = useState<string[]>([
    'Aria Sterling',
    'Kaelen Vance',
  ]);
  const [customFriendInput, setCustomFriendInput] = useState('');
  const [isPublicToFriends, setIsPublicToFriends] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isModalOpen = externalOpenModal || internalModalOpen;

  useEffect(() => {
    if (isModalOpen) {
      setFormError(null);
      setSelectedTrackId(currentTrack.id);
      setScheduledLocalInput(toDatetimeLocalValue(new Date(Date.now() + 30 * 60 * 1000)));
    }
  }, [isModalOpen, currentTrack.id]);

  const openModal = () => {
    setFormError(null);
    setSelectedTrackId(currentTrack.id);
    setScheduledLocalInput(toDatetimeLocalValue(new Date(Date.now() + 30 * 60 * 1000)));
    if (onOpenExternalModal) {
      onOpenExternalModal();
    } else {
      setInternalModalOpen(true);
    }
  };

  const closeModal = () => {
    setInternalModalOpen(false);
    setFormError(null);
    onCloseExternalModal?.();
  };

  // Fetch initial scheduled jams & subscribe to Socket.IO broadcasts
  useEffect(() => {
    let active = true;
    fetch('/api/jam/scheduled')
      .then((res) => res.json())
      .then((data) => {
        if (active && data.success && Array.isArray(data.events)) {
          setEvents(data.events);
        }
      })
      .catch((err) => console.error('Failed to load scheduled jams:', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    const handleUpdate = (updatedEvents: ScheduledJamEvent[]) => {
      if (Array.isArray(updatedEvents)) {
        setEvents(updatedEvents);
      }
    };

    socketService.socket.on('scheduled-jams-update', handleUpdate);
    return () => {
      active = false;
      socketService.socket.off('scheduled-jams-update', handleUpdate);
    };
  }, []);

  // 1-second live countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const applyPresetMinutes = (minutesFromNow: number) => {
    setScheduledLocalInput(toDatetimeLocalValue(new Date(Date.now() + minutesFromNow * 60 * 1000)));
  };

  const toggleFriendInvite = (name: string) => {
    setInvitedFriends((prev) =>
      prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]
    );
  };

  const handleAddCustomFriend = () => {
    const cleaned = customFriendInput.trim();
    if (!cleaned) return;
    if (!invitedFriends.includes(cleaned)) {
      setInvitedFriends((prev) => [...prev, cleaned]);
    }
    setCustomFriendInput('');
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Please enter a title for your scheduled jam.');
      return;
    }

    const parsedMs = new Date(scheduledLocalInput).getTime();
    if (Number.isNaN(parsedMs)) {
      setFormError('Please select a valid date and time.');
      return;
    }
    if (parsedMs < Date.now() - 60000) {
      setFormError('Schedule time must be in the future.');
      return;
    }

    const chosenTrack = tracks.find((t) => t.id === selectedTrackId) || currentTrack;

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch('/api/jam/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          hostName: currentUser.name,
          hostAvatar: currentUser.avatar,
          userId: currentUser.id,
          scheduledForIso: new Date(parsedMs).toISOString(),
          trackId: chosenTrack.id,
          trackTitle: chosenTrack.title,
          trackArtist: chosenTrack.artist,
          ambienceTheme,
          vibeTag,
          invitedFriends,
          isPublicToFriends,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.message || 'Could not schedule jam session.');
        return;
      }

      if (Array.isArray(data.events)) {
        setEvents(data.events);
      }
      setTitle('');
      closeModal();
    } catch {
      setFormError('Network error while scheduling jam.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRsvp = async (eventId: string) => {
    setRsvpPendingId(eventId);
    try {
      const res = await fetch(`/api/jam/schedule/${eventId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendName: currentUser.name }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.events)) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error('RSVP error:', err);
    } finally {
      setRsvpPendingId(null);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const res = await fetch(`/api/jam/schedule/${eventId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.events)) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error('Delete scheduled jam error:', err);
    }
  };

  const handleShareInvite = async (evt: ScheduledJamEvent, compactCountdown: string) => {
    const shareText = `🎧 Join "${evt.title}" hosted by ${evt.hostName} on Twogether!\n🎵 Track: ${evt.trackTitle} (${evt.trackArtist || 'Live Mix'})\n⏳ Starts in: ${compactCountdown}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Twogether Jam: ${evt.title}`,
          text: shareText,
          url: window.location.href,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
      }
      setSharedEventId(evt.id);
      setTimeout(() => setSharedEventId(null), 2200);
    } catch {
      // Fallback clipboard copy if user dismissed native share or blocked
      try {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
        setSharedEventId(evt.id);
        setTimeout(() => setSharedEventId(null), 2200);
      } catch {
        // ignore clipboard failure
      }
    }
  };

  return (
    <>
      <GlassCard className="p-4 sm:p-5 border border-purple-500/30 space-y-4" glowColor="purple">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-purple-500/30">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                Upcoming Scheduled Jams & Friend Countdowns
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono font-bold">
                {events.length} LIVE SYNCED
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Schedule future VR & beat jam drops so your friends see live countdowns, RSVP, and join right on cue.
            </p>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 text-white font-black text-xs shadow-lg shadow-pink-500/25 hover:scale-105 transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Jam</span>
          </button>
        </div>

        {/* Upcoming Jams Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2].map((skeleton) => (
              <div
                key={skeleton}
                className="h-36 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white/5 border border-dashed border-white/15 text-center space-y-2">
            <Clock className="w-7 h-7 text-purple-400 mx-auto" />
            <p className="text-xs font-bold text-white">No upcoming scheduled jams yet</p>
            <p className="text-[11px] text-zinc-400">
              Drop a time, pick a world track, and notify your circle with a live ticking countdown.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {events.map((evt) => {
              const cd = formatCountdown(evt.scheduledForIso, nowMs);
              const isGoing = evt.rsvpFriends.includes(currentUser.name);
              const isHost = evt.hostName === currentUser.name;
              const startTimeFormatted = new Date(evt.scheduledForIso).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const startDateFormatted = new Date(evt.scheduledForIso).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
              });

              return (
                <motion.div
                  key={evt.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative p-4 rounded-2xl border backdrop-blur-xl transition-all flex flex-col justify-between gap-3 ${
                    cd.isLive
                      ? 'bg-gradient-to-br from-pink-500/15 via-purple-500/15 to-amber-500/15 border-pink-400/50 shadow-lg shadow-pink-500/15'
                      : 'bg-black/45 border-white/15 hover:border-purple-400/40'
                  }`}
                >
                  {/* Top Row: Host, Title, Live Countdown */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <img
                        src={
                          evt.hostAvatar ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
                        }
                        alt={evt.hostName}
                        className="w-9 h-9 rounded-full object-cover border border-purple-400/50 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-purple-300">
                            Host: {evt.hostName}
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/10 text-[9px] font-mono text-zinc-200">
                            {evt.isPublicToFriends ? (
                              <>
                                <Globe className="w-2.5 h-2.5 text-cyan-400" /> Visible to Friends
                              </>
                            ) : (
                              <>
                                <Lock className="w-2.5 h-2.5 text-amber-400" /> Invite Circle
                              </>
                            )}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-white truncate mt-0.5">{evt.title}</h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] font-mono text-zinc-300">
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 font-bold">
                            {evt.vibeTag}
                          </span>
                          {evt.ambienceTheme && (
                            <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-200">
                              🎧 {evt.ambienceTheme}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Countdown Badge */}
                    <div
                      className={`flex-shrink-0 px-3 py-2 rounded-xl border text-right ${
                        cd.isLive
                          ? 'bg-gradient-to-br from-pink-500 to-amber-500 border-white/30 text-white animate-pulse'
                          : 'bg-black/70 border-cyan-400/40 text-cyan-300'
                      }`}
                    >
                      <div className="flex items-center justify-end gap-1 text-[9px] font-mono uppercase tracking-wider opacity-90">
                        {cd.isLive ? (
                          <>
                            <Radio className="w-3 h-3" /> STARTING
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" /> COUNTDOWN
                          </>
                        )}
                      </div>
                      <div className="text-sm sm:text-base font-mono font-black tracking-tight tabular-nums">
                        {cd.compact}
                      </div>
                      <div className="text-[9px] font-mono opacity-80">
                        {startDateFormatted} • {startTimeFormatted}
                      </div>
                    </div>
                  </div>

                  {/* Track & Friend RSVP Meta */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 min-w-0">
                      <Music className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                      <div className="min-w-0 text-[11px]">
                        <span className="font-bold text-white truncate block">
                          {evt.trackTitle}
                        </span>
                        <span className="text-zinc-400 text-[10px] truncate block">
                          {evt.trackArtist || 'Twogether World Mix'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-300 flex-shrink-0">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      <span>
                        <strong className="text-white">{evt.rsvpFriends.length}</strong> going
                      </span>
                      {evt.invitedFriends.length > 0 && (
                        <span className="text-zinc-500">
                          • {evt.invitedFriends.length} invited
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        disabled={rsvpPendingId === evt.id}
                        onClick={() => handleToggleRsvp(evt.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer ${
                          isGoing
                            ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                            : 'bg-white/10 border border-white/15 text-white hover:bg-purple-500/25 hover:border-purple-400/50'
                        }`}
                      >
                        {isGoing ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                        <span>{isGoing ? 'Counted In ✓' : 'Count Me In'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onStartTrackById(evt.trackId, evt.trackTitle)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer ${
                          cd.isLive
                            ? 'bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-black shadow-md'
                            : 'bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/25'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{cd.isLive ? 'Join Live Stage' : 'Preview Track'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleShareInvite(evt, cd.compact)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                        title="Share jam countdown with friends"
                      >
                        {sharedEventId === evt.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300">Invite Shared</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Share</span>
                          </>
                        )}
                      </button>

                      {(isHost || evt.id.startsWith('jam_sched_')) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(evt.id)}
                          className="p-1.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 hover:bg-red-500/20 cursor-pointer transition-all"
                          title="Cancel scheduled jam"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* Schedule Jam Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-zinc-950/95 border border-purple-500/40 shadow-2xl shadow-purple-500/20 p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Schedule Upcoming Jam</h3>
                    <p className="text-[11px] text-zinc-400">
                      Friends will see a live countdown timer in real time
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateSchedule} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                    Jam Session Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Midnight Neon Afro-Soul Party with Friends"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-purple-400"
                    required
                  />
                </div>

                {/* Date & Time + Quick Presets */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-mono uppercase text-zinc-400">
                    Start Time & Live Countdown Target
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '+10m', mins: 10 },
                      { label: '+30m', mins: 30 },
                      { label: '+1h', mins: 60 },
                      { label: '+3h', mins: 180 },
                      { label: 'Tomorrow', mins: 24 * 60 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyPresetMinutes(preset.mins)}
                        className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-400/30 text-purple-200 text-[11px] font-mono font-bold hover:bg-purple-500/30 cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="datetime-local"
                    value={scheduledLocalInput}
                    onChange={(e) => setScheduledLocalInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                {/* Featured Track Selector */}
                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                    Opening Track
                  </label>
                  <select
                    value={selectedTrackId}
                    onChange={(e) => setSelectedTrackId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    {tracks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} — {t.artist}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ambience & Vibe */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                      VR Soundscape
                    </label>
                    <select
                      value={ambienceTheme}
                      onChange={(e) => setAmbienceTheme(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                    >
                      {AMBIENCE_THEMES.map((amb) => (
                        <option key={amb.id} value={amb.id}>
                          {amb.emoji} {amb.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                      Vibe Tag
                    </label>
                    <select
                      value={vibeTag}
                      onChange={(e) => setVibeTag(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                    >
                      {VIBE_TAGS.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Friend Invites */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-mono uppercase text-zinc-400">
                    Invite Friends to Countdown ({invitedFriends.length} selected)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {FRIEND_DIRECTORY.map((friend) => {
                      const active = invitedFriends.includes(friend);
                      return (
                        <button
                          key={friend}
                          type="button"
                          onClick={() => toggleFriendInvite(friend)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                            active
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                              : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {active ? '✓ ' : '+ '}
                          {friend}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customFriendInput}
                      onChange={(e) => setCustomFriendInput(e.target.value)}
                      placeholder="Add another friend's name..."
                      className="flex-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomFriend}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
                    >
                      Invite
                    </button>
                  </div>
                </div>

                {/* Friend Visibility Toggle */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Broadcast Countdown to All Friends
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Everyone in your Soul Circle sees the live countdown timer
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPublicToFriends}
                    onChange={(e) => setIsPublicToFriends(e.target.checked)}
                    className="w-4 h-4 accent-purple-500"
                  />
                </label>

                {/* Submit Row */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-xs font-bold hover:bg-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 text-white text-xs font-black shadow-lg shadow-pink-500/25 hover:scale-105 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Scheduling...' : 'Publish Jam Countdown'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
