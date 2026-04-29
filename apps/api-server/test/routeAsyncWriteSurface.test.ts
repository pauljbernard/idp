import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const serverSource = readFileSync(
  path.resolve(__dirname, '../src/server.ts'),
  'utf8',
)

const forbiddenRouteMutationCalls = [
  'LocalIamAuthenticationRuntimeStore.login(',
  'LocalIamAuthenticationRuntimeStore.loginResolvedUser(',
  'LocalIamAuthenticationRuntimeStore.completePasskeyLogin(',
  'LocalIamAuthenticationRuntimeStore.completeRequiredActions(',
  'LocalIamAuthenticationRuntimeStore.grantConsent(',
  'LocalIamAuthenticationRuntimeStore.requestPasswordReset(',
  'LocalIamAuthenticationRuntimeStore.confirmPasswordReset(',
  'LocalIamAuthenticationRuntimeStore.requestEmailVerification(',
  'LocalIamAuthenticationRuntimeStore.confirmEmailVerification(',
  'LocalIamAuthenticationRuntimeStore.updateAccountProfile(',
  'LocalIamAuthenticationRuntimeStore.changePassword(',
  'LocalIamAuthenticationRuntimeStore.revokeAccountSession(',
  'LocalIamAuthenticationRuntimeStore.revokeOtherAccountSessions(',
  'LocalIamAuthenticationRuntimeStore.adminResetUserPassword(',
  'LocalIamAuthenticationRuntimeStore.adminRevokeUserSessions(',
  'LocalIamAuthenticationRuntimeStore.adminClearUserLockout(',
  'LocalIamAuthenticationRuntimeStore.impersonateUser(',
  'LocalIamAuthenticationRuntimeStore.grantAccountDelegatedConsent(',
  'LocalIamAuthenticationRuntimeStore.revokeAccountDelegatedConsent(',
  'LocalIamAuthenticationRuntimeStore.requestAccountDelegatedConsent(',
  'LocalIamAuthenticationRuntimeStore.approveAccountDelegatedConsentRequest(',
  'LocalIamAuthenticationRuntimeStore.denyAccountDelegatedConsentRequest(',
  'LocalIamAuthenticationRuntimeStore.cancelAccountDelegatedConsentRequest(',
  'LocalIamProtocolRuntimeStore.ensureUserCredentialSyncOnly(',
  'LocalIamProtocolRuntimeStore.setUserPasswordSyncOnly(',
  'LocalIamProtocolRuntimeStore.createClientSyncOnly(',
  'LocalIamProtocolRuntimeStore.updateClient(',
  'LocalIamProtocolRuntimeStore.rotateClientSecret(',
  'LocalIamProtocolRuntimeStore.createClientScope(',
  'LocalIamProtocolRuntimeStore.updateClientScope(',
  'LocalIamProtocolRuntimeStore.createProtocolMapper(',
  'LocalIamProtocolRuntimeStore.updateProtocolMapper(',
  'LocalIamProtocolRuntimeStore.updateServiceAccount(',
  'LocalIamProtocolRuntimeStore.issueTokenFromPayload(',
  'LocalIamProtocolRuntimeStore.revokeToken(',
  'LocalIamProtocolRuntimeStore.revokeTokensForSubjectSyncOnly(',
  'LocalIamProtocolRuntimeStore.issueSubjectTokensSyncOnly(',
  'LocalIamProtocolRuntimeStore.issueAuthorizationCodeTokens(',
  'LocalIamProtocolRuntimeStore.createSamlAuthRedirectSyncOnly(',
  'LocalIamProtocolRuntimeStore.continueSamlAuthRequest(',
  'LocalIamProtocolRuntimeStore.performSamlLogin(',
  'LocalIamProtocolRuntimeStore.logoutSamlSession(',
  'LocalIamProtocolRuntimeStore.rotateSigningKeySyncOnly(',
  'LocalIamAuthorizationRuntimeStore.createAuthorizationRedirect(',
  'LocalIamAuthorizationRuntimeStore.continueAuthorizationRequest(',
  'LocalIamAuthorizationRuntimeStore.exchangeAuthorizationCode(',
  'LocalIamAdvancedOAuthRuntimeStore.createClientPolicy(',
  'LocalIamAdvancedOAuthRuntimeStore.updateClientPolicy(',
  'LocalIamAdvancedOAuthRuntimeStore.issueInitialAccessToken(',
  'LocalIamAdvancedOAuthRuntimeStore.registerDynamicClient(',
  'LocalIamAdvancedOAuthRuntimeStore.updateDynamicClientRegistration(',
  'LocalIamAdvancedOAuthRuntimeStore.archiveDynamicClientRegistration(',
  'LocalIamFederationRuntimeStore.createIdentityProvider(',
  'LocalIamFederationRuntimeStore.updateIdentityProvider(',
  'LocalIamFederationRuntimeStore.brokerLogin(',
  'LocalIamFederationRuntimeStore.createUserFederationProvider(',
  'LocalIamFederationRuntimeStore.updateUserFederationProvider(',
  'LocalIamFederationRuntimeStore.runUserFederationSync(',
]

describe('server route write surface', () => {
  it('uses async mutation entrypoints for migrated IAM domains', () => {
    for (const forbiddenCall of forbiddenRouteMutationCalls) {
      expect(serverSource).not.toContain(forbiddenCall)
    }
  })
})
