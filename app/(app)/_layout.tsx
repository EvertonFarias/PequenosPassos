// app/(app)/_layout.tsx
import { Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

// Layout para o usuário logado (não-admin)
export default function AppLayout() {
  const { user } = useAuth();
  if (!user) return null; // O AuthProvider está redirecionando

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(superadmin)" />
      <Stack.Screen name="school-selection" />
      <Stack.Screen name="class-selection" />
      <Stack.Screen name="classroom-detail" />
      <Stack.Screen name="student-list" />
      <Stack.Screen name="student-evaluation" />
      <Stack.Screen name="new-student" />
      <Stack.Screen name="new-classroom" />
      <Stack.Screen name="edit-classroom" />
      <Stack.Screen name="manage-classrooms" />
      <Stack.Screen name="assessment-history" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="report-view" />
      <Stack.Screen name="school-metrics" />
    </Stack>
  );
}