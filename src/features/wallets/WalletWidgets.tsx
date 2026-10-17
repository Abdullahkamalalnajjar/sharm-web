import {
  Bike,
  Handshake,
  ReceiptText,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Wallet,
  Banknote,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import {
  Button,
  IconWell,
  InlineError,
  Price,
  Sheet,
  SoftCard,
  Spinner,
  StatusChip,
  TextField,
} from "@/components/ui";
import { errorMessage } from "@/api/client";
import { formatOrderDate, formatPrice } from "@/lib/format";
import { WALLET_ENTRY_LABEL, WITHDRAWAL_STATUS, payoutLabel } from "@/lib/meta";
import type { WalletEntry, WalletEntryKind, Withdrawal } from "@/types";

const KIND_ICON: Record<WalletEntryKind, LucideIcon> = {
  OrderEarning: ReceiptText,
  Payout: Wallet,
  CashCollected: Banknote,
  DeliveryEarning: Bike,
  PurchaseCost: ShoppingBag,
  CashHandIn: Handshake,
  Adjustment: SlidersHorizontal,
};

/** A money figure with its label, e.g. "إجمالي الأرباح 1,250 ج.م". */
export function MoneyTile({
  label,
  value,
  color,
  hint,
  onClick,
}: {
  label: string;
  value: number;
  color?: string;
  hint?: string;
  onClick?: () => void;
}) {
  return (
    <SoftCard className="flex-1 p-3" onClick={onClick}>
      <p className="text-xs text-ink-2">{label}</p>
      <p
        className="mt-1 text-lg font-extrabold"
        style={{ color: color ?? "var(--color-ink)" }}
      >
        {formatPrice(value)}
      </p>
      {hint && <p className="text-[11px] text-ink-3">{hint}</p>}
    </SoftCard>
  );
}

/** One account line: what it was, when, and the signed amount (green raises the balance, red lowers it). */
export function WalletEntryRow({
  entry,
  showParty,
}: {
  entry: WalletEntry;
  showParty?: boolean;
}) {
  const positive = entry.amount >= 0;
  const color = positive ? "var(--color-success)" : "var(--color-danger)";
  const details = [
    showParty && entry.partyName
      ? `${entry.party === "Store" ? "🏪" : "🛵"} ${entry.partyName}`
      : null,
    entry.orderNumber ? `أوردر #${entry.orderNumber}` : null,
    entry.note,
    formatOrderDate(entry.createdUtc),
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="flex items-center gap-3 border-b border-line px-3 py-3 last:border-b-0">
      <IconWell icon={KIND_ICON[entry.kind]} size={40} color={color} />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">{WALLET_ENTRY_LABEL[entry.kind]}</p>
        <p className="truncate text-xs text-ink-3">{details}</p>
      </div>
      <span dir="ltr" className="shrink-0 font-extrabold" style={{ color }}>
        {positive ? "+" : "−"} {formatPrice(Math.abs(entry.amount))}
      </span>
    </div>
  );
}

export function WithdrawalCard({
  withdrawal: w,
  showStore,
  actions,
}: {
  withdrawal: Withdrawal;
  showStore?: boolean;
  actions?: ReactNode;
}) {
  const status = WITHDRAWAL_STATUS[w.status];
  return (
    <SoftCard className="p-3">
      <div className="flex items-start gap-3">
        <IconWell
          icon={showStore ? Store : Wallet}
          size={40}
          color={status.color}
        />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-ink">
            {showStore ? w.storeName : "طلب سحب"}
          </p>
          <p className="text-xs text-ink-2">
            {payoutLabel(w.method)}
            {w.paymentDetails ? ` • ${w.paymentDetails}` : ""}
          </p>
          <p className="text-[11px] text-ink-3">
            {formatOrderDate(w.createdUtc)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Price value={w.amount} />
          <StatusChip label={status.label} color={status.color} />
        </div>
      </div>
      {w.adminNote && (
        <p className="mt-2 text-xs text-ink-2">
          {w.status === "Rejected" ? "السبب: " : "المرجع: "}
          {w.adminNote}
        </p>
      )}
      {actions && <div className="mt-3">{actions}</div>}
    </SoftCard>
  );
}

/**
 * Asks for an amount and a note. `allowNegative` for adjustments (negative lowers the balance).
 * `onSubmit` returns whether it worked; the dialog closes when it did.
 */
export function AmountDialog({
  open,
  title,
  message,
  initial,
  noteLabel = "ملاحظة (اختياري)",
  noteRequired,
  allowNegative,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  message?: string;
  initial?: number;
  noteLabel?: string;
  noteRequired?: boolean;
  allowNegative?: boolean;
  onClose: () => void;
  onSubmit: (amount: number, note: string) => Promise<boolean>;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {open && (
        <AmountForm
          message={message}
          initial={initial}
          noteLabel={noteLabel}
          noteRequired={noteRequired}
          allowNegative={allowNegative}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    </Sheet>
  );
}

function AmountForm({
  message,
  initial,
  noteLabel,
  noteRequired,
  allowNegative,
  onClose,
  onSubmit,
}: {
  message?: string;
  initial?: number;
  noteLabel: string;
  noteRequired?: boolean;
  allowNegative?: boolean;
  onClose: () => void;
  onSubmit: (amount: number, note: string) => Promise<boolean>;
}) {
  const [amount, setAmount] = useState(
    initial && initial > 0 ? String(Math.round(initial * 100) / 100) : "",
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (amount.trim() === "" || Number.isNaN(value) || value === 0)
      return setError("اكتب مبلغ");
    if (!allowNegative && value < 0) return setError("لازم أكبر من صفر");
    if (noteRequired && !note.trim()) return setError(`${noteLabel} مطلوب`);
    setBusy(true);
    const ok = await onSubmit(value, note.trim());
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {message && <p className="text-ink-2">{message}</p>}
      <TextField
        name="amount"
        type="number"
        inputMode="decimal"
        step="any"
        ltr
        autoFocus
        label="المبلغ (ج.م)"
        hint={allowNegative ? "بالسالب عشان تخصم، مثلاً -50" : undefined}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        end={<span className="text-sm">ج.م</span>}
      />
      <TextField
        name="note"
        label={noteLabel}
        maxLength={300}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {error && <InlineError message={error} />}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="md" onClick={onClose}>
          إلغاء
        </Button>
        <Button type="submit" size="md" loading={busy}>
          تمام
        </Button>
      </div>
    </form>
  );
}

/** A short text answer (a reference, a reason). Resolves null when cancelled, "" when left empty. */
export function NoteDialog({
  open,
  title,
  label,
  confirmLabel = "تأكيد",
  danger,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  label: string;
  confirmLabel?: string;
  danger?: boolean;
  onClose: () => void;
  onSubmit: (note: string) => Promise<boolean>;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = await onSubmit(note.trim());
    setBusy(false);
    if (ok) {
      setNote("");
      onClose();
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <TextField
          name="note"
          label={label}
          maxLength={300}
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="md" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="submit"
            size="md"
            variant={danger ? "danger" : "primary"}
            loading={busy}
          >
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

const PAGE_SIZE = 30;

/** Account lines, newest first, loading older pages on demand (`beforeId` = the last id shown). */
export function EntriesList({
  load,
  showParty,
  emptyMessage = "لسه مفيش حركات",
}: {
  load: (beforeId?: number) => Promise<WalletEntry[]>;
  showParty?: boolean;
  emptyMessage?: string;
}) {
  const [items, setItems] = useState<WalletEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function more() {
    if (loading || done) return;
    setLoading(true);
    try {
      const page = await load(
        items.length ? items[items.length - 1].id : undefined,
      );
      setItems((prev) => [...prev, ...page]);
      setDone(page.length < PAGE_SIZE);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  // The first page, once.
  useEffect(() => {
    void more();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 && (
        <SoftCard className="overflow-hidden">
          {items.map((e) => (
            <WalletEntryRow key={e.id} entry={e} showParty={showParty} />
          ))}
        </SoftCard>
      )}
      {items.length === 0 && done && (
        <p className="py-6 text-center text-ink-3">{emptyMessage}</p>
      )}
      {error && <InlineError message={error} />}
      {loading ? (
        <div className="grid place-items-center py-4">
          <Spinner />
        </div>
      ) : (
        !done &&
        items.length > 0 && (
          <Button
            variant="outline"
            size="md"
            className="self-center"
            onClick={more}
          >
            عرض الأقدم
          </Button>
        )
      )}
    </div>
  );
}
