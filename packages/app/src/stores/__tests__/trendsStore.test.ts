import type { TrendsResponse } from '../../lib/trendsApi';

const mockApiFetch = jest.fn();
jest.mock('../../lib/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a) }));

// imported after the mock is registered
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useTrendsStore } = require('../trendsStore');

const sample: TrendsResponse = {
  resolution: 'hourly', buckets: [], summary: {},
  clamped: false, requestedDays: 30, servedDays: 30, retentionDays: 30,
};

beforeEach(() => {
  mockApiFetch.mockReset();
  useTrendsStore.getState().reset();
});

it('does NOT fetch a locked range (client pre-gate is authoritative)', async () => {
  useTrendsStore.getState().setRange('1y');
  await useTrendsStore.getState().fetch(30); // CE limit -> 1y locked
  expect(mockApiFetch).not.toHaveBeenCalled();
  expect(useTrendsStore.getState().loading).toBe(false);
});

it('fetches an unlocked range with the range query param', async () => {
  mockApiFetch.mockResolvedValueOnce(sample);
  useTrendsStore.getState().setRange('30d');
  await useTrendsStore.getState().fetch(30);
  expect(mockApiFetch).toHaveBeenCalledWith('/api/metrics/history?range=30d');
  expect(useTrendsStore.getState().data).toEqual(sample);
  expect(useTrendsStore.getState().error).toBeNull();
  expect(useTrendsStore.getState().loading).toBe(false);
});

it('captures a thrown error and clears loading', async () => {
  mockApiFetch.mockRejectedValueOnce(new Error('Request failed: 402'));
  useTrendsStore.getState().setRange('7d');
  await useTrendsStore.getState().fetch(365);
  expect(useTrendsStore.getState().error).toBe('Request failed: 402');
  expect(useTrendsStore.getState().data).toBeNull();
  expect(useTrendsStore.getState().loading).toBe(false);
});
