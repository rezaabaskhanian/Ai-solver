import { isAxiosError } from 'axios';

// The Go API's error codes (backend/go-api/internal/pkg/errorhandling) are
// coarse — several distinct failures share the same "invalid_input" code
// with different English messages (backend/go-api/internal/pkg/errmesg).
// Since this app is bilingual, we key translations off the exact message
// text for the cases we know about and fall back to the raw message
// (English) for anything unrecognized, rather than showing a code to users.
export class ApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function toApiError(error: unknown): ApiError {
  if (isAxiosError(error)) {
    if (error.response) {
      const body = error.response.data as { error?: string; message?: string } | undefined;
      return new ApiError(body?.error ?? 'unknown', body?.message ?? error.message);
    }
    return new ApiError('network', 'Could not reach the server.');
  }
  const message = error instanceof Error ? error.message : 'Unknown error';
  return new ApiError('unknown', message);
}

const KNOWN_MESSAGE_TRANSLATION_KEYS: Record<string, string> = {
  "We couldn't understand this problem. Please check your equation.": 'errors.couldNotUnderstand',
  "This type of problem isn't supported yet.": 'errors.unsupportedType',
  'Something went wrong solving this problem. Please try again.': 'errors.verificationFailed',
  'The math engine is unavailable. Please try again.': 'errors.engineUnavailable',
  'Something went wrong. Please try again.': 'errors.internal',
  'Request body must be valid JSON.': 'errors.internal',
  "This purchase couldn't be verified.": 'errors.purchaseInvalid',
};

export function translationKeyForApiError(err: ApiError): string {
  if (err.code === 'network') {
    return 'errors.network';
  }
  if (err.code === 'rate_limited') {
    return 'errors.rateLimited';
  }
  // quota_exceeded is its own distinct code (unlike invalid_input, which
  // several unrelated failures share — see the comment above), so it's
  // safe to key off the code directly here.
  if (err.code === 'quota_exceeded') {
    return 'errors.quotaExceeded';
  }
  // Thrown client-side by src/services/billing/poolakey.ts, never by the
  // Go API — Cafe Bazaar (and Poolakey) has no iOS equivalent.
  if (err.message === 'android_only') {
    return 'billing.androidOnly';
  }
  // Thrown by @cafebazaar/react-native-poolakey when the Bazaar app
  // itself isn't installed on the device.
  if (err.message === 'Bazaar is not installed') {
    return 'billing.bazaarNotInstalled';
  }
  return KNOWN_MESSAGE_TRANSLATION_KEYS[err.message] ?? 'errors.generic';
}
