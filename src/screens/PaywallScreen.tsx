import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { PurchasesPackage } from 'react-native-purchases';
import { PACKAGE_TYPE } from 'react-native-purchases';

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

const FEATURES = [
  { icon: '📚', label: 'Unlimited subjects', sub: 'Free plan is limited to 3' },
  { icon: '📅', label: '60 & 90-day study plans', sub: 'Free plan: 30 days only' },
  { icon: '✏️', label: 'Manual planning mode', sub: 'Pick topics day-by-day' },
  { icon: '🎨', label: 'All themes', sub: 'Unlock every colour theme' },
  { icon: '📝', label: 'Topic notes', sub: 'Attach notes to any topic' },
];

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.screenBg },
    content:   { padding: 20, paddingBottom: 48 },

    header: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
    badge: {
      backgroundColor: '#FAC775',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 4,
      marginBottom: 12,
    },
    badgeText: { fontSize: 11, fontWeight: '700', color: '#633806', letterSpacing: 0.5 },
    title:  { fontSize: 26, fontWeight: '700', color: theme.colors.textPrimary, textAlign: 'center', marginBottom: 6 },
    subtitle: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20 },

    featureList: { marginBottom: 24 },
    featureRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 11,
      borderBottomWidth: 0.5, borderBottomColor: theme.colors.divider,
    },
    featureIcon: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: theme.colors.cardBg,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    featureIconText: { fontSize: 18 },
    featureLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
    featureSub:   { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },

    plansRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    planCard: {
      flex: 1, borderRadius: 14, padding: 14,
      backgroundColor: theme.colors.cardBg,
      borderWidth: 2, borderColor: theme.colors.cardBorder,
      alignItems: 'center',
    },
    planCardActive: { borderColor: theme.colors.buttonPrimaryBg },
    planBestValue: {
      backgroundColor: theme.colors.buttonPrimaryBg,
      borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
      marginBottom: 6,
    },
    planBestValueText: { fontSize: 10, fontWeight: '700', color: theme.colors.buttonPrimaryText },
    planPeriod: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 4 },
    planPrice:  { fontSize: 22, fontWeight: '700', color: theme.colors.textPrimary },
    planUnit:   { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },

    ctaBtn: {
      backgroundColor: theme.colors.buttonPrimaryBg,
      borderRadius: theme.radii.button,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 12,
    },
    ctaBtnDisabled: { opacity: 0.5 },
    ctaText: { fontSize: 16, fontWeight: '700', color: theme.colors.buttonPrimaryText },

    restoreBtn: { alignItems: 'center', paddingVertical: 8 },
    restoreText: { fontSize: 13, color: theme.colors.textMuted },

    legal: {
      textAlign: 'center', fontSize: 11, color: theme.colors.textMuted,
      marginTop: 16, lineHeight: 16,
    },

    alreadyPlus: {
      alignItems: 'center', padding: 40, gap: 12,
    },
    alreadyPlusEmoji: { fontSize: 48 },
    alreadyPlusTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary },
    alreadyPlusSub:   { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },

    notConfigured: {
      alignItems: 'center', padding: 40, gap: 8,
    },
    notConfiguredText: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 20 },
  });
}

export default function PaywallScreen() {
  const navigation = useNavigation();
  const { theme }  = useTheme();
  const { isPlus: userIsPlus, refreshPlus } = usePlus();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const [offerings, setOfferings]           = useState<Awaited<ReturnType<typeof getOfferings>>>(null);
  const [selectedPkg, setSelectedPkg]       = useState<PurchasesPackage | null>(null);
  const [loading, setLoading]               = useState(true);
  const [purchasing, setPurchasing]         = useState(false);
  const [restoring, setRestoring]           = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const o = await getOfferings();
    setOfferings(o);
    // Pre-select the annual package (best value) if available
    const annual = o?.current?.annual ?? o?.current?.availablePackages.find(
      (p) => p.packageType === PACKAGE_TYPE.ANNUAL,
    );
    setSelectedPkg(annual ?? o?.current?.availablePackages[0] ?? null);
    setLoading(false);
    void logEvent('paywall_viewed');
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onPurchase = async () => {
    if (!selectedPkg || purchasing) return;
    setPurchasing(true);
    const result = await purchasePackage(selectedPkg);
    setPurchasing(false);
    if (result.success) {
      await refreshPlus();
      void logEvent('plus_purchased', { packageId: selectedPkg.identifier });
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
      void logEvent('plus_restored');
      navigation.goBack();
    } else {
      Alert.alert('Nothing to restore', 'No active Plus subscription found for this Apple ID.');
    }
  };

  if (userIsPlus) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.alreadyPlus}>
        <Text style={styles.alreadyPlusEmoji}>🎉</Text>
        <Text style={styles.alreadyPlusTitle}>You're on Plus!</Text>
        <Text style={styles.alreadyPlusSub}>All features are unlocked. Thanks for supporting NailExams.</Text>
      </ScrollView>
    );
  }

  if (!isRevenueCatConfigured()) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.notConfigured}>
        <Text style={{ fontSize: 32 }}>🔧</Text>
        <Text style={styles.notConfiguredText}>
          RevenueCat is not configured yet.{'\n'}
          Add your API key in purchasesService.ts to enable in-app purchases.
        </Text>
      </ScrollView>
    );
  }

  const packages = offerings?.current?.availablePackages ?? [];
  const monthly  = packages.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY);
  const annual   = packages.find((p) => p.packageType === PACKAGE_TYPE.ANNUAL);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>NAILEXAMS PLUS</Text>
        </View>
        <Text style={styles.title}>Revise smarter.{'\n'}Nail every exam.</Text>
        <Text style={styles.subtitle}>
          Unlock everything — unlimited subjects, longer plans, and all themes.
        </Text>
      </View>

      {/* Feature list */}
      <View style={styles.featureList}>
        {FEATURES.map((f) => (
          <View key={f.label} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>{f.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureLabel}>{f.label}</Text>
              <Text style={styles.featureSub}>{f.sub}</Text>
            </View>
            <Text style={{ color: '#1D9E75', fontSize: 16, fontWeight: '700' }}>✓</Text>
          </View>
        ))}
      </View>

      {/* Plan picker */}
      {loading ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginBottom: 20 }} />
      ) : packages.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted, textAlign: 'center', marginBottom: 20 }}>
          Pricing unavailable — check your RevenueCat offering setup.
        </Text>
      ) : (
        <View style={styles.plansRow}>
          {annual && (
            <Pressable
              style={[styles.planCard, selectedPkg?.identifier === annual.identifier && styles.planCardActive]}
              onPress={() => setSelectedPkg(annual)}
            >
              <View style={styles.planBestValue}>
                <Text style={styles.planBestValueText}>BEST VALUE</Text>
              </View>
              <Text style={styles.planPeriod}>Annual</Text>
              <Text style={styles.planPrice}>{annual.product.priceString}</Text>
              <Text style={styles.planUnit}>per year</Text>
            </Pressable>
          )}
          {monthly && (
            <Pressable
              style={[styles.planCard, selectedPkg?.identifier === monthly.identifier && styles.planCardActive]}
              onPress={() => setSelectedPkg(monthly)}
            >
              <Text style={styles.planPeriod}>Monthly</Text>
              <Text style={styles.planPrice}>{monthly.product.priceString}</Text>
              <Text style={styles.planUnit}>per month</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* CTA */}
      <Pressable
        style={[styles.ctaBtn, (purchasing || loading || !selectedPkg) && styles.ctaBtnDisabled]}
        onPress={onPurchase}
        disabled={purchasing || loading || !selectedPkg}
      >
        {purchasing
          ? <ActivityIndicator color={theme.colors.buttonPrimaryText} />
          : <Text style={styles.ctaText}>
              {selectedPkg ? `Get Plus · ${selectedPkg.product.priceString}` : 'Get NailExams Plus'}
            </Text>
        }
      </Pressable>

      {/* Restore */}
      <Pressable style={styles.restoreBtn} onPress={onRestore} disabled={restoring}>
        <Text style={styles.restoreText}>{restoring ? 'Restoring…' : 'Restore purchase'}</Text>
      </Pressable>

      <Text style={styles.legal}>
        Payment charged to your Apple ID account at confirmation of purchase.
        Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
        Manage or cancel anytime in your Apple ID Settings.
      </Text>
    </ScrollView>
  );
}
