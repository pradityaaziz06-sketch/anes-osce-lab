'use client';
import { useEffect, useState } from 'react';

const KEY = 'anes-osce-lab:sound';
let ctx: AudioContext | null = null;

export function isSoundOn(): boolean {
  if (typeof window === 'undefined') return false;
  try { return window.localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !isSoundOn()) return null;
  try {
    if (!ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.04, delay = 0) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  click: () => tone(620, 0.05, 'triangle', 0.03),
  success: () => { tone(660, 0.12, 'sine', 0.05); tone(880, 0.18, 'sine', 0.05, 0.1); },
  error: () => { tone(220, 0.18, 'sawtooth', 0.03); tone(165, 0.22, 'sawtooth', 0.03, 0.12); },
  tick: () => tone(980, 0.06, 'square', 0.02),
  finish: () => { tone(523, 0.12, 'sine', 0.05); tone(659, 0.12, 'sine', 0.05, 0.12); tone(784, 0.25, 'sine', 0.05, 0.24); },
};

export function useSoundSetting(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(isSoundOn());
    const h = () => setOn(isSoundOn());
    window.addEventListener('anes-sound', h);
    return () => window.removeEventListener('anes-sound', h);
  }, []);
  const set = (v: boolean) => {
    try { window.localStorage.setItem(KEY, v ? 'on' : 'off'); } catch { /* ignore */ }
    setOn(v);
    window.dispatchEvent(new Event('anes-sound'));
    if (v) sfx.click();
  };
  return [on, set];
}
