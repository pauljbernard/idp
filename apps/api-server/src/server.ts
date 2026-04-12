import { createHash, randomBytes } from 'crypto';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { LocalIamAdminAuthorizationStore } from './platform/iamAdminAuthorization';
import { LocalIamAdvancedOAuthRuntimeStore } from './platform/iamAdvancedOAuthRuntime';
import { LocalIamAuthFlowStore } from './platform/iamAuthFlows';
import { IAM_SESSION_HEADER, LocalIamAuthenticationRuntimeStore } from './platform/iamAuthenticationRuntime';
import { LocalIamAuthorizationRuntimeStore } from './platform/iamAuthorizationRuntime';
import { LocalIamAuthorizationServicesStore } from './platform/iamAuthorizationServices';
import { LocalIamBenchmarkRuntimeStore } from './platform/iamBenchmarkRuntime';
import { LocalIamDeploymentRuntimeStore } from './platform/iamDeploymentRuntime';
import { LocalIamExperienceRuntimeStore } from './platform/iamExperienceRuntime';
import { LocalIamExtensionRegistryStore } from './platform/iamExtensionRegistry';
import { LocalIamFederationFailoverStore } from './platform/iamFederationFailover';
import { LocalIamFederationRuntimeStore } from './platform/iamFederationRuntime';
import { IAM_PLATFORM_SCOPE_ID, LocalIamFoundationStore } from './platform/iamFoundation';
import { LocalIamHealthRuntimeStore } from './platform/iamHealthRuntime';
import { LocalIamOperationsRuntimeStore } from './platform/iamOperationsRuntime';
import {
  LocalIamOrganizationStore,
  type UpdateIamOrganizationInvitationRequest,
} from './platform/iamOrganizations';
import { LocalIamProtocolRuntimeStore, type IamResolvedBearerAccessToken } from './platform/iamProtocolRuntime';
import { LocalIamRecoveryRuntimeStore } from './platform/iamRecoveryRuntime';
import { LocalIamPasskeySupportMatrixRuntimeStore } from './platform/iamPasskeySupportMatrixRuntime';
import { LocalIamReviewRuntimeStore } from './platform/iamReviewRuntime';
import { LocalIamSamlSupportMatrixRuntimeStore } from './platform/iamSamlSupportMatrixRuntime';
import { LocalIamSupportProfileRuntimeStore } from './platform/iamSupportProfileRuntime';
import { LocalIamSecurityAuditStore } from './platform/iamSecurityAudit';
import { LocalIamStandaloneBootstrapStore } from './platform/iamStandaloneBootstrap';
import { LocalIamUserProfileStore } from './platform/iamUserProfiles';
import { LocalIamWebAuthnStore } from './platform/iamWebAuthn';
import { LocalIamApplicationConsumerStore } from './platform/iamApplicationConsumers';
import { LocalGovernanceAccessStore } from './platform/governanceAccessRuntime';
import {
  LocalGovernanceWorkflowStore,
  type GovernanceWorkflowStageId,
  type GovernanceWorkflowContextInput,
} from './platform/governanceWorkflowRuntime';
import { LocalAccountProvisioningStore, type AccountRegistrationRequest } from './platform/accountProvisioning';
import { LocalApplicationIdentityStore } from './platform/applicationIdentity';
import { LocalSettingsStore } from './platform/settings';
import { createConfiguredRateLimitBackend } from './platform/rateLimiting';
import { LOCAL_TENANT_HEADER } from './platform/tenants';
import {
  normalizeHeaderValue,
  resolveCanonicalApiBaseUrl,
  resolveCanonicalUiBaseUrl,
  resolveClientIp,
  resolveTrustProxySetting,
} from './serverInfrastructure';
import { buildDeveloperDocsIndex, buildOpenApiDocument, renderSwaggerUiHtml } from './openapi';

dotenv.config();

const app = express();
const port = Number.parseInt(process.env.PORT ?? '4000', 10);
const corsAllowedOrigins = new Set<string>([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4312',
  'http://127.0.0.1:4312',
  'http://localhost:4321',
  'http://127.0.0.1:4321',
  'http://localhost:3004',
  'http://127.0.0.1:3004',
]);

const idpGlobalRateLimitRpm = (() => {
  const configured = Number.parseInt(process.env.IDP_GLOBAL_RATE_LIMIT_RPM ?? '', 10);
  return Number.isInteger(configured) && configured > 0 ? configured : 300;
})();
const idpGlobalRateLimitWindowMs = (() => {
  const configured = Number.parseInt(process.env.IDP_RATE_LIMIT_WINDOW_MS ?? '', 10);
  return Number.isInteger(configured) && configured > 0 ? configured : 60_000;
})();
const idpGlobalRateLimitBlockMs = (() => {
  const configured = Number.parseInt(process.env.IDP_RATE_LIMIT_BLOCK_MS ?? '', 10);
  return Number.isInteger(configured) && configured > 0 ? configured : 60_000;
})();
const idpAuthRateLimitRpm = (() => {
  const configured = Number.parseInt(process.env.IDP_AUTH_RATE_LIMIT_RPM ?? '', 10);
  return Number.isInteger(configured) && configured > 0 ? configured : 60;
})();
const idpAuthRateLimitBlockMs = (() => {
  const configured = Number.parseInt(process.env.IDP_AUTH_RATE_LIMIT_BLOCK_MS ?? '', 10);
  return Number.isInteger(configured) && configured > 0 ? configured : 120_000;
})();
const idpAuthenticatedIamRateLimitRpm = (() => {
  const configured = Number.parseInt(process.env.IDP_AUTHENTICATED_IAM_RATE_LIMIT_RPM ?? '', 10);
  return Number.isInteger(configured) && configured > 0 ? configured : 1_500;
})();
const idpAuthenticatedIamRateLimitBlockMs = (() => {
  const configured = Number.parseInt(process.env.IDP_AUTHENTICATED_IAM_RATE_LIMIT_BLOCK_MS ?? '', 10);
  return Number.isInteger(configured) && configured > 0 ? configured : 15_000;
})();
const idpRequestTimeoutMs = (() => {
  const configured = Number.parseInt(process.env.IDP_REQUEST_TIMEOUT_MS ?? '', 10);
  return Number.isInteger(configured) && configured > 0 ? configured : 90_000;
})();
const idpListenHost = normalizeHeaderValue(process.env.IDP_LISTEN_HOST) ?? '0.0.0.0';
const idpTrustProxy = resolveTrustProxySetting(process.env.IDP_TRUST_PROXY);
const canonicalApiBaseUrl = resolveCanonicalApiBaseUrl(idpListenHost, port, process.env.IDP_API_BASE_URL);
const canonicalUiBaseUrl = resolveCanonicalUiBaseUrl(canonicalApiBaseUrl, port, process.env.IDP_UI_BASE_URL);
const IAM_REALM_HEADER = 'x-iam-realm-id';

const LocalAdminAuditStore = {
  record: (_entry: unknown) => {
    // Standalone baseline keeps audit writes in-process for now.
  },
};

function getLocalApiBaseUrl(_req: express.Request): string {
  return canonicalApiBaseUrl;
}

function getLocalUiBaseUrl(_req: express.Request): string {
  return canonicalUiBaseUrl;
}

function buildApplicationLoginHandoff(
  realmId: string,
  clientId: string,
  email: string,
  flowContext: 'account_activation' | 'invite_activation',
  nextRoute?: string | null,
) {
  const client = LocalIamProtocolRuntimeStore.getClientByIdentifier(realmId, clientId);
  const candidateBaseUrl = normalizeHeaderValue(client.root_url)
    ?? normalizeHeaderValue(client.base_url)
    ?? canonicalUiBaseUrl;
  const url = new URL('/login', candidateBaseUrl);
  url.searchParams.set('login_hint', email.trim().toLowerCase());
  url.searchParams.set('flow_context', flowContext);
  const normalizedNextRoute = normalizeHeaderValue(nextRoute);
  if (flowContext === 'account_activation' && normalizedNextRoute) {
    url.searchParams.set('next', normalizedNextRoute);
  }
  return {
    login_url: url.toString(),
    login_hint: email.trim().toLowerCase(),
    flow_context: flowContext,
  };
}

function buildApplicationAccountActivationHandoff(
  realmId: string,
  clientId: string,
  email: string,
  nextRoute?: string | null,
) {
  return buildApplicationLoginHandoff(
    realmId,
    clientId,
    email,
    'account_activation',
    nextRoute,
  );
}

function buildApplicationInvitationActivationHandoff(
  realmId: string,
  clientId: string,
  email: string,
) {
  return buildApplicationLoginHandoff(
    realmId,
    clientId,
    email,
    'invite_activation',
  );
}

function getClientIp(req: express.Request): string {
  return resolveClientIp(req, idpTrustProxy);
}

function hashRateLimitToken(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 24);
}

function parseOriginList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => normalizeHeaderValue(item))
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
}

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = origin.toLowerCase();
  if (corsAllowedOrigins.has(normalizedOrigin)) {
    return true;
  }

  try {
    const parsed = new URL(normalizedOrigin);
    const host = parsed.host.toLowerCase();
    if (corsAllowedOrigins.has(host) || corsAllowedOrigins.has(`http://${host}`) || corsAllowedOrigins.has(`https://${host}`)) {
      return true;
    }
  } catch {
    // Ignore malformed origins and fail closed.
  }

  return false;
}

const configuredAllowedOrigins = new Set(parseOriginList(process.env.IDP_ALLOWED_ORIGINS));
configuredAllowedOrigins.forEach((origin) => corsAllowedOrigins.add(origin));
corsAllowedOrigins.add(canonicalUiBaseUrl.toLowerCase());

const idpRateLimitBackend = createConfiguredRateLimitBackend();

function createRateLimitMiddleware(options: {
  name: string;
  limit: number;
  windowMs: number;
  blockMs: number;
  keyBuilder?: (req: express.Request) => string;
}): express.RequestHandler {
  return async (req, res, next) => {
    const clientKey = options.keyBuilder ? options.keyBuilder(req) : getClientIp(req);
    let evaluation;
    try {
      evaluation = await idpRateLimitBackend.evaluate(options.name, clientKey, options, Date.now());
    } catch (error) {
      console.error(`[${req.correlationId}] Rate limit backend error:`, error);
      res.status(503).json({
        error: 'IDP rate limit backend unavailable',
        scope: options.name,
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!evaluation.allowed) {
      const retryAfterSeconds = evaluation.retryAfterSeconds ?? 1;
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.setHeader('X-RateLimit-Limit', String(evaluation.limit));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', String(Math.floor(evaluation.resetAt / 1000)));
      res.status(429).json({
        error: `Rate limit exceeded for ${options.name} endpoint scope`,
        scope: options.name,
        correlation_id: req.correlationId,
        retry_after_seconds: retryAfterSeconds,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.setHeader('X-RateLimit-Limit', String(evaluation.limit));
    res.setHeader('X-RateLimit-Remaining', String(evaluation.remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.floor(evaluation.resetAt / 1000)));
    next();
  };
}

function isAuthenticationSensitivePath(path: string): boolean {
  if (path.includes('/protocol/openid-connect/')
    || path.includes('/clients-registrations/openid-connect')
    || path.includes('/protocol/saml/login')
    || path.includes('/protocol/saml/logout')) {
    return true;
  }

  if (path.includes('/login-history')) {
    return false;
  }

  return path.includes('/iam/realms/') && (
    path.includes('/login/')
    || path.includes('/login')
    || path.includes('/brokers/') && path.includes('/login')
    || path.includes('/passkey/')
    || path.includes('/mfa')
    || path.includes('/consent')
    || path.endsWith('/logout')
    || path.includes('/oauth2/')
    || path.includes('/token')
  );
}

const idpGlobalRateLimiter = createRateLimitMiddleware({
  name: 'api',
  limit: idpGlobalRateLimitRpm,
  windowMs: idpGlobalRateLimitWindowMs,
  blockMs: idpGlobalRateLimitBlockMs,
});

const idpAuthRateLimiter = createRateLimitMiddleware({
  name: 'auth-and-token',
  limit: idpAuthRateLimitRpm,
  windowMs: idpGlobalRateLimitWindowMs,
  blockMs: idpAuthRateLimitBlockMs,
});

const idpAuthenticatedIamRateLimiter = createRateLimitMiddleware({
  name: 'iam-authenticated',
  limit: idpAuthenticatedIamRateLimitRpm,
  windowMs: idpGlobalRateLimitWindowMs,
  blockMs: idpAuthenticatedIamRateLimitBlockMs,
  keyBuilder: (req) => {
    const sessionId = normalizeHeaderValue(req.header(IAM_SESSION_HEADER));
    if (sessionId) {
      return `iam-session:${sessionId}`;
    }

    const authorizationHeader = normalizeHeaderValue(req.header('authorization'));
    if (authorizationHeader?.startsWith('Bearer ')) {
      return `iam-bearer:${hashRateLimitToken(authorizationHeader.slice(7).trim())}`;
    }

    return `ip:${getClientIp(req)}`;
  },
});

function isAuthenticatedIamWorkspacePath(req: express.Request): boolean {
  if (!req.path.startsWith('/api/v1/iam/')) {
    return false;
  }

  if (isAuthenticationSensitivePath(req.path)) {
    return false;
  }

  return Boolean(
    normalizeHeaderValue(req.header(IAM_SESSION_HEADER))
    || normalizeHeaderValue(req.header('authorization')),
  );
}

function mapStandaloneIamTokenError(error: unknown): { error: string; error_description?: string } {
  if (error instanceof Error) {
    const message = error.message;

    // Authorization pending for device flow
    if (message === 'authorization_pending') {
      return {
        error: 'authorization_pending',
        error_description: 'The authorization request is still pending as the end-user hasn\'t yet completed the user-interaction steps'
      };
    }

    // Invalid device code
    if (message === 'Invalid device_code') {
      return {
        error: 'invalid_grant',
        error_description: 'The provided device code is invalid or expired'
      };
    }

    // Invalid refresh token
    if (message === 'Invalid refresh token') {
      return {
        error: 'invalid_grant',
        error_description: 'The provided refresh token is invalid, expired, or revoked'
      };
    }

    // Invalid permission ticket
    if (message.includes('Unknown IAM permission ticket')) {
      return {
        error: 'invalid_grant',
        error_description: 'The provided permission ticket is invalid or expired'
      };
    }

    // Invalid subject token for token exchange
    if (message === 'Unknown issued token') {
      return {
        error: 'invalid_grant',
        error_description: 'The provided subject token is invalid or expired'
      };
    }

    // Missing required parameters
    if (message.includes('Missing')) {
      return {
        error: 'invalid_request',
        error_description: message
      };
    }

    // Unknown client
    if (message.includes('Unknown client')) {
      return {
        error: 'invalid_client',
        error_description: 'Client authentication failed'
      };
    }

    // Generic invalid/expired cases
    if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('expired')) {
      return {
        error: 'invalid_grant',
        error_description: message
      };
    }

    // Server errors
    return {
      error: 'server_error',
      error_description: 'The authorization server encountered an unexpected condition'
    };
  }

  return {
    error: 'server_error',
    error_description: 'The authorization server encountered an unexpected condition'
  };
}

function parseBearerToken(req: express.Request): string | null {
  const authorizationHeader = normalizeHeaderValue(req.header('authorization'));
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authorizationHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

function resolveEffectiveRealmRoleNames(realmId: string, roleIds: string[]): string[] {
  const rolesById = new Map(
    LocalIamFoundationStore
      .listRoles({ realm_id: realmId })
      .roles
      .map((role) => [role.id, role]),
  );
  const resolved = new Set<string>();
  const visiting = new Set<string>();

  const visit = (roleId: string) => {
    if (visiting.has(roleId)) {
      return;
    }
    visiting.add(roleId);
    const role = rolesById.get(roleId);
    if (!role) {
      visiting.delete(roleId);
      return;
    }
    resolved.add(role.name);
    if (role.kind === 'COMPOSITE_ROLE') {
      role.composite_role_ids.forEach(visit);
    }
    visiting.delete(roleId);
  };

  roleIds.forEach(visit);
  return Array.from(resolved).sort();
}

function resolveIamAccountSessionAuthorization(req: express.Request): IamResolvedBearerAccessToken | null {
  const sessionId = normalizeHeaderValue(req.header(IAM_SESSION_HEADER));
  if (!sessionId) {
    return null;
  }

  const realmId = mapRouteRealmId(req);
  if (!realmId) {
    throw new Error(`Missing ${IAM_REALM_HEADER} realm context for IAM account session`);
  }

  const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(realmId, sessionId);
  const user = LocalIamFoundationStore.getUserById(sessionContext.user.id);
  if (user.realm_id !== realmId) {
    throw new Error('IAM account session realm does not match user realm');
  }
  if (user.status !== 'ACTIVE') {
    throw new Error('IAM account user is not active');
  }

  const groups = user.group_ids
    .map((groupId) => {
      try {
        return LocalIamFoundationStore.getGroupById(groupId);
      } catch {
        return null;
      }
    })
    .filter((group) => group && group.realm_id === realmId && group.status === 'ACTIVE');

  const roleIds = new Set(user.role_ids);
  groups.forEach((group) => group.role_ids.forEach((roleId) => roleIds.add(roleId)));

  return {
    token_id: `iam-session:${sessionContext.session.session_id}`,
    realm_id: realmId,
    client_id: sessionContext.session.client_identifier ?? sessionContext.session.client_id ?? 'account-session',
    subject_kind: 'USER',
    subject_id: user.id,
    scope: sessionContext.session.scope_names.join(' '),
    scope_names: [...sessionContext.session.scope_names],
    realm_roles: resolveEffectiveRealmRoleNames(realmId, Array.from(roleIds)),
    groups: groups.map((group) => group.name).sort(),
    claims: {
      sub: user.id,
      realm_id: realmId,
      scope: sessionContext.session.scope_names.join(' '),
      realm_roles: resolveEffectiveRealmRoleNames(realmId, Array.from(roleIds)),
      groups: groups.map((group) => group.name).sort(),
      auth_source: 'iam_account_session',
    },
    expires_at: sessionContext.session.expires_at,
    issued_at: sessionContext.session.issued_at,
  };
}

function parseListPagination(req: express.Request): { limit?: number | null; offset?: number | null } {
  const rawLimit = req.query.limit;
  const rawOffset = req.query.offset;
  const normalizedLimit = Array.isArray(rawLimit) ? rawLimit[0] : rawLimit;
  const normalizedOffset = Array.isArray(rawOffset) ? rawOffset[0] : rawOffset;
  const parsedLimit = Number.parseInt(normalizeHeaderValue(normalizedLimit) || '', 10);
  const parsedOffset = Number.parseInt(normalizeHeaderValue(normalizedOffset) || '', 10);

  return {
    limit: Number.isInteger(parsedLimit) ? parsedLimit : null,
    offset: Number.isInteger(parsedOffset) ? parsedOffset : null,
  };
}

function isAdminCapableRole(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === 'realm-admin'
    || normalized === 'platform-admin'
    || normalized === 'platform-administrator'
    || normalized === 'service-account-platform-admin'
    || normalized === 'service-account-admin'
    || normalized === 'super_administrator'
    || normalized === 'administrator'
    || normalized.endsWith('admin');
}

function isAdminCapablePrincipal(context: IamResolvedBearerAccessToken): boolean {
  return context.realm_roles.some(isAdminCapableRole)
    || context.groups.some((value) => value.toLowerCase().includes('admin'))
    || context.scope_names.includes('iam.manage')
    || context.scope.includes('iam.manage');
}

function mapRouteRealmId(req: express.Request): string | null {
  return normalizeHeaderValue(req.params.realmId)
    || normalizeHeaderValue(req.params.realm_id as string | undefined)
    || normalizeHeaderValue(req.header(IAM_REALM_HEADER))
    || normalizeHeaderValue(req.query.realm_id as string | undefined)
    || normalizeHeaderValue(req.body?.realm_id);
}

function parsePermissionRequirement(input: unknown): { anyOf: string[]; allOf: string[] } {
  if (!input || typeof input !== 'object') {
    return { anyOf: [], allOf: [] };
  }
  const candidates = input as { any_of?: unknown; all_of?: unknown };
  const anyOf = Array.isArray(candidates.any_of)
    ? candidates.any_of.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];
  const allOf = Array.isArray(candidates.all_of)
    ? candidates.all_of.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];
  return { anyOf, allOf };
}

function hasAuthorizationForRequirements(
  context: IamResolvedBearerAccessToken,
  requirements: { anyOf: string[]; allOf: string[] },
): { allowed: boolean; reason: string } {
  const normalizedAnyOf = requirements.anyOf.map((value) => value.trim().toLowerCase());
  const normalizedAllOf = requirements.allOf.map((value) => value.trim().toLowerCase());

  const allOfHasUnrecognized = normalizedAllOf.some(
    (permission) => permission !== 'iam.read' && permission !== 'iam.manage' && permission !== 'iam.admin',
  );
  const anyOfHasUnrecognized = normalizedAnyOf.some(
    (permission) => permission !== 'iam.read' && permission !== 'iam.manage' && permission !== 'iam.admin',
  );

  if (allOfHasUnrecognized || anyOfHasUnrecognized) {
    return {
      allowed: false,
      reason: 'Unsupported permission requirement encountered during IAM authorization',
    };
  }

  const allRequiresManage = normalizedAllOf.some((permission) => permission === 'iam.manage' || permission === 'iam.admin');
  const anyRequiresManage = normalizedAnyOf.some((permission) => permission === 'iam.manage' || permission === 'iam.admin');
  const hasManagePrivilege = isAdminCapablePrincipal(context);

  if (allRequiresManage && !hasManagePrivilege) {
    return {
      allowed: false,
      reason: 'Missing iam.manage permission to complete this IAM administrative action',
    };
  }

  if (anyRequiresManage && !hasManagePrivilege) {
    return {
      allowed: false,
      reason: 'Missing iam.manage permission to complete this IAM administrative action',
    };
  }

  if (!context.subject_id) {
    return {
      allowed: false,
      reason: 'Unable to resolve IAM user context',
    };
  }

  return {
    allowed: true,
    reason: 'IAM bearer token resolved and request permission requirements satisfied',
  };
}

function requireBearerAuthorization(requirements: unknown): express.RequestHandler {
  return async (req, res, next) => {
    let resolvedToken: IamResolvedBearerAccessToken;
    const bearerToken = parseBearerToken(req);
    const hasIamSessionHeader = Boolean(normalizeHeaderValue(req.header(IAM_SESSION_HEADER)));

    try {
      if (bearerToken) {
        resolvedToken = await LocalIamProtocolRuntimeStore.resolveBearerAccessTokenAsync(bearerToken);
      } else if (hasIamSessionHeader) {
        const sessionResolvedToken = resolveIamAccountSessionAuthorization(req);
        if (!sessionResolvedToken) {
          throw new Error(`Missing ${IAM_SESSION_HEADER} session context`);
        }
        resolvedToken = sessionResolvedToken;
      } else {
        throw new Error('Missing Bearer token or IAM account session');
      }
    } catch (error) {
      res.status(401).json({
        error: error instanceof Error ? error.message : 'Invalid authentication context',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const requiredRealmId = mapRouteRealmId(req);
    if (requiredRealmId && requiredRealmId !== resolvedToken.realm_id) {
      res.status(403).json({
        error: 'Bearer token realm does not match required realm context',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const decision = hasAuthorizationForRequirements(resolvedToken, parsePermissionRequirement(requirements));
    if (!decision.allowed) {
      res.status(403).json({
        error: decision.reason,
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    req.userId = resolvedToken.subject_id;
    req.identityContext = {
      user_id: resolvedToken.subject_id,
      realm_id: resolvedToken.realm_id,
      client_id: resolvedToken.client_id,
      subject_kind: resolvedToken.subject_kind,
      scope_names: resolvedToken.scope_names,
      realm_roles: resolvedToken.realm_roles,
      groups: resolvedToken.groups,
      issued_at: resolvedToken.issued_at,
    };

    next();
  };
}

function requireGlobalPermission(requirements: unknown): express.RequestHandler {
  return requireBearerAuthorization(requirements);
}

function requireIamAdministrativePermission(_requirements: unknown): express.RequestHandler {
  return requireBearerAuthorization(_requirements);
}

function requireIamAccountSessionId(req: express.Request, res: express.Response): string | null {
  const sessionId = normalizeHeaderValue(req.header(IAM_SESSION_HEADER));

  if (!sessionId) {
    res.status(401).json({
      error: `Missing ${IAM_SESSION_HEADER} session context`,
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString(),
    });
    return null;
  }

  return sessionId;
}

function resolveRequiredTenantId(req: express.Request): string | null {
  return normalizeHeaderValue(req.header(LOCAL_TENANT_HEADER))
    ?? normalizeHeaderValue(req.query.tenant_id as string | undefined)
    ?? null;
}

function requireGovernanceWorkflowAccess(path: string, method: string): express.RequestHandler {
  return requireGovernanceRouteAccess(path, method, 'Governance workflow access denied');
}

function requireGovernanceRouteAccess(path: string, method: string, fallbackReason: string): express.RequestHandler {
  return (req, res, next) => {
    const realmRoles = req.identityContext?.realm_roles ?? [];
    if (
      realmRoles.includes('realm-admin')
      || realmRoles.includes('cms:admin')
      || realmRoles.includes('tenant_admin')
    ) {
      next();
      return;
    }

    if (!req.userId) {
      res.status(401).json({
        error: 'Unable to resolve governance workflow actor context',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const decision = LocalGovernanceAccessStore.authorizePrincipal({
      method,
      path,
      principal_contexts: [{ principal_type: 'USER', principal_id: req.userId }],
      target_space_ids: null,
    });

    if (!decision.allowed) {
      res.status(403).json({
        error: decision.reason ?? fallbackReason,
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}

function resolveCmsTenantMemberIds(tenantId: string): Set<string> {
  return new Set(LocalSettingsStore.listTeamMembers(tenantId).map((member) => member.id));
}

function filterCmsAssignmentsForTenant(tenantId: string) {
  const memberIds = resolveCmsTenantMemberIds(tenantId);
  const response = LocalGovernanceAccessStore.listAssignments();
  return {
    generated_at: response.generated_at,
    assignments: response.assignments.filter((assignment) => (
      assignment.principal_type !== 'USER' || memberIds.has(assignment.principal_id)
    )),
    count: response.assignments.filter((assignment) => (
      assignment.principal_type !== 'USER' || memberIds.has(assignment.principal_id)
    )).length,
  };
}

function ensureCmsTenantMember(tenantId: string, memberId: string): void {
  const memberIds = resolveCmsTenantMemberIds(tenantId);
  if (!memberIds.has(memberId)) {
    throw new Error(`Unknown CMS tenant member: ${memberId}`);
  }
}

function readGovernanceWorkflowContextInput(req: express.Request): GovernanceWorkflowContextInput {
  const body = typeof req.body === 'object' && req.body ? req.body as Record<string, unknown> : {};
  return {
    title: typeof body.title === 'string' ? body.title : undefined,
    content_kind: typeof body.content_kind === 'string' ? body.content_kind : undefined,
    schema_id: typeof body.schema_id === 'string' ? body.schema_id : undefined,
    dependency_entry_ids: Array.isArray(body.dependency_entry_ids)
      ? body.dependency_entry_ids.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : undefined,
    release_count: typeof body.release_count === 'number' ? body.release_count : undefined,
    draft_fingerprint: typeof body.draft_fingerprint === 'string' ? body.draft_fingerprint : undefined,
    published_fingerprint: typeof body.published_fingerprint === 'string' ? body.published_fingerprint : undefined,
    changed_entry_ids: Array.isArray(body.changed_entry_ids)
      ? body.changed_entry_ids.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : undefined,
    changed_fields: Array.isArray(body.changed_fields)
      ? body.changed_fields.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : undefined,
    entry: typeof body.entry === 'object' && body.entry ? body.entry as Record<string, unknown> : undefined,
    draft: typeof body.draft === 'object' && body.draft ? body.draft as Record<string, unknown> : undefined,
    published_payload: typeof body.published_payload === 'object' && body.published_payload
      ? body.published_payload as Record<string, unknown>
      : undefined,
  };
}

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS policy for IDP API'));
  },
  credentials: true,
}));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.set('trust proxy', idpTrustProxy);
app.disable('x-powered-by');
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan((tokens, req, res) => {
  return `${tokens.method(req, res)} ${req.path} ${tokens.status(req, res)} ${tokens['response-time'](req, res)} ms`;
}));

app.use((req, _res, next) => {
  req.correlationId = randomBytes(8).toString('hex');
  next();
});

app.use((req, res, next) => {
  req.setTimeout(idpRequestTimeoutMs, () => {
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout exceeded', correlation_id: req.correlationId, timestamp: new Date().toISOString() });
    }
    res.destroy();
  });
  res.setTimeout(idpRequestTimeoutMs, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Response timeout exceeded', correlation_id: req.correlationId, timestamp: new Date().toISOString() });
    }
  });
  next();
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/v1/iam/') && req.path.includes('/account/')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

app.use((req, res, next) => {
  if (
    req.path === '/health' ||
    req.path === '/openapi.json' ||
    req.path === '/docs' ||
    req.path === '/docs/ui' ||
    req.path === '/docs/index.json' ||
    req.path === '/api/v1/platform/capabilities' ||
    req.path === '/api/v1/auth/iam/config'
  ) {
    return next();
  }

  if (isAuthenticationSensitivePath(req.path)) {
    return idpAuthRateLimiter(req, res, next);
  }

  if (isAuthenticatedIamWorkspacePath(req)) {
    return idpAuthenticatedIamRateLimiter(req, res, next);
  }

  return idpGlobalRateLimiter(req, res, next);
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'idp-api',
    timestamp: new Date().toISOString(),
  });
});

app.get('/openapi.json', (req, res) => {
  res.json(buildOpenApiDocument(getLocalApiBaseUrl(req)));
});

function setSwaggerUiHeaders(res: express.Response): void {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https: data:; img-src 'self' https: data:; style-src 'self' https: 'unsafe-inline'; script-src 'self' https: 'unsafe-inline'; font-src 'self' https: data:; connect-src 'self' http: https:; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
  );
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
}

app.get('/docs/index.json', (req, res) => {
  res.json(buildDeveloperDocsIndex(getLocalApiBaseUrl(req)));
});

app.get('/docs/ui', (_req, res) => {
  setSwaggerUiHeaders(res);
  res.type('html').send(renderSwaggerUiHtml());
});

app.get('/docs', (_req, res) => {
  setSwaggerUiHeaders(res);
  res.type('html').send(renderSwaggerUiHtml());
});

app.get('/api/v1/platform/capabilities', (_req, res) => {
  res.json({
    generated_at: new Date().toISOString(),
    surfaces: [
      {
        id: 'iam',
        name: 'Identity Administration',
        href: '/iam',
        summary: 'Standalone identity administration workspace',
        surface_enabled: true,
        source_of_truth: 'idp-local-capabilities',
      },
      {
        id: 'anonymous-public-awareness',
        name: 'Public Awareness',
        href: '/iam/login',
        summary: 'Public-facing authentication entry points',
        surface_enabled: true,
        source_of_truth: 'idp-local-capabilities',
      },
    ],
  });
});

app.get('/api/v1/auth/iam/config', (_req, res) => {
  const applicationIdentity = LocalApplicationIdentityStore.getConfiguration();
  const notes = [...applicationIdentity.notes];
  const realmId = applicationIdentity.realm_id ?? 'realm-idp-default';
  const clientId = applicationIdentity.client_id;

  let bindingId: string | null = null;
  let bindingMode: 'DIRECT' | 'DEFAULT' | 'OVERRIDE' = 'DIRECT';
  let realmName = realmId;
  let fallbackBindingUsed = true;

  if (applicationIdentity.provider_kind !== 'STANDALONE_IAM') {
    notes.unshift('Application identity provider_kind is not STANDALONE_IAM; emitting compatibility auth config for legacy automation.');
  }

  try {
    const binding = LocalIamFoundationStore.getApplicationBindingByRealmClient(realmId, clientId);
    bindingId = binding.id;
    bindingMode = binding.binding_mode;
    realmName = binding.realm_name;
    fallbackBindingUsed = false;
  } catch {
    notes.unshift('No matching application binding was found for the configured realm/client; compatibility auth config is using application identity defaults.');
  }

  res.json({
    client_id: clientId,
    realm_id: realmId,
    realm_name: realmName,
    binding_id: bindingId,
    binding_mode: bindingMode,
    fallback_binding_used: fallbackBindingUsed,
    authorization_profile_id: applicationIdentity.authorization_profile_id ?? 'idp-enterprise-admin-console',
    authorization_projection_mode: 'APPLICATION_BINDING_CLAIM_MAPPING',
    tenant_membership_strategy: 'PLATFORM_ADMIN_ALL_TENANTS_OR_EXPLICIT_IDENTITY_MEMBERSHIP_WITH_LOCAL_USER_FALLBACK',
    managed_role_assignment_candidates: {
      admin: ['admin'],
      operator: ['operator'],
      pilot: ['pilot', 'specialist'],
      viewer: ['viewer'],
    },
    notes: Array.from(new Set(notes)),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/v1/iam/summary', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    const foundationSummary = LocalIamFoundationStore.getSummary();
    const authFlowSummary = LocalIamAuthFlowStore.getSummary();
    const authorizationSummary = LocalIamAuthorizationRuntimeStore.getSummary();
    const advancedOauthSummary = LocalIamAdvancedOAuthRuntimeStore.getSummary();
    const protocolSummary = LocalIamProtocolRuntimeStore.getSummary();
    const authenticationSummary = LocalIamAuthenticationRuntimeStore.getSummary();
    const userProfileSummary = LocalIamUserProfileStore.getSummary();
    const organizationSummary = LocalIamOrganizationStore.getSummary();
    const adminAuthorizationSummary = LocalIamAdminAuthorizationStore.getSummary();
    const authorizationServicesSummary = LocalIamAuthorizationServicesStore.getSummary();
    const extensionSummary = LocalIamExtensionRegistryStore.getSummary();
    const webauthnSummary = LocalIamWebAuthnStore.getSummary();
    const federationSummary = LocalIamFederationRuntimeStore.getSummary();
    const experienceSummary = LocalIamExperienceRuntimeStore.getSummary();
    const deploymentSummary = LocalIamDeploymentRuntimeStore.getSummary();
    const bootstrapSummary = LocalIamStandaloneBootstrapStore.getSummary();
    const healthSummary = LocalIamHealthRuntimeStore.getHealthSummary();
    const benchmarkSummary = LocalIamBenchmarkRuntimeStore.getSummary();
    const recoverySummary = LocalIamRecoveryRuntimeStore.getSummary();
    const reviewSummary = LocalIamReviewRuntimeStore.getSummary();
    const operationsSummary = LocalIamOperationsRuntimeStore.getSummary();
    const securityAuditSummary = LocalIamSecurityAuditStore.getSummary();
    res.json({
      ...foundationSummary,
      phase: 'FULL_IDP_PHASE_L',
      subsystem_status: 'STANDALONE_READINESS_AND_MARKET_POSITION_REVIEW_IMPLEMENTED',
      next_recommended_phase: 'FULL_IDP_PHASE_M_ADOPTION_PLANNING_ONLY',
      auth_flow_count: authFlowSummary.flow_count,
      auth_execution_count: authFlowSummary.execution_count,
      realm_auth_flow_binding_count: authFlowSummary.realm_auth_flow_binding_count,
      client_auth_flow_binding_count: authFlowSummary.client_auth_flow_binding_count,
      authorization_request_count: authorizationSummary.authorization_request_count,
      active_authorization_request_count: authorizationSummary.active_authorization_request_count,
      authorization_code_count: authorizationSummary.authorization_code_count,
      active_authorization_code_count: authorizationSummary.active_authorization_code_count,
      client_policy_count: advancedOauthSummary.client_policy_count,
      initial_access_token_count: advancedOauthSummary.initial_access_token_count,
      active_initial_access_token_count: advancedOauthSummary.active_initial_access_token_count,
      pushed_authorization_request_count: advancedOauthSummary.pushed_authorization_request_count,
      active_pushed_authorization_request_count: advancedOauthSummary.active_pushed_authorization_request_count,
      device_authorization_count: advancedOauthSummary.device_authorization_count,
      active_device_authorization_count: advancedOauthSummary.active_device_authorization_count,
      token_exchange_count: advancedOauthSummary.token_exchange_count,
      client_count: protocolSummary.client_count,
      client_scope_count: protocolSummary.client_scope_count,
      protocol_mapper_count: protocolSummary.protocol_mapper_count,
      service_account_count: protocolSummary.service_account_count,
      issued_token_count: protocolSummary.issued_token_count,
      active_signing_key_count: protocolSummary.active_signing_key_count,
      saml_auth_request_count: protocolSummary.saml_auth_request_count,
      active_saml_auth_request_count: protocolSummary.active_saml_auth_request_count,
      saml_session_count: protocolSummary.saml_session_count,
      active_saml_session_count: protocolSummary.active_saml_session_count,
      browser_session_count: authenticationSummary.browser_session_count,
      active_browser_session_count: authenticationSummary.active_browser_session_count,
      consent_record_count: authenticationSummary.consent_record_count,
      active_consent_record_count: authenticationSummary.active_consent_record_count,
      login_transaction_count: authenticationSummary.login_transaction_count,
      active_login_transaction_count: authenticationSummary.active_login_transaction_count,
      mfa_enrollment_count: authenticationSummary.mfa_enrollment_count,
      active_mfa_enrollment_count: authenticationSummary.active_mfa_enrollment_count,
      password_reset_ticket_count: authenticationSummary.password_reset_ticket_count,
      email_verification_ticket_count: authenticationSummary.email_verification_ticket_count,
      failed_login_attempt_count: authenticationSummary.failed_login_attempt_count,
      active_lockout_count: authenticationSummary.active_lockout_count,
      profile_schema_count: userProfileSummary.schema_count,
      profile_record_count: userProfileSummary.profile_count,
      organization_count: organizationSummary.organization_count,
      organization_membership_count: organizationSummary.membership_count,
      organization_invitation_count: organizationSummary.invitation_count,
      admin_permission_count: adminAuthorizationSummary.permission_count,
      admin_policy_count: adminAuthorizationSummary.policy_count,
      admin_evaluation_count: adminAuthorizationSummary.evaluation_count,
      resource_server_count: authorizationServicesSummary.resource_server_count,
      protected_scope_count: authorizationServicesSummary.protected_scope_count,
      protected_resource_count: authorizationServicesSummary.protected_resource_count,
      authorization_policy_count: authorizationServicesSummary.authorization_policy_count,
      authorization_permission_count: authorizationServicesSummary.authorization_permission_count,
      authorization_evaluation_count: authorizationServicesSummary.authorization_evaluation_count,
      permission_ticket_count: authorizationServicesSummary.permission_ticket_count,
      active_permission_ticket_count: authorizationServicesSummary.active_permission_ticket_count,
      extension_interface_count: extensionSummary.extension_interface_count,
      extension_package_count: extensionSummary.extension_package_count,
      extension_provider_count: extensionSummary.extension_provider_count,
      active_extension_provider_count: extensionSummary.active_extension_provider_count,
      extension_binding_count: extensionSummary.extension_binding_count,
      active_extension_binding_count: extensionSummary.active_extension_binding_count,
      theme_package_provider_count: extensionSummary.theme_package_provider_count,
      deployment_profile_count: deploymentSummary.deployment_profile_count,
      active_deployment_topology_mode: deploymentSummary.active_topology_mode,
      bootstrap_package_count: bootstrapSummary.bootstrap_package_count,
      benchmark_suite_count: benchmarkSummary.benchmark_suite_count,
      benchmark_run_count: benchmarkSummary.benchmark_run_count,
      recovery_profile_count: recoverySummary.recovery_profile_count,
      recovery_drill_count: recoverySummary.recovery_drill_count,
      standalone_health_check_count: healthSummary.count,
      standards_matrix_count: reviewSummary.standards_matrix_count,
      interoperability_check_count: reviewSummary.interoperability_check_count,
      differentiation_area_count: reviewSummary.differentiation_area_count,
      formal_review_count: reviewSummary.formal_review_count,
      latest_market_position: reviewSummary.latest_market_position,
      latest_adoption_recommendation: reviewSummary.latest_adoption_recommendation,
      passkey_credential_count: webauthnSummary.credential_count,
      active_passkey_credential_count: webauthnSummary.active_credential_count,
      webauthn_registration_challenge_count: webauthnSummary.registration_challenge_count,
      active_webauthn_registration_challenge_count: webauthnSummary.active_registration_challenge_count,
      webauthn_authentication_challenge_count: webauthnSummary.authentication_challenge_count,
      active_webauthn_authentication_challenge_count: webauthnSummary.active_authentication_challenge_count,
      identity_provider_count: federationSummary.identity_provider_count,
      active_identity_provider_count: federationSummary.active_identity_provider_count,
      user_federation_provider_count: federationSummary.user_federation_provider_count,
      active_user_federation_provider_count: federationSummary.active_user_federation_provider_count,
      linked_identity_count: federationSummary.linked_identity_count,
      federation_sync_job_count: federationSummary.sync_job_count,
      federation_event_count: federationSummary.federation_event_count,
      realm_theme_count: experienceSummary.realm_theme_count,
      localization_bundle_count: experienceSummary.localization_bundle_count,
      notification_template_count: experienceSummary.notification_template_count,
      notification_delivery_count: experienceSummary.notification_delivery_count,
      backup_count: operationsSummary.backup_count,
      restore_count: operationsSummary.restore_count,
      key_rotation_count: operationsSummary.key_rotation_count,
      resilience_run_count: operationsSummary.resilience_run_count,
      readiness_review_count: operationsSummary.readiness_review_count,
      operations_health: healthSummary.overall_status,
      latest_readiness_decision: operationsSummary.latest_readiness_decision,
      security_audit_request_count: securityAuditSummary.request_count,
      security_audit_failure_count: securityAuditSummary.failure_count,
      first_contract_ids: [
        ...foundationSummary.first_contract_ids,
        'iam-clients-api',
        'iam-client-scopes-api',
        'iam-protocol-mappers-api',
        'iam-service-accounts-api',
        'iam-issued-tokens-api',
        'iam-authorization-api',
        'iam-oidc-api',
        'iam-saml-api',
        'iam-auth-flows-api',
        'iam-browser-auth-api',
        'iam-account-console-api',
        'iam-user-profile-schemas-api',
        'iam-organizations-api',
        'iam-organization-invitations-api',
        'iam-admin-authorization-api',
        'iam-resource-servers-api',
        'iam-protected-resources-api',
        'iam-protected-scopes-api',
        'iam-authz-policies-api',
        'iam-authz-permissions-api',
        'iam-uma-api',
        'iam-extension-registry-api',
        'iam-identity-providers-api',
        'iam-user-federation-api',
        'iam-linked-identities-api',
        'iam-realm-branding-api',
        'iam-notifications-api',
        'iam-operations-api',
        'iam-security-operations-api',
        'iam-standalone-deployment-api',
        'iam-standalone-bootstrap-api',
        'iam-standalone-health-api',
        'iam-benchmarks-api',
        'iam-recovery-api',
        'iam-review-api'
      ]
    });
  } catch (error) {
    console.error(`[${req.correlationId}] IAM summary error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM summary',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/extensions/summary', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamExtensionRegistryStore.getSummary());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM extension summary error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM extension summary',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/support-profiles', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamSupportProfileRuntimeStore.listSupportProfiles());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM support profiles error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM support profiles',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/webauthn/support-matrix', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamPasskeySupportMatrixRuntimeStore.getSupportMatrix());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM WebAuthn support matrix error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM WebAuthn support matrix',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/saml/support-matrix', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamSamlSupportMatrixRuntimeStore.getSupportMatrix());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM SAML support matrix error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM SAML support matrix',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/extension-interfaces', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (_req, res) => {
  res.json(LocalIamExtensionRegistryStore.listInterfaces());
});

app.get('/api/v1/iam/extensions', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  res.json(LocalIamExtensionRegistryStore.listExtensions({
    status: normalizeHeaderValue(req.query.status as string | undefined) as 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | null,
    interface_kind: normalizeHeaderValue(req.query.interface_kind as string | undefined) as IamExtensionInterfaceKind | null,
  }));
});

app.post('/api/v1/iam/extensions', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const record = await LocalIamExtensionRegistryStore.createExtensionAsync(
      req.identityContext?.user_id,
      req.body as CreateIamExtensionPackageRequest,
    );
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM extension create error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM extension package',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/extensions/:extensionId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const record = await LocalIamExtensionRegistryStore.updateExtensionAsync(
      req.params.extensionId,
      req.identityContext?.user_id,
      req.body as UpdateIamExtensionPackageRequest,
    );
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM extension update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM extension package',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/providers', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  res.json(LocalIamExtensionRegistryStore.listProviders({
    interface_kind: normalizeHeaderValue(req.query.interface_kind as string | undefined) as IamExtensionInterfaceKind | null,
    extension_id: normalizeHeaderValue(req.query.extension_id as string | undefined),
    status: normalizeHeaderValue(req.query.status as string | undefined) as 'ACTIVE' | 'DRAFT' | 'DISABLED' | 'ARCHIVED' | null,
  }));
});

app.post('/api/v1/iam/providers', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const record = await LocalIamExtensionRegistryStore.createProviderAsync(
      req.identityContext?.user_id,
      req.body as CreateIamExtensionProviderRequest,
    );
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM extension provider create error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM extension provider',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/providers/:providerId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const record = await LocalIamExtensionRegistryStore.updateProviderAsync(
      req.params.providerId,
      req.identityContext?.user_id,
      req.body as UpdateIamExtensionProviderRequest,
    );
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM extension provider update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM extension provider',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/provider-bindings', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  res.json(LocalIamExtensionRegistryStore.listBindings({
    realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
    interface_kind: normalizeHeaderValue(req.query.interface_kind as string | undefined) as IamExtensionInterfaceKind | null,
    provider_id: normalizeHeaderValue(req.query.provider_id as string | undefined),
    status: normalizeHeaderValue(req.query.status as string | undefined) as 'ACTIVE' | 'DISABLED' | null,
  }));
});

app.post('/api/v1/iam/provider-bindings', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const record = await LocalIamExtensionRegistryStore.createBindingAsync(
      req.identityContext?.user_id,
      req.body as CreateIamExtensionBindingRequest,
    );
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM extension binding create error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM extension binding',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/provider-bindings/:bindingId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const record = await LocalIamExtensionRegistryStore.updateBindingAsync(
      req.params.bindingId,
      req.identityContext?.user_id,
      req.body as UpdateIamExtensionBindingRequest,
    );
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM extension binding update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM extension binding',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/webauthn/credentials', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamWebAuthnStore.listCredentials({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined) ?? undefined,
      user_id: normalizeHeaderValue(req.query.user_id as string | undefined) ?? undefined,
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM WebAuthn credential list error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM passkey credentials',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/security/summary', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    const authenticationSummary = LocalIamAuthenticationRuntimeStore.getSummary();
    const auditSummary = LocalIamSecurityAuditStore.getSummary();
    const foundationSummary = LocalIamFoundationStore.getSummary();
    const adminSecurityActionCount = foundationSummary.user_count > 0 ? 3 : 0;
    res.json({
      generated_at: new Date().toISOString(),
      failed_login_attempt_count: authenticationSummary.failed_login_attempt_count,
      active_lockout_count: authenticationSummary.active_lockout_count,
      request_audit: auditSummary,
      admin_security_actions: adminSecurityActionCount
    });
  } catch (error) {
    console.error(`[${req.correlationId}] IAM security summary error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM security summary',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/security/events', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    const outcome = normalizeHeaderValue(req.query.outcome as string | undefined) as 'SUCCESS' | 'FAILURE' | undefined;
    const realmId = normalizeHeaderValue(req.query.realm_id as string | undefined);
    const limit = req.query.limit ? Number.parseInt(String(req.query.limit), 10) : undefined;
    res.json(LocalIamSecurityAuditStore.listEvents({
      realmId: realmId ?? null,
      outcome: outcome ?? null,
      limit: Number.isFinite(limit) ? limit : null
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM security events error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM security events',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/security/validation', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    const authenticationSummary = LocalIamAuthenticationRuntimeStore.getSummary();
    const auditSummary = LocalIamSecurityAuditStore.getSummary();
    const protocolSummary = LocalIamProtocolRuntimeStore.getSummary();
    const foundationSummary = LocalIamFoundationStore.getSummary();
    const reviewSummary = LocalIamReviewRuntimeStore.getSummary();
    const hasFormalReview = reviewSummary.formal_review_count > 0;
    const adminSecurityActionCount = foundationSummary.user_count > 0 ? 3 : 0;
    const migrationState = hasFormalReview && foundationSummary.migration_state === 'BLOCKED_PENDING_STANDALONE_ADOPTION'
      ? 'BLOCKED_PENDING_STANDALONE_ADOPTION'
      : 'BLOCKED_PENDING_REVIEW_AND_STANDALONE_ADOPTION';
    res.json(LocalIamSecurityAuditStore.getValidationSummary({
      activeLockoutCount: authenticationSummary.active_lockout_count,
      failedLoginAttemptCount: authenticationSummary.failed_login_attempt_count,
      adminSecurityActionCount,
      requestAuditFailureCount: auditSummary.failure_count,
      requestAuditCount: auditSummary.request_count,
      hasStandaloneRuntime: foundationSummary.scope_model === 'STANDALONE_MULTI_REALM_WITH_CONSUMER_BINDINGS',
      hasTokenRevocation: protocolSummary.issued_token_count > 0,
      hasSessionRevocation: authenticationSummary.browser_session_count > 0,
      hasRealmExport: foundationSummary.realm_export_count > 0,
      migrationState,
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM validation summary error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM validation summary',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/operations/summary', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    const summary = LocalIamOperationsRuntimeStore.getSummary();
    const deployment = LocalIamDeploymentRuntimeStore.getSummary();
    const bootstrap = LocalIamStandaloneBootstrapStore.getSummary();
    const health = LocalIamHealthRuntimeStore.getHealthSummary();
    const benchmarks = LocalIamBenchmarkRuntimeStore.getSummary();
    const recovery = LocalIamRecoveryRuntimeStore.getSummary();
    res.json({
      ...summary,
      health: health.overall_status,
      deployment_profile_count: deployment.deployment_profile_count,
      active_deployment_topology_mode: deployment.active_topology_mode,
      bootstrap_package_count: bootstrap.bootstrap_package_count,
      benchmark_suite_count: benchmarks.benchmark_suite_count,
      benchmark_run_count: benchmarks.benchmark_run_count,
      recovery_profile_count: recovery.recovery_profile_count,
      recovery_drill_count: recovery.recovery_drill_count,
      standalone_health_check_count: health.count
    });
  } catch (error) {
    console.error(`[${req.correlationId}] IAM operations summary error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM operations summary',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/operations/diagnostics', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    const diagnostics = LocalIamOperationsRuntimeStore.getDiagnostics();
    const deployment = LocalIamDeploymentRuntimeStore.getSummary();
    const bootstrap = LocalIamStandaloneBootstrapStore.getSummary();
    const health = LocalIamHealthRuntimeStore.getHealthSummary();
    const benchmarks = LocalIamBenchmarkRuntimeStore.getSummary();
    const recovery = LocalIamRecoveryRuntimeStore.getSummary();
    res.json({
      ...diagnostics,
      health: health.overall_status,
      counts: {
        ...diagnostics.counts,
        deployment_resources: deployment.resource_count,
        bootstrap_packages: bootstrap.bootstrap_package_count,
        benchmark_runs: benchmarks.benchmark_run_count,
        recovery_drills: recovery.recovery_drill_count,
        health_checks: health.count
      },
      advisories: health.advisories
    });
  } catch (error) {
    console.error(`[${req.correlationId}] IAM operations diagnostics error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM operations diagnostics',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/operations/backups', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamOperationsRuntimeStore.listBackups());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM backup list error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM backups',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/operations/backups', requireGlobalPermission({
  any_of: ['iam.manage']
}), async (req, res) => {
  try {
    res.status(201).json(await LocalIamOperationsRuntimeStore.createBackupAsync(req.userId, {
      label: typeof req.body?.label === 'string' ? req.body.label : null,
      idempotency_key: normalizeHeaderValue(req.header('Idempotency-Key')),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM backup create error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create IAM backup'
    const statusCode = errorMessage.includes('already in progress') ? 409 : 500
    res.status(statusCode).json({
      error: errorMessage,
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/operations/restores', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamOperationsRuntimeStore.listRestores());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM restore list error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM restore records',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/operations/restores', requireGlobalPermission({
  any_of: ['iam.manage']
}), async (req, res) => {
  try {
    const backupId = normalizeHeaderValue(req.body?.backup_id);
    const modeValue = normalizeHeaderValue(req.body?.mode)?.toUpperCase();
    if (!backupId) {
      res.status(400).json({
        error: 'backup_id is required',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString()
      });
      return;
    }
    if (modeValue !== 'DRY_RUN' && modeValue !== 'EXECUTE') {
      res.status(400).json({
        error: 'mode must be DRY_RUN or EXECUTE',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString()
      });
      return;
    }
    res.status(201).json(await LocalIamOperationsRuntimeStore.restoreBackupAsync(
      req.userId,
      backupId,
      modeValue,
      {
        idempotency_key: normalizeHeaderValue(req.header('Idempotency-Key')),
      }
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM restore error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to restore IAM backup'
    const statusCode = errorMessage.includes('already in progress') ? 409 : 500
    res.status(statusCode).json({
      error: errorMessage,
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/operations/keys', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    const realmId = normalizeHeaderValue(req.query.realm_id as string | undefined);
    res.json(LocalIamProtocolRuntimeStore.listSigningKeys({
      realm_id: realmId === 'global' ? null : (realmId ?? undefined)
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM signing key list error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM signing keys',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/operations/keys/rotate', requireGlobalPermission({
  any_of: ['iam.manage']
}), async (req, res) => {
  try {
    const realmId = normalizeHeaderValue(req.body?.realm_id);
    res.status(201).json(await LocalIamOperationsRuntimeStore.rotateSigningKeyAsync(
      req.userId,
      realmId === 'global' ? null : (realmId ?? null),
      {
        idempotency_key: normalizeHeaderValue(req.header('Idempotency-Key')),
      }
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM signing key rotation error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to rotate IAM signing key'
    const statusCode = errorMessage.includes('already in progress') ? 409 : 500
    res.status(statusCode).json({
      error: errorMessage,
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/operations/keys/rotations', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamOperationsRuntimeStore.listSigningKeyRotations());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM signing key rotation list error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM signing key rotations',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/operations/transient-state-maintenance', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamOperationsRuntimeStore.listTransientStateMaintenanceRuns());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM transient maintenance list error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM transient state maintenance runs',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/operations/transient-state-maintenance/run', requireGlobalPermission({
  any_of: ['iam.manage']
}), async (req, res) => {
  try {
    res.status(201).json(await LocalIamOperationsRuntimeStore.runTransientStateMaintenanceAsync(req.userId, {
      idempotency_key: normalizeHeaderValue(req.header('Idempotency-Key')),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM transient maintenance run error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to run IAM transient state maintenance'
    const statusCode = errorMessage.includes('already in progress') ? 409 : 500
    res.status(statusCode).json({
      error: errorMessage,
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/operations/resilience', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamOperationsRuntimeStore.listResilienceRuns());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM resilience list error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM resilience runs',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/operations/resilience/run', requireGlobalPermission({
  any_of: ['iam.manage']
}), async (req, res) => {
  try {
    res.status(201).json(await LocalIamOperationsRuntimeStore.runResilienceSuiteAsync(req.userId, {
      idempotency_key: normalizeHeaderValue(req.header('Idempotency-Key')),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM resilience run error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to run IAM resilience suite'
    const statusCode = errorMessage.includes('already in progress') ? 409 : 500
    res.status(statusCode).json({
      error: errorMessage,
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/operations/readiness-review', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamOperationsRuntimeStore.getReadinessReview());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM readiness review error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM readiness review',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/operations/readiness-review', requireGlobalPermission({
  any_of: ['iam.manage']
}), async (req, res) => {
  try {
    const notes = Array.isArray(req.body?.notes)
      ? req.body.notes.filter((note: unknown): note is string => typeof note === 'string')
      : [];
    res.status(201).json(await LocalIamOperationsRuntimeStore.recordReadinessReviewAsync(
      req.userId,
      {
        notes,
        idempotency_key: normalizeHeaderValue(req.header('Idempotency-Key')),
      }
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM readiness review record error:`, error);
    res.status(500).json({
      error: 'Failed to record IAM readiness review',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/operations/deployment', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamDeploymentRuntimeStore.getDeploymentProfile());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM deployment profile error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM deployment profile',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/operations/deployment', requireGlobalPermission({
  any_of: ['iam.manage']
}), async (req, res) => {
  try {
    const topologyMode = normalizeHeaderValue(req.body?.topology_mode) as IamDeploymentTopologyMode | undefined;
    if (
      topologyMode &&
      topologyMode !== 'AWS_SINGLE_REGION_COST_OPTIMIZED' &&
      topologyMode !== 'AWS_SINGLE_REGION_HA' &&
      topologyMode !== 'AWS_MULTI_REGION_WARM_STANDBY'
    ) {
      res.status(400).json({
        error: 'Unsupported topology_mode',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.json(await LocalIamDeploymentRuntimeStore.updateDeploymentProfileAsync(req.userId, {
      name: typeof req.body?.name === 'string' ? req.body.name : undefined,
      summary: typeof req.body?.summary === 'string' ? req.body.summary : undefined,
      topology_mode: topologyMode,
      regions: Array.isArray(req.body?.regions)
        ? req.body.regions.filter((value: unknown): value is string => typeof value === 'string')
        : undefined,
      estimated_monthly_cost_band: typeof req.body?.estimated_monthly_cost_band === 'string'
        ? req.body.estimated_monthly_cost_band
        : undefined,
      operator_notes: Array.isArray(req.body?.operator_notes)
        ? req.body.operator_notes.filter((value: unknown): value is string => typeof value === 'string')
        : undefined
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM deployment profile update error:`, error);
    res.status(500).json({
      error: 'Failed to update IAM deployment profile',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/operations/bootstrap', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamStandaloneBootstrapStore.getBootstrapPackage());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM bootstrap package error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM bootstrap package',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/operations/bootstrap/regenerate', requireGlobalPermission({
  any_of: ['iam.manage']
}), async (req, res) => {
  try {
    res.status(201).json(await LocalIamStandaloneBootstrapStore.regenerateBootstrapPackageAsync(
      req.userId,
      {
        idempotency_key: normalizeHeaderValue(req.header('Idempotency-Key')),
      }
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM bootstrap package regenerate error:`, error);
    res.status(500).json({
      error: 'Failed to regenerate IAM bootstrap package',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/operations/health', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamHealthRuntimeStore.getHealthSummary());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM health summary error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM health summary',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/operations/benchmarks', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamBenchmarkRuntimeStore.getCatalog());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM benchmark catalog error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM benchmark catalog',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/operations/benchmarks/run', requireGlobalPermission({
  any_of: ['iam.manage']
}), async (req, res) => {
  try {
    const suiteId = normalizeHeaderValue(req.body?.suite_id);
    res.status(201).json(await LocalIamBenchmarkRuntimeStore.runSuiteAsync(req.userId, suiteId, {
      idempotency_key: normalizeHeaderValue(req.header('Idempotency-Key')),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM benchmark run error:`, error);
    res.status(500).json({
      error: 'Failed to run IAM benchmark suite',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/operations/recovery', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamRecoveryRuntimeStore.getRecoveryProfile());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM recovery profile error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM recovery profile',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/operations/recovery/drills', requireGlobalPermission({
  any_of: ['iam.manage']
}), async (req, res) => {
  try {
    const backupId = normalizeHeaderValue(req.body?.backup_id);
    res.status(201).json(await LocalIamRecoveryRuntimeStore.runRecoveryDrillAsync(req.userId, {
      backup_id: backupId,
      idempotency_key: normalizeHeaderValue(req.header('Idempotency-Key')),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM recovery drill error:`, error);
    res.status(500).json({
      error: 'Failed to run IAM recovery drill',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/review/summary', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamReviewRuntimeStore.getSummary());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM review summary error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM review summary',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/review/standards-matrix', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamReviewRuntimeStore.getStandardsMatrix());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM standards matrix error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM standards matrix',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/review/interoperability', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamReviewRuntimeStore.getInteroperabilityReview());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM interoperability review error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM interoperability review',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/review/differentiation', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamReviewRuntimeStore.getDifferentiationReview());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM differentiation review error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM differentiation review',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/review/formal', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamReviewRuntimeStore.getFormalReview());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM formal review error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM formal review',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/review/formal', requireGlobalPermission({
  any_of: ['iam.manage']
}), async (req, res) => {
  try {
    const notes = Array.isArray(req.body?.notes)
      ? req.body.notes.filter((note: unknown): note is string => typeof note === 'string')
      : [];
    res.status(201).json(await LocalIamReviewRuntimeStore.recordFormalReviewAsync(
      req.userId,
      notes,
      {
        idempotency_key: normalizeHeaderValue(req.header('Idempotency-Key')),
      }
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM formal review record error:`, error);
    res.status(500).json({
      error: 'Failed to record IAM formal review',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/public/catalog', async (req, res) => {
  try {
    res.json(LocalIamAuthenticationRuntimeStore.getPublicCatalog());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM public catalog error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM public catalog',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/experience', async (req, res) => {
  try {
    res.json(LocalIamExperienceRuntimeStore.getRealmExperience(req.params.realmId));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM realm experience error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM realm experience',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/brokers', async (req, res) => {
  try {
    res.json(LocalIamFederationRuntimeStore.listRealmBrokers(req.params.realmId));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM broker catalog error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM broker catalog',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/brokers/:providerAlias/login', async (req, res) => {
  try {
    const externalIdentity = req.body?.external_identity && typeof req.body.external_identity === 'object'
      ? {
          subject: normalizeHeaderValue(req.body.external_identity.subject) ?? '',
          username: normalizeHeaderValue(req.body.external_identity.username) ?? '',
          email: normalizeHeaderValue(req.body.external_identity.email) ?? '',
          first_name: normalizeHeaderValue(req.body.external_identity.first_name) ?? '',
          last_name: normalizeHeaderValue(req.body.external_identity.last_name) ?? '',
          group_names: Array.isArray(req.body.external_identity.group_names)
            ? req.body.external_identity.group_names.map((value: string) => normalizeHeaderValue(value) ?? '').filter(Boolean)
            : [],
          role_names: Array.isArray(req.body.external_identity.role_names)
            ? req.body.external_identity.role_names.map((value: string) => normalizeHeaderValue(value) ?? '').filter(Boolean)
            : [],
          issuer_url: normalizeHeaderValue(req.body.external_identity.issuer_url),
          raw_attributes: req.body.external_identity.raw_attributes && typeof req.body.external_identity.raw_attributes === 'object'
            ? Object.fromEntries(
                Object.entries(req.body.external_identity.raw_attributes).map(([key, value]) => [
                  key,
                  Array.isArray(value)
                    ? value.map((item: string) => normalizeHeaderValue(item) ?? '').filter(Boolean)
                    : normalizeHeaderValue(value as string) ?? '',
                ]),
              )
            : undefined,
          scopes: Array.isArray(req.body.external_identity.scopes)
            ? req.body.external_identity.scopes.map((value: string) => normalizeHeaderValue(value) ?? '').filter(Boolean)
            : undefined,
          saml_assertion: req.body.external_identity.saml_assertion && typeof req.body.external_identity.saml_assertion === 'object'
            ? {
                name_id: normalizeHeaderValue(req.body.external_identity.saml_assertion.name_id),
                attributes: req.body.external_identity.saml_assertion.attributes && typeof req.body.external_identity.saml_assertion.attributes === 'object'
                  ? Object.fromEntries(
                      Object.entries(req.body.external_identity.saml_assertion.attributes).map(([key, value]) => [
                        key,
                        Array.isArray(value)
                          ? value.map((item: string) => normalizeHeaderValue(item) ?? '').filter(Boolean)
                          : normalizeHeaderValue(value as string) ?? '',
                      ]),
                    )
                  : undefined,
              }
            : undefined,
        }
      : null;
    const response = await LocalIamFederationRuntimeStore.brokerLoginAsync(req.params.realmId, req.params.providerAlias, {
      external_username_or_email: normalizeHeaderValue(req.body?.external_username_or_email) ?? '',
      client_id: normalizeHeaderValue(req.body?.client_id),
      scope: Array.isArray(req.body?.scope)
        ? req.body.scope.map((value: string) => normalizeHeaderValue(value) ?? '').filter(Boolean)
        : typeof req.body?.scope === 'string'
          ? req.body.scope.split(/\s+/).map((value: string) => value.trim()).filter(Boolean)
          : [],
      external_identity: externalIdentity,
    });
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: response.user.id,
      action: 'IAM_BROKER_LOGIN_COMPLETED',
      entityType: 'iam_account_session',
      entityId: response.session_id ?? response.login_transaction_id ?? response.user.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/brokers/:providerAlias/login',
      correlationId: req.correlationId,
      summary: `Completed brokered IAM login for ${response.user.username}.`,
      metadata: {
        realm_id: req.params.realmId,
        provider_alias: req.params.providerAlias,
        next_step: response.next_step,
        client_id: response.client?.client_id ?? null,
      }
    });
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM broker login error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to complete IAM broker login',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/login', async (req, res) => {
  try {
    const response = await LocalIamAuthenticationRuntimeStore.loginAsync(req.params.realmId, {
      username: normalizeHeaderValue(req.body?.username) ?? '',
      password: normalizeHeaderValue(req.body?.password) ?? '',
      client_id: normalizeHeaderValue(req.body?.client_id),
      scope: Array.isArray(req.body?.scope)
        ? req.body.scope.map((value: string) => normalizeHeaderValue(value) ?? '').filter(Boolean)
        : typeof req.body?.scope === 'string'
          ? req.body.scope.split(/\s+/).map((value: string) => value.trim()).filter(Boolean)
          : [],
    });
    if (response.next_step === 'AUTHENTICATED') {
      LocalAdminAuditStore.record({
        tenantId: IAM_PLATFORM_SCOPE_ID,
        actorUserId: response.user.id,
        action: 'IAM_BROWSER_LOGIN_COMPLETED',
        entityType: 'iam_account_session',
        entityId: response.session_id ?? response.user.id,
        sourceRoute: '/api/v1/iam/realms/:realmId/login',
        correlationId: req.correlationId,
        summary: `Completed IAM browser login for ${response.user.username}.`,
        metadata: {
          realm_id: req.params.realmId,
          client_id: response.client?.client_id ?? null,
          pending_scope_consent: response.pending_scope_consent,
          assurance_level: 'PASSWORD'
        }
      });
    }
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM login error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to perform IAM login',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/login/passkey/begin', async (req, res) => {
  try {
    const request: BeginIamWebAuthnAuthenticationInput = {
      username_or_email: normalizeHeaderValue(req.body?.username_or_email) ?? '',
      client_id: normalizeHeaderValue(req.body?.client_id) ?? undefined,
      scope: Array.isArray(req.body?.scope)
        ? req.body.scope.map((value: string) => normalizeHeaderValue(value) ?? '').filter(Boolean)
        : typeof req.body?.scope === 'string'
          ? req.body.scope.split(/\s+/).map((value: string) => value.trim()).filter(Boolean)
          : [],
    };
    const response = await LocalIamWebAuthnStore.beginAuthenticationAsync(
      req.params.realmId,
      request,
      LocalIamWebAuthnStore.deriveRpProfile(getLocalApiBaseUrl(req)),
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: response.user_id,
      action: 'IAM_PASSKEY_AUTHENTICATION_STARTED',
      entityType: 'iam_passkey_challenge',
      entityId: response.challenge_id,
      sourceRoute: '/api/v1/iam/realms/:realmId/login/passkey/begin',
      correlationId: req.correlationId,
      summary: `Started IAM passkey authentication for ${response.username}.`,
      metadata: {
        realm_id: req.params.realmId,
        client_id: response.client_id,
        allowed_credential_count: response.allowed_credentials.length,
        requested_scope_names: response.requested_scope_names,
        expires_at: response.expires_at,
      }
    });
    res.status(201).json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM passkey begin error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to begin IAM passkey authentication',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/login/passkey/complete', async (req, res) => {
  try {
    const request: CompleteIamWebAuthnAuthenticationInput = {
      challenge_id: normalizeHeaderValue(req.body?.challenge_id) ?? '',
      credential_id: normalizeHeaderValue(req.body?.credential_id) ?? '',
      user_verification: normalizeHeaderValue(req.body?.user_verification) as 'REQUIRED' | 'PREFERRED' | 'DISCOURAGED' | null,
      rp_id: normalizeHeaderValue(req.body?.rp_id) ?? '',
      origin: normalizeHeaderValue(req.body?.origin) ?? '',
      proof_signature: normalizeHeaderValue(req.body?.proof_signature) ?? '',
    };
    const authentication = await LocalIamWebAuthnStore.completeAuthenticationAsync(req.params.realmId, request);
    const response = await LocalIamAuthenticationRuntimeStore.completePasskeyLoginAsync(req.params.realmId, authentication.user_id, {
      client_id: authentication.client_id,
      scope: authentication.requested_scope_names,
    });
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: authentication.user_id,
      action: 'IAM_BROWSER_LOGIN_COMPLETED',
      entityType: 'iam_account_session',
      entityId: response.session_id ?? authentication.user_id,
      sourceRoute: '/api/v1/iam/realms/:realmId/login/passkey/complete',
      correlationId: req.correlationId,
      summary: `Completed IAM passkey login for ${authentication.username}.`,
      metadata: {
        realm_id: req.params.realmId,
        client_id: response.client?.client_id ?? authentication.client_id ?? null,
        credential_id: authentication.credential_id,
        assurance_level: 'PASSKEY',
      }
    });
    res.json(response);
  } catch (error) {
    const challengeId = normalizeHeaderValue(req.body?.challenge_id) ?? '';
    if (challengeId) {
      const challengeContext = LocalIamWebAuthnStore.getAuthenticationChallengeContext(req.params.realmId, challengeId);
      if (challengeContext) {
        const lockout = await LocalIamAuthenticationRuntimeStore.recordFailedPasskeyLoginAsync(req.params.realmId, challengeContext.user_id, {
          username_or_email: challengeContext.username_or_email,
          client_id: challengeContext.client_id,
        });
        if (lockout.lockout_until && error instanceof Error && !error.message.includes('temporarily locked')) {
          error = new Error(`Account is temporarily locked until ${lockout.lockout_until}`);
        }
      }
    }
    console.error(`[${req.correlationId}] IAM passkey complete error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to complete IAM passkey authentication',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/login/required-actions', async (req, res) => {
  try {
    const response = await LocalIamAuthenticationRuntimeStore.completeRequiredActionsAsync(req.params.realmId, {
      login_transaction_id: normalizeHeaderValue(req.body?.login_transaction_id) ?? '',
      first_name: normalizeHeaderValue(req.body?.first_name) ?? undefined,
      last_name: normalizeHeaderValue(req.body?.last_name) ?? undefined,
      email: normalizeHeaderValue(req.body?.email) ?? undefined,
      new_password: normalizeHeaderValue(req.body?.new_password) ?? undefined,
    });
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: response.user.id,
      action: 'IAM_REQUIRED_ACTIONS_COMPLETED',
      entityType: 'iam_login_transaction',
      entityId: response.login_transaction_id ?? response.user.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/login/required-actions',
      correlationId: req.correlationId,
      summary: `Completed IAM required actions for ${response.user.username}.`,
      metadata: {
        realm_id: req.params.realmId,
        next_step: response.next_step,
        remaining_required_actions: response.pending_required_actions
      }
    });
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM required-actions error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to complete IAM required actions',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/login/consent', async (req, res) => {
  try {
    const response = await LocalIamAuthenticationRuntimeStore.grantConsentAsync(req.params.realmId, {
      login_transaction_id: normalizeHeaderValue(req.body?.login_transaction_id) ?? '',
      approve: Boolean(req.body?.approve),
    });
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: response.user.id,
      action: 'IAM_CONSENT_GRANTED',
      entityType: 'iam_login_transaction',
      entityId: response.login_transaction_id ?? response.user.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/login/consent',
      correlationId: req.correlationId,
      summary: `Granted IAM client consent for ${response.user.username}.`,
      metadata: {
        realm_id: req.params.realmId,
        client_id: response.client?.client_id ?? null,
        next_step: response.next_step
      }
    });
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM consent error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to record IAM consent',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/login/mfa', async (req, res) => {
  try {
    const response = await LocalIamAuthenticationRuntimeStore.verifyLoginMfaAsync(req.params.realmId, {
      login_transaction_id: normalizeHeaderValue(req.body?.login_transaction_id) ?? '',
      code: normalizeHeaderValue(req.body?.code) ?? '',
    });
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: response.user.id,
      action: 'IAM_BROWSER_LOGIN_COMPLETED',
      entityType: 'iam_account_session',
      entityId: response.session_id ?? response.user.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/login/mfa',
      correlationId: req.correlationId,
      summary: `Completed IAM MFA login for ${response.user.username}.`,
      metadata: {
        realm_id: req.params.realmId,
        client_id: response.client?.client_id ?? null,
        assurance_level: 'MFA'
      }
    });
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM MFA login error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to verify IAM MFA login',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/password-reset/request', async (req, res) => {
  try {
    const response = await LocalIamAuthenticationRuntimeStore.requestPasswordResetAsync(req.params.realmId, {
      username_or_email: normalizeHeaderValue(req.body?.username_or_email) ?? '',
    });
    const user = LocalIamFoundationStore.listUsers({ realm_id: req.params.realmId }).users.find((candidate) => candidate.id === response.user_id) ?? null;
    if (user) {
      LocalIamExperienceRuntimeStore.recordNotificationDelivery(
        response.user_id,
        req.params.realmId,
        'PASSWORD_RESET',
        response.user_id,
        user.email,
        {
          code: response.code_preview,
        }
      );
    }
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: response.user_id,
      action: 'IAM_PASSWORD_RESET_REQUESTED',
      entityType: 'iam_password_reset_ticket',
      entityId: response.ticket_id,
      sourceRoute: '/api/v1/iam/realms/:realmId/password-reset/request',
      correlationId: req.correlationId,
      summary: 'Issued IAM password reset challenge.',
      metadata: {
        realm_id: req.params.realmId,
        delivery_mode: response.delivery_mode,
        expires_at: response.expires_at
      }
    });
    res.status(201).json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM password-reset request error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to issue IAM password reset ticket',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/password-reset/confirm', async (req, res) => {
  try {
    const response = await LocalIamAuthenticationRuntimeStore.confirmPasswordResetAsync(req.params.realmId, {
      ticket_id: normalizeHeaderValue(req.body?.ticket_id) ?? '',
      code: normalizeHeaderValue(req.body?.code) ?? '',
      new_password: normalizeHeaderValue(req.body?.new_password) ?? '',
    });
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: response.user_id,
      action: 'IAM_PASSWORD_RESET_COMPLETED',
      entityType: 'iam_user',
      entityId: response.user_id,
      sourceRoute: '/api/v1/iam/realms/:realmId/password-reset/confirm',
      correlationId: req.correlationId,
      summary: 'Completed IAM password reset.',
      metadata: {
        realm_id: req.params.realmId,
        password_updated_at: response.password_updated_at
      }
    });
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM password-reset confirm error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to complete IAM password reset',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/email-verification/request', async (req, res) => {
  try {
    const response = await LocalIamAuthenticationRuntimeStore.requestEmailVerificationAsync(req.params.realmId, {
      username_or_email: normalizeHeaderValue(req.body?.username_or_email) ?? '',
    });
    const user = LocalIamFoundationStore.listUsers({ realm_id: req.params.realmId }).users.find((candidate) => candidate.id === response.user_id) ?? null;
    if (user) {
      LocalIamExperienceRuntimeStore.recordNotificationDelivery(
        response.user_id,
        req.params.realmId,
        'EMAIL_VERIFICATION',
        response.user_id,
        user.email,
        {
          code: response.code_preview,
        }
      );
    }
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: response.user_id,
      action: 'IAM_EMAIL_VERIFICATION_REQUESTED',
      entityType: 'iam_email_verification_ticket',
      entityId: response.ticket_id,
      sourceRoute: '/api/v1/iam/realms/:realmId/email-verification/request',
      correlationId: req.correlationId,
      summary: 'Issued IAM email verification challenge.',
      metadata: {
        realm_id: req.params.realmId,
        delivery_mode: response.delivery_mode,
        expires_at: response.expires_at
      }
    });
    res.status(201).json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM email-verification request error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to issue IAM email verification ticket',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/email-verification/confirm', async (req, res) => {
  try {
    const response = await LocalIamAuthenticationRuntimeStore.confirmEmailVerificationAsync(req.params.realmId, {
      ticket_id: normalizeHeaderValue(req.body?.ticket_id) ?? '',
      code: normalizeHeaderValue(req.body?.code) ?? '',
    });
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: response.user_id,
      action: 'IAM_EMAIL_VERIFIED',
      entityType: 'iam_user',
      entityId: response.user_id,
      sourceRoute: '/api/v1/iam/realms/:realmId/email-verification/confirm',
      correlationId: req.correlationId,
      summary: 'Completed IAM email verification.',
      metadata: {
        realm_id: req.params.realmId,
        email_verified_at: response.email_verified_at
      }
    });
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM email-verification confirm error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to confirm IAM email verification',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/logout', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(req.params.realmId, sessionId);
    const response = await LocalIamAuthenticationRuntimeStore.logoutAsync(req.params.realmId, sessionId);
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: sessionContext.user.id,
      action: 'IAM_ACCOUNT_LOGOUT',
      entityType: 'iam_account_session',
      entityId: sessionId,
      sourceRoute: '/api/v1/iam/realms/:realmId/logout',
      correlationId: req.correlationId,
      summary: 'Logged out IAM account session.',
      metadata: {
        realm_id: req.params.realmId,
        revoked_at: response.revoked_at
      }
    });
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM logout error:`, error);
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Failed to logout IAM session',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/account/session', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    res.json(await LocalIamAuthenticationRuntimeStore.resolveAccountSessionAsync(req.params.realmId, sessionId));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM account session error:`, error);
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Failed to resolve IAM account session',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/account/profile', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    res.json(LocalIamAuthenticationRuntimeStore.getAccountProfile(req.params.realmId, sessionId));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM account profile error:`, error);
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM account profile',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/realms/:realmId/account/profile', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    const response = await LocalIamAuthenticationRuntimeStore.updateAccountProfileAsync(req.params.realmId, sessionId, {
      first_name: normalizeHeaderValue(req.body?.first_name) ?? undefined,
      last_name: normalizeHeaderValue(req.body?.last_name) ?? undefined,
      email: normalizeHeaderValue(req.body?.email) ?? undefined,
      attributes: req.body?.attributes && typeof req.body.attributes === 'object'
        ? req.body.attributes as Record<string, string | number | boolean | null | Array<string | number | boolean | null>>
        : undefined,
    });
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: response.user.id,
      action: 'IAM_ACCOUNT_PROFILE_UPDATED',
      entityType: 'iam_user',
      entityId: response.user.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/account/profile',
      correlationId: req.correlationId,
      summary: 'Updated IAM account profile.',
      metadata: {
        realm_id: req.params.realmId,
        email_verified_at: response.email_verified_at,
        pending_required_actions: response.pending_required_actions
      }
    });
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM account profile update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM account profile',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/account/organizations', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(req.params.realmId, sessionId);
    res.json(LocalIamOrganizationStore.listAccountOrganizations(req.params.realmId, sessionContext.user.id));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM account organizations error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM account organizations',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/account/organization-invitations/:invitationId/accept', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(req.params.realmId, sessionId);
    const membership = await LocalIamOrganizationStore.acceptInvitationAsync(
      req.params.realmId,
      req.params.invitationId,
      sessionContext.user.id,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: sessionContext.user.id,
      action: 'IAM_ORGANIZATION_INVITATION_ACCEPTED',
      entityType: 'iam_organization_membership',
      entityId: membership.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/account/organization-invitations/:invitationId/accept',
      correlationId: req.correlationId,
      summary: 'Accepted IAM organization invitation.',
      metadata: {
        realm_id: req.params.realmId,
        organization_id: membership.organization_id,
        role: membership.role,
      }
    });
    res.status(201).json(membership);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM account organization invitation accept error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to accept IAM organization invitation',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/account/security', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    res.json(LocalIamAuthenticationRuntimeStore.getAccountSecurity(req.params.realmId, sessionId));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM account security error:`, error);
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM account security',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/account/webauthn/register/begin', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(req.params.realmId, sessionId);
    const response = await LocalIamWebAuthnStore.beginRegistrationAsync(
      req.params.realmId,
      sessionContext.user.id,
      LocalIamWebAuthnStore.deriveRpProfile(getLocalApiBaseUrl(req)),
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: sessionContext.user.id,
      action: 'IAM_PASSKEY_REGISTRATION_STARTED',
      entityType: 'iam_passkey_challenge',
      entityId: response.challenge_id,
      sourceRoute: '/api/v1/iam/realms/:realmId/account/webauthn/register/begin',
      correlationId: req.correlationId,
      summary: 'Started IAM passkey enrollment.',
      metadata: {
        realm_id: req.params.realmId,
        expires_at: response.expires_at,
      }
    });
    res.status(201).json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM passkey registration begin error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to begin IAM passkey enrollment',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/account/webauthn/register/complete', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(req.params.realmId, sessionId);
    const response = await LocalIamWebAuthnStore.completeRegistrationAsync(
      req.params.realmId,
      sessionContext.user.id,
      {
        challenge_id: normalizeHeaderValue(req.body?.challenge_id) ?? '',
        credential_id: normalizeHeaderValue(req.body?.credential_id) ?? '',
        device_label: normalizeHeaderValue(req.body?.device_label) ?? '',
        public_key_jwk: req.body?.public_key_jwk && typeof req.body.public_key_jwk === 'object'
          ? req.body.public_key_jwk as Record<string, unknown>
          : {},
        algorithm: (normalizeHeaderValue(req.body?.algorithm) as 'ES256' | null) ?? 'ES256',
        transports: Array.isArray(req.body?.transports)
          ? req.body.transports.map((value: string) => normalizeHeaderValue(value) ?? '').filter(Boolean) as Array<'SOFTWARE' | 'INTERNAL' | 'HYBRID' | 'USB' | 'NFC' | 'BLE'>
          : undefined,
        authenticator_attachment: normalizeHeaderValue(req.body?.authenticator_attachment) as 'PLATFORM' | 'CROSS_PLATFORM' | null,
        user_verification: normalizeHeaderValue(req.body?.user_verification) as 'REQUIRED' | 'PREFERRED' | 'DISCOURAGED' | null,
        rp_id: normalizeHeaderValue(req.body?.rp_id) ?? '',
        origin: normalizeHeaderValue(req.body?.origin) ?? '',
        proof_signature: normalizeHeaderValue(req.body?.proof_signature) ?? '',
      },
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: sessionContext.user.id,
      action: 'IAM_PASSKEY_REGISTERED',
      entityType: 'iam_passkey_credential',
      entityId: response.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/account/webauthn/register/complete',
      correlationId: req.correlationId,
      summary: 'Completed IAM passkey enrollment.',
      metadata: {
        realm_id: req.params.realmId,
        credential_id: response.credential_id,
        device_label: response.device_label,
      }
    });
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM passkey registration complete error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to complete IAM passkey enrollment',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/account/webauthn/credentials', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(req.params.realmId, sessionId);
    res.json(LocalIamWebAuthnStore.listCredentials({
      realm_id: req.params.realmId,
      user_id: sessionContext.user.id,
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM passkey credential list error:`, error);
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM passkey credentials',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/account/webauthn/credentials/:credentialId/revoke', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(req.params.realmId, sessionId);
    const response = await LocalIamWebAuthnStore.revokeCredentialAsync(
      req.params.realmId,
      sessionContext.user.id,
      req.params.credentialId,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: sessionContext.user.id,
      action: 'IAM_PASSKEY_REVOKED',
      entityType: 'iam_passkey_credential',
      entityId: response.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/account/webauthn/credentials/:credentialId/revoke',
      correlationId: req.correlationId,
      summary: 'Revoked IAM passkey credential.',
      metadata: {
        realm_id: req.params.realmId,
        credential_id: response.credential_id,
        device_label: response.device_label,
      }
    });
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM passkey revoke error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to revoke IAM passkey credential',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/account/password', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(req.params.realmId, sessionId);
    const response = await LocalIamAuthenticationRuntimeStore.changePasswordAsync(req.params.realmId, sessionId, {
      current_password: normalizeHeaderValue(req.body?.current_password) ?? '',
      new_password: normalizeHeaderValue(req.body?.new_password) ?? '',
    });
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: sessionContext.user.id,
      action: 'IAM_ACCOUNT_PASSWORD_UPDATED',
      entityType: 'iam_user',
      entityId: sessionContext.user.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/account/password',
      correlationId: req.correlationId,
      summary: 'Updated IAM account password.',
      metadata: {
        realm_id: req.params.realmId,
        password_updated_at: response.password_updated_at
      }
    });
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM account password error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM account password',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/account/mfa/enroll', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(req.params.realmId, sessionId);
    const response = await LocalIamAuthenticationRuntimeStore.beginMfaEnrollmentAsync(req.params.realmId, sessionId);
    LocalIamExperienceRuntimeStore.recordNotificationDelivery(
      sessionContext.user.id,
      req.params.realmId,
      'MFA_ENROLLMENT',
      sessionContext.user.id,
      sessionContext.user.email,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: sessionContext.user.id,
      action: 'IAM_MFA_ENROLLMENT_STARTED',
      entityType: 'iam_mfa_enrollment',
      entityId: response.enrollment_id,
      sourceRoute: '/api/v1/iam/realms/:realmId/account/mfa/enroll',
      correlationId: req.correlationId,
      summary: 'Started IAM MFA enrollment.',
      metadata: {
        realm_id: req.params.realmId,
        expires_at: response.expires_at
      }
    });
    res.status(201).json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM MFA enrollment error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to start IAM MFA enrollment',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/account/mfa/verify', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(req.params.realmId, sessionId);
    const response = await LocalIamAuthenticationRuntimeStore.verifyMfaEnrollmentAsync(req.params.realmId, sessionId, {
      enrollment_id: normalizeHeaderValue(req.body?.enrollment_id) ?? '',
      code: normalizeHeaderValue(req.body?.code) ?? '',
    });
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: sessionContext.user.id,
      action: 'IAM_MFA_ENABLED',
      entityType: 'iam_user',
      entityId: sessionContext.user.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/account/mfa/verify',
      correlationId: req.correlationId,
      summary: 'Enabled IAM MFA for account.',
      metadata: {
        realm_id: req.params.realmId,
        totp_reference_id: response.totp_reference_id,
        backup_codes_reference_id: response.backup_codes_reference_id
      }
    });
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM MFA verify error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to verify IAM MFA enrollment',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/account/mfa/disable', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(req.params.realmId, sessionId);
    const response = await LocalIamAuthenticationRuntimeStore.disableMfaAsync(req.params.realmId, sessionId, {
      code: normalizeHeaderValue(req.body?.code) ?? '',
    });
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: sessionContext.user.id,
      action: 'IAM_MFA_DISABLED',
      entityType: 'iam_user',
      entityId: sessionContext.user.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/account/mfa/disable',
      correlationId: req.correlationId,
      summary: 'Disabled IAM MFA for account.',
      metadata: {
        realm_id: req.params.realmId
      }
    });
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM MFA disable error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to disable IAM MFA',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/account/sessions', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    res.json(await LocalIamAuthenticationRuntimeStore.listAccountSessionsAsync(req.params.realmId, sessionId));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM account sessions error:`, error);
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM account sessions',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/account/sessions/:sessionId/revoke', async (req, res) => {
  const currentSessionId = requireIamAccountSessionId(req, res);
  if (!currentSessionId) {
    return;
  }
  try {
    const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(req.params.realmId, currentSessionId);
    const response = await LocalIamAuthenticationRuntimeStore.revokeAccountSessionAsync(
      req.params.realmId,
      currentSessionId,
      req.params.sessionId,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: sessionContext.user.id,
      action: 'IAM_ACCOUNT_SESSION_REVOKED',
      entityType: 'iam_account_session',
      entityId: req.params.sessionId,
      sourceRoute: '/api/v1/iam/realms/:realmId/account/sessions/:sessionId/revoke',
      correlationId: req.correlationId,
      summary: 'Revoked IAM account session.',
      metadata: {
        realm_id: req.params.realmId,
        revoked_at: response.revoked_at
      }
    });
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM account session revoke error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to revoke IAM account session',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/account/sessions/revoke-others', async (req, res) => {
  const currentSessionId = requireIamAccountSessionId(req, res);
  if (!currentSessionId) {
    return;
  }
  try {
    const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(req.params.realmId, currentSessionId);
    const response = await LocalIamAuthenticationRuntimeStore.revokeOtherAccountSessionsAsync(
      req.params.realmId,
      currentSessionId,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: sessionContext.user.id,
      action: 'IAM_ACCOUNT_OTHER_SESSIONS_REVOKED',
      entityType: 'iam_account_session',
      entityId: response.current_session_id,
      sourceRoute: '/api/v1/iam/realms/:realmId/account/sessions/revoke-others',
      correlationId: req.correlationId,
      summary: 'Revoked other IAM account sessions.',
      metadata: {
        realm_id: req.params.realmId,
        revoked_count: response.revoked_count
      }
    });
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM revoke-other-sessions error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to revoke other IAM account sessions',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/account/consents', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    res.json(LocalIamAuthenticationRuntimeStore.listAccountConsents(req.params.realmId, sessionId));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM account consents error:`, error);
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM account consents',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/account/delegated-relationships', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    res.json(LocalIamAuthenticationRuntimeStore.listAccountDelegatedRelationships(req.params.realmId, sessionId, {
      status: normalizeHeaderValue(req.query.status as string | undefined) as 'ACTIVE' | 'PAUSED' | 'REVOKED' | 'EXPIRED' | undefined,
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM account delegated relationships error:`, error);
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM account delegated relationships',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/account/delegated-consents', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    res.json(LocalIamAuthenticationRuntimeStore.listAccountDelegatedConsents(req.params.realmId, sessionId, {
      relationship_id: normalizeHeaderValue(req.query.relationship_id as string | undefined) ?? undefined,
      status: normalizeHeaderValue(req.query.status as string | undefined) as 'ACTIVE' | 'REVOKED' | undefined,
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM account delegated consents error:`, error);
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM account delegated consents',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/account/delegated-consents', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(req.params.realmId, sessionId);
    const response = await LocalIamAuthenticationRuntimeStore.grantAccountDelegatedConsentAsync(
      req.params.realmId,
      sessionId,
      req.body as CreateIamAccountDelegatedConsentInput,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: sessionContext.user.id,
      action: 'IAM_DELEGATED_CONSENT_CREATED',
      entityType: 'iam_delegated_consent',
      entityId: response.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/account/delegated-consents',
      correlationId: req.correlationId,
      summary: 'Granted delegated consent from the IAM account console.',
      metadata: {
        realm_id: req.params.realmId,
        relationship_id: response.relationship_id,
        scope_names: response.scope_names,
        purpose_names: response.purpose_names,
        current_party: response.current_party,
      }
    });
    res.status(201).json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM account delegated consent create error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to grant IAM account delegated consent',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/account/delegated-consents/:consentId/revoke', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(req.params.realmId, sessionId);
    const response = await LocalIamAuthenticationRuntimeStore.revokeAccountDelegatedConsentAsync(
      req.params.realmId,
      sessionId,
      req.params.consentId,
      req.body as RevokeIamAccountDelegatedConsentInput,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: sessionContext.user.id,
      action: 'IAM_DELEGATED_CONSENT_UPDATED',
      entityType: 'iam_delegated_consent',
      entityId: response.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/account/delegated-consents/:consentId/revoke',
      correlationId: req.correlationId,
      summary: 'Revoked delegated consent from the IAM account console.',
      metadata: {
        realm_id: req.params.realmId,
        relationship_id: response.relationship_id,
        revoked_at: response.revoked_at,
        current_party: response.current_party,
      }
    });
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM account delegated consent revoke error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to revoke IAM account delegated consent',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/account/delegated-consent-requests', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    res.json(LocalIamAuthenticationRuntimeStore.listAccountDelegatedConsentRequests(req.params.realmId, sessionId, {
      relationship_id: normalizeHeaderValue(req.query.relationship_id as string | undefined) ?? undefined,
      status: normalizeHeaderValue(req.query.status as string | undefined) as 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED' | 'EXPIRED' | undefined,
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM account delegated consent requests error:`, error);
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM account delegated consent requests',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/account/delegated-consent-requests', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(req.params.realmId, sessionId);
    const response = await LocalIamAuthenticationRuntimeStore.requestAccountDelegatedConsentAsync(
      req.params.realmId,
      sessionId,
      req.body as CreateIamAccountDelegatedConsentRequestInput,
    );
    LocalIamExperienceRuntimeStore.recordNotificationDelivery(
      sessionContext.user.id,
      req.params.realmId,
      'DELEGATED_CONSENT_REQUESTED',
      response.counterpart_user.id,
      response.counterpart_user.email,
      {
        delegate_name: `${sessionContext.user.first_name} ${sessionContext.user.last_name}`.trim() || sessionContext.user.username,
        principal_name: `${response.counterpart_user.first_name} ${response.counterpart_user.last_name}`.trim() || response.counterpart_user.username,
        relationship_kind: response.relationship_kind,
        requested_scopes: response.requested_scope_names.join(', '),
        requested_purposes: response.requested_purpose_names.join(', '),
      },
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: sessionContext.user.id,
      action: 'IAM_DELEGATED_CONSENT_REQUEST_CREATED',
      entityType: 'iam_delegated_consent_request',
      entityId: response.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/account/delegated-consent-requests',
      correlationId: req.correlationId,
      summary: 'Created delegated consent request from the IAM account console.',
      metadata: {
        realm_id: req.params.realmId,
        relationship_id: response.relationship_id,
        requested_scope_names: response.requested_scope_names,
        requested_purpose_names: response.requested_purpose_names,
        current_party: response.current_party,
      }
    });
    res.status(201).json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM account delegated consent request create error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM account delegated consent request',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/account/delegated-consent-requests/:requestId/approve', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(req.params.realmId, sessionId);
    const response = await LocalIamAuthenticationRuntimeStore.approveAccountDelegatedConsentRequestAsync(
      req.params.realmId,
      sessionId,
      req.params.requestId,
      req.body as ApproveIamAccountDelegatedConsentRequestInput,
    );
    LocalIamExperienceRuntimeStore.recordNotificationDelivery(
      sessionContext.user.id,
      req.params.realmId,
      'DELEGATED_CONSENT_APPROVED',
      response.request.counterpart_user.id,
      response.request.counterpart_user.email,
      {
        principal_name: `${sessionContext.user.first_name} ${sessionContext.user.last_name}`.trim() || sessionContext.user.username,
        delegate_name: `${response.request.counterpart_user.first_name} ${response.request.counterpart_user.last_name}`.trim() || response.request.counterpart_user.username,
        relationship_kind: response.request.relationship_kind,
        requested_scopes: response.request.requested_scope_names.join(', '),
        requested_purposes: response.request.requested_purpose_names.join(', '),
      },
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: sessionContext.user.id,
      action: 'IAM_DELEGATED_CONSENT_REQUEST_UPDATED',
      entityType: 'iam_delegated_consent_request',
      entityId: response.request.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/account/delegated-consent-requests/:requestId/approve',
      correlationId: req.correlationId,
      summary: 'Approved delegated consent request from the IAM account console.',
      metadata: {
        realm_id: req.params.realmId,
        relationship_id: response.request.relationship_id,
        delegated_consent_id: response.delegated_consent?.id ?? null,
        status: response.request.status,
      }
    });
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM account delegated consent request approve error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to approve IAM account delegated consent request',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/account/delegated-consent-requests/:requestId/deny', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(req.params.realmId, sessionId);
    const response = await LocalIamAuthenticationRuntimeStore.denyAccountDelegatedConsentRequestAsync(
      req.params.realmId,
      sessionId,
      req.params.requestId,
      req.body as DenyIamAccountDelegatedConsentRequestInput,
    );
    LocalIamExperienceRuntimeStore.recordNotificationDelivery(
      sessionContext.user.id,
      req.params.realmId,
      'DELEGATED_CONSENT_DENIED',
      response.request.counterpart_user.id,
      response.request.counterpart_user.email,
      {
        principal_name: `${sessionContext.user.first_name} ${sessionContext.user.last_name}`.trim() || sessionContext.user.username,
        delegate_name: `${response.request.counterpart_user.first_name} ${response.request.counterpart_user.last_name}`.trim() || response.request.counterpart_user.username,
        relationship_kind: response.request.relationship_kind,
        requested_scopes: response.request.requested_scope_names.join(', '),
        requested_purposes: response.request.requested_purpose_names.join(', '),
      },
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: sessionContext.user.id,
      action: 'IAM_DELEGATED_CONSENT_REQUEST_UPDATED',
      entityType: 'iam_delegated_consent_request',
      entityId: response.request.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/account/delegated-consent-requests/:requestId/deny',
      correlationId: req.correlationId,
      summary: 'Denied delegated consent request from the IAM account console.',
      metadata: {
        realm_id: req.params.realmId,
        relationship_id: response.request.relationship_id,
        status: response.request.status,
      }
    });
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM account delegated consent request deny error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to deny IAM account delegated consent request',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/account/delegated-consent-requests/:requestId/cancel', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(req.params.realmId, sessionId);
    const response = await LocalIamAuthenticationRuntimeStore.cancelAccountDelegatedConsentRequestAsync(
      req.params.realmId,
      sessionId,
      req.params.requestId,
      req.body as CancelIamAccountDelegatedConsentRequestInput,
    );
    LocalIamExperienceRuntimeStore.recordNotificationDelivery(
      sessionContext.user.id,
      req.params.realmId,
      'DELEGATED_CONSENT_CANCELLED',
      response.request.counterpart_user.id,
      response.request.counterpart_user.email,
      {
        delegate_name: `${sessionContext.user.first_name} ${sessionContext.user.last_name}`.trim() || sessionContext.user.username,
        principal_name: `${response.request.counterpart_user.first_name} ${response.request.counterpart_user.last_name}`.trim() || response.request.counterpart_user.username,
        relationship_kind: response.request.relationship_kind,
        requested_scopes: response.request.requested_scope_names.join(', '),
        requested_purposes: response.request.requested_purpose_names.join(', '),
      },
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId: sessionContext.user.id,
      action: 'IAM_DELEGATED_CONSENT_REQUEST_UPDATED',
      entityType: 'iam_delegated_consent_request',
      entityId: response.request.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/account/delegated-consent-requests/:requestId/cancel',
      correlationId: req.correlationId,
      summary: 'Cancelled delegated consent request from the IAM account console.',
      metadata: {
        realm_id: req.params.realmId,
        relationship_id: response.request.relationship_id,
        status: response.request.status,
      }
    });
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM account delegated consent request cancel error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to cancel IAM account delegated consent request',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/account/linked-identities', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(req.params.realmId, sessionId);
    res.json(LocalIamFederationRuntimeStore.listLinkedIdentities({
      realm_id: req.params.realmId,
      user_id: sessionContext.user.id,
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM account linked identities error:`, error);
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM account linked identities',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/identity-providers', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFederationRuntimeStore.listIdentityProviders({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      protocol: normalizeHeaderValue(req.query.protocol as string | undefined) as IamIdentityProviderProtocol | null,
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM identity providers error:`, error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM identity providers',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/federation-trust-stores', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFederationRuntimeStore.listFederationTrustStores({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      protocol: normalizeHeaderValue(req.query.protocol as string | undefined) as IamIdentityProviderProtocol | null,
      status: normalizeHeaderValue(req.query.status as string | undefined) as IamFederationTrustStoreStatus | null,
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM federation trust stores error:`, error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM federation trust stores',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/federation-mapping-profiles', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFederationRuntimeStore.listFederationMappingProfiles({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      trust_store_id: normalizeHeaderValue(req.query.trust_store_id as string | undefined),
      protocol: normalizeHeaderValue(req.query.protocol as string | undefined) as IamIdentityProviderProtocol | null,
      status: normalizeHeaderValue(req.query.status as string | undefined) as IamFederationMappingProfileStatus | null,
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM federation mapping profiles error:`, error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM federation mapping profiles',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/federation-claim-preview', async (req, res) => {
  try {
    res.json(LocalIamFederationRuntimeStore.previewFederationClaimRelease(req.body as PreviewIamFederationClaimReleaseRequest));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM federation claim preview error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to preview IAM federation claim release',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/realms/:realmId/theme', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamExperienceRuntimeStore.updateRealmThemeAsync(actorUserId, req.params.realmId, req.body as UpdateIamRealmThemeRequest);
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_REALM_THEME_UPDATED',
      entityType: 'iam_realm_theme',
      entityId: req.params.realmId,
      sourceRoute: '/api/v1/iam/realms/:realmId/theme',
      correlationId: req.correlationId,
      summary: `Updated IAM realm theme for ${record.realm_name}.`,
      metadata: {
        realm_id: req.params.realmId,
        preset: record.preset,
        brand_name: record.brand_name,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM theme update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM realm theme',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/realms/:realmId/localization', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamExperienceRuntimeStore.updateRealmLocalizationAsync(actorUserId, req.params.realmId, req.body as UpdateIamRealmLocalizationRequest);
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_REALM_LOCALIZATION_UPDATED',
      entityType: 'iam_realm_localization',
      entityId: req.params.realmId,
      sourceRoute: '/api/v1/iam/realms/:realmId/localization',
      correlationId: req.correlationId,
      summary: `Updated IAM realm localization for ${req.params.realmId}.`,
      metadata: {
        realm_id: req.params.realmId,
        default_locale: record.default_locale,
        supported_locales: record.supported_locales,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM localization update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM realm localization',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/notification-templates', requireGlobalPermission({
  all_of: ['iam.read']
}), async (req, res) => {
  try {
    res.json(LocalIamExperienceRuntimeStore.listNotificationTemplates(req.params.realmId));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM notification templates error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM notification templates',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/realms/:realmId/notification-templates/:templateId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamExperienceRuntimeStore.updateNotificationTemplateAsync(actorUserId, req.params.realmId, req.params.templateId, req.body as UpdateIamNotificationTemplateRequest);
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_NOTIFICATION_TEMPLATE_UPDATED',
      entityType: 'iam_notification_template',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/notification-templates/:templateId',
      correlationId: req.correlationId,
      summary: `Updated IAM notification template ${record.name}.`,
      metadata: {
        realm_id: req.params.realmId,
        template_key: record.key,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM notification template update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM notification template',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/notification-templates/:templateId/preview', requireGlobalPermission({
  all_of: ['iam.read']
}), async (req, res) => {
  try {
    res.json(LocalIamExperienceRuntimeStore.previewNotificationTemplate(
      req.params.realmId,
      req.params.templateId,
      typeof req.body?.variables === 'object' && req.body?.variables
        ? req.body.variables as Record<string, string>
        : undefined
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM notification template preview error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to preview IAM notification template',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/notifications/test', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamExperienceRuntimeStore.sendTestNotificationAsync(actorUserId, req.params.realmId, req.body as CreateIamTestNotificationRequest);
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_NOTIFICATION_TEST_DELIVERED',
      entityType: 'iam_notification_delivery',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/notifications/test',
      correlationId: req.correlationId,
      summary: `Delivered IAM notification test for ${req.params.realmId}.`,
      metadata: {
        realm_id: req.params.realmId,
        template_key: record.template_key,
        recipient_email: record.recipient_email,
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM test notification error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to deliver IAM test notification',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/notification-deliveries', requireGlobalPermission({
  all_of: ['iam.read']
}), async (req, res) => {
  try {
    res.json(LocalIamExperienceRuntimeStore.listNotificationDeliveries({
      realm_id: req.params.realmId,
      template_key: normalizeHeaderValue(req.query.template_key as string | undefined) as any,
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM notification deliveries error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM notification deliveries',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/identity-providers', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamFederationRuntimeStore.createIdentityProviderAsync(
      actorUserId,
      req.body as CreateIamIdentityProviderRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_IDENTITY_PROVIDER_CREATED',
      entityType: 'iam_identity_provider',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/identity-providers',
      correlationId: req.correlationId,
      summary: `Created IAM identity provider ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        alias: record.alias,
        protocol: record.protocol,
        status: record.status,
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM create identity provider error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM identity provider',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/identity-providers/:providerId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamFederationRuntimeStore.updateIdentityProviderAsync(
      actorUserId,
      req.params.providerId,
      req.body as UpdateIamIdentityProviderRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_IDENTITY_PROVIDER_UPDATED',
      entityType: 'iam_identity_provider',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/identity-providers/:providerId',
      correlationId: req.correlationId,
      summary: `Updated IAM identity provider ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        alias: record.alias,
        protocol: record.protocol,
        status: record.status,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM update identity provider error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM identity provider',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/user-federation/providers', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFederationRuntimeStore.listUserFederationProviders({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      kind: normalizeHeaderValue(req.query.kind as string | undefined) as IamUserFederationProviderKind | null,
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM user federation providers error:`, error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM user federation providers',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/user-federation/providers', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamFederationRuntimeStore.createUserFederationProviderAsync(
      actorUserId,
      req.body as CreateIamUserFederationProviderRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_USER_FEDERATION_PROVIDER_CREATED',
      entityType: 'iam_user_federation_provider',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/user-federation/providers',
      correlationId: req.correlationId,
      summary: `Created IAM user federation provider ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        kind: record.kind,
        status: record.status,
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM create user federation provider error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM user federation provider',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/user-federation/providers/:providerId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamFederationRuntimeStore.updateUserFederationProviderAsync(
      actorUserId,
      req.params.providerId,
      req.body as UpdateIamUserFederationProviderRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_USER_FEDERATION_PROVIDER_UPDATED',
      entityType: 'iam_user_federation_provider',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/user-federation/providers/:providerId',
      correlationId: req.correlationId,
      summary: `Updated IAM user federation provider ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        kind: record.kind,
        status: record.status,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM update user federation provider error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM user federation provider',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/user-federation/providers/:providerId/sync', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const job = await LocalIamFederationRuntimeStore.runUserFederationSyncAsync(actorUserId, req.params.providerId, {
      external_identities: Array.isArray(req.body?.external_identities)
        ? req.body.external_identities
            .filter((candidate: unknown) => candidate && typeof candidate === 'object')
            .map((candidate: any) => ({
              subject: normalizeHeaderValue(candidate.subject) ?? '',
              username: normalizeHeaderValue(candidate.username) ?? '',
              email: normalizeHeaderValue(candidate.email) ?? '',
              first_name: normalizeHeaderValue(candidate.first_name) ?? '',
              last_name: normalizeHeaderValue(candidate.last_name) ?? '',
              group_names: Array.isArray(candidate.group_names)
                ? candidate.group_names.map((value: string) => normalizeHeaderValue(value) ?? '').filter(Boolean)
                : [],
              role_names: Array.isArray(candidate.role_names)
                ? candidate.role_names.map((value: string) => normalizeHeaderValue(value) ?? '').filter(Boolean)
                : [],
              issuer_url: normalizeHeaderValue(candidate.issuer_url),
              raw_attributes: candidate.raw_attributes && typeof candidate.raw_attributes === 'object'
                ? Object.fromEntries(
                    Object.entries(candidate.raw_attributes).map(([key, value]) => [
                      key,
                      Array.isArray(value)
                        ? value.map((item: string) => normalizeHeaderValue(item) ?? '').filter(Boolean)
                        : normalizeHeaderValue(value as string) ?? '',
                    ]),
                  )
                : undefined,
              scopes: Array.isArray(candidate.scopes)
                ? candidate.scopes.map((value: string) => normalizeHeaderValue(value) ?? '').filter(Boolean)
                : undefined,
              saml_assertion: candidate.saml_assertion && typeof candidate.saml_assertion === 'object'
                ? {
                    name_id: normalizeHeaderValue(candidate.saml_assertion.name_id),
                    attributes: candidate.saml_assertion.attributes && typeof candidate.saml_assertion.attributes === 'object'
                      ? Object.fromEntries(
                          Object.entries(candidate.saml_assertion.attributes).map(([key, value]) => [
                            key,
                            Array.isArray(value)
                              ? value.map((item: string) => normalizeHeaderValue(item) ?? '').filter(Boolean)
                              : normalizeHeaderValue(value as string) ?? '',
                          ]),
                        )
                      : undefined,
                  }
                : undefined,
            }))
        : undefined,
    });
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_USER_FEDERATION_SYNC_COMPLETED',
      entityType: 'iam_federation_sync_job',
      entityId: job.id,
      sourceRoute: '/api/v1/iam/user-federation/providers/:providerId/sync',
      correlationId: req.correlationId,
      summary: `Completed IAM user federation sync for ${job.provider_name}.`,
      metadata: {
        realm_id: job.realm_id,
        provider_id: job.provider_id,
        status: job.status,
        imported_count: job.imported_count,
        linked_count: job.linked_count,
        updated_count: job.updated_count,
      }
    });
    res.status(201).json(job);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM federation sync error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to run IAM federation sync',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/user-federation/sync-jobs', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFederationRuntimeStore.listFederationSyncJobs({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      provider_id: normalizeHeaderValue(req.query.provider_id as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM federation sync jobs error:`, error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM federation sync jobs',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/broker-links', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFederationRuntimeStore.listLinkedIdentities({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      source_type: normalizeHeaderValue(req.query.source_type as string | undefined) as IamLinkedIdentitySourceType | null,
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM broker links error:`, error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM linked identities',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/federation/events', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFederationRuntimeStore.listFederationEvents({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      provider_id: normalizeHeaderValue(req.query.provider_id as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM federation events error:`, error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM federation events',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/federation-failover/provider-health', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFederationFailoverStore.listProviderHealthRecords({
      status: normalizeHeaderValue(req.query.status as string | undefined) as any,
      provider_type: normalizeHeaderValue(req.query.provider_type as string | undefined) as any,
      circuit_breaker_open: req.query.circuit_breaker_open === 'true' ? true : req.query.circuit_breaker_open === 'false' ? false : undefined,
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM federation provider health error:`, error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve federation provider health',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/federation-failover/events', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFederationFailoverStore.listFailoverEvents({
      provider_id: normalizeHeaderValue(req.query.provider_id as string | undefined),
      action: normalizeHeaderValue(req.query.action as string | undefined) as any,
      since: normalizeHeaderValue(req.query.since as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM federation failover events error:`, error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve federation failover events',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/federation-failover/provider-health/:providerId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const providerId = req.params.providerId;
    const status = normalizeHeaderValue(req.body?.status);
    const notes = Array.isArray(req.body?.notes) ? req.body.notes : [];

    if (!status || !['HEALTHY', 'DEGRADED', 'FAILED'].includes(status)) {
      throw new Error('Invalid or missing status. Must be HEALTHY, DEGRADED, or FAILED.');
    }

    // Initialize monitoring if this is the first time
    LocalIamFederationFailoverStore.initializeMonitoringForProvider(providerId);

    const record = LocalIamFederationFailoverStore.updateProviderHealth({
      providerId,
      providerName: req.body?.provider_name || 'Unknown Provider',
      providerType: req.body?.provider_type || 'IDENTITY_PROVIDER',
      protocol: req.body?.protocol || 'UNKNOWN',
      status: status as any,
      notes,
    });

    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM federation provider health update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update federation provider health',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFoundationStore.listRealms({
      scope_kind: normalizeHeaderValue(req.query.scope_kind as string | undefined) as IamRealmScopeKind | null,
      binding_target_kind: normalizeHeaderValue(req.query.binding_target_kind as string | undefined) as IamBindingTargetKind | null,
      binding_target_id: normalizeHeaderValue(req.query.binding_target_id as string | undefined),
    }, parseListPagination(req)));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM realms error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM realms',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realm-templates', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFoundationStore.listRealmTemplates());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM realm templates error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM realm templates',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realm-posture-presets', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFoundationStore.listRealmPosturePresets({
      realm_template_id: normalizeHeaderValue(req.query.realm_template_id as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM realm posture presets error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM realm posture presets',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/identity-privacy-policies', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFoundationStore.listIdentityPrivacyPolicies({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM identity privacy policies error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM identity privacy policies',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/delegated-relationships', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFoundationStore.listDelegatedRelationships({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM delegated relationships error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM delegated relationships',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/delegated-consents', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFoundationStore.listDelegatedConsents({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      relationship_id: normalizeHeaderValue(req.query.relationship_id as string | undefined),
      principal_user_id: normalizeHeaderValue(req.query.principal_user_id as string | undefined),
      delegate_user_id: normalizeHeaderValue(req.query.delegate_user_id as string | undefined),
      status: normalizeHeaderValue(req.query.status as string | undefined) as 'ACTIVE' | 'REVOKED' | null,
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM delegated consents error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM delegated consents',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/delegated-consents', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamFoundationStore.createDelegatedConsentAsync(
      actorUserId,
      req.body as CreateIamDelegatedConsentRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_DELEGATED_CONSENT_CREATED',
      entityType: 'iam_delegated_consent',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/delegated-consents',
      correlationId: req.correlationId,
      summary: `Created IAM delegated consent ${record.id}.`,
      metadata: {
        realm_id: record.realm_id,
        relationship_id: record.relationship_id,
        principal_user_id: record.principal_user_id,
        delegate_user_id: record.delegate_user_id,
        scope_names: record.scope_names,
        purpose_names: record.purpose_names,
        status: record.status,
        expires_at: record.expires_at,
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM delegated consent create error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM delegated consent',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/delegated-consents/:consentId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamFoundationStore.updateDelegatedConsentAsync(
      actorUserId,
      req.params.consentId,
      req.body as UpdateIamDelegatedConsentRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_DELEGATED_CONSENT_UPDATED',
      entityType: 'iam_delegated_consent',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/delegated-consents/:consentId',
      correlationId: req.correlationId,
      summary: `Updated IAM delegated consent ${record.id}.`,
      metadata: {
        realm_id: record.realm_id,
        relationship_id: record.relationship_id,
        principal_user_id: record.principal_user_id,
        delegate_user_id: record.delegate_user_id,
        scope_names: record.scope_names,
        purpose_names: record.purpose_names,
        status: record.status,
        expires_at: record.expires_at,
        revoked_at: record.revoked_at,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM delegated consent update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM delegated consent',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/portable-identities', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFoundationStore.listPortableIdentities({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM portable identities error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM portable identities',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realm-bindings', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFoundationStore.listRealmBindings({
      binding_target_kind: normalizeHeaderValue(req.query.binding_target_kind as string | undefined) as IamBindingTargetKind | null,
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM realm bindings error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM realm bindings',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realm-bindings/:bindingId', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFoundationStore.getRealmBinding(req.params.bindingId));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM realm binding lookup error:`, error);
    res.status(404).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM realm binding',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/application-bindings/:bindingId/consumer-contract', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    const response = LocalIamFoundationStore.getConsumerContract(req.params.bindingId);
    if (response.binding_target_kind !== 'APPLICATION') {
      res.status(400).json({
        error: `Binding ${req.params.bindingId} is not an application binding`,
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString()
      });
      return;
    }
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM consumer contract lookup error:`, error);
    res.status(404).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM consumer contract',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/application-bindings/:bindingId/auth-bootstrap', async (req, res) => {
  try {
    res.json(LocalIamApplicationConsumerStore.getAuthBootstrap(
      req.params.bindingId,
      normalizeHeaderValue(req.query.contract_version as string | undefined),
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM application auth bootstrap error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to resolve IAM application auth bootstrap',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/application-bindings/:bindingId/identity-bootstrap', async (req, res) => {
  try {
    res.json(LocalIamApplicationConsumerStore.getIdentityBootstrap(
      req.params.bindingId,
      normalizeHeaderValue(req.query.contract_version as string | undefined),
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM application identity bootstrap error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to resolve IAM application identity bootstrap contract',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/application-bindings/account-registration', async (req, res) => {
  try {
    const realmId = normalizeHeaderValue(req.body?.realm_id);
    const clientId = normalizeHeaderValue(req.body?.client_id);
    if (!realmId || !clientId) {
      return res.status(400).json({
        error: 'Missing required fields: realm_id, client_id',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
    }

    const binding = LocalIamFoundationStore.getApplicationBindingByRealmClient(realmId, clientId);
    const registration = LocalAccountProvisioningStore.registerAccount(req.body as AccountRegistrationRequest, {
      create_bootstrap_session: false,
    });
    const activationHandoff = buildApplicationAccountActivationHandoff(
      binding.realm_id,
      clientId,
      registration.user.email,
      registration.identity.next_route,
    );

    LocalAdminAuditStore.record({
      tenantId: registration.tenant.id,
      actorUserId: registration.user.id,
      action: 'IAM_APPLICATION_ACCOUNT_REGISTERED',
      entityType: 'account_registration',
      entityId: registration.registration_id,
      sourceRoute: '/api/v1/iam/application-bindings/account-registration',
      correlationId: req.correlationId,
      summary: `Registered account ${registration.tenant.name} through application binding ${binding.id}.`,
      metadata: {
        binding_id: binding.id,
        binding_target_name: binding.binding_target_name,
        realm_id: binding.realm_id,
        client_id: clientId,
        plan_id: registration.billing_profile.plan_id,
      },
    });

    res.status(201).json({
      generated_at: new Date().toISOString(),
      binding_id: binding.id,
      binding_target_name: binding.binding_target_name,
      realm_id: binding.realm_id,
      realm_name: binding.realm_name,
      client_id: clientId,
      registration,
      activation_handoff: activationHandoff,
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${req.correlationId}] IAM application account registration error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to register application account',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  }
});

app.post('/api/v1/iam/application-bindings/authorization-request', async (req, res) => {
  try {
    const realmId = normalizeHeaderValue(req.body?.realm_id);
    const clientId = normalizeHeaderValue(req.body?.client_id);
    if (!realmId || !clientId) {
      return res.status(400).json({
        error: 'Missing required fields: realm_id, client_id',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
    }

    const binding = LocalIamFoundationStore.getApplicationBindingByRealmClient(realmId, clientId);
    const response = await LocalIamAuthorizationRuntimeStore.createAuthorizationRedirectAsync(
      binding.realm_id,
      {
        client_id: clientId,
        redirect_uri: normalizeHeaderValue(req.body?.redirect_uri) ?? '',
        response_type: 'code',
        response_mode: 'query',
        scope: normalizeHeaderValue(req.body?.scope),
        requested_purpose: normalizeHeaderValue(req.body?.requested_purpose),
        state: normalizeHeaderValue(req.body?.state),
        nonce: normalizeHeaderValue(req.body?.nonce),
        login_hint: normalizeHeaderValue(req.body?.login_hint),
        flow_context: normalizeHeaderValue(req.body?.flow_context),
        code_challenge: normalizeHeaderValue(req.body?.code_challenge),
        code_challenge_method: normalizeHeaderValue(req.body?.code_challenge_method) as 'plain' | 'S256' | null,
      },
      getLocalUiBaseUrl(req),
    );

    res.status(201).json({
      generated_at: new Date().toISOString(),
      binding_id: binding.id,
      binding_target_name: binding.binding_target_name,
      realm_id: binding.realm_id,
      realm_name: binding.realm_name,
      client_id: clientId,
      authorization_request_id: response.authorization_request_id,
      redirect_url: response.redirect_url,
      expires_at: response.request.expires_at,
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${req.correlationId}] IAM application authorization request error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create application authorization request',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/api/v1/iam/application-bindings/:bindingId/account-self-service', async (req, res) => {
  const sessionId = requireIamAccountSessionId(req, res);
  if (!sessionId) {
    return;
  }
  try {
    const binding = LocalIamFoundationStore.getRealmBinding(req.params.bindingId);
    LocalIamAuthenticationRuntimeStore.resolveAccountSession(binding.realm_id, sessionId);
    res.json(LocalIamApplicationConsumerStore.getAccountSelfService(
      req.params.bindingId,
      normalizeHeaderValue(req.query.contract_version as string | undefined),
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM application account self-service error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to resolve IAM application account self-service contract',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/application-bindings/:bindingId/projection-policy', requireBearerAuthorization({}), async (req, res) => {
  try {
    res.json(LocalIamApplicationConsumerStore.getProjectionPolicy(
      req.params.bindingId,
      normalizeHeaderValue(req.query.contract_version as string | undefined),
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM application projection policy error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to resolve IAM application projection policy',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/application-bindings/:bindingId/contracts', requireBearerAuthorization({}), async (req, res) => {
  try {
    res.json(LocalIamApplicationConsumerStore.getContractManifest(
      req.params.bindingId,
      normalizeHeaderValue(req.query.contract_version as string | undefined),
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM application contract manifest error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to resolve IAM application contract manifest',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/application-bindings/:bindingId/principal-context', requireBearerAuthorization({}), async (req, res) => {
  try {
    res.json(LocalIamApplicationConsumerStore.getPrincipalContext(
      req.params.bindingId,
      req.userId!,
      normalizeHeaderValue(req.query.contract_version as string | undefined),
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM application principal context error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to resolve IAM application principal context',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/application-bindings/:bindingId/tenant-context', requireBearerAuthorization({}), async (req, res) => {
  try {
    res.json(LocalIamApplicationConsumerStore.getTenantContext(
      req.params.bindingId,
      req.userId!,
      normalizeHeaderValue(req.query.tenant_id as string | undefined)
        ?? normalizeHeaderValue(req.header(LOCAL_TENANT_HEADER))
        ?? null,
      normalizeHeaderValue(req.query.contract_version as string | undefined),
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM application tenant context error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to resolve IAM application tenant context',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/application-bindings/:bindingId/capabilities', requireBearerAuthorization({}), async (req, res) => {
  try {
    res.json(LocalIamApplicationConsumerStore.getCapabilityCatalog(req.params.bindingId));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM application capability catalog error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to resolve IAM application capability catalog',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/application-bindings/:bindingId/identity-access-facts', requireBearerAuthorization({}), async (req, res) => {
  try {
    res.json(LocalIamApplicationConsumerStore.getIdentityAccessFacts(
      req.params.bindingId,
      req.userId!,
      normalizeHeaderValue(req.query.tenant_id as string | undefined)
        ?? normalizeHeaderValue(req.header(LOCAL_TENANT_HEADER))
        ?? null,
      normalizeHeaderValue(req.query.contract_version as string | undefined),
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM application identity access facts error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to resolve IAM application identity access facts',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get(
  '/governance/workflows/summary',
  requireBearerAuthorization({}),
  requireGovernanceWorkflowAccess('/instructional-workflows/summary', 'GET'),
  async (req, res) => {
    const tenantId = resolveRequiredTenantId(req);
    if (!tenantId) {
      res.status(400).json({
        error: `Missing ${LOCAL_TENANT_HEADER} tenant context`,
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    try {
      res.json(LocalGovernanceWorkflowStore.getInstructionalWorkflowSummary(tenantId));
    } catch (error) {
      console.error(`[${req.correlationId}] Governance workflow summary error:`, error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to load governance workflow summary',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

app.get(
  '/governance/workflows',
  requireBearerAuthorization({}),
  requireGovernanceWorkflowAccess('/instructional-workflows', 'GET'),
  async (req, res) => {
    const tenantId = resolveRequiredTenantId(req);
    if (!tenantId) {
      res.status(400).json({
        error: `Missing ${LOCAL_TENANT_HEADER} tenant context`,
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    try {
      res.json(LocalGovernanceWorkflowStore.listInstructionalWorkflows(tenantId));
    } catch (error) {
      console.error(`[${req.correlationId}] Governance workflows list error:`, error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to list governance workflows',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

app.get(
  '/governance/workflows/:contentEntryId',
  requireBearerAuthorization({}),
  requireGovernanceWorkflowAccess('/instructional-workflows', 'GET'),
  async (req, res) => {
    const tenantId = resolveRequiredTenantId(req);
    if (!tenantId) {
      res.status(400).json({
        error: `Missing ${LOCAL_TENANT_HEADER} tenant context`,
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    try {
      const detail = LocalGovernanceWorkflowStore.getInstructionalWorkflow(tenantId, req.params.contentEntryId);
      if (!detail) {
        res.status(404).json({
          error: 'Instructional workflow not found',
          correlation_id: req.correlationId,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      res.json(detail);
    } catch (error) {
      console.error(`[${req.correlationId}] Governance workflow detail error:`, error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to load governance workflow detail',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

app.get(
  '/governance/workflows/:contentEntryId/release-safety',
  requireBearerAuthorization({}),
  requireGovernanceWorkflowAccess('/instructional-workflows', 'GET'),
  async (req, res) => {
    const tenantId = resolveRequiredTenantId(req);
    if (!tenantId) {
      res.status(400).json({
        error: `Missing ${LOCAL_TENANT_HEADER} tenant context`,
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    try {
      res.json(LocalGovernanceWorkflowStore.getReleaseSafety(tenantId, req.params.contentEntryId));
    } catch (error) {
      console.error(`[${req.correlationId}] Governance release safety error:`, error);
      res.status(404).json({
        error: error instanceof Error ? error.message : 'Failed to load CMS release safety',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

app.post(
  '/governance/workflows/:contentEntryId/submit',
  requireBearerAuthorization({}),
  requireGovernanceWorkflowAccess('/instructional-workflows', 'POST'),
  async (req, res) => {
    const tenantId = resolveRequiredTenantId(req);
    if (!tenantId) {
      res.status(400).json({
        error: `Missing ${LOCAL_TENANT_HEADER} tenant context`,
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    try {
      const body = typeof req.body === 'object' && req.body ? req.body as Record<string, unknown> : {};
      res.json(LocalGovernanceWorkflowStore.submitInstructionalWorkflow(
        req.userId!,
        tenantId,
        req.params.contentEntryId,
        readGovernanceWorkflowContextInput(req),
        typeof body.notes === 'string' ? body.notes : undefined,
      ));
    } catch (error) {
      console.error(`[${req.correlationId}] Governance workflow submit error:`, error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to submit governance workflow',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

app.post(
  '/governance/workflows/:contentEntryId/stages/:stageId/decision',
  requireBearerAuthorization({}),
  requireGovernanceWorkflowAccess('/instructional-workflows', 'POST'),
  async (req, res) => {
    const tenantId = resolveRequiredTenantId(req);
    if (!tenantId) {
      res.status(400).json({
        error: `Missing ${LOCAL_TENANT_HEADER} tenant context`,
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    try {
      const body = typeof req.body === 'object' && req.body ? req.body as Record<string, unknown> : {};
      const decision = body.decision;
      if (decision !== 'APPROVE' && decision !== 'REQUEST_CHANGES') {
        res.status(400).json({
          error: 'decision must be APPROVE or REQUEST_CHANGES',
          correlation_id: req.correlationId,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      res.json(LocalGovernanceWorkflowStore.decideInstructionalWorkflowStage(
        req.userId!,
        tenantId,
        req.params.contentEntryId,
        req.params.stageId as GovernanceWorkflowStageId,
        decision,
        readGovernanceWorkflowContextInput(req),
        typeof body.notes === 'string' ? body.notes : undefined,
      ));
    } catch (error) {
      console.error(`[${req.correlationId}] Governance workflow stage decision error:`, error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to record governance workflow stage decision',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

app.post(
  '/governance/workflows/:contentEntryId/comments',
  requireBearerAuthorization({}),
  requireGovernanceWorkflowAccess('/instructional-workflows', 'POST'),
  async (req, res) => {
    const tenantId = resolveRequiredTenantId(req);
    if (!tenantId) {
      res.status(400).json({
        error: `Missing ${LOCAL_TENANT_HEADER} tenant context`,
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    try {
      const body = typeof req.body === 'object' && req.body ? req.body as Record<string, unknown> : {};
      if (typeof body.message !== 'string' || body.message.trim().length === 0) {
        res.status(400).json({
          error: 'message is required',
          correlation_id: req.correlationId,
          timestamp: new Date().toISOString(),
        });
        return;
      }
      res.json(LocalGovernanceWorkflowStore.addWorkflowComment(
        req.userId!,
        tenantId,
        req.params.contentEntryId,
        body.message,
        readGovernanceWorkflowContextInput(req),
      ));
    } catch (error) {
      console.error(`[${req.correlationId}] Governance workflow comment error:`, error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to add governance workflow comment',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

app.get(
  '/governance/access/summary',
  requireBearerAuthorization({}),
  requireGovernanceRouteAccess('/access', 'GET', 'Governance access administration denied'),
  async (req, res) => {
    const tenantId = resolveRequiredTenantId(req);
    if (!tenantId) {
      res.status(400).json({
        error: `Missing ${LOCAL_TENANT_HEADER} tenant context`,
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    try {
      const memberCount = LocalSettingsStore.listTeamMembers(tenantId).length;
      const assignmentResponse = filterCmsAssignmentsForTenant(tenantId);
      res.json({
        ...LocalGovernanceAccessStore.getSummary(),
        tenant_id: tenantId,
        member_count: memberCount,
        assignment_count_for_tenant: assignmentResponse.count,
      });
    } catch (error) {
      console.error(`[${req.correlationId}] Governance access summary error:`, error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to load governance access summary',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

app.get(
  '/governance/access/members',
  requireBearerAuthorization({}),
  requireGovernanceRouteAccess('/access', 'GET', 'Governance access administration denied'),
  async (req, res) => {
    const tenantId = resolveRequiredTenantId(req);
    if (!tenantId) {
      res.status(400).json({
        error: `Missing ${LOCAL_TENANT_HEADER} tenant context`,
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    try {
      const members = LocalSettingsStore.listTeamMembers(tenantId);
      res.json({
        generated_at: new Date().toISOString(),
        tenant_id: tenantId,
        members,
        count: members.length,
      });
    } catch (error) {
      console.error(`[${req.correlationId}] Governance access members error:`, error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to load governance access members',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

app.post(
  '/governance/access/members',
  requireBearerAuthorization({}),
  requireGovernanceRouteAccess('/access', 'POST', 'Governance access administration denied'),
  async (req, res) => {
    const tenantId = resolveRequiredTenantId(req);
    if (!tenantId) {
      res.status(400).json({
        error: `Missing ${LOCAL_TENANT_HEADER} tenant context`,
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    try {
      const body = typeof req.body === 'object' && req.body ? req.body as Record<string, unknown> : {};
      const record = LocalSettingsStore.inviteTeamMember(tenantId, req.userId!, {
        email: typeof body.email === 'string' ? body.email : '',
        role: typeof body.role === 'string' ? body.role as any : 'viewer',
        firstName: typeof body.firstName === 'string' ? body.firstName : undefined,
        lastName: typeof body.lastName === 'string' ? body.lastName : undefined,
      });
      res.status(201).json(record);
    } catch (error) {
      console.error(`[${req.correlationId}] Governance access member invite error:`, error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to invite governance team member',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

app.put(
  '/governance/access/members/:memberId',
  requireBearerAuthorization({}),
  requireGovernanceRouteAccess('/access', 'PUT', 'Governance access administration denied'),
  async (req, res) => {
    const tenantId = resolveRequiredTenantId(req);
    if (!tenantId) {
      res.status(400).json({
        error: `Missing ${LOCAL_TENANT_HEADER} tenant context`,
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    try {
      const body = typeof req.body === 'object' && req.body ? req.body as Record<string, unknown> : {};
      const record = LocalSettingsStore.updateTeamMember(tenantId, req.params.memberId, {
        role: typeof body.role === 'string' ? body.role as any : undefined,
        status: typeof body.status === 'string' ? body.status as any : undefined,
      });
      res.json(record);
    } catch (error) {
      console.error(`[${req.correlationId}] Governance access member update error:`, error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to update governance team member',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

app.delete(
  '/governance/access/members/:memberId',
  requireBearerAuthorization({}),
  requireGovernanceRouteAccess('/access', 'DELETE', 'Governance access administration denied'),
  async (req, res) => {
    const tenantId = resolveRequiredTenantId(req);
    if (!tenantId) {
      res.status(400).json({
        error: `Missing ${LOCAL_TENANT_HEADER} tenant context`,
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    try {
      LocalSettingsStore.removeTeamMember(tenantId, req.params.memberId);
      res.status(204).end();
    } catch (error) {
      console.error(`[${req.correlationId}] Governance access member removal error:`, error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to remove governance team member',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

app.get(
  '/governance/access/roles',
  requireBearerAuthorization({}),
  requireGovernanceRouteAccess('/access', 'GET', 'Governance access administration denied'),
  async (req, res) => {
    try {
      res.json(LocalGovernanceAccessStore.listRoles());
    } catch (error) {
      console.error(`[${req.correlationId}] Governance access roles error:`, error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to load governance access roles',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

app.get(
  '/governance/access/assignments',
  requireBearerAuthorization({}),
  requireGovernanceRouteAccess('/access', 'GET', 'Governance access administration denied'),
  async (req, res) => {
    const tenantId = resolveRequiredTenantId(req);
    if (!tenantId) {
      res.status(400).json({
        error: `Missing ${LOCAL_TENANT_HEADER} tenant context`,
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    try {
      res.json({
        ...filterCmsAssignmentsForTenant(tenantId),
        tenant_id: tenantId,
      });
    } catch (error) {
      console.error(`[${req.correlationId}] Governance access assignments error:`, error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to load governance access assignments',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

app.post(
  '/governance/access/assignments',
  requireBearerAuthorization({}),
  requireGovernanceRouteAccess('/access', 'POST', 'Governance access administration denied'),
  async (req, res) => {
    const tenantId = resolveRequiredTenantId(req);
    if (!tenantId) {
      res.status(400).json({
        error: `Missing ${LOCAL_TENANT_HEADER} tenant context`,
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    try {
      const body = typeof req.body === 'object' && req.body ? req.body as Record<string, unknown> : {};
      const principalId = typeof body.principal_id === 'string' ? body.principal_id : '';
      ensureCmsTenantMember(tenantId, principalId);
      const record = LocalGovernanceAccessStore.createAssignment(req.userId!, {
        role_id: typeof body.role_id === 'string' ? body.role_id : '',
        principal_type: 'USER',
        principal_id: principalId,
        principal_label: typeof body.principal_label === 'string' ? body.principal_label : principalId,
      });
      res.status(201).json(record);
    } catch (error) {
      console.error(`[${req.correlationId}] Governance access assignment create error:`, error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create governance role assignment',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

app.put(
  '/governance/access/assignments/:assignmentId',
  requireBearerAuthorization({}),
  requireGovernanceRouteAccess('/access', 'PUT', 'Governance access administration denied'),
  async (req, res) => {
    const tenantId = resolveRequiredTenantId(req);
    if (!tenantId) {
      res.status(400).json({
        error: `Missing ${LOCAL_TENANT_HEADER} tenant context`,
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    try {
      const assignmentResponse = filterCmsAssignmentsForTenant(tenantId);
      const assignment = assignmentResponse.assignments.find((candidate) => candidate.id === req.params.assignmentId);
      if (!assignment) {
        throw new Error(`Unknown CMS role assignment: ${req.params.assignmentId}`);
      }
      if (assignment.principal_type === 'USER') {
        ensureCmsTenantMember(tenantId, assignment.principal_id);
      }
      const body = typeof req.body === 'object' && req.body ? req.body as Record<string, unknown> : {};
      const record = LocalGovernanceAccessStore.updateAssignment(req.userId!, req.params.assignmentId, {
        principal_label: typeof body.principal_label === 'string' ? body.principal_label : undefined,
        status: typeof body.status === 'string' ? body.status as any : undefined,
      });
      res.json(record);
    } catch (error) {
      console.error(`[${req.correlationId}] Governance access assignment update error:`, error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to update governance role assignment',
        correlation_id: req.correlationId,
        timestamp: new Date().toISOString(),
      });
    }
  },
);

app.get('/api/v1/iam/validation-domains', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFoundationStore.listValidationDomains());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM validation domains error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM validation domains',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/attributes', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFoundationStore.listRealmAttributes(req.params.realmId));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM realm attributes error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM realm attributes',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/attributes', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamFoundationStore.createRealmAttributeAsync(actorUserId, req.params.realmId, req.body);
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_REALM_ATTRIBUTE_CREATED',
      entityType: 'iam_realm_attribute',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/attributes',
      correlationId: req.correlationId,
      summary: `Created IAM realm attribute ${record.key} for ${req.params.realmId}.`,
      metadata: {
        realm_id: req.params.realmId,
        key: record.key,
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM create realm attribute error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM realm attribute',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/realms/:realmId/attributes/:attributeKey', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamFoundationStore.updateRealmAttributeAsync(
      actorUserId,
      req.params.realmId,
      decodeURIComponent(req.params.attributeKey),
      req.body,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_REALM_ATTRIBUTE_UPDATED',
      entityType: 'iam_realm_attribute',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/attributes/:attributeKey',
      correlationId: req.correlationId,
      summary: `Updated IAM realm attribute ${record.key} for ${req.params.realmId}.`,
      metadata: {
        realm_id: req.params.realmId,
        key: record.key,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM update realm attribute error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM realm attribute',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.delete('/api/v1/iam/realms/:realmId/attributes/:attributeKey', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const decodedKey = decodeURIComponent(req.params.attributeKey);
    await LocalIamFoundationStore.deleteRealmAttributeAsync(actorUserId, req.params.realmId, decodedKey);
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_REALM_ATTRIBUTE_DELETED',
      entityType: 'iam_realm_attribute',
      entityId: `${req.params.realmId}:${decodedKey}`,
      sourceRoute: '/api/v1/iam/realms/:realmId/attributes/:attributeKey',
      correlationId: req.correlationId,
      summary: `Deleted IAM realm attribute ${decodedKey} for ${req.params.realmId}.`,
      metadata: {
        realm_id: req.params.realmId,
        key: decodedKey,
      }
    });
    res.status(204).send();
  } catch (error) {
    console.error(`[${req.correlationId}] IAM delete realm attribute error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to delete IAM realm attribute',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamFoundationStore.createRealmAsync(actorUserId, req.body as CreateIamRealmRequest);
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_REALM_CREATED',
      entityType: 'iam_realm',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/realms',
      correlationId: req.correlationId,
      summary: `Created IAM realm ${record.name}.`,
      metadata: {
        scope_kind: record.scope_kind,
        status: record.status,
        template_id: record.template_id,
        source_realm_id: record.source_realm_id,
        owner_tenant_id: record.owner_tenant_id
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM create realm error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM realm',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/realms/:realmId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamFoundationStore.updateRealmAsync(
      actorUserId,
      req.params.realmId,
      req.body as UpdateIamRealmRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_REALM_UPDATED',
      entityType: 'iam_realm',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/realms/:realmId',
      correlationId: req.correlationId,
      summary: `Updated IAM realm ${record.name}.`,
      metadata: {
        scope_kind: record.scope_kind,
        status: record.status,
        owner_tenant_id: record.owner_tenant_id
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM update realm error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM realm',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/realm-bindings/:bindingId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamFoundationStore.updateRealmBindingAsync(
      actorUserId,
      req.params.bindingId,
      req.body as UpdateIamRealmBindingRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_REALM_BINDING_UPDATED',
      entityType: 'iam_realm_binding',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/realm-bindings/:bindingId',
      correlationId: req.correlationId,
      summary: `Updated IAM binding for ${record.binding_target_name}.`,
      metadata: {
        binding_target_kind: record.binding_target_kind,
        binding_target_id: record.binding_target_id,
        binding_mode: record.binding_mode,
        realm_id: record.realm_id
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM update realm binding error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM realm binding',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/auth-flows', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamAuthFlowStore.listFlows({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      kind: normalizeHeaderValue(req.query.kind as string | undefined) as IamAuthFlowKind | null,
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM auth flows error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM auth flows',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/auth-flows', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamAuthFlowStore.createFlowAsync(actorUserId, req.body as CreateIamAuthFlowRequest);
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_AUTH_FLOW_CREATED',
      entityType: 'iam_auth_flow',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/auth-flows',
      correlationId: req.correlationId,
      summary: `Created IAM auth flow ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        kind: record.kind,
        top_level: record.top_level,
        status: record.status,
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM create auth flow error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM auth flow',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/auth-flows/:flowId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamAuthFlowStore.updateFlowAsync(
      actorUserId,
      req.params.flowId,
      req.body as UpdateIamAuthFlowRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_AUTH_FLOW_UPDATED',
      entityType: 'iam_auth_flow',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/auth-flows/:flowId',
      correlationId: req.correlationId,
      summary: `Updated IAM auth flow ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        kind: record.kind,
        top_level: record.top_level,
        status: record.status,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM update auth flow error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM auth flow',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/auth-executions', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamAuthFlowStore.listExecutions({
      flow_id: normalizeHeaderValue(req.query.flow_id as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM auth executions error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM auth executions',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/auth-executions', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamAuthFlowStore.createExecutionAsync(
      actorUserId,
      req.body as CreateIamAuthExecutionRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_AUTH_EXECUTION_CREATED',
      entityType: 'iam_auth_execution',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/auth-executions',
      correlationId: req.correlationId,
      summary: `Created IAM auth execution ${record.display_name}.`,
      metadata: {
        realm_id: record.realm_id,
        flow_id: record.flow_id,
        execution_kind: record.execution_kind,
        authenticator_kind: record.authenticator_kind,
        subflow_id: record.subflow_id,
        requirement: record.requirement,
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM create auth execution error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM auth execution',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/auth-executions/:executionId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamAuthFlowStore.updateExecutionAsync(
      actorUserId,
      req.params.executionId,
      req.body as UpdateIamAuthExecutionRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_AUTH_EXECUTION_UPDATED',
      entityType: 'iam_auth_execution',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/auth-executions/:executionId',
      correlationId: req.correlationId,
      summary: `Updated IAM auth execution ${record.display_name}.`,
      metadata: {
        realm_id: record.realm_id,
        flow_id: record.flow_id,
        execution_kind: record.execution_kind,
        authenticator_kind: record.authenticator_kind,
        subflow_id: record.subflow_id,
        requirement: record.requirement,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM update auth execution error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM auth execution',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/auth-flow-bindings', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamAuthFlowStore.listBindings({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      client_id: normalizeHeaderValue(req.query.client_id as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM auth flow bindings error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM auth flow bindings',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/realms/:realmId/auth-flow-bindings', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamAuthFlowStore.updateRealmBindingsAsync(
      actorUserId,
      req.params.realmId,
      req.body as UpdateIamRealmAuthFlowBindingsRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_REALM_AUTH_FLOW_BINDINGS_UPDATED',
      entityType: 'iam_auth_flow_binding',
      entityId: record.realm_id,
      sourceRoute: '/api/v1/iam/realms/:realmId/auth-flow-bindings',
      correlationId: req.correlationId,
      summary: `Updated realm auth-flow bindings for ${record.realm_id}.`,
      metadata: {
        browser_flow_id: record.browser_flow_id,
        direct_grant_flow_id: record.direct_grant_flow_id,
        account_console_flow_id: record.account_console_flow_id,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM realm auth flow bindings update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM realm auth flow bindings',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/clients/:clientId/auth-flow-bindings', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamAuthFlowStore.updateClientBindingsAsync(
      actorUserId,
      req.params.clientId,
      req.body as UpdateIamClientAuthFlowBindingsRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_CLIENT_AUTH_FLOW_BINDINGS_UPDATED',
      entityType: 'iam_client_auth_flow_binding',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/clients/:clientId/auth-flow-bindings',
      correlationId: req.correlationId,
      summary: `Updated client auth-flow bindings for ${record.client_id}.`,
      metadata: {
        realm_id: record.realm_id,
        browser_flow_id: record.browser_flow_id,
        direct_grant_flow_id: record.direct_grant_flow_id,
        account_console_flow_id: record.account_console_flow_id,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM client auth flow bindings update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM client auth flow bindings',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/users', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    const response = LocalIamFoundationStore.listUsers({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      search: normalizeHeaderValue(req.query.search as string | undefined),
    }, parseListPagination(req));
    if (req.iamAdminContext?.mode === 'REALM_SCOPED_ADMIN') {
      response.users = LocalIamAdminAuthorizationStore.filterUsersForActor(
        req.iamAdminContext.realmId,
        req.userId!,
        response.users,
      );
      response.count = response.users.length;
    }
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM users error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM users',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/users', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamFoundationStore.createUserAsync(actorUserId, req.body as CreateIamUserRequest);
    await LocalIamProtocolRuntimeStore.ensureUserCredentialAsync(record);
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_USER_CREATED',
      entityType: 'iam_user',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/users',
      correlationId: req.correlationId,
      summary: `Created IAM user ${record.username}.`,
      metadata: {
        realm_id: record.realm_id,
        status: record.status,
        group_ids: record.group_ids,
        role_ids: record.role_ids
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM create user error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM user',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/users/:userId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamFoundationStore.updateUserAsync(
      actorUserId,
      req.params.userId,
      req.body as UpdateIamUserRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_USER_UPDATED',
      entityType: 'iam_user',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/users/:userId',
      correlationId: req.correlationId,
      summary: `Updated IAM user ${record.username}.`,
      metadata: {
        realm_id: record.realm_id,
        status: record.status,
        group_ids: record.group_ids,
        role_ids: record.role_ids
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM update user error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM user',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/profile-schemas', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamUserProfileStore.listSchemas({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM profile schemas error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM profile schemas',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/realms/:realmId/profile-schema', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamUserProfileStore.updateSchemaAsync(
      actorUserId,
      req.params.realmId,
      req.body as UpdateIamUserProfileSchemaRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_USER_PROFILE_SCHEMA_UPDATED',
      entityType: 'iam_user_profile_schema',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/profile-schema',
      correlationId: req.correlationId,
      summary: `Updated IAM profile schema for ${req.params.realmId}.`,
      metadata: {
        realm_id: req.params.realmId,
        attribute_count: record.attributes.length,
        status: record.status,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM profile schema update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM profile schema',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/users/:userId/profile', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    const user = LocalIamFoundationStore.getUserById(req.params.userId);
    res.json(LocalIamUserProfileStore.getUserProfile(user.realm_id, user.id, 'ADMIN'));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM user profile read error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM user profile',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/users/:userId/profile', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const user = LocalIamFoundationStore.getUserById(req.params.userId);
    const record = await LocalIamUserProfileStore.updateUserProfileAsync(
      actorUserId,
      user.realm_id,
      user.id,
      req.body as UpdateIamUserProfileRequest,
      'ADMIN',
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_USER_PROFILE_UPDATED',
      entityType: 'iam_user_profile',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/users/:userId/profile',
      correlationId: req.correlationId,
      summary: `Updated IAM user profile for ${user.username}.`,
      metadata: {
        realm_id: user.realm_id,
        attribute_keys: Object.keys(record.attributes),
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM user profile update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM user profile',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/users/:userId/security', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    const user = LocalIamFoundationStore.getUserById(req.params.userId);
    res.json(LocalIamAuthenticationRuntimeStore.getUserSecuritySummary(user.realm_id, user.id));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM user security summary error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM user security summary',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/users/:userId/login-history', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    const user = LocalIamFoundationStore.getUserById(req.params.userId);
    const limit = req.query.limit ? Number.parseInt(String(req.query.limit), 10) : undefined;
    res.json(LocalIamAuthenticationRuntimeStore.listUserLoginHistory(
      user.realm_id,
      user.id,
      Number.isFinite(limit) ? limit : 50,
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM user login history error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM user login history',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/users/:userId/reset-password', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const user = LocalIamFoundationStore.getUserById(req.params.userId);
    const result = await LocalIamAuthenticationRuntimeStore.adminResetUserPasswordAsync(
      user.realm_id,
      user.id,
      req.body as AdminResetIamUserPasswordInput,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_ADMIN_PASSWORD_RESET',
      entityType: 'iam_user',
      entityId: user.id,
      sourceRoute: '/api/v1/iam/users/:userId/reset-password',
      correlationId: req.correlationId,
      summary: `Reset standalone IAM password for ${user.username}.`,
      metadata: {
        realm_id: user.realm_id,
        requires_update_password: result.requires_update_password,
        revoked_session_count: result.revoked_session_count,
        revoked_token_count: result.revoked_token_count,
        lockout_cleared: result.lockout_cleared,
      }
    });
    res.json(result);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM admin password reset error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to reset IAM user password',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/users/:userId/revoke-sessions', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const user = LocalIamFoundationStore.getUserById(req.params.userId);
    const revokeTokens = (req.body as { revoke_tokens?: boolean } | undefined)?.revoke_tokens;
    const result = await LocalIamAuthenticationRuntimeStore.adminRevokeUserSessionsAsync(user.realm_id, user.id, {
      revoke_tokens: revokeTokens,
    });
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_ADMIN_USER_SESSIONS_REVOKED',
      entityType: 'iam_user',
      entityId: user.id,
      sourceRoute: '/api/v1/iam/users/:userId/revoke-sessions',
      correlationId: req.correlationId,
      summary: `Revoked standalone IAM sessions for ${user.username}.`,
      metadata: {
        realm_id: user.realm_id,
        revoked_session_count: result.revoked_session_count,
        revoked_token_count: result.revoked_token_count,
      }
    });
    res.json(result);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM admin revoke sessions error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to revoke IAM user sessions',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/users/:userId/clear-lockout', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const user = LocalIamFoundationStore.getUserById(req.params.userId);
    const result = await LocalIamAuthenticationRuntimeStore.adminClearUserLockoutAsync(user.realm_id, user.id);
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_ACCOUNT_LOCKOUT_CLEARED',
      entityType: 'iam_user',
      entityId: user.id,
      sourceRoute: '/api/v1/iam/users/:userId/clear-lockout',
      correlationId: req.correlationId,
      summary: `Cleared standalone IAM lockout state for ${user.username}.`,
      metadata: {
        realm_id: user.realm_id,
      }
    });
    res.json(result);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM clear lockout error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to clear IAM user lockout',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/users/:userId/impersonate', requireIamAdministrativePermission({
  domain: 'USERS',
  action: 'IMPERSONATE',
}), async (req, res) => {
  try {
    const targetUser = LocalIamFoundationStore.getUserById(req.params.userId);
    const actorUserId = req.userId!;
    const response = await LocalIamAuthenticationRuntimeStore.impersonateUserAsync(
      targetUser.realm_id,
      actorUserId,
      targetUser.id,
      {
        client_id: normalizeHeaderValue(req.body?.client_id),
        scope: Array.isArray(req.body?.scope)
          ? req.body.scope.map((value: string) => normalizeHeaderValue(value) ?? '').filter(Boolean)
          : typeof req.body?.scope === 'string'
            ? req.body.scope.split(/\s+/).map((value: string) => value.trim()).filter(Boolean)
            : [],
      },
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_ADMIN_IMPERSONATION_STARTED',
      entityType: 'iam_user',
      entityId: targetUser.id,
      sourceRoute: '/api/v1/iam/users/:userId/impersonate',
      correlationId: req.correlationId,
      summary: `Issued IAM impersonation session for ${targetUser.username}.`,
      metadata: {
        realm_id: targetUser.realm_id,
        impersonated_session_id: response.session_id ?? null,
        client_id: response.client?.client_id ?? null,
      }
    });
    res.status(201).json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM impersonation error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to impersonate IAM user',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/organizations', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamOrganizationStore.listOrganizations({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      search: normalizeHeaderValue(req.query.search as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM organizations error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM organizations',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/organizations', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamOrganizationStore.createOrganizationAsync(
      actorUserId,
      req.body as CreateIamOrganizationRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_ORGANIZATION_CREATED',
      entityType: 'iam_organization',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/organizations',
      correlationId: req.correlationId,
      summary: `Created IAM organization ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        kind: record.kind,
        linked_identity_provider_aliases: record.linked_identity_provider_aliases,
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM organization create error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM organization',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/organizations/:organizationId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamOrganizationStore.updateOrganizationAsync(
      actorUserId,
      req.params.organizationId,
      req.body as UpdateIamOrganizationRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_ORGANIZATION_UPDATED',
      entityType: 'iam_organization',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/organizations/:organizationId',
      correlationId: req.correlationId,
      summary: `Updated IAM organization ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        kind: record.kind,
        status: record.status,
        linked_identity_provider_aliases: record.linked_identity_provider_aliases,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM organization update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM organization',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/organization-memberships', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamOrganizationStore.listMemberships({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      organization_id: normalizeHeaderValue(req.query.organization_id as string | undefined),
      user_id: normalizeHeaderValue(req.query.user_id as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM organization memberships error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM organization memberships',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/organization-memberships', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamOrganizationStore.createMembershipAsync(
      actorUserId,
      req.body as CreateIamOrganizationMembershipRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_ORGANIZATION_MEMBERSHIP_CREATED',
      entityType: 'iam_organization_membership',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/organization-memberships',
      correlationId: req.correlationId,
      summary: `Created IAM organization membership ${record.id}.`,
      metadata: {
        realm_id: record.realm_id,
        organization_id: record.organization_id,
        user_id: record.user_id,
        role: record.role,
        status: record.status,
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM organization membership create error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM organization membership',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/organization-memberships/:membershipId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamOrganizationStore.updateMembershipAsync(
      actorUserId,
      req.params.membershipId,
      req.body as UpdateIamOrganizationMembershipRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_ORGANIZATION_MEMBERSHIP_UPDATED',
      entityType: 'iam_organization_membership',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/organization-memberships/:membershipId',
      correlationId: req.correlationId,
      summary: `Updated IAM organization membership ${record.id}.`,
      metadata: {
        realm_id: record.realm_id,
        organization_id: record.organization_id,
        user_id: record.user_id,
        role: record.role,
        status: record.status,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM organization membership update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM organization membership',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/organization-invitations', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamOrganizationStore.listInvitations({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      organization_id: normalizeHeaderValue(req.query.organization_id as string | undefined),
      email: normalizeHeaderValue(req.query.email as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM organization invitations error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM organization invitations',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/organization-invitations', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamOrganizationStore.createInvitationAsync(
      actorUserId,
      req.body as CreateIamOrganizationInvitationRequest,
    );
    const clientId = normalizeHeaderValue(req.body?.client_id) ?? 'admin-console-demo';
    const activationHandoff = buildApplicationInvitationActivationHandoff(
      record.realm_id,
      clientId,
      record.email,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_ORGANIZATION_INVITATION_CREATED',
      entityType: 'iam_organization_invitation',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/organization-invitations',
      correlationId: req.correlationId,
      summary: `Created IAM organization invitation for ${record.email}.`,
      metadata: {
        realm_id: record.realm_id,
        organization_id: record.organization_id,
        role: record.role,
        linked_identity_provider_aliases: record.linked_identity_provider_aliases,
      }
    });
    res.status(201).json({
      ...record,
      client_id: clientId,
      activation_handoff: activationHandoff,
    });
  } catch (error) {
    console.error(`[${req.correlationId}] IAM organization invitation create error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM organization invitation',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/organization-invitations/:invitationId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamOrganizationStore.updateInvitationAsync(
      actorUserId,
      req.params.invitationId,
      req.body as UpdateIamOrganizationInvitationRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_ORGANIZATION_INVITATION_UPDATED',
      entityType: 'iam_organization_invitation',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/organization-invitations/:invitationId',
      correlationId: req.correlationId,
      summary: `Updated IAM organization invitation ${record.id}.`,
      metadata: {
        realm_id: record.realm_id,
        organization_id: record.organization_id,
        email: record.email,
        role: record.role,
        linked_identity_provider_aliases: record.linked_identity_provider_aliases,
        expires_at: record.expires_at,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM organization invitation update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM organization invitation',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/organization-invitations/:invitationId/revoke', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamOrganizationStore.revokeInvitationAsync(actorUserId, req.params.invitationId);
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_ORGANIZATION_INVITATION_REVOKED',
      entityType: 'iam_organization_invitation',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/organization-invitations/:invitationId/revoke',
      correlationId: req.correlationId,
      summary: `Revoked IAM organization invitation ${record.id}.`,
      metadata: {
        realm_id: record.realm_id,
        organization_id: record.organization_id,
        email: record.email,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM organization invitation revoke error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to revoke IAM organization invitation',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/groups', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    const response = LocalIamFoundationStore.listGroups({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
    }, parseListPagination(req));
    if (req.iamAdminContext?.mode === 'REALM_SCOPED_ADMIN') {
      response.groups = LocalIamAdminAuthorizationStore.filterGroupsForActor(
        req.iamAdminContext.realmId,
        req.userId!,
        response.groups,
      );
      response.count = response.groups.length;
    }
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM groups error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM groups',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/groups', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamFoundationStore.createGroupAsync(actorUserId, req.body as CreateIamGroupRequest);
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_GROUP_CREATED',
      entityType: 'iam_group',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/groups',
      correlationId: req.correlationId,
      summary: `Created IAM group ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        status: record.status,
        member_user_ids: record.member_user_ids,
        role_ids: record.role_ids
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM create group error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM group',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/groups/:groupId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamFoundationStore.updateGroupAsync(
      actorUserId,
      req.params.groupId,
      req.body as UpdateIamGroupRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_GROUP_UPDATED',
      entityType: 'iam_group',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/groups/:groupId',
      correlationId: req.correlationId,
      summary: `Updated IAM group ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        status: record.status,
        member_user_ids: record.member_user_ids,
        role_ids: record.role_ids
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM update group error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM group',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/roles', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    const response = LocalIamFoundationStore.listRoles({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      kind: normalizeHeaderValue(req.query.kind as string | undefined) as IamRoleKind | null,
    }, parseListPagination(req));
    if (req.iamAdminContext?.mode === 'REALM_SCOPED_ADMIN') {
      response.roles = LocalIamAdminAuthorizationStore.filterRolesForActor(
        req.iamAdminContext.realmId,
        req.userId!,
        response.roles,
      );
      response.count = response.roles.length;
    }
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM roles error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM roles',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/roles', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamFoundationStore.createRoleAsync(actorUserId, req.body as CreateIamRoleRequest);
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_ROLE_CREATED',
      entityType: 'iam_role',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/roles',
      correlationId: req.correlationId,
      summary: `Created IAM role ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        kind: record.kind,
        status: record.status,
        client_id: record.client_id,
        composite_role_ids: record.composite_role_ids
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM create role error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM role',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/roles/:roleId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamFoundationStore.updateRoleAsync(
      actorUserId,
      req.params.roleId,
      req.body as UpdateIamRoleRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_ROLE_UPDATED',
      entityType: 'iam_role',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/roles/:roleId',
      correlationId: req.correlationId,
      summary: `Updated IAM role ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        kind: record.kind,
        status: record.status,
        client_id: record.client_id,
        composite_role_ids: record.composite_role_ids
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM update role error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM role',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/delegated-admin', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFoundationStore.listDelegatedAdmins({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM delegated admin error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM delegated admin assignments',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/delegated-admin', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamFoundationStore.createDelegatedAdminAsync(
      actorUserId,
      req.body as CreateIamDelegatedAdminRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_DELEGATED_ADMIN_CREATED',
      entityType: 'iam_delegated_admin',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/delegated-admin',
      correlationId: req.correlationId,
      summary: `Created delegated admin assignment for ${record.principal_label}.`,
      metadata: {
        realm_id: record.realm_id,
        principal_kind: record.principal_kind,
        principal_id: record.principal_id,
        managed_role_ids: record.managed_role_ids,
        managed_group_ids: record.managed_group_ids,
        managed_client_ids: record.managed_client_ids
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM create delegated admin error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create delegated admin assignment',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/delegated-admin/:assignmentId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamFoundationStore.updateDelegatedAdminAsync(
      actorUserId,
      req.params.assignmentId,
      req.body as UpdateIamDelegatedAdminRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_DELEGATED_ADMIN_UPDATED',
      entityType: 'iam_delegated_admin',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/delegated-admin/:assignmentId',
      correlationId: req.correlationId,
      summary: `Updated delegated admin assignment for ${record.principal_label}.`,
      metadata: {
        realm_id: record.realm_id,
        principal_kind: record.principal_kind,
        principal_id: record.principal_id,
        status: record.status,
        managed_role_ids: record.managed_role_ids,
        managed_group_ids: record.managed_group_ids,
        managed_client_ids: record.managed_client_ids
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM update delegated admin error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update delegated admin assignment',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/admin-permissions', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamAdminAuthorizationStore.listPermissions({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      domain: normalizeHeaderValue(req.query.domain as string | undefined) as IamAdminPermissionDomain | null,
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM admin permissions error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM admin permissions',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/admin-permissions', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamAdminAuthorizationStore.createPermissionAsync(
      actorUserId,
      req.body as CreateIamAdminPermissionRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_ADMIN_PERMISSION_CREATED',
      entityType: 'iam_admin_permission',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/admin-permissions',
      correlationId: req.correlationId,
      summary: `Created IAM admin permission ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        domain: record.domain,
        actions: record.actions,
        scope_kind: record.scope_kind,
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM admin permission create error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM admin permission',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/admin-permissions/:permissionId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamAdminAuthorizationStore.updatePermissionAsync(
      actorUserId,
      req.params.permissionId,
      req.body as UpdateIamAdminPermissionRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_ADMIN_PERMISSION_UPDATED',
      entityType: 'iam_admin_permission',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/admin-permissions/:permissionId',
      correlationId: req.correlationId,
      summary: `Updated IAM admin permission ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        domain: record.domain,
        actions: record.actions,
        scope_kind: record.scope_kind,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM admin permission update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM admin permission',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/admin-policies', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamAdminAuthorizationStore.listPolicies({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      principal_id: normalizeHeaderValue(req.query.principal_id as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM admin policies error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM admin policies',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/admin-policies', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamAdminAuthorizationStore.createPolicyAsync(
      actorUserId,
      req.body as CreateIamAdminPolicyRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_ADMIN_POLICY_CREATED',
      entityType: 'iam_admin_policy',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/admin-policies',
      correlationId: req.correlationId,
      summary: `Created IAM admin policy ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        principal_kind: record.principal_kind,
        principal_id: record.principal_id,
        permission_ids: record.permission_ids,
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM admin policy create error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM admin policy',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/admin-policies/:policyId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamAdminAuthorizationStore.updatePolicyAsync(
      actorUserId,
      req.params.policyId,
      req.body as UpdateIamAdminPolicyRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_ADMIN_POLICY_UPDATED',
      entityType: 'iam_admin_policy',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/admin-policies/:policyId',
      correlationId: req.correlationId,
      summary: `Updated IAM admin policy ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        principal_kind: record.principal_kind,
        principal_id: record.principal_id,
        status: record.status,
        permission_ids: record.permission_ids,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM admin policy update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM admin policy',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/admin-evaluations', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamAdminAuthorizationStore.listEvaluations({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      actor_user_id: normalizeHeaderValue(req.query.actor_user_id as string | undefined),
      allowed: req.query.allowed === undefined
        ? null
        : `${req.query.allowed}` === 'true',
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM admin evaluations error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM admin evaluations',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/resource-servers', requireIamAdministrativePermission({
  domain: 'CLIENTS',
  action: 'READ'
}), async (req, res) => {
  try {
    res.json(LocalIamAuthorizationServicesStore.listResourceServers({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM resource servers error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM resource servers',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/resource-servers', requireIamAdministrativePermission({
  domain: 'CLIENTS',
  action: 'MANAGE'
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamAuthorizationServicesStore.createResourceServerAsync(
      actorUserId,
      req.body as CreateIamResourceServerRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_RESOURCE_SERVER_CREATED',
      entityType: 'iam_resource_server',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/resource-servers',
      correlationId: req.correlationId,
      summary: `Created IAM resource server ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        client_id: record.client_id,
        enforcement_mode: record.enforcement_mode,
        decision_strategy: record.decision_strategy,
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM resource server create error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM resource server',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/resource-servers/:resourceServerId', requireIamAdministrativePermission({
  domain: 'CLIENTS',
  action: 'MANAGE'
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamAuthorizationServicesStore.updateResourceServerAsync(
      actorUserId,
      req.params.resourceServerId,
      req.body as UpdateIamResourceServerRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_RESOURCE_SERVER_UPDATED',
      entityType: 'iam_resource_server',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/resource-servers/:resourceServerId',
      correlationId: req.correlationId,
      summary: `Updated IAM resource server ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        client_id: record.client_id,
        status: record.status,
        enforcement_mode: record.enforcement_mode,
        decision_strategy: record.decision_strategy,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM resource server update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM resource server',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/authz/scopes', requireIamAdministrativePermission({
  domain: 'CLIENTS',
  action: 'READ'
}), async (req, res) => {
  try {
    res.json(LocalIamAuthorizationServicesStore.listScopes({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      resource_server_id: normalizeHeaderValue(req.query.resource_server_id as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM authz scopes error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM protected scopes',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/authz/scopes', requireIamAdministrativePermission({
  domain: 'CLIENTS',
  action: 'MANAGE'
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamAuthorizationServicesStore.createScopeAsync(
      actorUserId,
      req.body as CreateIamProtectedScopeRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_AUTHZ_SCOPE_CREATED',
      entityType: 'iam_protected_scope',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/authz/scopes',
      correlationId: req.correlationId,
      summary: `Created IAM protected scope ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        resource_server_id: record.resource_server_id,
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM authz scope create error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM protected scope',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/authz/scopes/:scopeId', requireIamAdministrativePermission({
  domain: 'CLIENTS',
  action: 'MANAGE'
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamAuthorizationServicesStore.updateScopeAsync(
      actorUserId,
      req.params.scopeId,
      req.body as UpdateIamProtectedScopeRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_AUTHZ_SCOPE_UPDATED',
      entityType: 'iam_protected_scope',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/authz/scopes/:scopeId',
      correlationId: req.correlationId,
      summary: `Updated IAM protected scope ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        resource_server_id: record.resource_server_id,
        status: record.status,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM authz scope update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM protected scope',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/authz/resources', requireIamAdministrativePermission({
  domain: 'CLIENTS',
  action: 'READ'
}), async (req, res) => {
  try {
    res.json(LocalIamAuthorizationServicesStore.listResources({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      resource_server_id: normalizeHeaderValue(req.query.resource_server_id as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM authz resources error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM protected resources',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/authz/resources', requireIamAdministrativePermission({
  domain: 'CLIENTS',
  action: 'MANAGE'
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamAuthorizationServicesStore.createResourceAsync(
      actorUserId,
      req.body as CreateIamProtectedResourceRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_AUTHZ_RESOURCE_CREATED',
      entityType: 'iam_protected_resource',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/authz/resources',
      correlationId: req.correlationId,
      summary: `Created IAM protected resource ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        resource_server_id: record.resource_server_id,
        scope_ids: record.scope_ids,
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM authz resource create error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM protected resource',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/authz/resources/:resourceId', requireIamAdministrativePermission({
  domain: 'CLIENTS',
  action: 'MANAGE'
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamAuthorizationServicesStore.updateResourceAsync(
      actorUserId,
      req.params.resourceId,
      req.body as UpdateIamProtectedResourceRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_AUTHZ_RESOURCE_UPDATED',
      entityType: 'iam_protected_resource',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/authz/resources/:resourceId',
      correlationId: req.correlationId,
      summary: `Updated IAM protected resource ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        resource_server_id: record.resource_server_id,
        status: record.status,
        scope_ids: record.scope_ids,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM authz resource update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM protected resource',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/authz/policies', requireIamAdministrativePermission({
  domain: 'CLIENTS',
  action: 'READ'
}), async (req, res) => {
  try {
    res.json(LocalIamAuthorizationServicesStore.listPolicies({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      resource_server_id: normalizeHeaderValue(req.query.resource_server_id as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM authz policies error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM authorization policies',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/authz/policies', requireIamAdministrativePermission({
  domain: 'CLIENTS',
  action: 'MANAGE'
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamAuthorizationServicesStore.createPolicyAsync(
      actorUserId,
      req.body as CreateIamAuthorizationPolicyRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_AUTHZ_POLICY_CREATED',
      entityType: 'iam_authorization_policy',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/authz/policies',
      correlationId: req.correlationId,
      summary: `Created IAM authorization policy ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        resource_server_id: record.resource_server_id,
        kind: record.kind,
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM authz policy create error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM authorization policy',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/authz/policies/:policyId', requireIamAdministrativePermission({
  domain: 'CLIENTS',
  action: 'MANAGE'
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamAuthorizationServicesStore.updatePolicyAsync(
      actorUserId,
      req.params.policyId,
      req.body as UpdateIamAuthorizationPolicyRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_AUTHZ_POLICY_UPDATED',
      entityType: 'iam_authorization_policy',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/authz/policies/:policyId',
      correlationId: req.correlationId,
      summary: `Updated IAM authorization policy ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        resource_server_id: record.resource_server_id,
        kind: record.kind,
        status: record.status,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM authz policy update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM authorization policy',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/authz/permissions', requireIamAdministrativePermission({
  domain: 'CLIENTS',
  action: 'READ'
}), async (req, res) => {
  try {
    res.json(LocalIamAuthorizationServicesStore.listPermissions({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      resource_server_id: normalizeHeaderValue(req.query.resource_server_id as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM authz permissions error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM authorization permissions',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/authz/permissions', requireIamAdministrativePermission({
  domain: 'CLIENTS',
  action: 'MANAGE'
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamAuthorizationServicesStore.createPermissionAsync(
      actorUserId,
      req.body as CreateIamAuthorizationPermissionRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_AUTHZ_PERMISSION_CREATED',
      entityType: 'iam_authorization_permission',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/authz/permissions',
      correlationId: req.correlationId,
      summary: `Created IAM authorization permission ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        resource_server_id: record.resource_server_id,
        resource_ids: record.resource_ids,
        scope_ids: record.scope_ids,
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM authz permission create error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM authorization permission',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/authz/permissions/:permissionId', requireIamAdministrativePermission({
  domain: 'CLIENTS',
  action: 'MANAGE'
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamAuthorizationServicesStore.updatePermissionAsync(
      actorUserId,
      req.params.permissionId,
      req.body as UpdateIamAuthorizationPermissionRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_AUTHZ_PERMISSION_UPDATED',
      entityType: 'iam_authorization_permission',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/authz/permissions/:permissionId',
      correlationId: req.correlationId,
      summary: `Updated IAM authorization permission ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        resource_server_id: record.resource_server_id,
        status: record.status,
        resource_ids: record.resource_ids,
        scope_ids: record.scope_ids,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM authz permission update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM authorization permission',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/authz/evaluations', requireIamAdministrativePermission({
  domain: 'CLIENTS',
  action: 'READ'
}), async (req, res) => {
  try {
    res.json(LocalIamAuthorizationServicesStore.listEvaluations({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      resource_server_id: normalizeHeaderValue(req.query.resource_server_id as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM authz evaluations error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM authorization evaluations',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/authz/evaluate', requireIamAdministrativePermission({
  domain: 'CLIENTS',
  action: 'MANAGE'
}), async (req, res) => {
  try {
    res.json(LocalIamAuthorizationServicesStore.evaluate(req.body as EvaluateIamAuthorizationRequest));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM authz evaluation error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to evaluate IAM authorization request',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/permission-tickets', requireIamAdministrativePermission({
  domain: 'CLIENTS',
  action: 'READ'
}), async (req, res) => {
  try {
    res.json(LocalIamAuthorizationServicesStore.listPermissionTickets({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      resource_server_id: normalizeHeaderValue(req.query.resource_server_id as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM permission tickets error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve IAM permission tickets',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realm-exports', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamFoundationStore.listRealmExports({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
    }));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM realm exports error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM realm exports',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/export', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamFoundationStore.exportRealmAsync(actorUserId, req.params.realmId);
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_REALM_EXPORTED',
      entityType: 'iam_realm_export',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/realms/:realmId/export',
      correlationId: req.correlationId,
      summary: `Exported IAM realm ${record.realm_name}.`,
      metadata: {
        realm_id: record.realm_id,
        object_key: record.object_key,
        summary: record.summary
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM export realm error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to export IAM realm',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/clients', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    const response = LocalIamProtocolRuntimeStore.listClients({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      protocol: normalizeHeaderValue(req.query.protocol as string | undefined) as IamClientProtocol | null,
    }, parseListPagination(req));
    if (req.iamAdminContext?.mode === 'REALM_SCOPED_ADMIN') {
      response.clients = LocalIamAdminAuthorizationStore.filterClientsForActor(
        req.iamAdminContext.realmId,
        req.userId!,
        response.clients,
      );
      response.count = response.clients.length;
    }
    res.json(response);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM clients error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM clients',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/clients', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const result = await LocalIamProtocolRuntimeStore.createClientAsync(actorUserId, req.body as CreateIamClientRequest);
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_CLIENT_CREATED',
      entityType: 'iam_client',
      entityId: result.client.id,
      sourceRoute: '/api/v1/iam/clients',
      correlationId: req.correlationId,
      summary: `Created IAM client ${result.client.client_id}.`,
      metadata: {
        realm_id: result.client.realm_id,
        protocol: result.client.protocol,
        access_type: result.client.access_type,
        service_account_enabled: result.client.service_account_enabled
      }
    });
    res.status(201).json(result);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM create client error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM client',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/clients/:clientId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamProtocolRuntimeStore.updateClientAsync(
      actorUserId,
      req.params.clientId,
      req.body as UpdateIamClientRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_CLIENT_UPDATED',
      entityType: 'iam_client',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/clients/:clientId',
      correlationId: req.correlationId,
      summary: `Updated IAM client ${record.client_id}.`,
      metadata: {
        realm_id: record.realm_id,
        protocol: record.protocol,
        access_type: record.access_type,
        status: record.status
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM update client error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM client',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/clients/:clientId/rotate-secret', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const result = await LocalIamProtocolRuntimeStore.rotateClientSecretAsync(actorUserId, req.params.clientId);
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_CLIENT_SECRET_ROTATED',
      entityType: 'iam_client',
      entityId: result.client.id,
      sourceRoute: '/api/v1/iam/clients/:clientId/rotate-secret',
      correlationId: req.correlationId,
      summary: `Rotated secret for IAM client ${result.client.client_id}.`,
      metadata: {
        realm_id: result.client.realm_id,
        protocol: result.client.protocol
      }
    });
    res.json(result);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM rotate client secret error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to rotate IAM client secret',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/client-scopes', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamProtocolRuntimeStore.listClientScopes({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      protocol: normalizeHeaderValue(req.query.protocol as string | undefined) as IamClientProtocol | null,
    }, parseListPagination(req)));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM client scopes error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM client scopes',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/client-scopes', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamProtocolRuntimeStore.createClientScopeAsync(
      actorUserId,
      req.body as CreateIamClientScopeRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_CLIENT_SCOPE_CREATED',
      entityType: 'iam_client_scope',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/client-scopes',
      correlationId: req.correlationId,
      summary: `Created IAM client scope ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        protocol: record.protocol,
        assignment_type: record.assignment_type
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM create client scope error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM client scope',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/client-scopes/:scopeId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamProtocolRuntimeStore.updateClientScopeAsync(
      actorUserId,
      req.params.scopeId,
      req.body as UpdateIamClientScopeRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_CLIENT_SCOPE_UPDATED',
      entityType: 'iam_client_scope',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/client-scopes/:scopeId',
      correlationId: req.correlationId,
      summary: `Updated IAM client scope ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        protocol: record.protocol,
        status: record.status
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM update client scope error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM client scope',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/protocol-mappers', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamProtocolRuntimeStore.listProtocolMappers({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      target_kind: normalizeHeaderValue(req.query.target_kind as string | undefined) as 'CLIENT' | 'CLIENT_SCOPE' | null,
      target_id: normalizeHeaderValue(req.query.target_id as string | undefined),
      protocol: normalizeHeaderValue(req.query.protocol as string | undefined) as IamClientProtocol | null,
    }, parseListPagination(req)));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM protocol mappers error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM protocol mappers',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/protocol-mappers', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamProtocolRuntimeStore.createProtocolMapperAsync(
      actorUserId,
      req.body as CreateIamProtocolMapperRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_PROTOCOL_MAPPER_CREATED',
      entityType: 'iam_protocol_mapper',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/protocol-mappers',
      correlationId: req.correlationId,
      summary: `Created IAM protocol mapper ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        protocol: record.protocol,
        target_kind: record.target_kind,
        target_id: record.target_id,
        claim_name: record.claim_name
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM create protocol mapper error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM protocol mapper',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/protocol-mappers/:mapperId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamProtocolRuntimeStore.updateProtocolMapperAsync(
      actorUserId,
      req.params.mapperId,
      req.body as UpdateIamProtocolMapperRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_PROTOCOL_MAPPER_UPDATED',
      entityType: 'iam_protocol_mapper',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/protocol-mappers/:mapperId',
      correlationId: req.correlationId,
      summary: `Updated IAM protocol mapper ${record.name}.`,
      metadata: {
        realm_id: record.realm_id,
        protocol: record.protocol,
        target_kind: record.target_kind,
        target_id: record.target_id,
        claim_name: record.claim_name,
        status: record.status
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM update protocol mapper error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM protocol mapper',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/service-accounts', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamProtocolRuntimeStore.listServiceAccounts({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
    }, parseListPagination(req)));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM service accounts error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM service accounts',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/service-accounts/:serviceAccountId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const actorUserId = req.userId!;
    const record = await LocalIamProtocolRuntimeStore.updateServiceAccountAsync(
      actorUserId,
      req.params.serviceAccountId,
      req.body as UpdateIamServiceAccountRequest,
    );
    LocalAdminAuditStore.record({
      tenantId: IAM_PLATFORM_SCOPE_ID,
      actorUserId,
      action: 'IAM_SERVICE_ACCOUNT_UPDATED',
      entityType: 'iam_service_account',
      entityId: record.id,
      sourceRoute: '/api/v1/iam/service-accounts/:serviceAccountId',
      correlationId: req.correlationId,
      summary: `Updated IAM service account ${record.username}.`,
      metadata: {
        realm_id: record.realm_id,
        client_id: record.client_id,
        role_ids: record.role_ids,
        status: record.status,
      }
    });
    res.json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM update service account error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM service account',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/issued-tokens', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamProtocolRuntimeStore.listIssuedTokens({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      client_id: normalizeHeaderValue(req.query.client_id as string | undefined),
    }, parseListPagination(req)));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM issued tokens error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve IAM issued tokens',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/client-policies', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamAdvancedOAuthRuntimeStore.listClientPolicies({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
    }, parseListPagination(req)));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM client policies error:`, error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list IAM client policies',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/client-policies', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const request: CreateIamClientPolicyRequest = {
      realm_id: normalizeHeaderValue(req.body?.realm_id) ?? '',
      name: normalizeHeaderValue(req.body?.name) ?? '',
      description: normalizeHeaderValue(req.body?.description) ?? undefined,
      status: normalizeHeaderValue(req.body?.status) as CreateIamClientPolicyRequest['status'],
      allow_dynamic_registration: typeof req.body?.allow_dynamic_registration === 'boolean' ? req.body.allow_dynamic_registration : undefined,
      allow_device_authorization: typeof req.body?.allow_device_authorization === 'boolean' ? req.body.allow_device_authorization : undefined,
      allow_token_exchange: typeof req.body?.allow_token_exchange === 'boolean' ? req.body.allow_token_exchange : undefined,
      allow_pushed_authorization_requests: typeof req.body?.allow_pushed_authorization_requests === 'boolean' ? req.body.allow_pushed_authorization_requests : undefined,
      require_par_for_public_clients: typeof req.body?.require_par_for_public_clients === 'boolean' ? req.body.require_par_for_public_clients : undefined,
      require_pkce_for_public_clients: typeof req.body?.require_pkce_for_public_clients === 'boolean' ? req.body.require_pkce_for_public_clients : undefined,
      allow_wildcard_redirect_uris: typeof req.body?.allow_wildcard_redirect_uris === 'boolean' ? req.body.allow_wildcard_redirect_uris : undefined,
      allowed_protocols: Array.isArray(req.body?.allowed_protocols) ? req.body.allowed_protocols : undefined,
      allowed_access_types: Array.isArray(req.body?.allowed_access_types) ? req.body.allowed_access_types : undefined,
      default_scope_ids: Array.isArray(req.body?.default_scope_ids) ? req.body.default_scope_ids : undefined,
      assigned_client_ids: Array.isArray(req.body?.assigned_client_ids) ? req.body.assigned_client_ids : undefined,
    };
    res.status(201).json(await LocalIamAdvancedOAuthRuntimeStore.createClientPolicyAsync(req.userId, request));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM client policy create error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM client policy',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/client-policies/:policyId', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const request: UpdateIamClientPolicyRequest = {
      name: normalizeHeaderValue(req.body?.name) ?? undefined,
      description: normalizeHeaderValue(req.body?.description) ?? undefined,
      status: normalizeHeaderValue(req.body?.status) as UpdateIamClientPolicyRequest['status'],
      allow_dynamic_registration: typeof req.body?.allow_dynamic_registration === 'boolean' ? req.body.allow_dynamic_registration : undefined,
      allow_device_authorization: typeof req.body?.allow_device_authorization === 'boolean' ? req.body.allow_device_authorization : undefined,
      allow_token_exchange: typeof req.body?.allow_token_exchange === 'boolean' ? req.body.allow_token_exchange : undefined,
      allow_pushed_authorization_requests: typeof req.body?.allow_pushed_authorization_requests === 'boolean' ? req.body.allow_pushed_authorization_requests : undefined,
      require_par_for_public_clients: typeof req.body?.require_par_for_public_clients === 'boolean' ? req.body.require_par_for_public_clients : undefined,
      require_pkce_for_public_clients: typeof req.body?.require_pkce_for_public_clients === 'boolean' ? req.body.require_pkce_for_public_clients : undefined,
      allow_wildcard_redirect_uris: typeof req.body?.allow_wildcard_redirect_uris === 'boolean' ? req.body.allow_wildcard_redirect_uris : undefined,
      allowed_protocols: Array.isArray(req.body?.allowed_protocols) ? req.body.allowed_protocols : undefined,
      allowed_access_types: Array.isArray(req.body?.allowed_access_types) ? req.body.allowed_access_types : undefined,
      default_scope_ids: Array.isArray(req.body?.default_scope_ids) ? req.body.default_scope_ids : undefined,
      assigned_client_ids: Array.isArray(req.body?.assigned_client_ids) ? req.body.assigned_client_ids : undefined,
    };
    res.json(await LocalIamAdvancedOAuthRuntimeStore.updateClientPolicyAsync(req.userId, req.params.policyId, request));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM client policy update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update IAM client policy',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/initial-access-tokens', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamAdvancedOAuthRuntimeStore.listInitialAccessTokens({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
    }, parseListPagination(req)));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM initial access token list error:`, error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list IAM initial access tokens',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/initial-access-tokens', requireGlobalPermission({
  all_of: ['iam.manage']
}), async (req, res) => {
  try {
    const request: CreateIamInitialAccessTokenRequest = {
      realm_id: normalizeHeaderValue(req.body?.realm_id) ?? '',
      policy_id: normalizeHeaderValue(req.body?.policy_id) ?? '',
      label: normalizeHeaderValue(req.body?.label) ?? '',
      max_uses: typeof req.body?.max_uses === 'number' ? req.body.max_uses : undefined,
      expires_in_hours: typeof req.body?.expires_in_hours === 'number' ? req.body.expires_in_hours : undefined,
    };
    res.status(201).json(await LocalIamAdvancedOAuthRuntimeStore.issueInitialAccessTokenAsync(req.userId, request));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM initial access token create error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM initial access token',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/pushed-authorization-requests', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamAdvancedOAuthRuntimeStore.listPushedAuthorizationRequests({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      client_id: normalizeHeaderValue(req.query.client_id as string | undefined),
    }, parseListPagination(req)));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM PAR list error:`, error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list IAM pushed authorization requests',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/device-authorizations', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamAdvancedOAuthRuntimeStore.listDeviceAuthorizations({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      client_id: normalizeHeaderValue(req.query.client_id as string | undefined),
    }, parseListPagination(req)));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM device authorization list error:`, error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list IAM device authorizations',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/token-exchanges', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamAdvancedOAuthRuntimeStore.listTokenExchanges({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      client_id: normalizeHeaderValue(req.query.client_id as string | undefined),
    }, parseListPagination(req)));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM token exchange list error:`, error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list IAM token exchanges',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/.well-known/openid-configuration', async (req, res) => {
  try {
    res.json(LocalIamProtocolRuntimeStore.getOidcDiscoveryDocument(req.params.realmId, getLocalApiBaseUrl(req)));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM OIDC discovery error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve OIDC discovery document',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/protocol/openid-connect/auth', async (req, res) => {
  try {
    const pushedAuthorizationRequestUri = normalizeHeaderValue(req.query.request_uri as string | undefined);
    const requestInput = pushedAuthorizationRequestUri
      ? await LocalIamAdvancedOAuthRuntimeStore.resolvePushedAuthorizationRequestAsync(req.params.realmId, pushedAuthorizationRequestUri)
      : {
        client_id: normalizeHeaderValue(req.query.client_id as string | undefined) ?? '',
        redirect_uri: normalizeHeaderValue(req.query.redirect_uri as string | undefined) ?? '',
        response_type: normalizeHeaderValue(req.query.response_type as string | undefined),
        response_mode: normalizeHeaderValue(req.query.response_mode as string | undefined),
        scope: normalizeHeaderValue(req.query.scope as string | undefined),
        requested_purpose: normalizeHeaderValue(req.query.requested_purpose as string | undefined),
        state: normalizeHeaderValue(req.query.state as string | undefined),
        nonce: normalizeHeaderValue(req.query.nonce as string | undefined),
        prompt: normalizeHeaderValue(req.query.prompt as string | undefined),
        login_hint: normalizeHeaderValue(req.query.login_hint as string | undefined),
        flow_context: normalizeHeaderValue(req.query.flow_context as string | undefined),
        code_challenge: normalizeHeaderValue(req.query.code_challenge as string | undefined),
        code_challenge_method: normalizeHeaderValue(req.query.code_challenge_method as string | undefined) as 'plain' | 'S256' | null,
      };
    const response = await LocalIamAuthorizationRuntimeStore.createAuthorizationRedirectAsync(
      req.params.realmId,
      requestInput,
      getLocalUiBaseUrl(req),
    );
    res.redirect(302, response.redirect_url);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM authorization redirect error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to initiate authorization redirect',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/clients-registrations/openid-connect', async (req, res) => {
  try {
    const request: IamDynamicClientRegistrationRequest = {
      client_name: normalizeHeaderValue(req.body?.client_name) ?? '',
      client_id: normalizeHeaderValue(req.body?.client_id) ?? undefined,
      redirect_uris: Array.isArray(req.body?.redirect_uris) ? req.body.redirect_uris : undefined,
      grant_types: Array.isArray(req.body?.grant_types) ? req.body.grant_types : undefined,
      token_endpoint_auth_method: normalizeHeaderValue(req.body?.token_endpoint_auth_method) as IamDynamicClientRegistrationRequest['token_endpoint_auth_method'],
      response_types: Array.isArray(req.body?.response_types) ? req.body.response_types : undefined,
      scope: normalizeHeaderValue(req.body?.scope) ?? undefined,
      client_uri: normalizeHeaderValue(req.body?.client_uri) ?? undefined,
      policy_id: normalizeHeaderValue(req.body?.policy_id) ?? undefined,
    };
    res.status(201).json(await LocalIamAdvancedOAuthRuntimeStore.registerDynamicClientAsync(
      req.params.realmId,
      normalizeHeaderValue(req.headers.authorization),
      request,
      `${getLocalApiBaseUrl(req)}/api/v1/iam/realms/${req.params.realmId}/clients-registrations/openid-connect`,
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM dynamic client registration error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to dynamically register IAM client',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/clients-registrations/openid-connect/:clientId', async (req, res) => {
  try {
    res.json(LocalIamAdvancedOAuthRuntimeStore.getDynamicClientRegistration(
      req.params.realmId,
      req.params.clientId,
      normalizeHeaderValue(req.headers.authorization),
      `${getLocalApiBaseUrl(req)}/api/v1/iam/realms/${req.params.realmId}/clients-registrations/openid-connect`,
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM dynamic client registration read error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve dynamic client registration',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/iam/realms/:realmId/clients-registrations/openid-connect/:clientId', async (req, res) => {
  try {
    const request: IamDynamicClientRegistrationRequest = {
      client_name: normalizeHeaderValue(req.body?.client_name) ?? '',
      client_id: normalizeHeaderValue(req.body?.client_id) ?? undefined,
      redirect_uris: Array.isArray(req.body?.redirect_uris) ? req.body.redirect_uris : undefined,
      grant_types: Array.isArray(req.body?.grant_types) ? req.body.grant_types : undefined,
      token_endpoint_auth_method: normalizeHeaderValue(req.body?.token_endpoint_auth_method) as IamDynamicClientRegistrationRequest['token_endpoint_auth_method'],
      response_types: Array.isArray(req.body?.response_types) ? req.body.response_types : undefined,
      scope: normalizeHeaderValue(req.body?.scope) ?? undefined,
      client_uri: normalizeHeaderValue(req.body?.client_uri) ?? undefined,
      policy_id: normalizeHeaderValue(req.body?.policy_id) ?? undefined,
    };
    res.json(await LocalIamAdvancedOAuthRuntimeStore.updateDynamicClientRegistrationAsync(
      req.params.realmId,
      req.params.clientId,
      normalizeHeaderValue(req.headers.authorization),
      request,
      `${getLocalApiBaseUrl(req)}/api/v1/iam/realms/${req.params.realmId}/clients-registrations/openid-connect`,
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM dynamic client registration update error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update dynamic client registration',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.delete('/api/v1/iam/realms/:realmId/clients-registrations/openid-connect/:clientId', async (req, res) => {
  try {
    res.json(await LocalIamAdvancedOAuthRuntimeStore.archiveDynamicClientRegistrationAsync(
      req.params.realmId,
      req.params.clientId,
      normalizeHeaderValue(req.headers.authorization),
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM dynamic client registration archive error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to archive dynamic client registration',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/protocol/openid-connect/ext/par/request', async (req, res) => {
  try {
    res.status(201).json(await LocalIamAdvancedOAuthRuntimeStore.createPushedAuthorizationRequestAsync(
      req.params.realmId,
      req.body as Record<string, unknown>,
      normalizeHeaderValue(req.headers.authorization),
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM PAR request error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create pushed authorization request',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/protocol/openid-connect/ext/ciba/auth', async (req, res) => {
  try {
    res.json(await LocalIamAdvancedOAuthRuntimeStore.createBackchannelAuthenticationRequestAsync(
      req.params.realmId,
      req.body as Record<string, unknown>,
      normalizeHeaderValue(req.headers.authorization),
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM CIBA backchannel auth error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to initialize CIBA backchannel authentication',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/ciba/verify', async (req, res) => {
  try {
    const sessionId = normalizeHeaderValue(req.headers[IAM_SESSION_HEADER]);
    if (!sessionId) {
      throw new Error('Missing IAM session header');
    }
    res.json(await LocalIamAdvancedOAuthRuntimeStore.verifyBackchannelAuthenticationAsync(
      req.params.realmId,
      sessionId,
      {
        auth_req_id: normalizeHeaderValue(req.body?.auth_req_id) ?? '',
        approve: req.body?.approve !== false,
      },
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM CIBA verify error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to verify CIBA backchannel authentication',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/protocol/openid-connect/auth/device', async (req, res) => {
  try {
    res.status(201).json(await LocalIamAdvancedOAuthRuntimeStore.createDeviceAuthorizationAsync(
      req.params.realmId,
      req.body as Record<string, unknown>,
      normalizeHeaderValue(req.headers.authorization),
      getLocalUiBaseUrl(req),
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM device authorization create error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create device authorization',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/device/verify', async (req, res) => {
  try {
    const sessionId = normalizeHeaderValue(req.headers[IAM_SESSION_HEADER]);
    if (!sessionId) {
      throw new Error('Missing IAM session header');
    }
    res.json(await LocalIamAdvancedOAuthRuntimeStore.verifyDeviceAuthorizationAsync(
      req.params.realmId,
      sessionId,
      {
        user_code: normalizeHeaderValue(req.body?.user_code) ?? '',
        approve: req.body?.approve !== false,
      },
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM device authorization verify error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to verify device authorization',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/protocol/openid-connect/auth/requests/:requestId', async (req, res) => {
  try {
    res.json(LocalIamAuthorizationRuntimeStore.getAuthorizationRequest(req.params.realmId, req.params.requestId));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM authorization request detail error:`, error);
    res.status(404).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve authorization request',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/protocol/openid-connect/auth/continue', async (req, res) => {
  try {
    const sessionId = normalizeHeaderValue(req.headers[IAM_SESSION_HEADER]);
    const authorizationRequestId = normalizeHeaderValue(req.body?.authorization_request_id);
    if (!sessionId || !authorizationRequestId) {
      throw new Error('Missing required authorization continuation fields');
    }
    res.json(await LocalIamAuthorizationRuntimeStore.continueAuthorizationRequestAsync(
      req.params.realmId,
      authorizationRequestId,
      sessionId,
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM authorization continuation error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to continue authorization request',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/protocol/openid-connect/certs', async (req, res) => {
  try {
    res.json(LocalIamProtocolRuntimeStore.getJwks());
  } catch (error) {
    console.error(`[${req.correlationId}] IAM JWKS error:`, error);
    res.status(500).json({
      error: 'Failed to retrieve JWKS',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/protocol/openid-connect/token', async (req, res) => {
  try {
    const payload = req.body as Record<string, unknown>;
    const grantType = normalizeHeaderValue(payload.grant_type as string | undefined);
    if (grantType === 'authorization_code') {
      res.json(await LocalIamAuthorizationRuntimeStore.exchangeAuthorizationCodeAsync(
        req.params.realmId,
        payload,
        normalizeHeaderValue(req.headers.authorization),
        getLocalApiBaseUrl(req),
      ));
      return;
    }
    if (grantType === 'urn:ietf:params:oauth:grant-type:device_code') {
      res.json(await LocalIamAdvancedOAuthRuntimeStore.exchangeDeviceAuthorizationCodeAsync(
        req.params.realmId,
        payload,
        normalizeHeaderValue(req.headers.authorization),
        getLocalApiBaseUrl(req),
      ));
      return;
    }
    if (grantType === 'urn:openid:params:grant-type:ciba') {
      res.json(await LocalIamAdvancedOAuthRuntimeStore.exchangeBackchannelAuthenticationTokenAsync(
        req.params.realmId,
        payload,
        normalizeHeaderValue(req.headers.authorization),
        getLocalApiBaseUrl(req),
      ));
      return;
    }
    if (grantType === 'urn:ietf:params:oauth:grant-type:token-exchange') {
      res.json(await LocalIamAdvancedOAuthRuntimeStore.exchangeTokenAsync(
        req.params.realmId,
        payload,
        normalizeHeaderValue(req.headers.authorization),
        getLocalApiBaseUrl(req),
      ));
      return;
    }
    if (grantType === 'urn:ietf:params:oauth:grant-type:uma-ticket') {
      res.json(await LocalIamAuthorizationServicesStore.exchangePermissionTicketAsync(
        req.params.realmId,
        payload,
        normalizeHeaderValue(req.headers.authorization),
        getLocalApiBaseUrl(req),
      ));
      return;
    }
    res.json(await LocalIamProtocolRuntimeStore.issueTokenFromPayloadAsync(
      req.params.realmId,
      payload,
      normalizeHeaderValue(req.headers.authorization),
      getLocalApiBaseUrl(req)
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM token issue error:`, error);
    res.status(400).json({
      ...mapStandaloneIamTokenError(error),
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/authz/permission-ticket', async (req, res) => {
  try {
    const record = await LocalIamAuthorizationServicesStore.createPermissionTicketAsync(
      req.params.realmId,
      req.body as Record<string, unknown>,
      normalizeHeaderValue(req.headers.authorization),
    );
    res.status(201).json(record);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM permission ticket create error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create IAM permission ticket',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/protocol/openid-connect/token/introspect', async (req, res) => {
  try {
    res.json(await LocalIamProtocolRuntimeStore.introspectTokenAsync(
      req.params.realmId,
      req.body as Record<string, unknown>,
      normalizeHeaderValue(req.headers.authorization)
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM token introspection error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to introspect token',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/protocol/openid-connect/revoke', async (req, res) => {
  try {
    res.json(await LocalIamProtocolRuntimeStore.revokeTokenAsync(
      req.params.realmId,
      req.body as Record<string, unknown>,
      normalizeHeaderValue(req.headers.authorization)
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM token revocation error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to revoke token',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/protocol/openid-connect/userinfo', async (req, res) => {
  try {
    const authorizationHeader = normalizeHeaderValue(req.headers.authorization);
    const bearerToken = authorizationHeader?.startsWith('Bearer ') ? authorizationHeader.slice(7).trim() : null;
    if (!bearerToken) {
      throw new Error('Missing bearer token');
    }
    res.json(await LocalIamProtocolRuntimeStore.getUserInfoAsync(req.params.realmId, bearerToken));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM userinfo error:`, error);
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve userinfo',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/protocol/saml/metadata', async (req, res) => {
  try {
    const clientId = normalizeHeaderValue(req.query.client_id as string | undefined);
    if (!clientId) {
      throw new Error('Missing required query parameter: client_id');
    }
    const metadata = LocalIamProtocolRuntimeStore.getSamlMetadata(req.params.realmId, clientId, getLocalApiBaseUrl(req));
    res.type('application/xml').send(metadata.metadata_xml);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM SAML metadata error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve SAML metadata',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/protocol/saml/auth', async (req, res) => {
  try {
    const clientId = normalizeHeaderValue(req.query.client_id as string | undefined);
    if (!clientId) {
      throw new Error('Missing required query parameter: client_id');
    }
    const response = await LocalIamProtocolRuntimeStore.createSamlAuthRedirectAsync(
      req.params.realmId,
      {
        client_id: clientId,
        acs_url: normalizeHeaderValue(req.query.acs_url as string | undefined)
          ?? normalizeHeaderValue(req.query.AssertionConsumerServiceURL as string | undefined),
        relay_state: normalizeHeaderValue(req.query.relay_state as string | undefined)
          ?? normalizeHeaderValue(req.query.RelayState as string | undefined),
        binding: (normalizeHeaderValue(req.query.binding as string | undefined) as 'POST' | 'REDIRECT' | null) ?? 'REDIRECT',
        request_id: normalizeHeaderValue(req.query.request_id as string | undefined),
        request_xml: normalizeHeaderValue(req.query.SAMLRequest as string | undefined),
        force_authn: normalizeHeaderValue(req.query.force_authn as string | undefined) === 'true'
          || normalizeHeaderValue(req.query.ForceAuthn as string | undefined) === 'true',
      },
      getLocalUiBaseUrl(req),
      getLocalApiBaseUrl(req),
    );
    res.redirect(302, response.redirect_url);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM SAML auth redirect error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to initiate SAML authentication request',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/realms/:realmId/protocol/saml/requests/:requestId', async (req, res) => {
  try {
    res.json(LocalIamProtocolRuntimeStore.getSamlAuthRequest(req.params.realmId, req.params.requestId));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM SAML request detail error:`, error);
    res.status(404).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve SAML request',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/protocol/saml/initiate', async (req, res) => {
  try {
    const clientId = normalizeHeaderValue(req.body?.client_id);
    if (!clientId) {
      throw new Error('Missing required SAML initiation fields');
    }
    res.json(await LocalIamProtocolRuntimeStore.createSamlIdpInitiatedRedirectAsync(
      req.params.realmId,
      {
        client_id: clientId,
        acs_url: normalizeHeaderValue(req.body?.acs_url),
        relay_state: normalizeHeaderValue(req.body?.relay_state),
        force_authn: normalizeHeaderValue(req.body?.force_authn) === 'true',
      },
      getLocalUiBaseUrl(req),
      getLocalApiBaseUrl(req),
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM SAML initiate error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to initiate IdP-initiated SAML authentication',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/protocol/saml/continue', async (req, res) => {
  try {
    const sessionId = normalizeHeaderValue(req.headers[IAM_SESSION_HEADER]);
    const samlRequestId = normalizeHeaderValue(req.body?.saml_request_id);
    if (!sessionId || !samlRequestId) {
      throw new Error('Missing required SAML continuation fields');
    }
    const sessionContext = LocalIamAuthenticationRuntimeStore.resolveAccountSession(req.params.realmId, sessionId);
    const interaction = LocalIamAuthenticationRuntimeStore.evaluateSessionInteraction(req.params.realmId, sessionId, {
      client_id: normalizeHeaderValue(req.body?.client_id)
        ?? LocalIamProtocolRuntimeStore.getSamlAuthRequest(req.params.realmId, samlRequestId).request.client_id,
      scope: ['saml-profile'],
      skip_mfa: true,
    });
    if (interaction.next_step !== 'AUTHENTICATED') {
      const resumedLogin = await LocalIamAuthenticationRuntimeStore.loginResolvedUserAsync(
        req.params.realmId,
        sessionContext.session.user_id,
        {
        client_id: normalizeHeaderValue(req.body?.client_id)
          ?? LocalIamProtocolRuntimeStore.getSamlAuthRequest(req.params.realmId, samlRequestId).request.client_id,
        scope: ['saml-profile'],
        skip_mfa: true,
      });
      if (resumedLogin.next_step !== 'AUTHENTICATED' || !resumedLogin.session_id) {
        res.json({
          status: 'INTERACTION_REQUIRED',
          request: LocalIamProtocolRuntimeStore.getSamlAuthRequest(req.params.realmId, samlRequestId).request,
          login_response: resumedLogin,
        });
        return;
      }
      res.json(await LocalIamProtocolRuntimeStore.continueSamlAuthRequestAsync(
        req.params.realmId,
        samlRequestId,
        {
          user_id: sessionContext.session.user_id,
          browser_session_id: resumedLogin.session_id,
        },
        getLocalApiBaseUrl(req),
      ));
      return;
    }
    res.json(await LocalIamProtocolRuntimeStore.continueSamlAuthRequestAsync(
      req.params.realmId,
      samlRequestId,
      {
        user_id: sessionContext.session.user_id,
        browser_session_id: sessionContext.session.session_id,
      },
      getLocalApiBaseUrl(req),
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM SAML continuation error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to continue SAML authentication request',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/protocol/saml/login', async (req, res) => {
  try {
    const clientId = normalizeHeaderValue(req.body?.client_id);
    const username = normalizeHeaderValue(req.body?.username);
    const password = normalizeHeaderValue(req.body?.password);
    if (!clientId || !username || !password) {
      throw new Error('Missing required SAML login fields');
    }
    res.json(await LocalIamProtocolRuntimeStore.performSamlLoginAsync(
      req.params.realmId,
      {
        client_id: clientId,
        username,
        password,
        relay_state: normalizeHeaderValue(req.body?.relay_state),
        saml_request_id: normalizeHeaderValue(req.body?.saml_request_id),
      },
      getLocalApiBaseUrl(req)
    ));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM SAML login error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to perform SAML login',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/iam/realms/:realmId/protocol/saml/logout', async (req, res) => {
  try {
    const clientId = normalizeHeaderValue(req.body?.client_id);
    const sessionIndex = normalizeHeaderValue(req.body?.session_index);
    const requestId = normalizeHeaderValue(req.body?.request_id);
    if (!clientId || !sessionIndex || !requestId) {
      throw new Error('Missing required SAML logout fields');
    }
    const logoutResponse = await LocalIamProtocolRuntimeStore.logoutSamlSessionAsync(
      req.params.realmId,
      {
        client_id: clientId,
        session_index: sessionIndex,
        relay_state: normalizeHeaderValue(req.body?.relay_state),
        request_id: requestId,
      },
      getLocalApiBaseUrl(req),
    );
    if (logoutResponse.browser_session_id) {
      try {
        await LocalIamAuthenticationRuntimeStore.logoutAsync(req.params.realmId, logoutResponse.browser_session_id);
        logoutResponse.browser_session_revoked = true;
      } catch {
        logoutResponse.browser_session_revoked = false;
      }
    }
    res.json(logoutResponse);
  } catch (error) {
    console.error(`[${req.correlationId}] IAM SAML logout error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to perform SAML logout',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/iam/saml-sessions', requireGlobalPermission({
  any_of: ['iam.read', 'iam.manage']
}), async (req, res) => {
  try {
    res.json(LocalIamProtocolRuntimeStore.listSamlSessions({
      realm_id: normalizeHeaderValue(req.query.realm_id as string | undefined),
      client_id: normalizeHeaderValue(req.query.client_id as string | undefined),
      status: normalizeHeaderValue(req.query.status as string | undefined) as 'ACTIVE' | 'TERMINATED' | 'EXPIRED' | null,
    }, parseListPagination(req)));
  } catch (error) {
    console.error(`[${req.correlationId}] IAM SAML sessions error:`, error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to list SAML sessions',
      correlation_id: req.correlationId,
      timestamp: new Date().toISOString()
    });
  }
});


app.use((_req, res) => {
  res.status(404).json({
    error: 'Route not found',
    timestamp: new Date().toISOString(),
  });
});

export { app };

if (require.main === module) {
  app.listen(port, idpListenHost, () => {
    // eslint-disable-next-line no-console
    console.log(`Standalone IDP API listening on ${canonicalApiBaseUrl}`);
  });
}
