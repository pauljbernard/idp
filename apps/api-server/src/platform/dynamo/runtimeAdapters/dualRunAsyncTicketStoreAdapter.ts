import type {
  StoredIamEmailVerificationTicket,
  StoredIamPasswordResetTicket,
  StoredPendingIamMfaEnrollment,
} from '../../iamAuthenticationRuntime';
import type { RuntimeRepositoryMode } from '../runtimeRepositoryMode';
import type { AsyncTicketStoreAdapter } from './asyncTicketStoreAdapter';

export class DualRunAsyncTicketStoreAdapter implements AsyncTicketStoreAdapter {
  constructor(
    private readonly legacy: AsyncTicketStoreAdapter,
    private readonly v2: AsyncTicketStoreAdapter,
    private readonly mode: RuntimeRepositoryMode,
  ) {}

  async addPasswordResetTicket(ticket: StoredIamPasswordResetTicket): Promise<void> {
    await this.legacy.addPasswordResetTicket(ticket);
    if (this.mode.dualWrite || this.mode.readV2) {
      await this.v2.addPasswordResetTicket(ticket);
    }
  }

  async putPasswordResetTicket(ticket: StoredIamPasswordResetTicket): Promise<void> {
    await this.legacy.putPasswordResetTicket(ticket);
    if (this.mode.dualWrite || this.mode.readV2) {
      await this.v2.putPasswordResetTicket(ticket);
    }
  }

  async getPasswordResetTicket(realmId: string, ticketId: string): Promise<StoredIamPasswordResetTicket | null> {
    if (this.mode.readV2) {
      return this.v2.getPasswordResetTicket(realmId, ticketId);
    }
    return this.legacy.getPasswordResetTicket(realmId, ticketId);
  }

  async addEmailVerificationTicket(ticket: StoredIamEmailVerificationTicket): Promise<void> {
    await this.legacy.addEmailVerificationTicket(ticket);
    if (this.mode.dualWrite || this.mode.readV2) {
      await this.v2.addEmailVerificationTicket(ticket);
    }
  }

  async putEmailVerificationTicket(ticket: StoredIamEmailVerificationTicket): Promise<void> {
    await this.legacy.putEmailVerificationTicket(ticket);
    if (this.mode.dualWrite || this.mode.readV2) {
      await this.v2.putEmailVerificationTicket(ticket);
    }
  }

  async getEmailVerificationTicket(realmId: string, ticketId: string): Promise<StoredIamEmailVerificationTicket | null> {
    if (this.mode.readV2) {
      return this.v2.getEmailVerificationTicket(realmId, ticketId);
    }
    return this.legacy.getEmailVerificationTicket(realmId, ticketId);
  }

  async replacePendingMfaEnrollmentForUser(
    realmId: string,
    userId: string,
    enrollment: StoredPendingIamMfaEnrollment,
  ): Promise<void> {
    await this.legacy.replacePendingMfaEnrollmentForUser(realmId, userId, enrollment);
    if (this.mode.dualWrite || this.mode.readV2) {
      await this.v2.replacePendingMfaEnrollmentForUser(realmId, userId, enrollment);
    }
  }

  async putPendingMfaEnrollment(enrollment: StoredPendingIamMfaEnrollment): Promise<void> {
    await this.legacy.putPendingMfaEnrollment(enrollment);
    if (this.mode.dualWrite || this.mode.readV2) {
      await this.v2.putPendingMfaEnrollment(enrollment);
    }
  }

  async getPendingMfaEnrollment(
    realmId: string,
    userId: string,
    enrollmentId: string,
  ): Promise<StoredPendingIamMfaEnrollment | null> {
    if (this.mode.readV2) {
      return this.v2.getPendingMfaEnrollment(realmId, userId, enrollmentId);
    }
    return this.legacy.getPendingMfaEnrollment(realmId, userId, enrollmentId);
  }
}
