import { Button } from "@/components/ui/button";
import { BaseDialog } from "./BaseDialog";
import { supabase } from "@/integrations/supabase/client";

interface DeviceSelectProps {
  open: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  // handleDeviceSelect removed
  handleConnect: () => void;
}

export function DeviceSelect({
  open,
  onClose,
  onOpenChange,
  // handleDeviceSelect removed
  handleConnect
}: DeviceSelectProps) {
  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      onClose={onClose}
      title="All conversations. One inbox."
      description="Ready to get all your sales tools in a single inbox? Let's start by connecting WhatsApp."
    >
      <div className="space-y-6">
        <div className="flex justify-center">
          <img
            src={supabase.storage.from('assets').getPublicUrl('wa-lite-select-device@x2.png').data.publicUrl}
            alt="WhatsApp Connection"
            className="max-w-full h-auto mb-8"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="outline"
            size="lg"
            className="w-full py-8 text-lg"
            onClick={handleConnect} // Changed onClick to handleConnect
          >
            Android
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full py-8 text-lg"
            onClick={handleConnect} // Changed onClick to handleConnect
          >
            iPhone
          </Button>
        </div>
      </div>
    </BaseDialog>
  );
}
