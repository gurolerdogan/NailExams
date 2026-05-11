import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text } from 'react-native';

type State = { hasError: boolean; error: Error | null };

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          {this.state.error?.message ?? 'An unexpected error occurred.'}
        </Text>
        <Pressable
          style={styles.btn}
          onPress={() => this.setState({ hasError: false, error: null })}
        >
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, backgroundColor: '#F2F2F7',
  },
  emoji: { fontSize: 40, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '600', color: '#1C1C1E', marginBottom: 8, textAlign: 'center' },
  body: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 19, marginBottom: 28 },
  btn: {
    backgroundColor: '#1C1C1E', borderRadius: 14,
    paddingVertical: 13, paddingHorizontal: 28,
  },
  btnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
