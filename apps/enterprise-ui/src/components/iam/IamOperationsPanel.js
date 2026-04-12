import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Activity, DatabaseBackup, KeyRound, RefreshCcw, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { idpApi, } from '../../services/standaloneApi';
function labelForHealth(health) {
    switch (health) {
        case 'HEALTHY':
            return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
        case 'FAILED':
            return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200';
        default:
            return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
    }
}
function labelForCheckStatus(status) {
    switch (status) {
        case 'PASS':
            return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
        case 'FAIL':
            return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200';
        default:
            return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200';
    }
}
export function IamOperationsPanel({ selectedRealmId, canManage }) {
    const [summary, setSummary] = useState(null);
    const [diagnostics, setDiagnostics] = useState(null);
    const [deployment, setDeployment] = useState(null);
    const [bootstrap, setBootstrap] = useState(null);
    const [health, setHealth] = useState(null);
    const [benchmarkCatalog, setBenchmarkCatalog] = useState(null);
    const [recovery, setRecovery] = useState(null);
    const [backups, setBackups] = useState([]);
    const [restores, setRestores] = useState([]);
    const [signingKeys, setSigningKeys] = useState([]);
    const [resilienceRuns, setResilienceRuns] = useState([]);
    const [readinessReview, setReadinessReview] = useState(null);
    const [selectedBackupId, setSelectedBackupId] = useState('');
    const [selectedTopologyMode, setSelectedTopologyMode] = useState('AWS_SINGLE_REGION_HA');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(null);
    const realmScope = selectedRealmId || null;
    const load = async () => {
        setIsLoading(true);
        try {
            const [summaryResponse, diagnosticsResponse, deploymentResponse, bootstrapResponse, healthResponse, benchmarkResponse, recoveryResponse, backupsResponse, restoresResponse, signingKeysResponse, resilienceResponse, readinessResponse,] = await Promise.all([
                idpApi.getIamOperationsSummary(),
                idpApi.getIamOperationsDiagnostics(),
                idpApi.getIamDeploymentProfile(),
                idpApi.getIamBootstrapPackage(),
                idpApi.getIamHealthSummary(),
                idpApi.getIamBenchmarkCatalog(),
                idpApi.getIamRecoveryProfile(),
                idpApi.listIamBackups(),
                idpApi.listIamRestoreRecords(),
                idpApi.listIamSigningKeys(realmScope),
                idpApi.listIamResilienceRuns(),
                idpApi.getIamReadinessReview(),
            ]);
            setSummary(summaryResponse);
            setDiagnostics(diagnosticsResponse);
            setDeployment(deploymentResponse);
            setBootstrap(bootstrapResponse);
            setHealth(healthResponse);
            setBenchmarkCatalog(benchmarkResponse);
            setRecovery(recoveryResponse);
            setBackups(backupsResponse.backups);
            setRestores(restoresResponse.restores);
            setSigningKeys(signingKeysResponse.signing_keys);
            setResilienceRuns(resilienceResponse.runs);
            setReadinessReview(readinessResponse);
            setSelectedTopologyMode(deploymentResponse.active_profile.topology_mode);
            if (!selectedBackupId && backupsResponse.backups[0]) {
                setSelectedBackupId(backupsResponse.backups[0].id);
            }
        }
        catch (error) {
            console.error('Failed to load IAM operations panel', error);
            toast.error('Failed to load IAM operations');
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        void load();
    }, [selectedRealmId]);
    const latestRestore = restores[0] ?? null;
    const latestResilienceRun = resilienceRuns[0] ?? null;
    const latestReview = readinessReview?.latest_review ?? null;
    const latestBenchmarkRun = benchmarkCatalog?.runs[0] ?? null;
    const latestRecoveryDrill = recovery?.latest_drill ?? null;
    const activeDeployment = deployment?.active_profile ?? null;
    const latestBootstrapPackage = bootstrap?.latest_package ?? null;
    const displayedRotationCount = useMemo(() => summary?.key_rotation_count ?? 0, [summary]);
    const handleCreateBackup = async () => {
        setIsSaving('backup');
        try {
            const created = await idpApi.createIamBackup({
                label: selectedRealmId ? `Realm-scoped operations backup ${selectedRealmId}` : 'IAM operations backup',
            });
            toast.success('IAM backup created');
            setSelectedBackupId(created.id);
            await load();
        }
        catch (error) {
            console.error('Failed to create IAM backup', error);
            toast.error('Failed to create IAM backup');
        }
        finally {
            setIsSaving(null);
        }
    };
    const handleRestore = async (mode) => {
        if (!selectedBackupId) {
            toast.error('Select a backup first');
            return;
        }
        setIsSaving(mode);
        try {
            await idpApi.restoreIamBackup({ backup_id: selectedBackupId, mode });
            toast.success(mode === 'DRY_RUN' ? 'Restore rehearsal completed' : 'IAM backup restored');
            await load();
        }
        catch (error) {
            console.error('Failed to restore IAM backup', error);
            toast.error('Failed to restore IAM backup');
        }
        finally {
            setIsSaving(null);
        }
    };
    const handleRotateKey = async () => {
        setIsSaving('rotate-key');
        try {
            await idpApi.rotateIamSigningKey({ realm_id: realmScope });
            toast.success('Signing key rotated');
            await load();
        }
        catch (error) {
            console.error('Failed to rotate IAM signing key', error);
            toast.error('Failed to rotate IAM signing key');
        }
        finally {
            setIsSaving(null);
        }
    };
    const handleUpdateDeployment = async () => {
        setIsSaving('deployment');
        try {
            await idpApi.updateIamDeploymentProfile({
                topology_mode: selectedTopologyMode,
                regions: activeDeployment?.regions,
                operator_notes: activeDeployment?.operator_notes,
            });
            toast.success('Deployment topology updated');
            await load();
        }
        catch (error) {
            console.error('Failed to update IAM deployment profile', error);
            toast.error('Failed to update deployment profile');
        }
        finally {
            setIsSaving(null);
        }
    };
    const handleRegenerateBootstrap = async () => {
        setIsSaving('bootstrap');
        try {
            await idpApi.regenerateIamBootstrapPackage();
            toast.success('Bootstrap package regenerated');
            await load();
        }
        catch (error) {
            console.error('Failed to regenerate IAM bootstrap package', error);
            toast.error('Failed to regenerate bootstrap package');
        }
        finally {
            setIsSaving(null);
        }
    };
    const handleRunResilience = async () => {
        setIsSaving('resilience');
        try {
            await idpApi.runIamResilienceSuite();
            toast.success('Resilience suite completed');
            await load();
        }
        catch (error) {
            console.error('Failed to run IAM resilience suite', error);
            toast.error('Failed to run IAM resilience suite');
        }
        finally {
            setIsSaving(null);
        }
    };
    const handleRunBenchmark = async (suiteId) => {
        setIsSaving(`benchmark:${suiteId ?? 'full'}`);
        try {
            await idpApi.runIamBenchmarkSuite(suiteId ? { suite_id: suiteId } : {});
            toast.success('Benchmark suite completed');
            await load();
        }
        catch (error) {
            console.error('Failed to run IAM benchmark suite', error);
            toast.error('Failed to run IAM benchmark suite');
        }
        finally {
            setIsSaving(null);
        }
    };
    const handleRunRecoveryDrill = async () => {
        setIsSaving('recovery');
        try {
            await idpApi.runIamRecoveryDrill(selectedBackupId ? { backup_id: selectedBackupId } : {});
            toast.success('Recovery drill completed');
            await load();
        }
        catch (error) {
            console.error('Failed to run IAM recovery drill', error);
            toast.error('Failed to run IAM recovery drill');
        }
        finally {
            setIsSaving(null);
        }
    };
    return (_jsxs("section", { className: "space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsxs("div", { className: "flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.28em] text-slate-400", children: "Operations" }), _jsx("h2", { className: "mt-2 text-2xl font-semibold text-slate-950 dark:text-white", children: "Deployment, Recovery, and Service Operations" }), _jsx("p", { className: "mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300", children: "This tab is the IAM operational console: deployment posture, bootstrap packaging, health, benchmarks, backups, restore drills, signing-key rotation, and resilience evidence. Review records are retained as governance metadata, but the workflows here are runtime and operations-focused." })] }), summary && (_jsx("span", { className: `inline-flex rounded-full px-3 py-2 text-sm font-medium ${labelForHealth(summary.health)}`, children: summary.health }))] }), isLoading ? (_jsx("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400", children: "Loading IAM operations\u2026" })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: [_jsx(SummaryCard, { icon: DatabaseBackup, label: "Backups", value: String(summary?.backup_count ?? 0), detail: `${summary?.restore_count ?? 0} restore records` }), _jsx(SummaryCard, { icon: KeyRound, label: "Key Rotations", value: String(displayedRotationCount), detail: `${signingKeys.filter((key) => key.status === 'ACTIVE').length} active keys in scope` }), _jsx(SummaryCard, { icon: Activity, label: "Benchmarks", value: String(summary?.benchmark_run_count ?? 0), detail: latestBenchmarkRun?.overall_status ?? 'No runs yet' }), _jsx(SummaryCard, { icon: RefreshCcw, label: "Recovery Drills", value: String(summary?.recovery_drill_count ?? 0), detail: latestRecoveryDrill?.status ?? 'No drills yet' }), _jsx(SummaryCard, { icon: ShieldCheck, label: "Governance Decisions", value: String(summary?.readiness_review_count ?? 0), detail: summary?.latest_readiness_decision ?? 'Not recorded' }), _jsx(SummaryCard, { icon: ShieldCheck, label: "Service Checks", value: String(summary?.standalone_health_check_count ?? 0), detail: health?.overall_status ?? 'Unknown' }), _jsx(SummaryCard, { icon: Activity, label: "Deployment", value: summary?.active_deployment_topology_mode?.replace(/_/g, ' ') ?? 'Unknown', detail: activeDeployment?.regions.join(', ') ?? 'No regions' }), _jsx(SummaryCard, { icon: RefreshCcw, label: "Scope", value: selectedRealmId ? 'Realm' : 'Global', detail: selectedRealmId || 'Global signing keys' })] }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-[1.05fr_0.95fr]", children: [_jsxs("div", { className: "space-y-6", children: [_jsxs(Panel, { title: "Diagnostics and SLOs", description: "Operational diagnostics and service-level objectives for IAM runtime operations.", children: [_jsx("div", { className: "grid gap-4 md:grid-cols-2", children: Object.entries(diagnostics?.counts ?? {}).map(([key, value]) => (_jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40", children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: key.replace(/_/g, ' ') }), _jsx("div", { className: "mt-2 text-2xl font-semibold text-slate-900 dark:text-white", children: value })] }, key))) }), _jsxs("div", { className: "mt-5 grid gap-4 lg:grid-cols-2", children: [_jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: "Runbooks" }), diagnostics?.runbooks.map((runbook) => (_jsxs("div", { className: "rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: runbook.title }), _jsx("div", { className: "mt-1 text-slate-600 dark:text-slate-400", children: runbook.summary })] }, runbook.id)))] }), _jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: "SLO Definitions" }), diagnostics?.slo_definitions.map((slo) => (_jsxs("div", { className: "rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: slo.name }), _jsx("div", { className: "mt-1 text-xs uppercase tracking-[0.18em] text-slate-500", children: slo.target }), _jsx("div", { className: "mt-2 text-slate-600 dark:text-slate-400", children: slo.summary })] }, slo.id)))] })] }), diagnostics?.advisories && diagnostics.advisories.length > 0 && (_jsxs("div", { className: "mt-5 space-y-2", children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: "Current Advisories" }), diagnostics.advisories.map((advisory) => (_jsx("div", { className: "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200", children: advisory }, advisory)))] }))] }), _jsx(Panel, { title: "Deployment Topology", description: "Manage AWS deployment topology, service regions, and platform posture for IAM operations.", children: _jsxs("div", { className: "grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]", children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: "Active topology" }), _jsx("div", { className: "mt-2 text-sm text-slate-600 dark:text-slate-400", children: activeDeployment?.summary })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Topology Mode" }), _jsx("select", { value: selectedTopologyMode, onChange: (event) => setSelectedTopologyMode(event.target.value), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: deployment?.supported_topology_modes.map((mode) => (_jsx("option", { value: mode, children: mode.replace(/_/g, ' ') }, mode))) })] }), _jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/40", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: "Deployment posture" }), _jsxs("div", { className: "mt-2 text-slate-600 dark:text-slate-400", children: ["Regions: ", activeDeployment?.regions.join(', ') ?? 'n/a'] }), _jsxs("div", { className: "mt-1 text-slate-600 dark:text-slate-400", children: ["Cost band: ", activeDeployment?.estimated_monthly_cost_band ?? 'n/a'] }), _jsxs("div", { className: "mt-1 text-slate-600 dark:text-slate-400", children: ["Data plane: ", activeDeployment?.data_plane ?? 'n/a'] }), _jsxs("div", { className: "mt-1 text-slate-600 dark:text-slate-400", children: ["Secret plane: ", activeDeployment?.secret_plane ?? 'n/a'] })] }), _jsx("button", { type: "button", onClick: handleUpdateDeployment, disabled: !canManage || isSaving === 'deployment', className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: isSaving === 'deployment' ? 'Updating…' : 'Update Deployment' })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: "Modeled AWS resources" }), deployment?.resources.map((resource) => (_jsxs("div", { className: "rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: resource.label }), _jsx("span", { className: "rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200", children: resource.status })] }), _jsx("div", { className: "mt-1 text-slate-600 dark:text-slate-400", children: resource.service }), _jsx("div", { className: "mt-2 text-slate-600 dark:text-slate-400", children: resource.summary })] }, resource.id)))] })] }) }), _jsxs(Panel, { title: "Bootstrap Package", description: "Operator bootstrap instructions and environment package for provisioning, recovery, and auditability.", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "text-sm text-slate-600 dark:text-slate-400", children: ["Latest package: ", _jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: latestBootstrapPackage?.version_label ?? 'None' })] }), _jsx("button", { type: "button", onClick: handleRegenerateBootstrap, disabled: !canManage || isSaving === 'bootstrap', className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: isSaving === 'bootstrap' ? 'Generating…' : 'Regenerate Package' })] }), _jsxs("div", { className: "mt-5 grid gap-4 lg:grid-cols-2", children: [_jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: "Environment variables" }), latestBootstrapPackage?.environment_variables.map((entry) => (_jsxs("div", { className: "rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: entry.key }), _jsx("div", { className: "mt-1 text-slate-600 dark:text-slate-400", children: entry.summary })] }, entry.key)))] }), _jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: "Bootstrap artifacts" }), latestBootstrapPackage?.artifacts.map((artifact) => (_jsxs("div", { className: "rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: artifact.path }), _jsx("div", { className: "mt-1 text-slate-600 dark:text-slate-400", children: artifact.summary })] }, artifact.path)))] })] }), _jsxs("div", { className: "mt-5 grid gap-4 lg:grid-cols-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: "Bootstrap steps" }), latestBootstrapPackage?.bootstrap_steps.map((step) => (_jsx("div", { className: "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300", children: step }, step)))] }), _jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: "Verification steps" }), latestBootstrapPackage?.validation_steps.map((step) => (_jsx("div", { className: "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300", children: step }, step)))] })] })] }), _jsxs(Panel, { title: "Backup and Restore", description: "Create recoverable snapshots, rehearse restore, and execute restoration against explicitly selected backups.", children: [_jsxs("div", { className: "flex flex-col gap-3 lg:flex-row lg:items-center", children: [_jsxs("select", { value: selectedBackupId, onChange: (event) => setSelectedBackupId(event.target.value), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: [_jsx("option", { value: "", children: "Select backup" }), backups.map((backup) => (_jsxs("option", { value: backup.id, children: [backup.label, " \u00B7 ", new Date(backup.created_at).toLocaleString()] }, backup.id)))] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx("button", { type: "button", onClick: handleCreateBackup, disabled: !canManage || isSaving === 'backup', className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: isSaving === 'backup' ? 'Creating…' : 'Create Backup' }), _jsx("button", { type: "button", onClick: () => handleRestore('DRY_RUN'), disabled: !canManage || !selectedBackupId || isSaving === 'DRY_RUN', className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: isSaving === 'DRY_RUN' ? 'Running…' : 'Dry-Run Restore' }), _jsx("button", { type: "button", onClick: () => handleRestore('EXECUTE'), disabled: !canManage || !selectedBackupId || isSaving === 'EXECUTE', className: "rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-950/30", children: isSaving === 'EXECUTE' ? 'Restoring…' : 'Execute Restore' })] })] }), _jsxs("div", { className: "mt-5 grid gap-4 lg:grid-cols-2", children: [_jsxs("div", { children: [_jsx("div", { className: "mb-2 text-sm font-semibold text-slate-900 dark:text-white", children: "Recent Backups" }), _jsx("div", { className: "space-y-3", children: backups.slice(0, 4).map((backup) => (_jsxs("div", { className: "rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: backup.label }), _jsx("div", { className: "mt-1 text-slate-600 dark:text-slate-400", children: backup.object_key }), _jsxs("div", { className: "mt-2 text-xs text-slate-500", children: [backup.summary.realm_count, " realms \u00B7 ", backup.summary.user_count, " users \u00B7 ", backup.summary.client_count, " clients"] })] }, backup.id))) })] }), _jsxs("div", { children: [_jsx("div", { className: "mb-2 text-sm font-semibold text-slate-900 dark:text-white", children: "Recent Restore Evidence" }), _jsxs("div", { className: "space-y-3", children: [restores.slice(0, 4).map((restore) => (_jsxs("div", { className: "rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800", children: [_jsxs("div", { className: "font-medium text-slate-900 dark:text-white", children: [restore.mode, " \u00B7 ", restore.status] }), _jsxs("div", { className: "mt-1 text-slate-600 dark:text-slate-400", children: ["Backup ", restore.backup_id] }), _jsxs("div", { className: "mt-2 text-xs text-slate-500", children: [restore.summary.realm_count, " realms \u00B7 ", restore.summary.user_count, " users"] })] }, restore.id))), !latestRestore && (_jsx("div", { className: "rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400", children: "No restore rehearsal has been recorded yet." }))] })] })] })] })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs(Panel, { title: "Health and Benchmarks", description: "Track IAM service health and benchmark trends for operational reliability.", children: [!benchmarkCatalog?.market_claim_ready && (_jsx("div", { className: "mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100", children: "Benchmark outputs are currently synthetic modeled evidence. They are useful for internal remediation tracking, but they are not measured load proof for parity or production claims." })), _jsxs("div", { className: "rounded-xl border border-slate-200 p-4 dark:border-slate-800", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: "Service health" }), _jsx("span", { className: `rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${labelForHealth(health?.overall_status ?? 'DEGRADED')}`, children: health?.overall_status ?? 'UNKNOWN' })] }), _jsx("div", { className: "mt-3 space-y-2", children: health?.checks.map((check) => (_jsxs("div", { className: "rounded-lg border border-slate-200 px-3 py-3 text-sm dark:border-slate-800", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: check.name }), _jsx("span", { className: `rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${labelForCheckStatus(check.status)}`, children: check.status })] }), _jsx("div", { className: "mt-1 text-slate-600 dark:text-slate-400", children: check.summary })] }, check.id))) })] }), _jsxs("div", { className: "mt-5 flex flex-wrap gap-3", children: [_jsx("button", { type: "button", onClick: () => handleRunBenchmark(), disabled: !canManage || isSaving === 'benchmark:full', className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: isSaving === 'benchmark:full' ? 'Running…' : 'Run Full Benchmark' }), benchmarkCatalog?.suites.slice(0, 3).map((suite) => (_jsx("button", { type: "button", onClick: () => handleRunBenchmark(suite.id), disabled: !canManage || isSaving === `benchmark:${suite.id}`, className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: isSaving === `benchmark:${suite.id}` ? 'Running…' : `Run ${suite.name}` }, suite.id)))] }), latestBenchmarkRun && (_jsxs("div", { className: "mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-800", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: latestBenchmarkRun.suite_name }), _jsx("span", { className: `rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${labelForCheckStatus(latestBenchmarkRun.overall_status)}`, children: latestBenchmarkRun.overall_status })] }), _jsx("div", { className: "mt-3 space-y-2", children: latestBenchmarkRun.metrics.map((metric) => (_jsxs("div", { className: "rounded-lg border border-slate-200 px-3 py-3 text-sm dark:border-slate-800", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: metric.name }), _jsxs("span", { className: `rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${labelForCheckStatus(metric.status)}`, children: [metric.value, " ", metric.unit] })] }), _jsxs("div", { className: "mt-1 text-slate-600 dark:text-slate-400", children: ["Target: ", metric.target] })] }, metric.id))) }), _jsx("div", { className: "mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100", children: latestBenchmarkRun.evidence_summary })] }))] }), _jsxs(Panel, { title: "Recovery Hardening", description: "Recovery objectives, drill evidence, and hardened backup posture for IAM service operations.", children: [_jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/40", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: recovery?.profile.name }), _jsxs("div", { className: "mt-2 text-slate-600 dark:text-slate-400", children: ["Backup storage: ", recovery?.profile.backup_storage_mode] }), _jsxs("div", { className: "mt-1 text-slate-600 dark:text-slate-400", children: ["Database recovery: ", recovery?.profile.database_recovery_mode] }), _jsxs("div", { className: "mt-1 text-slate-600 dark:text-slate-400", children: ["Replication: ", recovery?.profile.replication_mode] }), _jsxs("div", { className: "mt-1 text-slate-600 dark:text-slate-400", children: ["RPO target: ", recovery?.profile.rpo_target_minutes, " minutes"] }), _jsxs("div", { className: "mt-1 text-slate-600 dark:text-slate-400", children: ["RTO target: ", recovery?.profile.rto_target_minutes, " minutes"] })] }), _jsx("div", { className: "mt-4 flex flex-wrap gap-3", children: _jsx("button", { type: "button", onClick: handleRunRecoveryDrill, disabled: !canManage || isSaving === 'recovery', className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: isSaving === 'recovery' ? 'Running…' : 'Run Recovery Drill' }) }), latestRecoveryDrill && (_jsxs("div", { className: "mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-800", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: "Latest recovery drill" }), _jsx("span", { className: `rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${labelForCheckStatus(latestRecoveryDrill.status)}`, children: latestRecoveryDrill.status })] }), _jsxs("div", { className: "mt-2 text-sm text-slate-600 dark:text-slate-400", children: [latestRecoveryDrill.measured_recovery_minutes, " minutes measured against a ", latestRecoveryDrill.rto_target_minutes, "-minute RTO target."] }), _jsx("div", { className: "mt-3 space-y-2", children: latestRecoveryDrill.notes.map((note) => (_jsx("div", { className: "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300", children: note }, note))) })] }))] }), _jsxs(Panel, { title: "Signing Keys", description: "Rotate the current signing key while retaining older verification keys for token rollover validation.", children: [_jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsxs("div", { className: "text-sm text-slate-600 dark:text-slate-400", children: ["Scope: ", _jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: selectedRealmId || 'Global keyset' })] }), _jsx("button", { type: "button", onClick: handleRotateKey, disabled: !canManage || isSaving === 'rotate-key', className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: isSaving === 'rotate-key' ? 'Rotating…' : 'Rotate Key' })] }), _jsx("div", { className: "mt-4 space-y-3", children: signingKeys.map((key) => (_jsxs("div", { className: "rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: key.key_id }), _jsx("span", { className: `rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${key.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`, children: key.status })] }), _jsx("div", { className: "mt-1 text-slate-600 dark:text-slate-400", children: key.realm_id || 'global' }), _jsx("div", { className: "mt-2 text-xs text-slate-500", children: new Date(key.created_at).toLocaleString() })] }, key.id))) }), signingKeys[0] && (_jsxs("div", { className: "mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400", children: ["Latest visible key in scope is ", _jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: signingKeys[0].key_id }), "."] }))] }), _jsxs(Panel, { title: "Resilience and Governance Snapshot", description: "Run resilience checks and monitor governance decision status for operational audit trails.", children: [_jsx("div", { className: "flex flex-wrap gap-3", children: _jsx("button", { type: "button", onClick: handleRunResilience, disabled: !canManage || isSaving === 'resilience', className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: isSaving === 'resilience' ? 'Running…' : 'Run Resilience Suite' }) }), latestResilienceRun && (_jsxs("div", { className: "mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-800", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: "Latest resilience run" }), _jsx("span", { className: `rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${labelForHealth(latestResilienceRun.overall_status === 'PASS' ? 'HEALTHY' : latestResilienceRun.overall_status === 'FAIL' ? 'FAILED' : 'DEGRADED')}`, children: latestResilienceRun.overall_status })] }), _jsx("div", { className: "mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100", children: latestResilienceRun.evidence_summary }), _jsx("div", { className: "mt-3 space-y-2", children: latestResilienceRun.checks.map((check) => (_jsxs("div", { className: "rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: check.name }), _jsx("div", { className: "mt-1 text-slate-600 dark:text-slate-400", children: check.summary }), _jsx("div", { className: "mt-2 text-xs text-amber-700 dark:text-amber-300", children: check.evidence_summary })] }, check.id))) })] })), _jsxs("div", { className: "mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-800", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: "Governance status" }), !readinessReview?.market_claim_ready && readinessReview?.evidence_summary ? (_jsx("div", { className: "mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100", children: readinessReview.evidence_summary })) : null, _jsxs("div", { className: "mt-2 text-sm text-slate-600 dark:text-slate-400", children: ["Latest review decision: ", _jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: latestReview?.decision ?? 'Not recorded' })] }), readinessReview?.claim_boundary_notes?.length ? (_jsx("div", { className: "mt-3 space-y-2", children: readinessReview.claim_boundary_notes.map((note) => (_jsx("div", { className: "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100", children: note }, note))) })) : null, _jsx("div", { className: "mt-4 text-xs uppercase tracking-[0.18em] text-slate-500", children: "Formal review authoring lives in the Review tab." }), _jsx("div", { className: "mt-4 space-y-3", children: readinessReview?.checks.length ? (readinessReview.checks.map((check) => (_jsxs("div", { className: "rounded-lg border border-slate-200 px-3 py-3 text-sm dark:border-slate-800", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: check.name }), _jsx("span", { className: `rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${check.status === 'PASS'
                                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                                                                                : check.status === 'FAIL'
                                                                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
                                                                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'}`, children: check.status })] }), _jsx("div", { className: "mt-1 text-slate-600 dark:text-slate-400", children: check.summary }), _jsx("div", { className: "mt-2 text-xs text-amber-700 dark:text-amber-300", children: check.evidence_summary })] }, check.id)))) : (_jsx("div", { className: "rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400", children: "No governance checks are currently published." })) })] })] })] })] })] }))] }));
}
function Panel({ title, description, children }) {
    return (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: title }), _jsx("p", { className: "mt-1 text-sm text-slate-600 dark:text-slate-400", children: description })] }), _jsx("div", { className: "mt-4", children: children })] }));
}
function SummaryCard({ icon: Icon, label, value, detail, }) {
    return (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: label }), _jsx("div", { className: "mt-2 text-2xl font-semibold text-slate-900 dark:text-white", children: value })] }), _jsx(Icon, { className: "h-5 w-5 text-slate-500 dark:text-slate-400" })] }), _jsx("div", { className: "mt-2 text-sm text-slate-600 dark:text-slate-400", children: detail })] }));
}
