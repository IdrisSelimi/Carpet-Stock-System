import api from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UserInfo {
  id: string;
  email: string;
  first_name?: string;
  lastName?: string;
  role: 'MANAGER' | 'STORE_WORKER';
  store_id: string | null;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<{ access_token: string; refresh_token: string; user: UserInfo }>('/auth/login', payload),
  logout: (refreshToken?: string) =>
    api.post('/auth/logout', refreshToken ? { refresh_token: refreshToken } : {}),
  me: () => api.get<UserInfo>('/auth/me'),
};
