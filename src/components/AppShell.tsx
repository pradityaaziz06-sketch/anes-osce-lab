'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Cloud, LayoutDashboard, Layers, User, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { useStore } from '@/lib/store';
import { cn } from './ui';
import { Logo } from './Logo';
import { SoundToggle } from './SoundToggle';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/stations', label: 'Station', icon: Layers },
  { href: '/performance', label: 'Performa', icon: BarChart3 },
  { href: '/profile', label: 'Profil', icon: User },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 pb-24 pt-8 text-xs text-slate-400 md:pb-10">
      <p className="max-w-2xl leading-relaxed">
        <strong className="font-semibold text-slate-200">Hanya simulasi edukasi.</strong>{' '}
        Tidak dimaksudkan menggantikan bimbingan dosen, protokol institusi, atau supervisi klinis.
      </p>
      <p className="mt-3 font-medium tracking-wide text-slate-500">D4 KEPERAWATAN ANESTESIOLOGI · POLITEKNIK TIARA BUNDA · CINERE, DEPOK</p>
    </footer>
  );
}

export function AppShell({ children, bottomNav = true, wide = false }: { children: ReactNode; bottomNav?: boolean; wide?: boolean }) {
  const path = usePathname();
  const { level, cloudEnabled, user, sync } = useStore();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/75 backdrop-blur-xl">
        <div className={cn('mx-auto flex h-16 items-center justify-between gap-3 px-4 sm:px-6', wide ? 'max-w-[1400px]' : 'max-w-6xl')}>
          <Link href="/" aria-label="Beranda ANES OSCE LAB" className="rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-pulse"><Logo /></Link>
          <nav aria-label="Utama" className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => {
              const active = path === n.href || (n.href !== '/dashboard' && path.startsWith(n.href));
              return (
                <Link key={n.href} href={n.href} aria-current={active ? 'page' : undefined} className={cn('rounded-xl px-3.5 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-pulse', active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white')}>
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/profile" className="chip hidden sm:inline-flex" aria-label={`Level ${level.level}`}><Zap size={13} className="text-pulse" />Level {level.level}</Link>
            {cloudEnabled && (
              <Link href="/auth" className="chip" aria-label={user ? 'Akun sinkronisasi cloud' : 'Masuk untuk sinkronisasi'}>
                <Cloud size={13} className={sync === 'error' ? 'text-bad' : user ? 'text-ok' : 'text-slate-400'} />
                <span className="hidden sm:inline">{user ? 'Tersinkron' : 'Masuk'}</span>
              </Link>
            )}
            <SoundToggle />
          </div>
        </div>
      </header>

      <main id="main" className={cn('mx-auto px-4 pb-6 pt-6 sm:px-6 sm:pt-8', wide ? 'max-w-[1400px]' : 'max-w-6xl')}>
        {children}
        <Footer />
      </main>

      {bottomNav && (
        <nav aria-label="Utama seluler" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-950/90 backdrop-blur-xl md:hidden">
          <ul className="mx-auto grid max-w-md grid-cols-4">
            {NAV.map((n) => {
              const active = path === n.href || (n.href !== '/dashboard' && path.startsWith(n.href));
              const Icon = n.icon;
              return (
                <li key={n.href}>
                  <Link href={n.href} aria-current={active ? 'page' : undefined} className={cn('flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-medium', active ? 'text-pulse' : 'text-slate-400')}>
                    <Icon size={20} />
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
