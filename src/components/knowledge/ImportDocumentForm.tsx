
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
import { Loader2, Upload, FileText, ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
  chunkingMethod: z.enum(["lineBreak", "paragraph", "page", "custom"], {
    required_error: "Please select a chunking method",
  }),
  customChunkSize: z.number().optional(),
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
      customChunkSize: 500,
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

  const splitByLineBreak = (content: string): string[] => {
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  const splitByParagraph = (content: string): string[] => {
    return content
      .split(/\n\s*\n/)
      .map(para => para.trim())
      .filter(para => para.length > 0);
  };

  const splitByCustomSize = (content: string, size: number): string[] => {
    const chunks: string[] = [];
    let currentChunk = '';
    
    content.split(/\s+/).forEach(word => {
      if (currentChunk.length + word.length + 1 > size) {
        chunks.push(currentChunk.trim());
        currentChunk = word;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + word;
      }
    });
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  };

  const generateChunks = (content: string, method: string, customSize?: number): string[] => {
    switch (method) {
      case 'lineBreak':
        return splitByLineBreak(content);
      case 'paragraph':
        return splitByParagraph(content);
      case 'page':
        // Simple page simulation - split by double newlines
        return splitByParagraph(content);
      case 'custom':
        return splitByCustomSize(content, customSize || 500);
      default:
        return splitByLineBreak(content);
    }
  };

  const handlePreviewChunks = () => {
    const content = form.getValues("content");
    const method = form.getValues("chunkingMethod");
    const customSize = form.getValues("customChunkSize");
    
    if (content) {
      const generatedChunks = generateChunks(content, method, customSize);
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
      console.log("Submitting form with values:", values);
      setIsSubmitting(true);
      
      // Create document
      const { data: documentData, error: documentError } = await supabase
        .from("knowledge_documents")
        .insert({
          title: values.title,
          content: values.content,
          chunking_method: values.chunkingMethod,
          custom_chunk_size: values.customChunkSize,
          file_type: pdfFile ? 'pdf' : 'text',
        })
        .select("id")
        .single();
      
      if (documentError) {
        console.error("Document error:", documentError);
        throw documentError;
      }
      
      console.log("Document created with ID:", documentData.id);
      
      // Generate chunks
      const documentChunks = generateChunks(
        values.content || "", 
        values.chunkingMethod,
        values.customChunkSize
      );
      
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
          }),
        }));
        
        const { error: chunksError } = await supabase
          .from("knowledge_chunks")
          .insert(chunksToInsert);
        
        if (chunksError) {
          console.error("Chunks error:", chunksError);
          throw chunksError;
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
            variant: "warning",
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
                {chunks.length} chunks created using {form.getValues("chunkingMethod")} method:
              </p>
              {chunks.map((chunk, index) => (
                <div key={index} className="mb-2 p-2 border rounded bg-muted/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium">Chunk {index + 1}</span>
                    <span className="text-xs text-muted-foreground">{chunk.length} characters</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{chunk}</p>
                </div>
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
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-2 gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="lineBreak" id="lineBreak" />
                            <Label htmlFor="lineBreak">By Line Break</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="paragraph" id="paragraph" />
                            <Label htmlFor="paragraph">By Paragraph</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="page" id="page" />
                            <Label htmlFor="page">By Page</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="custom" id="custom" />
                            <Label htmlFor="custom">Custom Size</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {chunkingMethod === 'custom' && (
                  <FormField
                    control={form.control}
                    name="customChunkSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Characters per chunk</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="100" 
                            max="5000" 
                            {...field} 
                            onChange={e => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
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
              console.log("Confirming import");
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
