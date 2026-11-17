export type VerificationStep = 'FACE' | 'VOICE' | 'LIVENESS' | 'COMPLETE';

export interface FacialMeshData {
  points: number[];
  faceBounds?: { x: number; y: number; width: number; height: number };
  depthQuality?: number;
  is3dGeometryValid?: boolean;
}

export interface VerificationState {
  currentStep: number;
  facePassed: boolean;
  voicePassed: boolean;
  livenessPassed: boolean;
  isVerified: boolean;
  token?: string;
  badgeIssued: boolean;
}

export interface JamTrack {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  duration: number; // in seconds
  genre: string;
  bpm: number;
}

export interface JamSessionState {
  roomId: string;
  currentTrackId: string;
  position: number;
  isPlaying: boolean;
  volume: number;
  listenersCount: number;
}

export interface ReactionEvent {
  id: string;
  emoji: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  x?: number;
  y?: number;
  timestamp: number;
}

export interface VRLoungeUser {
  id: string;
  name: string;
  avatar: string;
  badgeVerified: boolean;
  x: number;
  y: number;
  status: string;
  currentMood: string;
}

export interface VRLoungeRoom {
  id: string;
  name: string;
  theme: 'cyberpunk' | 'space' | 'oasis' | 'zenith';
  bgGradient: string;
  description: string;
  activeUsersCount: number;
}

export interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  spotify?: string;
  twitter?: string;
  youtube?: string;
  website?: string;
}

export interface SoulProfile {
  id: string;
  name: string;
  age: number;
  tagline: string;
  bio: string;
  location: string;
  avatar: string;
  coverImage: string;
  matchScore: number;
  isSoulVerified: boolean;
  tier?: SubscriptionTier; // 'basic' or 'vip'
  soulmateAim?: string; // Goal on app
  workArea?: string; // Occupation/profession
  hobbies?: string[];
  galleryPhotos?: string[];
  galleryVideos?: { url: string; title: string; duration: string }[];
  socialLinks?: SocialLinks;
  voiceSampleUrl?: string;
  topGenres: string[];
  zodiac: string;
  interests: string[];
  distanceKm: number;
  isOnline?: boolean;
  onlineStatusText?: string;
  lat?: number;
  lng?: number;
  gpsVerifiedAt?: string;
}

export interface ReelComment {
  id: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  likesCount: number;
  isLiked?: boolean;
  timestamp: string;
}

export interface ReelPost {
  id: string;
  author: SoulProfile;
  mediaType: 'video' | 'photo';
  mediaUrl: string;
  caption: string;
  hashtags: string[];
  audioTrack: {
    title: string;
    artist: string;
    coverUrl?: string;
    audioUrl?: string;
  };
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  giftsCount: number;
  isLiked: boolean;
  isSaved?: boolean;
  isFollowing?: boolean;
  postedTime: string;
  comments: ReelComment[];
  voiceNoteUrl?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'soulmate' | 'peer';
  text: string;
  timestamp: string;
  senderName?: string;
  avatar?: string;
}

export type SubscriptionTier = 'basic' | 'vip';

export interface ChatWallpaper {
  id: string;
  name: string;
  category: 'free' | 'vip';
  previewUrl: string;
  bgCss: string;
  isVipOnly: boolean;
}

export interface UserSubscriptionState {
  tier: SubscriptionTier;
  priceMonthly: string;
  postsUsed: number;
  maxPostsBasic: number; // 5
  postsDaysInterval: number; // 3 weeks (21 days)
  chatsUsed: number;
  maxChatsBasic: number; // 10
  chatsDaysInterval: number; // 3 weeks (21 days)
  callsUsed: number;
  maxCallsBasic: number; // 3
  callsDaysInterval: number; // 3 weeks (21 days)
  activeWallpaperId: string;
}

export interface WarningStrike {
  id: string;
  strikeNumber: number;
  timestamp: string;
  contentType: 'message' | 'post' | 'image';
  reason: string;
  previewSnippet?: string;
}

export interface BanState {
  isBanned: boolean;
  strikesCount: number;
  strikes: WarningStrike[];
  banDate?: string;
  banReason?: string;
  appealStatus?: 'none' | 'pending' | 'restored';
}

export interface VRLoungePreferences {
  // Environment Background
  environmentTheme: string;
  customLightingColor: string;
  lightingIntensity: number; // 20 - 100
  showGridFloor: boolean;
  gridParticleDensity: 'low' | 'medium' | 'high';
  ambientAudioReactive: boolean;

  // Avatar Display Settings
  avatarVisibility: 'all' | 'verified_only' | 'solo';
  showNameTags: boolean;
  showDistanceTags: boolean;
  showVerificationBadges: boolean;
  showMoodBubbles: boolean;
  danceAnimationStyle: 'beat_sync' | 'chill_sway' | 'still';
  personalAccessory: 'neon_ring' | 'gold_crown' | 'dj_headphones' | 'cyber_visor' | 'none';

  // Proximity Chat Volume
  proximityChatEnabled: boolean;
  masterProximityVolume: number; // 0 - 100
  proximityRadius: 'whisper' | 'social' | 'concert';
  spatialStereoPanning: boolean;
  falloffCurve: 'logarithmic' | 'linear';
}

export interface ActiveSubscriptionRecord {
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  convertedAmount: string;
  status: 'ACTIVE_APPROVED' | 'EXPIRED';
  googleOrderId: string;
  approvalCode: string;
  activatedAt: string;
  expiresAtMs: number;
  durationLabel: string;
  paymentMethod: string;
}

export type SafetyViolationCategory =
  | 'GOOD_VYBES'
  | 'DISCRIMINATION'
  | 'ILLEGAL_BUSINESS'
  | 'SCAM_FRAUD'
  | 'HARASSMENT_HARM'
  | 'EXPLICIT_NUDITY';

export type GuardianActionType =
  | 'chat'
  | 'vr_chat'
  | 'post'
  | 'comment'
  | 'profile_update'
  | 'registration'
  | 'game_dare'
  | 'verification'
  | 'payment';

export interface SealedDocumentVaultInfo {
  status: 'HIDDEN_SEALED_ZERO_KNOWLEDGE' | 'NOT_SUBMITTED';
  verified18Plus: boolean;
  vaultDigest?: string;
  verifiedAt?: string;
  visibleToUsers: false;
  visibleToAdmin: false;
  privacyNotice: string;
}

export type MonitoredAccountStatus =
  | 'ACTIVE'
  | 'FLAGGED'
  | 'WARNED'
  | 'SHADOW_BANNED'
  | 'SUSPENDED';

export type HeatmapZoneId =
  | 'soul_chats'
  | 'vr_lounge'
  | 'reels_feed'
  | 'profiles_auth'
  | 'arcade_dares'
  | 'verify_billing';

export interface MonitoredUserRecord {
  id: string;
  name: string;
  email: string;
  avatar: string;
  age: number;
  location: string;
  tagline: string;
  bio: string;
  tier: SubscriptionTier;
  isVerified: boolean;
  isOnline: boolean;
  vibeScore: number; // 0 - 100
  scamPatternScore: number; // 0 - 100
  status: MonitoredAccountStatus;
  shadowBanned: boolean;
  flagReason?: string;
  flaggedAt?: string;
  detectedPatterns: string[];
  strikesCount: number;
  totalActionsMonitored: number;
  blockedActionsCount: number;
  lastActionAt: string;
  lastActionSummary: string;
  documentVault: SealedDocumentVaultInfo;
}

export interface AiModerationLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail?: string;
  locationHub?: string;
  actionType: GuardianActionType;
  contentSnippet: string;
  verdict: 'APPROVED_GOOD_VYBES' | 'BLOCKED_VIOLATION';
  category: SafetyViolationCategory;
  severity: 'SAFE' | 'LOW' | 'HIGH' | 'CRITICAL';
  aiReasoning: string;
  enforcementAction: string;
}

export interface HeatmapMatrixCell {
  id: string;
  zoneId: HeatmapZoneId;
  zoneLabel: string;
  category: Exclude<SafetyViolationCategory, 'GOOD_VYBES'>;
  heatIntensity: number; // 0 - 100
  incidentsCount: number;
  flaggedUsersCount: number;
  implicatedUserIds: string[];
  detectedPatterns: string[];
  latestSnippet: string;
}

export interface HeatmapRegionHotspot {
  regionId: string;
  city: string;
  regionLabel: string;
  latPercent: number;
  lngPercent: number;
  heatIntensity: number; // 0 - 100
  badVibeCount: number;
  scamCount: number;
  activeAccountsCount: number;
  topPattern: string;
  implicatedUserIds: string[];
}

export interface HeatmapTimePulse {
  label: string;
  goodVybes: number;
  badVybes: number;
  scamSignals: number;
}

export interface OwnerHeatmapSnapshot {
  overallThreatLevel: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  criticalZonesCount: number;
  activeScamClusters: number;
  flaggedAccountsCount: number;
  shadowBannedAccountsCount: number;
  zoneMatrix: HeatmapMatrixCell[];
  regionalHotspots: HeatmapRegionHotspot[];
  hourlyPulse: HeatmapTimePulse[];
}

export interface BadVibeClusterAlert {
  id: string;
  detectedAt: string;
  title: string;
  summary: string;
  severity: 'HIGH' | 'CRITICAL';
  zoneId: HeatmapZoneId;
  zoneLabel: string;
  category: Exclude<SafetyViolationCategory, 'GOOD_VYBES'>;
  regionCity: string;
  heatIntensity: number;
  clusterHitsCount: number;
  implicatedUserIds: string[];
  implicatedUsersPreview: Array<{
    id: string;
    name: string;
    status: MonitoredAccountStatus;
    scamPatternScore: number;
  }>;
  detectedPattern: string;
  recommendedAction: 'PROACTIVE_FLAG' | 'SHADOW_BAN' | 'SUSPEND';
  acknowledged: boolean;
}

export type AdminAuditActionType =
  | 'OWNER_AUTH_LOGIN'
  | 'OWNER_AUTH_LOGOUT'
  | 'USER_PROACTIVE_FLAG'
  | 'USER_SHADOW_BAN'
  | 'USER_WARN'
  | 'USER_SUSPEND'
  | 'USER_REINSTATE_CLEAR'
  | 'CLUSTER_ALERT_ACK'
  | 'BILLING_CONFIG_UPDATE'
  | 'AI_ISSUE_AUTO_RESOLVED'
  | 'AI_SOLVER_POLICY_UPDATE'
  | 'AI_SOLVER_OVERRIDE';

export type IssueMagnitude = 'SMALL' | 'MEDIUM' | 'BIG' | 'CRITICAL';

export type IssueDomain =
  | 'INFRASTRUCTURE'
  | 'SECURITY_MODERATION'
  | 'BILLING_PAYMENTS'
  | 'USER_EXPERIENCE'
  | 'REALTIME_SYNC'
  | 'COMPLIANCE';

export type AdminPresenceMode = 'ONLINE' | 'OFFLINE';

export type AiSolverPolicyMode =
  | 'WISE_24_7_AUTOPILOT'
  | 'STRICT_OFFLINE_TAKEOVER'
  | 'ADMIN_COPILOT';

export type BackendIssueResolutionStatus =
  | 'AUTO_RESOLVED'
  | 'CONTAINED_SAFE'
  | 'NEEDS_OWNER_REVIEW'
  | 'OVERRIDDEN_BY_OWNER';

export interface BackendIssueRecord {
  id: string;
  detectedAt: string;
  resolvedAt?: string;
  title: string;
  description: string;
  magnitude: IssueMagnitude;
  domain: IssueDomain;
  detectedBy: 'AI_WATCHDOG_CRON' | 'REALTIME_GUARDIAN' | 'OWNER_SUBMITTED';
  adminStateAtHandling: AdminPresenceMode;
  aiWisdomStrategy: string;
  rootCauseAnalysis: string;
  actionsTaken: string[];
  affectedTargetId?: string;
  affectedTargetName?: string;
  status: BackendIssueResolutionStatus;
  confidenceScore: number;
  reversible: boolean;
  offlineResolvedUnread?: boolean;
}

export interface AiIssueSolverSnapshot {
  engineStatus: 'ACTIVE_24_7' | 'PAUSED';
  adminPresence: AdminPresenceMode;
  simulatedAdminOffline: boolean;
  policyMode: AiSolverPolicyMode;
  lastSweepAt: string;
  nextSweepInSeconds: number;
  totalIssuesSolved: number;
  solvedWhileOfflineCount: number;
  smallIssuesSolved: number;
  bigIssuesSolved: number;
  offlineUnreadCount: number;
  systemHealthScore: number;
  issues: BackendIssueRecord[];
}

export interface AdminActivityAuditEntry {
  id: string;
  timestamp: string;
  actorEmail: string;
  actionType: AdminAuditActionType;
  actionLabel: string;
  targetId?: string;
  targetName?: string;
  sourceSurface: string;
  details: string;
  previousState?: string;
  newState?: string;
  outcome: 'SUCCESS' | 'DENIED';
}

export interface OwnerTelemetrySummary {
  totalUsers: number;
  activeOnlineUsers: number;
  suspendedUsers: number;
  flaggedUsers: number;
  shadowBannedUsers: number;
  totalActionsMonitored: number;
  blockedViolationsCount: number;
  sealedDocumentsCount: number;
  communityVibeHealth: number;
  categoryCounts: Record<SafetyViolationCategory, number>;
  users: MonitoredUserRecord[];
  recentLogs: AiModerationLogEntry[];
  heatmap: OwnerHeatmapSnapshot;
  activeClusterAlerts: BadVibeClusterAlert[];
  adminAuditLogs: AdminActivityAuditEntry[];
  aiSolver: AiIssueSolverSnapshot;
}

export interface ScheduledJamEvent {
  id: string;
  title: string;
  hostName: string;
  hostAvatar?: string;
  scheduledForIso: string;
  trackTitle: string;
  trackArtist?: string;
  trackId?: string;
  ambienceTheme?: string;
  vibeTag: string;
  invitedFriends: string[];
  rsvpFriends: string[];
  isPublicToFriends: boolean;
  createdAt: string;
}
