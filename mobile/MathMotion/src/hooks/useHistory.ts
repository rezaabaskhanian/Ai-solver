import { useCallback, useEffect, useState } from 'react';

import { fetchHistory } from '../services/api/problems';
import type { HistoryItem } from '../types/problem';

interface UseHistoryResult {
  items: HistoryItem[];
  loading: boolean;
  error: boolean;
  reload: () => void;
}

export function useHistory(limit?: number): UseHistoryResult {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken(token => token + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchHistory(limit)
      .then(result => {
        if (!cancelled) {
          setItems(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [limit, reloadToken]);

  return { items, loading, error, reload };
}
