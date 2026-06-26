import { useServerStore } from '../stores/serverStore';

/**
 * Authenticated fetch wrapper with auto-refresh on 401.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { accessToken, getActiveUrl, refreshAuth } = useServerStore.getState();
  const baseUrl = getActiveUrl();
  if (!baseUrl) throw new Error('No active server');

  const doFetch = async (token: string | null) => {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    return res;
  };

  let res = await doFetch(accessToken);

  // Auto-refresh on 401
  if (res.status === 401) {
    try {
      await refreshAuth();
      const newToken = useServerStore.getState().accessToken;
      res = await doFetch(newToken);
    } catch {
      throw new Error('Session expired — please reconnect');
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    const err = new Error(body.error || `Request failed: ${res.status}`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }

  return res.json() as Promise<T>;
}
