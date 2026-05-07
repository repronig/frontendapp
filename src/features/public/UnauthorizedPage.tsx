import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <Card className="w-full">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Unauthorized</h1>
        <p className="mt-2 text-sm text-slate-600">Your account does not currently have access to this portal.</p>
        <Button className="mt-6" onClick={() => navigate('/member/login')}>Return to login</Button>
      </Card>
    </div>
  );
}
