
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(10, "Content must be at least 10 characters"),
});

type FormValues = z.infer<typeof formSchema>;

interface ImportDocumentFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function ImportDocumentForm({ onCancel, onSuccess }: ImportDocumentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chunks, setChunks] = useState<string[]>([]);
  const [showChunks, setShowChunks] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const splitIntoChunks = (content: string): string[] => {
    // Split by line breaks and filter out empty lines
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  const handlePreviewChunks = () => {
    const content = form.getValues("content");
    if (content) {
      const generatedChunks = splitIntoChunks(content);
      setChunks(generatedChunks);
      setShowChunks(true);
    } else {
      toast({
        variant: "destructive",
        title: "No content",
        description: "Please add content to preview chunks.",
      });
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      
      // Create document
      const { data: documentData, error: documentError } = await supabase
        .from("knowledge_documents")
        .insert({
          title: values.title,
          content: values.content,
        })
        .select("id")
        .single();
      
      if (documentError) throw documentError;
      
      // Generate chunks
      const documentChunks = splitIntoChunks(values.content);
      
      // Insert chunks
      if (documentChunks.length > 0) {
        const chunksToInsert = documentChunks.map((chunk) => ({
          document_id: documentData.id,
          content: chunk,
        }));
        
        const { error: chunksError } = await supabase
          .from("knowledge_chunks")
          .insert(chunksToInsert);
        
        if (chunksError) throw chunksError;
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
      
      setIsSubmitting(false);
      onSuccess();
      
    } catch (error) {
      setIsSubmitting(false);
      toast({
        variant: "destructive",
        title: "Error importing document",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Import Document</CardTitle>
      </CardHeader>
      <CardContent>
        {showChunks ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Document Chunks Preview</h3>
              <Button 
                variant="outline" 
                onClick={() => setShowChunks(false)}
              >
                Back to Edit
              </Button>
            </div>
            
            <div className="border rounded-md p-4 max-h-[400px] overflow-y-auto">
              <p className="text-sm text-muted-foreground mb-4">
                {chunks.length} chunks created from line breaks:
              </p>
              {chunks.map((chunk, index) => (
                <div key={index} className="mb-2 p-2 border rounded bg-muted/30">
                  <p className="text-sm whitespace-pre-wrap">{chunk}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
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
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Paste or type document content here" 
                        className="min-h-[300px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-between pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handlePreviewChunks}
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
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Import Document
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
      {showChunks && (
        <CardFooter className="flex justify-end">
          <Button onClick={() => {
            setShowChunks(false);
            form.handleSubmit(onSubmit)();
          }} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & Import
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
