import { Page, PageTitle } from '@/components/layout/Page';
import { EmptyState } from '@/components/ui/States';

// Placeholder until its phase lands.
export default function Pending() {
  return (
    <Page>
      <PageTitle title="Coming soon" />
      <EmptyState title="This page is being built" detail="It arrives in the next phase of the site." />
    </Page>
  );
}
