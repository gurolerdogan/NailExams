import React from 'react';
import { Text, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

const CONF_COLORS = ['#E24B4A', '#EF9F27', '#FAC775', '#97C459', '#1D9E75'];

type DomainBar = { label: string; avgConf: number };

type Props = {
  cardRef: React.RefObject<any>;
  subjectName: string;
  topicCount: number;
  domainBars: DomainBar[];
  streak: number;
};

export default function SubjectClearedCard({ cardRef, subjectName, topicCount, domainBars, streak }: Props) {
  return (
    <View style={{ position: 'absolute', left: -9999, top: -9999 }}>
      <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }}>
        <View style={{ width: 360, backgroundColor: '#0A0A0C', borderRadius: 20, overflow: 'hidden' }}>
          <View style={{ backgroundColor: '#633806', padding: 20 }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>NailExams</Text>
            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 4 }}>Subject cleared</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>All {subjectName} topics ≥ 4</Text>
          </View>
          <View style={{ padding: 20 }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 40, marginBottom: 6 }}>🏆</Text>
              <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>{subjectName}</Text>
              <Text style={{ color: '#666', fontSize: 11, marginTop: 2 }}>{topicCount} topics · all confident or above</Text>
            </View>
            {domainBars.slice(0, 4).map((d, i) => {
              const ci = Math.round(d.avgConf) - 1;
              const color = ci >= 0 ? CONF_COLORS[ci] : '#444';
              return (
                <View key={i} style={{ marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={{ color: '#999', fontSize: 10 }}>{d.label}</Text>
                  </View>
                  <View style={{ height: 4, backgroundColor: '#1C1C22', borderRadius: 2 }}>
                    <View style={{ width: `${(d.avgConf / 5) * 100}%`, height: 4, borderRadius: 2, backgroundColor: color }} />
                  </View>
                </View>
              );
            })}
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
