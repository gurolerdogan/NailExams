import React from 'react';
import { Text, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

const CONF_COLORS = ['#E24B4A', '#EF9F27', '#FAC775', '#97C459', '#1D9E75'];

type Props = {
  cardRef: React.RefObject<any>;
  topicName: string;
  subjectName: string;
  streak: number;
  /** Confidence the topic started at */
  startConf: number;
  /** Number of sessions taken to reach 5 */
  sessionsToNail: number;
};

export default function TopicNailedCard({ cardRef, topicName, subjectName, streak, startConf, sessionsToNail }: Props) {
  return (
    <View style={{ position: 'absolute', left: -9999, top: -9999 }}>
      <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }}>
        <View style={{ width: 360, backgroundColor: '#0A0A0C', borderRadius: 20, overflow: 'hidden' }}>
          {/* Header */}
          <View style={{ backgroundColor: '#1D9E75', padding: 20 }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
              NailExams
            </Text>
            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 4 }}>
              I just nailed a topic
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
              {topicName} · {subjectName}
            </Text>
          </View>

          {/* Body */}
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <Text style={{ color: '#1D9E75', fontSize: 52, fontWeight: '800', lineHeight: 56 }}>5</Text>
              <View>
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Confidence</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[1,2,3,4,5].map((i) => (
                    <View key={i} style={{ width: 18, height: 6, borderRadius: 3, backgroundColor: CONF_COLORS[4] }} />
                  ))}
                </View>
              </View>
            </View>
            {startConf > 0 && startConf < 5 && (
              <Text style={{ color: '#666', fontSize: 11 }}>
                Was at confidence {startConf} · cracked it in {sessionsToNail} session{sessionsToNail !== 1 ? 's' : ''}
              </Text>
            )}
          </View>

          {/* Footer */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 }}>
            {streak > 0 && <Text style={{ color: '#EF9F27', fontSize: 13, fontWeight: '600' }}>🔥 {streak} day streak</Text>}
            <Text style={{ color: '#444', fontSize: 10 }}>nailexams.app</Text>
          </View>
        </View>
      </ViewShot>
    </View>
  );
}
