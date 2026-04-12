// IAM-focused compatibility client carved out of the broader legacy compatibility surface.
// This is the lowest layer the standalone UI should depend on directly.
export { idpApi } from './iamApiRuntime';
export { CLIENT_CONTEXT_EVENT, clearAuthenticatedSession, clearIamBrowserAuth, clearIamSession, getCurrentIamAccessToken, getCurrentIamAuthClientId, getCurrentIamAuthRealmId, getCurrentIamRealmId, getCurrentIamRefreshToken, getCurrentIamSessionId, getCurrentSessionId, setClientContextState, setCurrentIamAccessToken, setCurrentIamAuthClientId, setCurrentIamAuthRealmId, setCurrentIamRealmId, setCurrentIamRefreshToken, setCurrentIamSessionId, } from './iamClientState';
