import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Constants from 'expo-constants';
import type { CustomerInfo } from 'react-native-purchases';
import {
  isRevenueCatConfigured,
  getCustomerInfo,
  isPlus as checkIsPlus,
  addCustomerInfoListener,
} from '../services/purchases/purchasesService';

// In Expo Go, RevenueCat native module isn't available — treat as Plus so all
// features can be tested during development.
const PLUS_GATE_BYPASS = Constants.appOwnership === 'expo';

// Subject limits per exam level
export const FREE_SUBJECT_LIMIT        = 3;   // GCSE free (kept for back-compat)
export const FREE_SUBJECT_LIMIT_GCSE   = 3;
export const FREE_SUBJECT_LIMIT_ALEVEL = 1;

export const MAX_SUBJECTS_GCSE         = 15;
export const MAX_SUBJECTS_ALEVEL       = 5;
export const WARN_SUBJECTS_GCSE        = 12;  // soft warning threshold

type PlusState = {
  isPlus: boolean;
  customerInfo: CustomerInfo | null;
  rcReady: boolean;         // false until first CustomerInfo fetch completes
  refreshPlus: () => Promise<void>;
};

const PlusContext = createContext<PlusState | undefined>(undefined);

export function usePlus(): PlusState {
  const ctx = useContext(PlusContext);
  if (!ctx) throw new Error('usePlus must be used within PlusProvider');
  return ctx;
}

export function PlusProvider({ children }: { children: React.ReactNode }) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [rcReady, setRcReady]           = useState(false);

  const refreshPlus = useCallback(async () => {
    if (!isRevenueCatConfigured()) {
      setRcReady(true);
      return;
    }
    const info = await getCustomerInfo();
    setCustomerInfo(info);
    setRcReady(true);
  }, []);

  // Initial fetch
  useEffect(() => { void refreshPlus(); }, [refreshPlus]);

  // Live updates from RevenueCat (e.g. after purchase, renewal)
  useEffect(() => {
    if (!isRevenueCatConfigured()) return;
    const unsub = addCustomerInfoListener((info) => setCustomerInfo(info));
    return unsub;
  }, []);

  const value = useMemo<PlusState>(
    () => ({
      isPlus: PLUS_GATE_BYPASS || checkIsPlus(customerInfo),
      customerInfo,
      rcReady,
      refreshPlus,
    }),
    [customerInfo, rcReady, refreshPlus],
  );

  return <PlusContext.Provider value={value}>{children}</PlusContext.Provider>;
}
