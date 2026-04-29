import { api } from './iamHttpClient'

export type IamApplicationContractKind =
  | 'principal_context'
  | 'tenant_context'
  | 'identity_access_facts'

export interface IamApplicationContractManifestEntry {
  kind: IamApplicationContractKind
  version: string | null
  delivery_status: 'PLANNED' | 'AVAILABLE' | 'ENABLED' | null
  route_path: string
  auth_mode: 'bearer_or_account_session'
  supported_query_parameters: string[]
  tenant_selection: 'none' | 'optional'
  summary: string
}

export interface IamApplicationContractManifest {
  generated_at: string
  binding_id: string
  binding_target_id: string
  binding_target_name: string
  application_id: string | null
  application_name: string | null
  current_contract_version: string | null
  informative_authorization_plane: 'INFORMATIVE' | 'ENFORCEMENT' | null
  enforcement_plane: 'INFORMATIVE' | 'ENFORCEMENT' | null
  enforcement_owner: string | null
  contracts: IamApplicationContractManifestEntry[]
}

export interface ResolveApplicationContractRequest {
  bindingId: string
  kind: IamApplicationContractKind
  tenantId?: string | null
  contractVersion?: string | null
}

export interface ResolvedApplicationContractRequest {
  bindingId: string
  kind: IamApplicationContractKind
  url: string
  params: Record<string, string>
  manifestEntry: IamApplicationContractManifestEntry
  manifestVersion: string | null
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeParams(entry: IamApplicationContractManifestEntry, request: ResolveApplicationContractRequest) {
  const params: Record<string, string> = {}

  const contractVersion = normalizeOptionalText(request.contractVersion)
  if (contractVersion && entry.supported_query_parameters.includes('contract_version')) {
    params.contract_version = contractVersion
  }

  const tenantId = normalizeOptionalText(request.tenantId)
  if (tenantId && entry.supported_query_parameters.includes('tenant_id')) {
    params.tenant_id = tenantId
  }

  return params
}

export class IamApplicationContractClient {
  static async getManifest(bindingId: string, contractVersion?: string | null): Promise<IamApplicationContractManifest> {
    const normalizedContractVersion = normalizeOptionalText(contractVersion)
    const response = await api.get<IamApplicationContractManifest>(
      `/iam/application-bindings/${encodeURIComponent(bindingId)}/contracts`,
      {
        params: normalizedContractVersion ? { contract_version: normalizedContractVersion } : undefined,
      },
    )
    return response.data
  }

  static async resolveContractRequest(
    request: ResolveApplicationContractRequest,
  ): Promise<ResolvedApplicationContractRequest> {
    const manifest = await this.getManifest(request.bindingId, request.contractVersion)
    const manifestEntry = manifest.contracts.find((entry) => entry.kind === request.kind)
    if (!manifestEntry) {
      throw new Error(`Binding ${request.bindingId} does not expose contract kind ${request.kind}`)
    }

    return {
      bindingId: request.bindingId,
      kind: request.kind,
      url: manifestEntry.route_path,
      params: normalizeParams(manifestEntry, request),
      manifestEntry,
      manifestVersion: manifest.current_contract_version,
    }
  }

  static async fetchContract<T>(
    request: ResolveApplicationContractRequest,
  ): Promise<T> {
    const resolved = await this.resolveContractRequest(request)
    const response = await api.get<T>(resolved.url, {
      params: Object.keys(resolved.params).length > 0 ? resolved.params : undefined,
    })
    return response.data
  }
}
