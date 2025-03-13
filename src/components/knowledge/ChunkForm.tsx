import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
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
  content: z.string().min(1, "Chunk content is required"),
});

export function ChunkForm({
  documentId,
  onClose,
  refetch
}: {
  documentId: string;
  onClose: () => void;
  refetch?: () => void;
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);

      const { data, error } = await supabase
        .from("knowledge_chunks")
        .insert({
          document_id: documentId,
          content: values.content,
        })
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Chunk created",
        description: "Your chunk has been successfully created.",
      });

      form.reset();
      onClose();
      refetch && refetch();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error creating chunk",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Add New Chunk</DialogTitle>
        <DialogDescription>
          Add a new chunk to the document.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chunk Content</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter chunk content"
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
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Create Chunk
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
