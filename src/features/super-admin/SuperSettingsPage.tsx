import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { LucideIcon } from 'lucide-react';
import { CreditCard, Languages, LayoutGrid, Mail, Shield, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/shared/FormField';
import { FormSelectField } from '@/components/shared/FormSelectField';
import { PinInput } from '@/components/shared/PinInput';
import { cn } from '@/utils/cn';
import { createSuperLanguage, disableSuperLanguage, getSuperSettings, listSuperLanguages, updateSuperAdminPin, updateSuperLanguage, updateSuperSettings } from '@/features/super-admin/api';
import { onMutationApiError } from '@/lib/mutationFeedback';
import type { SettingsPayload } from '@/types/domain';
import { queryKeys } from '@/lib/queryKeys';

type AnyRecord = Record<string, any>;

type SettingsFormState = {
  app: {
    name: string;
    env: string;
    debug: boolean;
    timezone: string;
  };
  membership: {
    open_registration: boolean;
    require_association_selection: boolean;
    require_kyc: boolean;
    require_proof_of_address: boolean;
    accepted_id_types: string;
  };
  licensing: {
    allow_licence_application: boolean;
    blanket_annual_licensing: boolean;
    require_usage_declaration: boolean;
    default_currency: string;
    paystack_enabled: boolean;
    flutterwave_enabled: boolean;
    default_online_gateway: 'paystack' | 'flutterwave' | null;
    offline_payment_enabled: boolean;
    repronig_bank: {
      account_name: string;
      bank_name: string;
      account_number: string;
      reference_note: string;
    };
    institution_licensing_terms: {
      version: string;
      title: string;
      body: string;
    };
  };
  documents: {
    allowed_extensions: string;
    max_upload_size_mb: string;
    private_storage: boolean;
  };
  notifications: {
    email_enabled: boolean;
    send_application_status_updates: boolean;
    send_payment_updates: boolean;
    send_usage_declaration_reminders: boolean;
  };
  security: {
    password_min_length: string;
    force_https: boolean;
    audit_logging_enabled: boolean;
    otp_email_enabled: boolean;
    otp_sms_enabled: boolean;
  };
};

function toFormState(settings?: SettingsPayload): SettingsFormState {
  const app = (settings?.app ?? {}) as AnyRecord;
  const membership = (settings?.membership ?? {}) as AnyRecord;
  const licensing = (settings?.licensing ?? {}) as AnyRecord;
  const documents = (settings?.documents ?? {}) as AnyRecord;
  const notifications = (settings?.notifications ?? {}) as AnyRecord;
  const security = (settings?.security ?? {}) as AnyRecord;

  return {
    app: {
      name: app.name ?? 'REPRONIG',
      env: app.env ?? '',
      debug: Boolean(app.debug),
      timezone: app.timezone ?? 'Africa/Lagos',
    },
    membership: {
      open_registration: Boolean(membership.open_registration),
      require_association_selection: Boolean(membership.require_association_selection),
      require_kyc: Boolean(membership.require_kyc),
      require_proof_of_address: Boolean(membership.require_proof_of_address),
      accepted_id_types: Array.isArray(membership.accepted_id_types) ? membership.accepted_id_types.join(', ') : '',
    },
    licensing: (() => {
      const bank = (licensing.repronig_bank ?? {}) as AnyRecord;
      const terms = (licensing.institution_licensing_terms ?? {}) as AnyRecord;
      const paystackOn = licensing.paystack_enabled !== false;
      const flutterOn = licensing.flutterwave_enabled !== false;
      let defaultGw: 'paystack' | 'flutterwave' | null = null;
      if (paystackOn || flutterOn) {
        defaultGw = licensing.default_online_gateway === 'flutterwave' ? 'flutterwave' : 'paystack';
        if (defaultGw === 'paystack' && ! paystackOn && flutterOn) {
          defaultGw = 'flutterwave';
        }
        if (defaultGw === 'flutterwave' && ! flutterOn && paystackOn) {
          defaultGw = 'paystack';
        }
      }
      return {
        allow_licence_application: Boolean(licensing.allow_licence_application),
        blanket_annual_licensing: Boolean(licensing.blanket_annual_licensing),
        require_usage_declaration: Boolean(licensing.require_usage_declaration),
        default_currency: licensing.default_currency ?? 'NGN',
        paystack_enabled: paystackOn,
        flutterwave_enabled: flutterOn,
        default_online_gateway: defaultGw,
        offline_payment_enabled: licensing.offline_payment_enabled !== false,
        repronig_bank: {
          account_name: String(bank.account_name ?? ''),
          bank_name: String(bank.bank_name ?? ''),
          account_number: String(bank.account_number ?? ''),
          reference_note: String(bank.reference_note ?? ''),
        },
        institution_licensing_terms: {
          version: String(terms.version ?? '1.0'),
          title: String(terms.title ?? ''),
          body: String(terms.body ?? ''),
        },
      };
    })(),
    documents: {
      allowed_extensions: Array.isArray(documents.allowed_extensions) ? documents.allowed_extensions.join(', ') : '',
      max_upload_size_mb: String(documents.max_upload_size_mb ?? 10),
      private_storage: Boolean(documents.private_storage),
    },
    notifications: {
      email_enabled: Boolean(notifications.email_enabled),
      send_application_status_updates: Boolean(notifications.send_application_status_updates),
      send_payment_updates: Boolean(notifications.send_payment_updates),
      send_usage_declaration_reminders: Boolean(notifications.send_usage_declaration_reminders),
    },
    security: {
      password_min_length: String(security.password_min_length ?? 8),
      force_https: Boolean(security.force_https),
      audit_logging_enabled: Boolean(security.audit_logging_enabled),
      otp_email_enabled: security.otp_email_enabled !== false,
      otp_sms_enabled: Boolean(security.otp_sms_enabled),
    },
  };
}

function parseList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function ToggleRow({ label, checked, onChange, helpText }: { label: string; checked: boolean; onChange: (checked: boolean) => void; helpText?: string }) {
  return (
    <label className="group flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm transition-colors hover:border-[#6A1025]/20 hover:bg-muted/40 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-rose-900/40 dark:hover:bg-slate-900/80">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {helpText ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{helpText}</p> : null}
      </div>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 rounded border-input text-[#6A1025] accent-[#6A1025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6A1025]/40 dark:accent-rose-400"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function SettingsPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/90 bg-gradient-to-b from-card to-secondary/50 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:to-slate-900/70',
        className,
      )}
    >
      <div className="h-1 w-full bg-gradient-to-r from-[#6A1025] via-[#AF1512] to-[#6A1025] opacity-[0.92]" aria-hidden />
      <div className="space-y-4 p-6">{children}</div>
    </div>
  );
}

function PanelHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-border/70 pb-4 dark:border-slate-800/80">
      <h3 className="font-heading text-base font-semibold tracking-tight text-foreground">{title}</h3>
      {description ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function Subsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 border-t border-dashed border-border/80 pt-6 first:border-t-0 first:pt-4 dark:border-slate-800">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6A1025] dark:text-rose-300/90">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SettingsGroup({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#6A1025]/10 text-[#6A1025] shadow-sm dark:bg-rose-950/40 dark:text-rose-200">
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground md:text-[22px]">{title}</h2>
          {description ? <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-[15px]">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function SuperSettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: queryKeys.superSettings, queryFn: async () => (await getSuperSettings()).data });
  const languagesQuery = useQuery({ queryKey: queryKeys.superLanguages, queryFn: async () => (await listSuperLanguages()).data });
  const [form, setForm] = useState<SettingsFormState>(toFormState());
  const defaultGatewaySelectOptions = useMemo(() => {
    const options: { label: string; value: 'paystack' | 'flutterwave' }[] = [];
    if (form.licensing.paystack_enabled) {
      options.push({ label: 'Paystack', value: 'paystack' });
    }
    if (form.licensing.flutterwave_enabled) {
      options.push({ label: 'Flutterwave', value: 'flutterwave' });
    }
    return options;
  }, [form.licensing.paystack_enabled, form.licensing.flutterwave_enabled]);
  const [languageForm, setLanguageForm] = useState({ name: '', code: '', sort_order: '0' });
  const [adminPinForm, setAdminPinForm] = useState({ admin_pin: '', admin_pin_confirmation: '' });

  useEffect(() => {
    if (!settingsQuery.data) return;
    setForm(toFormState(settingsQuery.data));
  }, [settingsQuery.data]);


  const createLanguageMutation = useMutation({
    mutationFn: async () => createSuperLanguage({
      name: languageForm.name.trim(),
      code: languageForm.code.trim().toLowerCase(),
      is_active: true,
      sort_order: Number(languageForm.sort_order || 0),
    }),
    onSuccess: (response) => {
      toast.success(response.message);
      setLanguageForm({ name: '', code: '', sort_order: '0' });
      queryClient.invalidateQueries({ queryKey: queryKeys.superLanguages });
    },
    onError: onMutationApiError(),
  });

  const toggleLanguageMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => updateSuperLanguage(id, { is_active }),
    onSuccess: (response) => {
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: queryKeys.superLanguages });
    },
    onError: onMutationApiError(),
  });

  const disableLanguageMutation = useMutation({
    mutationFn: async (id: number) => disableSuperLanguage(id),
    onSuccess: (response) => {
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: queryKeys.superLanguages });
    },
    onError: onMutationApiError(),
  });

  const updateAdminPinMutation = useMutation({
    mutationFn: async () => updateSuperAdminPin({
      admin_pin: adminPinForm.admin_pin,
      admin_pin_confirmation: adminPinForm.admin_pin_confirmation,
    }),
    onSuccess: (response) => {
      toast.success(response.message);
      setAdminPinForm({ admin_pin: '', admin_pin_confirmation: '' });
    },
    onError: onMutationApiError(),
  });

  const updateMutation = useMutation({
    mutationFn: async () => updateSuperSettings({
      app: {
        name: form.app.name,
        env: form.app.env,
        debug: form.app.debug,
        timezone: form.app.timezone,
      },
      membership: {
        open_registration: form.membership.open_registration,
        require_association_selection: form.membership.require_association_selection,
        require_kyc: form.membership.require_kyc,
        require_proof_of_address: form.membership.require_proof_of_address,
        accepted_id_types: parseList(form.membership.accepted_id_types),
      },
      licensing: {
        allow_licence_application: form.licensing.allow_licence_application,
        blanket_annual_licensing: form.licensing.blanket_annual_licensing,
        require_usage_declaration: form.licensing.require_usage_declaration,
        default_currency: form.licensing.default_currency,
        paystack_enabled: form.licensing.paystack_enabled,
        flutterwave_enabled: form.licensing.flutterwave_enabled,
        default_online_gateway: form.licensing.paystack_enabled || form.licensing.flutterwave_enabled ? form.licensing.default_online_gateway : null,
        offline_payment_enabled: form.licensing.offline_payment_enabled,
        repronig_bank: { ...form.licensing.repronig_bank },
        institution_licensing_terms: { ...form.licensing.institution_licensing_terms },
      },
      documents: {
        allowed_extensions: parseList(form.documents.allowed_extensions),
        max_upload_size_mb: Number(form.documents.max_upload_size_mb || 0),
        private_storage: form.documents.private_storage,
      },
      notifications: {
        email_enabled: form.notifications.email_enabled,
        send_application_status_updates: form.notifications.send_application_status_updates,
        send_payment_updates: form.notifications.send_payment_updates,
        send_usage_declaration_reminders: form.notifications.send_usage_declaration_reminders,
      },
      security: {
        password_min_length: Number(form.security.password_min_length || 0),
        force_https: form.security.force_https,
        audit_logging_enabled: form.security.audit_logging_enabled,
        otp_email_enabled: form.security.otp_email_enabled,
        otp_sms_enabled: form.security.otp_sms_enabled,
      },
    }),
    onSuccess: (response) => {
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: queryKeys.superSettings });
    },
    onError: onMutationApiError(),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-12 pb-28">
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-[#6A1025]/[0.06] p-8 shadow-sm dark:from-slate-950 dark:via-slate-950 dark:to-rose-950/20 md:p-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#6A1025]/[0.08] blur-3xl dark:bg-rose-500/10" aria-hidden />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#6A1025] text-primary-foreground shadow-md dark:bg-[#6A1025] dark:shadow-lg dark:shadow-black/20">
            <SlidersHorizontal className="h-7 w-7" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6A1025] dark:text-rose-300">Super admin</p>
            <h1 className="font-heading mt-2 text-3xl font-bold tracking-tight text-foreground md:text-[34px]">Platform settings</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              Global defaults for REPRONIG: app identity, membership, licensing, uploads, notifications, and security. Save your edits with the action bar at the bottom; the admin PIN is saved on its own.
            </p>
          </div>
        </div>
      </div>

      <SettingsGroup
        title="Core platform"
        description="Application identity and how new members enter the system."
        icon={LayoutGrid}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <SettingsPanel>
            <PanelHeading title="Application" description="Name, environment, and timezone used across the stack." />
            <FormField label="Application name" requiredIndicator value={form.app.name} onChange={(event) => setForm((current) => ({ ...current, app: { ...current.app, name: event.target.value } }))} />
            <FormField label="Environment" requiredIndicator value={form.app.env} onChange={(event) => setForm((current) => ({ ...current, app: { ...current.app, env: event.target.value } }))} />
            <FormField label="Timezone" requiredIndicator value={form.app.timezone} onChange={(event) => setForm((current) => ({ ...current, app: { ...current.app, timezone: event.target.value } }))} />
            <ToggleRow label="Debug mode" helpText="Expose debug mode state in stored platform settings." checked={form.app.debug} onChange={(checked) => setForm((current) => ({ ...current, app: { ...current.app, debug: checked } }))} />
          </SettingsPanel>
          <SettingsPanel>
            <PanelHeading title="Membership" description="Registration gates and accepted proof types." />
            <FormField label="Accepted ID types" value={form.membership.accepted_id_types} onChange={(event) => setForm((current) => ({ ...current, membership: { ...current.membership, accepted_id_types: event.target.value } }))} helperText="Comma separated, e.g. proof_of_id, proof_of_address" />
            <ToggleRow label="Open registration" checked={form.membership.open_registration} onChange={(checked) => setForm((current) => ({ ...current, membership: { ...current.membership, open_registration: checked } }))} />
            <ToggleRow label="Require association selection" checked={form.membership.require_association_selection} onChange={(checked) => setForm((current) => ({ ...current, membership: { ...current.membership, require_association_selection: checked } }))} />
            <ToggleRow label="Require KYC" checked={form.membership.require_kyc} onChange={(checked) => setForm((current) => ({ ...current, membership: { ...current.membership, require_kyc: checked } }))} />
            <ToggleRow label="Require proof of address" checked={form.membership.require_proof_of_address} onChange={(checked) => setForm((current) => ({ ...current, membership: { ...current.membership, require_proof_of_address: checked } }))} />
          </SettingsPanel>
        </div>
      </SettingsGroup>

      <SettingsGroup
        title="Licensing & institutional files"
        description="Payment rails, legal copy institutions acknowledge, upload rules, and bank details for offline settlement."
        icon={CreditCard}
      >
        <div className="grid gap-6 xl:grid-cols-12">
          <SettingsPanel className="xl:col-span-7">
            <PanelHeading title="Licensing" description="Gateways, offline policy, first-login terms, and catalogue rules." />
            <Subsection title="Online payments">
              <FormField label="Default currency" requiredIndicator value={form.licensing.default_currency} onChange={(event) => setForm((current) => ({ ...current, licensing: { ...current.licensing, default_currency: event.target.value } }))} />
              <ToggleRow
                label="Paystack enabled"
                helpText="When off, institutions cannot choose Paystack for invoice or licence checkout."
                checked={form.licensing.paystack_enabled}
                onChange={(checked) =>
                  setForm((current) => {
                    const licensing = { ...current.licensing, paystack_enabled: checked };
                    if (! checked) {
                      if (licensing.default_online_gateway === 'paystack') {
                        licensing.default_online_gateway = licensing.flutterwave_enabled ? 'flutterwave' : null;
                      }
                      if (! licensing.flutterwave_enabled) {
                        licensing.default_online_gateway = null;
                      }
                    } else if (! licensing.flutterwave_enabled) {
                      licensing.default_online_gateway = 'paystack';
                    } else if (licensing.default_online_gateway === null) {
                      licensing.default_online_gateway = 'paystack';
                    }
                    return { ...current, licensing };
                  })
                }
              />
              <ToggleRow
                label="Flutterwave enabled"
                helpText="When off, institutions cannot choose Flutterwave for invoice or licence checkout."
                checked={form.licensing.flutterwave_enabled}
                onChange={(checked) =>
                  setForm((current) => {
                    const licensing = { ...current.licensing, flutterwave_enabled: checked };
                    if (! checked) {
                      if (licensing.default_online_gateway === 'flutterwave') {
                        licensing.default_online_gateway = licensing.paystack_enabled ? 'paystack' : null;
                      }
                      if (! licensing.paystack_enabled) {
                        licensing.default_online_gateway = null;
                      }
                    } else if (! licensing.paystack_enabled) {
                      licensing.default_online_gateway = 'flutterwave';
                    } else if (licensing.default_online_gateway === null) {
                      licensing.default_online_gateway = 'flutterwave';
                    }
                    return { ...current, licensing };
                  })
                }
              />
              {defaultGatewaySelectOptions.length > 0 ? (
                <FormSelectField
                  label="Default online gateway"
                  requiredIndicator
                  helperText="Pre-selected gateway in institution payment forms when more than one PSP is enabled."
                  options={defaultGatewaySelectOptions}
                  value={form.licensing.default_online_gateway ?? defaultGatewaySelectOptions[0]?.value ?? 'paystack'}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      licensing: { ...current.licensing, default_online_gateway: event.target.value as 'paystack' | 'flutterwave' },
                    }))
                  }
                />
              ) : (
                <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground dark:border-slate-700 dark:bg-slate-900/50">
                  All online gateways are disabled; institutions will only see offline transfer (if enabled) or no checkout options.
                </p>
              )}
            </Subsection>
            <Subsection title="Offline transfers">
              <ToggleRow
                label="Offline invoice payment enabled"
                helpText="When on, institutions can record offline remittances (confirmation flow in a later release). Bank details are configured in the panel on the right."
                checked={form.licensing.offline_payment_enabled}
                onChange={(checked) => setForm((current) => ({ ...current, licensing: { ...current.licensing, offline_payment_enabled: checked } }))}
              />
            </Subsection>
            <Subsection title="Institution first-login terms">
              <FormField label="Terms version" value={form.licensing.institution_licensing_terms.version} onChange={(event) => setForm((current) => ({ ...current, licensing: { ...current.licensing, institution_licensing_terms: { ...current.licensing.institution_licensing_terms, version: event.target.value } } }))} />
              <FormField label="Terms title" value={form.licensing.institution_licensing_terms.title} onChange={(event) => setForm((current) => ({ ...current, licensing: { ...current.licensing, institution_licensing_terms: { ...current.licensing.institution_licensing_terms, title: event.target.value } } }))} />
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">Terms body</span>
                <textarea
                  className="min-h-[180px] w-full rounded-xl border border-input bg-background px-4 py-3 text-[15px] outline-none transition focus-visible:border-[#6A1025] focus-visible:ring-2 focus-visible:ring-[#6A1025]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  value={form.licensing.institution_licensing_terms.body}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      licensing: {
                        ...current.licensing,
                        institution_licensing_terms: { ...current.licensing.institution_licensing_terms, body: event.target.value },
                      },
                    }))
                  }
                />
              </label>
            </Subsection>
            <Subsection title="Licence catalogue rules">
              <ToggleRow label="Allow licence application" checked={form.licensing.allow_licence_application} onChange={(checked) => setForm((current) => ({ ...current, licensing: { ...current.licensing, allow_licence_application: checked } }))} />
              <ToggleRow label="Blanket annual licensing" checked={form.licensing.blanket_annual_licensing} onChange={(checked) => setForm((current) => ({ ...current, licensing: { ...current.licensing, blanket_annual_licensing: checked } }))} />
              <ToggleRow label="Require usage declaration" checked={form.licensing.require_usage_declaration} onChange={(checked) => setForm((current) => ({ ...current, licensing: { ...current.licensing, require_usage_declaration: checked } }))} />
            </Subsection>
          </SettingsPanel>

          <SettingsPanel className="xl:col-span-5">
            <PanelHeading title="Documents" description="File limits and how uploads are stored." />
            <FormField label="Allowed extensions" value={form.documents.allowed_extensions} onChange={(event) => setForm((current) => ({ ...current, documents: { ...current.documents, allowed_extensions: event.target.value } }))} helperText="Comma separated, e.g. jpg, jpeg, png, pdf" />
            <FormField label="Max upload size (MB)" value={form.documents.max_upload_size_mb} onChange={(event) => setForm((current) => ({ ...current, documents: { ...current.documents, max_upload_size_mb: event.target.value } }))} />
            <ToggleRow label="Private storage" checked={form.documents.private_storage} onChange={(checked) => setForm((current) => ({ ...current, documents: { ...current.documents, private_storage: checked } }))} />
            <div className="my-2 border-t border-dashed border-border pt-6 dark:border-slate-800">
              <PanelHeading title="REPRONIG bank (offline remittance)" description="Shown to institutions when offline payment is enabled." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Account name" value={form.licensing.repronig_bank.account_name} onChange={(event) => setForm((current) => ({ ...current, licensing: { ...current.licensing, repronig_bank: { ...current.licensing.repronig_bank, account_name: event.target.value } } }))} />
              <FormField label="Bank name" value={form.licensing.repronig_bank.bank_name} onChange={(event) => setForm((current) => ({ ...current, licensing: { ...current.licensing, repronig_bank: { ...current.licensing.repronig_bank, bank_name: event.target.value } } }))} />
              <div className="sm:col-span-2">
                <FormField label="Account number" value={form.licensing.repronig_bank.account_number} onChange={(event) => setForm((current) => ({ ...current, licensing: { ...current.licensing, repronig_bank: { ...current.licensing.repronig_bank, account_number: event.target.value } } }))} />
              </div>
              <div className="sm:col-span-2">
                <FormField label="Payment reference note" value={form.licensing.repronig_bank.reference_note} onChange={(event) => setForm((current) => ({ ...current, licensing: { ...current.licensing, repronig_bank: { ...current.licensing.repronig_bank, reference_note: event.target.value } } }))} helperText="Instructions institutions should follow on their transfer (e.g. quote invoice number)." />
              </div>
            </div>
          </SettingsPanel>
        </div>
      </SettingsGroup>

      <SettingsGroup title="Communications" description="Control platform email behaviour and gentle nudges for workflows." icon={Mail}>
        <SettingsPanel>
          <PanelHeading title="Notifications" description="Default email and workflow toggles." />
          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleRow label="Email notifications enabled" checked={form.notifications.email_enabled} onChange={(checked) => setForm((current) => ({ ...current, notifications: { ...current.notifications, email_enabled: checked } }))} />
            <ToggleRow label="Send application status updates" checked={form.notifications.send_application_status_updates} onChange={(checked) => setForm((current) => ({ ...current, notifications: { ...current.notifications, send_application_status_updates: checked } }))} />
            <ToggleRow label="Send payment updates" checked={form.notifications.send_payment_updates} onChange={(checked) => setForm((current) => ({ ...current, notifications: { ...current.notifications, send_payment_updates: checked } }))} />
            <ToggleRow label="Send usage declaration reminders" checked={form.notifications.send_usage_declaration_reminders} onChange={(checked) => setForm((current) => ({ ...current, notifications: { ...current.notifications, send_usage_declaration_reminders: checked } }))} />
          </div>
        </SettingsPanel>
      </SettingsGroup>

      <SettingsGroup title="Work languages" description="Languages available on the Create Work form." icon={Languages}>
        <SettingsPanel>
          <PanelHeading title="Catalogue" description="Add ISO-style codes; inactive languages stay in the database for existing works." />
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_110px]">
            <FormField label="Language name" requiredIndicator value={languageForm.name} onChange={(event) => setLanguageForm((current) => ({ ...current, name: event.target.value }))} placeholder="English" />
            <FormField label="Code" requiredIndicator value={languageForm.code} onChange={(event) => setLanguageForm((current) => ({ ...current, code: event.target.value }))} placeholder="en" />
            <FormField label="Order" requiredIndicator value={languageForm.sort_order} onChange={(event) => setLanguageForm((current) => ({ ...current, sort_order: event.target.value }))} />
          </div>
          <div className="flex justify-end pt-1">
            <Button
              type="button"
              onClick={() => createLanguageMutation.mutate()}
              disabled={createLanguageMutation.isPending || !languageForm.name.trim() || !languageForm.code.trim()}
            >
              {createLanguageMutation.isPending ? 'Adding...' : 'Add language'}
            </Button>
          </div>
          <div className="space-y-2 pt-2">
            {(languagesQuery.data ?? []).map((language) => (
              <div key={language.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/25 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{language.name}</p>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{language.code}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${language.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-muted text-muted-foreground dark:bg-slate-800'}`}>{language.is_active ? 'Active' : 'Inactive'}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => toggleLanguageMutation.mutate({ id: language.id, is_active: !language.is_active })} disabled={toggleLanguageMutation.isPending}>
                    {language.is_active ? 'Disable' : 'Enable'}
                  </Button>
                  {language.is_active ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => disableLanguageMutation.mutate(language.id)} disabled={disableLanguageMutation.isPending}>
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            {!languagesQuery.isLoading && (languagesQuery.data ?? []).length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground dark:border-slate-700">No languages configured yet.</p>
            ) : null}
          </div>
        </SettingsPanel>
      </SettingsGroup>

      <SettingsGroup title="Security & access" description="Baseline password policy, transport hardening, audit trail, and the shared admin PIN." icon={Shield}>
        <div className="grid gap-6 lg:grid-cols-2">
          <SettingsPanel>
            <PanelHeading title="Security" description="Password rules and audit logging." />
            <FormField label="Password minimum length" requiredIndicator value={form.security.password_min_length} onChange={(event) => setForm((current) => ({ ...current, security: { ...current.security, password_min_length: event.target.value } }))} />
            <ToggleRow label="Force HTTPS" checked={form.security.force_https} onChange={(checked) => setForm((current) => ({ ...current, security: { ...current.security, force_https: checked } }))} />
            <ToggleRow label="Audit logging enabled" checked={form.security.audit_logging_enabled} onChange={(checked) => setForm((current) => ({ ...current, security: { ...current.security, audit_logging_enabled: checked } }))} />
            <ToggleRow
              label="OTP via email"
              helpText="Send authentication OTP codes to user email addresses."
              checked={form.security.otp_email_enabled}
              onChange={(checked) =>
                setForm((current) => ({
                  ...current,
                  security: {
                    ...current.security,
                    otp_email_enabled: checked,
                  },
                }))
              }
            />
            <ToggleRow
              label="OTP via SMS"
              helpText="Send authentication OTP codes to user phone numbers."
              checked={form.security.otp_sms_enabled}
              onChange={(checked) =>
                setForm((current) => ({
                  ...current,
                  security: {
                    ...current.security,
                    otp_sms_enabled: checked,
                  },
                }))
              }
            />
            {!form.security.otp_email_enabled && !form.security.otp_sms_enabled ? (
              <p className="rounded-xl border border-dashed border-amber-400/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                Enable at least one OTP channel (email or SMS) before saving.
              </p>
            ) : null}
          </SettingsPanel>
          <SettingsPanel>
            <PanelHeading title="Admin sensitive-action PIN" description="Six digits for protected admin actions across the platform." />
            <div className="rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100">
              Updating this PIN applies it to all admin and super admin users. The PIN is stored securely and is never shown after saving.
            </div>
            <div className="flex flex-col gap-8">
              <PinInput
                label="New admin PIN"
                value={adminPinForm.admin_pin}
                onChange={(value) => setAdminPinForm((current) => ({ ...current, admin_pin: value }))}
                disabled={updateAdminPinMutation.isPending}
                helperText="Enter exactly 6 digits."
                emphasizeDigits
              />
              <PinInput
                label="Confirm admin PIN"
                value={adminPinForm.admin_pin_confirmation}
                onChange={(value) => setAdminPinForm((current) => ({ ...current, admin_pin_confirmation: value }))}
                disabled={updateAdminPinMutation.isPending}
                helperText="Re-enter the same 6 digits."
                emphasizeDigits
              />
            </div>
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => updateAdminPinMutation.mutate()}
                disabled={updateAdminPinMutation.isPending || adminPinForm.admin_pin.length !== 6 || adminPinForm.admin_pin_confirmation.length !== 6}
              >
                {updateAdminPinMutation.isPending ? 'Saving PIN...' : 'Save admin PIN'}
              </Button>
            </div>
          </SettingsPanel>
        </div>
      </SettingsGroup>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-24 bg-gradient-to-t from-background via-background/80 to-transparent dark:from-slate-950 dark:via-slate-950/80" aria-hidden />

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/90 bg-background/90 px-4 py-4 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90 dark:shadow-black/20">
        <div className="mx-auto flex max-w-6xl flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">Platform settings save together. Admin PIN uses the Save admin PIN control above.</p>
          <Button
            className="shrink-0 sm:min-w-[200px]"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || (!form.security.otp_email_enabled && !form.security.otp_sms_enabled)}
          >
            {updateMutation.isPending ? 'Saving…' : 'Save platform settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
