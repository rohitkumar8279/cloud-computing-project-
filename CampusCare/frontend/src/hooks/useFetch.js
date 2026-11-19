import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async loader and tracks data/loading/error.
 * `reload({ silent: true })` refreshes without showing the loading state.
 * Optional `refreshMs` re-fetches silently while the tab is visible.
 */
export function useFetch(loader, deps = [], { refreshMs } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const latest = useRef(0);

  const reload = useCallback(
    async ({ silent = false } = {}) => {
      const id = ++latest.current;
      if (!silent) setLoading(true);
      try {
        const result = await loader();
        if (id === latest.current) {
          setData(result);
          setError(null);
        }
        return result;
      } catch (err) {
        if (id === latest.current && !silent) setError(err);
        return undefined;
      } finally {
        if (id === latest.current && !silent) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!refreshMs) return undefined;
    const tick = () => document.visibilityState === 'visible' && reload({ silent: true });
    const timer = setInterval(tick, refreshMs);
    const onFocus = () => reload({ silent: true });
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshMs, reload]);

  return { data, setData, loading, error, reload };
}
