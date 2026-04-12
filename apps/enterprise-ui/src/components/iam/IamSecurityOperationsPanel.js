import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, KeyRound, Lock, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { idpApi, } from '../../services/standaloneApi';
function emptyPasswordResetForm() {
    return {
        newPassword: '',
        forceUpdateOnLogin: true,
        revokeExistingSessions: true,
        clearLockout: true,
    };
}
export function IamSecurityOperationsPanel({ selectedRealmId, canManage, }) {
    const [users, setUsers] = useState([]);
    const [securitySummary, setSecuritySummary] = useState(null);
    const [validationSummary, setValidationSummary] = useState(null);
    const [securityEvents, setSecurityEvents] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [userSecurity, setUserSecurity] = useState(null);
    const [loginHistory, setLoginHistory] = useState(null);
    const [passwordResetForm, setPasswordResetForm] = useState(emptyPasswordResetForm);
    const [lastIssuedPassword, setLastIssuedPassword] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const loadPanel = async (preferredUserId) => {
        if (!selectedRealmId) {
            setUsers([]);
            setSelectedUserId('');
            setUserSecurity(null);
            setLoginHistory(null);
            return;
        }
        setIsLoading(true);
        try {
            const [userResponse, securityResponse, validationResponse, eventResponse] = await Promise.all([
                idpApi.listIamUsers({ realmId: selectedRealmId }),
                idpApi.getIamSecuritySummary(),
                idpApi.getIamValidationSummary(),
                idpApi.listIamSecurityEvents({ realmId: selectedRealmId, limit: 12 }),
            ]);
            const realmUsers = userResponse.users.filter((user) => user.realm_id === selectedRealmId);
            const nextUserId = preferredUserId && realmUsers.some((user) => user.id === preferredUserId)
                ? preferredUserId
                : realmUsers[0]?.id ?? '';
            setUsers(realmUsers);
            setSelectedUserId(nextUserId);
            setSecuritySummary(securityResponse);
            setValidationSummary(validationResponse);
            setSecurityEvents(eventResponse.events);
            if (nextUserId) {
                const [userSecurityResponse, loginHistoryResponse] = await Promise.all([
                    idpApi.getIamUserSecuritySummary(nextUserId),
                    idpApi.getIamUserLoginHistory(nextUserId, 20),
                ]);
                setUserSecurity(userSecurityResponse);
                setLoginHistory(loginHistoryResponse);
            }
            else {
                setUserSecurity(null);
                setLoginHistory(null);
            }
        }
        catch (error) {
            console.error('Failed to load IAM security operations panel', error);
            toast.error('Failed to load IAM security operations');
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        void loadPanel(selectedUserId);
    }, [selectedRealmId]);
    useEffect(() => {
        if (!selectedUserId) {
            setUserSecurity(null);
            setLoginHistory(null);
            return;
        }
        void (async () => {
            try {
                const [userSecurityResponse, loginHistoryResponse] = await Promise.all([
                    idpApi.getIamUserSecuritySummary(selectedUserId),
                    idpApi.getIamUserLoginHistory(selectedUserId, 20),
                ]);
                setUserSecurity(userSecurityResponse);
                setLoginHistory(loginHistoryResponse);
            }
            catch (error) {
                console.error('Failed to load IAM user security detail', error);
                toast.error('Failed to load IAM user security detail');
            }
        })();
    }, [selectedUserId]);
    const selectedUser = useMemo(() => users.find((user) => user.id === selectedUserId) ?? null, [users, selectedUserId]);
    const handlePasswordReset = async (event) => {
        event.preventDefault();
        if (!selectedUserId) {
            toast.error('Select a user first');
            return;
        }
        setIsSaving(true);
        try {
            const response = await idpApi.resetIamUserPassword(selectedUserId, {
                new_password: passwordResetForm.newPassword.trim() || undefined,
                force_update_on_login: passwordResetForm.forceUpdateOnLogin,
                revoke_existing_sessions: passwordResetForm.revokeExistingSessions,
                clear_lockout: passwordResetForm.clearLockout,
            });
            setLastIssuedPassword(response.issued_temporary_password);
            setPasswordResetForm(emptyPasswordResetForm());
            toast.success('Standalone IAM password reset completed');
            await loadPanel(selectedUserId);
        }
        catch (error) {
            console.error('Failed to reset IAM user password', error);
            toast.error('Failed to reset IAM user password');
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleRevokeSessions = async () => {
        if (!selectedUserId) {
            toast.error('Select a user first');
            return;
        }
        setIsSaving(true);
        try {
            await idpApi.revokeIamUserSessions(selectedUserId, { revoke_tokens: true });
            toast.success('Standalone IAM sessions revoked');
            await loadPanel(selectedUserId);
        }
        catch (error) {
            console.error('Failed to revoke IAM sessions', error);
            toast.error('Failed to revoke IAM sessions');
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleClearLockout = async () => {
        if (!selectedUserId) {
            toast.error('Select a user first');
            return;
        }
        setIsSaving(true);
        try {
            await idpApi.clearIamUserLockout(selectedUserId);
            toast.success('Standalone IAM lockout cleared');
            await loadPanel(selectedUserId);
        }
        catch (error) {
            console.error('Failed to clear IAM lockout', error);
            toast.error('Failed to clear IAM lockout');
        }
        finally {
            setIsSaving(false);
        }
    };
    return (_jsxs("section", { className: "space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsx("div", { className: "flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between", children: _jsxs("div", { children: [_jsxs("div", { className: "inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 dark:bg-rose-950/40 dark:text-rose-200", children: [_jsx(ShieldAlert, { className: "h-3.5 w-3.5" }), "Operations and Hardening"] }), _jsx("h2", { className: "mt-3 text-xl font-semibold text-slate-900 dark:text-white", children: "Security Operations" }), _jsx("p", { className: "mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400", children: "This panel validates the standalone IAM plane on its own terms: lockout behavior, failed-login telemetry, session and token invalidation, request-level audit logging, and review gates for interactive agentic development." })] }) }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: [_jsx(MetricCard, { icon: _jsx(AlertTriangle, { className: "h-5 w-5" }), label: "Failed Logins", value: String(securitySummary?.failed_login_attempt_count ?? 0), detail: "Standalone failed credential and MFA attempts" }), _jsx(MetricCard, { icon: _jsx(Lock, { className: "h-5 w-5" }), label: "Active Lockouts", value: String(securitySummary?.active_lockout_count ?? 0), detail: "Accounts currently throttled by the IAM plane" }), _jsx(MetricCard, { icon: _jsx(ShieldCheck, { className: "h-5 w-5" }), label: "Audited Requests", value: String(securitySummary?.request_audit.request_count ?? 0), detail: `${securitySummary?.request_audit.failure_count ?? 0} audited failures` }), _jsx(MetricCard, { icon: _jsx(KeyRound, { className: "h-5 w-5" }), label: "Admin Actions", value: String(securitySummary?.admin_security_actions ?? 0), detail: "Reset password, revoke sessions, clear lockout, validation review" })] }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-[1.05fr_0.95fr]", children: [_jsx("div", { className: "space-y-6", children: _jsxs("div", { className: "rounded-2xl border border-slate-200 p-5 dark:border-slate-800", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: "User Security Operations" }), _jsx("div", { className: "mt-1 text-sm text-slate-600 dark:text-slate-400", children: "Standalone user actions for review realms only. These actions do not touch downstream application auth." })] }), _jsxs("select", { value: selectedUserId, onChange: (event) => setSelectedUserId(event.target.value), className: "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200", children: [_jsx("option", { value: "", children: "Select user" }), users.map((user) => (_jsxs("option", { value: user.id, children: [user.username, " \u00B7 ", user.status] }, user.id)))] })] }), isLoading ? (_jsx("div", { className: "rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400", children: "Loading security posture\u2026" })) : !selectedUser || !userSecurity ? (_jsx("div", { className: "rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400", children: "Select a standalone IAM user to review lockout state, sessions, and login history." })) : (_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(SummaryRow, { label: "User", value: `${userSecurity.user.first_name} ${userSecurity.user.last_name}` }), _jsx(SummaryRow, { label: "Status", value: userSecurity.status }), _jsx(SummaryRow, { label: "MFA", value: userSecurity.mfa_enabled ? 'Enabled' : 'Not enabled' }), _jsx(SummaryRow, { label: "Email Verification", value: userSecurity.email_verified_at ? 'Verified' : 'Pending' }), _jsx(SummaryRow, { label: "Last Login", value: userSecurity.last_login_at ? new Date(userSecurity.last_login_at).toLocaleString() : 'Never' }), _jsx(SummaryRow, { label: "Last Failed Login", value: userSecurity.last_failed_login_at ? new Date(userSecurity.last_failed_login_at).toLocaleString() : 'None' }), _jsx(SummaryRow, { label: "Lockout Until", value: userSecurity.lockout_until ? new Date(userSecurity.lockout_until).toLocaleString() : 'Clear' }), _jsx(SummaryRow, { label: "Active Sessions / Tokens", value: `${userSecurity.active_session_count} / ${userSecurity.active_token_count}` })] }), _jsxs("form", { onSubmit: handlePasswordReset, className: "space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800", children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: "Administrative Password Reset" }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "New Password" }), _jsx("input", { value: passwordResetForm.newPassword, onChange: (event) => setPasswordResetForm((current) => ({ ...current, newPassword: event.target.value })), placeholder: "Leave blank to generate a temporary password", className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" })] }), _jsxs("div", { className: "space-y-2 text-sm", children: [_jsx("div", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Reset Options" }), _jsxs("label", { className: "flex items-center gap-2 text-slate-600 dark:text-slate-300", children: [_jsx("input", { type: "checkbox", checked: passwordResetForm.forceUpdateOnLogin, onChange: (event) => setPasswordResetForm((current) => ({ ...current, forceUpdateOnLogin: event.target.checked })) }), "Require password update on next login"] }), _jsxs("label", { className: "flex items-center gap-2 text-slate-600 dark:text-slate-300", children: [_jsx("input", { type: "checkbox", checked: passwordResetForm.revokeExistingSessions, onChange: (event) => setPasswordResetForm((current) => ({ ...current, revokeExistingSessions: event.target.checked })) }), "Revoke active sessions and tokens"] }), _jsxs("label", { className: "flex items-center gap-2 text-slate-600 dark:text-slate-300", children: [_jsx("input", { type: "checkbox", checked: passwordResetForm.clearLockout, onChange: (event) => setPasswordResetForm((current) => ({ ...current, clearLockout: event.target.checked })) }), "Clear lockout while resetting"] })] })] }), lastIssuedPassword && (_jsxs("div", { className: "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100", children: ["Temporary standalone password issued for review: ", _jsx("span", { className: "font-mono", children: lastIssuedPassword })] })), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx("button", { type: "submit", disabled: !canManage || isSaving, className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: isSaving ? 'Applying…' : 'Reset Password' }), _jsx("button", { type: "button", disabled: !canManage || isSaving, onClick: handleRevokeSessions, className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Revoke Sessions and Tokens" }), _jsx("button", { type: "button", disabled: !canManage || isSaving, onClick: handleClearLockout, className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Clear Lockout" })] })] }), _jsxs("div", { className: "rounded-2xl border border-slate-200 p-4 dark:border-slate-800", children: [_jsx("div", { className: "mb-3 text-sm font-semibold text-slate-900 dark:text-white", children: "Recent Login History" }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-xs uppercase tracking-[0.18em] text-slate-500", children: [_jsx("th", { className: "pb-3", children: "Time" }), _jsx("th", { className: "pb-3", children: "Outcome" }), _jsx("th", { className: "pb-3", children: "Client" }), _jsx("th", { className: "pb-3", children: "Summary" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-100 dark:divide-slate-800", children: (loginHistory?.login_attempts ?? []).map((attempt) => (_jsxs("tr", { children: [_jsx("td", { className: "py-3 text-slate-600 dark:text-slate-300", children: new Date(attempt.occurred_at).toLocaleString() }), _jsx("td", { className: "py-3", children: _jsx("span", { className: `rounded-full px-2.5 py-1 text-xs font-semibold ${attempt.outcome === 'SUCCESS'
                                                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                                                                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200'}`, children: attempt.outcome }) }), _jsx("td", { className: "py-3 text-slate-600 dark:text-slate-300", children: attempt.client_identifier ?? 'Direct' }), _jsx("td", { className: "py-3 text-slate-600 dark:text-slate-300", children: attempt.summary })] }, attempt.id))) })] }) })] })] }))] }) }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "rounded-2xl border border-slate-200 p-5 dark:border-slate-800", children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: "Validation Gates" }), _jsx("div", { className: "mt-4 space-y-3", children: (validationSummary?.checks ?? []).map((check) => (_jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsx("div", { className: "text-sm font-medium text-slate-900 dark:text-white", children: check.name }), _jsx("span", { className: `rounded-full px-2.5 py-1 text-xs font-semibold ${check.status === 'PASS'
                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'}`, children: check.status })] }), _jsx("div", { className: "mt-2 text-sm text-slate-600 dark:text-slate-300", children: check.summary })] }, check.id))) }), _jsxs("div", { className: "mt-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-900/40 dark:bg-sky-950/30", children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200", children: "Agentic Review Notes" }), _jsx("ul", { className: "mt-3 space-y-2 text-sm text-sky-900 dark:text-sky-100", children: (validationSummary?.agentic_development_notes ?? []).map((note) => (_jsx("li", { children: note }, note))) })] })] }), _jsxs("div", { className: "rounded-2xl border border-slate-200 p-5 dark:border-slate-800", children: [_jsxs("div", { className: "mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), "Recent Security Audit Events"] }), _jsx("div", { className: "space-y-3", children: securityEvents.map((event) => (_jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { className: "text-sm font-medium text-slate-900 dark:text-white", children: [event.method, " ", event.path] }), _jsx("span", { className: `rounded-full px-2.5 py-1 text-xs font-semibold ${event.outcome === 'SUCCESS'
                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                                                                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200'}`, children: event.status_code })] }), _jsxs("div", { className: "mt-1 text-sm text-slate-600 dark:text-slate-300", children: [event.category, " \u00B7 ", new Date(event.occurred_at).toLocaleString()] })] }, event.id))) })] })] })] })] }));
}
function MetricCard({ label, value, detail, icon, }) {
    return (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950", children: [_jsxs("div", { className: "flex items-center justify-between gap-3 text-slate-500 dark:text-slate-400", children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-[0.18em]", children: label }), icon] }), _jsx("div", { className: "mt-3 text-2xl font-semibold text-slate-900 dark:text-white", children: value }), _jsx("div", { className: "mt-2 text-sm text-slate-600 dark:text-slate-400", children: detail })] }));
}
function SummaryRow({ label, value, }) {
    return (_jsxs("div", { className: "rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800", children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: label }), _jsx("div", { className: "mt-2 text-sm text-slate-900 dark:text-white", children: value })] }));
}
