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
    if (this.mode.dualWrite) {
      await this.legacy.addPasswordResetTicket(ticket);
      await this.v2.addPasswordResetTicket(ticket);
      return;
    }
    if (this.mode.readV2) {
      await this.v2.addPasswordResetTicket(ticket);
      return;
    }
    await this.legacy.addPasswordResetTicket(ticket);
  }

  async putPasswordResetTicket(ticket: StoredIamPasswordResetTicket): Promise<void> {
    if (this.mode.dualWrite) {
      await this.legacy.putPasswordResetTicket(ticket);
      await this.v2.putPasswordResetTicket(ticket);
      return;
    }
    if (this.mode.readV2) {
      await this.v2.putPasswordResetTicket(ticket);
      return;
    }
    await this.legacy.putPasswordResetTicket(ticket);
  }

  async getPasswordResetTicket(realmId: string, ticketId: string): Promise<StoredIamPasswordResetTicket | null> {
    if (this.mode.readV2) {
      return this.v2.getPasswordResetTicket(realmId, ticketId);
    }
    return this.legacy.getPasswordResetTicket(realmId, ticketId);
  }

  async addEmailVerificationTicket(ticket: StoredIamEmailVerificationTicket): Promise<void> {
    if (this.mode.dualWrite) {
      await this.legacy.addEmailVerificationTicket(ticket);
      await this.v2.addEmailVerificationTicket(ticket);
      return;
    }
    if (this.mode.readV2) {
      await this.v2.addEmailVerificationTicket(ticket);
      return;
    }
    await this.legacy.addEmailVerificationTicket(ticket);
  }

  async putEmailVerificationTicket(ticket: StoredIamEmailVerificationTicket): Promise<void> {
    if (this.mode.dualWrite) {
      await this.legacy.putEmailVerificationTicket(ticket);
      await this.v2.putEmailVerificationTicket(ticket);
      return;
    }
    if (this.mode.readV2) {
      await this.v2.putEmailVerificationTicket(ticket);
      return;
    }
    await this.legacy.putEmailVerificationTicket(ticket);
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
    if (this.mode.dualWrite) {
      await this.legacy.replacePendingMfaEnrollmentForUser(realmId, userId, enrollment);
      await this.v2.replacePendingMfaEnrollmentForUser(realmId, userId, enrollment);
      return;
    }
    if (this.mode.readV2) {
      await this.v2.replacePendingMfaEnrollmentForUser(realmId, userId, enrollment);
      return;
    }
    await this.legacy.replacePendingMfaEnrollmentForUser(realmId, userId, enrollment);
  }

  async putPendingMfaEnrollment(enrollment: StoredPendingIamMfaEnrollment): Promise<void> {
    if (this.mode.dualWrite) {
      await this.legacy.putPendingMfaEnrollment(enrollment);
      await this.v2.putPendingMfaEnrollment(enrollment);
      return;
    }
    if (this.mode.readV2) {
      await this.v2.putPendingMfaEnrollment(enrollment);
      return;
    }
    await this.legacy.putPendingMfaEnrollment(enrollment);
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
