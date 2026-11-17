import React, { useState } from 'react';
import {
  BrainCircuit,
  Cpu,
  ShieldCheck,
  Sparkles,
  Wrench,
  Wifi,
  WifiOff,
  CheckCircle2,
  RotateCcw,
  Zap,
  Play,
  Pause,
  MoonStar,
  Activity,
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import {
  AiIssueSolverSnapshot,
  AiSolverPolicyMode,
  BackendIssueRecord,
  IssueDomain,
  IssueMagnitude,
  MonitoredUserRecord,
} from '../types';
import {
  overrideAiSolverIssue,
  runBackendSelfHealSweep,
  solveBackendIssueWithAI,
  updateAiSolverSettings,
} from '../services/aiGuardianService';

interface AiIssueSolverPanelProps {
  ownerToken: string;
  aiSolver: AiIssueSolverSnapshot;
  users: MonitoredUserRecord[];
  searchQuery: string;
  onRefreshTelemetry: () => void;
  onNotify: (msg: string) => void;
}

const MAGNITUDE_STYLES: Record<IssueMagnitude, string> = {
  SMALL: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40',
  MEDIUM: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
  BIG: 'bg-orange-500/25 text-orange-200 border-orange-400/50',
  CRITICAL: 'bg-rose-500/25 text-rose-200 border-rose-500/50',
};

const QUICK_SCENARIOS: Array<{
  label: string;
  magnitude: IssueMagnitude;
  domain: IssueDomain;
  title: string;
  description: string;
  targetId?: string;
}> = [
  {
    label: 'Small: VR & Beats Sync Drift',
    magnitude: 'SMALL',
    domain: 'REALTIME_SYNC',
    title: 'Minor Shared Beats clock drift & stale VR lounge avatars',
    description:
      'Audio playback synced 3 seconds behind for 2 listeners and orphaned VR socket pointers need silent cleanup.',
  },
  {
    label: 'Medium: Stuck Google Pay Receipt',
    magnitude: 'MEDIUM',
    domain: 'BILLING_PAYMENTS',
    title: 'VIP Google Pay receipt awaiting auto-settlement approval',
    description:
      'User completed Google Pay checkout but VIP entitlement webhook settlement status is lingering in pending state.',
  },
  {
    label: 'Big: Scam Outreach Burst',
    magnitude: 'BIG',
    domain: 'SECURITY_MODERATION',
    title: 'Elevated CashApp/M-Pesa scam outreach across Reels & DMs',
    description:
      'Account Devon Brooks detected sending repeated copy-paste financial requests to newly matched singles.',
    targetId: 'mon_suspect_spam',
  },
  {
    label: 'Critical: Node Heap & Fraud Ring',
    magnitude: 'CRITICAL',
    domain: 'INFRASTRUCTURE',
    title: 'High telemetry buffer load + coordinated phishing lure probe',
    description:
      'Audit log queues growing rapidly while external shortened phishing links probe Couples Arcade custom dares.',
    targetId: 'mon_suspect_scam',
  },
];

export const AiIssueSolverPanel: React.FC<AiIssueSolverPanelProps> = ({
  ownerToken,
  aiSolver,
  users,
  searchQuery,
  onRefreshTelemetry,
  onNotify,
}) => {
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [selectedMagnitude, setSelectedMagnitude] = useState<IssueMagnitude | 'AUTO'>('AUTO');
  const [selectedDomain, setSelectedDomain] = useState<IssueDomain | 'AUTO'>('AUTO');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [magnitudeFilter, setMagnitudeFilter] = useState<'ALL' | IssueMagnitude>('ALL');
  const [presenceFilter, setPresenceFilter] = useState<'ALL' | 'OFFLINE' | 'ONLINE'>('ALL');
  const [isSolving, setIsSolving] = useState(false);
  const [isSweeping, setIsSweeping] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [busyIssueId, setBusyIssueId] = useState<string | null>(null);

  const handleRunSweep = async () => {
    setIsSweeping(true);
    const res = await runBackendSelfHealSweep(ownerToken);
    setIsSweeping(false);
    if (res.success) {
      onNotify(
        `Backend AI Watchdog scanned ${res.checkedCount ?? 0} subsystems and resolved ${res.resolvedCount ?? 0} issue(s) (${aiSolver.adminPresence} mode).`
      );
      onRefreshTelemetry();
    } else {
      onNotify(res.message || 'Sweep failed.');
    }
  };

  const handleSolveCustomIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueTitle.trim() && !issueDescription.trim()) return;
    setIsSolving(true);
    const targetUser = users.find((u) => u.id === selectedTargetId);
    const res = await solveBackendIssueWithAI(ownerToken, {
      title: issueTitle.trim() || issueDescription.trim().slice(0, 72),
      description: issueDescription.trim() || issueTitle.trim(),
      magnitude: selectedMagnitude === 'AUTO' ? undefined : selectedMagnitude,
      domain: selectedDomain === 'AUTO' ? undefined : selectedDomain,
      affectedTargetId: targetUser?.id || (selectedTargetId || undefined),
      affectedTargetName: targetUser?.name,
    });
    setIsSolving(false);
    if (res.success && res.issue) {
      onNotify(
        `AI Solver resolved ${res.issue.magnitude} issue ("${res.issue.title}") in ADMIN ${res.issue.adminStateAtHandling} mode.`
      );
      setIssueTitle('');
      setIssueDescription('');
      setSelectedTargetId('');
      onRefreshTelemetry();
    } else {
      onNotify(res.message || 'Failed to run Backend AI Issue Solver.');
    }
  };

  const handleUpdateSettings = async (patch: {
    policyMode?: AiSolverPolicyMode;
    engineActive?: boolean;
    simulatedOffline?: boolean;
    markOfflineRead?: boolean;
  }) => {
    setIsUpdatingSettings(true);
    const res = await updateAiSolverSettings(ownerToken, patch);
    setIsUpdatingSettings(false);
    if (res.success) {
      onRefreshTelemetry();
      if (typeof patch.simulatedOffline === 'boolean') {
        onNotify(
          patch.simulatedOffline
            ? 'Simulated Admin OFFLINE enabled — Backend AI will now handle issues autonomously in Night-Watch mode.'
            : 'Returned to LIVE Admin presence tracking.'
        );
      } else if (patch.markOfflineRead) {
        onNotify('Marked while-offline resolutions as reviewed.');
      }
    }
  };

  const handleOverride = async (issueId: string, action: 'APPROVE' | 'REVERT') => {
    setBusyIssueId(issueId);
    const res = await overrideAiSolverIssue(ownerToken, issueId, action);
    setBusyIssueId(null);
    if (res.success) {
      onNotify(
        action === 'REVERT'
          ? 'Overrode and reverted AI Solver containment cleanly.'
          : 'Verified and approved AI Solver resolution.'
      );
      onRefreshTelemetry();
    }
  };

  const filteredIssues: BackendIssueRecord[] = (aiSolver.issues || []).filter((iss) => {
    const matchesMag = magnitudeFilter === 'ALL' || iss.magnitude === magnitudeFilter;
    const matchesPresence =
      presenceFilter === 'ALL' || iss.adminStateAtHandling === presenceFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      iss.title.toLowerCase().includes(q) ||
      iss.description.toLowerCase().includes(q) ||
      iss.rootCauseAnalysis.toLowerCase().includes(q) ||
      iss.aiWisdomStrategy.toLowerCase().includes(q) ||
      (iss.affectedTargetName || '').toLowerCase().includes(q) ||
      iss.domain.toLowerCase().includes(q);
    return matchesMag && matchesPresence && matchesSearch;
  });

  const isAdminOffline = aiSolver.adminPresence === 'OFFLINE';

  return (
    <div className="space-y-5">
      {/* Top Autonomous Backend AI Status & Admin ON/OFF Switchboard */}
      <GlassCard
        className={`p-5 border ${
          isAdminOffline
            ? 'border-indigo-400/50 bg-gradient-to-r from-indigo-950/40 via-[#121024] to-purple-950/30'
            : 'border-emerald-400/40 bg-gradient-to-r from-emerald-950/30 via-[#111524] to-cyan-950/30'
        }`}
        glowColor="cyan"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] font-bold">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-400 text-black uppercase">
                <BrainCircuit className="w-3.5 h-3.5" />
                Backend-Only Autonomous AI Solver
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
                  aiSolver.engineStatus === 'ACTIVE_24_7'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                    : 'bg-zinc-800 text-zinc-400 border-white/10'
                }`}
              >
                <Activity className="w-3 h-3" />
                {aiSolver.engineStatus === 'ACTIVE_24_7'
                  ? '24/7 Watchdog Active'
                  : 'Watchdog Paused'}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
                  isAdminOffline
                    ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400/50'
                    : 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                }`}
              >
                {isAdminOffline ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                Admin Mode: {aiSolver.adminPresence}
                {aiSolver.simulatedAdminOffline ? ' (Simulated)' : ''}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white">
              Wise Issue Resolution Engine (Small &amp; Big Issues — Admin ON or OFF)
            </h2>
            <p className="text-xs text-zinc-300 max-w-3xl">
              Operates strictly on the server backend, invisible to regular users. Automatically
              diagnoses and solves small housekeeping glitches immediately, and applies safe,
              reversible containment on big/critical threats whether you are actively watching or
              signed out.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              disabled={isUpdatingSettings}
              onClick={() =>
                handleUpdateSettings({ simulatedOffline: !aiSolver.simulatedAdminOffline })
              }
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold border flex items-center gap-1.5 cursor-pointer transition-all ${
                aiSolver.simulatedAdminOffline
                  ? 'bg-indigo-500 text-white border-indigo-300 shadow-md shadow-indigo-500/25'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-200 border-white/15'
              }`}
              title="Test how the AI behaves autonomously when Admin is offline"
            >
              {aiSolver.simulatedAdminOffline ? (
                <MoonStar className="w-3.5 h-3.5" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-indigo-300" />
              )}
              {aiSolver.simulatedAdminOffline ? 'Admin OFF (Sim Active)' : 'Simulate Admin OFF'}
            </button>

            <button
              disabled={isUpdatingSettings}
              onClick={() =>
                handleUpdateSettings({
                  engineActive: aiSolver.engineStatus !== 'ACTIVE_24_7',
                })
              }
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold border flex items-center gap-1.5 cursor-pointer transition-all ${
                aiSolver.engineStatus === 'ACTIVE_24_7'
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-400/40'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-400/40'
              }`}
            >
              {aiSolver.engineStatus === 'ACTIVE_24_7' ? (
                <>
                  <Pause className="w-3.5 h-3.5" /> Pause Cron
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Resume 24/7
                </>
              )}
            </button>

            <button
              disabled={isSweeping}
              onClick={handleRunSweep}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:brightness-110 text-black text-xs font-extrabold flex items-center gap-1.5 shadow-md cursor-pointer transition-all disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${isSweeping ? 'animate-spin' : ''}`} />
              {isSweeping ? 'Sweeping Backend...' : 'Run Full Self-Heal Sweep'}
            </button>
          </div>
        </div>

        {/* Policy Selector & Compact Stats */}
        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-7 flex flex-wrap items-center gap-2 font-mono text-[10px]">
            <span className="text-zinc-400 uppercase font-bold mr-1">Wisdom Policy:</span>
            {(
              [
                { id: 'WISE_24_7_AUTOPILOT', label: 'Wise 24/7 Autopilot (ON & OFF)' },
                { id: 'STRICT_OFFLINE_TAKEOVER', label: 'Strict Offline Takeover' },
                { id: 'ADMIN_COPILOT', label: 'Co-Pilot (Review Big When ON)' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                disabled={isUpdatingSettings}
                onClick={() => handleUpdateSettings({ policyMode: mode.id })}
                className={`px-3 py-1.5 rounded-lg font-bold border cursor-pointer transition-all ${
                  aiSolver.policyMode === mode.id
                    ? 'bg-cyan-400 text-black border-cyan-300'
                    : 'bg-black/40 text-zinc-300 border-white/10 hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="lg:col-span-5 grid grid-cols-4 gap-2 text-center font-mono">
            <div className="p-2 rounded-xl bg-black/40 border border-white/10">
              <p className="text-base font-black text-emerald-300">{aiSolver.systemHealthScore}%</p>
              <p className="text-[9px] text-zinc-400 uppercase">Health</p>
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-white/10">
              <p className="text-base font-black text-white">{aiSolver.totalIssuesSolved}</p>
              <p className="text-[9px] text-zinc-400 uppercase">Solved</p>
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-indigo-400/30">
              <p className="text-base font-black text-indigo-300">
                {aiSolver.solvedWhileOfflineCount}
              </p>
              <p className="text-[9px] text-zinc-400 uppercase">While OFF</p>
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-white/10">
              <p className="text-base font-black text-cyan-300">
                {aiSolver.smallIssuesSolved}/{aiSolver.bigIssuesSolved}
              </p>
              <p className="text-[9px] text-zinc-400 uppercase">Sm / Big</p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Executive Wake-Up Briefing for Issues Solved While Admin Was Offline */}
      {aiSolver.offlineUnreadCount > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-[#191438] to-cyan-950/50 border border-indigo-400/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/25 border border-indigo-400/50 text-indigo-200 flex items-center justify-center shrink-0">
              <MoonStar className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <p className="font-mono font-black text-indigo-200 uppercase">
                Executive Wake-Up Briefing: {aiSolver.offlineUnreadCount} Issue(s) Solved While You Were Offline
              </p>
              <p className="text-zinc-300 mt-0.5">
                While no Admin was active on the console, the Backend AI Watchdog safely contained
                threats and repaired backend state without interrupting users. Review or override any
                decision below.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleUpdateSettings({ markOfflineRead: true })}
            className="px-3.5 py-2 rounded-xl bg-indigo-400 hover:bg-indigo-300 text-black font-extrabold text-xs shrink-0 cursor-pointer transition-all"
          >
            Mark Briefings Reviewed
          </button>
        </div>
      )}

      {/* Interactive "Solve Any Issue (Big or Small)" Command Panel */}
      <GlassCard className="p-5 border border-white/15 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-cyan-400" />
              Diagnose &amp; Solve Any Backend Issue Now (Big or Small)
            </h3>
            <p className="text-[11px] text-zinc-400">
              Describe any bug, fraud escalation, billing snag, VR lag, or sync issue — Gemini AI
              triages severity and adapts its resolution strategy to current Admin ON/OFF state.
            </p>
          </div>
        </div>

        {/* One-Click Diagnostic Presets */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
          <span className="text-zinc-400 font-bold">Quick Scenarios:</span>
          {QUICK_SCENARIOS.map((sc) => (
            <button
              key={sc.label}
              type="button"
              onClick={() => {
                setIssueTitle(sc.title);
                setIssueDescription(sc.description);
                setSelectedMagnitude(sc.magnitude);
                setSelectedDomain(sc.domain);
                setSelectedTargetId(sc.targetId || '');
              }}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-400/40 text-zinc-200 cursor-pointer transition-all"
            >
              {sc.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSolveCustomIssue} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
              placeholder="Issue headline (e.g., Audio lag in Lounge or Scam link burst)"
              className="md:col-span-2 px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
            />
            <select
              value={selectedMagnitude}
              onChange={(e) => setSelectedMagnitude(e.target.value as IssueMagnitude | 'AUTO')}
              className="px-3 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="AUTO">Magnitude: AI Auto-Triage</option>
              <option value="SMALL">SMALL (Housekeeping / Minor)</option>
              <option value="MEDIUM">MEDIUM (Targeted Repair)</option>
              <option value="BIG">BIG (Multi-User / Billing)</option>
              <option value="CRITICAL">CRITICAL (Emergency / Threat)</option>
            </select>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value as IssueDomain | 'AUTO')}
              className="px-3 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="AUTO">Domain: AI Auto-Detect</option>
              <option value="SECURITY_MODERATION">Security &amp; Moderation</option>
              <option value="BILLING_PAYMENTS">Billing &amp; Google Pay</option>
              <option value="REALTIME_SYNC">Real-Time VR &amp; Beats Sync</option>
              <option value="INFRASTRUCTURE">Backend Infrastructure</option>
              <option value="USER_EXPERIENCE">User Experience</option>
              <option value="COMPLIANCE">Compliance &amp; 18+ Vault</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <textarea
              rows={2}
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="Describe symptoms, affected users, or system anomaly so AI can diagnose root cause & execute wise backend fix..."
              className="md:col-span-3 px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
            />
            <div className="flex flex-col justify-between gap-2">
              <select
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                className="px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-[11px] font-mono text-zinc-200 focus:outline-none focus:border-cyan-400"
              >
                <option value="">Target: Whole System / Auto</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    User: {u.name} ({u.status})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isSolving || (!issueTitle.trim() && !issueDescription.trim())}
                className="w-full py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-40"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isSolving ? 'animate-spin' : ''}`} />
                {isSolving ? 'AI Diagnosing & Solving...' : 'Solve Issue With Backend AI'}
              </button>
            </div>
          </div>
        </form>
      </GlassCard>

      {/* Filter Bar & Resolution Ledger */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-[10px]">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['ALL', 'SMALL', 'MEDIUM', 'BIG', 'CRITICAL'] as const).map((mag) => (
              <button
                key={mag}
                onClick={() => setMagnitudeFilter(mag)}
                className={`px-3 py-1 rounded-lg font-bold border cursor-pointer transition-all ${
                  magnitudeFilter === mag
                    ? 'bg-cyan-400 text-black border-cyan-300'
                    : 'bg-white/5 text-zinc-300 border-white/10 hover:text-white'
                }`}
              >
                {mag === 'ALL' ? `All Issues (${aiSolver.issues.length})` : mag}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {(['ALL', 'OFFLINE', 'ONLINE'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPresenceFilter(p)}
                className={`px-3 py-1 rounded-lg font-bold border cursor-pointer transition-all ${
                  presenceFilter === p
                    ? 'bg-indigo-400 text-black border-indigo-300'
                    : 'bg-white/5 text-zinc-300 border-white/10 hover:text-white'
                }`}
              >
                {p === 'ALL'
                  ? 'All Admin States'
                  : p === 'OFFLINE'
                  ? 'Solved While Admin OFF'
                  : 'Solved While Admin ON'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredIssues.length === 0 ? (
            <GlassCard className="p-6 text-center text-xs font-mono text-zinc-400 border border-white/10">
              No AI-solved backend issues match your filter yet. Click &quot;Run Full Self-Heal Sweep&quot;
              or submit any issue above.
            </GlassCard>
          ) : (
            filteredIssues.map((issue) => {
              const wasOffline = issue.adminStateAtHandling === 'OFFLINE';
              const isOverridden = issue.status === 'OVERRIDDEN_BY_OWNER';
              return (
                <GlassCard
                  key={issue.id}
                  className={`p-4 border space-y-3 ${
                    issue.offlineResolvedUnread
                      ? 'border-indigo-400/60 bg-indigo-950/20'
                      : isOverridden
                      ? 'border-zinc-500/40 bg-zinc-900/40'
                      : 'border-white/15'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-md border ${
                            MAGNITUDE_STYLES[issue.magnitude]
                          }`}
                        >
                          {issue.magnitude}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-zinc-200 border border-white/10">
                          {issue.domain.replace('_', ' ')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                            wasOffline
                              ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400/40'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                          }`}
                        >
                          {wasOffline ? (
                            <MoonStar className="w-3 h-3" />
                          ) : (
                            <Wifi className="w-3 h-3" />
                          )}
                          Admin {issue.adminStateAtHandling}
                        </span>
                        {issue.offlineResolvedUnread && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-400 text-black font-black">
                            NEW OFFLINE BRIEFING
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-white">{issue.title}</h4>
                      <p className="text-xs text-zinc-300">{issue.description}</p>
                    </div>

                    <div className="flex sm:flex-col items-end justify-between gap-1 shrink-0 font-mono text-[10px]">
                      <span
                        className={`px-2.5 py-1 rounded-lg border font-extrabold ${
                          issue.status === 'AUTO_RESOLVED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                            : issue.status === 'CONTAINED_SAFE'
                            ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40'
                            : issue.status === 'OVERRIDDEN_BY_OWNER'
                            ? 'bg-zinc-700/40 text-zinc-300 border-zinc-500/40'
                            : 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                        }`}
                      >
                        {issue.status}
                      </span>
                      <span className="text-zinc-400">
                        {new Date(issue.detectedAt).toLocaleTimeString()} • {issue.confidenceScore}% conf.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                      <p className="text-[10px] font-mono uppercase font-bold text-cyan-300 flex items-center gap-1">
                        <Cpu className="w-3 h-3" /> Root Cause &amp; Wise Strategy
                      </p>
                      <p className="text-zinc-300">{issue.rootCauseAnalysis}</p>
                      <p className="text-indigo-200/90 text-[11px] pt-1 border-t border-white/10">
                        <strong>Wisdom:</strong> {issue.aiWisdomStrategy}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                      <p className="text-[10px] font-mono uppercase font-bold text-emerald-300 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Backend Actions Executed
                      </p>
                      <ul className="space-y-1 text-[11px] text-zinc-200">
                        {issue.actionsTaken.map((act, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-[10px] font-mono">
                    <span className="text-zinc-400">
                      Source: <strong className="text-zinc-200">{issue.detectedBy}</strong>
                      {issue.affectedTargetName && (
                        <>
                          {' '}
                          • Target: <strong className="text-amber-300">{issue.affectedTargetName}</strong>
                        </>
                      )}
                    </span>

                    {!isOverridden && (
                      <div className="flex items-center gap-2">
                        <button
                          disabled={busyIssueId === issue.id}
                          onClick={() => handleOverride(issue.id, 'APPROVE')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Approve Resolution
                        </button>
                        {issue.reversible && (
                          <button
                            disabled={busyIssueId === issue.id}
                            onClick={() => handleOverride(issue.id, 'REVERT')}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/35 text-rose-200 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <RotateCcw className="w-3 h-3" /> Override / Revert
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </GlassCard>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
