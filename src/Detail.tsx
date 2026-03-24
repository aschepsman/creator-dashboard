import React, { useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { CreatorStats, DaysOption } from './types';
import {
  PLATFORM_COLORS,
  formatFollowers,
  formatGain,
  formatDate,
  formatDateLong,
  buildDeltaChartData,
  buildCumulativeChartData,
  thinTicks,
} from './utils';

interface Props {
  stats:  CreatorStats;
  onBack: () => void;
}

const DATE_RANGES: { label: string; days: DaysOption }[] = [
  { label: '30D',  days: 30   },
  { label: '90D',  days: 90   },
  { label: '6M',   days: 182  },
  { label: '1Y',   days: 365  },
  { label: 'All',  days: null },
];

type ChartMode = 'delta' | 'cumulative';

// ─── Sub-components ────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color,
}: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div
      className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm border-l-4"
      style={{ borderLeftColor: color ?? '#e2e8f0' }}
    >
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-xl font-bold text-slate-800">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function TogglePill({
  label, active, color, onClick,
}: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                 border-2 transition-all select-none"
      style={{
        borderColor:     color,
        backgroundColor: active ? color : 'transparent',
        color:           active ? '#fff' : color,
        opacity:         active ? 1 : 0.5,
      }}
    >
      {!active && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8
                   a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4
                   c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07
                   a3 3 0 1 1-4.24-4.24" />
        </svg>
      )}
      {label}
    </button>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function Detail({ stats, onBack }: Props) {
  const { creator, platforms, seriesByPlatform } = stats;

  const [days,      setDays]      = useState<DaysOption>(90);
  const [mode,      setMode]      = useState<ChartMode>('delta');
  const [visible,   setVisible]   = useState<Set<string> | null>(null); // null = all

  const effectiveVisible = useMemo(
    () => visible ?? new Set(platforms),
    [visible, platforms]
  );

  const visiblePlatforms = platforms.filter(p => effectiveVisible.has(p));

  const togglePlatform = useCallback((p: string) => {
    setVisible(prev => {
      const cur  = prev ?? new Set(platforms);
      const next = new Set(cur);
      if (next.has(p)) {
        if (next.size === 1) return prev; // keep at least one
        next.delete(p);
      } else {
        next.add(p);
      }
      return next.size === platforms.length ? null : next;
    });
  }, [platforms]);

  // ── Chart data ────────────────────────────────────────────────────────
  const deltaData = useMemo(
    () => buildDeltaChartData(stats, visiblePlatforms, days),
    [stats, visiblePlatforms, days]
  );

  const cumulativeData = useMemo(
    () => buildCumulativeChartData(stats, visiblePlatforms, days),
    [stats, visiblePlatforms, days]
  );

  const chartData   = mode === 'delta' ? deltaData : cumulativeData;
  const allDates    = chartData.map(r => String(r['date']));
  const xTicks      = thinTicks(allDates, 12);

  // ── Stats ─────────────────────────────────────────────────────────────
  // Best single day in the current range (delta mode)
  const bestDay = useMemo(() => {
    let bestDate  = '';
    let bestValue = -Infinity;
    for (const row of deltaData) {
      const total = visiblePlatforms.reduce(
        (s, p) => s + (typeof row[p] === 'number' ? (row[p] as number) : 0),
        0
      );
      if (total > bestValue) { bestValue = total; bestDate = String(row['date']); }
    }
    return { date: bestDate, value: bestValue };
  }, [deltaData, visiblePlatforms]);

  // Aggregate gains for visible platforms only
  const visibleCurrentFollowers = visiblePlatforms.reduce(
    (s, p) => s + (seriesByPlatform[p]?.currentFollowers ?? 0), 0
  );
  const visible7DGain  = visiblePlatforms.reduce((s, p) => s + (seriesByPlatform[p]?.sevenDayGain  ?? 0), 0);
  const visible30DGain = visiblePlatforms.reduce((s, p) => s + (seriesByPlatform[p]?.thirtyDayGain ?? 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Top nav ─────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All Creators
          </button>

          <span className="text-slate-300">|</span>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="font-semibold text-slate-800">Creator Dashboard</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Creator header ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{creator.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {stats.accounts.length} social account{stats.accounts.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Platform toggles */}
          <div className="flex flex-wrap gap-2">
            {platforms.map(p => (
              <TogglePill
                key={p}
                label={p}
                active={effectiveVisible.has(p)}
                color={PLATFORM_COLORS[p] ?? '#888'}
                onClick={() => togglePlatform(p)}
              />
            ))}
          </div>
        </div>

        {/* ── Stat cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Current followers"
            value={formatFollowers(visibleCurrentFollowers)}
            color="#6366f1"
          />
          <StatCard
            label="7-day gain"
            value={formatGain(visible7DGain)}
            color={visible7DGain >= 0 ? '#22c55e' : '#ef4444'}
          />
          <StatCard
            label="30-day gain"
            value={formatGain(visible30DGain)}
            color={visible30DGain >= 0 ? '#22c55e' : '#ef4444'}
          />
          <StatCard
            label="Best day in range"
            value={bestDay.value > -Infinity ? formatGain(bestDay.value) : '—'}
            sub={bestDay.date ? formatDate(bestDay.date) : undefined}
            color="#f59e0b"
          />
        </div>

        {/* ── Chart card ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 sm:p-6">

          {/* Chart controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm self-start">
              <button
                onClick={() => setMode('delta')}
                className={`px-4 py-1.5 font-medium transition-colors ${
                  mode === 'delta'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Daily gain
              </button>
              <button
                onClick={() => setMode('cumulative')}
                className={`px-4 py-1.5 font-medium transition-colors border-l border-slate-200 ${
                  mode === 'cumulative'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Total followers
              </button>
            </div>

            {/* Date range */}
            <div className="flex gap-1">
              {DATE_RANGES.map(({ label, days: d }) => (
                <button
                  key={label}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    days === d
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {mode === 'delta' && (
            <p className="text-xs text-slate-400 mb-4">
              Day-over-day follower change — the real growth signal.
              Bars above zero = gaining; below = losing.
            </p>
          )}
          {mode === 'cumulative' && (
            <p className="text-xs text-slate-400 mb-4">
              Cumulative total followers over time.
              Bad data points (zeros / near-zeros) are bridged over.
            </p>
          )}

          {chartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {mode === 'delta' ? (
                  <BarChart
                    data={deltaData}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      ticks={xTicks}
                      tickFormatter={formatDate}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                    />
                    <YAxis
                      tickFormatter={v => formatGain(v as number)}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      labelFormatter={formatDateLong}
                      formatter={(value: unknown, name: string) =>
                        value != null ? [formatGain(value as number), name] : ['—', name]
                      }
                    />
                    {visiblePlatforms.map(p => (
                      <Bar key={p} dataKey={p} fill={PLATFORM_COLORS[p] ?? '#888'} radius={[2, 2, 0, 0]}>
                        {deltaData.map((row, i) => {
                          const v = row[p];
                          return (
                            <Cell
                              key={i}
                              fill={
                                typeof v === 'number' && v < 0
                                  ? '#fca5a5'
                                  : (PLATFORM_COLORS[p] ?? '#888')
                              }
                            />
                          );
                        })}
                      </Bar>
                    ))}
                  </BarChart>
                ) : (
                  <LineChart
                    data={cumulativeData}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      ticks={xTicks}
                      tickFormatter={formatDate}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                    />
                    <YAxis
                      tickFormatter={v => formatFollowers(v as number)}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      width={65}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                      labelFormatter={formatDateLong}
                      formatter={(value: unknown, name: string) =>
                        value != null ? [formatFollowers(value as number), name] : ['—', name]
                      }
                    />
                    {visiblePlatforms.map(p => (
                      <Line
                        key={p}
                        type="monotone"
                        dataKey={p}
                        stroke={PLATFORM_COLORS[p] ?? '#888'}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        connectNulls
                      />
                    ))}
                    {visiblePlatforms.length > 1 && (
                      <Line
                        type="monotone"
                        dataKey="Total"
                        stroke={PLATFORM_COLORS['Total']}
                        strokeWidth={3}
                        strokeDasharray="6 3"
                        dot={false}
                        activeDot={{ r: 4 }}
                        connectNulls
                      />
                    )}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-400 text-sm">
              No data for this range.
            </div>
          )}
        </div>

        {/* ── Per-platform breakdown cards ──────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {platforms.map(p => {
            const series = seriesByPlatform[p];
            if (!series) return null;
            const color = PLATFORM_COLORS[p] ?? '#888';
            const isOn  = effectiveVisible.has(p);
            return (
              <div
                key={p}
                className={`bg-white rounded-xl p-4 border border-slate-100 shadow-sm
                            border-l-4 transition-opacity cursor-pointer`}
                style={{ borderLeftColor: color, opacity: isOn ? 1 : 0.45 }}
                onClick={() => togglePlatform(p)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-slate-700">{p}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                    style={{ backgroundColor: color }}
                  >
                    {stats.accounts.filter(a => a.platform === p).length} account
                    {stats.accounts.filter(a => a.platform === p).length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-800 mb-1">
                  {formatFollowers(series.currentFollowers)}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-3">
                  {[
                    { label: '7D',  value: series.sevenDayGain  },
                    { label: '30D', value: series.thirtyDayGain },
                    { label: '90D', value: series.ninetyDayGain },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-lg p-2">
                      <div className="text-xs text-slate-400">{label}</div>
                      <div className={`text-sm font-semibold ${value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatGain(value)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Account profile links */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                  {stats.accounts
                    .filter(a => a.platform === p && a.profileUrl)
                    .map(a => (
                      <a
                        key={a.id}
                        href={a.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600
                                   transition-colors px-2 py-1 rounded-md bg-slate-50 hover:bg-indigo-50"
                      >
                        <span>@{a.handle}</span>
                        <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ))
                  }
                </div>
              </div>
            );
          })}
        </div>

      </main>
    </div>
  );
}
