
import axios from 'axios';
// Use the centralized auth helper so token key stays consistent
import { getToken, removeToken } from './auth';

// Defina a URL base da sua API
// (Use seu IP local para testes no celular, não 'localhost')
const API_URL = 'http://192.168.0.4:8087/api'; 

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

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

// Interceptor de resposta: Captura erros 401/403 e faz logout silencioso
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Se for erro de autenticação (401 Unauthorized ou 403 Forbidden)
    // E NÃO for um erro do endpoint de login
    const isAuthError = error?.response?.status === 401 || error?.response?.status === 403;
    const isLoginEndpoint = error?.config?.url?.includes('/auth/login');
    
    if (isAuthError && !isLoginEndpoint) {
      console.warn('🔒 Token inválido ou expirado. Fazendo logout...');
      await removeToken();
      // Nota: Não redireciona aqui - deixa o AuthContext detectar a falta de token
    }
    
    return Promise.reject(error);
  }
);

export default api;