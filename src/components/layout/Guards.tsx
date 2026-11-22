import { Navigate, Outlet, useLocation } from 'react-router';

import { useMyProfile } from '@/api/queries';
import { CompleteProfilePage } from '@/features/auth/CompleteProfilePage';
import { homeFor } from '@/lib/session';
import { useAuth } from '@/store/auth';
import type { AppRole } from '@/types';

/** Customer area: guests and customers only. Owners and admins go to their own home. */
export function CustomerArea() {
  const session = useAuth((s) => s.session);
  const isCustomer = session?.role === 'customer';
  const profile = useMyProfile(isCustomer);
  if (session && session.role !== 'customer') return <Navigate to={homeFor(session.role)} replace />;
  // A customer with no phone number (e.g. signed in with Google) can't use the site until they add it.
  if (isCustomer && profile.data && !profile.data.phoneNumber?.trim()) return <CompleteProfilePage name={profile.data.userName} />;
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
