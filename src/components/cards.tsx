'use client';
import Link from 'next/link';
import { Award, CheckCircle2, Clock, Flag, Flame, Gem, Layers, Lock, Play, RotateCcw, ShieldCheck, Star, Trophy, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ACHIEVEMENTS, type AchievementDef } from '@/lib/achievements';
import type { CaseStat } from '@/lib/analytics';
import { categoryMeta, type CategoryMeta } from '@/lib/categories';
import type { CaseData } from '@/lib/types';
import type { LevelInfo } from '@/lib/xp';
import { cn, DifficultyBadge, ProgressBar } from './ui';

export function StatCard({ label, value, icon: Icon, hint }: { label: string; value: ReactNode; icon: LucideIcon; hint?: string }) {
  return (
    <div className="glass p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        <Icon size={16} className="text-pulse" aria-hidden />
      </div>
      <div className="num mt-3 font-display text-3xl font-semibold">{value}</div>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function XpBar({ level, compact = false }: { level: LevelInfo; compact?: boolean }) {
  return (
    <div className={cn('glass', compact ? 'p-4' : 'p-5')}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-display text-lg font-semibold">Level {level.level}</span>
        <span className="num text-xs text-slate-300">{level.current} / {level.need} XP</span>
      </div>
      <ProgressBar value={level.pct} className="mt-3" label={`Progres menuju level ${level.level + 1}`} />
      <p className="mt-2 text-xs text-slate-400">{level.total} XP terkumpul</p>
    </div>
  );
}

export function CategoryCard({ meta, total, done }: { meta: CategoryMeta; total: number; done: number }) {
  const Icon = meta.icon;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const action = done === 0 ? 'MULAI' : done < total ? 'LANJUTKAN' : 'LATIH LAGI';
  return (
    <div className={cn('glass flex flex-col p-5', total === 0 && 'opacity-70')}>
      <div className="flex items-start justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-2xl border border-pulse/25 bg-pulse/10 text-pulse"><Icon size={20} aria-hidden /></span>
        <span className="num text-xs text-slate-400">{done}/{total}</span>
      </div>
      <h3 className="mt-4 font-display text-[15px] font-semibold tracking-wide">{meta.label}</h3>
      <p className="text-sm text-slate-300">{total} Kasus</p>
      <ProgressBar value={pct} className="mt-4" tone={pct === 100 ? 'ok' : 'pulse'} label={`Progres ${meta.label}`} />
      <p className="mt-1.5 text-xs text-slate-400">{total ? `${done}/${total} selesai` : 'Belum ada kasus'}</p>
      <div className="mt-auto pt-4">
        {total > 0 ? (
          <Link href={`/stations?category=${meta.id}`} className="btn btn-ghost w-full">{action}</Link>
        ) : (
          <span className="chip">Segera hadir</span>
        )}
      </div>
    </div>
  );
}

export function StationCard({ c, stat }: { c: CaseData; stat?: CaseStat }) {
  const cat = categoryMeta(c.category);
  const Icon = cat.icon;
  return (
    <article className="glass group relative flex flex-col overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="num font-display text-4xl font-semibold text-white/15" aria-label={`Station ${c.number}`}>{String(c.number).padStart(2, '0')}</span>
        <DifficultyBadge level={c.difficulty} />
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold leading-snug">{c.title}</h3>
      <p className="mt-1 flex items-center gap-1.5 text-xs font-medium tracking-wide text-pulse"><Icon size={13} aria-hidden />{cat.label}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">{c.summary}</p>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl bg-white/[0.05] p-2.5">
          <dt className="text-slate-400">Waktu</dt>
          <dd className="num mt-0.5 flex items-center gap-1 font-semibold"><Clock size={12} aria-hidden />{c.durationMin} mnt</dd>
        </div>
        <div className="rounded-xl bg-white/[0.05] p-2.5">
          <dt className="text-slate-400">Status</dt>
          <dd className={cn('mt-0.5 flex items-center gap-1 font-semibold', stat?.completed ? 'text-ok' : 'text-slate-200')}>
            {stat?.completed ? <><CheckCircle2 size={12} aria-hidden />Selesai</> : 'Baru'}
          </dd>
        </div>
        <div className="rounded-xl bg-white/[0.05] p-2.5">
          <dt className="text-slate-400">Terbaik</dt>
          <dd className="num mt-0.5 font-semibold">{stat ? stat.best : '—'}</dd>
        </div>
      </dl>
      <Link href={`/simulate/${c.id}`} className={cn('btn mt-5 w-full', stat?.completed ? 'btn-ghost' : 'btn-primary')} aria-label={`${stat?.completed ? 'Ulangi' : 'Mulai'} station ${c.number}: ${c.title}`}>
        {stat?.completed ? <><RotateCcw size={16} aria-hidden />ULANGI STATION</> : <><Play size={16} aria-hidden />MULAI STATION</>}
      </Link>
    </article>
  );
}

const ICONS: Record<AchievementDef['icon'], LucideIcon> = { flag: Flag, star: Star, trophy: Trophy, gem: Gem, flame: Flame, shield: ShieldCheck, layers: Layers };

export function BadgeGrid({ unlocked, highlight = [] }: { unlocked: Record<string, string>; highlight?: string[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {ACHIEVEMENTS.map((a) => {
        const on = Boolean(unlocked[a.code]) || highlight.includes(a.code);
        const Icon = on ? ICONS[a.icon] : Lock;
        return (
          <li key={a.code} className={cn('glass flex items-center gap-3 p-3.5', !on && 'opacity-55')}>
            <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl border', on ? 'border-blush/50 bg-blush/10 text-blush' : 'border-white/10 bg-white/5 text-slate-500')}><Icon size={20} aria-hidden /></span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{a.label}</span>
              <span className="block text-xs leading-snug text-slate-400">{on ? 'Terbuka' : a.desc}</span>
            </span>
            {on && <Award size={14} className="ml-auto shrink-0 text-blush" aria-label="Terbuka" />}
          </li>
        );
      })}
    </ul>
  );
}
