
export const BOARD_START_DATE = '2026-04-07';

// Default grid dimensions (overridable via Grid Settings)
export const DEFAULT_NUM_WEEKS = 12;
export const DEFAULT_LOCATIONS: string[] = [
  'Basement',
  'Ground Floor',
  'Floor 1',
  'Floor 2',
  'Floor 3',
  'Roof',
];

export const DISCIPLINES = [
  'Structural',
  'MEP',
  'Electrical',
  'Steelwork',
] as const;

export const CONTRACTORS = [
  { label: 'CFE (Main)',      initials: 'CF' },
  { label: 'VMA (MEP)',       initials: 'VM' },
  { label: 'BPC (Concrete)',  initials: 'BP' },
  { label: 'LMB (Steel)',     initials: 'LM' },
] as const;

/** Derive 2-letter avatar initials from a contractor label */
export function contractorInitials(label: string): string {
  return label.split(' ')[0].slice(0, 2).toUpperCase();
}
