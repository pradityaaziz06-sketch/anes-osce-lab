import type { Step } from './types';

/** Human-readable text of a stored response. */
export function describeResponse(step: Step, response: unknown): string[] {
  switch (step.type) {
    case 'mcq': return [step.options.find((o) => o.id === response)?.text ?? 'Tidak ada jawaban'];
    case 'branching': return [step.options.find((o) => o.id === response)?.text ?? 'Tidak ada jawaban'];
    case 'sequence': {
      const ids = Array.isArray(response) ? (response as string[]) : [];
      return ids.map((id) => step.items.find((i) => i.id === id)?.text ?? id);
    }
    case 'equipment':
    case 'find-error': {
      const ids = new Set(Array.isArray(response) ? (response as string[]) : []);
      const picked = step.items.filter((i) => ids.has(i.id)).map((i) => i.label);
      return picked.length ? picked : ['Tidak ada yang dipilih'];
    }
  }
}

export function describeCorrect(step: Step): string[] {
  switch (step.type) {
    case 'mcq': return [step.options.find((o) => o.id === step.correct)?.text ?? ''];
    case 'branching': return [[...step.options].sort((a, b) => b.score - a.score)[0].text];
    case 'sequence': return step.items.map((i) => i.text);
    case 'equipment':
    case 'find-error': return step.items.filter((i) => i.correct).map((i) => i.label);
  }
}

export const TYPE_LABEL: Record<Step['type'], string> = {
  mcq: 'PILIHAN GANDA',
  sequence: 'URUTAN',
  equipment: 'PILIH PERALATAN',
  'find-error': 'TEMUKAN KESALAHAN',
  branching: 'KEPUTUSAN BERCABANG',
};
