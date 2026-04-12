#!/usr/bin/env bash
set -euo pipefail

SOURCE_ROOT="${1:-}"
TARGET_ROOT="${2:-$(cd "$(dirname "$0")/.." && pwd)}"

if [[ -z "${SOURCE_ROOT}" ]]; then
  echo "Usage: $0 <source-root> [target-root]" >&2
  exit 1
fi

if [[ ! -d "${SOURCE_ROOT}" ]]; then
  echo "Source root does not exist: ${SOURCE_ROOT}" >&2
  exit 1
fi

mkdir -p "${TARGET_ROOT}"

copy_first_matching_file() {
  local source_dir="$1"
  local target_path="$2"
  shift 2

  local source_path=""
  for pattern in "$@"; do
    source_path="$(find "${source_dir}" -maxdepth 1 -type f -name "${pattern}" | sort | head -n 1)"
    if [[ -n "${source_path}" ]]; then
      cp "${source_path}" "${target_path}"
      return 0
    fi
  done

  echo "Unable to resolve source file for ${target_path}" >&2
  exit 1
}

copy_plans() {
  local source="$1"
  local target="$2"
  mkdir -p "${target}/docs/spec/plans"
  for file in \
    Headless_IAM_Education_Readiness_Implementation_Plan.md \
    Headless_IAM_Full_IDP_Implementation_Plan.md \
    Headless_IAM_Standalone_Implementation_Roadmap.md \
    Headless_IAM_Standalone_Product_Assessment.md \
    Headless_IAM_Standalone_Validation_Review_Guide.md \
    CMS_IAM_Integration_Assessment.md; do
    cp "${source}/reference/${file}" "${target}/docs/spec/plans/${file}"
  done
  copy_first_matching_file \
    "${source}/reference" \
    "${target}/docs/spec/plans/Customer_Facing_IAM_Integration_Assessment.md" \
    '*Customer_Facing_IAM_Integration_Assessment.md'
}

copy_contracts() {
  local source="$1"
  local target="$2"
  mkdir -p "${target}/contracts/api"
  find "${source}/contracts/api" -maxdepth 1 -type f \
    | rg '/(iam-|auth-api|security-api|lms-identity-bindings|scheduling-iam-bindings|workforce-iam-bindings)' \
    | while read -r file; do
        cp "${file}" "${target}/contracts/api/$(basename "${file}")"
      done
  rsync -a --exclude node_modules "${source}/contracts/sdk-iam/" "${target}/contracts/sdk-iam/"
}

copy_api_server_slice() {
  local source="$1"
  local target="$2"
  mkdir -p "${target}/apps/api-server/src/platform"
  cp "${source}/apps/api-server/package.json" "${target}/apps/api-server/package.json"
  cp "${source}/apps/api-server/tsconfig.json" "${target}/apps/api-server/tsconfig.json"
  for file in \
    accountProvisioning.ts \
    cmsAccessRuntime.ts \
    controlPlane.ts \
    entitlements.ts \
    featureFlags.ts \
    applicationIdentity.ts \
    iamAdminAuthorization.ts \
    iamAdvancedOAuthRuntime.ts \
    iamAuthFlows.ts \
    iamAuthenticationRuntime.ts \
    iamAuthorizationRuntime.ts \
    iamAuthorizationServices.ts \
    iamBenchmarkRuntime.ts \
    iamDeploymentRuntime.ts \
    iamExperienceRuntime.ts \
    iamExtensionRegistry.ts \
    iamFederationClaimGovernance.ts \
    iamFederationRuntime.ts \
    iamFoundation.ts \
    iamHealthRuntime.ts \
    iamOperationsRuntime.ts \
    iamOrganizations.ts \
    iamProtocolRuntime.ts \
    iamRecoveryRuntime.ts \
    iamReviewRuntime.ts \
    iamSecurityAudit.ts \
    iamStandaloneBootstrap.ts \
    iamUserProfiles.ts \
    iamWebAuthn.ts \
    identity.ts \
    operatingProfile.ts \
    persistence.ts \
    secretStore.ts \
    segments.ts \
    settings.ts \
    solutionPacks.ts \
    tenants.ts; do
    if [[ "${file}" == 'applicationIdentity.ts' ]]; then
      copy_first_matching_file \
        "${source}/apps/api-server/src/platform" \
        "${target}/apps/api-server/src/platform/${file}" \
        '*ApplicationIdentity.ts' \
        'applicationIdentity.ts'
      continue
    fi
    cp "${source}/apps/api-server/src/platform/${file}" "${target}/apps/api-server/src/platform/${file}"
  done
}

copy_ui_slice() {
  local source="$1"
  local target="$2"
  mkdir -p \
    "${target}/apps/enterprise-ui/src/components/iam" \
    "${target}/apps/enterprise-ui/src/components/public" \
    "${target}/apps/enterprise-ui/src/pages" \
    "${target}/apps/enterprise-ui/src/providers" \
    "${target}/apps/enterprise-ui/src/services" \
    "${target}/apps/enterprise-ui/src/utils"

  cp "${source}/apps/enterprise-ui/package.json" "${target}/apps/enterprise-ui/package.json"
  cp "${source}/apps/enterprise-ui/tsconfig.json" "${target}/apps/enterprise-ui/tsconfig.json"
  cp "${source}/apps/enterprise-ui/tsconfig.node.json" "${target}/apps/enterprise-ui/tsconfig.node.json"
  cp "${source}/apps/enterprise-ui/vite.config.ts" "${target}/apps/enterprise-ui/vite.config.ts"
  cp "${source}/apps/enterprise-ui/index.html" "${target}/apps/enterprise-ui/index.html"
  cp "${source}/apps/enterprise-ui/postcss.config.js" "${target}/apps/enterprise-ui/postcss.config.js"
  cp "${source}/apps/enterprise-ui/tailwind.config.js" "${target}/apps/enterprise-ui/tailwind.config.js"
  cp "${source}/apps/enterprise-ui/src/index.css" "${target}/apps/enterprise-ui/src/index.css"

  for file in \
    IamAdminAuthorizationPanel.js IamAdminAuthorizationPanel.tsx \
    IamAdvancedOAuthPanel.js IamAdvancedOAuthPanel.tsx \
    IamAuthFlowsPanel.js IamAuthFlowsPanel.tsx \
    IamAuthorizationServicesPanel.js IamAuthorizationServicesPanel.tsx \
    IamExperiencePanel.js IamExperiencePanel.tsx \
    IamExtensionsPanel.js IamExtensionsPanel.tsx \
    IamFederationPanel.js IamFederationPanel.tsx \
    IamOperationsPanel.js IamOperationsPanel.tsx \
    IamOrganizationsPanel.js IamOrganizationsPanel.tsx \
    IamProtocolRuntimePanel.js IamProtocolRuntimePanel.tsx \
    IamReviewPanel.js IamReviewPanel.tsx \
    IamSecurityOperationsPanel.js IamSecurityOperationsPanel.tsx \
    IamWebAuthnPanel.js IamWebAuthnPanel.tsx; do
    cp "${source}/apps/enterprise-ui/src/components/iam/${file}" "${target}/apps/enterprise-ui/src/components/iam/${file}"
  done

  cp "${source}/apps/enterprise-ui/src/components/public/PublicSiteShell.tsx" "${target}/apps/enterprise-ui/src/components/public/PublicSiteShell.tsx"

  for file in HeadlessIam.js HeadlessIam.tsx IamAccount.js IamAccount.tsx IamLogin.js IamLogin.tsx; do
    cp "${source}/apps/enterprise-ui/src/pages/${file}" "${target}/apps/enterprise-ui/src/pages/${file}"
  done

  for file in AuthProvider.js AuthProvider.tsx PlatformCapabilitiesProvider.tsx TenantProvider.tsx; do
    cp "${source}/apps/enterprise-ui/src/providers/${file}" "${target}/apps/enterprise-ui/src/providers/${file}"
  done

  for file in api.js api.ts missionService.js missionService.ts; do
    cp "${source}/apps/enterprise-ui/src/services/${file}" "${target}/apps/enterprise-ui/src/services/${file}"
  done

  cat > "${target}/apps/enterprise-ui/src/services/workflowService.ts" <<'EOF'
import { MissionService, missionService } from './missionService'
import type {
  Mission,
  MissionAttachment,
  MissionGeometry,
  MissionLocation,
  MissionNote,
  MissionSearchFilters,
  MissionSortOptions,
  MissionTemplate,
} from './missionService'

export type WorkflowLocation = MissionLocation
export type WorkflowGeometry = MissionGeometry
export type WorkflowTemplate = MissionTemplate
export type Workflow = Mission
export type WorkflowNote = MissionNote
export type WorkflowAttachment = MissionAttachment
export type WorkflowSearchFilters = MissionSearchFilters
export type WorkflowSortOptions = MissionSortOptions
export interface WorkflowSearchResponse {
  workflows: Workflow[]
  total: number
  missions?: Workflow[]
}

export class WorkflowService {
  constructor(private readonly missionRuntime: MissionService = missionService) {}

  async createWorkflow(
    workflowData: Omit<Workflow, 'id' | 'created_at' | 'updated_at' | 'notes' | 'attachments'>,
  ): Promise<Workflow> {
    return this.missionRuntime.createMission(workflowData)
  }

  async createWorkflowFromTemplate(
    templateId: string,
    overrides: Partial<Omit<Workflow, 'id' | 'template_id' | 'created_at' | 'updated_at'>>,
  ): Promise<Workflow> {
    return this.missionRuntime.createMissionFromTemplate(templateId, overrides)
  }

  async updateWorkflow(workflowId: string, updates: Partial<Workflow>): Promise<Workflow> {
    return this.missionRuntime.updateMission(workflowId, updates)
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    return this.missionRuntime.deleteMission(workflowId)
  }

  async getWorkflow(workflowId: string): Promise<Workflow | null> {
    return this.missionRuntime.getMission(workflowId)
  }

  async searchWorkflows(
    filters?: WorkflowSearchFilters,
    sort?: WorkflowSortOptions,
    limit?: number,
    offset?: number,
  ): Promise<WorkflowSearchResponse> {
    const result = await this.missionRuntime.searchMissions(filters, sort, limit, offset)
    return {
      workflows: result.missions,
      total: result.total,
      missions: result.missions,
    }
  }

  async getUpcomingWorkflows(limit: number = 10): Promise<Workflow[]> {
    return this.missionRuntime.getUpcomingMissions(limit)
  }

  async addWorkflowNote(
    workflowId: string,
    note: Omit<WorkflowNote, 'id' | 'mission_id' | 'created_at'>,
  ): Promise<WorkflowNote> {
    return this.missionRuntime.addMissionNote(workflowId, note)
  }

  async shareWorkflow(workflowId: string, userIds: string[]): Promise<void> {
    return this.missionRuntime.shareMission(workflowId, userIds)
  }

  async duplicateWorkflow(workflowId: string, overrides?: Partial<Workflow>): Promise<Workflow> {
    return this.missionRuntime.duplicateMission(workflowId, overrides)
  }

  async getWorkflowTemplates(category?: string): Promise<WorkflowTemplate[]> {
    return this.missionRuntime.getTemplates(category)
  }

  async createWorkflowTemplate(
    templateData: Omit<WorkflowTemplate, 'id' | 'created_at' | 'usage_count'>,
  ): Promise<WorkflowTemplate> {
    return this.missionRuntime.createTemplate(templateData)
  }

  subscribe(callback: (workflows: Workflow[]) => void): () => void {
    return this.missionRuntime.subscribe(callback)
  }

  async getWorkflowStatistics(): Promise<Awaited<ReturnType<MissionService['getMissionStatistics']>>> {
    return this.missionRuntime.getMissionStatistics()
  }
}

export const workflowService = new WorkflowService()
EOF

  cat > "${target}/apps/enterprise-ui/src/services/workflowService.js" <<'EOF'
import { missionService } from './missionService';

export class WorkflowService {
    constructor(missionRuntime = missionService) {
        Object.defineProperty(this, "missionRuntime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: missionRuntime
        });
    }
    async createWorkflow(workflowData) {
        return this.missionRuntime.createMission(workflowData);
    }
    async createWorkflowFromTemplate(templateId, overrides) {
        return this.missionRuntime.createMissionFromTemplate(templateId, overrides);
    }
    async updateWorkflow(workflowId, updates) {
        return this.missionRuntime.updateMission(workflowId, updates);
    }
    async deleteWorkflow(workflowId) {
        return this.missionRuntime.deleteMission(workflowId);
    }
    async getWorkflow(workflowId) {
        return this.missionRuntime.getMission(workflowId);
    }
    async searchWorkflows(filters, sort, limit, offset) {
        const result = await this.missionRuntime.searchMissions(filters, sort, limit, offset);
        return {
            workflows: result.missions,
            total: result.total,
            missions: result.missions,
        };
    }
    async getUpcomingWorkflows(limit = 10) {
        return this.missionRuntime.getUpcomingMissions(limit);
    }
    async addWorkflowNote(workflowId, note) {
        return this.missionRuntime.addMissionNote(workflowId, note);
    }
    async shareWorkflow(workflowId, userIds) {
        return this.missionRuntime.shareMission(workflowId, userIds);
    }
    async duplicateWorkflow(workflowId, overrides) {
        return this.missionRuntime.duplicateMission(workflowId, overrides);
    }
    async getWorkflowTemplates(category) {
        return this.missionRuntime.getTemplates(category);
    }
    async createWorkflowTemplate(templateData) {
        return this.missionRuntime.createTemplate(templateData);
    }
    subscribe(callback) {
        return this.missionRuntime.subscribe(callback);
    }
    async getWorkflowStatistics() {
        return this.missionRuntime.getMissionStatistics();
    }
}

export const workflowService = new WorkflowService();
EOF

  copy_first_matching_file \
    "${source}/apps/enterprise-ui/src/utils" \
    "${target}/apps/enterprise-ui/src/utils/iamOidc.js" \
    '*IamOidc.js' \
    'iamOidc.js'
  copy_first_matching_file \
    "${source}/apps/enterprise-ui/src/utils" \
    "${target}/apps/enterprise-ui/src/utils/iamOidc.ts" \
    '*IamOidc.ts' \
    'iamOidc.ts'
  cp "${source}/apps/enterprise-ui/src/utils/iamPasskeys.js" "${target}/apps/enterprise-ui/src/utils/iamPasskeys.js"
  cp "${source}/apps/enterprise-ui/src/utils/iamPasskeys.ts" "${target}/apps/enterprise-ui/src/utils/iamPasskeys.ts"
}

copy_scripts() {
  local source="$1"
  local target="$2"
  mkdir -p "${target}/scripts/compat/lib"
  cp "${source}/scripts/verify-sdk-iam-contract.js" "${target}/scripts/verify-sdk-iam-contract.js"
  copy_first_matching_file "${source}/scripts/lib" "${target}/scripts/compat/lib/idp-auth.sh" '*-auth.sh'
  find "${source}/scripts" -maxdepth 1 -type f -name 'verify-*-iam-*.sh' -print0 | while IFS= read -r -d '' script; do
    target_name="$(basename "${script}" | sed -E 's/^verify-[^-]+-iam-/verify-idp-/')"
    case "${target_name}" in
      verify-idp-mission-detail-route-authorization.sh)
        target_name='verify-idp-workflow-detail-route-authorization.sh'
        ;;
      verify-idp-mission-catalog-route-authorization.sh)
        target_name='verify-idp-workflow-catalog-route-authorization.sh'
        ;;
      verify-idp-fleet-route-authorization.sh)
        target_name='verify-idp-resource-route-authorization.sh'
        ;;
      verify-idp-municipal-route-authorization.sh)
        target_name='verify-idp-public-program-route-authorization.sh'
        ;;
      verify-idp-checklist-route-authorization.sh)
        target_name='verify-idp-runbook-route-authorization.sh'
        ;;
      verify-idp-education-governance.sh)
        target_name='verify-idp-learning-governance.sh'
        ;;
      verify-idp-education-readiness-endpoints.sh)
        target_name='verify-idp-learning-readiness-endpoints.sh'
        ;;
      verify-idp-planning-intelligence-route-authorization.sh)
        target_name='verify-idp-decision-support-route-authorization.sh'
        ;;
      verify-idp-training-readiness-route-authorization.sh)
        target_name='verify-idp-learning-readiness-route-authorization.sh'
        ;;
      verify-idp-integration-route-authorization.sh)
        target_name='verify-idp-connector-governance-route-authorization.sh'
        ;;
    esac
    cp "${script}" "${target}/scripts/compat/${target_name}"
  done
}

extract_spec_sections() {
  local source="$1"
  local target="$2"
  node <<'NODE'
const fs = require('fs');
const path = require('path');

const sourceRoot = process.env.SOURCE_ROOT;
const targetRoot = process.env.TARGET_ROOT;

function load(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function extractSection(markdown, headingText) {
  const lines = markdown.split('\n');
  const headingRegex = /^(#{1,6})\s+(.*)$/;
  let start = -1;
  let level = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(headingRegex);
    if (match && match[2].trim() === headingText) {
      start = i;
      level = match[1].length;
      break;
    }
  }

  if (start < 0) {
    throw new Error(`Heading not found: ${headingText}`);
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    const match = lines[i].match(headingRegex);
    if (match && match[1].length <= level) {
      end = i;
      break;
    }
  }

  while (end > start && lines[end - 1].trim() === '') {
    end -= 1;
  }

  return lines.slice(start, end).join('\n');
}

function writeTarget(relativePath, content) {
  const absolutePath = path.join(targetRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${content.trim()}\n`, 'utf8');
}

const constitution = load(path.join(sourceRoot, 'constitution.md'));
const constitutionSections = [
  'Article I. Purpose',
  'Principle 26. Identity and Access as a Reusable Platform Subsystem',
  'Layer 3. Identity, Access, and Tenant Administration Platform Layer',
  'Identity and Access Platform Standard',
].map((heading) => extractSection(constitution, heading));

writeTarget(
  'docs/spec/constitution.idp.md',
  [
    '# IDP Constitution',
    '',
    `Source: \`${path.join(sourceRoot, 'constitution.md')}\``,
    '',
    constitutionSections.join('\n\n'),
  ].join('\n'),
);

const requirements = load(path.join(sourceRoot, 'requirements.md'));
const requirementSections = [
  '1. Overview',
  '2.18 Headless Identity and Access Platform',
  '3.5 Security, Privacy, Residency, and Procurement Assurance',
  '4.7 Headless Identity and Access Platform Configuration',
].map((heading) => extractSection(requirements, heading));

writeTarget(
  'docs/spec/requirements.idp.md',
  [
    '# IDP Requirements',
    '',
    `Source: \`${path.join(sourceRoot, 'requirements.md')}\``,
    '',
    requirementSections.join('\n\n'),
  ].join('\n'),
);
NODE
}

copy_plans "${SOURCE_ROOT}" "${TARGET_ROOT}"
copy_contracts "${SOURCE_ROOT}" "${TARGET_ROOT}"
copy_api_server_slice "${SOURCE_ROOT}" "${TARGET_ROOT}"
copy_ui_slice "${SOURCE_ROOT}" "${TARGET_ROOT}"
copy_scripts "${SOURCE_ROOT}" "${TARGET_ROOT}"
cp "${SOURCE_ROOT}/.gitignore" "${TARGET_ROOT}/.gitignore"

SOURCE_ROOT="${SOURCE_ROOT}" TARGET_ROOT="${TARGET_ROOT}" extract_spec_sections "${SOURCE_ROOT}" "${TARGET_ROOT}"

find "${TARGET_ROOT}" \( -path "${TARGET_ROOT}/.git" -o -path "${TARGET_ROOT}/.git/*" \) -prune -o -name '.DS_Store' -type f -delete

echo "IDP standalone sync complete."
echo "  source: ${SOURCE_ROOT}"
echo "  target: ${TARGET_ROOT}"
