'use client';
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { StationCard } from '@/components/cards';
import { cn, EmptyState, PageSkeleton } from '@/components/ui';
import { caseStats } from '@/lib/analytics';
import { allCategories } from '@/lib/categories';
import { useStore } from '@/lib/store';

function Stations() {
  const { ready, cases, attempts } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get('category') ?? 'all';
  const stats = caseStats(attempts);
  const cats = allCategories(cases.map((c) => c.category)).filter((m) => cases.some((c) => c.category === m.id));
  const list = active === 'all' ? cases : cases.filter((c) => c.category === active);

  if (!ready) return <PageSkeleton />;
  return (
    <div>
      <p className="label">Practice</p>
      <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Select your station</h1>
      <p className="mt-2 max-w-2xl text-slate-300">Each station is a short clinical scenario with several decisions. You choose Practice Mode or Exam Mode before the timer starts.</p>

      <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Filter by category">
        {[{ id: 'all', label: 'ALL' }, ...cats].map((m) => (
          <button key={m.id} role="tab" aria-selected={active === m.id} onClick={() => router.replace(m.id === 'all' ? '/stations' : `/stations?category=${m.id}`, { scroll: false })} className={cn('min-h-[44px] shrink-0 rounded-full border px-4 text-xs font-semibold tracking-wider transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-pulse', active === m.id ? 'border-pulse/60 bg-pulse/15 text-pulse' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10')}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {list.length === 0 ? (
          <EmptyState title="No stations in this category yet" body="Choose another category, or show all stations." action={<button className="btn btn-ghost" onClick={() => router.replace('/stations')}>Show all stations</button>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => <StationCard key={c.id} c={c} stat={stats.get(c.id)} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StationsPage() {
  return (
    <AppShell>
      <Suspense fallback={<PageSkeleton />}><Stations /></Suspense>
    </AppShell>
  );
}
