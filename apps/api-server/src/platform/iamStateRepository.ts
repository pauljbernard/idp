import {
  loadOrCreatePersistedState,
  loadOrCreatePersistedStateAsync,
  savePersistedState,
  savePersistedStateAsync,
} from './persistence';

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
      const persistedState = await loadOrCreatePersistedStateAsync<TPersistedState>(
        options.fileName,
        options.seedFactory,
        options.version,
      );
      return options.normalize(persistedState);
    },

    async save(nextState: TState): Promise<void> {
      const serialized = options.serialize
        ? options.serialize(nextState)
        : nextState as unknown as TPersistedState;
      await savePersistedStateAsync(options.fileName, serialized, options.version);
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
      const parentState = await options.parentRepository.load();
      options.assign(parentState, nextState);
      await options.parentRepository.save(parentState);
    },
  };
}
