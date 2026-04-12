export const CLIENT_CONTEXT_EVENT = 'idp:client-context-changed'

const ACTIVE_TENANT_STORAGE_KEY = 'idp.activeTenantId'
const ACTIVE_USER_STORAGE_KEY = 'idp.activeUserId'
const ACTIVE_SESSION_STORAGE_KEY = 'idp.activeSessionId'
const ACTIVE_IAM_REALM_STORAGE_KEY = 'idp.iam.activeRealmId'
const ACTIVE_IAM_SESSION_STORAGE_KEY = 'idp.iam.activeSessionId'
const ACTIVE_IAM_AUTH_REALM_STORAGE_KEY = 'idp.iam.activeAuthRealmId'
const ACTIVE_IAM_AUTH_CLIENT_STORAGE_KEY = 'idp.iam.activeAuthClientId'
const ACTIVE_IAM_ACCESS_TOKEN_STORAGE_KEY = 'idp.iam.activeAccessToken'
const ACTIVE_IAM_REFRESH_TOKEN_STORAGE_KEY = 'idp.iam.activeRefreshToken'
const IAM_ACCESS_TOKEN_REFRESH_SKEW_MS = 60 * 1000

type ClientContextReason = 'tenant' | 'user' | 'session'

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readStoredValue(key: string): string | null {
  if (!canUseBrowserStorage()) {
    return null
  }

  return window.localStorage.getItem(key)
}

function writeStoredValue(key: string, value: string | null) {
  if (!canUseBrowserStorage()) {
    return false
  }

  const currentValue = window.localStorage.getItem(key)
  if (currentValue === value) {
    return false
  }

  if (value === null) {
    window.localStorage.removeItem(key)
  } else {
    window.localStorage.setItem(key, value)
  }

  return true
}

function emitClientContextChanged(reason: ClientContextReason) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent(CLIENT_CONTEXT_EVENT, {
      detail: {
        reason,
        tenantId: readStoredValue(ACTIVE_TENANT_STORAGE_KEY),
        userId: readStoredValue(ACTIVE_USER_STORAGE_KEY),
        sessionId: readStoredValue(ACTIVE_SESSION_STORAGE_KEY),
      },
    }),
  )
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  if (typeof window === 'undefined' || typeof window.atob !== 'function') {
    return null
  }

  const [, payloadSegment] = token.split('.')
  if (!payloadSegment) {
    return null
  }

  const normalizedPayload = payloadSegment.replace(/-/g, '+').replace(/_/g, '/')
  const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=')

  try {
    return JSON.parse(window.atob(paddedPayload)) as Record<string, unknown>
  } catch {
    return null
  }
}

export function shouldRefreshIamBrowserAccessToken(accessToken: string) {
  const payload = decodeJwtPayload(accessToken)
  if (!payload || typeof payload.exp !== 'number') {
    return true
  }

  return payload.exp * 1000 <= Date.now() + IAM_ACCESS_TOKEN_REFRESH_SKEW_MS
}

export function getActiveTenantId() {
  return readStoredValue(ACTIVE_TENANT_STORAGE_KEY)
}

export function setActiveTenantId(tenantId: string | null) {
  if (writeStoredValue(ACTIVE_TENANT_STORAGE_KEY, tenantId)) {
    emitClientContextChanged('tenant')
  }
}

export function getCurrentUserId() {
  return readStoredValue(ACTIVE_USER_STORAGE_KEY)
}

export function setCurrentUserId(userId: string | null) {
  if (writeStoredValue(ACTIVE_USER_STORAGE_KEY, userId)) {
    emitClientContextChanged('user')
  }
}

export function getCurrentSessionId() {
  return readStoredValue(ACTIVE_SESSION_STORAGE_KEY)
}

export function resetCurrentSessionId() {
  if (writeStoredValue(ACTIVE_SESSION_STORAGE_KEY, null)) {
    emitClientContextChanged('session')
  }
}

export function setCurrentSessionId(sessionId: string | null) {
  if (writeStoredValue(ACTIVE_SESSION_STORAGE_KEY, sessionId)) {
    emitClientContextChanged('session')
  }
}

export function setClientContextState(
  {
    tenantId,
    userId,
    sessionId,
  }: {
    tenantId?: string | null
    userId?: string | null
    sessionId?: string | null
  },
  reason: ClientContextReason,
) {
  let didChange = false

  if (tenantId !== undefined) {
    didChange = writeStoredValue(ACTIVE_TENANT_STORAGE_KEY, tenantId ?? null) || didChange
  }

  if (userId !== undefined) {
    didChange = writeStoredValue(ACTIVE_USER_STORAGE_KEY, userId ?? null) || didChange
  }

  if (sessionId !== undefined) {
    didChange = writeStoredValue(ACTIVE_SESSION_STORAGE_KEY, sessionId ?? null) || didChange
  }

  if (didChange) {
    emitClientContextChanged(reason)
  }
}

export function clearAuthenticatedSession() {
  setCurrentUserId(null)
  setActiveTenantId(null)
  setCurrentSessionId(null)
  clearIamSession()
  clearIamBrowserAuth()
}

export function getCurrentIamRealmId() {
  return readStoredValue(ACTIVE_IAM_REALM_STORAGE_KEY)
}

export function setCurrentIamRealmId(realmId: string | null) {
  if (!canUseBrowserStorage()) {
    return
  }

  if (realmId) {
    window.localStorage.setItem(ACTIVE_IAM_REALM_STORAGE_KEY, realmId)
  } else {
    window.localStorage.removeItem(ACTIVE_IAM_REALM_STORAGE_KEY)
  }
}

export function getCurrentIamSessionId() {
  return readStoredValue(ACTIVE_IAM_SESSION_STORAGE_KEY)
}

export function setCurrentIamSessionId(sessionId: string | null) {
  if (!canUseBrowserStorage()) {
    return
  }

  if (sessionId) {
    window.localStorage.setItem(ACTIVE_IAM_SESSION_STORAGE_KEY, sessionId)
  } else {
    window.localStorage.removeItem(ACTIVE_IAM_SESSION_STORAGE_KEY)
  }
}

export function getCurrentIamAccessToken() {
  return readStoredValue(ACTIVE_IAM_ACCESS_TOKEN_STORAGE_KEY)
}

export function getCurrentIamRefreshToken() {
  return readStoredValue(ACTIVE_IAM_REFRESH_TOKEN_STORAGE_KEY)
}

export function getCurrentIamAuthRealmId() {
  return readStoredValue(ACTIVE_IAM_AUTH_REALM_STORAGE_KEY)
}

export function getCurrentIamAuthClientId() {
  return readStoredValue(ACTIVE_IAM_AUTH_CLIENT_STORAGE_KEY)
}

export function setCurrentIamAccessToken(accessToken: string | null) {
  if (writeStoredValue(ACTIVE_IAM_ACCESS_TOKEN_STORAGE_KEY, accessToken)) {
    emitClientContextChanged('session')
  }
}

export function setCurrentIamRefreshToken(refreshToken: string | null) {
  if (writeStoredValue(ACTIVE_IAM_REFRESH_TOKEN_STORAGE_KEY, refreshToken)) {
    emitClientContextChanged('session')
  }
}

export function setCurrentIamAuthRealmId(realmId: string | null) {
  if (!canUseBrowserStorage()) {
    return
  }

  if (realmId) {
    window.localStorage.setItem(ACTIVE_IAM_AUTH_REALM_STORAGE_KEY, realmId)
  } else {
    window.localStorage.removeItem(ACTIVE_IAM_AUTH_REALM_STORAGE_KEY)
  }
}

export function setCurrentIamAuthClientId(clientId: string | null) {
  if (!canUseBrowserStorage()) {
    return
  }

  if (clientId) {
    window.localStorage.setItem(ACTIVE_IAM_AUTH_CLIENT_STORAGE_KEY, clientId)
  } else {
    window.localStorage.removeItem(ACTIVE_IAM_AUTH_CLIENT_STORAGE_KEY)
  }
}

export function clearIamBearerToken() {
  setCurrentIamAccessToken(null)
}

export function clearIamBrowserAuth() {
  setCurrentIamAuthRealmId(null)
  setCurrentIamAuthClientId(null)
  setCurrentIamAccessToken(null)
  setCurrentIamRefreshToken(null)
}

export function clearIamSession() {
  setCurrentIamRealmId(null)
  setCurrentIamSessionId(null)
}
