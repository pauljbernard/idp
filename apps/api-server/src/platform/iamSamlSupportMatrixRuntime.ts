function nowIso(): string {
  return new Date().toISOString();
}

export type IamSamlBinding = 'REDIRECT' | 'POST';

export interface IamSupportedSamlSpProfileDefinition {
  profile_id: string;
  profile_name: string;
  request_bindings: IamSamlBinding[];
  response_bindings: IamSamlBinding[];
  exact_acs_match_required: boolean;
  wildcard_acs_allowed: boolean;
  request_id_required: boolean;
  max_request_id_length: number;
  idp_initiated_supported: boolean;
  sp_initiated_supported: boolean;
  passive_requests_supported: boolean;
  allow_create_supported: boolean;
  supported_nameid_formats: string[];
  supported_requested_authn_context_comparisons: string[];
  supported_requested_authn_context_class_refs: string[];
  signed_login_responses: boolean;
  signed_logout_responses: boolean;
}

export interface IamSamlSupportMatrixRow {
  id: string;
  saml_area: string;
  current_maturity: 'MODELED' | 'IMPLEMENTED' | 'SUPPORTED';
  evidence_class: 'SYNTHETIC' | 'INTERNAL_RUNTIME' | 'EXTERNAL_INTEROPERABILITY';
  current_product_posture: string;
  next_gate: string;
}

export interface IamSamlSupportMatrixResponse {
  generated_at: string;
  matrix_version: string;
  overall_support_decision: 'IMPLEMENTED_NOT_SUPPORTED';
  supported_profile_definition: IamSupportedSamlSpProfileDefinition;
  rows: IamSamlSupportMatrixRow[];
  current_claim_boundary: {
    allowed_claims: string[];
    disallowed_claims: string[];
  };
}

export const BOUNDED_SUPPORTED_SAML_SP_PROFILE: IamSupportedSamlSpProfileDefinition = {
  profile_id: 'saml-sp-bounded-redirect-post-v1',
  profile_name: 'Bounded SAML SP Redirect/Post profile',
  request_bindings: ['REDIRECT'],
  response_bindings: ['POST'],
  exact_acs_match_required: true,
  wildcard_acs_allowed: false,
  request_id_required: true,
  max_request_id_length: 256,
  idp_initiated_supported: true,
  sp_initiated_supported: true,
  passive_requests_supported: false,
  allow_create_supported: false,
  supported_nameid_formats: [
    'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
  ],
  supported_requested_authn_context_comparisons: ['exact'],
  supported_requested_authn_context_class_refs: [
    'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
  ],
  signed_login_responses: true,
  signed_logout_responses: true,
};

const SAML_SUPPORT_ROWS: IamSamlSupportMatrixRow[] = [
  {
    id: 'saml-metadata-endpoint',
    saml_area: 'Metadata endpoint',
    current_maturity: 'IMPLEMENTED',
    evidence_class: 'INTERNAL_RUNTIME',
    current_product_posture: 'Present.',
    next_gate: 'Define exact metadata commitments for supported SP profiles.',
  },
  {
    id: 'saml-sp-initiated-request-tracking',
    saml_area: 'SP-initiated request tracking',
    current_maturity: 'IMPLEMENTED',
    evidence_class: 'INTERNAL_RUNTIME',
    current_product_posture: 'Present.',
    next_gate: 'External SP validation.',
  },
  {
    id: 'saml-response-issuance',
    saml_area: 'SAML response issuance',
    current_maturity: 'IMPLEMENTED',
    evidence_class: 'INTERNAL_RUNTIME',
    current_product_posture: 'Present but handcrafted.',
    next_gate: 'Assertion and signing hardening.',
  },
  {
    id: 'saml-logout-response',
    saml_area: 'SAML logout response',
    current_maturity: 'IMPLEMENTED',
    evidence_class: 'INTERNAL_RUNTIME',
    current_product_posture: 'Present but handcrafted.',
    next_gate: 'Logout interoperability validation.',
  },
  {
    id: 'saml-session-tracking',
    saml_area: 'SAML session tracking and termination',
    current_maturity: 'IMPLEMENTED',
    evidence_class: 'INTERNAL_RUNTIME',
    current_product_posture: 'Present and integrated with browser session lifecycle.',
    next_gate: 'Shared durable-state and external SP evidence.',
  },
  {
    id: 'saml-supported-sp-profile-definition',
    saml_area: 'Supported SP profile definition',
    current_maturity: 'IMPLEMENTED',
    evidence_class: 'INTERNAL_RUNTIME',
    current_product_posture: 'A bounded Redirect/Post SP contract is now enforced in runtime, but external interoperability is still below supported claim level.',
    next_gate: 'External SP interoperability validation for the bounded profile.',
  },
];

export const LocalIamSamlSupportMatrixRuntimeStore = {
  getSupportMatrix(): IamSamlSupportMatrixResponse {
    return {
      generated_at: nowIso(),
      matrix_version: '2026-04-28',
      overall_support_decision: 'IMPLEMENTED_NOT_SUPPORTED',
      supported_profile_definition: {
        ...BOUNDED_SUPPORTED_SAML_SP_PROFILE,
        request_bindings: [...BOUNDED_SUPPORTED_SAML_SP_PROFILE.request_bindings],
        response_bindings: [...BOUNDED_SUPPORTED_SAML_SP_PROFILE.response_bindings],
        supported_nameid_formats: [...BOUNDED_SUPPORTED_SAML_SP_PROFILE.supported_nameid_formats],
        supported_requested_authn_context_comparisons: [
          ...BOUNDED_SUPPORTED_SAML_SP_PROFILE.supported_requested_authn_context_comparisons,
        ],
        supported_requested_authn_context_class_refs: [
          ...BOUNDED_SUPPORTED_SAML_SP_PROFILE.supported_requested_authn_context_class_refs,
        ],
      },
      rows: SAML_SUPPORT_ROWS.map((row) => ({ ...row })),
      current_claim_boundary: {
        allowed_claims: [
          'Implemented SAML IdP lifecycle surface.',
          'Metadata, request tracking, login, logout, and session APIs.',
          'Internal SAML lifecycle integration with browser-session handling.',
          'Runtime-enforced bounded Redirect/Post service-provider contract.',
        ],
        disallowed_claims: [
          'Broadly supported SAML service-provider interoperability.',
          'Standards-grade SAML profile coverage.',
          'Production-grade SAML parity with mature IAM products.',
        ],
      },
    };
  },
};
