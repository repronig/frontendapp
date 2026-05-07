import { PropsWithChildren } from 'react';
import { AppLogo } from '@/components/shared/AppLogo';
import { Card } from '@/components/ui/card';

export function AuthCard({ title, subtitle, children, mode = 'login' }: PropsWithChildren<{ title: string; subtitle: string; mode?: 'login' | 'register'; }>) {
  return (
    <div className={`min-h-screen ${mode === 'register' ? 'auth-register-backdrop' : 'auth-backdrop'} flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8`}>
      <div className="mx-auto flex w-full justify-center">
        <Card className="w-full max-w-[620px] border-white/70 bg-white/96 dark:bg-slate-950/96 px-8 py-8 shadow-[0_26px_80px_rgba(6,15,35,0.22)] backdrop-blur md:px-10">
          <AppLogo size="lg" className="mx-auto" />
          <div className="mt-6 text-center">
            <h2 className="text-[24px] font-semibold tracking-tight text-[#182230] md:text-[26px]">{title}</h2>
            <p className="mt-2 text-[15px] leading-7 text-[#6B788E] dark:text-slate-300">{subtitle}</p>
          </div>
          <div className="mt-8">{children}</div>
        </Card>
      </div>
    </div>
  );
}
