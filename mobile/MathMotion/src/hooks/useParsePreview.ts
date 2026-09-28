import { useEffect, useState } from 'react';

import { toApiError, type ApiError } from '../services/api/apiError';
import { parseProblem } from '../services/api/problems';
import type { ParseResult } from '../types/problem';
import { useDebouncedValue } from './useDebouncedValue';

const DEBOUNCE_MS = 500;
const MIN_LENGTH = 2;

interface UseParsePreviewResult {
  result: ParseResult | null;
  error: ApiError | null;
  loading: boolean;
}

// PRD section 7: preview what the engine understood before the user
// commits to Solve. Debounced so we don't hit /parse on every keystroke.
export function useParsePreview(input: string): UseParsePreviewResult {
  const debounced = useDebouncedValue(input.trim(), DEBOUNCE_MS);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (debounced.length < MIN_LENGTH) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    parseProblem(debounced)
      .then(parsed => {
        if (!cancelled) {
          setResult(parsed);
          setError(null);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setResult(null);
          setError(toApiError(err));
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
  }, [debounced]);

  return { result, error, loading };
}
