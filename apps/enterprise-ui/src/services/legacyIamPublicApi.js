import { api, publicApi } from './iamHttpClient';
export const legacyIamPublicApi = {
    async getIamOidcDiscovery(realmId) {
        const response = await publicApi.get(`/iam/realms/${realmId}/.well-known/openid-configuration`);
        return response.data;
    },
    async getIamAuthorizationRequest(realmId, requestId) {
        const response = await publicApi.get(`/iam/realms/${realmId}/protocol/openid-connect/auth/requests/${requestId}`);
        return response.data;
    },
    async continueIamAuthorizationRequest(realmId, requestId, sessionId) {
        const response = await publicApi.post(`/iam/realms/${realmId}/protocol/openid-connect/auth/continue`, {
            authorization_request_id: requestId,
        }, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async getIamJwks(realmId) {
        const response = await publicApi.get(`/iam/realms/${realmId}/protocol/openid-connect/certs`);
        return response.data;
    },
    async dynamicallyRegisterIamClient(realmId, request, initialAccessToken) {
        const response = await publicApi.post(`/iam/realms/${realmId}/clients-registrations/openid-connect`, request, {
            headers: {
                Authorization: `Bearer ${initialAccessToken}`,
            },
        });
        return response.data;
    },
    async getDynamicallyRegisteredIamClient(realmId, clientRecordId, registrationAccessToken) {
        const response = await publicApi.get(`/iam/realms/${realmId}/clients-registrations/openid-connect/${clientRecordId}`, {
            headers: {
                Authorization: `Bearer ${registrationAccessToken}`,
            },
        });
        return response.data;
    },
    async updateDynamicallyRegisteredIamClient(realmId, clientRecordId, request, registrationAccessToken) {
        const response = await publicApi.put(`/iam/realms/${realmId}/clients-registrations/openid-connect/${clientRecordId}`, request, {
            headers: {
                Authorization: `Bearer ${registrationAccessToken}`,
            },
        });
        return response.data;
    },
    async archiveDynamicallyRegisteredIamClient(realmId, clientRecordId, registrationAccessToken) {
        const response = await publicApi.delete(`/iam/realms/${realmId}/clients-registrations/openid-connect/${clientRecordId}`, {
            headers: {
                Authorization: `Bearer ${registrationAccessToken}`,
            },
        });
        return response.data;
    },
    async createIamPushedAuthorizationRequest(realmId, request, options) {
        const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        if (options?.basicClientAuth) {
            headers.Authorization = `Basic ${btoa(`${options.basicClientAuth.clientId}:${options.basicClientAuth.clientSecret}`)}`;
        }
        const body = new URLSearchParams(request);
        const response = await publicApi.post(`/iam/realms/${realmId}/protocol/openid-connect/ext/par/request`, body, { headers });
        return response.data;
    },
    async createIamDeviceAuthorization(realmId, request, options) {
        const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        if (options?.basicClientAuth) {
            headers.Authorization = `Basic ${btoa(`${options.basicClientAuth.clientId}:${options.basicClientAuth.clientSecret}`)}`;
        }
        const body = new URLSearchParams(request);
        const response = await publicApi.post(`/iam/realms/${realmId}/protocol/openid-connect/auth/device`, body, { headers });
        return response.data;
    },
    async verifyIamDeviceAuthorization(realmId, userCode, sessionId, approve = true) {
        const response = await publicApi.post(`/iam/realms/${realmId}/device/verify`, {
            user_code: userCode,
            approve,
        }, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async issueIamToken(realmId, request, options) {
        const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        if (options?.basicClientAuth) {
            headers.Authorization = `Basic ${btoa(`${options.basicClientAuth.clientId}:${options.basicClientAuth.clientSecret}`)}`;
        }
        const body = new URLSearchParams(request);
        const response = await publicApi.post(`/iam/realms/${realmId}/protocol/openid-connect/token`, body, { headers });
        return response.data;
    },
    async introspectIamToken(realmId, request, options) {
        const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        if (options?.basicClientAuth) {
            headers.Authorization = `Basic ${btoa(`${options.basicClientAuth.clientId}:${options.basicClientAuth.clientSecret}`)}`;
        }
        const body = new URLSearchParams(request);
        const response = await publicApi.post(`/iam/realms/${realmId}/protocol/openid-connect/token/introspect`, body, { headers });
        return response.data;
    },
    async revokeIamToken(realmId, request, options) {
        const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        if (options?.basicClientAuth) {
            headers.Authorization = `Basic ${btoa(`${options.basicClientAuth.clientId}:${options.basicClientAuth.clientSecret}`)}`;
        }
        const body = new URLSearchParams(request);
        const response = await publicApi.post(`/iam/realms/${realmId}/protocol/openid-connect/revoke`, body, { headers });
        return response.data;
    },
    async getIamUserInfo(realmId, accessToken) {
        const response = await publicApi.get(`/iam/realms/${realmId}/protocol/openid-connect/userinfo`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return response.data;
    },
    async getIamSamlMetadata(realmId, clientId) {
        const response = await publicApi.get(`/iam/realms/${realmId}/protocol/saml/metadata`, {
            params: { client_id: clientId },
            responseType: 'text',
        });
        return response.data;
    },
    async getIamSamlAuthRequest(realmId, requestId) {
        const response = await publicApi.get(`/iam/realms/${realmId}/protocol/saml/requests/${requestId}`);
        return response.data;
    },
    async continueIamSamlAuthRequest(realmId, requestId, sessionId, clientId) {
        const response = await publicApi.post(`/iam/realms/${realmId}/protocol/saml/continue`, {
            saml_request_id: requestId,
            client_id: clientId,
        }, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async loginIamSaml(realmId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/protocol/saml/login`, request);
        return response.data;
    },
    async logoutIamSaml(realmId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/protocol/saml/logout`, request);
        return response.data;
    },
    async listIamSamlSessions(realmId) {
        const response = await api.get('/iam/saml-sessions', {
            params: {
                realm_id: realmId || undefined,
            },
        });
        return response.data;
    },
    async getIamPublicCatalog() {
        const response = await publicApi.get('/iam/public/catalog');
        return response.data;
    },
    async getIamRealmExperience(realmId) {
        const response = await publicApi.get(`/iam/realms/${realmId}/experience`);
        return response.data;
    },
    async listIamRealmBrokers(realmId) {
        const response = await publicApi.get(`/iam/realms/${realmId}/brokers`);
        return response.data;
    },
    async loginIamBroker(realmId, providerAlias, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/brokers/${providerAlias}/login`, request);
        return response.data;
    },
    async loginIamBrowser(realmId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/login`, request);
        return response.data;
    },
    async beginIamPasskeyLogin(realmId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/login/passkey/begin`, request);
        return response.data;
    },
    async completeIamPasskeyLogin(realmId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/login/passkey/complete`, request);
        return response.data;
    },
    async completeIamRequiredActions(realmId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/login/required-actions`, request);
        return response.data;
    },
    async grantIamConsent(realmId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/login/consent`, request);
        return response.data;
    },
    async verifyIamLoginMfa(realmId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/login/mfa`, request);
        return response.data;
    },
    async requestIamPasswordReset(realmId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/password-reset/request`, request);
        return response.data;
    },
    async confirmIamPasswordReset(realmId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/password-reset/confirm`, request);
        return response.data;
    },
    async requestIamEmailVerification(realmId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/email-verification/request`, request);
        return response.data;
    },
    async confirmIamEmailVerification(realmId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/email-verification/confirm`, request);
        return response.data;
    },
    async logoutIamAccount(realmId, sessionId) {
        const response = await publicApi.post(`/iam/realms/${realmId}/logout`, {}, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async getIamAccountSession(realmId, sessionId) {
        const response = await publicApi.get(`/iam/realms/${realmId}/account/session`, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async getIamAccountProfile(realmId, sessionId) {
        const response = await publicApi.get(`/iam/realms/${realmId}/account/profile`, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async updateIamAccountProfile(realmId, sessionId, request) {
        const response = await publicApi.put(`/iam/realms/${realmId}/account/profile`, request, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async listIamAccountOrganizations(realmId, sessionId) {
        const response = await publicApi.get(`/iam/realms/${realmId}/account/organizations`, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async acceptIamAccountOrganizationInvitation(realmId, sessionId, invitationId) {
        const response = await publicApi.post(`/iam/realms/${realmId}/account/organization-invitations/${invitationId}/accept`, {}, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async getIamAccountSecurity(realmId, sessionId) {
        const response = await publicApi.get(`/iam/realms/${realmId}/account/security`, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async beginIamWebAuthnRegistration(realmId, sessionId) {
        const response = await publicApi.post(`/iam/realms/${realmId}/account/webauthn/register/begin`, {}, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async completeIamWebAuthnRegistration(realmId, sessionId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/account/webauthn/register/complete`, request, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async listIamAccountWebAuthnCredentials(realmId, sessionId) {
        const response = await publicApi.get(`/iam/realms/${realmId}/account/webauthn/credentials`, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async revokeIamAccountWebAuthnCredential(realmId, sessionId, credentialId) {
        const response = await publicApi.post(`/iam/realms/${realmId}/account/webauthn/credentials/${credentialId}/revoke`, {}, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async changeIamAccountPassword(realmId, sessionId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/account/password`, request, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async beginIamMfaEnrollment(realmId, sessionId) {
        const response = await publicApi.post(`/iam/realms/${realmId}/account/mfa/enroll`, {}, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async verifyIamMfaEnrollment(realmId, sessionId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/account/mfa/verify`, request, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async disableIamMfa(realmId, sessionId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/account/mfa/disable`, request, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async listIamAccountSessions(realmId, sessionId) {
        const response = await publicApi.get(`/iam/realms/${realmId}/account/sessions`, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async revokeIamAccountSession(realmId, sessionId, targetSessionId) {
        const response = await publicApi.post(`/iam/realms/${realmId}/account/sessions/${targetSessionId}/revoke`, {}, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async revokeOtherIamAccountSessions(realmId, sessionId) {
        const response = await publicApi.post(`/iam/realms/${realmId}/account/sessions/revoke-others`, {}, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async listIamAccountConsents(realmId, sessionId) {
        const response = await publicApi.get(`/iam/realms/${realmId}/account/consents`, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async listIamAccountDelegatedRelationships(realmId, sessionId, filters) {
        const response = await publicApi.get(`/iam/realms/${realmId}/account/delegated-relationships`, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
            params: {
                status: filters?.status,
            },
        });
        return response.data;
    },
    async listIamAccountDelegatedConsents(realmId, sessionId, filters) {
        const response = await publicApi.get(`/iam/realms/${realmId}/account/delegated-consents`, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
            params: {
                relationship_id: filters?.relationship_id,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async grantIamAccountDelegatedConsent(realmId, sessionId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/account/delegated-consents`, request, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async revokeIamAccountDelegatedConsent(realmId, sessionId, consentId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/account/delegated-consents/${consentId}/revoke`, request ?? {}, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async listIamAccountDelegatedConsentRequests(realmId, sessionId, filters) {
        const response = await publicApi.get(`/iam/realms/${realmId}/account/delegated-consent-requests`, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
            params: {
                relationship_id: filters?.relationship_id,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async requestIamAccountDelegatedConsent(realmId, sessionId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/account/delegated-consent-requests`, request, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async approveIamAccountDelegatedConsentRequest(realmId, sessionId, requestId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/account/delegated-consent-requests/${requestId}/approve`, request ?? {}, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async denyIamAccountDelegatedConsentRequest(realmId, sessionId, requestId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/account/delegated-consent-requests/${requestId}/deny`, request ?? {}, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async cancelIamAccountDelegatedConsentRequest(realmId, sessionId, requestId, request) {
        const response = await publicApi.post(`/iam/realms/${realmId}/account/delegated-consent-requests/${requestId}/cancel`, request ?? {}, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
    async listIamWebAuthnCredentials(filters) {
        const response = await api.get('/iam/webauthn/credentials', {
            params: {
                realm_id: filters?.realm_id || undefined,
                user_id: filters?.user_id || undefined,
            },
        });
        return response.data;
    },
    async listIamAccountLinkedIdentities(realmId, sessionId) {
        const response = await publicApi.get(`/iam/realms/${realmId}/account/linked-identities`, {
            headers: {
                'X-IAM-Session-ID': sessionId,
            },
        });
        return response.data;
    },
};
