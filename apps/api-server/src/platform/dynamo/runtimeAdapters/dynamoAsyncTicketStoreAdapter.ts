import type {
  StoredIamEmailVerificationTicket,
  StoredIamPasswordResetTicket,
  StoredPendingIamMfaEnrollment,
} from '../../iamAuthenticationRuntime';
import type { TicketRepository } from '../repositories/ticketRepository';
import type { AsyncTicketStoreAdapter } from './asyncTicketStoreAdapter';

export class DynamoAsyncTicketStoreAdapter implements AsyncTicketStoreAdapter {
  constructor(private readonly repository: TicketRepository) {}

  addPasswordResetTicket(ticket: StoredIamPasswordResetTicket): Promise<void> {
    return this.repository.putPasswordResetTicket(ticket);
  }

  putPasswordResetTicket(ticket: StoredIamPasswordResetTicket): Promise<void> {
    return this.repository.putPasswordResetTicket(ticket);
  }

  getPasswordResetTicket(realmId: string, ticketId: string): Promise<StoredIamPasswordResetTicket | null> {
    return this.repository.getPasswordResetTicket(realmId, ticketId);
  }

  addEmailVerificationTicket(ticket: StoredIamEmailVerificationTicket): Promise<void> {
    return this.repository.putEmailVerificationTicket(ticket);
  }

  putEmailVerificationTicket(ticket: StoredIamEmailVerificationTicket): Promise<void> {
    return this.repository.putEmailVerificationTicket(ticket);
  }

  getEmailVerificationTicket(realmId: string, ticketId: string): Promise<StoredIamEmailVerificationTicket | null> {
    return this.repository.getEmailVerificationTicket(realmId, ticketId);
  }

  replacePendingMfaEnrollmentForUser(
    realmId: string,
    userId: string,
    enrollment: StoredPendingIamMfaEnrollment,
  ): Promise<void> {
    return this.repository.replacePendingMfaEnrollmentForUser(realmId, userId, enrollment);
  }

  putPendingMfaEnrollment(enrollment: StoredPendingIamMfaEnrollment): Promise<void> {
    return this.repository.putPendingMfaEnrollment(enrollment);
  }

  getPendingMfaEnrollment(
    realmId: string,
    userId: string,
    enrollmentId: string,
  ): Promise<StoredPendingIamMfaEnrollment | null> {
    return this.repository.getPendingMfaEnrollment(realmId, userId, enrollmentId);
  }
}
