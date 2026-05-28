import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { cardStyle, GlyphTile, PeriodIcon, IconBtn, MONO } from '@/components/ui';
import { addHabit, getHabitById, updateHabit } from '@/db/repositories/habits';
import { listCategories } from '@/db/repositories/categories';
import { TEMPLATES, GLYPHS, PERIODS, CATS } from '@/theme/design';
import type { Period, Habit, Category } from '@/types';

export default function NewHabitScreen() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { editId } = useLocalSearchParams<{ editId?: string }>();

  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(!!editId);

  // Step 0 = template picker, step 1 = customize
  const [step, setStep] = useState(editId ? 1 : 0);

  const [name, setName] = useState('');
  const [glyph, setGlyph] = useState('●');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [target, setTarget] = useState(1);
  const [period, setPeriod] = useState<Period>('anytime');
  const [reminders, setReminders] = useState<string[]>(['09:00']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      const cats = await listCategories();
      setCategories(cats);
      if (editId) {
        const h = await getHabitById(Number(editId));
        if (h) {
          setEditingHabit(h);
          setName(h.name);
          setGlyph(h.glyph);
          setCategoryId(h.categoryId);
          setTarget(h.targetPerDay);
          setPeriod(h.period);
          setReminders(h.reminders.length ? h.reminders : ['09:00']);
        }
      } else if (cats.length > 0) {
        setCategoryId(cats[0].id);
      }
      setLoading(false);
    };
    init();
  }, [editId]);

  const onTemplate = (tpl: typeof TEMPLATES[number]) => {
    setName(tpl.name);
    setGlyph(tpl.glyph);
    setPeriod(tpl.period as Period);
    setTarget(tpl.target);
    // Try to match design cat name to a real DB category
    const designCat = CATS.find(c => c.id === tpl.cat);
    if (designCat) {
      const dbCat = categories.find(c => c.name.toLowerCase() === designCat.name.toLowerCase());
      if (dbCat) setCategoryId(dbCat.id);
    }
    setReminders(['09:00']);
    setStep(1);
  };

  const onSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    if (editingHabit) {
      await updateHabit(editingHabit.id, name.trim(), categoryId, target, glyph, period, reminders);
    } else {
      await addHabit(name.trim(), categoryId, target, glyph, period, reminders);
    }
    router.back();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg }}>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }

  const catColor = categories.find(c => c.id === categoryId)?.color ?? t.accent;
  const isEditing = !!editingHabit;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <IconBtn t={t} onPress={() => {
          if (step === 1 && !isEditing) setStep(0);
          else router.back();
        }}>
          <Ionicons name={step === 0 || isEditing ? 'close' : 'chevron-back'} size={20} color={t.text} />
        </IconBtn>
        <Text style={{ flex: 1, color: t.text, fontSize: 15, fontWeight: '600', marginLeft: 4 }}>
          {isEditing ? 'Edit habit' : step === 0 ? 'New habit' : 'Customize'}
        </Text>
        {step === 1 && (
          <Pressable
            onPress={onSave}
            disabled={!name.trim() || saving}
            style={{
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100,
              backgroundColor: name.trim() ? t.text : t.surfaceMute,
              opacity: saving ? 0.6 : 1,
            }}
          >
            <Text style={{ color: name.trim() ? t.bg : t.subtle, fontSize: 13, fontWeight: '500' }}>
              {isEditing ? 'Save' : 'Add habit'}
            </Text>
          </Pressable>
        )}
      </View>

      {step === 0 ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 22 }}>
            <Text style={{ color: t.text, fontSize: 24, fontWeight: '600', letterSpacing: -0.4 }}>
              Pick a starter
            </Text>
            <Text style={{ color: t.muted, fontSize: 13, marginTop: 6, lineHeight: 20 }}>
              Quick templates with sensible defaults. You can change everything next.
            </Text>
          </View>

          {/* From scratch */}
          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            <Pressable
              onPress={() => {
                setName(''); setGlyph('●'); setTarget(1); setPeriod('anytime'); setReminders(['09:00']);
                if (categories.length > 0) setCategoryId(categories[0].id);
                setStep(1);
              }}
              style={[cardStyle(t, {
                padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
                borderStyle: 'dashed', borderWidth: 1, borderColor: t.borderStrong,
                backgroundColor: 'transparent',
              })]}
            >
              <View style={{
                width: 38, height: 38, borderRadius: 12,
                backgroundColor: t.surfaceMute, alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="add" size={20} color={t.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: t.text }}>From scratch</Text>
                <Text style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>Define everything yourself</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={t.subtle} />
            </Pressable>
          </View>

          {/* Templates grouped by design category */}
          {CATS.map(dc => {
            const items = TEMPLATES.filter(tpl => tpl.cat === dc.id);
            return (
              <View key={dc.id} style={{ marginBottom: 12 }}>
                <View style={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dc.color }}/>
                  <Text style={{ ...MONO, color: t.muted, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                    {dc.name}
                  </Text>
                </View>
                <View style={{ paddingHorizontal: 14, gap: 6 }}>
                  {items.map(tpl => (
                    <Pressable
                      key={tpl.id}
                      onPress={() => onTemplate(tpl)}
                      style={cardStyle(t, {
                        padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
                      })}
                    >
                      <GlyphTile t={t} glyph={tpl.glyph} color={dc.color} size={36} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: t.text, fontSize: 14, fontWeight: '500' }}>{tpl.name}</Text>
                        <Text style={{ ...MONO, color: t.muted, fontSize: 11, marginTop: 2 }}>
                          {tpl.target > 1 ? `${tpl.target}×/day · ` : ''}
                          {PERIODS.find(p => p.id === tpl.period)?.name}
                        </Text>
                      </View>
                      <Ionicons name="add" size={16} color={t.subtle} />
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Preview card */}
          <View style={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 20 }}>
            <View style={cardStyle(t, {
              padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14,
              backgroundColor: `${catColor}11`,
              borderWidth: 1, borderColor: `${catColor}33`,
            })}>
              <GlyphTile t={t} glyph={glyph} color={catColor} size={48} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: t.text, fontSize: 18, fontWeight: '600', letterSpacing: -0.3 }}>
                  {name || 'Habit name'}
                </Text>
                <Text style={{ ...MONO, color: t.muted, fontSize: 11, marginTop: 4 }}>
                  {target > 1 ? `${target}×/DAY · ` : ''}
                  {PERIODS.find(p => p.id === period)?.name.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Name */}
          <FieldBlock t={t} label="Name">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Drink water"
              placeholderTextColor={t.muted}
              style={{ color: t.text, fontSize: 16, paddingVertical: 6 }}
              autoFocus={!isEditing}
            />
          </FieldBlock>

          {/* Glyph */}
          <FieldBlock t={t} label="Symbol">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 4 }}>
              {GLYPHS.map(g => (
                <Pressable
                  key={g}
                  onPress={() => setGlyph(g)}
                  style={{
                    width: 38, height: 38, borderRadius: 10,
                    backgroundColor: glyph === g ? `${catColor}22` : t.surfaceMute,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: glyph === g ? 1.5 : 0,
                    borderColor: catColor,
                  }}
                >
                  <Text style={{ ...MONO, fontSize: 18, color: glyph === g ? catColor : t.text }}>{g}</Text>
                </Pressable>
              ))}
            </View>
          </FieldBlock>

          {/* Category */}
          <FieldBlock t={t} label="Category">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {categories.map(c => (
                <Pressable
                  key={c.id}
                  onPress={() => setCategoryId(c.id)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100,
                    backgroundColor: categoryId === c.id ? c.color : 'transparent',
                    borderWidth: 1, borderColor: categoryId === c.id ? c.color : t.border,
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                  }}
                >
                  <View style={{
                    width: 6, height: 6, borderRadius: 3,
                    backgroundColor: categoryId === c.id ? '#fff' : c.color,
                  }}/>
                  <Text style={{
                    color: categoryId === c.id ? '#fff' : t.text,
                    fontSize: 13, fontWeight: '500',
                  }}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          </FieldBlock>

          {/* Target */}
          <FieldBlock t={t} label="Times per day" hint={target === 1 ? 'Simple check-off' : 'Counted habit'}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable
                onPress={() => setTarget(Math.max(1, target - 1))}
                style={[styles.stepperBtn, { opacity: target === 1 ? 0.35 : 1 }]}
              >
                <Ionicons name="remove" size={16} color={t.text} />
              </Pressable>
              <Text style={{ ...MONO, color: t.text, fontSize: 28, fontWeight: '600', letterSpacing: -0.5 }}>
                {target}
              </Text>
              <Pressable
                onPress={() => setTarget(Math.min(20, target + 1))}
                style={styles.stepperBtn}
              >
                <Ionicons name="add" size={16} color={t.text} />
              </Pressable>
            </View>
          </FieldBlock>

          {/* When */}
          <FieldBlock t={t} label="When">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {PERIODS.map(p => (
                <Pressable
                  key={p.id}
                  onPress={() => setPeriod(p.id as Period)}
                  style={{
                    flex: 1, minWidth: '45%',
                    padding: 12, borderRadius: 12,
                    backgroundColor: period === p.id ? t.accentSoft : t.surfaceMute,
                    borderWidth: 1, borderColor: period === p.id ? t.accent : 'transparent',
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                  }}
                >
                  <PeriodIcon id={p.id as Period} color={period === p.id ? t.accent : t.muted} size={16} />
                  <View style={{ minWidth: 0, flex: 1 }}>
                    <Text style={{ color: period === p.id ? t.accent : t.text, fontSize: 13, fontWeight: '500' }}>
                      {p.name}
                    </Text>
                    <Text style={{ ...MONO, fontSize: 10, color: period === p.id ? t.accent : t.muted, opacity: 0.7, marginTop: 1 }}>
                      {p.hint}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </FieldBlock>

          {/* Reminders */}
          <FieldBlock t={t} label="Reminders" hint={reminders.length ? `${reminders.length} scheduled` : 'None'} last>
            <View style={{ gap: 6 }}>
              {reminders.map((r, i) => (
                <View key={i} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  paddingHorizontal: 12, paddingVertical: 10,
                  borderRadius: 10, backgroundColor: t.surfaceMute,
                }}>
                  <Ionicons name="notifications-outline" size={14} color={t.muted} />
                  <TextInput
                    value={r}
                    onChangeText={v => setReminders(prev => prev.map((x, j) => j === i ? v : x))}
                    style={{ flex: 1, color: t.text, fontSize: 15, fontWeight: '600', ...MONO }}
                    keyboardType="numbers-and-punctuation"
                  />
                  <Pressable onPress={() => setReminders(prev => prev.filter((_, j) => j !== i))} style={{ padding: 4 }}>
                    <Ionicons name="close" size={15} color={t.subtle} />
                  </Pressable>
                </View>
              ))}
              <Pressable
                onPress={() => setReminders(prev => [...prev, '12:00'])}
                style={{
                  paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
                  borderWidth: 1, borderStyle: 'dashed', borderColor: t.borderStrong,
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                }}
              >
                <Ionicons name="add" size={14} color={t.muted} />
                <Text style={{ color: t.muted, fontSize: 13 }}>Add another time</Text>
              </Pressable>
            </View>
          </FieldBlock>
        </ScrollView>
      )}
    </View>
  );
}

function FieldBlock({
  t, label, hint, children, last,
}: {
  t: any; label: string; hint?: string; children: React.ReactNode; last?: boolean;
}) {
  return (
    <View style={{
      paddingHorizontal: 22, paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border,
      borderBottomWidth: last ? StyleSheet.hairlineWidth : 0, borderBottomColor: t.border,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <Text style={{ ...MONO, color: t.muted, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' }}>
          {label}
        </Text>
        {hint ? <Text style={{ ...MONO, color: t.subtle, fontSize: 11 }}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 14, paddingBottom: 4,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  stepperBtn: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
  },
});
