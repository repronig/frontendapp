import { DetailGrid } from '@/components/shared/DetailGrid';
import { FileCard } from '@/components/shared/FileCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { MemberApplicationResource } from '@/types/domain';
import { formatDate, formatFileSize } from '@/utils/format';

export function AssociationApplicationDetail({
  application,
  children,
}: {
  application: MemberApplicationResource;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[18px] font-semibold text-[#182230]">{application.user?.name ?? 'Application detail'}</h3>
          <p className="mt-1 text-sm text-[#6B788E] dark:text-slate-300">{application.user?.email ?? 'No email available'}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={application.application_status} />
          {application.submission_stage ? <StatusBadge value={application.submission_stage} /> : null}
        </div>
      </div>

      <DetailGrid
        items={[
          { label: 'Applicant type', value: application.applicant_type.replace(/_/g, ' ') },
          { label: 'Association', value: application.association?.name ?? '—' },
          { label: 'Nationality', value: application.nationality ?? '—' },
          { label: 'Country of residence', value: application.country_of_residence ?? '—' },
          { label: 'Diaspora', value: application.is_diaspora ? 'Yes' : 'No' },
          { label: 'Member ID (provided by applicant)', value: application.member_provided_id?.trim() ? application.member_provided_id : '—' },
          { label: 'Submitted', value: formatDate(application.submitted_at) },
        ]}
      />

      <div className="space-y-3">
        <h3 className="text-[16px] font-semibold text-[#182230] dark:text-slate-100">Member bank details</h3>
        <p className="text-sm text-[#6B788E] dark:text-slate-400">
          Account information supplied by the applicant for royalty or payout purposes.
        </p>
        <DetailGrid
          items={[
            { label: 'Bank name', value: application.bank_name ?? '—' },
            { label: 'Account number', value: application.bank_account_number ?? '—' },
            { label: 'Account owner name', value: application.bank_account_owner_name ?? '—' },
          ]}
        />
      </div>

      {application.notes ? (
        <div className="rounded-md border border-[#EAECF0] dark:border-slate-800 bg-[#FCFCF7] dark:bg-slate-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085] dark:text-slate-300">Notes</p>
          <p className="mt-3 text-sm leading-7 text-[#475467] dark:text-slate-300">{application.notes}</p>
        </div>
      ) : null}

      <div className="space-y-3">
        <h3 className="text-[16px] font-semibold text-[#182230] dark:text-slate-100">Submitted documents</h3>
        <p className="text-sm text-[#6B788E] dark:text-slate-400">
          Preview documents in the portal. Downloads are not available for association review.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {(application.documents ?? []).length ? (
            (application.documents ?? []).map((document) => (
              <FileCard
                key={document.id}
                title={document.file_name ?? document.document_type ?? 'Application document'}
                subtitle={`${document.document_type ?? 'Document'} · ${formatFileSize(document.file_size)} · ${formatDate(document.created_at)}`}
                fileUrl={document.file_url}
                viewOnly
              />
            ))
          ) : (
            <div className="rounded-md border border-dashed border-[#D0D5DD] bg-[#FCFCF7] dark:bg-slate-900 px-4 py-6 text-sm text-[#6B788E] dark:text-slate-300">
              No submitted documents available.
            </div>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
