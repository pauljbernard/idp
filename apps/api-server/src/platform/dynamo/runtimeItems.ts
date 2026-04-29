export interface RuntimeBaseItem {
  pk: string;
  sk: string;
  entity_type:
    | 'ACCOUNT_SESSION'
    | 'ACCOUNT_SECURITY_STATE'
    | 'LOGIN_TRANSACTION'
    | 'LOGIN_ATTEMPT'
    | 'PASSWORD_RESET_TICKET'
    | 'EMAIL_VERIFICATION_TICKET'
    | 'PENDING_MFA_ENROLLMENT'
    | 'ISSUED_TOKEN'
    | 'ISSUED_TOKEN_LOOKUP'
    | 'USER_LOCKOUT_STATE';
  realm_id: string;
  created_at: string;
  updated_at: string;
  version: number;
  gsi1pk?: string;
  gsi1sk?: string;
  gsi2pk?: string;
  gsi2sk?: string;
  expires_at_epoch?: number;
}

export interface AccountSessionItem extends RuntimeBaseItem {
  entity_type: 'ACCOUNT_SESSION';
  session_id: string;
  user_id: string;
  client_id: string | null;
  client_identifier: string | null;
  client_name: string | null;
  client_protocol: 'OIDC' | 'SAML' | null;
  scope_names: string[];
  assurance_level: 'PASSWORD' | 'MFA' | 'PASSKEY';
  authenticated_at: string;
  issued_at: string;
  last_seen_at: string;
  expires_at: string;
  revoked_at: string | null;
  session_proof_hash: string | null;
  federated_login_context: {
    source_type: 'BROKER' | 'FEDERATION';
    linked_identity_id: string;
    provider_id: string;
    provider_name: string;
    provider_alias: string | null;
    provider_kind: string;
    external_subject: string;
  } | null;
  synthetic: boolean;
}

export interface AccountSecurityStateItem extends RuntimeBaseItem {
  entity_type: 'ACCOUNT_SECURITY_STATE';
  user_id: string;
  email_verified_at: string | null;
  last_login_at: string | null;
  last_password_updated_at: string | null;
  last_mfa_authenticated_at: string | null;
  last_passkey_authenticated_at: string | null;
}

export interface LoginTransactionItem extends RuntimeBaseItem {
  entity_type: 'LOGIN_TRANSACTION';
  transaction_id: string;
  user_id: string;
  flow_id: string | null;
  client_id: string | null;
  client_identifier: string | null;
  client_name: string | null;
  client_protocol: 'OIDC' | 'SAML' | null;
  requested_scope_names: string[];
  pending_required_actions: string[];
  pending_scope_consent: string[];
  pending_mfa: boolean;
  federated_login_context: {
    source_type: 'BROKER' | 'FEDERATION';
    linked_identity_id: string;
    provider_id: string;
    provider_name: string;
    provider_alias: string | null;
    provider_kind: string;
    external_subject: string;
  } | null;
  expires_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  status: 'PENDING_REQUIRED_ACTIONS' | 'PENDING_CONSENT' | 'PENDING_MFA' | 'COMPLETE' | 'CANCELLED' | 'EXPIRED';
}

export interface PasswordResetTicketItem extends RuntimeBaseItem {
  entity_type: 'PASSWORD_RESET_TICKET';
  ticket_id: string;
  user_id: string;
  code_hash: string;
  code_preview: string | null;
  issued_at: string;
  expires_at: string;
  status: 'PENDING' | 'CONSUMED' | 'EXPIRED';
  consumed_at: string | null;
}

export interface EmailVerificationTicketItem extends RuntimeBaseItem {
  entity_type: 'EMAIL_VERIFICATION_TICKET';
  ticket_id: string;
  user_id: string;
  code_hash: string;
  code_preview: string | null;
  issued_at: string;
  expires_at: string;
  status: 'PENDING' | 'CONSUMED' | 'EXPIRED';
  consumed_at: string | null;
}

export interface PendingMfaEnrollmentItem extends RuntimeBaseItem {
  entity_type: 'PENDING_MFA_ENROLLMENT';
  enrollment_id: string;
  user_id: string;
  secret: string;
  backup_codes: string[];
  expires_at: string;
  consumed_at: string | null;
}

export interface LoginAttemptItem extends RuntimeBaseItem {
  entity_type: 'LOGIN_ATTEMPT';
  attempt_id: string;
  user_id: string | null;
  username_or_email: string;
  client_identifier: string | null;
  outcome: 'SUCCESS' | 'FAILED_CREDENTIALS' | 'FAILED_MFA' | 'FAILED_PASSKEY' | 'LOCKED';
  summary: string;
  occurred_at: string;
}

export interface UserLockoutStateItem extends RuntimeBaseItem {
  entity_type: 'USER_LOCKOUT_STATE';
  user_id: string;
  failed_attempt_count: number;
  last_failed_at: string | null;
  lockout_until: string | null;
  locked_at: string | null;
}

export interface IssuedTokenItem extends RuntimeBaseItem {
  entity_type: 'ISSUED_TOKEN';
  token_id: string;
  client_id: string;
  subject_kind: string;
  subject_id: string;
  browser_session_id: string | null;
  grant_type: string;
  scope: string;
  scope_ids: string[];
  issued_at: string;
  expires_at: string;
  refresh_expires_at: string | null;
  status: string;
  revoked_at: string | null;
  requested_purpose: string | null;
  access_token_hash: string;
  refresh_token_hash: string | null;
  claims: Record<string, unknown>;
  id_token_claims: Record<string, unknown>;
  userinfo_claims: Record<string, unknown>;
  client_scope_names: string[];
}

export interface IssuedTokenLookupItem extends RuntimeBaseItem {
  entity_type: 'ISSUED_TOKEN_LOOKUP';
  token_id: string;
  token_use: 'access_token' | 'refresh_token';
}
