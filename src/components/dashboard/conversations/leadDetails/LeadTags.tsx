import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tag, Loader2, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadTagsProps {
  tags: string[];
  setTags: (tags: string[]) => void;
  onAddTag: (tag: string) => Promise<void>;
  onRemoveTag: (tag: string) => Promise<void>;
  isLoading?: boolean;
}

export function LeadTags({ tags, setTags, onAddTag, onRemoveTag, isLoading = false }: LeadTagsProps) {
  const [newTag, setNewTag] = useState<string>("");
  const [showTagInput, setShowTagInput] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAddTag(newTag.trim());
      setNewTag("");
      setShowTagInput(false);
    } catch (error) {
      console.error("Error adding tag:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    try {
      await onRemoveTag(tag);
    } catch (error) {
      console.error("Error removing tag:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        {tags.length > 0 ? (
          tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs font-normal">
              {tag}
              <button 
                onClick={() => handleRemoveTag(tag)}
                className="ml-1.5 -mr-0.5 p-0.5 rounded-full hover:bg-destructive/20 text-destructive opacity-70 hover:opacity-100"
                aria-label={`Remove ${tag} tag`}
              >
                <XIcon className="h-3 w-3" />
              </button>
            </Badge>
          ))
        ) : (
          <p className="text-xs text-muted-foreground italic">No tags yet</p>
        )}
      </div>
      
      {showTagInput ? (
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Enter tag name"
            className="h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddTag();
              }
            }}
            disabled={isSubmitting}
          />
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleAddTag} 
            className="h-8"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setShowTagInput(false)} 
            className="h-8 px-2"
            disabled={isSubmitting}
          >
            &times;
          </Button>
        </div>
      ) : (
        <Button 
          variant="outline" 
          size="sm" 
          className={cn("text-muted-foreground w-full justify-start", isSubmitting && "opacity-50 pointer-events-none")} 
          onClick={() => setShowTagInput(true)}
          disabled={isSubmitting}
        >
          <Tag className="h-3.5 w-3.5 mr-2" />
          Add tag
        </Button>
      )}
    </div>
  );
}
