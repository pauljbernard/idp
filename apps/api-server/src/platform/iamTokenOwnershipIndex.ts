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

const IAM_TOKEN_OWNERSHIP_INDEX_FILE = 'iam-token-ownership-index-state.json';

interface StoredIamBrowserSessionTokenLink {
  id: string;
  realm_id: string;
  browser_session_reference: string;
  browser_session_id: string;
  token_id: string;
  client_id: string;
  subject_kind: string;
  subject_id: string;
  created_at: string;
  terminated_at: string | null;
}

interface IamTokenOwnershipIndexState {
  browser_session_token_links: StoredIamBrowserSessionTokenLink[];
}

export interface IamBrowserSessionTokenLinkRecord {
  id: string;
  realm_id: string;
  browser_session_reference: string;
  browser_session_id: string;
  token_id: string;
  client_id: string;
  subject_kind: string;
  subject_id: string;
  created_at: string;
  terminated_at: string | null;
}

export interface IamTokenOwnershipIndexSummary {
  browser_session_token_link_count: number;
  active_browser_session_token_link_count: number;
}

function normalizeState(input: Partial<IamTokenOwnershipIndexState>): IamTokenOwnershipIndexState {
  return {
    browser_session_token_links: Array.isArray(input.browser_session_token_links) ? input.browser_session_token_links : [],
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

const tokenOwnershipStateRepository: IamStateRepository<IamTokenOwnershipIndexState> = createPersistedIamStateRepository<
  IamTokenOwnershipIndexState,
  IamTokenOwnershipIndexState
>({
  fileName: IAM_TOKEN_OWNERSHIP_INDEX_FILE,
  seedFactory: () => normalizeState({}),
  normalize: normalizeState,
});

const tokenOwnershipAsyncStateRepository: IamAsyncStateRepository<IamTokenOwnershipIndexState> = createPersistedAsyncIamStateRepository<
  IamTokenOwnershipIndexState,
  IamTokenOwnershipIndexState
>({
  fileName: IAM_TOKEN_OWNERSHIP_INDEX_FILE,
  seedFactory: () => normalizeState({}),
  normalize: normalizeState,
});

const state = tokenOwnershipStateRepository.load();

function syncInMemoryState(nextState: IamTokenOwnershipIndexState): void {
  state.browser_session_token_links = clone(nextState.browser_session_token_links);
}

async function loadStateAsync(): Promise<IamTokenOwnershipIndexState> {
  return normalizeState(await tokenOwnershipAsyncStateRepository.load());
}

function toPublicLink(record: StoredIamBrowserSessionTokenLink): IamBrowserSessionTokenLinkRecord {
  return clone(record);
}

export const LocalIamTokenOwnershipIndexStore = {
  getSummary(): IamTokenOwnershipIndexSummary {
    return {
      browser_session_token_link_count: state.browser_session_token_links.length,
      active_browser_session_token_link_count: state.browser_session_token_links.filter((record) => !record.terminated_at).length,
    };
  },

  recordBrowserSessionIssuedTokenLink(input: {
    realm_id: string;
    browser_session_reference: string;
    token_id: string;
    client_id: string;
    subject_kind: string;
    subject_id: string;
  }): IamBrowserSessionTokenLinkRecord {
    const normalizedBrowserSession = normalizeBrowserSessionReference(input.browser_session_reference);
    const existing = state.browser_session_token_links.find(
      (candidate) => candidate.realm_id === input.realm_id && candidate.token_id === input.token_id,
    );
    if (existing) {
      existing.browser_session_reference = normalizedBrowserSession.browser_session_reference;
      existing.browser_session_id = normalizedBrowserSession.browser_session_id;
      existing.client_id = input.client_id;
      existing.subject_kind = input.subject_kind;
      existing.subject_id = input.subject_id;
      existing.terminated_at = null;
      tokenOwnershipStateRepository.save(state);
      return toPublicLink(existing);
    }

    const record: StoredIamBrowserSessionTokenLink = {
      id: `iam-browser-token-link-${randomUUID()}`,
      realm_id: input.realm_id,
      browser_session_reference: normalizedBrowserSession.browser_session_reference,
      browser_session_id: normalizedBrowserSession.browser_session_id,
      token_id: input.token_id,
      client_id: input.client_id,
      subject_kind: input.subject_kind,
      subject_id: input.subject_id,
      created_at: nowIso(),
      terminated_at: null,
    };
    state.browser_session_token_links.unshift(record);
    state.browser_session_token_links = state.browser_session_token_links.slice(0, 20000);
    tokenOwnershipStateRepository.save(state);
    return toPublicLink(record);
  },

  async recordBrowserSessionIssuedTokenLinkAsync(input: {
    realm_id: string;
    browser_session_reference: string;
    token_id: string;
    client_id: string;
    subject_kind: string;
    subject_id: string;
  }): Promise<IamBrowserSessionTokenLinkRecord> {
    const persistedState = await loadStateAsync();
    const normalizedBrowserSession = normalizeBrowserSessionReference(input.browser_session_reference);
    const existing = persistedState.browser_session_token_links.find(
      (candidate) => candidate.realm_id === input.realm_id && candidate.token_id === input.token_id,
    );
    if (existing) {
      existing.browser_session_reference = normalizedBrowserSession.browser_session_reference;
      existing.browser_session_id = normalizedBrowserSession.browser_session_id;
      existing.client_id = input.client_id;
      existing.subject_kind = input.subject_kind;
      existing.subject_id = input.subject_id;
      existing.terminated_at = null;
      await tokenOwnershipAsyncStateRepository.save(persistedState);
      syncInMemoryState(persistedState);
      return toPublicLink(existing);
    }

    const record: StoredIamBrowserSessionTokenLink = {
      id: `iam-browser-token-link-${randomUUID()}`,
      realm_id: input.realm_id,
      browser_session_reference: normalizedBrowserSession.browser_session_reference,
      browser_session_id: normalizedBrowserSession.browser_session_id,
      token_id: input.token_id,
      client_id: input.client_id,
      subject_kind: input.subject_kind,
      subject_id: input.subject_id,
      created_at: nowIso(),
      terminated_at: null,
    };
    persistedState.browser_session_token_links.unshift(record);
    persistedState.browser_session_token_links = persistedState.browser_session_token_links.slice(0, 20000);
    await tokenOwnershipAsyncStateRepository.save(persistedState);
    syncInMemoryState(persistedState);
    return toPublicLink(record);
  },

  listActiveTokenLinksForBrowserSession(
    realmId: string,
    browserSessionReference: string,
  ): IamBrowserSessionTokenLinkRecord[] {
    const normalized = normalizeBrowserSessionReference(browserSessionReference);
    return state.browser_session_token_links
      .filter(
        (record) =>
          record.realm_id === realmId
          && !record.terminated_at
          && record.browser_session_id === normalized.browser_session_id,
      )
      .map(toPublicLink);
  },

  async listActiveTokenLinksForBrowserSessionAsync(
    realmId: string,
    browserSessionReference: string,
  ): Promise<IamBrowserSessionTokenLinkRecord[]> {
    const persistedState = await loadStateAsync();
    syncInMemoryState(persistedState);
    return this.listActiveTokenLinksForBrowserSession(realmId, browserSessionReference);
  },

  markTokenLinkTerminated(realmId: string, tokenId: string): { terminated: boolean; terminated_at: string | null } {
    const link = state.browser_session_token_links.find(
      (candidate) => candidate.realm_id === realmId && candidate.token_id === tokenId && !candidate.terminated_at,
    );
    if (!link) {
      return {
        terminated: false,
        terminated_at: null,
      };
    }
    link.terminated_at = nowIso();
    tokenOwnershipStateRepository.save(state);
    return {
      terminated: true,
      terminated_at: link.terminated_at,
    };
  },

  async markTokenLinkTerminatedAsync(
    realmId: string,
    tokenId: string,
  ): Promise<{ terminated: boolean; terminated_at: string | null }> {
    const persistedState = await loadStateAsync();
    const link = persistedState.browser_session_token_links.find(
      (candidate) => candidate.realm_id === realmId && candidate.token_id === tokenId && !candidate.terminated_at,
    );
    if (!link) {
      syncInMemoryState(persistedState);
      return {
        terminated: false,
        terminated_at: null,
      };
    }
    link.terminated_at = nowIso();
    await tokenOwnershipAsyncStateRepository.save(persistedState);
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
    const nextState = normalizeState(input as Partial<IamTokenOwnershipIndexState>);
    tokenOwnershipStateRepository.save(nextState);
    syncInMemoryState(nextState);
  },
};
