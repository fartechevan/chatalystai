import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Loader2, Download, FileQuestion, ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from "@/lib/utils";

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
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    if (showControls && !isLoading && !error) {
      if (controlsTimeout) clearTimeout(controlsTimeout);
      const timeout = setTimeout(() => setShowControls(false), 3000);
      setControlsTimeout(timeout);
      return () => clearTimeout(timeout);
    }
  }, [showControls, isLoading, error]);

  // Reset states when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setShowControls(true);
    }
  }, [isOpen]);

  // Handle mouse movement to show controls
  const handleMouseMove = () => {
    if (!showControls) setShowControls(true);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          e.preventDefault();
          setZoom(prev => Math.min(prev + 0.25, 3));
          break;
        case '-':
          e.preventDefault();
          setZoom(prev => Math.max(prev - 0.25, 0.25));
          break;
        case '0':
          e.preventDefault();
          setZoom(1);
          setRotation(0);
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          setRotation(prev => (prev + 90) % 360);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          setIsFullscreen(prev => !prev);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "p-0 border-0 bg-black/95 backdrop-blur-sm",
          isFullscreen 
            ? "w-screen h-screen max-w-none max-h-none m-0 rounded-none" 
            : "w-[90vw] h-[90vh] max-w-6xl rounded-lg"
        )}
        onMouseMove={handleMouseMove}
      >
        <DialogDescription className="sr-only">
          {isLoading 
            ? "Loading media preview" 
            : error 
            ? "Error loading media preview" 
            : `Full-screen media preview: ${mediaType || 'unknown type'}`
          }
        </DialogDescription>

        {/* Top Controls Bar */}
        <div className={cn(
          "absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-4 transition-all duration-300",
          showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-medium">
                {mediaType === 'image' ? 'Image Preview' : mediaType === 'video' ? 'Video Preview' : 'Media Preview'}
              </h2>
              {zoom !== 1 && (
                <span className="text-white/70 text-sm">{Math.round(zoom * 100)}%</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Media Controls */}
              {mediaType === 'image' && !isLoading && !error && (
                <>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/20"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.25}
                    title="Zoom Out (-)"
                  >
                    <ZoomOut className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/20"
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                    title="Zoom In (+)"
                  >
                    <ZoomIn className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/20"
                    onClick={handleRotate}
                    title="Rotate (R)"
                  >
                    <RotateCw className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-white hover:bg-white/20"
                    onClick={handleReset}
                    title="Reset (0)"
                  >
                    Reset
                  </Button>
                </>
              )}
              
              {/* Download Button */}
              {mediaSrc && !isLoading && !error && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:bg-white/20"
                  asChild
                  title="Download"
                >
                  <a
                    href={mediaSrc}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-5 w-5" />
                  </a>
                </Button>
              )}
              
              {/* Fullscreen Toggle */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
              >
                {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </Button>
              
              {/* Close Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20"
                onClick={onClose}
                title="Close (Esc)"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {/* Loading State */}
          {isLoading && (
            <div className="text-white text-center flex flex-col items-center justify-center animate-fade-in">
              <Loader2 className="h-16 w-16 animate-spin mb-6 text-white/80" />
              <p className="text-xl font-medium mb-2">Loading media...</p>
              <p className="text-white/60">Please wait while we fetch your content</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="text-center flex flex-col items-center justify-center animate-fade-in">
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-8 max-w-md">
                <FileQuestion className="h-16 w-16 mb-4 text-red-400 mx-auto" />
                <p className="text-red-400 text-xl font-medium mb-2">Failed to load media</p>
                <p className="text-red-300/80 text-sm">{error}</p>
                <Button 
                  variant="outline" 
                  className="mt-4 border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Image Content */}
          {!isLoading && !error && mediaSrc && mediaType === 'image' && (
            <div className="w-full h-full flex items-center justify-center p-4">
              <img 
                src={mediaSrc} 
                alt="Media preview" 
                className="max-w-full max-h-full object-contain transition-all duration-300 ease-out"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.5))'
                }}
                draggable={false}
              />
            </div>
          )}

          {/* Video Content */}
          {!isLoading && !error && mediaSrc && mediaType === 'video' && (
            <div className="w-full h-full flex items-center justify-center p-4">
              <video 
                src={mediaSrc} 
                controls 
                autoPlay 
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                style={{
                  filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.5))'
                }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {/* No Media State */}
          {!isLoading && !error && !mediaSrc && (
            <div className="text-center flex flex-col items-center justify-center animate-fade-in">
              <div className="bg-white/10 border border-white/20 rounded-lg p-8">
                <FileQuestion className="h-16 w-16 mb-4 text-white/60 mx-auto" />
                <p className="text-white text-xl font-medium mb-2">No media to display</p>
                <p className="text-white/60">The requested media could not be found</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Keyboard Shortcuts Info */}
        {showControls && !isLoading && !error && (
          <div className={cn(
            "absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/80 to-transparent p-4 transition-all duration-300",
            showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full pointer-events-none"
          )}>
            <div className="text-center">
              <p className="text-white/60 text-sm">
                <span className="inline-block mx-2"><kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs">Esc</kbd> Close</span>
                {mediaType === 'image' && (
                  <>
                    <span className="inline-block mx-2"><kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs">+/-</kbd> Zoom</span>
                    <span className="inline-block mx-2"><kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs">R</kbd> Rotate</span>
                    <span className="inline-block mx-2"><kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs">0</kbd> Reset</span>
                  </>
                )}
                <span className="inline-block mx-2"><kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs">F</kbd> Fullscreen</span>
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
