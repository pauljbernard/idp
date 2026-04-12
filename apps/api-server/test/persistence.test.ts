import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('persistence reload behavior', () => {
  let stateRoot: string | null = null

  afterEach(() => {
    delete process.env.IDP_PLATFORM_STATE_ROOT
    delete process.env.IDP_PLATFORM_DURABLE_ROOT
    delete process.env.IDP_PLATFORM_PERSISTENCE_BACKEND
    vi.resetModules()
    if (stateRoot) {
      rmSync(stateRoot, { recursive: true, force: true })
      stateRoot = null
    }
  })

  it('reloadOrCreatePersistedStateAsync bypasses stale in-process cache', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-persistence-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const persistence = await import('../src/platform/persistence')

    const seeded = await persistence.loadOrCreatePersistedStateAsync('sample-state.json', () => ({ value: 'seed' }))
    expect(seeded).toEqual({ value: 'seed' })

    const filePath = persistence.getPersistedStatePath('sample-state.json')
    writeFileSync(filePath, JSON.stringify({
      version: 1,
      saved_at: new Date().toISOString(),
      state: { value: 'external' },
    }), 'utf8')

    const staleCached = await persistence.loadOrCreatePersistedStateAsync('sample-state.json', () => ({ value: 'ignored' }))
    expect(staleCached).toEqual({ value: 'seed' })

    const reloaded = await persistence.reloadOrCreatePersistedStateAsync('sample-state.json', () => ({ value: 'ignored' }))
    expect(reloaded).toEqual({ value: 'external' })
  })
})
