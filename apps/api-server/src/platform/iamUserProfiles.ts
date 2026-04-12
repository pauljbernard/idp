import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import {
  createPersistedAsyncIamStateRepository,
  createPersistedIamStateRepository,
  type IamAsyncStateRepository,
  type IamStateRepository,
} from './iamStateRepository';
import { LocalIamFoundationStore } from './iamFoundation';
import {
  IAM_DEFAULT_REALM_ID,
  IAM_SUPER_ADMIN_USER_ID,
  IAM_SYSTEM_USER_ID,
  rewriteIamIdentifiers,
} from './iamIdentifiers';

const IAM_USER_PROFILES_FILE = 'iam-user-profiles-state.json';
const deferredPersistenceContext = new AsyncLocalStorage<{ dirty: boolean }>();

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

export type IamUserProfileSchemaStatus = 'ACTIVE' | 'ARCHIVED';
export type IamUserProfileAttributeType =
  | 'STRING'
  | 'TEXT'
  | 'EMAIL'
  | 'PHONE'
  | 'URL'
  | 'BOOLEAN'
  | 'NUMBER'
  | 'DATE'
  | 'ENUM';
export type IamUserProfilePrivacyClassification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
export type IamUserProfileMinimizationPosture = 'NONE' | 'STANDARD' | 'STRICT';
export type IamUserProfileActorScope = 'SELF' | 'ADMIN';
export type IamUserProfilePrimitive = string | boolean | number | null;
export type IamUserProfileAttributeValue = IamUserProfilePrimitive | IamUserProfilePrimitive[];

export interface IamUserProfileAttributeGovernance {
  privacy_classification: IamUserProfilePrivacyClassification;
  release_purposes: string[];
  consent_required: boolean;
  minimization_posture: IamUserProfileMinimizationPosture;
}

export interface IamUserProfileAttributeDefinition {
  id: string;
  key: string;
  label: string;
  type: IamUserProfileAttributeType;
  required: boolean;
  multivalued: boolean;
  placeholder: string | null;
  help_text: string | null;
  allowed_values: string[];
  regex_pattern: string | null;
  view_scopes: IamUserProfileActorScope[];
  edit_scopes: IamUserProfileActorScope[];
  privacy_classification: IamUserProfilePrivacyClassification;
  release_purposes: string[];
  consent_required: boolean;
  minimization_posture: IamUserProfileMinimizationPosture;
  synthetic: boolean;
  order_index: number;
}

export interface IamUserProfileSchemaRecord {
  id: string;
  realm_id: string;
  display_name: string;
  summary: string;
  status: IamUserProfileSchemaStatus;
  synthetic: boolean;
  attributes: IamUserProfileAttributeDefinition[];
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

export interface IamUserProfileRecord {
  id: string;
  realm_id: string;
  user_id: string;
  attributes: Record<string, IamUserProfileAttributeValue>;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
}

interface IamUserProfilesState {
  schemas: IamUserProfileSchemaRecord[];
  profiles: IamUserProfileRecord[];
}

interface IamUserProfilesRepository extends IamStateRepository<IamUserProfilesState> {}
interface IamAsyncUserProfilesRepository extends IamAsyncStateRepository<IamUserProfilesState> {}

export interface IamUserProfileSummary {
  schema_count: number;
  profile_count: number;
}

export interface IamResolvedUserProfileRecord extends IamUserProfileRecord {
  schema: IamUserProfileSchemaRecord;
  username: string;
  email: string;
  communication_email: string;
  login_identifier: string;
  first_name: string;
  last_name: string;
}

export interface IamUserProfileSchemasResponse {
  generated_at: string;
  schemas: IamUserProfileSchemaRecord[];
  count: number;
}

export interface IamUserProfilesResponse {
  generated_at: string;
  profiles: Array<IamUserProfileRecord & {
    username: string;
    email: string;
  }>;
  count: number;
}

export interface UpdateIamUserProfileSchemaRequest {
  display_name?: string;
  summary?: string;
  status?: IamUserProfileSchemaStatus;
  attributes?: IamUserProfileAttributeDefinition[];
}

export interface UpdateIamUserProfileRequest {
  attributes?: Record<string, IamUserProfileAttributeValue>;
}

function seedProfiles(): IamUserProfileRecord[] {
  const createdAt = nowIso();
  return [
    {
      id: 'iam-user-profile-idp-super-admin',
      realm_id: IAM_DEFAULT_REALM_ID,
      user_id: IAM_SUPER_ADMIN_USER_ID,
      attributes: {
        job_title: 'Platform Administrator',
        phone_number: '+1 555 010 1000',
        locale: 'en-US',
        lms_preferred_accommodation_profile_id: 'accommodation-read-aloud',
        lms_preferred_alternate_format_tag: 'audio-summary',
        lms_preferred_differentiation_profile_id: 'differentiation-tutor-guided',
      },
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: IAM_SYSTEM_USER_ID,
      updated_by_user_id: IAM_SYSTEM_USER_ID,
    },
    {
      id: 'iam-user-profile-education-admin',
      realm_id: 'realm-education-validation',
      user_id: 'iam-user-education-admin',
      attributes: {
        job_title: 'Registrar',
        phone_number: '+1 555 010 2000',
        locale: 'en-US',
      },
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: IAM_SYSTEM_USER_ID,
      updated_by_user_id: IAM_SYSTEM_USER_ID,
    },
    {
      id: 'iam-user-profile-education-guardian',
      realm_id: 'realm-education-validation',
      user_id: 'iam-user-education-guardian',
      attributes: {
        job_title: 'Guardian',
        phone_number: '+1 555 010 3000',
        locale: 'en-US',
      },
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: IAM_SYSTEM_USER_ID,
      updated_by_user_id: IAM_SYSTEM_USER_ID,
    },
    {
      id: 'iam-user-profile-training-learner',
      realm_id: 'realm-training-validation',
      user_id: 'iam-user-training-learner',
      attributes: {
        job_title: 'Learner',
        phone_number: '+1 555 010 4000',
        locale: 'en-US',
        lms_preferred_accommodation_profile_id: 'accommodation-read-aloud',
        lms_preferred_alternate_format_tag: 'audio-summary',
        lms_preferred_differentiation_profile_id: 'differentiation-tutor-guided',
      },
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: IAM_SYSTEM_USER_ID,
      updated_by_user_id: IAM_SYSTEM_USER_ID,
    },
  ];
}

function normalizeState(input: Partial<IamUserProfilesState>): IamUserProfilesState {
  input = rewriteIamIdentifiers(input);
  const seed = seedProfiles();
  return {
    schemas: Array.isArray(input.schemas) ? input.schemas : [],
    profiles: Array.isArray(input.profiles)
      ? input.profiles.map((profile) => {
        const seedProfile = seed.find((candidate) => (
          candidate.realm_id === profile.realm_id &&
          candidate.user_id === profile.user_id
        ));
        if (!seedProfile) {
          return profile;
        }
        return {
          ...seedProfile,
          ...profile,
          attributes: {
            ...seedProfile.attributes,
            ...profile.attributes,
          },
        };
      }).concat(
        seed.filter((seedProfile) => !input.profiles.some((profile) => (
          profile.realm_id === seedProfile.realm_id &&
          profile.user_id === seedProfile.user_id
        ))),
      )
      : seed,
  };
}

function normalizePrivacyClassification(value: unknown): IamUserProfilePrivacyClassification {
  if (value === 'PUBLIC' || value === 'INTERNAL' || value === 'CONFIDENTIAL' || value === 'RESTRICTED') {
    return value;
  }
  return 'INTERNAL';
}

function normalizeMinimizationPosture(value: unknown): IamUserProfileMinimizationPosture {
  if (value === 'NONE' || value === 'STANDARD' || value === 'STRICT') {
    return value;
  }
  return 'STANDARD';
}

function normalizeReleasePurposes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter(Boolean),
    ),
  );
}

function defaultAttributes(): IamUserProfileAttributeDefinition[] {
  return [
    {
      id: 'attr-job-title',
      key: 'job_title',
      label: 'Job Title',
      type: 'STRING',
      required: false,
      multivalued: false,
      placeholder: 'Chief Pilot',
      help_text: 'Operator-facing role or title inside the organization.',
      allowed_values: [],
      regex_pattern: null,
      view_scopes: ['SELF', 'ADMIN'],
      edit_scopes: ['SELF', 'ADMIN'],
      privacy_classification: 'INTERNAL',
      release_purposes: ['directory', 'operations'],
      consent_required: false,
      minimization_posture: 'STANDARD',
      synthetic: true,
      order_index: 10,
    },
    {
      id: 'attr-phone-number',
      key: 'phone_number',
      label: 'Phone Number',
      type: 'PHONE',
      required: false,
      multivalued: false,
      placeholder: '+1 555 010 2048',
      help_text: 'Primary contact number for urgent operational coordination.',
      allowed_values: [],
      regex_pattern: '^[0-9+().\\-\\s]{7,24}$',
      view_scopes: ['SELF', 'ADMIN'],
      edit_scopes: ['SELF', 'ADMIN'],
      privacy_classification: 'RESTRICTED',
      release_purposes: ['contact', 'emergency_contact'],
      consent_required: true,
      minimization_posture: 'STRICT',
      synthetic: true,
      order_index: 20,
    },
    {
      id: 'attr-locale',
      key: 'locale',
      label: 'Locale',
      type: 'ENUM',
      required: false,
      multivalued: false,
      placeholder: null,
      help_text: 'Preferred language and region for the account experience.',
      allowed_values: ['en-US', 'en-GB', 'es-US'],
      regex_pattern: null,
      view_scopes: ['SELF', 'ADMIN'],
      edit_scopes: ['SELF', 'ADMIN'],
      privacy_classification: 'INTERNAL',
      release_purposes: ['localization', 'notifications'],
      consent_required: false,
      minimization_posture: 'STANDARD',
      synthetic: true,
      order_index: 30,
    },
    {
      id: 'attr-time-zone',
      key: 'time_zone',
      label: 'Time Zone',
      type: 'STRING',
      required: false,
      multivalued: false,
      placeholder: 'America/New_York',
      help_text: 'Default local time zone for notifications and schedules.',
      allowed_values: [],
      regex_pattern: null,
      view_scopes: ['SELF', 'ADMIN'],
      edit_scopes: ['SELF', 'ADMIN'],
      privacy_classification: 'INTERNAL',
      release_purposes: ['scheduling', 'notifications'],
      consent_required: false,
      minimization_posture: 'STANDARD',
      synthetic: true,
      order_index: 40,
    },
    {
      id: 'attr-operational-specialties',
      key: 'operational_specialties',
      label: 'Operational Specialties',
      type: 'ENUM',
      required: false,
      multivalued: true,
      placeholder: null,
      help_text: 'Declared specialization areas used for organization and workflow routing.',
      allowed_values: ['INSPECTION', 'SURVEY', 'PUBLIC_SAFETY', 'AGRICULTURE', 'REAL_ESTATE_MEDIA'],
      regex_pattern: null,
      view_scopes: ['SELF', 'ADMIN'],
      edit_scopes: ['SELF', 'ADMIN'],
      privacy_classification: 'INTERNAL',
      release_purposes: ['assignment', 'workflow_routing', 'team_placement'],
      consent_required: false,
      minimization_posture: 'STANDARD',
      synthetic: true,
      order_index: 50,
    },
    {
      id: 'attr-lms-preferred-accommodation-profile-id',
      key: 'lms_preferred_accommodation_profile_id',
      label: 'Preferred LMS Accommodation Profile',
      type: 'ENUM',
      required: false,
      multivalued: false,
      placeholder: null,
      help_text: 'Preferred accommodation profile to apply when learner delivery is resolved from LMS academic bindings.',
      allowed_values: ['accommodation-extended-time', 'accommodation-read-aloud', 'accommodation-visual-simplification'],
      regex_pattern: null,
      view_scopes: ['SELF', 'ADMIN'],
      edit_scopes: ['SELF', 'ADMIN'],
      privacy_classification: 'INTERNAL',
      release_purposes: ['learning_delivery', 'learning_accessibility', 'personalization'],
      consent_required: false,
      minimization_posture: 'STANDARD',
      synthetic: true,
      order_index: 60,
    },
    {
      id: 'attr-lms-preferred-alternate-format-tag',
      key: 'lms_preferred_alternate_format_tag',
      label: 'Preferred LMS Alternate Format',
      type: 'ENUM',
      required: false,
      multivalued: false,
      placeholder: null,
      help_text: 'Preferred alternate-format tag to apply when learner delivery is resolved from LMS academic bindings.',
      allowed_values: ['audio-summary', 'printable-guide', 'reduced-visual-density', 'screen-reader-outline'],
      regex_pattern: null,
      view_scopes: ['SELF', 'ADMIN'],
      edit_scopes: ['SELF', 'ADMIN'],
      privacy_classification: 'INTERNAL',
      release_purposes: ['learning_delivery', 'learning_accessibility', 'personalization'],
      consent_required: false,
      minimization_posture: 'STANDARD',
      synthetic: true,
      order_index: 70,
    },
    {
      id: 'attr-lms-preferred-differentiation-profile-id',
      key: 'lms_preferred_differentiation_profile_id',
      label: 'Preferred LMS Differentiation Profile',
      type: 'ENUM',
      required: false,
      multivalued: false,
      placeholder: null,
      help_text: 'Preferred differentiated delivery profile to apply when learner delivery is resolved from LMS academic bindings.',
      allowed_values: [
        'differentiation-student-core',
        'differentiation-tutor-guided',
        'differentiation-guardian-summary',
        'differentiation-instructor-led',
      ],
      regex_pattern: null,
      view_scopes: ['SELF', 'ADMIN'],
      edit_scopes: ['SELF', 'ADMIN'],
      privacy_classification: 'INTERNAL',
      release_purposes: ['learning_delivery', 'learning_accessibility', 'personalization'],
      consent_required: false,
      minimization_posture: 'STANDARD',
      synthetic: true,
      order_index: 80,
    },
  ];
}

const userProfilesRepository: IamUserProfilesRepository = createPersistedIamStateRepository<
  Partial<IamUserProfilesState>,
  IamUserProfilesState
>({
  fileName: IAM_USER_PROFILES_FILE,
  seedFactory: () => normalizeState({}),
  normalize: normalizeState,
});

const userProfilesAsyncRepository: IamAsyncUserProfilesRepository = createPersistedAsyncIamStateRepository<
  Partial<IamUserProfilesState>,
  IamUserProfilesState
>({
  fileName: IAM_USER_PROFILES_FILE,
  seedFactory: () => normalizeState({}),
  normalize: normalizeState,
});

const state = userProfilesRepository.load();

async function loadStateAsync(): Promise<IamUserProfilesState> {
  return await userProfilesAsyncRepository.load();
}

function syncInMemoryState(nextState: IamUserProfilesState): void {
  state.schemas = clone(nextState.schemas);
  state.profiles = clone(nextState.profiles);
}
migrateExistingSchemas();

function persistStateSyncOnly(): void {
  const deferredContext = deferredPersistenceContext.getStore();
  if (deferredContext) {
    deferredContext.dirty = true;
    return;
  }
  userProfilesRepository.save(state);
}

async function persistStateAsync(): Promise<void> {
  await userProfilesAsyncRepository.save(state);
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

function assertRealmExists(realmId: string): void {
  LocalIamFoundationStore.getRealm(realmId);
}

function assertUserExists(realmId: string, userId: string): void {
  const user = LocalIamFoundationStore.getUserById(userId);
  if (user.realm_id !== realmId) {
    throw new Error(`IAM user ${userId} does not belong to realm ${realmId}`);
  }
}

function ensureUniqueAttributeKeys(attributes: IamUserProfileAttributeDefinition[]): void {
  const seen = new Set<string>();
  for (const attribute of attributes) {
    const key = attribute.key.trim();
    if (!key) {
      throw new Error('Profile attribute key cannot be empty');
    }
    if (!/^[a-z][a-z0-9_]*$/i.test(key)) {
      throw new Error(`Invalid profile attribute key: ${attribute.key}`);
    }
    const normalized = key.toLowerCase();
    if (seen.has(normalized)) {
      throw new Error(`Duplicate profile attribute key: ${attribute.key}`);
    }
    seen.add(normalized);
  }
}

function normalizeAttributeGovernance(attribute: Partial<IamUserProfileAttributeDefinition>): IamUserProfileAttributeGovernance {
  return {
    privacy_classification: normalizePrivacyClassification(attribute.privacy_classification),
    release_purposes: normalizeReleasePurposes(attribute.release_purposes),
    consent_required: Boolean(attribute.consent_required),
    minimization_posture: normalizeMinimizationPosture(attribute.minimization_posture),
  };
}

function normalizeAttributeDefinition(attribute: Partial<IamUserProfileAttributeDefinition>, index: number): IamUserProfileAttributeDefinition {
  const key = attribute.key?.trim();
  const label = attribute.label?.trim();
  if (!key) {
    throw new Error('Profile attribute key cannot be empty');
  }
  if (!label) {
    throw new Error(`Profile attribute ${key} label cannot be empty`);
  }
  const viewScopes: IamUserProfileActorScope[] = attribute.view_scopes?.length
    ? Array.from(new Set(attribute.view_scopes))
    : ['SELF', 'ADMIN'];
  const editScopes: IamUserProfileActorScope[] = attribute.edit_scopes?.length
    ? Array.from(new Set(attribute.edit_scopes))
    : ['SELF', 'ADMIN'];
  if (viewScopes.length === 0 || editScopes.length === 0) {
    throw new Error(`Profile attribute ${key} must expose view and edit scopes`);
  }
  const governance = normalizeAttributeGovernance(attribute);
  return {
    id: attribute.id?.trim() || `profile-attribute-${randomUUID()}`,
    key,
    label,
    type: attribute.type ?? 'STRING',
    required: Boolean(attribute.required),
    multivalued: Boolean(attribute.multivalued),
    placeholder: attribute.placeholder?.trim() || null,
    help_text: attribute.help_text?.trim() || null,
    allowed_values: Array.from(new Set((attribute.allowed_values ?? []).map((value) => value.trim()).filter(Boolean))),
    regex_pattern: attribute.regex_pattern?.trim() || null,
    view_scopes: viewScopes,
    edit_scopes: editScopes,
    privacy_classification: governance.privacy_classification,
    release_purposes: governance.release_purposes,
    consent_required: governance.consent_required,
    minimization_posture: governance.minimization_posture,
    synthetic: Boolean(attribute.synthetic),
    order_index: Number.isFinite(attribute.order_index) ? attribute.order_index : (index + 1) * 10,
  };
}

function normalizeSchemaRecord(schema: IamUserProfileSchemaRecord): IamUserProfileSchemaRecord {
  return {
    ...schema,
    attributes: Array.isArray(schema.attributes)
      ? schema.attributes
        .map((attribute, index) => normalizeAttributeDefinition(attribute, index))
        .sort((left, right) => left.order_index - right.order_index)
      : [],
  };
}

function migrateExistingSchemas(): void {
  const governanceDefaults = defaultAttributes().reduce<Record<string, IamUserProfileAttributeDefinition>>((accumulator, attribute) => {
    accumulator[attribute.key] = attribute;
    return accumulator;
  }, {});
  let changed = false;
  for (let index = 0; index < state.schemas.length; index += 1) {
    const current = state.schemas[index];
    const existingAttributeKeys = new Set(current.attributes.map((attribute) => attribute.key));
    const normalized = normalizeSchemaRecord({
      ...current,
      attributes: current.attributes
        .map((attribute) => {
          const defaultAttribute = governanceDefaults[attribute.key];
          if (!defaultAttribute || !attribute.synthetic) {
            return attribute;
          }
          return {
            ...attribute,
            privacy_classification: defaultAttribute.privacy_classification,
            release_purposes: clone(defaultAttribute.release_purposes),
            consent_required: defaultAttribute.consent_required,
            minimization_posture: defaultAttribute.minimization_posture,
          };
        })
        .concat(
          defaultAttributes()
            .filter((attribute) => attribute.synthetic && !existingAttributeKeys.has(attribute.key))
            .map((attribute) => clone(attribute)),
        ),
    });
    if (JSON.stringify(current) !== JSON.stringify(normalized)) {
      state.schemas[index] = normalized;
      changed = true;
    }
  }
  if (changed) {
    persistStateSyncOnly();
  }
}

function synchronizeSchemas(): void {
  let changed = false;
  const realms = LocalIamFoundationStore.listRealms().realms;
  const systemUserId = IAM_SYSTEM_USER_ID;
  for (const realm of realms) {
    if (state.schemas.some((schema) => schema.realm_id === realm.id)) {
      continue;
    }
    const createdAt = nowIso();
    state.schemas.push({
      id: `${realm.id}-profile-schema`,
      realm_id: realm.id,
      display_name: `${realm.name} User Profile`,
      summary: `Schema-driven account profile for ${realm.name}.`,
      status: 'ACTIVE',
      synthetic: true,
      attributes: defaultAttributes(),
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: systemUserId,
      updated_by_user_id: systemUserId,
    });
    changed = true;
  }
  if (changed) {
    persistStateSyncOnly();
  }
}

function ensureProfileRecord(realmId: string, userId: string, actorUserId: string): IamUserProfileRecord {
  let record = state.profiles.find((candidate) => candidate.realm_id === realmId && candidate.user_id === userId);
  if (!record) {
    const createdAt = nowIso();
    record = {
      id: `iam-user-profile-${randomUUID()}`,
      realm_id: realmId,
      user_id: userId,
      attributes: {},
      created_at: createdAt,
      updated_at: createdAt,
      created_by_user_id: actorUserId,
      updated_by_user_id: actorUserId,
    };
    state.profiles.push(record);
    persistStateSyncOnly();
  }
  return record;
}

function assertSchema(realmId: string): IamUserProfileSchemaRecord {
  synchronizeSchemas();
  const schema = state.schemas.find((candidate) => candidate.realm_id === realmId);
  if (!schema) {
    throw new Error(`Missing IAM user profile schema for realm ${realmId}`);
  }
  return schema;
}

function validateSingleValue(attribute: IamUserProfileAttributeDefinition, value: IamUserProfilePrimitive): IamUserProfilePrimitive {
  if (value === null) {
    return null;
  }
  switch (attribute.type) {
    case 'BOOLEAN':
      if (typeof value !== 'boolean') {
        throw new Error(`Profile attribute ${attribute.key} must be a boolean`);
      }
      return value;
    case 'NUMBER':
      if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new Error(`Profile attribute ${attribute.key} must be a number`);
      }
      return value;
    default: {
      if (typeof value !== 'string') {
        throw new Error(`Profile attribute ${attribute.key} must be a string`);
      }
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      if (attribute.allowed_values.length > 0 && !attribute.allowed_values.includes(trimmed)) {
        throw new Error(`Profile attribute ${attribute.key} must be one of: ${attribute.allowed_values.join(', ')}`);
      }
      if (attribute.regex_pattern && !(new RegExp(attribute.regex_pattern).test(trimmed))) {
        throw new Error(`Profile attribute ${attribute.key} does not match the expected format`);
      }
      return trimmed;
    }
  }
}

function normalizeAttributeValue(
  attribute: IamUserProfileAttributeDefinition,
  value: IamUserProfileAttributeValue | undefined,
): IamUserProfileAttributeValue | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (attribute.multivalued) {
    if (!Array.isArray(value)) {
      throw new Error(`Profile attribute ${attribute.key} must be an array`);
    }
    const normalized = value
      .map((entry) => validateSingleValue(attribute, entry))
      .filter((entry): entry is string | boolean | number => entry !== null);
    if (attribute.required && normalized.length === 0) {
      throw new Error(`Profile attribute ${attribute.key} is required`);
    }
    return normalized;
  }
  if (Array.isArray(value)) {
    throw new Error(`Profile attribute ${attribute.key} cannot be multi-valued`);
  }
  const normalized = validateSingleValue(attribute, value);
  if (attribute.required && (normalized === null || normalized === '')) {
    throw new Error(`Profile attribute ${attribute.key} is required`);
  }
  return normalized;
}

function applyProfileAttributes(
  realmId: string,
  userId: string,
  actorUserId: string,
  actorScope: IamUserProfileActorScope,
  attributes: Record<string, IamUserProfileAttributeValue>,
): IamUserProfileRecord {
  const schema = assertSchema(realmId);
  const record = ensureProfileRecord(realmId, userId, actorUserId);
  const nextAttributes = { ...record.attributes };
  const definitionsByKey = new Map(schema.attributes.map((attribute) => [attribute.key, attribute]));

  for (const [key, value] of Object.entries(attributes)) {
    const definition = definitionsByKey.get(key);
    if (!definition) {
      throw new Error(`Unknown profile attribute: ${key}`);
    }
    if (!definition.edit_scopes.includes(actorScope)) {
      throw new Error(`Profile attribute ${key} is not editable in ${actorScope.toLowerCase()} scope`);
    }
    const normalized = normalizeAttributeValue(definition, value);
    if (normalized === undefined || normalized === null || (Array.isArray(normalized) && normalized.length === 0)) {
      delete nextAttributes[key];
    } else {
      nextAttributes[key] = normalized;
    }
  }

  for (const attribute of schema.attributes) {
    if (!attribute.required) {
      continue;
    }
    const currentValue = nextAttributes[attribute.key];
    if (currentValue === undefined || currentValue === null || (Array.isArray(currentValue) && currentValue.length === 0)) {
      throw new Error(`Profile attribute ${attribute.key} is required`);
    }
  }

  record.attributes = nextAttributes;
  record.updated_at = nowIso();
  record.updated_by_user_id = actorUserId;
  persistStateSyncOnly();
  return clone(record);
}

export const LocalIamUserProfileStore = {
  getSummary(): IamUserProfileSummary {
    synchronizeSchemas();
    return {
      schema_count: state.schemas.length,
      profile_count: state.profiles.length,
    };
  },

  listSchemas(filters?: {
    realm_id?: string | null;
  }): IamUserProfileSchemasResponse {
    synchronizeSchemas();
    const schemas = filters?.realm_id
      ? state.schemas.filter((schema) => schema.realm_id === filters.realm_id)
      : state.schemas;
    return {
      generated_at: nowIso(),
      schemas: clone(schemas),
      count: schemas.length,
    };
  },

  getSchemaForRealm(realmId: string): IamUserProfileSchemaRecord {
    assertRealmExists(realmId);
    return clone(assertSchema(realmId));
  },

  updateSchema(actorUserId: string, realmId: string, input: UpdateIamUserProfileSchemaRequest): IamUserProfileSchemaRecord {
    assertRealmExists(realmId);
    const schema = assertSchema(realmId);
    if (input.display_name !== undefined) {
      const next = input.display_name.trim();
      if (!next) {
        throw new Error('Profile schema display_name cannot be empty');
      }
      schema.display_name = next;
    }
    if (input.summary !== undefined) {
      const next = input.summary.trim();
      if (!next) {
        throw new Error('Profile schema summary cannot be empty');
      }
      schema.summary = next;
    }
    if (input.status) {
      schema.status = input.status;
    }
    if (input.attributes) {
      ensureUniqueAttributeKeys(input.attributes);
      schema.attributes = input.attributes
        .map((attribute, index) => normalizeAttributeDefinition(attribute, index))
        .sort((left, right) => left.order_index - right.order_index);
    }
    schema.updated_at = nowIso();
    schema.updated_by_user_id = actorUserId;
    persistStateSyncOnly();
    return clone(schema);
  },

  async updateSchemaAsync(actorUserId: string, realmId: string, input: UpdateIamUserProfileSchemaRequest): Promise<IamUserProfileSchemaRecord> {
    return await runWithDeferredPersistence(() => this.updateSchema(actorUserId, realmId, input));
  },

  getUserProfile(realmId: string, userId: string, actorScope: IamUserProfileActorScope = 'ADMIN'): IamResolvedUserProfileRecord {
    assertRealmExists(realmId);
    assertUserExists(realmId, userId);
    const schema = assertSchema(realmId);
    const record = ensureProfileRecord(realmId, userId, userId);
    const user = LocalIamFoundationStore.getUserById(userId);
    const visibleAttributes: Record<string, IamUserProfileAttributeValue> = {};
    for (const attribute of schema.attributes) {
      if (!attribute.view_scopes.includes(actorScope)) {
        continue;
      }
      if (record.attributes[attribute.key] !== undefined) {
        visibleAttributes[attribute.key] = clone(record.attributes[attribute.key]);
      }
    }
    return {
      ...clone(record),
      username: user.username,
      email: user.email,
      communication_email: user.email,
      login_identifier: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      attributes: visibleAttributes,
      schema: clone(schema),
    };
  },

  updateUserProfile(
    actorUserId: string,
    realmId: string,
    userId: string,
    input: UpdateIamUserProfileRequest,
    actorScope: IamUserProfileActorScope = 'ADMIN',
  ): IamResolvedUserProfileRecord {
    assertRealmExists(realmId);
    assertUserExists(realmId, userId);
    applyProfileAttributes(realmId, userId, actorUserId, actorScope, input.attributes ?? {});
    return this.getUserProfile(realmId, userId, actorScope);
  },

  async updateUserProfileAsync(
    actorUserId: string,
    realmId: string,
    userId: string,
    input: UpdateIamUserProfileRequest,
    actorScope: IamUserProfileActorScope = 'ADMIN',
  ): Promise<IamResolvedUserProfileRecord> {
    return await runWithDeferredPersistence(() => this.updateUserProfile(actorUserId, realmId, userId, input, actorScope));
  },

  listProfiles(filters?: {
    realm_id?: string | null;
    user_id?: string | null;
  }): IamUserProfilesResponse {
    synchronizeSchemas();
    let profiles = [...state.profiles];
    if (filters?.realm_id) {
      profiles = profiles.filter((profile) => profile.realm_id === filters.realm_id);
    }
    if (filters?.user_id) {
      profiles = profiles.filter((profile) => profile.user_id === filters.user_id);
    }
    return {
      generated_at: nowIso(),
      profiles: profiles.map((profile) => {
        const user = LocalIamFoundationStore.getUserById(profile.user_id);
        return {
          ...clone(profile),
          username: user.username,
          email: user.email,
        };
      }),
      count: profiles.length,
    };
  },

  exportState(): IamUserProfilesState {
    synchronizeSchemas();
    return clone(state);
  },

  importState(nextState: Partial<IamUserProfilesState>): void {
    const normalized = normalizeState(nextState);
    state.schemas.splice(0, state.schemas.length, ...clone(normalized.schemas));
    state.profiles.splice(0, state.profiles.length, ...clone(normalized.profiles));
    persistStateSyncOnly();
    synchronizeSchemas();
  },
};
