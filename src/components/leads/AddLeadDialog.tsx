
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { LeadBasicInfo } from "./components/LeadBasicInfo";
import { LeadContactInfo } from "./components/LeadContactInfo";
import { LeadCompanyInfo } from "./components/LeadCompanyInfo";
import { useLeadForm } from "./hooks/useLeadForm";

interface AddLeadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pipelineStageId: string | null;
  onLeadAdded: () => void;
}

export function AddLeadDialog({
  isOpen,
  onClose,
  pipelineStageId,
  onLeadAdded
}: AddLeadDialogProps) {
  const { formData, handleChange, handleSubmit } = useLeadForm(pipelineStageId, () => {
    onLeadAdded();
    onClose();
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            Initial Contact
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <LeadBasicInfo
            name={formData.name}
            value={formData.value}
            onChange={handleChange}
          />
          <LeadContactInfo
            contact_first_name={formData.contact_first_name}
            contact_phone={formData.contact_phone}
            contact_email={formData.contact_email}
            onChange={handleChange}
          />
          <LeadCompanyInfo
            company_name={formData.company_name}
            company_address={formData.company_address}
            onChange={handleChange}
          />
          <div className="flex justify-start gap-2 pt-4">
            <Button type="submit">Add</Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
