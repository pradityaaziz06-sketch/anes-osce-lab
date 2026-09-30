import Link from 'next/link';
import { AppShell } from '@/components/AppShell';

export default function NotFound() {
  return (
    <AppShell>
      <div className="glass mx-auto mt-10 max-w-lg p-8 text-center">
        <p className="label">Page not found</p>
        <h1 className="mt-2 font-display text-2xl font-semibold">This page does not exist</h1>
        <p className="mt-2 text-slate-300">The link may be old or mistyped. Go back to the dashboard to continue practicing.</p>
        <Link href="/dashboard" className="btn btn-primary mt-6">Back to dashboard</Link>
      </div>
    </AppShell>
  );
}
