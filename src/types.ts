// ─── Raw Airtable shapes ───────────────────────────────────────────────────

export interface RawRecord {
  id: string;
  fields: Record<string, unknown>;
}

// ─── Domain types ──────────────────────────────────────────────────────────

export interface Creator {
  id: string;
  name: string;
  socialAccountIds: string[]; // linked record IDs into Social Accounts table
}

export interface SocialAccount {
  id: string;
  label: string;       // "Social Account ID" text field, e.g. "Burrata Babe - Instagram"
  platform: string;    // 'Instagram' | 'TikTok' | 'YouTube'
  handle: string;
  creatorIds: string[];
}

export interface DailySnapshot {
  date: string;        // YYYY-MM-DD
  followers: number;   // cumulative total that day
  accountId: string;   // Social Account record ID
  platform: string;
}

// ─── Processed / derived types ────────────────────────────────────────────

// One platform's cleaned time series + computed metrics
export interface PlatformSeries {
  platform: string;
  snapshots: DailySnapshot[];      // cleaned, sorted asc
  currentFollowers: number;
  sevenDayGain: number;
  thirtyDayGain: number;
  ninetyDayGain: number;
}

// Everything needed to render one creator card + detail view
export interface CreatorStats {
  creator: Creator;
  accounts: SocialAccount[];
  platforms: string[];
  seriesByPlatform: Record<string, PlatformSeries>;
  totalFollowers: number;
  totalSevenDayGain: number;
  totalThirtyDayGain: number;
}

// ─── App-level state ───────────────────────────────────────────────────────

export interface AppData {
  creators: Creator[];
  accounts: SocialAccount[];
  snapshots: DailySnapshot[];
}

export type SortKey = 'totalFollowers' | 'sevenDayGain' | 'thirtyDayGain';
export type DaysOption = 30 | 90 | 182 | 365 | null;
