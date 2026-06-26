import {
  RANGE_DAYS,
  buildPills,
  isRangeLocked,
  rangeToQuery,
  TrendRange,
} from '../trends';

describe('RANGE_DAYS', () => {
  it('maps every pill to its day count', () => {
    expect(RANGE_DAYS).toEqual({ '24h': 1, '7d': 7, '30d': 30, '90d': 90, '1y': 365 });
  });
});

describe('buildPills', () => {
  it('locks pills whose day count exceeds the CE 30-day retention limit', () => {
    const pills = buildPills(30);
    const lockedRanges = pills.filter((p) => p.locked).map((p) => p.range);
    expect(lockedRanges).toEqual(['90d', '1y']);
    expect(pills.find((p) => p.range === '30d')!.locked).toBe(false);
  });

  it('locks only 1y at the Pro 365-day limit', () => {
    const pills = buildPills(365);
    expect(pills.filter((p) => p.locked).map((p) => p.range)).toEqual([]);
  });

  it('locks 1y just below 365 (sub-year Pro edge)', () => {
    const pills = buildPills(364);
    expect(pills.filter((p) => p.locked).map((p) => p.range)).toEqual(['1y']);
  });

  it('unlocks every pill when the limit is Infinity (enterprise/private)', () => {
    const pills = buildPills(Infinity);
    expect(pills.every((p) => !p.locked)).toBe(true);
    expect(pills).toHaveLength(5);
  });

  it('emits pills in display order with labels', () => {
    expect(buildPills(Infinity).map((p) => p.label)).toEqual([
      '24h', '7d', '30d', '90d', '1y',
    ]);
  });
});

describe('isRangeLocked', () => {
  it('is true when the range exceeds the limit', () => {
    expect(isRangeLocked('1y', 30)).toBe(true);
    expect(isRangeLocked('7d', 30)).toBe(false);
  });
});

describe('rangeToQuery', () => {
  it('produces the server range query param', () => {
    const r: TrendRange = '90d';
    expect(rangeToQuery(r)).toBe('range=90d');
  });
});
