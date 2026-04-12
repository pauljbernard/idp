import { EventEmitter } from 'events'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import os from 'os'
import path from 'path'
import { Readable } from 'stream'
import { afterEach, describe, expect, it, vi } from 'vitest'

const managedEnvKeys = [
  'IDP_API_BASE_URL',
  'IDP_UI_BASE_URL',
  'IDP_GLOBAL_RATE_LIMIT_RPM',
  'IDP_RATE_LIMIT_WINDOW_MS',
  'IDP_RATE_LIMIT_BLOCK_MS',
  'IDP_TRUST_PROXY',
  'IDP_PLATFORM_STATE_ROOT',
  'IDP_PLATFORM_DURABLE_ROOT',
  'IDP_PLATFORM_PERSISTENCE_BACKEND',
  'IDP_DDB_RUNTIME_DUAL_WRITE',
  'IDP_DDB_RUNTIME_READ_V2',
  'IDP_DDB_RUNTIME_PARITY_SAMPLE_RATE',
  'IDP_IAM_RUNTIME_DDB_TABLE',
  'IDP_RUNTIME_DYNAMODB_TABLE',
  'AWS_REGION',
  'AWS_DEFAULT_REGION',
  'IDP_DYNAMODB_ENDPOINT',
  'AWS_DYNAMODB_ENDPOINT',
  'AWS_ENDPOINT',
  'IDP_LOCAL_SECRET_KEY',
  'IDP_SECRET_KEY',
] as const

const originalEnv = Object.fromEntries(
  managedEnvKeys.map((key) => [key, process.env[key]]),
) as Record<(typeof managedEnvKeys)[number], string | undefined>

let stateRoot: string | null = null

async function loadApp(env: Record<string, string | undefined>) {
  stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-server-http-surface-'))
  env = {
    ...env,
    IDP_PLATFORM_STATE_ROOT: stateRoot,
    IDP_PLATFORM_DURABLE_ROOT: path.join(stateRoot, 'durable'),
    IDP_PLATFORM_PERSISTENCE_BACKEND: 'filesystem',
  }
  for (const key of managedEnvKeys) {
    if (env[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = env[key]
    }
  }

  vi.resetModules()
  return (await import('../src/server')).app
}

async function invokeRequest(
  app: Awaited<ReturnType<typeof loadApp>>,
  method: string,
  url: string,
  options?: {
    headers?: Record<string, string>
    remoteAddress?: string
    body?: string
  },
) {
  const remoteAddress = options?.remoteAddress ?? '127.0.0.1'

  return await new Promise<{
    statusCode: number
    headers: Record<string, string>
    body: string
  }>((resolve, reject) => {
    const requestBody = options?.body ?? ''
    const request = Object.assign(Readable.from(requestBody ? [Buffer.from(requestBody)] : []), {
      method,
      url,
      originalUrl: url,
      headers: Object.fromEntries(
        Object.entries({
          ...(requestBody ? { 'Content-Length': String(Buffer.byteLength(requestBody)) } : {}),
          ...(options?.headers ?? {}),
        }).map(([key, value]) => [key.toLowerCase(), value]),
      ),
      socket: {
        remoteAddress,
        encrypted: false,
        setTimeout: () => undefined,
        destroy: () => undefined,
      },
      connection: {
        remoteAddress,
        encrypted: false,
        setTimeout: () => undefined,
        destroy: () => undefined,
      },
      httpVersionMajor: 1,
      httpVersionMinor: 1,
      setTimeout() {
        return this
      },
    })

    const responseHeaders: Record<string, string> = {}
    const chunks: Buffer[] = []
    const response = Object.assign(new EventEmitter(), {
      statusCode: 200,
      locals: {},
      headersSent: false,
      finished: false,
      socket: {
        setTimeout: () => undefined,
        destroy: () => undefined,
      },
      setHeader(name: string, value: string | number | readonly string[]) {
        responseHeaders[name.toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value)
      },
      getHeader(name: string) {
        return responseHeaders[name.toLowerCase()]
      },
      removeHeader(name: string) {
        delete responseHeaders[name.toLowerCase()]
      },
      getHeaders() {
        return { ...responseHeaders }
      },
      writeHead(
        statusCode: number,
        statusMessageOrHeaders?: string | Record<string, string>,
        maybeHeaders?: Record<string, string>,
      ) {
        this.statusCode = statusCode
        const headers = typeof statusMessageOrHeaders === 'object'
          ? statusMessageOrHeaders
          : maybeHeaders
        if (headers) {
          for (const [key, value] of Object.entries(headers)) {
            this.setHeader(key, value)
          }
        }
        this.headersSent = true
        return this
      },
      write(chunk?: string | Buffer) {
        if (chunk !== undefined) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        }
        this.headersSent = true
        return true
      },
      end(chunk?: string | Buffer) {
        if (chunk !== undefined) {
          this.write(chunk)
        }
        this.headersSent = true
        this.finished = true
        this.emit('finish')
        resolve({
          statusCode: this.statusCode,
          headers: { ...responseHeaders },
          body: Buffer.concat(chunks).toString('utf8'),
        })
        return this
      },
      setTimeout() {
        return this
      },
      destroy() {
        this.finished = true
      },
    })

    ;(request as any).res = response
    ;(response as any).req = request

    ;(app as any).handle(request as any, response as any, (error: unknown) => {
      if (error) {
        reject(error)
        return
      }

      if (!response.finished) {
        response.end()
      }
    })
  })
}

async function invokeGet(
  app: Awaited<ReturnType<typeof loadApp>>,
  url: string,
  options?: {
    headers?: Record<string, string>
    remoteAddress?: string
  },
) {
  return invokeRequest(app, 'GET', url, options)
}

async function invokePost(
  app: Awaited<ReturnType<typeof loadApp>>,
  url: string,
  body: Record<string, unknown>,
  options?: {
    headers?: Record<string, string>
    remoteAddress?: string
  },
) {
  return invokeRequest(app, 'POST', url, {
    ...options,
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })
}

function rewriteEnvelopeState<T>(filePath: string, mutate: (state: T) => void) {
  const envelope = JSON.parse(readFileSync(filePath, 'utf8')) as {
    version: number
    saved_at: string
    state: T
  }
  mutate(envelope.state)
  envelope.saved_at = new Date().toISOString()
  writeFileSync(filePath, JSON.stringify(envelope), 'utf8')
}

afterEach(() => {
  if (stateRoot) {
    rmSync(stateRoot, { recursive: true, force: true })
    stateRoot = null
  }

  for (const key of managedEnvKeys) {
    if (originalEnv[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = originalEnv[key]
    }
  }

  vi.resetModules()
})

describe('server HTTP surface', () => {
  it('publishes merged OpenAPI docs and serves Swagger UI for browser requests', async () => {
    const app = await loadApp({
      IDP_API_BASE_URL: 'https://identity.example.com',
      IDP_UI_BASE_URL: 'https://console.example.com',
    })

    const openApiResponse = await invokeGet(app, '/openapi.json')
    const docsJsonResponse = await invokeGet(app, '/docs/index.json')
    const docsHtmlResponse = await invokeGet(app, '/docs', {
      headers: {
        Accept: 'text/html',
      },
    })

    const openApiBody = JSON.parse(openApiResponse.body) as Record<string, any>
    const docsJsonBody = JSON.parse(docsJsonResponse.body) as Record<string, any>

    expect(openApiResponse.statusCode).toBe(200)
    expect(openApiBody.openapi).toBe('3.1.0')
    expect(openApiBody.servers).toEqual([
      {
        url: 'https://identity.example.com',
        description: 'Local development server',
      },
    ])
    expect(openApiBody.paths['/api/v1/auth/login']).toBeTruthy()

    expect(docsJsonResponse.statusCode).toBe(200)
    expect(docsJsonBody.contract_count).toBe(54)
    expect(docsJsonBody.path_count).toBe(209)
    expect(docsJsonBody.operation_count).toBe(249)
    expect(docsJsonBody.documentation_complete).toBe(true)
    expect(docsJsonBody.openapi_url).toBe('https://identity.example.com/openapi.json')
    expect(docsJsonBody.swagger_ui_url).toBe('https://identity.example.com/docs')

    expect(docsHtmlResponse.statusCode).toBe(200)
    expect(docsHtmlResponse.headers['content-type']).toContain('text/html')
    expect(docsHtmlResponse.headers['content-security-policy']).toContain("script-src 'self' https: 'unsafe-inline'")
    expect(docsHtmlResponse.body).toContain('SwaggerUIBundle')
    expect(docsHtmlResponse.body).toContain("url: '/openapi.json'")
  })

  it('uses the configured API base URL for discovery metadata even when forwarded headers are spoofed', async () => {
    const app = await loadApp({
      IDP_API_BASE_URL: 'https://identity.example.com',
      IDP_UI_BASE_URL: 'https://console.example.com',
    })

    const response = await invokeGet(
      app,
      '/api/v1/iam/realms/realm-idp-default/.well-known/openid-configuration',
      {
        headers: {
          Host: 'evil.example.test',
          'X-Forwarded-Host': 'evil.example.test',
          'X-Forwarded-Proto': 'https',
        },
      },
    )
    const body = JSON.parse(response.body) as Record<string, string>

    expect(response.statusCode).toBe(200)
    expect(body.issuer).toBe('https://identity.example.com/api/v1/iam/realms/realm-idp-default')
    expect(body.authorization_endpoint).toBe(
      'https://identity.example.com/api/v1/iam/realms/realm-idp-default/protocol/openid-connect/auth',
    )
    expect(body.authorization_endpoint).not.toContain('evil.example.test')
  })

  it('publishes the legacy IAM auth config contract for browser bootstrap automation', async () => {
    const app = await loadApp({})

    const response = await invokeGet(app, '/api/v1/auth/iam/config')
    const body = JSON.parse(response.body) as Record<string, any>

    expect(response.statusCode).toBe(200)
    expect(body.client_id).toBe('admin-console-demo')
    expect(body.realm_id).toBe('realm-idp-default')
    expect(typeof body.realm_name).toBe('string')
    expect(body.realm_name.length).toBeGreaterThan(0)
    expect(body.binding_id).toBe('binding-application-idp-admin-console')
    expect(body.binding_mode).toBe('DIRECT')
    expect(body.fallback_binding_used).toBe(false)
    expect(body.authorization_profile_id).toBe('idp-enterprise-admin-console')
    expect(body.authorization_projection_mode).toBe('APPLICATION_BINDING_CLAIM_MAPPING')
    expect(body.tenant_membership_strategy).toBe(
      'PLATFORM_ADMIN_ALL_TENANTS_OR_EXPLICIT_IDENTITY_MEMBERSHIP_WITH_LOCAL_USER_FALLBACK',
    )
    expect(body.managed_role_assignment_candidates).toEqual({
      admin: ['admin'],
      operator: ['operator'],
      pilot: ['pilot', 'specialist'],
      viewer: ['viewer'],
    })
    expect(body.notes).toContain('Standalone application-owned identity integration configuration.')
    expect(typeof body.timestamp).toBe('string')
  })

  it('surfaces runtime cutover fallback status through the IAM operations health endpoint', async () => {
    const app = await loadApp({
      IDP_DDB_RUNTIME_DUAL_WRITE: 'true',
    })

    const {
      IAM_DEFAULT_REALM_ID,
      IAM_SUPER_ADMIN_USER_ID,
    } = await import('../src/platform/iamIdentifiers')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const tokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'admin-console-demo',
      subject_kind: 'USER',
      subject_id: IAM_SUPER_ADMIN_USER_ID,
      requested_scope_names: ['openid', 'profile', 'email', 'iam.manage'],
      base_url: 'https://idp.local',
      grant_type: 'authorization_code',
      include_refresh_token: false,
    })

    const response = await invokeGet(app, '/api/v1/iam/operations/health', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    const body = JSON.parse(response.body) as {
      overall_status: string
      checks: Array<{ id: string; status: string; summary: string }>
      advisories: string[]
    }
    const runtimeCutoverCheck = body.checks.find((check) => check.id === 'runtime-cutover-readiness')

    expect(response.statusCode).toBe(200)
    expect(runtimeCutoverCheck).toBeTruthy()
    expect(runtimeCutoverCheck?.status).toBe('FAIL')
    expect(runtimeCutoverCheck?.summary).toContain('noop fallback')
    expect(runtimeCutoverCheck?.summary).toContain('issued_tokens=NOOP_FALLBACK')
    expect(body.advisories).toContain(runtimeCutoverCheck?.summary)
    expect(body.overall_status).toBe('FAILED')
  })

  it('publishes authenticated IAM support profiles with current support decisions', async () => {
    const app = await loadApp({})

    const {
      IAM_DEFAULT_REALM_ID,
      IAM_SUPER_ADMIN_USER_ID,
    } = await import('../src/platform/iamIdentifiers')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const tokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'admin-console-demo',
      subject_kind: 'USER',
      subject_id: IAM_SUPER_ADMIN_USER_ID,
      requested_scope_names: ['openid', 'profile', 'email', 'iam.read'],
      base_url: 'https://idp.local',
      grant_type: 'authorization_code',
      include_refresh_token: false,
    })

    const response = await invokeGet(app, '/api/v1/iam/support-profiles', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    const body = JSON.parse(response.body) as {
      profile_count: number
      profiles: Array<{ id: string; support_decision: string }>
    }

    expect(response.statusCode).toBe(200)
    expect(body.profile_count).toBeGreaterThan(0)
    expect(body.profiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'passkeys-webauthn',
          support_decision: 'IMPLEMENTED_NOT_SUPPORTED',
        }),
        expect.objectContaining({
          id: 'saml-idp-lifecycle',
          support_decision: 'IMPLEMENTED_NOT_SUPPORTED',
        }),
        expect.objectContaining({
          id: 'dpop',
          support_decision: 'DEFERRED',
        }),
      ]),
    )
  })

  it('publishes recovery drill lineage evidence through the recovery operations API', async () => {
    const app = await loadApp({
      IDP_LOCAL_SECRET_KEY: 'test-server-http-recovery-lineage-key',
    })

    const {
      IAM_DEFAULT_REALM_ID,
      IAM_SUPER_ADMIN_USER_ID,
    } = await import('../src/platform/iamIdentifiers')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')

    const olderBackup = await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SUPER_ADMIN_USER_ID, {
      label: 'older recovery backup',
    })
    await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SUPER_ADMIN_USER_ID, {
      label: 'latest recovery backup',
    })

    const tokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'admin-console-demo',
      subject_kind: 'USER',
      subject_id: IAM_SUPER_ADMIN_USER_ID,
      requested_scope_names: ['openid', 'profile', 'email', 'iam.manage'],
      base_url: 'https://idp.local',
      grant_type: 'authorization_code',
      include_refresh_token: false,
    })

    const drillResponse = await invokePost(
      app,
      '/api/v1/iam/operations/recovery/drills',
      { backup_id: olderBackup.id },
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      },
    )

    const drillBody = JSON.parse(drillResponse.body) as {
      status: string
      backup_lineage_validated: boolean
      latest_backup_at_execution: boolean
      notes: string[]
    }

    expect(drillResponse.statusCode).toBe(201)
    expect(drillBody.status).toBe('WARN')
    expect(drillBody.backup_lineage_validated).toBe(true)
    expect(drillBody.latest_backup_at_execution).toBe(false)
    expect(drillBody.notes).toContain(
      'Recovery drill targeted an older backup artifact; rerun the drill against the latest backup to satisfy readiness evidence.',
    )

    const recoveryResponse = await invokeGet(app, '/api/v1/iam/operations/recovery', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    const recoveryBody = JSON.parse(recoveryResponse.body) as {
      latest_drill: null | {
        status: string
        backup_lineage_validated: boolean
        latest_backup_at_execution: boolean
      }
    }

    expect(recoveryResponse.statusCode).toBe(200)
    expect(recoveryBody.latest_drill?.status).toBe('WARN')
    expect(recoveryBody.latest_drill?.backup_lineage_validated).toBe(true)
    expect(recoveryBody.latest_drill?.latest_backup_at_execution).toBe(false)
  })

  it('publishes recovery-driven readiness blockers through the readiness-review HTTP surface', async () => {
    const app = await loadApp({
      IDP_LOCAL_SECRET_KEY: 'test-server-http-readiness-recovery-key',
    })

    const {
      IAM_DEFAULT_REALM_ID,
      IAM_SUPER_ADMIN_USER_ID,
    } = await import('../src/platform/iamIdentifiers')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')
    const { LocalIamRecoveryRuntimeStore } = await import('../src/platform/iamRecoveryRuntime')

    const olderBackup = await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SUPER_ADMIN_USER_ID, {
      label: 'older readiness backup',
    })
    await LocalIamOperationsRuntimeStore.restoreBackupAsync(IAM_SUPER_ADMIN_USER_ID, olderBackup.id, 'DRY_RUN')
    await LocalIamOperationsRuntimeStore.rotateSigningKeyAsync(IAM_SUPER_ADMIN_USER_ID, null)
    await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SUPER_ADMIN_USER_ID, {
      label: 'latest readiness backup',
    })
    await LocalIamRecoveryRuntimeStore.runRecoveryDrillAsync(IAM_SUPER_ADMIN_USER_ID, {
      backup_id: olderBackup.id,
    })

    const tokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'admin-console-demo',
      subject_kind: 'USER',
      subject_id: IAM_SUPER_ADMIN_USER_ID,
      requested_scope_names: ['openid', 'profile', 'email', 'iam.manage'],
      base_url: 'https://idp.local',
      grant_type: 'authorization_code',
      include_refresh_token: false,
    })

    const response = await invokePost(
      app,
      '/api/v1/iam/operations/readiness-review',
      { notes: ['http recovery readiness validation'] },
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      },
    )

    const body = JSON.parse(response.body) as {
      decision: string
      checks: Array<{ id: string; status: string; summary: string }>
    }
    const recoveryCheck = body.checks.find((check) => check.id === 'recovery-drill-lineage')

    expect(response.statusCode).toBe(201)
    expect(body.decision).toBe('BLOCKED')
    expect(recoveryCheck).toBeTruthy()
    expect(recoveryCheck?.status).toBe('WARN')
    expect(recoveryCheck?.summary).toContain('did not target the latest backup artifact')
  })

  it('publishes authenticated passkey and SAML support matrices', async () => {
    const app = await loadApp({})

    const {
      IAM_DEFAULT_REALM_ID,
      IAM_SUPER_ADMIN_USER_ID,
    } = await import('../src/platform/iamIdentifiers')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')

    const tokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'admin-console-demo',
      subject_kind: 'USER',
      subject_id: IAM_SUPER_ADMIN_USER_ID,
      requested_scope_names: ['openid', 'profile', 'email', 'iam.read'],
      base_url: 'https://idp.local',
      grant_type: 'authorization_code',
      include_refresh_token: false,
    })

    const headers = {
      Authorization: `Bearer ${tokens.access_token}`,
    }

    const passkeyResponse = await invokeGet(app, '/api/v1/iam/webauthn/support-matrix', { headers })
    const samlResponse = await invokeGet(app, '/api/v1/iam/saml/support-matrix', { headers })

    const passkeyBody = JSON.parse(passkeyResponse.body) as {
      overall_support_decision: string
      rows: Array<{ id: string; current_maturity: string }>
    }
    const samlBody = JSON.parse(samlResponse.body) as {
      overall_support_decision: string
      rows: Array<{ id: string; current_maturity: string }>
    }

    expect(passkeyResponse.statusCode).toBe(200)
    expect(passkeyBody.overall_support_decision).toBe('IMPLEMENTED_NOT_SUPPORTED')
    expect(passkeyBody.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'passkey-browser-interoperability',
          current_maturity: 'MODELED',
        }),
      ]),
    )

    expect(samlResponse.statusCode).toBe(200)
    expect(samlBody.overall_support_decision).toBe('IMPLEMENTED_NOT_SUPPORTED')
    expect(samlBody.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'saml-supported-sp-profile-definition',
          current_maturity: 'MODELED',
        }),
      ]),
    )
  })

  it('accepts governance-bound trusted broker assertions through the HTTP surface', async () => {
    const app = await loadApp({})

    const {
      IAM_DEFAULT_REALM_ID,
      IAM_SUPER_ADMIN_USER_ID,
      IAM_SYSTEM_USER_ID,
    } = await import('../src/platform/iamIdentifiers')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')
    const { LocalIamFederationRuntimeStore } = await import('../src/platform/iamFederationRuntime')

    await LocalIamFederationRuntimeStore.createIdentityProviderAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      alias: 'http-trusted-runtime-broker',
      name: 'HTTP Trusted Runtime Broker',
      protocol: 'OIDC',
      link_policy: 'AUTO_CREATE',
      profile_source_mode: 'TRUSTED_ASSERTION',
      trust_store_id: 'trust-store-institutional-oidc',
      mapping_profile_id: 'mapping-profile-institutional-oidc',
      issuer_url: 'https://login.partner.example/realms/workforce',
      trusted_email_domains: ['partner.example'],
    })

    const tokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'admin-console-demo',
      subject_kind: 'USER',
      subject_id: IAM_SUPER_ADMIN_USER_ID,
      requested_scope_names: ['openid', 'profile', 'email', 'iam.manage'],
      base_url: 'https://idp.local',
      grant_type: 'authorization_code',
      include_refresh_token: false,
    })

    const response = await invokePost(
      app,
      `/api/v1/iam/realms/${IAM_DEFAULT_REALM_ID}/brokers/http-trusted-runtime-broker/login`,
      {
        external_username_or_email: 'ignored-when-runtime-asserted',
        scope: ['openid', 'profile', 'email'],
        external_identity: {
          subject: 'placeholder-subject',
          username: 'placeholder-user',
          email: 'placeholder@partner.example',
          first_name: 'Placeholder',
          last_name: 'Placeholder',
          issuer_url: 'https://login.partner.example/realms/workforce',
          raw_attributes: {
            sub: 'partner-http-0001',
            email: 'riley.partner@partner.example',
            preferred_username: 'riley.partner',
            given_name: 'Riley',
            family_name: 'Partner',
          },
          scopes: ['openid', 'profile', 'email'],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      },
    )

    const body = JSON.parse(response.body) as {
      next_step: string
      session_id: string | null
      user: { email: string }
    }

    expect(response.statusCode).toBe(200)
    expect(body.next_step).toBe('AUTHENTICATED')
    expect(body.session_id).toBeTruthy()
    expect(body.user.email).toBe('riley.partner@partner.example')
  })

  it('accepts governance-bound trusted federation sync assertions through the HTTP surface', async () => {
    const app = await loadApp({})

    const {
      IAM_DEFAULT_REALM_ID,
      IAM_SUPER_ADMIN_USER_ID,
      IAM_SYSTEM_USER_ID,
    } = await import('../src/platform/iamIdentifiers')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')
    const { LocalIamFederationRuntimeStore } = await import('../src/platform/iamFederationRuntime')

    const provider = await LocalIamFederationRuntimeStore.createUserFederationProviderAsync(IAM_SYSTEM_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      name: 'HTTP Trusted Runtime LDAP',
      kind: 'LDAP',
      import_strategy: 'IMPORT',
      source_mode: 'TRUSTED_ASSERTION',
      trust_store_id: 'trust-store-institutional-oidc',
      mapping_profile_id: 'mapping-profile-institutional-oidc',
      issuer_url: 'ldaps://directory.partner.example/ou=People,dc=partner,dc=example',
      trusted_email_domains: ['partner.example'],
    })

    const tokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: IAM_DEFAULT_REALM_ID,
      client_id: 'admin-console-demo',
      subject_kind: 'USER',
      subject_id: IAM_SUPER_ADMIN_USER_ID,
      requested_scope_names: ['openid', 'profile', 'email', 'iam.manage'],
      base_url: 'https://idp.local',
      grant_type: 'authorization_code',
      include_refresh_token: false,
    })

    const response = await invokePost(
      app,
      `/api/v1/iam/user-federation/providers/${provider.id}/sync`,
      {
        external_identities: [
          {
            subject: 'placeholder-subject',
            username: 'placeholder-user',
            email: 'placeholder@partner.example',
            first_name: 'Placeholder',
            last_name: 'Placeholder',
            issuer_url: 'ldaps://directory.partner.example/ou=People,dc=partner,dc=example',
            raw_attributes: {
              sub: 'ldap-http-0001',
              email: 'quinn.directory@partner.example',
              preferred_username: 'quinn.directory',
              given_name: 'Quinn',
              family_name: 'Directory',
            },
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      },
    )

    const body = JSON.parse(response.body) as {
      status: string
      imported_count: number
      linked_count: number
    }

    expect(response.statusCode).toBe(201)
    expect(body.status).toBe('COMPLETED')
    expect(body.imported_count).toBe(1)
    expect(body.linked_count).toBe(1)
  })

  it('accepts governance-bound trusted SAML broker assertions through the HTTP surface', async () => {
    const app = await loadApp({})

    const {
      IAM_SYSTEM_USER_ID,
    } = await import('../src/platform/iamIdentifiers')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')
    const { LocalIamFederationRuntimeStore } = await import('../src/platform/iamFederationRuntime')

    await LocalIamFederationRuntimeStore.createIdentityProviderAsync(IAM_SYSTEM_USER_ID, {
      realm_id: 'realm-partner-embedded-validation',
      alias: 'http-trusted-runtime-saml-broker',
      name: 'HTTP Trusted Runtime SAML Broker',
      protocol: 'SAML',
      link_policy: 'AUTO_CREATE',
      profile_source_mode: 'TRUSTED_ASSERTION',
      trust_store_id: 'trust-store-institutional-saml',
      mapping_profile_id: 'mapping-profile-institutional-saml',
      issuer_url: 'https://sso.institution.local/saml',
      trusted_email_domains: ['partner.example'],
    })

    const tokens = await LocalIamProtocolRuntimeStore.issueSubjectTokensAsync({
      realm_id: 'realm-partner-embedded-validation',
      client_id: 'admin-console-demo',
      subject_kind: 'USER',
      subject_id: 'iam-user-partner-admin',
      requested_scope_names: ['openid', 'profile', 'email', 'iam.manage'],
      base_url: 'https://idp.local',
      grant_type: 'authorization_code',
      include_refresh_token: false,
    })

    const response = await invokePost(
      app,
      '/api/v1/iam/realms/realm-partner-embedded-validation/brokers/http-trusted-runtime-saml-broker/login',
      {
        external_username_or_email: 'ignored',
        external_identity: {
          subject: 'placeholder-subject',
          username: 'placeholder-user',
          email: 'placeholder@partner.example',
          first_name: 'Placeholder',
          last_name: 'Placeholder',
          issuer_url: 'https://sso.institution.local/saml',
          saml_assertion: {
            name_id: 'saml-http-0001',
            attributes: {
              mail: 'http.saml@partner.example',
              givenName: 'Http',
              sn: 'Saml',
            },
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      },
    )

    const body = JSON.parse(response.body) as {
      next_step: string
      user: { email: string }
    }

    expect(response.statusCode).toBe(200)
    expect(body.next_step).toBe('AUTHENTICATED')
    expect(body.user.email).toBe('http.saml@partner.example')
  })

  it('lists externally persisted peer sessions through the account sessions route under runtime flags', async () => {
    const app = await loadApp({
      IDP_DDB_RUNTIME_DUAL_WRITE: 'true',
    })

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')
    const currentSessionId = 'iam-session-http-surface-current'
    const issuedAt = new Date().toISOString()
    const expiresAt = new Date(Date.now() + (60 * 60 * 1000)).toISOString()
    const authenticationState = LocalIamAuthenticationRuntimeStore.exportState() as any
    authenticationState.account_sessions.push(
      {
        id: currentSessionId,
        realm_id: IAM_DEFAULT_REALM_ID,
        user_id: IAM_SUPER_ADMIN_USER_ID,
        client_id: 'client-admin-console-demo',
        client_identifier: 'admin-console-demo',
        client_name: 'Admin Console Demo',
        client_protocol: 'OIDC',
        scope_names: ['email', 'openid', 'profile'],
        assurance_level: 'PASSWORD',
        authenticated_at: issuedAt,
        issued_at: issuedAt,
        last_seen_at: issuedAt,
        expires_at: expiresAt,
        revoked_at: null,
        session_proof_hash: null,
        federated_login_context: null,
        synthetic: true,
      },
      {
        id: 'iam-session-http-surface-peer',
        realm_id: IAM_DEFAULT_REALM_ID,
        user_id: IAM_SUPER_ADMIN_USER_ID,
        client_id: 'client-admin-console-demo',
        client_identifier: 'admin-console-demo',
        client_name: 'Admin Console Demo',
        client_protocol: 'OIDC',
        scope_names: ['email', 'openid', 'profile'],
        assurance_level: 'PASSWORD',
        authenticated_at: issuedAt,
        issued_at: issuedAt,
        last_seen_at: issuedAt,
        expires_at: expiresAt,
        revoked_at: null,
        session_proof_hash: null,
        federated_login_context: null,
        synthetic: true,
      },
    )
    LocalIamAuthenticationRuntimeStore.importState(authenticationState)

    const sessionsResponse = await invokeGet(
      app,
      '/api/v1/iam/realms/realm-idp-default/account/sessions',
      {
        headers: {
          'x-iam-session-id': currentSessionId,
        },
      },
    )

    expect(sessionsResponse.statusCode).toBe(200)
    const sessionsBody = JSON.parse(sessionsResponse.body) as {
      sessions: Array<{ session_id: string }>
      count: number
    }

    expect(sessionsBody.count).toBeGreaterThanOrEqual(2)
    expect(sessionsBody.sessions.some((candidate) => candidate.session_id === 'iam-session-http-surface-peer')).toBe(true)
  })

  it('rejects an externally expired current session through the account session route under runtime flags', async () => {
    const app = await loadApp({
      IDP_DDB_RUNTIME_DUAL_WRITE: 'true',
      IDP_DDB_RUNTIME_READ_V2: 'true',
    })

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')
    const currentSessionId = 'iam-session-http-surface-expired'
    const issuedAt = '2026-04-11T14:00:00.000Z'
    const authenticationState = LocalIamAuthenticationRuntimeStore.exportState() as any
    authenticationState.account_sessions.push({
      id: currentSessionId,
      realm_id: IAM_DEFAULT_REALM_ID,
      user_id: IAM_SUPER_ADMIN_USER_ID,
      client_id: 'client-admin-console-demo',
      client_identifier: 'admin-console-demo',
      client_name: 'Admin Console Demo',
      client_protocol: 'OIDC',
      scope_names: ['email', 'openid', 'profile'],
      assurance_level: 'PASSWORD',
      authenticated_at: issuedAt,
      issued_at: issuedAt,
      last_seen_at: issuedAt,
      expires_at: '2026-04-11T15:00:00.000Z',
      revoked_at: null,
      session_proof_hash: null,
      federated_login_context: null,
      synthetic: true,
    })
    LocalIamAuthenticationRuntimeStore.importState(authenticationState)

    const response = await invokeGet(
      app,
      '/api/v1/iam/realms/realm-idp-default/account/session',
      {
        headers: {
          'x-iam-session-id': currentSessionId,
        },
      },
    )

    expect(response.statusCode).toBe(401)
    const body = JSON.parse(response.body) as {
      error: string
    }
    expect([
      'Account session is no longer active',
      'Unknown account session',
    ]).toContain(body.error)
  })

  it('does not let spoofed forwarded-for headers bypass rate limits when proxy trust is disabled', async () => {
    const app = await loadApp({
      IDP_GLOBAL_RATE_LIMIT_RPM: '1',
      IDP_RATE_LIMIT_WINDOW_MS: '60000',
      IDP_RATE_LIMIT_BLOCK_MS: '60000',
      IDP_TRUST_PROXY: 'false',
    })

    const first = await invokeGet(app, '/api/v1/iam/public/catalog', {
      headers: {
        'X-Forwarded-For': '198.51.100.10',
      },
      remoteAddress: '127.0.0.1',
    })
    const second = await invokeGet(app, '/api/v1/iam/public/catalog', {
      headers: {
        'X-Forwarded-For': '203.0.113.44',
      },
      remoteAddress: '127.0.0.1',
    })

    expect(first.statusCode).toBe(200)
    expect(second.statusCode).toBe(429)
  })

  it('registers an application account through the public application-binding contract', async () => {
    const app = await loadApp({})

    const response = await invokePost(app, '/api/v1/iam/application-bindings/account-registration', {
      realm_id: 'realm-flightos-default',
      client_id: 'admin-console-demo',
      account_type: 'ORGANIZATION',
      organization_kind: 'COMPANY',
      plan_id: 'ENTERPRISE',
      service_entitlement: 'INTEGRATION_ENABLED',
      first_name: 'Avery',
      last_name: 'Pilot',
      email: 'avery.pilot@example.com',
      password: 'SharedIdpBootstrap2026!',
      organization_name: 'FlightOS Testing LLC',
      billing_cycle: 'monthly',
      billing_email: 'billing@example.com',
      billing_contact_name: 'Avery Pilot',
      payment_method: {
        card_number: '4242424242424242',
        expiry_month: 12,
        expiry_year: 2030,
        postal_code: '32801',
        cardholder_name: 'Avery Pilot',
      },
      address: {
        line1: '123 Airfield Way',
        city: 'Orlando',
        state: 'FL',
        postal_code: '32801',
        country: 'US',
      },
    })
    const body = JSON.parse(response.body) as Record<string, any>

    expect(response.statusCode).toBe(201)
    expect(body.binding_id).toBe('binding-application-flightos-web')
    expect(body.realm_id).toBe('realm-flightos-default')
    expect(body.client_id).toBe('admin-console-demo')
    expect(body.registration.registration_id).toBeTruthy()
    expect(body.registration.user.email).toBe('avery.pilot@example.com')
    expect(body.activation_handoff).toMatchObject({
      flow_context: 'account_activation',
      login_hint: 'avery.pilot@example.com',
    })
    expect(body.activation_handoff.login_url).toContain('http://localhost:3001/login')
  })
})
