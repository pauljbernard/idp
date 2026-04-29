import type {
  StoredIamEmailVerificationTicket,
  StoredIamPasswordResetTicket,
  StoredPendingIamMfaEnrollment,
} from '../../iamAuthenticationRuntime';

export interface TicketRepository {
  getPasswordResetTicket(realmId: string, ticketId: string): Promise<StoredIamPasswordResetTicket | null>;
  putPasswordResetTicket(ticket: StoredIamPasswordResetTicket): Promise<void>;

  getEmailVerificationTicket(realmId: string, ticketId: string): Promise<StoredIamEmailVerificationTicket | null>;
  putEmailVerificationTicket(ticket: StoredIamEmailVerificationTicket): Promise<void>;

  getPendingMfaEnrollment(
    realmId: string,
    userId: string,
    enrollmentId: string,
  ): Promise<StoredPendingIamMfaEnrollment | null>;
  replacePendingMfaEnrollmentForUser(
    realmId: string,
    userId: string,
    enrollment: StoredPendingIamMfaEnrollment,
  ): Promise<void>;
  putPendingMfaEnrollment(enrollment: StoredPendingIamMfaEnrollment): Promise<void>;
}
