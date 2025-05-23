/* eslint-disable no-constant-binary-expression */
/* eslint-disable valid-typeof */
/* eslint-disable @typescript-eslint/no-explicit-any */

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
import { Loader2, Upload, FileText, ChevronRight, ExternalLink } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiServiceInstance } from "@/services/api/apiService";
import { 
  ChunkingMethod, 
  ChunkingOptions, 
  generateChunks 
} from "./utils/chunkingUtils";

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
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
  const [isProcessingChunks, setIsProcessingChunks] = useState(false);
  const [isUploadingToEndpoint, setIsUploadingToEndpoint] = useState(false);
  const [uploadResponse, setUploadResponse] = useState<{success: boolean; message?: string; fileUrl?: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;

  // Track successful uploads
  let successCount = 0;
  let failCount = 0;
  
  // Set upload state
  setIsUploadingToEndpoint(true);
  
  // Create a function to process a single file
  const uploadFile = async (file: File) => {
    // Validate file type
    if (file.type !== "application/pdf") {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: `${file.name} is not a PDF file.`,
      });
      failCount++;
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: `${file.name} exceeds 16MB limit.`,
      });
      failCount++;
      return;
    }

    // For the first file, update title and preview
    if (successCount === 0) {
      setPdfFile(file);
      form.setValue("title", file.name.replace(/\.pdf$/, ""));
      
      // Generate preview URL for the first file
      const previewUrl = URL.createObjectURL(file);
      setPdfPreviewUrl(previewUrl);
    }

    // Upload to the specified endpoint
    try {
      const uploadEndpoint = "http://127.0.0.1:5000/upload";
      const response = await apiServiceInstance.uploadPdfFile(file, uploadEndpoint);
      
      if (successCount === 0) {
        setUploadResponse(response);
      }
      
      if (response?.success) {
        successCount++;
        
        // Store the session_id in localStorage (for the first successful file)
        if (successCount === 1 && response?.session_id && typeof window !== undefined) {
          localStorage.setItem("upload_session_id", response.session_id);
          console.log("Session ID stored in localStorage:", response.session_id);
        }
        
        // Check if the response contains extracted text content and use it
        if (response.text_content) {
          // For first file, set the content directly
          if (successCount === 1) {
            setPdfText(response.text_content);
            form.setValue("content", response.text_content);
          } else {
            // For subsequent files, append with a separator
            const currentText = form.getValues("content");
            const newText = currentText + "\n\n--- New Document ---\n\n" + response.text_content;
            setPdfText(newText);
            form.setValue("content", newText);
          }
          
          // If this is the first successful file, switch to the 'Paste Text' tab
          if (successCount === 1) {
            const pasteTextTab = document.querySelector('[data-value="paste"]') as HTMLElement;
            if (pasteTextTab) {
              pasteTextTab.click();
            }
          }
        } else {
          // No text content in response
          toast({
            variant: "destructive",
            title: "No text extracted",
            description: `File ${file.name} was uploaded but no text content was returned.`,
          });
        }
      } else {
        failCount++;
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: `Failed to upload ${file.name}: ${response.error || "Unknown error"}`,
        });
      }
    } catch (error) {
      failCount++;
      console.error(`Error uploading ${file.name}:`, error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: `Failed to upload ${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  };

  // Upload all files sequentially
  for (const file of files) {
    await uploadFile(file);
  }
  
  setIsUploadingToEndpoint(false);
  
  // Show summary toast
  if (successCount > 0) {
    toast({
      title: "PDF upload complete",
      description: `Successfully uploaded ${successCount} file${successCount !== 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}.`,
    });
  } else if (failCount > 0) {
    toast({
      variant: "destructive",
      title: "PDF upload failed",
      description: `Failed to upload all ${failCount} file${failCount !== 1 ? 's' : ''}.`,
    });
  }
  };

  const handleManualUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

const handlePreviewChunks_v2 = async () => {
  const content = form.getValues("content");
    
  if (!content) {
    toast({
      variant: "destructive",
      title: "No content",
      description: "Please add content or upload a PDF to preview chunks.",
    });
    return;
  }
    
  setIsProcessingChunks(true);
    
  // Define the expected response type
  interface ChunkResponse {
    chunks: string[];
  }
    
  try {
    // Get the session_id from localStorage
    let session_id : any
    if(typeof window !== undefined){
      session_id = localStorage.getItem("upload_session_id");
    }

    
    if (!session_id) {
      toast({
        variant: "destructive",
        title: "No session ID found",
        description: "Please upload a PDF first to generate a session ID.",
      });
      
      // Fallback to paragraph chunking if no session_id is available
      const options: ChunkingOptions = {
        method: 'paragraph' as ChunkingMethod,
      };
        
      const generatedChunks = generateChunks(content, options);
      setChunks(generatedChunks);
      setShowChunks(true);
      setIsProcessingChunks(false);
      return;
    }
    
    // Call the external chunking API endpoint using apiServiceInstance with session_id
    const data = await apiServiceInstance.request<ChunkResponse>('http://127.0.0.1:5000/chunk-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ "session_id": session_id }),
      logRequests: true, // Enable logging for this request
    });
        
    if (data.chunks && Array.isArray(data.chunks)) {
      setChunks(data.chunks);
      setShowChunks(true);
    } else {
      // Fallback to paragraph chunking if API response doesn't contain chunks
      const options: ChunkingOptions = {
        method: 'paragraph' as ChunkingMethod,
      };
            
      const generatedChunks = generateChunks(content, options);
      setChunks(generatedChunks);
      setShowChunks(true);
            
      toast({
        title: "Using fallback chunking",
        description: "External chunking service failed. Using paragraph-based chunking instead.",
      });
    }
  } catch (error) {
    console.error("Error previewing chunks:", error);
        
    // Fallback to paragraph chunking if there's an error
    const options: ChunkingOptions = {
      method: 'paragraph' as ChunkingMethod,
    };
        
    const generatedChunks = generateChunks(content, options);
    setChunks(generatedChunks);
    setShowChunks(true);
        
    toast({
      title: "Using fallback chunking",
      description: "External chunking service failed. Using paragraph-based chunking instead.",
    });
  } finally {
    setIsProcessingChunks(false);
  }
};

  const handlePreviewChunks = async () => {
    const content = form.getValues("content");
    
    if (!content) {
      toast({
        variant: "destructive",
        title: "No content",
        description: "Please add content or upload a PDF to preview chunks.",
      });
      return;
    }
    
    setIsProcessingChunks(true);
    
    try {
      // Call the smart-chunking edge function
      const { data, error } = await supabase.functions.invoke('smart-chunking', {
        body: { content, maxChunks: 15 }
      });
      
      if (error) {
        throw error;
      }
      
      if (data.chunks && Array.isArray(data.chunks)) {
        setChunks(data.chunks);
        setShowChunks(true);
      } else {
        // Fallback to paragraph chunking if OpenAI fails
        const options: ChunkingOptions = {
          method: 'paragraph' as ChunkingMethod,
        };
        
        const generatedChunks = generateChunks(content, options);
        setChunks(generatedChunks);
        setShowChunks(true);
        
        toast({
          title: "Using fallback chunking",
          description: "Smart chunking failed. Using paragraph-based chunking instead.",
        });
      }
    } catch (error) {
      console.error("Error previewing chunks:", error);
      
      // Fallback to paragraph chunking if there's an error
      const options: ChunkingOptions = {
        method: 'paragraph' as ChunkingMethod,
      };
      
      const generatedChunks = generateChunks(content, options);
      setChunks(generatedChunks);
      setShowChunks(true);
      
      toast({
        title: "Using fallback chunking",
        description: "Smart chunking failed. Using paragraph-based chunking instead.",
      });
    } finally {
      setIsProcessingChunks(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      
      // Use the last generated chunks or generate new ones if needed
      let documentChunks = chunks;
      
      if (documentChunks.length === 0) {
        try {
          // Try to get smart chunks from OpenAI
          const { data, error } = await supabase.functions.invoke('smart-chunking', {
            body: { content: values.content, maxChunks: 15 }
          });
          
          if (error) {
            throw error;
          }
          
          if (data && data.chunks && Array.isArray(data.chunks)) {
            documentChunks = data.chunks;
          } else {
            throw new Error('Invalid chunk data format');
          }
        } catch (error) {
          console.error("Error getting smart chunks:", error);
          
          // Fallback to paragraph chunking
          const options: ChunkingOptions = {
            method: 'paragraph' as ChunkingMethod,
          };
          
          documentChunks = generateChunks(values.content || "", options);
          
          toast({
            title: "Using fallback chunking",
            description: "Smart chunking failed. Using paragraph-based chunking instead.",
          });
        }
      }
      
      // Create document
      const { data: documentData, error: documentError } = await supabase
        .from("knowledge_documents")
        .insert({
          title: values.title,
          content: values.content || "",
          chunking_method: "openai",
          file_type: pdfFile ? 'pdf' : 'text'
        })
        .select("id")
        .single();
      
      if (documentError) {
        console.error("Document error:", documentError);
        throw documentError;
      }
      
      console.log("Document created with ID:", documentData.id);
      
      // Insert chunks
      if (documentChunks.length > 0) {
        const chunksToInsert = documentChunks.map((chunk, index) => ({
          document_id: documentData.id,
          content: chunk,
          sequence: index + 1,
          metadata: JSON.stringify({
            chunkingMethod: "openai",
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
        description: `Created ${documentChunks.length} chunks using AI-powered chunking.`,
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
              <h3 className="text-lg font-medium">AI-Generated Document Chunks Preview</h3>
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
                  multiple
                  className="hidden"
                  accept=".pdf"
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <h3 className="font-medium">Upload PDF Document</h3>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop or click to browse (max 16MB)
                  </p>
                </div>
              </div>
              
              {(isProcessingPdf || isUploadingToEndpoint) && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>{isUploadingToEndpoint ? "Uploading PDF to external service..." : "Processing PDF..."}</span>
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
              
              {uploadResponse && uploadResponse.success && uploadResponse.fileUrl && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Upload Successful</h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>PDF was successfully uploaded to the external service.</p>
                        <a 
                          href={uploadResponse.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center mt-1 text-green-600 hover:text-green-800"
                        >
                          View uploaded file <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </div>
                    </div>
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
                <h3 className="text-sm font-medium">AI-Powered Chunking</h3>
                <p className="text-sm text-muted-foreground">
                  Your document will be automatically split into meaningful chunks using AI, optimized for vector database storage and retrieval.
                </p>
              </div>
              
              <div className="flex justify-between pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handlePreviewChunks_v2}
                  disabled={isSubmitting || isProcessingChunks || !form.getValues("content")}
                >
                  {isProcessingChunks ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Preview AI Chunks"
                  )}
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
