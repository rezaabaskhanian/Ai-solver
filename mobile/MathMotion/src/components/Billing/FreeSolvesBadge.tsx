import React from 'react';
import { useTranslation } from 'react-i18next';

import { useEntitlementStore } from '../../store/useEntitlementStore';
import { Badge } from '../common/Badge';

// Shown on Home and ProblemInput so the free-tier quota (backend
// problemservice.Solve's lifetime cap) is visible before it's hit, not
// just discovered via a paywall.
export function FreeSolvesBadge() {
  const { t } = useTranslation();
  const { isPremium, freeSolvesUsed, freeSolvesLimit, loading } = useEntitlementStore();

  if (loading) {
    return null;
  }

  if (isPremium) {
    return <Badge label={`✓ ${t('billing.premiumActive')}`} tone="success" />;
  }

  const remaining = Math.max(freeSolvesLimit - freeSolvesUsed, 0);
  return (
    <Badge
      label={t('billing.freeSolvesBadge', { remaining, limit: freeSolvesLimit })}
      tone={remaining === 0 ? 'danger' : 'neutral'}
    />
  );
}
