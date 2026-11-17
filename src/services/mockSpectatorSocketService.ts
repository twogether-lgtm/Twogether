import { socketService } from './socket';

export interface JamSpectatorProfile {
  id: string;
  name: string;
  avatar: string;
}

export interface JamSpectatorsSnapshot {
  jamId: string;
  count: number;
  realConnectedCount: number;
  delta: number;
  peakCount: number;
  activeViewers: JamSpectatorProfile[];
  lastEventText: string;
  updatedAt: number;
}

type SpectatorListener = (snapshot: JamSpectatorsSnapshot) => void;

const MOCK_VIEWER_POOL: JamSpectatorProfile[] = [
  {
    id: 'spec_aria',
    name: 'Aria Sterling',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'spec_kaelen',
    name: 'Kaelen Vance',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'spec_zeph',
    name: 'Zephyrine Chen',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'spec_maya',
    name: 'Maya Lin',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'spec_liam',
    name: 'Liam Vance',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'spec_chloe',
    name: 'Chloe M.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'spec_zuri',
    name: 'Zuri N.',
    avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=120&q=80',
  },
];

function hashJamSeed(jamId: string): number {
  let hash = 0;
  for (let i = 0; i < jamId.length; i++) {
    hash = (hash * 31 + jamId.charCodeAt(i)) >>> 0;
  }
  return 11 + (hash % 24);
}

class MockSpectatorSocketService {
  private roomCounts = new Map<string, number>();
  private roomRealCounts = new Map<string, number>();
  private roomPeaks = new Map<string, number>();
  private roomViewers = new Map<string, JamSpectatorProfile[]>();
  private roomLastEvents = new Map<string, string>();
  private listeners = new Map<string, Set<SpectatorListener>>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();

  constructor() {
    socketService.socket.on(
      'jam-spectators-update',
      (payload: { jamId?: string; connectedCount?: number }) => {
        if (!payload?.jamId || typeof payload.connectedCount !== 'number') return;
        this.roomRealCounts.set(payload.jamId, Math.max(0, payload.connectedCount));
        this.broadcast(payload.jamId, 0);
      }
    );
  }

  private ensureRoomInitialized(jamId: string) {
    if (!this.roomCounts.has(jamId)) {
      const seedCount = hashJamSeed(jamId);
      const startOffset = seedCount % MOCK_VIEWER_POOL.length;
      const initialViewers = [
        MOCK_VIEWER_POOL[startOffset],
        MOCK_VIEWER_POOL[(startOffset + 1) % MOCK_VIEWER_POOL.length],
        MOCK_VIEWER_POOL[(startOffset + 2) % MOCK_VIEWER_POOL.length],
        MOCK_VIEWER_POOL[(startOffset + 3) % MOCK_VIEWER_POOL.length],
      ];
      this.roomCounts.set(jamId, seedCount);
      this.roomPeaks.set(jamId, seedCount);
      this.roomViewers.set(jamId, initialViewers);
      this.roomLastEvents.set(jamId, `${initialViewers[0].name} is watching live`);
    }
  }

  public getSnapshot(jamId: string, delta = 0): JamSpectatorsSnapshot {
    this.ensureRoomInitialized(jamId);
    const mockCount = this.roomCounts.get(jamId) || 12;
    const realCount = this.roomRealCounts.get(jamId) || 1;
    const totalCount = Math.max(1, mockCount + Math.max(0, realCount - 1));
    const prevPeak = this.roomPeaks.get(jamId) || totalCount;
    const peakCount = Math.max(prevPeak, totalCount);
    this.roomPeaks.set(jamId, peakCount);

    return {
      jamId,
      count: totalCount,
      realConnectedCount: realCount,
      delta,
      peakCount,
      activeViewers: this.roomViewers.get(jamId) || MOCK_VIEWER_POOL.slice(0, 4),
      lastEventText: this.roomLastEvents.get(jamId) || 'Live spectator stream connected',
      updatedAt: Date.now(),
    };
  }

  private broadcast(jamId: string, delta: number) {
    const subs = this.listeners.get(jamId);
    if (!subs || subs.size === 0) return;
    const snapshot = this.getSnapshot(jamId, delta);
    subs.forEach((cb) => cb(snapshot));
  }

  private simulateSocketTick(jamId: string) {
    this.ensureRoomInitialized(jamId);
    const current = this.roomCounts.get(jamId) || 14;
    const stepRoll = Math.random();
    let delta = 0;

    if (stepRoll < 0.56) {
      // Join burst (+1 or +2)
      delta = Math.random() < 0.78 ? 1 : 2;
    } else if (stepRoll < 0.88 && current > 6) {
      // Leave (-1)
      delta = -1;
    } else {
      delta = 0;
    }

    const nextCount = Math.max(5, Math.min(180, current + delta));
    this.roomCounts.set(jamId, nextCount);

    const viewers = [...(this.roomViewers.get(jamId) || [])];
    if (delta > 0) {
      const candidate =
        MOCK_VIEWER_POOL.find((v) => !viewers.some((existing) => existing.id === v.id)) ||
        MOCK_VIEWER_POOL[Math.floor(Math.random() * MOCK_VIEWER_POOL.length)];
      const updatedViewers = [candidate, ...viewers.filter((v) => v.id !== candidate.id)].slice(0, 5);
      this.roomViewers.set(jamId, updatedViewers);
      this.roomLastEvents.set(jamId, `${candidate.name} joined the jam view`);
    } else if (delta < 0 && viewers.length > 2) {
      const leaving = viewers.pop();
      this.roomViewers.set(jamId, viewers);
      this.roomLastEvents.set(
        jamId,
        leaving ? `${leaving.name} hopped to another beat` : 'Spectator left jam'
      );
    }

    this.broadcast(jamId, delta);
  }

  public subscribe(jamId: string, listener: SpectatorListener): () => void {
    this.ensureRoomInitialized(jamId);

    if (!this.listeners.has(jamId)) {
      this.listeners.set(jamId, new Set());
    }
    this.listeners.get(jamId)!.add(listener);

    // Emit initial state immediately
    listener(this.getSnapshot(jamId, 0));

    // Join real socket channel for this specific jam too
    socketService.joinJamSpectators(jamId);

    // Start mock socket stream timer for this jamId if not running
    if (!this.timers.has(jamId)) {
      const interval = setInterval(() => {
        this.simulateSocketTick(jamId);
      }, 2800);
      this.timers.set(jamId, interval);
    }

    return () => {
      const subs = this.listeners.get(jamId);
      if (subs) {
        subs.delete(listener);
        if (subs.size === 0) {
          this.listeners.delete(jamId);
          const timer = this.timers.get(jamId);
          if (timer) {
            clearInterval(timer);
            this.timers.delete(jamId);
          }
          socketService.leaveJamSpectators(jamId);
        }
      }
    };
  }
}

export const mockSpectatorSocketService = new MockSpectatorSocketService();
