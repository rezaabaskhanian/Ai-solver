import { chapterVisibleForTrack } from '../curriculum';
import { visibleForTrack, type StudyTrack } from '../track';
import type { KonkurContent } from './index';

// What one study track sees of the konkur content. A tip shows when its
// own `tracks` allow it and its textbook chapter (if any) is shown to the
// track. Real-exam questions follow `source.track`; authored questions
// follow their tips (visible if any of their tips is).
export function contentForTrack(content: KonkurContent, track: StudyTrack): KonkurContent {
  const tips = content.tips.filter(
    tip => visibleForTrack(tip, track) && (!tip.chapterId || chapterVisibleForTrack(tip.chapterId, track)),
  );
  const tipIds = new Set(tips.map(tip => tip.id));
  const questions = content.questions.filter(q =>
    q.source.kind === 'konkur' ? q.source.track === track : q.tipIds.some(id => tipIds.has(id)),
  );
  return { tips, questions };
}
