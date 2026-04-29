interface EnvironmentAlias {
  current: string;
}

export const LEGACY_COMPAT_ENV = {
  publicUiBaseUrl: {
    current: 'IDP_PUBLIC_UI_BASE_URL',
  },
  identityBridgeSecret: {
    current: 'IDP_IDENTITY_BRIDGE_SECRET',
  },
  platformStateRoot: {
    current: 'IDP_PLATFORM_STATE_ROOT',
  },
  platformDurableRoot: {
    current: 'IDP_PLATFORM_DURABLE_ROOT',
  },
  platformPersistenceBackend: {
    current: 'IDP_PLATFORM_PERSISTENCE_BACKEND',
  },
  platformLockTimeoutMs: {
    current: 'IDP_PLATFORM_LOCK_TIMEOUT_MS',
  },
  platformLockRetryMs: {
    current: 'IDP_PLATFORM_LOCK_RETRY_MS',
  },
  platformStaleLockMs: {
    current: 'IDP_PLATFORM_STALE_LOCK_MS',
  },
  iamRequireSessionProof: {
    current: 'IDP_IAM_REQUIRE_SESSION_PROOF',
  },
  iamEnableRecoveryCodePreview: {
    current: 'IDP_IAM_ENABLE_RECOVERY_CODE_PREVIEW',
  },
  iamBootstrapDefaultPassword: {
    current: 'IDP_IAM_BOOTSTRAP_DEFAULT_PASSWORD',
  },
  iamSyntheticClientSecretDefault: {
    current: 'IDP_IAM_SYNTHETIC_CLIENT_SECRET_DEFAULT',
  },
} as const satisfies Record<string, EnvironmentAlias>;

function normalizeNames(aliases: EnvironmentAlias[]): string[] {
  return aliases.map((alias) => alias.current);
}

export function compatibilityEnvNames(...aliases: EnvironmentAlias[]): string[] {
  return normalizeNames(aliases);
}

export function readCompatibilityEnv(...aliases: EnvironmentAlias[]): string | null {
  for (const name of normalizeNames(aliases)) {
    const rawValue = process.env[name]?.trim();
    if (rawValue) {
      return rawValue;
    }
  }
  return null;
}

export function readCompatibilityBooleanEnv(...aliases: EnvironmentAlias[]): boolean | undefined {
  const configured = readCompatibilityEnv(...aliases)?.toLowerCase();
  if (configured === 'true') {
    return true;
  }
  if (configured === 'false') {
    return false;
  }
  return undefined;
}

function bootstrapPasswordAlias(token: string): EnvironmentAlias {
  return {
    current: `IDP_IAM_BOOTSTRAP_PASSWORD_${token}`,
  };
}

function syntheticClientSecretAlias(token: string): EnvironmentAlias {
  return {
    current: `IDP_IAM_SYNTHETIC_CLIENT_SECRET_${token}`,
  };
}

export function readCompatibilityBootstrapPassword(token: string): string | null {
  return readCompatibilityEnv(
    bootstrapPasswordAlias(token),
    LEGACY_COMPAT_ENV.iamBootstrapDefaultPassword,
  );
}

export function readCompatibilitySyntheticClientSecret(token: string): string | null {
  return readCompatibilityEnv(
    syntheticClientSecretAlias(token),
    LEGACY_COMPAT_ENV.iamSyntheticClientSecretDefault,
  );
}

export function isCompatibilityIamCredentialEnvKey(key: string): boolean {
  return (
    key === LEGACY_COMPAT_ENV.iamSyntheticClientSecretDefault.current
    || key.startsWith('IDP_IAM_SYNTHETIC_CLIENT_SECRET_')
    || key === LEGACY_COMPAT_ENV.iamBootstrapDefaultPassword.current
    || key.startsWith('IDP_IAM_BOOTSTRAP_PASSWORD_')
  );
}

export function listCompatibilityIamCredentialEnvEntries(): Array<[string, string]> {
  return Object.entries(process.env)
    .filter(([key]) => isCompatibilityIamCredentialEnvKey(key))
    .sort(([left], [right]) => left.localeCompare(right));
}
