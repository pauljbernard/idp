import { describe, expect, it, vi } from 'vitest'

import type { RuntimeRepositoryMode } from '../src/platform/dynamo/runtimeRepositoryMode'
import { DualRunAsyncIssuedTokenStoreAdapter } from '../src/platform/dynamo/runtimeAdapters/dualRunAsyncIssuedTokenStoreAdapter'
import { DualRunAsyncLoginTransactionStoreAdapter } from '../src/platform/dynamo/runtimeAdapters/dualRunAsyncLoginTransactionStoreAdapter'
import { DualRunAsyncSessionStoreAdapter } from '../src/platform/dynamo/runtimeAdapters/dualRunAsyncSessionStoreAdapter'
import { DualRunAsyncTicketStoreAdapter } from '../src/platform/dynamo/runtimeAdapters/dualRunAsyncTicketStoreAdapter'

function createMode(overrides: Partial<RuntimeRepositoryMode>): RuntimeRepositoryMode {
  return {
    dualWrite: false,
    readV2: false,
    paritySampleRate: 0,
    ...overrides,
  }
}

describe('runtime async adapter mode policy', () => {
  it('writes login transactions to v2 only during steady-state read-v2 mode', async () => {
    const legacy = { getById: vi.fn(), put: vi.fn().mockResolvedValue(undefined) }
    const v2 = { getById: vi.fn(), put: vi.fn().mockResolvedValue(undefined) }
    const adapter = new DualRunAsyncLoginTransactionStoreAdapter(legacy as any, v2 as any, createMode({ readV2: true }))

    await adapter.put({ id: 'txn-1' } as any)

    expect(legacy.put).not.toHaveBeenCalled()
    expect(v2.put).toHaveBeenCalledTimes(1)
  })

  it('writes sessions to both stores only when dual-write is enabled', async () => {
    const legacy = { getById: vi.fn(), listByUser: vi.fn(), put: vi.fn().mockResolvedValue(undefined) }
    const v2 = { getById: vi.fn(), listByUser: vi.fn(), put: vi.fn().mockResolvedValue(undefined) }
    const adapter = new DualRunAsyncSessionStoreAdapter(
      legacy as any,
      v2 as any,
      createMode({ dualWrite: true, readV2: true }),
    )

    await adapter.put({ id: 'session-1' } as any)

    expect(legacy.put).toHaveBeenCalledTimes(1)
    expect(v2.put).toHaveBeenCalledTimes(1)
  })

  it('writes tickets to legacy only when runtime cutover flags are disabled', async () => {
    const legacy = {
      addPasswordResetTicket: vi.fn().mockResolvedValue(undefined),
      putPasswordResetTicket: vi.fn().mockResolvedValue(undefined),
      getPasswordResetTicket: vi.fn(),
      addEmailVerificationTicket: vi.fn().mockResolvedValue(undefined),
      putEmailVerificationTicket: vi.fn().mockResolvedValue(undefined),
      getEmailVerificationTicket: vi.fn(),
      replacePendingMfaEnrollmentForUser: vi.fn().mockResolvedValue(undefined),
      putPendingMfaEnrollment: vi.fn().mockResolvedValue(undefined),
      getPendingMfaEnrollment: vi.fn(),
    }
    const v2 = {
      addPasswordResetTicket: vi.fn().mockResolvedValue(undefined),
      putPasswordResetTicket: vi.fn().mockResolvedValue(undefined),
      getPasswordResetTicket: vi.fn(),
      addEmailVerificationTicket: vi.fn().mockResolvedValue(undefined),
      putEmailVerificationTicket: vi.fn().mockResolvedValue(undefined),
      getEmailVerificationTicket: vi.fn(),
      replacePendingMfaEnrollmentForUser: vi.fn().mockResolvedValue(undefined),
      putPendingMfaEnrollment: vi.fn().mockResolvedValue(undefined),
      getPendingMfaEnrollment: vi.fn(),
    }
    const adapter = new DualRunAsyncTicketStoreAdapter(legacy as any, v2 as any, createMode({}))

    await adapter.putPendingMfaEnrollment({ id: 'mfa-1' } as any)

    expect(legacy.putPendingMfaEnrollment).toHaveBeenCalledTimes(1)
    expect(v2.putPendingMfaEnrollment).not.toHaveBeenCalled()
  })

  it('writes issued tokens to v2 only during steady-state read-v2 mode', async () => {
    const legacy = {
      getById: vi.fn(),
      getByAccessHash: vi.fn(),
      getByRefreshHash: vi.fn(),
      listActiveIdsBySubject: vi.fn(),
      listActiveIdsByBrowserSession: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined),
    }
    const v2 = {
      getById: vi.fn(),
      getByAccessHash: vi.fn(),
      getByRefreshHash: vi.fn(),
      listActiveIdsBySubject: vi.fn(),
      listActiveIdsByBrowserSession: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined),
    }
    const adapter = new DualRunAsyncIssuedTokenStoreAdapter(legacy as any, v2 as any, createMode({ readV2: true }))

    await adapter.put({ id: 'token-1' } as any)

    expect(legacy.put).not.toHaveBeenCalled()
    expect(v2.put).toHaveBeenCalledTimes(1)
  })
})
