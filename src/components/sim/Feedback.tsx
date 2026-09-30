'use client';
import { AlertTriangle, CheckCircle2, Lightbulb, XCircle } from 'lucide-react';
import { forwardRef } from 'react';
import { cn } from '@/components/ui';
import { describeCorrect } from '@/lib/describe';
import type { AnswerRecord, Step } from '@/lib/types';

export const FeedbackPanel = forwardRef<HTMLDivElement, { step: Step; record: AnswerRecord; lastStep: boolean; onNext: () => void }>(
  function FeedbackPanel({ step, record, lastStep, onNext }, ref) {
    const kind = record.correct ? 'ok' : record.score > 0 ? 'partial' : 'bad';
    const head = { ok: 'BENAR', partial: 'SEBAGIAN BENAR', bad: 'BUKAN PILIHAN TERBAIK' }[kind];
    const Icon = { ok: CheckCircle2, partial: AlertTriangle, bad: XCircle }[kind];
    const chosen = step.type === 'branching' ? step.options.find((o) => o.id === record.response) : null;
    const sel = Array.isArray(record.response) ? (record.response as string[]) : [];
    const missed = step.type === 'equipment' || step.type === 'find-error' ? step.items.filter((i) => i.correct && !sel.includes(i.id)) : [];
    const extra = step.type === 'equipment' || step.type === 'find-error' ? step.items.filter((i) => !i.correct && sel.includes(i.id)) : [];
    return (
      <div ref={ref} className="scroll-mt-40 space-y-4" role="region" aria-live="polite" aria-label="Umpan balik">
        <div className={cn('rounded-2xl border p-4', kind === 'ok' ? 'border-ok/50 bg-ok/10' : kind === 'partial' ? 'border-warn/50 bg-warn/10' : 'border-bad/50 bg-bad/10')}>
          <div className="flex items-center justify-between gap-3">
            <p className={cn('flex items-center gap-2 font-display text-base font-semibold', kind === 'ok' ? 'text-ok' : kind === 'partial' ? 'text-warn' : 'text-bad')}><Icon size={20} aria-hidden />{head}</p>
            <span className="num text-sm text-slate-200">{record.score}/100{record.correct && <span className="ml-2 text-ok">+100 XP</span>}</span>
          </div>
          {chosen && <p className="mt-3 text-sm text-slate-100"><span className="label mr-2">Konsekuensi</span>{chosen.consequence}</p>}
          <p className="mt-3 text-sm leading-relaxed text-slate-100"><span className="label mr-2">Penjelasan</span>{step.explanation}</p>
          {step.type === 'mcq' && !record.correct && <p className="mt-3 text-sm text-slate-100"><span className="label mr-2">Jawaban terbaik</span>{describeCorrect(step)[0]}</p>}
          {step.type === 'branching' && !record.correct && <p className="mt-3 text-sm text-slate-100"><span className="label mr-2">Tindakan terbaik</span>{describeCorrect(step)[0]}</p>}
          {step.type === 'sequence' && !record.correct && (
            <div className="mt-3 text-sm text-slate-100"><span className="label">Urutan yang benar</span><ol className="mt-1.5 list-decimal space-y-1 pl-5">{step.items.map((i) => <li key={i.id}>{i.text}</li>)}</ol></div>
          )}
          {missed.length > 0 && <div className="mt-3 text-sm text-slate-100"><span className="label">Yang terlewat</span><ul className="mt-1.5 space-y-1">{missed.map((i) => <li key={i.id}>• {i.label}{i.why && <span className="text-slate-400"> — {i.why}</span>}</li>)}</ul></div>}
          {extra.length > 0 && <div className="mt-3 text-sm text-slate-100"><span className="label">Tidak diperlukan</span><ul className="mt-1.5 space-y-1">{extra.map((i) => <li key={i.id}>• {i.label}{i.why && <span className="text-slate-400"> — {i.why}</span>}</li>)}</ul></div>}
        </div>
        <div className="flex gap-3 rounded-2xl border border-pulse/30 bg-pulse/10 p-4">
          <Lightbulb size={20} className="mt-0.5 shrink-0 text-pulse" aria-hidden />
          <div><p className="label text-pulse">POIN KUNCI</p><p className="mt-1 text-sm leading-relaxed">{step.takeaway}</p></div>
        </div>
        <button type="button" onClick={onNext} className="btn btn-primary w-full sm:w-auto" autoFocus>{lastStep ? 'SELESAIKAN STATION' : 'LANJUT'}</button>
      </div>
    );
  },
);
