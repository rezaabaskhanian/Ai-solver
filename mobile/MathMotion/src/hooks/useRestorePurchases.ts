import { useEffect } from 'react';

import { PREMIUM_PRODUCT_ID } from '../config/env';
import { verifyPurchase } from '../services/api/billing';
import { isPurchaseSupported, queryOwnedPurchases } from '../services/billing/poolakey';
import { useEntitlementStore } from '../store/useEntitlementStore';

// There are no real accounts (device-scoped only — backend/BACKEND.md
// §4.1), so reinstalling the app would otherwise lose Premium even
// though the user's Cafe Bazaar account still owns the product.
// Poolakey's queryOwnedPurchases() reads from that Bazaar account, not
// our device_id, so replaying an already-owned token here re-links
// Premium to whatever device_id this install has — safely idempotent
// thanks to purchases.purchase_token being UNIQUE server-side.
export function useRestorePurchases(): void {
  const refresh = useEntitlementStore(state => state.refresh);

  useEffect(() => {
    if (!isPurchaseSupported()) {
      return;
    }

    queryOwnedPurchases()
      .then(async owned => {
        const premiumPurchase = owned.find(p => p.productId === PREMIUM_PRODUCT_ID);
        if (!premiumPurchase) {
          return;
        }
        await verifyPurchase(premiumPurchase.purchaseToken);
        await refresh();
      })
      .catch(() => {
        // Best-effort background sync — a failure here just means the
        // user stays on the free tier until they purchase again.
      });
  }, [refresh]);
}
