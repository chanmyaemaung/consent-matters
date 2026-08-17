import { useCallback, useMemo, useState } from "react";

/**
 * Page-level form state with dirty tracking. `initial` comes from loader
 * data; when it changes (after a successful save revalidates the loader)
 * the form resets to the fresh values, closing the save bar.
 */
export function useSettingsForm<T extends Record<string, unknown>>(
  initial: T,
) {
  const initialKey = useMemo(() => JSON.stringify(initial), [initial]);
  const [values, setValues] = useState<T>(initial);
  const [seenKey, setSeenKey] = useState(initialKey);

  // Reset the form when the loader delivers fresh data (post-save
  // revalidation) — render-time state adjustment, no effect needed.
  if (seenKey !== initialKey) {
    setSeenKey(initialKey);
    setValues(JSON.parse(initialKey) as T);
  }

  const setValue = useCallback(
    <K extends keyof T>(key: K, value: T[K]) =>
      setValues((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const isDirty = JSON.stringify(values) !== initialKey;

  const discard = useCallback(() => {
    setValues(JSON.parse(initialKey) as T);
  }, [initialKey]);

  return { values, setValue, isDirty, discard };
}
