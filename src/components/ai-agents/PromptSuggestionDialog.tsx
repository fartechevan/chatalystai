import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger, // We might trigger this externally
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { suggestAIPrompt } from '@/services/aiAgents/agentService';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Calendar } from 'lucide-react';

interface PromptSuggestionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  originalPrompt: string; // The current prompt from the main form
  onApplySuggestion: (suggestion: string) => void; // Callback to update the main form
}

const PromptSuggestionDialog: React.FC<PromptSuggestionDialogProps> = ({
  isOpen,
  onOpenChange,
  originalPrompt,
  onApplySuggestion,
}) => {
  const [userPurpose, setUserPurpose] = useState(''); // User input for purpose/context
  const [suggestedPrompt, setSuggestedPrompt] = useState('');
  const [enableAppointmentBooking, setEnableAppointmentBooking] = useState(false); // New state for appointment booking toggle
  const { toast } = useToast();

  const suggestMutation = useMutation({
    mutationFn: () => suggestAIPrompt(originalPrompt, userPurpose, enableAppointmentBooking), // Pass appointment booking flag
    onSuccess: (data) => {
      setSuggestedPrompt(data);
      toast({ title: 'Suggestion generated.' });
    },
    onError: (error) => {
      console.error("Error suggesting prompt:", error);
      setSuggestedPrompt(''); // Clear previous suggestion on error
      toast({
        title: 'Suggestion Failed',
        description: error.message || 'Could not get prompt suggestion.',
        variant: 'destructive',
      });
    },
  });

  const handleGenerate = () => {
    // Basic validation could be added here if needed
    suggestMutation.mutate();
  };

  const handleApply = () => {
    if (suggestedPrompt) {
      onApplySuggestion(suggestedPrompt);
      onOpenChange(false); // Close dialog after applying
    }
  };

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!isOpen) {
      setUserPurpose('');
      setSuggestedPrompt('');
      setEnableAppointmentBooking(false);
      suggestMutation.reset();
    }
    // Only depend on isOpen. suggestMutation.reset is stable.
  }, [isOpen]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* Increased max-width for larger screens */}
      <DialogContent className="sm:max-w-[600px] lg:max-w-3xl"> 
        <DialogHeader>
          <DialogTitle>Generate Prompt Suggestion</DialogTitle>
          <DialogDescription>
            Provide some context or purpose for your agent, then generate an improved system prompt based on the template.
            The current prompt (if any) will also be used as context.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="purpose" className="text-right col-span-1">
              Purpose/Context
            </Label>
            <Textarea
              id="purpose"
              value={userPurpose}
              onChange={(e) => setUserPurpose(e.target.value)}
              placeholder="e.g., 'Handle customer support queries about billing and account issues.'"
              className="col-span-3"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="appointment-booking" className="text-right col-span-1">
              <Calendar className="inline w-4 h-4 mr-2" />
              Appointment Booking
            </Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Switch
                id="appointment-booking"
                checked={enableAppointmentBooking}
                onCheckedChange={setEnableAppointmentBooking}
              />
              <Label htmlFor="appointment-booking" className="text-sm text-muted-foreground">
                Enable appointment booking capabilities in the suggested prompt
              </Label>
            </div>
          </div>
           <div className="flex justify-end">
             <Button onClick={handleGenerate} disabled={suggestMutation.isPending}>
               {suggestMutation.isPending ? 'Generating...' : 'Generate'}
             </Button>
           </div>
          {suggestMutation.isSuccess && suggestedPrompt && (
            <div className="grid grid-cols-4 items-start gap-4">
               <Label htmlFor="suggestion" className="text-right col-span-1 pt-2">
                Suggestion
              </Label>
              <Textarea
                id="suggestion"
                readOnly
                value={suggestedPrompt}
                className="col-span-3 bg-muted"
                rows={10}
              />
            </div>
          )}
           {suggestMutation.isError && (
             <p className="text-sm text-destructive col-span-4 text-center">Failed to generate suggestion. Please try again.</p>
           )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
             <Button type="button" variant="secondary">Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleApply} disabled={!suggestedPrompt || suggestMutation.isPending}>
            Apply Suggestion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PromptSuggestionDialog;
