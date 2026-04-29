import type { StoredIamAccountSession, StoredIamEmailVerificationTicket, StoredIamLoginTransaction, StoredIamPasswordResetTicket, StoredPendingIamMfaEnrollment } from '../../iamAuthenticationRuntime';
import type { StoredIamIssuedToken } from '../../iamProtocolRuntime';
import type { AsyncIssuedTokenStoreAdapter } from './asyncIssuedTokenStoreAdapter';
import type { AsyncLoginTransactionStoreAdapter } from './asyncLoginTransactionStoreAdapter';
import type { AsyncSessionStoreAdapter } from './asyncSessionStoreAdapter';
import type { AsyncTicketStoreAdapter } from './asyncTicketStoreAdapter';

export class NoopAsyncSessionStoreAdapter implements AsyncSessionStoreAdapter {
  async getById(): Promise<StoredIamAccountSession | null> {
    return null;
  }

  async listByUser(): Promise<StoredIamAccountSession[]> {
    return [];
  }

  async put(_session: StoredIamAccountSession): Promise<void> {}
}

export class NoopAsyncTicketStoreAdapter implements AsyncTicketStoreAdapter {
  async addPasswordResetTicket(_ticket: StoredIamPasswordResetTicket): Promise<void> {}
  async putPasswordResetTicket(_ticket: StoredIamPasswordResetTicket): Promise<void> {}
  async getPasswordResetTicket(): Promise<StoredIamPasswordResetTicket | null> {
    return null;
  }
  async addEmailVerificationTicket(_ticket: StoredIamEmailVerificationTicket): Promise<void> {}
  async putEmailVerificationTicket(_ticket: StoredIamEmailVerificationTicket): Promise<void> {}
  async getEmailVerificationTicket(): Promise<StoredIamEmailVerificationTicket | null> {
    return null;
  }
  async replacePendingMfaEnrollmentForUser(
    _realmId: string,
    _userId: string,
    _enrollment: StoredPendingIamMfaEnrollment,
  ): Promise<void> {}
  async putPendingMfaEnrollment(_enrollment: StoredPendingIamMfaEnrollment): Promise<void> {}
  async getPendingMfaEnrollment(): Promise<StoredPendingIamMfaEnrollment | null> {
    return null;
  }
}

export class NoopAsyncLoginTransactionStoreAdapter implements AsyncLoginTransactionStoreAdapter {
  async getById(): Promise<StoredIamLoginTransaction | null> {
    return null;
  }

  async put(_transaction: StoredIamLoginTransaction): Promise<void> {}
}

export class NoopAsyncIssuedTokenStoreAdapter implements AsyncIssuedTokenStoreAdapter {
  async getById(): Promise<StoredIamIssuedToken | null> {
    return null;
  }

  async getByAccessHash(): Promise<StoredIamIssuedToken | null> {
    return null;
  }

  async getByRefreshHash(): Promise<StoredIamIssuedToken | null> {
    return null;
  }

  async listActiveIdsBySubject(): Promise<string[]> {
    return [];
  }

  async listActiveIdsByBrowserSession(): Promise<string[]> {
    return [];
  }

  async put(_token: StoredIamIssuedToken): Promise<void> {}
}
