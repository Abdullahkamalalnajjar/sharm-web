import { Handshake, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";

import { walletsApi } from "@/api";
import {
  useAdminDriverWallet,
  useMyDriverWallet,
  useRefreshWallets,
} from "@/api/queries";
import { PageHeader } from "@/components/layout/AppShell";
import {
  Button,
  ErrorView,
  Loading,
  RoundIconButton,
  SectionHeader,
  SoftCard,
} from "@/components/ui";
import { formatPrice } from "@/lib/format";
import { runAction } from "@/lib/run-action";
import type { DriverWallet } from "@/types";

import {
  AmountDialog,
  EntriesList,
  MoneyTile,
  WalletEntryRow,
} from "./WalletWidgets";

/**
 * A driver's money: delivery fees earned, customers' cash in hand, and what to hand in to the admin.
 * The driver sees their own; the admin opens it at /admin/drivers/:id/wallet and records cash handed in.
 */
export function DriverWalletPage() {
  const param = useParams().id;
  const driverId = param ? Number(param) : null;
  return driverId ? (
    <AdminDriverWallet driverId={driverId} />
  ) : (
    <MyDriverWallet />
  );
}

function MyDriverWallet() {
  const wallet = useMyDriverWallet();
  return (
    <WalletView
      title="حسابي"
      wallet={wallet.data}
      isLoading={wallet.isLoading}
      error={
        wallet.isError ? ((wallet.error as Error)?.message ?? "حصل خطأ") : null
      }
      onRetry={() => wallet.refetch()}
      loadEntries={(beforeId) => walletsApi.myEntries(beforeId)}
    />
  );
}

function AdminDriverWallet({ driverId }: { driverId: number }) {
  const wallet = useAdminDriverWallet(driverId);
  const refresh = useRefreshWallets();
  const [handInOpen, setHandInOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const w = wallet.data;

  return (
    <>
      <WalletView
        isAdmin
        title={w ? `حساب ${w.driverName}` : "حساب المندوب"}
        wallet={w}
        isLoading={wallet.isLoading}
        error={
          wallet.isError
            ? ((wallet.error as Error)?.message ?? "حصل خطأ")
            : null
        }
        onRetry={() => wallet.refetch()}
        loadEntries={(beforeId) =>
          walletsApi.entries("Driver", driverId, beforeId)
        }
        onHandIn={() => setHandInOpen(true)}
        headerActions={
          <RoundIconButton
            icon={SlidersHorizontal}
            size={40}
            title="تسوية"
            onClick={() => setAdjustOpen(true)}
          />
        }
      />
      <AmountDialog
        open={handInOpen}
        title={`استلام كاش من ${w?.driverName ?? ""}`}
        message={w ? `المطلوب منه ${formatPrice(w.amountToHandIn)}` : undefined}
        initial={w?.amountToHandIn}
        onClose={() => setHandInOpen(false)}
        onSubmit={async (amount, note) => {
          const ok = await runAction(
            () => walletsApi.recordCashHandIn(driverId, amount, note || null),
            "اتسجل",
          );
          if (ok) refresh();
          return ok;
        }}
      />
      <AmountDialog
        open={adjustOpen}
        title={`تسوية حساب ${w?.driverName ?? ""}`}
        message="بالموجب بيزوّد المطلوب منه، وبالسالب بيقلله (مكافأة مثلاً)."
        noteLabel="السبب"
        noteRequired
        allowNegative
        onClose={() => setAdjustOpen(false)}
        onSubmit={async (amount, note) => {
          const ok = await runAction(
            () => walletsApi.adjust("Driver", driverId, amount, note),
            "اتسجلت",
          );
          if (ok) refresh();
          return ok;
        }}
      />
    </>
  );
}

function WalletView({
  title,
  wallet: w,
  isLoading,
  error,
  onRetry,
  loadEntries,
  isAdmin,
  onHandIn,
  headerActions,
}: {
  title: string;
  wallet: DriverWallet | undefined;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  loadEntries: (beforeId?: number) => ReturnType<typeof walletsApi.myEntries>;
  isAdmin?: boolean;
  onHandIn?: () => void;
  headerActions?: React.ReactNode;
}) {
  const [showAll, setShowAll] = useState(false);

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <PageHeader title={title} actions={headerActions} />
      <div className="flex flex-col gap-3 px-4">
        {isLoading ? (
          <Loading />
        ) : error || !w ? (
          <ErrorView message={error ?? "حصل خطأ"} onRetry={onRetry} />
        ) : (
          <>
            {/* Owing cash reads as a warning; nothing owed (or the app owes them) reads as fine. */}
            <div
              className="rounded-card border border-line p-5"
              style={{
                background:
                  w.amountToHandIn > 0
                    ? "color-mix(in srgb, var(--color-warning) 15%, transparent)"
                    : "color-mix(in srgb, var(--color-success) 12%, transparent)",
              }}
            >
              <p className="text-ink-2">
                {w.amountToHandIn >= 0
                  ? isAdmin
                    ? "المطلوب منه يسلّمه"
                    : "المطلوب تسلّمه للإدارة"
                  : isAdmin
                    ? "ليه عند الإدارة"
                    : "ليك عند الإدارة"}
              </p>
              <p className="text-3xl font-black text-ink">
                {formatPrice(Math.abs(w.amountToHandIn))}
              </p>
              <p className="text-[11px] text-ink-3">
                الكاش اللي حصّله ناقص أجرة التوصيل واللي اتسلّم.
              </p>
              {isAdmin && onHandIn && (
                <Button
                  className="mt-3"
                  size="md"
                  icon={<Handshake className="size-5" />}
                  onClick={onHandIn}
                >
                  استلمت منه كاش
                </Button>
              )}
            </div>

            <div className="flex gap-2.5">
              <MoneyTile
                label={isAdmin ? "الكاش اللي معاه" : "الكاش اللي معاك"}
                value={w.cashInHand}
                color="var(--color-accent)"
              />
              <MoneyTile
                label="أرباح النهارده"
                value={w.todayEarnings}
                color="var(--color-success)"
                hint={`${w.todayDeliveredOrders} أوردر`}
              />
            </div>
            <div className="flex gap-2.5">
              <MoneyTile
                label="إجمالي الأرباح"
                value={w.totalEarnings}
                hint={`${w.deliveredOrders} أوردر اتوصّل`}
              />
            </div>

            <SectionHeader
              title="آخر الحركات"
              action={showAll ? undefined : "الكل"}
              onAction={() => setShowAll(true)}
            />
            {showAll ? (
              <EntriesList load={loadEntries} />
            ) : w.recent.length === 0 ? (
              <p className="text-ink-3">
                لسه مفيش حركات. أول ما يتوصّل أوردر هيظهر هنا.
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
    </div>
  );
}
