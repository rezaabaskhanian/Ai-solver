import { useEffect } from 'react';

import { PREMIUM_PRODUCT_ID } from '../config/env';
import { verifyPurchase } from '../services/api/billing';
import { consumePurchase, isPurchaseSupported, queryOwnedPurchases } from '../services/billing/poolakey';
import { useEntitlementStore } from '../store/useEntitlementStore';

// Runs once at startup against whatever the user's Cafe Bazaar account
// still owns:
//
// - The old lifetime unlock is never consumed, so it's always listed.
//   There are no real accounts (device-scoped only — backend/BACKEND.md
//   §4.1), so replaying its token re-links Premium to this install's
//   device_id after a reinstall.
// - A plan purchase is normally consumed right after it's verified
//   (usePurchasePremium). One still listed means that step was cut short
//   (app killed, network dropped): verify it now — the server grants its
//   days only once per token — then consume it.
export function useRestorePurchases(): void {
  const refresh = useEntitlementStore(state => state.refresh);

  useEffect(() => {
    if (!isPurchaseSupported()) {
      return;
    }

    queryOwnedPurchases()
      .then(async owned => {
        if (owned.length === 0) {
          return;
        }
        for (const p of owned) {
          await verifyPurchase(p.productId, p.purchaseToken);
          if (p.productId !== PREMIUM_PRODUCT_ID) {
            await consumePurchase(p.purchaseToken).catch(() => {});
          }
        }
        await refresh();
      })
      .catch(() => {
        // Best-effort background sync — a failure here just means the
        // user stays on their current tier until the next launch.
      });
  }, [refresh]);
}
