import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import {
  readPersistedStateSnapshot,
} from './persistence';
import {
  createPersistedAsyncIamStateRepository,
  createPersistedIamStateRepository,
  type IamAsyncStateRepository,
  type IamStateRepository,
} from './iamStateRepository';
import { LocalIamFoundationStore } from './iamFoundation';
import { IAM_SYSTEM_USER_ID, rewriteIamIdentifiers } from './iamIdentifiers';

const LEGACY_IAM_ORGANIZATIONS_FILE = 'iam-organizations-state.json';
const IAM_ORGANIZATIONS_DIRECTORY_FILE = 'iam-organizations-directory-state.json';
const IAM_ORGANIZATIONS_INVITATIONS_FILE = 'iam-organizations-invitations-state.json';
const INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

export type IamOrganizationKind = 'COMPANY' | 'PARTNER' | 'PUBLIC_SECTOR' | 'TEAM' | 'EDUCATION';
export type IamOrganizationStatus = 'ACTIVE' | 'ARCHIVED';
export type IamOrganizationMembershipRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export type IamOrganizationMembershipStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'REVOKED';
export type IamOrganizationInvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

export interface IamOrganizationRecord {
  id: string;
  realm_id: string;
  name: string;
  slug: string;
  summary: string;
  kind: IamOrganizationKind;
  status: IamOrganizationStatus;
  domain_hint: string | null;
  linked_identity_provider_aliases: string[];
  synthetic: boolean;
  source_organization_id: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamOrganizationMembershipRecord {
  id: string;
  realm_id: string;
  organization_id: string;
  user_id: string;
  role: IamOrganizationMembershipRole;
  status: IamOrganizationMembershipStatus;
  synthetic: boolean;
  invited_at: string | null;
  joined_at: string | null;
  suspended_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamOrganizationInvitationRecord {
  id: string;
  realm_id: string;
  organization_id: string;
  email: string;
  role: IamOrganizationMembershipRole;
  status: IamOrganizationInvitationStatus;
  linked_identity_provider_aliases: string[];
  invited_user_id: string | null;
  accepted_membership_id: string | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

interface IamOrganizationsState {
  organizations: IamOrganizationRecord[];
  memberships: IamOrganizationMembershipRecord[];
  invitations: IamOrganizationInvitationRecord[];
}

interface IamOrganizationsDirectoryState {
  organizations: IamOrganizationRecord[];
  memberships: IamOrganizationMembershipRecord[];
}

interface IamOrganizationsInvitationsState {
  invitations: IamOrganizationInvitationRecord[];
}

interface IamOrganizationsDirectoryRepository extends IamStateRepository<IamOrganizationsDirectoryState> {}
interface IamAsyncOrganizationsDirectoryRepository extends IamAsyncStateRepository<IamOrganizationsDirectoryState> {}
interface IamOrganizationsInvitationsRepository extends IamStateRepository<IamOrganizationsInvitationsState> {}
interface IamAsyncOrganizationsInvitationsRepository extends IamAsyncStateRepository<IamOrganizationsInvitationsState> {}

export interface IamOrganizationSummary {
  organization_count: number;
  membership_count: number;
  invitation_count: number;
}

export interface IamOrganizationsTransientStateMaintenanceResult {
  expired_invitation_count: number;
  total_mutated_count: number;
}

export interface IamOrganizationsResponse {
  generated_at: string;
  organizations: IamOrganizationRecord[];
  count: number;
}

export interface IamOrganizationMembershipsResponse {
  generated_at: string;
  memberships: Array<IamOrganizationMembershipRecord & {
    organization_name: string;
    username: string;
    email: string;
  }>;
  count: number;
}

export interface IamOrganizationInvitationsResponse {
  generated_at: string;
  invitations: Array<IamOrganizationInvitationRecord & {
    organization_name: string;
  }>;
  count: number;
}

export interface IamAccountOrganizationsResponse {
  generated_at: string;
  organizations: Array<{
    organization: IamOrganizationRecord;
    membership: IamOrganizationMembershipRecord | null;
    pending_invitations: IamOrganizationInvitationRecord[];
  }>;
  count: number;
}

export interface CreateIamOrganizationRequest {
  realm_id: string;
  name: string;
  summary: string;
  kind?: IamOrganizationKind;
  status?: IamOrganizationStatus;
  domain_hint?: string | null;
  linked_identity_provider_aliases?: string[];
  source_organization_id?: string | null;
}

export interface UpdateIamOrganizationRequest {
  name?: string;
  summary?: string;
  kind?: IamOrganizationKind;
  status?: IamOrganizationStatus;
  domain_hint?: string | null;
  linked_identity_provider_aliases?: string[];
}

export interface CreateIamOrganizationMembershipRequest {
  realm_id: string;
  organization_id: string;
  user_id: string;
  role?: IamOrganizationMembershipRole;
  status?: IamOrganizationMembershipStatus;
}

export interface UpdateIamOrganizationMembershipRequest {
  role?: IamOrganizationMembershipRole;
  status?: IamOrganizationMembershipStatus;
}

export interface CreateIamOrganizationInvitationRequest {
  realm_id: string;
  organization_id: string;
  email: string;
  role?: IamOrganizationMembershipRole;
  linked_identity_provider_aliases?: string[];
}

export interface UpdateIamOrganizationInvitationRequest {
  role?: IamOrganizationMembershipRole;
  linked_identity_provider_aliases?: string[];
  expires_at?: string | null;
  lifecycle_action?: 'REVOKE' | 'RESEND' | 'REFRESH_EXPIRATION';
}

function normalizeState(input: Partial<IamOrganizationsState>): IamOrganizationsState {
  input = rewriteIamIdentifiers(input);
  return {
    organizations: Array.isArray(input.organizations) ? input.organizations : [],
    memberships: Array.isArray(input.memberships) ? input.memberships : [],
    invitations: Array.isArray(input.invitations) ? input.invitations : [],
  };
}

function normalizeDirectoryState(input: Partial<IamOrganizationsDirectoryState>): IamOrganizationsDirectoryState {
  input = rewriteIamIdentifiers(input);
  return {
    organizations: Array.isArray(input.organizations) ? input.organizations : [],
    memberships: Array.isArray(input.memberships) ? input.memberships : [],
  };
}

function normalizeInvitationsState(input: Partial<IamOrganizationsInvitationsState>): IamOrganizationsInvitationsState {
  input = rewriteIamIdentifiers(input);
  return {
    invitations: Array.isArray(input.invitations) ? input.invitations : [],
  };
}

function combineState(
  directoryState: IamOrganizationsDirectoryState,
  invitationsState: IamOrganizationsInvitationsState,
): IamOrganizationsState {
  return {
    organizations: clone(directoryState.organizations),
    memberships: clone(directoryState.memberships),
    invitations: clone(invitationsState.invitations),
  };
}

function splitDirectoryState(input: IamOrganizationsState): IamOrganizationsDirectoryState {
  return {
    organizations: clone(input.organizations),
    memberships: clone(input.memberships),
  };
}

function splitInvitationsState(input: IamOrganizationsState): IamOrganizationsInvitationsState {
  return {
    invitations: clone(input.invitations),
  };
}

function readLegacyOrganizationsStateSnapshot(): IamOrganizationsState {
  return normalizeState(
    readPersistedStateSnapshot<Partial<IamOrganizationsState>>(LEGACY_IAM_ORGANIZATIONS_FILE) ?? {},
  );
}

const organizationsDirectoryRepository: IamOrganizationsDirectoryRepository = createPersistedIamStateRepository<
  Partial<IamOrganizationsDirectoryState>,
  IamOrganizationsDirectoryState
>({
  fileName: IAM_ORGANIZATIONS_DIRECTORY_FILE,
  seedFactory: () => normalizeDirectoryState(readLegacyOrganizationsStateSnapshot()),
  normalize: normalizeDirectoryState,
});

const organizationsDirectoryAsyncRepository: IamAsyncOrganizationsDirectoryRepository = createPersistedAsyncIamStateRepository<
  Partial<IamOrganizationsDirectoryState>,
  IamOrganizationsDirectoryState
>({
  fileName: IAM_ORGANIZATIONS_DIRECTORY_FILE,
  seedFactory: () => normalizeDirectoryState(readLegacyOrganizationsStateSnapshot()),
  normalize: normalizeDirectoryState,
});

const organizationsInvitationsRepository: IamOrganizationsInvitationsRepository = createPersistedIamStateRepository<
  Partial<IamOrganizationsInvitationsState>,
  IamOrganizationsInvitationsState
>({
  fileName: IAM_ORGANIZATIONS_INVITATIONS_FILE,
  seedFactory: () => normalizeInvitationsState(readLegacyOrganizationsStateSnapshot()),
  normalize: normalizeInvitationsState,
});

const organizationsInvitationsAsyncRepository: IamAsyncOrganizationsInvitationsRepository = createPersistedAsyncIamStateRepository<
  Partial<IamOrganizationsInvitationsState>,
  IamOrganizationsInvitationsState
>({
  fileName: IAM_ORGANIZATIONS_INVITATIONS_FILE,
  seedFactory: () => normalizeInvitationsState(readLegacyOrganizationsStateSnapshot()),
  normalize: normalizeInvitationsState,
});

const state = combineState(
  organizationsDirectoryRepository.load(),
  organizationsInvitationsRepository.load(),
);
const deferredPersistenceContext = new AsyncLocalStorage<{ dirty: boolean }>();

async function loadStateAsync(): Promise<IamOrganizationsState> {
  const [directoryState, invitationsState] = await Promise.all([
    organizationsDirectoryAsyncRepository.load(),
    organizationsInvitationsAsyncRepository.load(),
  ]);
  return combineState(directoryState, invitationsState);
}

function syncInMemoryState(nextState: IamOrganizationsState): void {
  state.organizations = clone(nextState.organizations);
  state.memberships = clone(nextState.memberships);
  state.invitations = clone(nextState.invitations);
}

function persistStateSyncOnly(): void {
  const deferredPersistence = deferredPersistenceContext.getStore();
  if (deferredPersistence) {
    deferredPersistence.dirty = true;
    return;
  }
  organizationsDirectoryRepository.save(splitDirectoryState(state));
  organizationsInvitationsRepository.save(splitInvitationsState(state));
}

async function persistStateAsync(): Promise<void> {
  await organizationsDirectoryAsyncRepository.save(splitDirectoryState(state));
  await organizationsInvitationsAsyncRepository.save(splitInvitationsState(state));
}

async function runWithDeferredPersistence<T>(operation: () => T | Promise<T>): Promise<T> {
  const existingContext = deferredPersistenceContext.getStore();
  if (existingContext) {
    return operation();
  }

  syncInMemoryState(await loadStateAsync());
  return deferredPersistenceContext.run({ dirty: false }, async () => {
    try {
      const result = await operation();
      if (deferredPersistenceContext.getStore()?.dirty) {
        await persistStateAsync();
      }
      return result;
    } catch (error) {
      if (deferredPersistenceContext.getStore()?.dirty) {
        await persistStateAsync();
      }
      throw error;
    }
  });
}

function assertRealm(realmId: string): void {
  LocalIamFoundationStore.getRealm(realmId);
}

function assertUser(realmId: string, userId: string) {
  const user = LocalIamFoundationStore.getUserById(userId);
  if (user.realm_id !== realmId) {
    throw new Error(`IAM user ${userId} does not belong to realm ${realmId}`);
  }
  return user;
}

function assertOrganization(organizationId: string): IamOrganizationRecord {
  const organization = state.organizations.find((candidate) => candidate.id === organizationId);
  if (!organization) {
    throw new Error(`Unknown IAM organization: ${organizationId}`);
  }
  return organization;
}

function assertMembership(membershipId: string): IamOrganizationMembershipRecord {
  const membership = state.memberships.find((candidate) => candidate.id === membershipId);
  if (!membership) {
    throw new Error(`Unknown IAM organization membership: ${membershipId}`);
  }
  return membership;
}

function assertInvitation(invitationId: string): IamOrganizationInvitationRecord {
  const invitation = state.invitations.find((candidate) => candidate.id === invitationId);
  if (!invitation) {
    throw new Error(`Unknown IAM organization invitation: ${invitationId}`);
  }
  return invitation;
}

function normalizeAliases(value: string[] | undefined): string[] {
  return Array.from(new Set((value ?? []).map((entry) => entry.trim()).filter(Boolean)));
}

function ensureUniqueOrganizationSlug(realmId: string, slug: string, organizationId?: string): void {
  const existing = state.organizations.find(
    (organization) => organization.realm_id === realmId && organization.slug === slug && organization.id !== organizationId,
  );
  if (existing) {
    throw new Error(`IAM organization slug ${slug} already exists in realm ${realmId}`);
  }
}

function cleanupInvitations(): number {
  let changed = false;
  let expiredInvitationCount = 0;
  const now = Date.now();
  for (const invitation of state.invitations) {
    if (invitation.status === 'PENDING' && Date.parse(invitation.expires_at) <= now) {
      invitation.status = 'EXPIRED';
      invitation.updated_at = invitation.expires_at;
      changed = true;
      expiredInvitationCount += 1;
    }
  }
  if (changed) {
    persistStateSyncOnly();
  }
  return expiredInvitationCount;
}

function synchronizeRealmOrganizations(): void {
  let changed = false;
  const realms = LocalIamFoundationStore.listRealms().realms;
  const systemUserId = IAM_SYSTEM_USER_ID;
  for (const realm of realms) {
    let organization = state.organizations.find((candidate) => candidate.realm_id === realm.id && candidate.synthetic);
    if (!organization) {
      const createdAt = nowIso();
      organization = {
        id: `iam-org-${randomUUID()}`,
        realm_id: realm.id,
        name: `${realm.name} Primary Organization`,
        slug: `${slugify(realm.name)}-primary`,
        summary: `Default organization envelope for ${realm.name}.`,
        kind: realm.owner_tenant_id ? 'COMPANY' : 'TEAM',
        status: 'ACTIVE',
        domain_hint: null,
        linked_identity_provider_aliases: [],
        synthetic: true,
        source_organization_id: null,
        created_at: createdAt,
        updated_at: createdAt,
        created_by_user_id: systemUserId,
        updated_by_user_id: systemUserId,
      };
      state.organizations.push(organization);
      changed = true;
    }
    const realmUsers = LocalIamFoundationStore.listUsers({ realm_id: realm.id }).users;
    const ownerCandidate = realmUsers.find((user) => user.status === 'ACTIVE') ?? realmUsers[0] ?? null;
    if (ownerCandidate && !state.memberships.some((membership) => membership.organization_id === organization.id && membership.user_id === ownerCandidate.id)) {
      const createdAt = nowIso();
      state.memberships.push({
        id: `iam-org-membership-${randomUUID()}`,
        realm_id: realm.id,
        organization_id: organization.id,
        user_id: ownerCandidate.id,
        role: 'OWNER',
        status: 'ACTIVE',
        synthetic: true,
        invited_at: null,
        joined_at: createdAt,
        suspended_at: null,
        revoked_at: null,
        created_at: createdAt,
        updated_at: createdAt,
        created_by_user_id: systemUserId,
        updated_by_user_id: systemUserId,
      });
      changed = true;
    }
  }
  if (changed) {
    persistStateSyncOnly();
  }
}

export const LocalIamOrganizationStore = {
  getSummary(): IamOrganizationSummary {
    synchronizeRealmOrganizations();
    cleanupInvitations();
    return {
      organization_count: state.organizations.length,
      membership_count: state.memberships.length,
      invitation_count: state.invitations.length,
    };
  },

  listOrganizations(filters?: {
    realm_id?: string | null;
    search?: string | null;
  }): IamOrganizationsResponse {
    synchronizeRealmOrganizations();
    let organizations = [...state.organizations];
    if (filters?.realm_id) {
      organizations = organizations.filter((organization) => organization.realm_id === filters.realm_id);
    }
    if (filters?.search) {
      const normalized = filters.search.trim().toLowerCase();
      organizations = organizations.filter((organization) =>
        [organization.name, organization.slug, organization.summary, organization.domain_hint ?? '']
          .some((value) => value.toLowerCase().includes(normalized)),
      );
    }
    return {
      generated_at: nowIso(),
      organizations: clone(organizations),
      count: organizations.length,
    };
  },

  createOrganization(actorUserId: string, input: CreateIamOrganizationRequest): IamOrganizationRecord {
    assertRealm(input.realm_id);
    const name = input.name.trim();
    const summary = input.summary.trim();
    if (!name || !summary) {
      throw new Error('IAM organization name and summary are required');
    }
    const slug = slugify(name) || `organization-${randomUUID().slice(0, 8)}`;
    ensureUniqueOrganizationSlug(input.realm_id, slug);
    const createdAt = nowIso();
    const record: IamOrganizationRecord = {
      id: `iam-org-${randomUUID()}`,
      realm_id: input.realm_id,
      name,
      slug,
      summary,
      kind: input.kind ?? 'COMPANY',
      status: input.status ?? 'ACTIVE',
      domain_hint: input.domain_hint?.trim() || null,
      linked_identity_provider_aliases: normalizeAliases(input.linked_identity_provider_aliases),
      synthetic: false,
      source_organization_id: input.source_organization_id?.trim() || null,
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };
    state.organizations.push(record);
    persistStateSyncOnly();
    return clone(record);
  },

  async createOrganizationAsync(
    actorUserId: string,
    input: CreateIamOrganizationRequest,
  ): Promise<IamOrganizationRecord> {
    return runWithDeferredPersistence(() => this.createOrganization(actorUserId, input));
  },

  updateOrganization(actorUserId: string, organizationId: string, input: UpdateIamOrganizationRequest): IamOrganizationRecord {
    const organization = assertOrganization(organizationId);
    if (input.name !== undefined) {
      const nextName = input.name.trim();
      if (!nextName) {
        throw new Error('IAM organization name cannot be empty');
      }
      const nextSlug = slugify(nextName) || organization.slug;
      ensureUniqueOrganizationSlug(organization.realm_id, nextSlug, organization.id);
      organization.name = nextName;
      organization.slug = nextSlug;
    }
    if (input.summary !== undefined) {
      const nextSummary = input.summary.trim();
      if (!nextSummary) {
        throw new Error('IAM organization summary cannot be empty');
      }
      organization.summary = nextSummary;
    }
    if (input.kind) {
      organization.kind = input.kind;
    }
    if (input.status) {
      organization.status = input.status;
    }
    if (input.domain_hint !== undefined) {
      organization.domain_hint = input.domain_hint?.trim() || null;
    }
    if (input.linked_identity_provider_aliases) {
      organization.linked_identity_provider_aliases = normalizeAliases(input.linked_identity_provider_aliases);
    }
    organization.updated_at = nowIso();
    organization.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(organization);
  },

  async updateOrganizationAsync(
    actorUserId: string,
    organizationId: string,
    input: UpdateIamOrganizationRequest,
  ): Promise<IamOrganizationRecord> {
    return runWithDeferredPersistence(() => this.updateOrganization(actorUserId, organizationId, input));
  },

  listMemberships(filters?: {
    realm_id?: string | null;
    organization_id?: string | null;
    user_id?: string | null;
  }): IamOrganizationMembershipsResponse {
    synchronizeRealmOrganizations();
    let memberships = [...state.memberships];
    if (filters?.realm_id) {
      memberships = memberships.filter((membership) => membership.realm_id === filters.realm_id);
    }
    if (filters?.organization_id) {
      memberships = memberships.filter((membership) => membership.organization_id === filters.organization_id);
    }
    if (filters?.user_id) {
      memberships = memberships.filter((membership) => membership.user_id === filters.user_id);
    }
    return {
      generated_at: nowIso(),
      memberships: memberships.map((membership) => {
        const organization = assertOrganization(membership.organization_id);
        const user = LocalIamFoundationStore.getUserById(membership.user_id);
        return {
          ...clone(membership),
          organization_name: organization.name,
          username: user.username,
          email: user.email,
        };
      }),
      count: memberships.length,
    };
  },

  createMembership(actorUserId: string, input: CreateIamOrganizationMembershipRequest): IamOrganizationMembershipRecord {
    assertRealm(input.realm_id);
    const organization = assertOrganization(input.organization_id);
    if (organization.realm_id !== input.realm_id) {
      throw new Error('IAM organization does not belong to the requested realm');
    }
    assertUser(input.realm_id, input.user_id);
    const existing = state.memberships.find(
      (membership) => membership.organization_id === input.organization_id && membership.user_id === input.user_id,
    );
    if (existing) {
      throw new Error('IAM user is already linked to that organization');
    }
    const createdAt = nowIso();
    const record: IamOrganizationMembershipRecord = {
      id: `iam-org-membership-${randomUUID()}`,
      realm_id: input.realm_id,
      organization_id: input.organization_id,
      user_id: input.user_id,
      role: input.role ?? 'MEMBER',
      status: input.status ?? 'ACTIVE',
      synthetic: false,
      invited_at: null,
      joined_at: (input.status ?? 'ACTIVE') === 'ACTIVE' ? createdAt : null,
      suspended_at: null,
      revoked_at: null,
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };
    state.memberships.push(record);
    persistStateSyncOnly();
    return clone(record);
  },

  async createMembershipAsync(
    actorUserId: string,
    input: CreateIamOrganizationMembershipRequest,
  ): Promise<IamOrganizationMembershipRecord> {
    return runWithDeferredPersistence(() => this.createMembership(actorUserId, input));
  },

  updateMembership(actorUserId: string, membershipId: string, input: UpdateIamOrganizationMembershipRequest): IamOrganizationMembershipRecord {
    const membership = assertMembership(membershipId);
    if (input.role) {
      membership.role = input.role;
    }
    if (input.status) {
      membership.status = input.status;
      if (input.status === 'ACTIVE' && !membership.joined_at) {
        membership.joined_at = nowIso();
      }
      if (input.status === 'SUSPENDED') {
        membership.suspended_at = nowIso();
      }
      if (input.status === 'REVOKED') {
        membership.revoked_at = nowIso();
      }
    }
    membership.updated_at = nowIso();
    membership.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(membership);
  },

  async updateMembershipAsync(
    actorUserId: string,
    membershipId: string,
    input: UpdateIamOrganizationMembershipRequest,
  ): Promise<IamOrganizationMembershipRecord> {
    return runWithDeferredPersistence(() => this.updateMembership(actorUserId, membershipId, input));
  },

  listInvitations(filters?: {
    realm_id?: string | null;
    organization_id?: string | null;
    email?: string | null;
  }): IamOrganizationInvitationsResponse {
    synchronizeRealmOrganizations();
    cleanupInvitations();
    let invitations = [...state.invitations];
    if (filters?.realm_id) {
      invitations = invitations.filter((invitation) => invitation.realm_id === filters.realm_id);
    }
    if (filters?.organization_id) {
      invitations = invitations.filter((invitation) => invitation.organization_id === filters.organization_id);
    }
    if (filters?.email) {
      const normalized = filters.email.trim().toLowerCase();
      invitations = invitations.filter((invitation) => invitation.email.toLowerCase() === normalized);
    }
    return {
      generated_at: nowIso(),
      invitations: invitations.map((invitation) => ({
        ...clone(invitation),
        organization_name: assertOrganization(invitation.organization_id).name,
      })),
      count: invitations.length,
    };
  },

  createInvitation(actorUserId: string, input: CreateIamOrganizationInvitationRequest): IamOrganizationInvitationRecord {
    assertRealm(input.realm_id);
    const organization = assertOrganization(input.organization_id);
    if (organization.realm_id !== input.realm_id) {
      throw new Error('IAM organization does not belong to the requested realm');
    }
    const email = input.email.trim().toLowerCase();
    if (!email) {
      throw new Error('IAM organization invitation email is required');
    }
    const createdAt = nowIso();
    const record: IamOrganizationInvitationRecord = {
      id: `iam-org-invite-${randomUUID()}`,
      realm_id: input.realm_id,
      organization_id: input.organization_id,
      email,
      role: input.role ?? 'MEMBER',
      status: 'PENDING',
      linked_identity_provider_aliases: normalizeAliases(input.linked_identity_provider_aliases),
      invited_user_id: null,
      accepted_membership_id: null,
      expires_at: new Date(Date.now() + INVITATION_TTL_MS).toISOString(),
      accepted_at: null,
      revoked_at: null,
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };
    state.invitations.push(record);
    persistStateSyncOnly();
    return clone(record);
  },

  async createInvitationAsync(
    actorUserId: string,
    input: CreateIamOrganizationInvitationRequest,
  ): Promise<IamOrganizationInvitationRecord> {
    return runWithDeferredPersistence(() => this.createInvitation(actorUserId, input));
  },

  updateInvitation(
    actorUserId: string,
    invitationId: string,
    input: UpdateIamOrganizationInvitationRequest,
  ): IamOrganizationInvitationRecord {
    cleanupInvitations();
    const invitation = assertInvitation(invitationId);
    if (invitation.status !== 'PENDING') {
      throw new Error('Only pending IAM organization invitations can be updated');
    }

    if (
      input.lifecycle_action !== undefined
      && input.lifecycle_action !== 'REVOKE'
      && input.lifecycle_action !== 'RESEND'
      && input.lifecycle_action !== 'REFRESH_EXPIRATION'
    ) {
      throw new Error('lifecycle_action must be REVOKE, RESEND, or REFRESH_EXPIRATION when provided');
    }

    if (input.lifecycle_action === 'REVOKE') {
      invitation.status = 'REVOKED';
      invitation.revoked_at = nowIso();
      invitation.updated_at = invitation.revoked_at;
      invitation.updated_by_user_id = actorUserId;
      persistStateSyncOnly();
      return clone(invitation);
    }

    if (input.lifecycle_action === 'REFRESH_EXPIRATION' && input.expires_at === undefined) {
      invitation.expires_at = new Date(Date.now() + INVITATION_TTL_MS).toISOString();
    }

    if (input.role !== undefined) {
      invitation.role = input.role;
    }

    if (input.linked_identity_provider_aliases !== undefined) {
      invitation.linked_identity_provider_aliases = normalizeAliases(input.linked_identity_provider_aliases);
    }

    if (input.expires_at !== undefined) {
      if (input.expires_at === null) {
        throw new Error('expires_at cannot be null');
      }
      const nextExpiration = new Date(input.expires_at);
      if (Number.isNaN(nextExpiration.getTime())) {
        throw new Error('expires_at must be a valid ISO-8601 timestamp');
      }
      if (nextExpiration.getTime() <= Date.now()) {
        throw new Error('expires_at must be in the future');
      }
      invitation.expires_at = nextExpiration.toISOString();
    }

    invitation.updated_at = nowIso();
    invitation.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(invitation);
  },

  async updateInvitationAsync(
    actorUserId: string,
    invitationId: string,
    input: UpdateIamOrganizationInvitationRequest,
  ): Promise<IamOrganizationInvitationRecord> {
    return runWithDeferredPersistence(() => this.updateInvitation(actorUserId, invitationId, input));
  },

  revokeInvitation(actorUserId: string, invitationId: string): IamOrganizationInvitationRecord {
    const invitation = assertInvitation(invitationId);
    if (invitation.status === 'ACCEPTED') {
      throw new Error('Accepted IAM organization invitations cannot be revoked');
    }
    invitation.status = 'REVOKED';
    invitation.revoked_at = nowIso();
    invitation.updated_at = invitation.revoked_at;
    invitation.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(invitation);
  },

  async revokeInvitationAsync(
    actorUserId: string,
    invitationId: string,
  ): Promise<IamOrganizationInvitationRecord> {
    return runWithDeferredPersistence(() => this.revokeInvitation(actorUserId, invitationId));
  },

  acceptInvitation(realmId: string, invitationId: string, userId: string): IamOrganizationMembershipRecord {
    cleanupInvitations();
    const invitation = assertInvitation(invitationId);
    const user = assertUser(realmId, userId);
    if (invitation.realm_id !== realmId) {
      throw new Error('IAM organization invitation does not belong to that realm');
    }
    if (invitation.status !== 'PENDING') {
      throw new Error('IAM organization invitation is not pending');
    }
    if (user.email.trim().toLowerCase() !== invitation.email.toLowerCase()) {
      throw new Error('Signed-in user email does not match the invitation email');
    }
    const membership = state.memberships.find(
      (candidate) => candidate.organization_id === invitation.organization_id && candidate.user_id === userId,
    ) ?? this.createMembership(userId, {
      realm_id: realmId,
      organization_id: invitation.organization_id,
      user_id: userId,
      role: invitation.role,
      status: 'ACTIVE',
    });
    invitation.status = 'ACCEPTED';
    invitation.invited_user_id = userId;
    invitation.accepted_membership_id = membership.id;
    invitation.accepted_at = nowIso();
    invitation.updated_at = invitation.accepted_at;
    invitation.updated_by_user_id = userId;
    persistStateSyncOnly();
    return clone(typeof membership === 'object' && 'id' in membership ? membership : assertMembership(membership.id));
  },

  async acceptInvitationAsync(
    realmId: string,
    invitationId: string,
    userId: string,
  ): Promise<IamOrganizationMembershipRecord> {
    return runWithDeferredPersistence(() => this.acceptInvitation(realmId, invitationId, userId));
  },

  runTransientStateMaintenance(): IamOrganizationsTransientStateMaintenanceResult {
    synchronizeRealmOrganizations();
    const expiredInvitationCount = cleanupInvitations();
    return {
      expired_invitation_count: expiredInvitationCount,
      total_mutated_count: expiredInvitationCount,
    };
  },

  async runTransientStateMaintenanceAsync(): Promise<IamOrganizationsTransientStateMaintenanceResult> {
    return runWithDeferredPersistence(() => this.runTransientStateMaintenance());
  },

  listAccountOrganizations(realmId: string, userId: string): IamAccountOrganizationsResponse {
    assertUser(realmId, userId);
    cleanupInvitations();
    synchronizeRealmOrganizations();
    const user = LocalIamFoundationStore.getUserById(userId);
    const realmOrganizations = state.organizations.filter((organization) => organization.realm_id === realmId);
    const organizations = realmOrganizations
      .map((organization) => ({
        organization: clone(organization),
        membership: clone(state.memberships.find(
          (membership) => membership.organization_id === organization.id && membership.user_id === userId,
        ) ?? null),
        pending_invitations: state.invitations
          .filter((invitation) =>
            invitation.organization_id === organization.id &&
            invitation.status === 'PENDING' &&
            invitation.email.toLowerCase() === user.email.toLowerCase(),
          )
          .map((invitation) => clone(invitation)),
      }))
      .filter((entry) => entry.membership || entry.pending_invitations.length > 0);
    return {
      generated_at: nowIso(),
      organizations,
      count: organizations.length,
    };
  },

  exportState(): IamOrganizationsState {
    synchronizeRealmOrganizations();
    cleanupInvitations();
    return clone(state);
  },

  importState(nextState: Partial<IamOrganizationsState>): void {
    const normalized = normalizeState(nextState);
    state.organizations.splice(0, state.organizations.length, ...clone(normalized.organizations));
    state.memberships.splice(0, state.memberships.length, ...clone(normalized.memberships));
    state.invitations.splice(0, state.invitations.length, ...clone(normalized.invitations));
    persistStateSyncOnly();
    synchronizeRealmOrganizations();
    cleanupInvitations();
  },
};
