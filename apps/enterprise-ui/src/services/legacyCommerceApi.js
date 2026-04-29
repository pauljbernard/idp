import { api } from './iamHttpClient';
export const legacyCommerceApi = {
    async getCommerceSummary() {
        const response = await api.get('/commerce/summary');
        return response.data;
    },
    async listCommerceValidationDomains() {
        const response = await api.get('/commerce/validation-domains');
        return response.data;
    },
    async listCommerceCatalogs(filters) {
        const response = await api.get('/commerce/catalogs', {
            params: {
                scope_kind: filters?.scopeKind,
                status: filters?.status,
                validation_domain_id: filters?.validationDomainId,
            },
        });
        return response.data;
    },
    async createCommerceCatalog(request) {
        const response = await api.post('/commerce/catalogs', request);
        return response.data;
    },
    async updateCommerceCatalog(catalogId, request) {
        const response = await api.put(`/commerce/catalogs/${catalogId}`, request);
        return response.data;
    },
    async listCommerceProducts(filters) {
        const response = await api.get('/commerce/products', {
            params: {
                catalog_id: filters?.catalogId,
                product_type: filters?.productType,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceProduct(request) {
        const response = await api.post('/commerce/products', request);
        return response.data;
    },
    async updateCommerceProduct(productId, request) {
        const response = await api.put(`/commerce/products/${productId}`, request);
        return response.data;
    },
    async listCommercePriceBooks(filters) {
        const response = await api.get('/commerce/price-books', {
            params: {
                currency: filters?.currency,
                status: filters?.status,
                catalog_id: filters?.catalogId,
            },
        });
        return response.data;
    },
    async createCommercePriceBook(request) {
        const response = await api.post('/commerce/price-books', request);
        return response.data;
    },
    async updateCommercePriceBook(priceBookId, request) {
        const response = await api.put(`/commerce/price-books/${priceBookId}`, request);
        return response.data;
    },
    async listCommerceOffers(filters) {
        const response = await api.get('/commerce/offers', {
            params: {
                catalog_id: filters?.catalogId,
                product_id: filters?.productId,
                price_book_id: filters?.priceBookId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceOffer(request) {
        const response = await api.post('/commerce/offers', request);
        return response.data;
    },
    async updateCommerceOffer(offerId, request) {
        const response = await api.put(`/commerce/offers/${offerId}`, request);
        return response.data;
    },
    async listCommerceCommercialAccounts(filters) {
        const response = await api.get('/commerce/accounts', {
            params: {
                validation_domain_id: filters?.validationDomainId,
                kind: filters?.kind,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceCommercialAccount(request) {
        const response = await api.post('/commerce/accounts', request);
        return response.data;
    },
    async updateCommerceCommercialAccount(accountId, request) {
        const response = await api.put(`/commerce/accounts/${accountId}`, request);
        return response.data;
    },
    async listCommerceBillingAccounts(filters) {
        const response = await api.get('/commerce/billing-accounts', {
            params: {
                commercial_account_id: filters?.commercialAccountId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceBillingAccount(request) {
        const response = await api.post('/commerce/billing-accounts', request);
        return response.data;
    },
    async updateCommerceBillingAccount(billingAccountId, request) {
        const response = await api.put(`/commerce/billing-accounts/${billingAccountId}`, request);
        return response.data;
    },
    async listCommerceCompanyHierarchy(filters) {
        const response = await api.get('/commerce/company-hierarchy', {
            params: {
                commercial_account_id: filters?.commercialAccountId,
                parent_node_id: filters?.parentNodeId,
            },
        });
        return response.data;
    },
    async createCommerceCompanyHierarchyNode(request) {
        const response = await api.post('/commerce/company-hierarchy', request);
        return response.data;
    },
    async updateCommerceCompanyHierarchyNode(nodeId, request) {
        const response = await api.put(`/commerce/company-hierarchy/${nodeId}`, request);
        return response.data;
    },
    async listCommerceBuyerRoleAssignments(filters) {
        const response = await api.get('/commerce/buyer-roles', {
            params: {
                commercial_account_id: filters?.commercialAccountId,
                role: filters?.role,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceBuyerRoleAssignment(request) {
        const response = await api.post('/commerce/buyer-roles', request);
        return response.data;
    },
    async updateCommerceBuyerRoleAssignment(buyerRoleId, request) {
        const response = await api.put(`/commerce/buyer-roles/${buyerRoleId}`, request);
        return response.data;
    },
    async listCommerceApprovalChains(filters) {
        const response = await api.get('/commerce/approvals', {
            params: {
                commercial_account_id: filters?.commercialAccountId,
                status: filters?.status,
                trigger_kind: filters?.triggerKind,
            },
        });
        return response.data;
    },
    async createCommerceApprovalChain(request) {
        const response = await api.post('/commerce/approvals', request);
        return response.data;
    },
    async updateCommerceApprovalChain(approvalChainId, request) {
        const response = await api.put(`/commerce/approvals/${approvalChainId}`, request);
        return response.data;
    },
    async listCommerceCreditProfiles(filters) {
        const response = await api.get('/commerce/credit', {
            params: {
                commercial_account_id: filters?.commercialAccountId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceCreditProfile(request) {
        const response = await api.post('/commerce/credit', request);
        return response.data;
    },
    async updateCommerceCreditProfile(creditProfileId, request) {
        const response = await api.put(`/commerce/credit/${creditProfileId}`, request);
        return response.data;
    },
    async listCommerceQuotes(filters) {
        const response = await api.get('/commerce/quotes', {
            params: {
                commercial_account_id: filters?.commercialAccountId,
                billing_account_id: filters?.billingAccountId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceQuote(request) {
        const response = await api.post('/commerce/quotes', request);
        return response.data;
    },
    async updateCommerceQuote(quoteId, request) {
        const response = await api.put(`/commerce/quotes/${quoteId}`, request);
        return response.data;
    },
    async convertCommerceQuote(quoteId) {
        const response = await api.post(`/commerce/quotes/${quoteId}/convert`);
        return response.data;
    },
    async listCommerceCarts(filters) {
        const response = await api.get('/commerce/carts', {
            params: {
                commercial_account_id: filters?.commercialAccountId,
                source_quote_id: filters?.sourceQuoteId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceCart(request) {
        const response = await api.post('/commerce/carts', request);
        return response.data;
    },
    async updateCommerceCart(cartId, request) {
        const response = await api.put(`/commerce/carts/${cartId}`, request);
        return response.data;
    },
    async listCommerceCheckoutSessions(filters) {
        const response = await api.get('/commerce/checkout-sessions', {
            params: {
                cart_id: filters?.cartId,
                commercial_account_id: filters?.commercialAccountId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceCheckoutSession(request) {
        const response = await api.post('/commerce/checkout-sessions', request);
        return response.data;
    },
    async completeCommerceCheckoutSession(checkoutSessionId, request) {
        const response = await api.post(`/commerce/checkout-sessions/${checkoutSessionId}/complete`, request ?? {});
        return response.data;
    },
    async listCommerceOrders(filters) {
        const response = await api.get('/commerce/orders', {
            params: {
                commercial_account_id: filters?.commercialAccountId,
                source_quote_id: filters?.sourceQuoteId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async updateCommerceOrder(orderId, request) {
        const response = await api.put(`/commerce/orders/${orderId}`, request);
        return response.data;
    },
    async cancelCommerceOrder(orderId, request) {
        const response = await api.post(`/commerce/orders/${orderId}/cancel`, request);
        return response.data;
    },
    async listCommerceOrderEvents(filters) {
        const response = await api.get('/commerce/order-events', {
            params: {
                order_id: filters?.orderId,
                event_type: filters?.eventType,
            },
        });
        return response.data;
    },
    async listCommerceInventoryLocations(filters) {
        const response = await api.get('/commerce/inventory/locations', {
            params: {
                validation_domain_id: filters?.validationDomainId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceInventoryLocation(request) {
        const response = await api.post('/commerce/inventory/locations', request);
        return response.data;
    },
    async updateCommerceInventoryLocation(locationId, request) {
        const response = await api.put(`/commerce/inventory/locations/${locationId}`, request);
        return response.data;
    },
    async listCommerceInventoryBalances(filters) {
        const response = await api.get('/commerce/inventory/balances', {
            params: {
                location_id: filters?.locationId,
                product_id: filters?.productId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceInventoryBalance(request) {
        const response = await api.post('/commerce/inventory/balances', request);
        return response.data;
    },
    async updateCommerceInventoryBalance(balanceId, request) {
        const response = await api.put(`/commerce/inventory/balances/${balanceId}`, request);
        return response.data;
    },
    async listCommerceAtp(filters) {
        const response = await api.get('/commerce/inventory/atp', {
            params: {
                product_id: filters?.productId,
            },
        });
        return response.data;
    },
    async listCommerceReservations(filters) {
        const response = await api.get('/commerce/reservations', {
            params: {
                order_id: filters?.orderId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceReservation(request) {
        const response = await api.post('/commerce/reservations', request);
        return response.data;
    },
    async updateCommerceReservation(reservationId, request) {
        const response = await api.put(`/commerce/reservations/${reservationId}`, request);
        return response.data;
    },
    async listCommerceAllocations(filters) {
        const response = await api.get('/commerce/allocations', {
            params: {
                order_id: filters?.orderId,
                reservation_id: filters?.reservationId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceAllocation(request) {
        const response = await api.post('/commerce/allocations', request);
        return response.data;
    },
    async updateCommerceAllocation(allocationId, request) {
        const response = await api.put(`/commerce/allocations/${allocationId}`, request);
        return response.data;
    },
    async listCommerceRouting(filters) {
        const response = await api.get('/commerce/routing', {
            params: {
                order_id: filters?.orderId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceRouting(request) {
        const response = await api.post('/commerce/routing', request);
        return response.data;
    },
    async updateCommerceRouting(routingId, request) {
        const response = await api.put(`/commerce/routing/${routingId}`, request);
        return response.data;
    },
    async listCommerceShipments(filters) {
        const response = await api.get('/commerce/shipments', {
            params: {
                order_id: filters?.orderId,
                location_id: filters?.locationId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceShipment(request) {
        const response = await api.post('/commerce/shipments', request);
        return response.data;
    },
    async updateCommerceShipment(shipmentId, request) {
        const response = await api.put(`/commerce/shipments/${shipmentId}`, request);
        return response.data;
    },
    async listCommerceReturns(filters) {
        const response = await api.get('/commerce/returns', {
            params: {
                order_id: filters?.orderId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceReturn(request) {
        const response = await api.post('/commerce/returns', request);
        return response.data;
    },
    async updateCommerceReturn(returnId, request) {
        const response = await api.put(`/commerce/returns/${returnId}`, request);
        return response.data;
    },
    async listCommerceClaims(filters) {
        const response = await api.get('/commerce/claims', {
            params: {
                order_id: filters?.orderId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceClaim(request) {
        const response = await api.post('/commerce/claims', request);
        return response.data;
    },
    async updateCommerceClaim(claimId, request) {
        const response = await api.put(`/commerce/claims/${claimId}`, request);
        return response.data;
    },
    async listCommerceSubscriptions(filters) {
        const response = await api.get('/commerce/subscriptions', {
            params: {
                commercial_account_id: filters?.commercialAccountId,
                billing_account_id: filters?.billingAccountId,
                status: filters?.status,
                offer_id: filters?.offerId,
            },
        });
        return response.data;
    },
    async createCommerceSubscription(request) {
        const response = await api.post('/commerce/subscriptions', request);
        return response.data;
    },
    async updateCommerceSubscription(subscriptionId, request) {
        const response = await api.put(`/commerce/subscriptions/${subscriptionId}`, request);
        return response.data;
    },
    async listCommerceBillingSchedules(filters) {
        const response = await api.get('/commerce/billing-schedules', {
            params: {
                commercial_account_id: filters?.commercialAccountId,
                billing_account_id: filters?.billingAccountId,
                subscription_id: filters?.subscriptionId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceBillingSchedule(request) {
        const response = await api.post('/commerce/billing-schedules', request);
        return response.data;
    },
    async updateCommerceBillingSchedule(scheduleId, request) {
        const response = await api.put(`/commerce/billing-schedules/${scheduleId}`, request);
        return response.data;
    },
    async runCommerceBillingSchedule(scheduleId, request) {
        const response = await api.post(`/commerce/billing-schedules/${scheduleId}/run`, request ?? {});
        return response.data;
    },
    async listCommerceUsageMeters(filters) {
        const response = await api.get('/commerce/usage-meters', {
            params: {
                commercial_account_id: filters?.commercialAccountId,
                billing_account_id: filters?.billingAccountId,
                subscription_id: filters?.subscriptionId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceUsageMeter(request) {
        const response = await api.post('/commerce/usage-meters', request);
        return response.data;
    },
    async updateCommerceUsageMeter(meterId, request) {
        const response = await api.put(`/commerce/usage-meters/${meterId}`, request);
        return response.data;
    },
    async listCommerceUsageEntries(filters) {
        const response = await api.get('/commerce/usage-entries', {
            params: {
                usage_meter_id: filters?.usageMeterId,
            },
        });
        return response.data;
    },
    async recordCommerceUsageEntry(meterId, request) {
        const response = await api.post(`/commerce/usage-meters/${meterId}/entries`, request);
        return response.data;
    },
    async listCommerceInvoices(filters) {
        const response = await api.get('/commerce/invoices', {
            params: {
                commercial_account_id: filters?.commercialAccountId,
                billing_account_id: filters?.billingAccountId,
                subscription_id: filters?.subscriptionId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async updateCommerceInvoice(invoiceId, request) {
        const response = await api.put(`/commerce/invoices/${invoiceId}`, request);
        return response.data;
    },
    async markCommerceInvoicePaid(invoiceId, request) {
        const response = await api.post(`/commerce/invoices/${invoiceId}/mark-paid`, request ?? {});
        return response.data;
    },
    async listCommerceDunningEvents(filters) {
        const response = await api.get('/commerce/dunning', {
            params: {
                invoice_id: filters?.invoiceId,
                billing_account_id: filters?.billingAccountId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceDunningEvent(invoiceId, request) {
        const response = await api.post(`/commerce/invoices/${invoiceId}/dunning`, request);
        return response.data;
    },
    async updateCommerceDunningEvent(dunningEventId, request) {
        const response = await api.put(`/commerce/dunning/${dunningEventId}`, request);
        return response.data;
    },
    async listCommerceAccountsReceivable(filters) {
        const response = await api.get('/commerce/accounts-receivable', {
            params: {
                commercial_account_id: filters?.commercialAccountId,
                billing_account_id: filters?.billingAccountId,
            },
        });
        return response.data;
    },
    async listCommercePaymentProviders(filters) {
        const response = await api.get('/commerce/payment-providers', {
            params: {
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommercePaymentProvider(request) {
        const response = await api.post('/commerce/payment-providers', request);
        return response.data;
    },
    async updateCommercePaymentProvider(providerId, request) {
        const response = await api.put(`/commerce/payment-providers/${providerId}`, request);
        return response.data;
    },
    async listCommercePaymentIntents(filters) {
        const response = await api.get('/commerce/payment-intents', {
            params: {
                commercial_account_id: filters?.commercialAccountId,
                billing_account_id: filters?.billingAccountId,
                status: filters?.status,
                provider_id: filters?.providerId,
            },
        });
        return response.data;
    },
    async createCommercePaymentIntent(request) {
        const response = await api.post('/commerce/payment-intents', request);
        return response.data;
    },
    async confirmCommercePaymentIntent(paymentIntentId, request) {
        const response = await api.post(`/commerce/payment-intents/${paymentIntentId}/confirm`, request ?? {});
        return response.data;
    },
    async listCommercePaymentAttempts(filters) {
        const response = await api.get('/commerce/payment-attempts', {
            params: {
                payment_intent_id: filters?.paymentIntentId,
                provider_id: filters?.providerId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async listCommercePaymentWebhookEvents(filters) {
        const response = await api.get('/commerce/payment-webhooks', {
            params: {
                provider_id: filters?.providerId,
                payment_intent_id: filters?.paymentIntentId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async processCommercePaymentProviderWebhook(providerId, request) {
        const response = await api.post(`/commerce/payment-providers/${providerId}/webhooks`, request);
        return response.data;
    },
    async listCommerceRefunds(filters) {
        const response = await api.get('/commerce/refunds', {
            params: {
                payment_attempt_id: filters?.paymentAttemptId,
                provider_id: filters?.providerId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceRefund(request) {
        const response = await api.post('/commerce/refunds', request);
        return response.data;
    },
    async updateCommerceRefund(refundId, request) {
        const response = await api.put(`/commerce/refunds/${refundId}`, request);
        return response.data;
    },
    async listCommerceDisputes(filters) {
        const response = await api.get('/commerce/disputes', {
            params: {
                payment_attempt_id: filters?.paymentAttemptId,
                provider_id: filters?.providerId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceDispute(request) {
        const response = await api.post('/commerce/disputes', request);
        return response.data;
    },
    async updateCommerceDispute(disputeId, request) {
        const response = await api.put(`/commerce/disputes/${disputeId}`, request);
        return response.data;
    },
    async listCommerceTaxProviders(filters) {
        const response = await api.get('/commerce/tax-providers', {
            params: {
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceTaxProvider(request) {
        const response = await api.post('/commerce/tax-providers', request);
        return response.data;
    },
    async updateCommerceTaxProvider(providerId, request) {
        const response = await api.put(`/commerce/tax-providers/${providerId}`, request);
        return response.data;
    },
    async listCommerceTaxQuotes(filters) {
        const response = await api.get('/commerce/tax/quotes', {
            params: {
                billing_account_id: filters?.billingAccountId,
            },
        });
        return response.data;
    },
    async createCommerceTaxQuote(request) {
        const response = await api.post('/commerce/tax/quotes', request);
        return response.data;
    },
    async listCommerceShippingProviders(filters) {
        const response = await api.get('/commerce/shipping-providers', {
            params: {
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceShippingProvider(request) {
        const response = await api.post('/commerce/shipping-providers', request);
        return response.data;
    },
    async updateCommerceShippingProvider(providerId, request) {
        const response = await api.put(`/commerce/shipping-providers/${providerId}`, request);
        return response.data;
    },
    async listCommerceShippingQuotes(filters) {
        const response = await api.get('/commerce/shipping/quotes', {
            params: {
                order_id: filters?.orderId,
            },
        });
        return response.data;
    },
    async createCommerceShippingQuote(request) {
        const response = await api.post('/commerce/shipping/quotes', request);
        return response.data;
    },
    async listCommerceFraudProviders(filters) {
        const response = await api.get('/commerce/fraud-providers', {
            params: {
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceFraudProvider(request) {
        const response = await api.post('/commerce/fraud-providers', request);
        return response.data;
    },
    async updateCommerceFraudProvider(providerId, request) {
        const response = await api.put(`/commerce/fraud-providers/${providerId}`, request);
        return response.data;
    },
    async listCommerceFraudScreenings(filters) {
        const response = await api.get('/commerce/fraud/screenings', {
            params: {
                commercial_account_id: filters?.commercialAccountId,
                payment_intent_id: filters?.paymentIntentId,
            },
        });
        return response.data;
    },
    async createCommerceFraudScreening(request) {
        const response = await api.post('/commerce/fraud/screenings', request);
        return response.data;
    },
    async getCommerceFinanceSummary() {
        const response = await api.get('/commerce/finance/summary');
        return response.data;
    },
    async listCommerceReconciliationJobs(filters) {
        const response = await api.get('/commerce/reconciliation-jobs', {
            params: {
                status: filters?.status,
                provider_id: filters?.providerId,
            },
        });
        return response.data;
    },
    async createCommerceReconciliationJob(request) {
        const response = await api.post('/commerce/reconciliation-jobs', request ?? {});
        return response.data;
    },
    async listCommerceSettlementReferences(filters) {
        const response = await api.get('/commerce/settlements', {
            params: {
                provider_id: filters?.providerId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async updateCommerceSettlementReference(settlementReferenceId, request) {
        const response = await api.put(`/commerce/settlements/${settlementReferenceId}`, request);
        return response.data;
    },
    async listCommerceRevenueExports(filters) {
        const response = await api.get('/commerce/revenue-exports', {
            params: {
                export_kind: filters?.exportKind,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceRevenueExport(request) {
        const response = await api.post('/commerce/revenue-exports', request);
        return response.data;
    },
    async listCommerceSupportCases(filters) {
        const response = await api.get('/commerce/support-cases', {
            params: {
                case_kind: filters?.caseKind,
                status: filters?.status,
                commercial_account_id: filters?.commercialAccountId,
            },
        });
        return response.data;
    },
    async createCommerceSupportCase(request) {
        const response = await api.post('/commerce/support-cases', request);
        return response.data;
    },
    async updateCommerceSupportCase(supportCaseId, request) {
        const response = await api.put(`/commerce/support-cases/${supportCaseId}`, request);
        return response.data;
    },
    async interveneCommerceSupportCase(supportCaseId, request) {
        const response = await api.post(`/commerce/support-cases/${supportCaseId}/intervene`, request);
        return response.data;
    },
    async getCommerceHandoffSummary() {
        const response = await api.get('/commerce/handoff/summary');
        return response.data;
    },
    async listCommerceApplicationBindings(filters) {
        const response = await api.get('/commerce/application-bindings', {
            params: {
                consumer_kind: filters?.consumerKind,
                status: filters?.status,
                target_consumer_id: filters?.targetConsumerId,
            },
        });
        return response.data;
    },
    async createCommerceApplicationBinding(request) {
        const response = await api.post('/commerce/application-bindings', request);
        return response.data;
    },
    async updateCommerceApplicationBinding(applicationBindingId, request) {
        const response = await api.put(`/commerce/application-bindings/${applicationBindingId}`, request);
        return response.data;
    },
    async listCommerceOfferOverrides(filters) {
        const response = await api.get('/commerce/offer-overrides', {
            params: {
                application_binding_id: filters?.applicationBindingId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceOfferOverride(request) {
        const response = await api.post('/commerce/offer-overrides', request);
        return response.data;
    },
    async updateCommerceOfferOverride(offerOverrideId, request) {
        const response = await api.put(`/commerce/offer-overrides/${offerOverrideId}`, request);
        return response.data;
    },
    async listCommerceEntitlementGrants(filters) {
        const response = await api.get('/commerce/entitlement-grants', {
            params: {
                application_binding_id: filters?.applicationBindingId,
                commercial_account_id: filters?.commercialAccountId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceEntitlementGrant(request) {
        const response = await api.post('/commerce/entitlement-grants', request);
        return response.data;
    },
    async updateCommerceEntitlementGrant(entitlementGrantId, request) {
        const response = await api.put(`/commerce/entitlement-grants/${entitlementGrantId}`, request);
        return response.data;
    },
    async listCommerceProvisioningGrants(filters) {
        const response = await api.get('/commerce/provisioning-grants', {
            params: {
                application_binding_id: filters?.applicationBindingId,
                entitlement_grant_id: filters?.entitlementGrantId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createCommerceProvisioningGrant(request) {
        const response = await api.post('/commerce/provisioning-grants', request);
        return response.data;
    },
    async updateCommerceProvisioningGrant(provisioningGrantId, request) {
        const response = await api.put(`/commerce/provisioning-grants/${provisioningGrantId}`, request);
        return response.data;
    },
    async listCommerceHandoffEvents(filters) {
        const response = await api.get('/commerce/handoff-events', {
            params: {
                application_binding_id: filters?.applicationBindingId,
                consumer_kind: filters?.consumerKind,
                delivery_status: filters?.deliveryStatus,
            },
        });
        return response.data;
    },
    async getCommerceOperationsSummary() {
        const response = await api.get('/commerce/operations/summary');
        return response.data;
    },
    async getCommerceOperationsDiagnostics() {
        const response = await api.get('/commerce/operations/diagnostics');
        return response.data;
    },
    async getCommerceOperationsHealth() {
        const response = await api.get('/commerce/operations/health');
        return response.data;
    },
    async listCommerceOperationsRunbooks() {
        const response = await api.get('/commerce/operations/runbooks');
        return response.data;
    },
    async listCommerceBackups() {
        const response = await api.get('/commerce/operations/backups');
        return response.data;
    },
    async createCommerceBackup(request) {
        const response = await api.post('/commerce/operations/backups', request ?? {});
        return response.data;
    },
    async listCommerceRestores() {
        const response = await api.get('/commerce/operations/restores');
        return response.data;
    },
    async createCommerceRestore(request) {
        const response = await api.post('/commerce/operations/restores', request);
        return response.data;
    },
    async listCommerceExportArtifacts() {
        const response = await api.get('/commerce/operations/exports');
        return response.data;
    },
    async createCommerceExportArtifact(request) {
        const response = await api.post('/commerce/operations/exports', request ?? {});
        return response.data;
    },
    async listCommerceImportValidations() {
        const response = await api.get('/commerce/operations/import-validations');
        return response.data;
    },
    async createCommerceImportValidation(request) {
        const response = await api.post('/commerce/operations/import-validations', request);
        return response.data;
    },
    async listCommerceBenchmarkRuns() {
        const response = await api.get('/commerce/operations/benchmarks');
        return response.data;
    },
    async createCommerceBenchmarkRun() {
        const response = await api.post('/commerce/operations/benchmarks', {});
        return response.data;
    },
    async listCommerceResilienceRuns() {
        const response = await api.get('/commerce/operations/resilience');
        return response.data;
    },
    async createCommerceResilienceRun() {
        const response = await api.post('/commerce/operations/resilience', {});
        return response.data;
    },
    async listCommerceReadinessReviews() {
        const response = await api.get('/commerce/operations/readiness-review');
        return response.data;
    },
    async createCommerceReadinessReview(request) {
        const response = await api.post('/commerce/operations/readiness-review', request ?? {});
        return response.data;
    },
    async getCommerceReviewSummary() {
        const response = await api.get('/commerce/review/summary');
        return response.data;
    },
    async getCommerceStandardsMatrix() {
        const response = await api.get('/commerce/review/standards-matrix');
        return response.data;
    },
    async getCommerceInteroperabilityReview() {
        const response = await api.get('/commerce/review/interoperability');
        return response.data;
    },
    async getCommerceDifferentiationReview() {
        const response = await api.get('/commerce/review/differentiation');
        return response.data;
    },
    async listCommerceFormalReviews() {
        const response = await api.get('/commerce/review/formal');
        return response.data;
    },
    async createCommerceFormalReview(request) {
        const response = await api.post('/commerce/review/formal', request ?? {});
        return response.data;
    },
};
