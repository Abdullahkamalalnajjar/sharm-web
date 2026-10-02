import type { LucideIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

import { TabHeader } from '@/components/layout/AppShell';
import { Button, IconWell } from '@/components/ui';

/** Full-screen placeholder for guest-only tabs (cart, orders, account). */
export function LoginRequired({ title, icon, message }: { title: string; icon: LucideIcon; message: string }) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-md">
      <TabHeader title={title} />
      <div className="flex flex-col items-stretch gap-3 px-8 pt-10 text-center">
        <IconWell icon={icon} size={88} filled className="mx-auto" />
        <p className="mt-2 text-ink-2 leading-relaxed whitespace-pre-line">{message}</p>
        <Button className="mt-3" onClick={() => navigate('/login')}>
          تسجيل الدخول
        </Button>
        <Link to="/signup" className="py-2 text-sm font-bold text-brand-ink hover:underline">
          معندكش حساب؟ سجّل دلوقتي
        </Link>
      </div>
    </div>
  );
}
