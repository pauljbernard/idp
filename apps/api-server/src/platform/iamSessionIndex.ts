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

const IAM_SESSION_INDEX_FILE = 'iam-session-index-state.json';

interface StoredIamBrowserSamlSessionLink {
  id: string;
  realm_id: string;
  user_id: string;
  client_id: string;
  browser_session_reference: string;
  browser_session_id: string;
  saml_session_id: string;
  saml_session_index: string;
  created_at: string;
  terminated_at: string | null;
}

interface IamSessionIndexState {
  browser_saml_session_links: StoredIamBrowserSamlSessionLink[];
}

export interface IamBrowserSamlSessionLinkRecord {
  id: string;
  realm_id: string;
  user_id: string;
  client_id: string;
  browser_session_reference: string;
  browser_session_id: string;
  saml_session_id: string;
  saml_session_index: string;
  created_at: string;
  terminated_at: string | null;
}

export interface IamSessionIndexSummary {
  browser_saml_session_link_count: number;
  active_browser_saml_session_link_count: number;
}

function normalizeState(input: Partial<IamSessionIndexState>): IamSessionIndexState {
  return {
    browser_saml_session_links: Array.isArray(input.browser_saml_session_links) ? input.browser_saml_session_links : [],
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

const sessionIndexStateRepository: IamStateRepository<IamSessionIndexState> = createPersistedIamStateRepository<
  IamSessionIndexState,
  IamSessionIndexState
>({
  fileName: IAM_SESSION_INDEX_FILE,
  seedFactory: () => normalizeState({}),
  normalize: normalizeState,
});

const sessionIndexAsyncStateRepository: IamAsyncStateRepository<IamSessionIndexState> = createPersistedAsyncIamStateRepository<
  IamSessionIndexState,
  IamSessionIndexState
>({
  fileName: IAM_SESSION_INDEX_FILE,
  seedFactory: () => normalizeState({}),
  normalize: normalizeState,
});

const state = sessionIndexStateRepository.load();

function syncInMemoryState(nextState: IamSessionIndexState): void {
  state.browser_saml_session_links = clone(nextState.browser_saml_session_links);
}

async function loadStateAsync(): Promise<IamSessionIndexState> {
  return normalizeState(await sessionIndexAsyncStateRepository.load());
}

function toPublicLink(record: StoredIamBrowserSamlSessionLink): IamBrowserSamlSessionLinkRecord {
  return clone(record);
}

export const LocalIamSessionIndexStore = {
  getSummary(): IamSessionIndexSummary {
    return {
      browser_saml_session_link_count: state.browser_saml_session_links.length,
      active_browser_saml_session_link_count: state.browser_saml_session_links.filter((record) => !record.terminated_at).length,
    };
  },

  recordBrowserSamlSessionLink(input: {
    realm_id: string;
    user_id: string;
    client_id: string;
    browser_session_reference: string;
    saml_session_id: string;
    saml_session_index: string;
  }): IamBrowserSamlSessionLinkRecord {
    const normalizedBrowserSession = normalizeBrowserSessionReference(input.browser_session_reference);
    const existing = state.browser_saml_session_links.find(
      (candidate) => candidate.realm_id === input.realm_id && candidate.saml_session_id === input.saml_session_id,
    );
    if (existing) {
      existing.user_id = input.user_id;
      existing.client_id = input.client_id;
      existing.browser_session_reference = normalizedBrowserSession.browser_session_reference;
      existing.browser_session_id = normalizedBrowserSession.browser_session_id;
      existing.saml_session_index = input.saml_session_index;
      existing.terminated_at = null;
      sessionIndexStateRepository.save(state);
      return toPublicLink(existing);
    }

    const record: StoredIamBrowserSamlSessionLink = {
      id: `iam-browser-saml-link-${randomUUID()}`,
      realm_id: input.realm_id,
      user_id: input.user_id,
      client_id: input.client_id,
      browser_session_reference: normalizedBrowserSession.browser_session_reference,
      browser_session_id: normalizedBrowserSession.browser_session_id,
      saml_session_id: input.saml_session_id,
      saml_session_index: input.saml_session_index,
      created_at: nowIso(),
      terminated_at: null,
    };
    state.browser_saml_session_links.unshift(record);
    state.browser_saml_session_links = state.browser_saml_session_links.slice(0, 5000);
    sessionIndexStateRepository.save(state);
    return toPublicLink(record);
  },

  async recordBrowserSamlSessionLinkAsync(input: {
    realm_id: string;
    user_id: string;
    client_id: string;
    browser_session_reference: string;
    saml_session_id: string;
    saml_session_index: string;
  }): Promise<IamBrowserSamlSessionLinkRecord> {
    const persistedState = await loadStateAsync();
    const normalizedBrowserSession = normalizeBrowserSessionReference(input.browser_session_reference);
    const existing = persistedState.browser_saml_session_links.find(
      (candidate) => candidate.realm_id === input.realm_id && candidate.saml_session_id === input.saml_session_id,
    );
    if (existing) {
      existing.user_id = input.user_id;
      existing.client_id = input.client_id;
      existing.browser_session_reference = normalizedBrowserSession.browser_session_reference;
      existing.browser_session_id = normalizedBrowserSession.browser_session_id;
      existing.saml_session_index = input.saml_session_index;
      existing.terminated_at = null;
      await sessionIndexAsyncStateRepository.save(persistedState);
      syncInMemoryState(persistedState);
      return toPublicLink(existing);
    }

    const record: StoredIamBrowserSamlSessionLink = {
      id: `iam-browser-saml-link-${randomUUID()}`,
      realm_id: input.realm_id,
      user_id: input.user_id,
      client_id: input.client_id,
      browser_session_reference: normalizedBrowserSession.browser_session_reference,
      browser_session_id: normalizedBrowserSession.browser_session_id,
      saml_session_id: input.saml_session_id,
      saml_session_index: input.saml_session_index,
      created_at: nowIso(),
      terminated_at: null,
    };
    persistedState.browser_saml_session_links.unshift(record);
    persistedState.browser_saml_session_links = persistedState.browser_saml_session_links.slice(0, 5000);
    await sessionIndexAsyncStateRepository.save(persistedState);
    syncInMemoryState(persistedState);
    return toPublicLink(record);
  },

  listActiveBrowserSamlSessionLinksForBrowserSession(
    realmId: string,
    browserSessionReference: string,
  ): IamBrowserSamlSessionLinkRecord[] {
    const normalized = normalizeBrowserSessionReference(browserSessionReference);
    return state.browser_saml_session_links
      .filter(
        (record) =>
          record.realm_id === realmId
          && !record.terminated_at
          && record.browser_session_id === normalized.browser_session_id,
      )
      .map(toPublicLink);
  },

  async listActiveBrowserSamlSessionLinksForBrowserSessionAsync(
    realmId: string,
    browserSessionReference: string,
  ): Promise<IamBrowserSamlSessionLinkRecord[]> {
    const persistedState = await loadStateAsync();
    syncInMemoryState(persistedState);
    return this.listActiveBrowserSamlSessionLinksForBrowserSession(realmId, browserSessionReference);
  },

  markSamlSessionTerminated(realmId: string, samlSessionId: string): { terminated: boolean; terminated_at: string | null } {
    const link = state.browser_saml_session_links.find(
      (candidate) => candidate.realm_id === realmId && candidate.saml_session_id === samlSessionId && !candidate.terminated_at,
    );
    if (!link) {
      return {
        terminated: false,
        terminated_at: null,
      };
    }
    link.terminated_at = nowIso();
    sessionIndexStateRepository.save(state);
    return {
      terminated: true,
      terminated_at: link.terminated_at,
    };
  },

  async markSamlSessionTerminatedAsync(
    realmId: string,
    samlSessionId: string,
  ): Promise<{ terminated: boolean; terminated_at: string | null }> {
    const persistedState = await loadStateAsync();
    const link = persistedState.browser_saml_session_links.find(
      (candidate) => candidate.realm_id === realmId && candidate.saml_session_id === samlSessionId && !candidate.terminated_at,
    );
    if (!link) {
      syncInMemoryState(persistedState);
      return {
        terminated: false,
        terminated_at: null,
      };
    }
    link.terminated_at = nowIso();
    await sessionIndexAsyncStateRepository.save(persistedState);
    syncInMemoryState(persistedState);
    return {
      terminated: true,
      terminated_at: link.terminated_at,
    };
  },

  exportState(): Record<string, unknown> {
    return clone(state) as unknown as Record<string, unknown>;
  },

  importState(input: Record<string, unknown>): void {
    const nextState = normalizeState(input as Partial<IamSessionIndexState>);
    sessionIndexStateRepository.save(nextState);
    syncInMemoryState(nextState);
  },
};
