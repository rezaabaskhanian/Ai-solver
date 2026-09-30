import type { Entitlement, Plan } from '../../types/billing';
import { apiClient } from './client';
import { toApiError } from './apiError';

export async function fetchEntitlement(): Promise<Entitlement> {
  try {
    const { data } = await apiClient.get<Entitlement>('/api/v1/entitlement');
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function fetchPlans(): Promise<Plan[]> {
  try {
    const { data } = await apiClient.get<{ plans: Plan[] }>('/api/v1/billing/plans');
    return data.plans;
  } catch (error) {
    throw toApiError(error);
  }
}

// productId picks what the purchase grants: a plan's days, or the old
// lifetime unlock (PREMIUM_PRODUCT_ID).
export async function verifyPurchase(productId: string, purchaseToken: string): Promise<void> {
  try {
    await apiClient.post('/api/v1/billing/verify', { product_id: productId, purchase_token: purchaseToken });
  } catch (error) {
    throw toApiError(error);
  }
}
