import type { AnswerRecord, CaseData, FinalResult, Mode, Step, StepResult, TagStat, Weights } from './types';

export const DEFAULT_WEIGHTS: Weights = { accuracy: 35, critical: 25, sequence: 10, time: 15, mistakes: 15 };
export const MISTAKE_PENALTY = 15;
export const CRITICAL_CAP = 79;

export function evaluateStep(step: Step, response: unknown): StepResult {
  switch (step.type) {
    case 'mcq': {
      const ok = response === step.correct;
      return { score: ok ? 100 : 0, correct: ok, partial: false };
    }
    case 'branching': {
      const opt = step.options.find((o) => o.id === response);
      const s = opt ? opt.score : 0;
      return { score: s, correct: s >= 100, partial: s > 0 && s < 100 };
    }
    case 'sequence': {
      const r = Array.isArray(response) ? (response as string[]) : [];
      const n = step.items.length;
      let hits = 0;
      step.items.forEach((it, i) => { if (r[i] === it.id) hits++; });
      return { score: Math.round((hits / n) * 100), correct: hits === n, partial: hits > 0 && hits < n };
    }
    case 'equipment':
    case 'find-error': {
      const sel = new Set(Array.isArray(response) ? (response as string[]) : []);
      const wanted = step.items.filter((i) => i.correct);
      let tp = 0, fp = 0;
      step.items.forEach((i) => { if (sel.has(i.id)) { if (i.correct) tp++; else fp++; } });
      const exact = tp === wanted.length && fp === 0;
      const raw = Math.max(0, Math.round(((tp - fp) / Math.max(1, wanted.length)) * 100));
      return { score: exact ? 100 : Math.min(raw, 99), correct: exact, partial: !exact && raw > 0 };
    }
  }
}

/** 100 up to 60% of the allowed time, falling to 60 at 100%, then to 0 at 150%. */
export function timeScore(elapsedMs: number, limitMs: number): number {
  const r = elapsedMs / Math.max(1, limitMs);
  if (r <= 0.6) return 100;
  if (r <= 1) return Math.round(100 - ((r - 0.6) / 0.4) * 40);
  return Math.max(0, Math.round(60 - (r - 1) * 120));
}

export function gradeFor(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Needs Practice';
  return 'Retry Recommended';
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function computeFinal(
  c: CaseData,
  queue: string[],
  answers: AnswerRecord[],
  elapsedMs: number,
  mode: Mode,
  timedOut: boolean,
): FinalResult {
  const stepMap = new Map(c.steps.map((s) => [s.id, s]));
  const byId = new Map(answers.map((a) => [a.stepId, a]));
  const rows = queue
    .map((id) => stepMap.get(id))
    .filter((s): s is Step => Boolean(s))
    .map((step) => {
      const a = byId.get(step.id);
      return { step, score: a?.score ?? 0, correct: a?.correct ?? false };
    });

  const accuracy = Math.round(mean(rows.map((r) => r.score)));
  const critRows = rows.filter((r) => r.step.critical);
  const critical = critRows.length ? Math.round(mean(critRows.map((r) => r.score))) : 100;
  const seqRows = rows.filter((r) => r.step.type === 'sequence');
  const sequence = seqRows.length ? Math.round(mean(seqRows.map((r) => r.score))) : null;
  const mistakes = rows.filter((r) => !r.correct).length;
  const mistakesScore = Math.max(0, 100 - MISTAKE_PENALTY * mistakes);
  const time = timeScore(elapsedMs, c.durationMin * 60_000);

  const w: Weights = { ...DEFAULT_WEIGHTS, ...(c.scoring?.weights ?? {}) };
  if (sequence === null) w.sequence = 0;
  const totalW = w.accuracy + w.critical + w.sequence + w.time + w.mistakes;
  const weighted =
    accuracy * w.accuracy + critical * w.critical + (sequence ?? 0) * w.sequence + time * w.time + mistakesScore * w.mistakes;
  let final = Math.round(weighted / totalW);
  const criticalMissed = critRows.some((r) => r.score < 50);
  if (criticalMissed) final = Math.min(final, CRITICAL_CAP);
  final = Math.max(0, Math.min(100, final));

  const tagAcc: Record<string, number[]> = {};
  rows.forEach((r) => { (tagAcc[r.step.tag] ||= []).push(r.score); });
  const tagStats: Record<string, TagStat> = {};
  Object.entries(tagAcc).forEach(([tag, xs]) => { tagStats[tag] = { avg: Math.round(mean(xs)), n: xs.length }; });
  const tags = Object.entries(tagStats).sort((a, b) => b[1].avg - a[1].avg);
  const strongest = tags.length ? tags[0][0] : null;
  const lowest = tags.length ? tags[tags.length - 1] : null;
  const weakest = lowest && lowest[1].avg < 100 ? lowest[0] : null;

  const correctCount = rows.filter((r) => r.correct).length;
  const perfect = mistakes === 0 && !timedOut;
  const xpGained = correctCount * 100 + (timedOut ? 0 : 250) + (perfect ? 500 : 0);

  return {
    breakdown: { accuracy, critical, sequence, time, mistakes: mistakesScore },
    final,
    grade: gradeFor(final),
    mistakes,
    correctCount,
    criticalMissed,
    perfect,
    timedOut,
    durationMs: elapsedMs,
    tagStats,
    strongest,
    weakest,
    xpGained,
  };
}
