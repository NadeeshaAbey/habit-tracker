export type Category = {
  id: number;
  name: string;
  color: string;
  createdAt: number;
};

export type Habit = {
  id: number;
  name: string;
  categoryId: number | null;
  icon: string | null;
  targetPerDay: number;
  createdAt: number;
  archivedAt: number | null;
};

export type HabitLog = {
  id: number;
  habitId: number;
  date: string;
  count: number;
  createdAt: number;
};
