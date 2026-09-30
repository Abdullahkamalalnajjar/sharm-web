import { Briefcase, CheckCircle2, Hotel, Home, MapPin, MapPinPlus, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router';

import { useAddresses, useDeliveryLocation } from '@/api/queries';
import { IconWell, Sheet } from '@/components/ui';
import { SHARM_AREAS } from '@/lib/meta';
import { useAuth } from '@/store/auth';
import { useBrowse, useLoginPrompt } from '@/store/ui';

export function addressIcon(label: string): LucideIcon {
  switch (label) {
    case 'البيت':
      return Home;
    case 'الشغل':
      return Briefcase;
    case 'الفندق':
      return Hotel;
    default:
      return MapPin;
  }
}

/** Bottom sheet to choose where to deliver: a saved address or a preset area. */
export function DeliveryPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const session = useAuth((s) => s.session);
  const addresses = useAddresses();
  const { location } = useDeliveryLocation();
  const selection = useBrowse((s) => s.selection);
  const setSelection = useBrowse((s) => s.setSelection);
  const openLogin = useLoginPrompt((s) => s.open);
  const navigate = useNavigate();

  const list = addresses.data ?? [];

  function Row({
    icon,
    title,
    subtitle,
    selected,
    onClick,
    filled,
    color,
  }: {
    icon: LucideIcon;
    title: string;
    subtitle?: string;
    selected?: boolean;
    onClick: () => void;
    filled?: boolean;
    color?: string;
  }) {
    return (
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-start hover:bg-surface-alt">
        <IconWell icon={icon} size={40} filled={filled} color={color} />
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-ink truncate">{title}</span>
          {subtitle && <span className="block text-[13px] text-ink-2 truncate">{subtitle}</span>}
        </span>
        {selected && <CheckCircle2 className="size-5 text-brand" />}
      </button>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title="مكان التوصيل">
      <p className="px-2 text-sm font-extrabold text-ink mb-1">عناويني</p>
      {session ? (
        <>
          {list.map((a) => (
            <Row
              key={a.id}
              icon={addressIcon(a.label)}
              title={a.label}
              subtitle={a.addressLine}
              selected={location?.address?.id === a.id && selection?.kind !== 'area'}
              onClick={() => {
                setSelection({ kind: 'address', addressId: a.id });
                onClose();
              }}
            />
          ))}
          <Row
            icon={MapPinPlus}
            title="إضافة / إدارة العناوين"
            filled
            onClick={() => {
              onClose();
              navigate('/addresses');
            }}
          />
        </>
      ) : (
        <Row
          icon={MapPinPlus}
          title="سجّل دخول عشان تحفظ عناوينك"
          filled
          onClick={() => {
            onClose();
            openLogin('عشان تحفظ عنوان توصيل وتطلب.');
          }}
        />
      )}
      <div className="my-3 border-t border-line" />
      <p className="px-2 text-sm font-extrabold text-ink mb-1">أو تصفح منطقة</p>
      {SHARM_AREAS.map((area) => (
        <Row
          key={area.name}
          icon={MapPin}
          title={area.name}
          color="var(--color-ink-2)"
          selected={selection?.kind === 'area' && selection.name === area.name}
          onClick={() => {
            setSelection({ kind: 'area', name: area.name });
            onClose();
          }}
        />
      ))}
    </Sheet>
  );
}
