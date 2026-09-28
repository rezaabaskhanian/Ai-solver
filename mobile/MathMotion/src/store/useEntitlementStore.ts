import { create } from 'zustand';

import { fetchEntitlement } from '../services/api/billing';

interface EntitlementState {
  isPremium: boolean;
  freeSolvesUsed: number;
  freeSolvesLimit: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

// Not persisted (unlike useLanguageStore) — this is server-owned state,
// always refetched, since a stale local cache would defeat the whole
// point of gating Solve on the backend's own quota (backend/go-api's
// problemservice.Entitlement is the source of truth, not this store).
export const useEntitlementStore = create<EntitlementState>((set) => ({
  isPremium: false,
  freeSolvesUsed: 0,
  freeSolvesLimit: 5,
  loading: true,
  refresh: async () => {
    set({ loading: true });
    try {
      const entitlement = await fetchEntitlement();
      set({
        isPremium: entitlement.is_premium,
        freeSolvesUsed: entitlement.free_solves_used,
        freeSolvesLimit: entitlement.free_solves_limit,
        loading: false,
      });
    } catch {
      // Leave whatever entitlement state we already had — Solve's own
      // 402 response is the authoritative fallback if this is stale.
      set({ loading: false });
    }
  },
}));
