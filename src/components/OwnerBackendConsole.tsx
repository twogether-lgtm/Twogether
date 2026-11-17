import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Crown,
  Users,
  Activity,
  Lock,
  EyeOff,
  Search,
  RefreshCw,
  LogOut,
  ArrowLeftRight,
  Ban,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Tv,
  Sparkles,
  Bot,
  FileLock2,
  Flame,
  Flag,
  Ghost,
  BellRing,
  ClipboardList,
  Download,
  Clock,
  BrainCircuit,
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { BadVibeHeatmapPanel } from './BadVibeHeatmapPanel';
import { AiIssueSolverPanel } from './AiIssueSolverPanel';
import {
  AdminActivityAuditEntry,
  AiModerationLogEntry,
  MonitoredAccountStatus,
  MonitoredUserRecord,
  OwnerTelemetrySummary,
  SafetyViolationCategory,
} from '../types';
import {
  acknowledgeClusterAlert,
  fetchOwnerOverview,
  updateMonitoredUserStatus,
} from '../services/aiGuardianService';
import { socketService } from '../services/socket';

interface OwnerBackendConsoleProps {
  ownerEmail: string;
  ownerToken: string;
  focusedHeatmapCellId?: string | null;
  onSwitchToFrontend: () => void;
  onLogoutOwner: () => void;
  onOpenBillingPortal: () => void;
  onOpenAdsCenter: () => void;
}

const CATEGORY_LABELS: Record<SafetyViolationCategory | 'ALL', { label: string; colorClass: string }> = {
  ALL: { label: 'All Audited Actions', colorClass: 'bg-white/10 text-white border-white/20' },
  GOOD_VYBES: { label: 'Good Vybes Approved', colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  SCAM_FRAUD: { label: 'Scam & Fraud Blocked', colorClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  ILLEGAL_BUSINESS: { label: 'Illegal Business Blocked', colorClass: 'bg-red-500/20 text-red-300 border-red-500/40' },
  DISCRIMINATION: { label: 'Discrimination Blocked', colorClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  HARASSMENT_HARM: { label: 'Harm & Extortion Blocked', colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  EXPLICIT_NUDITY: { label: 'Explicit Nudity Blocked', colorClass: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
};

export const OwnerBackendConsole: React.FC<OwnerBackendConsoleProps> = ({
  ownerEmail,
  ownerToken,
  focusedHeatmapCellId = null,
  onSwitchToFrontend,
  onLogoutOwner,
  onOpenBillingPortal,
  onOpenAdsCenter,
}) => {
  const [telemetry, setTelemetry] = useState<OwnerTelemetrySummary | null>(null);
  const [activeTab, setActiveTab] = useState<
    'profiles' | 'heatmap' | 'ai_solver' | 'guardian_feed' | 'activity_audit' | 'revenue_ads'
  >('heatmap');
  const [selectedCellOverride, setSelectedCellOverride] = useState<string | null>(focusedHeatmapCellId);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | MonitoredAccountStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<SafetyViolationCategory | 'ALL'>('ALL');
  const [auditScopeFilter, setAuditScopeFilter] = useState<
    'ALL' | 'ENFORCEMENT' | 'AI_SOLVER' | 'ALERTS' | 'AUTH' | 'BILLING'
  >('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (focusedHeatmapCellId) {
      setActiveTab('heatmap');
      setSelectedCellOverride(focusedHeatmapCellId);
    }
  }, [focusedHeatmapCellId]);

  const loadTelemetry = useCallback(async () => {
    setIsLoading(true);
    const res = await fetchOwnerOverview(ownerToken);
    if (res.success && res.telemetry) {
      setTelemetry(res.telemetry);
    } else if (res.message) {
      setNotice(res.message);
    }
    setIsLoading(false);
  }, [ownerToken]);

  useEffect(() => {
    loadTelemetry();

    socketService.joinOwnerMonitor(ownerToken);
    const handleLiveUpdate = (nextTelemetry: OwnerTelemetrySummary) => {
      setTelemetry(nextTelemetry);
    };
    socketService.socket.on('owner-telemetry-update', handleLiveUpdate);

    return () => {
      socketService.socket.off('owner-telemetry-update', handleLiveUpdate);
    };
  }, [ownerToken, loadTelemetry]);

  const handleModerateUser = async (
    userId: string,
    payload: {
      status?: MonitoredAccountStatus;
      resetStrikes?: boolean;
      flagReason?: string;
      sourceZone?: string;
    },
    label: string
  ) => {
    setActionBusyId(userId);
    const res = await updateMonitoredUserStatus(ownerToken, { userId, ...payload });
    setActionBusyId(null);
    if (res.success) {
      setNotice(`Applied "${label}" to account ${userId}.`);
      setTimeout(() => setNotice(null), 3500);
      loadTelemetry();
    } else {
      setNotice(res.message || 'Unable to update user status.');
    }
  };

  const filteredUsers: MonitoredUserRecord[] = (telemetry?.users || []).filter((u) => {
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.location.toLowerCase().includes(q) ||
      u.lastActionSummary.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const filteredLogs: AiModerationLogEntry[] = (telemetry?.recentLogs || []).filter((log) => {
    const matchesCategory = categoryFilter === 'ALL' || log.category === categoryFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      log.userName.toLowerCase().includes(q) ||
      log.contentSnippet.toLowerCase().includes(q) ||
      log.aiReasoning.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const filteredAdminAuditLogs: AdminActivityAuditEntry[] = (telemetry?.adminAuditLogs || []).filter(
    (entry) => {
      const matchesScope =
        auditScopeFilter === 'ALL' ||
        (auditScopeFilter === 'ENFORCEMENT' &&
          [
            'USER_PROACTIVE_FLAG',
            'USER_SHADOW_BAN',
            'USER_WARN',
            'USER_SUSPEND',
            'USER_REINSTATE_CLEAR',
          ].includes(entry.actionType)) ||
        (auditScopeFilter === 'AI_SOLVER' &&
          [
            'AI_ISSUE_AUTO_RESOLVED',
            'AI_SOLVER_POLICY_UPDATE',
            'AI_SOLVER_OVERRIDE',
          ].includes(entry.actionType)) ||
        (auditScopeFilter === 'ALERTS' && entry.actionType === 'CLUSTER_ALERT_ACK') ||
        (auditScopeFilter === 'AUTH' &&
          ['OWNER_AUTH_LOGIN', 'OWNER_AUTH_LOGOUT'].includes(entry.actionType)) ||
        (auditScopeFilter === 'BILLING' && entry.actionType === 'BILLING_CONFIG_UPDATE');

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        entry.actorEmail.toLowerCase().includes(q) ||
        entry.actionLabel.toLowerCase().includes(q) ||
        (entry.targetName || '').toLowerCase().includes(q) ||
        (entry.targetId || '').toLowerCase().includes(q) ||
        entry.sourceSurface.toLowerCase().includes(q) ||
        entry.details.toLowerCase().includes(q) ||
        (entry.previousState || '').toLowerCase().includes(q) ||
        (entry.newState || '').toLowerCase().includes(q);

      return matchesScope && matchesSearch;
    }
  );

  const handleExportAdminAuditCsv = () => {
    const headers = [
      'Timestamp',
      'Actor Email',
      'Action Type',
      'Action Label',
      'Target',
      'Source Surface',
      'Previous State',
      'New State',
      'Outcome',
      'Details',
    ];
    const rows = filteredAdminAuditLogs.map((row) =>
      [
        row.timestamp,
        row.actorEmail,
        row.actionType,
        row.actionLabel,
        row.targetName || row.targetId || '-',
        row.sourceSurface,
        row.previousState || '-',
        row.newState || '-',
        row.outcome,
        row.details,
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `twogether-owner-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6 text-left">
      {/* Owner Back-End Top Command Header */}
      <GlassCard className="p-5 sm:p-6 border border-amber-400/50 bg-gradient-to-r from-amber-500/15 via-[#151226] to-cyan-950/30" glowColor="amber">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-black font-mono text-[10px] font-black uppercase tracking-wider">
                <Crown className="w-3.5 h-3.5 fill-black" />
                Owner-Only Back-End Console
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-mono text-[10px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                AI Guardian Active 24/7
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 font-mono text-[10px] font-bold">
                <EyeOff className="w-3 h-3" />
                Approval Docs Hidden (Zero-Knowledge)
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Twogether Live Command & User Monitoring
            </h1>
            <p className="text-xs text-zinc-300 font-mono">
              Authenticated Owner: <strong className="text-amber-300">{ownerEmail}</strong> — Strictly isolated from Front-End user view.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadTelemetry}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              onClick={onSwitchToFrontend}
              className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-extrabold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Switch to User Front-End
            </button>

            <button
              onClick={onLogoutOwner}
              className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out Back-End
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Zero-Knowledge Document Protection Notice */}
      <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-400/30 flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center shrink-0">
            <FileLock2 className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-cyan-200 font-mono uppercase">
              Zero-Knowledge Document Privacy Shield Enforced
            </p>
            <p className="text-zinc-300 mt-0.5">
              Users&apos; sensitive ID cards, passports, driver&apos;s licenses &amp; birth certificates are inspected ephemerally for 18+ age verification and immediately discarded. Neither users nor the App Owner/Admin can view raw documents — only the cryptographically sealed <span className="text-emerald-300 font-mono font-bold">18+ Verified Digest</span> is visible here.
            </p>
          </div>
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-mono">
          {notice}
        </div>
      )}

      {/* Unacknowledged Real-Time AI Cluster Alerts Strip */}
      {(telemetry?.activeClusterAlerts?.filter((a) => !a.acknowledged).length || 0) > 0 && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/60 via-[#220c1a] to-amber-950/40 border border-rose-500/50 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-200">
              <BellRing className="w-4 h-4 text-rose-400 animate-bounce" />
              <span>
                {telemetry!.activeClusterAlerts.filter((a) => !a.acknowledged).length} Unacknowledged Bad Vibe Cluster Alert(s) Requiring Immediate Attention
              </span>
            </div>
            <button
              onClick={async () => {
                await acknowledgeClusterAlert(ownerToken, 'ALL');
                loadTelemetry();
              }}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-mono font-bold text-zinc-200 cursor-pointer"
            >
              Acknowledge All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {telemetry!.activeClusterAlerts
              .filter((a) => !a.acknowledged)
              .slice(0, 3)
              .map((al) => (
                <button
                  key={al.id}
                  onClick={() => {
                    setSelectedCellOverride(`${al.zoneId}__${al.category}`);
                    setActiveTab('heatmap');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-black/50 hover:bg-rose-500/20 border border-rose-400/40 text-[11px] font-mono text-left cursor-pointer transition-all"
                >
                  <span className="text-rose-300 font-black">{al.heatIntensity}% HEAT</span>{' '}
                  <span className="text-white font-bold">• {al.zoneLabel}</span>{' '}
                  <span className="text-zinc-400">({al.category})</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <GlassCard className="p-3.5 border border-cyan-500/30">
          <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300 uppercase font-bold mb-1">
            <span>Monitored Users</span>
            <Users className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-black text-white">{telemetry?.totalUsers ?? 0}</p>
          <p className="text-[10px] text-zinc-400 font-mono">Registered profiles</p>
        </GlassCard>

        <GlassCard className="p-3.5 border border-emerald-500/30">
          <div className="flex items-center justify-between text-[10px] font-mono text-emerald-300 uppercase font-bold mb-1">
            <span>Online Now</span>
            <Activity className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-black text-emerald-300">{telemetry?.activeOnlineUsers ?? 0}</p>
          <p className="text-[10px] text-zinc-400 font-mono">Live sessions</p>
        </GlassCard>

        <GlassCard className="p-3.5 border border-purple-500/30">
          <div className="flex items-center justify-between text-[10px] font-mono text-purple-300 uppercase font-bold mb-1">
            <span>Actions Audited</span>
            <Bot className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-black text-white">{telemetry?.totalActionsMonitored ?? 0}</p>
          <p className="text-[10px] text-zinc-400 font-mono">24/7 AI Guardian</p>
        </GlassCard>

        <GlassCard className="p-3.5 border border-rose-500/30">
          <div className="flex items-center justify-between text-[10px] font-mono text-rose-300 uppercase font-bold mb-1">
            <span>Blocked Deeds</span>
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-black text-rose-400">{telemetry?.blockedViolationsCount ?? 0}</p>
          <p className="text-[10px] text-zinc-400 font-mono">Scams, hate &amp; crime</p>
        </GlassCard>

        <GlassCard className="p-3.5 border border-amber-500/30">
          <div className="flex items-center justify-between text-[10px] font-mono text-amber-300 uppercase font-bold mb-1">
            <span>Hidden ID Vaults</span>
            <Lock className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-black text-amber-300">{telemetry?.sealedDocumentsCount ?? 0}</p>
          <p className="text-[10px] text-zinc-400 font-mono">100% Zero-Knowledge</p>
        </GlassCard>

        <GlassCard className="p-3.5 border border-pink-500/30">
          <div className="flex items-center justify-between text-[10px] font-mono text-pink-300 uppercase font-bold mb-1">
            <span>Vibe Health</span>
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-black text-pink-300">{telemetry?.communityVibeHealth ?? 100}%</p>
          <p className="text-[10px] text-zinc-400 font-mono">Good Vybes Index</p>
        </GlassCard>
      </div>

      {/* Console Sub-Navigation & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'heatmap'
                ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 border border-rose-400/30'
            }`}
          >
            <Flame className="w-4 h-4" />
            Bad Vibe &amp; Scam Heatmap
            {(telemetry?.heatmap?.criticalZonesCount || 0) > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-black/50 text-rose-200 text-[10px] font-black">
                {telemetry?.heatmap?.criticalZonesCount} Hot
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ai_solver')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'ai_solver'
                ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-black shadow-md shadow-cyan-500/20'
                : 'bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 border border-cyan-400/30'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            AI Issue Solver
            {(telemetry?.aiSolver?.offlineUnreadCount || 0) > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-black">
                {telemetry?.aiSolver?.offlineUnreadCount} Offline
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'profiles'
                ? 'bg-amber-400 text-black shadow-md'
                : 'bg-white/5 text-zinc-300 hover:text-white border border-white/10'
            }`}
          >
            <Users className="w-4 h-4" />
            Monitored Profiles ({filteredUsers.length})
          </button>

          <button
            onClick={() => setActiveTab('guardian_feed')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'guardian_feed'
                ? 'bg-amber-400 text-black shadow-md'
                : 'bg-white/5 text-zinc-300 hover:text-white border border-white/10'
            }`}
          >
            <Bot className="w-4 h-4" />
            AI Guardian Feed ({filteredLogs.length})
          </button>

          <button
            onClick={() => setActiveTab('activity_audit')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'activity_audit'
                ? 'bg-cyan-400 text-black shadow-md'
                : 'bg-white/5 text-zinc-300 hover:text-white border border-white/10'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Activity Audit Log ({filteredAdminAuditLogs.length})
          </button>

          <button
            onClick={() => setActiveTab('revenue_ads')}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === 'revenue_ads'
                ? 'bg-amber-400 text-black shadow-md'
                : 'bg-white/5 text-zinc-300 hover:text-white border border-white/10'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Revenue &amp; Ads Hub
          </button>
        </div>

        {(activeTab === 'profiles' ||
          activeTab === 'ai_solver' ||
          activeTab === 'guardian_feed' ||
          activeTab === 'activity_audit') && (
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'activity_audit'
                  ? 'Search actor, action, target, or surface...'
                  : activeTab === 'ai_solver'
                  ? 'Search issues, domain, or wisdom...'
                  : 'Search user, action, or reason...'
              }
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
            />
          </div>
        )}
      </div>

      {/* TAB 0: BAD VIBE & SCAM PATTERN VISUAL HEATMAP */}
      {activeTab === 'heatmap' && telemetry?.heatmap && (
        <BadVibeHeatmapPanel
          heatmap={telemetry.heatmap}
          users={telemetry.users}
          actionBusyId={actionBusyId}
          focusedCellId={selectedCellOverride}
          onModerateUser={handleModerateUser}
        />
      )}

      {/* TAB 0.5: AUTONOMOUS BACKEND AI ISSUE SOLVER (SMALL & BIG, ADMIN ON OR OFF) */}
      {activeTab === 'ai_solver' && telemetry?.aiSolver && (
        <AiIssueSolverPanel
          ownerToken={ownerToken}
          aiSolver={telemetry.aiSolver}
          users={telemetry.users}
          searchQuery={searchQuery}
          onRefreshTelemetry={loadTelemetry}
          onNotify={(msg) => {
            setNotice(msg);
            setTimeout(() => setNotice(null), 4500);
          }}
        />
      )}

      {/* TAB 1: MONITORED USER PROFILES */}
      {activeTab === 'profiles' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            {(['ALL', 'ACTIVE', 'FLAGGED', 'WARNED', 'SHADOW_BANNED', 'SUSPENDED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-bold border cursor-pointer transition-all ${
                  statusFilter === st
                    ? 'bg-cyan-400 text-black border-cyan-300'
                    : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
                }`}
              >
                {st === 'SHADOW_BANNED' ? '👻 SHADOW-BANNED' : st === 'FLAGGED' ? '🚩 FLAGGED' : st}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredUsers.map((user) => {
              const isSuspended = user.status === 'SUSPENDED';
              const isWarned = user.status === 'WARNED';
              const isFlagged = user.status === 'FLAGGED';
              const isShadowBanned = user.status === 'SHADOW_BANNED' || user.shadowBanned;
              return (
                <GlassCard
                  key={user.id}
                  className={`p-4 border ${
                    isSuspended
                      ? 'border-rose-500/50 bg-rose-950/15'
                      : isShadowBanned
                      ? 'border-purple-500/50 bg-purple-950/20'
                      : isFlagged
                      ? 'border-amber-400/60 bg-amber-950/15'
                      : isWarned
                      ? 'border-amber-500/40'
                      : 'border-white/15'
                  } space-y-3`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-12 h-12 rounded-2xl object-cover border border-white/20"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-black ${
                            user.isOnline ? 'bg-emerald-400' : 'bg-zinc-500'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-black text-white truncate">
                            {user.name}, {user.age}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold border ${
                              user.tier === 'vip'
                                ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                                : 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30'
                            }`}
                          >
                            {user.tier === 'vip' ? '👑 VIP' : 'BASIC'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold border ${
                              isSuspended
                                ? 'bg-rose-500/25 text-rose-300 border-rose-500/50'
                                : isShadowBanned
                                ? 'bg-purple-500/30 text-purple-200 border-purple-400/60'
                                : isFlagged
                                ? 'bg-amber-500/30 text-amber-200 border-amber-400/60'
                                : isWarned
                                ? 'bg-amber-500/25 text-amber-300 border-amber-500/50'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            {isShadowBanned ? '👻 SHADOW-BANNED' : isFlagged ? '🚩 FLAGGED' : user.status}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-zinc-400 truncate">
                          {user.email} • {user.location}
                          {(user.scamPatternScore || 0) >= 40 && (
                            <span className="text-rose-400 font-bold"> • Scam Risk {user.scamPatternScore}%</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono">
                      <span className="text-[10px] text-zinc-400 block">VIBE SCORE</span>
                      <span
                        className={`text-base font-black ${
                          user.vibeScore >= 85
                            ? 'text-emerald-400'
                            : user.vibeScore >= 60
                            ? 'text-amber-300'
                            : 'text-rose-400'
                        }`}
                      >
                        {user.vibeScore}%
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1 text-xs">
                    <p className="text-cyan-300 font-semibold truncate">{user.tagline}</p>
                    <p className="text-zinc-300 line-clamp-2 text-[11px]">{user.bio}</p>
                  </div>

                  {/* Sensitive Document Vault — Strictly Sealed & Hidden from Users and Admin */}
                  <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-400/30 flex items-center justify-between gap-2 text-[10px] font-mono">
                    <div className="flex items-center gap-2 min-w-0">
                      <Lock className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-cyan-200 font-bold block truncate">
                          🔒 Approval Doc: SEALED &amp; HIDDEN (Users &amp; Admin Blocked)
                        </span>
                        <span className="text-zinc-400 block truncate">
                          {user.documentVault.verified18Plus
                            ? `18+ Verified Digest: ${user.documentVault.vaultDigest || 'sha256:sealed'}`
                            : '18+ Document Not Yet Submitted'}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded font-bold shrink-0 ${
                        user.documentVault.verified18Plus
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {user.documentVault.verified18Plus ? '18+ OK' : 'PENDING'}
                    </span>
                  </div>

                  {/* Live Action Stats & Owner Enforcement Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-white/10 text-[11px] font-mono">
                    <div className="text-zinc-400 space-y-0.5 min-w-0">
                      <p className="truncate">
                        Last Action: <span className="text-zinc-200">{user.lastActionSummary}</span>
                      </p>
                      <p>
                        Audited: <strong className="text-white">{user.totalActionsMonitored}</strong> • Blocked:{' '}
                        <strong className="text-rose-400">{user.blockedActionsCount}</strong> • Strikes:{' '}
                        <strong className="text-amber-300">{user.strikesCount}/7</strong>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        disabled={actionBusyId === user.id}
                        onClick={() =>
                          handleModerateUser(
                            user.id,
                            {
                              status: 'FLAGGED',
                              flagReason: 'Proactively flagged by Owner in User Console',
                              sourceZone: 'Monitored Profiles Console',
                            },
                            'Proactive Flag'
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Flag className="w-3 h-3" /> Flag
                      </button>

                      <button
                        disabled={actionBusyId === user.id}
                        onClick={() =>
                          handleModerateUser(
                            user.id,
                            {
                              status: 'SHADOW_BANNED',
                              flagReason: 'Shadow-banned silently by Owner',
                              sourceZone: 'Monitored Profiles Console',
                            },
                            'Shadow-Ban'
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-200 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Ghost className="w-3 h-3" /> Shadow-Ban
                      </button>

                      <button
                        disabled={actionBusyId === user.id}
                        onClick={() =>
                          handleModerateUser(user.id, { status: 'WARNED' }, 'Warn User')
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/40 text-orange-200 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <AlertTriangle className="w-3 h-3" /> Warn
                      </button>

                      {!isSuspended ? (
                        <button
                          disabled={actionBusyId === user.id}
                          onClick={() =>
                            handleModerateUser(
                              user.id,
                              { status: 'SUSPENDED' },
                              'Suspend Account'
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Ban className="w-3 h-3" /> Suspend
                        </button>
                      ) : (
                        <button
                          disabled={actionBusyId === user.id}
                          onClick={() =>
                            handleModerateUser(
                              user.id,
                              { status: 'ACTIVE', resetStrikes: true },
                              'Reinstate & Reset Strikes'
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Reinstate
                        </button>
                      )}

                      {(user.strikesCount > 0 || isFlagged || isShadowBanned) && !isSuspended && (
                        <button
                          disabled={actionBusyId === user.id}
                          onClick={() =>
                            handleModerateUser(
                              user.id,
                              { status: 'ACTIVE', resetStrikes: true },
                              'Clear Flags & Strikes'
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 font-bold cursor-pointer disabled:opacity-50"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: AI LIVE ACTION GUARDIAN FEED */}
      {activeTab === 'guardian_feed' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
            {(Object.keys(CATEGORY_LABELS) as Array<SafetyViolationCategory | 'ALL'>).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl font-bold border cursor-pointer transition-all ${
                  categoryFilter === cat
                    ? 'bg-amber-400 text-black border-amber-300'
                    : `${CATEGORY_LABELS[cat].colorClass} opacity-80 hover:opacity-100`
                }`}
              >
                {CATEGORY_LABELS[cat].label}
                {cat !== 'ALL' && telemetry?.categoryCounts
                  ? ` (${telemetry.categoryCounts[cat] || 0})`
                  : ''}
              </button>
            ))}
          </div>

          <GlassCard className="p-0 overflow-hidden border border-white/15">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 font-mono text-[10px] uppercase text-zinc-400">
                    <th className="p-3">Time</th>
                    <th className="p-3">Member</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Category / Severity</th>
                    <th className="p-3">Inspected Content &amp; AI Reasoning</th>
                    <th className="p-3">Enforcement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-zinc-400 font-mono">
                        No audited actions match the selected filter yet.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const isBlocked = log.verdict === 'BLOCKED_VIOLATION';
                      return (
                        <tr
                          key={log.id}
                          className={`${isBlocked ? 'bg-rose-950/20' : 'hover:bg-white/5'} transition-colors`}
                        >
                          <td className="p-3 font-mono text-[10px] text-zinc-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-white block">{log.userName}</span>
                            <span className="text-[10px] font-mono text-zinc-400">{log.userId}</span>
                          </td>
                          <td className="p-3 font-mono text-[10px] uppercase text-cyan-300 font-bold">
                            {log.actionType}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${
                                CATEGORY_LABELS[log.category]?.colorClass || 'bg-white/10 text-white'
                              }`}
                            >
                              {log.category} ({log.severity})
                            </span>
                          </td>
                          <td className="p-3 max-w-md space-y-1">
                            <p className="text-zinc-200 font-medium break-words">
                              {log.contentSnippet}
                            </p>
                            <p className="text-[10px] font-mono text-zinc-400">
                              AI: {log.aiReasoning}
                            </p>
                          </td>
                          <td className="p-3 font-mono text-[10px] font-bold">
                            <span className={isBlocked ? 'text-rose-400' : 'text-emerald-400'}>
                              {log.enforcementAction}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB 3: IMMUTABLE ADMIN ACTIVITY AUDIT LOG */}
      {activeTab === 'activity_audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
              {(
                [
                  { id: 'ALL', label: 'All Admin Actions' },
                  { id: 'ENFORCEMENT', label: 'Account Enforcement' },
                  { id: 'AI_SOLVER', label: 'AI Issue Solver' },
                  { id: 'ALERTS', label: 'Cluster Alerts' },
                  { id: 'AUTH', label: 'Owner Auth Sessions' },
                  { id: 'BILLING', label: 'Billing & Policy' },
                ] as const
              ).map((scope) => (
                <button
                  key={scope.id}
                  onClick={() => setAuditScopeFilter(scope.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold border cursor-pointer transition-all ${
                    auditScopeFilter === scope.id
                      ? 'bg-cyan-400 text-black border-cyan-300'
                      : 'bg-white/5 text-zinc-300 border-white/10 hover:text-white'
                  }`}
                >
                  {scope.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportAdminAuditCsv}
              disabled={filteredAdminAuditLogs.length === 0}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-40 self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              Export Audit CSV
            </button>
          </div>

          <GlassCard className="p-0 overflow-hidden border border-cyan-500/30">
            <div className="p-3.5 bg-cyan-950/30 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <span className="text-cyan-200 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Backend Accountability Ledger — Every administrative action is timestamped &amp; recorded server-side
              </span>
              <span className="text-zinc-400">
                Showing {filteredAdminAuditLogs.length} record(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 font-mono text-[10px] uppercase text-zinc-400">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Actor</th>
                    <th className="p-3">Administrative Action</th>
                    <th className="p-3">Target</th>
                    <th className="p-3">State Change &amp; Audit Details</th>
                    <th className="p-3">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAdminAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-zinc-400 font-mono">
                        No administrative audit entries match your search or filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAdminAuditLogs.map((entry) => {
                      const isDenied = entry.outcome === 'DENIED';
                      const actionBadgeClass =
                        entry.actionType === 'USER_SHADOW_BAN'
                          ? 'bg-purple-500/25 text-purple-200 border-purple-400/50'
                          : entry.actionType === 'USER_PROACTIVE_FLAG'
                          ? 'bg-amber-500/25 text-amber-200 border-amber-400/50'
                          : entry.actionType === 'USER_SUSPEND'
                          ? 'bg-rose-500/25 text-rose-200 border-rose-400/50'
                          : entry.actionType === 'USER_REINSTATE_CLEAR'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                          : entry.actionType === 'CLUSTER_ALERT_ACK'
                          ? 'bg-orange-500/20 text-orange-200 border-orange-400/40'
                          : entry.actionType === 'AI_ISSUE_AUTO_RESOLVED' ||
                            entry.actionType === 'AI_SOLVER_POLICY_UPDATE' ||
                            entry.actionType === 'AI_SOLVER_OVERRIDE'
                          ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400/40'
                          : 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40';

                      return (
                        <tr
                          key={entry.id}
                          className={`${
                            isDenied ? 'bg-rose-950/20' : 'hover:bg-white/5'
                          } transition-colors`}
                        >
                          <td className="p-3 font-mono text-[10px] text-zinc-300 whitespace-nowrap">
                            <span className="flex items-center gap-1 text-white font-bold">
                              <Clock className="w-3 h-3 text-cyan-400" />
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="text-[9px] text-zinc-500 block">
                              {new Date(entry.timestamp).toLocaleDateString()}
                            </span>
                          </td>

                          <td className="p-3 font-mono text-[11px]">
                            <span className="font-bold text-amber-300 block">
                              {entry.actorEmail}
                            </span>
                            <span className="text-[10px] text-zinc-500 block">
                              {entry.sourceSurface}
                            </span>
                          </td>

                          <td className="p-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${actionBadgeClass}`}
                            >
                              {entry.actionLabel}
                            </span>
                            <span className="block text-[9px] font-mono text-zinc-500 mt-1">
                              {entry.actionType}
                            </span>
                          </td>

                          <td className="p-3 font-mono text-[11px]">
                            <span className="font-bold text-white block">
                              {entry.targetName || 'System / Session'}
                            </span>
                            {entry.targetId && (
                              <span className="text-[10px] text-zinc-400">{entry.targetId}</span>
                            )}
                          </td>

                          <td className="p-3 max-w-md space-y-1">
                            <p className="text-zinc-200 text-xs">{entry.details}</p>
                            {(entry.previousState || entry.newState) && (
                              <p className="text-[10px] font-mono text-cyan-300">
                                {entry.previousState ? `${entry.previousState} → ` : ''}
                                <strong>{entry.newState || ''}</strong>
                              </p>
                            )}
                          </td>

                          <td className="p-3 font-mono text-[10px] font-black whitespace-nowrap">
                            <span
                              className={`px-2 py-1 rounded-lg border ${
                                isDenied
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              }`}
                            >
                              {entry.outcome}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB 4: REVENUE & ADS HUB */}
      {activeTab === 'revenue_ads' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard className="p-5 border border-amber-400/40 bg-gradient-to-br from-amber-500/15 to-black space-y-3" glowColor="amber">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black">
                <Crown className="w-6 h-6 fill-black" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Shadow Admin Billing &amp; Google Pay Ledger</h3>
                <p className="text-xs text-zinc-300">
                  Review Google Pay subscription settlements, MRR, and payout account settings.
                </p>
              </div>
            </div>
            <button
              onClick={onOpenBillingPortal}
              className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs cursor-pointer transition-all"
            >
              Open Shadow Admin Billing Portal →
            </button>
          </GlassCard>

          <GlassCard className="p-5 border border-emerald-400/40 bg-gradient-to-br from-emerald-500/15 to-black space-y-3" glowColor="cyan">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-400 text-black flex items-center justify-center font-black">
                <Tv className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Owner Ads Center &amp; Monetization</h3>
                <p className="text-xs text-zinc-300">
                  Manage 5-minute ad impressions, $3.89/mo ad-free subscriptions, and payouts.
                </p>
              </div>
            </div>
            <button
              onClick={onOpenAdsCenter}
              className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs cursor-pointer transition-all"
            >
              Open Owner Ads Center →
            </button>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
