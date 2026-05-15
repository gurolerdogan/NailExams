import Purchases, { type CustomerInfo, type PurchasesOfferings } from 'react-native-purchases';
import { Platform } from 'react-native';

/**
 * RevenueCat API keys.
 * To activate: create an app at app.revenuecat.com, then replace these placeholders.
 * In RevenueCat dashboard:
 *   - Create entitlement ID: "plus"
 *   - Create offering ID: "default"
 *   - Add two packages: "$rc_monthly" and "$rc_annual"
 */
const RC_API_KEY_IOS     = 'appl_REPLACE_WITH_YOUR_IOS_KEY';
const RC_API_KEY_ANDROID = 'goog_REPLACE_WITH_YOUR_ANDROID_KEY';

export const PLUS_ENTITLEMENT_ID = 'plus';

export function isRevenueCatConfigured(): boolean {
  return Platform.OS === 'ios'
    ? RC_API_KEY_IOS !== 'appl_REPLACE_WITH_YOUR_IOS_KEY'
    : RC_API_KEY_ANDROID !== 'goog_REPLACE_WITH_YOUR_ANDROID_KEY';
}

export function configureRevenueCat(userId?: string): void {
  const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
  Purchases.configure({ apiKey, appUserID: userId ?? null });
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export function isPlus(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo) return false;
  return (
    typeof customerInfo.entitlements.active[PLUS_ENTITLEMENT_ID] !== 'undefined'
  );
}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    return await Purchases.getOfferings();
  } catch {
    return null;
  }
}

export async function purchasePackage(
  pkg: import('react-native-purchases').PurchasesPackage,
): Promise<{ success: boolean; customerInfo: CustomerInfo | null; error?: string }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: true, customerInfo };
  } catch (e: any) {
    if (e?.userCancelled) return { success: false, customerInfo: null };
    return { success: false, customerInfo: null, error: e?.message ?? 'Purchase failed' };
  }
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.restorePurchases();
  } catch {
    return null;
  }
}

export function addCustomerInfoListener(
  listener: (info: CustomerInfo) => void,
): () => void {
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}
