'use client';
import Link from 'next/link';
import { Clock, Gauge, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/cards';
import { TrendChart } from '@/components/charts';
import { EmptyState, PageSkeleton, ProgressBar } from '@/components/ui';
import { overview, performanceInsights } from '@/lib/analytics';
import { categoryMeta } from '@/lib/categories';
import { fmtTime } from '@/lib/format';
import { useStore } from '@/lib/store';

export default function PerformancePage() {
  const { ready, attempts, cases } = useStore();
  const ov = overview(attempts, cases);
  const ins = performanceInsights(attempts, cases);
  return (
    <AppShell>
      {!ready ? <PageSkeleton /> : (
        <div className="space-y-7">
          <div>
            <p className="label">Analytics</p>
            <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">My performance</h1>
          </div>
          {attempts.length === 0 ? (
            <EmptyState title="No data yet" body="Finish your first station and your scores, timing and weak areas will appear here." action={<Link href="/stations" className="btn btn-primary">Start a station</Link>} />
          ) : (
            <>
              <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Key numbers">
                <StatCard label="Average Score" value={ov.avgScore} icon={Gauge} />
                <StatCard label="Best Score" value={ov.bestScore} icon={Trophy} />
                <StatCard label="Average Time" value={fmtTime(ov.avgTimeMs)} icon={Clock} />
                <StatCard label="Most Mistaken" value={<span className="block text-base leading-tight">{ins.mostMistaken ? categoryMeta(ins.mostMistaken).label : 'None yet'}</span>} icon={TrendingDown} />
                <StatCard label="Strongest" value={<span className="block text-base leading-tight">{ins.strongest ? categoryMeta(ins.strongest).label : '—'}</span>} icon={TrendingUp} />
              </section>
              <section className="glass p-5 sm:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold">Score trend</h2>
                  <p className="text-xs text-slate-400">Last {Math.min(12, attempts.length)} attempts · dashed line = 60 · pink dots = Exam Mode</p>
                </div>
                <div className="mt-4"><TrendChart attempts={attempts} /></div>
              </section>
              <div className="grid gap-5 lg:grid-cols-2">
                <section className="glass p-5 sm:p-6">
                  <h2 className="font-display text-lg font-semibold">Average score by category</h2>
                  <ul className="mt-4 space-y-4">
                    {ins.catRows.sort((a, b) => b.avgScore - a.avgScore).map((r) => (
                      <li key={r.id}>
                        <div className="mb-1.5 flex justify-between text-sm"><span>{categoryMeta(r.id).label}</span><span className="num text-slate-300">{r.avgScore} · {r.n} {r.n === 1 ? 'attempt' : 'attempts'}</span></div>
                        <ProgressBar value={r.avgScore} label={`${categoryMeta(r.id).label} average ${r.avgScore}`} tone={r.avgScore >= 80 ? 'ok' : r.avgScore >= 60 ? 'pulse' : 'warn'} />
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="glass p-5 sm:p-6">
                  <h2 className="font-display text-lg font-semibold">Skills, weakest first</h2>
                  <ul className="mt-4 space-y-4">
                    {ins.tagRows.slice(0, 8).map((r) => (
                      <li key={r.tag}>
                        <div className="mb-1.5 flex justify-between text-sm"><span>{r.tag}</span><span className="num text-slate-300">{r.avg}</span></div>
                        <ProgressBar value={r.avg} tone={r.avg >= 80 ? 'ok' : r.avg >= 60 ? 'pulse' : 'blush'} label={`${r.tag} ${r.avg}`} />
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}
