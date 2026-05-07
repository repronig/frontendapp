import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_PAGE_SIZE, normalizeClientPageSize } from '@/constants/pagination';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/shared/DataTable';
import { FormField } from '@/components/shared/FormField';
import { Modal } from '@/components/shared/Modal';
import { PageShell } from '@/components/shared/PageShell';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  enqueueSuperWipoConnectOutbox,
  getSuperIntegrationOutboxSummary,
  listSuperIntegrationOutbox,
  listSuperIntegrations,
  requeueSuperIntegrationOutbox,
  upsertSuperIntegration,
} from '@/features/super-admin/api';
import { onMutationApiError } from '@/lib/mutationFeedback';
import { showWipoConnectOutboxUi } from '@/config/features';
import { confirmAdminSensitiveAction } from '@/features/admin/security';
import type { ExternalIntegrationResource, IntegrationOutboxEntryResource } from '@/types/domain';
import { queryKeys } from '@/lib/queryKeys';

type IntegrationForm = {
  is_enabled: boolean;
  api_base_url: string;
  realm: string;
  tenant_id: string;
  sync_path: string;
  sync_url: string;
  sync_http_method: string;
  webhook_secret: string;
  bearer_token: string;
  oauth_token_url: string;
  client_id: string;
  client_secret: string;
  oauth_scope: string;
};

function emptyForm(): IntegrationForm {
  return {
    is_enabled: false,
    api_base_url: '',
    realm: '',
    tenant_id: '',
    sync_path: '',
    sync_url: '',
    sync_http_method: 'POST',
    webhook_secret: '',
    bearer_token: '',
    oauth_token_url: '',
    client_id: '',
    client_secret: '',
    oauth_scope: '',
  };
}

function formFromRow(row: ExternalIntegrationResource): IntegrationForm {
  const c = row.config ?? {};
  return {
    is_enabled: row.is_enabled,
    api_base_url: String(c.api_base_url ?? ''),
    realm: String(c.realm ?? ''),
    tenant_id: String(c.tenant_id ?? ''),
    sync_path: String(c.sync_path ?? ''),
    sync_url: '',
    sync_http_method: String(c.sync_http_method ?? 'POST'),
    webhook_secret: '',
    bearer_token: '',
    oauth_token_url: '',
    client_id: '',
    client_secret: '',
    oauth_scope: '',
  };
}

function buildConfigFromForm(f: IntegrationForm): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  const set = (k: string, v: string) => {
    if (v.trim() !== '') config[k] = v.trim();
  };
  set('api_base_url', f.api_base_url);
  set('realm', f.realm);
  set('tenant_id', f.tenant_id);
  set('sync_path', f.sync_path);
  set('sync_url', f.sync_url);
  set('sync_http_method', f.sync_http_method);
  set('bearer_token', f.bearer_token);
  set('oauth_token_url', f.oauth_token_url);
  set('client_id', f.client_id);
  set('client_secret', f.client_secret);
  set('oauth_scope', f.oauth_scope);
  return config;
}

export function SuperIntegrationsPage() {
  const queryClient = useQueryClient();
  const [editRow, setEditRow] = useState<ExternalIntegrationResource | null>(null);
  const [form, setForm] = useState<IntegrationForm>(emptyForm());
  const [outboxPage, setOutboxPage] = useState(1);
  const [outboxPerPage, setOutboxPerPageState] = useState(DEFAULT_PAGE_SIZE);
  const setOutboxPerPage = useCallback((next: number) => {
    setOutboxPerPageState(normalizeClientPageSize(next));
    setOutboxPage(1);
  }, []);
  const [outboxStatus, setOutboxStatus] = useState('');
  const [workIdInput, setWorkIdInput] = useState('');

  const integrationsQuery = useQuery({
    queryKey: queryKeys.superIntegrations,
    queryFn: async () => (await listSuperIntegrations({ per_page: 50 })).data,
  });

  const outboxQuery = useQuery({
    queryKey: [...queryKeys.superIntegrationOutbox, outboxPage, outboxPerPage, outboxStatus],
    queryFn: () =>
      listSuperIntegrationOutbox({
        page: outboxPage,
        per_page: outboxPerPage,
        ...(outboxStatus ? { status: outboxStatus } : {}),
      }),
    enabled: showWipoConnectOutboxUi,
  });

  const outboxSummaryQuery = useQuery({
    queryKey: queryKeys.superIntegrationOutboxSummary,
    queryFn: async () => (await getSuperIntegrationOutboxSummary()).data,
    staleTime: 30_000,
    enabled: showWipoConnectOutboxUi,
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!editRow) return;
      const payload: Parameters<typeof upsertSuperIntegration>[2] = {
        is_enabled: form.is_enabled,
        config: buildConfigFromForm(form),
      };
      if (form.webhook_secret.trim() !== '') {
        payload.webhook_secret = form.webhook_secret.trim();
      }
      return upsertSuperIntegration(String(editRow.provider), String(editRow.environment), payload);
    },
    onSuccess: () => {
      toast.success('Integration saved.');
      setEditRow(null);
      setForm(emptyForm());
      void queryClient.invalidateQueries({ queryKey: queryKeys.superIntegrations });
    },
    onError: onMutationApiError(),
  });

  const requeueMutation = useMutation({
    mutationFn: (id: number) => requeueSuperIntegrationOutbox(id),
    onSuccess: () => {
      toast.success('Outbox entry requeued.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.superIntegrationOutbox });
    },
    onError: onMutationApiError(),
  });

  const enqueueMutation = useMutation({
    mutationFn: (workId: number) => enqueueSuperWipoConnectOutbox(workId, {}),
    onSuccess: () => {
      toast.success('Work queued for WIPO Connect.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.superIntegrationOutbox });
    },
    onError: onMutationApiError(),
  });

  function openEdit(row: ExternalIntegrationResource) {
    setEditRow(row);
    setForm(formFromRow(row));
  }

  async function handleRequeue(id: number) {
    const ok = await confirmAdminSensitiveAction({
      title: 'Requeue failed delivery',
      description: 'Enter your admin PIN to requeue this outbox entry for another delivery attempt.',
    });
    if (!ok) return;
    requeueMutation.mutate(id);
  }

  async function handleEnqueue() {
    const id = Number.parseInt(workIdInput, 10);
    if (!Number.isFinite(id) || id < 1) {
      toast.error('Enter a valid work ID.');
      return;
    }
    const ok = await confirmAdminSensitiveAction({
      title: 'Queue WIPO Connect sync',
      description: 'Enter your admin PIN to enqueue a WIPO Connect outbox row for this work.',
    });
    if (!ok) return;
    enqueueMutation.mutate(id);
  }

  const outboxMeta = outboxQuery.data?.meta;
  const outboxRows = outboxQuery.data?.data ?? [];

  const integrationColumns = useMemo(
    () => [
      {
        key: 'provider',
        header: 'Provider',
        render: (row: ExternalIntegrationResource) => <span className="font-mono text-sm">{row.provider}</span>,
      },
      {
        key: 'environment',
        header: 'Environment',
        render: (row: ExternalIntegrationResource) => <span className="text-sm capitalize">{row.environment}</span>,
      },
      {
        key: 'enabled',
        header: 'Enabled',
        render: (row: ExternalIntegrationResource) => (
          <StatusBadge value={row.is_enabled ? 'active' : 'inactive'} label={row.is_enabled ? 'Yes' : 'No'} />
        ),
      },
      {
        key: 'api',
        header: 'API base',
        render: (row: ExternalIntegrationResource) => <span className="text-sm text-slate-600">{row.config?.api_base_url ?? '—'}</span>,
      },
      {
        key: 'actions',
        header: '',
        render: (row: ExternalIntegrationResource) => (
          <Button type="button" variant="outline" size="sm" onClick={() => openEdit(row)}>
            Edit
          </Button>
        ),
      },
    ],
    [],
  );

  const outboxColumns = useMemo(
    () => [
      { key: 'id', header: 'ID', render: (row: IntegrationOutboxEntryResource) => <span className="font-mono text-sm">{row.id}</span> },
      { key: 'operation', header: 'Operation', render: (row: IntegrationOutboxEntryResource) => <span className="text-sm">{row.operation}</span> },
      {
        key: 'status',
        header: 'Status',
        render: (row: IntegrationOutboxEntryResource) => <StatusBadge value={row.status} />,
      },
      { key: 'attempts', header: 'Attempts', render: (row: IntegrationOutboxEntryResource) => <span className="text-sm">{row.attempts}</span> },
      {
        key: 'error',
        header: 'Last error',
        className: 'max-w-xs',
        render: (row: IntegrationOutboxEntryResource) => (
          <span className="line-clamp-2 text-xs text-slate-600" title={row.last_error ?? undefined}>
            {row.last_error ?? '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        render: (row: IntegrationOutboxEntryResource) =>
          row.status === 'failed' ? (
            <Button type="button" variant="outline" size="sm" onClick={() => void handleRequeue(row.id)} disabled={requeueMutation.isPending}>
              Requeue
            </Button>
          ) : null,
      },
    ],
    [requeueMutation.isPending],
  );

  return (
    <PageShell
      title="Integrations"
      subtitle={
        showWipoConnectOutboxUi
          ? 'Configure WIPO Connect and monitor the integration outbox. Sensitive actions require your admin PIN.'
          : 'Configure WIPO Connect credentials. Outbox monitoring and enqueue-by-work are hidden unless enabled via VITE_SHOW_WIPO_CONNECT_OUTBOX_UI. Sensitive actions require your admin PIN.'
      }
    >
      {showWipoConnectOutboxUi && outboxSummaryQuery.data ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Outbox health (all providers)</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Counts refresh automatically; failed uses the integration health window from API config.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatCard label="Pending" value={outboxSummaryQuery.data.pending_total} hint="Waiting to send" />
            <StatCard label="Processing" value={outboxSummaryQuery.data.processing_total} hint="In flight" />
            <StatCard label="Failed (window)" value={outboxSummaryQuery.data.failed_last_24h} hint="Recent failures" />
          </div>
        </div>
      ) : null}

      <SectionHeader
        title="External integrations"
        description="Provider config and secrets."
        className="mb-4"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => openEdit({ id: 0, provider: 'wipo_connect', environment: 'sandbox', is_enabled: false, config: {}, created_at: null, updated_at: null })}>
              Configure sandbox
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => openEdit({ id: 0, provider: 'wipo_connect', environment: 'production', is_enabled: false, config: {}, created_at: null, updated_at: null })}>
              Configure production
            </Button>
          </div>
        }
      />
      <Card className="overflow-hidden border-slate-200 p-0 dark:border-slate-800">
        <DataTable
          columns={integrationColumns}
          rows={integrationsQuery.data ?? []}
          isLoading={integrationsQuery.isLoading}
          getRowKey={(row) => `${row.provider}-${row.environment}`}
          emptyTitle="No integrations yet"
          emptyDescription="Save WIPO Connect sandbox or production settings using Edit on a row returned by the API, or create rows via the API first."
        />
      </Card>

      {showWipoConnectOutboxUi ? (
        <>
          <SectionHeader title="Enqueue work (WIPO Connect)" description="Manual outbox enqueue." />
          <Card className="flex flex-wrap items-end gap-4 border-slate-200 p-4 dark:border-slate-800">
            <FormField label="Work ID" value={workIdInput} onChange={(e) => setWorkIdInput(e.target.value)} helperText="Numeric ID from the works table." />
            <Button type="button" onClick={() => void handleEnqueue()} disabled={enqueueMutation.isPending}>
              Queue sync
            </Button>
          </Card>

          <SectionHeader title="Outbox" description="Inspect and requeue rows." />
          <Card className="mb-4 flex flex-wrap items-center gap-3 border-slate-200 p-4 dark:border-slate-800">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Status
              <select
                value={outboxStatus}
                onChange={(e) => {
                  setOutboxStatus(e.target.value);
                  setOutboxPage(1);
                }}
                className="ml-2 h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">All</option>
                <option value="pending">pending</option>
                <option value="processing">processing</option>
                <option value="succeeded">succeeded</option>
                <option value="failed">failed</option>
              </select>
            </label>
          </Card>
          <Card className="overflow-hidden border-slate-200 p-0 dark:border-slate-800">
            <DataTable
              columns={outboxColumns}
              rows={outboxRows}
              isLoading={outboxQuery.isLoading}
              getRowKey={(row) => row.id}
              emptyTitle="No outbox rows"
              emptyDescription="Enqueue a work or trigger processing from the API."
            />
          </Card>
          {/* Outbox uses its own `outboxPerPage` (not the main table hook) because it calls a different API with separate meta. */}
          <PaginationBar meta={outboxMeta} onPageChange={setOutboxPage} subject="outbox rows" perPage={outboxPerPage} onPerPageChange={setOutboxPerPage} />
        </>
      ) : null}

      <Modal
        open={Boolean(editRow)}
        onClose={() => {
          setEditRow(null);
          setForm(emptyForm());
        }}
        title={editRow ? `Edit ${editRow.provider} (${editRow.environment})` : 'Edit integration'}
        size="lg"
      >
        {editRow ? (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={form.is_enabled} onChange={(e) => setForm((f) => ({ ...f, is_enabled: e.target.checked }))} />
              Enabled
            </label>
            <FormField label="API base URL" value={form.api_base_url} onChange={(e) => setForm((f) => ({ ...f, api_base_url: e.target.value }))} />
            <FormField label="Sync URL (optional, absolute)" value={form.sync_url} onChange={(e) => setForm((f) => ({ ...f, sync_url: e.target.value }))} />
            <FormField label="Sync path (if no sync URL)" value={form.sync_path} onChange={(e) => setForm((f) => ({ ...f, sync_path: e.target.value }))} helperText="Must start with / when using API base URL." />
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              HTTP method
              <select
                value={form.sync_http_method}
                onChange={(e) => setForm((f) => ({ ...f, sync_http_method: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-2 dark:border-slate-700 dark:bg-slate-950"
              >
                {['POST', 'PUT', 'PATCH', 'GET'].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <FormField label="Realm" value={form.realm} onChange={(e) => setForm((f) => ({ ...f, realm: e.target.value }))} />
            <FormField label="Tenant ID" value={form.tenant_id} onChange={(e) => setForm((f) => ({ ...f, tenant_id: e.target.value }))} />
            <FormField label="Webhook secret (optional, inbound verification)" type="password" value={form.webhook_secret} onChange={(e) => setForm((f) => ({ ...f, webhook_secret: e.target.value }))} />
            <FormField label="Bearer token (outbound)" type="password" value={form.bearer_token} onChange={(e) => setForm((f) => ({ ...f, bearer_token: e.target.value }))} />
            <FormField label="OAuth token URL" value={form.oauth_token_url} onChange={(e) => setForm((f) => ({ ...f, oauth_token_url: e.target.value }))} />
            <FormField label="OAuth client ID" value={form.client_id} onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))} />
            <FormField label="OAuth client secret" type="password" value={form.client_secret} onChange={(e) => setForm((f) => ({ ...f, client_secret: e.target.value }))} />
            <FormField label="OAuth scope" value={form.oauth_scope} onChange={(e) => setForm((f) => ({ ...f, oauth_scope: e.target.value }))} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditRow(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => upsertMutation.mutate()} disabled={upsertMutation.isPending}>
                Save
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </PageShell>
  );
}
