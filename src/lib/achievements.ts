import type { Attempt } from './types';
import { dayStreak } from './analytics';

export interface AchievementDef { code: string; label: string; desc: string; icon: 'flag' | 'star' | 'trophy' | 'gem' | 'flame' | 'shield' | 'layers' }

export const ACHIEVEMENTS: AchievementDef[] = [
  { code: 'FIRST_CASE', label: 'First Case', desc: 'Finish your first station', icon: 'flag' },
  { code: 'FIVE_CASES', label: '5 Cases', desc: 'Finish 5 stations', icon: 'star' },
  { code: 'TEN_CASES', label: '10 Cases', desc: 'Finish 10 stations', icon: 'trophy' },
  { code: 'PERFECT', label: 'Perfect Score', desc: 'Finish a station with no mistakes', icon: 'gem' },
  { code: 'STREAK_7', label: '7 Day Streak', desc: 'Practice 7 days in a row', icon: 'flame' },
  { code: 'EXAM_PASS', label: 'Exam Ready', desc: 'Score 80+ in Exam Mode', icon: 'shield' },
  { code: 'ALL_STATIONS', label: 'All Stations', desc: 'Try every available station', icon: 'layers' },
];

/** Returns every achievement code earned by the given attempts. */
export function evaluateAchievements(attempts: Attempt[], totalCases: number): string[] {
  const codes: string[] = [];
  const n = attempts.length;
  if (n >= 1) codes.push('FIRST_CASE');
  if (n >= 5) codes.push('FIVE_CASES');
  if (n >= 10) codes.push('TEN_CASES');
  if (attempts.some((a) => a.perfect)) codes.push('PERFECT');
  if (dayStreak(attempts) >= 7) codes.push('STREAK_7');
  if (attempts.some((a) => a.mode === 'exam' && a.final >= 80 && !a.timedOut)) codes.push('EXAM_PASS');
  if (totalCases > 0 && new Set(attempts.map((a) => a.caseId)).size >= totalCases) codes.push('ALL_STATIONS');
  return codes;
}
