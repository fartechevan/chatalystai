
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeviceSelectProps {
  open: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  onIPhoneSelect: () => void;
}

export function DeviceSelect({ 
  open, 
  onClose, 
  onOpenChange, 
  onIPhoneSelect 
}: DeviceSelectProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>All conversations. One inbox.</DialogTitle>
          <DialogDescription>
            Ready to get all your sales tools in a single inbox?
            Let's start by connecting WhatsApp.
          </DialogDescription>
        </DialogHeader>
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
            >
              Android
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="w-full py-8 text-lg"
              onClick={onIPhoneSelect}
            >
              iPhone
            </Button>
          </div>
        </div>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <span className="sr-only">Close</span>
          
        </button>
      </DialogContent>
    </Dialog>
  );
}
