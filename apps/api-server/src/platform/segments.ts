function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export type SegmentId =
  | 'RECREATIONAL_PERSONAL'
  | 'SOLO_COMMERCIAL'
  | 'ENTERPRISE_OPERATIONS'
  | 'MUNICIPAL_PROGRAM'
  | 'PUBLIC_SAFETY'
  | 'DEVELOPER_PARTNER'
  | 'TRAINING_EDUCATION';

export interface SegmentDefinition {
  id: SegmentId;
  name: string;
  buyer_type: 'individual' | 'team' | 'organization' | 'public_sector' | 'developer' | 'education';
  summary: string;
  supported_account_types: Array<'INDIVIDUAL' | 'ORGANIZATION'>;
  docs_entry_route: string;
  onboarding_route: string;
  primary_use_cases: string[];
}

export interface SegmentCatalogResponse {
  generated_at: string;
  segments: SegmentDefinition[];
  count: number;
}

interface SegmentTenantView {
  account_type: 'INDIVIDUAL' | 'ORGANIZATION';
  organization_kind?: 'GROUP' | 'COMPANY' | 'PUBLIC_SECTOR' | 'RESEARCH';
  subscription_tier: 'BASIC' | 'PRO' | 'ENTERPRISE' | 'GOVERNMENT';
  features: string[];
}

const IAM_OVERVIEW_ROUTE = '/iam';
const IAM_ACCESS_ROUTE = '/iam?tab=access&entity=users&mode=list';
const IAM_PROTOCOLS_ROUTE = '/iam?tab=protocols&entity=clients&mode=list';
const IAM_ORGANIZATIONS_ROUTE = '/iam?tab=organizations&entity=organizations&mode=list';
const IAM_FEDERATION_ROUTE = '/iam?tab=federation&entity=identity-providers&mode=list';

const SEGMENTS: SegmentDefinition[] = [
  {
    id: 'RECREATIONAL_PERSONAL',
    name: 'Individual / Personal',
    buyer_type: 'individual',
    summary: 'Personal identity administration with lightweight access management, onboarding, and account security.',
    supported_account_types: ['INDIVIDUAL'],
    docs_entry_route: IAM_OVERVIEW_ROUTE,
    onboarding_route: IAM_ACCESS_ROUTE,
    primary_use_cases: ['personal identity management', 'self-service onboarding', 'account recovery']
  },
  {
    id: 'SOLO_COMMERCIAL',
    name: 'Independent Professional',
    buyer_type: 'individual',
    summary: 'Single-operator identity posture for secure client access, policy controls, and delegated administration.',
    supported_account_types: ['INDIVIDUAL', 'ORGANIZATION'],
    docs_entry_route: IAM_OVERVIEW_ROUTE,
    onboarding_route: IAM_ACCESS_ROUTE,
    primary_use_cases: ['contractor administration', 'client access control', 'policy-based sign-in']
  },
  {
    id: 'ENTERPRISE_OPERATIONS',
    name: 'Enterprise Operations',
    buyer_type: 'organization',
    summary: 'Multi-team identity governance with integrations, compliance, and scalable administration.',
    supported_account_types: ['ORGANIZATION'],
    docs_entry_route: IAM_OVERVIEW_ROUTE,
    onboarding_route: IAM_ORGANIZATIONS_ROUTE,
    primary_use_cases: ['enterprise identity governance', 'delegated administration', 'multi-team access control']
  },
  {
    id: 'MUNICIPAL_PROGRAM',
    name: 'Public Program',
    buyer_type: 'public_sector',
    summary: 'Public-sector identity governance with advisory, public-notice, and inter-agency coordination requirements.',
    supported_account_types: ['ORGANIZATION'],
    docs_entry_route: IAM_OVERVIEW_ROUTE,
    onboarding_route: IAM_ORGANIZATIONS_ROUTE,
    primary_use_cases: ['public-sector governance', 'public notices', 'cross-agency coordination', 'program administration']
  },
  {
    id: 'PUBLIC_SAFETY',
    name: 'Incident Coordination',
    buyer_type: 'public_sector',
    summary: 'High-trust incident response posture with delegated access, coordination, and operational oversight.',
    supported_account_types: ['ORGANIZATION'],
    docs_entry_route: IAM_OVERVIEW_ROUTE,
    onboarding_route: IAM_ORGANIZATIONS_ROUTE,
    primary_use_cases: ['incident response', 'duty access control', 'operations coordination', 'oversight monitoring']
  },
  {
    id: 'DEVELOPER_PARTNER',
    name: 'Developer / Integrator',
    buyer_type: 'developer',
    summary: 'Application registration, service-account, and connector posture for developers and integration teams.',
    supported_account_types: ['INDIVIDUAL', 'ORGANIZATION'],
    docs_entry_route: IAM_PROTOCOLS_ROUTE,
    onboarding_route: IAM_PROTOCOLS_ROUTE,
    primary_use_cases: ['application registrations', 'embedded sign-in', 'service accounts', 'partner automation']
  },
  {
    id: 'TRAINING_EDUCATION',
    name: 'Enablement / Education',
    buyer_type: 'education',
    summary: 'Structured onboarding, recurrent learning, and readiness administration for identity teams.',
    supported_account_types: ['INDIVIDUAL', 'ORGANIZATION'],
    docs_entry_route: IAM_OVERVIEW_ROUTE,
    onboarding_route: IAM_FEDERATION_ROUTE,
    primary_use_cases: ['administrator onboarding', 'policy training', 'recurrent readiness', 'team enablement']
  }
];

function nowIso(): string {
  return new Date().toISOString();
}

export function listSegmentDefinitions(): SegmentDefinition[] {
  return SEGMENTS.map((segment) => clone(segment));
}

export function getSegmentDefinition(segmentId: SegmentId): SegmentDefinition | null {
  return SEGMENTS.find((segment) => segment.id === segmentId) ?? null;
}

export function getSegmentCatalog(): SegmentCatalogResponse {
  const segments = listSegmentDefinitions();
  return {
    generated_at: nowIso(),
    segments,
    count: segments.length
  };
}

export function inferDefaultSegmentId(tenant: SegmentTenantView): SegmentId {
  if (tenant.organization_kind === 'PUBLIC_SECTOR') {
    if (tenant.features.includes('command_center')) {
      return 'PUBLIC_SAFETY';
    }
    return 'MUNICIPAL_PROGRAM';
  }

  if (tenant.organization_kind === 'RESEARCH') {
    return 'DEVELOPER_PARTNER';
  }

  if (tenant.account_type === 'INDIVIDUAL') {
    return tenant.subscription_tier === 'BASIC' ? 'RECREATIONAL_PERSONAL' : 'SOLO_COMMERCIAL';
  }

  if (tenant.features.includes('developer_portal') && tenant.features.includes('integrations') && tenant.features.length <= 6) {
    return 'DEVELOPER_PARTNER';
  }

  return 'ENTERPRISE_OPERATIONS';
}
