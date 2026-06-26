import { create } from 'zustand';
import { apiFetch } from '../lib/api';
import { isRangeLocked, rangeToQuery, TrendRange } from '../lib/trends';
import type { TrendsResponse } from '../lib/trendsApi';

interface TrendsState {
  range: TrendRange;
  data: TrendsResponse | null;
  loading: boolean;
  error: string | null;

  setRange: (range: TrendRange) => void;
  /** Fetch the current range. NEVER hits the network for a locked range. */
  fetch: (retentionLimitDays: number) => Promise<void>;
  reset: () => void;
}

export const useTrendsStore = create<TrendsState>((set, get) => ({
  range: '24h',
  data: null,
  loading: false,
  error: null,

  setRange: (range) => set({ range }),

  fetch: async (retentionLimitDays) => {
    const { range } = get();
    // Authoritative client pre-gate — a locked range must never be requested.
    if (isRangeLocked(range, retentionLimitDays)) return;

    set({ loading: true, error: null });
    try {
      const res = await apiFetch<TrendsResponse>(
        `/api/metrics/history?${rangeToQuery(range)}`,
      );
      set({ data: res, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load trends',
        loading: false,
      });
    }
  },

  reset: () => set({ range: '24h', data: null, loading: false, error: null }),
}));
