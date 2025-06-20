import { Avatar } from "@/components/ui/avatar";
import type { Conversation, Message as MessageType } from "../types";
// import { useState, useEffect } from "react"; // useEffect and some useState hooks removed
// import { supabase } from "@/integrations/supabase/client"; // supabase client will be used in parent

// interface MediaBase64Response { // This will be handled by the parent component
//   base64?: string;
//   message?: { 
//     body?: string; 
//   };
//   mimetype?: string;
// }

interface MessageItemProps {
  message: MessageType;
  conversation: Conversation | null;
  onMediaPreviewRequest: (message: MessageType) => void; // New prop for click handling
}

export function MessageItem({ message, conversation, onMediaPreviewRequest }: MessageItemProps) {
  const isAdmin = message.sender?.role === 'admin';
  
  const isImageMessage = message.media_type === 'image' && message.media_data;
  const isVideoMessage = message.media_type === 'video' && message.media_data;
  const hasCaption = !!message.content;

  let mediaThumbnailSrc: string | undefined = undefined;
  let mediaAltText = "Media content";

  if (isImageMessage) {
    const mediaInfo = message.media_data as { jpegThumbnail?: string; mimetype?: string };
    if (mediaInfo.jpegThumbnail) {
      mediaThumbnailSrc = `data:${mediaInfo.mimetype || 'image/jpeg'};base64,${mediaInfo.jpegThumbnail}`;
      mediaAltText = "Image thumbnail";
    }
  } else if (isVideoMessage) {
    // For videos, we might show a play icon or a generic video thumbnail if available
    // For now, let's just make a clickable area.
    // Thumbnails for videos might also be in `jpegThumbnail` if provided by Evolution API.
    const mediaInfo = message.media_data as { jpegThumbnail?: string; mimetype?: string };
     if (mediaInfo.jpegThumbnail) {
      mediaThumbnailSrc = `data:${mediaInfo.mimetype || 'image/jpeg'};base64,${mediaInfo.jpegThumbnail}`;
      mediaAltText = "Video thumbnail";
    }
  } else if (message.content && message.content.startsWith('data:image')) {
    // Fallback for old base64 content stored directly in message.content (likely images)
    mediaThumbnailSrc = message.content;
    mediaAltText = "Sent image";
  }

  const handleMediaClick = () => {
    if ((isImageMessage || isVideoMessage) && message.wamid) {
      onMediaPreviewRequest(message);
    }
  };

  const mediaContainerClass = `rounded-lg ${
    (isImageMessage || isVideoMessage) && !hasCaption && mediaThumbnailSrc ? 'p-0' : 'p-3'
  } ${isAdmin ? "bg-primary text-primary-foreground" : "bg-muted"}`;

  return (
    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[70%]"> {/* Apply max-width to a simpler block container */}
        <div className={`flex items-start gap-2 ${isAdmin ? "flex-row-reverse" : "flex-row"}`}> {/* Inner flex container */}
          <Avatar className="h-8 w-8">
            <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary font-medium">
              {isAdmin ? 'A' : 'U'}
            </div>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">
              {isAdmin ? 'Admin' : conversation?.customer_name || 'User'}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
          </div>
          <div className={`${mediaContainerClass} w-full`}>
            {(isImageMessage && mediaThumbnailSrc) && (
              <img 
                src={mediaThumbnailSrc} 
                alt={mediaAltText} 
                className={`w-full max-h-60 md:max-h-96 rounded-md object-contain cursor-pointer ${hasCaption ? 'mb-1' : ''}`}
                onClick={handleMediaClick}
              />
            )}
            {(isVideoMessage) && (
              <div 
                className={`relative w-full max-h-60 md:max-h-96 rounded-md bg-black flex items-center justify-center cursor-pointer ${hasCaption ? 'mb-1' : ''}`}
                onClick={handleMediaClick}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => e.key === 'Enter' && handleMediaClick()}
              >
                {mediaThumbnailSrc ? (
                  <img 
                    src={mediaThumbnailSrc} 
                    alt={mediaAltText} 
                    className="w-full h-full object-contain rounded-md opacity-70"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                     {/* Play Icon Placeholder - Consider using an SVG icon */}
                    <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                 {!mediaThumbnailSrc && <span className="absolute text-white text-sm bottom-2 left-2">Video</span>}
              </div>
            )}
            
            {hasCaption && (
              <p className="text-sm whitespace-pre-wrap mt-1 break-all">{message.content}</p>
            )}
            {/* Fallback for non-media text messages or media without thumbnail/caption */}
            {!(isImageMessage || isVideoMessage) && !hasCaption && (
                 <p className="text-sm whitespace-pre-wrap break-all">{message.content || "[Empty message]"}</p>
            )}
             {/* If it's media but no thumbnail and no caption, show media type */}
            {(isImageMessage || isVideoMessage) && !mediaThumbnailSrc && !hasCaption && (
              <div 
                className="text-sm p-2 cursor-pointer"
                onClick={handleMediaClick}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => e.key === 'Enter' && handleMediaClick()}
              >
                Click to view {message.media_type || 'media'}
              </div>
            )}
          </div>
        </div>
        </div> {/* Closing tag for the new inner flex container */}
      </div> {/* Closing tag for the max-w-[70%] container */}
    </div>
  );
}
