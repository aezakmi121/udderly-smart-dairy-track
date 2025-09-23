import { format, parseISO, differenceInDays, isValid } from 'date-fns';

// PD Rules Constants
export const PD_MIN_DAYS = 45;
export const PD_MAX_DAYS = 60;

// Helper Types
export interface AIRecord {
  id: string;
  ai_date: string;
  service_number: number;
  ai_status: string;
  pd_done: boolean;
  pd_result?: 'positive' | 'negative';
  pd_date?: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  notes?: string;
  cows?: {
    id: string;
    cow_number: string;
    needs_milking_move?: boolean;
    needs_milking_move_at?: string;
    moved_to_milking?: boolean;
    moved_to_milking_at?: string;
  };
}

export interface CowSummary {
  cowId: string;
  cowNumber: string;
  latestAIDate: string;
  serviceNumber: number;
  status: 'Pregnant' | 'Not Pregnant' | 'Failed' | 'Pending' | 'Delivered';
  expectedDeliveryDate?: string;
  pdDate?: string;
  deliveredDate?: string;
  notes?: string;
  needsMilkingMove: boolean;
  needsMilkingMoveAt?: string;
  movedToMilking: boolean;
  movedToMilkingAt?: string;
  aiRecord: AIRecord;
}

// Date Utilities
export const safeParse = (dateStr?: string): Date | null => {
  if (!dateStr) return null;
  const parsed = parseISO(dateStr);
  return isValid(parsed) ? parsed : null;
};

export const getDaysAfterAI = (aiDate: string, today?: Date): number | null => {
  const ai = safeParse(aiDate);
  if (!ai) return null;
  return differenceInDays(today || new Date(), ai);
};

export const getDaysToDelivery = (expectedDeliveryDate?: string, today?: Date): number | null => {
  const edd = safeParse(expectedDeliveryDate);
  if (!edd) return null;
  return differenceInDays(edd, today || new Date());
};

export const isPDDue = (aiDate: string, pdDone: boolean, today?: Date): boolean => {
  if (pdDone) return false;
  const daysAfter = getDaysAfterAI(aiDate, today);
  return daysAfter !== null && daysAfter >= PD_MIN_DAYS && daysAfter <= PD_MAX_DAYS;
};

export const isPDOverdue = (aiDate: string, pdDone: boolean, today?: Date): boolean => {
  if (pdDone) return false;
  const daysAfter = getDaysAfterAI(aiDate, today);
  return daysAfter !== null && daysAfter > PD_MAX_DAYS;
};

export const pdTargetDate = (aiDate: string): string => {
  const ai = safeParse(aiDate);
  if (!ai) return 'Invalid Date';
  const targetDate = new Date(ai);
  targetDate.setDate(targetDate.getDate() + PD_MAX_DAYS);
  return formatCowDate(targetDate.toISOString());
};

export const formatCowDate = (dateStr?: string): string => {
  if (!dateStr) return 'N/A';
  const date = safeParse(dateStr);
  return date ? format(date, 'dd-MM-yyyy') : 'Invalid Date';
};

// Grouping and Sorting Logic
export enum SortGroup {
  MOVE_TO_MILKING = 1,
  ABOUT_TO_DELIVER = 2,
  PD_DUE = 3,
  PD_OVERDUE = 4,
  FLAGGED = 5,
  EVERYTHING_ELSE = 6
}

export const getCowSortGroup = (cow: CowSummary, today?: Date): SortGroup => {
  const currentDate = today || new Date();
  const daysToDelivery = getDaysToDelivery(cow.expectedDeliveryDate, currentDate);
  const daysAfterAI = getDaysAfterAI(cow.latestAIDate, currentDate);
  
  // Group 1: 2 months before EDD (Move to Milking Group)
  if (cow.aiRecord.pd_done && cow.aiRecord.pd_result === 'positive' && 
      daysToDelivery !== null && daysToDelivery >= 45 && daysToDelivery <= 75) {
    return SortGroup.MOVE_TO_MILKING;
  }
  
  // Group 2: About to deliver (0-35 days)
  if (cow.aiRecord.pd_done && cow.aiRecord.pd_result === 'positive' && 
      daysToDelivery !== null && daysToDelivery >= 0 && daysToDelivery <= 35) {
    return SortGroup.ABOUT_TO_DELIVER;
  }
  
  // Group 3: PD Due
  if (isPDDue(cow.latestAIDate, cow.aiRecord.pd_done, currentDate)) {
    return SortGroup.PD_DUE;
  }
  
  // Group 4: PD Overdue
  if (isPDOverdue(cow.latestAIDate, cow.aiRecord.pd_done, currentDate)) {
    return SortGroup.PD_OVERDUE;
  }
  
  // Group 5: Flagged for milking move
  if (cow.needsMilkingMove && !cow.movedToMilking) {
    return SortGroup.FLAGGED;
  }
  
  // Group 6: Everything else
  return SortGroup.EVERYTHING_ELSE;
};

export const compareCows = (a: CowSummary, b: CowSummary, today?: Date): number => {
  const currentDate = today || new Date();
  
  // Primary sort: by group priority
  const groupA = getCowSortGroup(a, currentDate);
  const groupB = getCowSortGroup(b, currentDate);
  
  if (groupA !== groupB) {
    return groupA - groupB;
  }
  
  // Secondary sort: within-group sorting
  switch (groupA) {
    case SortGroup.MOVE_TO_MILKING: {
      // Sort by distance from 60 days, then by days to delivery
      const daysToDeliveryA = getDaysToDelivery(a.expectedDeliveryDate, currentDate) || 999;
      const daysToDeliveryB = getDaysToDelivery(b.expectedDeliveryDate, currentDate) || 999;
      const distanceA = Math.abs(daysToDeliveryA - 60);
      const distanceB = Math.abs(daysToDeliveryB - 60);
      
      if (distanceA !== distanceB) return distanceA - distanceB;
      return daysToDeliveryA - daysToDeliveryB;
    }
    
    case SortGroup.ABOUT_TO_DELIVER: {
      // Sort by days to delivery ascending (soonest first)
      const daysToDeliveryA = getDaysToDelivery(a.expectedDeliveryDate, currentDate) || 999;
      const daysToDeliveryB = getDaysToDelivery(b.expectedDeliveryDate, currentDate) || 999;
      return daysToDeliveryA - daysToDeliveryB;
    }
    
    case SortGroup.PD_DUE: {
      // Sort by days after AI descending (closer to 60 first)
      const daysAfterAIA = getDaysAfterAI(a.latestAIDate, currentDate) || 0;
      const daysAfterAIB = getDaysAfterAI(b.latestAIDate, currentDate) || 0;
      return daysAfterAIB - daysAfterAIA;
    }
    
    case SortGroup.PD_OVERDUE: {
      // Sort by days after AI descending (most overdue first)
      const daysAfterAIA = getDaysAfterAI(a.latestAIDate, currentDate) || 0;
      const daysAfterAIB = getDaysAfterAI(b.latestAIDate, currentDate) || 0;
      return daysAfterAIB - daysAfterAIA;
    }
    
    case SortGroup.FLAGGED: {
      // Sort by flag date ascending (older flags first)
      const flagDateA = safeParse(a.needsMilkingMoveAt)?.getTime() || 0;
      const flagDateB = safeParse(b.needsMilkingMoveAt)?.getTime() || 0;
      return flagDateA - flagDateB;
    }
    
    default: {
      // Everything else: latest AI date desc, then cow number asc
      const aiDateCompare = b.latestAIDate.localeCompare(a.latestAIDate);
      if (aiDateCompare !== 0) return aiDateCompare;
      return a.cowNumber.localeCompare(b.cowNumber, undefined, { numeric: true });
    }
  }
};

// Parse numeric cow number safely
export const parseNumericCowNumber = (cowNumber: string): number => {
  const parsed = parseInt(cowNumber, 10);
  return isNaN(parsed) ? 999999 : parsed;
};