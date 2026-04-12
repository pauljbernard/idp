export function encodeCursor(value: Record<string, unknown> | undefined): string | null {
  if (!value) {
    return null;
  }
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

export function decodeCursor(cursor?: string | null): Record<string, unknown> | undefined {
  if (!cursor) {
    return undefined;
  }
  return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Record<string, unknown>;
}

export function toEpochSeconds(isoTimestamp: string): number {
  return Math.floor(Date.parse(isoTimestamp) / 1000);
}

export const runtimeKeys = {
  session(sessionId: string): { pk: string; sk: string } {
    return {
      pk: `SESSION#${sessionId}`,
      sk: 'SESSION',
    };
  },

  loginTransaction(transactionId: string): { pk: string; sk: string } {
    return {
      pk: `TICKET#${transactionId}`,
      sk: 'LOGINTRANSACTION',
    };
  },

  passwordResetTicket(ticketId: string): { pk: string; sk: string } {
    return {
      pk: `TICKET#${ticketId}`,
      sk: 'PASSWORDRESET',
    };
  },

  emailVerificationTicket(ticketId: string): { pk: string; sk: string } {
    return {
      pk: `TICKET#${ticketId}`,
      sk: 'EMAILVERIFICATION',
    };
  },

  pendingMfaEnrollment(enrollmentId: string): { pk: string; sk: string } {
    return {
      pk: `TICKET#${enrollmentId}`,
      sk: 'PENDINGMFA',
    };
  },

  token(tokenId: string): { pk: string; sk: string } {
    return {
      pk: `TOKEN#${tokenId}`,
      sk: 'TOKEN',
    };
  },

  tokensBySubject(
    subjectKind: string,
    subjectId: string,
    issuedAt: string,
    tokenId: string,
  ): { gsi1pk: string; gsi1sk: string } {
    return {
      gsi1pk: `SUBJECT#${subjectKind}#${subjectId}`,
      gsi1sk: `TOKEN#${issuedAt}#${tokenId}`,
    };
  },

  tokensByBrowserSession(
    browserSessionId: string,
    issuedAt: string,
    tokenId: string,
  ): { gsi2pk: string; gsi2sk: string } {
    return {
      gsi2pk: `BROWSERSESSION#${browserSessionId}`,
      gsi2sk: `TOKEN#${issuedAt}#${tokenId}`,
    };
  },

  tokenLookup(
    realmId: string,
    tokenHash: string,
    tokenUse: 'access_token' | 'refresh_token',
  ): { pk: string; sk: string } {
    return {
      pk: `TOKENLOOKUP#${realmId}#${tokenHash}`,
      sk: tokenUse.toUpperCase(),
    };
  },

  sessionsByUser(userId: string, issuedAt: string, sessionId: string): { gsi1pk: string; gsi1sk: string } {
    return {
      gsi1pk: `USER#${userId}`,
      gsi1sk: `SESSION#${issuedAt}#${sessionId}`,
    };
  },

  ticketsByUser(userId: string, issuedAt: string, ticketKind: string, ticketId: string): { gsi1pk: string; gsi1sk: string } {
    return {
      gsi1pk: `USER#${userId}`,
      gsi1sk: `${ticketKind}#${issuedAt}#${ticketId}`,
    };
  },

  loginTransactionsByUser(userId: string, createdAt: string, transactionId: string): { gsi1pk: string; gsi1sk: string } {
    return {
      gsi1pk: `USER#${userId}`,
      gsi1sk: `LOGINTRANSACTION#${createdAt}#${transactionId}`,
    };
  },
};
