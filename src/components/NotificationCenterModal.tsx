import React, { useState } from 'react';
import { Bell, MessageSquare, Gift, Sparkles, Check, CheckCheck, X, Volume2, Gamepad2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { playAmbientAudioAlert } from '../utils/ambientAudio';

export interface AppNotification {
  id: string;
  type: 'message' | 'gift' | 'invite' | 'reward';
  title: string;
  sender: string;
  avatar: string;
  message: string;
  timestamp: string;
  read: boolean;
  giftAmount?: number;
}

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChatWithSender?: (senderName: string) => void;
  onOpenGames?: () => void;
  onClaimGiftArrival?: (amount: number) => void;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_1',
    type: 'gift',
    title: '🎁 Gift Arrival Received!',
    sender: 'Aria Sterling',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    message: 'Aria sent you a "Crystal Soul Rose" with a personal note: "Loved our midnight vinyl jam! ✨"',
    timestamp: '2m ago',
    read: false,
    giftAmount: 1,
  },
  {
    id: 'notif_2',
    type: 'message',
    title: '💬 New Soul Chat Message',
    sender: 'Zephyrine Chen',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    message: '"Are you ready for the 10-Device Couples Party Room tonight? I spun the wheel and landed on lap dance! 🙈"',
    timestamp: '15m ago',
    read: false,
  },
  {
    id: 'notif_3',
    type: 'invite',
    title: '🎡 Naughty Wheel Challenge Invite',
    sender: 'Alex Chen',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    message: 'Alex invited you to an Extra Spicy 2-Device Close Fusion game session!',
    timestamp: '1h ago',
    read: true,
  },
  {
    id: 'notif_4',
    type: 'reward',
    title: '✨ 24h Daily Check-In Available',
    sender: 'Twogether Orbit',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80',
    message: 'Your 24-hour streak bonus is ready to claim in Orbit Rewards.',
    timestamp: '3h ago',
    read: true,
  },
];

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onOpenChatWithSender,
  onOpenGames,
  onClaimGiftArrival,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('twogether_notifications');
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  const [activeFilter, setActiveFilter] = useState<'all' | 'messages' | 'gifts'>('all');
  const [claimedGifts, setClaimedGifts] = useState<string[]>([]);

  if (!isOpen) return null;

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'messages') return n.type === 'message';
    if (activeFilter === 'gifts') return n.type === 'gift';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      try {
        localStorage.setItem('twogether_notifications', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleSimulateNewAlert = (type: 'message' | 'gift') => {
    playAmbientAudioAlert(type);
    const newNotif: AppNotification =
      type === 'gift'
        ? {
            id: `notif_${Date.now()}`,
            type: 'gift',
            title: '🎁 Gift Arrival Received!',
            sender: 'Maya Lin',
            avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
            message: 'Maya gifted you 1 Diamond Soul Token! (+1 Gift)',
            timestamp: 'Just now',
            read: false,
            giftAmount: 1,
          }
        : {
            id: `notif_${Date.now()}`,
            type: 'message',
            title: '💬 New Soul Chat Message',
            sender: 'Aria Sterling',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
            message: '"Did you listen to the Lagos Afrobeats track in Shared Beats yet? It made me think of you 🎶"',
            timestamp: 'Just now',
            read: false,
          };

    setNotifications((prev) => {
      const updated = [newNotif, ...prev];
      try {
        localStorage.setItem('twogether_notifications', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleClaimGift = (notif: AppNotification) => {
    if (claimedGifts.includes(notif.id) || !notif.giftAmount) return;
    setClaimedGifts((prev) => [...prev, notif.id]);
    playAmbientAudioAlert('gift');
    if (onClaimGiftArrival) {
      onClaimGiftArrival(notif.giftAmount);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg"
      >
        <GlassCard className="p-6 border border-pink-500/40 relative overflow-hidden shadow-2xl bg-gradient-to-b from-[#181427] to-black" glowColor="pink">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/40">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  Notifications & Gift Alerts
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-pink-500 text-white font-mono text-[10px] font-bold">
                      {unreadCount} New
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400">Subtle ambient audio alerts for incoming chats & gifts</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Test Alert Simulator & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-pink-500 text-white shadow-md'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setActiveFilter('messages')}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeFilter === 'messages'
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                💬 Chats
              </button>
              <button
                onClick={() => setActiveFilter('gifts')}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeFilter === 'gifts'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                🎁 Gifts
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-mono text-zinc-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* Notifications Scroll List */}
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            <AnimatePresence>
              {filtered.map((notif) => {
                const isClaimed = claimedGifts.includes(notif.id);
                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      !notif.read
                        ? 'bg-white/10 border-pink-500/40 shadow-md'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={notif.avatar}
                        alt={notif.sender}
                        className="w-10 h-10 rounded-xl object-cover border border-white/20 flex-shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-extrabold text-white truncate">
                            {notif.title}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400 flex-shrink-0">
                            {notif.timestamp}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-300 leading-snug mb-2">
                          {notif.message}
                        </p>

                        <div className="flex items-center gap-2">
                          {notif.type === 'gift' && notif.giftAmount && (
                            <button
                              onClick={() => handleClaimGift(notif)}
                              disabled={isClaimed}
                              className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold flex items-center gap-1 transition-all ${
                                isClaimed
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-extrabold shadow hover:scale-105 cursor-pointer'
                              }`}
                            >
                              <Gift className="w-3.5 h-3.5" />
                              <span>{isClaimed ? 'Gift Claimed (+1G)' : 'Accept Gift (+1 Gift)'}</span>
                            </button>
                          )}

                          {notif.type === 'message' && onOpenChatWithSender && (
                            <button
                              onClick={() => {
                                onOpenChatWithSender(notif.sender);
                                onClose();
                              }}
                              className="px-3 py-1 rounded-xl bg-cyan-400 text-black font-extrabold text-[11px] font-mono hover:scale-105 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <MessageSquare className="w-3 h-3" /> Reply in Chat
                            </button>
                          )}

                          {notif.type === 'invite' && onOpenGames && (
                            <button
                              onClick={() => {
                                onOpenGames();
                                onClose();
                              }}
                              className="px-3 py-1 rounded-xl bg-pink-500 text-white font-extrabold text-[11px] font-mono hover:scale-105 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Gamepad2 className="w-3 h-3" /> Join Game Session
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Bottom Ambient Sound Preview Buttons */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> Test Ambient Chimes:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSimulateNewAlert('message')}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10 transition-colors cursor-pointer text-[11px]"
              >
                🔔 Chat Alert
              </button>
              <button
                onClick={() => handleSimulateNewAlert('gift')}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 border border-white/10 transition-colors cursor-pointer text-[11px]"
              >
                🎁 Gift Arrival
              </button>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
