import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { loadOrCreatePersistedState, reloadOrCreatePersistedStateAsync, savePersistedState, savePersistedStateAsync } from './persistence';
import { LocalIamFoundationStore, type IamRealmRecord, type IamUserRecord } from './iamFoundation';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => variables[key] ?? '');
}

export type IamExperiencePhase = 'PHASE_5';
export type IamExperienceStatus = 'ADMIN_CONSOLE_AND_THEME_COMPLETION_IMPLEMENTED';
export type IamNextExperiencePhase = 'PHASE_6_OPERATIONS_HARDENING';
export type IamRealmThemePreset = 'PLATFORM_DEFAULT' | 'OCEAN' | 'FOREST' | 'SUNSET' | 'SLATE';
export type IamRealmLocalizationMode = 'REALM_DEFAULT' | 'CUSTOM';
export type IamNotificationTemplateKey =
  | 'EMAIL_VERIFICATION'
  | 'PASSWORD_RESET'
  | 'MFA_ENROLLMENT'
  | 'DELEGATED_CONSENT_REQUESTED'
  | 'DELEGATED_CONSENT_APPROVED'
  | 'DELEGATED_CONSENT_DENIED'
  | 'DELEGATED_CONSENT_CANCELLED'
  | 'TEST_NOTIFICATION';
export type IamNotificationChannel = 'EMAIL';
export type IamNotificationDeliveryMode = 'LOCAL_DELIVERY_LEDGER';
export type IamNotificationDeliveryStatus = 'DELIVERED';

const IAM_EXPERIENCE_RUNTIME_FILE = 'iam-experience-runtime-state.json';
const deferredPersistenceContext = new AsyncLocalStorage<{ dirty: boolean }>();

export interface IamRealmThemeRecord {
  realm_id: string;
  realm_name: string;
  preset: IamRealmThemePreset;
  brand_name: string;
  logo_label: string;
  support_email: string;
  support_url: string | null;
  docs_url: string | null;
  primary_color: string;
  accent_color: string;
  surface_tint: string;
  login_title: string;
  login_subtitle: string;
  account_title: string;
  account_subtitle: string;
  admin_title: string;
  admin_subtitle: string;
  footer_note: string;
  updated_at: string;
  updated_by_user_id: string;
}

export interface IamRealmLocalizationRecord {
  realm_id: string;
  default_locale: string;
  supported_locales: string[];
  mode: IamRealmLocalizationMode;
  translations: Record<string, Record<string, string>>;
  updated_at: string;
  updated_by_user_id: string;
}

export interface IamNotificationTemplateRecord {
  id: string;
  realm_id: string;
  key: IamNotificationTemplateKey;
  channel: IamNotificationChannel;
  name: string;
  subject_template: string;
  body_template: string;
  cta_label: string | null;
  updated_at: string;
  updated_by_user_id: string;
}

export interface IamNotificationDeliveryRecord {
  id: string;
  realm_id: string;
  template_key: IamNotificationTemplateKey;
  channel: IamNotificationChannel;
  delivery_mode: IamNotificationDeliveryMode;
  status: IamNotificationDeliveryStatus;
  recipient_user_id: string | null;
  recipient_email: string;
  subject: string;
  body: string;
  sent_at: string;
  created_by_user_id: string;
}

interface StoredIamExperienceState {
  version: number;
  realm_themes: IamRealmThemeRecord[];
  realm_localizations: IamRealmLocalizationRecord[];
  notification_templates: IamNotificationTemplateRecord[];
  notification_deliveries: IamNotificationDeliveryRecord[];
}

export interface IamExperienceSummaryResponse {
  generated_at: string;
  phase: IamExperiencePhase;
  subsystem_status: IamExperienceStatus;
  realm_theme_count: number;
  localization_bundle_count: number;
  notification_template_count: number;
  notification_delivery_count: number;
  next_recommended_phase: IamNextExperiencePhase;
}

export interface IamRealmExperienceResponse {
  generated_at: string;
  realm: {
    id: string;
    name: string;
    summary: string;
  };
  public_links: {
    signup_url: string | null;
  };
  theme: IamRealmThemeRecord;
  localization: IamRealmLocalizationRecord;
}

export interface IamNotificationTemplatesResponse {
  generated_at: string;
  notification_templates: IamNotificationTemplateRecord[];
  count: number;
}

export interface IamNotificationDeliveriesResponse {
  generated_at: string;
  notification_deliveries: IamNotificationDeliveryRecord[];
  count: number;
}

export interface UpdateIamRealmThemeRequest {
  preset?: IamRealmThemePreset;
  brand_name?: string;
  logo_label?: string;
  support_email?: string;
  support_url?: string | null;
  docs_url?: string | null;
  primary_color?: string;
  accent_color?: string;
  surface_tint?: string;
  login_title?: string;
  login_subtitle?: string;
  account_title?: string;
  account_subtitle?: string;
  admin_title?: string;
  admin_subtitle?: string;
  footer_note?: string;
}

export interface UpdateIamRealmLocalizationRequest {
  default_locale?: string;
  supported_locales?: string[];
  mode?: IamRealmLocalizationMode;
  translations?: Record<string, Record<string, string>>;
}

export interface UpdateIamNotificationTemplateRequest {
  name?: string;
  subject_template?: string;
  body_template?: string;
  cta_label?: string | null;
}

export interface CreateIamTestNotificationRequest {
  template_key: IamNotificationTemplateKey;
  recipient_email: string;
  variables?: Record<string, string>;
}

function defaultTranslations(realmName: string): Record<string, Record<string, string>> {
  return {
    'en-US': {
      login_headline: `Sign in to ${realmName}`,
      login_subtitle: 'Use your realm credentials or a configured external identity provider.',
      broker_label: 'External provider',
      account_headline: `${realmName} account`,
      account_subtitle: 'Manage your standalone identity profile, security posture, and linked identities.',
      profile_section: 'Profile',
      security_section: 'Security',
      linked_identities_section: 'Linked identities',
      sessions_section: 'Sessions',
      consents_section: 'Consents',
      admin_headline: `${realmName} administration`,
      admin_subtitle: 'Manage realms, identities, protocols, federation, branding, and notification posture.',
    },
    'es-US': {
      login_headline: `Accede a ${realmName}`,
      login_subtitle: 'Usa tus credenciales del dominio o un proveedor externo configurado.',
      broker_label: 'Proveedor externo',
      account_headline: `Cuenta de ${realmName}`,
      account_subtitle: 'Administra tu perfil, seguridad e identidades vinculadas.',
      profile_section: 'Perfil',
      security_section: 'Seguridad',
      linked_identities_section: 'Identidades vinculadas',
      sessions_section: 'Sesiones',
      consents_section: 'Consentimientos',
      admin_headline: `Administración de ${realmName}`,
      admin_subtitle: 'Administra dominios, identidades, protocolos, federación, marca y notificaciones.',
    },
  };
}

function buildDefaultTheme(realm: IamRealmRecord, sourceTheme?: IamRealmThemeRecord | null): IamRealmThemeRecord {
  const timestamp = nowIso();
  if (sourceTheme) {
    return {
      ...clone(sourceTheme),
      realm_id: realm.id,
      realm_name: realm.name,
      brand_name: realm.name,
      login_title: `Access ${realm.name}`,
      account_title: `${realm.name} account`,
      admin_title: `${realm.name} admin console`,
      updated_at: timestamp,
      updated_by_user_id: 'idp-super-admin',
    };
  }
  return {
    realm_id: realm.id,
    realm_name: realm.name,
    preset: realm.scope_kind === 'PLATFORM_DEFAULT' ? 'PLATFORM_DEFAULT' : 'SLATE',
    brand_name: realm.name,
    logo_label: realm.name.slice(0, 2).toUpperCase(),
    support_email: `support+${realm.id}@iam.local`,
    support_url: 'https://iam.local/support',
    docs_url: 'https://iam.local/docs',
    primary_color: '#0f172a',
    accent_color: '#2563eb',
    surface_tint: '#e2e8f0',
    login_title: `Access ${realm.name}`,
    login_subtitle: 'Use your realm credentials or a configured external identity provider.',
    account_title: `${realm.name} account`,
    account_subtitle: 'Manage your standalone identity profile, security posture, and linked identities.',
    admin_title: `${realm.name} admin console`,
    admin_subtitle: 'Manage standalone identity operations, branding, and notifications.',
    footer_note: 'Standalone identity platform runtime',
    updated_at: timestamp,
    updated_by_user_id: 'idp-super-admin',
  };
}

function buildDefaultLocalization(realm: IamRealmRecord, sourceLocalization?: IamRealmLocalizationRecord | null): IamRealmLocalizationRecord {
  const timestamp = nowIso();
  if (sourceLocalization) {
    return {
      ...clone(sourceLocalization),
      realm_id: realm.id,
      updated_at: timestamp,
      updated_by_user_id: 'idp-super-admin',
    };
  }
  return {
    realm_id: realm.id,
    default_locale: 'en-US',
    supported_locales: ['en-US', 'es-US'],
    mode: 'REALM_DEFAULT',
    translations: defaultTranslations(realm.name),
    updated_at: timestamp,
    updated_by_user_id: 'idp-super-admin',
  };
}

function defaultTemplateLabel(key: IamNotificationTemplateKey): string {
  switch (key) {
    case 'EMAIL_VERIFICATION':
      return 'Email verification';
    case 'PASSWORD_RESET':
      return 'Password reset';
    case 'MFA_ENROLLMENT':
      return 'MFA enrollment';
    case 'DELEGATED_CONSENT_REQUESTED':
      return 'Delegated consent requested';
    case 'DELEGATED_CONSENT_APPROVED':
      return 'Delegated consent approved';
    case 'DELEGATED_CONSENT_DENIED':
      return 'Delegated consent denied';
    case 'DELEGATED_CONSENT_CANCELLED':
      return 'Delegated consent cancelled';
    case 'TEST_NOTIFICATION':
      return 'Test notification';
  }
}

function buildDefaultNotificationTemplates(realm: IamRealmRecord, sourceTemplates: IamNotificationTemplateRecord[]): IamNotificationTemplateRecord[] {
  const copied = sourceTemplates.map((template) => ({
    ...clone(template),
    id: `${realm.id}:${template.key.toLowerCase()}`,
    realm_id: realm.id,
    updated_at: nowIso(),
    updated_by_user_id: 'idp-super-admin',
  }));
  if (copied.length > 0) {
    return copied;
  }
  const baseUser = '{{user_name}}';
  const baseRealm = '{{realm_name}}';
  const supportEmail = '{{support_email}}';
  const code = '{{code}}';
  return [
    {
      id: `${realm.id}:email_verification`,
      realm_id: realm.id,
      key: 'EMAIL_VERIFICATION',
      channel: 'EMAIL',
      name: defaultTemplateLabel('EMAIL_VERIFICATION'),
      subject_template: `${realm.name}: verify your email`,
      body_template: `Hello ${baseUser},\n\nUse verification code ${code} to verify your email for ${baseRealm}.\n\nIf you did not request this change, contact ${supportEmail}.`,
      cta_label: 'Verify email',
      updated_at: nowIso(),
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: `${realm.id}:password_reset`,
      realm_id: realm.id,
      key: 'PASSWORD_RESET',
      channel: 'EMAIL',
      name: defaultTemplateLabel('PASSWORD_RESET'),
      subject_template: `${realm.name}: password reset`,
      body_template: `Hello ${baseUser},\n\nUse reset code ${code} to change your password for ${baseRealm}.\n\nIf you did not request this reset, contact ${supportEmail}.`,
      cta_label: 'Reset password',
      updated_at: nowIso(),
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: `${realm.id}:mfa_enrollment`,
      realm_id: realm.id,
      key: 'MFA_ENROLLMENT',
      channel: 'EMAIL',
      name: defaultTemplateLabel('MFA_ENROLLMENT'),
      subject_template: `${realm.name}: MFA enrollment started`,
      body_template: `Hello ${baseUser},\n\nMulti-factor enrollment was started for ${baseRealm}. If this was not you, contact ${supportEmail} immediately.`,
      cta_label: 'Review account',
      updated_at: nowIso(),
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: `${realm.id}:delegated_consent_requested`,
      realm_id: realm.id,
      key: 'DELEGATED_CONSENT_REQUESTED',
      channel: 'EMAIL',
      name: defaultTemplateLabel('DELEGATED_CONSENT_REQUESTED'),
      subject_template: `${realm.name}: delegated access request`,
      body_template: `Hello {{user_name}},\n\n{{delegate_name}} requested delegated access in {{realm_name}}.\nRelationship: {{relationship_kind}}\nScopes: {{requested_scopes}}\nPurposes: {{requested_purposes}}\n\nReview the request in your account console or contact {{support_email}} for help.`,
      cta_label: 'Review request',
      updated_at: nowIso(),
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: `${realm.id}:delegated_consent_approved`,
      realm_id: realm.id,
      key: 'DELEGATED_CONSENT_APPROVED',
      channel: 'EMAIL',
      name: defaultTemplateLabel('DELEGATED_CONSENT_APPROVED'),
      subject_template: `${realm.name}: delegated access approved`,
      body_template: `Hello {{user_name}},\n\n{{principal_name}} approved your delegated access request in {{realm_name}}.\nRelationship: {{relationship_kind}}\nScopes: {{requested_scopes}}\nPurposes: {{requested_purposes}}`,
      cta_label: 'Open account',
      updated_at: nowIso(),
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: `${realm.id}:delegated_consent_denied`,
      realm_id: realm.id,
      key: 'DELEGATED_CONSENT_DENIED',
      channel: 'EMAIL',
      name: defaultTemplateLabel('DELEGATED_CONSENT_DENIED'),
      subject_template: `${realm.name}: delegated access denied`,
      body_template: `Hello {{user_name}},\n\n{{principal_name}} denied your delegated access request in {{realm_name}}.\nRelationship: {{relationship_kind}}\nScopes: {{requested_scopes}}\nPurposes: {{requested_purposes}}`,
      cta_label: 'Open account',
      updated_at: nowIso(),
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: `${realm.id}:delegated_consent_cancelled`,
      realm_id: realm.id,
      key: 'DELEGATED_CONSENT_CANCELLED',
      channel: 'EMAIL',
      name: defaultTemplateLabel('DELEGATED_CONSENT_CANCELLED'),
      subject_template: `${realm.name}: delegated access request cancelled`,
      body_template: `Hello {{user_name}},\n\n{{delegate_name}} cancelled a delegated access request in {{realm_name}}.\nRelationship: {{relationship_kind}}\nScopes: {{requested_scopes}}\nPurposes: {{requested_purposes}}`,
      cta_label: 'Open account',
      updated_at: nowIso(),
      updated_by_user_id: 'idp-super-admin',
    },
    {
      id: `${realm.id}:test_notification`,
      realm_id: realm.id,
      key: 'TEST_NOTIFICATION',
      channel: 'EMAIL',
      name: defaultTemplateLabel('TEST_NOTIFICATION'),
      subject_template: `${realm.name}: test notification`,
      body_template: `Hello ${baseUser},\n\nThis is a standalone IAM notification test for ${baseRealm}.`,
      cta_label: 'Open console',
      updated_at: nowIso(),
      updated_by_user_id: 'idp-super-admin',
    },
  ];
}

function emptyState(): StoredIamExperienceState {
  return {
    version: 1,
    realm_themes: [],
    realm_localizations: [],
    notification_templates: [],
    notification_deliveries: [],
  };
}

const state = loadOrCreatePersistedState<StoredIamExperienceState>(IAM_EXPERIENCE_RUNTIME_FILE, emptyState);

async function loadStateAsync(): Promise<StoredIamExperienceState> {
  return clone(await reloadOrCreatePersistedStateAsync<StoredIamExperienceState>(IAM_EXPERIENCE_RUNTIME_FILE, emptyState));
}

function syncInMemoryState(nextState: StoredIamExperienceState): void {
  state.version = nextState.version;
  state.realm_themes = clone(nextState.realm_themes);
  state.realm_localizations = clone(nextState.realm_localizations);
  state.notification_templates = clone(nextState.notification_templates);
  state.notification_deliveries = clone(nextState.notification_deliveries);
}

function persistStateSyncOnly(): void {
  const deferredContext = deferredPersistenceContext.getStore();
  if (deferredContext) {
    deferredContext.dirty = true;
    return;
  }
  savePersistedState(IAM_EXPERIENCE_RUNTIME_FILE, state);
}

async function persistStateAsync(): Promise<void> {
  await savePersistedStateAsync(IAM_EXPERIENCE_RUNTIME_FILE, state);
}

async function runWithDeferredPersistence<T>(operation: () => T | Promise<T>): Promise<T> {
  const existingContext = deferredPersistenceContext.getStore();
  if (existingContext) {
    return operation();
  }

  syncInMemoryState(await loadStateAsync());
  return await deferredPersistenceContext.run({ dirty: false }, async () => {
    const context = deferredPersistenceContext.getStore()!;
    try {
      const result = await operation();
      if (context.dirty) {
        await persistStateAsync();
      }
      return result;
    } catch (error) {
      if (context.dirty) {
        await persistStateAsync();
      }
      throw error;
    }
  });
}

function assertRealmExists(realmId: string): IamRealmRecord {
  const realm = LocalIamFoundationStore.listRealms().realms.find((candidate) => candidate.id === realmId);
  if (!realm) {
    throw new Error(`Unknown IAM realm: ${realmId}`);
  }
  return realm;
}

function getUserById(realmId: string, userId: string): IamUserRecord | null {
  return LocalIamFoundationStore.listUsers({ realm_id: realmId }).users.find((candidate) => candidate.id === userId) ?? null;
}

function ensureRealmExperience(realmId: string): {
  realm: IamRealmRecord;
  theme: IamRealmThemeRecord;
  localization: IamRealmLocalizationRecord;
  templates: IamNotificationTemplateRecord[];
} {
  const realm = assertRealmExists(realmId);
  const sourceTheme = realm.source_realm_id
    ? state.realm_themes.find((candidate) => candidate.realm_id === realm.source_realm_id) ?? null
    : null;
  const sourceLocalization = realm.source_realm_id
    ? state.realm_localizations.find((candidate) => candidate.realm_id === realm.source_realm_id) ?? null
    : null;
  const sourceTemplates = realm.source_realm_id
    ? state.notification_templates.filter((candidate) => candidate.realm_id === realm.source_realm_id)
    : [];

  let theme = state.realm_themes.find((candidate) => candidate.realm_id === realmId);
  if (!theme) {
    theme = buildDefaultTheme(realm, sourceTheme);
    state.realm_themes.push(theme);
  }

  let localization = state.realm_localizations.find((candidate) => candidate.realm_id === realmId);
  if (!localization) {
    localization = buildDefaultLocalization(realm, sourceLocalization);
    state.realm_localizations.push(localization);
  }

  let templates = state.notification_templates.filter((candidate) => candidate.realm_id === realmId);
  if (templates.length === 0) {
    templates = buildDefaultNotificationTemplates(realm, sourceTemplates);
    state.notification_templates.push(...templates);
  } else {
    const expectedTemplates = buildDefaultNotificationTemplates(realm, sourceTemplates);
    const existingKeys = new Set(templates.map((template) => template.key));
    const missingTemplates = expectedTemplates.filter((template) => !existingKeys.has(template.key));
    if (missingTemplates.length > 0) {
      state.notification_templates.push(...missingTemplates);
      templates = state.notification_templates.filter((candidate) => candidate.realm_id === realmId);
    }
  }

  persistStateSyncOnly();
  return {
    realm,
    theme,
    localization,
    templates: clone(templates),
  };
}

function getTemplate(realmId: string, templateKey: IamNotificationTemplateKey): IamNotificationTemplateRecord {
  ensureRealmExperience(realmId);
  const template = state.notification_templates.find((candidate) => candidate.realm_id === realmId && candidate.key === templateKey);
  if (!template) {
    throw new Error(`Unknown IAM notification template ${templateKey} for realm ${realmId}`);
  }
  return template;
}

function resolveTemplateById(realmId: string, templateId: string): IamNotificationTemplateRecord {
  ensureRealmExperience(realmId);
  const template = state.notification_templates.find((candidate) => candidate.realm_id === realmId && candidate.id === templateId);
  if (!template) {
    throw new Error(`Unknown IAM notification template: ${templateId}`);
  }
  return template;
}

function buildNotificationVariables(realm: IamRealmRecord, theme: IamRealmThemeRecord, user: IamUserRecord | null, variables?: Record<string, string>): Record<string, string> {
  return {
    realm_name: realm.name,
    brand_name: theme.brand_name,
    support_email: theme.support_email,
    support_url: theme.support_url ?? '',
    docs_url: theme.docs_url ?? '',
    user_name: user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'Operator',
    user_email: user?.email ?? '',
    ...variables,
  };
}

export const LocalIamExperienceRuntimeStore = {
  getSummary(): IamExperienceSummaryResponse {
    LocalIamFoundationStore.listRealms().realms.forEach((realm) => ensureRealmExperience(realm.id));
    return {
      generated_at: nowIso(),
      phase: 'PHASE_5',
      subsystem_status: 'ADMIN_CONSOLE_AND_THEME_COMPLETION_IMPLEMENTED',
      realm_theme_count: state.realm_themes.length,
      localization_bundle_count: state.realm_localizations.length,
      notification_template_count: state.notification_templates.length,
      notification_delivery_count: state.notification_deliveries.length,
      next_recommended_phase: 'PHASE_6_OPERATIONS_HARDENING',
    };
  },

  getRealmExperience(realmId: string): IamRealmExperienceResponse {
    const { realm, theme, localization } = ensureRealmExperience(realmId);
    return {
      generated_at: nowIso(),
      realm: {
        id: realm.id,
        name: realm.name,
        summary: realm.summary,
      },
      public_links: {
        signup_url: realm.attributes?.['login.signup_url'] ?? null,
      },
      theme: clone(theme),
      localization: clone(localization),
    };
  },

  updateRealmTheme(actorUserId: string, realmId: string, input: UpdateIamRealmThemeRequest): IamRealmThemeRecord {
    const { realm, theme } = ensureRealmExperience(realmId);
    if (input.preset) {
      theme.preset = input.preset;
    }
    if (input.brand_name !== undefined) {
      theme.brand_name = input.brand_name.trim() || realm.name;
    }
    if (input.logo_label !== undefined) {
      theme.logo_label = input.logo_label.trim() || theme.logo_label;
    }
    if (input.support_email !== undefined) {
      theme.support_email = input.support_email.trim() || theme.support_email;
    }
    if (input.support_url !== undefined) {
      theme.support_url = input.support_url?.trim() || null;
    }
    if (input.docs_url !== undefined) {
      theme.docs_url = input.docs_url?.trim() || null;
    }
    if (input.primary_color !== undefined) {
      theme.primary_color = input.primary_color.trim() || theme.primary_color;
    }
    if (input.accent_color !== undefined) {
      theme.accent_color = input.accent_color.trim() || theme.accent_color;
    }
    if (input.surface_tint !== undefined) {
      theme.surface_tint = input.surface_tint.trim() || theme.surface_tint;
    }
    if (input.login_title !== undefined) {
      theme.login_title = input.login_title.trim() || theme.login_title;
    }
    if (input.login_subtitle !== undefined) {
      theme.login_subtitle = input.login_subtitle.trim() || theme.login_subtitle;
    }
    if (input.account_title !== undefined) {
      theme.account_title = input.account_title.trim() || theme.account_title;
    }
    if (input.account_subtitle !== undefined) {
      theme.account_subtitle = input.account_subtitle.trim() || theme.account_subtitle;
    }
    if (input.admin_title !== undefined) {
      theme.admin_title = input.admin_title.trim() || theme.admin_title;
    }
    if (input.admin_subtitle !== undefined) {
      theme.admin_subtitle = input.admin_subtitle.trim() || theme.admin_subtitle;
    }
    if (input.footer_note !== undefined) {
      theme.footer_note = input.footer_note.trim() || theme.footer_note;
    }
    theme.updated_at = nowIso();
    theme.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(theme);
  },

  async updateRealmThemeAsync(actorUserId: string, realmId: string, input: UpdateIamRealmThemeRequest): Promise<IamRealmThemeRecord> {
    return await runWithDeferredPersistence(() => this.updateRealmTheme(actorUserId, realmId, input));
  },

  updateRealmLocalization(actorUserId: string, realmId: string, input: UpdateIamRealmLocalizationRequest): IamRealmLocalizationRecord {
    const { localization } = ensureRealmExperience(realmId);
    if (input.default_locale !== undefined) {
      localization.default_locale = input.default_locale.trim() || localization.default_locale;
    }
    if (input.supported_locales) {
      const nextLocales = Array.from(new Set(input.supported_locales.map((candidate) => candidate.trim()).filter(Boolean)));
      if (nextLocales.length > 0) {
        localization.supported_locales = nextLocales;
      }
    }
    if (input.mode) {
      localization.mode = input.mode;
    }
    if (input.translations) {
      localization.translations = clone(input.translations);
    }
    localization.updated_at = nowIso();
    localization.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(localization);
  },

  async updateRealmLocalizationAsync(actorUserId: string, realmId: string, input: UpdateIamRealmLocalizationRequest): Promise<IamRealmLocalizationRecord> {
    return await runWithDeferredPersistence(() => this.updateRealmLocalization(actorUserId, realmId, input));
  },

  listNotificationTemplates(realmId: string): IamNotificationTemplatesResponse {
    ensureRealmExperience(realmId);
    const templates = state.notification_templates.filter((candidate) => candidate.realm_id === realmId);
    return {
      generated_at: nowIso(),
      notification_templates: clone(templates),
      count: templates.length,
    };
  },

  updateNotificationTemplate(actorUserId: string, realmId: string, templateId: string, input: UpdateIamNotificationTemplateRequest): IamNotificationTemplateRecord {
    const template = resolveTemplateById(realmId, templateId);
    if (input.name !== undefined) {
      template.name = input.name.trim() || template.name;
    }
    if (input.subject_template !== undefined) {
      template.subject_template = input.subject_template.trim() || template.subject_template;
    }
    if (input.body_template !== undefined) {
      template.body_template = input.body_template.trim() || template.body_template;
    }
    if (input.cta_label !== undefined) {
      template.cta_label = input.cta_label?.trim() || null;
    }
    template.updated_at = nowIso();
    template.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(template);
  },

  async updateNotificationTemplateAsync(actorUserId: string, realmId: string, templateId: string, input: UpdateIamNotificationTemplateRequest): Promise<IamNotificationTemplateRecord> {
    return await runWithDeferredPersistence(() => this.updateNotificationTemplate(actorUserId, realmId, templateId, input));
  },

  previewNotificationTemplate(realmId: string, templateId: string, variables?: Record<string, string>): {
    template: IamNotificationTemplateRecord;
    subject: string;
    body: string;
  } {
    const template = resolveTemplateById(realmId, templateId);
    const { realm, theme } = ensureRealmExperience(realmId);
    const subject = renderTemplate(template.subject_template, buildNotificationVariables(realm, theme, null, variables));
    const body = renderTemplate(template.body_template, buildNotificationVariables(realm, theme, null, variables));
    return {
      template: clone(template),
      subject,
      body,
    };
  },

  recordNotificationDelivery(actorUserId: string, realmId: string, templateKey: IamNotificationTemplateKey, recipientUserId: string | null, recipientEmail: string, variables?: Record<string, string>): IamNotificationDeliveryRecord {
    const { realm, theme } = ensureRealmExperience(realmId);
    const template = getTemplate(realmId, templateKey);
    const user = recipientUserId ? getUserById(realmId, recipientUserId) : null;
    const renderedVariables = buildNotificationVariables(realm, theme, user, variables);
    const record: IamNotificationDeliveryRecord = {
      id: `iam-notification-${randomUUID()}`,
      realm_id: realmId,
      template_key: template.key,
      channel: 'EMAIL',
      delivery_mode: 'LOCAL_DELIVERY_LEDGER',
      status: 'DELIVERED',
      recipient_user_id: recipientUserId,
      recipient_email: recipientEmail,
      subject: renderTemplate(template.subject_template, renderedVariables),
      body: renderTemplate(template.body_template, renderedVariables),
      sent_at: nowIso(),
      created_by_user_id: actorUserId,
    };
    state.notification_deliveries.unshift(record);
    state.notification_deliveries = state.notification_deliveries.slice(0, 500);
    persistStateSyncOnly();
    return clone(record);
  },

  sendTestNotification(actorUserId: string, realmId: string, input: CreateIamTestNotificationRequest): IamNotificationDeliveryRecord {
    const recipientEmail = input.recipient_email.trim();
    if (!recipientEmail) {
      throw new Error('recipient_email is required');
    }
    return this.recordNotificationDelivery(actorUserId, realmId, input.template_key, null, recipientEmail, input.variables);
  },

  async sendTestNotificationAsync(actorUserId: string, realmId: string, input: CreateIamTestNotificationRequest): Promise<IamNotificationDeliveryRecord> {
    return await runWithDeferredPersistence(() => this.sendTestNotification(actorUserId, realmId, input));
  },

  listNotificationDeliveries(filters?: {
    realm_id?: string | null;
    template_key?: IamNotificationTemplateKey | null;
  }): IamNotificationDeliveriesResponse {
    let deliveries = [...state.notification_deliveries];
    if (filters?.realm_id) {
      deliveries = deliveries.filter((candidate) => candidate.realm_id === filters.realm_id);
    }
    if (filters?.template_key) {
      deliveries = deliveries.filter((candidate) => candidate.template_key === filters.template_key);
    }
    return {
      generated_at: nowIso(),
      notification_deliveries: clone(deliveries),
      count: deliveries.length,
    };
  },

  exportState(): Record<string, unknown> {
    return clone(state) as unknown as Record<string, unknown>;
  },

  importState(input: Record<string, unknown>): void {
    const nextState = {
      version: typeof input.version === 'number' ? input.version : 1,
      realm_themes: Array.isArray(input.realm_themes) ? input.realm_themes : [],
      realm_localizations: Array.isArray(input.realm_localizations) ? input.realm_localizations : [],
      notification_templates: Array.isArray(input.notification_templates) ? input.notification_templates : [],
      notification_deliveries: Array.isArray(input.notification_deliveries) ? input.notification_deliveries : [],
    } as StoredIamExperienceState;
    state.version = nextState.version;
    state.realm_themes = nextState.realm_themes;
    state.realm_localizations = nextState.realm_localizations;
    state.notification_templates = nextState.notification_templates;
    state.notification_deliveries = nextState.notification_deliveries;
    persistStateSyncOnly();
  },
};
