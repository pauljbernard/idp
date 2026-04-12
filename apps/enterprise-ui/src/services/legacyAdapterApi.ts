import { api } from './iamHttpClient'
import type {
  AdapterActionResult,
  AdapterHealthResponse,
  AdapterRegistryEntry,
  AdapterRegistryResponse,
  UpdateAdapterBindingRequest,
} from './legacyAdapterTypes'

export const legacyAdapterApi = {
  async getAdapterRegistry(): Promise<AdapterRegistryResponse> {
    const response = await api.get('/adapters')
    return response.data
  },

  async getAdapterCatalog(): Promise<AdapterRegistryResponse> {
    const response = await api.get('/adapters/catalog')
    return response.data
  },

  async getAdapterHealth(): Promise<AdapterHealthResponse> {
    const response = await api.get('/adapters/health')
    return response.data
  },

  async getAdapter(adapterId: string): Promise<AdapterRegistryEntry> {
    const response = await api.get(`/adapters/${encodeURIComponent(adapterId)}`)
    return response.data
  },

  async updateAdapterBinding(
    adapterId: string,
    updates: UpdateAdapterBindingRequest,
  ): Promise<AdapterRegistryEntry> {
    const response = await api.put(`/adapters/${encodeURIComponent(adapterId)}/binding`, updates)
    return response.data
  },

  async verifyAdapter(adapterId: string): Promise<AdapterActionResult> {
    const response = await api.post(`/adapters/${encodeURIComponent(adapterId)}/verify`)
    return response.data
  },

  async syncAdapter(adapterId: string): Promise<AdapterActionResult> {
    const response = await api.post(`/adapters/${encodeURIComponent(adapterId)}/sync`)
    return response.data
  },
}
