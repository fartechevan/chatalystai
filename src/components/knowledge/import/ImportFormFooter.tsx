
import { CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ImportFormFooterProps {
  showChunks: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

export function ImportFormFooter({
  showChunks,
  isSubmitting,
  onBack,
  onConfirm
}: ImportFormFooterProps) {
  if (!showChunks) return null;
  
  return (
    <CardFooter className="flex justify-end gap-2">
      <Button 
        variant="outline" 
        onClick={onBack}
        disabled={isSubmitting}
      >
        Back to Edit
      </Button>
      <Button 
        onClick={onConfirm} 
        disabled={isSubmitting}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Confirm & Import
      </Button>
    </CardFooter>
  );
}
