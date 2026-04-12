const IAM_STORAGE_KEY = 'idp.pendingIamLogin'

export const IAM_CALLBACK_PATH = '/login/callback'
export const IAM_SCOPE = 'openid profile email roles groups'

export interface IamClientConfig {
  realmId: string
  clientId: string
}

export interface PendingIamLogin {
  realmId: string
  clientId: string
  state: string
  nonce: string
  codeVerifier: string
  codeChallenge: string
  codeChallengeMethod: 'S256' | 'plain'
  redirectUri: string
  nextRoute: string | null
  loginHint: string | null
  flowContext: string | null
  createdAt: string
}

function normalizeOptionalQueryValue(value?: string | null) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function canUseBrowserSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function randomBase64Url(byteLength: number) {
  if (!window.crypto?.getRandomValues) {
    throw new Error('Browser crypto API is unavailable. Standalone IAM login requires secure random support.')
  }
  const bytes = new Uint8Array(byteLength)
  window.crypto.getRandomValues(bytes)
  return encodeBase64Url(bytes)
}

async function sha256Base64Url(value: string) {
  const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return encodeBase64Url(new Uint8Array(digest))
}

async function resolvePkceChallenge(codeVerifier: string) {
  if (window.crypto?.subtle) {
    return {
      codeChallenge: await sha256Base64Url(codeVerifier),
      codeChallengeMethod: 'S256' as const,
    }
  }

  return {
    codeChallenge: codeVerifier,
    codeChallengeMethod: 'plain' as const,
  }
}

export function getIamCallbackUrl() {
  return `${window.location.origin}${IAM_CALLBACK_PATH}`
}

export async function createPendingIamLogin(
  configuration: IamClientConfig,
  nextRoute?: string | null,
  options?: {
    loginHint?: string | null
    flowContext?: string | null
  },
): Promise<PendingIamLogin> {
  const codeVerifier = randomBase64Url(64)
  const pkce = await resolvePkceChallenge(codeVerifier)

  return {
    realmId: configuration.realmId,
    clientId: configuration.clientId,
    state: randomBase64Url(24),
    nonce: randomBase64Url(24),
    codeVerifier,
    codeChallenge: pkce.codeChallenge,
    codeChallengeMethod: pkce.codeChallengeMethod,
    redirectUri: getIamCallbackUrl(),
    nextRoute: nextRoute ?? null,
    loginHint: normalizeOptionalQueryValue(options?.loginHint),
    flowContext: normalizeOptionalQueryValue(options?.flowContext),
    createdAt: new Date().toISOString(),
  }
}

export function storePendingIamLogin(pending: PendingIamLogin) {
  if (!canUseBrowserSessionStorage()) {
    return
  }

  window.sessionStorage.setItem(IAM_STORAGE_KEY, JSON.stringify(pending))
}

export function readPendingIamLogin(): PendingIamLogin | null {
  if (!canUseBrowserSessionStorage()) {
    return null
  }

  const raw = window.sessionStorage.getItem(IAM_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as PendingIamLogin
  } catch {
    return null
  }
}

export function clearPendingIamLogin() {
  if (!canUseBrowserSessionStorage()) {
    return
  }

  window.sessionStorage.removeItem(IAM_STORAGE_KEY)
}

export function buildIamAuthorizationUrl(pending: PendingIamLogin) {
  const url = new URL(`/api/v1/iam/realms/${pending.realmId}/protocol/openid-connect/auth`, window.location.origin)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', pending.clientId)
  url.searchParams.set('redirect_uri', pending.redirectUri)
  url.searchParams.set('scope', IAM_SCOPE)
  url.searchParams.set('state', pending.state)
  url.searchParams.set('nonce', pending.nonce)
  url.searchParams.set('code_challenge', pending.codeChallenge)
  url.searchParams.set('code_challenge_method', pending.codeChallengeMethod)
  if (pending.loginHint) {
    url.searchParams.set('login_hint', pending.loginHint)
  }
  if (pending.flowContext) {
    url.searchParams.set('flow_context', pending.flowContext)
  }
  return url.toString()
}

export function buildLoginEntryUrl(options?: {
  nextRoute?: string | null
  loginHint?: string | null
  flowContext?: string | null
}) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  const url = new URL('/login', origin)
  const nextRoute = normalizeOptionalQueryValue(options?.nextRoute)
  const loginHint = normalizeOptionalQueryValue(options?.loginHint)
  const flowContext = normalizeOptionalQueryValue(options?.flowContext)

  if (nextRoute) {
    url.searchParams.set('next', nextRoute)
  }
  if (loginHint) {
    url.searchParams.set('login_hint', loginHint)
  }
  if (flowContext) {
    url.searchParams.set('flow_context', flowContext)
  }

  return typeof window !== 'undefined' ? url.toString() : `${url.pathname}${url.search}`
}
