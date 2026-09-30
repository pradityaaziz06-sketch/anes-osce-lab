/* Logic self-test: validates case data and plays every station through the real engine. */
import { LOCAL_CASES } from '../src/data';
import { initSim, simReducer, currentStep, vitalsAt } from '../src/lib/engine';
import { computeFinal, evaluateStep, gradeFor, timeScore } from '../src/lib/scoring';
import { validateCase } from '../src/lib/validate';
import { dayStreak, overview } from '../src/lib/analytics';
import { evaluateAchievements } from '../src/lib/achievements';
import { levelInfo } from '../src/lib/xp';
import { shuffleSeeded } from '../src/lib/format';
import type { Attempt, CaseData, Step } from '../src/lib/types';

let failed = 0;
let passed = 0;
function ok(cond: boolean, msg: string) {
  if (cond) passed++;
  else { failed++; console.error('  FAIL:', msg); }
}
const section = (s: string) => console.log('\n' + s);

function bestResponse(step: Step): unknown {
  switch (step.type) {
    case 'mcq': return step.correct;
    case 'sequence': return step.items.map((i) => i.id);
    case 'equipment':
    case 'find-error': return step.items.filter((i) => i.correct).map((i) => i.id);
    case 'branching': return [...step.options].sort((a, b) => b.score - a.score)[0].id;
  }
}
function worstResponse(step: Step): unknown {
  switch (step.type) {
    case 'mcq': return step.options.find((o) => o.id !== step.correct)!.id;
    case 'sequence': return [...step.items].reverse().map((i) => i.id);
    case 'equipment':
    case 'find-error': return step.items.filter((i) => !i.correct).map((i) => i.id);
    case 'branching': {
      const withRem = step.options.filter((o) => o.remedial);
      return (withRem[0] ?? [...step.options].sort((a, b) => a.score - b.score)[0]).id;
    }
  }
}

function play(c: CaseData, mode: 'practice' | 'exam', pick: (s: Step) => unknown, elapsedPerStep = 20_000) {
  let s = initSim(c);
  s = simReducer(c, s, { type: 'START', mode });
  let t = 0;
  let guard = 0;
  while (s.phase !== 'done' && guard++ < 50) {
    const step = currentStep(c, s)!;
    t += elapsedPerStep;
    s = simReducer(c, s, { type: 'ANSWER', response: pick(step), elapsedMs: t });
    if (s.phase === 'feedback') s = simReducer(c, s, { type: 'NEXT', elapsedMs: t });
  }
  return { s, t };
}

section('1. Case data validation');
ok(LOCAL_CASES.length >= 3, 'at least 3 cases');
LOCAL_CASES.forEach((c) => {
  const errs = validateCase(c);
  ok(errs.length === 0, `case ${c.id} valid`);
  errs.forEach((e) => console.error('   ', e));
});
ok(new Set(LOCAL_CASES.map((c) => c.id)).size === LOCAL_CASES.length, 'unique case ids');
LOCAL_CASES.forEach((c) => {
  const types = new Set(c.steps.map((s) => s.type));
  console.log(`  ${c.id}: ${c.steps.filter((s) => !s.remedial).length} steps (+${c.steps.filter((s) => s.remedial).length} remedial), types: ${[...types].join(', ')}`);
});

section('2. Perfect run (practice + exam) on every station');
LOCAL_CASES.forEach((c) => {
  ['practice', 'exam'].forEach((m) => {
    const { s } = play(c, m as 'practice' | 'exam', bestResponse, 20_000);
    ok(s.phase === 'done' && !!s.final, `${c.id}/${m} finishes`);
    ok(s.final!.mistakes === 0, `${c.id}/${m} zero mistakes`);
    ok(s.final!.breakdown.accuracy === 100, `${c.id}/${m} accuracy 100`);
    ok(s.final!.final >= 90, `${c.id}/${m} final >= 90 (got ${s.final!.final})`);
    ok(s.final!.perfect, `${c.id}/${m} perfect flag`);
    ok(s.queue.length === c.steps.filter((x) => !x.remedial).length, `${c.id}/${m} no remedial injected on perfect run`);
  });
});

section('3. Worst run: remedial injection, penalties, critical cap');
LOCAL_CASES.forEach((c) => {
  const { s } = play(c, 'practice', worstResponse, 20_000);
  ok(s.final!.final < 60, `${c.id} worst-run < 60 (got ${s.final!.final})`);
  ok(s.final!.grade === 'Retry Recommended', `${c.id} worst grade`);
  const hasRemedial = c.steps.some((x) => x.remedial);
  if (hasRemedial) ok(s.queue.length > c.steps.filter((x) => !x.remedial).length, `${c.id} remedial step injected`);
  ok(s.final!.criticalMissed, `${c.id} critical missed flagged`);
  ok(s.final!.xpGained >= 250 && s.final!.xpGained < 1000, `${c.id} xp sane (${s.final!.xpGained})`);
});

section('4. Scoring maths');
ok(gradeFor(100) === 'Excellent' && gradeFor(90) === 'Excellent', 'grade 90+');
ok(gradeFor(89) === 'Very Good' && gradeFor(80) === 'Very Good', 'grade 80-89');
ok(gradeFor(79) === 'Good' && gradeFor(70) === 'Good', 'grade 70-79');
ok(gradeFor(69) === 'Needs Practice' && gradeFor(60) === 'Needs Practice', 'grade 60-69');
ok(gradeFor(59) === 'Retry Recommended', 'grade <60');
ok(timeScore(0, 600_000) === 100, 'time: instant = 100');
ok(timeScore(360_000, 600_000) === 100, 'time: 60% = 100');
ok(timeScore(600_000, 600_000) === 60, 'time: 100% = 60');
ok(timeScore(900_000, 600_000) === 0, 'time: 150% = 0');
ok(timeScore(700_000, 600_000) < 60, 'time: overtime penalised');
const c1 = LOCAL_CASES[0];
const seq = c1.steps.find((s) => s.type === 'sequence')!;
if (seq.type === 'sequence') {
  const swapped = seq.items.map((i) => i.id);
  [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
  const r = evaluateStep(seq, swapped);
  ok(!r.correct && r.partial && r.score === Math.round(((seq.items.length - 2) / seq.items.length) * 100), 'sequence partial credit');
}
const fe = c1.steps.find((s) => s.type === 'find-error')!;
if (fe.type === 'find-error') {
  const right = fe.items.filter((i) => i.correct).map((i) => i.id);
  const wrongExtra = [...right, fe.items.find((i) => !i.correct)!.id];
  ok(evaluateStep(fe, right).score === 100, 'select exact = 100');
  ok(evaluateStep(fe, wrongExtra).score < 100, 'select with false positive < 100');
  ok(evaluateStep(fe, []).score === 0, 'select nothing = 0');
  ok(evaluateStep(fe, fe.items.map((i) => i.id)).score < 100, 'select everything < 100');
}
const fullClock = play(c1, 'practice', bestResponse, 20_000);
const slow = computeFinal(c1, fullClock.s.queue, fullClock.s.answers, c1.durationMin * 60_000 * 1.2, 'practice', false);
ok(slow.final < fullClock.s.final!.final, 'overtime lowers final score');

section('5. Exam timeout');
{
  const c = LOCAL_CASES[1];
  let s = simReducer(c, initSim(c), { type: 'START', mode: 'exam' });
  const st = currentStep(c, s)!;
  s = simReducer(c, s, { type: 'ANSWER', response: bestResponse(st), elapsedMs: 10_000 });
  ok(s.phase === 'running' && s.index === 1, 'exam advances without feedback');
  ok(s.lastAnswer === null, 'exam hides feedback state');
  s = simReducer(c, s, { type: 'FINISH', elapsedMs: 9_999_999, timedOut: true });
  ok(s.phase === 'done' && s.final!.timedOut, 'timeout finishes station');
  ok(s.final!.durationMs === c.durationMin * 60_000, 'timeout clamps duration to limit');
  ok(s.final!.breakdown.accuracy < 30, 'unanswered steps count as zero');
  ok(s.final!.xpGained < 250 + 100 * 6, 'no completion xp on timeout');
  const again = simReducer(c, s, { type: 'ANSWER', response: 'a', elapsedMs: 1 });
  ok(again === s, 'answers ignored after done');
}

section('6. Reducer guards');
{
  const c = LOCAL_CASES[0];
  const s0 = initSim(c);
  ok(simReducer(c, s0, { type: 'ANSWER', response: 'a', elapsedMs: 0 }) === s0, 'cannot answer before start');
  let s = simReducer(c, s0, { type: 'START', mode: 'practice' });
  s = simReducer(c, s, { type: 'ANSWER', response: 'a', elapsedMs: 1 });
  ok(s.phase === 'feedback', 'practice shows feedback');
  const twice = simReducer(c, s, { type: 'ANSWER', response: 'b', elapsedMs: 2 });
  ok(twice === s, 'cannot answer twice during feedback');
  ok(s.answers.length === 1, 'single answer recorded');
  const step = currentStep(c, initSim(c));
  ok(!!step, 'current step resolved');
}

section('7. Vitals progression');
{
  const c = LOCAL_CASES.find((x) => x.id === 'perioperative-monitoring')!;
  const q = c.steps.filter((s) => !s.remedial).map((s) => s.id);
  ok(vitalsAt(c, q, 0).bp === '118/72', 'baseline vitals at start');
  ok(vitalsAt(c, q, q.length - 1).bp === '82/48', 'vitals updated at the final step');
  ok(vitalsAt(c, q, 2).etco2 === 37, 'etco2 appears after induction step');
}

section('8. Streaks, achievements, level, shuffle');
{
  const mk = (daysAgo: number, extra: Partial<Attempt> = {}): Attempt => {
    const d = new Date(); d.setDate(d.getDate() - daysAgo);
    return { id: String(Math.random()), caseId: LOCAL_CASES[0].id, mode: 'practice', startedAt: d.toISOString(), durationMs: 1000, final: 90, grade: 'Excellent', breakdown: { accuracy: 90, critical: 100, sequence: 100, time: 100, mistakes: 100 }, mistakes: 0, correctCount: 5, criticalMissed: false, perfect: true, timedOut: false, tagStats: {}, strongest: null, weakest: null, xpGained: 850, queue: [], answers: [], newBadges: [], ...extra } as Attempt;
  };
  ok(dayStreak([]) === 0, 'empty streak 0');
  ok(dayStreak([mk(0)]) === 1, 'today = 1');
  ok(dayStreak([mk(1)]) === 1, 'yesterday still counts');
  ok(dayStreak([mk(3)]) === 0, 'gap breaks streak');
  ok(dayStreak([0, 1, 2, 3, 4, 5, 6].map((d) => mk(d))) === 7, '7-day streak');
  ok(evaluateAchievements([mk(0)], 6).includes('FIRST_CASE'), 'first case badge');
  ok(evaluateAchievements([mk(0)], 6).includes('PERFECT'), 'perfect badge');
  ok(evaluateAchievements([0, 1, 2, 3, 4, 5, 6].map((d) => mk(d)), 6).includes('STREAK_7'), '7-day badge');
  ok(evaluateAchievements([mk(0, { mode: 'exam', final: 85 })], 6).includes('EXAM_PASS'), 'exam badge');
  ok(!evaluateAchievements([mk(0, { mode: 'exam', final: 70 })], 6).includes('EXAM_PASS'), 'exam badge needs 80');
  const ov = overview([mk(0, { final: 80 }), mk(0, { final: 100, caseId: LOCAL_CASES[1].id })], LOCAL_CASES);
  ok(ov.completed === 2 && ov.avgScore === 90 && ov.bestScore === 100, 'overview stats');
  ok(ov.readiness === Math.round((80 + 100) / LOCAL_CASES.length), 'readiness counts unattempted as 0');
  ok(levelInfo(0).level === 1 && levelInfo(299).level === 1, 'level 1 range');
  ok(levelInfo(300).level === 2 && levelInfo(300).current === 0, 'level 2 at 300xp');
  ok(levelInfo(700).level === 3, 'level 3 at 700xp');
  const arr = ['a', 'b', 'c', 'd', 'e'];
  ok(shuffleSeeded(arr, 'x').join() === shuffleSeeded(arr, 'x').join(), 'shuffle deterministic');
  ok(shuffleSeeded(arr, 'x').slice().sort().join() === arr.join(), 'shuffle keeps items');
  ok(shuffleSeeded(arr, 'anything', true).join() !== arr.join(), 'shuffle avoidOriginal');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
