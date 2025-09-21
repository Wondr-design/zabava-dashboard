import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/config";

export function usePartnerData(partnerId, { token, onUnauthorized } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortController = useRef(null);

  const canFetch = useMemo(() => Boolean(partnerId && token), [partnerId, token]);

  const fetchData = useCallback(async () => {
    if (!canFetch) {
      return;
    }

    if (abortController.current) {
      abortController.current.abort();
    }

    const controller = new AbortController();
    abortController.current = controller;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/api/partner/${partnerId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        }
      );

      if (response.status === 401 || response.status === 403) {
        onUnauthorized?.();
        throw new Error("Unauthorized");
      }

      if (!response.ok) {
        throw new Error(
          `Request failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      if (err.name === "AbortError") {
        return;
      }
      setError(err);
      console.error("Error fetching partner data:", err);
    } finally {
      setLoading(false);
    }
  }, [canFetch, onUnauthorized, partnerId, token]);

  useEffect(() => {
    if (canFetch) {
      fetchData();
    }
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [canFetch, fetchData]);

  const refetch = useCallback(() => {
    if (canFetch) {
      return fetchData();
    }
    return Promise.resolve();
  }, [canFetch, fetchData]);

  return { data, loading, error, refetch };
}
