import { AxiosError } from 'axios';

import { ApiError, toApiError, translationKeyForApiError } from './apiError';

function axiosErrorWithResponse(status: number, body: { error?: string; message?: string }): AxiosError {
  const error = new AxiosError('Request failed', undefined, undefined, undefined, {
    status,
    data: body,
  } as never);
  return error;
}

describe('toApiError', () => {
  it('reads the error code and message out of an Axios response body', () => {
    const apiError = toApiError(
      axiosErrorWithResponse(422, { error: 'parse_error', message: 'Bad input' }),
    );
    expect(apiError.code).toBe('parse_error');
    expect(apiError.message).toBe('Bad input');
  });

  it('reports a network error when the request never got a response', () => {
    const error = new AxiosError('timeout');
    const apiError = toApiError(error);
    expect(apiError.code).toBe('network');
  });

  it('wraps a plain Error as an unknown ApiError', () => {
    const apiError = toApiError(new Error('boom'));
    expect(apiError.code).toBe('unknown');
    expect(apiError.message).toBe('boom');
  });

  it('wraps a non-Error throw without crashing', () => {
    const apiError = toApiError('just a string');
    expect(apiError.code).toBe('unknown');
    expect(apiError.message).toBe('Unknown error');
  });
});

describe('translationKeyForApiError', () => {
  it.each([
    ['network', 'errors.network'],
    ['rate_limited', 'errors.rateLimited'],
    ['quota_exceeded', 'errors.quotaExceeded'],
  ])('maps the %s code directly to %s', (code, key) => {
    expect(translationKeyForApiError(new ApiError(code, 'irrelevant'))).toBe(key);
  });

  it('maps known invalid_input messages to their specific translation key', () => {
    const err = new ApiError('invalid_input', "We couldn't understand this problem. Please check your equation.");
    expect(translationKeyForApiError(err)).toBe('errors.couldNotUnderstand');
  });

  it('maps client-side billing messages regardless of code', () => {
    expect(translationKeyForApiError(new ApiError('unknown', 'android_only'))).toBe('billing.androidOnly');
    expect(translationKeyForApiError(new ApiError('unknown', 'Bazaar is not installed'))).toBe(
      'billing.bazaarNotInstalled',
    );
  });

  it('falls back to a generic key for an unrecognized message', () => {
    const err = new ApiError('invalid_input', 'Something nobody has ever seen before.');
    expect(translationKeyForApiError(err)).toBe('errors.generic');
  });
});
