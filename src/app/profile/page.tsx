'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, Clock, Flame, Gauge, Target, Trophy } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { BadgeGrid, StatCard, XpBar } from '@/components/cards';
import { Modal, PageSkeleton } from '@/components/ui';
import { overview } from '@/lib/analytics';
import { fmtTime } from '@/lib/format';
import { useStore } from '@/lib/store';

export default function ProfilePage() {
  const { ready, profile, updateProfile, attempts, cases, level, unlocked, resetProgress, cloudEnabled, user, sync } = useStore();
  const [form, setForm] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (ready) setForm(profile); }, [ready, profile]);
  const ov = overview(attempts, cases);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => { setSaved(false); setForm({ ...form, [k]: e.target.value }); };

  return (
    <AppShell>
      {!ready ? <PageSkeleton /> : (
        <div className="space-y-7">
          <div><p className="label">Student profile</p><h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{profile.name || 'Student'}</h1></div>

          <div className="grid gap-5 lg:grid-cols-5">
            <form className="glass space-y-4 p-5 sm:p-6 lg:col-span-3" onSubmit={(e) => { e.preventDefault(); updateProfile({ name: form.name.trim() || 'Student', studentId: form.studentId.trim(), program: form.program.trim() || 'D4 Keperawatan Anestesiologi', semester: form.semester.trim() }); setSaved(true); }}>
              <h2 className="font-display text-lg font-semibold">Details</h2>
              <label className="block"><span className="label">Name</span><input className="field mt-1.5" value={form.name} onChange={set('name')} autoComplete="name" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="label">Student ID</span><input className="field mt-1.5" value={form.studentId} onChange={set('studentId')} inputMode="numeric" /></label>
                <label className="block"><span className="label">Semester</span><input className="field mt-1.5" value={form.semester} onChange={set('semester')} placeholder="e.g. 5" /></label>
              </div>
              <label className="block"><span className="label">Program</span><input className="field mt-1.5" value={form.program} onChange={set('program')} /></label>
              <p className="text-xs text-slate-400">Politeknik Tiara Bunda, Cinere, Depok</p>
              <div className="flex items-center gap-3">
                <button className="btn btn-primary" type="submit">Save profile</button>
                {saved && <span className="flex items-center gap-1 text-sm text-ok" role="status"><Check size={16} aria-hidden />Saved</span>}
              </div>
            </form>
            <div className="space-y-4 lg:col-span-2">
              <XpBar level={level} />
              {cloudEnabled ? (
                <div className="glass p-5">
                  <p className="label">Cloud sync</p>
                  <p className="mt-2 text-sm text-slate-200">{user ? `Signed in as ${user.email}. Status: ${sync}.` : 'Progress is stored on this device only.'}</p>
                  <Link href="/auth" className="btn btn-ghost mt-3 w-full">{user ? 'Manage account' : 'Sign in to sync'}</Link>
                </div>
              ) : (
                <div className="glass p-5"><p className="label">Storage</p><p className="mt-2 text-sm text-slate-300">Progress is saved in this browser (local mode). Configure Supabase to sync across devices.</p></div>
              )}
            </div>
          </div>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Stats">
            <StatCard label="Cases Completed" value={`${ov.completed}/${ov.totalCases}`} icon={Target} />
            <StatCard label="Average Score" value={attempts.length ? ov.avgScore : '—'} icon={Gauge} />
            <StatCard label="Best Score" value={attempts.length ? ov.bestScore : '—'} icon={Trophy} />
            <StatCard label="Practice Time" value={fmtTime(ov.totalTimeMs)} icon={Clock} />
            <StatCard label="Current Streak" value={`${ov.streak}d`} icon={Flame} />
          </section>

          <section><h2 className="mb-4 font-display text-xl font-semibold">Badges</h2><BadgeGrid unlocked={unlocked} /></section>

          <section className="glass p-5">
            <h2 className="font-display text-base font-semibold">Reset progress</h2>
            <p className="mt-1 text-sm text-slate-300">Deletes all attempts, XP and badges{user ? ' on this device and in your cloud account' : ' on this device'}. Your profile details stay.</p>
            <button className="btn btn-danger mt-3" onClick={() => setConfirm(true)} disabled={attempts.length === 0}>Reset progress</button>
          </section>
        </div>
      )}
      <Modal open={confirm} title="Reset all progress?" onClose={() => setConfirm(false)}>
        <p>This cannot be undone.</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button className="btn btn-danger" onClick={() => { resetProgress(); setConfirm(false); }}>Yes, reset</button>
          <button className="btn btn-ghost" data-autofocus onClick={() => setConfirm(false)}>Cancel</button>
        </div>
      </Modal>
    </AppShell>
  );
}
