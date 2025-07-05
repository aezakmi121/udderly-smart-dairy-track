
export interface CowGroup {
  id: string;
  group_name: string;
  description: string | null;
  min_yield: number | null;
  max_yield: number | null;
  min_days_in_milk: number | null;
  max_days_in_milk: number | null;
  feed_requirements: Record<string, any> | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}
