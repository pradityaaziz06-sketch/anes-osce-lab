import type { SupabaseClient } from '@supabase/supabase-js';
import type { Attempt, CaseData, Profile, Step } from './types';
import { validateCase } from './validate';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Load published cases from Supabase. Returns null on any problem so callers can fall back to local data. */
export async function fetchCases(sb: SupabaseClient): Promise<CaseData[] | null> {
  try {
    const { data, error } = await sb
      .from('cases')
      .select('*, case_steps(*, questions(*))')
      .eq('published', true)
      .order('number', { ascending: true });
    if (error || !data || data.length === 0) return null;
    const cases: CaseData[] = data.map((row: any) => {
      const steps: Step[] = [...(row.case_steps ?? [])]
        .sort((a: any, b: any) => a.position - b.position)
        .map((st: any) => {
          const payload = st.questions?.[0]?.payload ?? {};
          return {
            id: st.step_key,
            type: st.type,
            title: st.title ?? undefined,
            tag: st.tag,
            situation: st.situation ?? undefined,
            prompt: st.prompt,
            critical: st.critical,
            remedial: st.remedial,
            vitals: st.vitals ?? undefined,
            revealHistory: st.reveal_history ?? undefined,
            explanation: st.explanation,
            takeaway: st.takeaway,
            ...payload,
          } as Step;
        });
      return {
        id: row.id,
        number: row.number,
        title: row.title,
        category: row.category,
        difficulty: row.difficulty,
        durationMin: row.duration_min,
        summary: row.summary ?? '',
        scenario: row.scenario ?? '',
        objectives: row.objectives ?? [],
        patient: row.patient,
        vitals: row.vitals ?? {},
        history: row.history ?? [],
        references: row.references ?? [],
        scoring: row.scoring ?? undefined,
        steps,
      } as CaseData;
    });
    const valid = cases.filter((c) => {
      const errs = validateCase(c);
      if (errs.length) console.warn('Skipping invalid cloud case', errs);
      return errs.length === 0;
    });
    return valid.length ? valid : null;
  } catch (e) {
    console.warn('fetchCases failed', e);
    return null;
  }
}

export interface RemoteData { profile: (Profile & { xp?: number }) | null; attempts: Attempt[]; unlocked: Record<string, string> }

export async function fetchRemote(sb: SupabaseClient, userId: string): Promise<RemoteData> {
  const [p, a, ans, ach] = await Promise.all([
    sb.from('profiles').select('*').eq('id', userId).maybeSingle(),
    sb.from('attempts').select('*').eq('user_id', userId).order('started_at', { ascending: true }),
    sb.from('attempt_answers').select('*').eq('user_id', userId).order('position', { ascending: true }),
    sb.from('achievements').select('*').eq('user_id', userId),
  ]);
  if (p.error || a.error || ans.error || ach.error) throw new Error(p.error?.message || a.error?.message || ans.error?.message || ach.error?.message);
  const answersByAttempt = new Map<string, any[]>();
  (ans.data ?? []).forEach((r: any) => {
    const list = answersByAttempt.get(r.attempt_id) ?? [];
    list.push(r);
    answersByAttempt.set(r.attempt_id, list);
  });
  const attempts: Attempt[] = (a.data ?? []).map((r: any) => ({
    id: r.id,
    caseId: r.case_id,
    mode: r.mode,
    startedAt: r.started_at,
    durationMs: r.duration_ms,
    final: r.final_score,
    grade: r.grade,
    breakdown: r.breakdown,
    mistakes: r.mistakes,
    correctCount: r.meta?.correctCount ?? 0,
    criticalMissed: r.meta?.criticalMissed ?? false,
    perfect: r.perfect,
    timedOut: r.timed_out,
    tagStats: r.meta?.tagStats ?? {},
    strongest: r.meta?.strongest ?? null,
    weakest: r.meta?.weakest ?? null,
    xpGained: r.xp_gained,
    queue: r.meta?.queue ?? [],
    answers: (answersByAttempt.get(r.id) ?? []).map((x: any) => ({ stepId: x.step_key, response: x.response, score: x.score, correct: x.correct, timeMs: x.time_ms })),
    newBadges: [],
  }));
  const unlocked: Record<string, string> = {};
  (ach.data ?? []).forEach((r: any) => { unlocked[r.code] = r.unlocked_at; });
  const prof = p.data
    ? { name: p.data.full_name ?? '', studentId: p.data.student_id ?? '', program: p.data.program ?? '', semester: p.data.semester ?? '' }
    : null;
  return { profile: prof, attempts, unlocked };
}

export async function pushProfile(sb: SupabaseClient, userId: string, profile: Profile, xp: number): Promise<void> {
  const { error } = await sb.from('profiles').upsert({
    id: userId,
    full_name: profile.name,
    student_id: profile.studentId,
    program: profile.program,
    semester: profile.semester,
    xp,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function pushAttempt(sb: SupabaseClient, userId: string, a: Attempt, allAttempts: Attempt[], xp: number): Promise<void> {
  const { error } = await sb.from('attempts').upsert({
    id: a.id,
    user_id: userId,
    case_id: a.caseId,
    mode: a.mode,
    started_at: a.startedAt,
    duration_ms: a.durationMs,
    final_score: a.final,
    grade: a.grade,
    breakdown: a.breakdown,
    mistakes: a.mistakes,
    perfect: a.perfect,
    timed_out: a.timedOut,
    xp_gained: a.xpGained,
    meta: { queue: a.queue, tagStats: a.tagStats, strongest: a.strongest, weakest: a.weakest, correctCount: a.correctCount, criticalMissed: a.criticalMissed },
  });
  if (error) throw new Error(error.message);

  if (a.answers.length) {
    const { error: e2 } = await sb.from('attempt_answers').upsert(
      a.answers.map((x, i) => ({
        attempt_id: a.id,
        user_id: userId,
        step_key: x.stepId,
        position: i,
        response: x.response as any,
        score: x.score,
        correct: x.correct,
        time_ms: x.timeMs,
      })),
      { onConflict: 'attempt_id,step_key' },
    );
    if (e2) throw new Error(e2.message);
  }

  const forCase = allAttempts.filter((x) => x.caseId === a.caseId);
  const { error: e3 } = await sb.from('progress').upsert({
    user_id: userId,
    case_id: a.caseId,
    best_score: Math.max(...forCase.map((x) => x.final)),
    attempts_count: forCase.length,
    completed: true,
    last_attempt_at: a.startedAt,
  });
  if (e3) throw new Error(e3.message);

  if (a.newBadges.length) {
    const { error: e4 } = await sb.from('achievements').upsert(
      a.newBadges.map((code) => ({ user_id: userId, code, unlocked_at: new Date().toISOString() })),
      { onConflict: 'user_id,code' },
    );
    if (e4) throw new Error(e4.message);
  }
  await sb.from('profiles').update({ xp }).eq('id', userId);
}

export async function wipeRemote(sb: SupabaseClient, userId: string): Promise<void> {
  await sb.from('attempts').delete().eq('user_id', userId); // attempt_answers cascade
  await sb.from('progress').delete().eq('user_id', userId);
  await sb.from('achievements').delete().eq('user_id', userId);
  await sb.from('profiles').update({ xp: 0 }).eq('id', userId);
}
