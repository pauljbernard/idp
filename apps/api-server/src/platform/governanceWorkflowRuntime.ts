import {
  LocalCmsWorkflowStore,
  type CmsGovernanceStageId,
  type CmsWorkflowContextInput,
  type CmsInstructionalWorkflowSummaryResponse,
  type CmsInstructionalWorkflowsResponse,
  type CmsInstructionalWorkflowDetailResponse,
} from './cmsWorkflowRuntime';

export type GovernanceWorkflowStageId = CmsGovernanceStageId;
export type GovernanceWorkflowContextInput = CmsWorkflowContextInput;
export type GovernanceWorkflowSummaryResponse = CmsInstructionalWorkflowSummaryResponse;
export type GovernanceWorkflowsResponse = CmsInstructionalWorkflowsResponse;
export type GovernanceWorkflowDetailResponse = CmsInstructionalWorkflowDetailResponse;

// Neutral alias for the shared governance workflow service so route and control-plane
// code no longer depend on the CMS-specific runtime name directly.
export const LocalGovernanceWorkflowStore = LocalCmsWorkflowStore;
