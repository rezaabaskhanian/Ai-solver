// The student's study track («رشته»): ریاضی-فیزیک or علوم تجربی. Content
// that only one track needs carries `tracks: [...]`; content without
// `tracks` is shared and shown to everyone.
export type StudyTrack = 'riazi' | 'tajrobi';

export const STUDY_TRACKS: StudyTrack[] = ['riazi', 'tajrobi'];
export const DEFAULT_TRACK: StudyTrack = 'riazi';

export function isStudyTrack(value: unknown): value is StudyTrack {
  return value === 'riazi' || value === 'tajrobi';
}

export interface TrackScoped {
  tracks?: StudyTrack[];
}

// Missing (or empty) `tracks` = shown to every track.
export function visibleForTrack(item: TrackScoped, track: StudyTrack): boolean {
  const tracks = item.tracks;
  return !Array.isArray(tracks) || tracks.length === 0 || tracks.includes(track);
}

export function filterForTrack<T extends TrackScoped>(items: readonly T[], track: StudyTrack): T[] {
  return items.filter(item => visibleForTrack(item, track));
}
