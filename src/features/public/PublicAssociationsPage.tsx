import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPublicAssociations } from '@/features/public/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/shared/FormField';
import { PageShell } from '@/components/shared/PageShell';
import { queryKeys } from '@/lib/queryKeys';

export function PublicAssociationsPage() {
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: [...queryKeys.publicAssociationsBrowse, search],
    queryFn: () => getPublicAssociations({ per_page: 50, search: search || undefined }),
  });

  return (
    <PageShell title="Public Associations" subtitle="Only active and enabled associations are returned by the backend.">
      <Card>
        <div className="flex gap-3">
          <FormField label="Search associations" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, code, or email" />
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {query.data?.data.map((association) => (
          <Card key={association.id}>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{association.name}</h2>
            <p className="mt-2 text-sm text-slate-600">Code: {association.code}</p>
            <p className="text-sm text-slate-600">Email: {association.contact_email || '—'}</p>
          </Card>
        ))}
      </div>
      {!query.data?.data.length ? <Card>No associations found.</Card> : null}
      <Button variant="outline" onClick={() => query.refetch()}>Refresh</Button>
    </PageShell>
  );
}
