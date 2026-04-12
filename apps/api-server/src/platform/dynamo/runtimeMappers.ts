import type {
  StoredIamAccountSession,
  StoredIamEmailVerificationTicket,
  StoredIamLoginTransaction,
  StoredIamPasswordResetTicket,
  StoredPendingIamMfaEnrollment,
} from '../iamAuthenticationRuntime';
import type { StoredIamIssuedToken } from '../iamProtocolRuntime';
import type {
  AccountSessionItem,
  EmailVerificationTicketItem,
  IssuedTokenItem,
  LoginTransactionItem,
  PasswordResetTicketItem,
  PendingMfaEnrollmentItem,
} from './runtimeItems';
import { runtimeKeys, toEpochSeconds } from './runtimeKeys';

export function toAccountSessionItem(record: StoredIamAccountSession): AccountSessionItem {
  return {
    ...runtimeKeys.session(record.id),
    ...runtimeKeys.sessionsByUser(record.user_id, record.issued_at, record.id),
    entity_type: 'ACCOUNT_SESSION',
    realm_id: record.realm_id,
    session_id: record.id,
    user_id: record.user_id,
    client_id: record.client_id,
    client_identifier: record.client_identifier,
    client_name: record.client_name,
    client_protocol: record.client_protocol,
    scope_names: [...record.scope_names],
    assurance_level: record.assurance_level,
    authenticated_at: record.authenticated_at,
    issued_at: record.issued_at,
    last_seen_at: record.last_seen_at,
    expires_at: record.expires_at,
    revoked_at: record.revoked_at,
    session_proof_hash: record.session_proof_hash,
    federated_login_context: record.federated_login_context ? { ...record.federated_login_context } : null,
    synthetic: record.synthetic,
    created_at: record.issued_at,
    updated_at: record.last_seen_at,
    version: 1,
    expires_at_epoch: toEpochSeconds(record.expires_at),
  };
}

export function fromAccountSessionItem(item: AccountSessionItem): StoredIamAccountSession {
  return {
    id: item.session_id,
    realm_id: item.realm_id,
    user_id: item.user_id,
    client_id: item.client_id,
    client_identifier: item.client_identifier,
    client_name: item.client_name,
    client_protocol: item.client_protocol,
    scope_names: [...item.scope_names],
    assurance_level: item.assurance_level,
    authenticated_at: item.authenticated_at,
    issued_at: item.issued_at,
    last_seen_at: item.last_seen_at,
    expires_at: item.expires_at,
    revoked_at: item.revoked_at,
    session_proof_hash: item.session_proof_hash,
    federated_login_context: item.federated_login_context ? { ...item.federated_login_context } : null,
    synthetic: item.synthetic,
  };
}

export function toLoginTransactionItem(record: StoredIamLoginTransaction): LoginTransactionItem {
  return {
    ...runtimeKeys.loginTransaction(record.id),
    ...runtimeKeys.loginTransactionsByUser(record.user_id, record.created_at, record.id),
    entity_type: 'LOGIN_TRANSACTION',
    realm_id: record.realm_id,
    transaction_id: record.id,
    user_id: record.user_id,
    flow_id: record.flow_id,
    client_id: record.client_id,
    client_identifier: record.client_identifier,
    client_name: record.client_name,
    client_protocol: record.client_protocol,
    requested_scope_names: [...record.requested_scope_names],
    pending_required_actions: [...record.pending_required_actions],
    pending_scope_consent: [...record.pending_scope_consent],
    pending_mfa: record.pending_mfa,
    federated_login_context: record.federated_login_context ? { ...record.federated_login_context } : null,
    expires_at: record.expires_at,
    completed_at: record.completed_at,
    cancelled_at: record.cancelled_at,
    status: record.status,
    created_at: record.created_at,
    updated_at: record.completed_at ?? record.cancelled_at ?? record.created_at,
    version: 1,
    expires_at_epoch: toEpochSeconds(record.expires_at),
  };
}

export function fromLoginTransactionItem(item: LoginTransactionItem): StoredIamLoginTransaction {
  return {
    id: item.transaction_id,
    realm_id: item.realm_id,
    user_id: item.user_id,
    flow_id: item.flow_id,
    client_id: item.client_id,
    client_identifier: item.client_identifier,
    client_name: item.client_name,
    client_protocol: item.client_protocol,
    requested_scope_names: [...item.requested_scope_names],
    pending_required_actions: [...item.pending_required_actions],
    pending_scope_consent: [...item.pending_scope_consent],
    pending_mfa: item.pending_mfa,
    federated_login_context: item.federated_login_context ? { ...item.federated_login_context } : null,
    created_at: item.created_at,
    expires_at: item.expires_at,
    completed_at: item.completed_at,
    cancelled_at: item.cancelled_at,
    status: item.status,
  };
}

export function toPasswordResetTicketItem(record: StoredIamPasswordResetTicket): PasswordResetTicketItem {
  return {
    ...runtimeKeys.passwordResetTicket(record.id),
    ...runtimeKeys.ticketsByUser(record.user_id, record.issued_at, 'PASSWORDRESET', record.id),
    entity_type: 'PASSWORD_RESET_TICKET',
    realm_id: record.realm_id,
    ticket_id: record.id,
    user_id: record.user_id,
    code_hash: record.code_hash,
    code_preview: record.code_preview,
    issued_at: record.issued_at,
    expires_at: record.expires_at,
    status: record.status,
    consumed_at: record.consumed_at,
    created_at: record.issued_at,
    updated_at: record.consumed_at ?? record.issued_at,
    version: 1,
    expires_at_epoch: toEpochSeconds(record.expires_at),
  };
}

export function fromPasswordResetTicketItem(item: PasswordResetTicketItem): StoredIamPasswordResetTicket {
  return {
    id: item.ticket_id,
    realm_id: item.realm_id,
    user_id: item.user_id,
    code_hash: item.code_hash,
    code_preview: item.code_preview,
    issued_at: item.issued_at,
    expires_at: item.expires_at,
    status: item.status,
    consumed_at: item.consumed_at,
  };
}

export function toEmailVerificationTicketItem(record: StoredIamEmailVerificationTicket): EmailVerificationTicketItem {
  return {
    ...runtimeKeys.emailVerificationTicket(record.id),
    ...runtimeKeys.ticketsByUser(record.user_id, record.issued_at, 'EMAILVERIFICATION', record.id),
    entity_type: 'EMAIL_VERIFICATION_TICKET',
    realm_id: record.realm_id,
    ticket_id: record.id,
    user_id: record.user_id,
    code_hash: record.code_hash,
    code_preview: record.code_preview,
    issued_at: record.issued_at,
    expires_at: record.expires_at,
    status: record.status,
    consumed_at: record.consumed_at,
    created_at: record.issued_at,
    updated_at: record.consumed_at ?? record.issued_at,
    version: 1,
    expires_at_epoch: toEpochSeconds(record.expires_at),
  };
}

export function fromEmailVerificationTicketItem(item: EmailVerificationTicketItem): StoredIamEmailVerificationTicket {
  return {
    id: item.ticket_id,
    realm_id: item.realm_id,
    user_id: item.user_id,
    code_hash: item.code_hash,
    code_preview: item.code_preview,
    issued_at: item.issued_at,
    expires_at: item.expires_at,
    status: item.status,
    consumed_at: item.consumed_at,
  };
}

export function toPendingMfaEnrollmentItem(record: StoredPendingIamMfaEnrollment): PendingMfaEnrollmentItem {
  return {
    ...runtimeKeys.pendingMfaEnrollment(record.id),
    ...runtimeKeys.ticketsByUser(record.user_id, record.created_at, 'PENDINGMFA', record.id),
    entity_type: 'PENDING_MFA_ENROLLMENT',
    realm_id: record.realm_id,
    enrollment_id: record.id,
    user_id: record.user_id,
    secret: record.secret,
    backup_codes: [...record.backup_codes],
    expires_at: record.expires_at,
    consumed_at: record.consumed_at,
    created_at: record.created_at,
    updated_at: record.consumed_at ?? record.created_at,
    version: 1,
    expires_at_epoch: toEpochSeconds(record.expires_at),
  };
}

export function fromPendingMfaEnrollmentItem(item: PendingMfaEnrollmentItem): StoredPendingIamMfaEnrollment {
  return {
    id: item.enrollment_id,
    realm_id: item.realm_id,
    user_id: item.user_id,
    secret: item.secret,
    backup_codes: [...item.backup_codes],
    created_at: item.created_at,
    expires_at: item.expires_at,
    consumed_at: item.consumed_at,
  };
}

export function toIssuedTokenItem(record: StoredIamIssuedToken): IssuedTokenItem {
  return {
    ...runtimeKeys.token(record.id),
    ...runtimeKeys.tokensBySubject(record.subject_kind, record.subject_id, record.issued_at, record.id),
    ...(record.browser_session_id
      ? runtimeKeys.tokensByBrowserSession(record.browser_session_id, record.issued_at, record.id)
      : {}),
    entity_type: 'ISSUED_TOKEN',
    realm_id: record.realm_id,
    token_id: record.id,
    client_id: record.client_id,
    subject_kind: record.subject_kind,
    subject_id: record.subject_id,
    browser_session_id: record.browser_session_id,
    grant_type: record.grant_type,
    scope: record.scope,
    scope_ids: [...record.scope_ids],
    issued_at: record.issued_at,
    expires_at: record.expires_at,
    refresh_expires_at: record.refresh_expires_at,
    status: record.status,
    revoked_at: record.revoked_at,
    requested_purpose: record.requested_purpose,
    access_token_hash: record.access_token_hash,
    refresh_token_hash: record.refresh_token_hash,
    claims: cloneRecord(record.claims),
    id_token_claims: cloneRecord(record.id_token_claims),
    userinfo_claims: cloneRecord(record.userinfo_claims),
    client_scope_names: [...record.client_scope_names],
    created_at: record.issued_at,
    updated_at: record.revoked_at ?? record.issued_at,
    version: 1,
    expires_at_epoch: toEpochSeconds(record.refresh_expires_at ?? record.expires_at),
  };
}

export function fromIssuedTokenItem(item: IssuedTokenItem): StoredIamIssuedToken {
  return {
    id: item.token_id,
    realm_id: item.realm_id,
    client_id: item.client_id,
    subject_kind: item.subject_kind as StoredIamIssuedToken['subject_kind'],
    subject_id: item.subject_id,
    browser_session_id: item.browser_session_id,
    grant_type: item.grant_type as StoredIamIssuedToken['grant_type'],
    scope: item.scope,
    scope_ids: [...item.scope_ids],
    issued_at: item.issued_at,
    expires_at: item.expires_at,
    refresh_expires_at: item.refresh_expires_at,
    status: item.status as StoredIamIssuedToken['status'],
    revoked_at: item.revoked_at,
    requested_purpose: item.requested_purpose,
    access_token_hash: item.access_token_hash,
    refresh_token_hash: item.refresh_token_hash,
    claims: cloneRecord(item.claims),
    id_token_claims: cloneRecord(item.id_token_claims),
    userinfo_claims: cloneRecord(item.userinfo_claims),
    client_scope_names: [...item.client_scope_names],
  };
}

function cloneRecord(value: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}
