export type Segment = {
  id: string; // Assuming UUID from Supabase
  created_at: string; // ISO date string
  name: string;
  description?: string | null;
  criteria?: Record<string, unknown> | null; // JSONB or similar for segment criteria
  member_count?: number; // Could be a calculated field or updated via trigger
};
