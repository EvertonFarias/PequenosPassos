import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

// Initial route - let AuthContext decide where to go
export default function Index() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return; // Wait for auth to load

    if (!user) {
      // Not authenticated - go to login
      router.replace('/login');
    } else {
      // Authenticated - AuthContext will handle navigation
      // Just navigate to (app) group and let it redirect properly
      router.replace('/(app)/school-selection' as any);
    }
  }, [user, isLoading, router]);

  // Show loading while checking auth
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
      <ActivityIndicator size="large" color="#8B5CF6" />
    </View>
  );
}
