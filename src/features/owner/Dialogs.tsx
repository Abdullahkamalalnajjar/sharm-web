import { useState, type FormEvent } from 'react';

import { Button, InlineError, Sheet, TextField } from '@/components/ui';

/** Small form dialogs used by the menu management screens. */

export interface CategoryValues {
  name: string;
  displayOrder: number;
}

export function CategoryDialog({
  open,
  onClose,
  onSubmit,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: CategoryValues) => Promise<void> | void;
  initial?: Partial<CategoryValues>;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={initial?.name ? 'تعديل القسم' : 'قسم جديد'}>
      {open && <CategoryForm key={JSON.stringify(initial)} initial={initial} onSubmit={onSubmit} onClose={onClose} />}
    </Sheet>
  );
}

function CategoryForm({ initial, onSubmit, onClose }: { initial?: Partial<CategoryValues>; onSubmit: (v: CategoryValues) => Promise<void> | void; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [order, setOrder] = useState(String(initial?.displayOrder ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('اسم القسم مطلوب');
    if (!Number.isInteger(Number(order))) return setError('الترتيب لازم يكون رقم');
    setBusy(true);
    await onSubmit({ name: name.trim(), displayOrder: Number(order) });
    setBusy(false);
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <TextField name="name" label="اسم القسم" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      <TextField name="order" type="number" ltr label="الترتيب" value={order} onChange={(e) => setOrder(e.target.value)} />
      {error && <InlineError message={error} />}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="md" onClick={onClose}>
          إلغاء
        </Button>
        <Button type="submit" size="md" loading={busy}>
          حفظ
        </Button>
      </div>
    </form>
  );
}

export interface OptionGroupValues {
  name: string;
  min: number;
  max: number;
}

export function OptionGroupDialog({
  open,
  onClose,
  onSubmit,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: OptionGroupValues) => Promise<void> | void;
  initial?: Partial<OptionGroupValues>;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={initial?.name ? 'تعديل المجموعة' : 'مجموعة اختيارات جديدة'}>
      {open && <OptionGroupForm key={JSON.stringify(initial)} initial={initial} onSubmit={onSubmit} onClose={onClose} />}
    </Sheet>
  );
}

function OptionGroupForm({ initial, onSubmit, onClose }: { initial?: Partial<OptionGroupValues>; onSubmit: (v: OptionGroupValues) => Promise<void> | void; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [min, setMin] = useState(String(initial?.min ?? 1));
  const [max, setMax] = useState(String(initial?.max ?? 1));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const minV = Number(min);
    const maxV = Number(max);
    if (!name.trim()) return setError('الاسم مطلوب');
    if (!Number.isInteger(minV) || minV < 0) return setError('أقل اختيار: 0 أو أكتر');
    if (!Number.isInteger(maxV) || maxV < 1) return setError('أقصى اختيار: 1 أو أكتر');
    if (maxV < minV) return setError('أقصى اختيار أقل من الأدنى');
    setBusy(true);
    await onSubmit({ name: name.trim(), min: minV, max: maxV });
    setBusy(false);
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <TextField name="name" label="الاسم (مثلاً: الحجم، الإضافات)" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <TextField name="min" type="number" ltr label="أقل اختيار" value={min} onChange={(e) => setMin(e.target.value)} />
        <TextField name="max" type="number" ltr label="أقصى اختيار" value={max} onChange={(e) => setMax(e.target.value)} />
      </div>
      <p className="text-xs text-ink-3">الحجم: أقل 1 وأقصى 1 • الإضافات: أقل 0 وأقصى 3</p>
      {error && <InlineError message={error} />}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="md" onClick={onClose}>
          إلغاء
        </Button>
        <Button type="submit" size="md" loading={busy}>
          حفظ
        </Button>
      </div>
    </form>
  );
}

export interface OptionValues {
  name: string;
  extraPrice: number;
}

export function OptionDialog({
  open,
  onClose,
  onSubmit,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: OptionValues) => Promise<void> | void;
  initial?: Partial<OptionValues>;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={initial?.name ? 'تعديل الاختيار' : 'اختيار جديد'}>
      {open && <OptionForm key={JSON.stringify(initial)} initial={initial} onSubmit={onSubmit} onClose={onClose} />}
    </Sheet>
  );
}

function OptionForm({ initial, onSubmit, onClose }: { initial?: Partial<OptionValues>; onSubmit: (v: OptionValues) => Promise<void> | void; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [price, setPrice] = useState(String(initial?.extraPrice ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const p = Number(price);
    if (!name.trim()) return setError('الاسم مطلوب');
    if (Number.isNaN(p) || p < 0) return setError('السعر الزيادة: 0 أو أكتر');
    setBusy(true);
    await onSubmit({ name: name.trim(), extraPrice: p });
    setBusy(false);
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <TextField name="name" label="الاسم (مثلاً: كبير، جبنة زيادة)" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      <TextField name="price" type="number" inputMode="decimal" ltr label="السعر الزيادة (ج.م)" value={price} onChange={(e) => setPrice(e.target.value)} />
      {error && <InlineError message={error} />}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="md" onClick={onClose}>
          إلغاء
        </Button>
        <Button type="submit" size="md" loading={busy}>
          حفظ
        </Button>
      </div>
    </form>
  );
}

/** Numeric prompt (delivery fee). Resolves to the value, or null when dismissed. */
export function NumberDialog({
  open,
  title,
  label,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  label: string;
  initial?: number | null;
  onClose: () => void;
  onSubmit: (value: number) => Promise<void> | void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {open && <NumberForm key={String(initial)} label={label} initial={initial} onClose={onClose} onSubmit={onSubmit} />}
    </Sheet>
  );
}

function NumberForm({ label, initial, onClose, onSubmit }: { label: string; initial?: number | null; onClose: () => void; onSubmit: (v: number) => Promise<void> | void }) {
  const [value, setValue] = useState(initial == null ? '' : String(initial));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(value);
    if (value.trim() === '' || Number.isNaN(n) || n < 0) return setError('اكتب رقم صحيح');
    setBusy(true);
    await onSubmit(n);
    setBusy(false);
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <TextField name="value" type="number" inputMode="decimal" ltr autoFocus label={label} value={value} onChange={(e) => setValue(e.target.value)} end={<span className="text-sm">ج.م</span>} />
      {error && <InlineError message={error} />}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="md" onClick={onClose}>
          إلغاء
        </Button>
        <Button type="submit" size="md" loading={busy}>
          حفظ
        </Button>
      </div>
    </form>
  );
}

/** Free-text prompt (cancellation reason). Submits the text, possibly empty. */
export function ReasonDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void> | void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} title="إلغاء الأوردر">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await onSubmit(reason.trim());
          setBusy(false);
          setReason('');
          onClose();
        }}
        className="flex flex-col gap-3"
      >
        <TextField name="reason" label="السبب (اختياري)" placeholder="مثلاً: المحل مقفول" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="md" onClick={onClose}>
            رجوع
          </Button>
          <Button type="submit" variant="danger" size="md" loading={busy}>
            إلغاء الأوردر
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
