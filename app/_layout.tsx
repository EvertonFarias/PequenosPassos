// app/_layout.tsx
import { AuthProvider } from '../context/AuthContext';
import { Stack } from 'expo-router';

// (Se você usa 'expo-font' ou 'SplashScreen', mantenha-os aqui)

export default function RootLayout() {
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