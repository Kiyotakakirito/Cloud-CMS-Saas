export interface User {
  id: string;
  email: string;
  role: 'admin' | 'owner' | 'senior_worker' | 'worker';
  tenant_id: number | null;
  full_name: string | null;
  is_active?: boolean;
  permissions?: Record<string, boolean>;
}

export type UserInfo = User;

/**
 * Check if the current user has a specific granular permission.
 * Owners and Admins automatically bypass these checks.
 */
export function hasPermission(user: UserInfo | null, permissionKey: string): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'owner') return true;
  if (!user.permissions) return false;
  return user.permissions[permissionKey] === true;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function getToken() {
  if (typeof window === 'undefined') return null;

  // Try to get token from cookie first (httpOnly)
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('access_token='))
    ?.split('=')[1];

  return cookieValue || null;
}

export function setToken(token: string) {
  if (typeof window !== 'undefined') {
    // Store user info in localStorage (non-sensitive data only)
    // JWT token will be stored in httpOnly cookie by the backend
    document.cookie = `access_token=${token}; path=/; max-age=604800; SameSite=Strict; secure=${window.location.protocol === 'https:'}`;
  }
}

export function removeToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  }
}

export function logout() {
  removeToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
}

export function getUser(): UserInfo | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
}

export function getUserRole(): string | null {
  if (typeof window === 'undefined') return null;
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role;
  } catch (e) {
    return null;
  }
}

export async function fetchMe(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;
  
  try {
    const res = await fetch(`${API_BASE}/auth/me/`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      if (res.status === 401) {
        removeToken();
      }
      return null;
    }
    return await res.json();
  } catch (err) {
    return null;
  }
}

export const ROLE_DASHBOARD: Record<string, string> = {
  admin: '/dashboard/admin',
  owner: '/dashboard/shop',
  senior_worker: '/dashboard/shop',
  worker: '/dashboard/shop',
};

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  owner: 'Owner',
  senior_worker: 'Senior',
  worker: 'Worker',
};

export const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  owner: 'bg-blue-100 text-blue-700',
  senior_worker: 'bg-purple-100 text-purple-700',
  worker: 'bg-emerald-100 text-emerald-700',
};

export async function login(email: string, password: string): Promise<User> {
  const formData = new URLSearchParams();
  formData.append('username', email.trim());
  formData.append('password', password.trim());

  const res = await fetch(`${API_BASE}/auth/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Login failed');
  }

  const data = await res.json();
  setToken(data.access_token);
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(data.user));
  }
  return data.user;
}
