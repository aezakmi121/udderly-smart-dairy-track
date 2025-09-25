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

// --- New comparator helpers ---
const getPDDueTimestamp = (cow: CowSummary): number => {
  const ai = safeParse(cow.latestAIDate);
  if (!ai) return Number.POSITIVE_INFINITY;
  const due = new Date(ai);
  due.setDate(due.getDate() + PD_MAX_DAYS);
  return due.getTime();
};

const getEDDTimestamp = (cow: CowSummary): number => {
  const edd = safeParse(cow.expectedDeliveryDate);
  return edd ? edd.getTime() : Number.POSITIVE_INFINITY;
};

const getDTD = (cow: CowSummary, today?: Date): number => {
  const d = getDaysToDelivery(cow.expectedDeliveryDate, today);
  return d == null ? Number.POSITIVE_INFINITY : d;
};

// --- New compareCows ---
export const compareCows = (a: CowSummary, b: CowSummary, today?: Date): number => {
  const currentDate = today || new Date();

  // 0) Delivered always at bottom
  const aDelivered = a.status === 'Delivered';
  const bDelivered = b.status === 'Delivered';
  if (aDelivered && !bDelivered) return 1;
  if (!aDelivered && bDelivered) return -1;
  if (aDelivered && bDelivered) {
    const tA = safeParse(a.deliveredDate)?.getTime() ?? 0;
    const tB = safeParse(b.deliveredDate)?.getTime() ?? 0;
    return tB - tA; // newest delivered first
  }

  // 1) Primary key: SortGroup
  const gA = getCowSortGroup(a, currentDate);
  const gB = getCowSortGroup(b, currentDate);
  if (gA !== gB) return gA - gB;

  // 2) Per-group tie-breakers
  switch (gA) {
    case SortGroup.MOVE_TO_MILKING:
    case SortGroup.ABOUT_TO_DELIVER: {
      const dA = getDTD(a, currentDate);
      const dB = getDTD(b, currentDate);
      if (dA !== dB) return dA - dB;

      const tA = getEDDTimestamp(a);
      const tB = getEDDTimestamp(b);
      if (tA !== tB) return tA - tB;
      break;
    }

    case SortGroup.PD_DUE:
    case SortGroup.PD_OVERDUE: {
      // Sort purely by PD due date (earliest first)
      const pA = getPDDueTimestamp(a);
      const pB = getPDDueTimestamp(b);
      if (pA !== pB) return pA - pB;
      
      // If PD due dates are same, sort by service number (lower first - earlier AI)
      if (a.serviceNumber !== b.serviceNumber) {
        return a.serviceNumber - b.serviceNumber;
      }
      
      // Final fallback: cow number
      return parseNumericCowNumber(a.cowNumber) - parseNumericCowNumber(b.cowNumber);
    }

    case SortGroup.FLAGGED: {
      const fA = safeParse(a.needsMilkingMoveAt ?? '')?.getTime() ?? Number.POSITIVE_INFINITY;
      const fB = safeParse(b.needsMilkingMoveAt ?? '')?.getTime() ?? Number.POSITIVE_INFINITY;
      if (fA !== fB) return fA - fB;

      const dA = getDTD(a, currentDate);
      const dB = getDTD(b, currentDate);
      if (dA !== dB) return dA - dB;
      break;
    }

    case SortGroup.EVERYTHING_ELSE:
    default:
      break;
  }

  // 3) Global fallback: latest AI first, then cow number
  const tAIa = safeParse(a.latestAIDate)?.getTime() ?? 0;
  const tAIb = safeParse(b.latestAIDate)?.getTime() ?? 0;
  if (tAIa !== tAIb) return tAIb - tAIa;

  return parseNumericCowNumber(a.cowNumber) - parseNumericCowNumber(b.cowNumber);
};

// Parse numeric cow number safely
export const parseNumericCowNumber = (cowNumber: string): number => {
  const parsed = parseInt(cowNumber, 10);
  return isNaN(parsed) ? 999999 : parsed;
};
