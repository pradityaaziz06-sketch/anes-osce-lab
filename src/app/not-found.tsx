import Link from 'next/link';
import { AppShell } from '@/components/AppShell';

export default function NotFound() {
  return (
    <AppShell>
      <div className="glass mx-auto mt-10 max-w-lg p-8 text-center">
        <p className="label">Halaman tidak ditemukan</p>
        <h1 className="mt-2 font-display text-2xl font-semibold">Halaman ini tidak ada</h1>
        <p className="mt-2 text-slate-300">Tautan mungkin sudah lama atau salah ketik. Kembali ke dashboard untuk melanjutkan latihan.</p>
        <Link href="/dashboard" className="btn btn-primary mt-6">Kembali ke dashboard</Link>
      </div>
    </AppShell>
  );
}
