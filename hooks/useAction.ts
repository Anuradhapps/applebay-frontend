"use client";

import { useCallback, useState } from "react";

/**
 * Wraps a save/delete call: sets "busy", clears and reports errors.
 * Returns true when the action succeeded.
 */
export function useAction(setError: (message: string) => void) {
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (action: () => Promise<unknown>, fallback: string) => {
      try {
        setBusy(true);
        setError("");
        await action();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : fallback);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [setError]
  );

  return { run, busy };
}
