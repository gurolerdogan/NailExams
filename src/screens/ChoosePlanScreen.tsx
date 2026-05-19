import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PACKAGE_TYPE } from 'react-native-purchases';
import type { PurchasesPackage } from 'react-native-purchases';

import { useTheme } from '../context/ThemeContext';
import { usePlus } from '../context/PlusContext';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isPlus,
  isRevenueCatConfigured,
} from '../services/purchases/purchasesService';
import { logEvent } from '../services/logging/logEvent';
import type { Theme } from '../themes';

const PRIVACY_POLICY_URL = 'https://gurolerdogan.github.io/NailExams/privacy';
const TERMS_URL          = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.screenBg },
    content: { padding: 20, paddingBottom: 48 },

    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#EAF3DE',
      borderRadius: 12,
      padding: 14,
      marginBottom: 24,
    },
    statusBadgeText: { fontSize: 14, fontWeight: '700', color: '#27500A' },

    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      color: theme.colors.sectionLabel,
      marginBottom: 12,
    },

    plansContainer: { gap: 12, marginBottom: 24 },

    planCard: {
      borderRadius: 16,
      borderWidth: 2,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.cardBg,
      padding: 16,
      overflow: 'hidden',
    },
    planCardSelected: {
      borderColor: theme.colors.buttonPrimaryBg,
    },

    recommendedBadge: {
      position: 'absolute',
      top: 0, right: 0,
      backgroundColor: theme.colors.buttonPrimaryBg,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderBottomLeftRadius: 12,
    },
    recommendedText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.buttonPrimaryText,
      letterSpacing: 0.4,
    },

    planRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    radio: {
      width: 22, height: 22, borderRadius: 11,
      borderWidth: 2, borderColor: theme.colors.cardBorder,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    radioSelected: { borderColor: theme.colors.buttonPrimaryBg },
    radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: theme.colors.buttonPrimaryBg },

    planInfo: { flex: 1 },
    planTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 2 },
    planSubtitle: { fontSize: 12, color: theme.colors.textMuted },
    planPrice: { alignItems: 'flex-end' },
    planPriceMain: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
    planPriceUnit: { fontSize: 11, color: theme.colors.textMuted },
    planSaving: {
      fontSize: 11, fontWeight: '600', color: '#27500A',
      backgroundColor: '#EAF3DE', borderRadius: 6,
      paddingHorizontal: 6, paddingVertical: 2, marginTop: 4,
    },

    ctaBtn: {
      backgroundColor: theme.colors.buttonPrimaryBg,
      borderRadius: theme.radii.button,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 12,
    },
    ctaBtnDisabled: { opacity: 0.5 },
    ctaText: { fontSize: 16, fontWeight: '700', color: theme.colors.buttonPrimaryText },

    restoreBtn: { alignItems: 'center', paddingVertical: 8, marginBottom: 16 },
    restoreText: { fontSize: 13, color: theme.colors.textMuted },

    legal: {
      textAlign: 'center', fontSize: 11, color: theme.colors.textMuted,
      lineHeight: 16, marginBottom: 12,
    },
    legalLinks: {
      flexDirection: 'row', justifyContent: 'center',
      alignItems: 'center', gap: 8,
    },
    legalLink: {
      fontSize: 12, color: theme.colors.accent,
      fontWeight: '500', textDecorationLine: 'underline',
    },
    legalLinkSep: { fontSize: 12, color: theme.colors.textMuted },
  });
}

export default function ChoosePlanScreen() {
  const navigation = useNavigation();
  const { theme }  = useTheme();
  const { isPlus: userIsPlus, refreshPlus } = usePlus();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const [offerings, setOfferings]     = useState<Awaited<ReturnType<typeof getOfferings>>>(null);
  const [selectedPkg, setSelectedPkg] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading]         = useState(true);
  const [purchasing, setPurchasing]   = useState(false);
  const [restoring, setRestoring]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const o = await getOfferings();
    setOfferings(o);
    // Pre-select annual
    const annual = o?.current?.annual ?? o?.current?.availablePackages.find(
      (p) => p.packageType === PACKAGE_TYPE.ANNUAL,
    );
    setSelectedPkg(annual ?? o?.current?.availablePackages[0] ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const packages = offerings?.current?.availablePackages ?? [];
  const monthly  = packages.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY);
  const annual   = packages.find((p) => p.packageType === PACKAGE_TYPE.ANNUAL);

  // Derive per-month equivalent for annual plan
  const annualPerMonth = useMemo(() => {
    if (!annual) return null;
    const perMonth = annual.product.price / 12;
    const symbol = annual.product.priceString.replace(/[\d.,\s]+/, '').trim() || '£';
    return `${symbol}${perMonth.toFixed(2)}/mo`;
  }, [annual]);

  const onSubscribe = async () => {
    if (!selectedPkg || purchasing) return;
    setPurchasing(true);
    const result = await purchasePackage(selectedPkg);
    setPurchasing(false);
    if (result.success) {
      await refreshPlus();
      void logEvent('plan_purchased_from_settings', { packageId: selectedPkg.identifier });
      navigation.goBack();
    } else if (result.error) {
      Alert.alert('Purchase failed', result.error);
    }
  };

  const onRestore = async () => {
    setRestoring(true);
    const info = await restorePurchases();
    await refreshPlus();
    setRestoring(false);
    if (isPlus(info)) {
      Alert.alert('Restored!', 'NailExams Plus has been restored.');
      void logEvent('plus_restored_from_settings');
      navigation.goBack();
    } else {
      Alert.alert('Nothing to restore', 'No active Plus subscription found for this Apple ID.');
    }
  };

  if (!isRevenueCatConfigured()) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { alignItems: 'center', paddingTop: 60 }]}>
        <Text style={{ fontSize: 32 }}>🔧</Text>
        <Text style={[styles.legal, { marginTop: 12 }]}>
          Purchases not configured yet.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Current status */}
      {userIsPlus && (
        <View style={styles.statusBadge}>
          <Text style={{ fontSize: 18 }}>✅</Text>
          <Text style={styles.statusBadgeText}>You're on NailExams Plus</Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>Select a plan</Text>

      {loading ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginVertical: 32 }} />
      ) : (
        <View style={styles.plansContainer}>

          {/* Annual — recommended */}
          {annual && (
            <Pressable
              style={[styles.planCard, selectedPkg?.identifier === annual.identifier && styles.planCardSelected]}
              onPress={() => setSelectedPkg(annual)}
            >
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>RECOMMENDED</Text>
              </View>

              <View style={[styles.planRow, { marginTop: 8 }]}>
                <View style={[styles.radio, selectedPkg?.identifier === annual.identifier && styles.radioSelected]}>
                  {selectedPkg?.identifier === annual.identifier && <View style={styles.radioDot} />}
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planTitle}>NailExams Plus — Annual</Text>
                  <Text style={styles.planSubtitle}>Billed once per year</Text>
                  {annualPerMonth && (
                    <Text style={styles.planSaving}>Save vs monthly · {annualPerMonth}</Text>
                  )}
                </View>
                <View style={styles.planPrice}>
                  <Text style={styles.planPriceMain}>{annual.product.priceString}</Text>
                  <Text style={styles.planPriceUnit}>/year</Text>
                </View>
              </View>
            </Pressable>
          )}

          {/* Monthly */}
          {monthly && (
            <Pressable
              style={[styles.planCard, selectedPkg?.identifier === monthly.identifier && styles.planCardSelected]}
              onPress={() => setSelectedPkg(monthly)}
            >
              <View style={styles.planRow}>
                <View style={[styles.radio, selectedPkg?.identifier === monthly.identifier && styles.radioSelected]}>
                  {selectedPkg?.identifier === monthly.identifier && <View style={styles.radioDot} />}
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planTitle}>NailExams Plus — Monthly</Text>
                  <Text style={styles.planSubtitle}>Billed every month · cancel anytime</Text>
                </View>
                <View style={styles.planPrice}>
                  <Text style={styles.planPriceMain}>{monthly.product.priceString}</Text>
                  <Text style={styles.planPriceUnit}>/month</Text>
                </View>
              </View>
            </Pressable>
          )}

          {packages.length === 0 && (
            <Text style={[styles.legal, { marginVertical: 16 }]}>
              Pricing unavailable — check your connection and try again.
            </Text>
          )}
        </View>
      )}

      {/* CTA */}
      <Pressable
        style={[styles.ctaBtn, (purchasing || loading || !selectedPkg) && styles.ctaBtnDisabled]}
        onPress={onSubscribe}
        disabled={purchasing || loading || !selectedPkg}
      >
        {purchasing
          ? <ActivityIndicator color={theme.colors.buttonPrimaryText} />
          : <Text style={styles.ctaText}>
              {selectedPkg ? `Subscribe · ${selectedPkg.product.priceString}` : 'Subscribe'}
            </Text>
        }
      </Pressable>

      {/* Restore */}
      <Pressable style={styles.restoreBtn} onPress={onRestore} disabled={restoring}>
        <Text style={styles.restoreText}>{restoring ? 'Restoring…' : 'Restore purchase'}</Text>
      </Pressable>

      {/* Legal */}
      <Text style={styles.legal}>
        Payment charged to your Apple ID at confirmation. Subscription renews automatically
        unless cancelled at least 24 hours before the end of the current period.
        Manage or cancel in your Apple ID Settings.
      </Text>
      <View style={styles.legalLinks}>
        <Pressable onPress={() => void Linking.openURL(TERMS_URL)} hitSlop={8}>
          <Text style={styles.legalLink}>Terms of Use</Text>
        </Pressable>
        <Text style={styles.legalLinkSep}>·</Text>
        <Pressable onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)} hitSlop={8}>
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </Pressable>
      </View>

    </ScrollView>
  );
}
