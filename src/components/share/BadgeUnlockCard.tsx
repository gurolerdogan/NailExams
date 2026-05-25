import React from 'react';
import { Text, View } from 'react-native';
import ViewShot from 'react-native-view-shot';
import type { BadgeDefinition } from '../../types/badges';

const TIER_BG: Record<string, string> = {
  Bronze: '#EAF3DE', Silver: '#F4F4F6', Gold: '#FAEEDA', Special: '#EEEDFE',
};
const TIER_TEXT: Record<string, string> = {
  Bronze: '#27500A', Silver: '#3C3C43', Gold: '#633806', Special: '#3C3489',
};

type Props = {
  cardRef: React.RefObject<any>;
  badge: BadgeDefinition;
  streak: number;
};

export default function BadgeUnlockCard({ cardRef, badge, streak }: Props) {
  const bg   = TIER_BG[badge.tier] ?? '#EEEDFE';
  const text = TIER_TEXT[badge.tier] ?? '#3C3489';
  return (
    <View style={{ position: 'absolute', left: -9999, top: -9999 }}>
      <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }}>
        <View style={{ width: 360, backgroundColor: '#0A0A0C', borderRadius: 20, overflow: 'hidden' }}>
          <View style={{ backgroundColor: '#3C3489', padding: 20 }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>NailExams</Text>
            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 4 }}>Badge unlocked</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{badge.tier} badge</Text>
          </View>
          <View style={{ padding: 24, alignItems: 'center' }}>
            <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 36 }}>{badge.emoji}</Text>
            </View>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800', marginBottom: 6 }}>{badge.name}</Text>
            <Text style={{ color: '#888', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>{badge.description}</Text>
            <View style={{ marginTop: 14, backgroundColor: bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 5 }}>
              <Text style={{ color: text, fontSize: 12, fontWeight: '700' }}>{badge.tier}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 }}>
            {streak > 0 && <Text style={{ color: '#EF9F27', fontSize: 13, fontWeight: '600' }}>🔥 {streak} day streak</Text>}
            <Text style={{ color: '#444', fontSize: 10 }}>nailexams.app</Text>
          </View>
        </View>
      </ViewShot>
    </View>
  );
}
