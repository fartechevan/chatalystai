
import { Button } from "@/components/ui/button";
import { BaseDialog } from "./BaseDialog";

interface DeviceSelectProps {
  open: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  handleDeviceSelect: () => void;
  handleConnect: () => void;
}

export function DeviceSelect({
  open,
  onClose,
  onOpenChange,
  handleDeviceSelect,
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
            src="https://vezdxxqzzcjkunoaxcxc.supabase.co/storage/v1/object/sign/fartech/wa-lite-select-device@x2.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJmYXJ0ZWNoL3dhLWxpdGUtc2VsZWN0LWRldmljZUB4Mi5wbmciLCJpYXQiOjE3NDAxNDIyNTMsImV4cCI6MjA1NTUwMjI1M30.IzZbXVzJpb9WnwMjCr5VkI4KfG-r_4PpNEBMyOKr3t4"
            alt="WhatsApp Connection"
            className="max-w-full h-auto mb-8"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="outline" 
            size="lg"
            className="w-full py-8 text-lg"
            onClick={handleConnect}
          >
            Android
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            className="w-full py-8 text-lg"
            onClick={handleConnect}
          >
            iPhone
          </Button>
        </div>
      </div>
    </BaseDialog>
  );
}
