import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  ShieldAlert,
  Flag,
  Ghost,
  X,
  ArrowRight,
  Clock,
  VolumeX,
  Volume2,
  MapPin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BadVibeClusterAlert, MonitoredAccountStatus } from '../types';
import { socketService } from '../services/socket';
import {
  acknowledgeClusterAlert,
  updateMonitoredUserStatus,
} from '../services/aiGuardianService';
import { appSoundService } from '../services/appSoundService';

interface OwnerClusterToastContainerProps {
  ownerToken: string;
  onInspectInHeatmap: (zoneId: string, category: string) => void;
}

export const OwnerClusterToastContainer: React.FC<OwnerClusterToastContainerProps> = ({
  ownerToken,
  onInspectInHeatmap,
}) => {
  const [toasts, setToasts] = useState<BadVibeClusterAlert[]>([]);
  const [busyAlertId, setBusyAlertId] = useState<string | null>(null);
  const [isPopupMuted, setIsPopupMuted] = useState<boolean>(() =>
    appSoundService.getIsPopupSoundMuted()
  );

  useEffect(() => {
    return appSoundService.subscribe((muted) => setIsPopupMuted(muted));
  }, []);

  const playAlertTone = useCallback(() => {
    if (appSoundService.getIsPopupSoundMuted()) return;
    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;
      const ctx = new AudioCtxClass();
      const now = ctx.currentTime;
      [660, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.06, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.15);
      });
    } catch {
      // ignore audio context restrictions
    }
  }, []);

  useEffect(() => {
    if (!ownerToken) return;
    socketService.joinOwnerMonitor(ownerToken);

    const handleClusterAlert = (incoming: BadVibeClusterAlert) => {
      if (!incoming || !incoming.id || incoming.acknowledged) return;
      setToasts((prev) => {
        // Idempotent deduplication by alert ID
        const existsIdx = prev.findIndex((t) => t.id === incoming.id);
        if (existsIdx >= 0) {
          const updated = [...prev];
          updated[existsIdx] = incoming;
          return updated;
        }
        playAlertTone();
        return [incoming, ...prev].slice(0, 3);
      });
    };

    socketService.socket.on('owner-cluster-alert', handleClusterAlert);

    return () => {
      socketService.socket.off('owner-cluster-alert', handleClusterAlert);
    };
  }, [ownerToken, playAlertTone]);

  const handleDismiss = async (alertId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== alertId));
    await acknowledgeClusterAlert(ownerToken, alertId);
  };

  const handleQuickAction = async (
    alert: BadVibeClusterAlert,
    status: MonitoredAccountStatus
  ) => {
    const primaryUserId = alert.implicatedUserIds[0];
    if (!primaryUserId) {
      onInspectInHeatmap(alert.zoneId, alert.category);
      return;
    }
    setBusyAlertId(alert.id);
    await updateMonitoredUserStatus(ownerToken, {
      userId: primaryUserId,
      status,
      flagReason: `Real-time AI Cluster Alert: ${alert.detectedPattern}`,
      sourceZone: `${alert.zoneLabel} (${alert.category})`,
    });
    await acknowledgeClusterAlert(ownerToken, alert.id);
    setBusyAlertId(null);
    setToasts((prev) => prev.filter((t) => t.id !== alert.id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-20 right-3 sm:right-5 z-[95] w-[calc(100vw-1.5rem)] max-w-md space-y-3 pointer-events-none"
      aria-live="assertive"
    >
      <AnimatePresence>
        {toasts.map((alert) => {
          const isCritical = alert.severity === 'CRITICAL';
          const primaryUser = alert.implicatedUsersPreview[0];

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 48, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 48, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className={`pointer-events-auto rounded-2xl border-2 backdrop-blur-2xl shadow-2xl p-4 text-left space-y-2.5 ${
                isCritical
                  ? 'bg-[#1a0b16]/95 border-rose-500/80 shadow-rose-500/25'
                  : 'bg-[#171224]/95 border-amber-400/75 shadow-amber-500/20'
              }`}
            >
              {/* Header Bar */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isCritical
                        ? 'bg-rose-500/25 border border-rose-400 text-rose-300'
                        : 'bg-amber-500/25 border border-amber-400 text-amber-300'
                    }`}
                  >
                    <Flame className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-black uppercase ${
                          isCritical ? 'bg-rose-500 text-white' : 'bg-amber-400 text-black'
                        }`}
                      >
                        AI CLUSTER ALERT • {alert.severity}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[9px] font-bold text-rose-200">
                        {alert.heatIntensity}% HEAT
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-black text-white truncate mt-0.5">
                      {alert.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className="p-1 text-zinc-400"
                    title={isPopupMuted ? 'Alert audio muted' : 'Alert audio active'}
                  >
                    {isPopupMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
                  </span>
                  <button
                    onClick={() => handleDismiss(alert.id)}
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white cursor-pointer transition-colors"
                    title="Acknowledge & dismiss alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body & Pattern Details */}
              <p className="text-[11px] text-zinc-200 leading-relaxed">{alert.summary}</p>

              <div className="p-2 rounded-xl bg-black/50 border border-white/10 space-y-1 font-mono text-[10px]">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                    {alert.regionCity}
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(alert.detectedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-rose-300 font-bold truncate">
                  Pattern: {alert.detectedPattern}
                </p>
                {primaryUser && (
                  <p className="text-zinc-300 truncate">
                    Primary Actor: <strong className="text-white">{primaryUser.name}</strong> (Scam Risk{' '}
                    <span className="text-rose-400">{primaryUser.scamPatternScore}%</span>)
                  </p>
                )}
              </div>

              {/* Action Row */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5 font-mono text-[10px]">
                <button
                  onClick={() => {
                    onInspectInHeatmap(alert.zoneId, alert.category);
                    handleDismiss(alert.id);
                  }}
                  className="flex-1 min-w-[125px] px-2.5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:brightness-110 text-white font-extrabold flex items-center justify-center gap-1 shadow-md cursor-pointer transition-all"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Inspect Heatmap
                  <ArrowRight className="w-3 h-3" />
                </button>

                {primaryUser && (
                  <>
                    <button
                      disabled={busyAlertId === alert.id}
                      onClick={() => handleQuickAction(alert, 'FLAGGED')}
                      className="px-2.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-amber-200 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Flag className="w-3 h-3" /> Flag
                    </button>

                    <button
                      disabled={busyAlertId === alert.id}
                      onClick={() => handleQuickAction(alert, 'SHADOW_BANNED')}
                      className="px-2.5 py-2 rounded-xl bg-purple-500/25 hover:bg-purple-500/40 border border-purple-400/50 text-purple-200 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Ghost className="w-3 h-3" /> Shadow-Ban
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
