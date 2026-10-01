import type { AppRole, Session } from '@/types';

const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
const ID_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';

function decodePayload(token: string): Record<string, unknown> {
  const part = token.split('.')[1];
  if (!part) throw new Error('Invalid access token');
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
  const json = decodeURIComponent(
    Array.from(atob(base64), (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
  );
  return JSON.parse(json) as Record<string, unknown>;
}

function list(value: unknown): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

/** Signed-in user, decoded from the JWT claims issued by the backend. */
export function sessionFromToken(accessToken: string): Session {
  const p = decodePayload(accessToken);
  const permissions = list(p['permission']);
  const role: AppRole = permissions.includes('stores:administer')
    ? 'admin'
    : permissions.includes('stores:manage')
      ? 'storeOwner'
      : permissions.includes('deliveries:handle')
        ? 'driver'
        : 'customer';

  return {
    userId: String(p['sub'] ?? p['nameid'] ?? p[ID_CLAIM] ?? ''),
    email: String(p['email'] ?? ''),
    roles: [...list(p['role']), ...list(p[ROLE_CLAIM])],
    permissions,
    role,
  };
}

export const homeFor = (role: AppRole): string =>
  role === 'admin' ? '/admin' : role === 'storeOwner' ? '/owner' : role === 'driver' ? '/driver' : '/';
