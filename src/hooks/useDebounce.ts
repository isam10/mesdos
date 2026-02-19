import { useEffect, useState } from 'react';

/**
 * Debounce a value – the returned value only updates after
 * `delay` ms of inactivity on the source value.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
