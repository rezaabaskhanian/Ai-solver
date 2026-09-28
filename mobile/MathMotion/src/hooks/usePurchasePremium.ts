import { useState } from 'react';

import { PREMIUM_PRODUCT_ID } from '../config/env';
import { toApiError, type ApiError } from '../services/api/apiError';
import { verifyPurchase } from '../services/api/billing';
import { connect, purchaseProduct } from '../services/billing/poolakey';
import { useEntitlementStore } from '../store/useEntitlementStore';

interface UsePurchasePremiumResult {
  purchase: () => Promise<void>;
  purchasing: boolean;
  error: ApiError | null;
}

// Orchestrates connect -> purchaseProduct (native Poolakey call) ->
// verifyPurchase (server-side confirmation, never trusting the client)
// -> refreshing the shared entitlement store so every screen reading
// it (Home's badge, ProblemInput's paywall) updates immediately.
export function usePurchasePremium(): UsePurchasePremiumResult {
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const refreshEntitlement = useEntitlementStore(state => state.refresh);

  const purchase = async () => {
    setPurchasing(true);
    setError(null);
    try {
      await connect();
      const purchaseToken = await purchaseProduct(PREMIUM_PRODUCT_ID);
      await verifyPurchase(purchaseToken);
      await refreshEntitlement();
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setPurchasing(false);
    }
  };

  return { purchase, purchasing, error };
}
