import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type Props = {
  icon: IoniconName;
  title: string;
  body: string;
  cta?: string;
  onCta?: () => void;
};

export default function EmptyState({ icon, title, body, cta, onCta }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={42} color="#C7C7CC" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {cta && onCta && (
        <Pressable style={styles.btn} onPress={onCta}>
          <Text style={styles.btnText}>{cta}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#F0F0F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 6,
    textAlign: 'center',
  },
  body: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 22,
  },
  btnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
