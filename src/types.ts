export type Discipline =
  | 'Structural'
  | 'MEP'
  | 'Electrical'
  | 'Steelwork';

// Location is now a free string — managed dynamically via Grid Settings
export type Location = string;

export interface Task {
  id: string;
  name: string;
  discipline: Discipline;
  location: Location;
  date: string;           // YYYY-MM-DD
  contractor: string;     // Full name e.g. "BPC (Concrete)"
  contractorColor: string;// derived from discipline
  isDone: boolean;
  duration: number;       // working days, min 1
  notes?: string;
}
