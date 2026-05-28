export type Category = {
  id: number;
  name: string;
  color: string;
  createdAt: number;
};

export type Period = 'morning' | 'day' | 'evening' | 'anytime';

export type Habit = {
  id: number;
  name: string;
  categoryId: number | null;
  icon: string | null;
  glyph: string;
  targetPerDay: number;
  period: Period;
  reminders: string[];
  freezesLeft: number;
  createdAt: number;
  archivedAt: number | null;
};

export type HabitLog = {
  id: number;
  habitId: number;
  date: string;
  count: number;
  frozen: boolean;
  createdAt: number;
};
