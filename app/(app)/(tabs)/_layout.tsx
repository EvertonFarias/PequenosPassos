import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { addAuthListener, getToken } from '../../../lib/auth';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getToken();
        if (!mounted) return;
        setLoggedIn(!!token);
      } catch (e: any) {
        if (!mounted) return;
        setLoggedIn(false);
      }
    })();
    const unsubscribe = addAuthListener((isAuthenticated) => {
      if (!mounted) return;
      setLoggedIn(isAuthenticated);
    });
    return () => { mounted = false; unsubscribe(); };
  }, []);

  // While we don't know auth state, render nothing to avoid flashing UI
  if (loggedIn === null) return null;

  return (
    <View style={styles.container}>
      {/* Shared header across all tabs (shows logout) */}
      <AppHeader title="Pequenos Passos" />

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          // hide tab bar when not logged in
          tabBarStyle: loggedIn ? undefined : { display: 'none' },
          // only use haptic tab when logged in
          tabBarButton: loggedIn ? HapticTab : undefined,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
