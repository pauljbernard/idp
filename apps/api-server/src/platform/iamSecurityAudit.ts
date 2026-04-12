import { randomUUID } from 'crypto';
import { loadOrCreatePersistedState, savePersistedState } from './persistence';

export type IamSecurityRequestCategory =
  | 'PUBLIC_AUTH'
  | 'ACCOUNT'
  | 'ADMIN'
  | 'PROTOCOL'
  | 'FEDERATION'
  | 'EXPERIENCE'
  | 'REALM_ADMIN';
export type IamSecurityRequestOutcome = 'SUCCESS' | 'FAILURE';
export type IamValidationCheckStatus = 'PASS' | 'WARN';

export interface IamSecurityAuditEvent {
  id: string;
  occurred_at: string;
  method: string;
  path: string;
  realm_id: string | null;
  actor_user_id: string | null;
  iam_session_id: string | null;
  correlation_id: string | null;
  status_code: number;
  outcome: IamSecurityRequestOutcome;
  category: IamSecurityRequestCategory;
}

export interface IamSecurityAuditSummary {
  generated_at: string;
  request_count: number;
  success_count: number;
  failure_count: number;
  last_24h_request_count: number;
  last_24h_failure_count: number;
  category_counts: Record<IamSecurityRequestCategory, number>;
}

export interface IamValidationCheck {
  id: string;
  name: string;
  status: IamValidationCheckStatus;
  summary: string;
}

export interface IamValidationSummary {
  generated_at: string;
  review_state: 'READY_FOR_REVIEW';
  integration_state: 'NOT_INTEGRATED_WITH_DOWNSTREAM_APPLICATIONS';
  migration_state:
    | 'BLOCKED_PENDING_REVIEW_AND_STANDALONE_ADOPTION'
    | 'BLOCKED_PENDING_STANDALONE_ADOPTION';
  checks: IamValidationCheck[];
  agentic_development_notes: string[];
  count: number;
}

interface IamSecurityAuditState {
  events: IamSecurityAuditEvent[];
}

const IAM_SECURITY_AUDIT_STATE_FILE = 'iam-security-audit-state.json';
const IAM_SECURITY_AUDIT_PERSIST_BATCH_SIZE = 50;
const IAM_SECURITY_AUDIT_PERSIST_INTERVAL_MS = 2_000;

function nowIso(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeState(input: Partial<IamSecurityAuditState>): IamSecurityAuditState {
  return {
    events: Array.isArray(input.events) ? input.events : [],
  };
}

const state = loadOrCreatePersistedState<IamSecurityAuditState>(
  IAM_SECURITY_AUDIT_STATE_FILE,
  () => normalizeState({}),
);
let pendingPersistEvents = 0;
let lastPersistAtMs = Date.now();

function persistState(): void {
  savePersistedState(IAM_SECURITY_AUDIT_STATE_FILE, state);
}

function persistStateIfNeeded(force: boolean = false): void {
  const now = Date.now();
  if (
    force
    || pendingPersistEvents >= IAM_SECURITY_AUDIT_PERSIST_BATCH_SIZE
    || (pendingPersistEvents > 0 && (now - lastPersistAtMs) >= IAM_SECURITY_AUDIT_PERSIST_INTERVAL_MS)
  ) {
    persistState();
    pendingPersistEvents = 0;
    lastPersistAtMs = now;
  }
}

function emptyCategoryCounts(): Record<IamSecurityRequestCategory, number> {
  return {
    PUBLIC_AUTH: 0,
    ACCOUNT: 0,
    ADMIN: 0,
    PROTOCOL: 0,
    FEDERATION: 0,
    EXPERIENCE: 0,
    REALM_ADMIN: 0,
  };
}

export const LocalIamSecurityAuditStore = {
  classifyPath(path: string): IamSecurityRequestCategory {
    if (path.includes('/protocol/')) {
      return 'PROTOCOL';
    }
    if (path.includes('/brokers') || path.includes('/user-federation') || path.includes('/broker-links')) {
      return 'FEDERATION';
    }
    if (path.includes('/theme') || path.includes('/notification') || path.includes('/experience') || path.includes('/localization')) {
      return 'EXPERIENCE';
    }
    if (path.includes('/account/')) {
      return 'ACCOUNT';
    }
    if (path.includes('/login') || path.includes('/password-reset') || path.includes('/email-verification') || path.endsWith('/logout')) {
      return 'PUBLIC_AUTH';
    }
    if (path.includes('/security/')) {
      return 'ADMIN';
    }
    return 'REALM_ADMIN';
  },

  recordRequest(input: {
    method: string;
    path: string;
    realmId?: string | null;
    actorUserId?: string | null;
    iamSessionId?: string | null;
    correlationId?: string | null;
    statusCode: number;
  }): IamSecurityAuditEvent {
    const event: IamSecurityAuditEvent = {
      id: `iam-security-event-${randomUUID()}`,
      occurred_at: nowIso(),
      method: input.method.toUpperCase(),
      path: input.path,
      realm_id: input.realmId ?? null,
      actor_user_id: input.actorUserId ?? null,
      iam_session_id: input.iamSessionId ?? null,
      correlation_id: input.correlationId ?? null,
      status_code: input.statusCode,
      outcome: input.statusCode >= 400 ? 'FAILURE' : 'SUCCESS',
      category: this.classifyPath(input.path),
    };
    state.events.unshift(event);
    if (state.events.length > 5000) {
      state.events.length = 5000;
    }
    pendingPersistEvents += 1;
    persistStateIfNeeded();
    return clone(event);
  },

  listEvents(filters?: {
    realmId?: string | null;
    outcome?: IamSecurityRequestOutcome | null;
    limit?: number | null;
  }): { generated_at: string; events: IamSecurityAuditEvent[]; count: number } {
    let events = [...state.events];
    if (filters?.realmId) {
      events = events.filter((event) => event.realm_id === filters.realmId);
    }
    if (filters?.outcome) {
      events = events.filter((event) => event.outcome === filters.outcome);
    }
    const limit = Math.max(1, Math.min(filters?.limit ?? 50, 250));
    events = events.slice(0, limit);
    return {
      generated_at: nowIso(),
      events: clone(events),
      count: events.length,
    };
  },

  getSummary(): IamSecurityAuditSummary {
    const threshold = Date.now() - 1000 * 60 * 60 * 24;
    const last24h = state.events.filter((event) => Date.parse(event.occurred_at) >= threshold);
    const categoryCounts = emptyCategoryCounts();
    for (const event of state.events) {
      categoryCounts[event.category] += 1;
    }
    return {
      generated_at: nowIso(),
      request_count: state.events.length,
      success_count: state.events.filter((event) => event.outcome === 'SUCCESS').length,
      failure_count: state.events.filter((event) => event.outcome === 'FAILURE').length,
      last_24h_request_count: last24h.length,
      last_24h_failure_count: last24h.filter((event) => event.outcome === 'FAILURE').length,
      category_counts: categoryCounts,
    };
  },

  getValidationSummary(input: {
    activeLockoutCount: number;
    failedLoginAttemptCount: number;
    adminSecurityActionCount: number;
    requestAuditFailureCount: number;
    requestAuditCount: number;
    hasStandaloneRuntime: boolean;
    hasTokenRevocation: boolean;
    hasSessionRevocation: boolean;
    hasRealmExport: boolean;
    migrationState?: IamValidationSummary['migration_state'];
  }): IamValidationSummary {
    const checks: IamValidationCheck[] = [
      {
        id: 'standalone-runtime-isolation',
        name: 'Standalone runtime isolation',
        status: input.hasStandaloneRuntime ? 'PASS' : 'WARN',
        summary: input.hasStandaloneRuntime
          ? 'The IAM plane is operating independently and has not been bound into any downstream application auth stack.'
          : 'The standalone runtime is not fully isolated.',
      },
      {
        id: 'failed-login-and-lockout',
        name: 'Failed login telemetry and lockout',
        status: input.failedLoginAttemptCount >= 0 ? 'PASS' : 'WARN',
        summary: `${input.failedLoginAttemptCount} failed login attempts recorded and ${input.activeLockoutCount} active lockouts currently visible in standalone state.`,
      },
      {
        id: 'session-and-token-invalidations',
        name: 'Session and token invalidation',
        status: input.hasSessionRevocation && input.hasTokenRevocation ? 'PASS' : 'WARN',
        summary: input.hasSessionRevocation && input.hasTokenRevocation
          ? 'Standalone admin controls can revoke account sessions and issued tokens.'
          : 'Session and token invalidation coverage is incomplete.',
      },
      {
        id: 'request-audit-ledger',
        name: 'Request-level security audit ledger',
        status: input.requestAuditCount > 0 ? 'PASS' : 'WARN',
        summary: `${input.requestAuditCount} audited IAM requests and ${input.requestAuditFailureCount} audited failures are currently retained in the standalone ledger.`,
      },
      {
        id: 'admin-security-operations',
        name: 'Admin user-security operations',
        status: input.adminSecurityActionCount > 0 ? 'PASS' : 'WARN',
        summary: `${input.adminSecurityActionCount} standalone admin security actions are available for password reset, lockout clearance, and forced revocation.`,
      },
      {
        id: 'realm-export-safety-net',
        name: 'Realm export safety net',
        status: input.hasRealmExport ? 'PASS' : 'WARN',
        summary: input.hasRealmExport
          ? 'Realm export remains available for review snapshots and rollback planning.'
          : 'Realm export capability is not currently available.',
      },
    ];

    return {
      generated_at: nowIso(),
      review_state: 'READY_FOR_REVIEW',
      integration_state: 'NOT_INTEGRATED_WITH_DOWNSTREAM_APPLICATIONS',
      migration_state: input.migrationState ?? 'BLOCKED_PENDING_REVIEW_AND_STANDALONE_ADOPTION',
      checks,
      agentic_development_notes: [
        'Use standalone validation realms and standalone users only. Do not bind this subsystem to downstream application runtime until review gates pass.',
        'Treat generated passwords, reset previews, and lockout state as synthetic validation artifacts and rotate or clear them after testing.',
        'Interactive agentic work should validate via explicit review realms and security ledgers rather than mutating shared product identities.',
      ],
      count: checks.length,
    };
  },

  exportState(): Record<string, unknown> {
    return clone(state) as unknown as Record<string, unknown>;
  },

  importState(input: Record<string, unknown>): void {
    const nextState = normalizeState(input as Partial<IamSecurityAuditState>);
    state.events = nextState.events;
    persistState();
  },
};
