// context/AuthContext.tsx
import api from '@/lib/api';
import { useRouter, useSegments } from 'expo-router';
import { saveToken, getToken, removeToken } from '@/lib/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';


// --- Tipos que esperamos da nossa API ---

interface SchoolContextDTO {
  schoolId: number;
  schoolName: string;
  address: string;
  phone: string;
  role: 'SCHOOL_MANAGER' | 'TEACHER';
  classroomCount: number;
  studentCount: number;
  active: boolean;
}

// O 'role' aqui é o UserRole global (SUPER_ADMIN ou USER)
interface UserDTO {
  id: string;
  login: string;
  email: string;
  role: 'SUPER_ADMIN' | 'USER'; // <-- ATUALIZADO de globalRole para role
}

// --- Definição do Contexto ---
interface AuthContextData {
  user: UserDTO | null;
  schools: SchoolContextDTO[];
  signIn: (login: string, password: string) => Promise<void>;
  signOut: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [schools, setSchools] = useState<SchoolContextDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await getToken();
        if (token) {
          // 1. Buscar dados do usuário (VALIDA O TOKEN)
          const userResponse = await api.get<UserDTO>('/users/me'); 
          setUser(userResponse.data);

          // 2. Buscar escolas do usuário (se não for SuperAdmin)
          if (userResponse.data.role === 'USER') { 
            const schoolsResponse = await api.get<SchoolContextDTO[]>('/users/me/schools');
            setSchools(schoolsResponse.data);
          }
        }
      } catch (e: any) {
        console.error('Falha ao carregar usuário:', e);
        await removeToken();
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (isLoading) return; 
    const segs = segments as unknown as string[];
    const inAuthGroup = segs[0] === '(app)';

    if (!user) {
      if (!inAuthGroup) {
        router.replace('/login' as any);
      }
    } else {
      // Se estiver em '/login' (ou qualquer rota fora de 'app'), redireciona
      if (segs.length === 0 || segs[0] !== '(app)') {
         redirectToDashboard();
      }
    }
  }, [user, isLoading, segments]);

  const redirectToDashboard = () => {
    if (!user) return;
    if (user.role === 'SUPER_ADMIN') {
      router.replace('/(superadmin)/dashboard' as any);
    } else {
      if (schools.length > 1) {
        router.replace('/(app)/school-selection' as any);
      } else if (schools.length === 1) {
        router.replace(`/(app)/class-selection?schoolId=${schools[0].schoolId}` as any);
      } else {
        router.replace('/(app)/no-schools' as any);
      }
    }
  };

        const signIn = async (login: string, password: string) => {
            try {
                console.log('🚀 Iniciando login...');
                console.log('📍 API Base URL:', api.defaults.baseURL);
                console.log('👤 Login:', login);
                
                const response = await api.post<{ token: string }>('/auth/login', { login, password });
                console.log('✅ Resposta recebida:', response.status);
                console.log('🔑 Token recebido:', response.data.token ? 'SIM' : 'NÃO');
                
                const { token } = response.data;

                await saveToken(token);
                console.log('💾 Token salvo via saveToken()');
                
                // Buscar dados do usuário
                console.log('📡 Buscando dados do usuário...');
                const userResponse = await api.get<UserDTO>('/users/me');
                console.log('✅ Usuário recebido:', userResponse.data);
                setUser(userResponse.data);

                // Buscar escolas
                
                let userSchools: SchoolContextDTO[] = [];
                if (userResponse.data.role === 'USER') {
                console.log('🏫 Buscando escolas...');
                const schoolsResponse = await api.get<SchoolContextDTO[]>('/schools/me');
                console.log('✅ Escolas recebidas:', schoolsResponse.data);
                setSchools(schoolsResponse.data);
                userSchools = schoolsResponse.data;
                }
                
                // Redirecionar
                console.log('🔀 Redirecionando...');
                if (userResponse.data.role === 'SUPER_ADMIN') {
                router.replace({ pathname: '/(app)/(superadmin)/dashboard' } as any);
                } else {
                if (userSchools.length > 1) {
                    router.replace({ pathname: '/(app)/school-selection' } as any);
                } else if (userSchools.length === 1) {
                    router.replace({ pathname: '/(app)/class-selection', params: { schoolId: String(userSchools[0].schoolId) } } as any);
                } else {
                    router.replace({ pathname: '/(app)/no-schools' } as any);
                }
                }
                
            } catch (e: any) {
                console.log('❌ ERRO NO LOGIN:', e);
                console.log('❌ Resposta:', e?.response?.data);
                console.log('❌ Status:', e?.response?.status);
                console.log('❌ Headers:', e?.response?.headers);
                
                const serverMessage = e?.response?.data?.message || e?.response?.data || null;
                const errMessage = typeof serverMessage === 'string' ? serverMessage : (e?.message || 'Erro ao fazer login');
                throw new Error(errMessage);
            }
        };

  const signOut = async () => {
    setUser(null);
    setSchools([]);
                await removeToken();
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, schools, signIn, signOut, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};