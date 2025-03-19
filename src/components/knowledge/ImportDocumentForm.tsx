
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChunkingMethod, 
  ChunkingOptions, 
  generateChunks 
} from "./utils/chunkingUtils";

// Import refactored components
import { ChunkPreview } from "./import/ChunkPreview";
import { PdfUploader } from "./import/PdfUploader";
import { ChunkingOptions as ChunkingOptionsComponent } from "./import/ChunkingOptions";
import { TextInputTab } from "./import/TextInputTab";
import { ImportFormActions } from "./import/ImportFormActions";
import { ImportFormFooter } from "./import/ImportFormFooter";
import { 
  formSchema, 
  ImportDocumentFormProps, 
  ImportDocumentFormValues 
} from "./import/ImportDocumentFormTypes";
import { 
  createDocument, 
  processAndSaveChunks, 
  uploadPdfFile 
} from "./import/documentImportService";

export function ImportDocumentForm({ onCancel, onSuccess }: ImportDocumentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chunks, setChunks] = useState<string[]>([]);
  const [showChunks, setShowChunks] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  
  const form = useForm<ImportDocumentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      chunkingMethod: "lineBreak",
      lineBreakPattern: "\\n",
    },
  });

  const handlePdfProcessed = (text: string, fileName: string, file: File, previewUrl: string) => {
    setPdfFile(file);
    form.setValue("title", fileName);
    form.setValue("content", text);
    setPdfPreviewUrl(previewUrl);
    setIsProcessingPdf(false);
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

  const onSubmit = async (values: ImportDocumentFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Create document
      const documentId = await createDocument(values, pdfFile);
      
      // Process and save chunks
      const chunksCount = await processAndSaveChunks(values, documentId);
      
      // If there's a PDF file, upload it to storage
      if (pdfFile) {
        try {
          await uploadPdfFile(pdfFile, documentId);
        } catch (error) {
          toast({
            title: "Document saved, but PDF upload failed",
            description: error instanceof Error ? error.message : "Failed to upload PDF",
          });
        }
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
      
      setIsSubmitting(false);
      onSuccess();
      
      toast({
        title: "Document imported successfully",
        description: `Created ${chunksCount} chunks.`,
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
          <ChunkPreview 
            chunks={chunks}
            onBack={() => setShowChunks(false)}
          />
        ) : (
          <Tabs defaultValue="upload">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="upload">Upload PDF</TabsTrigger>
              <TabsTrigger value="paste">Paste Text</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4">
              <PdfUploader 
                onPdfProcessed={handlePdfProcessed}
                isProcessing={isProcessingPdf}
                pdfPreviewUrl={pdfPreviewUrl}
              />
            </TabsContent>
            
            <TabsContent value="paste">
              <TextInputTab form={form} />
            </TabsContent>
          </Tabs>
        )}

        {!showChunks && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
              <ChunkingOptionsComponent form={form} />
              
              <ImportFormActions 
                showChunks={showChunks}
                isSubmitting={isSubmitting}
                onCancel={onCancel}
                onPreviewChunks={handlePreviewChunks}
                hasContent={Boolean(form.getValues("content"))}
              />
            </form>
          </Form>
        )}
      </CardContent>
      
      <ImportFormFooter 
        showChunks={showChunks}
        isSubmitting={isSubmitting}
        onBack={() => setShowChunks(false)}
        onConfirm={() => {
          setShowChunks(false);
          form.handleSubmit(onSubmit)();
        }}
      />
    </Card>
  );
}
