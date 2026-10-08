import { useCallback, useEffect, useRef, useState } from 'react';

/** A single short-lived toast ({ id, message, tone }) that hides itself. */
export function useToast(duration = 2600) {
  const [toast, setToast] = useState(null);
  const nextId = useRef(0);

  const showToast = useCallback((message, tone = 'success') => {
    nextId.current += 1;
    setToast({ id: nextId.current, message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), duration);
    return () => clearTimeout(timer);
  }, [toast, duration]);

  return { toast, showToast };
}
