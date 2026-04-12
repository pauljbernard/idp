import { createHash, randomUUID } from 'crypto';
import { loadOrCreatePersistedState, savePersistedState } from './persistence';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function hashSnapshot(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex');
}

export type CmsGovernanceStageId =
  | 'INSTRUCTIONAL_DESIGN_REVIEW'
  | 'SME_REVIEW'
  | 'ASSESSMENT_REVIEW'
  | 'CERTIFICATION_COMPLIANCE_REVIEW';

export type CmsGovernanceWorkflowStatus =
  | 'NOT_SUBMITTED'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED_FOR_RELEASE'
  | 'RELEASED';

export type CmsGovernanceStageStatus = 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED';
export type CmsReleaseSafetyDecision = 'SAFE' | 'CONTROLLED_RELEASE_REQUIRED' | 'NO_GO';
export type CmsReleaseChangeSeverity = 'UNCHANGED' | 'EDITORIAL' | 'STRUCTURAL';
export type CmsWorkflowCommentType = 'COMMENT' | 'APPROVAL' | 'REJECTION' | 'CHANGE_REQUEST' | 'SYSTEM';
export type CmsWorkflowHistoryAction = 'SUBMIT' | 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT' | 'SYNC';

export interface CmsAcademicValidationFinding {
  id: string;
  severity: 'BLOCKING' | 'ADVISORY';
  category:
    | 'ACADEMIC_TAXONOMY'
    | 'STANDARDS_ALIGNMENT'
    | 'ACCOMMODATION'
    | 'DIFFERENTIATION'
    | 'DEPENDENCY_COVERAGE';
  title: string;
  message: string;
  field_paths: string[];
  remediation: string;
}

export interface CmsAcademicValidationSummary {
  ready_for_release: boolean;
  blocking_count: number;
  advisory_count: number;
  findings: CmsAcademicValidationFinding[];
}

export interface CmsGovernanceStageRecord {
  stage_id: CmsGovernanceStageId;
  label: string;
  status: CmsGovernanceStageStatus;
  decided_at: string | null;
  decided_by_user_id: string | null;
  notes: string | null;
}

export interface CmsWorkflowCommentRecord {
  id: string;
  user_id: string;
  message: string;
  type: CmsWorkflowCommentType;
  created_at: string;
}

export interface CmsWorkflowHistoryRecord {
  id: string;
  action: CmsWorkflowHistoryAction;
  user_id: string | null;
  description: string;
  from_stage_id: CmsGovernanceStageId | null;
  to_stage_id: CmsGovernanceStageId | null;
  created_at: string;
}

export interface CmsGovernedItemRecord {
  content_entry_id: string;
  title: string;
  content_kind: string;
  schema_id: string;
  dependency_entry_ids: string[];
  release_count: number;
  workflow_status: CmsGovernanceWorkflowStatus;
  current_stage_id: CmsGovernanceStageId | null;
  release_safety: CmsReleaseSafetyDecision;
  change_severity: CmsReleaseChangeSeverity;
  changed_entry_ids: string[];
  changed_fields: string[];
  blocking_reason: string | null;
  academic_validation: CmsAcademicValidationSummary;
  latest_workflow_id: string | null;
  approved_for_release_at: string | null;
  updated_at: string;
}

export interface CmsGovernanceWorkflowRecord {
  id: string;
  tenant_id: string;
  content_entry_id: string;
  title: string;
  content_kind: string;
  schema_id: string;
  workflow_status: CmsGovernanceWorkflowStatus;
  current_stage_id: CmsGovernanceStageId | null;
  stages: CmsGovernanceStageRecord[];
  comments: CmsWorkflowCommentRecord[];
  history: CmsWorkflowHistoryRecord[];
  release_safety: CmsReleaseSafetyDecision;
  change_severity: CmsReleaseChangeSeverity;
  changed_entry_ids: string[];
  changed_fields: string[];
  blocking_reason: string | null;
  academic_validation: CmsAcademicValidationSummary;
  dependency_entry_ids: string[];
  release_count: number;
  draft_fingerprint: string;
  published_fingerprint: string;
  submitted_at: string | null;
  submitted_by_user_id: string | null;
  updated_at: string;
  approved_for_release_at: string | null;
  released_at: string | null;
  entry: Record<string, unknown> | null;
  draft: Record<string, unknown> | null;
  published_payload: Record<string, unknown> | null;
}

export interface CmsInstructionalWorkflowSummaryResponse {
  generated_at: string;
  governed_item_count: number;
  course_count: number;
  assessment_count: number;
  workflow_count: number;
  in_review_count: number;
  changes_requested_count: number;
  approved_for_release_count: number;
  released_count: number;
  controlled_release_count: number;
  no_go_count: number;
  instructional_review_ready: boolean;
  learner_safe_release_ready: boolean;
}

export interface CmsInstructionalWorkflowsResponse {
  generated_at: string;
  items: CmsGovernedItemRecord[];
  count: number;
}

export interface CmsInstructionalWorkflowDetailResponse {
  generated_at: string;
  item: CmsGovernedItemRecord;
  workflow: CmsGovernanceWorkflowRecord;
  entry: Record<string, unknown> | null;
  draft: Record<string, unknown> | null;
  published_payload: Record<string, unknown> | null;
  dependency_entries: Array<{
    entry_id: string;
    title: string;
    schema_id: string;
    draft_fingerprint: string;
    published_fingerprint: string;
    changed: boolean;
  }>;
}

export interface CmsReleaseSafetyResponse {
  generated_at: string;
  content_entry_id: string;
  title: string;
  content_kind: string;
  release_safety: CmsReleaseSafetyDecision;
  change_severity: CmsReleaseChangeSeverity;
  changed_entry_ids: string[];
  changed_fields: string[];
  blocking_reason: string | null;
  required_stage_ids: CmsGovernanceStageId[];
  approved_for_current_draft: boolean;
  academic_validation: CmsAcademicValidationSummary;
}

export interface CmsWorkflowContextInput {
  title?: string;
  content_kind?: string;
  schema_id?: string;
  dependency_entry_ids?: string[];
  release_count?: number;
  draft_fingerprint?: string;
  published_fingerprint?: string;
  changed_entry_ids?: string[];
  changed_fields?: string[];
  entry?: Record<string, unknown> | null;
  draft?: Record<string, unknown> | null;
  published_payload?: Record<string, unknown> | null;
}

interface CmsWorkflowStateV1 {
  workflows: CmsGovernanceWorkflowRecord[];
}

const CMS_WORKFLOW_STATE_FILE = 'cms-instructional-workflow-state.json';
const STAGE_DEFINITIONS: Array<{ id: CmsGovernanceStageId; label: string }> = [
  { id: 'INSTRUCTIONAL_DESIGN_REVIEW', label: 'Instructional Design Review' },
  { id: 'SME_REVIEW', label: 'Subject Matter Review' },
  { id: 'ASSESSMENT_REVIEW', label: 'Assessment Review' },
  { id: 'CERTIFICATION_COMPLIANCE_REVIEW', label: 'Certification & Compliance Review' },
];
const EMPTY_VALIDATION: CmsAcademicValidationSummary = {
  ready_for_release: true,
  blocking_count: 0,
  advisory_count: 0,
  findings: [],
};

function normalizeState(input: Partial<CmsWorkflowStateV1>): CmsWorkflowStateV1 {
  return {
    workflows: Array.isArray(input.workflows) ? clone(input.workflows) : [],
  };
}

const state = loadOrCreatePersistedState<CmsWorkflowStateV1>(
  CMS_WORKFLOW_STATE_FILE,
  () => normalizeState({ workflows: [] }),
  1,
);

function persistState(): void {
  savePersistedState(CMS_WORKFLOW_STATE_FILE, state);
}

function createInitialStages(): CmsGovernanceStageRecord[] {
  return STAGE_DEFINITIONS.map((stage) => ({
    stage_id: stage.id,
    label: stage.label,
    status: 'PENDING',
    decided_at: null,
    decided_by_user_id: null,
    notes: null,
  }));
}

function getStageLabel(stageId: CmsGovernanceStageId | null | undefined): string | null {
  return STAGE_DEFINITIONS.find((stage) => stage.id === stageId)?.label ?? null;
}

function buildGovernedItem(workflow: CmsGovernanceWorkflowRecord): CmsGovernedItemRecord {
  return {
    content_entry_id: workflow.content_entry_id,
    title: workflow.title,
    content_kind: workflow.content_kind,
    schema_id: workflow.schema_id,
    dependency_entry_ids: [...workflow.dependency_entry_ids],
    release_count: workflow.release_count,
    workflow_status: workflow.workflow_status,
    current_stage_id: workflow.current_stage_id,
    release_safety: workflow.release_safety,
    change_severity: workflow.change_severity,
    changed_entry_ids: [...workflow.changed_entry_ids],
    changed_fields: [...workflow.changed_fields],
    blocking_reason: workflow.blocking_reason,
    academic_validation: clone(workflow.academic_validation),
    latest_workflow_id: workflow.id,
    approved_for_release_at: workflow.approved_for_release_at,
    updated_at: workflow.updated_at,
  };
}

function buildDependencyEntries(workflow: CmsGovernanceWorkflowRecord): CmsInstructionalWorkflowDetailResponse['dependency_entries'] {
  return workflow.dependency_entry_ids.map((dependencyId) => ({
    entry_id: dependencyId,
    title: dependencyId,
    schema_id: 'dependency',
    draft_fingerprint: hashSnapshot({ dependencyId, draft: workflow.draft_fingerprint }),
    published_fingerprint: hashSnapshot({ dependencyId, published: workflow.published_fingerprint }),
    changed: workflow.changed_entry_ids.includes(dependencyId),
  }));
}

function createWorkflow(tenantId: string, contentEntryId: string, context: CmsWorkflowContextInput): CmsGovernanceWorkflowRecord {
  const timestamp = nowIso();
  const title = context.title?.trim() || `Content ${contentEntryId}`;
  const draftPayload = context.draft ?? context.entry ?? null;
  const draftFingerprint = context.draft_fingerprint || hashSnapshot(draftPayload);
  const publishedFingerprint = context.published_fingerprint || hashSnapshot(context.published_payload ?? null);
  return {
    id: `cms-wf-${randomUUID()}`,
    tenant_id: tenantId,
    content_entry_id: contentEntryId,
    title,
    content_kind: context.content_kind?.trim() || 'CONTENT_ENTRY',
    schema_id: context.schema_id?.trim() || 'content-entry',
    workflow_status: 'NOT_SUBMITTED',
    current_stage_id: null,
    stages: createInitialStages(),
    comments: [],
    history: [],
    release_safety: 'SAFE',
    change_severity: (context.changed_fields?.length ?? 0) > 0 ? 'EDITORIAL' : 'UNCHANGED',
    changed_entry_ids: context.changed_entry_ids?.length ? [...context.changed_entry_ids] : [contentEntryId],
    changed_fields: context.changed_fields?.length ? [...context.changed_fields] : [],
    blocking_reason: null,
    academic_validation: clone(EMPTY_VALIDATION),
    dependency_entry_ids: context.dependency_entry_ids?.length ? [...context.dependency_entry_ids] : [],
    release_count: context.release_count ?? 0,
    draft_fingerprint: draftFingerprint,
    published_fingerprint: publishedFingerprint,
    submitted_at: null,
    submitted_by_user_id: null,
    updated_at: timestamp,
    approved_for_release_at: null,
    released_at: null,
    entry: context.entry ?? null,
    draft: draftPayload,
    published_payload: context.published_payload ?? null,
  };
}

function applyWorkflowContext(workflow: CmsGovernanceWorkflowRecord, context: CmsWorkflowContextInput): void {
  if (typeof context.title === 'string' && context.title.trim()) {
    workflow.title = context.title.trim();
  }
  if (typeof context.content_kind === 'string' && context.content_kind.trim()) {
    workflow.content_kind = context.content_kind.trim();
  }
  if (typeof context.schema_id === 'string' && context.schema_id.trim()) {
    workflow.schema_id = context.schema_id.trim();
  }
  if (Array.isArray(context.dependency_entry_ids)) {
    workflow.dependency_entry_ids = Array.from(new Set(context.dependency_entry_ids.filter(Boolean)));
  }
  if (typeof context.release_count === 'number' && Number.isFinite(context.release_count) && context.release_count >= 0) {
    workflow.release_count = context.release_count;
  }
  if (Array.isArray(context.changed_entry_ids) && context.changed_entry_ids.length > 0) {
    workflow.changed_entry_ids = Array.from(new Set(context.changed_entry_ids.filter(Boolean)));
  }
  if (Array.isArray(context.changed_fields)) {
    workflow.changed_fields = Array.from(new Set(context.changed_fields.filter(Boolean)));
    workflow.change_severity = workflow.changed_fields.length > 0 ? 'EDITORIAL' : workflow.change_severity;
  }
  if (context.entry !== undefined) {
    workflow.entry = context.entry ?? null;
  }
  if (context.draft !== undefined) {
    workflow.draft = context.draft ?? null;
  }
  if (context.published_payload !== undefined) {
    workflow.published_payload = context.published_payload ?? null;
  }

  const draftPayload = context.draft ?? context.entry ?? workflow.draft ?? workflow.entry ?? null;
  workflow.draft_fingerprint = context.draft_fingerprint || hashSnapshot(draftPayload);
  workflow.published_fingerprint = context.published_fingerprint || hashSnapshot(workflow.published_payload ?? null);
  workflow.updated_at = nowIso();
}

function appendComment(
  workflow: CmsGovernanceWorkflowRecord,
  actorUserId: string,
  type: CmsWorkflowCommentType,
  message: string,
): void {
  const normalizedMessage = message.trim();
  if (!normalizedMessage) {
    return;
  }
  workflow.comments.unshift({
    id: `cms-comment-${randomUUID().slice(0, 8)}`,
    user_id: actorUserId,
    message: normalizedMessage,
    type,
    created_at: nowIso(),
  });
}

function appendHistory(
  workflow: CmsGovernanceWorkflowRecord,
  action: CmsWorkflowHistoryAction,
  actorUserId: string | null,
  description: string,
  fromStageId: CmsGovernanceStageId | null = null,
  toStageId: CmsGovernanceStageId | null = null,
): void {
  workflow.history.unshift({
    id: `cms-history-${randomUUID().slice(0, 8)}`,
    action,
    user_id: actorUserId,
    description,
    from_stage_id: fromStageId,
    to_stage_id: toStageId,
    created_at: nowIso(),
  });
}

function findWorkflow(tenantId: string, contentEntryId: string): CmsGovernanceWorkflowRecord | null {
  return state.workflows.find(
    (workflow) => workflow.tenant_id === tenantId && workflow.content_entry_id === contentEntryId,
  ) ?? null;
}

function getWorkflow(tenantId: string, contentEntryId: string): CmsGovernanceWorkflowRecord {
  const workflow = findWorkflow(tenantId, contentEntryId);
  if (!workflow) {
    throw new Error(`No instructional workflow exists for content entry ${contentEntryId}`);
  }
  return workflow;
}

function ensureWorkflow(tenantId: string, contentEntryId: string, context: CmsWorkflowContextInput): CmsGovernanceWorkflowRecord {
  const existing = findWorkflow(tenantId, contentEntryId);
  if (existing) {
    applyWorkflowContext(existing, context);
    return existing;
  }
  const created = createWorkflow(tenantId, contentEntryId, context);
  state.workflows.push(created);
  return created;
}

function getNextStageId(stageId: CmsGovernanceStageId | null): CmsGovernanceStageId | null {
  if (!stageId) {
    return STAGE_DEFINITIONS[0]?.id ?? null;
  }
  const index = STAGE_DEFINITIONS.findIndex((stage) => stage.id === stageId);
  if (index < 0 || index === STAGE_DEFINITIONS.length - 1) {
    return null;
  }
  return STAGE_DEFINITIONS[index + 1]?.id ?? null;
}

function toDetailResponse(workflow: CmsGovernanceWorkflowRecord): CmsInstructionalWorkflowDetailResponse {
  return {
    generated_at: nowIso(),
    item: buildGovernedItem(workflow),
    workflow: clone(workflow),
    entry: clone(workflow.entry),
    draft: clone(workflow.draft),
    published_payload: clone(workflow.published_payload),
    dependency_entries: buildDependencyEntries(workflow),
  };
}

export const LocalCmsWorkflowStore = {
  getInstructionalWorkflowSummary(tenantId: string): CmsInstructionalWorkflowSummaryResponse {
    const items = state.workflows.filter((workflow) => workflow.tenant_id === tenantId);
    const inReviewCount = items.filter((workflow) => workflow.workflow_status === 'IN_REVIEW').length;
    const changesRequestedCount = items.filter((workflow) => workflow.workflow_status === 'CHANGES_REQUESTED').length;
    const approvedCount = items.filter((workflow) => workflow.workflow_status === 'APPROVED_FOR_RELEASE').length;
    const releasedCount = items.filter((workflow) => workflow.workflow_status === 'RELEASED').length;
    const controlledReleaseCount = items.filter((workflow) => workflow.release_safety === 'CONTROLLED_RELEASE_REQUIRED').length;
    const noGoCount = items.filter((workflow) => workflow.release_safety === 'NO_GO').length;

    return {
      generated_at: nowIso(),
      governed_item_count: items.length,
      course_count: items.filter((workflow) => workflow.schema_id === 'course').length,
      assessment_count: items.filter((workflow) => workflow.schema_id === 'assessment').length,
      workflow_count: items.length,
      in_review_count: inReviewCount,
      changes_requested_count: changesRequestedCount,
      approved_for_release_count: approvedCount,
      released_count: releasedCount,
      controlled_release_count: controlledReleaseCount,
      no_go_count: noGoCount,
      instructional_review_ready: inReviewCount === 0,
      learner_safe_release_ready: noGoCount === 0,
    };
  },

  listInstructionalWorkflows(tenantId: string): CmsInstructionalWorkflowsResponse {
    const items = state.workflows
      .filter((workflow) => workflow.tenant_id === tenantId)
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
      .map((workflow) => buildGovernedItem(workflow));

    return {
      generated_at: nowIso(),
      items,
      count: items.length,
    };
  },

  getInstructionalWorkflow(tenantId: string, contentEntryId: string): CmsInstructionalWorkflowDetailResponse | null {
    const workflow = findWorkflow(tenantId, contentEntryId);
    return workflow ? toDetailResponse(workflow) : null;
  },

  getReleaseSafety(tenantId: string, contentEntryId: string): CmsReleaseSafetyResponse {
    const workflow = getWorkflow(tenantId, contentEntryId);
    return {
      generated_at: nowIso(),
      content_entry_id: workflow.content_entry_id,
      title: workflow.title,
      content_kind: workflow.content_kind,
      release_safety: workflow.release_safety,
      change_severity: workflow.change_severity,
      changed_entry_ids: [...workflow.changed_entry_ids],
      changed_fields: [...workflow.changed_fields],
      blocking_reason: workflow.blocking_reason,
      required_stage_ids: workflow.stages
        .filter((stage) => stage.status !== 'APPROVED')
        .map((stage) => stage.stage_id),
      approved_for_current_draft: workflow.workflow_status === 'APPROVED_FOR_RELEASE' || workflow.workflow_status === 'RELEASED',
      academic_validation: clone(workflow.academic_validation),
    };
  },

  submitInstructionalWorkflow(
    actorUserId: string,
    tenantId: string,
    contentEntryId: string,
    context: CmsWorkflowContextInput,
    notes?: string | null,
  ): CmsInstructionalWorkflowDetailResponse {
    const workflow = ensureWorkflow(tenantId, contentEntryId, context);
    const timestamp = nowIso();
    const fromStageId = workflow.current_stage_id;
    workflow.stages = createInitialStages();
    workflow.workflow_status = 'IN_REVIEW';
    workflow.current_stage_id = STAGE_DEFINITIONS[0]?.id ?? null;
    workflow.submitted_at = timestamp;
    workflow.submitted_by_user_id = actorUserId;
    workflow.updated_at = timestamp;
    workflow.approved_for_release_at = null;
    workflow.released_at = null;
    workflow.blocking_reason = null;
    workflow.release_safety = 'SAFE';
    workflow.academic_validation = clone(EMPTY_VALIDATION);
    const stageLabel = getStageLabel(workflow.current_stage_id) ?? 'Instructional Review';
    appendHistory(
      workflow,
      'SUBMIT',
      actorUserId,
      `Submitted content for ${stageLabel}`,
      fromStageId,
      workflow.current_stage_id,
    );
    if (notes?.trim()) {
      appendComment(workflow, actorUserId, 'COMMENT', notes.trim());
    }
    persistState();
    return toDetailResponse(workflow);
  },

  decideInstructionalWorkflowStage(
    actorUserId: string,
    tenantId: string,
    contentEntryId: string,
    stageId: CmsGovernanceStageId,
    decision: 'APPROVE' | 'REQUEST_CHANGES',
    context: CmsWorkflowContextInput,
    notes?: string | null,
  ): CmsInstructionalWorkflowDetailResponse {
    const workflow = getWorkflow(tenantId, contentEntryId);
    applyWorkflowContext(workflow, context);
    const currentStage = workflow.stages.find((stage) => stage.stage_id === stageId);
    if (!currentStage) {
      throw new Error(`Unknown instructional workflow stage ${stageId}`);
    }
    if (workflow.current_stage_id !== stageId) {
      throw new Error(`Stage ${stageId} is not the current workflow stage`);
    }

    const timestamp = nowIso();
    const trimmedNotes = notes?.trim() || null;

    if (decision === 'REQUEST_CHANGES') {
      currentStage.status = 'CHANGES_REQUESTED';
      currentStage.decided_at = timestamp;
      currentStage.decided_by_user_id = actorUserId;
      currentStage.notes = trimmedNotes;
      workflow.workflow_status = 'CHANGES_REQUESTED';
      workflow.blocking_reason = trimmedNotes || `${currentStage.label} requested changes`;
      workflow.release_safety = 'CONTROLLED_RELEASE_REQUIRED';
      workflow.updated_at = timestamp;
      appendHistory(
        workflow,
        'REQUEST_CHANGES',
        actorUserId,
        `${currentStage.label} requested changes`,
        stageId,
        stageId,
      );
      if (trimmedNotes) {
        appendComment(workflow, actorUserId, 'CHANGE_REQUEST', trimmedNotes);
      }
      persistState();
      return toDetailResponse(workflow);
    }

    currentStage.status = 'APPROVED';
    currentStage.decided_at = timestamp;
    currentStage.decided_by_user_id = actorUserId;
    currentStage.notes = trimmedNotes;

    const nextStageId = getNextStageId(stageId);
    workflow.blocking_reason = null;
    workflow.updated_at = timestamp;
    if (nextStageId) {
      workflow.workflow_status = 'IN_REVIEW';
      workflow.current_stage_id = nextStageId;
      appendHistory(
        workflow,
        'APPROVE',
        actorUserId,
        `${currentStage.label} approved and routed to ${getStageLabel(nextStageId)}`,
        stageId,
        nextStageId,
      );
    } else {
      workflow.workflow_status = 'APPROVED_FOR_RELEASE';
      workflow.current_stage_id = null;
      workflow.approved_for_release_at = timestamp;
      workflow.release_safety = 'SAFE';
      appendHistory(
        workflow,
        'APPROVE',
        actorUserId,
        `${currentStage.label} approved the current draft for release`,
        stageId,
        null,
      );
    }

    if (trimmedNotes) {
      appendComment(workflow, actorUserId, 'APPROVAL', trimmedNotes);
    }
    persistState();
    return toDetailResponse(workflow);
  },

  addWorkflowComment(
    actorUserId: string,
    tenantId: string,
    contentEntryId: string,
    message: string,
    context: CmsWorkflowContextInput,
  ): CmsInstructionalWorkflowDetailResponse {
    const workflow = getWorkflow(tenantId, contentEntryId);
    applyWorkflowContext(workflow, context);
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      throw new Error('Workflow comment is required');
    }
    workflow.updated_at = nowIso();
    appendComment(workflow, actorUserId, 'COMMENT', trimmedMessage);
    appendHistory(
      workflow,
      'COMMENT',
      actorUserId,
      'Added workflow comment',
      workflow.current_stage_id,
      workflow.current_stage_id,
    );
    persistState();
    return toDetailResponse(workflow);
  },
};
