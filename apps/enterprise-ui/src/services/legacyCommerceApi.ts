import { api } from './iamHttpClient'
import type {
  CancelCommerceOrderRequest,
  CommerceAccountsReceivableResponse,
  CommerceAllocationRecord,
  CommerceAllocationStatus,
  CommerceAllocationsResponse,
  CommerceApplicationBindingRecord,
  CommerceApplicationBindingStatus,
  CommerceApplicationBindingsResponse,
  CommerceApprovalChainRecord,
  CommerceApprovalChainStatus,
  CommerceApprovalChainsResponse,
  CommerceApprovalTriggerKind,
  CommerceAtpResponse,
  CommerceBackupArtifactRecord,
  CommerceBackupsResponse,
  CommerceBenchmarkRunRecord,
  CommerceBenchmarksResponse,
  CommerceBillingAccountRecord,
  CommerceBillingAccountStatus,
  CommerceBillingAccountsResponse,
  CommerceBillingScheduleRecord,
  CommerceBillingScheduleStatus,
  CommerceBillingSchedulesResponse,
  CommerceBuyerAssignmentStatus,
  CommerceBuyerRole,
  CommerceBuyerRoleAssignmentRecord,
  CommerceBuyerRoleAssignmentsResponse,
  CommerceCartRecord,
  CommerceCartStatus,
  CommerceCartsResponse,
  CommerceCatalogRecord,
  CommerceCatalogStatus,
  CommerceCatalogsResponse,
  CommerceCheckoutCompletionResponse,
  CommerceCheckoutSessionRecord,
  CommerceCheckoutSessionStatus,
  CommerceCheckoutSessionsResponse,
  CommerceClaimRecord,
  CommerceClaimStatus,
  CommerceClaimsResponse,
  CommerceCommercialAccountKind,
  CommerceCommercialAccountRecord,
  CommerceCommercialAccountStatus,
  CommerceCommercialAccountsResponse,
  CommerceCompanyHierarchyNodeRecord,
  CommerceCompanyHierarchyResponse,
  CommerceConsumerApplicationKind,
  CommerceCreditProfileRecord,
  CommerceCreditProfilesResponse,
  CommerceCreditStatus,
  CommerceDifferentiationResponse,
  CommerceDisputeRecord,
  CommerceDisputeStatus,
  CommerceDisputesResponse,
  CommerceDunningEventRecord,
  CommerceDunningEventsResponse,
  CommerceDunningStatus,
  CommerceEntitlementGrantRecord,
  CommerceEntitlementGrantStatus,
  CommerceEntitlementGrantsResponse,
  CommerceExportArtifactRecord,
  CommerceExportArtifactsResponse,
  CommerceFinanceSummaryResponse,
  CommerceFormalReviewRecord,
  CommerceFormalReviewsResponse,
  CommerceFraudScreeningRecord,
  CommerceFraudScreeningsResponse,
  CommerceHandoffEventDeliveryStatus,
  CommerceHandoffEventsResponse,
  CommerceHandoffSummaryResponse,
  CommerceImportValidationRecord,
  CommerceImportValidationsResponse,
  CommerceInteroperabilityResponse,
  CommerceInventoryBalanceRecord,
  CommerceInventoryBalanceStatus,
  CommerceInventoryBalancesResponse,
  CommerceInventoryLocationRecord,
  CommerceInventoryLocationStatus,
  CommerceInventoryLocationsResponse,
  CommerceInvoiceRecord,
  CommerceInvoiceStatus,
  CommerceInvoicesResponse,
  CommerceOfferOverrideRecord,
  CommerceOfferOverrideStatus,
  CommerceOfferOverridesResponse,
  CommerceOfferRecord,
  CommerceOfferStatus,
  CommerceOffersResponse,
  CommerceOperationsDiagnosticsResponse,
  CommerceOperationsHealthResponse,
  CommerceOperationsSummaryResponse,
  CommerceOrderEventType,
  CommerceOrderEventsResponse,
  CommerceOrderRecord,
  CommerceOrderStatus,
  CommerceOrdersResponse,
  CommercePaymentAttemptStatus,
  CommercePaymentAttemptsResponse,
  CommercePaymentIntentRecord,
  CommercePaymentIntentStatus,
  CommercePaymentIntentsResponse,
  CommercePriceBookRecord,
  CommercePriceBookStatus,
  CommercePriceBooksResponse,
  CommerceProductRecord,
  CommerceProductStatus,
  CommerceProductType,
  CommerceProductsResponse,
  CommerceProviderRecord,
  CommerceProviderStatus,
  CommerceProvidersResponse,
  CommerceProvisioningGrantRecord,
  CommerceProvisioningGrantStatus,
  CommerceProvisioningGrantsResponse,
  CommerceQuoteConversionResponse,
  CommerceQuoteRecord,
  CommerceQuoteStatus,
  CommerceQuotesResponse,
  CommerceReadinessReviewRecord,
  CommerceReadinessReviewsResponse,
  CommerceReconciliationJobRecord,
  CommerceReconciliationJobStatus,
  CommerceReconciliationJobsResponse,
  CommerceRefundRecord,
  CommerceRefundStatus,
  CommerceRefundsResponse,
  CommerceReservationRecord,
  CommerceReservationStatus,
  CommerceReservationsResponse,
  CommerceResilienceRunRecord,
  CommerceResilienceRunsResponse,
  CommerceRestoreRecord,
  CommerceRestoresResponse,
  CommerceReturnRecord,
  CommerceReturnStatus,
  CommerceReturnsResponse,
  CommerceRevenueExportKind,
  CommerceRevenueExportRecord,
  CommerceRevenueExportStatus,
  CommerceRevenueExportsResponse,
  CommerceReviewSummaryResponse,
  CommerceRoutingRecord,
  CommerceRoutingResponse,
  CommerceRoutingStatus,
  CommerceRunbooksResponse,
  CommerceScopeKind,
  CommerceSettlementReferenceRecord,
  CommerceSettlementReferenceStatus,
  CommerceSettlementReferencesResponse,
  CommerceShipmentRecord,
  CommerceShipmentStatus,
  CommerceShipmentsResponse,
  CommerceShippingQuoteRecord,
  CommerceShippingQuotesResponse,
  CommerceStandardsMatrixResponse,
  CommerceSummaryResponse,
  CommerceSubscriptionRecord,
  CommerceSubscriptionStatus,
  CommerceSubscriptionsResponse,
  CommerceSupportCaseKind,
  CommerceSupportCaseRecord,
  CommerceSupportCaseStatus,
  CommerceSupportCasesResponse,
  CommerceTaxQuoteRecord,
  CommerceTaxQuotesResponse,
  CommerceUsageEntriesResponse,
  CommerceUsageEntryRecord,
  CommerceUsageMeterRecord,
  CommerceUsageMeterStatus,
  CommerceUsageMetersResponse,
  CommerceValidationDomainsResponse,
  CommerceWebhookEventRecord,
  CommerceWebhookEventStatus,
  CommerceWebhookEventsResponse,
  CompleteCommerceCheckoutSessionRequest,
  ConfirmCommercePaymentIntentRequest,
  CreateCommerceAllocationRequest,
  CreateCommerceApplicationBindingRequest,
  CreateCommerceApprovalChainRequest,
  CreateCommerceBackupRequest,
  CreateCommerceBillingAccountRequest,
  CreateCommerceBillingScheduleRequest,
  CreateCommerceBuyerRoleAssignmentRequest,
  CreateCommerceCartRequest,
  CreateCommerceCatalogRequest,
  CreateCommerceCheckoutSessionRequest,
  CreateCommerceClaimRequest,
  CreateCommerceCommercialAccountRequest,
  CreateCommerceCompanyHierarchyNodeRequest,
  CreateCommerceCreditProfileRequest,
  CreateCommerceDisputeRequest,
  CreateCommerceDunningEventRequest,
  CreateCommerceEntitlementGrantRequest,
  CreateCommerceExportArtifactRequest,
  CreateCommerceFormalReviewRequest,
  CreateCommerceFraudScreeningRequest,
  CreateCommerceImportValidationRequest,
  CreateCommerceInventoryBalanceRequest,
  CreateCommerceInventoryLocationRequest,
  CreateCommerceOfferOverrideRequest,
  CreateCommerceOfferRequest,
  CreateCommercePaymentIntentRequest,
  CreateCommercePriceBookRequest,
  CreateCommerceProductRequest,
  CreateCommerceProviderRequest,
  CreateCommerceProviderWebhookRequest,
  CreateCommerceProvisioningGrantRequest,
  CreateCommerceQuoteRequest,
  CreateCommerceReadinessReviewRequest,
  CreateCommerceReconciliationJobRequest,
  CreateCommerceRefundRequest,
  CreateCommerceReservationRequest,
  CreateCommerceRestoreRequest,
  CreateCommerceReturnRequest,
  CreateCommerceRevenueExportRequest,
  CreateCommerceRoutingRequest,
  CreateCommerceShipmentRequest,
  CreateCommerceShippingQuoteRequest,
  CreateCommerceSubscriptionRequest,
  CreateCommerceSupportCaseRequest,
  CreateCommerceSupportInterventionRequest,
  CreateCommerceTaxQuoteRequest,
  CreateCommerceUsageMeterRequest,
  MarkCommerceInvoicePaidRequest,
  RecordCommerceUsageEntryRequest,
  RunCommerceBillingScheduleRequest,
  UpdateCommerceAllocationRequest,
  UpdateCommerceApplicationBindingRequest,
  UpdateCommerceApprovalChainRequest,
  UpdateCommerceBillingAccountRequest,
  UpdateCommerceBillingScheduleRequest,
  UpdateCommerceBuyerRoleAssignmentRequest,
  UpdateCommerceCartRequest,
  UpdateCommerceCatalogRequest,
  UpdateCommerceClaimRequest,
  UpdateCommerceCommercialAccountRequest,
  UpdateCommerceCompanyHierarchyNodeRequest,
  UpdateCommerceCreditProfileRequest,
  UpdateCommerceDisputeRequest,
  UpdateCommerceDunningEventRequest,
  UpdateCommerceEntitlementGrantRequest,
  UpdateCommerceInventoryBalanceRequest,
  UpdateCommerceInventoryLocationRequest,
  UpdateCommerceInvoiceRequest,
  UpdateCommerceOfferOverrideRequest,
  UpdateCommerceOfferRequest,
  UpdateCommerceOrderRequest,
  UpdateCommercePriceBookRequest,
  UpdateCommerceProductRequest,
  UpdateCommerceProviderRequest,
  UpdateCommerceProvisioningGrantRequest,
  UpdateCommerceQuoteRequest,
  UpdateCommerceRefundRequest,
  UpdateCommerceReservationRequest,
  UpdateCommerceReturnRequest,
  UpdateCommerceRoutingRequest,
  UpdateCommerceSettlementReferenceRequest,
  UpdateCommerceShipmentRequest,
  UpdateCommerceSubscriptionRequest,
  UpdateCommerceSupportCaseRequest,
  UpdateCommerceUsageMeterRequest,
} from './legacyCommerceTypes'

export const legacyCommerceApi = {
  async getCommerceSummary(): Promise<CommerceSummaryResponse> {
    const response = await api.get('/commerce/summary')
    return response.data
  },

  async listCommerceValidationDomains(): Promise<CommerceValidationDomainsResponse> {
    const response = await api.get('/commerce/validation-domains')
    return response.data
  },

  async listCommerceCatalogs(filters?: {
    scopeKind?: CommerceScopeKind
    status?: CommerceCatalogStatus
    validationDomainId?: string
  }): Promise<CommerceCatalogsResponse> {
    const response = await api.get('/commerce/catalogs', {
      params: {
        scope_kind: filters?.scopeKind,
        status: filters?.status,
        validation_domain_id: filters?.validationDomainId,
      },
    })
    return response.data
  },

  async createCommerceCatalog(request: CreateCommerceCatalogRequest): Promise<CommerceCatalogRecord> {
    const response = await api.post('/commerce/catalogs', request)
    return response.data
  },

  async updateCommerceCatalog(catalogId: string, request: UpdateCommerceCatalogRequest): Promise<CommerceCatalogRecord> {
    const response = await api.put(`/commerce/catalogs/${catalogId}`, request)
    return response.data
  },

  async listCommerceProducts(filters?: {
    catalogId?: string
    productType?: CommerceProductType
    status?: CommerceProductStatus
  }): Promise<CommerceProductsResponse> {
    const response = await api.get('/commerce/products', {
      params: {
        catalog_id: filters?.catalogId,
        product_type: filters?.productType,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceProduct(request: CreateCommerceProductRequest): Promise<CommerceProductRecord> {
    const response = await api.post('/commerce/products', request)
    return response.data
  },

  async updateCommerceProduct(productId: string, request: UpdateCommerceProductRequest): Promise<CommerceProductRecord> {
    const response = await api.put(`/commerce/products/${productId}`, request)
    return response.data
  },

  async listCommercePriceBooks(filters?: {
    currency?: string
    status?: CommercePriceBookStatus
    catalogId?: string
  }): Promise<CommercePriceBooksResponse> {
    const response = await api.get('/commerce/price-books', {
      params: {
        currency: filters?.currency,
        status: filters?.status,
        catalog_id: filters?.catalogId,
      },
    })
    return response.data
  },

  async createCommercePriceBook(request: CreateCommercePriceBookRequest): Promise<CommercePriceBookRecord> {
    const response = await api.post('/commerce/price-books', request)
    return response.data
  },

  async updateCommercePriceBook(priceBookId: string, request: UpdateCommercePriceBookRequest): Promise<CommercePriceBookRecord> {
    const response = await api.put(`/commerce/price-books/${priceBookId}`, request)
    return response.data
  },

  async listCommerceOffers(filters?: {
    catalogId?: string
    productId?: string
    priceBookId?: string
    status?: CommerceOfferStatus
  }): Promise<CommerceOffersResponse> {
    const response = await api.get('/commerce/offers', {
      params: {
        catalog_id: filters?.catalogId,
        product_id: filters?.productId,
        price_book_id: filters?.priceBookId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceOffer(request: CreateCommerceOfferRequest): Promise<CommerceOfferRecord> {
    const response = await api.post('/commerce/offers', request)
    return response.data
  },

  async updateCommerceOffer(offerId: string, request: UpdateCommerceOfferRequest): Promise<CommerceOfferRecord> {
    const response = await api.put(`/commerce/offers/${offerId}`, request)
    return response.data
  },

  async listCommerceCommercialAccounts(filters?: {
    validationDomainId?: string
    kind?: CommerceCommercialAccountKind
    status?: CommerceCommercialAccountStatus
  }): Promise<CommerceCommercialAccountsResponse> {
    const response = await api.get('/commerce/accounts', {
      params: {
        validation_domain_id: filters?.validationDomainId,
        kind: filters?.kind,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceCommercialAccount(request: CreateCommerceCommercialAccountRequest): Promise<CommerceCommercialAccountRecord> {
    const response = await api.post('/commerce/accounts', request)
    return response.data
  },

  async updateCommerceCommercialAccount(
    accountId: string,
    request: UpdateCommerceCommercialAccountRequest
  ): Promise<CommerceCommercialAccountRecord> {
    const response = await api.put(`/commerce/accounts/${accountId}`, request)
    return response.data
  },

  async listCommerceBillingAccounts(filters?: {
    commercialAccountId?: string
    status?: CommerceBillingAccountStatus
  }): Promise<CommerceBillingAccountsResponse> {
    const response = await api.get('/commerce/billing-accounts', {
      params: {
        commercial_account_id: filters?.commercialAccountId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceBillingAccount(request: CreateCommerceBillingAccountRequest): Promise<CommerceBillingAccountRecord> {
    const response = await api.post('/commerce/billing-accounts', request)
    return response.data
  },

  async updateCommerceBillingAccount(
    billingAccountId: string,
    request: UpdateCommerceBillingAccountRequest
  ): Promise<CommerceBillingAccountRecord> {
    const response = await api.put(`/commerce/billing-accounts/${billingAccountId}`, request)
    return response.data
  },

  async listCommerceCompanyHierarchy(filters?: {
    commercialAccountId?: string
    parentNodeId?: string | null
  }): Promise<CommerceCompanyHierarchyResponse> {
    const response = await api.get('/commerce/company-hierarchy', {
      params: {
        commercial_account_id: filters?.commercialAccountId,
        parent_node_id: filters?.parentNodeId,
      },
    })
    return response.data
  },

  async createCommerceCompanyHierarchyNode(
    request: CreateCommerceCompanyHierarchyNodeRequest
  ): Promise<CommerceCompanyHierarchyNodeRecord> {
    const response = await api.post('/commerce/company-hierarchy', request)
    return response.data
  },

  async updateCommerceCompanyHierarchyNode(
    nodeId: string,
    request: UpdateCommerceCompanyHierarchyNodeRequest
  ): Promise<CommerceCompanyHierarchyNodeRecord> {
    const response = await api.put(`/commerce/company-hierarchy/${nodeId}`, request)
    return response.data
  },

  async listCommerceBuyerRoleAssignments(filters?: {
    commercialAccountId?: string
    role?: CommerceBuyerRole
    status?: CommerceBuyerAssignmentStatus
  }): Promise<CommerceBuyerRoleAssignmentsResponse> {
    const response = await api.get('/commerce/buyer-roles', {
      params: {
        commercial_account_id: filters?.commercialAccountId,
        role: filters?.role,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceBuyerRoleAssignment(
    request: CreateCommerceBuyerRoleAssignmentRequest
  ): Promise<CommerceBuyerRoleAssignmentRecord> {
    const response = await api.post('/commerce/buyer-roles', request)
    return response.data
  },

  async updateCommerceBuyerRoleAssignment(
    buyerRoleId: string,
    request: UpdateCommerceBuyerRoleAssignmentRequest
  ): Promise<CommerceBuyerRoleAssignmentRecord> {
    const response = await api.put(`/commerce/buyer-roles/${buyerRoleId}`, request)
    return response.data
  },

  async listCommerceApprovalChains(filters?: {
    commercialAccountId?: string
    status?: CommerceApprovalChainStatus
    triggerKind?: CommerceApprovalTriggerKind
  }): Promise<CommerceApprovalChainsResponse> {
    const response = await api.get('/commerce/approvals', {
      params: {
        commercial_account_id: filters?.commercialAccountId,
        status: filters?.status,
        trigger_kind: filters?.triggerKind,
      },
    })
    return response.data
  },

  async createCommerceApprovalChain(request: CreateCommerceApprovalChainRequest): Promise<CommerceApprovalChainRecord> {
    const response = await api.post('/commerce/approvals', request)
    return response.data
  },

  async updateCommerceApprovalChain(
    approvalChainId: string,
    request: UpdateCommerceApprovalChainRequest
  ): Promise<CommerceApprovalChainRecord> {
    const response = await api.put(`/commerce/approvals/${approvalChainId}`, request)
    return response.data
  },

  async listCommerceCreditProfiles(filters?: {
    commercialAccountId?: string
    status?: CommerceCreditStatus
  }): Promise<CommerceCreditProfilesResponse> {
    const response = await api.get('/commerce/credit', {
      params: {
        commercial_account_id: filters?.commercialAccountId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceCreditProfile(request: CreateCommerceCreditProfileRequest): Promise<CommerceCreditProfileRecord> {
    const response = await api.post('/commerce/credit', request)
    return response.data
  },

  async updateCommerceCreditProfile(
    creditProfileId: string,
    request: UpdateCommerceCreditProfileRequest
  ): Promise<CommerceCreditProfileRecord> {
    const response = await api.put(`/commerce/credit/${creditProfileId}`, request)
    return response.data
  },

  async listCommerceQuotes(filters?: {
    commercialAccountId?: string
    billingAccountId?: string
    status?: CommerceQuoteStatus
  }): Promise<CommerceQuotesResponse> {
    const response = await api.get('/commerce/quotes', {
      params: {
        commercial_account_id: filters?.commercialAccountId,
        billing_account_id: filters?.billingAccountId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceQuote(request: CreateCommerceQuoteRequest): Promise<CommerceQuoteRecord> {
    const response = await api.post('/commerce/quotes', request)
    return response.data
  },

  async updateCommerceQuote(quoteId: string, request: UpdateCommerceQuoteRequest): Promise<CommerceQuoteRecord> {
    const response = await api.put(`/commerce/quotes/${quoteId}`, request)
    return response.data
  },

  async convertCommerceQuote(quoteId: string): Promise<CommerceQuoteConversionResponse> {
    const response = await api.post(`/commerce/quotes/${quoteId}/convert`)
    return response.data
  },

  async listCommerceCarts(filters?: {
    commercialAccountId?: string
    sourceQuoteId?: string
    status?: CommerceCartStatus
  }): Promise<CommerceCartsResponse> {
    const response = await api.get('/commerce/carts', {
      params: {
        commercial_account_id: filters?.commercialAccountId,
        source_quote_id: filters?.sourceQuoteId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceCart(request: CreateCommerceCartRequest): Promise<CommerceCartRecord> {
    const response = await api.post('/commerce/carts', request)
    return response.data
  },

  async updateCommerceCart(cartId: string, request: UpdateCommerceCartRequest): Promise<CommerceCartRecord> {
    const response = await api.put(`/commerce/carts/${cartId}`, request)
    return response.data
  },

  async listCommerceCheckoutSessions(filters?: {
    cartId?: string
    commercialAccountId?: string
    status?: CommerceCheckoutSessionStatus
  }): Promise<CommerceCheckoutSessionsResponse> {
    const response = await api.get('/commerce/checkout-sessions', {
      params: {
        cart_id: filters?.cartId,
        commercial_account_id: filters?.commercialAccountId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceCheckoutSession(
    request: CreateCommerceCheckoutSessionRequest
  ): Promise<CommerceCheckoutSessionRecord> {
    const response = await api.post('/commerce/checkout-sessions', request)
    return response.data
  },

  async completeCommerceCheckoutSession(
    checkoutSessionId: string,
    request?: CompleteCommerceCheckoutSessionRequest
  ): Promise<CommerceCheckoutCompletionResponse> {
    const response = await api.post(`/commerce/checkout-sessions/${checkoutSessionId}/complete`, request ?? {})
    return response.data
  },

  async listCommerceOrders(filters?: {
    commercialAccountId?: string
    sourceQuoteId?: string
    status?: CommerceOrderStatus
  }): Promise<CommerceOrdersResponse> {
    const response = await api.get('/commerce/orders', {
      params: {
        commercial_account_id: filters?.commercialAccountId,
        source_quote_id: filters?.sourceQuoteId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async updateCommerceOrder(orderId: string, request: UpdateCommerceOrderRequest): Promise<CommerceOrderRecord> {
    const response = await api.put(`/commerce/orders/${orderId}`, request)
    return response.data
  },

  async cancelCommerceOrder(orderId: string, request: CancelCommerceOrderRequest): Promise<CommerceOrderRecord> {
    const response = await api.post(`/commerce/orders/${orderId}/cancel`, request)
    return response.data
  },

  async listCommerceOrderEvents(filters?: {
    orderId?: string
    eventType?: CommerceOrderEventType
  }): Promise<CommerceOrderEventsResponse> {
    const response = await api.get('/commerce/order-events', {
      params: {
        order_id: filters?.orderId,
        event_type: filters?.eventType,
      },
    })
    return response.data
  },

  async listCommerceInventoryLocations(filters?: {
    validationDomainId?: string
    status?: CommerceInventoryLocationStatus
  }): Promise<CommerceInventoryLocationsResponse> {
    const response = await api.get('/commerce/inventory/locations', {
      params: {
        validation_domain_id: filters?.validationDomainId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceInventoryLocation(
    request: CreateCommerceInventoryLocationRequest
  ): Promise<CommerceInventoryLocationRecord> {
    const response = await api.post('/commerce/inventory/locations', request)
    return response.data
  },

  async updateCommerceInventoryLocation(
    locationId: string,
    request: UpdateCommerceInventoryLocationRequest
  ): Promise<CommerceInventoryLocationRecord> {
    const response = await api.put(`/commerce/inventory/locations/${locationId}`, request)
    return response.data
  },

  async listCommerceInventoryBalances(filters?: {
    locationId?: string
    productId?: string
    status?: CommerceInventoryBalanceStatus
  }): Promise<CommerceInventoryBalancesResponse> {
    const response = await api.get('/commerce/inventory/balances', {
      params: {
        location_id: filters?.locationId,
        product_id: filters?.productId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceInventoryBalance(
    request: CreateCommerceInventoryBalanceRequest
  ): Promise<CommerceInventoryBalanceRecord> {
    const response = await api.post('/commerce/inventory/balances', request)
    return response.data
  },

  async updateCommerceInventoryBalance(
    balanceId: string,
    request: UpdateCommerceInventoryBalanceRequest
  ): Promise<CommerceInventoryBalanceRecord> {
    const response = await api.put(`/commerce/inventory/balances/${balanceId}`, request)
    return response.data
  },

  async listCommerceAtp(filters?: {
    productId?: string
  }): Promise<CommerceAtpResponse> {
    const response = await api.get('/commerce/inventory/atp', {
      params: {
        product_id: filters?.productId,
      },
    })
    return response.data
  },

  async listCommerceReservations(filters?: {
    orderId?: string
    status?: CommerceReservationStatus
  }): Promise<CommerceReservationsResponse> {
    const response = await api.get('/commerce/reservations', {
      params: {
        order_id: filters?.orderId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceReservation(
    request: CreateCommerceReservationRequest
  ): Promise<CommerceReservationRecord> {
    const response = await api.post('/commerce/reservations', request)
    return response.data
  },

  async updateCommerceReservation(
    reservationId: string,
    request: UpdateCommerceReservationRequest
  ): Promise<CommerceReservationRecord> {
    const response = await api.put(`/commerce/reservations/${reservationId}`, request)
    return response.data
  },

  async listCommerceAllocations(filters?: {
    orderId?: string
    reservationId?: string
    status?: CommerceAllocationStatus
  }): Promise<CommerceAllocationsResponse> {
    const response = await api.get('/commerce/allocations', {
      params: {
        order_id: filters?.orderId,
        reservation_id: filters?.reservationId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceAllocation(
    request: CreateCommerceAllocationRequest
  ): Promise<CommerceAllocationRecord> {
    const response = await api.post('/commerce/allocations', request)
    return response.data
  },

  async updateCommerceAllocation(
    allocationId: string,
    request: UpdateCommerceAllocationRequest
  ): Promise<CommerceAllocationRecord> {
    const response = await api.put(`/commerce/allocations/${allocationId}`, request)
    return response.data
  },

  async listCommerceRouting(filters?: {
    orderId?: string
    status?: CommerceRoutingStatus
  }): Promise<CommerceRoutingResponse> {
    const response = await api.get('/commerce/routing', {
      params: {
        order_id: filters?.orderId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceRouting(
    request: CreateCommerceRoutingRequest
  ): Promise<CommerceRoutingRecord> {
    const response = await api.post('/commerce/routing', request)
    return response.data
  },

  async updateCommerceRouting(
    routingId: string,
    request: UpdateCommerceRoutingRequest
  ): Promise<CommerceRoutingRecord> {
    const response = await api.put(`/commerce/routing/${routingId}`, request)
    return response.data
  },

  async listCommerceShipments(filters?: {
    orderId?: string
    locationId?: string
    status?: CommerceShipmentStatus
  }): Promise<CommerceShipmentsResponse> {
    const response = await api.get('/commerce/shipments', {
      params: {
        order_id: filters?.orderId,
        location_id: filters?.locationId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceShipment(
    request: CreateCommerceShipmentRequest
  ): Promise<CommerceShipmentRecord> {
    const response = await api.post('/commerce/shipments', request)
    return response.data
  },

  async updateCommerceShipment(
    shipmentId: string,
    request: UpdateCommerceShipmentRequest
  ): Promise<CommerceShipmentRecord> {
    const response = await api.put(`/commerce/shipments/${shipmentId}`, request)
    return response.data
  },

  async listCommerceReturns(filters?: {
    orderId?: string
    status?: CommerceReturnStatus
  }): Promise<CommerceReturnsResponse> {
    const response = await api.get('/commerce/returns', {
      params: {
        order_id: filters?.orderId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceReturn(
    request: CreateCommerceReturnRequest
  ): Promise<CommerceReturnRecord> {
    const response = await api.post('/commerce/returns', request)
    return response.data
  },

  async updateCommerceReturn(
    returnId: string,
    request: UpdateCommerceReturnRequest
  ): Promise<CommerceReturnRecord> {
    const response = await api.put(`/commerce/returns/${returnId}`, request)
    return response.data
  },

  async listCommerceClaims(filters?: {
    orderId?: string
    status?: CommerceClaimStatus
  }): Promise<CommerceClaimsResponse> {
    const response = await api.get('/commerce/claims', {
      params: {
        order_id: filters?.orderId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceClaim(
    request: CreateCommerceClaimRequest
  ): Promise<CommerceClaimRecord> {
    const response = await api.post('/commerce/claims', request)
    return response.data
  },

  async updateCommerceClaim(
    claimId: string,
    request: UpdateCommerceClaimRequest
  ): Promise<CommerceClaimRecord> {
    const response = await api.put(`/commerce/claims/${claimId}`, request)
    return response.data
  },

  async listCommerceSubscriptions(filters?: {
    commercialAccountId?: string
    billingAccountId?: string
    status?: CommerceSubscriptionStatus
    offerId?: string
  }): Promise<CommerceSubscriptionsResponse> {
    const response = await api.get('/commerce/subscriptions', {
      params: {
        commercial_account_id: filters?.commercialAccountId,
        billing_account_id: filters?.billingAccountId,
        status: filters?.status,
        offer_id: filters?.offerId,
      },
    })
    return response.data
  },

  async createCommerceSubscription(request: CreateCommerceSubscriptionRequest): Promise<CommerceSubscriptionRecord> {
    const response = await api.post('/commerce/subscriptions', request)
    return response.data
  },

  async updateCommerceSubscription(
    subscriptionId: string,
    request: UpdateCommerceSubscriptionRequest
  ): Promise<CommerceSubscriptionRecord> {
    const response = await api.put(`/commerce/subscriptions/${subscriptionId}`, request)
    return response.data
  },

  async listCommerceBillingSchedules(filters?: {
    commercialAccountId?: string
    billingAccountId?: string
    subscriptionId?: string
    status?: CommerceBillingScheduleStatus
  }): Promise<CommerceBillingSchedulesResponse> {
    const response = await api.get('/commerce/billing-schedules', {
      params: {
        commercial_account_id: filters?.commercialAccountId,
        billing_account_id: filters?.billingAccountId,
        subscription_id: filters?.subscriptionId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceBillingSchedule(request: CreateCommerceBillingScheduleRequest): Promise<CommerceBillingScheduleRecord> {
    const response = await api.post('/commerce/billing-schedules', request)
    return response.data
  },

  async updateCommerceBillingSchedule(
    scheduleId: string,
    request: UpdateCommerceBillingScheduleRequest
  ): Promise<CommerceBillingScheduleRecord> {
    const response = await api.put(`/commerce/billing-schedules/${scheduleId}`, request)
    return response.data
  },

  async runCommerceBillingSchedule(
    scheduleId: string,
    request?: RunCommerceBillingScheduleRequest
  ): Promise<CommerceInvoiceRecord> {
    const response = await api.post(`/commerce/billing-schedules/${scheduleId}/run`, request ?? {})
    return response.data
  },

  async listCommerceUsageMeters(filters?: {
    commercialAccountId?: string
    billingAccountId?: string
    subscriptionId?: string
    status?: CommerceUsageMeterStatus
  }): Promise<CommerceUsageMetersResponse> {
    const response = await api.get('/commerce/usage-meters', {
      params: {
        commercial_account_id: filters?.commercialAccountId,
        billing_account_id: filters?.billingAccountId,
        subscription_id: filters?.subscriptionId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceUsageMeter(request: CreateCommerceUsageMeterRequest): Promise<CommerceUsageMeterRecord> {
    const response = await api.post('/commerce/usage-meters', request)
    return response.data
  },

  async updateCommerceUsageMeter(
    meterId: string,
    request: UpdateCommerceUsageMeterRequest
  ): Promise<CommerceUsageMeterRecord> {
    const response = await api.put(`/commerce/usage-meters/${meterId}`, request)
    return response.data
  },

  async listCommerceUsageEntries(filters?: {
    usageMeterId?: string
  }): Promise<CommerceUsageEntriesResponse> {
    const response = await api.get('/commerce/usage-entries', {
      params: {
        usage_meter_id: filters?.usageMeterId,
      },
    })
    return response.data
  },

  async recordCommerceUsageEntry(
    meterId: string,
    request: RecordCommerceUsageEntryRequest
  ): Promise<CommerceUsageEntryRecord> {
    const response = await api.post(`/commerce/usage-meters/${meterId}/entries`, request)
    return response.data
  },

  async listCommerceInvoices(filters?: {
    commercialAccountId?: string
    billingAccountId?: string
    subscriptionId?: string
    status?: CommerceInvoiceStatus
  }): Promise<CommerceInvoicesResponse> {
    const response = await api.get('/commerce/invoices', {
      params: {
        commercial_account_id: filters?.commercialAccountId,
        billing_account_id: filters?.billingAccountId,
        subscription_id: filters?.subscriptionId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async updateCommerceInvoice(invoiceId: string, request: UpdateCommerceInvoiceRequest): Promise<CommerceInvoiceRecord> {
    const response = await api.put(`/commerce/invoices/${invoiceId}`, request)
    return response.data
  },

  async markCommerceInvoicePaid(
    invoiceId: string,
    request?: MarkCommerceInvoicePaidRequest
  ): Promise<CommerceInvoiceRecord> {
    const response = await api.post(`/commerce/invoices/${invoiceId}/mark-paid`, request ?? {})
    return response.data
  },

  async listCommerceDunningEvents(filters?: {
    invoiceId?: string
    billingAccountId?: string
    status?: CommerceDunningStatus
  }): Promise<CommerceDunningEventsResponse> {
    const response = await api.get('/commerce/dunning', {
      params: {
        invoice_id: filters?.invoiceId,
        billing_account_id: filters?.billingAccountId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceDunningEvent(
    invoiceId: string,
    request: CreateCommerceDunningEventRequest
  ): Promise<CommerceDunningEventRecord> {
    const response = await api.post(`/commerce/invoices/${invoiceId}/dunning`, request)
    return response.data
  },

  async updateCommerceDunningEvent(
    dunningEventId: string,
    request: UpdateCommerceDunningEventRequest
  ): Promise<CommerceDunningEventRecord> {
    const response = await api.put(`/commerce/dunning/${dunningEventId}`, request)
    return response.data
  },

  async listCommerceAccountsReceivable(filters?: {
    commercialAccountId?: string
    billingAccountId?: string
  }): Promise<CommerceAccountsReceivableResponse> {
    const response = await api.get('/commerce/accounts-receivable', {
      params: {
        commercial_account_id: filters?.commercialAccountId,
        billing_account_id: filters?.billingAccountId,
      },
    })
    return response.data
  },

  async listCommercePaymentProviders(filters?: {
    status?: CommerceProviderStatus
  }): Promise<CommerceProvidersResponse> {
    const response = await api.get('/commerce/payment-providers', {
      params: {
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommercePaymentProvider(request: CreateCommerceProviderRequest): Promise<CommerceProviderRecord> {
    const response = await api.post('/commerce/payment-providers', request)
    return response.data
  },

  async updateCommercePaymentProvider(
    providerId: string,
    request: UpdateCommerceProviderRequest
  ): Promise<CommerceProviderRecord> {
    const response = await api.put(`/commerce/payment-providers/${providerId}`, request)
    return response.data
  },

  async listCommercePaymentIntents(filters?: {
    commercialAccountId?: string
    billingAccountId?: string
    status?: CommercePaymentIntentStatus
    providerId?: string
  }): Promise<CommercePaymentIntentsResponse> {
    const response = await api.get('/commerce/payment-intents', {
      params: {
        commercial_account_id: filters?.commercialAccountId,
        billing_account_id: filters?.billingAccountId,
        status: filters?.status,
        provider_id: filters?.providerId,
      },
    })
    return response.data
  },

  async createCommercePaymentIntent(request: CreateCommercePaymentIntentRequest): Promise<CommercePaymentIntentRecord> {
    const response = await api.post('/commerce/payment-intents', request)
    return response.data
  },

  async confirmCommercePaymentIntent(
    paymentIntentId: string,
    request?: ConfirmCommercePaymentIntentRequest
  ): Promise<CommercePaymentIntentRecord> {
    const response = await api.post(`/commerce/payment-intents/${paymentIntentId}/confirm`, request ?? {})
    return response.data
  },

  async listCommercePaymentAttempts(filters?: {
    paymentIntentId?: string
    providerId?: string
    status?: CommercePaymentAttemptStatus
  }): Promise<CommercePaymentAttemptsResponse> {
    const response = await api.get('/commerce/payment-attempts', {
      params: {
        payment_intent_id: filters?.paymentIntentId,
        provider_id: filters?.providerId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async listCommercePaymentWebhookEvents(filters?: {
    providerId?: string
    paymentIntentId?: string
    status?: CommerceWebhookEventStatus
  }): Promise<CommerceWebhookEventsResponse> {
    const response = await api.get('/commerce/payment-webhooks', {
      params: {
        provider_id: filters?.providerId,
        payment_intent_id: filters?.paymentIntentId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async processCommercePaymentProviderWebhook(
    providerId: string,
    request: CreateCommerceProviderWebhookRequest
  ): Promise<CommerceWebhookEventRecord> {
    const response = await api.post(`/commerce/payment-providers/${providerId}/webhooks`, request)
    return response.data
  },

  async listCommerceRefunds(filters?: {
    paymentAttemptId?: string
    providerId?: string
    status?: CommerceRefundStatus
  }): Promise<CommerceRefundsResponse> {
    const response = await api.get('/commerce/refunds', {
      params: {
        payment_attempt_id: filters?.paymentAttemptId,
        provider_id: filters?.providerId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceRefund(request: CreateCommerceRefundRequest): Promise<CommerceRefundRecord> {
    const response = await api.post('/commerce/refunds', request)
    return response.data
  },

  async updateCommerceRefund(refundId: string, request: UpdateCommerceRefundRequest): Promise<CommerceRefundRecord> {
    const response = await api.put(`/commerce/refunds/${refundId}`, request)
    return response.data
  },

  async listCommerceDisputes(filters?: {
    paymentAttemptId?: string
    providerId?: string
    status?: CommerceDisputeStatus
  }): Promise<CommerceDisputesResponse> {
    const response = await api.get('/commerce/disputes', {
      params: {
        payment_attempt_id: filters?.paymentAttemptId,
        provider_id: filters?.providerId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceDispute(request: CreateCommerceDisputeRequest): Promise<CommerceDisputeRecord> {
    const response = await api.post('/commerce/disputes', request)
    return response.data
  },

  async updateCommerceDispute(disputeId: string, request: UpdateCommerceDisputeRequest): Promise<CommerceDisputeRecord> {
    const response = await api.put(`/commerce/disputes/${disputeId}`, request)
    return response.data
  },

  async listCommerceTaxProviders(filters?: {
    status?: CommerceProviderStatus
  }): Promise<CommerceProvidersResponse> {
    const response = await api.get('/commerce/tax-providers', {
      params: {
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceTaxProvider(request: CreateCommerceProviderRequest): Promise<CommerceProviderRecord> {
    const response = await api.post('/commerce/tax-providers', request)
    return response.data
  },

  async updateCommerceTaxProvider(
    providerId: string,
    request: UpdateCommerceProviderRequest
  ): Promise<CommerceProviderRecord> {
    const response = await api.put(`/commerce/tax-providers/${providerId}`, request)
    return response.data
  },

  async listCommerceTaxQuotes(filters?: {
    billingAccountId?: string
  }): Promise<CommerceTaxQuotesResponse> {
    const response = await api.get('/commerce/tax/quotes', {
      params: {
        billing_account_id: filters?.billingAccountId,
      },
    })
    return response.data
  },

  async createCommerceTaxQuote(request: CreateCommerceTaxQuoteRequest): Promise<CommerceTaxQuoteRecord> {
    const response = await api.post('/commerce/tax/quotes', request)
    return response.data
  },

  async listCommerceShippingProviders(filters?: {
    status?: CommerceProviderStatus
  }): Promise<CommerceProvidersResponse> {
    const response = await api.get('/commerce/shipping-providers', {
      params: {
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceShippingProvider(request: CreateCommerceProviderRequest): Promise<CommerceProviderRecord> {
    const response = await api.post('/commerce/shipping-providers', request)
    return response.data
  },

  async updateCommerceShippingProvider(
    providerId: string,
    request: UpdateCommerceProviderRequest
  ): Promise<CommerceProviderRecord> {
    const response = await api.put(`/commerce/shipping-providers/${providerId}`, request)
    return response.data
  },

  async listCommerceShippingQuotes(filters?: {
    orderId?: string
  }): Promise<CommerceShippingQuotesResponse> {
    const response = await api.get('/commerce/shipping/quotes', {
      params: {
        order_id: filters?.orderId,
      },
    })
    return response.data
  },

  async createCommerceShippingQuote(request: CreateCommerceShippingQuoteRequest): Promise<CommerceShippingQuoteRecord> {
    const response = await api.post('/commerce/shipping/quotes', request)
    return response.data
  },

  async listCommerceFraudProviders(filters?: {
    status?: CommerceProviderStatus
  }): Promise<CommerceProvidersResponse> {
    const response = await api.get('/commerce/fraud-providers', {
      params: {
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceFraudProvider(request: CreateCommerceProviderRequest): Promise<CommerceProviderRecord> {
    const response = await api.post('/commerce/fraud-providers', request)
    return response.data
  },

  async updateCommerceFraudProvider(
    providerId: string,
    request: UpdateCommerceProviderRequest
  ): Promise<CommerceProviderRecord> {
    const response = await api.put(`/commerce/fraud-providers/${providerId}`, request)
    return response.data
  },

  async listCommerceFraudScreenings(filters?: {
    commercialAccountId?: string
    paymentIntentId?: string
  }): Promise<CommerceFraudScreeningsResponse> {
    const response = await api.get('/commerce/fraud/screenings', {
      params: {
        commercial_account_id: filters?.commercialAccountId,
        payment_intent_id: filters?.paymentIntentId,
      },
    })
    return response.data
  },

  async createCommerceFraudScreening(request: CreateCommerceFraudScreeningRequest): Promise<CommerceFraudScreeningRecord> {
    const response = await api.post('/commerce/fraud/screenings', request)
    return response.data
  },

  async getCommerceFinanceSummary(): Promise<CommerceFinanceSummaryResponse> {
    const response = await api.get('/commerce/finance/summary')
    return response.data
  },

  async listCommerceReconciliationJobs(filters?: {
    status?: CommerceReconciliationJobStatus
    providerId?: string
  }): Promise<CommerceReconciliationJobsResponse> {
    const response = await api.get('/commerce/reconciliation-jobs', {
      params: {
        status: filters?.status,
        provider_id: filters?.providerId,
      },
    })
    return response.data
  },

  async createCommerceReconciliationJob(
    request?: CreateCommerceReconciliationJobRequest
  ): Promise<CommerceReconciliationJobRecord> {
    const response = await api.post('/commerce/reconciliation-jobs', request ?? {})
    return response.data
  },

  async listCommerceSettlementReferences(filters?: {
    providerId?: string
    status?: CommerceSettlementReferenceStatus
  }): Promise<CommerceSettlementReferencesResponse> {
    const response = await api.get('/commerce/settlements', {
      params: {
        provider_id: filters?.providerId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async updateCommerceSettlementReference(
    settlementReferenceId: string,
    request: UpdateCommerceSettlementReferenceRequest
  ): Promise<CommerceSettlementReferenceRecord> {
    const response = await api.put(`/commerce/settlements/${settlementReferenceId}`, request)
    return response.data
  },

  async listCommerceRevenueExports(filters?: {
    exportKind?: CommerceRevenueExportKind
    status?: CommerceRevenueExportStatus
  }): Promise<CommerceRevenueExportsResponse> {
    const response = await api.get('/commerce/revenue-exports', {
      params: {
        export_kind: filters?.exportKind,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceRevenueExport(request: CreateCommerceRevenueExportRequest): Promise<CommerceRevenueExportRecord> {
    const response = await api.post('/commerce/revenue-exports', request)
    return response.data
  },

  async listCommerceSupportCases(filters?: {
    caseKind?: CommerceSupportCaseKind
    status?: CommerceSupportCaseStatus
    commercialAccountId?: string
  }): Promise<CommerceSupportCasesResponse> {
    const response = await api.get('/commerce/support-cases', {
      params: {
        case_kind: filters?.caseKind,
        status: filters?.status,
        commercial_account_id: filters?.commercialAccountId,
      },
    })
    return response.data
  },

  async createCommerceSupportCase(request: CreateCommerceSupportCaseRequest): Promise<CommerceSupportCaseRecord> {
    const response = await api.post('/commerce/support-cases', request)
    return response.data
  },

  async updateCommerceSupportCase(
    supportCaseId: string,
    request: UpdateCommerceSupportCaseRequest
  ): Promise<CommerceSupportCaseRecord> {
    const response = await api.put(`/commerce/support-cases/${supportCaseId}`, request)
    return response.data
  },

  async interveneCommerceSupportCase(
    supportCaseId: string,
    request: CreateCommerceSupportInterventionRequest
  ): Promise<CommerceSupportCaseRecord> {
    const response = await api.post(`/commerce/support-cases/${supportCaseId}/intervene`, request)
    return response.data
  },

  async getCommerceHandoffSummary(): Promise<CommerceHandoffSummaryResponse> {
    const response = await api.get('/commerce/handoff/summary')
    return response.data
  },

  async listCommerceApplicationBindings(filters?: {
    consumerKind?: CommerceConsumerApplicationKind
    status?: CommerceApplicationBindingStatus
    targetConsumerId?: string
  }): Promise<CommerceApplicationBindingsResponse> {
    const response = await api.get('/commerce/application-bindings', {
      params: {
        consumer_kind: filters?.consumerKind,
        status: filters?.status,
        target_consumer_id: filters?.targetConsumerId,
      },
    })
    return response.data
  },

  async createCommerceApplicationBinding(
    request: CreateCommerceApplicationBindingRequest
  ): Promise<CommerceApplicationBindingRecord> {
    const response = await api.post('/commerce/application-bindings', request)
    return response.data
  },

  async updateCommerceApplicationBinding(
    applicationBindingId: string,
    request: UpdateCommerceApplicationBindingRequest
  ): Promise<CommerceApplicationBindingRecord> {
    const response = await api.put(`/commerce/application-bindings/${applicationBindingId}`, request)
    return response.data
  },

  async listCommerceOfferOverrides(filters?: {
    applicationBindingId?: string
    status?: CommerceOfferOverrideStatus
  }): Promise<CommerceOfferOverridesResponse> {
    const response = await api.get('/commerce/offer-overrides', {
      params: {
        application_binding_id: filters?.applicationBindingId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceOfferOverride(request: CreateCommerceOfferOverrideRequest): Promise<CommerceOfferOverrideRecord> {
    const response = await api.post('/commerce/offer-overrides', request)
    return response.data
  },

  async updateCommerceOfferOverride(
    offerOverrideId: string,
    request: UpdateCommerceOfferOverrideRequest
  ): Promise<CommerceOfferOverrideRecord> {
    const response = await api.put(`/commerce/offer-overrides/${offerOverrideId}`, request)
    return response.data
  },

  async listCommerceEntitlementGrants(filters?: {
    applicationBindingId?: string
    commercialAccountId?: string
    status?: CommerceEntitlementGrantStatus
  }): Promise<CommerceEntitlementGrantsResponse> {
    const response = await api.get('/commerce/entitlement-grants', {
      params: {
        application_binding_id: filters?.applicationBindingId,
        commercial_account_id: filters?.commercialAccountId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceEntitlementGrant(
    request: CreateCommerceEntitlementGrantRequest
  ): Promise<CommerceEntitlementGrantRecord> {
    const response = await api.post('/commerce/entitlement-grants', request)
    return response.data
  },

  async updateCommerceEntitlementGrant(
    entitlementGrantId: string,
    request: UpdateCommerceEntitlementGrantRequest
  ): Promise<CommerceEntitlementGrantRecord> {
    const response = await api.put(`/commerce/entitlement-grants/${entitlementGrantId}`, request)
    return response.data
  },

  async listCommerceProvisioningGrants(filters?: {
    applicationBindingId?: string
    entitlementGrantId?: string
    status?: CommerceProvisioningGrantStatus
  }): Promise<CommerceProvisioningGrantsResponse> {
    const response = await api.get('/commerce/provisioning-grants', {
      params: {
        application_binding_id: filters?.applicationBindingId,
        entitlement_grant_id: filters?.entitlementGrantId,
        status: filters?.status,
      },
    })
    return response.data
  },

  async createCommerceProvisioningGrant(
    request: CreateCommerceProvisioningGrantRequest
  ): Promise<CommerceProvisioningGrantRecord> {
    const response = await api.post('/commerce/provisioning-grants', request)
    return response.data
  },

  async updateCommerceProvisioningGrant(
    provisioningGrantId: string,
    request: UpdateCommerceProvisioningGrantRequest
  ): Promise<CommerceProvisioningGrantRecord> {
    const response = await api.put(`/commerce/provisioning-grants/${provisioningGrantId}`, request)
    return response.data
  },

  async listCommerceHandoffEvents(filters?: {
    applicationBindingId?: string
    consumerKind?: CommerceConsumerApplicationKind
    deliveryStatus?: CommerceHandoffEventDeliveryStatus
  }): Promise<CommerceHandoffEventsResponse> {
    const response = await api.get('/commerce/handoff-events', {
      params: {
        application_binding_id: filters?.applicationBindingId,
        consumer_kind: filters?.consumerKind,
        delivery_status: filters?.deliveryStatus,
      },
    })
    return response.data
  },

  async getCommerceOperationsSummary(): Promise<CommerceOperationsSummaryResponse> {
    const response = await api.get('/commerce/operations/summary')
    return response.data
  },

  async getCommerceOperationsDiagnostics(): Promise<CommerceOperationsDiagnosticsResponse> {
    const response = await api.get('/commerce/operations/diagnostics')
    return response.data
  },

  async getCommerceOperationsHealth(): Promise<CommerceOperationsHealthResponse> {
    const response = await api.get('/commerce/operations/health')
    return response.data
  },

  async listCommerceOperationsRunbooks(): Promise<CommerceRunbooksResponse> {
    const response = await api.get('/commerce/operations/runbooks')
    return response.data
  },

  async listCommerceBackups(): Promise<CommerceBackupsResponse> {
    const response = await api.get('/commerce/operations/backups')
    return response.data
  },

  async createCommerceBackup(request?: CreateCommerceBackupRequest): Promise<CommerceBackupArtifactRecord> {
    const response = await api.post('/commerce/operations/backups', request ?? {})
    return response.data
  },

  async listCommerceRestores(): Promise<CommerceRestoresResponse> {
    const response = await api.get('/commerce/operations/restores')
    return response.data
  },

  async createCommerceRestore(request: CreateCommerceRestoreRequest): Promise<CommerceRestoreRecord> {
    const response = await api.post('/commerce/operations/restores', request)
    return response.data
  },

  async listCommerceExportArtifacts(): Promise<CommerceExportArtifactsResponse> {
    const response = await api.get('/commerce/operations/exports')
    return response.data
  },

  async createCommerceExportArtifact(request?: CreateCommerceExportArtifactRequest): Promise<CommerceExportArtifactRecord> {
    const response = await api.post('/commerce/operations/exports', request ?? {})
    return response.data
  },

  async listCommerceImportValidations(): Promise<CommerceImportValidationsResponse> {
    const response = await api.get('/commerce/operations/import-validations')
    return response.data
  },

  async createCommerceImportValidation(
    request: CreateCommerceImportValidationRequest
  ): Promise<CommerceImportValidationRecord> {
    const response = await api.post('/commerce/operations/import-validations', request)
    return response.data
  },

  async listCommerceBenchmarkRuns(): Promise<CommerceBenchmarksResponse> {
    const response = await api.get('/commerce/operations/benchmarks')
    return response.data
  },

  async createCommerceBenchmarkRun(): Promise<CommerceBenchmarkRunRecord> {
    const response = await api.post('/commerce/operations/benchmarks', {})
    return response.data
  },

  async listCommerceResilienceRuns(): Promise<CommerceResilienceRunsResponse> {
    const response = await api.get('/commerce/operations/resilience')
    return response.data
  },

  async createCommerceResilienceRun(): Promise<CommerceResilienceRunRecord> {
    const response = await api.post('/commerce/operations/resilience', {})
    return response.data
  },

  async listCommerceReadinessReviews(): Promise<CommerceReadinessReviewsResponse> {
    const response = await api.get('/commerce/operations/readiness-review')
    return response.data
  },

  async createCommerceReadinessReview(
    request?: CreateCommerceReadinessReviewRequest
  ): Promise<CommerceReadinessReviewRecord> {
    const response = await api.post('/commerce/operations/readiness-review', request ?? {})
    return response.data
  },

  async getCommerceReviewSummary(): Promise<CommerceReviewSummaryResponse> {
    const response = await api.get('/commerce/review/summary')
    return response.data
  },

  async getCommerceStandardsMatrix(): Promise<CommerceStandardsMatrixResponse> {
    const response = await api.get('/commerce/review/standards-matrix')
    return response.data
  },

  async getCommerceInteroperabilityReview(): Promise<CommerceInteroperabilityResponse> {
    const response = await api.get('/commerce/review/interoperability')
    return response.data
  },

  async getCommerceDifferentiationReview(): Promise<CommerceDifferentiationResponse> {
    const response = await api.get('/commerce/review/differentiation')
    return response.data
  },

  async listCommerceFormalReviews(): Promise<CommerceFormalReviewsResponse> {
    const response = await api.get('/commerce/review/formal')
    return response.data
  },

  async createCommerceFormalReview(
    request?: CreateCommerceFormalReviewRequest
  ): Promise<CommerceFormalReviewRecord> {
    const response = await api.post('/commerce/review/formal', request ?? {})
    return response.data
  },
}
