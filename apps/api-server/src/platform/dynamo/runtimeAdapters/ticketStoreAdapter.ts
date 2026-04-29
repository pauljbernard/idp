import type {
  StoredIamEmailVerificationTicket,
  StoredIamPasswordResetTicket,
  StoredPendingIamMfaEnrollment,
} from '../../iamAuthenticationRuntime';

export interface TicketStoreAdapter {
  addPasswordResetTicket(ticket: StoredIamPasswordResetTicket): void;
  getPasswordResetTicket(realmId: string, ticketId: string): StoredIamPasswordResetTicket | null;
  addEmailVerificationTicket(ticket: StoredIamEmailVerificationTicket): void;
  getEmailVerificationTicket(realmId: string, ticketId: string): StoredIamEmailVerificationTicket | null;
  replacePendingMfaEnrollmentForUser(realmId: string, userId: string, enrollment: StoredPendingIamMfaEnrollment): void;
  getPendingMfaEnrollment(realmId: string, userId: string, enrollmentId: string): StoredPendingIamMfaEnrollment | null;
}
