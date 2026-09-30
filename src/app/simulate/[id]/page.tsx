'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import SimulationRunner from '@/components/sim/SimulationRunner';
import { EmptyState, PageSkeleton } from '@/components/ui';
import { useStore } from '@/lib/store';
import type { CaseData } from '@/lib/types';

function Loaded({ id }: { id: string }) {
  const { cases } = useStore();
  // Snapshot the case once so live data refreshes can never change a station mid-run.
  const [snap] = useState<CaseData | undefined>(() => cases.find((c) => c.id === id));
  if (!snap) {
    return (
      <AppShell>
        <EmptyState title="Station not found" body="This station does not exist or is no longer published." action={<Link href="/stations" className="btn btn-primary">Back to stations</Link>} />
      </AppShell>
    );
  }
  return <SimulationRunner caseData={snap} />;
}

export default function SimulatePage() {
  const params = useParams<{ id: string }>();
  const { ready } = useStore();
  if (!ready) return <AppShell bottomNav={false}><PageSkeleton /></AppShell>;
  return <Loaded id={params.id} />;
}
