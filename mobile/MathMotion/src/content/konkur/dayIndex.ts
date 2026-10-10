// Calendar days in the device's LOCAL time, as whole numbers. Two moments
// on the same local date always share an index, whatever the time of day
// or the UTC offset (including DST changes), and consecutive dates differ
// by exactly 1. The index is only ever compared with other indexes, never
// turned back into a timestamp.
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function dayIndexOf(timestamp: number): number {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) {
    return 0;
  }
  // Date.UTC of the local y/m/d is DST-proof: every day is exactly 24 h long in UTC.
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_PER_DAY);
}
