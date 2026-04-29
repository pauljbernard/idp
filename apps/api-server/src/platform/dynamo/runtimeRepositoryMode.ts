export interface RuntimeRepositoryMode {
  dualWrite: boolean;
  readV2: boolean;
  paritySampleRate: number;
}

function parseBoolean(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function parseRate(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, parsed));
}

export function getRuntimeRepositoryMode(): RuntimeRepositoryMode {
  return {
    dualWrite: parseBoolean(process.env.IDP_DDB_RUNTIME_DUAL_WRITE),
    readV2: parseBoolean(process.env.IDP_DDB_RUNTIME_READ_V2),
    paritySampleRate: parseRate(process.env.IDP_DDB_RUNTIME_PARITY_SAMPLE_RATE, 0),
  };
}
