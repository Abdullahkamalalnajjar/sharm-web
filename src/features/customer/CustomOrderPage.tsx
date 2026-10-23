import clsx from 'clsx';
import {
  Banknote,
  Circle,
  CircleDot,
  HelpCircle,
  LogIn,
  Lock,
  MapPinPlus,
  Send,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { ordersApi } from '@/api';
import { errorMessage } from '@/api/client';
import { keys, useAddresses } from '@/api/queries';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, EmptyView, ErrorView, IconWell, InlineError, Loading, SectionHeader, SoftCard, TextArea } from '@/components/ui';
import { AddressFormSheet } from '@/features/addresses/AddressForm';
import { addressIcon } from '@/features/customer/DeliveryPicker';
import { addressDetails } from '@/lib/format';
import { isSignedIn, useAuth } from '@/store/auth';
import { showMessage, useLoginPrompt, useToasts } from '@/store/ui';
import type { Address } from '@/types';

import { CUSTOM_ORDER_LOGIN_REASON } from './Showcase';

const SUGGESTIONS = [
  { label: 'صيدلية 💊', prompt: 'من صيدلية: ' },
  { label: 'سوبرماركت 🛒', prompt: 'من سوبرماركت: ' },
  { label: 'مخبز وحلواني 🥐', prompt: 'من مخبز: ' },
  { label: 'خضار وفواكه 🍎', prompt: 'من محل خضار وفواكه: ' },
  { label: 'توصيل أمانة / طرد 📦', prompt: 'استلام طرد أو أمانة من: ' },
  { label: 'كافيه أو مشروبات ☕', prompt: 'من كافيه: ' },
];

export function CustomOrderPage() {
  const addresses = useAddresses();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const openLogin = useLoginPrompt((s) => s.open);
  const toast = useToasts((s) => s.show);

  const [addressId, setAddressId] = useState<number | null>(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const signedIn = useAuth((s) => s.session !== null);

  const list = addresses.data ?? [];
  const selected = list.find((a) => a.id === addressId) ?? list.find((a) => a.isDefault) ?? list[0];

  function applySuggestion(prefix: string) {
    if (!details.trim()) {
      setDetails(prefix);
    } else if (!details.includes(prefix)) {
      setDetails((prev) => `${prev.trim()}\n${prefix}`);
    }
  }

  async function submit() {
    if (!isSignedIn()) {
      openLogin('سجّل دخول عشان ترسل طلبك الخاص وتتابعه.');
      return;
    }
    if (!selected) {
      setError('من فضلك اختار عنوان التوصيل أو ضيف عنوان جديد');
      return;
    }
    if (!details.trim() || details.trim().length < 5) {
      setError('اكتب تفاصيل طلبك بالتفصيل (اسم المحل والمنتجات المطلوبة)');
      return;
    }

    setError(null);
    setPlacing(true);
    try {
      const orderId = await ordersApi.placeCustom(selected.id, details.trim());
      qc.invalidateQueries({ queryKey: keys.myOrders });
      toast('تم إرسال طلبك الخاص بنجاح! 🎉');
      navigate(`/orders/${orderId}`, { replace: true, state: { justPlaced: true } });
    } catch (e) {
      const msg = errorMessage(e);
      setError(msg);
      showMessage(msg, true);
      setPlacing(false);
    }
  }

  // Opened directly by a guest: ask to sign in instead of a form that can't be sent.
  if (!signedIn)
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="طلب خاص" subtitle="اطلب أي حاجة من أي مكان في شرم" />
        <EmptyView
          icon={Lock}
          message={`سجّل دخول الأول\n${CUSTOM_ORDER_LOGIN_REASON}`}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="md" icon={<LogIn className="size-4" />} onClick={() => navigate('/login', { state: { from: '/custom-order' } })}>
                تسجيل الدخول
              </Button>
              <Button size="md" variant="outline" onClick={() => navigate('/signup')}>
                حساب جديد
              </Button>
            </div>
          }
        />
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl pb-32">
      <PageHeader title="طلب خاص" subtitle="اطلب أي حاجة من أي مكان في شرم" />

      <div className="px-4 flex flex-col gap-5 pt-2">
        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-[24px] p-5 text-white shadow-brand bg-gradient-to-br from-brand via-brand-dark to-[#4A154B]">
          <div className="absolute -top-10 -end-10 size-40 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="relative z-[1] flex items-start gap-3.5">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/18 backdrop-blur-md text-white shadow-sm">
              <Sparkles className="size-6 text-highlight" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-highlight">
                خدمة التوصيل السريع
              </span>
              <h2 className="mt-1.5 text-lg font-black leading-snug">محتاج حاجة مش في القايمة؟</h2>
              <p className="mt-1 text-[13px] text-white/90 leading-relaxed">
                صيدلية، سوبرماركت، مطعم، أو أي غرض محتاجه في شرم الشيخ... اكتبلنا تفاصيله وهنبعتلك مندوب يجيبه لحد عندك.
              </p>
            </div>
          </div>
        </div>

        {/* Suggestion Chips */}
        <div>
          <p className="mb-2 text-xs font-extrabold text-ink-3">أفكار سريعة للطلب:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => applySuggestion(s.prompt)}
                className="pill bg-surface border border-line hover:border-brand hover:text-brand transition-colors text-xs font-bold text-ink"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Request Details Input */}
        <div>
          <SectionHeader title="تفاصيل طلبك" pill="مطلوب" />
          <SoftCard className="p-4 flex flex-col gap-2.5">
            <label htmlFor="custom-request-details" className="text-xs font-bold text-ink-2">
              اكتب المحل أو المكان والمنتجات اللي محتاجها بالكميات:
            </label>
            <TextArea
              id="custom-request-details"
              name="requestDetails"
              rows={4}
              maxLength={1000}
              autoFocus
              value={details}
              onChange={(e) => {
                setDetails(e.target.value);
                if (error) setError(null);
              }}
              placeholder="مثال: من صيدلية العزبي في خليج نعمة: علبة بنادول أزرق وشريط فيتامين سي فوار... أو: محتاج طلب من سوبرماركت كذا كذا"
              className="text-sm"
            />
            <div className="flex items-center justify-between text-xs text-ink-3">
              <span>كل ما تكتب تفاصيل أوضح، المندوب هيوصلك أسرع</span>
              <span dir="ltr">{details.length} / 1000</span>
            </div>
          </SoftCard>
        </div>

        {/* Delivery Address Section */}
        <div>
          <SectionHeader title="عنوان التوصيل" action="إضافة عنوان جديد" onAction={() => setFormOpen(true)} />
          {addresses.isLoading ? (
            <Loading className="py-4" />
          ) : addresses.isError ? (
            <ErrorView message={(addresses.error as Error).message} onRetry={() => addresses.refetch()} />
          ) : list.length === 0 ? (
            <SoftCard as="button" onClick={() => setFormOpen(true)} className="flex items-center gap-3 p-4 w-full text-start">
              <IconWell icon={MapPinPlus} filled />
              <div className="flex-1">
                <span className="block font-bold text-ink">ضيف عنوان التوصيل الأول</span>
                <span className="block text-xs text-ink-3">عشان المندوب يعرف هيوصلك فين</span>
              </div>
            </SoftCard>
          ) : (
            <div className="flex flex-col gap-2">
              {list.map((a) => (
                <AddressOption key={a.id} address={a} selected={a.id === selected?.id} onSelect={() => setAddressId(a.id)} />
              ))}
            </div>
          )}
        </div>

        {/* How it works info */}
        <SoftCard className="p-4 bg-surface-alt/70">
          <div className="flex items-center gap-2 mb-3 text-ink font-extrabold text-[14px]">
            <HelpCircle className="size-4 text-brand" />
            <span>إزاي بيشتغل الطلب الخاص؟</span>
          </div>
          <div className="grid gap-3 text-xs sm:grid-cols-3">
            <div className="flex items-start gap-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand/15 text-brand font-black text-xs">
                1
              </span>
              <div>
                <p className="font-bold text-ink">اكتب طلبك وعنوانك</p>
                <p className="text-ink-3 mt-0.5">اكتب التفاصيل والمكان بالتحديد</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand/15 text-brand font-black text-xs">
                2
              </span>
              <div>
                <p className="font-bold text-ink">مراجعة وتحديد السعر</p>
                <p className="text-ink-3 mt-0.5">الإدارة بتحدد سعر المنتجات والتوصيل</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand/15 text-brand font-black text-xs">
                3
              </span>
              <div>
                <p className="font-bold text-ink">استلام ودفع كاش</p>
                <p className="text-ink-3 mt-0.5">المندوب هيوصله وتدفع كاش عند الاستلام</p>
              </div>
            </div>
          </div>
        </SoftCard>

        {/* Payment Method */}
        <SoftCard className="p-3.5 flex items-center gap-3">
          <IconWell icon={Banknote} color="var(--color-success)" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink text-sm">الدفع كاش عند الاستلام</p>
            <p className="text-xs text-ink-3">بتدفع قيمة المنتجات والتوصيل للمندوب لما يوصل</p>
          </div>
          <span className="pill bg-success/15 text-success text-xs font-bold">كاش</span>
        </SoftCard>

        {error && <InlineError message={error} />}
      </div>

      {/* Floating Bottom Action Bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pt-4 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="mx-auto max-w-2xl">
          <Button
            block
            size="lg"
            loading={placing}
            disabled={!selected && list.length > 0}
            icon={<Send className="size-4 rtl:-scale-x-100" />}
            onClick={submit}
          >
            إرسال الطلب الخاص
          </Button>
        </div>
      </div>

      <AddressFormSheet open={formOpen} onClose={() => setFormOpen(false)} onSaved={(a) => setAddressId(a.id)} />
    </div>
  );
}

function AddressOption({ address, selected, onSelect }: { address: Address; selected: boolean; onSelect: () => void }) {
  const Icon = addressIcon(address.label);
  const details = addressDetails(address);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'card flex w-full items-center gap-3 p-3.5 text-start transition-all',
        selected ? 'border-brand ring-2 ring-brand/15 shadow-sm' : 'hover:border-surface-high',
      )}
    >
      <IconWell icon={Icon} size={42} filled={selected} />
      <span className="min-w-0 flex-1">
        <span className="block font-extrabold text-ink">{address.label}</span>
        <span className="line-clamp-2 text-[13px] text-ink-2">{[address.addressLine, details].filter(Boolean).join(' • ')}</span>
      </span>
      {selected ? <CircleDot className="size-6 text-brand shrink-0" /> : <Circle className="size-6 text-ink-3 shrink-0" />}
    </button>
  );
}
