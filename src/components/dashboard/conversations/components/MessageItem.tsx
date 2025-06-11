import { Avatar } from "@/components/ui/avatar";
import type { Conversation, Message as MessageType } from "../types";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client"; // Import supabase client

interface MediaBase64Response {
  base64?: string;
  message?: { // Evolution API sometimes nests the base64 in a message object
    body?: string; 
  };
  mimetype?: string;
}

interface MessageItemProps {
  message: MessageType;
  conversation: Conversation | null;
}

export function MessageItem({ message, conversation }: MessageItemProps) {
  const isAdmin = message.sender?.role === 'admin';
  const [fullImageSrc, setFullImageSrc] = useState<string | null>(null);
  const [isLoadingFullImage, setIsLoadingFullImage] = useState(false);
  const [errorLoadingFullImage, setErrorLoadingFullImage] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setFullImageSrc(null);
    setIsLoadingFullImage(false);
    setErrorLoadingFullImage(false);

    if (message.media_type === 'image' && message.wamid && message.media_data) {
      if (!conversation || !conversation.integrations_id) {
        console.warn("MessageItem: Conversation or integrations_id missing, cannot fetch full image for wamid:", message.wamid);
        setErrorLoadingFullImage(true);
        return;
      }
      setIsLoadingFullImage(true);
      supabase.functions.invoke('get-media-base64', {
        body: { 
          messageId: message.wamid,
          integrationsConfigId: conversation.integrations_id // Use dynamic integrations_id
        }
      })
      .then(({ data: funcResponse, error: funcError }) => {
        if (!isMounted) return;
        setIsLoadingFullImage(false);
        if (funcError) {
          console.error('Error invoking get-media-base64 function:', funcError);
          setErrorLoadingFullImage(true);
          return;
        }
        
        const responsePayload = funcResponse as MediaBase64Response | null | undefined; 
        const base64Data = responsePayload?.base64 || responsePayload?.message?.body; 
        const mimetype = responsePayload?.mimetype || (message.media_data as { mimetype?: string })?.mimetype || 'image/jpeg';

        if (typeof base64Data === 'string') {
          setFullImageSrc(`data:${mimetype};base64,${base64Data}`);
        } else {
          console.error('Failed to get valid base64 data from function response:', funcResponse);
          setErrorLoadingFullImage(true);
        }
      })
      .catch(err => {
        if (!isMounted) return;
        setIsLoadingFullImage(false);
        setErrorLoadingFullImage(true);
        console.error('Exception calling get-media-base64 function:', err);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [message.wamid, message.media_type, message.media_data, conversation?.integrations_id]);
  
  const isImageMessage = message.media_type === 'image' && message.media_data;
  const hasCaption = !!message.content;

  let imageToDisplay: string | undefined = undefined;
  let currentAltText = "Image";

  if (isImageMessage) {
    const mediaInfo = message.media_data as { url?: string; jpegThumbnail?: string; mimetype?: string };
    if (fullImageSrc) {
      imageToDisplay = fullImageSrc;
      currentAltText = "Full image";
    } else if (mediaInfo.jpegThumbnail) {
      imageToDisplay = `data:${mediaInfo.mimetype || 'image/jpeg'};base64,${mediaInfo.jpegThumbnail}`;
      currentAltText = "Image thumbnail";
    } else if (mediaInfo.url && !errorLoadingFullImage) { 
      // Only use URL if not actively loading/failed full image, as it's likely encrypted
      // This branch might be removed if URL is always encrypted and never displayable directly
      // imageToDisplay = mediaInfo.url; 
      // currentAltText = "Image content (direct URL)";
    }
  } else if (message.content && message.content.startsWith('data:image')) {
    // Fallback for old base64 content stored directly in message.content
    imageToDisplay = message.content;
    currentAltText = "Sent image";
  }

  return (
    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[70%] items-start gap-2 ${isAdmin ? "flex-row-reverse" : "flex-row"}`}>
        <Avatar className="h-8 w-8">
          <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            {isAdmin ? 'A' : 'U'}
          </div>
        </Avatar>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">
              {isAdmin ? 'Admin' : conversation?.customer_name || 'User'}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
          </div>
          <div
            className={`rounded-lg ${isImageMessage && !hasCaption && imageToDisplay ? 'p-0' : 'p-3'} ${
              isAdmin ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            {isLoadingFullImage && !fullImageSrc && !imageToDisplay && <div className="text-sm p-2">Loading image...</div>}
            {errorLoadingFullImage && !imageToDisplay && <div className="text-sm p-2 text-red-500">Error loading image.</div>}
            
            {imageToDisplay ? (
              <img 
                src={imageToDisplay} 
                alt={currentAltText} 
                className={`w-full max-h-[36rem] rounded-md object-contain ${hasCaption && imageToDisplay ? 'mb-1' : ''}`}
              />
            ) : null}
            
            {hasCaption && (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
            {!imageToDisplay && !hasCaption && (
                 <p className="text-sm whitespace-pre-wrap">{message.content || "[Empty message]"}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
