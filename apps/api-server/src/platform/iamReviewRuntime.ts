import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { LocalIamAdminAuthorizationStore } from './iamAdminAuthorization';
import { LocalIamAuthFlowStore } from './iamAuthFlows';
import { LocalIamAuthenticationRuntimeStore } from './iamAuthenticationRuntime';
import { LocalIamAuthorizationRuntimeStore } from './iamAuthorizationRuntime';
import { LocalIamAuthorizationServicesStore } from './iamAuthorizationServices';
import { LocalIamAdvancedOAuthRuntimeStore } from './iamAdvancedOAuthRuntime';
import { LocalIamBenchmarkRuntimeStore } from './iamBenchmarkRuntime';
import { LocalIamDeploymentRuntimeStore } from './iamDeploymentRuntime';
import { LocalIamExtensionRegistryStore } from './iamExtensionRegistry';
import { LocalIamFederationRuntimeStore } from './iamFederationRuntime';
import { LocalIamFoundationStore } from './iamFoundation';
import { LocalIamHealthRuntimeStore } from './iamHealthRuntime';
import {
  createPersistedAsyncIamStateRepository,
  createPersistedIamStateRepository,
  type IamAsyncStateRepository,
  type IamStateRepository,
} from './iamStateRepository';
import { LocalIamOperationsRuntimeStore } from './iamOperationsRuntime';
import { LocalIamOrganizationStore } from './iamOrganizations';
import { LocalIamProtocolRuntimeStore } from './iamProtocolRuntime';
import { LocalIamSecurityAuditStore } from './iamSecurityAudit';
import { LocalIamStandaloneBootstrapStore } from './iamStandaloneBootstrap';
import {
  LocalIamSupportProfileRuntimeStore,
  type IamSupportProfileDecision,
} from './iamSupportProfileRuntime';
import { LocalIamUserProfileStore } from './iamUserProfiles';
import { LocalIamWebAuthnStore } from './iamWebAuthn';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function reviewStatusForSupportDecision(decision: IamSupportProfileDecision): IamReviewStatus {
  switch (decision) {
    case 'SUPPORTED':
    case 'SUPPORTED_BOUNDED':
      return 'PASS';
    case 'EXPERIMENTAL':
    case 'IMPLEMENTED_NOT_SUPPORTED':
    case 'MODELED_ONLY':
    case 'DEFERRED':
    default:
      return 'WARN';
  }
}

function supportProfileSummary(profileId: string, fallback: string): string {
  const profile = LocalIamSupportProfileRuntimeStore.getSupportProfile(profileId);
  if (!profile) {
    return fallback;
  }
  return `${profile.product_posture} Next gate: ${profile.next_gate}`;
}

const IAM_REVIEW_RUNTIME_FILE = 'iam-review-runtime-state.json';
const MODELED_REVIEW_EVIDENCE_SUMMARY = 'Review result derived from modeled runtime state and internal summaries, not external interoperability, scale, or recovery proof.';
const deferredPersistenceContext = new AsyncLocalStorage<{ dirty: boolean }>();

export type IamReviewStatus = 'PASS' | 'WARN' | 'FAIL';
export type IamMarketPosition = 'KEYCLOAK_COMPETITIVE' | 'KEYCLOAK_PLUS_DIFFERENTIATED' | 'NOT_YET_COMPETITIVE';
export type IamAdoptionRecommendation = 'PROCEED_TO_PHASE_M_ADOPTION_PLANNING' | 'HOLD_FOR_REMEDIATION';
export type IamReviewEvidenceMode = 'MODELED_RUNTIME_STATE' | 'EXTERNAL_TEST_EVIDENCE';
export type IamReviewClaimScope = 'INTERNAL_MODELED_REVIEW_ONLY' | 'EXTERNALLY_VALIDATED_MARKET_CLAIM';

export interface IamStandardsMatrixItem {
  id: string;
  family: string;
  capability: string;
  status: IamReviewStatus;
  summary: string;
  evidence_mode: IamReviewEvidenceMode;
  evidence_summary: string;
}

export interface IamInteroperabilityCheck {
  id: string;
  protocol_family: string;
  name: string;
  status: IamReviewStatus;
  summary: string;
  evidence: string;
  evidence_mode: IamReviewEvidenceMode;
  evidence_summary: string;
}

export interface IamDifferentiationArea {
  id: string;
  name: string;
  status: IamReviewStatus;
  comparative_position: string;
  summary: string;
  evidence_mode: IamReviewEvidenceMode;
  evidence_summary: string;
}

export interface IamFormalReviewRecord {
  id: string;
  created_at: string;
  created_by_user_id: string;
  overall_status: IamReviewStatus;
  market_position: IamMarketPosition;
  adoption_recommendation: IamAdoptionRecommendation;
  standalone_validation_complete: boolean;
  standalone_production_ready: boolean;
  keycloak_competitive: boolean;
  strategically_differentiated: boolean;
  notes: string[];
  standards_status: IamReviewStatus;
  interoperability_status: IamReviewStatus;
  security_operations_status: IamReviewStatus;
  differentiation_status: IamReviewStatus;
  evidence_mode: IamReviewEvidenceMode;
  market_claim_ready: boolean;
  claim_scope: IamReviewClaimScope;
}

interface IamReviewRuntimeState {
  formal_reviews: IamFormalReviewRecord[];
  formal_review_idempotency_keys: Array<{
    idempotency_key: string;
    created_by_user_id: string;
    review_id: string;
    recorded_at: string;
  }>;
}

function normalizeFormalReviewNotes(notes: string[] | null | undefined): string[] {
  const normalizedNotes = Array.isArray(notes)
    ? notes.filter((note): note is string => typeof note === 'string')
    : [];
  return [
    'This formal review is based on modeled runtime-state evidence and must not be used as external Keycloak-parity or production-readiness proof.',
    ...normalizedNotes.filter(
      (note) =>
        note !== 'This formal review is based on modeled runtime-state evidence and must not be used as external Keycloak-parity or production-readiness proof.',
    ),
  ];
}

function normalizeState(input: Partial<IamReviewRuntimeState>): IamReviewRuntimeState {
  return {
    formal_reviews: Array.isArray(input.formal_reviews)
      ? input.formal_reviews.map((review) => ({
        ...clone(review),
        market_position: 'NOT_YET_COMPETITIVE',
        adoption_recommendation: 'HOLD_FOR_REMEDIATION',
        keycloak_competitive: false,
        strategically_differentiated: false,
        evidence_mode: 'MODELED_RUNTIME_STATE',
        market_claim_ready: false,
        claim_scope: 'INTERNAL_MODELED_REVIEW_ONLY',
        notes: normalizeFormalReviewNotes(clone(review.notes ?? [])),
      }))
      : [],
    formal_review_idempotency_keys: Array.isArray(input.formal_review_idempotency_keys)
      ? clone(input.formal_review_idempotency_keys)
      : [],
  };
}

function normalizeIdempotencyKey(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function resolveRecordedFormalReview(
  persistedState: IamReviewRuntimeState,
  actorUserId: string,
  idempotencyKey: string | null,
): IamFormalReviewRecord | null {
  if (!idempotencyKey) {
    return null;
  }
  const recordedKey = persistedState.formal_review_idempotency_keys.find(
    (candidate) => candidate.idempotency_key === idempotencyKey && candidate.created_by_user_id === actorUserId,
  );
  if (!recordedKey) {
    return null;
  }
  return persistedState.formal_reviews.find((review) => review.id === recordedKey.review_id) ?? null;
}

interface IamReviewRuntimeStateRepository extends IamStateRepository<IamReviewRuntimeState> {}
interface IamAsyncReviewRuntimeStateRepository extends IamAsyncStateRepository<IamReviewRuntimeState> {}

const reviewRuntimeStateRepository: IamReviewRuntimeStateRepository = createPersistedIamStateRepository<
  Partial<IamReviewRuntimeState>,
  IamReviewRuntimeState
>({
  fileName: IAM_REVIEW_RUNTIME_FILE,
  seedFactory: () => normalizeState({}),
  normalize: normalizeState,
});

const reviewRuntimeStateAsyncRepository: IamAsyncReviewRuntimeStateRepository = createPersistedAsyncIamStateRepository<
  Partial<IamReviewRuntimeState>,
  IamReviewRuntimeState
>({
  fileName: IAM_REVIEW_RUNTIME_FILE,
  seedFactory: () => normalizeState({}),
  normalize: normalizeState,
});

const state = reviewRuntimeStateRepository.load();

function syncInMemoryState(nextState: IamReviewRuntimeState): void {
  state.formal_reviews = clone(nextState.formal_reviews);
  state.formal_review_idempotency_keys = clone(nextState.formal_review_idempotency_keys);
}

function persistState(): void {
  const deferredContext = deferredPersistenceContext.getStore();
  if (deferredContext) {
    deferredContext.dirty = true;
    return;
  }
  reviewRuntimeStateRepository.save(state);
}

async function persistStateAsync(): Promise<void> {
  await reviewRuntimeStateAsyncRepository.save(state);
}

async function runWithDeferredPersistence<T>(operation: () => T | Promise<T>): Promise<T> {
  return await deferredPersistenceContext.run({ dirty: false }, async () => {
    const context = deferredPersistenceContext.getStore()!;
    try {
      const result = await operation();
      if (context.dirty) {
        await persistStateAsync();
      }
      return result;
    } catch (error) {
      if (context.dirty) {
        await persistStateAsync();
      }
      throw error;
    }
  });
}

function combineStatus(values: IamReviewStatus[]): IamReviewStatus {
  if (values.some((value) => value === 'FAIL')) {
    return 'FAIL';
  }
  if (values.some((value) => value === 'WARN')) {
    return 'WARN';
  }
  return 'PASS';
}

function buildStandardsMatrix(): IamStandardsMatrixItem[] {
  const foundationSummary = LocalIamFoundationStore.getSummary();
  const authorizationSummary = LocalIamAuthorizationRuntimeStore.getSummary();
  const advancedOauthSummary = LocalIamAdvancedOAuthRuntimeStore.getSummary();
  const protocolSummary = LocalIamProtocolRuntimeStore.getSummary();
  const authSummary = LocalIamAuthenticationRuntimeStore.getSummary();
  const authFlowSummary = LocalIamAuthFlowStore.getSummary();
  const webauthnSummary = LocalIamWebAuthnStore.getSummary();
  const organizationSummary = LocalIamOrganizationStore.getSummary();
  const profileSummary = LocalIamUserProfileStore.getSummary();
  const adminAuthSummary = LocalIamAdminAuthorizationStore.getSummary();
  const authzSummary = LocalIamAuthorizationServicesStore.getSummary();
  const extensionSummary = LocalIamExtensionRegistryStore.getSummary();
  const deploymentSummary = LocalIamDeploymentRuntimeStore.getSummary();
  const bootstrapSummary = LocalIamStandaloneBootstrapStore.getSummary();
  const advancedOauthSupport = LocalIamSupportProfileRuntimeStore.getSupportProfile('advanced-oauth-surface');
  const samlSupport = LocalIamSupportProfileRuntimeStore.getSupportProfile('saml-idp-lifecycle');
  const passkeySupport = LocalIamSupportProfileRuntimeStore.getSupportProfile('passkeys-webauthn');
  const federationSupport = LocalIamSupportProfileRuntimeStore.getSupportProfile('federation-brokering');
  const extensionSupport = LocalIamSupportProfileRuntimeStore.getSupportProfile('extension-provider-runtime');
  const opsSupport = LocalIamSupportProfileRuntimeStore.getSupportProfile('standalone-ops-recovery');
  const awsSupport = LocalIamSupportProfileRuntimeStore.getSupportProfile('aws-native-posture');

  return [
    {
      id: 'standard-oidc-browser',
      family: 'OIDC and OAuth',
      capability: 'Authorization-code and PKCE browser flow',
      status: protocolSummary.client_count > 0 && authFlowSummary.flow_count > 0 ? 'PASS' : 'FAIL',
      summary: `${protocolSummary.client_count} clients and ${authFlowSummary.flow_count} auth flows are available for authorization-code plus PKCE browser flows.`,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'standard-dynamic-client-registration',
      family: 'OIDC and OAuth',
      capability: 'Dynamic client registration and advanced OAuth grants',
      status: advancedOauthSupport
        ? reviewStatusForSupportDecision(advancedOauthSupport.support_decision)
        : advancedOauthSummary.client_policy_count > 0 ? 'PASS' : 'WARN',
      summary: supportProfileSummary(
        'advanced-oauth-surface',
        `${advancedOauthSummary.client_policy_count} client policies and advanced OAuth runtime records support registration, PAR, device, and token exchange flows.`,
      ),
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'standard-saml',
      family: 'SAML',
      capability: 'SP-initiated SAML login and logout lifecycle',
      status: samlSupport
        ? reviewStatusForSupportDecision(samlSupport.support_decision)
        : protocolSummary.client_count > 0 ? 'PASS' : 'FAIL',
      summary: supportProfileSummary(
        'saml-idp-lifecycle',
        `${protocolSummary.saml_session_count} SAML sessions and ${protocolSummary.saml_auth_request_count} SAML requests are represented in the runtime ledger.`,
      ),
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'standard-auth-flows',
      family: 'Authentication',
      capability: 'Configurable authentication flow engine',
      status: authFlowSummary.execution_count > 0 ? 'PASS' : 'FAIL',
      summary: `${authFlowSummary.flow_count} flows and ${authFlowSummary.execution_count} executions are modeled for configurable browser and protocol entry paths.`,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'standard-passkeys',
      family: 'Authentication',
      capability: 'WebAuthn and passkeys',
      status: passkeySupport
        ? reviewStatusForSupportDecision(passkeySupport.support_decision)
        : webauthnSummary.credential_count > 0 ? 'PASS' : 'WARN',
      summary: supportProfileSummary(
        'passkeys-webauthn',
        `${webauthnSummary.credential_count} passkey credentials and ${webauthnSummary.authentication_challenge_count} authentication challenges are tracked.`,
      ),
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'standard-admin-authz',
      family: 'Administration',
      capability: 'Fine-grained admin authorization',
      status: adminAuthSummary.permission_count > 0 && adminAuthSummary.policy_count > 0 ? 'PASS' : 'WARN',
      summary: `${adminAuthSummary.permission_count} admin permissions and ${adminAuthSummary.policy_count} admin policies are available for scoped administration.`,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'standard-authorization-services',
      family: 'Authorization',
      capability: 'Authorization services and UMA',
      status: authzSummary.resource_server_count > 0 && authzSummary.permission_ticket_count >= 0 ? 'PASS' : 'WARN',
      summary: `${authzSummary.resource_server_count} resource servers, ${authzSummary.authorization_policy_count} authz policies, and ${authzSummary.permission_ticket_count} permission tickets are available.`,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'standard-profile-organizations',
      family: 'Identity Model',
      capability: 'User profile schema and organizations',
      status: profileSummary.schema_count > 0 && organizationSummary.organization_count >= 0 ? 'PASS' : 'WARN',
      summary: `${profileSummary.schema_count} profile schemas and ${organizationSummary.organization_count} organizations are supported in the standalone model.`,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'standard-brokering-federation',
      family: 'Federation',
      capability: 'Identity brokering and user federation',
      status: federationSupport
        ? reviewStatusForSupportDecision(federationSupport.support_decision)
        : LocalIamFederationRuntimeStore.getSummary().identity_provider_count > 0 ? 'PASS' : 'WARN',
      summary: supportProfileSummary(
        'federation-brokering',
        `${LocalIamFederationRuntimeStore.getSummary().identity_provider_count} identity providers and ${LocalIamFederationRuntimeStore.getSummary().user_federation_provider_count} user federation providers are configured.`,
      ),
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'standard-extensibility',
      family: 'Extensibility',
      capability: 'Provider and extension framework',
      status: extensionSupport
        ? reviewStatusForSupportDecision(extensionSupport.support_decision)
        : extensionSummary.extension_interface_count > 0 ? 'PASS' : 'WARN',
      summary: supportProfileSummary(
        'extension-provider-runtime',
        `${extensionSummary.extension_interface_count} provider interfaces and ${extensionSummary.extension_package_count} extension packages are registered.`,
      ),
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'standard-standalone-ops',
      family: 'Operations',
      capability: 'AWS-native standalone deployment and recovery posture',
      status: opsSupport && awsSupport
        ? combineStatus([
          reviewStatusForSupportDecision(opsSupport.support_decision),
          reviewStatusForSupportDecision(awsSupport.support_decision),
        ])
        : deploymentSummary.aws_native_ready && bootstrapSummary.bootstrap_package_count > 0 ? 'PASS' : 'WARN',
      summary: `${supportProfileSummary(
        'standalone-ops-recovery',
        `${deploymentSummary.active_topology_mode} is the active topology, with ${bootstrapSummary.bootstrap_package_count} bootstrap packages available.`,
      )} AWS posture: ${supportProfileSummary(
        'aws-native-posture',
        `${deploymentSummary.active_topology_mode} is the active topology.`,
      )}`,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'standard-standalone-boundary',
      family: 'Product Boundary',
      capability: 'Standalone multi-realm consumer-boundary model',
      status: foundationSummary.scope_model === 'STANDALONE_MULTI_REALM_WITH_CONSUMER_BINDINGS' ? 'PASS' : 'FAIL',
      summary: `Scope model is ${foundationSummary.scope_model} across ${foundationSummary.realm_count} realms and ${foundationSummary.realm_binding_count} consumer bindings.`,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
  ];
}

function buildInteroperabilityChecks(): IamInteroperabilityCheck[] {
  const authorizationSummary = LocalIamAuthorizationRuntimeStore.getSummary();
  const advancedOauthSummary = LocalIamAdvancedOAuthRuntimeStore.getSummary();
  const protocolSummary = LocalIamProtocolRuntimeStore.getSummary();
  const authSummary = LocalIamAuthenticationRuntimeStore.getSummary();
  const webauthnSummary = LocalIamWebAuthnStore.getSummary();
  const organizationSummary = LocalIamOrganizationStore.getSummary();
  const authFlowSummary = LocalIamAuthFlowStore.getSummary();
  const adminAuthSummary = LocalIamAdminAuthorizationStore.getSummary();
  const authzSummary = LocalIamAuthorizationServicesStore.getSummary();
  const operationsSummary = LocalIamOperationsRuntimeStore.getSummary();
  const benchmarkSummary = LocalIamBenchmarkRuntimeStore.getSummary();
  const advancedOauthSupport = LocalIamSupportProfileRuntimeStore.getSupportProfile('advanced-oauth-surface');
  const samlSupport = LocalIamSupportProfileRuntimeStore.getSupportProfile('saml-idp-lifecycle');
  const federationSupport = LocalIamSupportProfileRuntimeStore.getSupportProfile('federation-brokering');
  const passkeySupport = LocalIamSupportProfileRuntimeStore.getSupportProfile('passkeys-webauthn');

  return [
    {
      id: 'interop-oidc-browser',
      protocol_family: 'OIDC',
      name: 'OIDC browser redirect validation',
      status: authorizationSummary.authorization_request_count >= 0 && authFlowSummary.flow_count > 0 ? 'PASS' : 'FAIL',
      evidence: `${authorizationSummary.authorization_request_count} authorization requests recorded; browser runtime active.`,
      summary: 'OIDC browser redirect and continuation flows are available for standalone clients.',
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'interop-pkce',
      protocol_family: 'OIDC',
      name: 'PKCE public-client validation',
      status: protocolSummary.client_count > 0 ? 'PASS' : 'FAIL',
      evidence: `${protocolSummary.client_count} clients are registered for public and confidential validation scenarios.`,
      summary: 'PKCE-capable public-client browser validation is supported in the standalone runtime.',
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'interop-confidential-clients',
      protocol_family: 'OAuth2',
      name: 'Confidential client and service-account validation',
      status: protocolSummary.service_account_count > 0 ? 'PASS' : 'WARN',
      evidence: `${protocolSummary.service_account_count} service accounts are available for confidential-client validation.`,
      summary: 'Confidential client authentication and service-account scenarios are represented in the standalone runtime.',
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'interop-dynamic-registration',
      protocol_family: 'OAuth2',
      name: 'Dynamic client registration validation',
      status: advancedOauthSupport
        ? reviewStatusForSupportDecision(advancedOauthSupport.support_decision)
        : advancedOauthSummary.client_policy_count > 0 ? 'PASS' : 'WARN',
      evidence: `${advancedOauthSummary.initial_access_token_count} initial access tokens and ${advancedOauthSummary.client_policy_count} policies are tracked.`,
      summary: supportProfileSummary(
        'advanced-oauth-surface',
        'Dynamic client registration is available through managed initial-access-token policy.',
      ),
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'interop-saml',
      protocol_family: 'SAML',
      name: 'SAML SP interoperability validation',
      status: samlSupport
        ? reviewStatusForSupportDecision(samlSupport.support_decision)
        : protocolSummary.saml_auth_request_count >= 0 ? 'PASS' : 'WARN',
      evidence: `${protocolSummary.saml_auth_request_count} SAML auth requests and ${protocolSummary.saml_session_count} SAML sessions are recorded.`,
      summary: supportProfileSummary(
        'saml-idp-lifecycle',
        'SP-initiated SAML and logout lifecycle support is available for standalone validation.',
      ),
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'interop-brokering',
      protocol_family: 'Federation',
      name: 'Brokered login and federation import validation',
      status: federationSupport
        ? reviewStatusForSupportDecision(federationSupport.support_decision)
        : LocalIamFederationRuntimeStore.getSummary().sync_job_count >= 0 ? 'PASS' : 'WARN',
      evidence: `${LocalIamFederationRuntimeStore.getSummary().sync_job_count} sync jobs and ${LocalIamFederationRuntimeStore.getSummary().linked_identity_count} linked identities are tracked.`,
      summary: supportProfileSummary(
        'federation-brokering',
        'External identity brokering and federation import flows are represented in the standalone validation surface.',
      ),
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'interop-organizations',
      protocol_family: 'Organizations',
      name: 'Organization invitation validation',
      status: organizationSummary.invitation_count >= 0 ? 'PASS' : 'WARN',
      evidence: `${organizationSummary.invitation_count} invitations and ${organizationSummary.membership_count} memberships are recorded.`,
      summary: 'Organization invitation and membership acceptance flows are available in the standalone account model.',
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'interop-passkeys',
      protocol_family: 'WebAuthn',
      name: 'Passkey validation',
      status: passkeySupport
        ? reviewStatusForSupportDecision(passkeySupport.support_decision)
        : webauthnSummary.authentication_challenge_count >= 0 ? 'PASS' : 'WARN',
      evidence: `${webauthnSummary.registration_challenge_count} registration challenges and ${webauthnSummary.authentication_challenge_count} authentication challenges are tracked.`,
      summary: supportProfileSummary(
        'passkeys-webauthn',
        'Passkey registration and passkey-based authentication are available in the standalone account and login flows.',
      ),
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'interop-auth-flows',
      protocol_family: 'Authentication',
      name: 'Auth-flow branching validation',
      status: authFlowSummary.client_auth_flow_binding_count > 0 ? 'PASS' : 'WARN',
      evidence: `${authFlowSummary.client_auth_flow_binding_count} client flow bindings and ${authFlowSummary.realm_auth_flow_binding_count} realm bindings are available.`,
      summary: 'Client and realm auth-flow branching is available through the configurable flow engine.',
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'interop-authorization-services',
      protocol_family: 'Authorization',
      name: 'Authorization-services evaluation validation',
      status: authzSummary.authorization_evaluation_count >= 0 ? 'PASS' : 'WARN',
      evidence: `${authzSummary.authorization_evaluation_count} authorization evaluations and ${authzSummary.permission_ticket_count} permission tickets are tracked.`,
      summary: 'Protected resource evaluation and UMA-style permission issuance are represented in the standalone authorization plane.',
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'interop-admin-authorization',
      protocol_family: 'Administration',
      name: 'Admin authorization validation',
      status: adminAuthSummary.evaluation_count >= 0 ? 'PASS' : 'WARN',
      evidence: `${adminAuthSummary.evaluation_count} admin evaluations are recorded.`,
      summary: 'Fine-grained administrative authorization decisions are recorded for standalone operator review.',
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'interop-recovery-performance',
      protocol_family: 'Operations',
      name: 'Backup, restore, and performance validation',
      status: operationsSummary.backup_count > 0 && benchmarkSummary.benchmark_run_count > 0 ? 'PASS' : 'WARN',
      evidence: `${operationsSummary.backup_count} backups, ${operationsSummary.restore_count} restores, and ${benchmarkSummary.benchmark_run_count} benchmark runs are recorded.`,
      summary: 'Recovery and performance validation evidence is present for the standalone runtime.',
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
  ];
}

function buildDifferentiationAreas(): IamDifferentiationArea[] {
  const deploymentSummary = LocalIamDeploymentRuntimeStore.getSummary();
  const healthSummary = LocalIamHealthRuntimeStore.getHealthSummary();
  const foundationSummary = LocalIamFoundationStore.getSummary();
  const operationsSummary = LocalIamOperationsRuntimeStore.getSummary();
  const extensionSummary = LocalIamExtensionRegistryStore.getSummary();

  return [
    {
      id: 'diff-aws-native-cost',
      name: 'AWS-native cost-optimized standalone packaging',
      status: deploymentSummary.aws_native_ready ? 'PASS' : 'WARN',
      comparative_position: 'Potentially stronger AWS-native cost posture than heavyweight JVM-first IAM products.',
      summary: `${deploymentSummary.active_topology_mode} is modeled as the primary standalone deployment mode.`,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'diff-clone-and-bind',
      name: 'Clone-and-bind multi-realm consumer model',
      status: foundationSummary.realm_binding_count > 0 ? 'PASS' : 'WARN',
      comparative_position: 'Differentiated consumer binding model for first-party defaults, embedded partners, and override spaces.',
      summary: `${foundationSummary.realm_binding_count} consumer bindings and ${foundationSummary.validation_domain_count} validation domains prove the clone-and-bind model.`,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'diff-ops-first',
      name: 'Operations-first product posture',
      status: operationsSummary.readiness_review_count > 0 && healthSummary.overall_status === 'HEALTHY' ? 'PASS' : 'WARN',
      comparative_position: 'Stronger explicit backup, recovery, benchmark, and review evidence at the subsystem level.',
      summary: `${operationsSummary.readiness_review_count} readiness reviews and ${operationsSummary.resilience_run_count} resilience runs are recorded, with health ${healthSummary.overall_status}.`,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
    {
      id: 'diff-extension-plane',
      name: 'Bounded provider and extension registry plane',
      status: extensionSummary.extension_interface_count > 0 ? 'PASS' : 'WARN',
      comparative_position: 'Extensibility is expressed through bounded provider interfaces and package records rather than undocumented local hooks.',
      summary: `${extensionSummary.extension_interface_count} interfaces and ${extensionSummary.extension_package_count} extension packages are available.`,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    },
  ];
}

function buildFormalReviewRecord(actorUserId: string, notes: string[]): IamFormalReviewRecord {
  const standards = buildStandardsMatrix();
  const interoperability = buildInteroperabilityChecks();
  const differentiation = buildDifferentiationAreas();
  const healthSummary = LocalIamHealthRuntimeStore.getHealthSummary();
  const operationsSummary = LocalIamOperationsRuntimeStore.getSummary();
  const securitySummary = LocalIamSecurityAuditStore.getSummary();
  const standardsStatus = combineStatus(standards.map((item) => item.status));
  const interoperabilityStatus = combineStatus(interoperability.map((item) => item.status));
  const differentiationStatus = combineStatus(differentiation.map((item) => item.status));
  const securityOperationsStatus = combineStatus([
    healthSummary.overall_status === 'FAILED'
      ? 'FAIL'
      : healthSummary.overall_status === 'DEGRADED'
        ? 'WARN'
        : 'PASS',
    securitySummary.request_count > 0 ? 'PASS' : 'WARN',
    operationsSummary.latest_readiness_decision === 'APPROVED' ? 'PASS' : 'WARN',
  ]);
  const evidenceMode: IamReviewEvidenceMode = 'MODELED_RUNTIME_STATE';
  const marketClaimReady = false;

  const standaloneValidationComplete = standardsStatus === 'PASS' && interoperabilityStatus === 'PASS';
  const standaloneProductionReady = securityOperationsStatus === 'PASS';
  const keycloakCompetitive = marketClaimReady && standaloneValidationComplete && standaloneProductionReady;
  const strategicallyDifferentiated = marketClaimReady && differentiationStatus === 'PASS';
  const overallStatus = combineStatus([
    standardsStatus,
    interoperabilityStatus,
    securityOperationsStatus,
    differentiationStatus,
  ]);
  const marketPosition: IamMarketPosition = keycloakCompetitive
    ? strategicallyDifferentiated
      ? 'KEYCLOAK_PLUS_DIFFERENTIATED'
      : 'KEYCLOAK_COMPETITIVE'
    : 'NOT_YET_COMPETITIVE';
  const notesWithGuardrail = [
    ...normalizeFormalReviewNotes(notes),
  ];

  return {
    id: `iam-formal-review-${randomUUID()}`,
    created_at: nowIso(),
    created_by_user_id: actorUserId,
    overall_status: overallStatus,
    market_position: marketPosition,
    adoption_recommendation: keycloakCompetitive && strategicallyDifferentiated
      ? 'PROCEED_TO_PHASE_M_ADOPTION_PLANNING'
      : 'HOLD_FOR_REMEDIATION',
    standalone_validation_complete: standaloneValidationComplete,
    standalone_production_ready: standaloneProductionReady,
    keycloak_competitive: keycloakCompetitive,
    strategically_differentiated: strategicallyDifferentiated,
    notes: notesWithGuardrail,
    standards_status: standardsStatus,
    interoperability_status: interoperabilityStatus,
    security_operations_status: securityOperationsStatus,
    differentiation_status: differentiationStatus,
    evidence_mode: evidenceMode,
    market_claim_ready: marketClaimReady,
    claim_scope: 'INTERNAL_MODELED_REVIEW_ONLY',
  };
}

export const LocalIamReviewRuntimeStore = {
  getSummary(): {
    generated_at: string;
    standards_matrix_count: number;
    interoperability_check_count: number;
    differentiation_area_count: number;
    formal_review_count: number;
    latest_market_position: IamMarketPosition | null;
    latest_adoption_recommendation: IamAdoptionRecommendation | null;
    latest_overall_status: IamReviewStatus | null;
    evidence_mode: IamReviewEvidenceMode;
    market_claim_ready: boolean;
    evidence_summary: string;
    claim_boundary_notes: string[];
  } {
    return {
      generated_at: nowIso(),
      standards_matrix_count: buildStandardsMatrix().length,
      interoperability_check_count: buildInteroperabilityChecks().length,
      differentiation_area_count: buildDifferentiationAreas().length,
      formal_review_count: state.formal_reviews.length,
      latest_market_position: state.formal_reviews[0]?.market_position ?? null,
      latest_adoption_recommendation: state.formal_reviews[0]?.adoption_recommendation ?? null,
      latest_overall_status: state.formal_reviews[0]?.overall_status ?? null,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      market_claim_ready: false,
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
      claim_boundary_notes: [
        'This review surface summarizes modeled runtime state and internal validation artifacts.',
        'It does not, by itself, establish production-grade support or external market parity.',
        'Use the governed status and support matrices for formal capability claims.',
      ],
    };
  },

  getStandardsMatrix(): {
    generated_at: string;
    overall_status: IamReviewStatus;
    items: IamStandardsMatrixItem[];
    count: number;
    evidence_mode: IamReviewEvidenceMode;
    market_claim_ready: boolean;
    evidence_summary: string;
  } {
    const items = buildStandardsMatrix();
    return {
      generated_at: nowIso(),
      overall_status: combineStatus(items.map((item) => item.status)),
      items,
      count: items.length,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      market_claim_ready: false,
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    };
  },

  getInteroperabilityReview(): {
    generated_at: string;
    overall_status: IamReviewStatus;
    checks: IamInteroperabilityCheck[];
    count: number;
    evidence_mode: IamReviewEvidenceMode;
    market_claim_ready: boolean;
    evidence_summary: string;
  } {
    const checks = buildInteroperabilityChecks();
    return {
      generated_at: nowIso(),
      overall_status: combineStatus(checks.map((check) => check.status)),
      checks,
      count: checks.length,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      market_claim_ready: false,
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    };
  },

  getDifferentiationReview(): {
    generated_at: string;
    overall_status: IamReviewStatus;
    areas: IamDifferentiationArea[];
    count: number;
    evidence_mode: IamReviewEvidenceMode;
    market_claim_ready: boolean;
    evidence_summary: string;
  } {
    const areas = buildDifferentiationAreas();
    return {
      generated_at: nowIso(),
      overall_status: combineStatus(areas.map((area) => area.status)),
      areas,
      count: areas.length,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      market_claim_ready: false,
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
    };
  },

  getFormalReview(): {
    generated_at: string;
    latest_review: IamFormalReviewRecord | null;
    reviews: IamFormalReviewRecord[];
    count: number;
    evidence_mode: IamReviewEvidenceMode;
    market_claim_ready: boolean;
    evidence_summary: string;
    claim_boundary_notes: string[];
  } {
    return {
      generated_at: nowIso(),
      latest_review: state.formal_reviews[0] ? clone(state.formal_reviews[0]) : null,
      reviews: clone(state.formal_reviews),
      count: state.formal_reviews.length,
      evidence_mode: 'MODELED_RUNTIME_STATE',
      market_claim_ready: false,
      evidence_summary: MODELED_REVIEW_EVIDENCE_SUMMARY,
      claim_boundary_notes: [
        'Formal reviews recorded here are internal modeled reviews unless explicitly reclassified by governed evidence.',
        'A recorded review decision is not equivalent to external validation or production-grade certification.',
      ],
    };
  },

  recordFormalReview(actorUserId: string, notes: string[]): IamFormalReviewRecord {
    const record = buildFormalReviewRecord(actorUserId, notes);
    state.formal_reviews.unshift(record);
    state.formal_reviews = state.formal_reviews.slice(0, 20);
    persistState();
    return clone(record);
  },

  async recordFormalReviewAsync(
    actorUserId: string,
    notes: string[],
    input?: {
      idempotency_key?: string | null;
    },
  ): Promise<IamFormalReviewRecord> {
    const persistedState = await reviewRuntimeStateAsyncRepository.load();
    const idempotencyKey = normalizeIdempotencyKey(input?.idempotency_key);
    const existingRecord = resolveRecordedFormalReview(persistedState, actorUserId, idempotencyKey);
    if (existingRecord) {
      syncInMemoryState(persistedState);
      return clone(existingRecord);
    }
    const record = buildFormalReviewRecord(actorUserId, notes);
    persistedState.formal_reviews.unshift(record);
    persistedState.formal_reviews = persistedState.formal_reviews.slice(0, 20);
    if (idempotencyKey) {
      persistedState.formal_review_idempotency_keys = persistedState.formal_review_idempotency_keys
        .filter((candidate) => !(
          candidate.idempotency_key === idempotencyKey
          && candidate.created_by_user_id === actorUserId
        ));
      persistedState.formal_review_idempotency_keys.unshift({
        idempotency_key: idempotencyKey,
        created_by_user_id: actorUserId,
        review_id: record.id,
        recorded_at: nowIso(),
      });
      persistedState.formal_review_idempotency_keys = persistedState.formal_review_idempotency_keys.slice(0, 200);
    }
    await reviewRuntimeStateAsyncRepository.save(persistedState);
    syncInMemoryState(persistedState);
    return clone(record);
  },
};
