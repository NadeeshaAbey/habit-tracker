import { Tabs } from 'expo-router';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { MONO } from '@/components/ui';
import type { AppTheme } from '@/theme/design';

const TAB_ITEMS = [
  { name: 'index',    label: 'Today',    icon: 'home-outline',     iconActive: 'home'          },
  { name: 'calendar', label: 'Calendar', icon: 'calendar-outline', iconActive: 'calendar'      },
  { name: 'insights', label: 'Insights', icon: 'bar-chart-outline',iconActive: 'bar-chart'     },
  { name: 'settings', label: 'Settings', icon: 'settings-outline', iconActive: 'settings'      },
] as const;

function CustomTabBar({ state, navigation }: { state: any; navigation: any }) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[
      styles.bar,
      {
        backgroundColor: t.bg,
        borderTopColor: t.border,
        paddingBottom: Math.max(insets.bottom, 8),
      },
    ]}>
      {TAB_ITEMS.map((item, index) => {
        const focused = state.index === index;
        return (
          <Pressable
            key={item.name}
            onPress={() => navigation.navigate(item.name)}
            style={styles.tabBtn}
          >
            <View style={[
              styles.iconWrap,
              focused && { backgroundColor: t.accentSoft },
            ]}>
              <Ionicons
                name={(focused ? item.iconActive : item.icon) as any}
                size={20}
                color={focused ? t.accent : t.muted}
              />
            </View>
            <Text style={{
              ...MONO,
              fontSize: 10, letterSpacing: 0.4,
              color: focused ? t.text : t.muted,
              fontWeight: focused ? '500' : '400',
              marginTop: 3,
            }}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    flex: 1, alignItems: 'center',
  },
  iconWrap: {
    paddingHorizontal: 14, paddingVertical: 4, borderRadius: 14,
  },
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
