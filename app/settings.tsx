import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput, StyleSheet,
  useColorScheme, Alert, Switch,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { palette, type Theme } from '@/theme/colors';
import { listCategories, addCategory, deleteCategory } from '@/db/repositories/categories';
import { getSetting, setSetting } from '@/db/repositories/settings';
import { requestNotificationPermissions, scheduleReminder, cancelReminder } from '@/utils/notifications';
import type { Category } from '@/types';

const PRESET_COLORS = [
  '#4F46E5', '#10B981', '#F59E0B',
  '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899',
];

function defaultReminderTime() {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
}

export default function Settings() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? palette.dark : palette.light;
  const s = styles(t);

  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [adding, setAdding] = useState(false);

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState<Date>(defaultReminderTime);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      listCategories().then(setCategories);

      Promise.all([
        getSetting('reminder_enabled'),
        getSetting('reminder_time'),
      ]).then(([enabled, time]) => {
        setReminderEnabled(enabled === 'true');
        if (time) {
          const [h, m] = time.split(':').map(Number);
          const d = new Date();
          d.setHours(h, m, 0, 0);
          setReminderTime(d);
        }
      });
    }, [])
  );

  const onToggleReminder = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Permission needed',
          'Enable notifications in your device Settings to use reminders.'
        );
        return;
      }
      const h = reminderTime.getHours();
      const m = reminderTime.getMinutes();
      await scheduleReminder(h, m);
      await setSetting('reminder_enabled', 'true');
      await setSetting('reminder_time', `${h}:${m}`);
      setReminderEnabled(true);
    } else {
      await cancelReminder();
      await setSetting('reminder_enabled', 'false');
      setReminderEnabled(false);
    }
  };

  const onTimeChange = async (_: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (!selectedDate) return;
    setReminderTime(selectedDate);
    if (reminderEnabled) {
      const h = selectedDate.getHours();
      const m = selectedDate.getMinutes();
      await scheduleReminder(h, m);
      await setSetting('reminder_time', `${h}:${m}`);
    }
  };

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

  const formattedTime = reminderTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[s.screen, { backgroundColor: t.bg }]}>
      {/* ── Reminder ── */}
      <Text style={s.sectionLabel}>Daily Reminder</Text>
      <View style={[s.reminderRow, { backgroundColor: t.surface, borderColor: t.border }]}>
        <Ionicons name="notifications-outline" size={20} color={t.muted} />
        <View style={{ flex: 1 }}>
          <Text style={[s.reminderTitle, { color: t.text }]}>Remind me daily</Text>
          {reminderEnabled && (
            <Pressable onPress={() => setShowTimePicker(true)}>
              <Text style={[s.reminderTimeTxt, { color: t.primary }]}>{formattedTime}</Text>
            </Pressable>
          )}
        </View>
        <Switch
          value={reminderEnabled}
          onValueChange={onToggleReminder}
          trackColor={{ false: t.border, true: t.primary }}
          thumbColor="#fff"
        />
      </View>

      {showTimePicker && (
        <DateTimePicker
          value={reminderTime}
          mode="time"
          is24Hour={false}
          onChange={onTimeChange}
        />
      )}

      {/* ── Categories ── */}
      <Text style={[s.sectionLabel, { marginTop: 28 }]}>Manage Categories</Text>

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
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  reminderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 14, borderWidth: 1,
  },
  reminderTitle: { fontSize: 15, fontWeight: '500' },
  reminderTimeTxt: { fontSize: 13, marginTop: 2, fontWeight: '600' },
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
