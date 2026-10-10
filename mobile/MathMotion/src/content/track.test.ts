import { DEFAULT_TRACK, filterForTrack, isStudyTrack, visibleForTrack } from './track';

describe('visibleForTrack', () => {
  it('shows items without tracks to every track', () => {
    expect(visibleForTrack({}, 'riazi')).toBe(true);
    expect(visibleForTrack({}, 'tajrobi')).toBe(true);
    expect(visibleForTrack({ tracks: [] }, 'tajrobi')).toBe(true);
  });

  it('shows scoped items only to their tracks', () => {
    expect(visibleForTrack({ tracks: ['tajrobi'] }, 'riazi')).toBe(false);
    expect(visibleForTrack({ tracks: ['tajrobi'] }, 'tajrobi')).toBe(true);
    expect(visibleForTrack({ tracks: ['riazi', 'tajrobi'] }, 'riazi')).toBe(true);
  });
});

describe('filterForTrack', () => {
  it('keeps shared items and the matching track', () => {
    const items = [{ id: 'a' }, { id: 'b', tracks: ['riazi' as const] }, { id: 'c', tracks: ['tajrobi' as const] }];
    expect(filterForTrack(items, 'tajrobi').map(i => i.id)).toEqual(['a', 'c']);
    expect(filterForTrack(items, 'riazi').map(i => i.id)).toEqual(['a', 'b']);
  });
});

describe('isStudyTrack', () => {
  it('accepts only known tracks', () => {
    expect(isStudyTrack('riazi')).toBe(true);
    expect(isStudyTrack('tajrobi')).toBe(true);
    expect(isStudyTrack('x')).toBe(false);
    expect(isStudyTrack(undefined)).toBe(false);
    expect(DEFAULT_TRACK).toBe('riazi');
  });
});
