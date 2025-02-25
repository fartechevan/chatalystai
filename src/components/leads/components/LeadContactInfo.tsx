
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LeadContactInfoProps {
  contact_first_name: string;
  contact_phone: string;
  contact_email: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function LeadContactInfo({
  contact_first_name,
  contact_phone,
  contact_email,
  onChange
}: LeadContactInfoProps) {
  return (
    <div className="space-y-2">
      <Label>Contact Information</Label>
      <Input
        name="contact_first_name"
        value={contact_first_name}
        onChange={onChange}
        placeholder="First name"
        className="mb-2"
      />
      <Input
        name="contact_phone"
        value={contact_phone}
        onChange={onChange}
        placeholder="Phone"
        className="mb-2"
      />
      <Input
        name="contact_email"
        type="email"
        value={contact_email}
        onChange={onChange}
        placeholder="Email"
      />
    </div>
  );
}
