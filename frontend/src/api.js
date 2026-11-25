// Talks to the FastAPI backend. The login token is kept in the phone's secure storage.
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';

let token = null;
export const loadToken = async () => (token = await SecureStore.getItemAsync('token'));
export const setToken = async (t) => {
  token = t;
  if (t) await SecureStore.setItemAsync('token', t);
  else await SecureStore.deleteItemAsync('token');
};

async function req(path, method = 'GET', body) {
  let res;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running and API_URL correct?');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const d = data?.detail;
    const e = new Error(typeof d === 'string' ? d : Array.isArray(d) ? d[0]?.msg ?? 'Invalid input' : 'Something went wrong');
    e.status = res.status;
    throw e;
  }
  return data;
}

export const register = (username, password) => req('/auth/register', 'POST', { username, password });
export const login = (username, password) => req('/auth/login', 'POST', { username, password });
export const me = () => req('/me');
export const listGames = () => req('/games');
export const createGame = (g) => req('/games', 'POST', g);
export const updateGame = (id, g) => req(`/games/${id}`, 'PUT', g);
export const deleteGame = (id) => req(`/games/${id}`, 'DELETE');
export const joinGame = (id) => req(`/games/${id}/join`, 'POST');
export const listUsers = () => req('/admin/users');
export const deleteUser = (id) => req(`/admin/users/${id}`, 'DELETE');
