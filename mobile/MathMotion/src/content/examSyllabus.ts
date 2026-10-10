import type { SkillId } from '../services/exam/generators';
import type { StudyTrack } from './track';

// «آمادگی برای امتحان»: each grade's math textbook chapters and the
// skills the exam can generate questions for. Chapter titles are i18n
// keys (exam.chapters.<chapter id>).
//
// Grades 7–12 match the official tables of contents (content/curriculum.ts,
// same chapter ids; for 10–12 every chapter of the math-track books, in
// book order); grade 6 is still from memory — check it against the book
// before release. A chapter with no skills shows as "coming soon"
// and can't be picked (geometry drawings, proofs... have no generator
// yet).
export type GradeId = 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface ExamChapter {
  id: string;
  skills: SkillId[];
  // Chapter number inside its book, where a grade has two books (11 and
  // 10–12: ریاضی/حسابان + آمار / گسسته + هندسه) and a running number would be wrong. The
  // title (exam.chapters.<id>) then names the book.
  number?: number;
  // Only these study tracks see the chapter; missing = every track (a
  // chapter that also exists in content/curriculum.ts follows it too).
  tracks?: StudyTrack[];
}

export interface ExamGrade {
  grade: GradeId;
  chapters: ExamChapter[];
}

export const EXAM_SYLLABUS: ExamGrade[] = [
  {
    grade: 6,
    chapters: [
      { id: 'g6_patterns', skills: ['patterns', 'primes', 'gcd', 'lcm'] },
      { id: 'g6_fractions', skills: ['fracAddSub', 'fracMulDiv'] },
      { id: 'g6_decimals', skills: ['decAddSub', 'decMul'] },
      { id: 'g6_symmetry', skills: [] },
      { id: 'g6_measurement', skills: ['unitConvert', 'areaRect'] },
      { id: 'g6_ratio', skills: ['proportion', 'percent'] },
      { id: 'g6_estimation', skills: ['rounding'] },
    ],
  },
  {
    grade: 7,
    chapters: [
      { id: 'g7_strategies', skills: [] },
      { id: 'g7_integers', skills: ['intAddSub', 'intMulDiv'] },
      // Lesson 1 of the chapter is «الگوهای عددی».
      { id: 'g7_algebra', skills: ['patterns', 'evalExpr', 'simplifyLike', 'linear'] },
      { id: 'g7_geometry', skills: [] },
      { id: 'g7_divisors', skills: ['primes', 'gcd', 'lcm'] },
      { id: 'g7_area', skills: ['areaRect', 'volumeCuboid'] },
      { id: 'g7_powers', skills: ['powers', 'sqrt'] },
      { id: 'g7_vectors', skills: ['vectorFromPoints'] },
      { id: 'g7_statistics', skills: ['mean', 'probabilityDice'] },
    ],
  },
  {
    grade: 8,
    chapters: [
      { id: 'g8_rationals', skills: ['rationalAddSub', 'intMulDiv'] },
      { id: 'g8_primes', skills: ['primes', 'gcd', 'lcm'] },
      { id: 'g8_polygons', skills: ['polygonAngles'] },
      { id: 'g8_algebra', skills: ['simplifyLike', 'linear'] },
      { id: 'g8_vectors', skills: ['vectorAdd', 'vectorFromPoints'] },
      { id: 'g8_triangle', skills: ['pythagoras'] },
      { id: 'g8_powers', skills: ['powerRules', 'sqrt'] },
      { id: 'g8_statistics', skills: ['mean', 'probabilityDice'] },
      { id: 'g8_circle', skills: [] },
    ],
  },
  {
    grade: 9,
    chapters: [
      { id: 'g9_sets', skills: ['setOps'] },
      { id: 'g9_reals', skills: ['rationalAddSub'] },
      { id: 'g9_proof', skills: [] },
      { id: 'g9_powers', skills: ['powerRules', 'powers', 'sqrt'] },
      { id: 'g9_algebraic', skills: ['expandBinomial', 'simplifyLike'] },
      { id: 'g9_lines', skills: ['slope', 'linear'] },
      { id: 'g9_rational', skills: [] },
      { id: 'g9_volume', skills: ['solidVolume'] },
    ],
  },
  {
    grade: 10,
    chapters: [
      // Lesson 2 of the chapter is «متمم یک مجموعه».
      { id: 'g10_sets', skills: ['setOps', 'setComplement'], number: 1 },
      { id: 'g10_trig', skills: [], number: 2 },
      { id: 'g10_powers', skills: ['powerRules', 'sqrt'], number: 3 },
      { id: 'g10_equations', skills: ['quadraticRoots'], number: 4 },
      { id: 'g10_function', skills: [], number: 5 },
      { id: 'g10_counting', skills: [], number: 6 },
      { id: 'g10_statistics', skills: [], number: 7 },
      { id: 'g10h_constructions', skills: [], number: 1 },
      { id: 'g10h_thales', skills: [], number: 2 },
      { id: 'g10h_polygons', skills: [], number: 3 },
      { id: 'g10h_solids', skills: [], number: 4 },
    ],
  },
  {
    grade: 11,
    chapters: [
      { id: 'g11c_algebra', skills: [], number: 1 },
      { id: 'g11c_function', skills: [], number: 2 },
      { id: 'g11c_exp_log', skills: ['logValue', 'logEquation', 'expEquation'], number: 3 },
      { id: 'g11c_trig', skills: [], number: 4 },
      { id: 'g11c_limits', skills: ['limitAlgebraic'], number: 5 },
      { id: 'g11s_logic', skills: [], number: 1 },
      { id: 'g11s_probability', skills: [], number: 2 },
      { id: 'g11s_descriptive', skills: [], number: 3 },
      { id: 'g11s_inferential', skills: [], number: 4 },
      { id: 'g11h_circle', skills: [], number: 1 },
      { id: 'g11h_transformations', skills: [], number: 2 },
      { id: 'g11h_triangle', skills: [], number: 3 },
      { id: 'g11t_analytic', skills: [], number: 1 },
      { id: 'g11t_geometry', skills: [], number: 2 },
      { id: 'g11t_function', skills: [], number: 3 },
      { id: 'g11t_trig', skills: [], number: 4 },
      { id: 'g11t_exp_log', skills: ['logValue', 'logEquation', 'expEquation'], number: 5 },
      { id: 'g11t_limits', skills: [], number: 6 },
      { id: 'g11t_statistics', skills: [], number: 7 },
    ],
  },
  {
    grade: 12,
    chapters: [
      { id: 'g12c_function', skills: [], number: 1 },
      { id: 'g12c_trig', skills: [], number: 2 },
      { id: 'g12c_limits', skills: ['limitInfinity'], number: 3 },
      { id: 'g12c_derivative', skills: [], number: 4 },
      { id: 'g12c_applications', skills: [], number: 5 },
      { id: 'g12d_numbers', skills: [], number: 1 },
      { id: 'g12d_graphs', skills: ['graphCounting'], number: 2 },
      { id: 'g12d_counting', skills: [], number: 3 },
      { id: 'g12h_matrices', skills: [], number: 1 },
      { id: 'g12h_conics', skills: [], number: 2 },
      { id: 'g12h_vectors', skills: [], number: 3 },
      { id: 'g12t_function', skills: [], number: 1 },
      { id: 'g12t_trig', skills: [], number: 2 },
      { id: 'g12t_limits', skills: [], number: 3 },
      { id: 'g12t_derivative', skills: [], number: 4 },
      { id: 'g12t_applications', skills: [], number: 5 },
      { id: 'g12t_geometry', skills: [], number: 6 },
      { id: 'g12t_probability', skills: [], number: 7 },
    ],
  },
];

export function findGrade(grade: GradeId): ExamGrade | undefined {
  return EXAM_SYLLABUS.find(g => g.grade === grade);
}
