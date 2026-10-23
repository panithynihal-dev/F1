import { useEffect, useState } from 'react';

/**
 * The current time as state, refreshed every `everyMs`. Pages that compare against "now" (what's
 * next, what's finished) use this rather than calling Date.now() while rendering, so a tab left
 * open rolls over when a session starts instead of staying frozen at the moment it was loaded.
 */
export function useNow(everyMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(timer);
  }, [everyMs]);
  return now;
}
