import { parse, differenceInCalendarDays } from "date-fns";

const FMT = "yyyy-MM-dd"; // Changed to match ISO date format
const TODAY = new Date();
const CLOSE_UP_DAYS = 60;

const d = (s?: string) => (s ? parse(s, FMT, TODAY) : undefined);
const daysTo = (s?: string) => {
  const dt = d(s);
  return dt ? differenceInCalendarDays(dt, TODAY) : undefined;
};
const daysSince = (s?: string) => {
  const dt = d(s);
  return dt ? -differenceInCalendarDays(dt, TODAY) : undefined; // positive = days since
};

type Status = "Pregnant" | "Pending" | "Delivered";
type Cow = {
  cow_no: number;
  status: Status;
  expected_delivery?: string; // yyyy-MM-dd
  pd_due?: string;            // yyyy-MM-dd
  delivered_on?: string;      // yyyy-MM-dd
  ai_date?: string;           // yyyy-MM-dd
  service_no?: number;
};

const group = (c: Cow): number => {
  if (c.status === "Pregnant") {
    const t = daysTo(c.expected_delivery);
    if (t !== undefined && t <= CLOSE_UP_DAYS) return 0;
    return 1;
  }
  if (c.status === "Pending") return 2;
  if (c.status === "Delivered") return 3;
  return 9;
};

const secondary = (c: Cow): number => {
  switch (group(c)) {
    case 0:
    case 1:
      return daysTo(c.expected_delivery) ?? 9999; // closer delivery = smaller number = higher priority
    case 2:
      return daysTo(c.pd_due) ?? 9999; // overdue = negative = higher priority
    case 3:
      return -(daysSince(c.delivered_on) ?? 0); // more recent delivery = higher priority
    default:
      return 9999;
  }
};

export function cowComparator(a: Cow, b: Cow): number {
  const ga = group(a), gb = group(b);
  if (ga !== gb) return ga - gb;

  const sa = secondary(a), sb = secondary(b);
  if (sa !== sb) return sa - sb;

  const aAI = d(a.ai_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const bAI = d(b.ai_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (aAI !== bAI) return aAI - bAI;

  const aSvc = a.service_no ?? 99, bSvc = b.service_no ?? 99;
  if (aSvc !== bSvc) return aSvc - bSvc;

  return a.cow_no - b.cow_no;
}

// Adapter function to work with existing CowSummary interface
export function adaptCowSummaryForSorting(cowSummary: any): Cow {
  return {
    cow_no: parseInt(cowSummary.cowNumber) || 0,
    status: cowSummary.status === "Delivered" ? "Delivered" : 
            cowSummary.status === "Pregnant" ? "Pregnant" : "Pending",
    expected_delivery: cowSummary.expectedDeliveryDate,
    pd_due: cowSummary.aiRecord ? 
            calculatePDDueDate(cowSummary.latestAIDate) : undefined,
    delivered_on: cowSummary.deliveredDate,
    ai_date: cowSummary.latestAIDate,
    service_no: cowSummary.serviceNumber
  };
}

function calculatePDDueDate(aiDate: string): string {
  const ai = d(aiDate);
  if (!ai) return '';
  const pdDue = new Date(ai);
  pdDue.setDate(pdDue.getDate() + 60); // PD due 60 days after AI
  return `${pdDue.getFullYear()}-${(pdDue.getMonth() + 1).toString().padStart(2, '0')}-${pdDue.getDate().toString().padStart(2, '0')}`;
}

export function sortCowSummaries(cowSummaries: any[]): any[] {
  const sorted = [...cowSummaries].sort((a, b) => {
    const cowA = adaptCowSummaryForSorting(a);
    const cowB = adaptCowSummaryForSorting(b);
    const result = cowComparator(cowA, cowB);
    
    // Debug logging
    if (cowA.cow_no === 6 || cowB.cow_no === 6 || cowA.cow_no === 16 || cowB.cow_no === 16) {
      console.log(`Comparing cow ${cowA.cow_no} vs ${cowB.cow_no}:`, {
        cowA: { status: cowA.status, expected_delivery: cowA.expected_delivery, pd_due: cowA.pd_due },
        cowB: { status: cowB.status, expected_delivery: cowB.expected_delivery, pd_due: cowB.pd_due },
        result
      });
    }
    
    return result;
  });
  
  console.log('Final sorted order:', sorted.map(cow => `Cow ${cow.cowNumber} (${cow.status}) - ${cow.expectedDeliveryDate || cow.latestAIDate}`));
  return sorted;
}