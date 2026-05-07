import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/shared/SectionHeader';

export function PortalPlaceholderPage({
  title,
  summary,
  phase,
}: {
  title: string;
  summary: string;
  phase: string;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader title={title} description={summary} />
      <Card>
        <p className="text-sm text-slate-600">
          This route is scaffolded in Phase 2 so navigation, layout, and guards are already in place.
          Functional implementation starts in {phase}.
        </p>
      </Card>
    </div>
  );
}
