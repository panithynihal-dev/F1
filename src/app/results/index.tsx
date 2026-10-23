import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';

import { Page } from '@/components/layout/Page';
import { EmptyState, ErrorState, errorMessage, PageLoading } from '@/components/ui/States';
import { getSeasonSessionTimeline } from '@/data/repository';

/** "Results" means the most recent session — the page a fan opens straight after one. */
export default function LatestResults() {
  const timeline = useQuery({ queryKey: ['timeline'], queryFn: getSeasonSessionTimeline });
  if (timeline.isPending) return <PageLoading />;
  if (timeline.isError) {
    return (
      <Page>
        <ErrorState title="The season's sessions didn't load" detail={errorMessage(timeline.error)} onRetry={() => timeline.refetch()} />
      </Page>
    );
  }
  const latest = timeline.data[timeline.data.length - 1];
  if (!latest) {
    return (
      <Page>
        <EmptyState
          title="No sessions yet"
          detail="Results appear here as the season runs, starting with the first practice session of the opening round."
        />
      </Page>
    );
  }
  return <Redirect href={`/results/${latest.session_key}`} />;
}
