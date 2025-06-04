export type Customer = {
  id: string; // Assuming UUID from Supabase
  created_at: string; // ISO date string
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  // Add other relevant customer fields from your 'customer' table schema
  // For example:
  // company?: string | null;
  // address?: string | null;
  // tags?: string[] | null;
  // last_contacted?: string | null; // ISO date string
  // status?: 'active' | 'inactive' | 'lead' | 'archived' | null;
};
