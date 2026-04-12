import { api, publicApi } from './iamHttpClient';
export const legacyCmsApi = {
    async getCmsSummary() {
        const response = await api.get('/cms/summary');
        return response.data;
    },
    async getIamSummary() {
        const response = await api.get('/iam/summary');
        return response.data;
    },
    async listCmsSpaces(filters) {
        const response = await api.get('/cms/spaces', {
            params: {
                target_tenant_id: filters?.targetTenantId,
                scope_kind: filters?.scopeKind,
            },
        });
        return response.data;
    },
    async createCmsSpace(request) {
        const response = await api.post('/cms/spaces', request);
        return response.data;
    },
    async updateCmsSpace(spaceId, request) {
        const response = await api.put(`/cms/spaces/${spaceId}`, request);
        return response.data;
    },
    async listCmsContentTypes(filters) {
        const response = await api.get('/cms/content-types', {
            params: {
                target_tenant_id: filters?.targetTenantId,
                space_id: filters?.spaceId,
            },
        });
        return response.data;
    },
    async listCmsSchemas(filters) {
        const response = await api.get('/cms/schemas', {
            params: {
                target_tenant_id: filters?.targetTenantId,
                space_id: filters?.spaceId,
                kind: filters?.kind,
            },
        });
        return response.data;
    },
    async createCmsSchema(request) {
        const response = await api.post('/cms/schemas', request);
        return response.data;
    },
    async getCmsSchema(schemaId) {
        const response = await api.get(`/cms/schemas/${schemaId}`);
        return response.data;
    },
    async updateCmsSchema(schemaId, request) {
        const response = await api.put(`/cms/schemas/${schemaId}`, request);
        return response.data;
    },
    async listCmsSchemaVersions(schemaId) {
        const response = await api.get(`/cms/schemas/${schemaId}/versions`);
        return response.data;
    },
    async listCmsTenantBindings() {
        const response = await api.get('/cms/tenant-bindings');
        return response.data;
    },
    async updateCmsTenantBinding(tenantId, request) {
        const response = await api.put(`/cms/tenant-bindings/${tenantId}`, request);
        return response.data;
    },
    async listCmsValidationDomains() {
        const response = await api.get('/cms/validation-domains');
        return response.data;
    },
    async listCmsEntries(filters) {
        const response = await api.get('/cms/entries', {
            params: {
                target_tenant_id: filters?.targetTenantId,
                search: filters?.search,
                schema_id: filters?.schemaId,
                space_id: filters?.spaceId,
                status: filters?.status,
                sort_field: filters?.sortField,
                sort_direction: filters?.sortDirection,
                page: filters?.page,
                page_size: filters?.pageSize,
            },
        });
        return response.data;
    },
    async createCmsEntry(request) {
        const response = await api.post('/cms/entries', request);
        return response.data;
    },
    async getCmsEntry(entryId) {
        const response = await api.get(`/cms/entries/${entryId}`);
        return response.data;
    },
    async updateCmsEntryDraft(entryId, request) {
        const response = await api.put(`/cms/entries/${entryId}/draft`, request);
        return response.data;
    },
    async publishCmsEntry(entryId) {
        const response = await api.post(`/cms/entries/${entryId}/publish`);
        return response.data;
    },
    async archiveCmsEntry(entryId) {
        const response = await api.post(`/cms/entries/${entryId}/archive`);
        return response.data;
    },
    async listCmsEntryRevisions(entryId) {
        const response = await api.get(`/cms/entries/${entryId}/revisions`);
        return response.data;
    },
    async restoreCmsEntryRevision(entryId, revisionId) {
        const response = await api.post(`/cms/entries/${entryId}/revisions/${revisionId}/restore`);
        return response.data;
    },
    async listCmsWorkflows() {
        const response = await api.get('/cms/workflows');
        return response.data;
    },
    async getCmsWorkflow(entryId) {
        const response = await api.get(`/cms/workflows/entries/${entryId}`);
        return response.data;
    },
    async submitCmsWorkflow(entryId, request) {
        const response = await api.post(`/cms/workflows/entries/${entryId}/submit`, request ?? {});
        return response.data;
    },
    async requestCmsWorkflowChanges(entryId, request) {
        const response = await api.post(`/cms/workflows/entries/${entryId}/request-changes`, request ?? {});
        return response.data;
    },
    async approveCmsWorkflow(entryId, request) {
        const response = await api.post(`/cms/workflows/entries/${entryId}/approve`, request ?? {});
        return response.data;
    },
    async listCmsPreviewSessions() {
        const response = await api.get('/cms/preview/sessions');
        return response.data;
    },
    async createCmsPreviewSession(request) {
        const response = await api.post('/cms/preview/sessions', request);
        return response.data;
    },
    async getCmsPreviewSession(sessionId) {
        const response = await api.get(`/cms/preview/sessions/${sessionId}`);
        return response.data;
    },
    async listCmsReleases() {
        const response = await api.get('/cms/releases');
        return response.data;
    },
    async createCmsRelease(request) {
        const response = await api.post('/cms/releases', request);
        return response.data;
    },
    async getCmsRelease(releaseId) {
        const response = await api.get(`/cms/releases/${releaseId}`);
        return response.data;
    },
    async publishCmsRelease(releaseId) {
        const response = await api.post(`/cms/releases/${releaseId}/publish`);
        return response.data;
    },
    async rollbackCmsRelease(releaseId) {
        const response = await api.post(`/cms/releases/${releaseId}/rollback`);
        return response.data;
    },
    async listCmsMediaFolders() {
        const response = await api.get('/cms/media/folders');
        return response.data;
    },
    async createCmsMediaFolder(request) {
        const response = await api.post('/cms/media/folders', request);
        return response.data;
    },
    async listCmsMediaAssets(filters) {
        const response = await api.get('/cms/media', {
            params: {
                folder_id: filters?.folderId,
                search: filters?.search,
                asset_kind: filters?.assetKind,
                status: filters?.status,
                page: filters?.page,
                page_size: filters?.pageSize,
            },
        });
        return response.data;
    },
    async createCmsMediaAsset(request) {
        const response = await api.post('/cms/media', request);
        return response.data;
    },
    async getCmsMediaAsset(assetId) {
        const response = await api.get(`/cms/media/${assetId}`);
        return response.data;
    },
    async updateCmsMediaAsset(assetId, request) {
        const response = await api.put(`/cms/media/${assetId}`, request);
        return response.data;
    },
    async listCmsMediaRenditions(assetId) {
        const response = await api.get(`/cms/media/${assetId}/renditions`);
        return response.data;
    },
    async getCmsMediaRendition(assetId, renditionName) {
        const response = await api.get(`/cms/media/${assetId}/renditions/${renditionName}`);
        return response.data;
    },
    async listCmsDeliveryContent(filters) {
        const response = await api.get('/cms/delivery/content', {
            params: {
                target_tenant_id: filters?.targetTenantId,
                space_id: filters?.spaceId,
                schema_id: filters?.schemaId,
                search: filters?.search,
                locale: filters?.locale,
                audience: filters?.audience,
                accommodation_profile_id: filters?.accommodationProfileId,
                alternate_format_tag: filters?.alternateFormatTag,
                differentiation_profile_id: filters?.differentiationProfileId,
                sort_field: filters?.sortField,
                sort_direction: filters?.sortDirection,
                page: filters?.page,
                page_size: filters?.pageSize,
            },
        });
        return response.data;
    },
    async getCmsDeliveryContent(entryId, options) {
        const response = await api.get(`/cms/delivery/content/${entryId}`, {
            params: {
                locale: options?.locale,
                audience: options?.audience,
                accommodation_profile_id: options?.accommodationProfileId,
                alternate_format_tag: options?.alternateFormatTag,
                differentiation_profile_id: options?.differentiationProfileId,
            },
        });
        return response.data;
    },
    async resolveCmsDeliveryPath(path, options) {
        const response = await api.get('/cms/delivery/resolve', {
            params: {
                path,
                target_tenant_id: options?.targetTenantId,
                space_id: options?.spaceId,
                locale: options?.locale,
                audience: options?.audience,
                accommodation_profile_id: options?.accommodationProfileId,
                alternate_format_tag: options?.alternateFormatTag,
                differentiation_profile_id: options?.differentiationProfileId,
            },
        });
        return response.data;
    },
    async getCmsPreviewDelivery(previewToken, options = {}) {
        const response = await api.get(`/cms/delivery/preview/${previewToken}`, {
            params: {
                accommodation_profile_id: options.accommodationProfileId,
                alternate_format_tag: options.alternateFormatTag,
                differentiation_profile_id: options.differentiationProfileId,
            },
        });
        return response.data;
    },
    async queryCms(filters) {
        const response = await api.get('/cms/query', {
            params: {
                query: filters?.query,
                kind: filters?.kind,
                target_tenant_id: filters?.targetTenantId,
                space_id: filters?.spaceId,
                schema_id: filters?.schemaId,
                folder_id: filters?.folderId,
                locale: filters?.locale,
                audience: filters?.audience,
                page: filters?.page,
                page_size: filters?.pageSize,
            },
        });
        return response.data;
    },
    async listCmsLocalizationEntries(filters) {
        const response = await api.get('/cms/localization/entries', {
            params: {
                target_tenant_id: filters?.targetTenantId,
                space_id: filters?.spaceId,
                schema_id: filters?.schemaId,
                search: filters?.search,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async getCmsLocalizationEntry(entryId) {
        const response = await api.get(`/cms/localization/entries/${entryId}`);
        return response.data;
    },
    async upsertCmsLocaleBranch(entryId, locale, request) {
        const response = await api.put(`/cms/localization/entries/${entryId}/locales/${locale}`, request);
        return response.data;
    },
    async getCmsGraphqlSchema() {
        const response = await publicApi.get('/cms/graphql/schema');
        return response.data;
    },
    async executeCmsGraphql(request) {
        const response = await publicApi.post('/cms/graphql', request);
        return response.data;
    },
    async listCmsBlueprints() {
        const response = await api.get('/cms/blueprints');
        return response.data;
    },
    async createCmsBlueprint(request) {
        const response = await api.post('/cms/blueprints', request);
        return response.data;
    },
    async listCmsBlueprintInstallations() {
        const response = await api.get('/cms/blueprints/installations');
        return response.data;
    },
    async installCmsBlueprint(blueprintId, request) {
        const response = await api.post(`/cms/blueprints/${blueprintId}/install`, request);
        return response.data;
    },
    async getCmsAccessSummary() {
        const response = await api.get('/governance/access/summary');
        return response.data;
    },
    async listCmsRoles() {
        const response = await api.get('/governance/access/roles');
        return response.data;
    },
    async createCmsRole(request) {
        const response = await api.post('/governance/access/roles', request);
        return response.data;
    },
    async updateCmsRole(roleId, request) {
        const response = await api.put(`/governance/access/roles/${roleId}`, request);
        return response.data;
    },
    async listCmsRoleAssignments() {
        const response = await api.get('/governance/access/assignments');
        return response.data;
    },
    async createCmsRoleAssignment(request) {
        const response = await api.post('/governance/access/assignments', request);
        return response.data;
    },
    async updateCmsRoleAssignment(assignmentId, request) {
        const response = await api.put(`/governance/access/assignments/${assignmentId}`, request);
        return response.data;
    },
    async listCmsApiTokens() {
        const response = await api.get('/governance/access/api-tokens');
        return response.data;
    },
    async createCmsApiToken(request) {
        const response = await api.post('/governance/access/api-tokens', request);
        return response.data;
    },
    async updateCmsApiToken(tokenId, request) {
        const response = await api.put(`/governance/access/api-tokens/${tokenId}`, request);
        return response.data;
    },
    async getCmsVisualAuthoringSummary() {
        const response = await api.get('/cms/visual-authoring/summary');
        return response.data;
    },
    async listCmsExperienceBindings() {
        const response = await api.get('/cms/experience-bindings');
        return response.data;
    },
    async listCmsVisualAuthoringSessions() {
        const response = await api.get('/cms/visual-authoring/sessions');
        return response.data;
    },
    async createCmsVisualAuthoringSession(request) {
        const response = await api.post('/cms/visual-authoring/sessions', request);
        return response.data;
    },
    async getCmsVisualAuthoringSession(sessionId) {
        const response = await api.get(`/cms/visual-authoring/sessions/${sessionId}`);
        return response.data;
    },
    async updateCmsVisualBinding(sessionId, bindingId, request) {
        const response = await api.put(`/cms/visual-authoring/sessions/${sessionId}/bindings/${bindingId}`, request);
        return response.data;
    },
    async getCmsOperationsSummary() {
        const response = await api.get('/cms/operations/summary');
        return response.data;
    },
    async getCmsOperationsDiagnostics() {
        const response = await api.get('/cms/operations/diagnostics');
        return response.data;
    },
    async getCmsOperationsHealth() {
        const response = await api.get('/cms/operations/health');
        return response.data;
    },
    async getCmsRunbooks() {
        const response = await api.get('/cms/operations/runbooks');
        return response.data;
    },
    async getCmsPersonalizationSummary() {
        const response = await api.get('/cms/personalization/summary');
        return response.data;
    },
    async listCmsAudiencePersonas() {
        const response = await api.get('/cms/personalization/personas');
        return response.data;
    },
    async listCmsAudienceBranches(entryId) {
        const response = await api.get('/cms/personalization/branches', { params: entryId ? { entry_id: entryId } : undefined });
        return response.data;
    },
    async createCmsAudienceBranch(request) {
        const response = await api.post('/cms/personalization/branches', request);
        return response.data;
    },
    async updateCmsAudienceBranch(branchId, request) {
        const response = await api.put(`/cms/personalization/branches/${branchId}`, request);
        return response.data;
    },
    async getCmsAuthorAssistance(request) {
        const response = await api.post('/cms/author-assistance', request);
        return response.data;
    },
    async getCmsExtensionMarketplaceSummary() {
        const response = await api.get('/cms/extensions/summary');
        return response.data;
    },
    async listCmsExtensionPackages() {
        const response = await api.get('/cms/extensions/packages');
        return response.data;
    },
    async createCmsExtensionPackage(request) {
        const response = await api.post('/cms/extensions/packages', request);
        return response.data;
    },
    async updateCmsExtensionPackage(packageId, request) {
        const response = await api.put(`/cms/extensions/packages/${packageId}`, request);
        return response.data;
    },
    async listCmsExtensionInstallations() {
        const response = await api.get('/cms/extensions/installations');
        return response.data;
    },
    async installCmsExtensionPackage(packageId, request) {
        const response = await api.post(`/cms/extensions/packages/${packageId}/install`, request);
        return response.data;
    },
    async getCmsAcademicSummary() {
        const response = await api.get('/cms/academics/summary');
        return response.data;
    },
    async listCmsAcademicFrameworks() {
        const response = await api.get('/cms/academics/standards-frameworks');
        return response.data;
    },
    async listCmsAcademicStandards(frameworkId) {
        const response = await api.get('/cms/academics/standards', {
            params: frameworkId ? { framework_id: frameworkId } : undefined,
        });
        return response.data;
    },
    async listCmsAcademicTaxonomyAxes() {
        const response = await api.get('/cms/academics/taxonomy-axes');
        return response.data;
    },
    async listCmsAccommodationProfiles() {
        const response = await api.get('/cms/academics/accommodation-profiles');
        return response.data;
    },
    async listCmsDifferentiationProfiles() {
        const response = await api.get('/cms/academics/differentiation-profiles');
        return response.data;
    },
    async getCmsCurriculumSummary() {
        const response = await api.get('/cms/curriculum/summary');
        return response.data;
    },
    async listCmsCurriculumCourses(filters = {}) {
        const response = await api.get('/cms/curriculum/courses', {
            params: {
                ...(filters.subjectTag ? { subject_tag: filters.subjectTag } : {}),
                ...(filters.gradeBand ? { grade_band: filters.gradeBand } : {}),
                ...(filters.programTag ? { program_tag: filters.programTag } : {}),
                ...(filters.standardId ? { standard_id: filters.standardId } : {}),
                ...(filters.accommodationProfileId ? { accommodation_profile_id: filters.accommodationProfileId } : {}),
                ...(filters.differentiationProfileId ? { differentiation_profile_id: filters.differentiationProfileId } : {}),
            },
        });
        return response.data;
    },
    async getCmsCurriculumCourse(courseEntryId) {
        const response = await api.get(`/cms/curriculum/courses/${courseEntryId}`);
        return response.data;
    },
    async updateCmsCurriculumCourse(courseEntryId, request) {
        const response = await api.put(`/cms/curriculum/courses/${courseEntryId}`, request);
        return response.data;
    },
    async listCmsCurriculumReleaseBundles(courseEntryId) {
        const response = await api.get(`/cms/curriculum/courses/${courseEntryId}/release-bundles`);
        return response.data;
    },
    async getCmsCurriculumReleaseBundleExportManifest(courseEntryId, bundleId, options = {}) {
        const response = await api.get(`/cms/curriculum/courses/${courseEntryId}/release-bundles/${bundleId}/export-manifest`, {
            params: {
                accommodation_profile_id: options.accommodationProfileId,
                alternate_format_tag: options.alternateFormatTag,
                differentiation_profile_id: options.differentiationProfileId,
            },
        });
        return response.data;
    },
    async createCmsCurriculumReleaseBundle(courseEntryId, request) {
        const response = await api.post(`/cms/curriculum/courses/${courseEntryId}/release-bundles`, request);
        return response.data;
    },
    async getCmsAssessmentSummary() {
        const response = await api.get('/cms/assessments/summary');
        return response.data;
    },
    async listCmsAssessments(filters = {}) {
        const response = await api.get('/cms/assessments', {
            params: {
                ...(filters.subjectTag ? { subject_tag: filters.subjectTag } : {}),
                ...(filters.gradeBand ? { grade_band: filters.gradeBand } : {}),
                ...(filters.programTag ? { program_tag: filters.programTag } : {}),
                ...(filters.standardId ? { standard_id: filters.standardId } : {}),
                ...(filters.accommodationProfileId ? { accommodation_profile_id: filters.accommodationProfileId } : {}),
                ...(filters.differentiationProfileId ? { differentiation_profile_id: filters.differentiationProfileId } : {}),
            },
        });
        return response.data;
    },
    async getCmsAssessment(assessmentEntryId) {
        const response = await api.get(`/cms/assessments/${assessmentEntryId}`);
        return response.data;
    },
    async updateCmsAssessment(assessmentEntryId, request) {
        const response = await api.put(`/cms/assessments/${assessmentEntryId}`, request);
        return response.data;
    },
    async listCmsQuestionPools(filters = {}) {
        const response = await api.get('/cms/assessments/question-pools', {
            params: {
                ...(filters.subjectTag ? { subject_tag: filters.subjectTag } : {}),
                ...(filters.gradeBand ? { grade_band: filters.gradeBand } : {}),
                ...(filters.programTag ? { program_tag: filters.programTag } : {}),
                ...(filters.standardId ? { standard_id: filters.standardId } : {}),
                ...(filters.accommodationProfileId ? { accommodation_profile_id: filters.accommodationProfileId } : {}),
                ...(filters.differentiationProfileId ? { differentiation_profile_id: filters.differentiationProfileId } : {}),
            },
        });
        return response.data;
    },
    async getCmsQuestionPool(questionPoolEntryId) {
        const response = await api.get(`/cms/assessments/question-pools/${questionPoolEntryId}`);
        return response.data;
    },
    async updateCmsQuestionPool(questionPoolEntryId, request) {
        const response = await api.put(`/cms/assessments/question-pools/${questionPoolEntryId}`, request);
        return response.data;
    },
    async getCmsAssessmentFormPreview(assessmentEntryId, variantId) {
        const response = await api.get(`/cms/assessments/${assessmentEntryId}/forms/${variantId}/preview`);
        return response.data;
    },
    async listCmsAssessmentPackages(assessmentEntryId) {
        const response = await api.get(`/cms/assessments/${assessmentEntryId}/packages`);
        return response.data;
    },
    async getCmsAssessmentPackageExportManifest(assessmentEntryId, packageId, options = {}) {
        const response = await api.get(`/cms/assessments/${assessmentEntryId}/packages/${packageId}/export-manifest`, {
            params: {
                accommodation_profile_id: options.accommodationProfileId,
                alternate_format_tag: options.alternateFormatTag,
                differentiation_profile_id: options.differentiationProfileId,
            },
        });
        return response.data;
    },
    async createCmsAssessmentPackage(assessmentEntryId, request) {
        const response = await api.post(`/cms/assessments/${assessmentEntryId}/packages`, request);
        return response.data;
    },
    async getCmsInstructionalWorkflowSummary() {
        const response = await api.get('/governance/workflows/summary');
        return response.data;
    },
    async listCmsInstructionalWorkflows() {
        const response = await api.get('/governance/workflows');
        return response.data;
    },
    async getCmsInstructionalWorkflow(contentEntryId) {
        const response = await api.get(`/governance/workflows/${contentEntryId}`);
        return response.data;
    },
    async getCmsReleaseSafety(contentEntryId) {
        const response = await api.get(`/governance/workflows/${contentEntryId}/release-safety`);
        return response.data;
    },
    async submitCmsInstructionalWorkflow(contentEntryId, request = {}) {
        const response = await api.post(`/governance/workflows/${contentEntryId}/submit`, request);
        return response.data;
    },
    async decideCmsInstructionalWorkflowStage(contentEntryId, stageId, request) {
        const response = await api.post(`/governance/workflows/${contentEntryId}/stages/${stageId}/decision`, request);
        return response.data;
    },
    async listCmsEnvironments() {
        const response = await api.get('/cms/operations/environments');
        return response.data;
    },
    async listCmsWebhooks() {
        const response = await api.get('/cms/operations/webhooks');
        return response.data;
    },
    async createCmsWebhook(request) {
        const response = await api.post('/cms/operations/webhooks', request);
        return response.data;
    },
    async updateCmsWebhook(webhookId, request) {
        const response = await api.put(`/cms/operations/webhooks/${webhookId}`, request);
        return response.data;
    },
    async listCmsPromotions() {
        const response = await api.get('/cms/operations/promotions');
        return response.data;
    },
    async createCmsPromotion(request) {
        const response = await api.post('/cms/operations/promotions', request);
        return response.data;
    },
    async listCmsBackups() {
        const response = await api.get('/cms/operations/backups');
        return response.data;
    },
    async createCmsBackup(request) {
        const response = await api.post('/cms/operations/backups', request ?? {});
        return response.data;
    },
    async listCmsRestores() {
        const response = await api.get('/cms/operations/restores');
        return response.data;
    },
    async createCmsRestore(request) {
        const response = await api.post('/cms/operations/restores', request);
        return response.data;
    },
    async listCmsExportArtifacts() {
        const response = await api.get('/cms/operations/exports');
        return response.data;
    },
    async createCmsExportArtifact(request) {
        const response = await api.post('/cms/operations/exports', request ?? {});
        return response.data;
    },
    async listCmsImportValidations() {
        const response = await api.get('/cms/operations/import-validations');
        return response.data;
    },
    async createCmsImportValidation(request) {
        const response = await api.post('/cms/operations/import-validations', request);
        return response.data;
    },
    async listCmsBenchmarkRuns() {
        const response = await api.get('/cms/operations/benchmarks');
        return response.data;
    },
    async runCmsBenchmarkSuite() {
        const response = await api.post('/cms/operations/benchmarks', {});
        return response.data;
    },
    async listCmsResilienceRuns() {
        const response = await api.get('/cms/operations/resilience');
        return response.data;
    },
    async runCmsResilienceSuite() {
        const response = await api.post('/cms/operations/resilience', {});
        return response.data;
    },
    async getCmsSecurityReview() {
        const response = await api.get('/cms/operations/security-review');
        return response.data;
    },
    async recordCmsSecurityReview(request) {
        const response = await api.post('/cms/operations/security-review', request ?? {});
        return response.data;
    },
    async getCmsReadinessReview() {
        const response = await api.get('/cms/operations/readiness-review');
        return response.data;
    },
    async recordCmsReadinessReview(request) {
        const response = await api.post('/cms/operations/readiness-review', request ?? {});
        return response.data;
    },
    async getCmsReviewSummary() {
        const response = await api.get('/cms/review/summary');
        return response.data;
    },
    async getCmsStandardsMatrix() {
        const response = await api.get('/cms/review/standards-matrix');
        return response.data;
    },
    async getCmsInteroperabilityReview() {
        const response = await api.get('/cms/review/interoperability');
        return response.data;
    },
    async getCmsDifferentiationReview() {
        const response = await api.get('/cms/review/differentiation');
        return response.data;
    },
    async getCmsFormalReviews() {
        const response = await api.get('/cms/review/formal');
        return response.data;
    },
    async recordCmsFormalReview(request) {
        const response = await api.post('/cms/review/formal', request ?? {});
        return response.data;
    },
};
