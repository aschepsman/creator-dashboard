import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { loadAllData, type LoadProgress } from './api';
import { buildCreatorStats } from './utils';
import type { AppData, CreatorStats } from './types';
import Loading  from './Loading';
import Overview from './Overview';
import Detail   from './Detail';

type View =
  | { kind: 'overview' }
  | { kind: 'detail'; creatorId: string };

export default function App() {
  const [data,         setData]         = useState<AppData | null>(null);
  const [progress,     setProgress]     = useState<LoadProgress>({ stage: 'Connecting…', loaded: 0, total: 0 });
  const [error,        setError]        = useState<string | null>(null);
  const [view,         setView]         = useState<View>({ kind: 'overview' });
  const [loadKey,      setLoadKey]      = useState(0); // bump to retry

  // ── Load data ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    setError(null);
    setData(null);
    setProgress({ stage: 'Connecting…', loaded: 0, total: 0 });

    loadAllData(p => {
      if (!cancelled) setProgress(p);
    })
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(String(e)); });

    return () => { cancelled = true; };
  }, [loadKey]);

  // ── Build stats for all creators ───────────────────────────────────────
  const allStats = useMemo<CreatorStats[]>(() => {
    if (!data) return [];
    return data.creators.map(c =>
      buildCreatorStats(c, data.accounts, data.snapshots)
    );
  }, [data]);

  // ── Navigation helpers ─────────────────────────────────────────────────
  const goToDetail  = useCallback((creatorId: string) => setView({ kind: 'detail', creatorId }), []);
  const goToOverview = useCallback(() => setView({ kind: 'overview' }), []);
  const retry       = useCallback(() => setLoadKey(k => k + 1), []);

  // ── Render ─────────────────────────────────────────────────────────────
  if (error || !data) {
    return <Loading progress={progress} error={error} onRetry={retry} />;
  }

  if (view.kind === 'detail') {
    const stats = allStats.find(s => s.creator.id === view.creatorId);
    if (!stats) {
      goToOverview();
      return null;
    }
    return <Detail stats={stats} onBack={goToOverview} />;
  }

  return (
    <Overview
      allStats={allStats}
      onSelectCreator={goToDetail}
      onRefresh={retry}
    />
  );
}
