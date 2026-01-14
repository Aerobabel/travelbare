// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SvgProps } from 'react-native-svg';

import { HapticTab } from '@/components/HapticTab';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// SVG icon pairs (active = blue, inactive = white)
const HomeActive   = require('@/assets/icons/home-blue.svg').default as React.ComponentType<SvgProps>;
const HomeInactive = require('@/assets/icons/home-white.svg').default as React.ComponentType<SvgProps>;

const TripsActive   = require('@/assets/icons/trips-blue.svg').default as React.ComponentType<SvgProps>;
const TripsInactive = require('@/assets/icons/trips-white.svg').default as React.ComponentType<SvgProps>;

const ServicesActive   = require('@/assets/icons/services-blue.svg').default as React.ComponentType<SvgProps>;
const ServicesInactive = require('@/assets/icons/services-white.svg').default as React.ComponentType<SvgProps>;

const CommunityActive   = require('@/assets/icons/community-blue.svg').default as React.ComponentType<SvgProps>;
const CommunityInactive = require('@/assets/icons/community-white.svg').default as React.ComponentType<SvgProps>;

const ProfileActive   = require('@/assets/icons/profile-blue.svg').default as React.ComponentType<SvgProps>;
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
          backgroundColor: '#0e141c',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          // keep it at bottom, but size is handled so it won't overlap content
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: barHeight,
          paddingTop: 8,
          paddingBottom: bottomPadding,
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
        name="MyTrips"
        options={{
          title: 'My Trips',
          // 👇 Added explicit type here
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabSvg focused={focused} Active={TripsActive} Inactive={TripsInactive} />
          ),
        }}
      />

      <Tabs.Screen
        name="Services"
        options={{
          title: 'Services',
          // 👇 Added explicit type here
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabSvg focused={focused} Active={ServicesActive} Inactive={ServicesInactive} />
          ),
        }}
      />

      <Tabs.Screen
        name="Community" // Ensure this matches your file name exactly (e.g. community.tsx vs Community.tsx)
        options={{
          title: 'Community',
          // 👇 Added explicit type here
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabSvg focused={focused} Active={CommunityActive} Inactive={CommunityInactive} />
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