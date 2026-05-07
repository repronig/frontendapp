import { Card } from '@/components/ui/card';

function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === '') return <span className="text-slate-400">—</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-400">[]</span>;
    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 p-3">
            {typeof item === 'object' && item !== null ? renderObject(item as Record<string, unknown>) : String(item)}
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === 'object') {
    return renderObject(value as Record<string, unknown>);
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function renderObject(value: Record<string, unknown>) {
  return (
    <dl className="grid gap-3 md:grid-cols-2">
      {Object.entries(value).map(([key, entry]) => (
        <div key={key} className="space-y-1 rounded-lg border border-slate-200 bg-white dark:bg-slate-950 p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{key.replaceAll('_', ' ')}</dt>
          <dd className="text-sm break-words text-slate-700 dark:text-slate-300">{renderValue(entry)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ResourceInspector({ title, description, data }: { title: string; description?: string; data: unknown }) {
  return (
    <Card className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h3>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      <div>{renderValue(data)}</div>
    </Card>
  );
}
