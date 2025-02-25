
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LeadCompanyInfoProps {
  company_name: string;
  company_address: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function LeadCompanyInfo({
  company_name,
  company_address,
  onChange
}: LeadCompanyInfoProps) {
  return (
    <div className="space-y-2">
      <Label>Company Information</Label>
      <Input
        name="company_name"
        value={company_name}
        onChange={onChange}
        placeholder="Company name"
        className="mb-2"
      />
      <Input
        name="company_address"
        value={company_address}
        onChange={onChange}
        placeholder="Company address"
      />
    </div>
  );
}
