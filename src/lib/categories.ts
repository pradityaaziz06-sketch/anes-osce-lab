import { Activity, BedDouble, ClipboardList, HeartPulse, PackageCheck, Siren, Stethoscope, Wind, type LucideIcon } from 'lucide-react';

export interface CategoryMeta { id: string; label: string; icon: LucideIcon }

export const CATEGORIES: CategoryMeta[] = [
  { id: 'pre-anesthesia', label: 'PRE-ANESTHESIA', icon: ClipboardList },
  { id: 'airway', label: 'AIRWAY', icon: Wind },
  { id: 'monitoring', label: 'MONITORING', icon: Activity },
  { id: 'preparation', label: 'PREPARATION', icon: PackageCheck },
  { id: 'intraoperative', label: 'INTRAOPERATIVE', icon: HeartPulse },
  { id: 'post-anesthesia', label: 'POST-ANESTHESIA', icon: BedDouble },
  { id: 'emergency', label: 'EMERGENCY', icon: Siren },
];

/** Unknown categories (added by admins in the database) still render with a sensible label. */
export function categoryMeta(id: string): CategoryMeta {
  return CATEGORIES.find((c) => c.id === id) ?? { id, label: id.replace(/-/g, ' ').toUpperCase(), icon: Stethoscope };
}

export function allCategories(extraIds: string[]): CategoryMeta[] {
  const known = new Set(CATEGORIES.map((c) => c.id));
  return [...CATEGORIES, ...[...new Set(extraIds)].filter((id) => !known.has(id)).map(categoryMeta)];
}
