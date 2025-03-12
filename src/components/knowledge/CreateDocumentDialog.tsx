
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FilePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

interface CreateDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (documentId: string) => void;
}

export function CreateDocumentDialog({ open, onOpenChange, onSuccess }: CreateDocumentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("You must be logged in to create a document");
      }

      // Create document with user_id
      const { data: documentData, error: documentError } = await supabase
        .from("knowledge_documents")
        .insert({
          title: values.title,
          content: values.description || "",
          chunking_method: "manual", // Default method for manual creation
          file_type: "text",
          user_id: user.id, // Add user_id to satisfy RLS policy
        })
        .select("id")
        .single();

      if (documentError) {
        throw documentError;
      }

      // Refresh documents list
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });

      // Reset form and close dialog
      setIsSubmitting(false);
      onOpenChange(false);
      form.reset();
      
      // Call success handler with the new document ID
      onSuccess(documentData.id);

      toast({
        title: "Document created",
        description: "Your document has been created. Now you can add chunks to it.",
      });
    } catch (error) {
      setIsSubmitting(false);
      console.error("Error creating document:", error);
      toast({
        variant: "destructive",
        title: "Error creating document",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus className="h-5 w-5" />
            Create New Document
          </DialogTitle>
          <DialogDescription>
            Create a new document to store your knowledge
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter document title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Description/Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter document content or description"
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Create Document
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
