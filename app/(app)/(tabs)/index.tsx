import { Buffer } from 'buffer';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { getToken } from '../../../lib/auth';

// Redirect inside the tabs layout based on authenticated user's role.
export default function TabsIndex() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getToken();
        if (!mounted) return;

        if (!token) {
          // Not authenticated — go to login stack
          router.replace('/login');
          return;
        }

        // decode minimal payload using Buffer or global atob
        const decodePayload = (t: string) => {
          try {
            const parts = t.split('.');
            if (parts.length < 2) return null;
            const b = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const pad = b.length % 4;
            const padded = pad ? b + '='.repeat(4 - pad) : b;
            const dec = (str: string) => (typeof (global as any).atob === 'function' ? (global as any).atob(str) : Buffer.from(str, 'base64').toString('utf8'));
            const json = dec(padded);
            return JSON.parse(json);
          } catch (e) {
            return null;
          }
        };

        const payload = decodePayload(String(token));
        const role = payload && (payload.role || payload.roles || payload.authorities) ? String(payload.role || payload.roles || payload.authorities) : null;

        if (role && role.toUpperCase().includes('SUPER')) {
          // existe em app/(app)/(superadmin)/dashboard.tsx
          router.replace({ pathname: '/(app)/(superadmin)/dashboard' });
        } else if (role && (role.toUpperCase().includes('TEACH') || role.toUpperCase().includes('PROF'))) {
          // redireciona para a lista de estudantes / dashboard do gestor
          router.replace({ pathname: '/(app)/student-list' });
        } else {
          // usuário padrão -> seleção de escola
          router.replace({ pathname: '/(app)/school-selection' });
        }
      } catch (e: any) {
  // fallback: tentar levar para seleção de escolas
  try { router.replace({ pathname: '/(app)/school-selection' }); } catch { /* swallow */ }
    }
    })();

    return () => { mounted = false; };
  }, [router]);

  return null;
}