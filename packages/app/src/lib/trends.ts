/**
 * Framework-free trends logic — pill construction, edition cap, and
 * range→query mapping. NO react/react-native imports (keeps it unit-testable
 * under the node-env jest harness). UI lives in app/manage/trends.tsx.
 */

export type TrendRange = '24h' | '7d' | '30d' | '90d' | '1y';

export const RANGE_DAYS: Record<TrendRange, number> = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

const RANGE_ORDER: TrendRange[] = ['24h', '7d', '30d', '90d', '1y'];

export interface TrendPill {
  range: TrendRange;
  label: string;
  days: number;
  locked: boolean;
}

/**
 * Build the ordered pill list. A pill is locked when its day count exceeds
 * the edition retention limit. `Infinity` (enterprise/private) locks nothing.
 */
export function buildPills(retentionLimitDays: number): TrendPill[] {
  return RANGE_ORDER.map((range) => {
    const days = RANGE_DAYS[range];
    return { range, label: range, days, locked: days > retentionLimitDays };
  });
}

export function isRangeLocked(range: TrendRange, retentionLimitDays: number): boolean {
  return RANGE_DAYS[range] > retentionLimitDays;
}

export function rangeToQuery(range: TrendRange): string {
  return `range=${range}`;
}
