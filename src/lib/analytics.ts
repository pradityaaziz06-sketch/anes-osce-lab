import type { Attempt, CaseData } from './types';

export const dateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/** Consecutive practice days ending today (or yesterday, so a streak survives until midnight+1). */
export function dayStreak(attempts: Attempt[], now: Date = new Date()): number {
  const days = new Set(attempts.map((a) => dateKey(new Date(a.startedAt))));
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dateKey(cursor))) return 0;
  }
  let n = 0;
  while (days.has(dateKey(cursor))) {
    n++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}

export interface CaseStat { best: number; count: number; last: string | null; completed: boolean }

export function caseStats(attempts: Attempt[]): Map<string, CaseStat> {
  const m = new Map<string, CaseStat>();
  attempts.forEach((a) => {
    const cur = m.get(a.caseId) ?? { best: 0, count: 0, last: null, completed: false };
    cur.best = Math.max(cur.best, a.final);
    cur.count += 1;
    cur.completed = true;
    if (!cur.last || a.startedAt > cur.last) cur.last = a.startedAt;
    m.set(a.caseId, cur);
  });
  return m;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function overview(attempts: Attempt[], cases: CaseData[]) {
  const stats = caseStats(attempts);
  const known = cases.filter((c) => stats.has(c.id));
  const bestScores = cases.map((c) => stats.get(c.id)?.best ?? 0);
  return {
    completed: known.length,
    totalCases: cases.length,
    avgScore: Math.round(avg(attempts.map((a) => a.final))),
    bestScore: attempts.length ? Math.max(...attempts.map((a) => a.final)) : 0,
    totalTimeMs: attempts.reduce((s, a) => s + a.durationMs, 0),
    avgTimeMs: Math.round(avg(attempts.map((a) => a.durationMs))),
    streak: dayStreak(attempts),
    /** Average of best scores across ALL stations; stations not yet attempted count as 0. */
    readiness: Math.round(avg(bestScores)),
  };
}

export function categoryProgress(attempts: Attempt[], cases: CaseData[]) {
  const stats = caseStats(attempts);
  const out: Record<string, { total: number; done: number }> = {};
  cases.forEach((c) => {
    const o = (out[c.category] ||= { total: 0, done: 0 });
    o.total++;
    if (stats.has(c.id)) o.done++;
  });
  return out;
}

export function performanceInsights(attempts: Attempt[], cases: CaseData[]) {
  const catOf = new Map(cases.map((c) => [c.id, c.category]));
  const cat: Record<string, { scores: number[]; mistakes: number[] }> = {};
  const tags: Record<string, number[]> = {};
  attempts.forEach((a) => {
    const k = catOf.get(a.caseId);
    if (!k) return;
    (cat[k] ||= { scores: [], mistakes: [] }).scores.push(a.final);
    cat[k].mistakes.push(a.mistakes);
    Object.entries(a.tagStats).forEach(([t, s]) => (tags[t] ||= []).push(s.avg));
  });
  const catRows = Object.entries(cat).map(([id, v]) => ({ id, avgScore: Math.round(avg(v.scores)), avgMistakes: avg(v.mistakes), n: v.scores.length }));
  const withMistakes = catRows.filter((r) => r.avgMistakes > 0).sort((a, b) => b.avgMistakes - a.avgMistakes);
  const strongest = [...catRows].sort((a, b) => b.avgScore - a.avgScore)[0] ?? null;
  const tagRows = Object.entries(tags)
    .map(([tag, xs]) => ({ tag, avg: Math.round(avg(xs)), n: xs.length }))
    .sort((a, b) => a.avg - b.avg);
  return { catRows, mostMistaken: withMistakes[0]?.id ?? null, strongest: strongest?.id ?? null, tagRows };
}
