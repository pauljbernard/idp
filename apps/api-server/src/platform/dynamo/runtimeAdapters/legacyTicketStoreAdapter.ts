import type {
  StoredIamEmailVerificationTicket,
  StoredIamPasswordResetTicket,
  StoredPendingIamMfaEnrollment,
} from '../../iamAuthenticationRuntime';
import type { TicketStoreAdapter } from './ticketStoreAdapter';

interface LegacyTicketStoreAdapterOptions {
  passwordResetTickets: () => StoredIamPasswordResetTicket[];
  emailVerificationTickets: () => StoredIamEmailVerificationTicket[];
  pendingMfaEnrollments: () => StoredPendingIamMfaEnrollment[];
  savePendingMfaEnrollments: (nextState: StoredPendingIamMfaEnrollment[]) => void;
}

export class LegacyTicketStoreAdapter implements TicketStoreAdapter {
  constructor(private readonly options: LegacyTicketStoreAdapterOptions) {}

  addPasswordResetTicket(ticket: StoredIamPasswordResetTicket): void {
    this.options.passwordResetTickets().push(ticket);
  }

  getPasswordResetTicket(realmId: string, ticketId: string): StoredIamPasswordResetTicket | null {
    return this.options.passwordResetTickets().find(
      (candidate) => candidate.id === ticketId && candidate.realm_id === realmId,
    ) ?? null;
  }

  addEmailVerificationTicket(ticket: StoredIamEmailVerificationTicket): void {
    this.options.emailVerificationTickets().push(ticket);
  }

  getEmailVerificationTicket(realmId: string, ticketId: string): StoredIamEmailVerificationTicket | null {
    return this.options.emailVerificationTickets().find(
      (candidate) => candidate.id === ticketId && candidate.realm_id === realmId,
    ) ?? null;
  }

  replacePendingMfaEnrollmentForUser(
    realmId: string,
    userId: string,
    enrollment: StoredPendingIamMfaEnrollment,
  ): void {
    const nextState = this.options.pendingMfaEnrollments().filter(
      (candidate) => !(candidate.realm_id === realmId && candidate.user_id === userId && !candidate.consumed_at),
    );
    nextState.push(enrollment);
    this.options.savePendingMfaEnrollments(nextState);
  }

  getPendingMfaEnrollment(
    realmId: string,
    userId: string,
    enrollmentId: string,
  ): StoredPendingIamMfaEnrollment | null {
    return this.options.pendingMfaEnrollments().find(
      (candidate) => candidate.id === enrollmentId && candidate.realm_id === realmId && candidate.user_id === userId,
    ) ?? null;
  }
}
