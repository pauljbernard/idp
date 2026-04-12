import { randomUUID } from 'crypto';
import { createPersistedIamStateRepository, type IamStateRepository } from './iamStateRepository';
import { LocalIamFederationRuntimeStore } from './iamFederationRuntime';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

const IAM_FEDERATION_FAILOVER_FILE = 'iam-federation-failover-state.json';

export type IamFederationProviderFailoverStatus = 'HEALTHY' | 'DEGRADED' | 'FAILED';
export type IamFederationFailoverAction = 'CIRCUIT_BREAK' | 'FAILOVER' | 'RECOVER';

export interface IamFederationProviderHealthRecord {
  provider_id: string;
  provider_name: string;
  provider_type: 'IDENTITY_PROVIDER' | 'USER_FEDERATION_PROVIDER';
  protocol: string;
  status: IamFederationProviderFailoverStatus;
  last_check_at: string;
  last_success_at: string | null;
  consecutive_failures: number;
  circuit_breaker_open: boolean;
  circuit_breaker_opened_at: string | null;
  failover_provider_id: string | null;
  notes: string[];
}

export interface IamFederationFailoverEventRecord {
  id: string;
  provider_id: string;
  provider_name: string;
  action: IamFederationFailoverAction;
  reason: string;
  previous_status: IamFederationProviderFailoverStatus;
  new_status: IamFederationProviderFailoverStatus;
  failover_target_id: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface IamFederationFailoverState {
  provider_health_records: IamFederationProviderHealthRecord[];
  failover_events: IamFederationFailoverEventRecord[];
}

function normalizeState(input: Partial<IamFederationFailoverState>): IamFederationFailoverState {
  return {
    provider_health_records: Array.isArray(input.provider_health_records) ? input.provider_health_records : [],
    failover_events: Array.isArray(input.failover_events) ? input.failover_events : [],
  };
}

const federationFailoverStateRepository: IamStateRepository<IamFederationFailoverState> = createPersistedIamStateRepository<
  IamFederationFailoverState,
  IamFederationFailoverState
>({
  fileName: IAM_FEDERATION_FAILOVER_FILE,
  seedFactory: () => normalizeState({}),
  normalize: normalizeState,
});

const state = federationFailoverStateRepository.load();

function persistStateSyncOnly(): void {
  federationFailoverStateRepository.save(state);
}

function recordFailoverEvent(input: {
  providerId: string;
  providerName: string;
  action: IamFederationFailoverAction;
  reason: string;
  previousStatus: IamFederationProviderFailoverStatus;
  newStatus: IamFederationProviderFailoverStatus;
  failoverTargetId?: string | null;
  metadata?: Record<string, unknown>;
}): IamFederationFailoverEventRecord {
  const record: IamFederationFailoverEventRecord = {
    id: randomUUID(),
    provider_id: input.providerId,
    provider_name: input.providerName,
    action: input.action,
    reason: input.reason,
    previous_status: input.previousStatus,
    new_status: input.newStatus,
    failover_target_id: input.failoverTargetId ?? null,
    created_at: nowIso(),
    metadata: input.metadata ?? {},
  };

  state.failover_events.push(record);

  // Keep only last 1000 events
  if (state.failover_events.length > 1000) {
    state.failover_events = state.failover_events.slice(-1000);
  }

  persistStateSyncOnly();
  return clone(record);
}

export interface IamFederationFailoverSummary {
  total_providers_monitored: number;
  healthy_providers: number;
  degraded_providers: number;
  failed_providers: number;
  circuit_breakers_open: number;
  recent_failover_events: number;
}

export const LocalIamFederationFailoverStore = {
  getSummary(): IamFederationFailoverSummary {
    const healthyCount = state.provider_health_records.filter(p => p.status === 'HEALTHY').length;
    const degradedCount = state.provider_health_records.filter(p => p.status === 'DEGRADED').length;
    const failedCount = state.provider_health_records.filter(p => p.status === 'FAILED').length;
    const circuitBreakersOpen = state.provider_health_records.filter(p => p.circuit_breaker_open).length;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentEvents = state.failover_events.filter(e => e.created_at > oneDayAgo).length;

    return {
      total_providers_monitored: state.provider_health_records.length,
      healthy_providers: healthyCount,
      degraded_providers: degradedCount,
      failed_providers: failedCount,
      circuit_breakers_open: circuitBreakersOpen,
      recent_failover_events: recentEvents,
    };
  },

  checkProviderHealth(providerId: string): IamFederationProviderHealthRecord | null {
    const record = state.provider_health_records.find(p => p.provider_id === providerId);
    return record ? clone(record) : null;
  },

  updateProviderHealth(input: {
    providerId: string;
    providerName: string;
    providerType: 'IDENTITY_PROVIDER' | 'USER_FEDERATION_PROVIDER';
    protocol: string;
    status: IamFederationProviderFailoverStatus;
    notes?: string[];
  }): IamFederationProviderHealthRecord {
    const now = nowIso();
    const existingIndex = state.provider_health_records.findIndex(p => p.provider_id === input.providerId);

    if (existingIndex >= 0) {
      const existing = state.provider_health_records[existingIndex];
      const previousStatus = existing.status;

      // Update consecutive failures
      let consecutiveFailures = existing.consecutive_failures;
      if (input.status === 'FAILED') {
        consecutiveFailures += 1;
      } else if (input.status === 'HEALTHY') {
        consecutiveFailures = 0;
      }

      // Check circuit breaker logic
      let circuitBreakerOpen = existing.circuit_breaker_open;
      let circuitBreakerOpenedAt = existing.circuit_breaker_opened_at;

      if (consecutiveFailures >= 3 && !circuitBreakerOpen) {
        circuitBreakerOpen = true;
        circuitBreakerOpenedAt = now;

        recordFailoverEvent({
          providerId: input.providerId,
          providerName: input.providerName,
          action: 'CIRCUIT_BREAK',
          reason: `Circuit breaker opened after ${consecutiveFailures} consecutive failures`,
          previousStatus,
          newStatus: input.status,
          metadata: { consecutive_failures: consecutiveFailures },
        });
      } else if (input.status === 'HEALTHY' && circuitBreakerOpen) {
        circuitBreakerOpen = false;
        circuitBreakerOpenedAt = null;

        recordFailoverEvent({
          providerId: input.providerId,
          providerName: input.providerName,
          action: 'RECOVER',
          reason: 'Provider recovered, circuit breaker closed',
          previousStatus,
          newStatus: input.status,
        });
      }

      const updated: IamFederationProviderHealthRecord = {
        ...existing,
        status: input.status,
        last_check_at: now,
        last_success_at: input.status === 'HEALTHY' ? now : existing.last_success_at,
        consecutive_failures: consecutiveFailures,
        circuit_breaker_open: circuitBreakerOpen,
        circuit_breaker_opened_at: circuitBreakerOpenedAt,
        notes: input.notes ?? existing.notes,
      };

      state.provider_health_records[existingIndex] = updated;

      if (previousStatus !== input.status) {
        recordFailoverEvent({
          providerId: input.providerId,
          providerName: input.providerName,
          action: input.status === 'FAILED' ? 'FAILOVER' : 'RECOVER',
          reason: `Provider status changed from ${previousStatus} to ${input.status}`,
          previousStatus,
          newStatus: input.status,
        });
      }

    } else {
      // Create new health record
      const newRecord: IamFederationProviderHealthRecord = {
        provider_id: input.providerId,
        provider_name: input.providerName,
        provider_type: input.providerType,
        protocol: input.protocol,
        status: input.status,
        last_check_at: now,
        last_success_at: input.status === 'HEALTHY' ? now : null,
        consecutive_failures: input.status === 'FAILED' ? 1 : 0,
        circuit_breaker_open: false,
        circuit_breaker_opened_at: null,
        failover_provider_id: null,
        notes: input.notes ?? [],
      };

      state.provider_health_records.push(newRecord);
    }

    persistStateSyncOnly();
    const record = state.provider_health_records.find(p => p.provider_id === input.providerId)!;
    return clone(record);
  },

  listProviderHealthRecords(filters?: {
    status?: IamFederationProviderFailoverStatus;
    provider_type?: 'IDENTITY_PROVIDER' | 'USER_FEDERATION_PROVIDER';
    circuit_breaker_open?: boolean;
  }): { provider_health_records: IamFederationProviderHealthRecord[]; count: number } {
    let filtered = clone(state.provider_health_records);

    if (filters?.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }
    if (filters?.provider_type) {
      filtered = filtered.filter(p => p.provider_type === filters.provider_type);
    }
    if (filters?.circuit_breaker_open !== undefined) {
      filtered = filtered.filter(p => p.circuit_breaker_open === filters.circuit_breaker_open);
    }

    return {
      provider_health_records: filtered,
      count: filtered.length,
    };
  },

  listFailoverEvents(filters?: {
    provider_id?: string;
    action?: IamFederationFailoverAction;
    since?: string;
  }): { failover_events: IamFederationFailoverEventRecord[]; count: number } {
    let filtered = clone(state.failover_events);

    if (filters?.provider_id) {
      filtered = filtered.filter(e => e.provider_id === filters.provider_id);
    }
    if (filters?.action) {
      filtered = filtered.filter(e => e.action === filters.action);
    }
    if (filters?.since) {
      filtered = filtered.filter(e => e.created_at >= filters.since!);
    }

    // Sort by most recent first
    filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));

    return {
      failover_events: filtered.slice(0, 100), // Limit to 100 most recent
      count: filtered.length,
    };
  },

  initializeMonitoringForProvider(providerId: string): void {
    // Get provider details from federation runtime
    const federationSummary = LocalIamFederationRuntimeStore.getSummary();
    const providers = LocalIamFederationRuntimeStore.listIdentityProviders({});
    const userProviders = LocalIamFederationRuntimeStore.listUserFederationProviders({});

    const identityProvider = providers.identity_providers.find(p => p.id === providerId);
    if (identityProvider) {
      this.updateProviderHealth({
        providerId: identityProvider.id,
        providerName: identityProvider.name,
        providerType: 'IDENTITY_PROVIDER',
        protocol: identityProvider.protocol,
        status: identityProvider.status === 'ACTIVE' ? 'HEALTHY' : 'DEGRADED',
        notes: [`Initialized monitoring for ${identityProvider.protocol} identity provider`],
      });
      return;
    }

    const userProvider = userProviders.user_federation_providers.find(p => p.id === providerId);
    if (userProvider) {
      this.updateProviderHealth({
        providerId: userProvider.id,
        providerName: userProvider.name,
        providerType: 'USER_FEDERATION_PROVIDER',
        protocol: userProvider.kind,
        status: userProvider.status === 'ACTIVE' ? 'HEALTHY' : 'DEGRADED',
        notes: [`Initialized monitoring for ${userProvider.kind} user federation provider`],
      });
      return;
    }
  },
};