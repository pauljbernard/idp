import { LocalIamAuthenticationRuntimeStore } from './iamAuthenticationRuntime';
import { LocalIamBenchmarkRuntimeStore } from './iamBenchmarkRuntime';
import { LocalIamDeploymentRuntimeStore } from './iamDeploymentRuntime';
import { LocalIamFederationFailoverStore } from './iamFederationFailover';
import { LocalIamFederationRuntimeStore } from './iamFederationRuntime';
import { LocalIamFoundationStore } from './iamFoundation';
import { LocalIamOperationsRuntimeStore } from './iamOperationsRuntime';
import { LocalIamProtocolRuntimeStore } from './iamProtocolRuntime';
import { LocalIamRecoveryRuntimeStore } from './iamRecoveryRuntime';
import { LocalIamSecurityAuditStore } from './iamSecurityAudit';
import { LocalSecretStore } from './secretStore';
import { LocalIamStandaloneBootstrapStore } from './iamStandaloneBootstrap';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

export type IamStandaloneHealthStatus = 'HEALTHY' | 'DEGRADED' | 'FAILED';

export interface IamStandaloneHealthCheck {
  id: string;
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  summary: string;
}

export const LocalIamHealthRuntimeStore = {
  getHealthSummary(): {
    generated_at: string;
    overall_status: IamStandaloneHealthStatus;
    checks: IamStandaloneHealthCheck[];
    advisories: string[];
    count: number;
  } {
    const foundationSummary = LocalIamFoundationStore.getSummary();
    const deploymentSummary = LocalIamDeploymentRuntimeStore.getSummary();
    const bootstrapSummary = LocalIamStandaloneBootstrapStore.getSummary();
    const protocolSummary = LocalIamProtocolRuntimeStore.getSummary();
    const authenticationSummary = LocalIamAuthenticationRuntimeStore.getSummary();
    const operationsSummary = LocalIamOperationsRuntimeStore.getSummary();
    const readinessWorkspace = LocalIamOperationsRuntimeStore.getReadinessReview();
    const recoverySummary = LocalIamRecoveryRuntimeStore.getSummary();
    const benchmarkSummary = LocalIamBenchmarkRuntimeStore.getSummary();
    const auditSummary = LocalIamSecurityAuditStore.getSummary();
    const federationSummary = LocalIamFederationRuntimeStore.getSummary();
    const federationFailoverSummary = LocalIamFederationFailoverStore.getSummary();
    const secretStoreSummary = LocalSecretStore.getSummary();
    const authenticationRuntimeRepositoryStatus = LocalIamAuthenticationRuntimeStore.getRuntimeRepositoryStatus();
    const protocolRuntimeRepositoryStatus = LocalIamProtocolRuntimeStore.getRuntimeRepositoryStatus();
    const runtimeCutoverStatuses = [
      authenticationRuntimeRepositoryStatus.login_transactions,
      authenticationRuntimeRepositoryStatus.tickets,
      authenticationRuntimeRepositoryStatus.sessions,
      protocolRuntimeRepositoryStatus.issued_tokens,
    ];
    const runtimeCutoverActive = authenticationRuntimeRepositoryStatus.mode.dual_write
      || authenticationRuntimeRepositoryStatus.mode.read_v2
      || protocolRuntimeRepositoryStatus.mode.dual_write
      || protocolRuntimeRepositoryStatus.mode.read_v2;
    const runtimeCutoverHealth: 'PASS' | 'WARN' | 'FAIL' = runtimeCutoverStatuses.some((status) => status === 'NOOP_FALLBACK')
      ? 'FAIL'
      : runtimeCutoverActive
        ? runtimeCutoverStatuses.every((status) => status === 'DYNAMO_V2_ACTIVE')
          ? 'PASS'
          : 'WARN'
        : 'WARN';
    const runtimeCutoverSummary = !runtimeCutoverActive
      ? 'Runtime cutover flags are disabled; shared-durable v2 adapter activation has not been proven yet.'
      : runtimeCutoverStatuses.some((status) => status === 'NOOP_FALLBACK')
        ? `Runtime cutover flags are enabled, but at least one v2 path is in noop fallback: sessions=${authenticationRuntimeRepositoryStatus.sessions}, tickets=${authenticationRuntimeRepositoryStatus.tickets}, login_transactions=${authenticationRuntimeRepositoryStatus.login_transactions}, issued_tokens=${protocolRuntimeRepositoryStatus.issued_tokens}.`
        : `Runtime cutover flags are enabled and all Sequence A v2 paths resolved to Dynamo-backed adapters: sessions=${authenticationRuntimeRepositoryStatus.sessions}, tickets=${authenticationRuntimeRepositoryStatus.tickets}, login_transactions=${authenticationRuntimeRepositoryStatus.login_transactions}, issued_tokens=${protocolRuntimeRepositoryStatus.issued_tokens}.`;
    const readinessHardeningChecks = readinessWorkspace.checks.filter((check) => [
      'backup-artifact',
      'restore-evidence',
      'restore-rehearsal-lineage',
      'signing-key-rotation',
      'secret-store-key-source',
    ].includes(check.id));
    const failedHardeningChecks = readinessHardeningChecks.filter((check) => check.status === 'FAIL');
    const nonPassingHardeningChecks = readinessHardeningChecks.filter((check) => check.status !== 'PASS');
    const operationsEvidenceHardeningStatus: 'PASS' | 'WARN' | 'FAIL' = failedHardeningChecks.length > 0
      ? 'FAIL'
      : nonPassingHardeningChecks.length > 0
        ? 'WARN'
        : 'PASS';
    const operationsEvidenceHardeningSummary = nonPassingHardeningChecks.length === 0
      ? `Operational evidence hardening is current: backups, restore rehearsal, signing-key rotation, and secret-store key source all satisfy readiness criteria.`
      : `Operational evidence hardening still needs work for ${nonPassingHardeningChecks.map((check) => check.name).join(', ')}. Secret-store key source is ${secretStoreSummary.key_source}.`;

    const checks: IamStandaloneHealthCheck[] = [
      {
        id: 'standalone-boundary',
        name: 'Standalone subsystem boundary',
        status: foundationSummary.scope_model === 'STANDALONE_MULTI_REALM_WITH_CONSUMER_BINDINGS' ? 'PASS' : 'FAIL',
        summary: foundationSummary.scope_model === 'STANDALONE_MULTI_REALM_WITH_CONSUMER_BINDINGS'
          ? 'The IAM plane remains standalone and decoupled from downstream application runtime.'
          : 'The subsystem boundary no longer reflects standalone operation.',
      },
      {
        id: 'aws-native-deployment',
        name: 'AWS-native deployment topology',
        status: deploymentSummary.aws_native_ready ? 'PASS' : 'WARN',
        summary: `${deploymentSummary.active_topology_mode} is the active standalone deployment topology across ${deploymentSummary.resource_count} modeled AWS resources.`,
      },
      {
        id: 'bootstrap-package',
        name: 'Bootstrap package readiness',
        status: bootstrapSummary.bootstrap_package_count > 0 ? 'PASS' : 'WARN',
        summary: bootstrapSummary.bootstrap_package_count > 0
          ? `Bootstrap package ${bootstrapSummary.latest_package_id} is available for standalone deployment setup.`
          : 'No standalone bootstrap package has been generated yet.',
      },
      {
        id: 'protocol-runtime',
        name: 'Protocol runtime posture',
        status: protocolSummary.client_count > 0 && protocolSummary.active_signing_key_count > 0 ? 'PASS' : 'FAIL',
        summary: `${protocolSummary.client_count} clients and ${protocolSummary.active_signing_key_count} active signing keys are present in the standalone runtime.`,
      },
      {
        id: 'browser-auth-runtime',
        name: 'Browser authentication posture',
        status: authenticationSummary.active_browser_session_count >= 0 ? 'PASS' : 'FAIL',
        summary: `${authenticationSummary.browser_session_count} sessions and ${authenticationSummary.mfa_enrollment_count} MFA enrollments are currently tracked.`,
      },
      {
        id: 'runtime-cutover-readiness',
        name: 'Runtime cutover readiness',
        status: runtimeCutoverHealth,
        summary: runtimeCutoverSummary,
      },
      {
        id: 'recovery-hardening',
        name: 'Recovery hardening',
        status: !recoverySummary.latest_drill_status
          ? 'WARN'
          : !recoverySummary.latest_drill_lineage_validated
            ? 'FAIL'
            : !recoverySummary.latest_drill_targets_latest_backup || !recoverySummary.latest_drill_is_fresh
              ? 'WARN'
              : recoverySummary.latest_drill_status === 'PASS'
                ? 'PASS'
                : 'WARN',
        summary: !recoverySummary.latest_drill_status
          ? 'No recovery drill has been recorded yet.'
          : !recoverySummary.latest_drill_lineage_validated
            ? `Latest recovery drill finished with ${recoverySummary.latest_drill_status}, but backup lineage validation failed.`
            : !recoverySummary.latest_drill_targets_latest_backup
              ? `Latest recovery drill finished with ${recoverySummary.latest_drill_status}, but it did not target the latest backup artifact at execution time.`
              : !recoverySummary.latest_drill_is_fresh
                ? `Latest recovery drill finished with ${recoverySummary.latest_drill_status}, but the evidence is older than the fourteen-day recovery freshness window.`
                : `Latest recovery drill finished with ${recoverySummary.latest_drill_status} against the latest backup lineage within the fourteen-day recovery freshness window.`,
      },
      {
        id: 'operations-evidence-hardening',
        name: 'Operations evidence hardening',
        status: operationsEvidenceHardeningStatus,
        summary: operationsEvidenceHardeningSummary,
      },
      {
        id: 'benchmark-evidence',
        name: 'Benchmark evidence',
        status: benchmarkSummary.latest_benchmark_status === 'PASS'
          ? 'PASS'
          : benchmarkSummary.latest_benchmark_status
            ? 'WARN'
            : 'WARN',
        summary: benchmarkSummary.latest_benchmark_status
          ? `Latest benchmark suite finished with ${benchmarkSummary.latest_benchmark_status}.`
          : 'No benchmark evidence has been recorded yet.',
      },
      {
        id: 'security-audit',
        name: 'Security audit coverage',
        status: auditSummary.request_count > 0 ? 'PASS' : 'WARN',
        summary: `${auditSummary.request_count} audited requests and ${auditSummary.failure_count} audited failures are retained for standalone review.`,
      },
      {
        id: 'readiness-posture',
        name: 'Formal readiness posture',
        status: operationsSummary.latest_readiness_decision === 'APPROVED' ? 'PASS' : 'WARN',
        summary: operationsSummary.latest_readiness_decision
          ? `Latest formal readiness decision is ${operationsSummary.latest_readiness_decision}.`
          : 'No formal readiness review has been recorded yet.',
      },
      {
        id: 'federation-providers',
        name: 'Federation identity providers',
        status: federationSummary.identity_provider_count > 0
          ? federationSummary.active_identity_provider_count > 0 ? 'PASS' : 'WARN'
          : 'WARN',
        summary: `${federationSummary.active_identity_provider_count} of ${federationSummary.identity_provider_count} identity providers are active across OIDC and SAML protocols.`,
      },
      {
        id: 'federation-trust-stores',
        name: 'Federation trust stores',
        status: federationSummary.federation_trust_store_count > 0
          ? federationSummary.active_federation_trust_store_count > 0 ? 'PASS' : 'WARN'
          : 'WARN',
        summary: `${federationSummary.active_federation_trust_store_count} of ${federationSummary.federation_trust_store_count} federation trust stores are active for certificate and metadata management.`,
      },
      {
        id: 'user-federation-providers',
        name: 'User federation providers',
        status: federationSummary.user_federation_provider_count > 0
          ? federationSummary.active_user_federation_provider_count > 0 ? 'PASS' : 'WARN'
          : 'WARN',
        summary: `${federationSummary.active_user_federation_provider_count} of ${federationSummary.user_federation_provider_count} user federation providers are active for directory integration.`,
      },
      {
        id: 'federation-linked-identities',
        name: 'Federation linked identities',
        status: federationSummary.linked_identity_count > 0 ? 'PASS' : 'WARN',
        summary: `${federationSummary.linked_identity_count} external identities are linked with local users for federated authentication.`,
      },
      {
        id: 'federation-failover',
        name: 'Federation failover and monitoring',
        status: federationFailoverSummary.failed_providers === 0
          ? federationFailoverSummary.circuit_breakers_open === 0 ? 'PASS' : 'WARN'
          : 'WARN',
        summary: `${federationFailoverSummary.healthy_providers} healthy, ${federationFailoverSummary.degraded_providers} degraded, ${federationFailoverSummary.failed_providers} failed providers; ${federationFailoverSummary.circuit_breakers_open} circuit breakers open.`,
      },
    ];

    const overall_status: IamStandaloneHealthStatus = checks.some((check) => check.status === 'FAIL')
      ? 'FAILED'
      : checks.some((check) => check.status === 'WARN')
        ? 'DEGRADED'
        : 'HEALTHY';

    const advisories = checks
      .filter((check) => check.status !== 'PASS')
      .map((check) => check.summary);

    return {
      generated_at: nowIso(),
      overall_status,
      checks: clone(checks),
      advisories,
      count: checks.length,
    };
  },
};
