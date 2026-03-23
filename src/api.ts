import type { RawRecord, Creator, SocialAccount, DailySnapshot } from './types';

// ─── Config ────────────────────────────────────────────────────────────────

const BASE_ID  = 'appRBAdCXbJvGgjvz';
const API_ROOT = `https://api.airtable.com/v0/${BASE_ID}`;

// Table IDs
const T_SOCIAL_ACCOUNTS = 'tblm3kiKutcKGi79e';
const T_PERFORMANCE     = 'tbl91q37GxDiUjOCZ';
// Creators table — use name since we don't have the ID handy
const T_CREATORS        = 'Creators';

// Performance field names (Airtable REST API returns keys by name by default)
const F_SNAP_DATE    = 'Snapshot Date';
const F_FOLLOWERS    = 'Followers';
const F_PLATFORM     = 'Platform';
const F_SOCIAL_ACCT  = 'Social Account';

// ─── Core fetcher ──────────────────────────────────────────────────────────

function getToken(): string {
  const token = import.meta.env.VITE_AIRTABLE_TOKEN as string | undefined;
  if (!token) throw new Error('VITE_AIRTABLE_TOKEN is not set in your .env file.');
  return token;
}

async function fetchPage(
  tableId: string,
  params: Record<string, string | string[]>,
  token: string
): Promise<{ records: RawRecord[]; offset?: string }> {
  const url = new URL(`${API_ROOT}/${encodeURIComponent(tableId)}`);
  for (const [key, val] of Object.entries(params)) {
    if (Array.isArray(val)) {
      val.forEach(v => url.searchParams.append(key, v));
    } else {
      url.searchParams.set(key, val);
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable error ${res.status}: ${body}`);
  }

  return res.json();
}

// Fetch all pages of a table, up to CONCURRENCY requests in flight at once.
// Calls onProgress(loaded, estimatedTotal) after each page.
async function fetchAllRecords(
  tableId: string,
  fields: string[],
  token: string,
  onProgress?: (loaded: number, total: number) => void,
  extraParams: Record<string, string> = {}
): Promise<RawRecord[]> {
  const records: RawRecord[] = [];
  let offset: string | undefined;

  // Fetch first page to get initial count estimate
  const firstPage = await fetchPage(
    tableId,
    { pageSize: '100', 'fields[]': fields, ...extraParams },
    token
  );
  records.push(...firstPage.records);
  offset = firstPage.offset;
  onProgress?.(records.length, records.length + (offset ? 500 : 0));

  // Continue fetching remaining pages sequentially
  // (Airtable rate limit: 5 req/sec — sequential is safe and simple)
  while (offset) {
    const page = await fetchPage(
      tableId,
      { pageSize: '100', 'fields[]': fields, offset, ...extraParams },
      token
    );
    records.push(...page.records);
    offset = page.offset;
    onProgress?.(records.length, records.length + (offset ? 100 : 0));
  }

  return records;
}

// ─── Parsers ───────────────────────────────────────────────────────────────

function parseCreators(raw: RawRecord[]): Creator[] {
  return raw
    .map(r => {
      // Primary field name can vary; try common variants
      const name =
        (r.fields['Creator Name'] as string) ??
        r.id;

      const linked = r.fields['Social Accounts'] as string[] | null;

      const statusRaw = r.fields['Status'] as { name: string } | string | null;
      const status    = (
        typeof statusRaw === 'object' && statusRaw !== null
          ? statusRaw.name
          : String(statusRaw ?? '')
      ) as 'Client' | 'Watchlist' | '';

      return {
        id:               r.id,
        name,
        socialAccountIds: linked ?? [],
        status,
      };
    })
    .filter(c => c.name && c.socialAccountIds.length > 0);
}

function parseSocialAccounts(raw: RawRecord[]): SocialAccount[] {
  return raw.map(r => {
    const platformRaw = r.fields['Platform'] as { name: string } | string | null;
    const platform    = typeof platformRaw === 'object' && platformRaw !== null
      ? platformRaw.name
      : String(platformRaw ?? '');

    const creatorLinked = r.fields['Creator'] as string[] | null;

    return {
      id:         r.id,
      label:      (r.fields['Social Account ID'] as string) ?? '',
      platform:   platform || 'Unknown',
      handle:     (r.fields['Handle'] as string) ?? '',
      creatorIds: creatorLinked ?? [],
    };
  });
}

function parseSnapshots(raw: RawRecord[]): DailySnapshot[] {
  const results: DailySnapshot[] = [];

  for (const r of raw) {
    const dateRaw = r.fields[F_SNAP_DATE];
    const date    = dateRaw ? String(dateRaw).split('T')[0] : null;
    if (!date) continue;

    const followersRaw = r.fields[F_FOLLOWERS];
    const followers    =
      typeof followersRaw === 'number' ? followersRaw
      : typeof followersRaw === 'string' ? parseFloat(followersRaw) || 0
      : 0;

    // Skip hard zeros — these are SocialBlade reporting errors
    if (followers === 0) continue;

    const platformRaw = r.fields[F_PLATFORM] as { name: string } | string | null;
    const platform    = typeof platformRaw === 'object' && platformRaw !== null
      ? platformRaw.name
      : String(platformRaw ?? '');

    const acctLinked = r.fields[F_SOCIAL_ACCT] as string[] | null;
    const accountId  = acctLinked?.[0] ?? '';
    if (!accountId) continue;

    results.push({ date, followers, accountId, platform });
  }

  return results;
}

// ─── Main load function ────────────────────────────────────────────────────

export interface LoadProgress {
  stage: string;
  loaded: number;
  total: number;
}

export async function loadAllData(
  onProgress: (p: LoadProgress) => void
): Promise<{ creators: Creator[]; accounts: SocialAccount[]; snapshots: DailySnapshot[] }> {
  const token = getToken();

  // 1. Creators
  onProgress({ stage: 'Loading creators…', loaded: 0, total: 1 });
  const rawCreators = await fetchAllRecords(T_CREATORS, ['Creator Name', 'Social Accounts', 'Status'], token);
  const creators    = parseCreators(rawCreators);
  onProgress({ stage: 'Loading creators…', loaded: 1, total: 1 });

  // 2. Social Accounts
  onProgress({ stage: 'Loading social accounts…', loaded: 0, total: 1 });
  const rawAccounts = await fetchAllRecords(
    T_SOCIAL_ACCOUNTS,
    ['Social Account ID', 'Platform', 'Handle', 'Creator'],
    token
  );
  const accounts = parseSocialAccounts(rawAccounts);
  onProgress({ stage: 'Loading social accounts…', loaded: 1, total: 1 });

  // 3. Performance data — this is the bulk (7K+ records)
  const rawSnaps = await fetchAllRecords(
    T_PERFORMANCE,
    ['Snapshot Date', 'Followers', 'Platform', 'Social Account'],
    token,
    (loaded, total) => onProgress({ stage: 'Loading performance history…', loaded, total })
  );
  const snapshots = parseSnapshots(rawSnaps);

  return { creators, accounts, snapshots };
}
