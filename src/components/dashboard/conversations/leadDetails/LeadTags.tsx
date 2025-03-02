
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tag } from "lucide-react";

interface LeadTagsProps {
  tags: string[];
  setTags: (tags: string[]) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

export function LeadTags({ tags, setTags, onAddTag, onRemoveTag }: LeadTagsProps) {
  const [newTag, setNewTag] = useState<string>("");
  const [showTagInput, setShowTagInput] = useState<boolean>(false);

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    
    onAddTag(newTag.trim());
    setNewTag("");
    setShowTagInput(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <div key={index} className="flex items-center gap-1 bg-muted rounded-md px-2 py-1 text-xs">
            <span>{tag}</span>
            <button 
              onClick={() => onRemoveTag(tag)}
              className="text-muted-foreground hover:text-foreground"
            >
              &times;
            </button>
          </div>
        ))}
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
          />
          <Button size="sm" variant="outline" onClick={handleAddTag} className="h-8">Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowTagInput(false)} className="h-8 px-2">
            &times;
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="text-muted-foreground w-full justify-start" onClick={() => setShowTagInput(true)}>
          <Tag className="h-3.5 w-3.5 mr-2" />
          Add tag
        </Button>
      )}
    </div>
  );
}
