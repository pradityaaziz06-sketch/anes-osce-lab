'use client';
import clsx from 'clsx';
import { useEffect, useRef, type ReactNode } from 'react';
import type { Difficulty } from '@/lib/types';

export const cn = clsx;

export function ProgressBar({ value, tone = 'pulse', label, className }: { value: number; tone?: 'pulse' | 'blush' | 'ok' | 'warn'; label?: string; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const bg = { pulse: 'from-pulse to-med', blush: 'from-blush to-blush-soft', ok: 'from-ok to-pulse', warn: 'from-warn to-blush' }[tone];
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-white/10', className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn('h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out', bg)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function ScoreRing({ value, size = 168, stroke = 12, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22D3EE" />
            <stop offset="1" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ring)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * v) / 100} style={{ transition: 'stroke-dashoffset 900ms ease-out' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

const DIFF_STYLE: Record<Difficulty, string> = {
  BEGINNER: 'border-ok/40 bg-ok/10 text-ok',
  INTERMEDIATE: 'border-warn/40 bg-warn/10 text-warn',
  ADVANCED: 'border-blush/50 bg-blush/10 text-blush',
};
export const DIFF_LABEL: Record<Difficulty, string> = { BEGINNER: 'PEMULA', INTERMEDIATE: 'MENENGAH', ADVANCED: 'LANJUTAN' };
export const SYNC_LABEL: Record<string, string> = { local: 'lokal', idle: 'siaga', syncing: 'menyinkronkan', ok: 'berhasil', error: 'gagal' };

export function DifficultyBadge({ level }: { level: Difficulty }) {
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wider', DIFF_STYLE[level])}>{DIFF_LABEL[level]}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-white/[0.06]', className)} aria-hidden />;
}
export function PageSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Memuat">
      <Skeleton className="h-10 w-2/3" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      <Skeleton className="h-64" />
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="glass mx-auto max-w-lg p-8 text-center">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-slate-300">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-ink-950/80 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="glass-solid w-full max-w-md p-6">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <div className="mt-2 text-sm text-slate-300">{children}</div>
      </div>
    </div>
  );
}
