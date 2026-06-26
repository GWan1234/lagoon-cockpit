import { TrendBucket, TrendsResponse, toBandSeries, hasEnoughHistory } from '../trendsApi';

function bucket(over: Partial<TrendBucket>): TrendBucket {
  return {
    t: 1750000000,
    cpu_min: 0, cpu_max: 0, cpu_avg: 0,
    memory_min: 0, memory_max: 0, memory_avg: 0,
    disk_min: 0, disk_max: 0, disk_avg: 0,
    load_min: 0, load_max: 0, load_avg: 0,
    container_total_min: 0, container_total_max: 0, container_total_avg: 0,
    container_running_min: 0, container_running_max: 0, container_running_avg: 0,
    sample_count: 1,
    ...over,
  };
}

describe('toBandSeries', () => {
  it('maps cpu avg/min/max into gifted-charts value points', () => {
    const buckets = [
      bucket({ cpu_avg: 10, cpu_min: 5, cpu_max: 20 }),
      bucket({ cpu_avg: 30, cpu_min: 25, cpu_max: 40 }),
    ];
    const s = toBandSeries(buckets, 'cpu');
    expect(s.line).toEqual([{ value: 10 }, { value: 30 }]);
    expect(s.min).toEqual([{ value: 5 }, { value: 25 }]);
    expect(s.max).toEqual([{ value: 20 }, { value: 40 }]);
  });

  it('maps container_running with the prefixed column names', () => {
    const s = toBandSeries(
      [bucket({ container_running_avg: 3, container_running_min: 2, container_running_max: 4 })],
      'container_running',
    );
    expect(s.line).toEqual([{ value: 3 }]);
    expect(s.min).toEqual([{ value: 2 }]);
    expect(s.max).toEqual([{ value: 4 }]);
  });
});

describe('hasEnoughHistory', () => {
  const base: TrendsResponse = {
    resolution: 'hourly', buckets: [], summary: {},
    clamped: false, requestedDays: 30, servedDays: 30, retentionDays: 30,
  };
  it('is false for null', () => expect(hasEnoughHistory(null)).toBe(false));
  it('is false for a single bucket', () =>
    expect(hasEnoughHistory({ ...base, buckets: [bucket({})] })).toBe(false));
  it('is true for two or more buckets', () =>
    expect(hasEnoughHistory({ ...base, buckets: [bucket({}), bucket({})] })).toBe(true));
});
