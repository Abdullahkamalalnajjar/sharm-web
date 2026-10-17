import { SlidersHorizontal, Wallet } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useParams } from "react-router";

import { walletsApi } from "@/api";
import {
  useRefreshWallets,
  useStore,
  useStoreWallet,
  useStoreWithdrawals,
} from "@/api/queries";
import { PageHeader } from "@/components/layout/AppShell";
import {
  Button,
  Chip,
  ErrorView,
  InlineError,
  Loading,
  RoundIconButton,
  SectionHeader,
  Sheet,
  SoftCard,
  TextField,
} from "@/components/ui";
import { formatPrice } from "@/lib/format";
import { PAYOUT_METHODS } from "@/lib/meta";
import { runAction } from "@/lib/run-action";
import type { PayoutMethod } from "@/types";

import {
  AmountDialog,
  EntriesList,
  MoneyTile,
  WalletEntryRow,
  WithdrawalCard,
} from "./WalletWidgets";

/**
 * A store's wallet: what the app owes it after the commission, its account lines, and withdrawals.
 * The owner requests withdrawals; the admin (`isAdmin`) can also correct the balance.
 */
export function StoreWalletPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const storeId = Number(useParams().id);
  const wallet = useStoreWallet(storeId);
  const withdrawals = useStoreWithdrawals(storeId);
  const store = useStore(storeId);
  const refresh = useRefreshWallets();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const name = wallet.data?.storeName ?? store.data?.name ?? "";
  const w = wallet.data;

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <PageHeader
        title={name ? `محفظة ${name}` : "المحفظة"}
        actions={
          isAdmin ? (
            <RoundIconButton
              icon={SlidersHorizontal}
              size={40}
              title="تسوية"
              onClick={() => setAdjustOpen(true)}
            />
          ) : undefined
        }
      />
      <div className="flex flex-col gap-3 px-4">
        {wallet.isLoading ? (
          <Loading />
        ) : wallet.isError || !w ? (
          <ErrorView
            message={(wallet.error as Error)?.message ?? "حصل خطأ"}
            onRetry={() => wallet.refetch()}
          />
        ) : (
          <>
            <div className="rounded-card bg-gradient-to-br from-brand-light to-brand p-5 text-white">
              <p className="text-white/75">
                {isAdmin ? "رصيده عند التطبيق" : "رصيدك عند التطبيق"}
              </p>
              <p className="text-3xl font-black">{formatPrice(w.balance)}</p>
              {w.pendingWithdrawals > 0 && (
                <p className="text-xs text-white/75">
                  منهم {formatPrice(w.pendingWithdrawals)} في طلبات سحب مستنية
                </p>
              )}
              {!isAdmin && (
                <Button
                  className="mt-4 !bg-white !text-brand"
                  size="md"
                  icon={<Wallet className="size-5" />}
                  disabled={w.available <= 0}
                  onClick={() => setWithdrawOpen(true)}
                >
                  {w.available > 0
                    ? `اسحب (متاح ${formatPrice(w.available)})`
                    : "مفيش رصيد متاح للسحب"}
                </Button>
              )}
            </div>

            <div className="flex gap-2.5">
              <MoneyTile
                label="إجمالي الأرباح"
                value={w.totalEarned}
                hint={`${w.deliveredOrders} أوردر اتوصّل`}
              />
              <MoneyTile label="اتسحب" value={w.totalPaidOut} />
            </div>
            <p className="-mt-1 text-[11px] text-ink-3">
              الأرباح = سعر المنتجات ناقص عمولة التطبيق، بتتحسب لما الأوردر
              يتوصّل.
            </p>

            <SectionHeader title="طلبات السحب" />
            {withdrawals.isLoading ? (
              <Loading className="py-6" />
            ) : (withdrawals.data ?? []).length === 0 ? (
              <p className="text-ink-3">لسه مفيش طلبات سحب</p>
            ) : (
              (withdrawals.data ?? []).slice(0, 10).map((item) => (
                <WithdrawalCard
                  key={item.id}
                  withdrawal={item}
                  actions={
                    item.status === "Pending" && !isAdmin ? (
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="!text-danger"
                          onClick={async () => {
                            if (
                              await runAction(
                                () =>
                                  walletsApi.cancelWithdrawal(storeId, item.id),
                                "الطلب اتلغى",
                              )
                            )
                              refresh();
                          }}
                        >
                          إلغاء الطلب
                        </Button>
                      </div>
                    ) : undefined
                  }
                />
              ))
            )}

            <SectionHeader
              title="آخر الحركات"
              action={showAll ? undefined : "الكل"}
              onAction={() => setShowAll(true)}
            />
            {showAll ? (
              <EntriesList
                load={(beforeId) => walletsApi.storeEntries(storeId, beforeId)}
              />
            ) : w.recent.length === 0 ? (
              <p className="text-ink-3">
                لسه مفيش حركات. أول ما أوردر يتوصّل أرباحه هتظهر هنا.
              </p>
            ) : (
              <SoftCard className="overflow-hidden">
                {w.recent.map((e) => (
                  <WalletEntryRow key={e.id} entry={e} />
                ))}
              </SoftCard>
            )}
          </>
        )}
      </div>

      <Sheet
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        title="طلب سحب"
      >
        {withdrawOpen && w && (
          <WithdrawalForm
            storeId={storeId}
            available={w.available}
            onDone={() => {
              setWithdrawOpen(false);
              refresh();
            }}
          />
        )}
      </Sheet>

      <AmountDialog
        open={adjustOpen}
        title={`تسوية رصيد ${name}`}
        message="بالموجب بيزوّد اللي ليه، وبالسالب بيخصم."
        noteLabel="السبب"
        noteRequired
        allowNegative
        onClose={() => setAdjustOpen(false)}
        onSubmit={async (amount, note) => {
          const ok = await runAction(
            () => walletsApi.adjust("Store", storeId, amount, note),
            "اتسجلت",
          );
          if (ok) refresh();
          return ok;
        }}
      />
    </div>
  );
}

function WithdrawalForm({
  storeId,
  available,
  onDone,
}: {
  storeId: number;
  available: number;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(String(Math.floor(available)));
  const [method, setMethod] = useState<PayoutMethod>("InstaPay");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hint =
    PAYOUT_METHODS.find((m) => m.value === method)?.detailsHint ?? "";

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) return setError("اكتب مبلغ");
    if (value > available) return setError("أكتر من المتاح");
    if (method !== "Cash" && !details.trim()) return setError(`${hint} مطلوب`);
    setBusy(true);
    const ok = await runAction(
      () =>
        walletsApi.requestWithdrawal(
          storeId,
          value,
          method,
          details.trim() || null,
        ),
      "الطلب اتبعت للإدارة",
    );
    setBusy(false);
    if (ok) onDone();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-ink-2">متاح {formatPrice(available)}</p>
      <TextField
        name="amount"
        type="number"
        inputMode="decimal"
        step="any"
        ltr
        label="المبلغ (ج.م)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        end={<span className="text-sm">ج.م</span>}
      />
      <div className="flex flex-wrap gap-2">
        {PAYOUT_METHODS.map((m) => (
          <Chip
            key={m.value}
            selected={m.value === method}
            onClick={() => setMethod(m.value)}
          >
            {m.label}
          </Chip>
        ))}
      </div>
      <TextField
        name="details"
        label={hint}
        maxLength={300}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
      />
      {error && <InlineError message={error} />}
      <Button type="submit" block loading={busy}>
        ابعت الطلب
      </Button>
    </form>
  );
}
