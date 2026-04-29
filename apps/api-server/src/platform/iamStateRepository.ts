import {
  loadOrCreatePersistedState,
  loadOrCreatePersistedStateAsync,
  reloadOrCreatePersistedStateAsync,
  savePersistedState,
  savePersistedStateAsync,
} from './persistence';

const PROJECTED_ASYNC_SAVE_RETRIES = 10;
const PROJECTED_ASYNC_SAVE_RETRY_BACKOFF_MS = 15;

function isAsyncStateSaveConflict(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Refusing to overwrite newer persisted state')
    || message.includes('Conditional write failed for dynamodb://')
    || message.includes('persisted state changed concurrently');
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export interface IamStateRepository<TState> {
  load(): TState;
  save(state: TState): void;
}

export interface IamAsyncStateRepository<TState> {
  load(): Promise<TState>;
  save(state: TState): Promise<void>;
}

interface CreateProjectedIamStateRepositoryOptions<TParentState, TState> {
  parentRepository: IamStateRepository<TParentState>;
  select: (state: TParentState) => TState;
  assign: (state: TParentState, nextState: TState) => void;
}

interface CreateProjectedAsyncIamStateRepositoryOptions<TParentState, TState> {
  parentRepository: IamAsyncStateRepository<TParentState>;
  select: (state: TParentState) => TState;
  assign: (state: TParentState, nextState: TState) => void;
}

interface CreatePersistedIamStateRepositoryOptions<TPersistedState, TState> {
  fileName: string;
  seedFactory: () => TPersistedState;
  normalize: (state: TPersistedState) => TState;
  serialize?: (state: TState) => TPersistedState;
  version?: number;
}

export function createPersistedIamStateRepository<TPersistedState, TState = TPersistedState>(
  options: CreatePersistedIamStateRepositoryOptions<TPersistedState, TState>,
): IamStateRepository<TState> {
  let state: TState | null = null;

  return {
    load(): TState {
      if (state) {
        return state;
      }
      const persistedState = loadOrCreatePersistedState<TPersistedState>(
        options.fileName,
        options.seedFactory,
        options.version,
      );
      state = options.normalize(persistedState);
      return state;
    },

    save(nextState: TState): void {
      state = nextState;
      const serialized = options.serialize
        ? options.serialize(nextState)
        : nextState as unknown as TPersistedState;
      savePersistedState(options.fileName, serialized, options.version);
    },
  };
}

export function createPersistedAsyncIamStateRepository<TPersistedState, TState = TPersistedState>(
  options: CreatePersistedIamStateRepositoryOptions<TPersistedState, TState>,
): IamAsyncStateRepository<TState> {
  return {
    async load(): Promise<TState> {
      const persistedState = await reloadOrCreatePersistedStateAsync<TPersistedState>(
        options.fileName,
        options.seedFactory,
        options.version,
      );
      return options.normalize(persistedState);
    },

    async save(nextState: TState): Promise<void> {
      let lastError: unknown = null;

      for (let attempt = 0; attempt < PROJECTED_ASYNC_SAVE_RETRIES; attempt += 1) {
        const serialized = options.serialize
          ? options.serialize(nextState)
          : nextState as unknown as TPersistedState;
        try {
          await savePersistedStateAsync(options.fileName, serialized, options.version);
          return;
        } catch (error) {
          lastError = error;
          if (!isAsyncStateSaveConflict(error)) {
            throw error;
          }
          await sleep(PROJECTED_ASYNC_SAVE_RETRY_BACKOFF_MS * (attempt + 1));
        }
      }

      throw lastError instanceof Error ? lastError : new Error(String(lastError));
    },
  };
}

export function createProjectedIamStateRepository<TParentState, TState>(
  options: CreateProjectedIamStateRepositoryOptions<TParentState, TState>,
): IamStateRepository<TState> {
  return {
    load(): TState {
      return options.select(options.parentRepository.load());
    },

    save(nextState: TState): void {
      const parentState = options.parentRepository.load();
      options.assign(parentState, nextState);
      options.parentRepository.save(parentState);
    },
  };
}

export function createProjectedAsyncIamStateRepository<TParentState, TState>(
  options: CreateProjectedAsyncIamStateRepositoryOptions<TParentState, TState>,
): IamAsyncStateRepository<TState> {
  return {
    async load(): Promise<TState> {
      return options.select(await options.parentRepository.load());
    },

    async save(nextState: TState): Promise<void> {
      let lastError: unknown = null;

      for (let attempt = 0; attempt < PROJECTED_ASYNC_SAVE_RETRIES; attempt += 1) {
        const parentState = await options.parentRepository.load();
        options.assign(parentState, nextState);

        try {
          await options.parentRepository.save(parentState);
          return;
        } catch (error) {
          lastError = error;
          if (!isAsyncStateSaveConflict(error)) {
            throw error;
          }
          await sleep(PROJECTED_ASYNC_SAVE_RETRY_BACKOFF_MS * (attempt + 1));
        }
      }

      throw lastError instanceof Error ? lastError : new Error(String(lastError));
    },
  };
}
