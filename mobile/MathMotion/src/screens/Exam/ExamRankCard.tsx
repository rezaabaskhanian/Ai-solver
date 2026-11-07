import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../../components/common/AppText';
import { Card } from '../../components/common/Card';
import { useIsRTL } from '../../hooks/useIsRTL';
import { fetchPaperStats, submitExamResult, type PaperStats } from '../../services/api/konkurProgress';
import { localizeDigits } from '../../services/exam/scoring';
import { makeStyles, spacing, useColors } from '../../theme';

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
  // Sanjesh-style taraz; absent on old servers / small samples / no spread.
  const taraz = stats.taraz ?? null;
  const styles = useStyles();
  return (
    <Card>
      <View style={styles.inner}>
        {enough && (
          <AppText align="center" weight="medium" color={colors.textPrimary}>
            {t('exam.rank.above', { percent: localizeDigits(Math.round(stats.percentile ?? 0), isRTL) })}
          </AppText>
        )}
        {!enough && taraz === null && (
          <AppText align="center" weight="medium" color={colors.textSecondary}>
            {t('exam.rank.notEnough')}
          </AppText>
        )}
        {taraz !== null && (
          <>
            <AppText align="center" weight="bold" size="lg" color={colors.textPrimary}>
              {t('exam.rank.taraz', { taraz: localizeDigits(Math.round(taraz), isRTL) })}
            </AppText>
            {stats.mean !== undefined && (
              <AppText align="center" size="sm" color={colors.textSecondary}>
                {t('exam.rank.tarazMeta', {
                  avg: localizeDigits(Math.round(stats.mean), isRTL),
                  count: localizeDigits(stats.count, isRTL),
                })}
              </AppText>
            )}
          </>
        )}
      </View>
    </Card>
  );
}

const useStyles = makeStyles(() => StyleSheet.create({
  inner: {
    gap: spacing.xs,
  },
}));
