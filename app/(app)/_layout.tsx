// app/(app)/_layout.tsx
import { Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

// Layout para o usuário logado (não-admin)
export default function AppLayout() {
  const { user } = useAuth();
  if (!user) return null; // O AuthProvider está redirecionando

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="school-selection" />
      <Stack.Screen name="class-selection" />
      <Stack.Screen name="student-list" />
      {/* ...outras telas do app... */}
    </Stack>
  );
}