import axios from 'axios';
// Use the centralized auth helper so token key stays consistent
import { getToken } from './auth';

// Defina a URL base da sua API
// (Use seu IP local para testes no celular, não 'localhost')
const API_URL = 'http://192.168.0.2:8087/api'; 

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

export default api;