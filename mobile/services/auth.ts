import * as SecureStore from 'expo-secure-store';
import api from './api';
import { TOKEN_KEY, USER_KEY } from '@/constants/config';
import type { LoginResponse, AuthUser, AuthWorkspace } from '@/types';

export interface StoredSession {
  user: AuthUser;
  workspace: AuthWorkspace;
  token: string;
}

/**
 * Login: POST /api/auth/login
 * Returns the user, workspace, and accessToken.
 * Stores token in SecureStore (never AsyncStorage).
 */
export async function login(email: string, password: string): Promise<StoredSession> {
  const { data } = await api.post<LoginResponse>('/api/auth/login', { email, password });

  if (!data.accessToken) {
    throw new Error('No access token returned from server');
  }

  // Store token securely
  await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken);

  const session: StoredSession = {
    user: data.user,
    workspace: data.workspace,
    token: data.accessToken,
  };

  // Store user metadata (non-sensitive) for UI use
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify({ user: data.user, workspace: data.workspace }));

  return session;
}

/**
 * Logout: clear token and user from SecureStore
 */
export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

/**
 * Restore session from SecureStore on app start.
 * Returns null if no valid session exists.
 */
export async function restoreSession(): Promise<StoredSession | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const userJson = await SecureStore.getItemAsync(USER_KEY);

    if (!token || !userJson) return null;

    const { user, workspace } = JSON.parse(userJson);

    // Validate token is still working against /api/auth/me
    // This sets the Bearer header via the interceptor
    const { data } = await api.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!data.user) {
      await logout();
      return null;
    }

    // Refresh user data from server
    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        role: data.user.role,
        phone: data.user.phone,
        tenantProfile: data.user.tenantProfile,
      },
      workspace: data.workspace,
      token,
    };
  } catch {
    // Token expired or invalid — clear storage
    await logout();
    return null;
  }
}
