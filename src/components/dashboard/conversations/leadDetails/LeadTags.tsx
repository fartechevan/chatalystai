
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tag, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadTagsProps {
  tags: string[];
  setTags: (tags: string[]) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    await onRemoveTag(tag);
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
      <div className="flex flex-wrap gap-2">
        {tags.length > 0 ? (
          tags.map((tag, index) => (
            <div key={index} className="flex items-center gap-1 bg-muted rounded-md px-2 py-1 text-xs">
              <span>{tag}</span>
              <button 
                onClick={() => handleRemoveTag(tag)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${tag} tag`}
              >
                &times;
              </button>
            </div>
          ))
        ) : (
          <div className="text-xs text-muted-foreground">No tags yet</div>
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
