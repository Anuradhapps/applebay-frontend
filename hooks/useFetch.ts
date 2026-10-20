"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

/** Loads a list endpoint and tracks loading / error state. */
export function useFetch<T>(endpoint: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setData(await api.get<T[]>(endpoint));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, setError, reload };
}
