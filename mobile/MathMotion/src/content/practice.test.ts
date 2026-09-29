import { openPractice, PRACTICE_TYPES } from './practice';
import { TOPICS } from './topics';

describe('practice', () => {
  it('offers topic practice only for types the engine can generate', () => {
    TOPICS.filter(t => t.practiceType).forEach(t => expect(PRACTICE_TYPES).toContain(t.practiceType));
    ['limit', 'logarithm', 'sets', 'vectors'].forEach(id =>
      expect(TOPICS.find(t => t.id === id)?.practiceType).toBeTruthy(),
    );
  });

  it('sends step-checkable types to CheckSteps and the rest to ProblemInput', () => {
    const navigate = jest.fn();
    openPractice({ navigate }, 'linear_equation', '2x + 5 = 17');
    expect(navigate).toHaveBeenLastCalledWith('CheckSteps', { problem: '2x + 5 = 17' });
    openPractice({ navigate }, 'set_operation', 'A={1,2}, B={2}, A∪B');
    expect(navigate).toHaveBeenLastCalledWith('ProblemInput', { initialProblem: 'A={1,2}, B={2}, A∪B' });
  });
});
