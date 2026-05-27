import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  useColorScheme, Alert, ScrollView,
} from 'react-native';
import { router } from 'expo-router';

import { palette, type Theme } from '@/theme/colors';
import { addHabit } from '@/db/repositories/habits';
import { listCategories } from '@/db/repositories/categories';
import type { Category } from '@/types';

export default function NewHabit() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? palette.dark : palette.light;
  const s = styles(t);

  const [name, setName] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCategories().then(setCategories);
  }, []);

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter a habit name.');
      return;
    }
    setSaving(true);
    await addHabit(trimmed, selectedCategoryId);
    router.back();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={s.container}
      keyboardShouldPersistTaps="handled">
      <Text style={s.label}>Habit name</Text>
      <TextInput
        style={s.input}
        placeholder="e.g. Drink water"
        placeholderTextColor={t.muted}
        value={name}
        onChangeText={setName}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={onSave}
      />

      {categories.length > 0 && (
        <>
          <Text style={[s.label, { marginTop: 24 }]}>Category (optional)</Text>
          <View style={s.chips}>
            {categories.map(cat => {
              const selected = cat.id === selectedCategoryId;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCategoryId(selected ? null : cat.id)}
                  style={[s.chip, { borderColor: cat.color }, selected && { backgroundColor: cat.color }]}>
                  <Text style={[s.chipText, selected && { color: '#fff' }]}>{cat.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <Pressable
        onPress={onSave}
        disabled={saving}
        style={[s.saveBtn, saving && { opacity: 0.6 }]}>
        <Text style={s.saveBtnText}>Add Habit</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { padding: 24, gap: 8 },
  label: {
    color: t.muted, fontSize: 13, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  input: {
    backgroundColor: t.surface, color: t.text, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    borderWidth: 1, borderColor: t.border,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { color: t.text, fontSize: 14 },
  saveBtn: {
    backgroundColor: t.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 32,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
