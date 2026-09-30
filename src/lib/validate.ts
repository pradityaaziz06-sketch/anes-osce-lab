import type { CaseData } from './types';

/** Returns a list of authoring problems. Empty list = case is playable. */
export function validateCase(c: CaseData): string[] {
  const errs: string[] = [];
  const err = (m: string) => errs.push(`[${c.id}] ${m}`);
  if (!c.id || !c.title || !c.category) err('missing id/title/category');
  if (!['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(c.difficulty)) err('invalid difficulty');
  if (!(c.durationMin > 0)) err('durationMin must be > 0');
  if (!c.steps?.length) err('no steps');
  const ids = new Set<string>();
  c.steps.forEach((s) => {
    if (ids.has(s.id)) err(`duplicate step id ${s.id}`);
    ids.add(s.id);
    if (!s.explanation || !s.takeaway || !s.prompt || !s.tag) err(`step ${s.id}: missing prompt/tag/explanation/takeaway`);
    switch (s.type) {
      case 'mcq':
        if (s.options.length < 2) err(`step ${s.id}: needs >= 2 options`);
        if (!s.options.some((o) => o.id === s.correct)) err(`step ${s.id}: correct id not in options`);
        if (new Set(s.options.map((o) => o.id)).size !== s.options.length) err(`step ${s.id}: duplicate option ids`);
        break;
      case 'sequence':
        if (s.items.length < 3) err(`step ${s.id}: sequence needs >= 3 items`);
        if (new Set(s.items.map((o) => o.id)).size !== s.items.length) err(`step ${s.id}: duplicate item ids`);
        break;
      case 'equipment':
      case 'find-error':
        if (!s.items.some((i) => i.correct)) err(`step ${s.id}: no correct item`);
        if (!s.items.some((i) => !i.correct)) err(`step ${s.id}: no distractor item`);
        if (new Set(s.items.map((o) => o.id)).size !== s.items.length) err(`step ${s.id}: duplicate item ids`);
        break;
      case 'branching':
        if (s.options.length < 2) err(`step ${s.id}: needs >= 2 options`);
        if (!s.options.some((o) => o.score === 100)) err(`step ${s.id}: needs one option with score 100`);
        break;
    }
  });
  c.steps.forEach((s) => {
    if (s.type === 'branching') {
      s.options.forEach((o) => {
        if (o.remedial) {
          const target = c.steps.find((x) => x.id === o.remedial);
          if (!target) err(`step ${s.id}: remedial '${o.remedial}' does not exist`);
          else if (!target.remedial) err(`step ${s.id}: remedial target '${o.remedial}' must set remedial:true`);
        }
      });
    }
  });
  if (!c.steps.some((s) => !s.remedial)) err('no main-flow steps');
  return errs;
}
