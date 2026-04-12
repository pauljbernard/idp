import type {
  StoredIamEmailVerificationTicket,
  StoredIamPasswordResetTicket,
  StoredPendingIamMfaEnrollment,
} from '../../iamAuthenticationRuntime';
import type { AsyncTicketStoreAdapter } from './asyncTicketStoreAdapter';

interface LegacyAsyncTicketStoreAdapterOptions {
  loadPasswordResetTickets: () => Promise<StoredIamPasswordResetTicket[]>;
  savePasswordResetTickets: (nextState: StoredIamPasswordResetTicket[]) => Promise<void>;
  loadEmailVerificationTickets: () => Promise<StoredIamEmailVerificationTicket[]>;
  saveEmailVerificationTickets: (nextState: StoredIamEmailVerificationTicket[]) => Promise<void>;
  loadPendingMfaEnrollments: () => Promise<StoredPendingIamMfaEnrollment[]>;
  savePendingMfaEnrollments: (nextState: StoredPendingIamMfaEnrollment[]) => Promise<void>;
}

export class LegacyAsyncTicketStoreAdapter implements AsyncTicketStoreAdapter {
  constructor(private readonly options: LegacyAsyncTicketStoreAdapterOptions) {}

  async addPasswordResetTicket(ticket: StoredIamPasswordResetTicket): Promise<void> {
    await this.putPasswordResetTicket(ticket);
  }

  async putPasswordResetTicket(ticket: StoredIamPasswordResetTicket): Promise<void> {
    const nextState = await this.options.loadPasswordResetTickets();
    const index = nextState.findIndex(
      (candidate) => candidate.id === ticket.id && candidate.realm_id === ticket.realm_id,
    );
    if (index >= 0) {
      nextState[index] = ticket;
    } else {
      nextState.push(ticket);
    }
    await this.options.savePasswordResetTickets(nextState);
  }

  async getPasswordResetTicket(realmId: string, ticketId: string): Promise<StoredIamPasswordResetTicket | null> {
    const state = await this.options.loadPasswordResetTickets();
    return state.find((candidate) => candidate.id === ticketId && candidate.realm_id === realmId) ?? null;
  }

  async addEmailVerificationTicket(ticket: StoredIamEmailVerificationTicket): Promise<void> {
    await this.putEmailVerificationTicket(ticket);
  }

  async putEmailVerificationTicket(ticket: StoredIamEmailVerificationTicket): Promise<void> {
    const nextState = await this.options.loadEmailVerificationTickets();
    const index = nextState.findIndex(
      (candidate) => candidate.id === ticket.id && candidate.realm_id === ticket.realm_id,
    );
    if (index >= 0) {
      nextState[index] = ticket;
    } else {
      nextState.push(ticket);
    }
    await this.options.saveEmailVerificationTickets(nextState);
  }

  async getEmailVerificationTicket(
    realmId: string,
    ticketId: string,
  ): Promise<StoredIamEmailVerificationTicket | null> {
    const state = await this.options.loadEmailVerificationTickets();
    return state.find((candidate) => candidate.id === ticketId && candidate.realm_id === realmId) ?? null;
  }

  async replacePendingMfaEnrollmentForUser(
    realmId: string,
    userId: string,
    enrollment: StoredPendingIamMfaEnrollment,
  ): Promise<void> {
    const nextState = (await this.options.loadPendingMfaEnrollments()).filter(
      (candidate) => !(candidate.realm_id === realmId && candidate.user_id === userId && !candidate.consumed_at),
    );
    nextState.push(enrollment);
    await this.options.savePendingMfaEnrollments(nextState);
  }

  async putPendingMfaEnrollment(enrollment: StoredPendingIamMfaEnrollment): Promise<void> {
    const nextState = await this.options.loadPendingMfaEnrollments();
    const index = nextState.findIndex(
      (candidate) => candidate.id === enrollment.id && candidate.realm_id === enrollment.realm_id,
    );
    if (index >= 0) {
      nextState[index] = enrollment;
    } else {
      nextState.push(enrollment);
    }
    await this.options.savePendingMfaEnrollments(nextState);
  }

  async getPendingMfaEnrollment(
    realmId: string,
    userId: string,
    enrollmentId: string,
  ): Promise<StoredPendingIamMfaEnrollment | null> {
    const state = await this.options.loadPendingMfaEnrollments();
    return state.find(
      (candidate) => candidate.id === enrollmentId && candidate.realm_id === realmId && candidate.user_id === userId,
    ) ?? null;
  }
}
