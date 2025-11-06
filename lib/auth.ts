import * as SecureStore from 'expo-secure-store';

// Keep a single canonical SecureStore key used across the app
const TOKEN_KEY = 'authToken';

type AuthListener = (isAuthenticated: boolean) => void;
const listeners = new Set<AuthListener>();

export async function saveToken(token: string) {
  const res = await SecureStore.setItemAsync(TOKEN_KEY, token);
  // notify listeners that user is now authenticated
  listeners.forEach((l) => l(true));
  return res;
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function removeToken() {
  const res = await SecureStore.deleteItemAsync(TOKEN_KEY);
  // notify listeners that user is no longer authenticated
  listeners.forEach((l) => l(false));
  return res;
}

export async function authHeader() {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function addAuthListener(fn: AuthListener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function removeAuthListener(fn: AuthListener) {
  listeners.delete(fn);
}

export default { saveToken, getToken, removeToken, authHeader, addAuthListener, removeAuthListener };
