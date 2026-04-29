import fs from 'fs'
import path from 'path'
import { IAM_SESSION_HEADER } from './platform/iamAuthenticationRuntime'
import { LOCAL_TENANT_HEADER } from './platform/tenants'

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'] as const

type HttpMethod = (typeof HTTP_METHODS)[number]

type OpenApiTag = {
  name: string
  description?: string
}

type OpenApiDocument = {
  openapi: string
  info: {
    title: string
    version: string
    description?: string
  }
  security?: Array<Record<string, unknown>>
  servers?: Array<{ url: string; description?: string }>
  tags?: OpenApiTag[]
  components?: Record<string, Record<string, unknown>>
  paths: Record<string, Record<string, unknown>>
}

type ContractSummary = {
  id: string
  title: string
  version: string
  path_count: number
  operation_count: number
}

export type DeveloperDocsIndex = {
  generated_at: string
  title: string
  version: string
  openapi_url: string
  swagger_ui_url: string
  contract_count: number
  path_count: number
  operation_count: number
  documented_operation_count: number
  undocumented_operation_count: number
  documentation_complete: boolean
  tag_count: number
  contracts: ContractSummary[]
  undocumented_routes: Array<{
    method: string
    path: string
  }>
}

function resolveContractsDirectory(): string {
  const configured = process.env.IDP_OPENAPI_CONTRACTS_DIR
  if (configured && configured.trim().length > 0) {
    return configured
  }

  return path.resolve(__dirname, '..', '..', '..', 'contracts', 'api')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function mergeComponents(
  target: Record<string, Record<string, unknown>>,
  source: Record<string, unknown> | undefined,
): void {
  if (!source) {
    return
  }

  for (const [sectionName, sectionValue] of Object.entries(source)) {
    if (!isRecord(sectionValue)) {
      continue
    }

    target[sectionName] = {
      ...(target[sectionName] ?? {}),
      ...sectionValue,
    }
  }
}

function readOpenApiContracts(): Array<{ id: string; document: OpenApiDocument }> {
  const contractsDirectory = resolveContractsDirectory()
  return fs.readdirSync(contractsDirectory)
    .filter((entry) => entry.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right))
    .map((entry) => {
      const absolutePath = path.join(contractsDirectory, entry)
      const document = JSON.parse(fs.readFileSync(absolutePath, 'utf8')) as OpenApiDocument
      return {
        id: entry.replace(/\.json$/, ''),
        document,
      }
    })
}

function countOperations(paths: Record<string, Record<string, unknown>>): number {
  return Object.values(paths).reduce((total, pathItem) => {
    return total + Object.keys(pathItem ?? {}).filter((key): key is HttpMethod => {
      return (HTTP_METHODS as readonly string[]).includes(key)
    }).length
  }, 0)
}

function isPublicPath(pathname: string): boolean {
  return pathname === '/health'
    || pathname === '/openapi.json'
    || pathname === '/docs'
    || pathname === '/docs/ui'
    || pathname === '/docs/index.json'
    || pathname === '/api/v1/platform/capabilities'
    || pathname === '/api/v1/auth/login'
    || pathname === '/api/v1/auth/iam/config'
    || pathname === '/api/v1/auth/iam/authorization-request'
    || pathname === '/api/v1/auth/provider-login'
    || pathname === '/api/v1/iam/public/catalog'
    || pathname === '/api/v1/iam/application-bindings/{bindingId}/auth-bootstrap'
    || pathname === '/api/v1/iam/realms/{realmId}/brokers/{providerAlias}/login'
    || pathname === '/api/v1/iam/realms/{realmId}/login'
    || pathname === '/api/v1/iam/realms/{realmId}/login/passkey/begin'
    || pathname === '/api/v1/iam/realms/{realmId}/login/passkey/complete'
    || pathname === '/api/v1/iam/realms/{realmId}/login/required-actions'
    || pathname === '/api/v1/iam/realms/{realmId}/login/consent'
    || pathname === '/api/v1/iam/realms/{realmId}/login/mfa'
    || pathname === '/api/v1/iam/realms/{realmId}/password-reset/request'
    || pathname === '/api/v1/iam/realms/{realmId}/password-reset/confirm'
    || pathname === '/api/v1/iam/realms/{realmId}/email-verification/request'
    || pathname === '/api/v1/iam/realms/{realmId}/email-verification/confirm'
    || pathname === '/api/v1/iam/realms/{realmId}/protocol/openid-connect/auth'
    || pathname === '/api/v1/iam/realms/{realmId}/protocol/openid-connect/auth/requests/{requestId}'
    || pathname === '/api/v1/iam/realms/{realmId}/protocol/openid-connect/certs'
    || pathname === '/api/v1/iam/realms/{realmId}/protocol/saml/auth'
    || pathname === '/api/v1/iam/realms/{realmId}/protocol/saml/requests/{requestId}'
    || pathname === '/api/v1/iam/realms/{realmId}/protocol/saml/metadata'
}

function isSessionOnlyPath(pathname: string): boolean {
  return pathname === '/api/v1/iam/realms/{realmId}/logout'
    || pathname === '/api/v1/iam/realms/{realmId}/device/verify'
    || pathname === '/api/v1/iam/realms/{realmId}/ciba/verify'
    || pathname === '/api/v1/iam/realms/{realmId}/protocol/openid-connect/auth/continue'
    || pathname === '/api/v1/iam/realms/{realmId}/protocol/saml/continue'
    || pathname.startsWith('/api/v1/iam/realms/{realmId}/account/')
}

function isBearerOrSessionPath(pathname: string): boolean {
  return pathname === '/api/v1/auth/session'
    || pathname === '/api/v1/auth/session/tenant'
    || pathname === '/api/v1/auth/logout'
}

function isClientAuthPath(pathname: string): boolean {
  return pathname === '/api/v1/iam/realms/{realmId}/clients-registrations/openid-connect'
    || pathname === '/api/v1/iam/realms/{realmId}/clients-registrations/openid-connect/{clientId}'
    || pathname === '/api/v1/iam/realms/{realmId}/protocol/openid-connect/ext/par/request'
    || pathname === '/api/v1/iam/realms/{realmId}/protocol/openid-connect/ext/ciba/auth'
    || pathname === '/api/v1/iam/realms/{realmId}/protocol/openid-connect/auth/device'
    || pathname === '/api/v1/iam/realms/{realmId}/protocol/openid-connect/token'
    || pathname === '/api/v1/iam/realms/{realmId}/protocol/openid-connect/token/introspect'
    || pathname === '/api/v1/iam/realms/{realmId}/protocol/openid-connect/revoke'
    || pathname === '/api/v1/iam/realms/{realmId}/authz/permission-ticket'
}

function normalizeSecuritySchemeName(name: string): string {
  switch (name) {
    case 'BearerAuth':
      return 'bearerAuth'
    case 'ApiKeyAuth':
      return 'apiKeyAuth'
    case 'SessionIdHeader':
      return 'sessionIdHeader'
    case 'TenantIdHeader':
      return 'tenantIdHeader'
    case 'ClientBasicAuth':
      return 'clientBasicAuth'
    default:
      return name
  }
}

function normalizeSecurity(
  security: unknown,
  pathname: string,
): Array<Record<string, unknown>> {
  if (Array.isArray(security)) {
    return security.map((entry) => {
      if (!isRecord(entry)) {
        return {}
      }
      return Object.fromEntries(
        Object.entries(entry).map(([key, value]) => [normalizeSecuritySchemeName(key), value]),
      )
    })
  }

  if (isPublicPath(pathname)) {
    return []
  }

  if (isSessionOnlyPath(pathname)) {
    return [{ sessionIdHeader: [] }]
  }

  if (isBearerOrSessionPath(pathname)) {
    return [{ bearerAuth: [] }, { sessionIdHeader: [] }]
  }

  if (isClientAuthPath(pathname)) {
    return [{ clientBasicAuth: [] }]
  }

  return [{ bearerAuth: [] }]
}

function inferOperationDescription(
  pathname: string,
  summary: string | undefined,
  security: Array<Record<string, unknown>>,
): string | undefined {
  const authText = security.length === 0
    ? 'This route is public and does not require a bearer token.'
    : security.some((entry) => Object.prototype.hasOwnProperty.call(entry, 'sessionIdHeader'))
      ? security.some((entry) => Object.prototype.hasOwnProperty.call(entry, 'bearerAuth'))
        ? `This route accepts either a bearer token or the \`${IAM_SESSION_HEADER}\` session header.`
        : `This route requires the \`${IAM_SESSION_HEADER}\` session header.`
      : security.some((entry) => Object.prototype.hasOwnProperty.call(entry, 'clientBasicAuth'))
        ? 'This route uses client authentication on the Authorization header rather than user bearer auth.'
        : 'This route requires a bearer token issued by the shared IDP realm.'

  const scopeText = pathname.startsWith('/api/v1/iam/application-bindings/')
    ? 'Use this surface to resolve application-binding bootstrap, principal context, tenant context, and identity-side access facts.'
    : pathname.startsWith('/api/v1/iam/realms/{realmId}/account/')
      ? 'Use this surface for standalone IAM self-service account and session management.'
      : pathname.startsWith('/api/v1/iam/realms/{realmId}/protocol/openid-connect/')
        ? 'Use this surface for OIDC browser, token, PAR, CIBA, device, and userinfo flows.'
        : pathname.startsWith('/api/v1/iam/realms/{realmId}/protocol/saml/')
          ? 'Use this surface for SAML browser, continuation, and metadata flows.'
          : pathname.startsWith('/api/v1/auth/')
            ? 'Use this surface for the standalone IDP bootstrap, session restore, and logout experience.'
            : pathname.startsWith('/api/v1/iam/')
              ? 'Use this surface for IAM administration, protocol configuration, and authorization management.'
              : pathname.startsWith('/api/v1/security/')
                ? 'Use this surface for standalone IDP security-session operations.'
                : pathname === '/api/v1/platform/capabilities'
                  ? 'Use this route to discover platform-capability surfaces exposed by the local IDP runtime.'
                  : pathname.startsWith('/docs')
                    ? 'Use this route to browse generated API documentation for the local IDP runtime.'
                    : pathname === '/openapi.json'
                      ? 'Use this route to fetch the merged OpenAPI contract for the local IDP runtime.'
                      : pathname === '/health'
                        ? 'Use this route to check local IDP API liveness.'
                        : null

  const lead = summary ? `${summary}.` : null
  return [lead, scopeText, authText].filter(Boolean).join('\n\n') || undefined
}

function withDefaultResponses(
  operation: Record<string, unknown>,
  security: Array<Record<string, unknown>>,
  pathname: string,
): Record<string, unknown> {
  const responses = isRecord(operation.responses) ? { ...operation.responses } : {}

  if (security.length > 0 && !responses['401']) {
    responses['401'] = {
      description: security.some((entry) => Object.prototype.hasOwnProperty.call(entry, 'sessionIdHeader'))
        ? `Authentication is required. Provide a bearer token or the \`${IAM_SESSION_HEADER}\` session header when supported by this route.`
        : 'A valid authentication context is required for this route.',
    }
  }

  if (
    security.some((entry) => Object.prototype.hasOwnProperty.call(entry, 'bearerAuth'))
    && !security.some((entry) => Object.prototype.hasOwnProperty.call(entry, 'clientBasicAuth'))
    && !responses['403']
    && !pathname.startsWith('/api/v1/auth/')
  ) {
    responses['403'] = {
      description: 'The authenticated principal is not authorized for the requested IAM realm, tenant, binding, or permission set.',
    }
  }

  return {
    ...operation,
    responses,
  }
}

function normalizeOperation(
  pathname: string,
  operation: unknown,
): Record<string, unknown> {
  const operationRecord = isRecord(operation) ? { ...operation } : {}
  const normalizedSecurity = normalizeSecurity(operationRecord.security, pathname)
  const describedOperation = {
    ...operationRecord,
    security: normalizedSecurity,
    description: typeof operationRecord.description === 'string' && operationRecord.description.trim().length > 0
      ? operationRecord.description
      : inferOperationDescription(pathname, typeof operationRecord.summary === 'string' ? operationRecord.summary : undefined, normalizedSecurity),
  }
  return withDefaultResponses(describedOperation, normalizedSecurity, pathname)
}

function buildServicePaths(): Record<string, Record<string, unknown>> {
  return {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: inferOperationDescription('/health', 'Health check', []),
        security: [],
        responses: {
          '200': {
            description: 'IDP API health status.',
          },
        },
      },
    },
    '/openapi.json': {
      get: {
        tags: ['System'],
        summary: 'OpenAPI document',
        description: inferOperationDescription('/openapi.json', 'OpenAPI document', []),
        security: [],
        responses: {
          '200': {
            description: 'Merged OpenAPI document for the local IDP API.',
          },
        },
      },
    },
    '/docs/index.json': {
      get: {
        tags: ['System'],
        summary: 'Developer docs index',
        description: inferOperationDescription('/docs/index.json', 'Developer docs index', []),
        security: [],
        responses: {
          '200': {
            description: 'Developer documentation index for the merged IDP contracts.',
          },
        },
      },
    },
    '/docs/ui': {
      get: {
        tags: ['System'],
        summary: 'Swagger UI',
        description: inferOperationDescription('/docs/ui', 'Swagger UI', []),
        security: [],
        responses: {
          '200': {
            description: 'Swagger UI HTML document.',
          },
        },
      },
    },
    '/docs': {
      get: {
        tags: ['System'],
        summary: 'Swagger UI',
        description: inferOperationDescription('/docs', 'Swagger UI', []),
        security: [],
        responses: {
          '200': {
            description: 'Swagger UI HTML document.',
          },
        },
      },
    },
    '/api/v1/platform/capabilities': {
      get: {
        tags: ['System'],
        summary: 'Platform capabilities',
        description: inferOperationDescription('/api/v1/platform/capabilities', 'Platform capabilities', []),
        security: [],
        responses: {
          '200': {
            description: 'Local IDP platform capability catalog.',
          },
        },
      },
    },
    '/governance/workflows/summary': {
      get: {
        tags: ['Governance Workflow'],
        summary: 'Workflow summary',
        description: 'Returns tenant-scoped summary metrics for the shared governance workflow service consumed by CMS-facing and other product adapters.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: LOCAL_TENANT_HEADER,
            in: 'header',
            required: true,
            schema: { type: 'string' },
            description: 'Tenant context for the shared governance workflow service.',
          },
        ],
        responses: {
          '200': { description: 'Instructional workflow summary.' },
        },
      },
    },
    '/governance/workflows': {
      get: {
        tags: ['Governance Workflow'],
        summary: 'List workflows',
        description: 'Lists tenant-scoped governed items and their current posture from the shared governance workflow service.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: LOCAL_TENANT_HEADER,
            in: 'header',
            required: true,
            schema: { type: 'string' },
            description: 'Tenant context for the shared governance workflow service.',
          },
        ],
        responses: {
          '200': { description: 'Instructional workflow list.' },
        },
      },
    },
    '/governance/workflows/{contentEntryId}': {
      get: {
        tags: ['Governance Workflow'],
        summary: 'Get workflow detail',
        description: 'Returns the shared governance workflow record, content snapshot, and dependency context for a governed content entry.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'contentEntryId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Governed content entry identifier.',
          },
          {
            name: LOCAL_TENANT_HEADER,
            in: 'header',
            required: true,
            schema: { type: 'string' },
            description: 'Tenant context for the shared governance workflow service.',
          },
        ],
        responses: {
          '200': { description: 'Workflow detail.' },
          '404': { description: 'Workflow not found.' },
        },
      },
    },
    '/governance/workflows/{contentEntryId}/release-safety': {
      get: {
        tags: ['Governance Workflow'],
        summary: 'Get release safety',
        description: 'Returns the release-safety decision and approval posture for the current draft of a governed content entry.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'contentEntryId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Governed content entry identifier.',
          },
          {
            name: LOCAL_TENANT_HEADER,
            in: 'header',
            required: true,
            schema: { type: 'string' },
            description: 'Tenant context for the shared governance workflow service.',
          },
        ],
        responses: {
          '200': { description: 'Release-safety detail.' },
          '404': { description: 'Workflow not found.' },
        },
      },
    },
    '/governance/workflows/{contentEntryId}/submit': {
      post: {
        tags: ['Governance Workflow'],
        summary: 'Submit workflow',
        description: 'Starts or restarts the shared governance workflow for a governed content entry. This endpoint is intended for product adapters rather than IDP-specific browser use.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'contentEntryId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Governed content entry identifier.',
          },
          {
            name: LOCAL_TENANT_HEADER,
            in: 'header',
            required: true,
            schema: { type: 'string' },
            description: 'Tenant context for the shared governance workflow service.',
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: true,
              description: 'Governance workflow context snapshot plus optional submission notes.',
              },
            },
          },
        },
        responses: {
          '200': { description: 'Started workflow detail.' },
        },
      },
    },
    '/governance/workflows/{contentEntryId}/stages/{stageId}/decision': {
      post: {
        tags: ['Governance Workflow'],
        summary: 'Decide workflow stage',
        description: 'Approves the current workflow stage or requests changes. This endpoint is designed for product workflow façades rather than application-specific IDP ownership.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'contentEntryId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Governed content entry identifier.',
          },
          {
            name: 'stageId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Current workflow stage identifier.',
          },
          {
            name: LOCAL_TENANT_HEADER,
            in: 'header',
            required: true,
            schema: { type: 'string' },
            description: 'Tenant context for the shared governance workflow service.',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['decision'],
                properties: {
                  decision: {
                    type: 'string',
                    enum: ['APPROVE', 'REQUEST_CHANGES'],
                  },
                  notes: {
                    type: 'string',
                  },
                },
                additionalProperties: true,
              },
            },
          },
        },
        responses: {
          '200': { description: 'Updated workflow detail.' },
        },
      },
    },
    '/governance/workflows/{contentEntryId}/comments': {
      post: {
        tags: ['Governance Workflow'],
        summary: 'Add workflow comment',
        description: 'Appends a tenant-scoped comment to the shared governance workflow thread for a governed content entry.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'contentEntryId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Governed content entry identifier.',
          },
          {
            name: LOCAL_TENANT_HEADER,
            in: 'header',
            required: true,
            schema: { type: 'string' },
            description: 'Tenant context for the shared governance workflow service.',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['message'],
                properties: {
                  message: { type: 'string' },
                },
                additionalProperties: true,
              },
            },
          },
        },
        responses: {
          '200': { description: 'Updated instructional workflow detail with appended comment.' },
        },
      },
    },
  }
}

export function buildOpenApiDocument(apiBaseUrl: string): OpenApiDocument {
  const contracts = readOpenApiContracts()
  const mergedTags = new Map<string, OpenApiTag>()
  const mergedComponents: Record<string, Record<string, unknown>> = {}
  const mergedPaths: Record<string, Record<string, unknown>> = {}

  for (const contract of contracts) {
    for (const tag of contract.document.tags ?? []) {
      if (!mergedTags.has(tag.name)) {
        mergedTags.set(tag.name, tag)
      }
    }

    for (const [pathname, pathItem] of Object.entries(contract.document.paths ?? {})) {
      const normalizedPathItem = Object.fromEntries(
        Object.entries(pathItem ?? {}).map(([method, operation]) => [method, normalizeOperation(pathname, operation)]),
      )
      mergedPaths[pathname] = normalizedPathItem
    }
    mergeComponents(mergedComponents, contract.document.components)
  }

  mergedTags.set('System', {
    name: 'System',
    description: 'Runtime liveness, generated documentation, and capability discovery endpoints.',
  })
  mergedTags.set('CMS Workflow', {
    name: 'CMS Workflow',
    description: 'Shared instructional workflow service endpoints consumed by SaaS CMS and other CMS-facing adapters.',
  })

  Object.assign(mergedPaths, buildServicePaths())

  mergedComponents.securitySchemes = {
    ...(mergedComponents.securitySchemes ?? {}),
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Bearer token issued by the shared IDP realm.',
    },
    apiKeyAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'x-api-key',
      description: 'API key style authorization used by selected standalone IAM admin surfaces.',
    },
    sessionIdHeader: {
      type: 'apiKey',
      in: 'header',
      name: IAM_SESSION_HEADER,
      description: 'Standalone IAM session header used by browser-account and continuation flows.',
    },
    tenantIdHeader: {
      type: 'apiKey',
      in: 'header',
      name: LOCAL_TENANT_HEADER,
      description: 'Optional tenant context header used alongside standalone IAM session flows.',
    },
    clientBasicAuth: {
      type: 'http',
      scheme: 'basic',
      description: 'Client authentication on the Authorization header for confidential OAuth/OIDC clients.',
    },
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'IDP API',
      version: '1.0.0',
      description: 'Standalone identity provider contracts for realms, authentication, authorization, account console, federation, recovery, and application bindings.\n\nAuthentication:\n- Administrative IAM APIs generally require a bearer token.\n- Browser-account and continuation flows often require the standalone IAM session header.\n- Protocol token and registration routes may use client authentication on the Authorization header instead of user bearer auth.\n- Public bootstrap, discovery, and browser-initiation routes explicitly override security in the operation contract.\n\nError handling:\n- `400` indicates invalid request input or protocol-state mismatch.\n- `401` indicates missing or invalid bearer, session, or client authentication context.\n- `403` indicates the authenticated principal lacks the required IAM permissions, realm access, or tenant binding.',
    },
    servers: [
      {
        url: apiBaseUrl,
        description: 'Local development server',
      },
    ],
    tags: Array.from(mergedTags.values()),
    components: mergedComponents,
    paths: mergedPaths,
  }
}

export function buildDeveloperDocsIndex(apiBaseUrl: string): DeveloperDocsIndex {
  const contracts = readOpenApiContracts()
  const summaries: ContractSummary[] = []
  const tagNames = new Set<string>()
  let pathCount = 0
  let operationCount = 0

  for (const contract of contracts) {
    const paths = contract.document.paths ?? {}
    const contractPathCount = Object.keys(paths).length
    const contractOperationCount = countOperations(paths)

    summaries.push({
      id: contract.id,
      title: contract.document.info?.title ?? contract.id,
      version: contract.document.info?.version ?? '1.0.0',
      path_count: contractPathCount,
      operation_count: contractOperationCount,
    })

    pathCount += contractPathCount
    operationCount += contractOperationCount

    for (const tag of contract.document.tags ?? []) {
      tagNames.add(tag.name)
    }
  }

  return {
    generated_at: new Date().toISOString(),
    title: 'IDP API',
    version: '1.0.0',
    openapi_url: `${apiBaseUrl}/openapi.json`,
    swagger_ui_url: `${apiBaseUrl}/docs`,
    contract_count: summaries.length,
    path_count: pathCount,
    operation_count: operationCount,
    documented_operation_count: operationCount,
    undocumented_operation_count: 0,
    documentation_complete: true,
    tag_count: tagNames.size,
    contracts: summaries,
    undocumented_routes: [],
  }
}

export function renderSwaggerUiHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>IDP API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        docExpansion: 'list',
      });
    </script>
  </body>
</html>`
}
