'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { LOCAL_CASES } from '@/data';
import { evaluateAchievements } from './achievements';
import { uid } from './format';
import { fetchCases, fetchRemote, pushAttempt, pushProfile, wipeRemote } from './remote';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { levelInfo, type LevelInfo } from './xp';
import type { Attempt, CaseData, Profile } from './types';

const KEY = 'anes-osce-lab:v1';
export const DEFAULT_PROFILE: Profile = { name: 'Mahasiswa', studentId: '', program: 'D4 Keperawatan Anestesiologi', semester: '' };

interface Persisted { v: 1; profile: Profile; attempts: Attempt[]; unlocked: Record<string, string> }
type NewAttempt = Omit<Attempt, 'id' | 'newBadges' | 'levelUp'>;
type SyncState = 'local' | 'idle' | 'syncing' | 'ok' | 'error';

interface StoreValue {
  ready: boolean;
  cases: CaseData[];
  casesSource: 'local' | 'cloud';
  profile: Profile;
  attempts: Attempt[];
  unlocked: Record<string, string>;
  xp: number;
  level: LevelInfo;
  cloudEnabled: boolean;
  user: { id: string; email: string } | null;
  sync: SyncState;
  syncMessage: string;
  saveAttempt: (a: NewAttempt) => Attempt;
  updateProfile: (p: Partial<Profile>) => void;
  resetProgress: () => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<StoreValue | null>(null);

function readLocal(): Persisted {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Persisted;
      if (p && p.v === 1 && Array.isArray(p.attempts)) return { ...p, profile: { ...DEFAULT_PROFILE, ...p.profile, name: p.profile?.name === 'Student' ? 'Mahasiswa' : (p.profile?.name ?? DEFAULT_PROFILE.name) }, unlocked: p.unlocked ?? {} };
    }
  } catch { /* corrupted storage: start clean */ }
  return { v: 1, profile: DEFAULT_PROFILE, attempts: [], unlocked: {} };
}
function writeLocal(p: Persisted) {
  try { window.localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage full or blocked */ }
}
const sumXp = (attempts: Attempt[]) => attempts.reduce((s, a) => s + a.xpGained, 0);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Persisted>({ v: 1, profile: DEFAULT_PROFILE, attempts: [], unlocked: {} });
  const [cases, setCases] = useState<CaseData[]>(LOCAL_CASES);
  const [casesSource, setCasesSource] = useState<'local' | 'cloud'>('local');
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [sync, setSync] = useState<SyncState>(isSupabaseConfigured() ? 'idle' : 'local');
  const [syncMessage, setSyncMessage] = useState('');
  const ref = useRef(data);
  const casesRef = useRef(cases);
  const userRef = useRef(user);
  casesRef.current = cases;
  userRef.current = user;

  const commit = useCallback((next: Persisted) => {
    ref.current = next;
    setData(next);
    writeLocal(next);
  }, []);

  // 1. Load local data once on mount.
  useEffect(() => {
    const local = readLocal();
    ref.current = local;
    setData(local);
    setReady(true);
  }, []);

  // 2. Optional cloud: session, cases, and remote data.
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let cancelled = false;

    const hydrate = async (u: { id: string; email: string } | null) => {
      setUser(u);
      const cloudCases = await fetchCases(sb);
      if (!cancelled && cloudCases) { setCases(cloudCases); setCasesSource('cloud'); }
      if (!u) { setSync('idle'); return; }
      setSync('syncing');
      try {
        const remote = await fetchRemote(sb, u.id);
        if (cancelled) return;
        const local = ref.current;
        if (remote.attempts.length === 0 && local.attempts.length > 0) {
          // First sign-in: upload guest progress.
          await pushProfile(sb, u.id, local.profile, sumXp(local.attempts));
          for (const a of local.attempts) await pushAttempt(sb, u.id, a, local.attempts, sumXp(local.attempts));
          const codes = evaluateAchievements(local.attempts, casesRef.current.length);
          if (codes.length) await sb.from('achievements').upsert(codes.map((code) => ({ user_id: u.id, code })), { onConflict: 'user_id,code' });
        } else {
          commit({ v: 1, profile: remote.profile?.name || remote.profile?.studentId ? { ...DEFAULT_PROFILE, ...remote.profile } : local.profile, attempts: remote.attempts, unlocked: remote.unlocked });
        }
        setSync('ok'); setSyncMessage('');
      } catch (e) {
        setSync('error'); setSyncMessage(e instanceof Error ? e.message : 'Sinkronisasi gagal');
      }
    };

    void sb.auth.getSession().then(({ data: s }) => {
      const u = s.session?.user;
      void hydrate(u ? { id: u.id, email: u.email ?? '' } : null);
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        const u = session?.user;
        void hydrate(u ? { id: u.id, email: u.email ?? '' } : null);
      }
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [commit]);

  const xp = useMemo(() => sumXp(data.attempts), [data.attempts]);
  const level = useMemo(() => levelInfo(xp), [xp]);

  const runRemote = useCallback(async (fn: (sb: NonNullable<ReturnType<typeof getSupabase>>, uid: string) => Promise<void>) => {
    const sb = getSupabase();
    const u = userRef.current;
    if (!sb || !u) return;
    setSync('syncing');
    try { await fn(sb, u.id); setSync('ok'); setSyncMessage(''); }
    catch (e) { setSync('error'); setSyncMessage(e instanceof Error ? e.message : 'Sinkronisasi gagal'); }
  }, []);

  const saveAttempt = useCallback((a: NewAttempt): Attempt => {
    const prev = ref.current;
    const attempt: Attempt = { ...a, id: uid(), newBadges: [] };
    const attempts = [...prev.attempts, attempt];
    const unlocked = { ...prev.unlocked };
    evaluateAchievements(attempts, casesRef.current.length).forEach((code) => {
      if (!unlocked[code]) { unlocked[code] = new Date().toISOString(); attempt.newBadges.push(code); }
    });
    const before = levelInfo(sumXp(prev.attempts)).level;
    const after = levelInfo(sumXp(attempts)).level;
    if (after > before) attempt.levelUp = after;
    commit({ ...prev, attempts, unlocked });
    void runRemote((sb, userId) => pushAttempt(sb, userId, attempt, attempts, sumXp(attempts)));
    return attempt;
  }, [commit, runRemote]);

  const updateProfile = useCallback((p: Partial<Profile>) => {
    const next = { ...ref.current, profile: { ...ref.current.profile, ...p } };
    commit(next);
    void runRemote((sb, userId) => pushProfile(sb, userId, next.profile, sumXp(next.attempts)));
  }, [commit, runRemote]);

  const resetProgress = useCallback(() => {
    commit({ ...ref.current, attempts: [], unlocked: {} });
    void runRemote((sb, userId) => wipeRemote(sb, userId));
  }, [commit, runRemote]);

  const signIn = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    if (!sb) return 'Sinkronisasi cloud belum dikonfigurasi.';
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }, []);
  const signUp = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    if (!sb) return 'Sinkronisasi cloud belum dikonfigurasi.';
    const { data: res, error } = await sb.auth.signUp({ email, password });
    if (error) return error.message;
    if (!res.session) return 'Akun dibuat. Cek email untuk konfirmasi, lalu masuk.';
    return null;
  }, []);
  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
  }, []);

  const value: StoreValue = {
    ready, cases, casesSource, profile: data.profile, attempts: data.attempts, unlocked: data.unlocked, xp, level,
    cloudEnabled: isSupabaseConfigured(), user, sync, syncMessage,
    saveAttempt, updateProfile, resetProgress, signIn, signUp, signOut,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside <StoreProvider>');
  return v;
}
