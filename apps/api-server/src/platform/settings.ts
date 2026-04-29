import { loadOrCreatePersistedState, savePersistedState } from './persistence';
import { LocalControlPlaneStore } from './controlPlane';
import { LocalIdentityControlPlane } from './identity';
import { LocalIamFoundationStore, type IamUserStatus } from './iamFoundation';
import { LEGACY_COMPAT_ENV, readCompatibilityEnv } from './legacyEnvironment';
import {
  isStandaloneOperatorRoleId,
  isStandaloneSpecialistRoleId,
  parseStandaloneManagedRole,
  toStandaloneManagedRole,
  type StandaloneManagedRole,
  type StandaloneManagedRoleInput,
} from './tenantAliases';
import {
  getLocalResolvedMembership,
  getLocalTenant,
  getLocalUser,
  listLocalTenantsForUser,
  listLocalUsersForTenant,
  removeLocalTenantUser,
  updateLocalTenantUserRole,
  type LocalUser
} from './tenants';

export interface SettingsCertification {
  id: string;
  type: 'part_107' | 'part_61' | 'waiver' | 'company_training';
  name: string;
  number: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority: string;
  status: 'active' | 'expired' | 'pending_renewal';
  documents: string[];
}

export interface SettingsUserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    missionUpdates: boolean;
    weatherAlerts: boolean;
    regulatoryChanges: boolean;
    systemMaintenance: boolean;
  };
  language: string;
  timezone: string;
  dateFormat: string;
  units: {
    distance: 'metric' | 'imperial';
    altitude: 'feet' | 'meters';
    speed: 'mph' | 'kph' | 'knots';
    temperature: 'fahrenheit' | 'celsius';
  };
  navigation: {
    showGroupDescriptions: boolean;
  };
}

export interface SettingsUserSettings {
  dashboard: {
    layout: 'compact' | 'comfortable';
    widgets: string[];
    defaultView: 'dashboard' | 'missions' | 'fleet';
  };
  missions: {
    autoSave: boolean;
    defaultPlanningMode: 'basic' | 'advanced';
    showAdvancedOptions: boolean;
  };
  security: {
    sessionTimeout: number;
    twoFactorEnabled: boolean;
    passwordLastChanged: string;
    securityQuestions: boolean;
  };
  integrations: {
    autopylot: boolean;
    aloft: boolean;
    droneDeploy: boolean;
  };
}

export type SettingsManagedRole = StandaloneManagedRole;
export type SettingsManagedRoleAlias = StandaloneManagedRole;
type SettingsManagedRoleInput = StandaloneManagedRoleInput;

export interface SettingsUserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: SettingsManagedRole;
  role_alias?: SettingsManagedRoleAlias;
  avatar?: string;
  phone?: string;
  department?: string;
  certifications: SettingsCertification[];
  preferences: SettingsUserPreferences;
  settings: SettingsUserSettings;
  lastLogin: string;
  status: 'active' | 'inactive' | 'suspended';
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsTeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: SettingsManagedRole;
  role_alias?: SettingsManagedRoleAlias;
  status: SettingsUserProfile['status'];
  lastLogin: string;
  invitedAt?: string;
  invitedBy?: string;
  managementScope?: 'identity_registry' | 'tenant_invite' | 'external_identity';
  providerId?: string;
  providerLabel?: string;
  providerDeployment?: 'local' | 'aws_native' | 'commercial' | 'open_source';
  sourceGroups?: string[];
  providerAccountStatus?: IamUserStatus;
  providerLifecycleState?: 'PROVIDER_READY' | 'PROVIDER_ACTION_REQUIRED' | 'PROVIDER_DISABLED' | 'PROVIDER_USER_MISSING';
  providerRequiredActions?: string[];
  providerActivationHandoffUrl?: string;
}

export interface SettingsPublicTeamInvitationRecord {
  token: string;
  tenantId: string;
  tenantName: string;
  email: string;
  role: SettingsManagedRole;
  role_alias?: SettingsManagedRoleAlias;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  activationHandoffUrl: string;
  status: 'PENDING' | 'ACTIVATED' | 'REVOKED' | 'EXPIRED';
}

export interface SettingsResolvedPublicTeamInvitation {
  token: string;
  tenantId: string;
  tenantName: string;
  email: string;
  role: SettingsManagedRole;
  role_alias?: SettingsManagedRoleAlias;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  status: 'PENDING' | 'ACTIVATION_REQUIRED' | 'ACTIVATED' | 'REVOKED' | 'EXPIRED' | 'PROVIDER_DISABLED' | 'PROVIDER_USER_MISSING';
  activationHandoffUrl: string;
  providerLifecycleState?: SettingsTeamMember['providerLifecycleState'];
  providerRequiredActions?: string[];
}

interface SettingsTeamInviteInput {
  email: string;
  role: SettingsManagedRoleInput;
  firstName?: string;
  lastName?: string;
}

interface SettingsTeamMemberUpdate {
  role?: SettingsManagedRoleInput;
  status?: SettingsUserProfile['status'];
}

export interface SettingsSecurityUpdateResult {
  security: SettingsUserSettings['security'];
}

export interface SettingsTwoFactorSetupResult extends SettingsSecurityUpdateResult {
  qrCode: string;
  backupCodes: string[];
}

export interface SettingsOnboardingStep {
  id: string;
  title: string;
  description: string;
  component: string;
  completed: boolean;
  required: boolean;
  order: number;
}

interface SettingsPersistedState {
  profiles_by_user: Record<string, SettingsUserProfile>;
  onboarding_steps_by_user: Record<string, SettingsOnboardingStep[]>;
  managed_team_members_by_tenant: Record<string, SettingsTeamMember[]>;
  public_team_invitations_by_token: Record<string, SettingsPublicTeamInvitationRecord>;
}

const SETTINGS_STATE_FILE = 'settings-state.json';
const seedTenantIds = ['northstar-holdings', 'civic-services', 'innovation-lab'];
const managedRoleOrder: SettingsManagedRole[] = ['admin', 'operator', 'specialist', 'viewer'];
const STANDALONE_IAM_PROVIDER_ID = 'standalone-iam';
const PUBLIC_TEAM_INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const seedCreatedAt = '2023-01-01T00:00:00Z';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const [firstName = 'Identity', ...rest] = fullName.trim().split(/\s+/);
  return {
    firstName,
    lastName: rest.join(' ') || 'User'
  };
}

function splitEmailName(email: string): { firstName: string; lastName: string } {
  const localPart = email.split('@')[0] ?? 'identity.user';
  const normalized = localPart
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return splitName(normalized || 'Identity User');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function resolvePublicUiBaseUrl() {
  const configuredBaseUrl = readCompatibilityEnv(LEGACY_COMPAT_ENV.publicUiBaseUrl);
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '');
  }
  return 'http://localhost:3004';
}

function buildStandaloneIamActivationHandoffUrl(email: string) {
  const url = new URL('/login', resolvePublicUiBaseUrl());
  url.searchParams.set('login_hint', normalizeEmail(email));
  url.searchParams.set('flow_context', 'invite_activation');
  return url.toString();
}

function generateIdentifier(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildStandaloneIamLifecycleProjection(
  providerId?: string,
  externalUserId?: string,
  email?: string,
): Pick<SettingsTeamMember, 'providerAccountStatus' | 'providerLifecycleState' | 'providerRequiredActions' | 'providerActivationHandoffUrl'> {
  if (providerId !== STANDALONE_IAM_PROVIDER_ID || !externalUserId) {
    return {};
  }

  try {
    const providerUser = LocalIamFoundationStore.getUserById(externalUserId);
    if (providerUser.status !== 'ACTIVE') {
      return {
        providerAccountStatus: providerUser.status,
        providerLifecycleState: 'PROVIDER_DISABLED',
        providerRequiredActions: [...providerUser.required_actions],
      };
    }

    if (providerUser.required_actions.length > 0) {
      return {
        providerAccountStatus: providerUser.status,
        providerLifecycleState: 'PROVIDER_ACTION_REQUIRED',
        providerRequiredActions: [...providerUser.required_actions],
        providerActivationHandoffUrl: email ? buildStandaloneIamActivationHandoffUrl(email) : undefined,
      };
    }

    return {
      providerAccountStatus: providerUser.status,
      providerLifecycleState: 'PROVIDER_READY',
      providerRequiredActions: [],
      providerActivationHandoffUrl: undefined,
    };
  } catch {
    return {
      providerLifecycleState: 'PROVIDER_USER_MISSING',
      providerRequiredActions: [],
      providerActivationHandoffUrl: undefined,
    };
  }
}

function deriveCertificationStatus(expiryDate: string): SettingsCertification['status'] {
  const expiry = Date.parse(expiryDate);
  if (Number.isNaN(expiry)) {
    return 'pending_renewal';
  }

  const now = Date.now();
  if (expiry < now) {
    return 'expired';
  }

  const daysUntilExpiry = (expiry - now) / (1000 * 60 * 60 * 24);
  return daysUntilExpiry <= 45 ? 'pending_renewal' : 'active';
}

function ensureNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required field: ${fieldName}`);
  }

  return value.trim();
}

function mapRoleAlias(role: SettingsManagedRole): SettingsManagedRoleAlias {
  return role;
}

function syncRoleAlias<T extends { role: SettingsManagedRole; role_alias?: SettingsManagedRoleAlias }>(record: T): T {
  record.role_alias = mapRoleAlias(record.role);
  return record;
}

function assertSupportedRole(role: unknown): SettingsManagedRole {
  const normalizedRole = parseStandaloneManagedRole(role);
  if (normalizedRole) {
    return normalizedRole;
  }

  throw new Error('Unsupported team role');
}

function assertSupportedStatus(status: unknown): SettingsUserProfile['status'] {
  if (status === 'active' || status === 'inactive' || status === 'suspended') {
    return status;
  }

  throw new Error('Unsupported team member status');
}

function assertSupportedCertificationType(type: unknown): SettingsCertification['type'] {
  if (type === 'part_107' || type === 'part_61' || type === 'waiver' || type === 'company_training') {
    return type;
  }

  throw new Error('Unsupported certification type');
}

function sortTeamMembers(members: SettingsTeamMember[]): SettingsTeamMember[] {
  return [...members].sort((leftItem, rightItem) => {
    const leftRoleIndex = managedRoleOrder.indexOf(leftItem.role);
    const rightRoleIndex = managedRoleOrder.indexOf(rightItem.role);

    if (leftRoleIndex !== rightRoleIndex) {
      return leftRoleIndex - rightRoleIndex;
    }

    return `${leftItem.firstName} ${leftItem.lastName}`.localeCompare(`${rightItem.firstName} ${rightItem.lastName}`);
  });
}

function mapRoleIdToSettingsRole(
  roleId: LocalUser['memberships'][number]['role_id'] | undefined
): SettingsManagedRole {
  if (
    roleId === 'enterprise_admin' ||
    roleId === 'government_program_admin' ||
    roleId === 'tenant_owner' ||
    roleId === 'tenant_admin'
  ) {
    return 'admin';
  }

  if (isStandaloneOperatorRoleId(roleId)) {
    return 'operator';
  }

  if (isStandaloneSpecialistRoleId(roleId)) {
    return 'specialist';
  }

  return 'viewer';
}

function resolveEffectiveRoleId(
  user: LocalUser,
  preferredTenantId?: string,
): LocalUser['memberships'][number]['role_id'] | undefined {
  const candidateTenantIds = [
    preferredTenantId,
    user.default_tenant_id,
    ...listLocalTenantsForUser(user.id).map((tenant) => tenant.id),
    ...user.memberships.map((membership) => membership.tenant_id),
  ].filter((tenantId): tenantId is string => Boolean(tenantId));

  for (const tenantId of candidateTenantIds) {
    const membership = getLocalResolvedMembership(user.id, tenantId);
    if (membership) {
      return membership.role_id;
    }
  }

  return user.memberships[0]?.role_id;
}

function mapUserRole(user: LocalUser, preferredTenantId?: string): SettingsUserProfile['role'] {
  return mapRoleIdToSettingsRole(resolveEffectiveRoleId(user, preferredTenantId));
}

function isSeededCompletedUser(userId: string): boolean {
  return userId === 'tenant-admin' || userId === 'service-operator';
}

function buildDefaultPreferences(userId: string): SettingsUserPreferences {
  return {
    theme: userId === 'service-operator' ? 'dark' : 'system',
    notifications: {
      email: true,
      push: true,
      sms: false,
      missionUpdates: true,
      weatherAlerts: true,
      regulatoryChanges: true,
      systemMaintenance: true
    },
    language: 'en-US',
    timezone: userId === 'service-operator' ? 'America/Los_Angeles' : 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    units: {
      distance: 'imperial',
      altitude: 'feet',
      speed: 'mph',
      temperature: 'fahrenheit'
    },
    navigation: {
      showGroupDescriptions: true
    }
  };
}

function normalizePreferences(
  userId: string,
  preferences: Partial<SettingsUserPreferences> | undefined,
): SettingsUserPreferences {
  const defaults = buildDefaultPreferences(userId);

  return {
    ...defaults,
    ...preferences,
    notifications: {
      ...defaults.notifications,
      ...(preferences?.notifications ?? {}),
    },
    units: {
      ...defaults.units,
      ...(preferences?.units ?? {}),
    },
    navigation: {
      ...defaults.navigation,
      ...(preferences?.navigation ?? {}),
    },
  };
}

function buildDefaultSettings(userId: string): SettingsUserSettings {
  return {
    dashboard: {
      layout: userId === 'service-operator' ? 'compact' : 'comfortable',
      widgets: ['missions', 'weather', 'fleet', 'alerts'],
      defaultView: 'dashboard'
    },
    missions: {
      autoSave: true,
      defaultPlanningMode: userId === 'research-lead' ? 'advanced' : 'basic',
      showAdvancedOptions: true
    },
    security: {
      sessionTimeout: 480,
      twoFactorEnabled: isSeededCompletedUser(userId),
      passwordLastChanged: '2025-11-15',
      securityQuestions: true
    },
    integrations: {
      autopylot: true,
      aloft: true,
      droneDeploy: userId === 'research-lead'
    }
  };
}

function buildDefaultCertifications(userId: string): SettingsCertification[] {
  if (userId === 'service-operator') {
    return [
      {
        id: 'cert-service-001',
        type: 'company_training',
        name: 'Operations Readiness Certification',
        number: 'OPS-2083441',
        issueDate: '2024-04-10',
        expiryDate: '2027-04-10',
        issuingAuthority: 'Civic Services Office Learning',
        status: 'active',
        documents: ['operations-readiness-certificate.pdf']
      },
      {
        id: 'cert-service-002',
        type: 'company_training',
        name: 'Incident Coordination Training',
        number: 'ICS-778',
        issueDate: '2025-01-12',
        expiryDate: '2027-01-12',
        issuingAuthority: 'Civic Services Office Learning',
        status: 'active',
        documents: ['incident-coordination-training.pdf']
      }
    ];
  }

  if (userId === 'research-lead') {
    return [
      {
        id: 'cert-research-001',
        type: 'company_training',
        name: 'Research Governance Certification',
        number: 'RGC-9987123',
        issueDate: '2024-07-01',
        expiryDate: '2027-07-01',
        issuingAuthority: 'Innovation Lab Enablement',
        status: 'active',
        documents: ['research-governance-certificate.pdf']
      }
    ];
  }

  return [
    {
      id: 'cert-admin-001',
      type: 'company_training',
      name: 'Tenant Administration Certification',
      number: 'TAC-4567890',
      issueDate: '2024-01-15',
      expiryDate: '2027-01-15',
      issuingAuthority: 'Northstar Holdings Enablement',
      status: 'active',
      documents: ['tenant-administration-certificate.pdf']
    },
    {
      id: 'cert-admin-002',
      type: 'company_training',
      name: 'Policy Stewardship Training',
      number: 'PST-2025-001',
      issueDate: '2025-03-10',
      expiryDate: '2027-03-10',
      issuingAuthority: 'Northstar Holdings Enablement',
      status: 'active',
      documents: ['policy-stewardship-training.pdf']
    }
  ];
}

function buildSeedProfile(userId: string, preferredTenantId?: string): SettingsUserProfile {
  const user = getLocalUser(userId);
  if (!user) {
    throw new Error(`Unknown user: ${userId}`);
  }

  const { firstName, lastName } = splitName(user.name);
  const role = mapUserRole(user, preferredTenantId);
  return {
    id: user.id,
    email: user.email,
    firstName,
    lastName,
    role,
    role_alias: mapRoleAlias(role),
    avatar: undefined,
    phone: user.id === 'service-operator' ? '+1-555-0199' : '+1-555-0123',
    department:
      user.id === 'service-operator'
        ? 'Service Operations'
        : user.id === 'research-lead'
          ? 'Research Enablement'
          : 'Tenant Administration',
    certifications: buildDefaultCertifications(user.id),
    preferences: buildDefaultPreferences(user.id),
    settings: buildDefaultSettings(user.id),
    lastLogin: nowIso(),
    status: 'active',
    onboardingCompleted: isSeededCompletedUser(user.id),
    createdAt: seedCreatedAt,
    updatedAt: nowIso()
  };
}

function buildOnboardingSteps(userId: string): SettingsOnboardingStep[] {
  const completed = isSeededCompletedUser(userId);
  return [
    {
      id: 'profile',
      title: 'Complete Your Profile',
      description: 'Add your basic information and upload a profile picture',
      component: 'ProfileSetup',
      completed,
      required: true,
      order: 1
    },
    {
      id: 'certifications',
      title: 'Add Your Credentials',
      description: 'Upload your training and compliance records',
      component: 'CertificationSetup',
      completed,
      required: true,
      order: 2
    },
    {
      id: 'preferences',
      title: 'Set Your Preferences',
      description: 'Configure your notification and display preferences',
      component: 'PreferencesSetup',
      completed,
      required: false,
      order: 3
    },
    {
      id: 'billing',
      title: 'Set Up Billing',
      description: 'Confirm subscription, billing contact, and payment method details',
      component: 'BillingSetup',
      completed,
      required: true,
      order: 4
    },
    {
      id: 'team',
      title: 'Invite Your Team',
      description: 'Add team members and set up organizational structure',
      component: 'TeamSetup',
      completed: userId === 'tenant-admin',
      required: false,
      order: 5
    },
    {
      id: 'training',
      title: 'Complete Policy Training',
      description: 'Review security protocols and constitutional AI guidelines',
      component: 'TrainingModule',
      completed,
      required: true,
      order: 6
    }
  ];
}

function buildSeedState(): SettingsPersistedState {
  const userIds = ['tenant-admin', 'service-operator', 'research-lead'];
  return {
    profiles_by_user: Object.fromEntries(userIds.map((userId) => [userId, buildSeedProfile(userId)])),
    onboarding_steps_by_user: Object.fromEntries(userIds.map((userId) => [userId, buildOnboardingSteps(userId)])),
    managed_team_members_by_tenant: Object.fromEntries(seedTenantIds.map((tenantId) => [tenantId, []])),
    public_team_invitations_by_token: {}
  };
}

const settingsState = loadOrCreatePersistedState<SettingsPersistedState>(SETTINGS_STATE_FILE, buildSeedState);

function normalizeSettingsState(): boolean {
  let changed = false;

  if (!settingsState.managed_team_members_by_tenant) {
    settingsState.managed_team_members_by_tenant = {};
    changed = true;
  }

  if (!settingsState.public_team_invitations_by_token) {
    settingsState.public_team_invitations_by_token = {};
    changed = true;
  }

  seedTenantIds.forEach((tenantId) => {
    if (!Array.isArray(settingsState.managed_team_members_by_tenant[tenantId])) {
      settingsState.managed_team_members_by_tenant[tenantId] = [];
      changed = true;
    }
  });

  Object.entries(settingsState.profiles_by_user).forEach(([userId, profile]) => {
    const normalizedRole = assertSupportedRole(profile.role);
    if (profile.role !== normalizedRole) {
      profile.role = normalizedRole;
      profile.updatedAt = nowIso();
      changed = true;
    }

    const normalizedPreferences = normalizePreferences(userId, profile.preferences);
    if (JSON.stringify(profile.preferences) !== JSON.stringify(normalizedPreferences)) {
      profile.preferences = normalizedPreferences;
      profile.updatedAt = nowIso();
      changed = true;
    }

    if (profile.role_alias !== mapRoleAlias(profile.role)) {
      profile.role_alias = mapRoleAlias(profile.role);
      profile.updatedAt = nowIso();
      changed = true;
    }
  });

  Object.values(settingsState.managed_team_members_by_tenant).forEach((members) => {
    members.forEach((member) => {
      const normalizedRole = assertSupportedRole(member.role);
      if (member.role !== normalizedRole) {
        member.role = normalizedRole;
        changed = true;
      }

      if (member.role_alias !== mapRoleAlias(member.role)) {
        member.role_alias = mapRoleAlias(member.role);
        changed = true;
      }
    });
  });

  Object.values(settingsState.public_team_invitations_by_token).forEach((invitation) => {
    const normalizedRole = assertSupportedRole(invitation.role);
    if (invitation.role !== normalizedRole) {
      invitation.role = normalizedRole;
      changed = true;
    }

    if (invitation.role_alias !== mapRoleAlias(invitation.role)) {
      invitation.role_alias = mapRoleAlias(invitation.role);
      changed = true;
    }
  });

  return changed;
}

function persistSettingsState(): void {
  savePersistedState(SETTINGS_STATE_FILE, settingsState);
}

if (normalizeSettingsState()) {
  persistSettingsState();
}

function ensureProfile(userId: string, preferredTenantId?: string): SettingsUserProfile {
  if (!settingsState.profiles_by_user[userId]) {
    settingsState.profiles_by_user[userId] = buildSeedProfile(userId, preferredTenantId);
    persistSettingsState();
  }

  const user = getLocalUser(userId);
  const profile = settingsState.profiles_by_user[userId];

  if (user) {
    const projectedRole = mapUserRole(user, preferredTenantId);
    const normalizedPreferences = normalizePreferences(userId, profile.preferences);
    let shouldPersist = false;

    if (profile.role !== projectedRole) {
      profile.role = projectedRole;
      profile.role_alias = mapRoleAlias(projectedRole);
      profile.updatedAt = nowIso();
      shouldPersist = true;
    }

    if (profile.role_alias !== mapRoleAlias(profile.role)) {
      profile.role_alias = mapRoleAlias(profile.role);
      profile.updatedAt = nowIso();
      shouldPersist = true;
    }

    if (JSON.stringify(profile.preferences) !== JSON.stringify(normalizedPreferences)) {
      profile.preferences = normalizedPreferences;
      profile.updatedAt = nowIso();
      shouldPersist = true;
    }

    if (shouldPersist) {
      persistSettingsState();
    }
  }

  return profile;
}

function ensureOnboardingSteps(userId: string): SettingsOnboardingStep[] {
  if (!settingsState.onboarding_steps_by_user[userId]) {
    settingsState.onboarding_steps_by_user[userId] = buildOnboardingSteps(userId);
    persistSettingsState();
  }

  return settingsState.onboarding_steps_by_user[userId];
}

function ensureManagedTeamMembers(tenantId: string): SettingsTeamMember[] {
  if (!settingsState.managed_team_members_by_tenant[tenantId]) {
    settingsState.managed_team_members_by_tenant[tenantId] = [];
    persistSettingsState();
  }

  return settingsState.managed_team_members_by_tenant[tenantId];
}

function revokePendingPublicInvitationsForEmail(tenantId: string, email: string) {
  const normalizedEmail = normalizeEmail(email);
  let changed = false;

  Object.values(settingsState.public_team_invitations_by_token).forEach((invitation) => {
    if (
      invitation.tenantId === tenantId &&
      normalizeEmail(invitation.email) === normalizedEmail &&
      invitation.status === 'PENDING'
    ) {
      invitation.status = 'REVOKED';
      changed = true;
    }
  });

  if (changed) {
    persistSettingsState();
  }
}

function resolveInvitationStatus(
  invitation: SettingsPublicTeamInvitationRecord,
  member: SettingsTeamMember | undefined,
): SettingsResolvedPublicTeamInvitation['status'] {
  if (invitation.status === 'REVOKED') {
    return 'REVOKED';
  }

  if (Date.parse(invitation.expiresAt) <= Date.now()) {
    invitation.status = 'EXPIRED';
    persistSettingsState();
    return 'EXPIRED';
  }

  if (!member) {
    return invitation.status;
  }

  switch (member.providerLifecycleState) {
    case 'PROVIDER_READY':
      invitation.status = 'ACTIVATED';
      persistSettingsState();
      return 'ACTIVATED';
    case 'PROVIDER_ACTION_REQUIRED':
      return 'ACTIVATION_REQUIRED';
    case 'PROVIDER_DISABLED':
      return 'PROVIDER_DISABLED';
    case 'PROVIDER_USER_MISSING':
      return 'PROVIDER_USER_MISSING';
    default:
      return invitation.status;
  }
}

function mergeProfileUpdate(
  profile: SettingsUserProfile,
  updates: Partial<SettingsUserProfile>
): SettingsUserProfile {
  const nextProfile: SettingsUserProfile = {
    ...profile,
    email: typeof updates.email === 'string' ? updates.email : profile.email,
    firstName: typeof updates.firstName === 'string' ? updates.firstName : profile.firstName,
    lastName: typeof updates.lastName === 'string' ? updates.lastName : profile.lastName,
    phone: typeof updates.phone === 'string' ? updates.phone : profile.phone,
    department: typeof updates.department === 'string' ? updates.department : profile.department,
    avatar: typeof updates.avatar === 'string' ? updates.avatar : profile.avatar,
    updatedAt: nowIso()
  };

  return nextProfile;
}

function buildCertification(
  certification: Omit<SettingsCertification, 'id' | 'status'>
): SettingsCertification {
  return {
    id: generateIdentifier('cert'),
    type: assertSupportedCertificationType(certification.type),
    name: ensureNonEmptyString(certification.name, 'name'),
    number: ensureNonEmptyString(certification.number, 'number'),
    issueDate: ensureNonEmptyString(certification.issueDate, 'issueDate'),
    expiryDate: ensureNonEmptyString(certification.expiryDate, 'expiryDate'),
    issuingAuthority: ensureNonEmptyString(certification.issuingAuthority, 'issuingAuthority'),
    documents: Array.isArray(certification.documents) ? [...certification.documents] : [],
    status: deriveCertificationStatus(certification.expiryDate)
  };
}

function mergeCertification(
  currentCertification: SettingsCertification,
  updates: Partial<SettingsCertification>
): SettingsCertification {
  const nextCertification: SettingsCertification = {
    ...currentCertification,
    type: updates.type !== undefined ? assertSupportedCertificationType(updates.type) : currentCertification.type,
    name: typeof updates.name === 'string' ? ensureNonEmptyString(updates.name, 'name') : currentCertification.name,
    number: typeof updates.number === 'string' ? ensureNonEmptyString(updates.number, 'number') : currentCertification.number,
    issueDate:
      typeof updates.issueDate === 'string'
        ? ensureNonEmptyString(updates.issueDate, 'issueDate')
        : currentCertification.issueDate,
    expiryDate:
      typeof updates.expiryDate === 'string'
        ? ensureNonEmptyString(updates.expiryDate, 'expiryDate')
        : currentCertification.expiryDate,
    issuingAuthority:
      typeof updates.issuingAuthority === 'string'
        ? ensureNonEmptyString(updates.issuingAuthority, 'issuingAuthority')
        : currentCertification.issuingAuthority,
    documents: Array.isArray(updates.documents) ? [...updates.documents] : currentCertification.documents
  };

  nextCertification.status = deriveCertificationStatus(nextCertification.expiryDate);
  return nextCertification;
}

function buildTeamMember(user: LocalUser, tenantId?: string): SettingsTeamMember {
  const profile = ensureProfile(user.id, tenantId);
  const role = mapUserRole(user, tenantId);
  return {
    id: profile.id,
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    role,
    role_alias: mapRoleAlias(role),
    status: profile.status,
    lastLogin: profile.lastLogin,
    managementScope: user.auth_source === 'external_identity' ? 'external_identity' : 'identity_registry',
    providerId: user.provider_id ?? 'LOCAL_DIRECTORY',
    providerLabel: user.provider_label ?? 'Local Directory',
    providerDeployment: user.provider_deployment ?? 'local',
    sourceGroups: []
  };
}

export class LocalSettingsStore {
  static getCurrentUserProfile(userId: string, tenantId?: string): SettingsUserProfile {
    return clone(ensureProfile(userId, tenantId));
  }

  static updateProfile(userId: string, updates: Partial<SettingsUserProfile>): SettingsUserProfile {
    const profile = ensureProfile(userId);
    settingsState.profiles_by_user[userId] = mergeProfileUpdate(profile, clone(updates));
    persistSettingsState();
    return clone(settingsState.profiles_by_user[userId]);
  }

  static updateProfileStatus(userId: string, status: SettingsUserProfile['status']): SettingsUserProfile {
    const profile = ensureProfile(userId);
    profile.status = assertSupportedStatus(status);
    profile.updatedAt = nowIso();
    persistSettingsState();
    return clone(profile);
  }

  static deleteUserProfile(userId: string): void {
    let didMutate = false;

    if (settingsState.profiles_by_user[userId]) {
      delete settingsState.profiles_by_user[userId];
      didMutate = true;
    }

    if (settingsState.onboarding_steps_by_user[userId]) {
      delete settingsState.onboarding_steps_by_user[userId];
      didMutate = true;
    }

    if (didMutate) {
      persistSettingsState();
    }
  }

  static updatePreferences(userId: string, preferences: SettingsUserPreferences): SettingsUserPreferences {
    const profile = ensureProfile(userId);
    profile.preferences = normalizePreferences(userId, preferences);
    profile.updatedAt = nowIso();
    persistSettingsState();
    return clone(profile.preferences);
  }

  static updateSettings(userId: string, settings: SettingsUserSettings): SettingsUserSettings {
    const profile = ensureProfile(userId);
    profile.settings = clone(settings);
    profile.updatedAt = nowIso();
    persistSettingsState();
    return clone(profile.settings);
  }

  static updateAvatar(userId: string, avatarDataUrl: string): { avatarUrl: string } {
    const profile = ensureProfile(userId);
    profile.avatar = avatarDataUrl;
    profile.updatedAt = nowIso();
    persistSettingsState();
    return { avatarUrl: avatarDataUrl };
  }

  static addCertification(
    userId: string,
    certification: Omit<SettingsCertification, 'id' | 'status'>
  ): SettingsCertification {
    const profile = ensureProfile(userId);
    const nextCertification = buildCertification(certification);
    profile.certifications = [...profile.certifications, nextCertification];
    profile.updatedAt = nowIso();
    persistSettingsState();
    return clone(nextCertification);
  }

  static updateCertification(
    userId: string,
    certificationId: string,
    updates: Partial<SettingsCertification>
  ): SettingsCertification {
    const profile = ensureProfile(userId);
    const certificationIndex = profile.certifications.findIndex((candidate) => candidate.id === certificationId);
    if (certificationIndex < 0) {
      throw new Error(`Certification not found: ${certificationId}`);
    }

    const nextCertification = mergeCertification(profile.certifications[certificationIndex], updates);
    profile.certifications[certificationIndex] = nextCertification;
    profile.updatedAt = nowIso();
    persistSettingsState();
    return clone(nextCertification);
  }

  static deleteCertification(userId: string, certificationId: string): void {
    const profile = ensureProfile(userId);
    const nextCertifications = profile.certifications.filter((candidate) => candidate.id !== certificationId);
    if (nextCertifications.length === profile.certifications.length) {
      throw new Error(`Certification not found: ${certificationId}`);
    }

    profile.certifications = nextCertifications;
    profile.updatedAt = nowIso();
    persistSettingsState();
  }

  static listTeamMembers(tenantId: string): SettingsTeamMember[] {
    const externalMemberList = LocalControlPlaneStore.listExternalIdentityMembers(tenantId).members;
    const externalMemberByEmail = new Map(
      externalMemberList.map((member) => [normalizeEmail(member.email), member])
    );
    const registryMembers = listLocalUsersForTenant(tenantId).map((user) => {
      const externalMember = externalMemberByEmail.get(normalizeEmail(user.email));
      const teamMember = buildTeamMember(user, tenantId);
      if (!externalMember) {
        return teamMember;
      }

      return {
        ...teamMember,
        role: externalMember.role,
        status: externalMember.status,
        lastLogin: externalMember.lastLogin || teamMember.lastLogin,
        invitedAt: externalMember.invitedAt ?? teamMember.invitedAt,
        invitedBy: externalMember.invitedBy ?? teamMember.invitedBy,
        managementScope: 'external_identity' as const,
        providerId: externalMember.provider_id,
        providerLabel: externalMember.provider_label,
        providerDeployment: externalMember.provider_deployment,
        sourceGroups: [...externalMember.source_groups],
        ...buildStandaloneIamLifecycleProjection(externalMember.provider_id, externalMember.external_user_id, externalMember.email),
      };
    });
    const managedMembers = ensureManagedTeamMembers(tenantId);
    const registryEmails = new Set(registryMembers.map((member) => normalizeEmail(member.email)));
    const externalMembers = externalMemberList
      .filter((member) => !registryEmails.has(normalizeEmail(member.email)))
      .map((member) => syncRoleAlias({
          id: member.id,
          email: member.email,
          firstName: member.firstName,
          lastName: member.lastName,
          role: member.role,
          status: member.status,
          lastLogin: member.lastLogin,
          invitedAt: member.invitedAt,
          invitedBy: member.invitedBy,
          managementScope: member.managementScope,
          providerId: member.provider_id,
          providerLabel: member.provider_label,
          providerDeployment: member.provider_deployment,
          sourceGroups: [...member.source_groups],
          ...buildStandaloneIamLifecycleProjection(member.provider_id, member.external_user_id, member.email),
        }));

    return sortTeamMembers([...registryMembers, ...managedMembers, ...externalMembers]).map((member) => clone(member));
  }

  static issuePublicTeamInvitation(
    tenantId: string,
    member: Pick<SettingsTeamMember, 'email' | 'role' | 'invitedAt' | 'invitedBy'>,
    activationHandoffUrl: string,
  ): SettingsPublicTeamInvitationRecord {
    const tenant = getLocalTenant(tenantId);
    if (!tenant) {
      throw new Error(`Unknown tenant: ${tenantId}`);
    }

    revokePendingPublicInvitationsForEmail(tenantId, member.email);

    const invitation: SettingsPublicTeamInvitationRecord = {
      token: generateIdentifier('public-invite'),
      tenantId,
      tenantName: tenant.name,
      email: normalizeEmail(member.email),
      role: member.role,
      role_alias: mapRoleAlias(member.role),
      invitedBy: member.invitedBy ?? 'IDP Administrator',
      invitedAt: member.invitedAt ?? nowIso(),
      expiresAt: new Date(Date.now() + PUBLIC_TEAM_INVITATION_TTL_MS).toISOString(),
      activationHandoffUrl,
      status: 'PENDING',
    };

    settingsState.public_team_invitations_by_token[invitation.token] = invitation;
    persistSettingsState();
    return clone(invitation);
  }

  static resolvePublicTeamInvitation(invitationToken: string): SettingsResolvedPublicTeamInvitation {
    const invitation = settingsState.public_team_invitations_by_token[invitationToken];
    if (!invitation) {
      throw new Error(`Unknown public team invitation: ${invitationToken}`);
    }

    const member = this
      .listTeamMembers(invitation.tenantId)
      .find((candidate) => normalizeEmail(candidate.email) === normalizeEmail(invitation.email));

    return {
      token: invitation.token,
      tenantId: invitation.tenantId,
      tenantName: invitation.tenantName,
      email: invitation.email,
      role: invitation.role,
      role_alias: invitation.role_alias ?? mapRoleAlias(invitation.role),
      invitedBy: invitation.invitedBy,
      invitedAt: invitation.invitedAt,
      expiresAt: invitation.expiresAt,
      status: resolveInvitationStatus(invitation, member),
      activationHandoffUrl: invitation.activationHandoffUrl,
      providerLifecycleState: member?.providerLifecycleState,
      providerRequiredActions: member?.providerRequiredActions ? [...member.providerRequiredActions] : [],
    };
  }

  static revokePublicTeamInvitationsForEmail(tenantId: string, email: string): void {
    revokePendingPublicInvitationsForEmail(tenantId, email);
  }

  static inviteTeamMember(tenantId: string, invitedByUserId: string, invitation: SettingsTeamInviteInput): SettingsTeamMember {
    const tenant = getLocalTenant(tenantId);
    if (!tenant) {
      throw new Error(`Unknown tenant: ${tenantId}`);
    }

    if (tenant.account_type !== 'ORGANIZATION' || tenant.max_users <= 1) {
      throw new Error('Team management is only available on Enterprise accounts');
    }

    const email = normalizeEmail(ensureNonEmptyString(invitation.email, 'email'));
    const role = assertSupportedRole(invitation.role);
    const registryMatch = listLocalUsersForTenant(tenantId).some((user) => normalizeEmail(user.email) === email);
    const managedMembers = ensureManagedTeamMembers(tenantId);
    const externalMembers = LocalControlPlaneStore.listExternalIdentityMembers(tenantId).members;
    const managedMatch = managedMembers.some((member) => normalizeEmail(member.email) === email);
    const externalMatch = externalMembers.some((member) => normalizeEmail(member.email) === email);

    if (registryMatch || managedMatch || externalMatch) {
      throw new Error(`A team member with email ${email} already exists for this tenant`);
    }

    const committedSeatCount = listLocalUsersForTenant(tenantId).length + managedMembers.length + externalMembers.length;
    if (committedSeatCount >= tenant.max_users) {
      throw new Error(`Seat limit reached for this account (${tenant.max_users} users)`);
    }

    const inviter = ensureProfile(invitedByUserId);
    const fallbackName = splitEmailName(email);
    const nextMember: SettingsTeamMember = {
      id: generateIdentifier('invite'),
      email,
      firstName: typeof invitation.firstName === 'string' && invitation.firstName.trim().length > 0
        ? invitation.firstName.trim()
        : fallbackName.firstName,
      lastName: typeof invitation.lastName === 'string' && invitation.lastName.trim().length > 0
        ? invitation.lastName.trim()
        : fallbackName.lastName,
      role,
      role_alias: mapRoleAlias(role),
      status: 'inactive',
      lastLogin: '',
      invitedAt: nowIso(),
      invitedBy: `${inviter.firstName} ${inviter.lastName}`.trim(),
      managementScope: 'tenant_invite'
    };

    managedMembers.push(nextMember);
    persistSettingsState();
    return clone(nextMember);
  }

  static updateTeamMember(tenantId: string, memberId: string, updates: SettingsTeamMemberUpdate): SettingsTeamMember {
    const managedMembers = ensureManagedTeamMembers(tenantId);
    const member = managedMembers.find((candidate) => candidate.id === memberId);

    if (!member) {
      const registryMember = listLocalUsersForTenant(tenantId).find((candidate) => candidate.id === memberId);
      if (registryMember) {
        const profile = ensureProfile(memberId);
        if (updates.role !== undefined) {
          const nextRole = assertSupportedRole(updates.role);
          updateLocalTenantUserRole(tenantId, memberId, nextRole);
          profile.role = nextRole;
          profile.role_alias = mapRoleAlias(nextRole);
        }

        if (updates.status !== undefined) {
          profile.status = assertSupportedStatus(updates.status);
        }

        profile.updatedAt = nowIso();
        persistSettingsState();

        return buildTeamMember(getLocalUser(memberId) ?? registryMember);
      }

      const externalMember = LocalControlPlaneStore.listExternalIdentityMembers(tenantId).members.find(
        (candidate) => candidate.id === memberId
      );
      if (externalMember) {
        const updatedMember = LocalControlPlaneStore.updateExternalIdentityMember(tenantId, memberId, {
          role: updates.role !== undefined ? assertSupportedRole(updates.role) : undefined,
          status: updates.status !== undefined ? assertSupportedStatus(updates.status) : undefined
        });

        return {
          id: updatedMember.id,
          email: updatedMember.email,
          firstName: updatedMember.firstName,
          lastName: updatedMember.lastName,
          role: updatedMember.role,
          role_alias: mapRoleAlias(updatedMember.role),
          status: updatedMember.status,
          lastLogin: updatedMember.lastLogin,
          managementScope: updatedMember.managementScope,
          providerId: updatedMember.provider_id,
          providerLabel: updatedMember.provider_label,
          providerDeployment: updatedMember.provider_deployment,
          sourceGroups: [...updatedMember.source_groups]
        };
      }

      throw new Error(`Team member not found: ${memberId}`);
    }

    if (updates.role !== undefined) {
      member.role = assertSupportedRole(updates.role);
      member.role_alias = mapRoleAlias(member.role);
    }

    if (updates.status !== undefined) {
      member.status = assertSupportedStatus(updates.status);
    }

    persistSettingsState();
    return clone(member);
  }

  static removeTeamMember(tenantId: string, memberId: string): void {
    const managedMembers = ensureManagedTeamMembers(tenantId);
    const nextMembers = managedMembers.filter((candidate) => candidate.id !== memberId);

    if (nextMembers.length === managedMembers.length) {
      if (listLocalUsersForTenant(tenantId).some((candidate) => candidate.id === memberId)) {
        removeLocalTenantUser(tenantId, memberId);
        const profile = ensureProfile(memberId);
        profile.status = 'inactive';
        profile.updatedAt = nowIso();
        persistSettingsState();
        return;
      }

      if (LocalControlPlaneStore.listExternalIdentityMembers(tenantId).members.some((candidate) => candidate.id === memberId)) {
        LocalControlPlaneStore.removeExternalIdentityMember(tenantId, memberId);
        return;
      }

      throw new Error(`Team member not found: ${memberId}`);
    }

    settingsState.managed_team_members_by_tenant[tenantId] = nextMembers;
    persistSettingsState();
  }

  static changePassword(userId: string, currentPassword: string, newPassword: string): SettingsSecurityUpdateResult {
    ensureNonEmptyString(currentPassword, 'currentPassword');
    const nextPassword = ensureNonEmptyString(newPassword, 'newPassword');

    if (nextPassword.length < 12) {
      throw new Error('New password must be at least 12 characters');
    }

    if (currentPassword === newPassword) {
      throw new Error('New password must be different from the current password');
    }

    const securityState = LocalIdentityControlPlane.rotatePassword(userId, nextPassword);
    const profile = ensureProfile(userId);
    profile.settings.security.passwordLastChanged = (securityState.password_last_rotated_at ?? nowIso()).slice(0, 10);
    profile.updatedAt = nowIso();
    persistSettingsState();
    return {
      security: clone(profile.settings.security)
    };
  }

  static enableTwoFactor(userId: string): SettingsTwoFactorSetupResult {
    const profile = ensureProfile(userId);
    const setup = LocalIdentityControlPlane.enableTwoFactor(userId, profile.email);

    profile.settings.security.twoFactorEnabled = true;
    profile.updatedAt = nowIso();
    persistSettingsState();

    return {
      qrCode: setup.qrCode,
      backupCodes: setup.backupCodes,
      security: clone(profile.settings.security)
    };
  }

  static disableTwoFactor(userId: string, code: string): SettingsSecurityUpdateResult {
    const nextCode = ensureNonEmptyString(code, 'code');
    if (nextCode.length < 6) {
      throw new Error('2FA verification code must be at least 6 characters');
    }

    const profile = ensureProfile(userId);
    LocalIdentityControlPlane.disableTwoFactor(userId);
    profile.settings.security.twoFactorEnabled = false;
    profile.updatedAt = nowIso();
    persistSettingsState();

    return {
      security: clone(profile.settings.security)
    };
  }

  static getOnboardingSteps(userId: string): SettingsOnboardingStep[] {
    return clone(ensureOnboardingSteps(userId).sort((leftItem, rightItem) => leftItem.order - rightItem.order));
  }

  static completeOnboardingStep(userId: string, stepId: string): SettingsOnboardingStep[] {
    const steps = ensureOnboardingSteps(userId);
    const step = steps.find((candidate) => candidate.id === stepId);
    if (!step) {
      throw new Error(`Onboarding step not found: ${stepId}`);
    }

    step.completed = true;
    const profile = ensureProfile(userId);
    profile.onboardingCompleted = steps.every((candidate) => !candidate.required || candidate.completed);
    profile.updatedAt = nowIso();
    persistSettingsState();
    return clone(steps);
  }

  static completeOnboarding(userId: string): SettingsUserProfile {
    const steps = ensureOnboardingSteps(userId);
    steps.forEach((step) => {
      step.completed = true;
    });

    const profile = ensureProfile(userId);
    profile.onboardingCompleted = true;
    profile.updatedAt = nowIso();
    persistSettingsState();
    return clone(profile);
  }
}
