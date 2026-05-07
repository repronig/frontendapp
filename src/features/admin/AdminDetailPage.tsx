import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileUp } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ResourceInspector } from '@/components/shared/ResourceInspector';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { getAdminAuditLog, getAdminInstitution, getAdminLicence, getAdminMember, getAdminMemberApplication, getAdminPayment, getAdminUsageDeclaration } from '@/features/admin/api';
import { queryKeys } from '@/lib/queryKeys';

const fetchers = {
  'member-applications': getAdminMemberApplication,
  members: getAdminMember,
  institutions: getAdminInstitution,
  licences: getAdminLicence,
  payments: getAdminPayment,
  'usage-declarations': getAdminUsageDeclaration,
  'audit-logs': getAdminAuditLog,
} as const;

function documentUploadHref(resource: keyof typeof fetchers, id: number): string | null {
  if (!Number.isFinite(id) || id < 1) return null;
  if (resource === 'members') return `/admin/document-upload?target_type=member&target_id=${id}`;
  if (resource === 'institutions') return `/admin/document-upload?target_type=institution&target_id=${id}`;
  return null;
}

export function AdminDetailPage({ resource }: { resource: keyof typeof fetchers }) {
  const params = useParams();
  const id = Number(params.id);
  const query = useQuery({ queryKey: queryKeys.adminDetail(resource, id), queryFn: async () => fetchers[resource](id), enabled: Number.isFinite(id) && id > 0 });
  const title = useMemo(() => resource.replaceAll('-', ' '), [resource]);
  const uploadHref = documentUploadHref(resource, id);

  return <div className="space-y-6">
    <SectionHeader
      title={`Admin ${title} detail`}
      description="Single-record view."
      actions={uploadHref ? (
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to={uploadHref} className="inline-flex items-center gap-2">
            <FileUp className="h-4 w-4 shrink-0" aria-hidden />
            Documents
          </Link>
        </Button>
      ) : null}
    />
    {query.data?.data ? <ResourceInspector title={title} data={query.data.data} /> : <Alert title="Unable to load resource" description="Check the selected ID or confirm you have access to this admin resource." />}
  </div>;
}
