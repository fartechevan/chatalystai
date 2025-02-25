import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface TransferLeadsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (transfers: Record<string, string>) => void;
  stagesToTransfer: { id: string; name: string }[];
  availableStages: { id: string; name: string }[];
}

export function TransferLeadsDialog({
  isOpen,
  onClose,
  onConfirm,
  stagesToTransfer,
  availableStages
}: TransferLeadsDialogProps) {
  const [transfers, setTransfers] = useState<Record<string, string>>({});

  const handleStageSelect = (oldStageId: string, newStageId: string) => {
    setTransfers(prev => ({
      ...prev,
      [oldStageId]: newStageId
    }));
  };

  const handleSave = () => {
    onConfirm(transfers);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer your leads</DialogTitle>
          <p className="text-muted-foreground">
            Looks like your pipeline's already seen some action! Select where you want to send
            the leads from each of your existing stages.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {stagesToTransfer.map((stage) => (
            <div key={stage.id} className="grid grid-cols-[1fr,auto,1fr] items-center gap-4">
              <div className="bg-yellow-100 p-2 rounded">
                {stage.name}
              </div>
              <div>→</div>
              <Select
                value={transfers[stage.id]}
                onValueChange={(value) => handleStageSelect(stage.id, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {availableStages.map((targetStage) => (
                    <SelectItem key={targetStage.id} value={targetStage.id}>
                      {targetStage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
