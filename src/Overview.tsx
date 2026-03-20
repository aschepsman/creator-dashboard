import React, { useState, useMemo } from 'react';
import type { CreatorStats, SortKey } from './types';
import {
  PLATFORM_COLORS,
  formatFollowers,
  formatGain,
} from './utils';
import Sparkline from './Sparkline';

interface Props {
  allStats:        CreatorStats[];
  onSelectCreator: (id: string) => void;
  onRefresh:       () => void;
}


function GainBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-slate-400 text-xs">—</span>;
  const isPos = value > 0;
  return (
    <span className={`text-xs font-medium ${isPos ? 'text-emerald-600' : 'text-red-500'}`}>
      {formatGain(value)}
    </span>
  );
}

function PlatformPill({ platform }: { platform: string }) {
  const color = PLATFORM_COLORS[platform] ?? '#888';
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {platform}
    </span>
  );
}

function MomentumArrow({ gain }: { gain: number }) {
  if (gain > 0)  return <span className="text-emerald-500 text-lg" title="Growing">↗</span>;
  if (gain < 0)  return <span className="text-red-500 text-lg"     title="Declining">↘</span>;
  return              <span className="text-slate-400 text-lg"     title="Flat">→</span>;
}

type SortDir = 'asc' | 'desc';

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-slate-300">↕</span>;
  return <span className="ml-1 text-indigo-500">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export default function Overview({ allStats, onSelectCreator, onRefresh }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('thirtyDayGain');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search,  setSearch]  = useState('');

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  }

  const sorted = useMemo(() => {
    const filtered = allStats.filter(s =>
      s.creator.name.toLowerCase().includes(search.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      if (sortKey === 'name') {
        aVal = a.creator.name.toLowerCase();
        bVal = b.creator.name.toLowerCase();
      } else {
        aVal = sortKey === 'sevenDayGain'  ? a.totalSevenDayGain
             : sortKey === 'thirtyDayGain' ? a.totalThirtyDayGain
             : a.totalFollowers;
        bVal = sortKey === 'sevenDayGain'  ? b.totalSevenDayGain
             : sortKey === 'thirtyDayGain' ? b.totalThirtyDayGain
             : b.totalFollowers;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [allStats, sortKey, sortDir, search]);

  // Summary totals
  const grandTotal   = allStats.reduce((s, c) => s + c.totalFollowers,    0);
  const grandSevenDay = allStats.reduce((s, c) => s + c.totalSevenDayGain, 0);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Top nav ─────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="font-semibold text-slate-800">Creator Dashboard</span>
          </div>

          <div className="flex items-center gap-3 flex-1 max-w-lg">
            <div className="relative flex-1">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search creators…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg
                           bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400
                           placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              title="Refresh data"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50
                         text-slate-500 hover:text-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Summary strip ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className="text-xs text-slate-500 mb-1">Creators tracked</div>
            <div className="text-2xl font-bold text-slate-800">{allStats.length}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className="text-xs text-slate-500 mb-1">Total followers</div>
            <div className="text-2xl font-bold text-slate-800">{formatFollowers(grandTotal)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className="text-xs text-slate-500 mb-1">7-day network gain</div>
            <div className={`text-2xl font-bold ${grandSevenDay >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {formatGain(grandSevenDay)}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className="text-xs text-slate-500 mb-1">Accounts tracked</div>
            <div className="text-2xl font-bold text-slate-800">
              {allStats.reduce((s, c) => s + c.accounts.length, 0)}
            </div>
          </div>
        </div>

        {/* ── Creator table ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wide">
                  <button onClick={() => handleSort('name')}
                    className="font-medium text-slate-500 hover:text-indigo-600 transition-colors flex items-center">
                    Creator <SortIcon active={sortKey === 'name'} dir={sortDir} />
                  </button>
                </th>
                <th className="text-right px-4 py-3 text-xs uppercase tracking-wide hidden sm:table-cell">
                  <button onClick={() => handleSort('totalFollowers')}
                    className="font-medium text-slate-500 hover:text-indigo-600 transition-colors flex items-center ml-auto">
                    Total Followers <SortIcon active={sortKey === 'totalFollowers'} dir={sortDir} />
                  </button>
                </th>
                <th className="text-right px-4 py-3 text-xs uppercase tracking-wide">
                  <button onClick={() => handleSort('sevenDayGain')}
                    className="font-medium text-slate-500 hover:text-indigo-600 transition-colors flex items-center ml-auto">
                    7D Gain <SortIcon active={sortKey === 'sevenDayGain'} dir={sortDir} />
                  </button>
                </th>
                <th className="text-right px-4 py-3 text-xs uppercase tracking-wide hidden md:table-cell">
                  <button onClick={() => handleSort('thirtyDayGain')}
                    className="font-medium text-slate-500 hover:text-indigo-600 transition-colors flex items-center ml-auto">
                    30D Gain <SortIcon active={sortKey === 'thirtyDayGain'} dir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide hidden lg:table-cell w-32">
                  30D Trend
                </th>
                <th className="text-center px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide hidden sm:table-cell">
                  Momentum
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map(stats => (
                <tr
                  key={stats.creator.id}
                  className="hover:bg-slate-50 cursor-pointer transition-colors group"
                  onClick={() => onSelectCreator(stats.creator.id)}
                >
                  {/* Name + platforms */}
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {stats.creator.name}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {stats.platforms.map(p => (
                        <PlatformPill key={p} platform={p} />
                      ))}
                    </div>
                  </td>

                  {/* Total followers */}
                  <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                    <span className="font-semibold text-slate-700">
                      {formatFollowers(stats.totalFollowers)}
                    </span>
                    {/* Per-platform breakdown */}
                    <div className="space-y-0.5 mt-0.5">
                      {stats.platforms.map(p => (
                        <div key={p} className="text-xs text-slate-400 flex justify-end gap-1.5">
                          <span style={{ color: PLATFORM_COLORS[p] ?? '#888' }} className="font-medium">
                            {p}
                          </span>
                          <span>{formatFollowers(stats.seriesByPlatform[p]?.currentFollowers ?? 0)}</span>
                        </div>
                      ))}
                    </div>
                  </td>

                  {/* 7-day gain */}
                  <td className="px-4 py-3.5 text-right">
                    <GainBadge value={stats.totalSevenDayGain} />
                    <div className="space-y-0.5 mt-0.5">
                      {stats.platforms.map(p => (
                        <div key={p} className="text-xs flex justify-end">
                          <GainBadge value={stats.seriesByPlatform[p]?.sevenDayGain ?? 0} />
                        </div>
                      ))}
                    </div>
                  </td>

                  {/* 30-day gain */}
                  <td className="px-4 py-3.5 text-right hidden md:table-cell">
                    <GainBadge value={stats.totalThirtyDayGain} />
                    <div className="space-y-0.5 mt-0.5">
                      {stats.platforms.map(p => (
                        <div key={p} className="text-xs flex justify-end">
                          <GainBadge value={stats.seriesByPlatform[p]?.thirtyDayGain ?? 0} />
                        </div>
                      ))}
                    </div>
                  </td>

                  {/* 30-day sparkline */}
                  <td className="px-4 py-3.5 hidden lg:table-cell w-32">
                    {stats.platforms[0] && (
                      <Sparkline
                        snapshots={stats.seriesByPlatform[stats.platforms[0]]?.snapshots ?? []}
                        color={PLATFORM_COLORS[stats.platforms[0]] ?? '#888'}
                        days={30}
                      />
                    )}
                  </td>

                  {/* Momentum arrow */}
                  <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                    <MomentumArrow gain={stats.totalSevenDayGain} />
                  </td>
                </tr>
              ))}

              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">
                    No creators match "{search}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}
