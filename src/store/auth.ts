import { create } from 'zustand';

import { authApi } from '@/api';
import { setSessionExpiredHandler, tokenStorage } from '@/api/client';
import { sessionFromToken } from '@/lib/session';
import type { Session } from '@/types';

interface AuthState {
  /** null = guest. Guests browse stores; login is asked for when an action needs an account. */
  session: Session | null;
  login: (email: string, password: string) => Promise<Session>;
  signUp: (input: {
    email: string;
    password: string;
    role: string;
    city?: string | null;
    phoneNumber?: string | null;
  }) => Promise<Session>;
  logout: () => void;
}

function restore(): Session | null {
  const tokens = tokenStorage.read();
  if (!tokens) return null;
  try {
    return sessionFromToken(tokens.accessToken);
  } catch {
    tokenStorage.clear();
    return null;
  }
}

export const useAuth = create<AuthState>((set) => ({
  session: restore(),

  async login(email, password) {
    const tokens = await authApi.login(email, password);
    const session = sessionFromToken(tokens.accessToken);
    set({ session });
    return session;
  },

  async signUp(input) {
    const tokens = await authApi.signUp(input);
    const session = sessionFromToken(tokens.accessToken);
    set({ session });
    return session;
  },

  logout() {
    authApi.logout();
    set({ session: null });
  },
}));

setSessionExpiredHandler(() => useAuth.setState({ session: null }));

export const isSignedIn = () => useAuth.getState().session !== null;
