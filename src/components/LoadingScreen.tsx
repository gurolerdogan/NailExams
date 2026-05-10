import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type Props = {
  title?: string;
  subtitle?: string;
};

export default function LoadingScreen({
  title = 'Loading…',
  subtitle,
}: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { marginTop: 12, fontSize: 16, fontWeight: '600' },
  subtitle: { marginTop: 6, fontSize: 13, textAlign: 'center' },
});