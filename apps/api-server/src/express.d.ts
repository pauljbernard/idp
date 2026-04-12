declare global {
  type IamExtensionInterfaceKind = any
  type CreateIamExtensionPackageRequest = any
  type UpdateIamExtensionPackageRequest = any
  type CreateIamExtensionProviderRequest = any
  type UpdateIamExtensionProviderRequest = any
  type CreateIamExtensionBindingRequest = any
  type UpdateIamExtensionBindingRequest = any
  type IamDeploymentTopologyMode = any
  type BeginIamWebAuthnAuthenticationInput = any
  type CompleteIamWebAuthnAuthenticationInput = any
  type CompleteIamWebAuthnRegistrationInput = any
  type CreateIamAccountDelegatedConsentInput = any
  type RevokeIamAccountDelegatedConsentInput = any
  type CreateIamAccountDelegatedConsentRequestInput = any
  type ApproveIamAccountDelegatedConsentRequestInput = any
  type DenyIamAccountDelegatedConsentRequestInput = any
  type CancelIamAccountDelegatedConsentRequestInput = any
  type IamIdentityProviderProtocol = any
  type IamFederationTrustStoreStatus = any
  type IamFederationMappingProfileStatus = any
  type PreviewIamFederationClaimReleaseRequest = any
  type UpdateIamRealmThemeRequest = any
  type UpdateIamRealmLocalizationRequest = any
  type UpdateIamNotificationTemplateRequest = any
  type CreateIamTestNotificationRequest = any
  type CreateIamIdentityProviderRequest = any
  type UpdateIamIdentityProviderRequest = any
  type IamUserFederationProviderKind = any
  type CreateIamUserFederationProviderRequest = any
  type UpdateIamUserFederationProviderRequest = any
  type IamLinkedIdentitySourceType = any
  type IamRealmScopeKind = any
  type IamBindingTargetKind = any
  type CreateIamDelegatedConsentRequest = any
  type UpdateIamDelegatedConsentRequest = any
  type CreateIamRealmRequest = any
  type UpdateIamRealmRequest = any
  type UpdateIamRealmBindingRequest = any
  type IamAuthFlowKind = any
  type CreateIamAuthFlowRequest = any
  type UpdateIamAuthFlowRequest = any
  type CreateIamAuthExecutionRequest = any
  type UpdateIamAuthExecutionRequest = any
  type UpdateIamRealmAuthFlowBindingsRequest = any
  type UpdateIamClientAuthFlowBindingsRequest = any
  type CreateIamUserRequest = any
  type UpdateIamUserRequest = any
  type UpdateIamUserProfileSchemaRequest = any
  type UpdateIamUserProfileRequest = any
  type AdminResetIamUserPasswordInput = any
  type CreateIamOrganizationRequest = any
  type UpdateIamOrganizationRequest = any
  type CreateIamOrganizationMembershipRequest = any
  type UpdateIamOrganizationMembershipRequest = any
  type CreateIamOrganizationInvitationRequest = any
  type CreateIamGroupRequest = any
  type UpdateIamGroupRequest = any
  type IamRoleKind = any
  type CreateIamRoleRequest = any
  type UpdateIamRoleRequest = any
  type CreateIamDelegatedAdminRequest = any
  type UpdateIamDelegatedAdminRequest = any
  type IamAdminPermissionDomain = any
  type CreateIamAdminPermissionRequest = any
  type UpdateIamAdminPermissionRequest = any
  type CreateIamAdminPolicyRequest = any
  type UpdateIamAdminPolicyRequest = any
  type CreateIamResourceServerRequest = any
  type UpdateIamResourceServerRequest = any
  type CreateIamProtectedScopeRequest = any
  type UpdateIamProtectedScopeRequest = any
  type CreateIamProtectedResourceRequest = any
  type UpdateIamProtectedResourceRequest = any
  type CreateIamAuthorizationPolicyRequest = any
  type UpdateIamAuthorizationPolicyRequest = any
  type CreateIamAuthorizationPermissionRequest = any
  type UpdateIamAuthorizationPermissionRequest = any
  type EvaluateIamAuthorizationRequest = any
  type IamClientProtocol = any
  type CreateIamClientRequest = any
  type UpdateIamClientRequest = any
  type CreateIamClientScopeRequest = any
  type UpdateIamClientScopeRequest = any
  type CreateIamProtocolMapperRequest = any
  type UpdateIamProtocolMapperRequest = any
  type UpdateIamServiceAccountRequest = any
  type CreateIamClientPolicyRequest = any
  type UpdateIamClientPolicyRequest = any
  type CreateIamInitialAccessTokenRequest = any
  type IamDynamicClientRegistrationRequest = any

  namespace Express {
    interface Request {
      correlationId: string
      userId?: string
      iamAdminContext?: any
      identityContext?: {
        user_id: string
        realm_id: string
        client_id: string
        subject_kind: string
        scope_names: string[]
        realm_roles: string[]
        groups: string[]
        issued_at: string
      }
    }
  }
}

export {}
