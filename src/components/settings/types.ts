
export type Integration = {
  id: string;
  name: string;
  description: string | null;
  icon_url: string;
  status: 'available' | 'coming_soon';
  is_connected: boolean;
}
