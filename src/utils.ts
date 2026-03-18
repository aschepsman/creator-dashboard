import type {
  Creator,
  SocialAccount,
  DailySnapshot,
  PlatformSeries,
  CreatorStats,
  DaysOption,
} from './types';

// ─── Constants ─────────────────────────────────────────────────────────────

export const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E4405F',
  TikTok:    '#010101',
  YouTube:   '#FF0000',
  Total:     '#2563EB',
};

// A daily follower count is treated as bad data if it's below this fraction
// of the platform's own median. Catches SocialBlade's occasional 0-reports
// and near-zero glitches without accidentally zeroing legit small accounts.
const SPIKE_THRESHOLD = 0.05;

// ─── Math helpers ──────────────────────────────────────────────────────────

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid    = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? (sorted[mid] ?? 0)
    : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

export function formatFollowers(n: number, decimals = 1): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(decimals)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(decimals)}K`;
  return n.toLocaleString();
}

export function formatGain(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${formatFollowers(n, 1)}`;
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
  });
}

export function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  });
}

export function cutoffDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0]!;
}

// ─── Spike filtering ───────────────────────────────────────────────────────

function cleanSnapshotsForAccount(snaps: DailySnapshot[]): DailySnapshot[] {
  const sorted   = [...snaps].sort((a, b) => a.date.localeCompare(b.date));
  const med      = median(sorted.map(s => s.followers));
  const minValid = med * SPIKE_THRESHOLD;

  return sorted.filter(s => s.followers > 0 && (med === 0 || s.followers >= minValid));
}

// ─── Gain computation from cleaned cumulative data ─────────────────────────

function gainOverDays(snaps: DailySnapshot[], days: number): number {
  if (snaps.length < 2) return 0;
  const cutoff  = cutoffDate(days);
  const inRange = snaps.filter(s => s.date >= cutoff);
  if (inRange.length < 2) {
    // If we don't have enough points in range, use the earliest available
    // vs the latest
    const earliest = snaps[0]!;
    const latest   = snaps[snaps.length - 1]!;
    return latest.followers - earliest.followers;
  }
  return inRange[inRange.length - 1]!.followers - inRange[0]!.followers;
}

// ─── Build per-platform series ─────────────────────────────────────────────

function buildPlatformSeries(
  platform: string,
  accountIds: string[],
  allSnapshots: DailySnapshot[]
): PlatformSeries {
  // Gather all snapshots for these accounts, grouped by date
  // (multiple accounts on same platform → sum followers per date)
  const byDate: Record<string, number> = {};

  for (const snap of allSnapshots) {
    if (!accountIds.includes(snap.accountId)) continue;
    byDate[snap.date] = (byDate[snap.date] ?? 0) + snap.followers;
  }

  // Build synthetic snapshots from the summed-by-date data
  const rawSnaps: DailySnapshot[] = Object.entries(byDate).map(([date, followers]) => ({
    date,
    followers,
    accountId: accountIds[0] ?? '',
    platform,
  }));

  const cleaned = cleanSnapshotsForAccount(rawSnaps);
  const current = cleaned.length > 0 ? cleaned[cleaned.length - 1]!.followers : 0;

  return {
    platform,
    snapshots:        cleaned,
    currentFollowers: current,
    sevenDayGain:     gainOverDays(cleaned, 7),
    thirtyDayGain:    gainOverDays(cleaned, 30),
    ninetyDayGain:    gainOverDays(cleaned, 90),
  };
}

// ─── Build CreatorStats ────────────────────────────────────────────────────

export function buildCreatorStats(
  creator: Creator,
  allAccounts: SocialAccount[],
  allSnapshots: DailySnapshot[]
): CreatorStats {
  const accounts = allAccounts.filter(a =>
    creator.socialAccountIds.includes(a.id)
  );

  // Group accounts by platform
  const accountsByPlatform: Record<string, string[]> = {};
  for (const acct of accounts) {
    if (!accountsByPlatform[acct.platform]) accountsByPlatform[acct.platform] = [];
    accountsByPlatform[acct.platform]!.push(acct.id);
  }

  const platforms = Object.keys(accountsByPlatform).sort();

  const seriesByPlatform: Record<string, PlatformSeries> = {};
  for (const platform of platforms) {
    seriesByPlatform[platform] = buildPlatformSeries(
      platform,
      accountsByPlatform[platform]!,
      allSnapshots
    );
  }

  const totalFollowers     = platforms.reduce((s, p) => s + seriesByPlatform[p]!.currentFollowers, 0);
  const totalSevenDayGain  = platforms.reduce((s, p) => s + seriesByPlatform[p]!.sevenDayGain, 0);
  const totalThirtyDayGain = platforms.reduce((s, p) => s + seriesByPlatform[p]!.thirtyDayGain, 0);

  return {
    creator,
    accounts,
    platforms,
    seriesByPlatform,
    totalFollowers,
    totalSevenDayGain,
    totalThirtyDayGain,
  };
}

// ─── Chart data builders ───────────────────────────────────────────────────

// Returns daily DELTA data for each platform (for bar chart)
// Re-derives delta from cleaned cumulative values: delta[i] = snap[i] - snap[i-1]
export interface DailyDeltaRow {
  date: string;
  [platform: string]: string | number | null;
}

export function buildDeltaChartData(
  stats: CreatorStats,
  visiblePlatforms: string[],
  days: DaysOption
): DailyDeltaRow[] {
  const cutoff = days !== null ? cutoffDate(days) : null;

  // Per platform: build a map of date → delta, derived from cleaned cumulative data
  const deltasByPlatform: Record<string, Record<string, number>> = {};

  for (const platform of visiblePlatforms) {
    const series = stats.seriesByPlatform[platform];
    if (!series) continue;

    const snaps = cutoff
      ? series.snapshots.filter(s => s.date >= cutoff)
      : series.snapshots;

    const deltas: Record<string, number> = {};
    for (let i = 1; i < snaps.length; i++) {
      const delta = snaps[i]!.followers - snaps[i - 1]!.followers;
      deltas[snaps[i]!.date] = delta;
    }
    deltasByPlatform[platform] = deltas;
  }

  // Union all dates
  const allDates = Array.from(
    new Set(Object.values(deltasByPlatform).flatMap(d => Object.keys(d)))
  ).sort();

  return allDates.map(date => {
    const row: DailyDeltaRow = { date };
    for (const platform of visiblePlatforms) {
      row[platform] = deltasByPlatform[platform]?.[date] ?? null;
    }
    return row;
  });
}

// Returns cumulative follower data for each platform (for line chart)
export interface CumulativeRow {
  date: string;
  [platform: string]: string | number | null;
}

export function buildCumulativeChartData(
  stats: CreatorStats,
  visiblePlatforms: string[],
  days: DaysOption
): CumulativeRow[] {
  const cutoff = days !== null ? cutoffDate(days) : null;

  const snapsByPlatform: Record<string, DailySnapshot[]> = {};
  for (const platform of visiblePlatforms) {
    const series = stats.seriesByPlatform[platform];
    if (!series) continue;
    snapsByPlatform[platform] = cutoff
      ? series.snapshots.filter(s => s.date >= cutoff)
      : series.snapshots;
  }

  // Union all dates
  const allDates = Array.from(
    new Set(Object.values(snapsByPlatform).flatMap(snaps => snaps.map(s => s.date)))
  ).sort();

  // For each date, build the row. Use null for missing platform data
  // so connectNulls bridges cleanly.
  const snapMap: Record<string, Record<string, number>> = {};
  for (const platform of visiblePlatforms) {
    for (const snap of snapsByPlatform[platform] ?? []) {
      if (!snapMap[snap.date]) snapMap[snap.date] = {};
      snapMap[snap.date]![platform] = snap.followers;
    }
  }

  return allDates.map(date => {
    const row: CumulativeRow = { date };
    let total = 0;
    let anyNull = false;

    for (const platform of visiblePlatforms) {
      const v = snapMap[date]?.[platform] ?? null;
      row[platform] = v;
      if (v === null) anyNull = true;
      else total += v;
    }

    if (visiblePlatforms.length > 1) {
      row['Total'] = anyNull ? null : total;
    }

    return row;
  });
}

// Thin X-axis ticks to at most maxTicks evenly spaced labels
export function thinTicks(dates: string[], maxTicks = 12): string[] {
  if (dates.length <= maxTicks) return dates;
  const step = Math.ceil(dates.length / maxTicks);
  return dates.filter((_, i) => i % step === 0 || i === dates.length - 1);
}
