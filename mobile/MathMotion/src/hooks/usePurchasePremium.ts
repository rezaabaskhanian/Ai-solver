import { useState } from 'react';

import { toApiError, type ApiError } from '../services/api/apiError';
import { verifyPurchase } from '../services/api/billing';
import { connect, consumePurchase, purchaseProduct } from '../services/billing/poolakey';
import { useEntitlementStore } from '../store/useEntitlementStore';
import type { Plan } from '../types/billing';

interface UsePurchasePremiumResult {
  purchase: (plan: Plan) => Promise<boolean>;
  purchasing: string | null;
  error: ApiError | null;
}

// Buys one plan (monthly etc. — see screens/Premium): connect ->
// purchaseProduct (native Poolakey) -> verifyPurchase (the server checks
// it with Bazaar and adds the plan's days; the client is never trusted)
// -> consumePurchase, so Bazaar lets the same plan be bought again next
// time -> refresh the shared entitlement store so every screen updates.
// Same order as LingoFlow's PaywallScreen. `purchasing` is the product id
// being bought. Resolves true on success.
export function usePurchasePremium(): UsePurchasePremiumResult {
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const refreshEntitlement = useEntitlementStore(state => state.refresh);

  const purchase = async (plan: Plan) => {
    setPurchasing(plan.product_id);
    setError(null);
    try {
      await connect();
      const purchaseToken = await purchaseProduct(plan.product_id);
      await verifyPurchase(plan.product_id, purchaseToken);
      // Best effort: if this fails the purchase stays "owned" in Bazaar,
      // and useRestorePurchases consumes it on the next launch (the server
      // already recorded the token, so no days are granted twice).
      await consumePurchase(purchaseToken).catch(() => {});
      await refreshEntitlement();
      return true;
    } catch (err) {
      setError(toApiError(err));
      return false;
    } finally {
      setPurchasing(null);
    }
  };

  return { purchase, purchasing, error };
}
