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

// Marks a plan purchase as used up in Bazaar once our server has granted
// its days — otherwise Bazaar treats it as still owned and won't sell the
// same plan again next month.
export async function consumePurchase(purchaseToken: string): Promise<void> {
  assertAndroid();
  await bazaar.consumePurchase(purchaseToken);
}

// Bazaar's own display price for each product ("۱۰۰,۰۰۰ تومان"), by id —
// the real price the user will pay. Empty when Bazaar can't be reached.
export async function getProductPrices(productIds: string[]): Promise<Record<string, ProductPrice>> {
  try {
    assertAndroid();
    const details = await bazaar.getInAppSkuDetails(productIds);
    return Object.fromEntries(details.map(d => [d.sku, { price: d.price }]));
  } catch {
    return {};
  }
}

export function isPurchaseSupported(): boolean {
  return Platform.OS === 'android';
}

export { BazaarNotFoundError };
