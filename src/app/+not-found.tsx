import Head from 'expo-router/head';

import { Page, PageTitle } from '@/components/layout/Page';
import { PrimaryButton } from '@/components/ui/Buttons';
import { EmptyState } from '@/components/ui/States';

export default function NotFound() {
  return (
    <Page>
      <Head>
        <title>Page not found · TrackiMetrix</title>
      </Head>
      <PageTitle title="Off the track" />
      <EmptyState title="There's no page at this address" detail="The link may be old, or the session it pointed to may have moved." />
      <PrimaryButton href="/">Go to the home page</PrimaryButton>
    </Page>
  );
}
