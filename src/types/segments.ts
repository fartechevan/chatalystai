import { Database } from '@/integrations/supabase/types';

// Base segment type from database
export type Segment = Database['public']['Tables']['segments']['Row'] & {
  member_count?: number; // Could be a calculated field or updated via trigger
};
