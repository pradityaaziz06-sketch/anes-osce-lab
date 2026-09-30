'use client';
import { Volume2, VolumeX } from 'lucide-react';
import { useSoundSetting } from '@/lib/sound';

export function SoundToggle({ className = '' }: { className?: string }) {
  const [on, setOn] = useSoundSetting();
  return (
    <button type="button" onClick={() => setOn(!on)} aria-pressed={on} aria-label={on ? 'Sound on. Click to mute' : 'Sound off. Click to turn on'} title={on ? 'Sound on' : 'Sound off'} className={`grid h-11 w-11 place-items-center rounded-2xl border border-white/15 bg-white/[0.06] text-slate-200 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pulse ${className}`}>
      {on ? <Volume2 size={18} /> : <VolumeX size={18} className="text-slate-400" />}
    </button>
  );
}
