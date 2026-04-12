import axios, { AxiosHeaders } from 'axios'
import {
  clearAuthenticatedSession,
  clearIamBrowserAuth,
  getActiveTenantId,
  getCurrentIamAccessToken,
  getCurrentIamAuthClientId,
  getCurrentIamAuthRealmId,
  getCurrentIamRealmId,
  getCurrentIamRefreshToken,
  getCurrentIamSessionId,
  getCurrentSessionId,
  getCurrentUserId,
  setCurrentIamAccessToken,
  setCurrentIamRefreshToken,
  shouldRefreshIamBrowserAccessToken,
} from './iamClientState'

const API_BASE = '/api/v1'
const DEFAULT_IDENTITY_PROVIDER_ID = 'idp-local-gateway'

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const publicApi = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

let currentIamRefreshPromise: Promise<string | null> | null = null

async function refreshCurrentIamBrowserAccessToken() {
  if (currentIamRefreshPromise) {
    return currentIamRefreshPromise
  }

  const realmId = getCurrentIamAuthRealmId()
  const clientId = getCurrentIamAuthClientId()
  const refreshToken = getCurrentIamRefreshToken()

  if (!realmId || !clientId || !refreshToken) {
    clearIamBrowserAuth()
    return null
  }

  currentIamRefreshPromise = (async () => {
    try {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: refreshToken,
      })
      const response = await publicApi.post<{ access_token: string; refresh_token?: string | null }>(
        `/iam/realms/${realmId}/protocol/openid-connect/token`,
        body,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      )
      setCurrentIamAccessToken(response.data.access_token)
      setCurrentIamRefreshToken(response.data.refresh_token ?? refreshToken)
      return response.data.access_token
    } catch (_error) {
      clearAuthenticatedSession()
      return null
    } finally {
      currentIamRefreshPromise = null
    }
  })()

  return currentIamRefreshPromise
}

async function resolveCurrentIamBrowserAccessToken() {
  const accessToken = getCurrentIamAccessToken()
  if (!accessToken) {
    return null
  }

  if (!shouldRefreshIamBrowserAccessToken(accessToken)) {
    return accessToken
  }

  return refreshCurrentIamBrowserAccessToken()
}

api.interceptors.request.use(async (config) => {
  config.headers = config.headers ?? new AxiosHeaders()
  config.headers['X-Correlation-ID'] = crypto.randomUUID()
  const accessToken = await resolveCurrentIamBrowserAccessToken()
  const sessionId = getCurrentSessionId()
  const iamRealmId = getCurrentIamRealmId()
  const iamSessionId = getCurrentIamSessionId()
  const tenantId = getActiveTenantId()
  const userId = getCurrentUserId()

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId
    }
    return config
  }

  if (iamSessionId) {
    config.headers['X-IAM-Session-ID'] = iamSessionId
    if (iamRealmId) {
      config.headers['X-IAM-Realm-ID'] = iamRealmId
    }
  }

  if (sessionId) {
    config.headers['X-Session-ID'] = sessionId
  } else {
    if (userId) {
      config.headers['X-User-ID'] = userId
    }

    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId
    }

    config.headers['X-Identity-Provider'] = DEFAULT_IDENTITY_PROVIDER_ID
  }

  return config
})

publicApi.interceptors.request.use((config) => {
  config.headers['X-Correlation-ID'] = crypto.randomUUID()
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config as (typeof error.config & {
      _iamRefreshAttempted?: boolean
    }) | undefined

    if (
      error?.response?.status === 401 &&
      originalRequest &&
      !originalRequest._iamRefreshAttempted &&
      getCurrentIamAccessToken()
    ) {
      originalRequest._iamRefreshAttempted = true
      const refreshedAccessToken = await refreshCurrentIamBrowserAccessToken()
      if (refreshedAccessToken) {
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${refreshedAccessToken}`
        return api.request(originalRequest)
      }
    }

    return Promise.reject(error)
  },
)
