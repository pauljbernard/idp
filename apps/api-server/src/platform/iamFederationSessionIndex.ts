import { randomUUID } from 'crypto';
import {
  createPersistedAsyncIamStateRepository,
  createPersistedIamStateRepository,
  type IamAsyncStateRepository,
  type IamStateRepository,
} from './iamStateRepository';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

const IAM_FEDERATION_SESSION_INDEX_FILE = 'iam-federation-session-index-state.json';

interface StoredIamBrowserFederatedSessionLink {
  id: string;
  realm_id: string;
  user_id: string;
  browser_session_reference: string;
  browser_session_id: string;
  source_type: 'BROKER' | 'FEDERATION';
  linked_identity_id: string;
  provider_id: string;
  provider_name: string;
  provider_alias: string | null;
  provider_kind: string;
  external_subject: string;
  created_at: string;
  terminated_at: string | null;
}

interface IamFederationSessionIndexState {
  browser_federated_session_links: StoredIamBrowserFederatedSessionLink[];
}

export interface IamBrowserFederatedSessionLinkRecord {
  id: string;
  realm_id: string;
  user_id: string;
  browser_session_reference: string;
  browser_session_id: string;
  source_type: 'BROKER' | 'FEDERATION';
  linked_identity_id: string;
  provider_id: string;
  provider_name: string;
  provider_alias: string | null;
  provider_kind: string;
  external_subject: string;
  created_at: string;
  terminated_at: string | null;
}

export interface IamFederationSessionIndexSummary {
  browser_federated_session_link_count: number;
  active_browser_federated_session_link_count: number;
}

function normalizeState(input: Partial<IamFederationSessionIndexState>): IamFederationSessionIndexState {
  return {
    browser_federated_session_links: Array.isArray(input.browser_federated_session_links)
      ? input.browser_federated_session_links
      : [],
  };
}

function normalizeBrowserSessionReference(browserSessionReference: string): {
  browser_session_reference: string;
  browser_session_id: string;
} {
  const normalized = browserSessionReference.trim();
  const delimiterIndex = normalized.indexOf('.');
  return {
    browser_session_reference: normalized,
    browser_session_id: delimiterIndex >= 0 ? normalized.slice(0, delimiterIndex) : normalized,
  };
}

const federationSessionIndexStateRepository: IamStateRepository<IamFederationSessionIndexState> = createPersistedIamStateRepository<
  IamFederationSessionIndexState,
  IamFederationSessionIndexState
>({
  fileName: IAM_FEDERATION_SESSION_INDEX_FILE,
  seedFactory: () => normalizeState({}),
  normalize: normalizeState,
});

const federationSessionIndexAsyncStateRepository: IamAsyncStateRepository<IamFederationSessionIndexState> = createPersistedAsyncIamStateRepository<
  IamFederationSessionIndexState,
  IamFederationSessionIndexState
>({
  fileName: IAM_FEDERATION_SESSION_INDEX_FILE,
  seedFactory: () => normalizeState({}),
  normalize: normalizeState,
});

const state = federationSessionIndexStateRepository.load();

function syncInMemoryState(nextState: IamFederationSessionIndexState): void {
  state.browser_federated_session_links = clone(nextState.browser_federated_session_links);
}

async function loadStateAsync(): Promise<IamFederationSessionIndexState> {
  return normalizeState(await federationSessionIndexAsyncStateRepository.load());
}

function toPublicLink(record: StoredIamBrowserFederatedSessionLink): IamBrowserFederatedSessionLinkRecord {
  return clone(record);
}

export const LocalIamFederationSessionIndexStore = {
  getSummary(): IamFederationSessionIndexSummary {
    return {
      browser_federated_session_link_count: state.browser_federated_session_links.length,
      active_browser_federated_session_link_count: state.browser_federated_session_links.filter((record) => !record.terminated_at).length,
    };
  },

  recordBrowserFederatedSessionLink(input: {
    realm_id: string;
    user_id: string;
    browser_session_reference: string;
    source_type: 'BROKER' | 'FEDERATION';
    linked_identity_id: string;
    provider_id: string;
    provider_name: string;
    provider_alias: string | null;
    provider_kind: string;
    external_subject: string;
  }): IamBrowserFederatedSessionLinkRecord {
    const normalizedBrowserSession = normalizeBrowserSessionReference(input.browser_session_reference);
    const existing = state.browser_federated_session_links.find(
      (candidate) => candidate.realm_id === input.realm_id && candidate.linked_identity_id === input.linked_identity_id && !candidate.terminated_at,
    );
    if (existing) {
      existing.user_id = input.user_id;
      existing.browser_session_reference = normalizedBrowserSession.browser_session_reference;
      existing.browser_session_id = normalizedBrowserSession.browser_session_id;
      existing.source_type = input.source_type;
      existing.provider_id = input.provider_id;
      existing.provider_name = input.provider_name;
      existing.provider_alias = input.provider_alias;
      existing.provider_kind = input.provider_kind;
      existing.external_subject = input.external_subject;
      existing.terminated_at = null;
      federationSessionIndexStateRepository.save(state);
      return toPublicLink(existing);
    }

    const record: StoredIamBrowserFederatedSessionLink = {
      id: `iam-browser-federated-link-${randomUUID()}`,
      realm_id: input.realm_id,
      user_id: input.user_id,
      browser_session_reference: normalizedBrowserSession.browser_session_reference,
      browser_session_id: normalizedBrowserSession.browser_session_id,
      source_type: input.source_type,
      linked_identity_id: input.linked_identity_id,
      provider_id: input.provider_id,
      provider_name: input.provider_name,
      provider_alias: input.provider_alias,
      provider_kind: input.provider_kind,
      external_subject: input.external_subject,
      created_at: nowIso(),
      terminated_at: null,
    };
    state.browser_federated_session_links.unshift(record);
    state.browser_federated_session_links = state.browser_federated_session_links.slice(0, 20000);
    federationSessionIndexStateRepository.save(state);
    return toPublicLink(record);
  },

  async recordBrowserFederatedSessionLinkAsync(input: {
    realm_id: string;
    user_id: string;
    browser_session_reference: string;
    source_type: 'BROKER' | 'FEDERATION';
    linked_identity_id: string;
    provider_id: string;
    provider_name: string;
    provider_alias: string | null;
    provider_kind: string;
    external_subject: string;
  }): Promise<IamBrowserFederatedSessionLinkRecord> {
    const persistedState = await loadStateAsync();
    const normalizedBrowserSession = normalizeBrowserSessionReference(input.browser_session_reference);
    const existing = persistedState.browser_federated_session_links.find(
      (candidate) => candidate.realm_id === input.realm_id && candidate.linked_identity_id === input.linked_identity_id && !candidate.terminated_at,
    );
    if (existing) {
      existing.user_id = input.user_id;
      existing.browser_session_reference = normalizedBrowserSession.browser_session_reference;
      existing.browser_session_id = normalizedBrowserSession.browser_session_id;
      existing.source_type = input.source_type;
      existing.provider_id = input.provider_id;
      existing.provider_name = input.provider_name;
      existing.provider_alias = input.provider_alias;
      existing.provider_kind = input.provider_kind;
      existing.external_subject = input.external_subject;
      existing.terminated_at = null;
      await federationSessionIndexAsyncStateRepository.save(persistedState);
      syncInMemoryState(persistedState);
      return toPublicLink(existing);
    }

    const record: StoredIamBrowserFederatedSessionLink = {
      id: `iam-browser-federated-link-${randomUUID()}`,
      realm_id: input.realm_id,
      user_id: input.user_id,
      browser_session_reference: normalizedBrowserSession.browser_session_reference,
      browser_session_id: normalizedBrowserSession.browser_session_id,
      source_type: input.source_type,
      linked_identity_id: input.linked_identity_id,
      provider_id: input.provider_id,
      provider_name: input.provider_name,
      provider_alias: input.provider_alias,
      provider_kind: input.provider_kind,
      external_subject: input.external_subject,
      created_at: nowIso(),
      terminated_at: null,
    };
    persistedState.browser_federated_session_links.unshift(record);
    persistedState.browser_federated_session_links = persistedState.browser_federated_session_links.slice(0, 20000);
    await federationSessionIndexAsyncStateRepository.save(persistedState);
    syncInMemoryState(persistedState);
    return toPublicLink(record);
  },

  listActiveBrowserFederatedSessionLinksForBrowserSession(
    realmId: string,
    browserSessionReference: string,
  ): IamBrowserFederatedSessionLinkRecord[] {
    const normalized = normalizeBrowserSessionReference(browserSessionReference);
    return state.browser_federated_session_links
      .filter(
        (record) =>
          record.realm_id === realmId
          && !record.terminated_at
          && record.browser_session_id === normalized.browser_session_id,
      )
      .map(toPublicLink);
  },

  listActiveBrowserFederatedSessionLinksForProvider(
    realmId: string,
    providerId: string,
  ): IamBrowserFederatedSessionLinkRecord[] {
    return state.browser_federated_session_links
      .filter(
        (record) =>
          record.realm_id === realmId
          && record.provider_id === providerId
          && !record.terminated_at,
      )
      .map(toPublicLink);
  },

  async listActiveBrowserFederatedSessionLinksForProviderAsync(
    realmId: string,
    providerId: string,
  ): Promise<IamBrowserFederatedSessionLinkRecord[]> {
    const persistedState = await loadStateAsync();
    syncInMemoryState(persistedState);
    return this.listActiveBrowserFederatedSessionLinksForProvider(realmId, providerId);
  },

  async terminateBrowserFederatedSessionLinksForBrowserSessionAsync(
    realmId: string,
    browserSessionReference: string,
  ): Promise<{ terminated_link_count: number; terminated_at: string | null }> {
    const persistedState = await loadStateAsync();
    const normalized = normalizeBrowserSessionReference(browserSessionReference);
    const terminatedAt = nowIso();
    let terminatedLinkCount = 0;
    for (const record of persistedState.browser_federated_session_links) {
      if (record.realm_id !== realmId || record.terminated_at || record.browser_session_id !== normalized.browser_session_id) {
        continue;
      }
      record.terminated_at = terminatedAt;
      terminatedLinkCount += 1;
    }
    if (terminatedLinkCount > 0) {
      await federationSessionIndexAsyncStateRepository.save(persistedState);
    }
    syncInMemoryState(persistedState);
    return {
      terminated_link_count: terminatedLinkCount,
      terminated_at: terminatedLinkCount > 0 ? terminatedAt : null,
    };
  },

  async terminateBrowserFederatedSessionLinksForProviderAsync(
    realmId: string,
    providerId: string,
  ): Promise<{ terminated_link_count: number; terminated_at: string | null }> {
    const persistedState = await loadStateAsync();
    const terminatedAt = nowIso();
    let terminatedLinkCount = 0;
    for (const record of persistedState.browser_federated_session_links) {
      if (record.realm_id !== realmId || record.provider_id !== providerId || record.terminated_at) {
        continue;
      }
      record.terminated_at = terminatedAt;
      terminatedLinkCount += 1;
    }
    if (terminatedLinkCount > 0) {
      await federationSessionIndexAsyncStateRepository.save(persistedState);
    }
    syncInMemoryState(persistedState);
    return {
      terminated_link_count: terminatedLinkCount,
      terminated_at: terminatedLinkCount > 0 ? terminatedAt : null,
    };
  },

  exportState(): Record<string, unknown> {
    return clone(state) as unknown as Record<string, unknown>;
  },

  importState(input: Record<string, unknown>): void {
    syncInMemoryState(normalizeState(input as Partial<IamFederationSessionIndexState>));
    federationSessionIndexStateRepository.save(state);
  },
};
