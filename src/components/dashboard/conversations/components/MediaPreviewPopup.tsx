import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"; // Assuming shadcn/ui dialog
import { Button } from "@/components/ui/button"; // Assuming shadcn/ui button
import { X, Loader2, Download, FileQuestion } from 'lucide-react'; // Assuming lucide-react for icons

interface MediaPreviewPopupProps {
  isOpen: boolean;
  mediaSrc: string | null;
  mediaType: 'image' | 'video' | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

export function MediaPreviewPopup({
  isOpen,
  mediaSrc,
  mediaType,
  isLoading,
  error,
  onClose,
}: MediaPreviewPopupProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] xl:max-w-[50vw] p-0 overflow-hidden hide-default-dialog-close">
        {/* Removed pr-16 and relative as the absolute close button is removed, added 'hide-default-dialog-close' class */}
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex justify-between items-center">
            <span>Media Preview</span>
            <div className="flex items-center gap-2">
              {mediaSrc && !isLoading && !error && (
                <a
                  href={mediaSrc}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="icon" title="Download media">
                    <Download className="h-5 w-5" />
                    <span className="sr-only">Download</span>
                  </Button>
                </a>
              )}
              <DialogClose asChild>
                <Button variant="ghost" size="icon" onClick={onClose} title="Close preview">
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </div>
          </DialogTitle>
        </DialogHeader>
        {/* Content div max-height reverted, padding adjustments for close button no longer needed */}
        <div className="p-4 min-h-[300px] max-h-[80vh] overflow-y-auto flex items-center justify-center bg-black/80">
          {isLoading && (
            <div className="text-white text-center p-10 flex flex-col items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin mb-4" />
              <p>Loading media...</p>
            </div>
          )}
          {error && !isLoading && (
            <div className="text-red-400 text-center p-10">
              <p>Error loading media:</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
          {!isLoading && !error && mediaSrc && mediaType === 'image' && (
            <img src={mediaSrc} alt="Media preview" className="max-w-full max-h-full object-contain" />
          )}
          {!isLoading && !error && mediaSrc && mediaType === 'video' && (
            <video src={mediaSrc} controls autoPlay className="max-w-full max-h-full object-contain">
              Your browser does not support the video tag.
            </video>
          )}
          {!isLoading && !error && !mediaSrc && (
            <div className="text-white text-center p-10 flex flex-col items-center justify-center">
              <FileQuestion className="h-12 w-12 mb-4 text-gray-400" />
              <p className="text-lg">No media to display.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
