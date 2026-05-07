import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/shared/Modal';
import { getActiveTerms } from '@/features/public/api';
import { queryKeys } from '@/lib/queryKeys';
import { formatTermsContent } from '@/utils/termsContentHtml';

export function TermsAgreementField({ checked, onChange, error, audience }: { checked?: boolean; onChange: (checked: boolean) => void; error?: string; audience: 'member' | 'institution' }) {
  const [open, setOpen] = useState(false);
  const termsQuery = useQuery({ queryKey: queryKeys.activeTermsAudience(audience), queryFn: async () => (await getActiveTerms(audience)).data, enabled: open });
  const formattedTermsContent = useMemo(() => formatTermsContent(termsQuery.data?.content), [termsQuery.data?.content]);

  return (
    <div className="space-y-2 rounded-md border border-[#EAECF0] bg-[#FCFCF7] p-4 text-sm dark:border-slate-800 dark:bg-slate-900/60">
      <label className="flex items-start gap-3 text-[#344054] dark:text-slate-200 dark:text-slate-200">
        <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
        <span>
          I agree to the REPRONIG{' '}
          <button type="button" className="font-semibold text-[#AF1512] underline-offset-2 hover:underline" onClick={() => setOpen(true)}>
            terms and conditions
          </button>
          <span className="ml-1 text-red-600 dark:text-red-400">*</span>.
        </span>
      </label>
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={termsQuery.data?.title ?? 'REPRONIG Terms and Conditions'}
        subtitle={termsQuery.data?.version ? `Version ${termsQuery.data.version}` : undefined}
        size={audience === 'institution' ? '2xl' : 'xl'}
      >
        {termsQuery.isLoading ? (
          <div className="text-sm leading-7 text-[#344054] dark:text-slate-200">Loading terms and conditions...</div>
        ) : (
          <div
            className="prose prose-sm max-w-none text-[#344054] dark:prose-invert prose-headings:text-[#2B2B2D] dark:text-slate-200 dark:prose-headings:text-slate-100 prose-a:text-[#AF1512] dark:prose-a:text-red-300"
            dangerouslySetInnerHTML={{ __html: formattedTermsContent }}
          />
        )}
      </Modal>
    </div>
  );
}
