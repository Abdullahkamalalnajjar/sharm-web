import clsx from 'clsx';
import { AlertCircle, Loader2, WifiOff, type LucideIcon } from 'lucide-react';
import { forwardRef, useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';

import { formatPrice, resolveImageUrl } from '@/lib/format';

// ---------- Buttons ----------

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
  icon?: ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-light shadow-brand',
  secondary: 'bg-surface-alt text-ink hover:bg-surface-high',
  outline: 'border border-surface-high text-ink hover:bg-surface-alt',
  ghost: 'text-brand-ink hover:bg-brand/10',
  danger: 'bg-danger text-white hover:brightness-110',
  success: 'bg-success text-white hover:brightness-110',
};

const sizeClass: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-[54px] px-6 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'lg', loading, block, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-full font-extrabold transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98]',
        variantClass[variant],
        sizeClass[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-5 animate-spin" /> : icon}
      {children}
    </button>
  );
});

/** Charcoal circular icon button; `filled` makes it DoorDash red. */
export function RoundIconButton({
  icon: Icon,
  filled,
  badge,
  size = 46,
  className,
  title,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; filled?: boolean; badge?: boolean; size?: number }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      style={{ width: size, height: size }}
      className={clsx(
        'relative grid place-items-center rounded-full transition-colors active:scale-95',
        filled ? 'bg-brand text-white shadow-brand hover:bg-brand-light' : 'bg-surface border border-line text-ink hover:bg-surface-alt',
        className,
      )}
      {...rest}
    >
      <Icon style={{ width: size * 0.46, height: size * 0.46 }} />
      {badge && <span className="absolute top-0.5 end-0.5 size-2.5 rounded-full bg-brand ring-2 ring-surface" />}
    </button>
  );
}

// ---------- Surfaces ----------

export function SoftCard({
  children,
  className,
  onClick,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  as?: 'div' | 'button' | 'article';
}) {
  return (
    <Tag
      onClick={onClick}
      className={clsx(
        'card text-start',
        onClick && 'cursor-pointer hover:border-surface-high transition-colors w-full',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** Icon on a soft tinted circle. */
export function IconWell({
  icon: Icon,
  size = 44,
  color = 'var(--color-brand)',
  filled,
  className,
}: {
  icon: LucideIcon;
  size?: number;
  color?: string;
  filled?: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx('grid place-items-center rounded-full shrink-0', className)}
      style={{
        width: size,
        height: size,
        background: filled ? color : `color-mix(in srgb, ${color} 16%, transparent)`,
        color: filled ? '#fff' : color,
      }}
    >
      <Icon style={{ width: size * 0.48, height: size * 0.48 }} />
    </span>
  );
}

export function StatusChip({ label, color, className }: { label: string; color: string; className?: string }) {
  return (
    <span
      className={clsx('pill text-ink', className)}
      style={{ background: `color-mix(in srgb, ${color} 20%, transparent)` }}
    >
      <span className="size-[7px] rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

/** Red pill for counts and short tags. */
export function CountPill({ children, color = 'var(--color-brand)' }: { children: ReactNode; color?: string }) {
  return (
    <span className="pill text-white" style={{ background: color }}>
      {children}
    </span>
  );
}

/** Price in the highlight yellow. */
export function Price({ value, prefix, className }: { value: number; prefix?: string; className?: string }) {
  return (
    <span className={clsx('text-accent font-extrabold', className)}>
      {prefix ? `${prefix} ` : ''}
      {formatPrice(value)}
    </span>
  );
}

export function SectionHeader({
  title,
  pill,
  action,
  onAction,
  className,
}: {
  title: string;
  pill?: string;
  action?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={clsx('flex items-center gap-2 pt-5 pb-2.5', className)}>
      <h2 className="text-[19px] font-extrabold text-ink truncate">{title}</h2>
      {pill && <CountPill>{pill}</CountPill>}
      <span className="flex-1" />
      {action &&
        (onAction ? (
          <button type="button" onClick={onAction} className="text-[13px] font-bold text-brand-ink hover:underline">
            {action}
          </button>
        ) : (
          <span className="text-[13px] font-bold text-ink-3">{action}</span>
        ))}
    </div>
  );
}

// ---------- Forms ----------

export const TextField = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string; start?: ReactNode; end?: ReactNode; ltr?: boolean }
>(function TextField({ label, error, hint, start, end, ltr, className, id, ...rest }, ref) {
  const inputId = id ?? rest.name;
  return (
    <label className={clsx('block', className)} htmlFor={inputId}>
      {label && <span className="block text-[13px] font-bold text-ink-2 mb-1.5">{label}</span>}
      <span className="relative block">
        {start && <span className="absolute inset-y-0 start-4 grid place-items-center text-ink-3">{start}</span>}
        <input
          ref={ref}
          id={inputId}
          dir={ltr ? 'ltr' : undefined}
          className={clsx('field', start && 'ps-12', end && 'pe-12', error && 'border-danger', ltr && 'text-left')}
          {...rest}
        />
        {end && <span className="absolute inset-y-0 end-3 grid place-items-center text-ink-3">{end}</span>}
      </span>
      {error ? (
        <span className="block text-xs text-danger mt-1">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-ink-3 mt-1">{hint}</span>
      ) : null}
    </label>
  );
});

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }
>(function TextArea({ label, error, className, id, ...rest }, ref) {
  const inputId = id ?? rest.name;
  return (
    <label className={clsx('block', className)} htmlFor={inputId}>
      {label && <span className="block text-[13px] font-bold text-ink-2 mb-1.5">{label}</span>}
      <textarea ref={ref} id={inputId} className={clsx('field resize-none', error && 'border-danger')} {...rest} />
      {error && <span className="block text-xs text-danger mt-1">{error}</span>}
    </label>
  );
});

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50',
        checked ? 'bg-brand' : 'bg-surface-high',
      )}
    >
      <span
        className={clsx(
          'absolute top-1 size-5 rounded-full bg-white transition-all',
          checked ? 'start-6' : 'start-1',
          !checked && 'bg-ink-3',
        )}
      />
    </button>
  );
}

export function Chip({
  selected,
  onClick,
  children,
  icon,
  className,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-bold border transition-colors whitespace-nowrap',
        selected ? 'bg-brand border-brand text-white' : 'bg-surface border-line text-ink hover:bg-surface-alt',
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
}) {
  return (
    <div className="grid gap-1 p-1 rounded-full bg-surface border border-line" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx(
            'h-10 rounded-full text-sm font-bold inline-flex items-center justify-center gap-1.5 transition-colors',
            o.value === value ? 'bg-brand text-white' : 'text-ink-2 hover:text-ink',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- States ----------

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('size-7 animate-spin text-brand', className)} />;
}

export function Loading({ className }: { className?: string }) {
  return (
    <div className={clsx('grid place-items-center py-16', className)}>
      <Spinner />
    </div>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-12 px-6">
      <IconWell icon={WifiOff} size={72} color="var(--color-ink-3)" />
      <p className="text-ink-2 whitespace-pre-line">{message}</p>
      {onRetry && (
        <Button variant="outline" size="md" onClick={onRetry}>
          حاول تاني
        </Button>
      )}
    </div>
  );
}

export function EmptyView({ icon, message, action }: { icon: LucideIcon; message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-14 px-6">
      <IconWell icon={icon} size={84} />
      <p className="text-ink-2 font-semibold whitespace-pre-line leading-relaxed">{message}</p>
      {action}
    </div>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[14px] bg-danger/15 px-3 py-2.5 text-sm font-semibold text-ink">
      <AlertCircle className="size-5 text-danger shrink-0" />
      <span className="whitespace-pre-line">{message}</span>
    </div>
  );
}

// ---------- Images ----------

/** Network image for uploaded store/product images with a fallback. */
export function AppImage({ url, fallback, className, alt = '' }: { url: string | null | undefined; fallback: ReactNode; className?: string; alt?: string }) {
  const src = resolveImageUrl(url);
  if (!src) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={clsx('h-full w-full object-cover', className)}
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}

// ---------- Overlays ----------

/** Centered dialog on desktop, bottom sheet on phones. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade" role="dialog" aria-modal="true">
      <button type="button" aria-label="إغلاق" onClick={onClose} className="absolute inset-0 bg-black/65" />
      <div
        className={clsx(
          'relative w-full bg-surface flex flex-col max-h-[92dvh] animate-sheet',
          'rounded-t-[28px] sm:rounded-[24px] sm:m-4 border border-line',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-surface-high sm:hidden" />
        {title && <h3 className="px-5 pt-4 text-lg font-extrabold text-ink">{title}</h3>}
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
        {footer && <div className="border-t border-line px-5 py-3 pb-[max(env(safe-area-inset-bottom),12px)]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
