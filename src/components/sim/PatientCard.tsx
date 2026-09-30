'use client';
import { ChevronDown, User } from 'lucide-react';
import { useState } from 'react';
import { EcgTrace } from '@/components/EcgTrace';
import { cn } from '@/components/ui';
import type { CaseData, Vitals } from '@/lib/types';

type Status = 'ok' | 'warn' | 'bad';
function status(key: keyof Vitals, v: Vitals): Status {
  const n = (x: number | undefined) => (typeof x === 'number' ? x : NaN);
  switch (key) {
    case 'spo2': return n(v.spo2) < 90 ? 'bad' : n(v.spo2) < 94 ? 'warn' : 'ok';
    case 'hr': return n(v.hr) > 120 || n(v.hr) < 40 ? 'bad' : n(v.hr) > 100 || n(v.hr) < 50 ? 'warn' : 'ok';
    case 'bp': {
      const sys = parseInt((v.bp ?? '').split('/')[0], 10);
      return sys < 80 ? 'bad' : sys < 90 || sys > 160 ? 'warn' : 'ok';
    }
    case 'temp': return n(v.temp) < 35 || n(v.temp) > 39 ? 'bad' : n(v.temp) < 36 || n(v.temp) > 38 ? 'warn' : 'ok';
    case 'rr': return n(v.rr) < 8 ? 'bad' : n(v.rr) < 10 || n(v.rr) > 24 ? 'warn' : 'ok';
    default: return 'ok';
  }
}

const TILES: { key: keyof Vitals; label: string; unit: string; color: string; fmt?: (x: number) => string }[] = [
  { key: 'bp', label: 'TD', unit: 'mmHg', color: 'text-white' },
  { key: 'hr', label: 'HR', unit: 'bpm', color: 'text-ok' },
  { key: 'spo2', label: 'SpO₂', unit: '%', color: 'text-pulse' },
  { key: 'temp', label: 'SUHU', unit: '°C', color: 'text-blush', fmt: (x) => x.toFixed(1) },
  { key: 'rr', label: 'RR', unit: '/min', color: 'text-warn' },
  { key: 'etco2', label: 'EtCO₂', unit: 'mmHg', color: 'text-warn' },
];

export function PatientCard({ c, vitals, prev, history, newCount, collapsible = true, defaultOpen = true }: {
  c: CaseData; vitals: Vitals; prev: Vitals; history: string[]; newCount: number; collapsible?: boolean; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const tiles = TILES.filter((t) => vitals[t.key] !== undefined);
  return (
    <aside className="space-y-4 lg:sticky lg:top-40 lg:self-start" aria-label="Informasi pasien">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-ink-900/90 shadow-soft" aria-label="Tanda vital">
        <div className="relative h-14 border-b border-white/10 bg-ink-950/70">
          <EcgTrace className="absolute inset-0 h-full w-full px-2" color="#34D399" />
          <span className="label absolute left-4 top-2 text-ok/80">TANDA VITAL</span>
        </div>
        <dl className="grid grid-cols-2 gap-px bg-white/5">
          {tiles.map((t) => {
            const val = vitals[t.key];
            const before = prev[t.key];
            const changed = before !== undefined && before !== val;
            const st = status(t.key, vitals);
            const text = typeof val === 'number' && t.fmt ? t.fmt(val) : String(val);
            return (
              <div key={t.key} className={cn('bg-ink-900 p-3.5', changed && 'bg-ink-800', st === 'bad' && 'shadow-[inset_0_0_0_1px_rgba(251,113,133,.55)]', st === 'warn' && 'shadow-[inset_0_0_0_1px_rgba(251,191,36,.4)]')}>
                <dt className="flex items-center justify-between text-[11px] font-semibold tracking-widest text-slate-400">
                  {t.label}
                  {changed && <span className="rounded bg-blush/20 px-1.5 text-[10px] text-blush">BERUBAH</span>}
                </dt>
                <dd className={cn('num mt-1 text-2xl font-semibold', t.color, st === 'bad' && 'text-bad')}>
                  {text}<span className="ml-1 text-[11px] font-medium text-slate-500">{t.unit}</span>
                  <span className="sr-only">{st === 'ok' ? '' : st === 'warn' ? ' (abnormal)' : ' (kritis)'}</span>
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section className="glass p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold tracking-wide"><User size={16} className="text-pulse" aria-hidden />PASIEN</h2>
          {collapsible && (
            <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-[44px] items-center gap-1 rounded-xl px-2 text-xs font-medium text-slate-300 lg:hidden">
              {open ? 'Sembunyikan' : 'Tampilkan'} detail <ChevronDown size={14} className={cn('transition', open && 'rotate-180')} aria-hidden />
            </button>
          )}
        </div>
        <div className={cn(open ? 'block' : 'hidden', 'lg:block')}>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-slate-400">Jenis kelamin</dt><dd>{c.patient.sex}</dd>
            <dt className="text-slate-400">Usia</dt><dd>{c.patient.age} tahun</dd>
            <dt className="text-slate-400">Prosedur</dt><dd>{c.patient.procedure}</dd>
            {c.patient.note && (<><dt className="text-slate-400">Catatan</dt><dd>{c.patient.note}</dd></>)}
          </dl>
          <h3 className="label mt-5">Riwayat pasien</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {history.map((h, i) => {
              const isNew = i >= history.length - newCount;
              return (
                <li key={h} className={cn('flex gap-2 rounded-xl px-2.5 py-1.5 leading-snug', isNew ? 'border border-blush/40 bg-blush/10 text-blush-soft' : 'text-slate-200')}>
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pulse" aria-hidden />{h}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </aside>
  );
}
