import { computeFinal, evaluateStep } from './scoring';
import type { AnswerRecord, CaseData, FinalResult, Mode, Step, Vitals } from './types';

export interface SimState {
  phase: 'brief' | 'running' | 'feedback' | 'done';
  mode: Mode;
  queue: string[];
  index: number;
  answers: AnswerRecord[];
  streak: number;
  bestStreak: number;
  mistakes: number;
  points: number;
  lastAnswer: AnswerRecord | null;
  final: FinalResult | null;
  startedAt: string | null;
}

export type SimAction =
  | { type: 'START'; mode: Mode }
  | { type: 'ANSWER'; response: unknown; elapsedMs: number; stepTimeMs?: number }
  | { type: 'NEXT'; elapsedMs: number }
  | { type: 'FINISH'; elapsedMs: number; timedOut?: boolean };

export function initSim(c: CaseData): SimState {
  return {
    phase: 'brief',
    mode: 'practice',
    queue: c.steps.filter((s) => !s.remedial).map((s) => s.id),
    index: 0,
    answers: [],
    streak: 0,
    bestStreak: 0,
    mistakes: 0,
    points: 0,
    lastAnswer: null,
    final: null,
    startedAt: null,
  };
}

export function currentStep(c: CaseData, s: SimState): Step | undefined {
  return c.steps.find((st) => st.id === s.queue[s.index]);
}

function finish(c: CaseData, s: SimState, elapsedMs: number, timedOut: boolean): SimState {
  const limit = c.durationMin * 60_000;
  const elapsed = timedOut ? Math.min(elapsedMs, limit) : elapsedMs;
  return { ...s, phase: 'done', final: computeFinal(c, s.queue, s.answers, elapsed, s.mode, timedOut) };
}

export function simReducer(c: CaseData, s: SimState, a: SimAction): SimState {
  switch (a.type) {
    case 'START':
      if (s.phase !== 'brief') return s;
      return { ...s, phase: 'running', mode: a.mode, startedAt: new Date().toISOString() };

    case 'ANSWER': {
      if (s.phase !== 'running') return s;
      const step = currentStep(c, s);
      if (!step) return s;
      const res = evaluateStep(step, a.response);
      const record: AnswerRecord = { stepId: step.id, response: a.response, score: res.score, correct: res.correct, timeMs: a.stepTimeMs ?? 0 };
      const streak = res.correct ? s.streak + 1 : 0;
      let queue = s.queue;
      if (step.type === 'branching') {
        const opt = step.options.find((o) => o.id === a.response);
        if (opt?.remedial && !queue.includes(opt.remedial) && c.steps.some((x) => x.id === opt.remedial)) {
          queue = [...queue.slice(0, s.index + 1), opt.remedial, ...queue.slice(s.index + 1)];
        }
      }
      const next: SimState = {
        ...s,
        queue,
        answers: [...s.answers, record],
        streak,
        bestStreak: Math.max(s.bestStreak, streak),
        mistakes: s.mistakes + (res.correct ? 0 : 1),
        points: s.points + res.score,
        lastAnswer: record,
      };
      if (s.mode === 'practice') return { ...next, phase: 'feedback' };
      // exam mode: no feedback, advance immediately
      if (next.index + 1 < next.queue.length) return { ...next, index: next.index + 1, lastAnswer: null };
      return finish(c, next, a.elapsedMs, false);
    }

    case 'NEXT': {
      if (s.phase !== 'feedback') return s;
      if (s.index + 1 < s.queue.length) return { ...s, phase: 'running', index: s.index + 1, lastAnswer: null };
      return finish(c, s, a.elapsedMs, false);
    }

    case 'FINISH':
      if (s.phase === 'done' || s.phase === 'brief') return s;
      return finish(c, s, a.elapsedMs, Boolean(a.timedOut));
  }
}

/** Vitals visible at a given queue position (baseline merged with each reached step's update). */
export function vitalsAt(c: CaseData, queue: string[], index: number): Vitals {
  let v: Vitals = { ...c.vitals };
  for (let i = 0; i <= index && i < queue.length; i++) {
    const st = c.steps.find((x) => x.id === queue[i]);
    if (st?.vitals) v = { ...v, ...st.vitals };
  }
  return v;
}

export function historyAt(c: CaseData, queue: string[], index: number): { items: string[]; newCount: number } {
  const items = [...c.history];
  let newCount = 0;
  for (let i = 0; i <= index && i < queue.length; i++) {
    const st = c.steps.find((x) => x.id === queue[i]);
    if (st?.revealHistory) {
      items.push(...st.revealHistory);
      if (i === index) newCount = st.revealHistory.length;
    }
  }
  return { items, newCount };
}
