import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('realm attribute runtime', () => {
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

  it('creates, updates, deletes, and lists realm attributes with normalized keys', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-realm-attributes-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { LocalIamFoundationStore } = await import('../src/platform/iamFoundation')

    const created = LocalIamFoundationStore.createRealmAttribute('idp-super-admin', 'realm-crew-validation', {
      key: ' login.signup_url ',
      value: ' https://crew.example.test/register ',
    })

    expect(created.key).toBe('login.signup_url')
    expect(created.value).toBe('https://crew.example.test/register')

    const listed = LocalIamFoundationStore.listRealmAttributes('realm-crew-validation')
    expect(listed.count).toBeGreaterThan(0)
    expect(listed.attributes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'login.signup_url',
        value: 'https://crew.example.test/register',
      }),
    ]))

    const updated = LocalIamFoundationStore.updateRealmAttribute(
      'realm-crew-ops-admin',
      'realm-crew-validation',
      'LOGIN.SIGNUP_URL',
      {
        value: 'https://crew.example.test/self-service/register',
      },
    )

    expect(updated.key).toBe('login.signup_url')
    expect(updated.value).toBe('https://crew.example.test/self-service/register')
    expect(updated.updated_by_user_id).toBe('realm-crew-ops-admin')

    LocalIamFoundationStore.deleteRealmAttribute('realm-crew-ops-admin', 'realm-crew-validation', 'login.signup_url')

    expect(LocalIamFoundationStore.listRealmAttributes('realm-crew-validation').attributes).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'login.signup_url' }),
      ]),
    )
  })

  it('projects login signup url into public realm experience from the same realm attribute authority', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-realm-experience-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { LocalIamFoundationStore } = await import('../src/platform/iamFoundation')
    const { LocalIamExperienceRuntimeStore } = await import('../src/platform/iamExperienceRuntime')

    LocalIamFoundationStore.createRealmAttribute('idp-super-admin', 'realm-crew-validation', {
      key: 'login.signup_url',
      value: 'https://crew.example.test/register',
    })

    const experience = LocalIamExperienceRuntimeStore.getRealmExperience('realm-crew-validation')

    expect(experience.public_links.signup_url).toBe('https://crew.example.test/register')
  })

  it('clones realm attributes when a realm is created from an existing realm template source', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-realm-clone-attributes-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { LocalIamFoundationStore } = await import('../src/platform/iamFoundation')

    LocalIamFoundationStore.createRealmAttribute('idp-super-admin', 'realm-crew-validation', {
      key: 'login.signup_url',
      value: 'https://crew.example.test/register',
    })

    const clonedRealm = LocalIamFoundationStore.createRealm('idp-super-admin', {
      name: 'Crew Validation Clone',
      summary: 'Clone used to verify realm attribute carry-over.',
      scope_kind: 'TENANT_OVERRIDE',
      status: 'ACTIVE',
      clone_from_realm_id: 'realm-crew-validation',
    })

    const clonedAttributes = LocalIamFoundationStore.listRealmAttributes(clonedRealm.id)

    expect(clonedAttributes.attributes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'login.signup_url',
        value: 'https://crew.example.test/register',
      }),
    ]))
  })
})
