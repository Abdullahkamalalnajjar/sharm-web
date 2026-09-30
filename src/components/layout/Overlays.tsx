import clsx from 'clsx';
import { AlertCircle, CheckCircle2, Lock, X } from 'lucide-react';
import { useNavigate } from 'react-router';

import { Button, IconWell, Sheet } from '@/components/ui';
import { useConfirm, useLoginPrompt, useToasts } from '@/store/ui';

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+92px)] sm:bottom-6 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={clsx(
            'pointer-events-auto flex items-center gap-2 rounded-2xl px-4 py-3 shadow-card text-sm font-semibold text-white max-w-md w-full animate-sheet',
            t.isError ? 'bg-danger' : 'bg-surface-alt border border-line',
          )}
        >
          {t.isError ? <AlertCircle className="size-5 shrink-0" /> : <CheckCircle2 className="size-5 shrink-0 text-success" />}
          <span className="flex-1 whitespace-pre-line">{t.message}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action?.onClick();
                dismiss(t.id);
              }}
              className="font-extrabold text-accent"
            >
              {t.action.label}
            </button>
          )}
          <button type="button" aria-label="إغلاق" onClick={() => dismiss(t.id)} className="opacity-70 hover:opacity-100">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ConfirmDialog() {
  const current = useConfirm((s) => s.current);
  const answer = useConfirm((s) => s.answer);
  return (
    <Sheet open={current !== null} onClose={() => answer(false)}>
      {current && (
        <div className="flex flex-col gap-5">
          <p className="text-ink-2 text-[15px] leading-relaxed pt-2">{current.message}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="md" onClick={() => answer(false)}>
              إلغاء
            </Button>
            <Button variant="danger" size="md" onClick={() => answer(true)}>
              {current.confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/** Asks a guest to log in or sign up before an action that needs an account. */
export function LoginPromptSheet() {
  const reason = useLoginPrompt((s) => s.reason);
  const close = useLoginPrompt((s) => s.close);
  const navigate = useNavigate();
  const go = (path: string) => {
    close();
    navigate(path);
  };
  return (
    <Sheet open={reason !== null} onClose={close}>
      <div className="flex flex-col items-stretch gap-3 text-center pt-2">
        <IconWell icon={Lock} size={64} filled className="mx-auto" />
        <h3 className="text-xl font-extrabold text-ink mt-2">سجّل دخول الأول</h3>
        <p className="text-ink-2">{reason}</p>
        <Button className="mt-3" onClick={() => go('/login')}>
          تسجيل الدخول
        </Button>
        <Button variant="outline" onClick={() => go('/signup')}>
          حساب جديد
        </Button>
      </div>
    </Sheet>
  );
}
