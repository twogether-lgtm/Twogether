import React, { useState, useMemo, useEffect } from 'react';
import {
  Flame,
  ShieldAlert,
  Flag,
  Ghost,
  Ban,
  CheckCircle2,
  Globe,
  Grid3X3,
  Activity,
  Lock,
  AlertTriangle,
  Sparkles,
  Radar,
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import {
  HeatmapMatrixCell,
  HeatmapRegionHotspot,
  MonitoredAccountStatus,
  MonitoredUserRecord,
  OwnerHeatmapSnapshot,
  SafetyViolationCategory,
} from '../types';

interface BadVibeHeatmapPanelProps {
  heatmap: OwnerHeatmapSnapshot;
  users: MonitoredUserRecord[];
  actionBusyId: string | null;
  focusedCellId?: string | null;
  onModerateUser: (
    userId: string,
    payload: {
      status?: MonitoredAccountStatus;
      resetStrikes?: boolean;
      flagReason?: string;
      sourceZone?: string;
    },
    label: string
  ) => Promise<void> | void;
}

const THREAT_COLUMNS: Array<{
  key: Exclude<SafetyViolationCategory, 'GOOD_VYBES'>;
  shortLabel: string;
  fullLabel: string;
}> = [
  { key: 'SCAM_FRAUD', shortLabel: 'Scam & Fraud', fullLabel: 'Scam & Financial Fraud' },
  { key: 'ILLEGAL_BUSINESS', shortLabel: 'Illegal Trade', fullLabel: 'Illegal Business & Contraband' },
  { key: 'DISCRIMINATION', shortLabel: 'Hate / Bias', fullLabel: 'Discrimination & Slurs' },
  { key: 'HARASSMENT_HARM', shortLabel: 'Harm / Extort', fullLabel: 'Harassment, Harm & Extortion' },
  { key: 'EXPLICIT_NUDITY', shortLabel: 'Explicit Nudity', fullLabel: 'Unclad / Explicit Nudity' },
];

const QUICK_FLAG_REASONS = [
  'Scam Pattern: Crypto / Wire / Gift-Card Solicitation',
  'Off-Platform Phishing / WhatsApp Funneling',
  'High Bad-Vibe Cluster in Live Chats',
  'Illegal Business / Paid Solicitation Probe',
  'Proactive Pre-Emptive Risk Watch',
];

function getHeatCellStyle(intensity: number, isSelected: boolean): string {
  const ring = isSelected ? 'ring-2 ring-white scale-[1.03] shadow-xl' : '';
  if (intensity >= 75) {
    return `bg-gradient-to-br from-rose-600/80 via-red-600/75 to-rose-900/90 border-rose-400 text-white shadow-lg shadow-rose-500/25 ${ring}`;
  }
  if (intensity >= 50) {
    return `bg-gradient-to-br from-orange-500/65 via-amber-600/55 to-orange-900/75 border-orange-400/80 text-orange-50 shadow-md shadow-orange-500/20 ${ring}`;
  }
  if (intensity >= 20) {
    return `bg-gradient-to-br from-amber-500/35 to-yellow-900/40 border-amber-400/50 text-amber-100 ${ring}`;
  }
  if (intensity > 0) {
    return `bg-cyan-500/15 border-cyan-400/30 text-cyan-200 ${ring}`;
  }
  return `bg-emerald-500/10 border-emerald-500/20 text-emerald-300/75 hover:bg-emerald-500/15 ${ring}`;
}

function getThermalDotColor(intensity: number): {
  core: string;
  halo: string;
  labelClass: string;
} {
  if (intensity >= 70) {
    return {
      core: 'bg-rose-500 border-rose-200',
      halo: 'bg-rose-500/40',
      labelClass: 'text-rose-200 border-rose-400/60 bg-rose-950/90',
    };
  }
  if (intensity >= 40) {
    return {
      core: 'bg-orange-400 border-orange-100',
      halo: 'bg-orange-400/35',
      labelClass: 'text-orange-200 border-orange-400/50 bg-orange-950/90',
    };
  }
  if (intensity > 0) {
    return {
      core: 'bg-amber-400 border-amber-100',
      halo: 'bg-amber-400/30',
      labelClass: 'text-amber-200 border-amber-400/40 bg-zinc-900/90',
    };
  }
  return {
    core: 'bg-emerald-400 border-emerald-100',
    halo: 'bg-emerald-400/20',
    labelClass: 'text-emerald-200 border-emerald-500/30 bg-zinc-900/80',
  };
}

export const BadVibeHeatmapPanel: React.FC<BadVibeHeatmapPanelProps> = ({
  heatmap,
  users,
  actionBusyId,
  focusedCellId = null,
  onModerateUser,
}) => {
  const [heatmapMode, setHeatmapMode] = useState<'matrix' | 'geo'>('matrix');
  const [threatFilter, setThreatFilter] = useState<'ALL' | Exclude<SafetyViolationCategory, 'GOOD_VYBES'>>('ALL');
  const [selectedCellId, setSelectedCellId] = useState<string | null>(focusedCellId);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedFlagReason, setSelectedFlagReason] = useState<string>(QUICK_FLAG_REASONS[0]);

  useEffect(() => {
    if (focusedCellId) {
      setHeatmapMode('matrix');
      setThreatFilter('ALL');
      setSelectedCellId(focusedCellId);
    }
  }, [focusedCellId]);

  // Auto-select hottest cell or region on mount / telemetry update
  const hottestCell = useMemo(() => {
    const sorted = [...heatmap.zoneMatrix].sort((a, b) => b.heatIntensity - a.heatIntensity);
    return sorted[0] || null;
  }, [heatmap.zoneMatrix]);

  const hottestRegion = useMemo(() => {
    const sorted = [...heatmap.regionalHotspots].sort((a, b) => b.heatIntensity - a.heatIntensity);
    return sorted[0] || null;
  }, [heatmap.regionalHotspots]);

  useEffect(() => {
    if (!selectedCellId && hottestCell) {
      setSelectedCellId(hottestCell.id);
    }
    if (!selectedRegionId && hottestRegion) {
      setSelectedRegionId(hottestRegion.regionId);
    }
  }, [selectedCellId, hottestCell, selectedRegionId, hottestRegion]);

  const activeCell: HeatmapMatrixCell | null = useMemo(
    () => heatmap.zoneMatrix.find((c) => c.id === selectedCellId) || hottestCell,
    [heatmap.zoneMatrix, selectedCellId, hottestCell]
  );

  const activeRegion: HeatmapRegionHotspot | null = useMemo(
    () => heatmap.regionalHotspots.find((r) => r.regionId === selectedRegionId) || hottestRegion,
    [heatmap.regionalHotspots, selectedRegionId, hottestRegion]
  );

  // Extract distinct rows (App Activity Areas)
  const zoneRows = useMemo(() => {
    const seen = new Map<string, string>();
    for (const cell of heatmap.zoneMatrix) {
      if (!seen.has(cell.zoneId)) {
        seen.set(cell.zoneId, cell.zoneLabel);
      }
    }
    return Array.from(seen.entries()).map(([zoneId, zoneLabel]) => ({ zoneId, zoneLabel }));
  }, [heatmap.zoneMatrix]);

  // Implicated accounts for currently inspected Matrix cell or Regional hotspot
  const inspectedUsers: MonitoredUserRecord[] = useMemo(() => {
    const ids =
      heatmapMode === 'matrix'
        ? activeCell?.implicatedUserIds || []
        : activeRegion?.implicatedUserIds || [];

    const matched = users.filter((u) => ids.includes(u.id));
    if (matched.length > 0) return matched;

    // Fallback: show highest risk accounts in the platform so owner always has proactive tools ready
    return [...users]
      .sort((a, b) => (b.scamPatternScore || 0) - (a.scamPatternScore || 0))
      .filter((u) => (u.scamPatternScore || 0) > 15 || u.vibeScore < 85 || u.status !== 'ACTIVE')
      .slice(0, 4);
  }, [heatmapMode, activeCell, activeRegion, users]);

  const sourceZoneLabel =
    heatmapMode === 'matrix'
      ? activeCell
        ? `${activeCell.zoneLabel} (${activeCell.category})`
        : 'Risk Matrix'
      : activeRegion
      ? `${activeRegion.city} Regional Hotspot`
      : 'Regional Radar';

  return (
    <div className="space-y-5 text-left">
      {/* Top Threat Overview & Controls */}
      <GlassCard
        className="p-4 sm:p-5 border border-rose-500/40 bg-gradient-to-r from-rose-950/35 via-[#171226] to-amber-950/25"
        glowColor="pink"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/25 border border-rose-400/50 text-rose-200 font-mono text-[10px] font-black uppercase">
                <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                Live Bad Vibe &amp; Scam Pattern Heatmap
              </span>
              <span
                className={`px-2.5 py-1 rounded-full font-mono text-[10px] font-black border ${
                  heatmap.overallThreatLevel === 'CRITICAL'
                    ? 'bg-red-500/30 text-red-200 border-red-400/60'
                    : heatmap.overallThreatLevel === 'HIGH'
                    ? 'bg-orange-500/25 text-orange-200 border-orange-400/50'
                    : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                }`}
              >
                THREAT LEVEL: {heatmap.overallThreatLevel}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              Proactive Hotspot Radar &amp; Covert Quarantine Controls
            </h2>
            <p className="text-xs text-zinc-300">
              Inspect heated zones with scam clusters or bad-vibe spikes, then{' '}
              <strong className="text-amber-300">Flag</strong> or{' '}
              <strong className="text-purple-300">Shadow-Ban</strong> suspicious accounts before they reach genuine members.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs shrink-0">
            <button
              onClick={() => setHeatmapMode('matrix')}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                heatmapMode === 'matrix'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                  : 'bg-white/5 text-zinc-300 border border-white/10 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              Zone Risk Matrix
            </button>

            <button
              onClick={() => setHeatmapMode('geo')}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                heatmapMode === 'geo'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                  : 'bg-white/5 text-zinc-300 border border-white/10 hover:text-white'
              }`}
            >
              <Globe className="w-4 h-4" />
              Geo Hotspot Radar
            </button>
          </div>
        </div>

        {/* Mini Heat Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-white/10 font-mono">
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
            <span className="text-[10px] text-zinc-400 block uppercase">Critical Hotspots</span>
            <span className="text-lg font-black text-rose-400">{heatmap.criticalZonesCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
            <span className="text-[10px] text-zinc-400 block uppercase">Active Scam Clusters</span>
            <span className="text-lg font-black text-orange-300">{heatmap.activeScamClusters}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
            <span className="text-[10px] text-zinc-400 block uppercase">Proactively Flagged</span>
            <span className="text-lg font-black text-amber-300">{heatmap.flaggedAccountsCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
            <span className="text-[10px] text-zinc-400 block uppercase">Shadow-Banned</span>
            <span className="text-lg font-black text-purple-300">{heatmap.shadowBannedAccountsCount}</span>
          </div>
        </div>
      </GlassCard>

      {/* Main Split: Heatmap Visualization (Left) + Proactive Enforcement Inspector (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (7 cols): MATRIX OR GEO RADAR + PULSE CHART */}
        <div className="xl:col-span-7 space-y-4">
          {heatmapMode === 'matrix' ? (
            <GlassCard className="p-4 sm:p-5 border border-white/15 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <Radar className="w-4 h-4 text-rose-400" />
                    Activity Zones &times; Bad Vibe Vectors
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Click any thermal cell to inspect scam patterns &amp; flag or shadow-ban implicated accounts.
                  </p>
                </div>

                {/* Thermal Color Legend */}
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-300 shrink-0">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-400/40" /> Calm
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500/50 border border-amber-400/60" /> Elevated
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-orange-500/75 border border-orange-400" /> High
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-rose-600 border border-rose-300 animate-pulse" /> Scam Hotspot
                  </span>
                </div>
              </div>

              {/* Filter by Threat Vector */}
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                <button
                  onClick={() => setThreatFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold border cursor-pointer transition-all ${
                    threatFilter === 'ALL'
                      ? 'bg-cyan-400 text-black border-cyan-300'
                      : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
                  }`}
                >
                  All Vectors
                </button>
                {THREAT_COLUMNS.map((col) => (
                  <button
                    key={col.key}
                    onClick={() => setThreatFilter(col.key)}
                    className={`px-2.5 py-1 rounded-lg font-bold border cursor-pointer transition-all ${
                      threatFilter === col.key
                        ? 'bg-rose-500 text-white border-rose-300'
                        : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {col.shortLabel}
                  </button>
                ))}
              </div>

              {/* 2D Matrix Grid */}
              <div className="overflow-x-auto pb-1">
                <div className="min-w-[560px] space-y-2">
                  {/* Column Headers */}
                  <div
                    className="grid gap-2 items-center text-[10px] font-mono uppercase text-zinc-400 font-bold"
                    style={{
                      gridTemplateColumns: `165px repeat(${
                        threatFilter === 'ALL' ? THREAT_COLUMNS.length : 1
                      }, minmax(0, 1fr))`,
                    }}
                  >
                    <div className="px-2">App Area / Surface</div>
                    {THREAT_COLUMNS.filter(
                      (c) => threatFilter === 'ALL' || threatFilter === c.key
                    ).map((col) => (
                      <div key={col.key} className="text-center truncate px-1">
                        {col.shortLabel}
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  {zoneRows.map((row) => (
                    <div
                      key={row.zoneId}
                      className="grid gap-2 items-center"
                      style={{
                        gridTemplateColumns: `165px repeat(${
                          threatFilter === 'ALL' ? THREAT_COLUMNS.length : 1
                        }, minmax(0, 1fr))`,
                      }}
                    >
                      <div className="px-2.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white truncate">
                        {row.zoneLabel}
                      </div>

                      {THREAT_COLUMNS.filter(
                        (c) => threatFilter === 'ALL' || threatFilter === c.key
                      ).map((col) => {
                        const cell = heatmap.zoneMatrix.find(
                          (m) => m.zoneId === row.zoneId && m.category === col.key
                        );
                        if (!cell) return null;
                        const isSelected = activeCell?.id === cell.id;
                        return (
                          <button
                            key={cell.id}
                            onClick={() => setSelectedCellId(cell.id)}
                            className={`relative p-2 rounded-xl border text-center transition-all cursor-pointer ${getHeatCellStyle(
                              cell.heatIntensity,
                              isSelected
                            )}`}
                            title={`${cell.zoneLabel} — ${col.fullLabel}: ${cell.heatIntensity}% heat (${cell.incidentsCount} hits)`}
                          >
                            {cell.heatIntensity >= 70 && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-300 animate-ping" />
                            )}
                            <span className="block font-mono text-sm font-black leading-none">
                              {cell.heatIntensity}%
                            </span>
                            <span className="block font-mono text-[9px] opacity-90 mt-1">
                              {cell.incidentsCount} {cell.incidentsCount === 1 ? 'hit' : 'hits'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          ) : (
            /* GEO THERMAL RADAR */
            <GlassCard className="p-4 sm:p-5 border border-white/15 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-rose-400" />
                    Global Geo-Thermal Scam &amp; Bad Vibe Clusters
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Click any glowing regional hub to inspect localized scam vectors and shadow-ban repeat offenders.
                  </p>
                </div>
              </div>

              {/* Stylized Interactive SVG + Thermal Node Overlay */}
              <div className="relative w-full h-72 sm:h-80 rounded-2xl bg-[#090812] border border-cyan-500/25 overflow-hidden">
                {/* Subtle Coordinate Grid */}
                <svg
                  viewBox="0 0 1000 500"
                  className="absolute inset-0 w-full h-full opacity-35 pointer-events-none"
                  preserveAspectRatio="none"
                >
                  {[100, 200, 300, 400].map((y) => (
                    <line key={`h_${y}`} x1="0" y1={y} x2="1000" y2={y} stroke="#22d3ee" strokeOpacity="0.15" strokeDasharray="4 6" />
                  ))}
                  {[150, 300, 450, 600, 750, 900].map((x) => (
                    <line key={`v_${x}`} x1={x} y1="0" x2={x} y2="500" stroke="#22d3ee" strokeOpacity="0.15" strokeDasharray="4 6" />
                  ))}
                  {/* Simplified stylized continent silhouettes */}
                  <path
                    d="M95,120 Q160,85 245,115 L270,190 L220,255 L155,245 L110,190 Z"
                    fill="#1e1b4b"
                    stroke="#38bdf8"
                    strokeOpacity="0.25"
                  />
                  <path
                    d="M235,285 Q285,270 320,320 L300,435 L250,455 L220,370 Z"
                    fill="#1e1b4b"
                    stroke="#38bdf8"
                    strokeOpacity="0.25"
                  />
                  <path
                    d="M445,105 Q525,75 595,110 L580,180 L460,185 Z"
                    fill="#1e1b4b"
                    stroke="#38bdf8"
                    strokeOpacity="0.25"
                  />
                  <path
                    d="M455,215 Q540,200 595,255 L575,390 L505,415 L455,320 Z"
                    fill="#1e1b4b"
                    stroke="#38bdf8"
                    strokeOpacity="0.25"
                  />
                  <path
                    d="M610,115 Q770,80 885,155 L865,285 L750,315 L635,245 Z"
                    fill="#1e1b4b"
                    stroke="#38bdf8"
                    strokeOpacity="0.25"
                  />
                  <path
                    d="M785,345 Q865,335 900,395 L860,445 L775,420 Z"
                    fill="#1e1b4b"
                    stroke="#38bdf8"
                    strokeOpacity="0.25"
                  />
                </svg>

                {/* Regional Thermal Nodes */}
                {heatmap.regionalHotspots.map((region) => {
                  const palette = getThermalDotColor(region.heatIntensity);
                  const isSelected = activeRegion?.regionId === region.regionId;
                  const haloSize = Math.max(28, Math.min(76, 26 + region.heatIntensity * 0.52));

                  return (
                    <button
                      key={region.regionId}
                      onClick={() => setSelectedRegionId(region.regionId)}
                      style={{
                        left: `${region.lngPercent}%`,
                        top: `${region.latPercent}%`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer focus:outline-none"
                    >
                      {/* Outer Thermal Glow */}
                      <span
                        style={{ width: haloSize, height: haloSize }}
                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md transition-all ${
                          palette.halo
                        } ${region.heatIntensity >= 55 ? 'animate-pulse' : ''}`}
                      />
                      {/* Center Node Dot */}
                      <span
                        className={`relative flex items-center justify-center w-5 h-5 rounded-full border-2 transition-transform ${
                          palette.core
                        } ${isSelected ? 'scale-125 ring-4 ring-white/50' : 'group-hover:scale-110'}`}
                      >
                        <span className="text-[8px] font-black text-black font-mono">
                          {region.badVibeCount}
                        </span>
                      </span>
                      {/* City Badge */}
                      <span
                        className={`mt-1 block px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold whitespace-nowrap shadow ${palette.labelClass}`}
                      >
                        {region.city} • {region.heatIntensity}%
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Compact Regional Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {heatmap.regionalHotspots.map((reg) => (
                  <button
                    key={reg.regionId}
                    onClick={() => setSelectedRegionId(reg.regionId)}
                    className={`p-2 rounded-xl border text-left font-mono transition-all cursor-pointer ${
                      activeRegion?.regionId === reg.regionId
                        ? 'bg-rose-500/20 border-rose-400 text-white'
                        : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="truncate">{reg.city}</span>
                      <span
                        className={
                          reg.heatIntensity >= 60
                            ? 'text-rose-400'
                            : reg.heatIntensity >= 30
                            ? 'text-amber-300'
                            : 'text-emerald-300'
                        }
                      >
                        {reg.heatIntensity}%
                      </span>
                    </div>
                    <span className="text-[9px] text-zinc-400 block truncate">
                      {reg.scamCount} scam • {reg.badVibeCount} bad vibe
                    </span>
                  </button>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Temporal Pulse Bar Strip */}
          <GlassCard className="p-4 border border-white/15 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-bold uppercase text-zinc-200 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                Activity Pulse: Good Vybes vs. Scam &amp; Bad Vibe Spikes
              </h4>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="text-emerald-300">■ Good Vybes</span>
                <span className="text-orange-300">■ Bad Vibes</span>
                <span className="text-rose-400">■ Scam Signals</span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2.5 items-end h-24 pt-2">
              {heatmap.hourlyPulse.map((bucket) => {
                const maxVal = Math.max(
                  10,
                  ...heatmap.hourlyPulse.map((b) => b.goodVybes + b.badVybes + b.scamSignals)
                );
                const goodH = Math.max(12, Math.round((bucket.goodVybes / maxVal) * 72));
                const badH = Math.max(4, Math.round((bucket.badVybes / maxVal) * 72));
                const scamH = Math.max(4, Math.round((bucket.scamSignals / maxVal) * 72));
                return (
                  <div key={bucket.label} className="flex flex-col items-center gap-1">
                    <div className="flex items-end gap-1 h-16">
                      <div
                        style={{ height: `${goodH}px` }}
                        className="w-2.5 rounded-t bg-emerald-400/80"
                        title={`Good Vybes: ${bucket.goodVybes}`}
                      />
                      <div
                        style={{ height: `${badH}px` }}
                        className="w-2.5 rounded-t bg-orange-400/90"
                        title={`Bad Vibes: ${bucket.badVybes}`}
                      />
                      <div
                        style={{ height: `${scamH}px` }}
                        className="w-2.5 rounded-t bg-rose-500"
                        title={`Scam Signals: ${bucket.scamSignals}`}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">{bucket.label}</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* RIGHT COLUMN (5 cols): HOTSPOT INSPECTOR & PROACTIVE FLAG / SHADOW-BAN ACTIONS */}
        <div className="xl:col-span-5 space-y-4">
          <GlassCard className="p-4 sm:p-5 border border-amber-400/40 bg-gradient-to-b from-amber-500/10 to-black/60 space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-amber-300 font-bold block">
                  Selected Hotspot Inspector
                </span>
                <h3 className="text-base font-black text-white">
                  {heatmapMode === 'matrix'
                    ? activeCell
                      ? `${activeCell.zoneLabel}`
                      : 'Select a Zone'
                    : activeRegion
                    ? `${activeRegion.city} (${activeRegion.regionLabel})`
                    : 'Select a Region'}
                </h3>
                <p className="text-[11px] font-mono text-rose-300 mt-0.5">
                  {heatmapMode === 'matrix'
                    ? activeCell
                      ? `${activeCell.category} • ${activeCell.heatIntensity}% Heat Intensity (${activeCell.incidentsCount} incidents)`
                      : ''
                    : activeRegion
                    ? `${activeRegion.heatIntensity}% Regional Heat • ${activeRegion.scamCount} Scam Hits`
                    : ''}
                </p>
              </div>
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            </div>

            {/* Detected Scam / Bad Vibe Patterns */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
                Detected Threat &amp; Scam Patterns
              </span>
              <div className="flex flex-wrap gap-1.5">
                {heatmapMode === 'matrix' ? (
                  activeCell && activeCell.detectedPatterns.length > 0 ? (
                    activeCell.detectedPatterns.map((pat, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-200 text-[10px] font-mono font-bold"
                      >
                        {pat}
                      </span>
                    ))
                  ) : (
                    <span className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono">
                      Clean Good Vybes — No Threat Clusters
                    </span>
                  )
                ) : activeRegion ? (
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-200 text-[10px] font-mono font-bold">
                    {activeRegion.topPattern}
                  </span>
                ) : null}
              </div>

              {heatmapMode === 'matrix' && activeCell && activeCell.incidentsCount > 0 && (
                <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 text-[11px] text-zinc-300 font-mono mt-2">
                  <span className="text-zinc-500 uppercase text-[9px] block mb-0.5">
                    Latest Intercepted Signal:
                  </span>
                  &ldquo;{activeCell.latestSnippet}&rdquo;
                </div>
              )}
            </div>

            {/* Proactive Flag Reason Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] font-mono uppercase text-amber-300 font-bold block">
                Proactive Flag / Shadow-Ban Audit Reason
              </label>
              <select
                value={selectedFlagReason}
                onChange={(e) => setSelectedFlagReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
              >
                {QUICK_FLAG_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Implicated & High-Risk Accounts */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase text-zinc-400 font-bold">
                <span>Implicated / High-Risk Accounts ({inspectedUsers.length})</span>
                <span className="text-purple-300 flex items-center gap-1">
                  <Ghost className="w-3 h-3" /> Covert Shadow-Ban Ready
                </span>
              </div>

              {inspectedUsers.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center text-xs text-emerald-200 font-mono">
                  <Sparkles className="w-4 h-4 mx-auto mb-1 text-emerald-300" />
                  All accounts in this zone are maintaining Good Vybes.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {inspectedUsers.map((u) => {
                    const isShadow = u.status === 'SHADOW_BANNED' || u.shadowBanned;
                    const isFlagged = u.status === 'FLAGGED';
                    const isSuspended = u.status === 'SUSPENDED';

                    return (
                      <div
                        key={u.id}
                        className={`p-3 rounded-xl border space-y-2 transition-all ${
                          isShadow
                            ? 'bg-purple-950/35 border-purple-400/50'
                            : isFlagged
                            ? 'bg-amber-950/30 border-amber-400/50'
                            : isSuspended
                            ? 'bg-rose-950/30 border-rose-500/50'
                            : 'bg-black/50 border-white/15'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-9 h-9 rounded-xl object-cover border border-white/20 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-black text-white truncate">
                                  {u.name}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black border ${
                                    isShadow
                                      ? 'bg-purple-500/30 text-purple-200 border-purple-400/60'
                                      : isFlagged
                                      ? 'bg-amber-500/30 text-amber-200 border-amber-400/60'
                                      : isSuspended
                                      ? 'bg-rose-500/30 text-rose-200 border-rose-400/60'
                                      : 'bg-white/10 text-zinc-200 border-white/20'
                                  }`}
                                >
                                  {isShadow ? '👻 SHADOW-BANNED' : isFlagged ? '🚩 FLAGGED' : u.status}
                                </span>
                              </div>
                              <p className="text-[10px] font-mono text-zinc-400 truncate">
                                {u.location} • Scam Risk:{' '}
                                <strong className="text-rose-300">{u.scamPatternScore}%</strong> • Vibe:{' '}
                                <strong className="text-amber-300">{u.vibeScore}%</strong>
                              </p>
                            </div>
                          </div>

                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-[9px] font-mono text-cyan-300 shrink-0"
                            title="Approval documents stay strictly hidden from users & admin"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            ID Hidden
                          </span>
                        </div>

                        {u.flagReason && (
                          <p className="text-[10px] font-mono text-amber-200/90 bg-black/40 px-2 py-1 rounded border border-amber-400/20">
                            Note: {u.flagReason}
                          </p>
                        )}

                        {/* Proactive Enforcement Buttons */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 font-mono text-[10px]">
                          <button
                            disabled={actionBusyId === u.id}
                            onClick={() =>
                              onModerateUser(
                                u.id,
                                {
                                  status: 'FLAGGED',
                                  flagReason: selectedFlagReason,
                                  sourceZone: sourceZoneLabel,
                                },
                                'Proactively Flag Account'
                              )
                            }
                            className={`px-2.5 py-1.5 rounded-lg font-bold border flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50 ${
                              isFlagged
                                ? 'bg-amber-400 text-black border-amber-300'
                                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-400/40'
                            }`}
                          >
                            <Flag className="w-3 h-3" />
                            {isFlagged ? 'Flagged' : 'Proactive Flag'}
                          </button>

                          <button
                            disabled={actionBusyId === u.id}
                            onClick={() =>
                              onModerateUser(
                                u.id,
                                {
                                  status: 'SHADOW_BANNED',
                                  flagReason: selectedFlagReason,
                                  sourceZone: sourceZoneLabel,
                                },
                                'Shadow-Ban Account'
                              )
                            }
                            className={`px-2.5 py-1.5 rounded-lg font-bold border flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50 ${
                              isShadow
                                ? 'bg-purple-500 text-white border-purple-300'
                                : 'bg-purple-500/20 hover:bg-purple-500/35 text-purple-200 border-purple-400/40'
                            }`}
                            title="Silently isolates user's chats, VR messages & public reels without tipping them off"
                          >
                            <Ghost className="w-3 h-3" />
                            {isShadow ? 'Shadow-Banned' : 'Shadow-Ban'}
                          </button>

                          {!isSuspended && (
                            <button
                              disabled={actionBusyId === u.id}
                              onClick={() =>
                                onModerateUser(
                                  u.id,
                                  { status: 'SUSPENDED', sourceZone: sourceZoneLabel },
                                  'Suspend Account'
                                )
                              }
                              className="px-2 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <Ban className="w-3 h-3" /> Suspend
                            </button>
                          )}

                          {u.status !== 'ACTIVE' && (
                            <button
                              disabled={actionBusyId === u.id}
                              onClick={() =>
                                onModerateUser(
                                  u.id,
                                  { status: 'ACTIVE', resetStrikes: true, sourceZone: sourceZoneLabel },
                                  'Clear & Reinstate'
                                )
                              }
                              className="px-2 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Clear
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
