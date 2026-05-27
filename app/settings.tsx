import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput, StyleSheet,
  useColorScheme, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { palette, type Theme } from '@/theme/colors';
import { listCategories, addCategory, deleteCategory } from '@/db/repositories/categories';
import type { Category } from '@/types';

const PRESET_COLORS = [
  '#4F46E5', '#10B981', '#F59E0B',
  '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899',
];

export default function Settings() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? palette.dark : palette.light;
  const s = styles(t);

  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [adding, setAdding] = useState(false);

  useFocusEffect(
    useCallback(() => {
      listCategories().then(setCategories);
    }, [])
  );

  const onAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    await addCategory(trimmed, selectedColor);
    setNewName('');
    const updated = await listCategories();
    setCategories(updated);
    setAdding(false);
  };

  const onDelete = (cat: Category) => {
    Alert.alert(
      'Delete category?',
      `"${cat.name}" will be removed. Habits in this category will become uncategorized.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCategory(cat.id);
            setCategories(prev => prev.filter(c => c.id !== cat.id));
          },
        },
      ]
    );
  };

  return (
    <View style={[s.screen, { backgroundColor: t.bg }]}>
      <Text style={s.sectionLabel}>Manage Categories</Text>

      <View style={s.addRow}>
        <TextInput
          style={s.input}
          placeholder="New category name"
          placeholderTextColor={t.muted}
          value={newName}
          onChangeText={setNewName}
          returnKeyType="done"
          onSubmitEditing={onAdd}
        />
        <Pressable
          onPress={onAdd}
          disabled={adding || !newName.trim()}
          style={[s.addBtn, (!newName.trim() || adding) && { opacity: 0.5 }]}>
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      <View style={s.colorRow}>
        {PRESET_COLORS.map(color => (
          <Pressable
            key={color}
            onPress={() => setSelectedColor(color)}
            style={[
              s.colorDot,
              { backgroundColor: color },
              selectedColor === color && s.colorDotSelected,
            ]}
          />
        ))}
      </View>

      <FlatList
        data={categories}
        keyExtractor={c => String(c.id)}
        contentContainerStyle={{ gap: 8, paddingTop: 8 }}
        ListEmptyComponent={
          <Text style={[s.empty, { color: t.muted }]}>
            No categories yet — add one above
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[s.catRow, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={[s.colorBadge, { backgroundColor: item.color }]} />
            <Text style={[s.catName, { color: t.text }]}>{item.name}</Text>
            <Pressable onPress={() => onDelete(item)} hitSlop={10}>
              <Ionicons name="trash-outline" size={18} color={t.muted} />
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  sectionLabel: {
    color: t.muted, fontSize: 13, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16,
  },
  addRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  input: {
    flex: 1, backgroundColor: t.surface, color: t.text, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    borderWidth: 1, borderColor: t.border,
  },
  addBtn: {
    backgroundColor: t.primary, borderRadius: 12,
    width: 46, justifyContent: 'center', alignItems: 'center',
  },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff' },
  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  colorBadge: { width: 12, height: 12, borderRadius: 6 },
  catName: { flex: 1, fontSize: 15 },
  empty: { textAlign: 'center', paddingTop: 32, fontSize: 14 },
});
