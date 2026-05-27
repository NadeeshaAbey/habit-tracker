import { format } from 'date-fns';

export const todayKey = () => format(new Date(), 'yyyy-MM-dd');
export const formatDate = (date: Date) => format(date, 'EEEE, MMM d');
