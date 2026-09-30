'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageSkeleton, SYNC_LABEL } from '@/components/ui';
import { useStore } from '@/lib/store';

export default function AuthPage() {
  const { ready, cloudEnabled, user, signIn, signUp, signOut, sync, syncMessage } = useStore();
  const router = useRouter();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const err = mode === 'in' ? await signIn(email, pw) : await signUp(email, pw);
    setBusy(false);
    if (err) setMsg(err); else router.push('/dashboard');
  };

  return (
    <AppShell>
      {!ready ? <PageSkeleton /> : (
        <div className="mx-auto max-w-md">
          {!cloudEnabled ? (
            <div className="glass p-7">
              <p className="label">Mode lokal</p>
              <h1 className="mt-2 font-display text-2xl font-semibold">Sinkronisasi cloud belum dikonfigurasi</h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">Aplikasi berjalan penuh di browser ini. Untuk masuk dan sinkronisasi antar perangkat, tambahkan URL dan anon key Supabase ke <code className="rounded bg-white/10 px-1.5">.env.local</code> (lihat README).</p>
              <Link href="/dashboard" className="btn btn-primary mt-6 w-full">Lanjut sebagai tamu</Link>
            </div>
          ) : user ? (
            <div className="glass p-7">
              <p className="label">Akun</p>
              <h1 className="mt-2 font-display text-2xl font-semibold">Sudah masuk</h1>
              <p className="mt-2 text-sm text-slate-300">{user.email}</p>
              <p className="mt-1 text-sm text-slate-400" role="status">Status sinkronisasi: {SYNC_LABEL[sync] ?? sync}{syncMessage ? ` (${syncMessage})` : ''}</p>
              <div className="mt-6 grid gap-3"><Link href="/dashboard" className="btn btn-primary">Ke dashboard</Link><button className="btn btn-ghost" onClick={() => void signOut()}>Keluar</button></div>
            </div>
          ) : (
            <form onSubmit={submit} className="glass space-y-4 p-7">
              <p className="label">Sinkronisasi cloud</p>
              <h1 className="font-display text-2xl font-semibold">{mode === 'in' ? 'Masuk' : 'Buat akun'}</h1>
              <label className="block"><span className="label">Email</span><input className="field mt-1.5" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              <label className="block"><span className="label">Kata sandi</span><input className="field mt-1.5" type="password" required minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={pw} onChange={(e) => setPw(e.target.value)} /></label>
              {msg && <p className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm" role="alert">{msg}</p>}
              <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Mohon tunggu…' : mode === 'in' ? 'Masuk' : 'Buat akun'}</button>
              <button type="button" className="btn btn-ghost w-full" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null); }}>{mode === 'in' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}</button>
              <Link href="/dashboard" className="block text-center text-sm text-slate-400 hover:text-white">Lanjut sebagai tamu</Link>
              <p className="text-xs text-slate-500">Progres tamu yang sudah ada akan diunggah saat pertama kali kamu masuk ke akun yang masih kosong.</p>
            </form>
          )}
        </div>
      )}
    </AppShell>
  );
}
