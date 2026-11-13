import { useEffect, useState } from 'react';

/**
 * The current time as state, refreshed every `intervalMs`. Rendering must not
 * read the clock directly (it would differ between renders), so screens that
 * compare with "now" use this.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
