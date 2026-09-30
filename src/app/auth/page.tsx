'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageSkeleton } from '@/components/ui';
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
              <p className="label">Local mode</p>
              <h1 className="mt-2 font-display text-2xl font-semibold">Cloud sync is not configured</h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">The app works fully offline in this browser. To sign in and sync across devices, add your Supabase URL and anon key to <code className="rounded bg-white/10 px-1.5">.env.local</code> (see README).</p>
              <Link href="/dashboard" className="btn btn-primary mt-6 w-full">Continue as guest</Link>
            </div>
          ) : user ? (
            <div className="glass p-7">
              <p className="label">Account</p>
              <h1 className="mt-2 font-display text-2xl font-semibold">Signed in</h1>
              <p className="mt-2 text-sm text-slate-300">{user.email}</p>
              <p className="mt-1 text-sm text-slate-400" role="status">Sync status: {sync}{syncMessage ? ` (${syncMessage})` : ''}</p>
              <div className="mt-6 grid gap-3"><Link href="/dashboard" className="btn btn-primary">Go to dashboard</Link><button className="btn btn-ghost" onClick={() => void signOut()}>Sign out</button></div>
            </div>
          ) : (
            <form onSubmit={submit} className="glass space-y-4 p-7">
              <p className="label">Cloud sync</p>
              <h1 className="font-display text-2xl font-semibold">{mode === 'in' ? 'Sign in' : 'Create account'}</h1>
              <label className="block"><span className="label">Email</span><input className="field mt-1.5" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              <label className="block"><span className="label">Password</span><input className="field mt-1.5" type="password" required minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={pw} onChange={(e) => setPw(e.target.value)} /></label>
              {msg && <p className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm" role="alert">{msg}</p>}
              <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
              <button type="button" className="btn btn-ghost w-full" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null); }}>{mode === 'in' ? 'Need an account? Sign up' : 'Have an account? Sign in'}</button>
              <Link href="/dashboard" className="block text-center text-sm text-slate-400 hover:text-white">Continue as guest</Link>
              <p className="text-xs text-slate-500">Your existing guest progress is uploaded the first time you sign in to an empty account.</p>
            </form>
          )}
        </div>
      )}
    </AppShell>
  );
}
