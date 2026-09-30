'use client';
import Link from 'next/link';
import { ArrowRight, GitBranch, GripVertical, ListChecks, Play, Search, Timer, Wrench, Zap } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { EcgTrace } from '@/components/EcgTrace';
import { categoryMeta } from '@/lib/categories';
import { useStore } from '@/lib/store';

function PreviewMonitor() {
  return (
    <div className="glass-solid relative overflow-hidden p-4 shadow-glow sm:p-5" aria-hidden>
      <div className="flex items-center justify-between text-xs">
        <span className="label">STATION 04 · MONITORING</span>
        <span className="num rounded-lg bg-white/10 px-2 py-1 text-base font-semibold">09:42</span>
      </div>
      <div className="relative mt-3 h-16 overflow-hidden rounded-2xl bg-ink-950/80"><EcgTrace className="absolute inset-0 h-full w-full" color="#34D399" /></div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[['BP', '118/72', 'text-white'], ['HR', '76', 'text-ok'], ['SpO₂', '99', 'text-pulse'], ['TEMP', '36.6', 'text-blush']].map(([l, v, c]) => (
          <div key={l} className="rounded-xl bg-white/[0.06] py-2"><div className="text-[10px] font-semibold tracking-widest text-slate-400">{l}</div><div className={`num text-lg font-semibold ${c}`}>{v}</div></div>
        ))}
      </div>
      <p className="mt-4 font-display text-sm font-semibold">Which finding BEST confirms effective ventilation?</p>
      <div className="mt-2.5 space-y-2 text-xs">
        {['A regular capnogram with a normal end-tidal CO₂', 'Heart rate below 80', 'SpO₂ of 99% alone'].map((t, i) => (
          <div key={t} className={`flex gap-2 rounded-xl border p-2.5 ${i === 0 ? 'border-pulse bg-pulse/10' : 'border-white/10 bg-white/[0.04]'}`}><span className="num font-semibold text-slate-400">{'ABC'[i]}</span>{t}</div>
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const { cases } = useStore();
  return (
    <AppShell bottomNav={false}>
      <div className="space-y-20 sm:space-y-28">
        <section className="grid items-center gap-10 pt-2 lg:grid-cols-[1.1fr_0.9fr] lg:pt-8">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-blush/40 bg-blush/10 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] text-blush">TIARA BUNDA EDITION</p>
            <h1 className="mt-5 font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl">Practice.<br />Think.<br />Perform.</h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-300">Interactive OSCE Simulation for <span className="font-semibold text-white">D4 Keperawatan Anestesiologi</span>. Run a station against the clock, make each decision, and see exactly why it was right or wrong.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard" className="btn btn-primary min-h-[56px] px-7 text-base"><Play size={18} aria-hidden />START PRACTICING</Link>
              <Link href="/stations" className="btn btn-ghost min-h-[56px] px-7 text-base">EXPLORE STATIONS <ArrowRight size={18} aria-hidden /></Link>
            </div>
            <p className="mt-6 text-xs font-medium tracking-wider text-slate-500">POLITEKNIK TIARA BUNDA · CINERE, DEPOK</p>
          </div>
          <PreviewMonitor />
        </section>

        <section aria-labelledby="how">
          <h2 id="how" className="font-display text-2xl font-semibold sm:text-3xl">How a station works</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              [Search, 'Read the scenario', 'Patient, vitals and history. The clock has not started yet.'],
              [Timer, 'Start the timer', 'Choose Practice Mode for feedback or Exam Mode for a real-exam feel.'],
              [GitBranch, 'Decide step by step', 'Your choices can change the next step and the patient’s vitals.'],
              [Zap, 'Get your report', 'Score, weak areas, XP, and a full answer review to retry from.'],
            ].map(([Icon, t, d], i) => {
              const I = Icon as typeof Search;
              return (
                <li key={t as string} className="glass p-5">
                  <div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-pulse/10 text-pulse"><I size={18} aria-hidden /></span><span className="num font-display text-3xl font-semibold text-white/15">0{i + 1}</span></div>
                  <h3 className="mt-4 font-display font-semibold">{t as string}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{d as string}</p>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="types">
          <h2 id="types" className="font-display text-2xl font-semibold sm:text-3xl">Not just multiple choice</h2>
          <p className="mt-2 max-w-2xl text-slate-300">Five challenge types, mixed inside every station.</p>
          <ul className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              [ListChecks, 'Multiple choice', 'Pick the best next action.'],
              [GripVertical, 'Sequence', 'Drag steps into the right order.'],
              [Wrench, 'Equipment', 'Select what to prepare.'],
              [Search, 'Find the error', 'Spot the unsafe checklist entries.'],
              [GitBranch, 'Branching', 'Your decision changes what happens next.'],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof Search;
              return <li key={t as string} className="glass p-4"><I size={18} className="text-blush" aria-hidden /><h3 className="mt-3 text-sm font-semibold">{t as string}</h3><p className="mt-1 text-xs leading-relaxed text-slate-300">{d as string}</p></li>;
            })}
          </ul>
        </section>

        <section aria-labelledby="stations">
          <div className="flex items-end justify-between gap-4">
            <h2 id="stations" className="font-display text-2xl font-semibold sm:text-3xl">Available stations</h2>
            <Link href="/stations" className="text-sm font-medium text-pulse hover:underline">See all</Link>
          </div>
          <ul className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cases.map((c) => {
              const Icon = categoryMeta(c.category).icon;
              return (
                <li key={c.id}>
                  <Link href={`/simulate/${c.id}`} className="glass flex h-full items-center gap-4 p-4 transition hover:border-pulse/40 hover:bg-white/[0.07]">
                    <span className="num font-display text-3xl font-semibold text-white/20">{String(c.number).padStart(2, '0')}</span>
                    <span className="min-w-0"><span className="block truncate font-semibold">{c.title}</span><span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400"><Icon size={12} aria-hidden />{categoryMeta(c.category).label} · {c.durationMin} min</span></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="glass p-8 text-center sm:p-12">
          <h2 className="font-display text-3xl font-semibold">Ready for your first station?</h2>
          <p className="mx-auto mt-2 max-w-md text-slate-300">No account needed. Your progress stays on this device.</p>
          <Link href="/dashboard" className="btn btn-primary mt-6 min-h-[56px] px-8 text-base">START PRACTICING</Link>
        </section>
      </div>
    </AppShell>
  );
}
