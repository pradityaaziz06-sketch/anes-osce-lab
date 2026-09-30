'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Award, CheckCircle2, ClipboardCheck, Clock, LayoutDashboard, RotateCcw, Sparkles, TriangleAlert, XCircle, Zap } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { cn, EmptyState, PageSkeleton, ProgressBar, ScoreRing } from '@/components/ui';
import { describeCorrect, describeResponse, TYPE_LABEL } from '@/lib/describe';
import { fmtDate, fmtTime } from '@/lib/format';
import { gradeFor } from '@/lib/scoring';
import { useStore } from '@/lib/store';
import type { Attempt, CaseData, Step } from '@/lib/types';

function Metric({ label, value, tone = 'pulse' }: { label: string; value: number | null; tone?: 'pulse' | 'blush' }) {
  if (value === null) return null;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm"><span className="text-slate-300">{label}</span><span className="num font-semibold">{value}</span></div>
      <ProgressBar value={value} tone={tone} label={label} />
    </div>
  );
}

function ReviewItem({ step, attempt, n }: { step: Step; attempt: Attempt; n: number }) {
  const a = attempt.answers.find((x) => x.stepId === step.id);
  const state = !a ? 'skipped' : a.correct ? 'ok' : a.score > 0 ? 'partial' : 'bad';
  return (
    <li className="glass p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="num text-sm font-semibold text-slate-400">#{n}</span>
        <span className="chip">{TYPE_LABEL[step.type]}</span>
        {step.critical && <span className="chip border-blush/40 text-blush">KRITIS</span>}
        <span className={cn('ml-auto flex items-center gap-1 text-sm font-semibold', state === 'ok' ? 'text-ok' : state === 'partial' ? 'text-warn' : 'text-bad')}>
          {state === 'ok' ? <CheckCircle2 size={16} aria-hidden /> : <XCircle size={16} aria-hidden />}
          {state === 'ok' ? 'Benar' : state === 'partial' ? 'Sebagian benar' : state === 'skipped' ? 'Tidak dijawab' : 'Bukan pilihan terbaik'}
          {a && <span className="num ml-1 text-slate-300">{a.score}/100</span>}
        </span>
      </div>
      {step.situation && <p className="mt-3 text-sm text-slate-300"><span className="label mr-2">Situasi</span>{step.situation}</p>}
      <p className="mt-3 font-display text-base font-semibold">{step.prompt}</p>
      <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
        <div className="rounded-2xl bg-white/[0.05] p-3.5">
          <p className="label">Jawabanmu</p>
          {a ? <ul className="mt-1.5 space-y-1">{describeResponse(step, a.response).map((t, i) => <li key={i}>{step.type === 'sequence' ? `${i + 1}. ` : '• '}{t}</li>)}</ul> : <p className="mt-1.5 text-slate-400">Waktu habis sebelum step ini.</p>}
        </div>
        {state !== 'ok' && (
          <div className="rounded-2xl border border-ok/30 bg-ok/10 p-3.5">
            <p className="label text-ok">Jawaban terbaik</p>
            <ul className="mt-1.5 space-y-1">{describeCorrect(step).map((t, i) => <li key={i}>{step.type === 'sequence' ? `${i + 1}. ` : '• '}{t}</li>)}</ul>
          </div>
        )}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-200"><span className="label mr-2">Penjelasan</span>{step.explanation}</p>
      <p className="mt-2 text-sm text-pulse"><span className="label mr-2 text-pulse">Poin kunci</span>{step.takeaway}</p>
    </li>
  );
}

function Result({ attempt, c, cases }: { attempt: Attempt; c: CaseData | undefined; cases: CaseData[] }) {
  const [review, setReview] = useState(false);
  const [onlyMistakes, setOnlyMistakes] = useState(false);
  const next = c ? cases.find((x) => x.number > c.number) : undefined;
  const steps = (c ? attempt.queue.map((id) => c.steps.find((s) => s.id === id)).filter((s): s is Step => Boolean(s)) : []);
  const shown = onlyMistakes ? steps.filter((s) => !attempt.answers.find((a) => a.stepId === s.id)?.correct) : steps;
  const b = attempt.breakdown;
  const badges = ACHIEVEMENTS.filter((a) => attempt.newBadges.includes(a.code));

  return (
    <div className="space-y-6">
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass overflow-hidden p-6 sm:p-9">
        <p className="label">{attempt.timedOut ? 'WAKTU HABIS' : 'STATION SELESAI'} · {attempt.mode === 'exam' ? 'MODE UJIAN' : 'MODE LATIHAN'}</p>
        <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">{c?.title ?? 'Station'}</h1>
        <p className="mt-1 text-sm text-slate-400">{fmtDate(attempt.startedAt)}</p>
        <div className="mt-7 grid items-center gap-8 md:grid-cols-[auto_1fr]">
          <div className="mx-auto md:mx-0">
            <ScoreRing value={attempt.final} size={190} stroke={14}>
              <div><div className="num font-display text-5xl font-semibold">{attempt.final}</div><div className="num text-sm text-slate-400">/ 100</div></div>
            </ScoreRing>
            <p className={cn('mt-3 text-center font-display text-lg font-semibold', attempt.final >= 80 ? 'text-ok' : attempt.final >= 60 ? 'text-warn' : 'text-bad')}>{gradeFor(attempt.final)}</p>
          </div>
          <div className="grid gap-4">
            <Metric label="Akurasi" value={b.accuracy} />
            <Metric label="Langkah Kritis" value={b.critical} tone="blush" />
            <Metric label="Urutan" value={b.sequence} />
            <Metric label="Waktu" value={b.time} />
            <Metric label="Kesalahan" value={b.mistakes} />
          </div>
        </div>
        {attempt.criticalMissed && (
          <p className="mt-6 flex gap-2 rounded-2xl border border-bad/40 bg-bad/10 p-3.5 text-sm"><TriangleAlert size={18} className="mt-0.5 shrink-0 text-bad" aria-hidden />Ada langkah kritis yang dijawab salah, sehingga skor dibatasi maksimal 79 dalam simulasi ini. Telaah langkah tersebut di bawah.</p>
        )}
        <p className="mt-4 text-xs text-slate-500">Skor simulasi hanya untuk belajar. Bukan penilaian klinis maupun penilaian resmi.</p>
      </motion.section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Ringkasan">
        <div className="glass p-4"><p className="label">Waktu</p><p className="num mt-2 flex items-center gap-2 font-display text-2xl font-semibold"><Clock size={18} className="text-pulse" aria-hidden />{fmtTime(attempt.durationMs)}</p></div>
        <div className="glass p-4"><p className="label">Kesalahan</p><p className="num mt-2 font-display text-2xl font-semibold">{attempt.mistakes}</p></div>
        <div className="glass p-4"><p className="label">Terkuat</p><p className="mt-2 text-sm font-semibold">{attempt.strongest ?? '—'}</p></div>
        <div className="glass p-4"><p className="label">Perlu latihan</p><p className="mt-2 text-sm font-semibold">{attempt.weakest ?? 'Tidak ada kali ini'}</p></div>
      </section>

      <section className="glass flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
        <p className="flex items-center gap-2 font-display font-semibold"><Zap size={18} className="text-pulse" aria-hidden /><span className="num">+{attempt.xpGained} XP</span></p>
        {attempt.levelUp && <p className="flex items-center gap-2 font-semibold text-blush"><Sparkles size={18} aria-hidden />Naik level! Sekarang kamu level {attempt.levelUp}</p>}
        {badges.map((bd) => <p key={bd.code} className="flex items-center gap-2 text-sm font-semibold text-blush"><Award size={18} aria-hidden />Lencana terbuka: {bd.label}</p>)}
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {c && <Link href={`/simulate/${c.id}`} className="btn btn-primary"><RotateCcw size={16} aria-hidden />COBA LAGI</Link>}
        {next ? <Link href={`/simulate/${next.id}`} className="btn btn-ghost">STATION BERIKUTNYA <ArrowRight size={16} aria-hidden /></Link> : <Link href="/stations" className="btn btn-ghost">SEMUA STATION <ArrowRight size={16} aria-hidden /></Link>}
        <button type="button" onClick={() => setReview(!review)} aria-expanded={review} className="btn btn-blush"><ClipboardCheck size={16} aria-hidden />{review ? 'SEMBUNYIKAN JAWABAN' : 'TELAAH JAWABAN'}</button>
        <Link href="/dashboard" className="btn btn-ghost"><LayoutDashboard size={16} aria-hidden />KEMBALI KE DASHBOARD</Link>
      </div>

      {review && (
        <section aria-label="Telaah jawaban" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">Telaah jawaban</h2>
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyMistakes} onChange={(e) => setOnlyMistakes(e.target.checked)} className="h-5 w-5 accent-cyan-400" />Hanya telaah kesalahan
            </label>
          </div>
          {!c ? <EmptyState title="Data station tidak tersedia" body="Station ini sudah tidak tersedia, sehingga jawaban tidak dapat ditelaah." /> : shown.length === 0 ? (
            <EmptyState title="Tidak ada kesalahan untuk ditelaah" body="Semua step dijawab dengan benar. Kerja bagus." />
          ) : (
            <ol className="space-y-4">{shown.map((s) => <ReviewItem key={s.id} step={s} attempt={attempt} n={steps.indexOf(s) + 1} />)}</ol>
          )}
        </section>
      )}
    </div>
  );
}

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const { ready, attempts, cases } = useStore();
  const attempt = attempts.find((a) => a.id === id);
  return (
    <AppShell>
      {!ready ? <PageSkeleton /> : !attempt ? (
        <EmptyState title="Hasil tidak ditemukan" body="Hasil ini tidak ada di perangkat ini atau sudah di-reset. Selesaikan sebuah station untuk melihat laporan baru." action={<Link href="/stations" className="btn btn-primary">Pilih station</Link>} />
      ) : (
        <Result attempt={attempt} c={cases.find((c) => c.id === attempt.caseId)} cases={cases} />
      )}
    </AppShell>
  );
}
