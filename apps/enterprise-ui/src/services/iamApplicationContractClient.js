import { api } from './iamHttpClient';
function normalizeOptionalText(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}
function normalizeParams(entry, request) {
    const params = {};
    const contractVersion = normalizeOptionalText(request.contractVersion);
    if (contractVersion && entry.supported_query_parameters.includes('contract_version')) {
        params.contract_version = contractVersion;
    }
    const tenantId = normalizeOptionalText(request.tenantId);
    if (tenantId && entry.supported_query_parameters.includes('tenant_id')) {
        params.tenant_id = tenantId;
    }
    return params;
}
export class IamApplicationContractClient {
    static async getManifest(bindingId, contractVersion) {
        const normalizedContractVersion = normalizeOptionalText(contractVersion);
        const response = await api.get(`/iam/application-bindings/${encodeURIComponent(bindingId)}/contracts`, {
            params: normalizedContractVersion ? { contract_version: normalizedContractVersion } : undefined,
        });
        return response.data;
    }
    static async resolveContractRequest(request) {
        const manifest = await this.getManifest(request.bindingId, request.contractVersion);
        const manifestEntry = manifest.contracts.find((entry) => entry.kind === request.kind);
        if (!manifestEntry) {
            throw new Error(`Binding ${request.bindingId} does not expose contract kind ${request.kind}`);
        }
        return {
            bindingId: request.bindingId,
            kind: request.kind,
            url: manifestEntry.route_path,
            params: normalizeParams(manifestEntry, request),
            manifestEntry,
            manifestVersion: manifest.current_contract_version,
        };
    }
    static async fetchContract(request) {
        const resolved = await this.resolveContractRequest(request);
        const response = await api.get(resolved.url, {
            params: Object.keys(resolved.params).length > 0 ? resolved.params : undefined,
        });
        return response.data;
    }
}
