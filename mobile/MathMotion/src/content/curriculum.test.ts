import { booksForTrack, chapterVisibleForTrack, chaptersForTopic, CURRICULUM } from './curriculum';
import { EXAM_SYLLABUS } from './examSyllabus';
import { TOPICS } from './topics';

const allChapters = CURRICULUM.flatMap(g => g.books.flatMap(b => b.chapters));

describe('curriculum', () => {
  it('has unique chapter ids', () => {
    const ids = allChapters.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only links to topics that exist', () => {
    const topicIds = TOPICS.map(t => t.id);
    allChapters.forEach(c => (c.topics ?? []).forEach(id => expect(topicIds).toContain(id)));
  });

  it('matches the exam syllabus chapter-for-chapter for grades 7–9', () => {
    [7, 8, 9].forEach(grade => {
      const book = CURRICULUM.find(g => g.grade === grade)!.books[0];
      const exam = EXAM_SYLLABUS.find(g => g.grade === grade)!;
      expect(exam.chapters.map(c => c.id)).toEqual(book.chapters.map(c => c.id));
    });
  });

  it('matches the exam syllabus book-for-book for grades 10–12', () => {
    [10, 11, 12].forEach(grade => {
      const books = CURRICULUM.find(g => g.grade === grade)!.books;
      const exam = EXAM_SYLLABUS.find(g => g.grade === grade)!;
      expect(exam.chapters.map(c => c.id)).toEqual(books.flatMap(b => b.chapters.map(c => c.id)));
      if (books.length > 1) {
        // Two books: each chapter carries its number inside its own book.
        const numbers = books.flatMap(b => b.chapters.map((_, i) => i + 1));
        expect(exam.chapters.map(c => c.number)).toEqual(numbers);
      }
    });
  });

  it('finds where a topic appears in the books', () => {
    const refs = chaptersForTopic('derivative', 'riazi');
    expect(refs.map(r => r.chapter.id)).toEqual(['g12c_derivative', 'g12c_applications']);
    expect(refs[0]).toMatchObject({ grade: 12, book: 'حسابان (۲)', number: 4 });
  });
});

describe('curriculum tracks', () => {
  it('lists every book of grades 7–9 for both tracks', () => {
    [7, 8, 9].forEach(grade => {
      const entry = CURRICULUM.find(g => g.grade === grade)!;
      expect(booksForTrack(entry, 'tajrobi').length).toBe(entry.books.length);
      expect(booksForTrack(entry, 'riazi').length).toBe(entry.books.length);
    });
  });

  it('lists every book without a track restriction for both tracks', () => {
    CURRICULUM.forEach(entry => {
      const shared = entry.books.filter(b => !b.tracks);
      expect(booksForTrack(entry, 'riazi').filter(t => !t.book.tracks).length).toBe(shared.length);
      expect(booksForTrack(entry, 'tajrobi').filter(t => !t.book.tracks).length).toBe(shared.length);
    });
  });

  it('shows the tajrobi math books only to the tajrobi track', () => {
    ['g11t_analytic', 'g12t_function'].forEach(id => {
      expect(chapterVisibleForTrack(id, 'tajrobi')).toBe(true);
      expect(chapterVisibleForTrack(id, 'riazi')).toBe(false);
    });
    expect(chapterVisibleForTrack('g11c_algebra', 'tajrobi')).toBe(false);
    expect(chapterVisibleForTrack('g10_sets', 'tajrobi')).toBe(true);
  });

  it('treats unknown chapter ids as shared', () => {
    expect(chapterVisibleForTrack('no_such_chapter', 'tajrobi')).toBe(true);
    expect(chapterVisibleForTrack('g12c_derivative', 'riazi')).toBe(true);
  });
});
