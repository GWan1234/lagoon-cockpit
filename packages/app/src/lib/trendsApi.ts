/**
 * Typed contract for GET /api/metrics/history (new range/buckets shape, Phase 2)
 * plus framework-free mapping helpers for the chart layer. NO react-native imports.
 */

export interface TrendBucket {
  t: number;
  cpu_min: number; cpu_max: number; cpu_avg: number;
  memory_min: number; memory_max: number; memory_avg: number;
  disk_min: number; disk_max: number; disk_avg: number;
  load_min: number; load_max: number; load_avg: number;
  container_total_min: number; container_total_max: number; container_total_avg: number;
  container_running_min: number; container_running_max: number; container_running_avg: number;
  sample_count: number;
}

export interface TrendsResponse {
  resolution: 'raw' | 'hourly' | 'daily';
  buckets: TrendBucket[];
  summary: Record<string, number>;
  clamped: boolean;
  requestedDays: number;
  servedDays: number;
  retentionDays: number;
}

export type TrendMetricKey =
  | 'cpu' | 'memory' | 'disk' | 'load'
  | 'container_total' | 'container_running';

export interface BandSeries {
  line: { value: number }[];
  min: { value: number }[];
  max: { value: number }[];
}

/** Map one metric's avg/min/max columns into gifted-charts {value} point arrays. */
export function toBandSeries(buckets: TrendBucket[], metric: TrendMetricKey): BandSeries {
  const avgKey = `${metric}_avg` as keyof TrendBucket;
  const minKey = `${metric}_min` as keyof TrendBucket;
  const maxKey = `${metric}_max` as keyof TrendBucket;
  return {
    line: buckets.map((b) => ({ value: Number(b[avgKey]) })),
    min: buckets.map((b) => ({ value: Number(b[minKey]) })),
    max: buckets.map((b) => ({ value: Number(b[maxKey]) })),
  };
}

/** A trend chart needs ≥2 points; null/short responses render the empty state. */
export function hasEnoughHistory(res: TrendsResponse | null): boolean {
  return !!res && res.buckets.length >= 2;
}
