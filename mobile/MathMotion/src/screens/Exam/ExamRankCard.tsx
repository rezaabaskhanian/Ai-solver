import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { useIsRTL } from '../../hooks/useIsRTL';
import { fetchPaperStats, submitExamResult, type PaperStats } from '../../services/api/konkurProgress';
import { localizeDigits } from '../../services/exam/scoring';
import { useColors } from '../../theme';

// Approximate rank after a timed full-year konkur exam: sends the result
// (the server keeps each user's best per paper) and shows how the percent
// compares with the other participants. Silent when offline.
interface Props {
  paperKey: string;
  percent: number;
  correct: number;
  wrong: number;
  blank: number;
  seconds: number;
}

// Below this many participants the comparison would mean little.
const MIN_PARTICIPANTS = 20;

export function ExamRankCard({ paperKey, percent, correct, wrong, blank, seconds }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const [stats, setStats] = useState<PaperStats | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current || correct + wrong === 0) {
      return;
    }
    sent.current = true;
    let cancelled = false;
    (async () => {
      try {
        await submitExamResult({
          paper_key: paperKey,
          percent: Math.max(-100, Math.min(100, percent)),
          correct,
          wrong,
          blank,
          seconds,
        });
        const result = await fetchPaperStats(paperKey);
        if (!cancelled) {
          setStats(result);
        }
      } catch {
        // Offline or server trouble: just no comparison this time.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paperKey, percent, correct, wrong, blank, seconds]);

  if (!stats) {
    return null;
  }
  const enough = stats.count >= MIN_PARTICIPANTS && stats.percentile !== null;
  return (
    <Card>
      <AppText align="center" weight="medium" color={enough ? colors.textPrimary : colors.textSecondary}>
        {enough
          ? t('exam.rank.above', { percent: localizeDigits(Math.round(stats.percentile ?? 0), isRTL) })
          : t('exam.rank.notEnough')}
      </AppText>
    </Card>
  );
}
