import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from 'react';
import { clearAuthenticatedSession, idpApi, getCurrentIamAccessToken, getCurrentIamAuthClientId, getCurrentIamAuthRealmId, getCurrentIamRefreshToken, getCurrentSessionId, setClientContextState, setCurrentIamAccessToken, setCurrentIamAuthClientId, setCurrentIamAuthRealmId, setCurrentIamRefreshToken, } from '../services/standaloneApi';
const AuthContext = createContext(undefined);
let authSessionBootstrapPromise = null;
function applyAuthState(authState) {
    if (!authState) {
        clearAuthenticatedSession();
        return;
    }
    setClientContextState({
        userId: authState.auth.user_id,
        sessionId: authState.identity.session.session_transport === 'bearer_session'
            ? null
            : authState.auth.session_id,
        tenantId: authState.selected_tenant?.id ?? authState.auth.tenant_id ?? null,
    }, 'tenant');
}
async function fetchAuthSessionSingleFlight() {
    if (authSessionBootstrapPromise) {
        return authSessionBootstrapPromise;
    }
    authSessionBootstrapPromise = idpApi.getAuthSession()
        .catch((error) => {
        throw error;
    })
        .finally(() => {
        authSessionBootstrapPromise = null;
    });
    return authSessionBootstrapPromise;
}
export function AuthProvider({ children }) {
    const [authState, setAuthState] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const refreshSession = async () => {
        try {
            const response = await fetchAuthSessionSingleFlight();
            setAuthState(response);
            applyAuthState(response);
            return response;
        }
        catch (error) {
            setAuthState(null);
            clearAuthenticatedSession();
            return null;
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        let ignore = false;
        const bootstrap = async () => {
            if (!getCurrentSessionId() && !getCurrentIamAccessToken()) {
                setAuthState(null);
                setIsLoading(false);
                return;
            }
            const response = await refreshSession();
            if (ignore && response) {
                setAuthState(null);
            }
        };
        bootstrap();
        return () => {
            ignore = true;
        };
    }, []);
    const login = async (request) => {
        const response = await idpApi.login(request);
        setAuthState(response);
        applyAuthState(response);
        return response;
    };
    const completeIamAuthorizationCodeLogin = async (request) => {
        if (!request.realm_id || !request.client_id) {
            throw new Error('Standalone IAM callback is missing required realm or client context.');
        }
        try {
            const tokenResponse = await idpApi.issueIamToken(request.realm_id, {
                grant_type: 'authorization_code',
                client_id: request.client_id,
                code: request.code,
                redirect_uri: request.redirect_uri,
                code_verifier: request.code_verifier,
            });
            setCurrentIamAuthRealmId(request.realm_id);
            setCurrentIamAuthClientId(request.client_id);
            setCurrentIamAccessToken(tokenResponse.access_token);
            setCurrentIamRefreshToken(tokenResponse.refresh_token ?? null);
            const nativeResponse = await idpApi.getAuthSession();
            setAuthState(nativeResponse);
            applyAuthState(nativeResponse);
            return nativeResponse;
        }
        catch (_nativeError) {
            clearAuthenticatedSession();
            throw new Error('Failed to complete standalone IAM login.');
        }
    };
    const logout = async () => {
        const realmId = getCurrentIamAuthRealmId();
        const clientId = getCurrentIamAuthClientId();
        const accessToken = getCurrentIamAccessToken();
        const refreshToken = getCurrentIamRefreshToken();
        try {
            await idpApi.logout();
            if (realmId && clientId) {
                await Promise.allSettled([refreshToken, accessToken]
                    .filter((token) => Boolean(token))
                    .map((token) => idpApi.revokeIamToken(realmId, {
                    client_id: clientId,
                    token,
                })));
            }
        }
        catch (error) {
            // Clear the local session even if the server-side logout path is unavailable.
        }
        finally {
            setAuthState(null);
            clearAuthenticatedSession();
        }
    };
    return (_jsx(AuthContext.Provider, { value: {
            authState,
            isAuthenticated: Boolean(authState?.authenticated),
            isLoading,
            login,
            completeIamAuthorizationCodeLogin,
            logout,
            refreshSession,
        }, children: children }));
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
