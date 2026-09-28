import { Platform } from 'react-native';
import bazaar, { BazaarNotFoundError } from '@cafebazaar/react-native-poolakey';

import type { OwnedPurchase, ProductPrice } from '../../types/billing';

// Cafe Bazaar (and Poolakey) only exists on Android — there is no iOS
// equivalent, so every export here throws a clear, localizable-by-code
// error on iOS instead of relying on the package's own generic
// "not linked" Proxy error (see @cafebazaar/react-native-poolakey/lib).
class AndroidOnlyError extends Error {
  constructor() {
    super('android_only');
  }
}

function assertAndroid() {
  if (Platform.OS !== 'android') {
    throw new AndroidOnlyError();
  }
}

// We verify every purchase server-side (backend/go-api's Cafe Bazaar
// Purchase Validator call — internal/service/billing), which is
// Poolakey's own documented recommendation when a REST validator is in
// place, so no RSA public key is needed here.
const RSA_KEY = null;

export async function connect(): Promise<void> {
  assertAndroid();
  await bazaar.connect(RSA_KEY);
}

export async function purchaseProduct(productId: string): Promise<string> {
  assertAndroid();
  const result = await bazaar.purchaseProduct(productId);
  return result.purchaseToken;
}

export async function queryOwnedPurchases(): Promise<OwnedPurchase[]> {
  assertAndroid();
  const results = await bazaar.getPurchasedProducts();
  return results.map(r => ({ productId: r.productId, purchaseToken: r.purchaseToken }));
}

export async function getProductPrice(productId: string): Promise<ProductPrice | null> {
  try {
    assertAndroid();
    const [detail] = await bazaar.getInAppSkuDetails([productId]);
    return detail ? { price: detail.price } : null;
  } catch {
    return null;
  }
}

export function isPurchaseSupported(): boolean {
  return Platform.OS === 'android';
}

export { BazaarNotFoundError };
