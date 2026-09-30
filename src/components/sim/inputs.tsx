'use client';
import { Reorder, useDragControls } from 'framer-motion';
import { ArrowDown, ArrowUp, Check, GripVertical, X } from 'lucide-react';
import { cn } from '@/components/ui';
import type { Option, SelectItem } from '@/lib/types';

export type Mark = 'correct' | 'wrong' | 'partial' | 'missed' | undefined;
const MARK: Record<Exclude<Mark, undefined>, string> = {
  correct: 'border-ok/70 bg-ok/10',
  wrong: 'border-bad/70 bg-bad/10',
  partial: 'border-warn/70 bg-warn/10',
  missed: 'border-dashed border-warn/70 bg-warn/5',
};

export function ChoiceList({ options, value, onChange, locked, mark }: {
  options: Option[]; value: string | null; onChange: (id: string) => void; locked: boolean; mark?: (id: string) => Mark;
}) {
  return (
    <div role="radiogroup" className="grid gap-3">
      {options.map((o, i) => {
        const selected = value === o.id;
        const m = locked ? mark?.(o.id) : undefined;
        return (
          <button key={o.id} type="button" role="radio" aria-checked={selected} disabled={locked} onClick={() => onChange(o.id)}
            className={cn('flex min-h-[56px] w-full items-start gap-3 rounded-2xl border p-3.5 text-left text-[15px] leading-snug transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-pulse disabled:cursor-default',
              m ? MARK[m] : selected ? 'border-pulse bg-pulse/10 shadow-glow' : 'border-white/12 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.07]')}>
            <span className={cn('num grid h-8 w-8 shrink-0 place-items-center rounded-xl border text-sm font-semibold', selected ? 'border-pulse bg-pulse text-ink-950' : 'border-white/20 text-slate-300')}>{String.fromCharCode(65 + i)}</span>
            <span className="pt-1">{o.text}</span>
            {m === 'correct' && <Check size={18} className="ml-auto mt-1 shrink-0 text-ok" aria-label="Best answer" />}
            {m === 'wrong' && <X size={18} className="ml-auto mt-1 shrink-0 text-bad" aria-label="Your answer, not the best" />}
          </button>
        );
      })}
    </div>
  );
}

function Row({ id, text, index, count, locked, mark, correctPos, onMove }: {
  id: string; text: string; index: number; count: number; locked: boolean; mark?: Mark; correctPos?: number; onMove: (from: number, to: number) => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={id} dragListener={false} dragControls={controls} whileDrag={{ scale: 1.02, boxShadow: '0 12px 40px rgba(34,211,238,.25)' }}
      className={cn('flex items-center gap-3 rounded-2xl border p-3 text-[15px] leading-snug', mark ? MARK[mark] : 'border-white/12 bg-ink-800/80')}>
      <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/20 text-sm font-semibold text-slate-200">{index + 1}</span>
      <span className="flex-1">{text}{locked && mark === 'wrong' && correctPos !== undefined && <span className="mt-0.5 block text-xs text-slate-400">Correct position: {correctPos + 1}</span>}</span>
      {!locked && (
        <span className="flex shrink-0 items-center gap-1">
          <button type="button" aria-label={`Move up: ${text}`} disabled={index === 0} onClick={() => onMove(index, index - 1)} className="grid h-11 w-9 place-items-center rounded-xl text-slate-300 hover:bg-white/10 disabled:opacity-25"><ArrowUp size={16} /></button>
          <button type="button" aria-label={`Move down: ${text}`} disabled={index === count - 1} onClick={() => onMove(index, index + 1)} className="grid h-11 w-9 place-items-center rounded-xl text-slate-300 hover:bg-white/10 disabled:opacity-25"><ArrowDown size={16} /></button>
          <span onPointerDown={(e) => controls.start(e)} className="grid h-11 w-9 cursor-grab touch-none place-items-center rounded-xl text-slate-400 hover:bg-white/10 active:cursor-grabbing" aria-hidden><GripVertical size={18} /></span>
        </span>
      )}
    </Reorder.Item>
  );
}

export function SequenceList({ items, order, setOrder, locked, correctOrder }: {
  items: Option[]; order: string[]; setOrder: (o: string[]) => void; locked: boolean; correctOrder?: string[];
}) {
  const text = (id: string) => items.find((i) => i.id === id)?.text ?? id;
  const move = (from: number, to: number) => {
    const next = [...order];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setOrder(next);
  };
  return (
    <Reorder.Group axis="y" values={order} onReorder={locked ? () => undefined : setOrder} className="grid gap-2.5" aria-label="Sequence. Drag the handle or use the arrow buttons.">
      {order.map((id, i) => (
        <Row key={id} id={id} text={text(id)} index={i} count={order.length} locked={locked} onMove={move}
          mark={locked && correctOrder ? (correctOrder[i] === id ? 'correct' : 'wrong') : undefined}
          correctPos={correctOrder ? correctOrder.indexOf(id) : undefined} />
      ))}
    </Reorder.Group>
  );
}

export function SelectGrid({ items, selected, onToggle, locked }: {
  items: SelectItem[]; selected: string[]; onToggle: (id: string) => void; locked: boolean;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((it) => {
        const on = selected.includes(it.id);
        let m: Mark;
        if (locked) m = on ? (it.correct ? 'correct' : 'wrong') : it.correct ? 'missed' : undefined;
        return (
          <li key={it.id}>
            <button type="button" aria-pressed={on} disabled={locked} onClick={() => onToggle(it.id)}
              className={cn('flex min-h-[56px] w-full items-start gap-3 rounded-2xl border p-3.5 text-left text-[15px] leading-snug transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-pulse disabled:cursor-default',
                m ? MARK[m] : on ? 'border-pulse bg-pulse/10 shadow-glow' : 'border-white/12 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.07]')}>
              <span className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border', on ? 'border-pulse bg-pulse text-ink-950' : 'border-white/25')}>{on && <Check size={14} strokeWidth={3} />}</span>
              <span>{it.label}{locked && m === 'missed' && <span className="mt-0.5 block text-xs text-warn">Missed</span>}{locked && m === 'wrong' && <span className="mt-0.5 block text-xs text-bad">Not needed</span>}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
