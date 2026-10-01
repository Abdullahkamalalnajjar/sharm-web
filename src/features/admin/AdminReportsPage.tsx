import clsx from 'clsx';
import { Bike, CheckCheck, ChevronLeft, ChevronRight, ReceiptText, ShoppingBag, Store, Trophy, XCircle, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

import { isCurrentPeriod, shiftReportKey, useReport, type ReportKey, type ReportPeriod } from '@/api/queries';
import { TabHeader } from '@/components/layout/AppShell';
import { ErrorView, IconWell, Loading, Price, Segmented, SoftCard } from '@/components/ui';
import { formatFullDate, formatPrice } from '@/lib/format';
import type { Report, ReportTotals } from '@/types';

const monthYear = new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' });
const mediumDate = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long' });

export function periodTitle(k: ReportKey): string {
  return k.period === 'day' ? formatFullDate(k.date) : k.period === 'month' ? monthYear.format(k.date) : String(k.date.getFullYear());
}

/** Orders and money by day, month or year, with the period before for comparison. */
export function AdminReportsPage() {
  const [key, setKey] = useState<ReportKey>({ period: 'day', date: new Date() });
  const report = useReport(key);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8">
      <TabHeader title="الإحصائيات" />
      <Segmented<ReportPeriod>
        value={key.period}
        onChange={(p) => setKey({ period: p, date: key.date })}
        options={[
          { value: 'day', label: 'يوم' },
          { value: 'month', label: 'شهر' },
          { value: 'year', label: 'سنة' },
        ]}
      />
      <PeriodBar reportKey={key} onChange={setKey} />
      {report.isLoading ? (
        <Loading />
      ) : report.isError ? (
        <ErrorView message={(report.error as Error).message} onRetry={() => report.refetch()} />
      ) : (
        <ReportBody report={report.data!} reportKey={key} />
      )}
    </div>
  );
}

/** "‹ أكتوبر ٢٠٢٦ ›" with the period name; a day can also be typed into a date field. */
function PeriodBar({ reportKey, onChange }: { reportKey: ReportKey; onChange: (k: ReportKey) => void }) {
  const current = isCurrentPeriod(reportKey);
  const d = reportKey.date;
  const dateValue = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = new Date();
  const maxValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <SoftCard className="mt-3 flex items-center p-1">
      <button type="button" title="اللي قبله" onClick={() => onChange(shiftReportKey(reportKey, -1))} className="grid size-11 place-items-center rounded-full text-ink hover:bg-surface-alt">
        <ChevronRight className="size-6" />
      </button>
      <div className="relative flex-1 py-2 text-center">
        <p className="font-extrabold text-ink">{periodTitle(reportKey)}</p>
        {current && <p className="text-xs text-brand-light">{reportKey.period === 'day' ? 'النهارده' : reportKey.period === 'month' ? 'الشهر ده' : 'السنة دي'}</p>}
        {reportKey.period === 'day' && (
          <input
            type="date"
            aria-label="اختار يوم"
            value={dateValue}
            max={maxValue}
            min="2025-01-01"
            onChange={(e) => {
              const [y, m, day] = e.target.value.split('-').map(Number);
              if (y && m && day) onChange({ period: 'day', date: new Date(y, m - 1, day) });
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        )}
      </div>
      <button
        type="button"
        title="اللي بعده"
        disabled={current}
        onClick={() => onChange(shiftReportKey(reportKey, 1))}
        className="grid size-11 place-items-center rounded-full text-ink hover:bg-surface-alt disabled:opacity-30"
      >
        <ChevronLeft className="size-6" />
      </button>
    </SoftCard>
  );
}

/** Change against the previous period, e.g. "↑ 12%". */
function delta(now: number, before: number): { text: string; up: boolean } | null {
  if (now === 0 && before === 0) return null;
  if (before === 0) return { text: '↑ جديد', up: true };
  const change = Math.round(((now - before) / before) * 100);
  if (change === 0) return { text: 'زي', up: true };
  return { text: `${change > 0 ? '↑' : '↓'} ${Math.abs(change)}%`, up: change > 0 };
}

function ReportBody({ report, reportKey }: { report: Report; reportKey: ReportKey }) {
  const t = report.totals;
  const p = report.previous;
  const previousName = reportKey.period === 'day' ? 'امبارح' : reportKey.period === 'month' ? 'الشهر اللي فات' : 'السنة اللي فاتت';

  return (
    <div className="mt-4 flex flex-col gap-3">
      <MoneyHero totals={t} previous={p} previousName={previousName} />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <MiniStat icon={ReceiptText} color="var(--color-series-3)" label="أوردرات اتعملت" value={String(t.ordersPlaced)} delta={delta(t.ordersPlaced, p.ordersPlaced)} />
        <MiniStat icon={CheckCheck} color="var(--color-success)" label="اتوصّلت" value={String(t.delivered)} delta={delta(t.delivered, p.delivered)} />
        <MiniStat icon={XCircle} color="var(--color-danger)" label="اتلغت" value={String(t.cancelled)} caption={t.ordersPlaced ? `${Math.round((t.cancelled * 100) / t.ordersPlaced)}% من الأوردرات` : undefined} />
        <MiniStat icon={ShoppingBag} color="var(--color-accent)" label="متوسط الأوردر" value={formatPrice(t.averageOrder)} caption={t.inProgress > 0 ? `${t.inProgress} لسه شغالين` : undefined} />
      </div>
      <ChartCard report={report} reportKey={reportKey} />
      {report.best && (
        <SoftCard className="flex items-center gap-3 p-3.5">
          <IconWell icon={Trophy} size={42} color="var(--color-accent)" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-3">{reportKey.period === 'year' ? 'أحسن شهر' : 'أحسن يوم'}</p>
            <p className="font-extrabold text-ink">{reportKey.period === 'year' ? monthYear.format(new Date(report.best.start)) : mediumDate.format(new Date(report.best.start))}</p>
          </div>
          <div className="text-end">
            <Price value={report.best.sales} className="text-base block" />
            <span className="text-xs text-ink-3">{report.best.delivered} أوردر</span>
          </div>
        </SoftCard>
      )}
      <div className="grid gap-3 md:grid-cols-2 md:items-start">
        <RankedList
          title="أكتر المحلات بيعاً"
          icon={Store}
          empty="مفيش مبيعات في الفترة دي"
          rows={report.stores.map((s) => ({ name: s.storeName, sub: `${s.orders} أوردر • ${s.itemsSold} منتج`, value: s.sales }))}
        />
        <RankedList
          title="المندوبين"
          icon={Bike}
          empty="مفيش توصيلات في الفترة دي"
          valueCaption="توصيل"
          rows={report.drivers.map((d) => ({ name: d.fullName, sub: `${d.delivered} توصيلة • حصّل ${formatPrice(d.collected)}`, value: d.deliveryFees }))}
        />
      </div>
    </div>
  );
}

/** The money of the period: total collected, split into the app's share and the stores'. */
function MoneyHero({ totals: t, previous, previousName }: { totals: ReportTotals; previous: ReportTotals; previousName: string }) {
  const d = delta(t.sales, previous.sales);
  return (
    <div className="rounded-card bg-gradient-to-br from-brand-light via-brand to-brand-dark p-[18px]">
      <p className="text-white/85">الفلوس اللي اتحصّلت</p>
      <p className="text-[40px] font-extrabold leading-tight text-accent">{formatPrice(t.sales)}</p>
      {d && (
        <p className="text-[13px] font-semibold text-white">
          {d.text} عن {previousName}
        </p>
      )}
      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        <Share icon={Bike} label="ليك (التوصيل)" value={t.deliveryFees} />
        <Share icon={Store} label="للمحلات" value={t.storeSales} />
      </div>
    </div>
  );
}

function Share({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-black/20 px-3 py-2.5">
      <Icon className="size-5 shrink-0 text-white" />
      <div className="min-w-0">
        <p className="text-xs text-white/85">{label}</p>
        <p className="truncate font-extrabold text-white">{formatPrice(value)}</p>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, color, label, value, delta: d, caption }: { icon: LucideIcon; color: string; label: string; value: string; delta?: { text: string; up: boolean } | null; caption?: string }) {
  return (
    <SoftCard className="p-3.5">
      <p className="flex items-center gap-1.5 text-xs text-ink-2 truncate">
        <Icon className="size-[18px] shrink-0" style={{ color }} />
        {label}
      </p>
      <p className="mt-1.5 truncate text-[22px] font-extrabold text-ink">{value}</p>
      {d ? <p className={clsx('text-xs font-bold', d.up ? 'text-success' : 'text-danger')}>{d.text}</p> : <p className="text-xs text-ink-3">{caption ?? ' '}</p>}
    </SoftCard>
  );
}

const hourLabel = (h: number) => (h === 0 ? '12ص' : h === 12 ? '12م' : h < 12 ? `${h}ص` : `${h - 12}م`);

/** Day: orders per hour. Month / year: money or orders per day / month. */
function ChartCard({ report: r, reportKey: key }: { report: Report; reportKey: ReportKey }) {
  const [metric, setMetric] = useState<'money' | 'orders'>('money');
  const now = new Date();
  const current = isCurrentPeriod(key);

  let title: string;
  let values: number[];
  let axis: (i: number) => string | null;
  let tip: (i: number) => string;
  let dimFrom: number | undefined;

  if (key.period === 'day') {
    title = 'الأوردرات على مدار اليوم';
    values = r.hours;
    axis = (i) => (i % 3 === 0 ? hourLabel(i) : null);
    tip = (i) => `${hourLabel(i)} — ${r.hours[i]} أوردر`;
    if (current) dimFrom = now.getHours() + 1;
  } else {
    const byMonth = key.period === 'year';
    title = byMonth ? 'على مدار السنة' : 'على مدار الشهر';
    values = r.points.map((p) => (metric === 'money' ? p.sales : p.ordersPlaced));
    axis = byMonth ? (i) => String(i + 1) : (i) => (i === 0 || (i + 1) % 5 === 0 ? String(i + 1) : null);
    tip = (i) => {
      const p = r.points[i];
      const when = byMonth ? monthYear.format(new Date(p.start)) : mediumDate.format(new Date(p.start));
      return metric === 'money' ? `${when} — ${formatPrice(p.sales)} (توصيل ${formatPrice(p.deliveryFees)})` : `${when} — ${p.ordersPlaced} أوردر، اتوصّل ${p.delivered}`;
    };
    if (current) dimFrom = byMonth ? now.getMonth() + 1 : now.getDate();
  }

  return (
    <SoftCard className="p-3.5">
      <div className="flex items-center gap-2">
        <h3 className="flex-1 font-extrabold text-ink">{title}</h3>
        {key.period !== 'day' && (
          <div className="flex rounded-full border border-line bg-bg p-0.5 text-xs">
            {(['money', 'orders'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMetric(m)} className={clsx('rounded-full px-3 py-1 font-bold', metric === m ? 'bg-brand text-white' : 'text-ink-2')}>
                {m === 'money' ? 'فلوس' : 'أوردرات'}
              </button>
            ))}
          </div>
        )}
      </div>
      <BarChart key={`${key.period}-${metric}`} values={values} axisLabel={axis} tooltip={tip} dimFrom={dimFrom} />
    </SoftCard>
  );
}

/** Simple one-series bar chart. Click (or drag across) a bar to read its value in the header. */
function BarChart({ values, axisLabel, tooltip, dimFrom, height = 170 }: { values: number[]; axisLabel: (i: number) => string | null; tooltip: (i: number) => string; dimFrom?: number; height?: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(0, ...values);
  const peak = max === 0 ? -1 : values.indexOf(max);

  return (
    <div className="mt-3">
      <p className={clsx('h-[22px] text-center text-[13px]', selected !== null ? 'font-extrabold text-ink' : 'font-medium text-ink-3')}>
        {selected !== null ? tooltip(selected) : max === 0 ? 'مفيش بيانات في الفترة دي' : 'دوس على أي عمود عشان تشوف رقمه'}
      </p>
      <div className="mt-2 flex items-end" style={{ height }} onPointerLeave={() => undefined}>
        {values.map((v, i) => {
          const fraction = max === 0 ? 0 : v / max;
          const dim = dimFrom !== undefined && i >= dimFrom;
          const isSel = i === selected;
          return (
            <button
              key={i}
              type="button"
              aria-label={tooltip(i)}
              onClick={() => setSelected(i)}
              onPointerEnter={(e) => e.buttons > 0 && setSelected(i)}
              className="flex h-full flex-1 items-end"
              style={{ padding: `0 ${values.length > 20 ? 1 : 3}px` }}
            >
              <span
                className="block w-full rounded-t transition-[height] duration-300"
                style={{
                  height: `${fraction === 0 ? 1.2 : Math.max(2.5, fraction * 100)}%`,
                  background: fraction === 0 ? 'var(--color-surface-high)' : isSel ? 'var(--color-accent)' : dim ? 'var(--color-surface-high)' : 'var(--color-brand)',
                  opacity: !isSel && !dim && fraction > 0 && i !== peak ? 0.75 : 1,
                }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 border-t border-line" />
      <div className="mt-1.5 flex">
        {values.map((_, i) => (
          <span key={i} className={clsx('flex-1 text-center text-[10px] whitespace-nowrap', i === selected ? 'font-extrabold text-ink' : 'font-medium text-ink-3')}>
            {axisLabel(i) ?? ''}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Ranked rows with a share bar: top stores or drivers. */
function RankedList({ title, icon: Icon, empty, rows, valueCaption }: { title: string; icon: LucideIcon; empty: string; rows: { name: string; sub: string; value: number }[]; valueCaption?: string }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  return (
    <SoftCard className="p-3.5">
      <h3 className="flex items-center gap-2 font-extrabold text-ink">
        <Icon className="size-[18px] text-accent" />
        {title}
      </h3>
      {rows.length === 0 && <p className="mt-2.5 text-ink-3">{empty}</p>}
      <div className="mt-2.5 flex flex-col gap-3">
        {rows.map((r, i) => (
          <div key={r.name + i}>
            <div className="flex items-center gap-2">
              <span className="w-[22px] font-extrabold text-ink-3">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{r.name}</p>
                <p className="text-xs text-ink-3">{r.sub}</p>
              </div>
              <div className="text-end">
                <Price value={r.value} className="block" />
                {valueCaption && <span className="text-[11px] text-ink-3">{valueCaption}</span>}
              </div>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded bg-surface-alt">
              <div className="h-full bg-brand" style={{ width: `${max === 0 ? 0 : (r.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </SoftCard>
  );
}
