import { format } from 'date-fns';

export const formatDate = (date: string | Date, formatString: string = 'dd-MM-yyyy'): string => {
  return format(new Date(date), formatString);
};

export const formatDateTime = (date: string | Date): string => {
  return format(new Date(date), 'dd-MM-yyyy HH:mm');
};

export const formatDateForInput = (date: string | Date): string => {
  return format(new Date(date), 'yyyy-MM-dd');
};