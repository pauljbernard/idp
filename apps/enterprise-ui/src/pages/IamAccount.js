import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { KeyRound, LogOut, Shield, ShieldCheck, Users } from 'lucide-react';
import { PublicSiteShell } from '../components/public/PublicSiteShell';
import { clearIamSession, idpApi, getCurrentIamRealmId, getCurrentIamSessionId, } from '../services/standaloneApi';
import { createIamSoftwarePasskey, getIamLocalPasskeyDeviceLabels, removeIamLocalPasskey, } from '../utils/iamPasskeys';
export function IamAccount() {
    const navigate = useNavigate();
    const [realmId, setRealmId] = useState(() => getCurrentIamRealmId());
    const [sessionId, setSessionId] = useState(() => getCurrentIamSessionId());
    const [sessionContext, setSessionContext] = useState(null);
    const [profile, setProfile] = useState(null);
    const [security, setSecurity] = useState(null);
    const [experience, setExperience] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [consents, setConsents] = useState([]);
    const [delegatedRelationships, setDelegatedRelationships] = useState([]);
    const [delegatedConsents, setDelegatedConsents] = useState([]);
    const [delegatedConsentRequests, setDelegatedConsentRequests] = useState([]);
    const [linkedIdentities, setLinkedIdentities] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [passkeys, setPasskeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', email: '' });
    const [profileAttributes, setProfileAttributes] = useState({});
    const [delegatedGrantForm, setDelegatedGrantForm] = useState({
        relationship_id: '',
        scope_names: '',
        purpose_names: '',
        expires_at: '',
        notes: '',
    });
    const [delegatedRequestForm, setDelegatedRequestForm] = useState({
        relationship_id: '',
        requested_scope_names: '',
        requested_purpose_names: '',
        expires_at: '',
        request_notes: '',
    });
    const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' });
    const [emailVerification, setEmailVerification] = useState({ ticket_id: '', code: '' });
    const [mfaEnrollment, setMfaEnrollment] = useState(null);
    const [passkeyEnrollment, setPasskeyEnrollment] = useState(null);
    const [passkeyDeviceLabel, setPasskeyDeviceLabel] = useState('Primary Browser Passkey');
    const [mfaVerificationCode, setMfaVerificationCode] = useState('');
    const [disableMfaCode, setDisableMfaCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGovernanceSubmitting, setIsGovernanceSubmitting] = useState(false);
    useEffect(() => {
        const activeRealmId = getCurrentIamRealmId();
        const activeSessionId = getCurrentIamSessionId();
        if (!activeRealmId || !activeSessionId) {
            navigate('/iam/login');
            return;
        }
        setRealmId(activeRealmId);
        setSessionId(activeSessionId);
    }, [navigate]);
    const isCurrentAccountSession = (activeRealmId, activeSessionId) => (getCurrentIamRealmId() === activeRealmId && getCurrentIamSessionId() === activeSessionId);
    const loadAccount = async (activeRealmId, activeSessionId, options) => {
        setLoading(true);
        try {
            const [sessionResponse, profileResponse, securityResponse, sessionsResponse, consentsResponse, delegatedRelationshipsResponse, delegatedConsentsResponse, delegatedConsentRequestsResponse, linkedIdentityResponse, organizationsResponse, passkeyResponse, experienceResponse,] = await Promise.all([
                idpApi.getIamAccountSession(activeRealmId, activeSessionId),
                idpApi.getIamAccountProfile(activeRealmId, activeSessionId),
                idpApi.getIamAccountSecurity(activeRealmId, activeSessionId),
                idpApi.listIamAccountSessions(activeRealmId, activeSessionId),
                idpApi.listIamAccountConsents(activeRealmId, activeSessionId),
                idpApi.listIamAccountDelegatedRelationships(activeRealmId, activeSessionId),
                idpApi.listIamAccountDelegatedConsents(activeRealmId, activeSessionId),
                idpApi.listIamAccountDelegatedConsentRequests(activeRealmId, activeSessionId),
                idpApi.listIamAccountLinkedIdentities(activeRealmId, activeSessionId),
                idpApi.listIamAccountOrganizations(activeRealmId, activeSessionId),
                idpApi.listIamAccountWebAuthnCredentials(activeRealmId, activeSessionId),
                idpApi.getIamRealmExperience(activeRealmId),
            ]);
            if (options?.suppressStaleFailure && !isCurrentAccountSession(activeRealmId, activeSessionId)) {
                return;
            }
            setSessionContext(sessionResponse);
            setProfile(profileResponse);
            setSecurity(securityResponse);
            setSessions(sessionsResponse.sessions);
            setConsents(consentsResponse.consents);
            setDelegatedRelationships(delegatedRelationshipsResponse.delegated_relationships);
            setDelegatedConsents(delegatedConsentsResponse.delegated_consents);
            setDelegatedConsentRequests(delegatedConsentRequestsResponse.delegated_consent_requests);
            setLinkedIdentities(linkedIdentityResponse.linked_identities);
            setOrganizations(organizationsResponse.organizations);
            setPasskeys(passkeyResponse.credentials);
            setExperience(experienceResponse);
            setProfileForm({
                first_name: profileResponse.user.first_name,
                last_name: profileResponse.user.last_name,
                email: profileResponse.user.email,
            });
            setProfileAttributes(profileResponse.profile_attributes);
            const delegateRelationships = delegatedRelationshipsResponse.delegated_relationships.filter((relationship) => relationship.current_party === 'DELEGATE' && relationship.status === 'ACTIVE');
            const principalRelationships = delegatedRelationshipsResponse.delegated_relationships.filter((relationship) => relationship.current_party === 'PRINCIPAL' && relationship.status === 'ACTIVE');
            setDelegatedRequestForm((current) => ({
                ...current,
                relationship_id: delegateRelationships.some((relationship) => relationship.id === current.relationship_id)
                    ? current.relationship_id
                    : delegateRelationships[0]?.id ?? '',
            }));
            setDelegatedGrantForm((current) => ({
                ...current,
                relationship_id: principalRelationships.some((relationship) => relationship.id === current.relationship_id)
                    ? current.relationship_id
                    : principalRelationships[0]?.id ?? '',
            }));
        }
        catch (error) {
            if (options?.suppressStaleFailure && !isCurrentAccountSession(activeRealmId, activeSessionId)) {
                return;
            }
            console.error('Failed to load IAM account:', error);
            clearIamSession();
            toast.error(error?.response?.data?.error ?? 'IAM account session expired');
            navigate('/iam/login');
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (!realmId || !sessionId) {
            return;
        }
        void loadAccount(realmId, sessionId, { suppressStaleFailure: true });
    }, [realmId, sessionId]);
    const refresh = async () => {
        if (!realmId || !sessionId) {
            return;
        }
        await loadAccount(realmId, sessionId);
    };
    const localeStrings = experience?.localization.translations[experience.localization.default_locale] ?? {};
    const translate = (key, fallback) => {
        const value = localeStrings[key];
        return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
    };
    const localPasskeys = sessionContext
        ? getIamLocalPasskeyDeviceLabels({
            realm_id: realmId,
            user_id: sessionContext.user.id,
        })
        : [];
    const handleLogout = async () => {
        if (!realmId || !sessionId) {
            toast.dismiss();
            clearIamSession();
            navigate('/iam/login?logged_out=1');
            return;
        }
        try {
            await idpApi.logoutIamAccount(realmId, sessionId);
        }
        catch (error) {
            console.error('IAM logout failed:', error);
        }
        finally {
            toast.dismiss();
            clearIamSession();
            navigate('/iam/login?logged_out=1');
        }
    };
    const handleProfileSave = async () => {
        if (!realmId || !sessionId) {
            return;
        }
        setIsSubmitting(true);
        try {
            await idpApi.updateIamAccountProfile(realmId, sessionId, {
                ...profileForm,
                attributes: profileAttributes,
            });
            toast.success('IAM account profile updated');
            await refresh();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to update IAM profile');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handlePasswordChange = async () => {
        if (!realmId || !sessionId || !passwordForm.current_password || !passwordForm.new_password) {
            toast.error('Enter the current and new password');
            return;
        }
        setIsSubmitting(true);
        try {
            await idpApi.changeIamAccountPassword(realmId, sessionId, passwordForm);
            toast.success('IAM account password updated');
            setPasswordForm({ current_password: '', new_password: '' });
            await refresh();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to update IAM password');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleRequestEmailVerification = async () => {
        if (!realmId || !profile?.user.email) {
            return;
        }
        try {
            const response = await idpApi.requestIamEmailVerification(realmId, {
                username_or_email: profile.user.email,
            });
            setEmailVerification((current) => ({ ...current, ticket_id: response.ticket_id }));
            toast.success(`Verification code: ${response.code_preview}`);
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to request email verification');
        }
    };
    const handleConfirmEmailVerification = async () => {
        if (!realmId || !emailVerification.ticket_id || !emailVerification.code) {
            toast.error('Enter the verification ticket and code');
            return;
        }
        try {
            await idpApi.confirmIamEmailVerification(realmId, {
                ticket_id: emailVerification.ticket_id,
                code: emailVerification.code,
            });
            toast.success('IAM email verification completed');
            setEmailVerification({ ticket_id: '', code: '' });
            await refresh();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to confirm email verification');
        }
    };
    const handleBeginMfa = async () => {
        if (!realmId || !sessionId) {
            return;
        }
        try {
            const response = await idpApi.beginIamMfaEnrollment(realmId, sessionId);
            setMfaEnrollment(response);
            toast.success('IAM MFA enrollment started');
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to start MFA enrollment');
        }
    };
    const handleVerifyMfa = async () => {
        if (!realmId || !sessionId || !mfaEnrollment || !mfaVerificationCode.trim()) {
            toast.error('Enter the MFA verification code');
            return;
        }
        try {
            await idpApi.verifyIamMfaEnrollment(realmId, sessionId, {
                enrollment_id: mfaEnrollment.enrollment_id,
                code: mfaVerificationCode,
            });
            toast.success('IAM MFA enabled');
            setMfaEnrollment(null);
            setMfaVerificationCode('');
            await refresh();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to verify MFA enrollment');
        }
    };
    const handleDisableMfa = async () => {
        if (!realmId || !sessionId || !disableMfaCode.trim()) {
            toast.error('Enter an authenticator or backup code');
            return;
        }
        try {
            await idpApi.disableIamMfa(realmId, sessionId, {
                code: disableMfaCode,
            });
            toast.success('IAM MFA disabled');
            setDisableMfaCode('');
            await refresh();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to disable MFA');
        }
    };
    const handleBeginPasskeyEnrollment = async () => {
        if (!realmId || !sessionId) {
            return;
        }
        try {
            const response = await idpApi.beginIamWebAuthnRegistration(realmId, sessionId);
            setPasskeyEnrollment(response);
            toast.success('Passkey enrollment started');
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to start passkey enrollment');
        }
    };
    const handleCompletePasskeyEnrollment = async () => {
        if (!realmId || !sessionId || !passkeyEnrollment || !passkeyDeviceLabel.trim()) {
            toast.error('Enter a device label and start passkey enrollment first');
            return;
        }
        try {
            const localRegistration = await createIamSoftwarePasskey({
                realm_id: realmId,
                user_id: passkeyEnrollment.user_id,
                challenge_id: passkeyEnrollment.challenge_id,
                challenge: passkeyEnrollment.challenge,
                device_label: passkeyDeviceLabel.trim(),
            });
            await idpApi.completeIamWebAuthnRegistration(realmId, sessionId, {
                ...localRegistration,
                public_key_jwk: localRegistration.public_key_jwk,
                transports: [...localRegistration.transports],
            });
            toast.success(`Passkey registered on ${localRegistration.device_label}`);
            setPasskeyEnrollment(null);
            await refresh();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? error?.message ?? 'Failed to complete passkey enrollment');
        }
    };
    const handleRevokePasskey = async (credential) => {
        if (!realmId || !sessionId) {
            return;
        }
        try {
            await idpApi.revokeIamAccountWebAuthnCredential(realmId, sessionId, credential.id);
            removeIamLocalPasskey({
                realm_id: realmId,
                user_id: credential.user_id,
                credential_id: credential.credential_id,
            });
            toast.success(`Revoked passkey ${credential.device_label}`);
            await refresh();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to revoke passkey');
        }
    };
    const handleRevokeSession = async (targetSessionId) => {
        if (!realmId || !sessionId) {
            return;
        }
        try {
            await idpApi.revokeIamAccountSession(realmId, sessionId, targetSessionId);
            toast.success('IAM session revoked');
            await refresh();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to revoke IAM session');
        }
    };
    const handleRevokeOthers = async () => {
        if (!realmId || !sessionId) {
            return;
        }
        try {
            const response = await idpApi.revokeOtherIamAccountSessions(realmId, sessionId);
            toast.success(`Revoked ${response.revoked_count} other IAM sessions`);
            await refresh();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to revoke other IAM sessions');
        }
    };
    const handleAcceptInvitation = async (invitationId) => {
        if (!realmId || !sessionId) {
            return;
        }
        try {
            await idpApi.acceptIamAccountOrganizationInvitation(realmId, sessionId, invitationId);
            toast.success('Organization invitation accepted');
            await refresh();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to accept organization invitation');
        }
    };
    const updateProfileAttributeValue = (key, value) => {
        setProfileAttributes((current) => ({
            ...current,
            [key]: value,
        }));
    };
    const delegateRelationships = delegatedRelationships.filter((relationship) => relationship.current_party === 'DELEGATE' && relationship.status === 'ACTIVE');
    const principalRelationships = delegatedRelationships.filter((relationship) => relationship.current_party === 'PRINCIPAL' && relationship.status === 'ACTIVE');
    const selectedDelegatedRequestRelationship = delegateRelationships.find((relationship) => relationship.id === delegatedRequestForm.relationship_id) ?? delegateRelationships[0] ?? null;
    const selectedDelegatedGrantRelationship = principalRelationships.find((relationship) => relationship.id === delegatedGrantForm.relationship_id) ?? principalRelationships[0] ?? null;
    const handleGrantDelegatedConsent = async () => {
        if (!realmId || !sessionId || !delegatedGrantForm.relationship_id) {
            toast.error('Select a delegated relationship first');
            return;
        }
        const scopeNames = parseDelimitedValues(delegatedGrantForm.scope_names);
        if (scopeNames.length === 0) {
            toast.error('Enter at least one delegated scope');
            return;
        }
        setIsGovernanceSubmitting(true);
        try {
            await idpApi.grantIamAccountDelegatedConsent(realmId, sessionId, {
                relationship_id: delegatedGrantForm.relationship_id,
                scope_names: scopeNames,
                purpose_names: parseDelimitedValues(delegatedGrantForm.purpose_names),
                expires_at: normalizeOptionalValue(delegatedGrantForm.expires_at),
                notes: parseDelimitedValues(delegatedGrantForm.notes),
            });
            toast.success('Delegated consent granted');
            setDelegatedGrantForm((current) => ({
                ...current,
                scope_names: '',
                purpose_names: '',
                expires_at: '',
                notes: '',
            }));
            await refresh();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to grant delegated consent');
        }
        finally {
            setIsGovernanceSubmitting(false);
        }
    };
    const handleRevokeDelegatedConsent = async (consentId) => {
        if (!realmId || !sessionId) {
            return;
        }
        setIsGovernanceSubmitting(true);
        try {
            await idpApi.revokeIamAccountDelegatedConsent(realmId, sessionId, consentId);
            toast.success('Delegated consent revoked');
            await refresh();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to revoke delegated consent');
        }
        finally {
            setIsGovernanceSubmitting(false);
        }
    };
    const handleRequestDelegatedConsent = async () => {
        if (!realmId || !sessionId || !delegatedRequestForm.relationship_id) {
            toast.error('Select a delegated relationship first');
            return;
        }
        const requestedScopeNames = parseDelimitedValues(delegatedRequestForm.requested_scope_names);
        if (requestedScopeNames.length === 0) {
            toast.error('Enter at least one requested scope');
            return;
        }
        setIsGovernanceSubmitting(true);
        try {
            await idpApi.requestIamAccountDelegatedConsent(realmId, sessionId, {
                relationship_id: delegatedRequestForm.relationship_id,
                requested_scope_names: requestedScopeNames,
                requested_purpose_names: parseDelimitedValues(delegatedRequestForm.requested_purpose_names),
                expires_at: normalizeOptionalValue(delegatedRequestForm.expires_at),
                request_notes: parseDelimitedValues(delegatedRequestForm.request_notes),
            });
            toast.success('Delegated consent request created');
            setDelegatedRequestForm((current) => ({
                ...current,
                requested_scope_names: '',
                requested_purpose_names: '',
                expires_at: '',
                request_notes: '',
            }));
            await refresh();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to create delegated consent request');
        }
        finally {
            setIsGovernanceSubmitting(false);
        }
    };
    const handleApproveDelegatedConsentRequest = async (requestId) => {
        if (!realmId || !sessionId) {
            return;
        }
        setIsGovernanceSubmitting(true);
        try {
            await idpApi.approveIamAccountDelegatedConsentRequest(realmId, sessionId, requestId);
            toast.success('Delegated consent request approved');
            await refresh();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to approve delegated consent request');
        }
        finally {
            setIsGovernanceSubmitting(false);
        }
    };
    const handleDenyDelegatedConsentRequest = async (requestId) => {
        if (!realmId || !sessionId) {
            return;
        }
        setIsGovernanceSubmitting(true);
        try {
            await idpApi.denyIamAccountDelegatedConsentRequest(realmId, sessionId, requestId);
            toast.success('Delegated consent request denied');
            await refresh();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to deny delegated consent request');
        }
        finally {
            setIsGovernanceSubmitting(false);
        }
    };
    const handleCancelDelegatedConsentRequest = async (requestId) => {
        if (!realmId || !sessionId) {
            return;
        }
        setIsGovernanceSubmitting(true);
        try {
            await idpApi.cancelIamAccountDelegatedConsentRequest(realmId, sessionId, requestId);
            toast.success('Delegated consent request cancelled');
            await refresh();
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to cancel delegated consent request');
        }
        finally {
            setIsGovernanceSubmitting(false);
        }
    };
    if (loading) {
        return (_jsx(PublicSiteShell, { contentClassName: "py-16", children: _jsx("div", { className: "rounded-[28px] border border-slate-200 bg-white/90 p-10 text-center dark:border-slate-800 dark:bg-slate-900/80", children: _jsx("p", { className: "text-sm text-slate-600 dark:text-slate-300", children: "Loading standalone IAM account console\u2026" }) }) }));
    }
    return (_jsx(PublicSiteShell, { contentClassName: "py-10", children: _jsxs("div", { className: "space-y-6", children: [_jsx("section", { className: "rounded-[28px] border bg-white/90 p-8 shadow-xl shadow-slate-200/60 dark:bg-slate-900/80 dark:shadow-none", style: {
                        borderColor: experience?.theme.surface_tint ?? undefined,
                        backgroundImage: experience
                            ? `linear-gradient(135deg, ${experience.theme.surface_tint}22 0%, transparent 42%)`
                            : undefined,
                    }, children: _jsxs("div", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-3 text-sky-700 dark:text-sky-300", children: [_jsx(KeyRound, { className: "h-5 w-5" }), _jsx("span", { className: "text-sm font-semibold uppercase tracking-[0.22em]", children: experience?.theme.brand_name ?? 'Standalone IAM Account' })] }), _jsx("h1", { className: "mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white", children: experience?.theme.account_title ?? translate('account_headline', `${profile?.user.first_name ?? ''} ${profile?.user.last_name ?? ''}`.trim()) }), _jsx("p", { className: "mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300", children: experience?.theme.account_subtitle ?? translate('account_subtitle', 'Manage your standalone identity profile, security posture, and linked identities.') }), _jsxs("p", { className: "mt-2 text-sm text-slate-600 dark:text-slate-300", children: ["Realm: ", _jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: realmId }), ' ', "| Session assurance: ", _jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: sessionContext?.session.assurance_level })] }), experience ? (_jsxs("p", { className: "mt-2 text-xs text-slate-500 dark:text-slate-400", children: ["Locale ", experience.localization.default_locale, " \u00B7 Support ", experience.theme.support_email] })) : null] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx(LinkButton, { href: "/iam", children: "Open Admin Console" }), _jsxs("button", { type: "button", onClick: handleLogout, className: "inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950", children: [_jsx(LogOut, { className: "h-4 w-4" }), "Logout"] })] })] }) }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-[1.1fr_0.9fr]", children: [_jsxs("section", { className: "space-y-6", children: [_jsxs(Card, { title: "Profile", description: "This updates the realm-local identity profile used by the standalone identity platform.", icon: _jsx(Users, { className: "h-5 w-5" }), children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx("input", { value: profileForm.first_name, onChange: (event) => setProfileForm((current) => ({ ...current, first_name: event.target.value })), className: inputClassName, placeholder: "First name" }), _jsx("input", { value: profileForm.last_name, onChange: (event) => setProfileForm((current) => ({ ...current, last_name: event.target.value })), className: inputClassName, placeholder: "Last name" }), _jsx("input", { value: profileForm.email, onChange: (event) => setProfileForm((current) => ({ ...current, email: event.target.value })), className: `md:col-span-2 ${inputClassName}`, placeholder: "Email address" }), profile?.profile_schema.attributes.map((attribute) => {
                                                    const currentValue = profileAttributes[attribute.key];
                                                    if (attribute.type === 'BOOLEAN') {
                                                        return (_jsxs("label", { className: "inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800", children: [_jsx("input", { type: "checkbox", checked: Boolean(currentValue), onChange: (event) => updateProfileAttributeValue(attribute.key, event.target.checked) }), _jsxs("span", { children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: attribute.label }), attribute.help_text ? _jsx("span", { className: "mt-1 block text-xs text-slate-500 dark:text-slate-400", children: attribute.help_text }) : null] })] }, attribute.id));
                                                    }
                                                    if (attribute.type === 'ENUM' && !attribute.multivalued) {
                                                        return (_jsxs("label", { className: "space-y-2 text-sm md:col-span-2", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: attribute.label }), _jsxs("select", { value: typeof currentValue === 'string' ? currentValue : '', onChange: (event) => updateProfileAttributeValue(attribute.key, event.target.value || null), className: inputClassName, children: [_jsx("option", { value: "", children: "Select\u2026" }), attribute.allowed_values.map((option) => (_jsx("option", { value: option, children: option }, option)))] }), attribute.help_text ? _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: attribute.help_text }) : null] }, attribute.id));
                                                    }
                                                    return (_jsxs("label", { className: "space-y-2 text-sm md:col-span-2", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: attribute.label }), _jsx("input", { value: Array.isArray(currentValue) ? currentValue.join(', ') : typeof currentValue === 'string' || typeof currentValue === 'number' ? String(currentValue) : '', onChange: (event) => updateProfileAttributeValue(attribute.key, attribute.multivalued
                                                                    ? event.target.value.split(',').map((value) => value.trim()).filter(Boolean)
                                                                    : event.target.value), className: inputClassName, placeholder: attribute.placeholder ?? attribute.label }), attribute.help_text ? _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: attribute.help_text }) : null] }, attribute.id));
                                                })] }), _jsx("div", { className: "mt-5", children: _jsx("button", { type: "button", onClick: handleProfileSave, disabled: isSubmitting, className: primaryButtonClassName, children: isSubmitting ? 'Saving…' : 'Save IAM profile' }) })] }), _jsxs(Card, { title: "Email verification", description: "The standalone identity platform tracks its own verification state and required-action lifecycle.", icon: _jsx(ShieldCheck, { className: "h-5 w-5" }), children: [_jsxs("p", { className: "text-sm text-slate-600 dark:text-slate-300", children: ["Status:", ' ', _jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: security?.email_verified_at ? `Verified ${new Date(security.email_verified_at).toLocaleString()}` : 'Verification required' })] }), _jsx("div", { className: "mt-4 flex flex-wrap gap-3", children: _jsx("button", { type: "button", onClick: handleRequestEmailVerification, className: secondaryButtonClassName, children: "Issue verification code" }) }), _jsxs("div", { className: "mt-4 grid gap-4 md:grid-cols-2", children: [_jsx("input", { value: emailVerification.ticket_id, onChange: (event) => setEmailVerification((current) => ({ ...current, ticket_id: event.target.value })), className: inputClassName, placeholder: "Verification ticket" }), _jsx("input", { value: emailVerification.code, onChange: (event) => setEmailVerification((current) => ({ ...current, code: event.target.value })), className: inputClassName, placeholder: "Verification code" })] }), _jsx("div", { className: "mt-4", children: _jsx("button", { type: "button", onClick: handleConfirmEmailVerification, className: primaryButtonClassName, children: "Confirm email verification" }) })] }), _jsx(Card, { title: "Linked identities", description: "Brokered and federated identities attached to this identity account.", icon: _jsx(Users, { className: "h-5 w-5" }), children: _jsxs("div", { className: "space-y-3", children: [linkedIdentities.length === 0 && (_jsx("p", { className: "text-sm text-slate-600 dark:text-slate-300", children: "No brokered or federated identities are linked to this account yet." })), linkedIdentities.map((record) => (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: record.provider_name }), _jsxs("div", { className: "mt-1 text-sm text-slate-600 dark:text-slate-300", children: [record.source_type, " \u00B7 ", record.external_username, " \u00B7 ", record.external_email] }), _jsxs("div", { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: ["Linked ", new Date(record.linked_at).toLocaleString(), record.last_authenticated_at ? ` · Last broker login ${new Date(record.last_authenticated_at).toLocaleString()}` : ''] })] }, record.id)))] }) }), _jsx(Card, { title: "Organizations", description: "This account can belong to one or more B2B organizations inside the active identity realm.", icon: _jsx(Users, { className: "h-5 w-5" }), children: _jsxs("div", { className: "space-y-3", children: [organizations.length === 0 && (_jsx("p", { className: "text-sm text-slate-600 dark:text-slate-300", children: "No organization memberships or pending invitations are attached to this account yet." })), organizations.map((entry) => (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: entry.organization.name }), _jsx("div", { className: "mt-1 text-sm text-slate-600 dark:text-slate-300", children: entry.organization.summary })] }), entry.membership ? (_jsxs("div", { className: "text-sm font-medium text-slate-900 dark:text-white", children: [entry.membership.role, " \u00B7 ", entry.membership.status] })) : null] }), entry.pending_invitations.length > 0 && (_jsx("div", { className: "mt-3 space-y-2", children: entry.pending_invitations.map((invitation) => (_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm dark:border-slate-700", children: [_jsxs("div", { children: ["Pending invitation as ", invitation.role, invitation.linked_identity_provider_aliases.length > 0
                                                                            ? ` · IdPs ${invitation.linked_identity_provider_aliases.join(', ')}`
                                                                            : ''] }), _jsx("button", { type: "button", onClick: () => handleAcceptInvitation(invitation.id), className: secondaryButtonClassName, children: "Accept invitation" })] }, invitation.id))) }))] }, entry.organization.id)))] }) }), _jsxs(Card, { title: "Password", description: "Password changes update the credential store used by browser login and direct grants.", icon: _jsx(KeyRound, { className: "h-5 w-5" }), children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx("input", { type: "password", value: passwordForm.current_password, onChange: (event) => setPasswordForm((current) => ({ ...current, current_password: event.target.value })), className: inputClassName, placeholder: "Current password" }), _jsx("input", { type: "password", value: passwordForm.new_password, onChange: (event) => setPasswordForm((current) => ({ ...current, new_password: event.target.value })), className: inputClassName, placeholder: "New password" })] }), _jsx("div", { className: "mt-5", children: _jsx("button", { type: "button", onClick: handlePasswordChange, className: primaryButtonClassName, children: "Update password" }) })] })] }), _jsxs("section", { className: "space-y-6", children: [_jsxs(Card, { title: "MFA", description: "TOTP and backup-code flows are managed within the standalone identity platform.", icon: _jsx(Shield, { className: "h-5 w-5" }), children: [_jsxs("p", { className: "text-sm text-slate-600 dark:text-slate-300", children: ["Status:", ' ', _jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: security?.mfa_enabled ? 'Enabled' : 'Not enabled' })] }), !security?.mfa_enabled && (_jsxs("div", { className: "mt-4 space-y-4", children: [_jsx("button", { type: "button", onClick: handleBeginMfa, className: secondaryButtonClassName, children: "Start MFA enrollment" }), mfaEnrollment && (_jsxs("div", { className: "space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30", children: [_jsxs("p", { className: "text-sm text-slate-700 dark:text-slate-200", children: ["Shared secret: ", _jsx("span", { className: "font-mono", children: mfaEnrollment.shared_secret })] }), _jsxs("p", { className: "text-sm text-slate-700 dark:text-slate-200 break-all", children: ["URI: ", mfaEnrollment.otpauth_uri] }), _jsx("div", { className: "grid gap-2 md:grid-cols-2", children: mfaEnrollment.backup_codes.map((code) => (_jsx("div", { className: "rounded-xl bg-white px-3 py-2 text-sm font-mono text-slate-700 dark:bg-slate-950 dark:text-slate-200", children: code }, code))) }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx("input", { value: mfaVerificationCode, onChange: (event) => setMfaVerificationCode(event.target.value), className: inputClassName, placeholder: "Authenticator code" }), _jsx("button", { type: "button", onClick: handleVerifyMfa, className: primaryButtonClassName, children: "Verify enrollment" })] })] }))] })), security?.mfa_enabled && (_jsxs("div", { className: "mt-4 space-y-3", children: [_jsx("input", { value: disableMfaCode, onChange: (event) => setDisableMfaCode(event.target.value), className: inputClassName, placeholder: "Authenticator or backup code" }), _jsx("button", { type: "button", onClick: handleDisableMfa, className: secondaryButtonClassName, children: "Disable MFA" })] }))] }), _jsxs(Card, { title: "Passkeys", description: "Passkeys provide phishing-resistant sign-in and can satisfy the strong-auth step without falling back to TOTP.", icon: _jsx(ShieldCheck, { className: "h-5 w-5" }), children: [_jsxs("p", { className: "text-sm text-slate-600 dark:text-slate-300", children: ["Status:", ' ', _jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: security?.passwordless_ready ? `${security.passkey_count} registered` : 'No passkeys registered' })] }), _jsxs("p", { className: "mt-2 text-xs text-slate-500 dark:text-slate-400", children: ["Local device keys available here: ", localPasskeys.length] }), _jsx("div", { className: "mt-4 flex flex-wrap gap-3", children: _jsx("button", { type: "button", onClick: handleBeginPasskeyEnrollment, className: secondaryButtonClassName, children: "Start passkey enrollment" }) }), passkeyEnrollment && (_jsxs("div", { className: "mt-4 space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/60 dark:bg-sky-950/30", children: [_jsxs("p", { className: "text-sm text-slate-700 dark:text-slate-200", children: ["Challenge active until ", new Date(passkeyEnrollment.expires_at).toLocaleString(), " for ", passkeyEnrollment.display_name, "."] }), _jsx("input", { value: passkeyDeviceLabel, onChange: (event) => setPasskeyDeviceLabel(event.target.value), className: inputClassName, placeholder: "Device label" }), _jsx("button", { type: "button", onClick: handleCompletePasskeyEnrollment, className: primaryButtonClassName, children: "Register software passkey on this browser" })] })), _jsxs("div", { className: "mt-5 space-y-3", children: [passkeys.length === 0 && (_jsx("p", { className: "text-sm text-slate-600 dark:text-slate-300", children: "No passkeys are registered for this identity account yet." })), passkeys.map((credential) => {
                                                    const localDevice = localPasskeys.find((record) => record.credential_id === credential.credential_id);
                                                    return (_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-medium text-slate-900 dark:text-white", children: [credential.device_label, localDevice ? ' · Available on this browser' : ''] }), _jsxs("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: [credential.algorithm, " \u00B7 ", credential.transports.join(', '), " \u00B7 Registered ", new Date(credential.created_at).toLocaleString()] }), credential.last_used_at && (_jsxs("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: ["Last used ", new Date(credential.last_used_at).toLocaleString()] }))] }), credential.status === 'ACTIVE' && (_jsx("button", { type: "button", onClick: () => handleRevokePasskey(credential), className: "rounded-full border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200", children: "Revoke" }))] }, credential.id));
                                                })] })] }), _jsxs(Card, { title: "Sessions", description: "These are browser sessions issued by the standalone identity platform.", icon: _jsx(Users, { className: "h-5 w-5" }), children: [_jsx("div", { className: "flex justify-end", children: _jsx("button", { type: "button", onClick: handleRevokeOthers, className: secondaryButtonClassName, children: "Revoke other sessions" }) }), _jsx("div", { className: "mt-4 space-y-3", children: sessions.map((session) => (_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-medium text-slate-900 dark:text-white", children: [session.client_name ?? 'Account console', session.is_current ? ' · Current session' : ''] }), _jsxs("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: [session.assurance_level, " \u00B7 ", new Date(session.authenticated_at).toLocaleString()] })] }), !session.is_current && session.status === 'ACTIVE' && (_jsx("button", { type: "button", onClick: () => handleRevokeSession(session.session_id), className: "rounded-full border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200", children: "Revoke" }))] }, session.session_id))) })] }), _jsx(Card, { title: "Consents", description: "Each consent is stored per client and scope set within the active realm.", icon: _jsx(ShieldCheck, { className: "h-5 w-5" }), children: _jsxs("div", { className: "space-y-3", children: [consents.length === 0 && (_jsx("p", { className: "text-sm text-slate-600 dark:text-slate-300", children: "No client consents have been granted yet." })), consents.map((consent) => (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50", children: [_jsx("p", { className: "text-sm font-medium text-slate-900 dark:text-white", children: consent.client_name }), _jsx("p", { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: new Date(consent.granted_at).toLocaleString() }), _jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: consent.scope_names.map((scope) => (_jsx("span", { className: "rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200", children: scope }, scope))) })] }, consent.id)))] }) })] })] }), _jsx(Card, { title: "Delegated access", description: "Guardian, proxy, and principal-managed approval workflows are governed here from the standalone IAM account console.", icon: _jsx(ShieldCheck, { className: "h-5 w-5" }), children: _jsxs("div", { className: "space-y-6", children: [delegatedRelationships.length === 0 && (_jsx("p", { className: "text-sm text-slate-600 dark:text-slate-300", children: "No delegated guardian, proxy, or representative relationships are attached to this account in the active realm." })), delegatedRelationships.length > 0 && (_jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400", children: "Relationships" }), delegatedRelationships.map((relationship) => (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/50", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-medium text-slate-900 dark:text-white", children: [relationship.counterpart_user.first_name, " ", relationship.counterpart_user.last_name] }), _jsxs("p", { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: [relationship.relationship_kind, " \u00B7 You are ", relationship.current_party.toLowerCase(), " \u00B7 ", relationship.counterpart_user.email] })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(StatusBadge, { label: relationship.status, tone: relationship.status === 'ACTIVE' ? 'green' : 'slate' }), _jsx(StatusBadge, { label: relationship.consent_required ? 'CONSENT REQUIRED' : 'DIRECT GRANT ALLOWED', tone: relationship.consent_required ? 'amber' : 'blue' })] })] }), _jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: relationship.allowed_scopes.map((scope) => (_jsx("span", { className: "rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200", children: scope }, scope))) }), relationship.allowed_purposes && relationship.allowed_purposes.length > 0 && (_jsxs("p", { className: "mt-3 text-xs text-slate-500 dark:text-slate-400", children: ["Purposes: ", relationship.allowed_purposes.join(', ')] })), relationship.notes.length > 0 && (_jsxs("p", { className: "mt-2 text-xs text-slate-500 dark:text-slate-400", children: ["Notes: ", relationship.notes.join(' · ')] }))] }, relationship.id)))] })), _jsxs("div", { className: "grid gap-6 xl:grid-cols-2", children: [principalRelationships.length > 0 && (_jsxs("div", { className: "rounded-2xl border border-slate-200 p-5 dark:border-slate-800", children: [_jsx("h3", { className: "text-base font-semibold text-slate-900 dark:text-white", children: "Grant delegated consent" }), _jsx("p", { className: "mt-2 text-sm text-slate-600 dark:text-slate-300", children: "Principals can grant direct delegated access without waiting for a request." }), _jsxs("div", { className: "mt-4 space-y-3", children: [_jsxs("select", { value: delegatedGrantForm.relationship_id, onChange: (event) => setDelegatedGrantForm((current) => ({ ...current, relationship_id: event.target.value })), className: inputClassName, children: [_jsx("option", { value: "", children: "Select relationship" }), principalRelationships.map((relationship) => (_jsxs("option", { value: relationship.id, children: [relationship.relationship_kind, " \u00B7 ", relationship.counterpart_user.first_name, " ", relationship.counterpart_user.last_name] }, relationship.id)))] }), _jsx("input", { value: delegatedGrantForm.scope_names, onChange: (event) => setDelegatedGrantForm((current) => ({ ...current, scope_names: event.target.value })), className: inputClassName, placeholder: selectedDelegatedGrantRelationship ? `Scopes, e.g. ${selectedDelegatedGrantRelationship.allowed_scopes.join(', ')}` : 'Scopes' }), _jsx("input", { value: delegatedGrantForm.purpose_names, onChange: (event) => setDelegatedGrantForm((current) => ({ ...current, purpose_names: event.target.value })), className: inputClassName, placeholder: selectedDelegatedGrantRelationship?.allowed_purposes?.length ? `Purposes, e.g. ${selectedDelegatedGrantRelationship.allowed_purposes.join(', ')}` : 'Purposes (optional)' }), _jsx("input", { value: delegatedGrantForm.expires_at, onChange: (event) => setDelegatedGrantForm((current) => ({ ...current, expires_at: event.target.value })), className: inputClassName, placeholder: "Expires at (optional ISO timestamp)" }), _jsx("textarea", { value: delegatedGrantForm.notes, onChange: (event) => setDelegatedGrantForm((current) => ({ ...current, notes: event.target.value })), className: "min-h-[96px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", placeholder: "Optional notes" }), _jsx("button", { type: "button", onClick: handleGrantDelegatedConsent, disabled: isGovernanceSubmitting, className: primaryButtonClassName, children: isGovernanceSubmitting ? 'Submitting…' : 'Grant delegated consent' })] })] })), delegateRelationships.length > 0 && (_jsxs("div", { className: "rounded-2xl border border-slate-200 p-5 dark:border-slate-800", children: [_jsx("h3", { className: "text-base font-semibold text-slate-900 dark:text-white", children: "Request delegated consent" }), _jsx("p", { className: "mt-2 text-sm text-slate-600 dark:text-slate-300", children: "Delegates can request additional access scopes for principal review and approval." }), _jsxs("div", { className: "mt-4 space-y-3", children: [_jsxs("select", { value: delegatedRequestForm.relationship_id, onChange: (event) => setDelegatedRequestForm((current) => ({ ...current, relationship_id: event.target.value })), className: inputClassName, children: [_jsx("option", { value: "", children: "Select relationship" }), delegateRelationships.map((relationship) => (_jsxs("option", { value: relationship.id, children: [relationship.relationship_kind, " \u00B7 ", relationship.counterpart_user.first_name, " ", relationship.counterpart_user.last_name] }, relationship.id)))] }), _jsx("input", { value: delegatedRequestForm.requested_scope_names, onChange: (event) => setDelegatedRequestForm((current) => ({ ...current, requested_scope_names: event.target.value })), className: inputClassName, placeholder: selectedDelegatedRequestRelationship ? `Requested scopes, e.g. ${selectedDelegatedRequestRelationship.allowed_scopes.join(', ')}` : 'Requested scopes' }), _jsx("input", { value: delegatedRequestForm.requested_purpose_names, onChange: (event) => setDelegatedRequestForm((current) => ({ ...current, requested_purpose_names: event.target.value })), className: inputClassName, placeholder: selectedDelegatedRequestRelationship?.allowed_purposes?.length ? `Purposes, e.g. ${selectedDelegatedRequestRelationship.allowed_purposes.join(', ')}` : 'Purposes (optional)' }), _jsx("input", { value: delegatedRequestForm.expires_at, onChange: (event) => setDelegatedRequestForm((current) => ({ ...current, expires_at: event.target.value })), className: inputClassName, placeholder: "Expires at (optional ISO timestamp)" }), _jsx("textarea", { value: delegatedRequestForm.request_notes, onChange: (event) => setDelegatedRequestForm((current) => ({ ...current, request_notes: event.target.value })), className: "min-h-[96px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", placeholder: "Optional request notes" }), _jsx("button", { type: "button", onClick: handleRequestDelegatedConsent, disabled: isGovernanceSubmitting, className: primaryButtonClassName, children: isGovernanceSubmitting ? 'Submitting…' : 'Request delegated consent' })] })] }))] }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-2", children: [_jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400", children: "Delegated consents" }), delegatedConsents.length === 0 && (_jsx("p", { className: "text-sm text-slate-600 dark:text-slate-300", children: "No delegated consents are recorded yet." })), delegatedConsents.map((consent) => (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/50", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-medium text-slate-900 dark:text-white", children: [consent.relationship_kind, " \u00B7 ", consent.counterpart_user.first_name, " ", consent.counterpart_user.last_name] }), _jsxs("p", { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: ["Granted ", new Date(consent.granted_at).toLocaleString(), consent.expires_at ? ` · Expires ${new Date(consent.expires_at).toLocaleString()}` : ''] })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(StatusBadge, { label: consent.status, tone: consent.status === 'ACTIVE' ? 'green' : 'slate' }), _jsx(StatusBadge, { label: consent.current_party, tone: consent.current_party === 'PRINCIPAL' ? 'blue' : 'amber' })] })] }), _jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: consent.scope_names.map((scope) => (_jsx("span", { className: "rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200", children: scope }, scope))) }), consent.purpose_names.length > 0 && (_jsxs("p", { className: "mt-3 text-xs text-slate-500 dark:text-slate-400", children: ["Purposes: ", consent.purpose_names.join(', ')] })), consent.notes.length > 0 && (_jsxs("p", { className: "mt-2 text-xs text-slate-500 dark:text-slate-400", children: ["Notes: ", consent.notes.join(' · ')] })), consent.can_manage && consent.status === 'ACTIVE' && (_jsx("div", { className: "mt-4", children: _jsx("button", { type: "button", onClick: () => handleRevokeDelegatedConsent(consent.id), disabled: isGovernanceSubmitting, className: secondaryButtonClassName, children: "Revoke delegated consent" }) }))] }, consent.id)))] }), _jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400", children: "Consent requests" }), delegatedConsentRequests.length === 0 && (_jsx("p", { className: "text-sm text-slate-600 dark:text-slate-300", children: "No delegated consent requests are recorded yet." })), delegatedConsentRequests.map((request) => (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/50", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-medium text-slate-900 dark:text-white", children: [request.relationship_kind, " \u00B7 ", request.counterpart_user.first_name, " ", request.counterpart_user.last_name] }), _jsxs("p", { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: ["Requested ", new Date(request.requested_at).toLocaleString(), request.responded_at ? ` · Responded ${new Date(request.responded_at).toLocaleString()}` : ''] })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(StatusBadge, { label: request.status, tone: request.status === 'PENDING' ? 'amber' : request.status === 'APPROVED' ? 'green' : 'slate' }), _jsx(StatusBadge, { label: request.current_party, tone: request.current_party === 'PRINCIPAL' ? 'blue' : 'amber' })] })] }), _jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: request.requested_scope_names.map((scope) => (_jsx("span", { className: "rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200", children: scope }, scope))) }), request.requested_purpose_names.length > 0 && (_jsxs("p", { className: "mt-3 text-xs text-slate-500 dark:text-slate-400", children: ["Purposes: ", request.requested_purpose_names.join(', ')] })), request.request_notes.length > 0 && (_jsxs("p", { className: "mt-2 text-xs text-slate-500 dark:text-slate-400", children: ["Request notes: ", request.request_notes.join(' · ')] })), request.decision_notes.length > 0 && (_jsxs("p", { className: "mt-2 text-xs text-slate-500 dark:text-slate-400", children: ["Decision notes: ", request.decision_notes.join(' · ')] })), _jsxs("div", { className: "mt-4 flex flex-wrap gap-3", children: [request.can_approve && (_jsx("button", { type: "button", onClick: () => handleApproveDelegatedConsentRequest(request.id), disabled: isGovernanceSubmitting, className: primaryButtonClassName, children: "Approve" })), request.can_deny && (_jsx("button", { type: "button", onClick: () => handleDenyDelegatedConsentRequest(request.id), disabled: isGovernanceSubmitting, className: secondaryButtonClassName, children: "Deny" })), request.can_cancel && (_jsx("button", { type: "button", onClick: () => handleCancelDelegatedConsentRequest(request.id), disabled: isGovernanceSubmitting, className: secondaryButtonClassName, children: "Cancel request" }))] })] }, request.id)))] })] })] }) })] }) }));
}
function Card({ title, description, icon, children, }) {
    return (_jsxs("section", { className: "rounded-[28px] border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none", children: [_jsxs("div", { className: "flex items-center gap-3 text-slate-700 dark:text-slate-200", children: [icon, _jsx("h2", { className: "text-lg font-semibold text-slate-950 dark:text-white", children: title })] }), _jsx("p", { className: "mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300", children: description }), _jsx("div", { className: "mt-6", children: children })] }));
}
function LinkButton({ href, children }) {
    return (_jsx("a", { href: href, className: "inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200", children: children }));
}
function StatusBadge({ label, tone }) {
    const toneClassName = {
        green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
        amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
        blue: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200',
        slate: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    }[tone];
    return (_jsx("span", { className: `rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneClassName}`, children: label.replace(/_/g, ' ') }));
}
function parseDelimitedValues(value) {
    return Array.from(new Set(value
        .split(/[,\n]/)
        .map((entry) => entry.trim())
        .filter(Boolean)));
}
function normalizeOptionalValue(value) {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}
const inputClassName = 'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
const primaryButtonClassName = 'rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950';
const secondaryButtonClassName = 'rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200';
