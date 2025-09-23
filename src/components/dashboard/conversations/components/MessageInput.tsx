import { useState, useRef, ChangeEvent } from "react"; // Added useRef, ChangeEvent
import { Loader2, Send, ImagePlus, X, File, FileText, FileVideo, FileAudio } from "lucide-react"; // Added file type icons
import { UseMutationResult } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
// Input component from Shadcn is not used in the new structure directly, using raw input
// import { Input } from "@/components/ui/input"; 
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils"; // Import cn for conditional classes

interface MessageInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  handleSendMessage: (messageText: string, file?: File) => void; // Updated to include file
  sendMessageMutation: UseMutationResult<unknown, Error, { chatId: string; message: string; file?: File } , unknown>; // Assuming mutation variables might change
  isWhatsAppConversation?: boolean;
}

export function MessageInput({
  newMessage,
  setNewMessage,
  handleSendMessage,
  sendMessageMutation,
  isWhatsAppConversation = false
}: MessageInputProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null); // For image preview

  const internalHandleSend = () => {
    if (!newMessage.trim() && !selectedFile) return;
    handleSendMessage(newMessage, selectedFile || undefined);
    // setNewMessage(""); // Parent should handle this if needed after successful send
    setSelectedFile(null);
    setFilePreviewUrl(null); // Clear preview
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Generate a preview URL for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreviewUrl(null); // Not an image, no preview
      }
    } else {
      setSelectedFile(null);
      setFilePreviewUrl(null);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImagePlus className="h-4 w-4" />;
    if (mimeType.startsWith('video/')) return <FileVideo className="h-4 w-4" />;
    if (mimeType.startsWith('audio/')) return <FileAudio className="h-4 w-4" />;
    if (mimeType.includes('text/') || mimeType.includes('document')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const handleAttachmentClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="border-t p-2 sm:p-3">
      {/* File Preview Area */}
      {filePreviewUrl && (
        <div className="relative inline-block mb-2 mr-2 align-bottom">
          <img src={filePreviewUrl} alt="Preview" className="h-16 w-16 object-cover rounded-md border" />
          <Button
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0"
            onClick={clearSelectedFile}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      {/* Display filename if not an image or no preview */}
      {!filePreviewUrl && selectedFile && (
        <div className="inline-flex items-center gap-2 mb-2 p-2 bg-muted rounded-md">
          {getFileIcon(selectedFile.type)}
          <span className="text-sm text-muted-foreground">{selectedFile.name}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 ml-auto"
            onClick={clearSelectedFile}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="border-input focus-within:ring-ring flex items-center gap-1 sm:gap-2 rounded-md border px-2 py-1 focus-within:ring-1 focus-within:outline-hidden lg:gap-3 h-12">
        {/* Action Buttons */}
        <div className="flex items-center space-x-0.5 sm:space-x-1">
          {/* Plus button removed */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="size-8 sm:size-9 rounded-md lg:inline-flex" // Made always inline-flex like the original ImagePlus was
            type="button"
            onClick={handleAttachmentClick} 
            aria-label="Add file"
          >
            <ImagePlus className="h-4 w-4 sm:h-5 sm:w-5 stroke-muted-foreground" />
          </Button>
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept="*/*" // Keep accepting only images as per original intent for this button
          />
          {/* Paperclip button removed */}
        </div>

        {/* Text Input */}
        <label className="flex-1 h-full"> {/* Make label take full height of parent */}
          <span className="sr-only">Chat Text Box</span>
          <input
            placeholder={isWhatsAppConversation ? "Type your WhatsApp message..." : "Type your messages..."}
            className="h-full w-full bg-inherit text-sm focus-visible:outline-none placeholder:text-muted-foreground px-1 sm:px-2" // Adjusted padding
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                internalHandleSend(); // Use internal handler
              }
            }}
            disabled={sendMessageMutation.isPending || !!selectedFile} // Disable if sending or file selected
          />
        </label>

        {/* Send Button */}
        <Button
          variant="ghost" // Using ghost to match general style, can be changed
          size="icon"
          className={cn(
            "size-8 sm:size-9 rounded-md",
            isWhatsAppConversation && "bg-green-600 hover:bg-green-700 text-white hover:text-white"
          )}
          type="button" // Changed from submit
          onClick={internalHandleSend} // Use internal handler
          disabled={sendMessageMutation.isPending || (!newMessage.trim() && !selectedFile)} // Disable if nothing to send
          aria-label="Send message"
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
