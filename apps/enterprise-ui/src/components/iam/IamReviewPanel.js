import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Award, ShieldCheck, Scale, Waypoints } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { idpApi, } from '../../services/standaloneApi';
function statusClasses(status) {
    switch (status) {
        case 'PASS':
            return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
        case 'FAIL':
            return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200';
        default:
            return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
    }
}
export function IamReviewPanel({ canManage }) {
    const [summary, setSummary] = useState(null);
    const [standards, setStandards] = useState(null);
    const [interoperability, setInteroperability] = useState(null);
    const [differentiation, setDifferentiation] = useState(null);
    const [formalReview, setFormalReview] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const load = async () => {
        setIsLoading(true);
        try {
            const [summaryResponse, standardsResponse, interoperabilityResponse, differentiationResponse, formalResponse] = await Promise.all([
                idpApi.getIamReviewSummary(),
                idpApi.getIamStandardsMatrix(),
                idpApi.getIamInteroperabilityReview(),
                idpApi.getIamDifferentiationReview(),
                idpApi.getIamFormalReview(),
            ]);
            setSummary(summaryResponse);
            setStandards(standardsResponse);
            setInteroperability(interoperabilityResponse);
            setDifferentiation(differentiationResponse);
            setFormalReview(formalResponse);
        }
        catch (error) {
            console.error('Failed to load IAM review workspace', error);
            toast.error('Failed to load IAM review workspace');
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        void load();
    }, []);
    const handleRecordReview = async () => {
        setIsSaving(true);
        try {
            await idpApi.recordIamFormalReview({
                notes: [
                    'Formal standalone IAM review recorded from the dedicated review workspace.',
                    'Subsystem quality is evaluated independently of any downstream application adoption or migration work.',
                ],
            });
            toast.success('Formal IAM review recorded');
            await load();
        }
        catch (error) {
            console.error('Failed to record IAM formal review', error);
            toast.error('Failed to record IAM formal review');
        }
        finally {
            setIsSaving(false);
        }
    };
    const latestReview = formalReview?.latest_review ?? null;
    return (_jsxs("section", { className: "space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsxs("div", { className: "flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.28em] text-slate-400", children: "Review" }), _jsx("h2", { className: "mt-2 text-2xl font-semibold text-slate-950 dark:text-white", children: "Standalone Readiness and Market Position" }), _jsx("p", { className: "mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300", children: "This workspace answers the actual Phase L question: whether the standalone IAM subsystem can honestly be described as a production-ready standalone IDP and a credible Keycloak-class competitor, without using any downstream adoption as substitute proof." })] }), _jsx("button", { type: "button", onClick: handleRecordReview, disabled: !canManage || isSaving, className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: isSaving ? 'Recording…' : 'Record Formal Review' })] }), isLoading ? (_jsx("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400", children: "Loading IAM review\u2026" })) : (_jsxs(_Fragment, { children: [!summary?.market_claim_ready && (_jsxs("div", { className: "space-y-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100", children: [_jsx("div", { children: "This review workspace is currently reporting modeled internal evidence only. It is useful for remediation tracking, but it is not sufficient for external parity or production-readiness claims." }), summary?.evidence_summary && (_jsx("div", { className: "text-xs text-amber-800 dark:text-amber-200", children: summary.evidence_summary })), summary?.claim_boundary_notes?.length ? (_jsx("div", { className: "space-y-2", children: summary.claim_boundary_notes.map((note) => (_jsx("div", { className: "rounded-lg border border-amber-200/70 bg-white/50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-amber-100", children: note }, note))) })) : null] })), _jsxs("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: [_jsx(SummaryCard, { icon: ShieldCheck, label: "Standards", value: standards?.overall_status ?? 'UNKNOWN', detail: `${summary?.standards_matrix_count ?? 0} matrix items` }), _jsx(SummaryCard, { icon: Waypoints, label: "Interop", value: interoperability?.overall_status ?? 'UNKNOWN', detail: `${summary?.interoperability_check_count ?? 0} validation checks` }), _jsx(SummaryCard, { icon: Award, label: "Market Position", value: summary?.latest_market_position?.replace(/_/g, ' ') ?? 'Not reviewed', detail: summary?.latest_overall_status ?? 'No review recorded' }), _jsx(SummaryCard, { icon: Scale, label: "Recommendation", value: summary?.latest_adoption_recommendation?.replace(/_/g, ' ') ?? 'Pending', detail: `${summary?.formal_review_count ?? 0} formal reviews` })] }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-[1.05fr_0.95fr]", children: [_jsxs("div", { className: "space-y-6", children: [_jsxs(Panel, { title: "Standards Matrix", description: "Feature-family review against the standalone full-IDP bar.", children: [_jsx("div", { className: "mb-4 text-xs text-amber-700 dark:text-amber-300", children: standards?.evidence_summary }), _jsx("div", { className: "space-y-3", children: standards?.items.map((item) => (_jsx("div", { className: "rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: item.family }), _jsx("div", { className: "mt-1 font-medium text-slate-900 dark:text-white", children: item.capability }), _jsx("div", { className: "mt-2 text-slate-600 dark:text-slate-400", children: item.summary }), _jsx("div", { className: "mt-2 text-xs text-amber-700 dark:text-amber-300", children: item.evidence_summary })] }), _jsx("span", { className: `rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusClasses(item.status)}`, children: item.status })] }) }, item.id))) })] }), _jsxs(Panel, { title: "Protocol and Interoperability Review", description: "Validation-track review across OIDC, OAuth, SAML, organizations, passkeys, authorization, and recovery.", children: [_jsx("div", { className: "mb-4 text-xs text-amber-700 dark:text-amber-300", children: interoperability?.evidence_summary }), _jsx("div", { className: "space-y-3", children: interoperability?.checks.map((check) => (_jsx("div", { className: "rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: check.protocol_family }), _jsx("div", { className: "mt-1 font-medium text-slate-900 dark:text-white", children: check.name }), _jsx("div", { className: "mt-2 text-slate-600 dark:text-slate-400", children: check.summary }), _jsx("div", { className: "mt-2 text-xs text-slate-500", children: check.evidence }), _jsx("div", { className: "mt-2 text-xs text-amber-700 dark:text-amber-300", children: check.evidence_summary })] }), _jsx("span", { className: `rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusClasses(check.status)}`, children: check.status })] }) }, check.id))) })] })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs(Panel, { title: "Differentiation Review", description: "Where the standalone IAM product is stronger or more opinionated than generic parity alone.", children: [_jsx("div", { className: "mb-4 text-xs text-amber-700 dark:text-amber-300", children: differentiation?.evidence_summary }), _jsx("div", { className: "space-y-3", children: differentiation?.areas.map((area) => (_jsx("div", { className: "rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: area.name }), _jsx("div", { className: "mt-2 text-slate-600 dark:text-slate-400", children: area.summary }), _jsx("div", { className: "mt-2 text-xs text-slate-500", children: area.comparative_position }), _jsx("div", { className: "mt-2 text-xs text-amber-700 dark:text-amber-300", children: area.evidence_summary })] }), _jsx("span", { className: `rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusClasses(area.status)}`, children: area.status })] }) }, area.id))) })] }), _jsx(Panel, { title: "Formal Review", description: "Recorded conclusion on whether the subsystem is standalone-complete, production-ready, Keycloak-competitive, and strategically differentiated.", children: latestReview ? (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: latestReview.market_position.replace(/_/g, ' ') }), _jsx("span", { className: `rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusClasses(latestReview.overall_status)}`, children: latestReview.overall_status })] }), _jsxs("div", { className: "mt-2 text-sm text-slate-600 dark:text-slate-400", children: ["Recommendation: ", _jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: latestReview.adoption_recommendation.replace(/_/g, ' ') })] }), _jsxs("div", { className: "mt-2 text-xs text-amber-700 dark:text-amber-300", children: ["Claim scope: ", latestReview.claim_scope.replace(/_/g, ' ')] }), _jsx("div", { className: "mt-2 text-xs text-amber-700 dark:text-amber-300", children: formalReview?.evidence_summary })] }), _jsxs("div", { className: "grid gap-3 md:grid-cols-2", children: [_jsx(DecisionBadge, { label: "Validation Complete", value: latestReview.standalone_validation_complete }), _jsx(DecisionBadge, { label: "Production Ready", value: latestReview.standalone_production_ready }), _jsx(DecisionBadge, { label: "Keycloak Competitive", value: latestReview.keycloak_competitive }), _jsx(DecisionBadge, { label: "Strategically Differentiated", value: latestReview.strategically_differentiated })] }), _jsxs("div", { className: "space-y-2", children: [formalReview?.claim_boundary_notes?.map((note) => (_jsx("div", { className: "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100", children: note }, note))), latestReview.notes.map((note) => (_jsx("div", { className: "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300", children: note }, note)))] })] })) : (_jsx("div", { className: "rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400", children: "No formal standalone IAM review has been recorded yet." })) })] })] })] }))] }));
}
function Panel({ title, description, children }) {
    return (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: title }), _jsx("p", { className: "mt-1 text-sm text-slate-600 dark:text-slate-400", children: description })] }), _jsx("div", { className: "mt-4", children: children })] }));
}
function SummaryCard({ icon: Icon, label, value, detail, }) {
    return (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: label }), _jsx("div", { className: "mt-2 text-2xl font-semibold text-slate-900 dark:text-white", children: value })] }), _jsx(Icon, { className: "h-5 w-5 text-slate-500 dark:text-slate-400" })] }), _jsx("div", { className: "mt-2 text-sm text-slate-600 dark:text-slate-400", children: detail })] }));
}
function DecisionBadge({ label, value }) {
    return (_jsxs("div", { className: "rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800", children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: label }), _jsx("div", { className: `mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${value ? statusClasses('PASS') : statusClasses('WARN')}`, children: value ? 'Yes' : 'No' })] }));
}
