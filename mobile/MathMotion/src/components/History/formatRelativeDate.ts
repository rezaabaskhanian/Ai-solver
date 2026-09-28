import type { TFunction } from 'i18next';

const DAY_MS = 24 * 60 * 60 * 1000;

// Deliberately not using Intl.RelativeTimeFormat: Hermes's bundled ICU
// data doesn't reliably include the "fa" locale, and a Jalali calendar
// conversion is out of scope for this placeholder UI. Plain day-diff
// arithmetic plus our own translated words works everywhere.
export function formatRelativeDate(isoDate: string, t: TFunction): string {
  const created = new Date(isoDate);
  const now = new Date();

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(created)) / DAY_MS);

  if (diffDays <= 0) {
    return t('common.today');
  }
  if (diffDays === 1) {
    return t('common.yesterday');
  }
  if (diffDays < 7) {
    return t('common.daysAgo', { count: diffDays });
  }
  return created.toLocaleDateString('en-CA'); // YYYY-MM-DD, locale-neutral
}
