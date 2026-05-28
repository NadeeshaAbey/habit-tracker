import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, Modal,
  type ViewStyle, type TextStyle,
} from 'react-native';
import Svg, { Circle, Rect, Text as SvgText, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { AppTheme } from '@/theme/design';
import type { Period } from '@/types';

// ── Card style helper ────────────────────────────────────────
export function cardStyle(t: AppTheme, extra?: ViewStyle): ViewStyle {
  const base: ViewStyle = {
    backgroundColor: t.surface,
    borderRadius: 16,
    ...extra,
  };
  if (t.cardStyle === 'outlined') {
    return { ...base, borderWidth: 1, borderColor: t.border };
  }
  if (t.cardStyle === 'shadow') {
    return {
      ...base,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOpacity: t.isDark ? 0.3 : 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
        },
        android: { elevation: t.isDark ? 4 : 2 },
      }),
    };
  }
  // soft
  return { ...base, backgroundColor: t.surfaceAlt };
}

// ── Mono text style ──────────────────────────────────────────
export const MONO: TextStyle = {
  fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }),
};

// ── GlyphTile ────────────────────────────────────────────────
export function GlyphTile({
  glyph, color, size = 40, dim = false, t,
}: {
  glyph: string; color: string; size?: number; dim?: boolean; t: AppTheme;
}) {
  return (
    <View style={{
      width: size, height: size, borderRadius: 12, flexShrink: 0,
      backgroundColor: dim ? t.surfaceMute : `${color}22`,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{
        ...MONO,
        color: dim ? t.muted : color,
        fontSize: size * 0.48,
        fontWeight: '500',
      }}>{glyph}</Text>
    </View>
  );
}

// ── ProgressRing ─────────────────────────────────────────────
export function ProgressRing({
  t, pct, done, total, size = 64, stroke = 5,
}: {
  t: AppTheme; pct: number; done: number; total: number; size?: number; stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const dash = C * Math.min(Math.max(pct, 0), 1);
  return (
    <View style={{ width: size, height: size, flexShrink: 0 }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size/2} cy={size/2} r={r} stroke={t.border} strokeWidth={stroke} fill="none"/>
        <Circle cx={size/2} cy={size/2} r={r} stroke={t.accent} strokeWidth={stroke} fill="none"
          strokeDasharray={`${dash} ${C}`} strokeLinecap="round"/>
      </Svg>
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ ...MONO, color: t.text, fontSize: 15, fontWeight: '600', lineHeight: 18 }}>
          {done}<Text style={{ color: t.subtle }}>/{total}</Text>
        </Text>
      </View>
    </View>
  );
}

// ── Heatmap cell grid (column-first layout) ──────────────────
export function HabitHeatmap({
  cols = 13, rows = 7, cells, t, height = 56,
}: {
  cols?: number;
  rows?: number;
  cells: string[];  // bg color per cell, column-first order
  t: AppTheme;
  height?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 2, height }}>
      {Array.from({ length: cols }, (_, col) => (
        <View key={col} style={{ flex: 1, flexDirection: 'column', gap: 2 }}>
          {Array.from({ length: rows }, (_, row) => {
            const idx = col * rows + row;
            return (
              <View
                key={row}
                style={{ flex: 1, borderRadius: 2, backgroundColor: cells[idx] ?? t.surfaceMute }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── SVG BarChart ─────────────────────────────────────────────
export function BarChart({
  data, height = 100, gap = 4, barRadius = 3, viewWidth = 320, t,
}: {
  data: Array<{ value: number; color: string; label?: string; labelColor?: string; outlined?: boolean }>;
  height?: number; gap?: number; barRadius?: number; viewWidth?: number; t: AppTheme;
}) {
  const labelH = data.some(d => d.label) ? 14 : 0;
  const chartH = height - labelH;
  const n = data.length;
  const totalGap = gap * (n - 1);
  const barW = (viewWidth - totalGap) / n;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${viewWidth} ${height}`} preserveAspectRatio="none">
      {data.map((d, i) => {
        const v = Math.max(0, Math.min(1, d.value));
        const h = v > 0 ? Math.max(v * (chartH - 4), 4) : 2;
        const x = i * (barW + gap);
        const y = chartH - h;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={h} rx={barRadius} ry={barRadius} fill={d.color}/>
            {d.outlined && (
              <Rect x={x + 0.75} y={y + 0.75} width={barW - 1.5} height={h - 1.5}
                rx={barRadius} ry={barRadius} fill="none" stroke={t.text} strokeWidth={1.5}/>
            )}
            {d.label ? (
              <SvgText
                x={x + barW / 2} y={height - 2}
                textAnchor="middle"
                fontSize={10}
                fill={d.labelColor ?? t.subtle}
              >
                {d.label}
              </SvgText>
            ) : null}
          </G>
        );
      })}
    </Svg>
  );
}

// ── PeriodIcon ───────────────────────────────────────────────
export function PeriodIcon({ id, color, size = 16 }: { id: Period; color: string; size?: number }) {
  const name =
    id === 'morning' ? 'sunny-outline' :
    id === 'day'     ? 'partly-sunny-outline' :
    id === 'evening' ? 'moon-outline' :
                       'sparkles-outline';
  return <Ionicons name={name as any} size={size} color={color} />;
}

// ── Toggle ───────────────────────────────────────────────────
export function Toggle({ t, value, onChange }: { t: AppTheme; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={{
      width: 42, height: 24, borderRadius: 12,
      backgroundColor: value ? t.accent : t.surfaceMute,
      justifyContent: 'center',
    }}>
      <View style={{
        position: 'absolute',
        left: value ? 20 : 2,
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: '#fff',
        shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
        elevation: 2,
      }}/>
    </Pressable>
  );
}

// ── Segmented control ────────────────────────────────────────
export function Segmented<T extends string>({
  t, value, onChange, options,
}: {
  t: AppTheme;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ v: T; label: string; icon?: React.ReactNode }>;
}) {
  return (
    <View style={{
      flexDirection: 'row', padding: 3, borderRadius: 100,
      backgroundColor: t.surfaceMute, gap: 2,
    }}>
      {options.map(o => (
        <Pressable key={o.v} onPress={() => onChange(o.v)} style={{
          paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100,
          backgroundColor: value === o.v ? t.surface : 'transparent',
          flexDirection: 'row', alignItems: 'center', gap: 4,
          ...(value === o.v ? Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
            android: { elevation: 1 },
          }) : {}),
        }}>
          {o.icon}
          <Text style={{
            color: value === o.v ? t.text : t.muted,
            fontSize: 12, fontWeight: '500',
          }}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Screen header ────────────────────────────────────────────
export function ScreenHeader({
  t, eyebrow, title, right, large = true,
}: {
  t: AppTheme;
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
  large?: boolean;
}) {
  return (
    <View style={{
      paddingHorizontal: 22, paddingTop: 8, paddingBottom: 14,
      flexDirection: 'row', alignItems: 'flex-end', gap: 12,
    }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {eyebrow ? (
          <Text style={{
            ...MONO, color: t.muted, fontSize: 11, letterSpacing: 1.4,
            textTransform: 'uppercase', marginBottom: 6,
          }}>{eyebrow}</Text>
        ) : null}
        <Text style={{
          color: t.text, fontSize: large ? 32 : 22, fontWeight: '600', letterSpacing: -0.6,
        }}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

// ── Icon button ──────────────────────────────────────────────
export function IconBtn({
  t, onPress, children, active, size = 38,
}: {
  t: AppTheme; onPress?: () => void; children: React.ReactNode; active?: boolean; size?: number;
}) {
  return (
    <Pressable onPress={onPress} style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: active ? t.accentSoft : 'transparent',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </Pressable>
  );
}

// ── Chip ─────────────────────────────────────────────────────
export function Chip({
  t, active, onPress, label, color, glyph,
}: {
  t: AppTheme; active: boolean; onPress: () => void; label: string; color?: string; glyph?: string;
}) {
  return (
    <Pressable onPress={onPress} style={{
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100,
      backgroundColor: active ? t.text : t.surface,
      borderWidth: 1, borderColor: active ? t.text : t.border,
      flexDirection: 'row', alignItems: 'center', gap: 6,
    }}>
      {color ? (
        <Text style={{ ...MONO, color: active ? t.bg : color, fontSize: 13 }}>{glyph}</Text>
      ) : null}
      <Text style={{
        color: active ? t.bg : t.text, fontSize: 13, fontWeight: '500',
      }}>{label}</Text>
    </Pressable>
  );
}

// ── Section wrapper ──────────────────────────────────────────
export function Section({ t, label, children }: { t: AppTheme; label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={{ paddingHorizontal: 22, paddingTop: 4, paddingBottom: 8 }}>
        <Text style={{
          ...MONO, color: t.muted, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase',
        }}>{label}</Text>
      </View>
      <View style={{ paddingHorizontal: 14 }}>
        <View style={cardStyle(t, { padding: 4 })}>
          {children}
        </View>
      </View>
    </View>
  );
}

// ── Time picker helpers ───────────────────────────────────────
export function parseTime(str: string): Date {
  const [h, m] = str.split(':').map(Number);
  const d = new Date();
  d.setHours(isNaN(h) ? 9 : h, isNaN(m) ? 0 : m, 0, 0);
  return d;
}

export function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// ── TimePickerModal ───────────────────────────────────────────
// iOS: bottom-sheet spinner modal. Android: native dialog.
export function TimePickerModal({
  t, visible, value, onConfirm, onCancel,
}: {
  t: AppTheme;
  visible: boolean;
  value: string;
  onConfirm: (time: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(() => parseTime(value));

  useEffect(() => {
    if (visible) setDraft(parseTime(value));
  }, [visible, value]);

  const handleChange = (_: any, date?: Date) => {
    if (Platform.OS === 'android') {
      if (date) onConfirm(formatTime(date));
      else onCancel();
    } else {
      if (date) setDraft(date);
    }
  };

  if (Platform.OS === 'android') {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={draft}
        mode="time"
        is24Hour
        onChange={handleChange}
      />
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onCancel} />
      <View style={{
        backgroundColor: t.surface,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        paddingBottom: 34,
      }}>
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          paddingHorizontal: 20, paddingVertical: 14,
          borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border,
        }}>
          <Pressable onPress={onCancel} hitSlop={10}>
            <Text style={{ color: t.muted, fontSize: 15 }}>Cancel</Text>
          </Pressable>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>Set time</Text>
          <Pressable onPress={() => onConfirm(formatTime(draft))} hitSlop={10}>
            <Text style={{ color: t.accent, fontSize: 15, fontWeight: '600' }}>Done</Text>
          </Pressable>
        </View>
        <DateTimePicker
          value={draft}
          mode="time"
          is24Hour
          display="spinner"
          onChange={handleChange}
          style={{ height: 200 }}
        />
      </View>
    </Modal>
  );
}

// ── Settings row ─────────────────────────────────────────────
export function SettingsRow({
  t, label, hint, right, chevron, last, danger, onPress,
}: {
  t: AppTheme;
  label: string;
  hint?: string;
  right?: React.ReactNode;
  chevron?: boolean;
  last?: boolean;
  danger?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{
      paddingHorizontal: 12, paddingVertical: 12,
      borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
      flexDirection: 'row', alignItems: 'center', gap: 12,
    }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: danger ? t.danger : t.text, fontSize: 14, fontWeight: '500' }}>
          {label}
        </Text>
        {hint ? (
          <Text style={{ ...MONO, color: t.muted, fontSize: 11, marginTop: 2 }}>{hint}</Text>
        ) : null}
      </View>
      {right}
      {chevron ? <Ionicons name="chevron-forward" size={16} color={t.subtle} /> : null}
    </Pressable>
  );
}
