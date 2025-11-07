
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Use the centralized auth helper so token key stays consistent
import { getToken, removeToken, saveToken } from './auth';

// Defina a URL base da sua API
// (Use seu IP local para testes no celular, não 'localhost')
const API_URL = 'http://192.168.0.5:8087/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Flag para evitar múltiplas tentativas de refresh simultâneas
let isRefreshing = false;
let failedQueue: any[] = [];

// Interceptor: Adiciona o token em CADA requisição autenticada
api.interceptors.request.use(async (config: any) => {
  const token = await getToken();

  // Não anexe o token em endpoints de autenticação (ex.: login, register).
  // Alguns backends rejeitam quando um token inválido/expirado é enviado no login.
  const url = String(config.url || '');
  const isAuthEndpoint = /^\/?auth\/(login|register|refresh)/i.test(url)

  // Se já existe Authorization definido explicitamente, não sobrescreve.
  const hasAuthHeader = !!(config.headers && (config.headers.Authorization || config.headers.authorization));

  if (token && !isAuthEndpoint && !hasAuthHeader) {
    config.headers = {
      ...(config.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    };
  }

  return config;
}, (error: any) => Promise.reject(error));

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor de resposta: Captura erros 401 e tenta renovar o token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Se for erro 401 E NÃO for o endpoint de login/refresh
    const is401 = error?.response?.status === 401;
    const isLoginEndpoint = error?.config?.url?.includes('/auth/login');
    const isRefreshEndpoint = error?.config?.url?.includes('/auth/refresh');
    
    if (is401 && !isLoginEndpoint && !isRefreshEndpoint && !originalRequest._retry) {
      if (isRefreshing) {
        // Se já está renovando, adiciona na fila
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Buscar refresh token do AsyncStorage
        const refreshToken = await AsyncStorage.getItem('@refresh_token');
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Tentar renovar o access token
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken
        });

        const { token: newAccessToken } = response.data as { token: string; refreshToken: string };
        
        // Salvar novo access token
        await saveToken(newAccessToken);
        
        // Atualizar o header da requisição original
        originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
        
        // Processar fila de requisições que falharam
        processQueue(null, newAccessToken);
        
        isRefreshing = false;
        
        // Tentar a requisição original novamente
        return api(originalRequest);
        
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        
        // Se falhou ao renovar, fazer logout
        console.warn('🔒 Falha ao renovar token. Fazendo logout...');
        await removeToken();
        await AsyncStorage.removeItem('@refresh_token');
        
        return Promise.reject(refreshError);
      }
    }
    
    // Para outros erros, rejeitar normalmente
    return Promise.reject(error);
  }
);

export default api;