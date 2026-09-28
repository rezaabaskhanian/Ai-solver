// Mirrors backend/go-api/internal/service/problem/dto.Entitlement.
export interface Entitlement {
  is_premium: boolean;
  free_solves_used: number;
  free_solves_limit: number;
}

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
