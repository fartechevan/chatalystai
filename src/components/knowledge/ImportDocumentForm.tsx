/* eslint-disable no-constant-binary-expression */
/* eslint-disable valid-typeof */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Loader2, Upload, X, Download, ExternalLink, Trash2, ZoomIn } from "lucide-react";
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
  const [userId, setUserId] = useState<string | null>(null);
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

  const [extractedImages, setExtractedImages] = useState<string[]>([])

  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [deletingImageIndex, setDeletingImageIndex] = useState<number | null>(null)

  const [isTextEdited, setIsTextEdited] = useState(false);

  const [isChunked, setIsChunked] = useState(false);
  const [currentDocumentID, setCurrentDocumentID] = useState<string>('');
  const [publicFileURL, setPublicFileURL] = useState<string>('');

  const [isConfirmingUpload, setIsConfirmingUpload] = useState<boolean>(false);

  
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
        const uploadEndpoint = "https://chunk-feature-chatalyst-dot-fartech-yvqj.et.r.appspot.com/upload_v2";
        const response = await apiServiceInstance.uploadPdfFile(file, uploadEndpoint);
        
        if (successCount === 0) {
          setUploadResponse(response);
        }
        
        if (response?.success) {
          successCount++;
          
          // Store the session_id in localStorage (for the first successful file)
          if (successCount === 1 && response?.session_id && response?.document_name &&typeof window !== undefined) {
            localStorage.setItem("upload_session_id", response.session_id);
            setCurrentDocumentID(response.document_name)
            console.log("Session ID stored in localStorage:", response.session_id);
          }
          
          // Check if the response contains extracted text content and use it
          if (response.text_content) {
            // For first file, set the content directly
            if (successCount === 1) {
              setPdfText(response.text_content);
              setPublicFileURL(response.file_path);   // to be stored in the table
              setExtractedImages(response.image_urls)
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
      chunks: [string[], Record<string, any>]; // Tuple: [chunks, metadata]
    }

      
    try {
      setIsChunked(false);      // so that they can't import during upload
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
      const data = await apiServiceInstance.request<ChunkResponse>('https://chunk-feature-chatalyst-dot-fartech-yvqj.et.r.appspot.com/chunk-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "session_id": session_id,
            "text": pdfText,
            "text_edited": isTextEdited,
            "document_name": currentDocumentID,
        }),
        logRequests: true, // Enable logging for this request
      });
          
      if (data.chunks && Array.isArray(data.chunks)) {
        setChunks(data.chunks[0]);      // data.chunks[1] is the images metadata
        setShowChunks(true);
        setIsChunked(true);
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

  // No need to use the confirm Upload anymore 
  // it takes too much time and the workings now are mainly done in supabase with a permanent vector table
  const confirmUpload = async () => {
    try {
      setIsConfirmingUpload(true)
      toast({
        variant: "default",
        title: "Note",
        description: "This might take a minute, thank you for your patience 😊",
      })
      interface ConfirmUpload {
        success: boolean,
        message: string,
      }

      let session_id : any
      if(typeof window !== undefined){
        session_id = localStorage.getItem("upload_session_id");
      }

      const data = await apiServiceInstance.request<ConfirmUpload>('https://chunk-feature-chatalyst-dot-fartech-yvqj.et.r.appspot.com/confirm_upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "session_id": session_id,
          "document_name": currentDocumentID,
        })
      })

      if(data.success){
        console.log(data.message);
        setIsConfirmingUpload(false);
        updateVectorTable()
          .then(() => {
            toast({
              variant: "default",
              title: "Document Import successfully",
              description: "Added the document to the knowledge base",
            })
          })
          .catch((error) => {
            console.log(error)
          })
        
      }
    } catch (error) {
      console.log('Failed to confirm the upload');
    } finally {
      setIsConfirmingUpload(true);
    }
  };

  const updateVectorTable = async (documentId: string) => {
    try {
      interface UpdateVectorTable {
        success: boolean,
        message: string,
      }

      let session_id : any
      if(typeof window !== undefined){
        session_id = localStorage.getItem("upload_session_id");
      }

      const data = await apiServiceInstance.request<UpdateVectorTable>('https://chunk-feature-chatalyst-dot-fartech-yvqj.et.r.appspot.com/create_vector_table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "document_id": documentId,
        })
      })

      if(data.success){
        console.log(data.message);
        toast({
          variant: "default",
          title: "Document Import successful",
          description: "Added the document to the knowledge base",
        })
      }

    } catch (error) {
      console.log("Failed to add chunks to vector table");
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

  const onSubmit = async (values: FormValues): Promise<{ documentId: string } | void> => {
    if (!userId) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please log in to import documents.",
      });
      return;
    }

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
          user_id: userId,
          chunking_method: "openai",
          file_type: pdfFile ? 'pdf' : 'text',
          file_path: publicFileURL || "",
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
      
      // Return the document ID for use in the calling function
      return { documentId: documentData.id };
      
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

  const handleDeleteImage = async (indexToDelete: number, src: string) => {
    setDeletingImageIndex(indexToDelete)

    interface DeleteImageResponse {
      [key: string]: any
    }

    try {
      const data = await apiServiceInstance.request<DeleteImageResponse>("https://chunk-feature-chatalyst-dot-fartech-yvqj.et.r.appspot.com/delete-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image_url: src }),
      })

      // Only remove from state if API call was successful
      setExtractedImages((prev) => prev.filter((_, index) => index !== indexToDelete))

      toast({
        title: "Image deleted",
        description: "The image has been removed from the extracted images.",
      })
    } catch (error) {
      console.error("Error deleting image:", error)
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Failed to delete the image. Please try again.",
      })
    } finally {
      setDeletingImageIndex(null)
    }
  }

  const handleImageClick = (src: string, index: number) => {
    setPreviewImage(src)
    setPreviewImageIndex(index)
    setIsPreviewOpen(true)
  }

  const closePreview = () => {
    setIsPreviewOpen(false)
  }

  useEffect(() => {
    // this effect runs only once, on the initial render
    if (typeof window !== "undefined") {
      const projectRef = new URL(supabase.storage.from('documents').getPublicUrl('').data.publicUrl).hostname.split('.')[0];
      const raw = localStorage.getItem(`sb-${projectRef}-auth-token`);
      if (raw) {
        try {
          const token = JSON.parse(raw);
          const id = token.user?.id ?? null;
          setUserId(id);
          // console.log("Supabase user.id:", id);
        } catch (err) {
          console.error("Failed to parse auth token JSON:", err);
        }
      } else {
        console.warn("No Supabase auth token found in localStorage");
      }
    }
  }, []);




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
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="upload">Upload PDF</TabsTrigger>
              <TabsTrigger value="paste">Paste Text</TabsTrigger>
              <TabsTrigger value="images" disabled={!pdfFile}>
                Extracted Images
              </TabsTrigger>
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
                          <FormLabel>
                            Document Content
                            {isTextEdited && (
                              <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                Text edited
                              </span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Paste or type document content here" 
                              className="min-h-[300px]"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                // Check if the current value differs from the original PDF text
                                if (pdfText && e.target.value !== pdfText) {
                                  setIsTextEdited(true);
                                } else if (e.target.value === pdfText) {
                                  setIsTextEdited(false);
                                }
                                // Update pdfText to reflect the current edited state
                                setPdfText(e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />


                  {/* <FormField
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
                  /> */}
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="images" className="space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Images Extracted from PDF</h3>
                  {extractedImages.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {extractedImages.length} image{extractedImages.length !== 1 ? "s" : ""} found
                    </span>
                  )}
                </div>

                <div className="max-h-[400px] overflow-y-auto border rounded-md p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {extractedImages.map((src, index) => (
                      <div key={index} className="border rounded-md overflow-hidden relative group">
                        <div className="aspect-video relative">
                          <img
                            src={src || "/placeholder.svg"}
                            alt={`Extracted image ${index + 1}`}
                            className="object-cover w-full h-full cursor-pointer"
                            onClick={() => handleImageClick(src, index)}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="mr-2"
                              onClick={() => handleImageClick(src, index)}
                            >
                              <ZoomIn className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={deletingImageIndex === index}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteImage(index, src)
                              }}
                            >
                              {deletingImageIndex === index ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-1" />
                              )}
                              Delete
                            </Button>
                          </div>
                        </div>
                        <div className="p-2 bg-muted/20 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">Image {index + 1}</p>
                            {/* <p className="text-xs text-muted-foreground">Extracted from page {index + 1}</p> */}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleImageClick(src, index)}
                          >
                            <ZoomIn className="h-4 w-4" />
                            <span className="sr-only">View image</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {extractedImages.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">No images extracted from this PDF</p>
                  </div>
                )}
              </div>
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
                  onClick={() => {
                    const sessionId = localStorage.getItem("upload_session_id");
                    if (sessionId) {
                      handlePreviewChunks_v2();
                    } else {
                      handlePreviewChunks();
                    }
                  }}
                  disabled={isSubmitting || isProcessingChunks || !form.getValues("content")}
                >
                  {isProcessingChunks ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Create AI Chunks"
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
                  {/* <Button 
                    type="submit" 
                    disabled={
                      !isChunked
                        ? true
                        : isSubmitting || !form.getValues("content")
                    }
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Import Document
                  </Button> */}
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
            onClick={async () => {
              try {
                // Run form submit handler first
                await form.handleSubmit(async (data) => {
                  // Run the actual submission logic
                  const result = await onSubmit(data);
                  
                  // Get the document ID from the form submission result
                  const documentId = result?.documentId || currentDocumentID;
                  if (documentId) {
                    await updateVectorTable(documentId);
                    setShowChunks(false);
                    toast({
                      variant: "default",
                      title: "Document Import successfully",
                      description: "Added the document to the knowledge base",
                    });
                  }
                })();
              } catch (err) {
                console.error('Submit or upload confirmation failed', err);
              }
            }}
            disabled={isSubmitting || isConfirmingUpload}
          >
            {(isSubmitting || isConfirmingUpload) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & Import
          </Button>
        </CardFooter>
      )}

      {/* Image Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl w-[90vw]">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Image {previewImageIndex !== null ? previewImageIndex + 1 : ""}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={closePreview}>
                  <X className="h-4 w-4 mr-1" />
                  Close
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={previewImage || "#"} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </a>
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-2 max-h-[70vh] overflow-auto">
            {previewImage && (
              <img
                src={previewImage || "/placeholder.svg"}
                alt={`Full size preview of image ${previewImageIndex !== null ? previewImageIndex + 1 : ""}`}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
          <div className="p-2 text-center text-sm text-muted-foreground">
            {previewImageIndex !== null && `Extracted from page ${previewImageIndex + 1} of the PDF document`}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
