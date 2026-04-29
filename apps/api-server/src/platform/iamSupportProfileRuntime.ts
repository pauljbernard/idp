function nowIso(): string {
  return new Date().toISOString();
}

export type IamSupportProfileDecision =
  | 'SUPPORTED'
  | 'SUPPORTED_BOUNDED'
  | 'EXPERIMENTAL'
  | 'IMPLEMENTED_NOT_SUPPORTED'
  | 'MODELED_ONLY'
  | 'DEFERRED';

export type IamSupportProfileMaturity =
  | 'MODELED'
  | 'IMPLEMENTED'
  | 'SUPPORTED'
  | 'PRODUCTION_GRADE'
  | 'EXTERNALLY_VALIDATED';

export type IamSupportProfileEvidence =
  | 'SYNTHETIC'
  | 'INTERNAL_RUNTIME'
  | 'EXTERNAL_INTEROPERABILITY'
  | 'OPERATIONAL';

export interface IamSupportProfileRecord {
  id: string;
  family: string;
  support_tier: 'CORE_RELEASE' | 'PARITY_TRACK' | 'DIFFERENTIATOR_TRACK' | 'DEFERRED';
  current_maturity: IamSupportProfileMaturity;
  evidence_class: IamSupportProfileEvidence;
  support_decision: IamSupportProfileDecision;
  product_posture: string;
  supported_profiles: string[];
  unsupported_profiles: string[];
  next_gate: string;
}

export interface IamSupportProfilesResponse {
  generated_at: string;
  profile_count: number;
  decision_counts: Record<IamSupportProfileDecision, number>;
  profiles: IamSupportProfileRecord[];
}

const SUPPORT_PROFILES: IamSupportProfileRecord[] = [
  {
    id: 'oidc-browser-pkce',
    family: 'OIDC browser auth-code plus PKCE',
    support_tier: 'CORE_RELEASE',
    current_maturity: 'SUPPORTED',
    evidence_class: 'EXTERNAL_INTEROPERABILITY',
    support_decision: 'SUPPORTED_BOUNDED',
    product_posture: 'Supported now for the bounded public-client browser profile already exercised by journey coverage.',
    supported_profiles: [
      'Public-client browser auth-code plus PKCE with consent and logout/session reuse.',
    ],
    unsupported_profiles: [
      'Broad parity claims across all browser/client-policy variants.',
      'Unbounded confidential-client browser profile claims.',
    ],
    next_gate: 'Expand supported browser/client profile matrix and production-like deployment evidence.',
  },
  {
    id: 'advanced-oauth-surface',
    family: 'Advanced OAuth and dynamic client registration',
    support_tier: 'PARITY_TRACK',
    current_maturity: 'IMPLEMENTED',
    evidence_class: 'EXTERNAL_INTEROPERABILITY',
    support_decision: 'SUPPORTED_BOUNDED',
    product_posture: 'Dynamic registration is bounded-support; PAR, device authorization, token exchange, and CIBA remain mixed implemented-to-experimental surface.',
    supported_profiles: [
      'Bounded dynamic client registration with initial access token and client-policy enforcement.',
      'Journey-tested baseline device authorization and bounded token-exchange flows.',
    ],
    unsupported_profiles: [
      'Broad advanced OAuth parity claims across all client, policy, and lifecycle variants.',
      'Broad CIBA support claims.',
    ],
    next_gate: 'Publish explicit supported profile rules and harden lifecycle/concurrency semantics.',
  },
  {
    id: 'passkeys-webauthn',
    family: 'Passkeys and WebAuthn',
    support_tier: 'CORE_RELEASE',
    current_maturity: 'IMPLEMENTED',
    evidence_class: 'INTERNAL_RUNTIME',
    support_decision: 'IMPLEMENTED_NOT_SUPPORTED',
    product_posture: 'Enrollment and authentication runtime exist, but browser/authenticator interoperability is not yet a supported product claim.',
    supported_profiles: [],
    unsupported_profiles: [
      'Standards-grade browser interoperability claims.',
      'Supported authenticator matrix claims across platform, roaming, and software-backed authenticators.',
    ],
    next_gate: 'Browser interoperability matrix and standards-grade validation for declared browser/authenticator profiles.',
  },
  {
    id: 'saml-idp-lifecycle',
    family: 'SAML IdP lifecycle',
    support_tier: 'CORE_RELEASE',
    current_maturity: 'IMPLEMENTED',
    evidence_class: 'INTERNAL_RUNTIME',
    support_decision: 'IMPLEMENTED_NOT_SUPPORTED',
    product_posture: 'Metadata, request tracking, response issuance, and logout exist, and one bounded Redirect/Post SP contract is now enforced in runtime, but external interoperability is still below supported claim level.',
    supported_profiles: [
      'Runtime-enforced bounded Redirect/Post SP contract with exact ACS matching, signed login/logout envelopes, and bounded NameID/AuthnContext rules.',
    ],
    unsupported_profiles: [
      'Broad service-provider interoperability claims.',
      'Standards-grade SAML profile coverage claims.',
    ],
    next_gate: 'Declare supported SP profiles and validate assertion/logout interoperability externally.',
  },
  {
    id: 'federation-brokering',
    family: 'Identity brokering and federation runtime',
    support_tier: 'CORE_RELEASE',
    current_maturity: 'IMPLEMENTED',
    evidence_class: 'INTERNAL_RUNTIME',
    support_decision: 'EXPERIMENTAL',
    product_posture: 'OIDC and SAML broker runtime exists, but current default fixtures are synthetic-first and not yet live-adapter backed.',
    supported_profiles: [
      'Bounded internal standalone validation for configured OIDC and SAML broker flows.',
    ],
    unsupported_profiles: [
      'Broad enterprise federation depth claims.',
      'Live directory-federation support claims.',
    ],
    next_gate: 'Replace synthetic-first adapters with live supported broker and directory profiles.',
  },
  {
    id: 'ldap-directory-federation',
    family: 'LDAP and directory federation',
    support_tier: 'PARITY_TRACK',
    current_maturity: 'MODELED',
    evidence_class: 'SYNTHETIC',
    support_decision: 'MODELED_ONLY',
    product_posture: 'Represented in provider-family records and sync model, but not live.',
    supported_profiles: [],
    unsupported_profiles: [
      'Live LDAP or Active Directory federation support.',
    ],
    next_gate: 'Deliver the first live directory adapter and import/sync proof.',
  },
  {
    id: 'scim-style-federation',
    family: 'SCIM-style federation',
    support_tier: 'DIFFERENTIATOR_TRACK',
    current_maturity: 'MODELED',
    evidence_class: 'SYNTHETIC',
    support_decision: 'MODELED_ONLY',
    product_posture: 'Present as a differentiator candidate only.',
    supported_profiles: [],
    unsupported_profiles: [
      'Live SCIM-style provisioning or federation support claims.',
    ],
    next_gate: 'Explicit promote-or-defer decision followed by a live adapter path if promoted.',
  },
  {
    id: 'extension-provider-runtime',
    family: 'Extension and provider runtime',
    support_tier: 'PARITY_TRACK',
    current_maturity: 'MODELED',
    evidence_class: 'SYNTHETIC',
    support_decision: 'MODELED_ONLY',
    product_posture: 'Registry and binding catalogs exist, but there is not yet a product-grade provider execution model.',
    supported_profiles: [],
    unsupported_profiles: [
      'Broad SPI/provider-runtime parity claims.',
    ],
    next_gate: 'Build explicit runtime execution boundaries and supported provider contract model.',
  },
  {
    id: 'standalone-ops-recovery',
    family: 'Backup, restore, key rotation, and readiness review',
    support_tier: 'CORE_RELEASE',
    current_maturity: 'IMPLEMENTED',
    evidence_class: 'INTERNAL_RUNTIME',
    support_decision: 'IMPLEMENTED_NOT_SUPPORTED',
    product_posture: 'Strong internal operations surface exists, but operational evidence is not yet strong enough for production-grade claims.',
    supported_profiles: [],
    unsupported_profiles: [
      'Operationally proven backup/restore and resilience claims.',
    ],
    next_gate: 'Production-like recovery, failure, and key-rotation evidence.',
  },
  {
    id: 'aws-native-posture',
    family: 'AWS-native low-idle-cost posture',
    support_tier: 'DIFFERENTIATOR_TRACK',
    current_maturity: 'MODELED',
    evidence_class: 'SYNTHETIC',
    support_decision: 'MODELED_ONLY',
    product_posture: 'Architecture intent is clear, but not yet proven as a production operating posture.',
    supported_profiles: [],
    unsupported_profiles: [
      'Broad low-idle-cost production posture claims.',
    ],
    next_gate: 'Convert AWS-native architecture intent into deployment and operating evidence.',
  },
  {
    id: 'dpop',
    family: 'DPoP',
    support_tier: 'DEFERRED',
    current_maturity: 'MODELED',
    evidence_class: 'SYNTHETIC',
    support_decision: 'DEFERRED',
    product_posture: 'Explicitly deferred; no implementation evidence exists today.',
    supported_profiles: [],
    unsupported_profiles: ['All DPoP-dependent flows.'],
    next_gate: 'Explicit schedule/promotion decision before any product claim.',
  },
  {
    id: 'kerberos-spnego',
    family: 'Kerberos / SPNEGO',
    support_tier: 'DEFERRED',
    current_maturity: 'MODELED',
    evidence_class: 'SYNTHETIC',
    support_decision: 'DEFERRED',
    product_posture: 'Explicitly deferred; no implementation evidence exists today.',
    supported_profiles: [],
    unsupported_profiles: ['Kerberos/SPNEGO browser SSO flows.'],
    next_gate: 'Explicit schedule/promotion decision before any product claim.',
  },
  {
    id: 'multi-site-rolling-upgrade',
    family: 'Multi-site and rolling-upgrade posture',
    support_tier: 'DEFERRED',
    current_maturity: 'MODELED',
    evidence_class: 'SYNTHETIC',
    support_decision: 'DEFERRED',
    product_posture: 'Explicitly deferred; no implementation evidence exists today.',
    supported_profiles: [],
    unsupported_profiles: ['Multi-site HA and rolling-upgrade claims.'],
    next_gate: 'Explicit schedule/promotion decision before any product claim.',
  },
];

function buildDecisionCounts(): Record<IamSupportProfileDecision, number> {
  const seed: Record<IamSupportProfileDecision, number> = {
    SUPPORTED: 0,
    SUPPORTED_BOUNDED: 0,
    EXPERIMENTAL: 0,
    IMPLEMENTED_NOT_SUPPORTED: 0,
    MODELED_ONLY: 0,
    DEFERRED: 0,
  };
  for (const profile of SUPPORT_PROFILES) {
    seed[profile.support_decision] += 1;
  }
  return seed;
}

export const LocalIamSupportProfileRuntimeStore = {
  listSupportProfiles(): IamSupportProfilesResponse {
    return {
      generated_at: nowIso(),
      profile_count: SUPPORT_PROFILES.length,
      decision_counts: buildDecisionCounts(),
      profiles: SUPPORT_PROFILES.map((profile) => ({
        ...profile,
        supported_profiles: [...profile.supported_profiles],
        unsupported_profiles: [...profile.unsupported_profiles],
      })),
    };
  },

  getSupportProfile(profileId: string): IamSupportProfileRecord | null {
    const profile = SUPPORT_PROFILES.find((candidate) => candidate.id === profileId);
    return profile
      ? {
          ...profile,
          supported_profiles: [...profile.supported_profiles],
          unsupported_profiles: [...profile.unsupported_profiles],
        }
      : null;
  },
};
