
export interface Customer {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  company_name?: string | null;
  company_address?: string | null;
}
