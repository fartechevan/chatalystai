
import { useState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PdfUploaderProps {
  onPdfProcessed: (text: string, fileName: string, file: File, previewUrl: string) => void;
  isProcessing: boolean;
  pdfPreviewUrl: string | null;
}

export function PdfUploader({ onPdfProcessed, isProcessing, pdfPreviewUrl }: PdfUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleManualUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

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

    // Generate preview URL
    const previewUrl = URL.createObjectURL(file);
    
    try {
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
      
      onPdfProcessed(extractedText, file.name.replace(/\.pdf$/, ""), file, previewUrl);
      
      toast({
        title: "PDF processed successfully",
        description: `Extracted ${extractedText.length} characters from ${pdf.numPages} pages.`,
      });
    } catch (error) {
      console.error("Error processing PDF:", error);
      toast({
        variant: "destructive",
        title: "Error processing PDF",
        description: error instanceof Error ? error.message : "Failed to extract text from PDF",
      });
    }
  };

  return (
    <div className="space-y-4">
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
      
      {isProcessing && (
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
    </div>
  );
}
