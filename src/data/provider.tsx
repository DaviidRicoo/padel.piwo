import { createContext, useContext, useEffect, useEffectEvent, useState, useSyncExternalStore, type ReactNode } from 'react';

import type { Api } from './api';
import { toApiError, type ApiError } from './errors';
import { createFakeApi } from './fake/fakeApi';
import type { Id } from './types';

// The fake layer until /replica-backend; EXPO_PUBLIC_DEMO_USER starts signed in
// as a seed account (used for screenshots).
const defaultApi: Api = createFakeApi({ demoEmail: process.env.EXPO_PUBLIC_DEMO_USER });

const ApiContext = createContext<Api>(defaultApi);

export function ApiProvider({ children, api = defaultApi }: { children: ReactNode; api?: Api }) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): Api {
  return useContext(ApiContext);
}

/** The signed-in player's id, updated on sign-in and sign-out. */
export function useUserId(): Id | null {
  const api = useApi();
  return useSyncExternalStore(api.subscribe, api.auth.currentUserId, api.auth.currentUserId);
}

export interface QueryState<T> {
  data: T | undefined;
  error: ApiError | undefined;
  /** true only until the first answer for this key; refreshes keep the old data on screen */
  loading: boolean;
  refetch: () => void;
}

/**
 * Loads data for a screen and reloads it whenever anything changes in the
 * data layer. `key` identifies what is loaded: change it and the query reruns.
 */
export function useQuery<T>(key: string, load: () => Promise<T>): QueryState<T> {
  const api = useApi();
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ key: string; data?: T; error?: ApiError }>({ key: '' });

  useEffect(() => api.subscribe(() => setVersion((v) => v + 1)), [api]);

  const run = useEffectEvent(() => load());
  useEffect(() => {
    let alive = true;
    run().then(
      (data) => alive && setState({ key, data }),
      (e) => alive && setState((s) => ({ key, data: s.key === key ? s.data : undefined, error: toApiError(e) })),
    );
    return () => {
      alive = false;
    };
  }, [key, version]);

  const current = state.key === key;
  return {
    data: current ? state.data : undefined,
    error: current ? state.error : undefined,
    loading: !current,
    refetch: () => setVersion((v) => v + 1),
  };
}
