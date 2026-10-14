import {
  cleanExercise,
  exercisesForChapter,
  findChapter,
  groupByLesson,
  isExerciseFree,
  parseTextbookPayload,
  type TextbookExercise,
} from './index';

const base = {
  id: 'math9-p12-3',
  bookId: 'math9',
  chapterId: 'g9_sets',
  lesson: 2,
  section: 'exercise',
  page: 12,
  number: 3,
  text: ['مجموعه را بنویسید.', { math: 'A = {1, 2}' }],
  solution: ['عضوها را می‌نویسیم.'],
};

describe('cleanExercise', () => {
  it('keeps a valid exercise and its optional extras', () => {
    const ex = cleanExercise({
      ...base,
      tipIds: ['tip-a', '', 3],
      answer: ['{1, 2}'],
      free: true,
      parts: [{ label: 'الف', text: ['x'], solution: ['y'], answer: [] }],
    });
    expect(ex).not.toBeNull();
    expect(ex?.tipIds).toEqual(['tip-a']);
    expect(ex?.answer).toEqual(['{1, 2}']);
    expect(ex?.free).toBe(true);
    // An empty part answer is dropped, not kept as [].
    expect(ex?.parts?.[0].answer).toBeUndefined();
  });

  it('drops malformed exercises', () => {
    expect(cleanExercise({ ...base, page: 0 })).toBeNull();
    expect(cleanExercise({ ...base, text: [{ nope: 1 }] })).toBeNull();
    expect(cleanExercise({ ...base, text: [], parts: [] })).toBeNull();
    expect(cleanExercise({ ...base, parts: [{ label: 'الف' }] })).toBeNull();
  });

  it('falls back to «تمرین» for an unknown section', () => {
    expect(cleanExercise({ ...base, section: 'homework' })?.section).toBe('exercise');
  });
});

it('parses the payload envelope', () => {
  expect(parseTextbookPayload({ exercises: [base, { id: 'bad' }] })).toHaveLength(1);
  expect(parseTextbookPayload({ nope: [] })).toBeNull();
});

describe('chapter helpers', () => {
  const make = (patch: Partial<TextbookExercise>): TextbookExercise => ({
    ...(cleanExercise(base) as TextbookExercise),
    ...patch,
  });
  const list = [
    make({ id: 'c', page: 14, number: 1, lesson: 2 }),
    make({ id: 'a', page: 12, number: 2, lesson: 1 }),
    make({ id: 'b', page: 12, number: 1, lesson: 1, section: 'classwork' }),
    make({ id: 'x', page: 13, number: 1, lesson: undefined }),
    make({ id: 'other', chapterId: 'g9_reals' }),
  ];

  it('orders a chapter by page, section and number', () => {
    expect(exercisesForChapter(list, 'g9_sets').map(e => e.id)).toEqual(['b', 'a', 'x', 'c']);
  });

  it('groups by lesson with lesson-less ones last', () => {
    const chapter = findChapter('g9_sets')?.chapter;
    const groups = groupByLesson(exercisesForChapter(list, 'g9_sets'), chapter);
    expect(groups.map(g => g.lesson)).toEqual([1, 2, 0]);
    expect(groups[0].title).toBe(chapter?.lessons[0]);
  });

  it('opens the first lesson (and marked ones) for free', () => {
    const chapter = findChapter('g9_sets')?.chapter;
    expect(isExerciseFree(make({ lesson: 1 }), chapter)).toBe(true);
    expect(isExerciseFree(make({ lesson: 2 }), chapter)).toBe(false);
    expect(isExerciseFree(make({ lesson: 2, free: true }), chapter)).toBe(true);
  });

  it('finds a chapter with its book and number', () => {
    const loc = findChapter('g9_sets');
    expect(loc?.book.id).toBe('math9');
    expect(loc?.number).toBe(1);
    expect(findChapter('nope')).toBeUndefined();
  });
});
