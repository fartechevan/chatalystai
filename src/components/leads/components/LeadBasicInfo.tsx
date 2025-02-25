
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LeadBasicInfoProps {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function LeadBasicInfo({ name, value, onChange }: LeadBasicInfoProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={onChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="value">Value (RM)</Label>
        <Input
          id="value"
          name="value"
          type="number"
          value={value}
          onChange={onChange}
          placeholder="0"
        />
      </div>
    </>
  );
}
