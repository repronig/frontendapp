import { useId, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';

function formatNumber(value?: number | string | null) {
  const amount = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(amount)) return '0';
  return amount.toLocaleString();
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-2xl border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2563EB] dark:text-sky-300">{label ?? item.name}</p>
      <p className="mt-2 text-lg font-semibold text-[#0F172A] dark:text-slate-50 dark:text-slate-100">{formatNumber(Number(item.value ?? 0))}</p>
    </div>
  );
}

export function TrendChartCard({
  title,
  subtitle,
  values,
  labels,
  eyebrow = 'Overview',
}: {
  title: string;
  subtitle?: string;
  values: number[];
  labels?: string[];
  eyebrow?: string;
}) {
  const gradientId = useId().replace(/:/g, '');
  const [activeIndex, setActiveIndex] = useState(Math.max(values.length - 1, 0));
  const data = useMemo(
    () => values.map((value, index) => ({ label: labels?.[index] ?? `Point ${index + 1}`, value })),
    [labels, values],
  );

  const active = data[activeIndex] ?? data[data.length - 1] ?? { label: 'Point', value: 0 };
  const previous = activeIndex > 0 ? data[activeIndex - 1] : null;
  const delta = previous ? active.value - previous.value : 0;
  const deltaPositive = delta >= 0;

  return (
    <Card className="overflow-hidden border-slate-200/90 bg-gradient-to-br from-white via-slate-50/40 to-sky-50/30 p-0 shadow-md dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-sky-950/20">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 bg-white/60 px-5 py-5 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/40 md:px-6">
        <div className="flex min-w-0 flex-1 gap-4">
          <div className="hidden h-[4.5rem] w-1 shrink-0 rounded-full bg-gradient-to-b from-sky-500 via-indigo-500 to-violet-500 sm:block" aria-hidden />
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-600 dark:text-sky-400">{eyebrow}</p>
            <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h3>
            {subtitle ? <p className="mt-1 max-w-prose text-sm leading-relaxed text-slate-600 dark:text-slate-400">{subtitle}</p> : null}
          </div>
        </div>
        <div className="w-full max-w-[220px] rounded-2xl border border-sky-200/80 bg-gradient-to-br from-white to-sky-50/90 p-4 shadow-sm dark:border-sky-900/50 dark:from-slate-900 dark:to-sky-950/40 sm:w-auto">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Focused metric</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">{formatNumber(active.value)}</span>
            <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${deltaPositive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'}`}>
              {deltaPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {previous ? `${deltaPositive ? '+' : ''}${formatNumber(delta)}` : '—'}
            </span>
          </div>
          <p className="mt-1.5 truncate text-xs font-medium text-slate-600 dark:text-slate-300" title={active.label}>
            {active.label}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-500">vs previous point in series</p>
        </div>
      </div>

      <div className="px-4 py-5 md:px-6">
        <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-2 shadow-inner dark:border-slate-800 dark:bg-slate-900/50">
          <div className="h-[280px] w-full md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 4 }} onMouseMove={(state) => {
                if (typeof state?.activeTooltipIndex === 'number') setActiveIndex(state.activeTooltipIndex);
              }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                    <stop offset="55%" stopColor="#6366f1" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 6" vertical={false} className="dark:stroke-slate-700" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} interval={0} angle={data.length > 5 ? -18 : 0} textAnchor={data.length > 5 ? 'end' : 'middle'} height={data.length > 5 ? 52 : 28} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} width={40} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#7dd3fc', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="value" stroke="#0284c7" strokeWidth={2.5} fill={`url(#${gradientId})`} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2, fill: '#0ea5e9' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
          {data.map((point, index) => (
            <button
              key={point.label}
              type="button"
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              className={`min-w-[140px] shrink-0 rounded-2xl border px-4 py-3 text-left transition sm:min-w-0 ${activeIndex === index ? 'border-sky-300 bg-sky-50/90 shadow-sm ring-1 ring-sky-200/60 dark:border-sky-800 dark:bg-sky-950/40 dark:ring-sky-900/50' : 'border-slate-200/90 bg-white/90 hover:border-sky-200 dark:border-slate-800 dark:bg-slate-950/80 dark:hover:border-sky-900'}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-500">{point.label}</p>
              <p className="mt-1.5 text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">{formatNumber(point.value)}</p>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function DistributionCard({
  title,
  subtitle = 'Each segment as a share of the total.',
  items,
  eyebrow = 'Distribution',
}: {
  title: string;
  subtitle?: string;
  items: { label: string; value: number; color: string }[];
  eyebrow?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  const chartData = items.map((item) => ({ ...item, percent: Math.round((item.value / total) * 100) }));

  return (
    <Card className="overflow-hidden border-slate-200/90 bg-gradient-to-b from-white to-slate-50/50 shadow-md dark:border-slate-800 dark:from-slate-950 dark:to-slate-900/80">
      <div className="min-w-0 border-b border-slate-200/70 px-5 py-5 dark:border-slate-800 md:px-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-400">{eyebrow}</p>
        <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h3>
        {subtitle ? <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-slate-600 dark:text-slate-400">{subtitle}</p> : null}

        <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-slate-200/90 ring-1 ring-slate-200/50 dark:bg-slate-800 dark:ring-slate-700/80" title="Composition">
          {chartData.map((item, index) => (
            <button
              key={item.label}
              type="button"
              style={{
                flexGrow: Math.max(item.value, 0.0001),
                backgroundColor: item.color,
                opacity: activeIndex === index ? 1 : 0.72,
              }}
              className="min-w-[6px] cursor-pointer border-0 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none"
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              aria-label={`${item.label}: ${item.percent}%`}
            />
          ))}
        </div>
        <p className="mt-2 text-center text-[11px] font-medium text-slate-500 dark:text-slate-500">Hover a segment to compare</p>
      </div>

      <div className="space-y-2 px-4 py-4 md:px-6 md:py-5">
        {chartData.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={item.label}
              type="button"
              className={`group w-full rounded-2xl border px-4 py-3.5 text-left transition ${isActive ? 'border-indigo-300/80 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-200/50 dark:border-indigo-800 dark:bg-indigo-950/30 dark:ring-indigo-900/40' : 'border-slate-200/80 bg-white/80 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-slate-600'}`}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white shadow-sm dark:ring-slate-900"
                  style={{ backgroundColor: item.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.label}</span>
                    <span className="tabular-nums text-sm font-bold text-slate-900 dark:text-slate-50">{formatNumber(item.value)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium">{item.percent}% of total</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isActive ? 'bg-indigo-600 text-white dark:bg-indigo-500' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                      #{index + 1}
                    </span>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(6, item.percent)}%`, backgroundColor: item.color, opacity: isActive ? 1 : 0.65 }}
                    />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export function MiniBarsCard({
  title,
  values,
}: {
  title: string;
  values: { label: string; value: number }[];
}) {
  const [activeLabel, setActiveLabel] = useState(values[0]?.label ?? '');
  const active = values.find((item) => item.label === activeLabel) ?? values[0] ?? { label: '', value: 0 };
  const ordered = [...values].sort((a, b) => b.value - a.value);

  return (
    <Card className="border-[#E6EEF8] bg-white dark:bg-slate-950 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2563EB] dark:text-sky-300">Breakdown</p>
          <h3 className="mt-2 text-[18px] font-semibold text-[#2B2B2D] dark:text-slate-100 dark:text-slate-100">{title}</h3>
          <p className="mt-1 text-sm text-[#6B788E] dark:text-slate-300 dark:text-slate-400">Hover bars for values.</p>
        </div>
        <div className="rounded-2xl border border-[#DBEAFE] dark:border-slate-700 bg-[#F8FBFF] dark:bg-slate-900 px-4 py-3 shadow-sm">
          <p className="text-xs uppercase tracking-[0.08em] text-[#98A2B3] dark:text-slate-500">Highlighted</p>
          <p className="mt-1 text-sm font-medium text-[#344054] dark:text-slate-200 dark:text-slate-200">{active.label}</p>
          <p className="mt-1 text-2xl font-semibold text-[#101828] dark:text-slate-100">{formatNumber(active.value)}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_240px]">
        <div className="rounded-3xl border border-[#E6EEF8] bg-[#F8FBFF] dark:bg-slate-900 p-4">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={values} margin={{ top: 12, right: 10, left: 0, bottom: 0 }} onMouseMove={(state) => {
                if (typeof state?.activeTooltipIndex === 'number') {
                  const hovered = values[state.activeTooltipIndex];
                  if (hovered?.label) setActiveLabel(hovered.label);
                }
              }}>
                <CartesianGrid stroke="#E5EEF8" strokeDasharray="4 6" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#6B788E', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#98A2B3', fontSize: 12 }} width={42} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(191,219,254,0.18)' }} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {values.map((item) => (
                    <Cell key={item.label} fill={item.label === active.label ? '#2563EB' : '#93C5FD'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-3">
          {ordered.map((item, index) => {
            const isActive = item.label === active.label;
            return (
              <button
                key={item.label}
                type="button"
                onMouseEnter={() => setActiveLabel(item.label)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${isActive ? 'border-[#BFDBFE] dark:border-sky-900 bg-[#EFF6FF]' : 'border-[#F2F4F7] bg-white dark:bg-slate-950 hover:border-[#BFDBFE] dark:border-sky-900'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-[#98A2B3] dark:text-slate-500">#{index + 1}</p>
                    <p className="mt-1 text-sm font-medium text-[#344054] dark:text-slate-200 dark:text-slate-200">{item.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold text-[#101828] dark:text-slate-100">{formatNumber(item.value)}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
