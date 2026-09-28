import React from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '../common/Badge';

interface VerifiedBadgeProps {
  verified: boolean;
}

// PRD section 19: showing "Verified" tells the user the Math Engine
// (not an LLM) confirmed the answer against the original equation.
export function VerifiedBadge({ verified }: VerifiedBadgeProps) {
  const { t } = useTranslation();
  return (
    <Badge
      label={verified ? `✓ ${t('solution.verified')}` : t('solution.notVerified')}
      tone={verified ? 'success' : 'danger'}
    />
  );
}
