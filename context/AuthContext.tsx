// context/AuthContext.tsx
import api from '@/lib/api';
import { useRouter, useSegments } from 'expo-router';
import { saveToken, getToken, removeToken } from '@/lib/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  role: 'SUPER_ADMIN' | 'USER';
}

// --- Definição do Contexto ---
interface AuthContextData {
  user: UserDTO | null;
  schools: SchoolContextDTO[];
  signIn: (login: string, password: string) => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
  isLoadingSchools: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [schools, setSchools] = useState<SchoolContextDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);

  const router = useRouter();
  const segments = useSegments();

  // Função para carregar/recarregar dados do usuário
  const loadUserData = async () => {
    try {
      const token = await getToken();
      if (!token) {
        // Sem token, garante estado limpo
        setUser(null);
        setSchools([]);
        return;
      }

      // 1. Buscar dados do usuário (VALIDA O TOKEN)
      const userResponse = await api.get<UserDTO>('/users/me'); 
      setUser(userResponse.data);

      // 2. Buscar escolas do usuário (se não for SuperAdmin)
      if (userResponse.data.role === 'USER') {
        setIsLoadingSchools(true);
        try {
          const schoolsResponse = await api.get<SchoolContextDTO[]>('/users/me/schools');
          setSchools(schoolsResponse.data);
        } catch (schoolError) {
          console.error('Erro ao carregar escolas:', schoolError);
          setSchools([]);
        } finally {
          setIsLoadingSchools(false);
        }
      } else {
        setSchools([]);
      }
    } catch (e: any) {
      console.error('Falha ao carregar usuário:', e);
      // IMPORTANTE: Limpar todo o estado em caso de erro
      setUser(null);
      setSchools([]);
      setIsLoadingSchools(false);
      await removeToken();
    }
  };

  // Função pública para refazer o carregamento
  const refreshUser = async () => {
    setIsLoading(true);
    await loadUserData();
    setIsLoading(false);
  };

  // Carregamento inicial
  useEffect(() => {
    const initialLoad = async () => {
      await loadUserData();
      setIsLoading(false);
    };
    initialLoad();
  }, []);

  useEffect(() => {
    if (isLoading) return; 
    const segs = segments as unknown as string[];
    const inAuthGroup = segs[0] === '(app)';

    if (!user) {
      // Usuário não autenticado - só redireciona se não estiver na tela de login
      if (inAuthGroup) {
        router.replace('/login' as any);
      }
    } else {
      // Usuário autenticado - se estiver em '/login', redireciona para dashboard
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
      // Sempre vai para school-selection, mesmo sem escolas
      // A tela de school-selection já mostra a mensagem quando não há escolas
      if (schools.length > 1) {
        router.replace('/(app)/school-selection' as any);
      } else if (schools.length === 1) {
        router.replace(`/(app)/class-selection?schoolId=${schools[0].schoolId}` as any);
      } else {
        // Sem escolas, vai para school-selection que mostrará o estado vazio
        router.replace('/(app)/school-selection' as any);
      }
    }
  };

  const signIn = async (login: string, password: string) => {
    try {
      console.log('🚀 Iniciando login...');
      console.log('📍 API Base URL:', api.defaults.baseURL);
      console.log('👤 Login:', login);
      
      const response = await api.post<{ token: string; refreshToken: string }>('/auth/login', { login, password });
      console.log('✅ Resposta recebida:', response.status);
      console.log('🔑 Token recebido:', response.data.token ? 'SIM' : 'NÃO');
      console.log('🔄 Refresh Token recebido:', response.data.refreshToken ? 'SIM' : 'NÃO');
      
      const { token, refreshToken } = response.data;

      await saveToken(token);
      await AsyncStorage.setItem('@refresh_token', refreshToken);
      console.log('💾 Access Token e Refresh Token salvos!');
      
      // Buscar dados do usuário
      console.log('📡 Buscando dados do usuário...');
      const userResponse = await api.get<UserDTO>('/users/me');
      console.log('✅ Usuário recebido:', userResponse.data);
      setUser(userResponse.data);

      // Buscar escolas
      let userSchools: SchoolContextDTO[] = [];
      if (userResponse.data.role === 'USER') {
        console.log('🏫 Buscando escolas...');
        setIsLoadingSchools(true);
        const schoolsResponse = await api.get<SchoolContextDTO[]>('/schools/me');
        console.log('✅ Escolas recebidas:', schoolsResponse.data);
        setSchools(schoolsResponse.data);
        setIsLoadingSchools(false);
        userSchools = schoolsResponse.data;
      }
      
      // Redirecionar
      console.log('🔀 Redirecionando...');
      if (userResponse.data.role === 'SUPER_ADMIN') {
        router.replace({ pathname: '/(app)/(superadmin)/dashboard' } as any);
      } else {
        // Sempre redireciona para school-selection (mesmo sem escolas)
        // ou direto para a classe se tiver apenas uma escola
        if (userSchools.length === 1) {
          router.replace({ pathname: '/(app)/class-selection', params: { schoolId: String(userSchools[0].schoolId) } } as any);
        } else {
          // Múltiplas escolas OU nenhuma escola -> school-selection
          router.replace({ pathname: '/(app)/school-selection' } as any);
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
    await AsyncStorage.removeItem('@refresh_token');
    router.replace('/');
  };

  return (
    <AuthContext.Provider value={{ user, schools, signIn, signOut, refreshUser, isLoading, isLoadingSchools }}>
      {children}
    </AuthContext.Provider>
  );
};