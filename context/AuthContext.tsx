// context/AuthContext.tsx
import api from '@/lib/api';
import axios from 'axios';
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
  name: string;
  lastName?: string;
  email: string;
  role: 'SUPER_ADMIN' | 'USER';
}

// --- Definição do Contexto ---
interface AuthContextData {
  user: UserDTO | null;
  schools: SchoolContextDTO[];
  // signIn now expects email + password (backend authenticates by email)
  signIn: (email: string, password: string) => Promise<void>;
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
  const [didInitialRedirect, setDidInitialRedirect] = useState(false);

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
        setDidInitialRedirect(false);
        return;
      }

      // 1. Buscar dados do usuário (VALIDA O TOKEN)
      let userResponse;
      try {
        userResponse = await api.get<UserDTO>('/users/me');
        setUser(userResponse.data);
      } catch (err: any) {
        const status = err?.response?.status;
        // Se o token expirou ou foi rejeitado com 401/403, tentar renovar usando refresh token
        if (status === 401 || status === 403) {
          try {
            const refreshToken = await AsyncStorage.getItem('@refresh_token');
            if (refreshToken) {
              const refreshResp = await axios.post(`${(api.defaults.baseURL || '').replace(/\/$/, '')}/auth/refresh`, { refreshToken });
              const newToken = (refreshResp.data as any)?.token;
              if (newToken) {
                await saveToken(newToken);
                // tentar novamente
                userResponse = await api.get<UserDTO>('/users/me');
                setUser(userResponse.data);
              } else {
                throw err;
              }
            } else {
              throw err;
            }
          } catch (refreshErr) {
            console.warn('Falha ao renovar token durante loadUserData:', refreshErr);
            // limpeza segura
            await removeToken();
            await AsyncStorage.removeItem('@refresh_token');
            setUser(null);
            setSchools([]);
            setIsLoadingSchools(false);
            return;
          }
        } else {
          throw err;
        }
      }

      // 2. Buscar escolas do usuário (se não for SuperAdmin)
      if (userResponse.data.role === 'USER') {
        setIsLoadingSchools(true);
        try {
          // Use the same endpoint used after sign-in for consistency
          const schoolsResponse = await api.get<SchoolContextDTO[]>('/schools/me');
          setSchools(schoolsResponse.data);
        } catch (schoolError: any) {
          console.log('Erro ao carregar escolas:', schoolError);
          // If we got 403/401 even after refresh attempt above, clear state and tokens
          const status = schoolError?.response?.status;
          if (status === 401 || status === 403) {
            try {
              await removeToken();
              await AsyncStorage.removeItem('@refresh_token');
            } catch (err) { /* ignore */ }
            setUser(null);
            setSchools([]);
            setIsLoadingSchools(false);
            return;
          }
          setSchools([]);
        } finally {
          setIsLoadingSchools(false);
        }
      } else {
        setSchools([]);
      }
    } catch (e: any) {
      console.log('Falha ao carregar usuário:', e);
      // IMPORTANTE: Limpar todo o estado em caso de erro
      setUser(null);
      setSchools([]);
      setIsLoadingSchools(false);
      setDidInitialRedirect(false);
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
      if (!didInitialRedirect && (segs.length === 0 || segs[0] !== '(app)')) {
        redirectToDashboard();
        setDidInitialRedirect(true);
      }
    }
  }, [user, isLoading, segments]);

  const redirectToDashboard = () => {
    if (!user) return;
    if (user.role === 'SUPER_ADMIN') {
      // avoid replacing if already on the same page
      const alreadyOn = (segments as unknown as string[]).includes('dashboard') || (segments as unknown as string[]).includes('(superadmin)');
      if (!alreadyOn) router.replace('/(superadmin)/dashboard' as any);
    } else {
      // Determine target
      let target = '/(app)/school-selection';
      if (schools.length === 1) {
        target = `/(app)/class-selection?schoolId=${schools[0].schoolId}`;
      }
      // If we're already on the intended route, don't replace to avoid navigation loops
      const segs = segments as unknown as string[];
      const alreadyOnTarget = (segs && segs.length > 0 && (
        (target.includes('school-selection') && segs.includes('school-selection')) ||
        (target.includes('class-selection') && segs.includes('class-selection'))
      ));
      if (!alreadyOnTarget) {
        router.replace(target as any);
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🚀 Iniciando login...');
      console.log('📍 API Base URL:', api.defaults.baseURL);
      console.log('👤 Email:', email);
      
      const response = await api.post<{ token: string; refreshToken: string }>('/auth/login', { email, password });
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
      // Após login, checar se existe um token de convite pendente e aplicar
      try {
        const pending = await AsyncStorage.getItem('@pending_invite_token');
        if (pending) {
          try {
            await api.post('/invites/accept', { token: pending });
            console.log('✅ Convite aplicado após login');
            await AsyncStorage.removeItem('@pending_invite_token');
            // atualizar usuário/escolas
            try { const refreshed = await api.get<UserDTO>('/users/me'); setUser(refreshed.data); } catch(e){/*ignore*/}
          } catch (e) {
            console.warn('Falha ao aplicar convite pendente:', e);
          }
        }
      } catch (e) {
        console.warn('Erro ao checar convite pendente:', e);
      }
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

      // Preserve the original axios error so callers (UI) can inspect response/status
      // and show appropriate user-facing messages. Previously we wrapped the error
      // losing response metadata which prevented granular error handling on the UI.
      throw e;
    }
  };

  const signOut = async () => {
    setUser(null);
    setSchools([]);
    setDidInitialRedirect(false);
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