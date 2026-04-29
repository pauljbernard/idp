import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  clearAuthenticatedSession,
  idpApi,
  getCurrentIamAccessToken,
  getCurrentIamAuthClientId,
  getCurrentIamAuthRealmId,
  getCurrentIamRefreshToken,
  getCurrentSessionId,
  setClientContextState,
  setCurrentIamAccessToken,
  setCurrentIamAuthClientId,
  setCurrentIamAuthRealmId,
  setCurrentIamRefreshToken,
  type AuthBootstrapResponse,
  type AuthIamCodeExchangeRequest,
  type AuthLoginRequest,
} from '../services/standaloneApi'

interface AuthContextType {
  authState: AuthBootstrapResponse | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (request: AuthLoginRequest) => Promise<AuthBootstrapResponse>
  completeIamAuthorizationCodeLogin: (request: AuthIamCodeExchangeRequest) => Promise<AuthBootstrapResponse>
  logout: () => Promise<void>
  refreshSession: () => Promise<AuthBootstrapResponse | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
let authSessionBootstrapPromise: Promise<AuthBootstrapResponse | null> | null = null

function applyAuthState(authState: AuthBootstrapResponse | null) {
  if (!authState) {
    clearAuthenticatedSession()
    return
  }

  setClientContextState({
    userId: authState.auth.user_id,
    sessionId: authState.identity.session.session_transport === 'bearer_session'
      ? null
      : authState.auth.session_id,
    tenantId: authState.selected_tenant?.id ?? authState.auth.tenant_id ?? null,
  }, 'tenant')
}

async function fetchAuthSessionSingleFlight() {
  if (authSessionBootstrapPromise) {
    return authSessionBootstrapPromise
  }

  authSessionBootstrapPromise = idpApi.getAuthSession()
    .catch((error) => {
      throw error
    })
    .finally(() => {
      authSessionBootstrapPromise = null
    })

  return authSessionBootstrapPromise
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthBootstrapResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshSession = async (): Promise<AuthBootstrapResponse | null> => {
    try {
      const response = await fetchAuthSessionSingleFlight()
      setAuthState(response)
      applyAuthState(response)
      return response
    } catch (error) {
      setAuthState(null)
      clearAuthenticatedSession()
      return null
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let ignore = false

    const bootstrap = async () => {
      if (!getCurrentSessionId() && !getCurrentIamAccessToken()) {
        setAuthState(null)
        setIsLoading(false)
        return
      }

      const response = await refreshSession()
      if (ignore && response) {
        setAuthState(null)
      }
    }

    bootstrap()

    return () => {
      ignore = true
    }
  }, [])

  const login = async (request: AuthLoginRequest) => {
    const response = await idpApi.login(request)
    setAuthState(response)
    applyAuthState(response)
    return response
  }

  const completeIamAuthorizationCodeLogin = async (request: AuthIamCodeExchangeRequest) => {
    if (!request.realm_id || !request.client_id) {
      throw new Error('Standalone IAM callback is missing required realm or client context.')
    }

    try {
      const tokenResponse = await idpApi.issueIamToken(request.realm_id, {
        grant_type: 'authorization_code',
        client_id: request.client_id,
        code: request.code,
        redirect_uri: request.redirect_uri,
        code_verifier: request.code_verifier,
      })
      setCurrentIamAuthRealmId(request.realm_id)
      setCurrentIamAuthClientId(request.client_id)
      setCurrentIamAccessToken(tokenResponse.access_token)
      setCurrentIamRefreshToken(tokenResponse.refresh_token ?? null)
      const nativeResponse = await idpApi.getAuthSession()
      setAuthState(nativeResponse)
      applyAuthState(nativeResponse)
      return nativeResponse
    } catch (_nativeError) {
      clearAuthenticatedSession()
      throw new Error('Failed to complete standalone IAM login.')
    }
  }

  const logout = async () => {
    const realmId = getCurrentIamAuthRealmId()
    const clientId = getCurrentIamAuthClientId()
    const accessToken = getCurrentIamAccessToken()
    const refreshToken = getCurrentIamRefreshToken()

    try {
      await idpApi.logout()
      if (realmId && clientId) {
        await Promise.allSettled(
          [refreshToken, accessToken]
            .filter((token): token is string => Boolean(token))
            .map((token) => idpApi.revokeIamToken(realmId, {
              client_id: clientId,
              token,
            })),
        )
      }
    } catch (error) {
      // Clear the local session even if the server-side logout path is unavailable.
    } finally {
      setAuthState(null)
      clearAuthenticatedSession()
    }
  }

  return (
    <AuthContext.Provider
      value={{
        authState,
        isAuthenticated: Boolean(authState?.authenticated),
        isLoading,
        login,
        completeIamAuthorizationCodeLogin,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
