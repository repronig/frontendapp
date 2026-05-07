import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth.store';

export function PortalHome({ title, note }: { title: string; note: string }) {
  const currentUser = useAuthStore((state) => state.currentUser);

  return (
    <Card>
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{note}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {currentUser?.user.roles.map((role) => <Badge key={role}>{role}</Badge>)}
      </div>
    </Card>
  );
}
