import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { idpApi } from '../../services/standaloneApi';
export function IamWebAuthnPanel({ selectedRealmId, canManage, }) {
    const [credentials, setCredentials] = useState([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (!selectedRealmId) {
            setCredentials([]);
            return;
        }
        let mounted = true;
        const load = async () => {
            setLoading(true);
            try {
                const response = await idpApi.listIamWebAuthnCredentials({ realm_id: selectedRealmId });
                if (mounted) {
                    setCredentials(response.credentials);
                }
            }
            catch (error) {
                console.error('Failed to load IAM WebAuthn credentials:', error);
                if (mounted) {
                    toast.error(error?.response?.data?.error ?? 'Failed to load IAM passkey credentials');
                }
            }
            finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };
        void load();
        return () => {
            mounted = false;
        };
    }, [selectedRealmId]);
    return (_jsxs("section", { className: "rounded-[28px] border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none", children: [_jsxs("div", { className: "flex items-center gap-3 text-slate-700 dark:text-slate-200", children: [_jsx(KeyRound, { className: "h-5 w-5" }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-slate-950 dark:text-white", children: "Passkeys and WebAuthn" }), _jsx("p", { className: "mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300", children: "Review the realm-level passkey inventory and confirm that passwordless credentials are present before moving on to later full-IDP phases." })] })] }), !selectedRealmId ? (_jsx("div", { className: "mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400", children: "Choose a realm to review registered passkeys." })) : loading ? (_jsx("div", { className: "mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400", children: "Loading passkey inventory\u2026" })) : (_jsxs("div", { className: "mt-6 space-y-4", children: [_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300", children: [credentials.length, " credential", credentials.length === 1 ? '' : 's', " registered in this realm. ", canManage ? 'Enrollment and revocation are exposed through the account-console plane.' : 'Read-only review mode.'] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400", children: [_jsx("th", { className: "py-3 pr-4", children: "User" }), _jsx("th", { className: "py-3 pr-4", children: "Device" }), _jsx("th", { className: "py-3 pr-4", children: "Transport" }), _jsx("th", { className: "py-3 pr-4", children: "Status" }), _jsx("th", { className: "py-3 pr-4", children: "Last Used" })] }) }), _jsxs("tbody", { className: "divide-y divide-slate-200 dark:divide-slate-800", children: [credentials.map((credential) => (_jsxs("tr", { children: [_jsxs("td", { className: "py-3 pr-4 text-slate-900 dark:text-white", children: [_jsx("div", { className: "font-medium", children: credential.username }), _jsx("div", { className: "text-xs text-slate-500 dark:text-slate-400", children: credential.email })] }), _jsxs("td", { className: "py-3 pr-4 text-slate-600 dark:text-slate-300", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: credential.device_label }), _jsx("div", { className: "text-xs text-slate-500 dark:text-slate-400", children: credential.credential_id })] }), _jsx("td", { className: "py-3 pr-4 text-slate-600 dark:text-slate-300", children: credential.transports.join(', ') }), _jsx("td", { className: "py-3 pr-4 text-slate-600 dark:text-slate-300", children: credential.status }), _jsx("td", { className: "py-3 pr-4 text-slate-600 dark:text-slate-300", children: credential.last_used_at ? new Date(credential.last_used_at).toLocaleString() : 'Never' })] }, credential.id))), credentials.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "py-8 text-center text-sm text-slate-500 dark:text-slate-400", children: "No passkeys are registered in this realm yet." }) }))] })] }) })] }))] }));
}
