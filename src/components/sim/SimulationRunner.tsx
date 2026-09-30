'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AlertTriangle, BookOpen, Clock, Flame, Lock, Play, ShieldAlert, X, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { cn, DifficultyBadge, Modal } from '@/components/ui';
import { categoryMeta } from '@/lib/categories';
import { TYPE_LABEL } from '@/lib/describe';
import { currentStep, historyAt, initSim, simReducer, vitalsAt, type SimAction, type SimState } from '@/lib/engine';
import { fmtTime, shuffleSeeded, uid } from '@/lib/format';
import { evaluateStep } from '@/lib/scoring';
import { sfx } from '@/lib/sound';
import { useStore } from '@/lib/store';
import type { CaseData, Mode, Step } from '@/lib/types';
import { FeedbackPanel } from './Feedback';
import { ChoiceList, SelectGrid, SequenceList, type Mark } from './inputs';
import { PatientCard } from './PatientCard';

/** Timer that only runs while `running` is true (paused during practice feedback). */
function useClock(running: boolean) {
  const acc = useRef(0);
  const start = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    start.current = Date.now();
    const id = setInterval(() => setElapsed(acc.current + Date.now() - (start.current as number)), 200);
    return () => {
      clearInterval(id);
      if (start.current !== null) { acc.current += Date.now() - start.current; start.current = null; }
      setElapsed(acc.current);
    };
  }, [running]);
  const get = useCallback(() => acc.current + (start.current !== null ? Date.now() - start.current : 0), []);
  return { elapsed, get };
}

export default function SimulationRunner({ caseData }: { caseData: CaseData }) {
  const router = useRouter();
  const { saveAttempt } = useStore();
  const reducer = useCallback((s: SimState, a: SimAction) => simReducer(caseData, s, a), [caseData]);
  const [state, dispatch] = useReducer(reducer, caseData, initSim);
  const limitMs = caseData.durationMin * 60_000;
  const clock = useClock(state.phase === 'running');
  const [modeChoice, setModeChoice] = useState<Mode>('practice');
  const [exitOpen, setExitOpen] = useState(false);
  const runKey = useRef(uid()).current;
  const stepStart = useRef(0);
  const saved = useRef(false);

  const step = currentStep(caseData, state);
  const exam = state.mode === 'exam';
  const remaining = limitMs - clock.elapsed;
  const overtime = remaining < 0;
  const secLeft = Math.ceil(remaining / 1000);
  const cat = categoryMeta(caseData.category);

  useEffect(() => { if (state.phase === 'running') stepStart.current = clock.get(); }, [state.phase, state.index, clock]);

  // Exam: hard stop at the time limit.
  useEffect(() => {
    if (state.phase === 'running' && exam && clock.elapsed >= limitMs) dispatch({ type: 'FINISH', elapsedMs: limitMs, timedOut: true });
  }, [clock.elapsed, state.phase, exam, limitMs]);

  // Countdown ticks for the last 10 seconds.
  useEffect(() => { if (state.phase === 'running' && secLeft > 0 && secLeft <= 10) sfx.tick(); }, [secLeft, state.phase]);

  // Save once when finished, then go to the result page.
  useEffect(() => {
    if (state.phase !== 'done' || !state.final || saved.current) return;
    saved.current = true;
    const attempt = saveAttempt({
      ...state.final,
      caseId: caseData.id,
      mode: state.mode,
      startedAt: state.startedAt ?? new Date().toISOString(),
      queue: state.queue,
      answers: state.answers,
    });
    sfx.finish();
    router.replace(`/result/${attempt.id}`);
  }, [state, caseData.id, saveAttempt, router]);

  // Warn before closing the tab mid-station.
  useEffect(() => {
    if (state.phase !== 'running' && state.phase !== 'feedback') return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [state.phase]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [state.index, state.phase === 'brief']);

  const vitals = vitalsAt(caseData, state.queue, state.index);
  const prevVitals = state.index > 0 ? vitalsAt(caseData, state.queue, state.index - 1) : vitals;
  const hist = historyAt(caseData, state.queue, state.index);

  const submit = (response: unknown) => {
    if (!step) return;
    const res = evaluateStep(step, response);
    if (exam) sfx.click(); else (res.correct ? sfx.success : sfx.error)();
    dispatch({ type: 'ANSWER', response, elapsedMs: clock.get(), stepTimeMs: clock.get() - stepStart.current });
  };

  const timerTone = state.phase === 'brief' ? 'text-slate-200' : overtime || remaining < limitMs * 0.1 ? 'text-bad' : remaining < limitMs * 0.25 ? 'text-warn' : 'text-white';
  const timerText = state.phase === 'brief' ? fmtTime(limitMs) : overtime ? `+${fmtTime(-remaining)}` : fmtTime(remaining);
  const total = state.queue.length;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/85 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => (state.phase === 'brief' ? router.push('/stations') : setExitOpen(true))} aria-label="Tinggalkan station" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10"><X size={18} /></button>
            <div className="min-w-0 flex-1">
              <p className="label truncate">STATION {String(caseData.number).padStart(2, '0')}</p>
              <h1 className="truncate font-display text-sm font-semibold sm:text-base">{caseData.title.toUpperCase()}</h1>
            </div>
            <div className="text-right">
              <p className="label">{overtime ? 'LEMBUR' : 'TIMER'}</p>
              <p className={cn('num text-2xl font-semibold leading-none sm:text-3xl', timerTone)} role="timer" aria-label={`Sisa waktu ${timerText}`}>{timerText}</p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-2 overflow-x-auto text-xs" aria-label="Statistik sesi">
            <span className="chip shrink-0"><span className="text-slate-400">SKOR</span><b className="num">{exam ? '—' : state.points}</b></span>
            <span className="chip shrink-0"><XCircle size={12} className="text-bad" aria-hidden /><span className="text-slate-400">SALAH</span><b className="num">{exam ? '—' : state.mistakes}</b></span>
            <span className="chip shrink-0"><Flame size={12} className="text-blush" aria-hidden /><span className="text-slate-400">STREAK</span><b className="num">{exam ? '—' : state.streak}</b></span>
            {exam && state.phase !== 'brief' && <span className="chip shrink-0 border-blush/40 text-blush"><Lock size={11} aria-hidden />MODE UJIAN</span>}
            <span className="num ml-auto shrink-0 font-semibold tracking-wider text-slate-300">{state.phase === 'brief' ? 'BRIEFING' : `LANGKAH ${Math.min(state.index + 1, total)} / ${total}`}</span>
          </div>
          <div className="mt-2 flex gap-1" aria-hidden>
            {state.queue.map((id, i) => (
              <span key={id} className={cn('h-1.5 flex-1 rounded-full transition-colors', state.phase !== 'brief' && i < state.index ? 'bg-pulse' : state.phase !== 'brief' && i === state.index ? 'bg-blush' : 'bg-white/10')} />
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6">
        {state.phase === 'brief' ? (
          <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
            <PatientCard c={caseData} vitals={vitals} prev={vitals} history={hist.items} newCount={0} defaultOpen />
            <section className="glass p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <DifficultyBadge level={caseData.difficulty} />
                <span className="chip">{cat.label}</span>
                <span className="chip num"><Clock size={12} aria-hidden />{caseData.durationMin} min</span>
              </div>
              <h2 className="mt-4 font-display text-2xl font-semibold">Skenario</h2>
              <p className="mt-2 leading-relaxed text-slate-200">{caseData.scenario}</p>
              <h3 className="label mt-6">Tujuan</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-200">{caseData.objectives.map((o) => <li key={o} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pulse" aria-hidden />{o}</li>)}</ul>
              {caseData.references && caseData.references.length > 0 && (
                <p className="mt-5 flex gap-2 text-xs leading-relaxed text-slate-400"><BookOpen size={14} className="mt-0.5 shrink-0" aria-hidden /><span>Rujukan: {caseData.references.map((r) => r.title + (r.org ? ` (${r.org})` : '')).join('; ')}. Selalu ikuti protokol institusimu.</span></p>
              )}
              <h3 className="label mt-7">Pilih mode</h3>
              <div role="radiogroup" aria-label="Mode" className="mt-2 grid gap-3 sm:grid-cols-2">
                {([
                  ['practice', 'MODE LATIHAN', 'Feedback langsung setiap langkah, ada penjelasan, timer berhenti saat kamu membaca.'],
                  ['exam', 'MODE UJIAN', 'Timer terus berjalan, tanpa feedback sampai selesai, station berhenti saat waktu habis.'],
                ] as const).map(([m, t, d]) => (
                  <button key={m} type="button" role="radio" aria-checked={modeChoice === m} onClick={() => { setModeChoice(m); sfx.click(); }}
                    className={cn('min-h-[72px] rounded-2xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-pulse', modeChoice === m ? 'border-pulse bg-pulse/10 shadow-glow' : 'border-white/12 bg-white/[0.04] hover:bg-white/[0.07]')}>
                    <span className="block font-display text-sm font-semibold tracking-wide">{t}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-300">{d}</span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { sfx.click(); dispatch({ type: 'START', mode: modeChoice }); }} className="btn btn-primary mt-7 w-full sm:w-auto sm:min-w-[240px]"><Play size={16} aria-hidden />MULAI TIMER</button>
            </section>
          </div>
        ) : step ? (
          <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
            <PatientCard c={caseData} vitals={vitals} prev={prevVitals} history={hist.items} newCount={hist.newCount} defaultOpen={false} />
            <AnimatePresence mode="wait">
              <motion.div key={`${step.id}-${state.index}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
                <Challenge
                  step={step} seed={`${runKey}:${step.id}`} locked={state.phase === 'feedback'} exam={exam}
                  record={state.phase === 'feedback' ? state.lastAnswer : null}
                  isLast={state.index + 1 >= state.queue.length}
                  onSubmit={submit} onNext={() => dispatch({ type: 'NEXT', elapsedMs: clock.get() })}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        ) : null}

        <p className="mt-10 text-xs text-slate-500">Hanya simulasi edukasi. Tidak dimaksudkan menggantikan bimbingan dosen, protokol institusi, atau supervisi klinis.</p>
      </main>

      <Modal open={exitOpen} title="Tinggalkan station ini?" onClose={() => setExitOpen(false)}>
        <p>Progresmu pada percobaan ini akan hilang dan skor tidak disimpan.</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button className="btn btn-danger" onClick={() => router.push('/stations')}>Tinggalkan station</button>
          <button className="btn btn-ghost" data-autofocus onClick={() => setExitOpen(false)}>Lanjutkan</button>
        </div>
      </Modal>
    </div>
  );
}

function Challenge({ step, seed, locked, exam, record, isLast, onSubmit, onNext }: {
  step: Step; seed: string; locked: boolean; exam: boolean; record: import('@/lib/types').AnswerRecord | null; isLast: boolean;
  onSubmit: (r: unknown) => void; onNext: () => void;
}) {
  const fbRef = useRef<HTMLDivElement>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const shuffledOptions = useMemo(() => (step.type === 'mcq' || step.type === 'branching' ? shuffleSeeded(step.options, seed) : []), [step, seed]);
  const shuffledItems = useMemo(() => (step.type === 'equipment' || step.type === 'find-error' ? shuffleSeeded(step.items, seed) : []), [step, seed]);
  const [order, setOrder] = useState<string[]>(() => (step.type === 'sequence' ? shuffleSeeded(step.items.map((i) => i.id), seed, true) : []));

  useEffect(() => { if (locked) fbRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [locked]);

  const valid = step.type === 'sequence' ? true : step.type === 'mcq' || step.type === 'branching' ? choice !== null : picked.length > 0;
  const response = step.type === 'sequence' ? order : step.type === 'mcq' || step.type === 'branching' ? choice : picked;

  let mark: ((id: string) => Mark) | undefined;
  if (step.type === 'mcq') mark = (id) => (id === step.correct ? 'correct' : id === choice ? 'wrong' : undefined);
  if (step.type === 'branching') {
    mark = (id) => {
      const o = step.options.find((x) => x.id === id);
      if (!o) return undefined;
      if (o.score === 100) return 'correct';
      return id === choice ? (o.score > 0 ? 'partial' : 'wrong') : undefined;
    };
  }
  const showMarks = locked && !exam;

  return (
    <section className="glass p-5 sm:p-7" aria-label="Challenge">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip border-pulse/40 text-pulse">{TYPE_LABEL[step.type]}</span>
        {step.remedial && <span className="chip border-blush/40 text-blush"><ShieldAlert size={12} aria-hidden />LANJUTAN</span>}
        {step.title && <span className="text-xs font-medium tracking-wide text-slate-400">{step.title}</span>}
      </div>
      {step.situation && (
        <div className="mt-4 flex gap-3 rounded-2xl border border-warn/30 bg-warn/10 p-4 text-sm leading-relaxed">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden />
          <p><span className="label mr-2 text-warn">SITUASI</span>{step.situation}</p>
        </div>
      )}
      <h2 className="mt-5 font-display text-xl font-semibold leading-snug sm:text-2xl">{step.prompt}</h2>
      {'instruction' in step && step.instruction && <p className="mt-1.5 text-sm text-slate-300">{step.instruction}</p>}
      {step.type === 'sequence' && <p className="mt-1.5 text-sm text-slate-300">Seret pegangan di kanan, atau gunakan tombol panah untuk mengurutkan.</p>}

      <div className="mt-5">
        {(step.type === 'mcq' || step.type === 'branching') && (
          <ChoiceList options={shuffledOptions} value={choice} onChange={(id) => { setChoice(id); sfx.click(); }} locked={locked} mark={showMarks ? mark : undefined} />
        )}
        {step.type === 'sequence' && (
          <SequenceList items={step.items} order={order} setOrder={setOrder} locked={locked} correctOrder={showMarks ? step.items.map((i) => i.id) : undefined} />
        )}
        {(step.type === 'equipment' || step.type === 'find-error') && (
          <SelectGrid items={shuffledItems} selected={picked} locked={locked}
            onToggle={(id) => { setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])); sfx.click(); }} />
        )}
      </div>

      {!locked && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" disabled={!valid} onClick={() => onSubmit(response)} className="btn btn-primary w-full sm:w-auto sm:min-w-[220px]">{exam ? 'KONFIRMASI & LANJUT' : 'KONFIRMASI JAWABAN'}</button>
          {(step.type === 'equipment' || step.type === 'find-error') && <span className="text-sm text-slate-400">{picked.length} dipilih</span>}
          {!valid && step.type !== 'sequence' && <span className="text-sm text-slate-400">{step.type === 'mcq' || step.type === 'branching' ? 'Pilih satu jawaban' : 'Pilih minimal satu item'}</span>}
        </div>
      )}
      {locked && record && !exam && <div className="mt-6"><FeedbackPanel ref={fbRef} step={step} record={record} lastStep={isLast} onNext={onNext} /></div>}
    </section>
  );
}
