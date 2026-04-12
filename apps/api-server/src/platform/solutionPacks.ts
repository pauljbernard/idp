import type { SegmentId } from './segments';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export type SolutionPackId =
  | 'RECREATIONAL_STARTER'
  | 'SOLO_COMMERCIAL'
  | 'INSPECTION'
  | 'SURVEY_MAPPING'
  | 'MUNICIPAL_PROGRAM'
  | 'PUBLIC_SAFETY'
  | 'DEVELOPER_PLATFORM'
  | 'TRAINING_ACADEMY';

export interface SolutionPackDefinition {
  id: SolutionPackId;
  name: string;
  category: 'core' | 'vertical' | 'public_sector' | 'developer' | 'training';
  target_segments: SegmentId[];
  summary: string;
  default_docs_route: string;
  onboarding_route: string;
  template_bundle_ids: string[];
  deliverable_profiles: string[];
  training_focus: string[];
  required_features: string[];
}

export interface SolutionPackCatalogResponse {
  generated_at: string;
  packs: SolutionPackDefinition[];
  count: number;
}

const IAM_OVERVIEW_ROUTE = '/iam';
const IAM_ACCESS_ROUTE = '/iam?tab=access&entity=users&mode=list';
const IAM_PROTOCOLS_ROUTE = '/iam?tab=protocols&entity=clients&mode=list';
const IAM_ORGANIZATIONS_ROUTE = '/iam?tab=organizations&entity=organizations&mode=list';
const IAM_FEDERATION_ROUTE = '/iam?tab=federation&entity=identity-providers&mode=list';

const SOLUTION_PACKS: SolutionPackDefinition[] = [
  {
    id: 'RECREATIONAL_STARTER',
    name: 'Individual Starter',
    category: 'core',
    target_segments: ['RECREATIONAL_PERSONAL'],
    summary: 'Starter posture for self-service identity setup, security basics, and account readiness.',
    default_docs_route: IAM_OVERVIEW_ROUTE,
    onboarding_route: IAM_ACCESS_ROUTE,
    template_bundle_ids: ['starter-onboarding', 'starter-access'],
    deliverable_profiles: ['account-readiness-checklist'],
    training_focus: ['onboarding-foundations', 'self-service-security'],
    required_features: ['workflow_planning', 'checklists', 'managed_resources']
  },
  {
    id: 'SOLO_COMMERCIAL',
    name: 'Individual Professional',
    category: 'core',
    target_segments: ['SOLO_COMMERCIAL', 'ENTERPRISE_OPERATIONS'],
    summary: 'Professional IAM pack for policy controls, delegated administration, and client-facing access delivery.',
    default_docs_route: IAM_OVERVIEW_ROUTE,
    onboarding_route: IAM_ACCESS_ROUTE,
    template_bundle_ids: ['professional-access', 'professional-governance'],
    deliverable_profiles: ['access-review', 'policy-package'],
    training_focus: ['identity-foundations', 'professional-governance'],
    required_features: ['workflow_planning', 'checklists', 'managed_resources', 'compliance']
  },
  {
    id: 'INSPECTION',
    name: 'Governance and Review',
    category: 'vertical',
    target_segments: ['SOLO_COMMERCIAL', 'ENTERPRISE_OPERATIONS'],
    summary: 'Governance review workflows, findings discipline, and downstream audit deliverables.',
    default_docs_route: IAM_OVERVIEW_ROUTE,
    onboarding_route: IAM_ORGANIZATIONS_ROUTE,
    template_bundle_ids: ['governance-reviews', 'governance-checklists'],
    deliverable_profiles: ['review-report', 'finding-register'],
    training_focus: ['governance-readiness'],
    required_features: ['workflow_planning', 'checklists', 'managed_resources', 'analytics', 'compliance']
  },
  {
    id: 'SURVEY_MAPPING',
    name: 'Directory and Exchange',
    category: 'vertical',
    target_segments: ['SOLO_COMMERCIAL', 'ENTERPRISE_OPERATIONS'],
    summary: 'Directory exchange, structured onboarding, and downstream identity data synchronization workflows.',
    default_docs_route: IAM_OVERVIEW_ROUTE,
    onboarding_route: IAM_FEDERATION_ROUTE,
    template_bundle_ids: ['directory-sync', 'identity-exchange'],
    deliverable_profiles: ['directory-export', 'sync-package'],
    training_focus: ['federation-readiness'],
    required_features: ['workflow_planning', 'analytics', 'integrations']
  },
  {
    id: 'MUNICIPAL_PROGRAM',
    name: 'Public Program',
    category: 'public_sector',
    target_segments: ['MUNICIPAL_PROGRAM'],
    summary: 'Public-sector governance, advisory, and program-administration identity workflows.',
    default_docs_route: IAM_OVERVIEW_ROUTE,
    onboarding_route: IAM_ORGANIZATIONS_ROUTE,
    template_bundle_ids: ['public-program-advisories', 'public-program-governance'],
    deliverable_profiles: ['public-notice', 'program-report'],
    training_focus: ['public-program-readiness'],
    required_features: ['public_programs', 'integrations', 'compliance']
  },
  {
    id: 'PUBLIC_SAFETY',
    name: 'Incident Coordination',
    category: 'public_sector',
    target_segments: ['PUBLIC_SAFETY'],
    summary: 'Incident-linked coordination, response governance, and operational oversight posture.',
    default_docs_route: IAM_OVERVIEW_ROUTE,
    onboarding_route: IAM_ORGANIZATIONS_ROUTE,
    template_bundle_ids: ['incident-coordination', 'operations-governance'],
    deliverable_profiles: ['after-action-report', 'incident-governance-bundle'],
    training_focus: ['incident-response-readiness'],
    required_features: ['command_center', 'public_programs', 'compliance']
  },
  {
    id: 'DEVELOPER_PLATFORM',
    name: 'Developer Platform',
    category: 'developer',
    target_segments: ['DEVELOPER_PARTNER', 'ENTERPRISE_OPERATIONS'],
    summary: 'Partner and developer posture with API products, sandboxing, and connector governance.',
    default_docs_route: IAM_PROTOCOLS_ROUTE,
    onboarding_route: IAM_PROTOCOLS_ROUTE,
    template_bundle_ids: ['developer-onboarding'],
    deliverable_profiles: ['openapi-contract', 'integration-guide'],
    training_focus: ['developer-onboarding'],
    required_features: ['developer_portal', 'integrations', 'partners']
  },
  {
    id: 'TRAINING_ACADEMY',
    name: 'Training Academy',
    category: 'training',
    target_segments: ['TRAINING_EDUCATION', 'SOLO_COMMERCIAL', 'ENTERPRISE_OPERATIONS', 'MUNICIPAL_PROGRAM', 'PUBLIC_SAFETY'],
    summary: 'Foundational onboarding, recurrent training, specialization, and readiness administration posture.',
    default_docs_route: IAM_OVERVIEW_ROUTE,
    onboarding_route: IAM_FEDERATION_ROUTE,
    template_bundle_ids: ['training-pathways', 'readiness-playbooks'],
    deliverable_profiles: ['transcript', 'readiness-artifact'],
    training_focus: ['foundations', 'policy-readiness', 'recurrent', 'specialization'],
    required_features: ['compliance']
  }
];

function nowIso(): string {
  return new Date().toISOString();
}

const defaultPackIdsBySegment: Record<SegmentId, SolutionPackId[]> = {
  RECREATIONAL_PERSONAL: ['RECREATIONAL_STARTER'],
  SOLO_COMMERCIAL: ['SOLO_COMMERCIAL'],
  ENTERPRISE_OPERATIONS: ['INSPECTION'],
  MUNICIPAL_PROGRAM: ['MUNICIPAL_PROGRAM'],
  PUBLIC_SAFETY: ['PUBLIC_SAFETY'],
  DEVELOPER_PARTNER: ['DEVELOPER_PLATFORM'],
  TRAINING_EDUCATION: ['TRAINING_ACADEMY']
};

export function listSolutionPackDefinitions(): SolutionPackDefinition[] {
  return SOLUTION_PACKS.map((pack) => clone(pack));
}

export function getSolutionPackDefinition(packId: SolutionPackId): SolutionPackDefinition | null {
  return SOLUTION_PACKS.find((pack) => pack.id === packId) ?? null;
}

export function listSolutionPacksForSegment(segmentId: SegmentId): SolutionPackDefinition[] {
  return SOLUTION_PACKS.filter((pack) => pack.target_segments.includes(segmentId)).map((pack) => clone(pack));
}

export function inferDefaultPackIdsForSegment(segmentId: SegmentId): SolutionPackId[] {
  return [...(defaultPackIdsBySegment[segmentId] ?? [])];
}

export function getSolutionPackCatalog(): SolutionPackCatalogResponse {
  const packs = listSolutionPackDefinitions();
  return {
    generated_at: nowIso(),
    packs,
    count: packs.length
  };
}
