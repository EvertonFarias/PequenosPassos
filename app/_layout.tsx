// app/_layout.tsx
import { AuthProvider } from '../context/AuthContext';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
// @ts-ignore - optional dependency; install with `expo install expo-navigation-bar` to enable
import * as NavigationBar from 'expo-navigation-bar';

// (Se você usa 'expo-font' ou 'SplashScreen', mantenha-os aqui)

export default function RootLayout() {
  useEffect(() => {
    // Hide Android navigation bar (soft keys) on app start to avoid footer buttons showing
    // This uses expo-navigation-bar which works on Expo-managed apps.
    if (Platform.OS === 'android') {
      (async () => {
        try {
          // Try immersive mode first (hides the nav bar and lets the app occupy full screen)
          // Also set background to transparent so the app content fills the area.
          await NavigationBar.setBackgroundColorAsync('#00000000');
          // @ts-ignore - some SDKs/types may not include 'immersive' value, call as best-effort
          await NavigationBar.setVisibilityAsync('immersive');
        } catch (e1) {
          try {
            // Fallback: try hidden
            await NavigationBar.setBackgroundColorAsync('#00000000');
            // @ts-ignore - fallback best-effort
            await NavigationBar.setVisibilityAsync('hidden');
          } catch (e2) {
            console.warn('NavigationBar: could not hide navigation bar', e1, e2);
          }
        }
      })();
    }
  }, []);
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        
        {/* Rota de login, fora do fluxo principal */}
        <Stack.Screen name="login" />

        {/* Grupo (app): Telas para usuários 'USER' (prof/gestor) */}
        <Stack.Screen name="(app)" />
        
        {/* Grupo (superadmin): Telas para 'SUPER_ADMIN' */}
        <Stack.Screen name="(superadmin)" />

      </Stack>
    </AuthProvider>
  );
}