'use client';
import Link from 'next/link';
import { Flame, Gauge, Star, Target, Trophy, Play, ArrowRight } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { BadgeGrid, CategoryCard, StatCard, XpBar } from '@/components/cards';
import { DIFF_LABEL, PageSkeleton, ProgressBar, ScoreRing } from '@/components/ui';
import { caseStats, categoryProgress, overview } from '@/lib/analytics';
import { allCategories, categoryMeta } from '@/lib/categories';
import { useStore } from '@/lib/store';

export default function DashboardPage() {
  const { ready, cases, attempts, profile, level, unlocked } = useStore();
  const ov = overview(attempts, cases);
  const prog = categoryProgress(attempts, cases);
  const stats = caseStats(attempts);
  const cats = allCategories(cases.map((c) => c.category));
  const first = (profile.name || 'Mahasiswa').trim().split(/\s+/)[0];

  const next =
    cases.find((c) => !stats.has(c.id)) ??
    [...cases].sort((a, b) => (stats.get(a.id)?.best ?? 0) - (stats.get(b.id)?.best ?? 0))[0];
  const nextAttempted = next ? stats.has(next.id) : false;

  return (
    <AppShell>
      {!ready ? <PageSkeleton /> : (
        <div className="space-y-8">
          <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="label">{profile.program}</p>
              <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Selamat datang kembali, {first}</h1>
              <p className="mt-2 max-w-xl text-slate-300">
                {attempts.length === 0 ? 'Pilih station pertamamu dan jalani seperti OSCE sungguhan.' : `Kamu sudah menyelesaikan ${ov.completed} dari ${ov.totalCases} station. Jaga terus streak-mu.`}
              </p>
            </div>
            <div className="w-full lg:w-80"><XpBar level={level} compact /></div>
          </section>

          <section aria-label="Statistikmu" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Kasus Selesai" value={`${ov.completed}/${ov.totalCases}`} icon={Target} hint="Station yang pernah dicoba" />
            <StatCard label="Rata-rata Skor" value={attempts.length ? ov.avgScore : '—'} icon={Gauge} hint="Dari semua percobaan" />
            <StatCard label="Skor Terbaik" value={attempts.length ? ov.bestScore : '—'} icon={Trophy} hint="Percobaan tertinggi" />
            <StatCard label="Streak Saat Ini" value={<>{ov.streak}<span className="ml-1 text-base font-medium text-slate-400">hari</span></>} icon={Flame} hint="Hari latihan berturut-turut" />
          </section>

          <section className="grid gap-4 lg:grid-cols-5">
            <div className="glass flex items-center gap-6 p-6 lg:col-span-2">
              <ScoreRing value={ov.readiness} size={132} stroke={11}>
                <div>
                  <div className="num font-display text-3xl font-semibold">{ov.readiness}<span className="text-lg text-slate-400">%</span></div>
                </div>
              </ScoreRing>
              <div>
                <h2 className="font-display text-lg font-semibold">Kesiapan OSCE</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">Rata-rata skor terbaikmu di semua station. Station yang belum dicoba dihitung nol.</p>
              </div>
            </div>
            {next && (
              <div className="glass flex flex-col justify-between p-6 lg:col-span-3">
                <div>
                  <p className="label">{nextAttempted ? 'Station terlemah' : 'Disarankan berikutnya'}</p>
                  <h2 className="mt-2 font-display text-xl font-semibold">{next.title}</h2>
                  <p className="mt-1 text-xs font-medium tracking-wide text-pulse">{categoryMeta(next.category).label} · {DIFF_LABEL[next.difficulty]} · {next.durationMin} mnt</p>
                  <p className="mt-3 text-sm text-slate-300">{next.summary}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={`/simulate/${next.id}`} className="btn btn-primary"><Play size={16} aria-hidden />{nextAttempted ? 'ULANGI STATION' : 'MULAI STATION'}</Link>
                  <Link href="/stations" className="btn btn-ghost">Semua station <ArrowRight size={16} aria-hidden /></Link>
                </div>
              </div>
            )}
          </section>

          <section aria-labelledby="cat-h">
            <div className="mb-4 flex items-end justify-between">
              <h2 id="cat-h" className="font-display text-xl font-semibold">Kategori station</h2>
              <Link href="/stations" className="text-sm font-medium text-pulse hover:underline">Lihat semua station</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {cats.map((m) => <CategoryCard key={m.id} meta={m} total={prog[m.id]?.total ?? 0} done={prog[m.id]?.done ?? 0} />)}
            </div>
          </section>

          <section aria-labelledby="bd-h">
            <div className="mb-4 flex items-end justify-between">
              <h2 id="bd-h" className="font-display text-xl font-semibold">Lencana</h2>
              <span className="flex items-center gap-1 text-sm text-slate-400"><Star size={14} aria-hidden />{Object.keys(unlocked).length} terbuka</span>
            </div>
            <BadgeGrid unlocked={unlocked} />
          </section>

          <section className="glass p-5">
            <h2 className="font-display text-base font-semibold">Progres keseluruhan</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {cats.filter((m) => (prog[m.id]?.total ?? 0) > 0).map((m) => {
                const p = prog[m.id];
                const pct = Math.round((p.done / p.total) * 100);
                return (
                  <li key={m.id}>
                    <div className="mb-1.5 flex justify-between text-sm"><span>{m.label}</span><span className="num text-slate-300">{pct}%</span></div>
                    <ProgressBar value={pct} label={`${m.label} ${pct}%`} />
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </AppShell>
  );
}
