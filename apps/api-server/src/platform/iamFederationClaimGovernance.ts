import { LocalIamFoundationStore, type IamIdentityPrivacyClassification } from './iamFoundation';
import { readPersistedStateSnapshot } from './persistence';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const IAM_FEDERATION_RUNTIME_FILE = 'iam-federation-runtime-state.json';

export type IamFederationClaimReleaseTarget = 'ACCESS_TOKEN' | 'ID_TOKEN' | 'USERINFO' | 'PROTOCOL';
export type IamFederationClaimSuppressionReason =
  | 'MISSING_REQUIRED_SOURCE_ATTRIBUTE'
  | 'USERINFO_EXCLUDED'
  | 'CONSENT_REQUIRED'
  | 'PURPOSE_NOT_ALLOWED';

export interface IamFederationExternalIdentityProfile {
  subject: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  group_names: string[];
  role_names: string[];
}

export interface IamFederationClaimMappingRecord {
  source_attribute: string;
  target_claim: string;
  include_in_userinfo: boolean;
  required: boolean;
}

export interface IamFederationMappingProfileRecord {
  id: string;
  realm_id: string;
  trust_store_id: string;
  name: string;
  summary: string;
  status: 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
  protocol: 'OIDC' | 'SAML';
  link_policy: 'EMAIL_MATCH' | 'AUTO_CREATE' | 'MANUAL';
  attribute_release_policy_ids: string[];
  claim_mappings: IamFederationClaimMappingRecord[];
  synthetic: boolean;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

interface IamFederationTrustStoreRecord {
  id: string;
  realm_id: string;
  name: string;
  summary: string;
  status: 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
  supported_protocols: ('OIDC' | 'SAML')[];
  issuer_url: string | null;
  metadata_url: string | null;
  certificate_labels: string[];
  synthetic: boolean;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

interface IamIdentityProviderRecord {
  id: string;
  realm_id: string;
  alias: string;
  name: string;
  summary: string;
  protocol: 'OIDC' | 'SAML';
  status: 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
  login_mode: 'BROKER_ONLY' | 'OPTIONAL';
  link_policy: 'EMAIL_MATCH' | 'AUTO_CREATE' | 'MANUAL';
  sync_mode: 'LOGIN_ONLY' | 'IMPORT';
  issuer_url: string | null;
  allowed_scopes: string[];
  default_role_ids: string[];
  default_group_ids: string[];
  synthetic: boolean;
  external_identities: IamFederationExternalIdentityProfile[];
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

interface IamLinkedIdentityRecord {
  id: string;
  realm_id: string;
  user_id: string;
  source_type: 'BROKER' | 'FEDERATION';
  provider_id: string;
  provider_name: string;
  provider_alias: string | null;
  provider_kind: string;
  external_subject: string;
  external_username: string;
  external_email: string;
  linked_at: string;
  imported_at: string | null;
  last_authenticated_at: string | null;
  synthetic: boolean;
}

interface IamFederationRuntimeStateSnapshot {
  identity_providers: IamIdentityProviderRecord[];
  federation_trust_stores: IamFederationTrustStoreRecord[];
  federation_mapping_profiles: IamFederationMappingProfileRecord[];
  linked_identities: IamLinkedIdentityRecord[];
}

interface ResolvedFederationAttributeReleasePolicy {
  id: string;
  classification: IamIdentityPrivacyClassification;
  consent_required: boolean;
  attribute_release_tags: string[];
}

export interface IamFederationReleasedClaim {
  source_attribute: string;
  target_claim: string;
  value: string | string[];
}

export interface IamFederationSuppressedClaim {
  source_attribute: string;
  target_claim: string;
  reason: IamFederationClaimSuppressionReason;
}

export interface IamFederationClaimEvaluationResponse {
  realm_id: string;
  provider_id: string;
  provider_alias: string;
  provider_protocol: 'OIDC' | 'SAML';
  mapping_profile_id: string;
  trust_store_id: string;
  external_subject: string;
  requested_purpose: string | null;
  consent_granted: boolean;
  target: Exclude<IamFederationClaimReleaseTarget, 'PROTOCOL'>;
  resolved_release_policy_ids: string[];
  released_claims: IamFederationReleasedClaim[];
  suppressed_claims: IamFederationSuppressedClaim[];
}

export interface IamFederatedClaimOverride {
  matched: boolean;
  released: boolean;
  value?: string | string[];
  suppression_reason?: IamFederationClaimSuppressionReason;
  provider_alias: string;
  mapping_profile_id: string;
}

const LEGACY_FEDERATION_ATTRIBUTE_RELEASE_POLICIES: Record<string, ResolvedFederationAttributeReleasePolicy> = {
  'release-basic-identity': {
    id: 'release-basic-identity',
    classification: 'INTERNAL',
    consent_required: false,
    attribute_release_tags: ['directory', 'display'],
  },
  'release-directory-attributes': {
    id: 'release-directory-attributes',
    classification: 'CONFIDENTIAL',
    consent_required: false,
    attribute_release_tags: ['directory', 'contact', 'organization', 'membership'],
  },
};

const CLASSIFICATION_ALLOWED_PURPOSES: Record<IamIdentityPrivacyClassification, string[]> = {
  PUBLIC: ['profile', 'directory', 'operations', 'education_support', 'protected_record_access', 'administration'],
  INTERNAL: ['profile', 'directory', 'operations', 'education_support', 'administration'],
  CONFIDENTIAL: ['profile', 'directory', 'operations', 'education_support', 'administration'],
  RESTRICTED: ['operations', 'education_support', 'administration'],
  PROTECTED: ['education_support', 'protected_record_access', 'administration'],
};

function normalizeRequestedPurpose(value?: string | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized || null;
}

function normalizeClaimTag(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function resolveExternalProfileAttribute(
  profile: IamFederationExternalIdentityProfile,
  sourceAttribute: string,
): string | string[] | null {
  switch (sourceAttribute.trim()) {
    case 'sub':
    case 'subject':
    case 'NameID':
      return profile.subject;
    case 'preferred_username':
    case 'username':
    case 'uid':
    case 'eduPersonPrincipalName':
      return profile.username;
    case 'email':
    case 'mail':
    case 'emailAddress':
      return profile.email;
    case 'given_name':
    case 'givenName':
    case 'first_name':
      return profile.first_name;
    case 'family_name':
    case 'sn':
    case 'surname':
    case 'last_name':
      return profile.last_name;
    case 'groups':
    case 'group_names':
    case 'memberOf':
      return clone(profile.group_names);
    case 'roles':
    case 'role_names':
    case 'realm_roles':
      return clone(profile.role_names);
    default:
      return null;
  }
}

function resolveClaimReleaseTags(sourceAttribute: string, targetClaim: string): string[] {
  const keys = [sourceAttribute, targetClaim].map(normalizeClaimTag);
  const tags = new Set<string>();
  keys.forEach((key) => {
    if (['sub', 'subject', 'nameid', 'external_subject', 'preferred_username', 'username', 'uid', 'edupersonprincipalname', 'first_name', 'last_name', 'given_name', 'family_name', 'givenname', 'sn', 'surname'].includes(key)) {
      tags.add('directory');
      tags.add('display');
    }
    if (['email', 'mail', 'emailaddress'].includes(key)) {
      tags.add('directory');
      tags.add('contact');
    }
    if (['groups', 'group_names', 'memberof', 'roles', 'role_names', 'realm_roles'].includes(key)) {
      tags.add('organization');
      tags.add('membership');
    }
    if (['guardian', 'delegate', 'relationship', 'relationship_kind'].includes(key)) {
      tags.add('relationship');
      tags.add('delegate');
    }
    if (['portable_identity', 'student_id', 'learner_id', 'minor'].includes(key)) {
      tags.add('protected-record');
      tags.add('minor');
    }
  });
  return Array.from(tags);
}

function resolveFederationAttributeReleasePolicies(
  realmId: string,
  policyIds: string[],
): ResolvedFederationAttributeReleasePolicy[] {
  const policies = LocalIamFoundationStore.listIdentityPrivacyPolicies({ realm_id: realmId }).identity_privacy_policies;
  const policyById = new Map(policies.map((policy) => [policy.id, policy]));
  return policyIds.flatMap((policyId) => {
    const canonical = policyById.get(policyId);
    if (canonical) {
      return [{
        id: canonical.id,
        classification: canonical.classification,
        consent_required: canonical.consent_required,
        attribute_release_tags: clone(canonical.attribute_release_tags),
      }];
    }
    const legacy = LEGACY_FEDERATION_ATTRIBUTE_RELEASE_POLICIES[policyId];
    return legacy ? [clone(legacy)] : [];
  });
}

function resolvePoliciesForClaim(
  policies: ResolvedFederationAttributeReleasePolicy[],
  sourceAttribute: string,
  targetClaim: string,
): ResolvedFederationAttributeReleasePolicy[] {
  if (policies.length === 0) {
    return [];
  }
  const claimTags = resolveClaimReleaseTags(sourceAttribute, targetClaim);
  const matched = policies.filter((policy) => policy.attribute_release_tags.some((tag) => claimTags.includes(tag)));
  return matched.length > 0 ? matched : policies;
}

function compareClassificationStrictness(left: IamIdentityPrivacyClassification, right: IamIdentityPrivacyClassification): number {
  const weights: Record<IamIdentityPrivacyClassification, number> = {
    PUBLIC: 0,
    INTERNAL: 1,
    CONFIDENTIAL: 2,
    RESTRICTED: 3,
    PROTECTED: 4,
  };
  return weights[left] - weights[right];
}

function resolveClaimSuppressionReason(input: {
  matchedPolicies: ResolvedFederationAttributeReleasePolicy[];
  requestedPurpose: string | null;
  consentGranted: boolean;
}): IamFederationClaimSuppressionReason | null {
  const { matchedPolicies, requestedPurpose, consentGranted } = input;
  if (matchedPolicies.length === 0) {
    return null;
  }
  if (matchedPolicies.some((policy) => policy.consent_required) && !consentGranted) {
    return 'CONSENT_REQUIRED';
  }
  if (!requestedPurpose) {
    return null;
  }
  const strictestPolicy = matchedPolicies.reduce((current, candidate) => (
    compareClassificationStrictness(candidate.classification, current.classification) > 0 ? candidate : current
  ));
  const allowedPurposes = CLASSIFICATION_ALLOWED_PURPOSES[strictestPolicy.classification];
  if (allowedPurposes.length > 0 && !allowedPurposes.includes(requestedPurpose)) {
    return 'PURPOSE_NOT_ALLOWED';
  }
  return null;
}

function loadFederationStateSnapshot(): IamFederationRuntimeStateSnapshot {
  const state = readPersistedStateSnapshot<Partial<IamFederationRuntimeStateSnapshot>>(IAM_FEDERATION_RUNTIME_FILE);
  if (!state) {
    return {
      identity_providers: [],
      federation_trust_stores: [],
      federation_mapping_profiles: [],
      linked_identities: [],
    };
  }

  return {
    identity_providers: Array.isArray(state.identity_providers) ? state.identity_providers : [],
    federation_trust_stores: Array.isArray(state.federation_trust_stores) ? state.federation_trust_stores : [],
    federation_mapping_profiles: Array.isArray(state.federation_mapping_profiles) ? state.federation_mapping_profiles : [],
    linked_identities: Array.isArray(state.linked_identities) ? state.linked_identities : [],
  };
}

function findIdentityProviderByAlias(
  snapshot: IamFederationRuntimeStateSnapshot,
  realmId: string,
  alias: string,
): IamIdentityProviderRecord | null {
  return snapshot.identity_providers.find(
    (candidate) =>
      candidate.realm_id === realmId
      && candidate.alias === alias
      && candidate.status === 'ACTIVE',
  ) ?? null;
}

function findExternalProfileForProvider(
  provider: IamIdentityProviderRecord,
  identifier: string,
): IamFederationExternalIdentityProfile | null {
  const normalized = identifier.trim().toLowerCase();
  return provider.external_identities.find(
    (candidate) =>
      candidate.username.trim().toLowerCase() === normalized
      || candidate.email.trim().toLowerCase() === normalized
      || candidate.subject.trim().toLowerCase() === normalized,
  ) ?? null;
}

function findExternalProfileForLinkedIdentity(
  provider: IamIdentityProviderRecord,
  linkedIdentity: IamLinkedIdentityRecord,
): IamFederationExternalIdentityProfile | null {
  return provider.external_identities.find(
    (candidate) =>
      candidate.subject === linkedIdentity.external_subject
      || candidate.username === linkedIdentity.external_username
      || candidate.email === linkedIdentity.external_email,
  ) ?? null;
}

function resolveMappingProfileForProvider(
  snapshot: IamFederationRuntimeStateSnapshot,
  provider: IamIdentityProviderRecord,
): IamFederationMappingProfileRecord | null {
  const activeProfiles = snapshot.federation_mapping_profiles.filter(
    (profile) =>
      profile.realm_id === provider.realm_id
      && profile.protocol === provider.protocol
      && profile.status === 'ACTIVE',
  );
  if (activeProfiles.length === 0) {
    return null;
  }

  const activeProfilesWithTrust = activeProfiles.filter((profile) => {
    const trustStore = snapshot.federation_trust_stores.find((candidate) => candidate.id === profile.trust_store_id);
    return trustStore && trustStore.realm_id === provider.realm_id && trustStore.status === 'ACTIVE';
  });
  if (activeProfilesWithTrust.length === 0) {
    return null;
  }

  const issuerMatched = provider.issuer_url
    ? activeProfilesWithTrust.filter((profile) => {
        const trustStore = snapshot.federation_trust_stores.find((candidate) => candidate.id === profile.trust_store_id);
        return trustStore?.issuer_url === provider.issuer_url;
      })
    : [];
  if (issuerMatched.length === 1) {
    return issuerMatched[0];
  }

  return activeProfilesWithTrust.length === 1 ? activeProfilesWithTrust[0] : null;
}

function evaluateMappingRelease(input: {
  realmId: string;
  target: IamFederationClaimReleaseTarget;
  requestedPurpose?: string | null;
  consentGranted?: boolean;
  mappingProfile: IamFederationMappingProfileRecord;
  externalProfile: IamFederationExternalIdentityProfile;
  mapping: IamFederationClaimMappingRecord;
}): {
  released_claim?: IamFederationReleasedClaim;
  suppressed_claim?: IamFederationSuppressedClaim;
  resolved_policy_ids: string[];
} {
  const target = input.target;
  if (target === 'USERINFO' && !input.mapping.include_in_userinfo) {
    return {
      suppressed_claim: {
        source_attribute: input.mapping.source_attribute,
        target_claim: input.mapping.target_claim,
        reason: 'USERINFO_EXCLUDED',
      },
      resolved_policy_ids: [],
    };
  }

  const value = resolveExternalProfileAttribute(input.externalProfile, input.mapping.source_attribute);
  const missing = value == null || (Array.isArray(value) && value.length === 0);
  if (missing) {
    return input.mapping.required
      ? {
          suppressed_claim: {
            source_attribute: input.mapping.source_attribute,
            target_claim: input.mapping.target_claim,
            reason: 'MISSING_REQUIRED_SOURCE_ATTRIBUTE',
          },
          resolved_policy_ids: [],
        }
      : { resolved_policy_ids: [] };
  }

  const resolvedPolicies = resolveFederationAttributeReleasePolicies(
    input.realmId,
    input.mappingProfile.attribute_release_policy_ids,
  );
  const matchedPolicies = resolvePoliciesForClaim(
    resolvedPolicies,
    input.mapping.source_attribute,
    input.mapping.target_claim,
  );
  const suppressionReason = resolveClaimSuppressionReason({
    matchedPolicies,
    requestedPurpose: normalizeRequestedPurpose(input.requestedPurpose),
    consentGranted: input.consentGranted === true,
  });
  if (suppressionReason) {
    return {
      suppressed_claim: {
        source_attribute: input.mapping.source_attribute,
        target_claim: input.mapping.target_claim,
        reason: suppressionReason,
      },
      resolved_policy_ids: resolvedPolicies.map((policy) => policy.id),
    };
  }

  return {
    released_claim: {
      source_attribute: input.mapping.source_attribute,
      target_claim: input.mapping.target_claim,
      value,
    },
    resolved_policy_ids: resolvedPolicies.map((policy) => policy.id),
  };
}

export function previewFederationClaimRelease(input: {
  realm_id: string;
  provider_alias: string;
  mapping_profile_id: string;
  external_username_or_email: string;
  target?: Exclude<IamFederationClaimReleaseTarget, 'PROTOCOL'>;
  requested_purpose?: string | null;
  consent_granted?: boolean;
}): IamFederationClaimEvaluationResponse {
  const snapshot = loadFederationStateSnapshot();
  const providerAlias = input.provider_alias?.trim();
  const mappingProfileId = input.mapping_profile_id?.trim();
  const externalUsernameOrEmail = input.external_username_or_email?.trim();
  if (!providerAlias) {
    throw new Error('Missing required field: provider_alias');
  }
  if (!mappingProfileId) {
    throw new Error('Missing required field: mapping_profile_id');
  }
  if (!externalUsernameOrEmail) {
    throw new Error('Missing required field: external_username_or_email');
  }

  const provider = findIdentityProviderByAlias(snapshot, input.realm_id, providerAlias);
  if (!provider) {
    throw new Error(`Unknown identity provider alias in realm ${input.realm_id}: ${providerAlias}`);
  }
  const mappingProfile = snapshot.federation_mapping_profiles.find((candidate) => candidate.id === mappingProfileId);
  if (!mappingProfile) {
    throw new Error(`Unknown federation mapping profile: ${mappingProfileId}`);
  }
  if (mappingProfile.realm_id !== input.realm_id) {
    throw new Error(`Mapping profile ${mappingProfile.id} does not belong to realm ${input.realm_id}`);
  }
  if (mappingProfile.protocol !== provider.protocol) {
    throw new Error(`Mapping profile ${mappingProfile.id} does not match provider protocol ${provider.protocol}`);
  }
  const trustStore = snapshot.federation_trust_stores.find((candidate) => candidate.id === mappingProfile.trust_store_id);
  if (!trustStore) {
    throw new Error(`Unknown federation trust store: ${mappingProfile.trust_store_id}`);
  }
  if (trustStore.realm_id !== mappingProfile.realm_id) {
    throw new Error(`Trust store ${trustStore.id} does not belong to realm ${mappingProfile.realm_id}`);
  }

  const externalProfile = findExternalProfileForProvider(provider, externalUsernameOrEmail);
  if (!externalProfile) {
    throw new Error(`Unknown external identity for provider ${provider.alias}: ${externalUsernameOrEmail}`);
  }

  const released_claims: IamFederationReleasedClaim[] = [];
  const suppressed_claims: IamFederationSuppressedClaim[] = [];
  const resolvedPolicyIds = new Set<string>();
  const target = input.target ?? 'USERINFO';

  mappingProfile.claim_mappings.forEach((mapping) => {
    const evaluation = evaluateMappingRelease({
      realmId: input.realm_id,
      target,
      requestedPurpose: input.requested_purpose,
      consentGranted: input.consent_granted,
      mappingProfile,
      externalProfile,
      mapping,
    });
    evaluation.resolved_policy_ids.forEach((policyId) => resolvedPolicyIds.add(policyId));
    if (evaluation.released_claim) {
      released_claims.push(evaluation.released_claim);
    }
    if (evaluation.suppressed_claim) {
      suppressed_claims.push(evaluation.suppressed_claim);
    }
  });

  return {
    realm_id: input.realm_id,
    provider_id: provider.id,
    provider_alias: provider.alias,
    provider_protocol: provider.protocol,
    mapping_profile_id: mappingProfile.id,
    trust_store_id: trustStore.id,
    external_subject: externalProfile.subject,
    requested_purpose: normalizeRequestedPurpose(input.requested_purpose),
    consent_granted: input.consent_granted === true,
    target,
    resolved_release_policy_ids: Array.from(resolvedPolicyIds),
    released_claims,
    suppressed_claims,
  };
}

export function resolveFederatedClaimOverrideForUser(input: {
  realm_id: string;
  user_id: string;
  target_claim: string;
  target: IamFederationClaimReleaseTarget;
  requested_purpose?: string | null;
}): IamFederatedClaimOverride | null {
  const snapshot = loadFederationStateSnapshot();
  const linkedIdentities = snapshot.linked_identities
    .filter((candidate) => candidate.realm_id === input.realm_id && candidate.user_id === input.user_id && candidate.source_type === 'BROKER')
    .sort((leftItem, rightItem) => (
      (rightItem.last_authenticated_at ?? rightItem.linked_at).localeCompare(leftItem.last_authenticated_at ?? leftItem.linked_at)
    ));

  for (const linkedIdentity of linkedIdentities) {
    const provider = snapshot.identity_providers.find(
      (candidate) =>
        candidate.id === linkedIdentity.provider_id
        && candidate.realm_id === input.realm_id
        && candidate.status === 'ACTIVE',
    );
    if (!provider) {
      continue;
    }
    const mappingProfile = resolveMappingProfileForProvider(snapshot, provider);
    if (!mappingProfile) {
      continue;
    }
    const externalProfile = findExternalProfileForLinkedIdentity(provider, linkedIdentity);
    if (!externalProfile) {
      continue;
    }
    const mapping = mappingProfile.claim_mappings.find((candidate) => candidate.target_claim === input.target_claim);
    if (!mapping) {
      continue;
    }
    const evaluation = evaluateMappingRelease({
      realmId: input.realm_id,
      target: input.target,
      requestedPurpose: input.requested_purpose,
      consentGranted: false,
      mappingProfile,
      externalProfile,
      mapping,
    });
    if (evaluation.released_claim) {
      return {
        matched: true,
        released: true,
        value: evaluation.released_claim.value,
        provider_alias: provider.alias,
        mapping_profile_id: mappingProfile.id,
      };
    }
    if (evaluation.suppressed_claim) {
      return {
        matched: true,
        released: false,
        suppression_reason: evaluation.suppressed_claim.reason,
        provider_alias: provider.alias,
        mapping_profile_id: mappingProfile.id,
      };
    }
  }

  return null;
}
