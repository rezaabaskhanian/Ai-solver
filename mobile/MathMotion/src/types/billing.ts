// Mirrors backend/go-api/internal/service/problem/dto.Entitlement.
export interface Entitlement {
  is_premium: boolean;
  // Free-tier usage (solves + scans + checks) in the current period.
  free_solves_used: number;
  free_solves_limit: number;
  // Set in the admin panel: 'daily' (resets at Tehran midnight) or 'lifetime'.
  quota_period?: QuotaPeriod;
  resets_at?: string;
  // Premium: scans used today and the daily cap (0 = no cap).
  premium_scans_used?: number;
  premium_scan_limit?: number;
  // Who this device is (shown in Settings, for the operator to find it in
  // the admin panel) and which kind of Premium it has.
  user_code?: string;
  premium_until?: string;
  premium_lifetime?: boolean;
  is_unlimited?: boolean;
}

// A Cafe Bazaar in-app product that adds duration_days of Premium
// (backend/go-api/internal/service/billing.Plan).
export interface Plan {
  id: string;
  name: string;
  duration_days: number;
  price_toman: number;
  product_id: string;
}

export type QuotaPeriod = 'daily' | 'lifetime';

// Returned by the native Poolakey wrapper (src/services/billing/poolakey.ts).
export interface OwnedPurchase {
  productId: string;
  purchaseToken: string;
}

// Bazaar's SkuDetails.price is already a complete, localized display
// string (e.g. "10,000 تومان") — there's no separate currency field.
export interface ProductPrice {
  price: string;
}
