import axios from 'axios'
import type {
  DecisionResponse,
  HealthResponse,
  MissionEnvelope,
  PlatformCapabilitiesResponse,
} from './legacyApiTypes'
import { api } from './iamHttpClient'
import { legacyAccessApi } from './legacyAccessApi'
import { legacyAdapterApi } from './legacyAdapterApi'
import { legacyCrmApi } from './legacyCrmApi'
import { legacyCommerceApi } from './legacyCommerceApi'
import { legacyCmsApi } from './legacyCmsApi'
import { legacyCommunicationsApi } from './legacyCommunicationsApi'
import { legacySchedulingApi } from './legacySchedulingApi'
import { legacyWorkforceApi } from './legacyWorkforceApi'
import { legacyIamApi } from './legacyIamApi'
import { legacyAdminApi } from './legacyAdminApi'
import { legacyCutoverApi } from './legacyCutoverApi'
import { legacyDeliveryApi } from './legacyDeliveryApi'
import { legacyLearningApi } from './legacyLearningApi'
import { legacyLmsApi } from './legacyLmsApi'
import { legacyOperationsApi } from './legacyOperationsApi'
import { legacyProjectApi } from './legacyProjectApi'

export * from './legacyApiTypes'

export {
  CLIENT_CONTEXT_EVENT,
  clearAuthenticatedSession,
  clearIamBearerToken,
  clearIamBrowserAuth,
  clearIamSession,
  getActiveTenantId,
  getCurrentIamAccessToken,
  getCurrentIamAuthClientId,
  getCurrentIamAuthRealmId,
  getCurrentIamRealmId,
  getCurrentIamRefreshToken,
  getCurrentIamSessionId,
  getCurrentSessionId,
  getCurrentUserId,
  resetCurrentSessionId,
  setActiveTenantId,
  setClientContextState,
  setCurrentIamAccessToken,
  setCurrentIamAuthClientId,
  setCurrentIamAuthRealmId,
  setCurrentIamRealmId,
  setCurrentIamRefreshToken,
  setCurrentIamSessionId,
  setCurrentSessionId,
  setCurrentUserId,
  shouldRefreshIamBrowserAccessToken,
} from './iamClientState'

export const idpApi = {
  // Core decision API
  async evaluateMission(mission: MissionEnvelope): Promise<DecisionResponse> {
    const response = await api.post('/evaluate', mission)
    return response.data
  },

  // Health check
  async getHealth(): Promise<HealthResponse> {
    const response = await axios.get('/health')
    return response.data
  },

  async getPlatformCapabilities(): Promise<PlatformCapabilitiesResponse> {
    const response = await api.get('/platform/capabilities')
    return response.data
  },

  ...legacyCmsApi,
  ...legacyAccessApi,
  ...legacyCommerceApi,
  ...legacyLmsApi,
  ...legacyCommunicationsApi,
  ...legacySchedulingApi,
  ...legacyWorkforceApi,
  ...legacyIamApi,
  ...legacyCutoverApi,
  ...legacyCrmApi,
  ...legacyProjectApi,
  ...legacyAdapterApi,
  ...legacyDeliveryApi,
  ...legacyLearningApi,
  ...legacyAdminApi,
  ...legacyOperationsApi,
}

export default api
