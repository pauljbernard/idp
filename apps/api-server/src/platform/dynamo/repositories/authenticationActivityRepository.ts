import type {
  StoredIamAccountSecurityState,
  StoredIamLoginAttempt,
  StoredIamUserLockoutState,
} from '../../iamAuthenticationRuntime';

export interface AuthenticationActivityRepository {
  getAccountSecurityState(realmId: string, userId: string): Promise<StoredIamAccountSecurityState | null>;
  putAccountSecurityState(record: StoredIamAccountSecurityState): Promise<void>;
  getUserLockoutState(realmId: string, userId: string): Promise<StoredIamUserLockoutState | null>;
  putUserLockoutState(record: StoredIamUserLockoutState): Promise<void>;
  putLoginAttempt(record: StoredIamLoginAttempt): Promise<void>;
  listLoginAttemptsByUser(realmId: string, userId: string, limit?: number): Promise<StoredIamLoginAttempt[]>;
}
