import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IamOperationsPanel } from '../src/components/iam/IamOperationsPanel'

const mocks = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockGetIamOperationsSummary: vi.fn(),
  mockGetIamOperationsDiagnostics: vi.fn(),
  mockGetIamDeploymentProfile: vi.fn(),
  mockGetIamBootstrapPackage: vi.fn(),
  mockGetIamHealthSummary: vi.fn(),
  mockGetIamBenchmarkCatalog: vi.fn(),
  mockGetIamRecoveryProfile: vi.fn(),
  mockListIamBackups: vi.fn(),
  mockListIamRestoreRecords: vi.fn(),
  mockListIamSigningKeys: vi.fn(),
  mockListIamResilienceRuns: vi.fn(),
  mockGetIamReadinessReview: vi.fn(),
  mockCreateIamBackup: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  toast: {
    error: mocks.mockToastError,
    success: mocks.mockToastSuccess,
  },
}))

vi.mock('../src/services/standaloneApi', () => ({
  idpApi: {
    getIamOperationsSummary: mocks.mockGetIamOperationsSummary,
    getIamOperationsDiagnostics: mocks.mockGetIamOperationsDiagnostics,
    getIamDeploymentProfile: mocks.mockGetIamDeploymentProfile,
    getIamBootstrapPackage: mocks.mockGetIamBootstrapPackage,
    getIamHealthSummary: mocks.mockGetIamHealthSummary,
    getIamBenchmarkCatalog: mocks.mockGetIamBenchmarkCatalog,
    getIamRecoveryProfile: mocks.mockGetIamRecoveryProfile,
    listIamBackups: mocks.mockListIamBackups,
    listIamRestoreRecords: mocks.mockListIamRestoreRecords,
    listIamSigningKeys: mocks.mockListIamSigningKeys,
    listIamResilienceRuns: mocks.mockListIamResilienceRuns,
    getIamReadinessReview: mocks.mockGetIamReadinessReview,
    createIamBackup: mocks.mockCreateIamBackup,
  },
}))

function configureLoad() {
  mocks.mockGetIamOperationsSummary.mockResolvedValue({
    health: 'HEALTHY',
    backup_count: 2,
    restore_count: 1,
    key_rotation_count: 3,
    benchmark_run_count: 1,
    recovery_drill_count: 1,
    readiness_review_count: 1,
    standalone_health_check_count: 2,
    active_deployment_topology_mode: 'AWS_SINGLE_REGION_HA',
    latest_readiness_decision: 'PASS',
  })
  mocks.mockGetIamOperationsDiagnostics.mockResolvedValue({
    counts: { runbooks: 1, incidents: 0 },
    runbooks: [{ id: 'runbook-1', title: 'Backup Restore', summary: 'Restore runbook' }],
    slo_definitions: [{ id: 'slo-1', name: 'Login latency', target: '<250ms', summary: 'Auth latency SLO' }],
    advisories: [],
  })
  mocks.mockGetIamDeploymentProfile.mockResolvedValue({
    active_profile: {
      topology_mode: 'AWS_SINGLE_REGION_HA',
      summary: 'Single region profile',
      regions: ['us-east-1'],
      estimated_monthly_cost_band: '$$',
      data_plane: 'DynamoDB',
      secret_plane: 'Secrets Manager',
      operator_notes: 'notes',
    },
    supported_topology_modes: ['AWS_SINGLE_REGION_HA', 'AWS_MULTI_REGION'],
    resources: [{ id: 'resource-1', label: 'Runtime Table', status: 'ACTIVE', service: 'DynamoDB', summary: 'Runtime data plane' }],
  })
  mocks.mockGetIamBootstrapPackage.mockResolvedValue({
    latest_package: {
      version_label: 'v1',
      environment_variables: [{ key: 'IDP_IAM_RUNTIME_DDB_TABLE', summary: 'Runtime table name' }],
      artifacts: [{ path: 'deploy/runtime.yml', summary: 'Template' }],
      bootstrap_steps: ['Provision tables'],
      validation_steps: ['Verify health'],
    },
  })
  mocks.mockGetIamHealthSummary.mockResolvedValue({
    overall_status: 'HEALTHY',
    checks: [{ id: 'check-1', name: 'API', status: 'PASS', summary: 'Healthy' }],
  })
  mocks.mockGetIamBenchmarkCatalog.mockResolvedValue({
    market_claim_ready: false,
    suites: [{ id: 'suite-1', name: 'Auth Smoke' }],
    runs: [{ suite_name: 'Auth Smoke', overall_status: 'WARN', metrics: [{ id: 'metric-1', name: 'Latency', value: 120, unit: 'ms', target: '<250ms', status: 'PASS' }], evidence_summary: 'Synthetic evidence' }],
  })
  mocks.mockGetIamRecoveryProfile.mockResolvedValue({
    profile: {
      name: 'Primary recovery',
      backup_storage_mode: 'S3',
      database_recovery_mode: 'PITR',
      replication_mode: 'SINGLE_REGION',
      rpo_target_minutes: 15,
      rto_target_minutes: 60,
    },
    latest_drill: {
      status: 'PASS',
      measured_recovery_minutes: 30,
      rto_target_minutes: 60,
      notes: ['Drill complete'],
    },
  })
  mocks.mockListIamBackups.mockResolvedValue({
    backups: [{ id: 'backup-1', label: 'Nightly Backup', created_at: '2026-04-27T00:00:00.000Z', object_key: 'backups/nightly.json', summary: { realm_count: 1, user_count: 10, client_count: 4 } }],
  })
  mocks.mockListIamRestoreRecords.mockResolvedValue({
    restores: [{ id: 'restore-1', backup_id: 'backup-1', mode: 'DRY_RUN', status: 'PASS', summary: { realm_count: 1, user_count: 10 } }],
  })
  mocks.mockListIamSigningKeys.mockResolvedValue({
    signing_keys: [{ id: 'key-1', key_id: 'kid-1', status: 'ACTIVE', realm_id: 'realm-idp-default', created_at: '2026-04-27T00:00:00.000Z' }],
  })
  mocks.mockListIamResilienceRuns.mockResolvedValue({
    runs: [{ overall_status: 'PASS', evidence_summary: 'All checks passed', checks: [{ id: 'check-1', name: 'Failover', summary: 'OK', evidence_summary: 'evidence' }] }],
  })
  mocks.mockGetIamReadinessReview.mockResolvedValue({
    market_claim_ready: false,
    evidence_summary: 'Boundary note',
    latest_review: { decision: 'PASS' },
    claim_boundary_notes: ['Synthetic benchmark evidence'],
    checks: [{ id: 'check-1', name: 'Review', status: 'PASS', summary: 'Ready', evidence_summary: 'Documented' }],
  })
}

describe('IamOperationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configureLoad()
    mocks.mockCreateIamBackup.mockResolvedValue({ id: 'backup-2' })
  })

  it('loads operations data and creates a backup', async () => {
    render(React.createElement(IamOperationsPanel, {
      selectedRealmId: 'realm-idp-default',
      canManage: true,
    }))

    expect(await screen.findByText('Deployment, Recovery, and Service Operations')).toBeInTheDocument()
    expect(screen.getByText('Nightly Backup')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Create Backup' }))

    await waitFor(() => {
      expect(mocks.mockCreateIamBackup).toHaveBeenCalledWith({
        label: 'Realm-scoped operations backup realm-idp-default',
      })
    })
    expect(mocks.mockToastSuccess).toHaveBeenCalledWith('IAM backup created')
  })
})
