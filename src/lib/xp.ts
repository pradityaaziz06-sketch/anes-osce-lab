export interface LevelInfo { level: number; current: number; need: number; pct: number; total: number }

/** Level n needs 300 + (n-1)*100 XP to reach level n+1. */
export function levelInfo(totalXp: number): LevelInfo {
  let level = 1;
  let need = 300;
  let remaining = Math.max(0, totalXp);
  while (remaining >= need) {
    remaining -= need;
    level++;
    need += 100;
  }
  return { level, current: remaining, need, pct: Math.round((remaining / need) * 100), total: totalXp };
}
