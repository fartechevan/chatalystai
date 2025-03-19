
import { useState, useRef } from "react";
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
import { Loader2, Upload, FileText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChunkingMethod, 
  ChunkingOptions, 
  generateChunks 
} from "./utils/chunkingUtils";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
  chunkingMethod: z.enum(["lineBreak", "paragraph"], {
    required_error: "Please select a chunking method",
  }),
  lineBreakPattern: z.string().optional(),
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
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState<string>("");
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      chunkingMethod: "lineBreak",
      lineBreakPattern: "\\n",
    },
  });

  const chunkingMethod = form.watch("chunkingMethod");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a PDF file.",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
      });
      return;
    }

    setPdfFile(file);
    form.setValue("title", file.name.replace(/\.pdf$/, ""));
    
    // Generate preview URL
    const previewUrl = URL.createObjectURL(file);
    setPdfPreviewUrl(previewUrl);

    // Process PDF
    try {
      setIsProcessingPdf(true);
      // Import PDF.js dynamically
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
      // Load PDF document
      const loadingTask = pdfjsLib.getDocument(previewUrl);
      const pdf = await loadingTask.promise;
      
      let extractedText = '';
      
      // Extract text from each page
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const textItems = textContent.items.map((item: any) => item.str).join(' ');
        extractedText += textItems + '\n\n';
      }
      
      setPdfText(extractedText);
      form.setValue("content", extractedText);
      setIsProcessingPdf(false);
      
      toast({
        title: "PDF processed successfully",
        description: `Extracted ${extractedText.length} characters from ${pdf.numPages} pages.`,
      });
    } catch (error) {
      console.error("Error processing PDF:", error);
      setIsProcessingPdf(false);
      toast({
        variant: "destructive",
        title: "Error processing PDF",
        description: error instanceof Error ? error.message : "Failed to extract text from PDF",
      });
    }
  };

  const handleManualUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePreviewChunks = () => {
    const content = form.getValues("content");
    const method = form.getValues("chunkingMethod");
    const lineBreakPattern = form.getValues("lineBreakPattern");
    
    if (content) {
      const options: ChunkingOptions = {
        method: method as ChunkingMethod,
        lineBreakPattern,
      };
      
      const generatedChunks = generateChunks(content, options);
      setChunks(generatedChunks);
      setShowChunks(true);
    } else {
      toast({
        variant: "destructive",
        title: "No content",
        description: "Please add content or upload a PDF to preview chunks.",
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
          content: values.content || "",
          chunking_method: values.chunkingMethod,
          file_type: pdfFile ? 'pdf' : 'text'
        })
        .select("id")
        .single();
      
      if (documentError) {
        console.error("Document error:", documentError);
        throw documentError;
      }
      
      console.log("Document created with ID:", documentData.id);
      
      // Generate chunks
      const options: ChunkingOptions = {
        method: values.chunkingMethod as ChunkingMethod,
        lineBreakPattern: values.lineBreakPattern,
      };
      
      const documentChunks = generateChunks(values.content || "", options);
      
      // Insert chunks
      if (documentChunks.length > 0) {
        const chunksToInsert = documentChunks.map((chunk, index) => ({
          document_id: documentData.id,
          content: chunk,
          sequence: index + 1,
          metadata: JSON.stringify({
            chunkingMethod: values.chunkingMethod,
            index: index + 1,
            totalChunks: documentChunks.length,
            lineBreakPattern: values.lineBreakPattern,
          }),
        }));
        
        // Save chunks with embeddings through Edge Function
        for (const chunk of chunksToInsert) {
          await saveChunkWithEmbedding(chunk.content, documentData.id);
        }
        
        console.log("Inserted", chunksToInsert.length, "chunks");
      }
      
      // If there's a PDF file, upload it to storage
      if (pdfFile) {
        const filePath = `documents/${documentData.id}/${pdfFile.name}`;
        const { error: uploadError } = await supabase
          .storage
          .from('documents')
          .upload(filePath, pdfFile);
        
        if (uploadError) {
          console.error("PDF upload error:", uploadError);
          toast({
            title: "Document saved, but PDF upload failed",
            description: uploadError.message,
          });
        } else {
          console.log("PDF uploaded successfully");
          
          // Update document with file path
          const { error: updateError } = await supabase
            .from("knowledge_documents")
            .update({ file_path: filePath })
            .eq("id", documentData.id);
          
          if (updateError) {
            console.error("Error updating document with file path:", updateError);
          }
        }
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
      
      setIsSubmitting(false);
      onSuccess();
      
      toast({
        title: "Document imported successfully",
        description: `Created ${documentChunks.length} chunks.`,
      });
      
    } catch (error) {
      setIsSubmitting(false);
      console.error("Error importing document:", error);
      toast({
        variant: "destructive",
        title: "Error importing document",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  async function saveChunkWithEmbedding(content: string, documentId: string) {
    try {
      const { data, error } = await supabase.functions.invoke('knowledge-base', {
        body: { action: 'save_chunk', content, document_id: documentId }
      });
      
      if (error) {
        console.error('Error saving chunk:', error);
        throw new Error('Error saving chunk');
      }
      
      return data;
    } catch (error) {
      console.error('Error in saveChunkWithEmbedding:', error);
      throw error;
    }
  }

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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-md p-4 max-h-[500px] overflow-y-auto">
              {chunks.map((chunk, index) => (
                <Card key={index} className="mb-2 bg-muted/30">
                  <CardHeader className="py-3 px-4">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm font-medium">
                        Chunk {index + 1}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground">{chunk.length} characters</span>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    <p className="text-sm whitespace-pre-wrap">{chunk}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Tabs defaultValue="upload">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="upload">Upload PDF</TabsTrigger>
              <TabsTrigger value="paste">Paste Text</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4">
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={handleManualUpload}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf"
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <h3 className="font-medium">Upload PDF Document</h3>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop or click to browse (max 10MB)
                  </p>
                </div>
              </div>
              
              {isProcessingPdf && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Processing PDF...</span>
                </div>
              )}
              
              {pdfPreviewUrl && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">PDF Preview</h3>
                  <div className="border rounded h-[300px] overflow-hidden">
                    <iframe 
                      src={pdfPreviewUrl} 
                      className="w-full h-full"
                      title="PDF Preview"
                    />
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="paste">
              <Form {...form}>
                <form className="space-y-4">
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
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        )}

        {!showChunks && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
              <div className="border rounded-md p-4 space-y-4">
                <h3 className="text-sm font-medium">Chunking Options</h3>
                
                <FormField
                  control={form.control}
                  name="chunkingMethod"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Chunking Method</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="lineBreak" id="lineBreak" />
                            <Label htmlFor="lineBreak">By Line Break</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="paragraph" id="paragraph" />
                            <Label htmlFor="paragraph">By Paragraph</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {chunkingMethod === 'lineBreak' && (
                  <FormField
                    control={form.control}
                    name="lineBreakPattern"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Line break pattern</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="\n"
                            {...field} 
                          />
                        </FormControl>
                        <p className="text-sm text-muted-foreground mt-1">
                          Enter the pattern to use for line breaks. Examples: 
                          <code className="mx-1 px-1 bg-muted rounded">\n</code> for single newline, 
                          <code className="mx-1 px-1 bg-muted rounded">\n\n\n</code> for triple newlines.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              
              <div className="flex justify-between pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handlePreviewChunks}
                  disabled={isSubmitting || !form.getValues("content")}
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
                    disabled={isSubmitting || !form.getValues("content")}
                  >
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
        <CardFooter className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowChunks(false)}
            disabled={isSubmitting}
          >
            Back to Edit
          </Button>
          <Button 
            onClick={() => {
              setShowChunks(false);
              form.handleSubmit(onSubmit)();
            }} 
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & Import
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
