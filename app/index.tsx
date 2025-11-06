import { useEffect } from 'react';
import { useRouter } from 'expo-router';

// Simple redirect so the app opens to the login screen as the initial route
export default function Index() {
  const router = useRouter();
  useEffect(() => {
    // Replace root with /login
    router.replace('/login');
  }, [router]);
  return null;
}
