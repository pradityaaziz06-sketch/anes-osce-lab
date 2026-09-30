import type { Attempt } from './types';
import { dayStreak } from './analytics';

export interface AchievementDef { code: string; label: string; desc: string; icon: 'flag' | 'star' | 'trophy' | 'gem' | 'flame' | 'shield' | 'layers' }

export const ACHIEVEMENTS: AchievementDef[] = [
  { code: 'FIRST_CASE', label: 'Kasus Pertama', desc: 'Selesaikan station pertamamu', icon: 'flag' },
  { code: 'FIVE_CASES', label: '5 Kasus', desc: 'Selesaikan 5 station', icon: 'star' },
  { code: 'TEN_CASES', label: '10 Kasus', desc: 'Selesaikan 10 station', icon: 'trophy' },
  { code: 'PERFECT', label: 'Skor Sempurna', desc: 'Selesaikan station tanpa kesalahan', icon: 'gem' },
  { code: 'STREAK_7', label: 'Streak 7 Hari', desc: 'Berlatih 7 hari berturut-turut', icon: 'flame' },
  { code: 'EXAM_PASS', label: 'Siap Ujian', desc: 'Raih skor 80+ di Mode Ujian', icon: 'shield' },
  { code: 'ALL_STATIONS', label: 'Semua Station', desc: 'Coba semua station yang tersedia', icon: 'layers' },
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
