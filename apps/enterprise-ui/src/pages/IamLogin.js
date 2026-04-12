import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { KeyRound, LockKeyhole, MailCheck, ShieldCheck } from 'lucide-react';
import { PublicSiteShell } from '../components/public/PublicSiteShell';
import { clearIamSession, idpApi, getCurrentIamRealmId, getCurrentIamSessionId, setCurrentIamRealmId, setCurrentIamSessionId, } from '../services/standaloneApi';
import { completeIamSoftwarePasskeyAssertion } from '../utils/iamPasskeys';
const validationAccountsByRealm = {
    'realm-idp-default': [
        {
            label: 'Standalone super administrator',
            username: 'admin@idp.local',
            password: 'StandaloneIAM!SuperAdmin2026',
            note: 'Validates direct sign-in for the default standalone IAM realm.',
        },
        {
            label: 'Standalone tenant administrator',
            username: 'alex.morgan@northstar.example',
            password: 'StandaloneIAM!TenantAdmin2026',
            note: 'Validates tenant-scoped administration through the default standalone IAM realm.',
        },
        {
            label: 'Platform default admin',
            username: 'platform.admin',
            password: 'StandaloneIAM!PlatformAdmin2026',
            note: 'Starts with VERIFY_EMAIL so the required-actions and email-verification flow can be exercised immediately.',
        },
    ],
    'realm-training-validation': [
        {
            label: 'Training instructor',
            username: 'training.instructor',
            password: 'StandaloneIAM!Instructor2026',
            note: 'Validates the instructional and delegated-administration flows.',
        },
        {
            label: 'Training learner',
            username: 'training.learner',
            password: 'StandaloneIAM!Learner2026',
            note: 'Validates learner-facing flows, consents, and account self-service.',
        },
    ],
    'realm-developer-validation': [
        {
            label: 'Developer realm administrator',
            username: 'developer.admin',
            password: 'StandaloneIAM!DeveloperAdmin2026',
            note: 'Validates developer-portal administration, scopes, clients, and service-account governance.',
        },
        {
            label: 'Developer service operator',
            username: 'developer.operator',
            password: 'StandaloneIAM!DeveloperOperator2026',
            note: 'Validates runtime client and service-account operations in the developer validation realm.',
        },
    ],
    'realm-cms-validation': [
        {
            label: 'CMS realm administrator',
            username: 'cms.admin',
            password: 'StandaloneIAM!CmsAdmin2026',
            note: 'Validates CMS administration access through a dedicated validation realm.',
        },
        {
            label: 'CMS content editor',
            username: 'cms.editor',
            password: 'StandaloneIAM!CmsEditor2026',
            note: 'Starts with UPDATE_PROFILE so the realm can validate editor-facing required actions and account flows.',
        },
    ],
    'realm-partner-embedded-validation': [
        {
            label: 'Partner realm administrator',
            username: 'partner.admin',
            password: 'StandaloneIAM!PartnerAdmin2026',
            note: 'Validates partner-isolated administration across embedded OIDC and SAML validation paths.',
        },
        {
            label: 'Partner embedded user',
            username: 'partner.embedded',
            password: 'StandaloneIAM!PartnerEmbedded2026',
            note: 'Validates the standard embedded-user posture for partner-facing application flows.',
        },
    ],
};
function normalizeClientSelection(realm, requestedClientId) {
    if (!realm) {
        return '';
    }
    if (requestedClientId && realm.clients.some((client) => client.client_id === requestedClientId)) {
        return requestedClientId;
    }
    return realm.clients[0]?.client_id ?? '';
}
function normalizeInternalIamNextPath(candidate) {
    if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//') || candidate.startsWith('/iam/login')) {
        return '/iam/account';
    }
    return candidate;
}
function containsAmbiguousIdentifier(value) {
    return /\s+or\s+/i.test(value.trim());
}
export function IamLogin() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const authorizationRequestId = searchParams.get('authorization_request_id');
    const samlRequestId = searchParams.get('saml_request_id');
    const loginHint = searchParams.get('login_hint')?.trim() ?? '';
    const flowContext = searchParams.get('flow_context')?.trim() ?? '';
    const loggedOut = searchParams.get('logged_out') === '1';
    const isInviteActivation = flowContext === 'invite_activation';
    const isAccountActivation = flowContext === 'account_activation';
    const isActivationFlow = isInviteActivation || isAccountActivation;
    const deviceUserCode = searchParams.get('device_user_code')?.trim() ?? '';
    const deviceVerificationRequested = searchParams.get('flow') === 'device' || deviceUserCode.length > 0;
    const nextPath = useMemo(() => normalizeInternalIamNextPath(searchParams.get('next')), [searchParams]);
    const [catalog, setCatalog] = useState([]);
    const [loadingCatalog, setLoadingCatalog] = useState(true);
    const [realmId, setRealmId] = useState('');
    const [clientId, setClientId] = useState('');
    const [authorizationRequest, setAuthorizationRequest] = useState(null);
    const [samlRequest, setSamlRequest] = useState(null);
    const [brokers, setBrokers] = useState([]);
    const [experience, setExperience] = useState(null);
    const [selectedBrokerAlias, setSelectedBrokerAlias] = useState('');
    const [brokerIdentifier, setBrokerIdentifier] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginResponse, setLoginResponse] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [requiredProfile, setRequiredProfile] = useState({ first_name: '', last_name: '', email: '', new_password: '' });
    const [mfaCode, setMfaCode] = useState('');
    const [emailVerificationTicketId, setEmailVerificationTicketId] = useState('');
    const [emailVerificationCode, setEmailVerificationCode] = useState('');
    const [resetIdentifier, setResetIdentifier] = useState('');
    const [resetTicketId, setResetTicketId] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [resetPassword, setResetPassword] = useState('');
    const [authorizationContinuationAttempted, setAuthorizationContinuationAttempted] = useState(false);
    const [samlContinuationAttempted, setSamlContinuationAttempted] = useState(false);
    const [deviceVerificationAttempted, setDeviceVerificationAttempted] = useState(false);
    useEffect(() => {
        if (!authorizationRequestId && !samlRequestId && !deviceVerificationRequested) {
            clearIamSession();
        }
    }, [authorizationRequestId, samlRequestId, deviceVerificationRequested]);
    useEffect(() => {
        if (loggedOut) {
            toast.dismiss();
        }
    }, [loggedOut]);
    useEffect(() => {
        if (!loginHint) {
            return;
        }
        setUsername((current) => (current.trim().length > 0 ? current : loginHint));
        setResetIdentifier((current) => (current.trim().length > 0 ? current : loginHint));
        setRequiredProfile((current) => (current.email.trim().length > 0
            ? current
            : { ...current, email: loginHint }));
    }, [loginHint]);
    useEffect(() => {
        let mounted = true;
        const requestedRealm = searchParams.get('realm');
        const requestedClientId = searchParams.get('client_id');
        const loadCatalog = async () => {
            try {
                const response = await idpApi.getIamPublicCatalog();
                if (!mounted) {
                    return;
                }
                setCatalog(response.realms);
                const selectedRealm = response.realms.find((realm) => realm.id === requestedRealm) ?? response.realms[0];
                setRealmId(selectedRealm?.id ?? '');
                setClientId(normalizeClientSelection(selectedRealm, requestedClientId));
            }
            catch (error) {
                console.error('Failed to load IAM catalog:', error);
                toast.error('Failed to load IAM realm catalog');
            }
            finally {
                if (mounted) {
                    setLoadingCatalog(false);
                }
            }
        };
        loadCatalog();
        return () => {
            mounted = false;
        };
    }, [searchParams]);
    const selectedRealm = useMemo(() => catalog.find((realm) => realm.id === realmId) ?? null, [catalog, realmId]);
    const validationAccounts = useMemo(() => validationAccountsByRealm[realmId] ?? [], [realmId]);
    const validationAccountsState = useMemo(() => {
        if (loadingCatalog) {
            return 'loading';
        }
        if (!selectedRealm) {
            return 'unresolved';
        }
        if (validationAccounts.length === 0) {
            return 'empty';
        }
        return 'ready';
    }, [loadingCatalog, selectedRealm, validationAccounts.length]);
    useEffect(() => {
        if (!selectedRealm) {
            return;
        }
        setClientId((current) => normalizeClientSelection(selectedRealm, current || null));
    }, [selectedRealm]);
    useEffect(() => {
        if (!realmId) {
            setBrokers([]);
            setSelectedBrokerAlias('');
            setExperience(null);
            return;
        }
        let mounted = true;
        const loadRealmExperience = async () => {
            try {
                const [brokerResponse, experienceResponse] = await Promise.all([
                    idpApi.listIamRealmBrokers(realmId),
                    idpApi.getIamRealmExperience(realmId),
                ]);
                if (!mounted) {
                    return;
                }
                setBrokers(brokerResponse.brokers);
                setExperience(experienceResponse);
                setSelectedBrokerAlias((current) => {
                    if (current && brokerResponse.brokers.some((broker) => broker.alias === current)) {
                        return current;
                    }
                    return brokerResponse.brokers[0]?.alias ?? '';
                });
            }
            catch (error) {
                console.error('Failed to load IAM brokers:', error);
                if (mounted) {
                    setBrokers([]);
                    setSelectedBrokerAlias('');
                    setExperience(null);
                }
            }
        };
        void loadRealmExperience();
        return () => {
            mounted = false;
        };
    }, [realmId]);
    useEffect(() => {
        if (!realmId || !authorizationRequestId) {
            setAuthorizationRequest(null);
            setAuthorizationContinuationAttempted(false);
            return;
        }
        let mounted = true;
        const loadAuthorizationRequest = async () => {
            try {
                const response = await idpApi.getIamAuthorizationRequest(realmId, authorizationRequestId);
                if (!mounted) {
                    return;
                }
                setAuthorizationRequest(response);
                setAuthorizationContinuationAttempted(false);
            }
            catch (error) {
                console.error('Failed to load IAM authorization request:', error);
                toast.error(error?.response?.data?.error ?? 'Failed to load IAM authorization request');
            }
        };
        void loadAuthorizationRequest();
        return () => {
            mounted = false;
        };
    }, [realmId, authorizationRequestId]);
    useEffect(() => {
        if (!realmId || !samlRequestId) {
            setSamlRequest(null);
            setSamlContinuationAttempted(false);
            return;
        }
        let mounted = true;
        const loadSamlRequest = async () => {
            try {
                const response = await idpApi.getIamSamlAuthRequest(realmId, samlRequestId);
                if (!mounted) {
                    return;
                }
                setSamlRequest(response);
                setSamlContinuationAttempted(false);
            }
            catch (error) {
                console.error('Failed to load IAM SAML request:', error);
                toast.error(error?.response?.data?.error ?? 'Failed to load IAM SAML request');
            }
        };
        void loadSamlRequest();
        return () => {
            mounted = false;
        };
    }, [realmId, samlRequestId]);
    useEffect(() => {
        setDeviceVerificationAttempted(false);
    }, [realmId, deviceUserCode]);
    const localeStrings = useMemo(() => {
        if (!experience) {
            return {};
        }
        return experience.localization.translations[experience.localization.default_locale] ?? {};
    }, [experience]);
    const translate = (key, fallback) => {
        const value = localeStrings[key];
        return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
    };
    const buildAuthorizationErrorRedirect = (error, description) => {
        if (!authorizationRequest) {
            return null;
        }
        const url = new URL(authorizationRequest.request.redirect_uri);
        url.searchParams.set('error', error);
        if (description) {
            url.searchParams.set('error_description', description);
        }
        if (authorizationRequest.request.state) {
            url.searchParams.set('state', authorizationRequest.request.state);
        }
        return url.toString();
    };
    const continueAuthorization = async (sessionId) => {
        if (!authorizationRequestId) {
            return false;
        }
        const response = await idpApi.continueIamAuthorizationRequest(realmId, authorizationRequestId, sessionId);
        if (response.status === 'AUTHORIZED' && response.redirect_url) {
            window.location.assign(response.redirect_url);
            return true;
        }
        if (response.status === 'ERROR') {
            if (response.redirect_url) {
                window.location.assign(response.redirect_url);
                return true;
            }
            toast.error(response.error_description ?? response.error ?? 'Authorization request failed');
            return false;
        }
        if (response.login_response) {
            setLoginResponse(response.login_response);
        }
        return false;
    };
    const submitSamlResponse = (response) => {
        if (!response.acs_url || !response.saml_response) {
            return;
        }
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = response.acs_url;
        form.style.display = 'none';
        const samlField = document.createElement('input');
        samlField.type = 'hidden';
        samlField.name = 'SAMLResponse';
        samlField.value = response.saml_response;
        form.appendChild(samlField);
        if (response.relay_state) {
            const relayField = document.createElement('input');
            relayField.type = 'hidden';
            relayField.name = 'RelayState';
            relayField.value = response.relay_state;
            form.appendChild(relayField);
        }
        document.body.appendChild(form);
        form.submit();
    };
    const continueSamlRequest = async (sessionId) => {
        if (!samlRequestId) {
            return false;
        }
        const response = await idpApi.continueIamSamlAuthRequest(realmId, samlRequestId, sessionId, clientId || undefined);
        if (response.status === 'AUTHORIZED' && response.acs_url && response.saml_response) {
            submitSamlResponse(response);
            return true;
        }
        if (response.status === 'INTERACTION_REQUIRED' && response.login_response) {
            setLoginResponse(response.login_response);
            return false;
        }
        if (response.status === 'ERROR') {
            toast.error(response.error_description ?? response.error ?? 'SAML request failed');
            return false;
        }
        return false;
    };
    const continueDeviceVerification = async (sessionId) => {
        if (!deviceUserCode) {
            return false;
        }
        await idpApi.verifyIamDeviceAuthorization(realmId, deviceUserCode, sessionId, true);
        toast.success(`Device authorization ${deviceUserCode} approved`);
        navigate('/iam/account');
        return true;
    };
    const handleAuthenticated = async (response) => {
        if (!response.session_id) {
            return;
        }
        setCurrentIamRealmId(response.realm_id);
        setCurrentIamSessionId(response.session_id);
        if (authorizationRequestId) {
            const redirected = await continueAuthorization(response.session_id);
            if (redirected) {
                return;
            }
            return;
        }
        if (samlRequestId) {
            const handled = await continueSamlRequest(response.session_id);
            if (handled) {
                return;
            }
            return;
        }
        if (deviceVerificationRequested) {
            const handled = await continueDeviceVerification(response.session_id);
            if (handled) {
                return;
            }
        }
        toast.success('IAM account session established');
        navigate(nextPath, { replace: true });
    };
    useEffect(() => {
        if (!authorizationRequest || !realmId || authorizationContinuationAttempted) {
            return;
        }
        const activeSessionId = getCurrentIamSessionId();
        const activeSessionRealmId = getCurrentIamRealmId();
        if (!activeSessionId || activeSessionRealmId !== realmId) {
            if (authorizationRequest.request.prompt_values.includes('none')) {
                const redirectUrl = buildAuthorizationErrorRedirect('login_required', 'An existing IAM session is required');
                if (redirectUrl) {
                    window.location.assign(redirectUrl);
                }
            }
            return;
        }
        if (!authorizationRequest.can_auto_continue) {
            return;
        }
        setAuthorizationContinuationAttempted(true);
        void continueAuthorization(activeSessionId);
    }, [authorizationRequest, authorizationContinuationAttempted, realmId]);
    useEffect(() => {
        if (!samlRequest || !realmId || samlContinuationAttempted) {
            return;
        }
        const activeSessionId = getCurrentIamSessionId();
        const activeSessionRealmId = getCurrentIamRealmId();
        if (!activeSessionId || activeSessionRealmId !== realmId || !samlRequest.can_auto_continue) {
            return;
        }
        setSamlContinuationAttempted(true);
        void continueSamlRequest(activeSessionId).catch((error) => {
            console.error('Failed to continue IAM SAML request:', error);
            toast.error('Failed to continue SAML authentication request');
        });
    }, [samlRequest, samlContinuationAttempted, realmId]);
    useEffect(() => {
        if (!deviceVerificationRequested || !deviceUserCode || !realmId || deviceVerificationAttempted) {
            return;
        }
        const activeSessionId = getCurrentIamSessionId();
        const activeSessionRealmId = getCurrentIamRealmId();
        if (!activeSessionId || activeSessionRealmId !== realmId) {
            return;
        }
        setDeviceVerificationAttempted(true);
        void continueDeviceVerification(activeSessionId).catch((error) => {
            console.error('Failed to continue IAM device verification:', error);
            toast.error('Failed to approve device authorization');
        });
    }, [deviceUserCode, deviceVerificationAttempted, deviceVerificationRequested, realmId]);
    const handleLogin = async () => {
        if (!realmId || !username.trim() || !password.trim()) {
            toast.error('Realm, username, and password are required');
            return;
        }
        if (containsAmbiguousIdentifier(username)) {
            toast.error('Enter either a username or an email address, not both in one field');
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await idpApi.loginIamBrowser(realmId, {
                username,
                password,
                client_id: clientId || undefined,
            });
            setLoginResponse(response);
            if (response.next_step === 'AUTHENTICATED') {
                await handleAuthenticated(response);
            }
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'IAM login failed');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handlePasskeyLogin = async () => {
        if (!realmId || !username.trim()) {
            toast.error('Realm and username or email are required for passkey sign-in');
            return;
        }
        if (containsAmbiguousIdentifier(username)) {
            toast.error('Enter either a username or an email address, not both in one field');
            return;
        }
        setIsSubmitting(true);
        try {
            const challenge = await idpApi.beginIamPasskeyLogin(realmId, {
                username_or_email: username.trim(),
                client_id: clientId || undefined,
            });
            const assertion = await completeIamSoftwarePasskeyAssertion({
                realm_id: challenge.realm_id,
                user_id: challenge.user_id,
                challenge_id: challenge.challenge_id,
                challenge: challenge.challenge,
                allowed_credential_ids: challenge.allowed_credentials.map((credential) => credential.credential_id),
            });
            const response = await idpApi.completeIamPasskeyLogin(realmId, {
                challenge_id: assertion.challenge_id,
                credential_id: assertion.credential_id,
                proof_signature: assertion.proof_signature,
            });
            setLoginResponse(response);
            toast.success(`Passkey verified on ${assertion.device_label}`);
            if (response.next_step === 'AUTHENTICATED') {
                await handleAuthenticated(response);
            }
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? error?.message ?? 'Passkey sign-in failed');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleBrokerLogin = async () => {
        if (!realmId || !selectedBrokerAlias || !brokerIdentifier.trim()) {
            toast.error('Realm, broker, and external username are required');
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await idpApi.loginIamBroker(realmId, selectedBrokerAlias, {
                external_username_or_email: brokerIdentifier.trim(),
                client_id: clientId || undefined,
            });
            setLoginResponse(response);
            if (response.next_step === 'AUTHENTICATED') {
                await handleAuthenticated(response);
            }
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Broker login failed');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleRequiredActions = async () => {
        if (!loginResponse?.login_transaction_id) {
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await idpApi.completeIamRequiredActions(realmId, {
                login_transaction_id: loginResponse.login_transaction_id,
                first_name: requiredProfile.first_name || undefined,
                last_name: requiredProfile.last_name || undefined,
                email: requiredProfile.email || undefined,
                new_password: requiredProfile.new_password || undefined,
            });
            setLoginResponse(response);
            if (response.next_step === 'AUTHENTICATED') {
                await handleAuthenticated(response);
            }
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to complete required actions');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleConsent = async () => {
        if (!loginResponse?.login_transaction_id) {
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await idpApi.grantIamConsent(realmId, {
                login_transaction_id: loginResponse.login_transaction_id,
                approve: true,
            });
            setLoginResponse(response);
            if (response.next_step === 'AUTHENTICATED') {
                await handleAuthenticated(response);
            }
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to record consent');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleMfa = async () => {
        if (!loginResponse?.login_transaction_id || !mfaCode.trim()) {
            toast.error('Enter the MFA code');
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await idpApi.verifyIamLoginMfa(realmId, {
                login_transaction_id: loginResponse.login_transaction_id,
                code: mfaCode,
            });
            setLoginResponse(response);
            if (response.next_step === 'AUTHENTICATED') {
                await handleAuthenticated(response);
            }
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to verify MFA');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleRequestEmailVerification = async () => {
        const identifier = requiredProfile.email || username;
        if (!identifier.trim()) {
            toast.error('Enter the email or username to verify');
            return;
        }
        try {
            const response = await idpApi.requestIamEmailVerification(realmId, {
                username_or_email: identifier,
            });
            setEmailVerificationTicketId(response.ticket_id);
            toast.success(`Verification code: ${response.code_preview}`);
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to request email verification');
        }
    };
    const handleConfirmEmailVerification = async () => {
        if (!emailVerificationTicketId || !emailVerificationCode.trim()) {
            toast.error('Enter the verification ticket and code');
            return;
        }
        try {
            await idpApi.confirmIamEmailVerification(realmId, {
                ticket_id: emailVerificationTicketId,
                code: emailVerificationCode,
            });
            toast.success('Email verification completed');
            setEmailVerificationCode('');
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to confirm email verification');
        }
    };
    const handleRequestPasswordReset = async () => {
        if (!resetIdentifier.trim()) {
            toast.error('Enter the email or username to reset');
            return;
        }
        try {
            const response = await idpApi.requestIamPasswordReset(realmId, {
                username_or_email: resetIdentifier,
            });
            setResetTicketId(response.ticket_id);
            toast.success(`Password reset code: ${response.code_preview}`);
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to request password reset');
        }
    };
    const handleConfirmPasswordReset = async () => {
        if (!resetTicketId || !resetCode.trim() || !resetPassword.trim()) {
            toast.error('Enter the reset ticket, code, and new password');
            return;
        }
        try {
            await idpApi.confirmIamPasswordReset(realmId, {
                ticket_id: resetTicketId,
                code: resetCode,
                new_password: resetPassword,
            });
            toast.success('Password reset completed');
            setResetCode('');
            setResetPassword('');
        }
        catch (error) {
            toast.error(error?.response?.data?.error ?? 'Failed to confirm password reset');
        }
    };
    return (_jsx(PublicSiteShell, { contentClassName: "py-10", children: _jsxs("div", { className: "grid gap-8 lg:grid-cols-[1.1fr_0.9fr]", children: [_jsxs("section", { className: "space-y-6", children: [_jsxs("div", { className: "rounded-[28px] border bg-white/90 p-8 shadow-xl shadow-slate-200/60 dark:bg-slate-900/80 dark:shadow-none", style: {
                                borderColor: experience?.theme.surface_tint ?? undefined,
                                backgroundImage: experience
                                    ? `linear-gradient(135deg, ${experience.theme.surface_tint}22 0%, transparent 42%)`
                                    : undefined,
                            }, children: [_jsxs("div", { className: "flex items-center gap-3 text-sky-700 dark:text-sky-300", children: [_jsx(KeyRound, { className: "h-5 w-5" }), _jsx("span", { className: "text-sm font-semibold uppercase tracking-[0.22em]", children: experience?.theme.brand_name ?? 'Standalone IAM' })] }), _jsx("h1", { className: "mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white", children: experience?.theme.login_title ?? translate('login_headline', 'Sign in to the reusable identity plane') }), _jsx("p", { className: "mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300", children: experience?.theme.login_subtitle ?? translate('login_subtitle', 'This login validates the standalone identity platform directly, including browser-auth, brokering, consent, MFA, and account-console runtime.') }), loggedOut ? (_jsx("div", { className: "mt-4 rounded-3xl border border-emerald-200 bg-emerald-50/80 px-4 py-4 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200", children: "You are signed out. Sign in again to start a new standalone IAM session." })) : null, authorizationRequest ? (_jsxs("div", { className: "mt-4 rounded-3xl border border-sky-200 bg-sky-50/80 px-4 py-4 text-sm text-slate-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-slate-200", children: [_jsx("p", { className: "font-semibold text-sky-900 dark:text-sky-200", children: "Authorization request in progress" }), _jsxs("p", { className: "mt-2", children: ["Client: ", _jsx("span", { className: "font-medium", children: authorizationRequest.request.client_name })] }), _jsxs("p", { className: "mt-1", children: ["Scopes: ", _jsx("span", { className: "font-medium", children: authorizationRequest.request.requested_scope_names.join(' ') || 'none' })] }), _jsxs("p", { className: "mt-1", children: ["Prompt: ", _jsx("span", { className: "font-medium", children: authorizationRequest.request.prompt_values.join(' ') || 'default' })] })] })) : null, !authorizationRequest && samlRequest ? (_jsxs("div", { className: "mt-4 rounded-3xl border border-violet-200 bg-violet-50/80 px-4 py-4 text-sm text-slate-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-slate-200", children: [_jsx("p", { className: "font-semibold text-violet-900 dark:text-violet-200", children: "SAML sign-in request in progress" }), _jsxs("p", { className: "mt-2", children: ["Client: ", _jsx("span", { className: "font-medium", children: samlRequest.request.client_name })] }), _jsxs("p", { className: "mt-1", children: ["ACS URL: ", _jsx("span", { className: "font-medium", children: samlRequest.request.acs_url })] }), _jsxs("p", { className: "mt-1", children: ["Binding: ", _jsx("span", { className: "font-medium", children: samlRequest.request.request_binding })] }), _jsxs("p", { className: "mt-1", children: ["Force authn: ", _jsx("span", { className: "font-medium", children: samlRequest.request.force_authn ? 'Yes' : 'No' })] })] })) : null, !authorizationRequest && deviceVerificationRequested ? (_jsxs("div", { className: "mt-4 rounded-3xl border border-emerald-200 bg-emerald-50/80 px-4 py-4 text-sm text-slate-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-slate-200", children: [_jsx("p", { className: "font-semibold text-emerald-900 dark:text-emerald-200", children: "Device authorization in progress" }), _jsxs("p", { className: "mt-2", children: ["User code: ", _jsx("span", { className: "font-mono font-medium", children: deviceUserCode })] }), _jsx("p", { className: "mt-1", children: "Sign in with a realm account to approve this device authorization request." })] })) : null, isActivationFlow ? (_jsxs("div", { className: "mt-4 rounded-3xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-slate-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-slate-200", children: [_jsx("p", { className: "font-semibold text-amber-900 dark:text-amber-200", children: isInviteActivation ? 'Invite activation in progress' : 'Account activation in progress' }), _jsxs("p", { className: "mt-2", children: ["Continue with ", _jsx("span", { className: "font-medium", children: loginHint || (isInviteActivation ? 'the invited email address' : 'the new account email address') }), ". ", isInviteActivation
                                                    ? 'If your organization issued a temporary password, use it for the first standalone IAM sign-in.'
                                                    : 'Use the password you just created for the first standalone IAM sign-in.', " Required actions such as email verification and password update will run here before the browser returns to the application."] })] })) : null, experience ? (_jsxs("div", { className: "mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400", children: [_jsx("span", { className: "rounded-full px-3 py-1 font-semibold", style: { backgroundColor: `${experience.theme.accent_color}22`, color: experience.theme.primary_color }, children: experience.theme.logo_label }), _jsx("span", { children: experience.localization.default_locale }), _jsx("span", { children: experience.theme.support_email })] })) : null, _jsxs("div", { className: "mt-8 grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Realm" }), _jsx("select", { value: realmId, onChange: (event) => setRealmId(event.target.value), className: "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", disabled: loadingCatalog || Boolean(authorizationRequest) || Boolean(samlRequest), children: catalog.map((realm) => (_jsx("option", { value: realm.id, children: realm.name }, realm.id))) })] }), _jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Client" }), _jsxs("select", { value: clientId, onChange: (event) => setClientId(event.target.value), className: "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", disabled: Boolean(authorizationRequest) || Boolean(samlRequest), children: [_jsx("option", { value: "", children: "Standalone account console" }), selectedRealm?.clients.map((client) => (_jsxs("option", { value: client.client_id, children: [client.name, " (", client.protocol, ")"] }, client.id)))] })] })] }), _jsxs("div", { className: "mt-4 grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Username or email" }), _jsx("input", { value: username, onChange: (event) => setUsername(event.target.value), className: "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", placeholder: loginHint || 'platform.admin' }), _jsxs("span", { className: "block text-xs leading-5 text-slate-500 dark:text-slate-400", children: ["Enter one identifier only, for example ", _jsx("code", { className: "rounded bg-slate-200 px-1 py-0.5 dark:bg-slate-800", children: "crew.admin" }), " or ", _jsx("code", { className: "rounded bg-slate-200 px-1 py-0.5 dark:bg-slate-800", children: "crew.admin@iam.local" }), "."] })] }), _jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Password" }), _jsx("input", { type: "password", value: password, onChange: (event) => setPassword(event.target.value), className: "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", placeholder: "Enter password" })] })] }), _jsxs("div", { className: "mt-6 flex flex-wrap items-center gap-3", children: [_jsx("button", { type: "button", onClick: handleLogin, disabled: isSubmitting || loadingCatalog, className: "rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950", children: isSubmitting ? 'Submitting…' : 'Sign In' }), _jsx("button", { type: "button", onClick: handlePasskeyLogin, disabled: isSubmitting || loadingCatalog, className: "rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 disabled:opacity-50 dark:border-slate-700 dark:text-slate-100", children: isSubmitting ? 'Submitting…' : 'Use Passkey' }), _jsx(Link, { to: "/iam", className: "rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200", children: "Open Admin Console" })] }), experience?.public_links.signup_url ? (_jsx("div", { className: "mt-4", children: _jsx("a", { href: experience.public_links.signup_url, className: "text-sm font-medium text-sky-700 underline decoration-sky-300 underline-offset-4 hover:text-sky-600 dark:text-sky-300 dark:decoration-sky-700", children: "Create account" }) })) : null, _jsx("p", { className: "mt-3 text-xs leading-6 text-slate-500 dark:text-slate-400", children: "Passkey sign-in uses the standalone IAM validation credential store on this browser. If no local passkey is registered for this account on this device, enroll one from the IAM account console first." }), brokers.length > 0 && (_jsxs("div", { className: "mt-8 rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/50", children: [_jsxs("div", { className: "flex items-center gap-3 text-slate-700 dark:text-slate-200", children: [_jsx(ShieldCheck, { className: "h-5 w-5" }), _jsx("h2", { className: "text-lg font-semibold", children: translate('broker_label', 'Broker-first sign in') })] }), _jsx("p", { className: "mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300", children: "Use an external OIDC or SAML broker and continue through the same required-actions, consent, MFA, and session runtime after link resolution." }), _jsxs("div", { className: "mt-4 grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Broker" }), _jsx("select", { value: selectedBrokerAlias, onChange: (event) => setSelectedBrokerAlias(event.target.value), className: "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", children: brokers.map((broker) => (_jsxs("option", { value: broker.alias, children: [broker.name, " (", broker.protocol, ")"] }, broker.id))) })] }), _jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "External username or email" }), _jsx("input", { value: brokerIdentifier, onChange: (event) => setBrokerIdentifier(event.target.value), className: "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", placeholder: "training.learner" })] })] }), _jsx("div", { className: "mt-4 flex flex-wrap gap-3", children: _jsx("button", { type: "button", onClick: handleBrokerLogin, disabled: isSubmitting, className: "rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 disabled:opacity-50 dark:border-slate-700 dark:text-slate-100", children: isSubmitting ? 'Submitting…' : 'Continue with Broker' }) })] }))] }), loginResponse?.next_step === 'REQUIRED_ACTIONS' && (_jsxs("div", { className: "rounded-[28px] border border-amber-200 bg-amber-50 p-8 dark:border-amber-900/60 dark:bg-amber-950/30", children: [_jsxs("div", { className: "flex items-center gap-3 text-amber-700 dark:text-amber-300", children: [_jsx(MailCheck, { className: "h-5 w-5" }), _jsx("h2", { className: "text-lg font-semibold", children: "Required actions" })] }), _jsx("p", { className: "mt-3 text-sm text-amber-900/80 dark:text-amber-100/80", children: "Complete the user lifecycle actions before the IAM session can be established." }), _jsxs("div", { className: "mt-5 grid gap-4 md:grid-cols-2", children: [loginResponse.pending_required_actions.includes('UPDATE_PROFILE') && (_jsxs(_Fragment, { children: [_jsx("input", { value: requiredProfile.first_name, onChange: (event) => setRequiredProfile((current) => ({ ...current, first_name: event.target.value })), className: "rounded-2xl border border-amber-200 bg-white px-4 py-3 text-slate-900 dark:border-amber-800 dark:bg-slate-950 dark:text-white", placeholder: "First name" }), _jsx("input", { value: requiredProfile.last_name, onChange: (event) => setRequiredProfile((current) => ({ ...current, last_name: event.target.value })), className: "rounded-2xl border border-amber-200 bg-white px-4 py-3 text-slate-900 dark:border-amber-800 dark:bg-slate-950 dark:text-white", placeholder: "Last name" }), _jsx("input", { value: requiredProfile.email, onChange: (event) => setRequiredProfile((current) => ({ ...current, email: event.target.value })), className: "md:col-span-2 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-slate-900 dark:border-amber-800 dark:bg-slate-950 dark:text-white", placeholder: "Email address" })] })), loginResponse.pending_required_actions.includes('UPDATE_PASSWORD') && (_jsx("input", { value: requiredProfile.new_password, onChange: (event) => setRequiredProfile((current) => ({ ...current, new_password: event.target.value })), type: "password", className: "md:col-span-2 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-slate-900 dark:border-amber-800 dark:bg-slate-950 dark:text-white", placeholder: "New password" }))] }), loginResponse.pending_required_actions.includes('VERIFY_EMAIL') && (_jsxs("div", { className: "mt-5 space-y-3 rounded-2xl border border-amber-200 bg-white/70 p-4 dark:border-amber-800 dark:bg-slate-950/40", children: [_jsx("p", { className: "text-sm text-slate-700 dark:text-slate-200", children: "Email verification is required for this realm account." }), _jsx("div", { className: "flex flex-wrap gap-3", children: _jsx("button", { type: "button", onClick: handleRequestEmailVerification, className: "rounded-full border border-amber-300 px-4 py-2 text-sm font-medium text-amber-900 dark:border-amber-700 dark:text-amber-100", children: "Issue verification code" }) }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsx("input", { value: emailVerificationTicketId, onChange: (event) => setEmailVerificationTicketId(event.target.value), className: "rounded-2xl border border-amber-200 bg-white px-4 py-3 text-slate-900 dark:border-amber-800 dark:bg-slate-950 dark:text-white", placeholder: "Verification ticket" }), _jsx("input", { value: emailVerificationCode, onChange: (event) => setEmailVerificationCode(event.target.value), className: "rounded-2xl border border-amber-200 bg-white px-4 py-3 text-slate-900 dark:border-amber-800 dark:bg-slate-950 dark:text-white", placeholder: "Verification code" })] }), _jsx("button", { type: "button", onClick: handleConfirmEmailVerification, className: "rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white", children: "Confirm email verification" })] })), _jsx("div", { className: "mt-5", children: _jsx("button", { type: "button", onClick: handleRequiredActions, disabled: isSubmitting, className: "rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50", children: "Continue login flow" }) })] })), loginResponse?.next_step === 'CONSENT_REQUIRED' && (_jsxs("div", { className: "rounded-[28px] border border-sky-200 bg-sky-50 p-8 dark:border-sky-900/60 dark:bg-sky-950/30", children: [_jsxs("div", { className: "flex items-center gap-3 text-sky-700 dark:text-sky-300", children: [_jsx(ShieldCheck, { className: "h-5 w-5" }), _jsx("h2", { className: "text-lg font-semibold", children: "Client consent required" })] }), _jsxs("p", { className: "mt-3 text-sm text-slate-700 dark:text-slate-200", children: [loginResponse.client?.name ?? 'This client', " is requesting access to these scopes:"] }), _jsx("div", { className: "mt-4 flex flex-wrap gap-2", children: loginResponse.pending_scope_consent.map((scope) => (_jsx("span", { className: "rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200", children: scope }, scope))) }), _jsx("div", { className: "mt-5", children: _jsx("button", { type: "button", onClick: handleConsent, disabled: isSubmitting, className: "rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50", children: "Approve consent" }) })] })), loginResponse?.next_step === 'MFA_REQUIRED' && (_jsxs("div", { className: "rounded-[28px] border border-emerald-200 bg-emerald-50 p-8 dark:border-emerald-900/60 dark:bg-emerald-950/30", children: [_jsxs("div", { className: "flex items-center gap-3 text-emerald-700 dark:text-emerald-300", children: [_jsx(ShieldCheck, { className: "h-5 w-5" }), _jsx("h2", { className: "text-lg font-semibold", children: "Multi-factor authentication" })] }), _jsx("p", { className: "mt-3 text-sm text-slate-700 dark:text-slate-200", children: "Enter the current authenticator code or one of the remaining backup codes to complete the browser login." }), _jsxs("div", { className: "mt-5 flex flex-wrap gap-3", children: [_jsx("input", { value: mfaCode, onChange: (event) => setMfaCode(event.target.value), className: "min-w-[240px] rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-slate-900 dark:border-emerald-800 dark:bg-slate-950 dark:text-white", placeholder: "MFA or backup code" }), _jsx("button", { type: "button", onClick: handleMfa, disabled: isSubmitting, className: "rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50", children: "Verify MFA" })] })] }))] }), _jsxs("aside", { className: "space-y-6", children: [_jsxs("div", { className: "rounded-[28px] border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none", children: [_jsxs("div", { className: "flex items-center gap-3 text-slate-700 dark:text-slate-200", children: [_jsx(LockKeyhole, { className: "h-5 w-5" }), _jsx("h2", { className: "text-lg font-semibold", children: "Recovery and validation" })] }), _jsx("p", { className: "mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300", children: "These flows validate password reset and verification without depending on any downstream application session or external mail delivery." }), _jsxs("div", { className: "mt-6 space-y-3", children: [_jsx("input", { value: resetIdentifier, onChange: (event) => setResetIdentifier(event.target.value), className: "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", placeholder: "Username or email for reset" }), _jsx("button", { type: "button", onClick: handleRequestPasswordReset, className: "rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200", children: "Issue password reset code" }), _jsx("input", { value: resetTicketId, onChange: (event) => setResetTicketId(event.target.value), className: "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", placeholder: "Reset ticket" }), _jsx("input", { value: resetCode, onChange: (event) => setResetCode(event.target.value), className: "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", placeholder: "Reset code" }), _jsx("input", { value: resetPassword, onChange: (event) => setResetPassword(event.target.value), type: "password", className: "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", placeholder: "New password" }), _jsx("button", { type: "button", onClick: handleConfirmPasswordReset, className: "rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950", children: "Confirm password reset" })] })] }), _jsxs("div", { className: "rounded-[28px] border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none", children: [_jsx("h2", { className: "text-lg font-semibold text-slate-950 dark:text-white", children: "Validation accounts" }), _jsxs("div", { className: "mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300", children: [_jsxs("p", { children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: "Realm:" }), " `", selectedRealm?.name ?? realmId ?? 'Unknown realm', "`"] }), validationAccountsState === 'loading' ? (_jsx("p", { children: "Loading realm-specific validation accounts." })) : validationAccountsState === 'unresolved' ? (_jsx("p", { children: "The selected realm is not published in the current catalog." })) : validationAccountsState === 'ready' ? (_jsx("div", { className: "space-y-3", children: validationAccounts.map((account) => (_jsxs("button", { type: "button", onClick: () => {
                                                    setUsername(account.username);
                                                    setPassword(account.password);
                                                    setResetIdentifier(account.username);
                                                }, className: "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950/60 dark:hover:bg-slate-900", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: account.label }), _jsx("div", { className: "mt-1 font-mono text-xs text-slate-600 dark:text-slate-300", children: account.username }), _jsx("div", { className: "mt-1 font-mono text-xs text-slate-600 dark:text-slate-300", children: account.password }), _jsx("p", { className: "mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400", children: account.note })] }, `${realmId}-${account.username}`))) })) : (_jsx("p", { children: "No realm-specific validation account is published for this realm yet." })), brokers.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("p", { className: "pt-3", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: "Broker demo:" }), " `training.learner` through `training-oidc-broker`"] }), _jsx("p", { className: "text-xs leading-6 text-slate-500 dark:text-slate-400", children: "That path proves broker-first login, auto-link, and continuation through the same standalone session runtime." })] }))] })] })] })] }) }));
}
