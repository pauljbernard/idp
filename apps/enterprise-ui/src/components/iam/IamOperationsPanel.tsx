import React, { useEffect, useMemo, useState } from 'react'
import { Activity, DatabaseBackup, KeyRound, RefreshCcw, ShieldCheck } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  idpApi,
  type IamBackupArtifactRecord,
  type IamBenchmarkCatalogResponse,
  type IamBenchmarkRunRecord,
  type IamBootstrapPackageResponse,
  type IamDeploymentProfileResponse,
  type IamDeploymentTopologyMode,
  type IamOperationsDiagnosticsResponse,
  type IamOperationsSummaryResponse,
  type IamReadinessReviewResponse,
  type IamRecoveryProfileResponse,
  type IamResilienceRunRecord,
  type IamRestoreRecord,
  type IamSigningKeyRecord,
  type IamStandaloneHealthResponse,
} from '../../services/standaloneApi'

type Props = {
  selectedRealmId: string
  canManage: boolean
}

function labelForHealth(health: IamOperationsSummaryResponse['health']) {
  switch (health) {
    case 'HEALTHY':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
    case 'FAILED':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
    default:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
  }
}

function labelForCheckStatus(status: 'PASS' | 'WARN' | 'FAIL') {
  switch (status) {
    case 'PASS':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
    case 'FAIL':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
    default:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
  }
}

export function IamOperationsPanel({ selectedRealmId, canManage }: Props) {
  const [summary, setSummary] = useState<IamOperationsSummaryResponse | null>(null)
  const [diagnostics, setDiagnostics] = useState<IamOperationsDiagnosticsResponse | null>(null)
  const [deployment, setDeployment] = useState<IamDeploymentProfileResponse | null>(null)
  const [bootstrap, setBootstrap] = useState<IamBootstrapPackageResponse | null>(null)
  const [health, setHealth] = useState<IamStandaloneHealthResponse | null>(null)
  const [benchmarkCatalog, setBenchmarkCatalog] = useState<IamBenchmarkCatalogResponse | null>(null)
  const [recovery, setRecovery] = useState<IamRecoveryProfileResponse | null>(null)
  const [backups, setBackups] = useState<IamBackupArtifactRecord[]>([])
  const [restores, setRestores] = useState<IamRestoreRecord[]>([])
  const [signingKeys, setSigningKeys] = useState<IamSigningKeyRecord[]>([])
  const [resilienceRuns, setResilienceRuns] = useState<IamResilienceRunRecord[]>([])
  const [readinessReview, setReadinessReview] = useState<IamReadinessReviewResponse | null>(null)
  const [selectedBackupId, setSelectedBackupId] = useState('')
  const [selectedTopologyMode, setSelectedTopologyMode] = useState<IamDeploymentTopologyMode>('AWS_SINGLE_REGION_HA')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState<string | null>(null)

  const realmScope = selectedRealmId || null

  const load = async () => {
    setIsLoading(true)
    try {
      const [
        summaryResponse,
        diagnosticsResponse,
        deploymentResponse,
        bootstrapResponse,
        healthResponse,
        benchmarkResponse,
        recoveryResponse,
        backupsResponse,
        restoresResponse,
        signingKeysResponse,
        resilienceResponse,
        readinessResponse,
      ] = await Promise.all([
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
      ])

      setSummary(summaryResponse)
      setDiagnostics(diagnosticsResponse)
      setDeployment(deploymentResponse)
      setBootstrap(bootstrapResponse)
      setHealth(healthResponse)
      setBenchmarkCatalog(benchmarkResponse)
      setRecovery(recoveryResponse)
      setBackups(backupsResponse.backups)
      setRestores(restoresResponse.restores)
      setSigningKeys(signingKeysResponse.signing_keys)
      setResilienceRuns(resilienceResponse.runs)
      setReadinessReview(readinessResponse)
      setSelectedTopologyMode(deploymentResponse.active_profile.topology_mode)

      if (!selectedBackupId && backupsResponse.backups[0]) {
        setSelectedBackupId(backupsResponse.backups[0].id)
      }
    } catch (error) {
      console.error('Failed to load IAM operations panel', error)
      toast.error('Failed to load IAM operations')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [selectedRealmId])

  const latestRestore = restores[0] ?? null
  const latestResilienceRun = resilienceRuns[0] ?? null
  const latestReview = readinessReview?.latest_review ?? null
  const latestBenchmarkRun = benchmarkCatalog?.runs[0] ?? null
  const latestRecoveryDrill = recovery?.latest_drill ?? null
  const activeDeployment = deployment?.active_profile ?? null
  const latestBootstrapPackage = bootstrap?.latest_package ?? null
  const displayedRotationCount = useMemo(() => summary?.key_rotation_count ?? 0, [summary])

  const handleCreateBackup = async () => {
    setIsSaving('backup')
    try {
      const created = await idpApi.createIamBackup({
        label: selectedRealmId ? `Realm-scoped operations backup ${selectedRealmId}` : 'IAM operations backup',
      })
      toast.success('IAM backup created')
      setSelectedBackupId(created.id)
      await load()
    } catch (error) {
      console.error('Failed to create IAM backup', error)
      toast.error('Failed to create IAM backup')
    } finally {
      setIsSaving(null)
    }
  }

  const handleRestore = async (mode: 'DRY_RUN' | 'EXECUTE') => {
    if (!selectedBackupId) {
      toast.error('Select a backup first')
      return
    }
    setIsSaving(mode)
    try {
      await idpApi.restoreIamBackup({ backup_id: selectedBackupId, mode })
      toast.success(mode === 'DRY_RUN' ? 'Restore rehearsal completed' : 'IAM backup restored')
      await load()
    } catch (error) {
      console.error('Failed to restore IAM backup', error)
      toast.error('Failed to restore IAM backup')
    } finally {
      setIsSaving(null)
    }
  }

  const handleRotateKey = async () => {
    setIsSaving('rotate-key')
    try {
      await idpApi.rotateIamSigningKey({ realm_id: realmScope })
      toast.success('Signing key rotated')
      await load()
    } catch (error) {
      console.error('Failed to rotate IAM signing key', error)
      toast.error('Failed to rotate IAM signing key')
    } finally {
      setIsSaving(null)
    }
  }

  const handleUpdateDeployment = async () => {
    setIsSaving('deployment')
    try {
      await idpApi.updateIamDeploymentProfile({
        topology_mode: selectedTopologyMode,
        regions: activeDeployment?.regions,
        operator_notes: activeDeployment?.operator_notes,
      })
      toast.success('Deployment topology updated')
      await load()
    } catch (error) {
      console.error('Failed to update IAM deployment profile', error)
      toast.error('Failed to update deployment profile')
    } finally {
      setIsSaving(null)
    }
  }

  const handleRegenerateBootstrap = async () => {
    setIsSaving('bootstrap')
    try {
      await idpApi.regenerateIamBootstrapPackage()
      toast.success('Bootstrap package regenerated')
      await load()
    } catch (error) {
      console.error('Failed to regenerate IAM bootstrap package', error)
      toast.error('Failed to regenerate bootstrap package')
    } finally {
      setIsSaving(null)
    }
  }

  const handleRunResilience = async () => {
    setIsSaving('resilience')
    try {
      await idpApi.runIamResilienceSuite()
      toast.success('Resilience suite completed')
      await load()
    } catch (error) {
      console.error('Failed to run IAM resilience suite', error)
      toast.error('Failed to run IAM resilience suite')
    } finally {
      setIsSaving(null)
    }
  }

  const handleRunBenchmark = async (suiteId?: string) => {
    setIsSaving(`benchmark:${suiteId ?? 'full'}`)
    try {
      await idpApi.runIamBenchmarkSuite(suiteId ? { suite_id: suiteId } : {})
      toast.success('Benchmark suite completed')
      await load()
    } catch (error) {
      console.error('Failed to run IAM benchmark suite', error)
      toast.error('Failed to run IAM benchmark suite')
    } finally {
      setIsSaving(null)
    }
  }

  const handleRunRecoveryDrill = async () => {
    setIsSaving('recovery')
    try {
      await idpApi.runIamRecoveryDrill(selectedBackupId ? { backup_id: selectedBackupId } : {})
      toast.success('Recovery drill completed')
      await load()
    } catch (error) {
      console.error('Failed to run IAM recovery drill', error)
      toast.error('Failed to run IAM recovery drill')
    } finally {
      setIsSaving(null)
    }
  }

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Operations</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Deployment, Recovery, and Service Operations</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            This tab is the IAM operational console: deployment posture, bootstrap packaging, health, benchmarks, backups, restore drills,
            signing-key rotation, and resilience evidence. Review records are retained as governance metadata, but the workflows here are
            runtime and operations-focused.
          </p>
        </div>
        {summary && (
          <span className={`inline-flex rounded-full px-3 py-2 text-sm font-medium ${labelForHealth(summary.health)}`}>
            {summary.health}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
          Loading IAM operations…
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={DatabaseBackup} label="Backups" value={String(summary?.backup_count ?? 0)} detail={`${summary?.restore_count ?? 0} restore records`} />
            <SummaryCard icon={KeyRound} label="Key Rotations" value={String(displayedRotationCount)} detail={`${signingKeys.filter((key) => key.status === 'ACTIVE').length} active keys in scope`} />
            <SummaryCard icon={Activity} label="Benchmarks" value={String(summary?.benchmark_run_count ?? 0)} detail={latestBenchmarkRun?.overall_status ?? 'No runs yet'} />
            <SummaryCard icon={RefreshCcw} label="Recovery Drills" value={String(summary?.recovery_drill_count ?? 0)} detail={latestRecoveryDrill?.status ?? 'No drills yet'} />
            <SummaryCard icon={ShieldCheck} label="Governance Decisions" value={String(summary?.readiness_review_count ?? 0)} detail={summary?.latest_readiness_decision ?? 'Not recorded'} />
            <SummaryCard icon={ShieldCheck} label="Service Checks" value={String(summary?.standalone_health_check_count ?? 0)} detail={health?.overall_status ?? 'Unknown'} />
            <SummaryCard icon={Activity} label="Deployment" value={summary?.active_deployment_topology_mode?.replace(/_/g, ' ') ?? 'Unknown'} detail={activeDeployment?.regions.join(', ') ?? 'No regions'} />
            <SummaryCard icon={RefreshCcw} label="Scope" value={selectedRealmId ? 'Realm' : 'Global'} detail={selectedRealmId || 'Global signing keys'} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <Panel title="Diagnostics and SLOs" description="Operational diagnostics and service-level objectives for IAM runtime operations.">
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(diagnostics?.counts ?? {}).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{key.replace(/_/g, ' ')}</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Runbooks</div>
                    {diagnostics?.runbooks.map((runbook) => (
                      <div key={runbook.id} className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
                        <div className="font-medium text-slate-900 dark:text-white">{runbook.title}</div>
                        <div className="mt-1 text-slate-600 dark:text-slate-400">{runbook.summary}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">SLO Definitions</div>
                    {diagnostics?.slo_definitions.map((slo) => (
                      <div key={slo.id} className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
                        <div className="font-medium text-slate-900 dark:text-white">{slo.name}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{slo.target}</div>
                        <div className="mt-2 text-slate-600 dark:text-slate-400">{slo.summary}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {diagnostics?.advisories && diagnostics.advisories.length > 0 && (
                  <div className="mt-5 space-y-2">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Current Advisories</div>
                    {diagnostics.advisories.map((advisory) => (
                      <div key={advisory} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                        {advisory}
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Deployment Topology" description="Manage AWS deployment topology, service regions, and platform posture for IAM operations.">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">Active topology</div>
                      <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">{activeDeployment?.summary}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Topology Mode</label>
                      <select
                        value={selectedTopologyMode}
                        onChange={(event) => setSelectedTopologyMode(event.target.value as IamDeploymentTopologyMode)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        {deployment?.supported_topology_modes.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/40">
                      <div className="font-medium text-slate-900 dark:text-white">Deployment posture</div>
                      <div className="mt-2 text-slate-600 dark:text-slate-400">Regions: {activeDeployment?.regions.join(', ') ?? 'n/a'}</div>
                      <div className="mt-1 text-slate-600 dark:text-slate-400">Cost band: {activeDeployment?.estimated_monthly_cost_band ?? 'n/a'}</div>
                      <div className="mt-1 text-slate-600 dark:text-slate-400">Data plane: {activeDeployment?.data_plane ?? 'n/a'}</div>
                      <div className="mt-1 text-slate-600 dark:text-slate-400">Secret plane: {activeDeployment?.secret_plane ?? 'n/a'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleUpdateDeployment}
                      disabled={!canManage || isSaving === 'deployment'}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                    >
                      {isSaving === 'deployment' ? 'Updating…' : 'Update Deployment'}
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Modeled AWS resources</div>
                    {deployment?.resources.map((resource) => (
                      <div key={resource.id} className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-slate-900 dark:text-white">{resource.label}</div>
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                            {resource.status}
                          </span>
                        </div>
                        <div className="mt-1 text-slate-600 dark:text-slate-400">{resource.service}</div>
                        <div className="mt-2 text-slate-600 dark:text-slate-400">{resource.summary}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>

              <Panel title="Bootstrap Package" description="Operator bootstrap instructions and environment package for provisioning, recovery, and auditability.">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Latest package: <span className="font-medium text-slate-900 dark:text-white">{latestBootstrapPackage?.version_label ?? 'None'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRegenerateBootstrap}
                    disabled={!canManage || isSaving === 'bootstrap'}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {isSaving === 'bootstrap' ? 'Generating…' : 'Regenerate Package'}
                  </button>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Environment variables</div>
                    {latestBootstrapPackage?.environment_variables.map((entry) => (
                      <div key={entry.key} className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
                        <div className="font-medium text-slate-900 dark:text-white">{entry.key}</div>
                        <div className="mt-1 text-slate-600 dark:text-slate-400">{entry.summary}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Bootstrap artifacts</div>
                    {latestBootstrapPackage?.artifacts.map((artifact) => (
                      <div key={artifact.path} className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
                        <div className="font-medium text-slate-900 dark:text-white">{artifact.path}</div>
                        <div className="mt-1 text-slate-600 dark:text-slate-400">{artifact.summary}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Bootstrap steps</div>
                    {latestBootstrapPackage?.bootstrap_steps.map((step) => (
                      <div key={step} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                        {step}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Verification steps</div>
                    {latestBootstrapPackage?.validation_steps.map((step) => (
                      <div key={step} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>

              <Panel title="Backup and Restore" description="Create recoverable snapshots, rehearse restore, and execute restoration against explicitly selected backups.">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <select
                    value={selectedBackupId}
                    onChange={(event) => setSelectedBackupId(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="">Select backup</option>
                    {backups.map((backup) => (
                      <option key={backup.id} value={backup.id}>
                        {backup.label} · {new Date(backup.created_at).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleCreateBackup}
                      disabled={!canManage || isSaving === 'backup'}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                    >
                      {isSaving === 'backup' ? 'Creating…' : 'Create Backup'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRestore('DRY_RUN')}
                      disabled={!canManage || !selectedBackupId || isSaving === 'DRY_RUN'}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {isSaving === 'DRY_RUN' ? 'Running…' : 'Dry-Run Restore'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRestore('EXECUTE')}
                      disabled={!canManage || !selectedBackupId || isSaving === 'EXECUTE'}
                      className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-950/30"
                    >
                      {isSaving === 'EXECUTE' ? 'Restoring…' : 'Execute Restore'}
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div>
                    <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Recent Backups</div>
                    <div className="space-y-3">
                      {backups.slice(0, 4).map((backup) => (
                        <div key={backup.id} className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
                          <div className="font-medium text-slate-900 dark:text-white">{backup.label}</div>
                          <div className="mt-1 text-slate-600 dark:text-slate-400">{backup.object_key}</div>
                          <div className="mt-2 text-xs text-slate-500">{backup.summary.realm_count} realms · {backup.summary.user_count} users · {backup.summary.client_count} clients</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Recent Restore Evidence</div>
                    <div className="space-y-3">
                      {restores.slice(0, 4).map((restore) => (
                        <div key={restore.id} className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
                          <div className="font-medium text-slate-900 dark:text-white">{restore.mode} · {restore.status}</div>
                          <div className="mt-1 text-slate-600 dark:text-slate-400">Backup {restore.backup_id}</div>
                          <div className="mt-2 text-xs text-slate-500">{restore.summary.realm_count} realms · {restore.summary.user_count} users</div>
                        </div>
                      ))}
                      {!latestRestore && (
                        <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                          No restore rehearsal has been recorded yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Panel>
            </div>

            <div className="space-y-6">
              <Panel title="Health and Benchmarks" description="Track IAM service health and benchmark trends for operational reliability.">
                {!benchmarkCatalog?.market_claim_ready && (
                  <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                    Benchmark outputs are currently synthetic modeled evidence. They are useful for internal remediation tracking, but they are not measured load proof for parity or production claims.
                  </div>
                )}
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-slate-900 dark:text-white">Service health</div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${labelForHealth(health?.overall_status ?? 'DEGRADED')}`}>
                      {health?.overall_status ?? 'UNKNOWN'}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {health?.checks.map((check) => (
                      <div key={check.id} className="rounded-lg border border-slate-200 px-3 py-3 text-sm dark:border-slate-800">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-slate-900 dark:text-white">{check.name}</div>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${labelForCheckStatus(check.status)}`}>
                            {check.status}
                          </span>
                        </div>
                        <div className="mt-1 text-slate-600 dark:text-slate-400">{check.summary}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleRunBenchmark()}
                    disabled={!canManage || isSaving === 'benchmark:full'}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                  >
                    {isSaving === 'benchmark:full' ? 'Running…' : 'Run Full Benchmark'}
                  </button>
                  {benchmarkCatalog?.suites.slice(0, 3).map((suite) => (
                    <button
                      key={suite.id}
                      type="button"
                      onClick={() => handleRunBenchmark(suite.id)}
                      disabled={!canManage || isSaving === `benchmark:${suite.id}`}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {isSaving === `benchmark:${suite.id}` ? 'Running…' : `Run ${suite.name}`}
                    </button>
                  ))}
                </div>
                {latestBenchmarkRun && (
                  <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-slate-900 dark:text-white">{latestBenchmarkRun.suite_name}</div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${labelForCheckStatus(latestBenchmarkRun.overall_status)}`}>
                        {latestBenchmarkRun.overall_status}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {latestBenchmarkRun.metrics.map((metric) => (
                        <div key={metric.id} className="rounded-lg border border-slate-200 px-3 py-3 text-sm dark:border-slate-800">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-medium text-slate-900 dark:text-white">{metric.name}</div>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${labelForCheckStatus(metric.status)}`}>
                              {metric.value} {metric.unit}
                            </span>
                          </div>
                          <div className="mt-1 text-slate-600 dark:text-slate-400">Target: {metric.target}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                      {latestBenchmarkRun.evidence_summary}
                    </div>
                  </div>
                )}
              </Panel>

              <Panel title="Recovery Hardening" description="Recovery objectives, drill evidence, and hardened backup posture for IAM service operations.">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="font-medium text-slate-900 dark:text-white">{recovery?.profile.name}</div>
                  <div className="mt-2 text-slate-600 dark:text-slate-400">Backup storage: {recovery?.profile.backup_storage_mode}</div>
                  <div className="mt-1 text-slate-600 dark:text-slate-400">Database recovery: {recovery?.profile.database_recovery_mode}</div>
                  <div className="mt-1 text-slate-600 dark:text-slate-400">Replication: {recovery?.profile.replication_mode}</div>
                  <div className="mt-1 text-slate-600 dark:text-slate-400">RPO target: {recovery?.profile.rpo_target_minutes} minutes</div>
                  <div className="mt-1 text-slate-600 dark:text-slate-400">RTO target: {recovery?.profile.rto_target_minutes} minutes</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleRunRecoveryDrill}
                    disabled={!canManage || isSaving === 'recovery'}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {isSaving === 'recovery' ? 'Running…' : 'Run Recovery Drill'}
                  </button>
                </div>
                {latestRecoveryDrill && (
                  <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-slate-900 dark:text-white">Latest recovery drill</div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${labelForCheckStatus(latestRecoveryDrill.status)}`}>
                        {latestRecoveryDrill.status}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      {latestRecoveryDrill.measured_recovery_minutes} minutes measured against a {latestRecoveryDrill.rto_target_minutes}-minute RTO target.
                    </div>
                    <div className="mt-3 space-y-2">
                      {latestRecoveryDrill.notes.map((note) => (
                        <div key={note} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                          {note}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Panel>

              <Panel title="Signing Keys" description="Rotate the current signing key while retaining older verification keys for token rollover validation.">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Scope: <span className="font-medium text-slate-900 dark:text-white">{selectedRealmId || 'Global keyset'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRotateKey}
                    disabled={!canManage || isSaving === 'rotate-key'}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                  >
                    {isSaving === 'rotate-key' ? 'Rotating…' : 'Rotate Key'}
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {signingKeys.map((key) => (
                    <div key={key.id} className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-slate-900 dark:text-white">{key.key_id}</div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${key.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                          {key.status}
                        </span>
                      </div>
                      <div className="mt-1 text-slate-600 dark:text-slate-400">{key.realm_id || 'global'}</div>
                      <div className="mt-2 text-xs text-slate-500">{new Date(key.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                {signingKeys[0] && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
                    Latest visible key in scope is <span className="font-medium text-slate-900 dark:text-white">{signingKeys[0].key_id}</span>.
                  </div>
                )}
              </Panel>

              <Panel title="Resilience and Governance Snapshot" description="Run resilience checks and monitor governance decision status for operational audit trails.">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleRunResilience}
                    disabled={!canManage || isSaving === 'resilience'}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {isSaving === 'resilience' ? 'Running…' : 'Run Resilience Suite'}
                  </button>
                </div>

                {latestResilienceRun && (
                  <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-slate-900 dark:text-white">Latest resilience run</div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${labelForHealth(latestResilienceRun.overall_status === 'PASS' ? 'HEALTHY' : latestResilienceRun.overall_status === 'FAIL' ? 'FAILED' : 'DEGRADED')}`}>
                        {latestResilienceRun.overall_status}
                      </span>
                    </div>
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                      {latestResilienceRun.evidence_summary}
                    </div>
                    <div className="mt-3 space-y-2">
                      {latestResilienceRun.checks.map((check) => (
                        <div key={check.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                          <div className="font-medium text-slate-900 dark:text-white">{check.name}</div>
                          <div className="mt-1 text-slate-600 dark:text-slate-400">{check.summary}</div>
                          <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">{check.evidence_summary}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="font-medium text-slate-900 dark:text-white">Governance status</div>
                  {!readinessReview?.market_claim_ready && readinessReview?.evidence_summary ? (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                      {readinessReview.evidence_summary}
                    </div>
                  ) : null}
                  <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Latest review decision: <span className="font-medium text-slate-900 dark:text-white">{latestReview?.decision ?? 'Not recorded'}</span>
                  </div>
                  {readinessReview?.claim_boundary_notes?.length ? (
                    <div className="mt-3 space-y-2">
                      {readinessReview.claim_boundary_notes.map((note) => (
                        <div key={note} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                          {note}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">
                    Formal review authoring lives in the Review tab.
                  </div>
                  <div className="mt-4 space-y-3">
                    {readinessReview?.checks.length ? (
                      readinessReview.checks.map((check) => (
                        <div key={check.id} className="rounded-lg border border-slate-200 px-3 py-3 text-sm dark:border-slate-800">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-medium text-slate-900 dark:text-white">{check.name}</div>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                              check.status === 'PASS'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                                : check.status === 'FAIL'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                            }`}>
                              {check.status}
                            </span>
                          </div>
                          <div className="mt-1 text-slate-600 dark:text-slate-400">{check.summary}</div>
                          <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">{check.evidence_summary}</div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        No governance checks are currently published.
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
      </div>
      <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">{detail}</div>
    </div>
  )
}
