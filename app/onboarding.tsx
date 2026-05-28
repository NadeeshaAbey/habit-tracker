import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { cardStyle, GlyphTile, MONO } from '@/components/ui';
import { TEMPLATES, CATS, PERIODS } from '@/theme/design';

export default function OnboardingScreen() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState(new Set(['t_water', 't_med']));

  const togglePick = (id: string) => setPicked(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const finish = () => {
    router.replace('/');
  };

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      {/* Progress bar */}
      <View style={[styles.progress, { paddingTop: insets.top + 14 }]}>
        {[0,1,2].map(i => (
          <View key={i} style={{
            flex: i === step ? 2 : 1, height: 3, borderRadius: 2,
            backgroundColor: i <= step ? t.text : t.surfaceMute,
          }}/>
        ))}
        <Pressable onPress={finish} style={{ marginLeft: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ color: t.muted, fontSize: 13 }}>Skip</Text>
        </Pressable>
      </View>

      {/* Step 0 — Welcome */}
      {step === 0 && (
        <View style={styles.centerContent}>
          <View style={{
            width: 140, height: 140, borderRadius: 70,
            backgroundColor: t.accentSoft,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 32, alignSelf: 'center',
          }}>
            <Ionicons name="sparkles" size={48} color={t.accent} />
          </View>
          <Text style={[styles.h1, { color: t.text }]}>
            Small steps,{'\n'}real progress.
          </Text>
          <Text style={[styles.body, { color: t.muted }]}>
            Track gentle daily habits and watch them compound. No streak shaming, just a clearer picture of who you're becoming.
          </Text>
        </View>
      )}

      {/* Step 1 — Pick habits */}
      {step === 1 && (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: 20 }}>
            <Text style={[styles.h1, { color: t.text, fontSize: 24, textAlign: 'left' }]}>
              Start with a few habits
            </Text>
            <Text style={[styles.body, { color: t.muted, textAlign: 'left', marginTop: 4 }]}>
              Pick anywhere from 1 to 5. You can adjust anytime.
            </Text>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 14, gap: 6, paddingBottom: 20 }}>
            {TEMPLATES.slice(0, 9).map(tpl => {
              const dc = CATS.find(c => c.id === tpl.cat);
              const isOn = picked.has(tpl.id);
              return (
                <Pressable
                  key={tpl.id}
                  onPress={() => togglePick(tpl.id)}
                  style={cardStyle(t, {
                    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
                    backgroundColor: isOn ? `${dc?.color}11` : undefined,
                    borderWidth: 1, borderColor: isOn ? `${dc?.color}66` : 'transparent',
                  })}
                >
                  <GlyphTile t={t} glyph={tpl.glyph} color={dc?.color ?? t.accent} size={36} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: t.text, fontSize: 14, fontWeight: '500' }}>{tpl.name}</Text>
                    <Text style={{ ...MONO, color: t.muted, fontSize: 11, marginTop: 2 }}>
                      {dc?.name.toUpperCase()} · {PERIODS.find(p => p.id === tpl.period)?.name.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11,
                    backgroundColor: isOn ? dc?.color : 'transparent',
                    borderWidth: 2, borderColor: isOn ? (dc?.color ?? t.accent) : t.borderStrong,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isOn && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Step 2 — Reminder */}
      {step === 2 && (
        <View style={styles.centerContent}>
          <View style={{
            width: 100, height: 100, borderRadius: 50,
            backgroundColor: t.accentSoft,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 28, alignSelf: 'center',
          }}>
            <Ionicons name="notifications" size={40} color={t.accent} />
          </View>
          <Text style={[styles.h1, { color: t.text, fontSize: 24 }]}>
            One gentle reminder a day
          </Text>
          <Text style={[styles.body, { color: t.muted, marginTop: 12 }]}>
            We'll nudge you once. You can set per-habit reminders later.
          </Text>
          <View style={{ paddingHorizontal: 14, marginTop: 28, width: '100%' }}>
            <View style={cardStyle(t, {
              padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14,
            })}>
              <Ionicons name="notifications-outline" size={20} color={t.muted} />
              <Text style={{ ...MONO, color: t.text, fontSize: 28, fontWeight: '600', letterSpacing: -0.5, flex: 1 }}>
                07:30
              </Text>
              <Text style={{ ...MONO, color: t.muted, fontSize: 12 }}>EVERY DAY</Text>
            </View>
          </View>
        </View>
      )}

      {/* CTA button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 18 }]}>
        <Pressable
          onPress={() => step < 2 ? setStep(step + 1) : finish()}
          style={[styles.ctaBtn, { backgroundColor: t.text }]}
        >
          <Text style={{ color: t.bg, fontSize: 15, fontWeight: '600' }}>
            {step === 2 ? 'Start tracking' : 'Continue'}
          </Text>
          <Ionicons name="chevron-forward" size={15} color={t.bg} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  progress: {
    flexDirection: 'row', paddingHorizontal: 22, paddingBottom: 22, gap: 6, alignItems: 'center',
  },
  centerContent: {
    flex: 1, paddingHorizontal: 22, justifyContent: 'center', paddingBottom: 80,
  },
  h1: {
    fontSize: 30, fontWeight: '600', letterSpacing: -0.7, textAlign: 'center', lineHeight: 36,
  },
  body: {
    fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 16, paddingHorizontal: 14,
  },
  footer: {
    paddingHorizontal: 22, paddingTop: 16,
  },
  ctaBtn: {
    paddingVertical: 14, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
});
