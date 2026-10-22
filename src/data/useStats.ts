import { useQuery } from '@tanstack/react-query';

import { buildConstructorStats, buildDriverCareerStats, buildDriverSeasonStats, type StatsScope } from '@/domain/stats';

import {
  getConstructorCareerRecord,
  getConstructorSeasonQualifying,
  getConstructorSeasonResults,
  getConstructorTitles,
  getDriverCareerRecord,
  getDriverSeasonQualifying,
  getDriverSeasonResults,
  getDriverSeasonSprints,
  getDriverTitles,
} from './repository';

// Ports of StandingsViewModel's detail loaders. A failed piece fails the card rather than reading
// as zero — "Ferrari: 0 wins" would pass for fact — and because successes are cached while failures
// never are, a retry only re-requests what is still missing.

export function useDriverStats(driverId: string | undefined, scope: StatsScope) {
  return useQuery({
    queryKey: ['driverStats', driverId, scope],
    enabled: !!driverId,
    queryFn: async () => {
      const id = driverId!;
      if (scope === 'career') {
        const [record, titles] = await Promise.all([getDriverCareerRecord(id), getDriverTitles()]);
        return buildDriverCareerStats(record, titles, id);
      }
      const [results, qualifying, sprints, titles] = await Promise.all([
        getDriverSeasonResults(id),
        // Poles are best-effort for the season card, as in the app.
        getDriverSeasonQualifying(id).catch(() => []),
        getDriverSeasonSprints(id).catch(() => []),
        getDriverTitles(),
      ]);
      return buildDriverSeasonStats(results, qualifying, sprints, titles, id);
    },
  });
}

export function useConstructorStats(constructorId: string | undefined, scope: StatsScope) {
  return useQuery({
    queryKey: ['constructorStats', constructorId, scope],
    enabled: !!constructorId,
    queryFn: async () => {
      const id = constructorId!;
      const [constructorTitles, driverTitles] = await Promise.all([getConstructorTitles(), getDriverTitles()]);
      if (scope === 'career') {
        const { wins, starts } = await getConstructorCareerRecord(id);
        return buildConstructorStats({ scope, constructorId: id, wins, starts, constructorTitles, driverTitles });
      }
      const [results, qualifying] = await Promise.all([getConstructorSeasonResults(id), getConstructorSeasonQualifying(id)]);
      return buildConstructorStats({
        scope,
        constructorId: id,
        wins: results.filter((r) => r.position === '1').length,
        poles: qualifying.filter((q) => q.position === '1').length,
        constructorTitles,
        driverTitles,
      });
    },
  });
}
