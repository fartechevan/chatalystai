
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ImportFormActionsProps {
  showChunks: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onPreviewChunks: () => void;
  hasContent: boolean;
}

export function ImportFormActions({
  showChunks,
  isSubmitting,
  onCancel,
  onPreviewChunks,
  hasContent
}: ImportFormActionsProps) {
  if (showChunks) return null;
  
  return (
    <div className="flex justify-between pt-2">
      <Button 
        type="button" 
        variant="outline" 
        onClick={onPreviewChunks}
        disabled={isSubmitting || !hasContent}
      >
        Preview Chunks
      </Button>
      
      <div className="space-x-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting || !hasContent}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Import Document
        </Button>
      </div>
    </div>
  );
}
