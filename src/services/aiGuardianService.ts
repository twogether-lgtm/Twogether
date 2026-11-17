import {
  AiIssueSolverSnapshot,
  AiSolverPolicyMode,
  BackendIssueRecord,
  GuardianActionType,
  IssueDomain,
  IssueMagnitude,
  MonitoredAccountStatus,
  MonitoredUserRecord,
  OwnerTelemetrySummary,
  SafetyViolationCategory,
} from '../types';

export interface GuardianInspectParams {
  userId?: string;
  userName?: string;
  userEmail?: string;
  actionType: GuardianActionType;
  text?: string;
  mediaUrl?: string;
  imageBase64?: string;
}

export interface GuardianInspectResponse {
  success: boolean;
  allowed: boolean;
  isViolating: boolean;
  category: SafetyViolationCategory;
  severity: 'SAFE' | 'LOW' | 'HIGH' | 'CRITICAL';
  reason: string;
  userSuspended?: boolean;
}

export interface SyncProfilePayload {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  age?: number;
  location?: string;
  tagline?: string;
  bio?: string;
  tier?: 'basic' | 'vip';
  isVerified?: boolean;
  actionLabel?: 'profile_update' | 'registration';
}

export async function inspectUserAction(
  params: GuardianInspectParams
): Promise<GuardianInspectResponse> {
  try {
    const res = await fetch('/api/ai-guardian/inspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return {
      success: Boolean(data.success),
      allowed: data.allowed ?? true,
      isViolating: Boolean(data.isViolating),
      category: data.category || 'GOOD_VYBES',
      severity: data.severity || 'SAFE',
      reason: data.reason || 'Action audited by AI Guardian.',
      userSuspended: Boolean(data.userSuspended),
    };
  } catch {
    return {
      success: true,
      allowed: true,
      isViolating: false,
      category: 'GOOD_VYBES',
      severity: 'SAFE',
      reason: 'Offline safety pass.',
    };
  }
}

export async function syncUserProfileWithGuardian(
  payload: SyncProfilePayload
): Promise<{
  success: boolean;
  isViolating?: boolean;
  category?: SafetyViolationCategory;
  reason?: string;
  user?: MonitoredUserRecord;
}> {
  try {
    const res = await fetch('/api/users/sync-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || data.isViolating) {
      return {
        success: false,
        isViolating: true,
        category: data.category || 'HARASSMENT_HARM',
        reason:
          data.reason ||
          'Profile details violate Good Vybes safety policy (no discrimination, illegal business, scams, or harm).',
      };
    }
    return {
      success: true,
      user: data.user,
    };
  } catch {
    return { success: true };
  }
}

export async function authenticateOwnerBackend(
  email: string,
  passcode: string
): Promise<{
  success: boolean;
  ownerToken?: string;
  ownerEmail?: string;
  message?: string;
}> {
  try {
    const res = await fetch('/api/owner/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, passcode }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        message: data.message || 'Invalid Owner credentials. Back-End access denied.',
      };
    }
    return {
      success: true,
      ownerToken: data.ownerToken,
      ownerEmail: data.ownerEmail,
      message: data.message,
    };
  } catch {
    return {
      success: false,
      message: 'Network error authenticating Owner Back-End session.',
    };
  }
}

export async function logoutOwnerBackend(token: string): Promise<void> {
  try {
    await fetch('/api/owner/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-owner-token': token,
      },
    });
  } catch {
    // ignore
  }
}

export async function fetchOwnerOverview(token: string): Promise<{
  success: boolean;
  telemetry?: OwnerTelemetrySummary;
  message?: string;
}> {
  try {
    const res = await fetch('/api/owner/overview', {
      headers: {
        'x-owner-token': token,
      },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        message: data.message || 'Owner Back-End session expired or unauthorized.',
      };
    }
    return {
      success: true,
      telemetry: data.telemetry,
    };
  } catch {
    return {
      success: false,
      message: 'Unable to reach Owner Back-End telemetry service.',
    };
  }
}

export async function updateMonitoredUserStatus(
  token: string,
  payload: {
    userId: string;
    status?: MonitoredAccountStatus;
    resetStrikes?: boolean;
    flagReason?: string;
    sourceZone?: string;
  }
): Promise<{
  success: boolean;
  user?: MonitoredUserRecord;
  message?: string;
}> {
  try {
    const res = await fetch('/api/owner/user-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-owner-token': token,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        message: data.message || 'Failed to update user status.',
      };
    }
    return {
      success: true,
      user: data.user,
    };
  } catch {
    return {
      success: false,
      message: 'Network error updating monitored user status.',
    };
  }
}

export async function acknowledgeClusterAlert(
  token: string,
  alertId: string
): Promise<{ success: boolean }> {
  try {
    const res = await fetch('/api/owner/alerts/acknowledge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-owner-token': token,
      },
      body: JSON.stringify({ alertId }),
    });
    const data = await res.json();
    return { success: Boolean(res.ok && data.success) };
  } catch {
    return { success: false };
  }
}

export async function solveBackendIssueWithAI(
  token: string,
  payload: {
    title: string;
    description: string;
    domain?: IssueDomain;
    magnitude?: IssueMagnitude;
    affectedTargetId?: string;
    affectedTargetName?: string;
  }
): Promise<{
  success: boolean;
  issue?: BackendIssueRecord;
  aiSolver?: AiIssueSolverSnapshot;
  message?: string;
}> {
  try {
    const res = await fetch('/api/owner/ai-solver/solve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-owner-token': token,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return {
      success: Boolean(res.ok && data.success),
      issue: data.issue,
      aiSolver: data.aiSolver,
      message: data.message,
    };
  } catch {
    return { success: false, message: 'Network error running Backend AI Issue Solver.' };
  }
}

export async function runBackendSelfHealSweep(token: string): Promise<{
  success: boolean;
  checkedCount?: number;
  resolvedCount?: number;
  aiSolver?: AiIssueSolverSnapshot;
  message?: string;
}> {
  try {
    const res = await fetch('/api/owner/ai-solver/sweep', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-owner-token': token,
      },
    });
    const data = await res.json();
    return {
      success: Boolean(res.ok && data.success),
      checkedCount: data.checkedCount,
      resolvedCount: data.resolvedCount,
      aiSolver: data.aiSolver,
      message: data.message,
    };
  } catch {
    return { success: false, message: 'Failed to trigger backend watchdog sweep.' };
  }
}

export async function updateAiSolverSettings(
  token: string,
  payload: {
    policyMode?: AiSolverPolicyMode;
    engineActive?: boolean;
    simulatedOffline?: boolean;
    markOfflineRead?: boolean;
  }
): Promise<{ success: boolean; aiSolver?: AiIssueSolverSnapshot }> {
  try {
    const res = await fetch('/api/owner/ai-solver/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-owner-token': token,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { success: Boolean(res.ok && data.success), aiSolver: data.aiSolver };
  } catch {
    return { success: false };
  }
}

export async function overrideAiSolverIssue(
  token: string,
  issueId: string,
  action: 'APPROVE' | 'REVERT'
): Promise<{ success: boolean; issue?: BackendIssueRecord; aiSolver?: AiIssueSolverSnapshot }> {
  try {
    const res = await fetch('/api/owner/ai-solver/override', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-owner-token': token,
      },
      body: JSON.stringify({ issueId, action }),
    });
    const data = await res.json();
    return {
      success: Boolean(res.ok && data.success),
      issue: data.issue,
      aiSolver: data.aiSolver,
    };
  } catch {
    return { success: false };
  }
}
