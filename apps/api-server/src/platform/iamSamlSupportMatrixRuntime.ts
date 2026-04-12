function nowIso(): string {
  return new Date().toISOString();
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
  rows: IamSamlSupportMatrixRow[];
  current_claim_boundary: {
    allowed_claims: string[];
    disallowed_claims: string[];
  };
}

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
    current_maturity: 'MODELED',
    evidence_class: 'SYNTHETIC',
    current_product_posture: 'Not yet declared.',
    next_gate: 'Publish the first supported SP matrix.',
  },
];

export const LocalIamSamlSupportMatrixRuntimeStore = {
  getSupportMatrix(): IamSamlSupportMatrixResponse {
    return {
      generated_at: nowIso(),
      matrix_version: '2026-04-11',
      overall_support_decision: 'IMPLEMENTED_NOT_SUPPORTED',
      rows: SAML_SUPPORT_ROWS.map((row) => ({ ...row })),
      current_claim_boundary: {
        allowed_claims: [
          'Implemented SAML IdP lifecycle surface.',
          'Metadata, request tracking, login, logout, and session APIs.',
          'Internal SAML lifecycle integration with browser-session handling.',
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
