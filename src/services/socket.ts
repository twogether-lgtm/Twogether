import { io, Socket } from 'socket.io-client';

class SocketService {
  public socket: Socket;
  private isConnected: boolean = false;
  private activeOwnerToken: string | null = null;
  private activeVRLounge: { roomId: string; userName?: string; avatar?: string; deviceId?: string; pin?: string } | null = null;
  private activeJamId: string | null = null;
  private activePartyRoom: {
    roomCode: string;
    playerName: string;
    deviceId: string;
    phoneLabel?: string;
  } | null = null;
  private activeCoupleRoom: {
    roomCode: string;
    partnerName: string;
    deviceId: string;
    deviceLabel?: string;
    playType?: 'online' | 'offline';
  } | null = null;

  constructor() {
    this.socket = io({
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 12,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      if (this.activeOwnerToken) {
        this.socket.emit('join-owner-monitor', { ownerToken: this.activeOwnerToken });
      }
      if (this.activeVRLounge) {
        this.socket.emit('join-vr-lounge', this.activeVRLounge);
      }
      if (this.activeJamId) {
        this.socket.emit('join-jam-spectators', { jamId: this.activeJamId });
      }
      if (this.activePartyRoom) {
        this.socket.emit('join-party-game-room', this.activePartyRoom);
      }
      if (this.activeCoupleRoom) {
        this.socket.emit('join-couple-portal-room', this.activeCoupleRoom);
      }
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });
  }

  public getIsConnected(): boolean {
    return this.isConnected || this.socket.connected;
  }

  public joinVRLounge(roomId: string, userName?: string, avatar?: string, deviceId?: string, pin?: string) {
    this.activeVRLounge = { roomId, userName, avatar, deviceId, pin };
    this.socket.emit('join-vr-lounge', { roomId, userName, avatar, deviceId, pin });
  }

  public joinPartyGameRoom(payload: {
    roomCode: string;
    playerName: string;
    deviceId: string;
    phoneLabel?: string;
  }) {
    if (!payload?.roomCode) return;
    this.activePartyRoom = payload;
    this.socket.emit('join-party-game-room', payload);
  }

  public leavePartyGameRoom(roomCode: string, deviceId?: string) {
    if (this.activePartyRoom?.roomCode === roomCode) {
      this.activePartyRoom = null;
    }
    this.socket.emit('leave-party-game-room', { roomCode, deviceId });
  }

  public syncPartySpin(payload: {
    roomCode: string;
    segmentId: number;
    wheelRotation: number;
    promptIndex: number;
    promptText: string;
    nextTurnPlayer?: string;
    updatedBy?: string;
  }) {
    if (!payload?.roomCode) return;
    this.socket.emit('sync-party-spin', payload);
  }

  public joinCouplePortalRoom(payload: {
    roomCode: string;
    partnerName: string;
    deviceId: string;
    deviceLabel?: string;
    playType?: 'online' | 'offline';
  }) {
    if (!payload?.roomCode) return;
    this.activeCoupleRoom = payload;
    this.socket.emit('join-couple-portal-room', payload);
  }

  public setCouplePortalType(roomCode: string, playType: 'online' | 'offline') {
    if (!roomCode) return;
    if (this.activeCoupleRoom?.roomCode === roomCode) {
      this.activeCoupleRoom.playType = playType;
    }
    this.socket.emit('set-couple-portal-type', { roomCode, playType });
  }

  public leaveCouplePortalRoom(roomCode: string, deviceId?: string) {
    if (this.activeCoupleRoom?.roomCode === roomCode) {
      this.activeCoupleRoom = null;
    }
    this.socket.emit('leave-couple-portal-room', { roomCode, deviceId });
  }

  public syncCoupleSpin(payload: {
    roomCode: string;
    segmentId: number;
    wheelRotation: number;
    promptIndex: number;
    promptText: string;
    nextTurnPlayer?: string;
    updatedBy?: string;
  }) {
    if (!payload?.roomCode) return;
    this.socket.emit('sync-couple-spin', payload);
  }

  public joinJamSpectators(jamId: string) {
    if (!jamId) return;
    this.activeJamId = jamId;
    this.socket.emit('join-jam-spectators', { jamId });
  }

  public leaveJamSpectators(jamId: string) {
    if (this.activeJamId === jamId) {
      this.activeJamId = null;
    }
    this.socket.emit('leave-jam-spectators', { jamId });
  }

  public moveAvatar(x: number, y: number) {
    this.socket.emit('move-avatar', { x, y });
  }

  public syncMusic(roomId: string, trackId: string, position: number, isPlaying: boolean) {
    this.socket.emit('sync-music-play', { roomId, trackId, position, isPlaying });
  }

  public sendReaction(roomId: string, emoji: string, x?: number, y?: number) {
    this.socket.emit('send-reaction', { roomId, emoji, x, y });
  }

  public sendRoomChat(roomId: string, text: string, userId?: string, userName?: string) {
    this.socket.emit('send-room-chat', { roomId, text, userId, userName });
  }

  public joinOwnerMonitor(ownerToken: string) {
    if (!ownerToken) return;
    this.activeOwnerToken = ownerToken;
    this.socket.emit('join-owner-monitor', { ownerToken });
  }

  public leaveOwnerMonitor() {
    this.activeOwnerToken = null;
    if (this.socket.connected) {
      this.socket.emit('leave-owner-monitor');
    }
  }
}

export const socketService = new SocketService();
