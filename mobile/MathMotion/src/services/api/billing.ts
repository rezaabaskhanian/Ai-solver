import type { Entitlement } from '../../types/billing';
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

export async function verifyPurchase(purchaseToken: string): Promise<void> {
  try {
    await apiClient.post('/api/v1/billing/verify', { purchase_token: purchaseToken });
  } catch (error) {
    throw toApiError(error);
  }
}
