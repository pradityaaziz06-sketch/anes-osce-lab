/**
 * CASE REGISTRY
 * To add a station: drop a new JSON file into src/data/cases/ following the same shape,
 * import it below and add it to LOCAL_CASES. No UI code needs to change.
 * (With Supabase configured, cases are read from the database instead. See README.)
 */
import type { CaseData } from '@/lib/types';
import c01 from './cases/01-pre-anesthesia-assessment.json';
import c02 from './cases/02-airway-management.json';
import c03 from './cases/03-before-induction-safety-check.json';
import c04 from './cases/04-perioperative-monitoring.json';
import c05 from './cases/05-post-anesthesia-care.json';
import c06 from './cases/06-anaphylaxis-emergency.json';

export const LOCAL_CASES: CaseData[] = ([c01, c02, c03, c04, c05, c06] as unknown as CaseData[]).sort(
  (a, b) => a.number - b.number,
);
