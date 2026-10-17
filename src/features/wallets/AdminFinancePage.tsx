import { Bike, Check, ChevronLeft, Inbox, Store, Wallet } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

import { walletsApi } from "@/api";
import {
  useAdminWithdrawals,
  useRefreshWallets,
  useWalletsOverview,
} from "@/api/queries";
import { PageHeader } from "@/components/layout/AppShell";
import {
  Button,
  Chip,
  EmptyView,
  ErrorView,
  IconWell,
  Loading,
  Price,
  Segmented,
  SoftCard,
} from "@/components/ui";
import { runAction } from "@/lib/run-action";
import type { PartyBalance, Withdrawal, WithdrawalStatus } from "@/types";

import {
  EntriesList,
  MoneyTile,
  NoteDialog,
  WithdrawalCard,
} from "./WalletWidgets";

type Tab = "withdrawals" | "stores" | "drivers" | "entries";

/**
 * The admin's money: withdrawal requests to pay, what is owed to each store, the cash each driver
 * holds, and every transaction.
 */
export function AdminFinancePage() {
  const overview = useWalletsOverview();
  const [tab, setTab] = useState<Tab>("withdrawals");
  const o = overview.data;
  const pending = o?.pendingWithdrawalsCount ?? 0;

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <PageHeader title="المالية" />
      <div className="flex flex-col gap-3 px-4">
        {o && (
          <div className="flex gap-2">
            <MoneyTile label="للمحلات" value={o.owedToStores} />
            <MoneyTile
              label="كاش مع المناديب"
              value={o.cashWithDrivers}
              color="var(--color-accent)"
            />
            <MoneyTile
              label="العمولة"
              value={o.commissionEarned}
              color="var(--color-success)"
            />
          </div>
        )}
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            {
              value: "withdrawals",
              label: pending > 0 ? `السحب (${pending})` : "طلبات السحب",
            },
            { value: "stores", label: "المحلات" },
            { value: "drivers", label: "المناديب" },
            { value: "entries", label: "الحركات" },
          ]}
        />
        {tab === "withdrawals" && <WithdrawalsTab />}
        {tab === "stores" &&
          (overview.isLoading ? (
            <Loading />
          ) : overview.isError || !o ? (
            <ErrorView
              message={(overview.error as Error)?.message ?? "حصل خطأ"}
              onRetry={() => overview.refetch()}
            />
          ) : (
            <BalancesList
              rows={o.stores}
              empty="مفيش أرصدة للمحلات لسه"
              subtitle={(b) =>
                b.pendingWithdrawals > 0
                  ? `طلب سحب ${b.pendingWithdrawals.toFixed(0)} ج.م`
                  : "ليه عند التطبيق"
              }
              to={(b) => `/admin/stores/${b.id}/wallet`}
            />
          ))}
        {tab === "drivers" &&
          (overview.isLoading ? (
            <Loading />
          ) : overview.isError || !o ? (
            <ErrorView
              message={(overview.error as Error)?.message ?? "حصل خطأ"}
              onRetry={() => overview.refetch()}
            />
          ) : (
            <BalancesList
              rows={o.drivers}
              empty="مفيش كاش مع المناديب"
              subtitle={(b) =>
                b.balance >= 0 ? "المطلوب يسلّمه" : "ليه عند الإدارة"
              }
              to={(b) => `/admin/drivers/${b.id}/wallet`}
            />
          ))}
        {tab === "entries" && (
          <EntriesList
            showParty
            load={(beforeId) => walletsApi.entries(null, null, beforeId)}
          />
        )}
      </div>
    </div>
  );
}

const STATUS_FILTERS: { label: string; value: WithdrawalStatus | null }[] = [
  { label: "مستنية", value: "Pending" },
  { label: "اتدفعت", value: "Paid" },
  { label: "اترفضت", value: "Rejected" },
  { label: "الكل", value: null },
];

function WithdrawalsTab() {
  const [status, setStatus] = useState<WithdrawalStatus | null>("Pending");
  const list = useAdminWithdrawals(status);
  const refresh = useRefreshWallets();
  const [paying, setPaying] = useState<Withdrawal | null>(null);
  const [rejecting, setRejecting] = useState<Withdrawal | null>(null);

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f.label}
            selected={status === f.value}
            onClick={() => setStatus(f.value)}
          >
            {f.label}
          </Chip>
        ))}
      </div>
      {list.isLoading ? (
        <Loading />
      ) : list.isError ? (
        <ErrorView
          message={(list.error as Error)?.message ?? "حصل خطأ"}
          onRetry={() => list.refetch()}
        />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyView icon={Inbox} message="مفيش طلبات هنا" />
      ) : (
        (list.data ?? []).map((w) => (
          <WithdrawalCard
            key={w.id}
            withdrawal={w}
            showStore
            actions={
              w.status === "Pending" ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="md"
                    className="!text-danger"
                    onClick={() => setRejecting(w)}
                  >
                    رفض
                  </Button>
                  <Button
                    size="md"
                    className="flex-1"
                    icon={<Check className="size-5" />}
                    onClick={() => setPaying(w)}
                  >
                    دفعت
                  </Button>
                </div>
              ) : undefined
            }
          />
        ))
      )}
      <NoteDialog
        open={paying !== null}
        title={
          paying ? `دفعت ${paying.amount} ج.م لـ ${paying.storeName}؟` : ""
        }
        label="رقم العملية / المرجع (اختياري)"
        confirmLabel="دفعت"
        onClose={() => setPaying(null)}
        onSubmit={async (note) => {
          const ok = await runAction(
            () => walletsApi.pay(paying!.id, note || null),
            "اتسجل إنه اتدفع",
          );
          if (ok) refresh();
          return ok;
        }}
      />
      <NoteDialog
        open={rejecting !== null}
        title={rejecting ? `ترفض طلب ${rejecting.storeName}؟` : ""}
        label="السبب (هيظهر للمحل)"
        confirmLabel="رفض"
        danger
        onClose={() => setRejecting(null)}
        onSubmit={async (note) => {
          const ok = await runAction(
            () => walletsApi.reject(rejecting!.id, note || null),
            "الطلب اترفض",
          );
          if (ok) refresh();
          return ok;
        }}
      />
    </>
  );
}

function BalancesList({
  rows,
  empty,
  subtitle,
  to,
}: {
  rows: PartyBalance[];
  empty: string;
  subtitle: (b: PartyBalance) => string;
  to: (b: PartyBalance) => string;
}) {
  const navigate = useNavigate();
  if (rows.length === 0) return <EmptyView icon={Wallet} message={empty} />;
  return (
    <div className="flex flex-col gap-2">
      {rows.map((b) => (
        <SoftCard
          key={`${b.party}-${b.id}`}
          as="button"
          className="flex items-center gap-3 p-3"
          onClick={() => navigate(to(b))}
        >
          <IconWell icon={b.party === "Store" ? Store : Bike} size={42} />
          <div className="min-w-0 flex-1 text-start">
            <p className="truncate font-extrabold text-ink">{b.name}</p>
            <p className="text-xs text-ink-3">{subtitle(b)}</p>
          </div>
          <Price value={Math.abs(b.balance)} />
          <ChevronLeft className="size-5 text-ink-3 rtl:rotate-0" />
        </SoftCard>
      ))}
    </div>
  );
}
