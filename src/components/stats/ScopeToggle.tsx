import { router } from 'expo-router';

import type { StatsScope } from '@/domain/stats';

import { SegmentedTabs } from '../ui/SegmentedTabs';

/** Season or career, kept in the URL so a shared link opens on the same numbers. */
export function ScopeToggle({ scope, careerLabel = 'Career' }: { scope: StatsScope; careerLabel?: string }) {
  return (
    <SegmentedTabs
      label="Stats scope"
      value={scope}
      onChange={(value) => router.setParams({ scope: value })}
      options={[
        { value: 'season', label: 'This season' },
        { value: 'career', label: careerLabel },
      ]}
    />
  );
}

export const parseScope = (raw?: string): StatsScope => (raw === 'career' ? 'career' : 'season');
