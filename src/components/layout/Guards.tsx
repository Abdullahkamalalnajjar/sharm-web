import { Navigate, Outlet, useLocation } from 'react-router';

import { homeFor } from '@/lib/session';
import { useAuth } from '@/store/auth';
import type { AppRole } from '@/types';

/** Customer area: guests and customers only. Owners and admins go to their own home. */
export function CustomerArea() {
  const session = useAuth((s) => s.session);
  if (session && session.role !== 'customer') return <Navigate to={homeFor(session.role)} replace />;
  return <Outlet />;
}

/** Pages that need an account with this role (owner / admin). */
export function RequireRole({ role }: { role: AppRole }) {
  const session = useAuth((s) => s.session);
  const location = useLocation();
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (session.role !== role) return <Navigate to={homeFor(session.role)} replace />;
  return <Outlet />;
}

/** Login / signup: a signed-in user is sent to their home instead. */
export function GuestOnly() {
  const session = useAuth((s) => s.session);
  if (session) return <Navigate to={homeFor(session.role)} replace />;
  return <Outlet />;
}
