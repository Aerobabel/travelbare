// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SvgProps } from 'react-native-svg';

import { HapticTab } from '@/components/HapticTab';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// SVG icon pairs (active = blue, inactive = white)
const HomeActive = require('@/assets/icons/home-blue.svg').default as React.ComponentType<SvgProps>;
const HomeInactive = require('@/assets/icons/home-white.svg').default as React.ComponentType<SvgProps>;

const ProfileActive = require('@/assets/icons/profile-blue.svg').default as React.ComponentType<SvgProps>;
const ProfileInactive = require('@/assets/icons/profile-white.svg').default as React.ComponentType<SvgProps>;

// Small helper so every tab uses the same sizing
function TabSvg({
  focused,
  Active,
  Inactive,
  size = 28,
}: {
  focused: boolean;
  Active: React.ComponentType<SvgProps>;
  Inactive: React.ComponentType<SvgProps>;
  size?: number;
}) {
  const Icon = focused ? Active : Inactive;
  return <Icon width={size} height={size} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  // Dynamic bottom padding so the bar never collides with Android nav bar
  const bottomPadding = Math.max(insets.bottom, 12);
  const barHeight = 64 + bottomPadding; // total bar height

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,

        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: '#eee2e29a',

        // Make bar flush to bottom, but respect safe-area with padding
        tabBarStyle: {
          display: 'none',
        },

        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          marginTop: 6,
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          // 👇 Added explicit type here
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabSvg focused={focused} Active={HomeActive} Inactive={HomeInactive} />
          ),
        }}
      />

      <Tabs.Screen
        name="Profile"
        options={{
          title: 'Profile',
          // 👇 Added explicit type here
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabSvg focused={focused} Active={ProfileActive} Inactive={ProfileInactive} />
          ),
        }}
      />
    </Tabs>
  );
}