export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type StepType = 'mcq' | 'sequence' | 'equipment' | 'find-error' | 'branching';
export type Mode = 'practice' | 'exam';

export interface Vitals {
  bp?: string;
  hr?: number;
  spo2?: number;
  temp?: number;
  rr?: number;
  etco2?: number;
}
export interface Option { id: string; text: string }
export interface SelectItem { id: string; label: string; detail?: string; correct: boolean; why?: string }
export interface BranchOption { id: string; text: string; score: number; consequence: string; remedial?: string }

interface StepBase {
  id: string;
  title?: string;
  tag: string;
  situation?: string;
  prompt: string;
  critical?: boolean;
  /** Remedial steps are only shown when a branching choice points to them. */
  remedial?: boolean;
  /** Vitals that change when this step is reached (merged over earlier vitals). */
  vitals?: Vitals;
  /** History lines that are revealed when this step is reached. */
  revealHistory?: string[];
  explanation: string;
  takeaway: string;
}
export interface McqStep extends StepBase { type: 'mcq'; options: Option[]; correct: string }
/** `items` are authored in the CORRECT order; the UI shuffles them. */
export interface SequenceStep extends StepBase { type: 'sequence'; items: Option[] }
export interface SelectStep extends StepBase { type: 'equipment' | 'find-error'; instruction?: string; items: SelectItem[] }
export interface BranchingStep extends StepBase { type: 'branching'; options: BranchOption[] }
export type Step = McqStep | SequenceStep | SelectStep | BranchingStep;

export interface Weights { accuracy: number; critical: number; sequence: number; time: number; mistakes: number }

export interface CaseData {
  id: string;
  number: number;
  title: string;
  category: string;
  difficulty: Difficulty;
  durationMin: number;
  summary: string;
  scenario: string;
  objectives: string[];
  patient: { sex: string; age: number; procedure: string; note?: string };
  vitals: Vitals;
  history: string[];
  references?: { title: string; org?: string }[];
  scoring?: { weights?: Partial<Weights> };
  steps: Step[];
}

export interface StepResult { score: number; correct: boolean; partial: boolean }
export interface AnswerRecord { stepId: string; response: unknown; score: number; correct: boolean; timeMs: number }

export interface Breakdown { accuracy: number; critical: number; sequence: number | null; time: number; mistakes: number }
export interface TagStat { avg: number; n: number }
export interface FinalResult {
  breakdown: Breakdown;
  final: number;
  grade: string;
  mistakes: number;
  correctCount: number;
  criticalMissed: boolean;
  perfect: boolean;
  timedOut: boolean;
  durationMs: number;
  tagStats: Record<string, TagStat>;
  strongest: string | null;
  weakest: string | null;
  xpGained: number;
}

export interface Attempt extends Omit<FinalResult, 'timedOut'> {
  id: string;
  caseId: string;
  mode: Mode;
  startedAt: string;
  timedOut: boolean;
  queue: string[];
  answers: AnswerRecord[];
  newBadges: string[];
  levelUp?: number;
}

export interface Profile { name: string; studentId: string; program: string; semester: string }
