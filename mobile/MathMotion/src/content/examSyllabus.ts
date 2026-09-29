import type { SkillId } from '../services/exam/generators';

// «آمادگی برای امتحان»: each grade's math textbook chapters and the
// skills the exam can generate questions for. Chapter titles are i18n
// keys (exam.chapters.<chapter id>).
//
// NOTE: chapter lists were written from memory of the current Iranian
// textbooks — check them against the official books (chap.sch.ir) before
// release. A chapter with no skills shows as "coming soon" and can't be
// picked (geometry drawings, sets, vectors... have no generator yet).
export type GradeId = 6 | 7 | 8 | 9;

export interface ExamChapter {
  id: string;
  skills: SkillId[];
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
      { id: 'g7_algebra', skills: ['evalExpr', 'simplifyLike', 'linear'] },
      { id: 'g7_geometry', skills: [] },
      { id: 'g7_divisors', skills: ['primes', 'gcd', 'lcm'] },
      { id: 'g7_area', skills: ['areaRect', 'volumeCuboid'] },
      { id: 'g7_powers', skills: ['powers', 'sqrt'] },
      { id: 'g7_vectors', skills: [] },
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
      { id: 'g8_vectors', skills: [] },
      { id: 'g8_triangle', skills: ['pythagoras'] },
      { id: 'g8_powers', skills: ['powerRules', 'sqrt'] },
      { id: 'g8_statistics', skills: ['mean', 'probabilityDice'] },
      { id: 'g8_circle', skills: [] },
    ],
  },
  {
    grade: 9,
    chapters: [
      { id: 'g9_sets', skills: [] },
      { id: 'g9_reals', skills: ['rationalAddSub'] },
      { id: 'g9_proof', skills: [] },
      { id: 'g9_powers', skills: ['powerRules', 'powers', 'sqrt'] },
      { id: 'g9_algebraic', skills: ['expandBinomial', 'simplifyLike'] },
      { id: 'g9_lines', skills: ['slope', 'linear'] },
      { id: 'g9_rational', skills: [] },
      { id: 'g9_volume', skills: [] },
    ],
  },
];

export function findGrade(grade: GradeId): ExamGrade | undefined {
  return EXAM_SYLLABUS.find(g => g.grade === grade);
}
