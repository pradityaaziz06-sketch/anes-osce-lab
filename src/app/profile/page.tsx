'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, Clock, Flame, Gauge, Target, Trophy } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { BadgeGrid, StatCard, XpBar } from '@/components/cards';
import { Modal, PageSkeleton, SYNC_LABEL } from '@/components/ui';
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
          <div><p className="label">Profil mahasiswa</p><h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{profile.name || 'Mahasiswa'}</h1></div>

          <div className="grid gap-5 lg:grid-cols-5">
            <form className="glass space-y-4 p-5 sm:p-6 lg:col-span-3" onSubmit={(e) => { e.preventDefault(); updateProfile({ name: form.name.trim() || 'Mahasiswa', studentId: form.studentId.trim(), program: form.program.trim() || 'D4 Keperawatan Anestesiologi', semester: form.semester.trim() }); setSaved(true); }}>
              <h2 className="font-display text-lg font-semibold">Data diri</h2>
              <label className="block"><span className="label">Nama</span><input className="field mt-1.5" value={form.name} onChange={set('name')} autoComplete="name" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="label">NIM</span><input className="field mt-1.5" value={form.studentId} onChange={set('studentId')} inputMode="numeric" /></label>
                <label className="block"><span className="label">Semester</span><input className="field mt-1.5" value={form.semester} onChange={set('semester')} placeholder="mis. 5" /></label>
              </div>
              <label className="block"><span className="label">Program studi</span><input className="field mt-1.5" value={form.program} onChange={set('program')} /></label>
              <p className="text-xs text-slate-400">Politeknik Tiara Bunda, Cinere, Depok</p>
              <div className="flex items-center gap-3">
                <button className="btn btn-primary" type="submit">Simpan profil</button>
                {saved && <span className="flex items-center gap-1 text-sm text-ok" role="status"><Check size={16} aria-hidden />Tersimpan</span>}
              </div>
            </form>
            <div className="space-y-4 lg:col-span-2">
              <XpBar level={level} />
              {cloudEnabled ? (
                <div className="glass p-5">
                  <p className="label">Sinkronisasi cloud</p>
                  <p className="mt-2 text-sm text-slate-200">{user ? `Masuk sebagai ${user.email}. Status: ${SYNC_LABEL[sync] ?? sync}.` : 'Progres hanya tersimpan di perangkat ini.'}</p>
                  <Link href="/auth" className="btn btn-ghost mt-3 w-full">{user ? 'Kelola akun' : 'Masuk untuk sinkronisasi'}</Link>
                </div>
              ) : (
                <div className="glass p-5"><p className="label">Penyimpanan</p><p className="mt-2 text-sm text-slate-300">Progres disimpan di browser ini (mode lokal). Atur Supabase untuk sinkronisasi antar perangkat.</p></div>
              )}
            </div>
          </div>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Statistik">
            <StatCard label="Kasus Selesai" value={`${ov.completed}/${ov.totalCases}`} icon={Target} />
            <StatCard label="Rata-rata Skor" value={attempts.length ? ov.avgScore : '—'} icon={Gauge} />
            <StatCard label="Skor Terbaik" value={attempts.length ? ov.bestScore : '—'} icon={Trophy} />
            <StatCard label="Waktu Latihan" value={fmtTime(ov.totalTimeMs)} icon={Clock} />
            <StatCard label="Streak Saat Ini" value={`${ov.streak}d`} icon={Flame} />
          </section>

          <section><h2 className="mb-4 font-display text-xl font-semibold">Lencana</h2><BadgeGrid unlocked={unlocked} /></section>

          <section className="glass p-5">
            <h2 className="font-display text-base font-semibold">Reset progres</h2>
            <p className="mt-1 text-sm text-slate-300">Menghapus semua percobaan, XP, dan lencana{user ? ' di perangkat ini dan di akun cloud-mu' : ' di perangkat ini'}. Data dirimu tetap ada.</p>
            <button className="btn btn-danger mt-3" onClick={() => setConfirm(true)} disabled={attempts.length === 0}>Reset progres</button>
          </section>
        </div>
      )}
      <Modal open={confirm} title="Reset semua progres?" onClose={() => setConfirm(false)}>
        <p>Tindakan ini tidak dapat dibatalkan.</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button className="btn btn-danger" onClick={() => { resetProgress(); setConfirm(false); }}>Ya, reset</button>
          <button className="btn btn-ghost" data-autofocus onClick={() => setConfirm(false)}>Batal</button>
        </div>
      </Modal>
    </AppShell>
  );
}
