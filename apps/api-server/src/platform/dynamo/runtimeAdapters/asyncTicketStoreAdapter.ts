import type {
  StoredIamEmailVerificationTicket,
  StoredIamPasswordResetTicket,
  StoredPendingIamMfaEnrollment,
} from '../../iamAuthenticationRuntime';

export interface AsyncTicketStoreAdapter {
  addPasswordResetTicket(ticket: StoredIamPasswordResetTicket): Promise<void>;
  putPasswordResetTicket(ticket: StoredIamPasswordResetTicket): Promise<void>;
  getPasswordResetTicket(realmId: string, ticketId: string): Promise<StoredIamPasswordResetTicket | null>;
  addEmailVerificationTicket(ticket: StoredIamEmailVerificationTicket): Promise<void>;
  putEmailVerificationTicket(ticket: StoredIamEmailVerificationTicket): Promise<void>;
  getEmailVerificationTicket(realmId: string, ticketId: string): Promise<StoredIamEmailVerificationTicket | null>;
  replacePendingMfaEnrollmentForUser(realmId: string, userId: string, enrollment: StoredPendingIamMfaEnrollment): Promise<void>;
  putPendingMfaEnrollment(enrollment: StoredPendingIamMfaEnrollment): Promise<void>;
  getPendingMfaEnrollment(realmId: string, userId: string, enrollmentId: string): Promise<StoredPendingIamMfaEnrollment | null>;
}
