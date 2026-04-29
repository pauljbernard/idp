function nowIso(): string {
  return new Date().toISOString();
}

export interface IamPasskeySupportMatrixRow {
  id: string;
  surface: string;
  current_maturity: 'MODELED' | 'IMPLEMENTED' | 'SUPPORTED';
  evidence_class: 'SYNTHETIC' | 'INTERNAL_RUNTIME' | 'EXTERNAL_INTEROPERABILITY';
  current_product_posture: string;
  next_gate: string;
}

export interface IamPasskeySupportMatrixResponse {
  generated_at: string;
  matrix_version: string;
  overall_support_decision: 'IMPLEMENTED_NOT_SUPPORTED';
  rows: IamPasskeySupportMatrixRow[];
  current_claim_boundary: {
    allowed_claims: string[];
    disallowed_claims: string[];
  };
}

const PASSKEY_SUPPORT_ROWS: IamPasskeySupportMatrixRow[] = [
  {
    id: 'passkey-enrollment',
    surface: 'Account passkey enrollment begin/complete',
    current_maturity: 'IMPLEMENTED',
    evidence_class: 'INTERNAL_RUNTIME',
    current_product_posture: 'Present and usable in the standalone runtime.',
    next_gate: 'Standards-grade validation and browser support declaration.',
  },
  {
    id: 'passkey-login',
    surface: 'Passkey login begin/complete',
    current_maturity: 'IMPLEMENTED',
    evidence_class: 'INTERNAL_RUNTIME',
    current_product_posture: 'Present and usable in the standalone runtime.',
    next_gate: 'Standards-grade validation and browser support declaration.',
  },
  {
    id: 'passkey-credential-management',
    surface: 'Passkey credential inventory and revocation',
    current_maturity: 'IMPLEMENTED',
    evidence_class: 'INTERNAL_RUNTIME',
    current_product_posture: 'Present in account and admin-facing surfaces.',
    next_gate: 'Preserve and integrate into the supported browser/authenticator profile set.',
  },
  {
    id: 'passkey-challenge-persistence',
    surface: 'Challenge persistence and maintenance',
    current_maturity: 'IMPLEMENTED',
    evidence_class: 'INTERNAL_RUNTIME',
    current_product_posture: 'Transient maintenance and split-store coverage exist.',
    next_gate: 'Shared durable-state and replay-safety hardening.',
  },
  {
    id: 'passkey-browser-interoperability',
    surface: 'Browser interoperability',
    current_maturity: 'MODELED',
    evidence_class: 'SYNTHETIC',
    current_product_posture: 'Not yet explicitly declared.',
    next_gate: 'External browser test matrix.',
  },
  {
    id: 'passkey-authenticator-support',
    surface: 'Authenticator support matrix',
    current_maturity: 'MODELED',
    evidence_class: 'SYNTHETIC',
    current_product_posture: 'Not yet explicitly declared.',
    next_gate: 'Explicit support matrix for platform, roaming, and software-backed authenticator classes.',
  },
];

export const LocalIamPasskeySupportMatrixRuntimeStore = {
  getSupportMatrix(): IamPasskeySupportMatrixResponse {
    return {
      generated_at: nowIso(),
      matrix_version: '2026-04-11',
      overall_support_decision: 'IMPLEMENTED_NOT_SUPPORTED',
      rows: PASSKEY_SUPPORT_ROWS.map((row) => ({ ...row })),
      current_claim_boundary: {
        allowed_claims: [
          'Implemented passkey enrollment and authentication flows.',
          'Implemented passkey credential management.',
          'Implemented transient-state maintenance for passkey challenges.',
        ],
        disallowed_claims: [
          'Supported WebAuthn interoperability across browsers.',
          'Supported authenticator combinations.',
          'Standards-grade passkey parity with mature IAM products.',
        ],
      },
    };
  },
};
