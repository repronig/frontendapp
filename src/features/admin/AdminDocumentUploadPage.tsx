import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { createAdminDocument, deleteAdminDocument, listAdminDocuments, type CreateAdminDocumentPayload } from '@/features/admin/api';
import { DocumentManager } from '@/components/shared/DocumentManager';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { queryKeys } from '@/lib/queryKeys';

const ADMIN_DOC_TARGETS = ['member', 'institution', 'association', 'work'] as const;

type AdminDocTargetType = (typeof ADMIN_DOC_TARGETS)[number];

function parseAttachTarget(searchParams: URLSearchParams): Pick<CreateAdminDocumentPayload, 'target_type' | 'target_id'> | null {
  const tt = searchParams.get('target_type');
  const tid = searchParams.get('target_id');
  const validType = ADMIN_DOC_TARGETS.find((value) => value === tt);
  if (!validType || tid === null || tid === '' || !/^[1-9]\d*$/.test(tid)) return null;
  return { target_type: validType, target_id: Number(tid) };
}

export function AdminDocumentUploadPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const attachTarget = useMemo(() => parseAttachTarget(searchParams), [searchParams]);

  const [typeDraft, setTypeDraft] = useState<AdminDocTargetType>('institution');
  const [idDraft, setIdDraft] = useState('');

  useEffect(() => {
    if (!attachTarget) return;
    setTypeDraft(attachTarget.target_type);
    setIdDraft(String(attachTarget.target_id));
  }, [attachTarget]);

  function applyTarget() {
    const trimmed = idDraft.trim();
    const idNum = Number(trimmed);
    if (!Number.isFinite(idNum) || idNum < 1 || !/^[1-9]\d*$/.test(trimmed)) {
      toast.error('Enter a positive integer record ID.');
      return;
    }
    setSearchParams({ target_type: typeDraft, target_id: String(idNum) });
    toast.success('Upload target set. You can add documents.');
  }

  function clearTargetFromUrl() {
    setSearchParams({});
    setIdDraft('');
    toast.info('Upload target cleared.');
  }

  return (
    <div className="space-y-6">
      <Card className="border-[#EAECF0] bg-[#FCFCFD] p-5 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#101828] dark:text-slate-100">Document attach target</p>
            <p className="max-w-xl text-sm text-[#667085] dark:text-slate-400">
              Admin uploads must attach to a member, institution, association, or work record. Choose the type and numeric ID, then apply. The URL updates so you can bookmark or share this page.
            </p>
          </div>
          {attachTarget ? (
            <Button type="button" variant="outline" className="shrink-0" onClick={clearTargetFromUrl}>
              Clear target
            </Button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex min-w-[160px] flex-col gap-1 text-sm">
            <span className="font-medium text-[#344054] dark:text-slate-200">Record type</span>
            <select
              className="h-10 rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm text-[#101828] shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={typeDraft}
              onChange={(event) => setTypeDraft(event.target.value as AdminDocTargetType)}
            >
              {ADMIN_DOC_TARGETS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-[140px] flex-col gap-1 text-sm">
            <span className="font-medium text-[#344054] dark:text-slate-200">Record ID</span>
            <Input
              inputMode="numeric"
              placeholder="e.g. 12"
              value={idDraft}
              onChange={(event) => setIdDraft(event.target.value.replace(/\D/g, '').slice(0, 12))}
              className="max-w-[200px]"
            />
          </label>

          <Button type="button" className="bg-[#AF1512] hover:bg-[#8E100D]" onClick={applyTarget}>
            Apply target
          </Button>
        </div>

        {attachTarget ? (
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[#475467] dark:text-slate-400">
            Active:&nbsp;
            <span className="text-[#101828] dark:text-slate-100">
              {attachTarget.target_type} #{attachTarget.target_id}
            </span>
          </p>
        ) : null}
      </Card>

      {!attachTarget ? (
        <Alert
          title="Uploads are disabled until a target is applied"
          description='Fill in record type and ID above, then click “Apply target”. Listing and deletion still work for all documents you can access.'
        />
      ) : null}

      <DocumentManager
        title="Documents"
        description="Internal files list and upload."
        queryKey={queryKeys.adminDocuments}
        listQuery={listAdminDocuments}
        allowUpload={attachTarget !== null}
        uploadDocument={async (values) => {
          if (!attachTarget) {
            throw new Error('Document attach target is missing.');
          }
          return createAdminDocument({
            ...attachTarget,
            category: values.category,
            title: values.title,
            document_type: values.document_type || undefined,
            visibility: values.visibility,
            description: values.description || undefined,
            file: values.file,
          });
        }}
        deleteDocument={deleteAdminDocument}
      />
    </div>
  );
}
