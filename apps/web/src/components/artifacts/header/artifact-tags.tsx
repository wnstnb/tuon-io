import { Tag, Plus, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useGraphContext } from "@/contexts/GraphContext";
import { useUserContext } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ArtifactTagsProps {
  tags: string[];
  threadId: string;
}

export function ArtifactTags(props: ArtifactTagsProps) {
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { graphData } = useGraphContext();
  const { toast } = useToast();
  const { user } = useUserContext();
  const [localTags, setLocalTags] = useState<string[]>(props.tags);

  // Maximum of 2 tags
  const maxTags = 2;
  const canAddMoreTags = localTags.length < maxTags;

  // Update local tags when props change
  useEffect(() => {
    setLocalTags(props.tags);
  }, [props.tags]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isAddingTag && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingTag]);

  const handleAddTag = async () => {
    if (!newTag.trim() || !props.threadId || !user) return;
    
    // Check if we already have the maximum number of tags
    if (localTags.length >= maxTags) {
      toast({
        title: "Tag limit reached",
        description: `You can only add up to ${maxTags} tags per document.`,
        variant: "default",
        duration: 3000,
      });
      setIsAddingTag(false);
      setNewTag("");
      return;
    }
    
    // Check if the tag already exists
    if (localTags.includes(newTag.trim())) {
      toast({
        title: "Duplicate tag",
        description: "This tag is already applied to the document.",
        variant: "default",
        duration: 3000,
      });
      setIsAddingTag(false);
      setNewTag("");
      return;
    }
    
    try {
      // Update thread metadata with new tag
      const updatedTags = [...localTags, newTag.trim()].slice(0, maxTags);
      
      // Update tags in the current thread's metadata
      await graphData.updateThreadTags(props.threadId, updatedTags);
      
      // Update local state immediately for UI responsiveness
      setLocalTags(updatedTags);
      setNewTag("");
      setIsAddingTag(false);
    } catch (error) {
      console.error("Failed to add tag", error);
      toast({
        title: "Failed to add tag",
        description: "An error occurred while adding the tag.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!props.threadId || !user) return;
    
    try {
      // Remove tag from the current thread's metadata
      const updatedTags = localTags.filter(tag => tag !== tagToRemove);
      await graphData.updateThreadTags(props.threadId, updatedTags);
      
      // Update local state immediately for UI responsiveness
      setLocalTags(updatedTags);
    } catch (error) {
      console.error("Failed to remove tag", error);
      toast({
        title: "Failed to remove tag",
        description: "An error occurred while removing the tag.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddTag();
    } else if (e.key === "Escape") {
      setIsAddingTag(false);
      setNewTag("");
    }
  };

  return (
    <div className="flex items-center gap-2 h-6 pt-1 group/tags">
      {localTags.map((tag) => (
        <Badge 
          key={tag} 
          variant="outline" 
          className="px-2 py-0 h-5 text-xs bg-muted/40 hover:bg-muted gap-1 group"
        >
          {tag}
          <button
            onClick={() => handleRemoveTag(tag)}
            className="text-muted-foreground hover:text-destructive ml-1 transition-colors opacity-0 group-hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      
      {isAddingTag ? (
        <div className="flex items-center h-5">
          <Input
            ref={inputRef}
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-5 text-xs py-0 px-2 min-w-0 w-16 bg-muted/40"
            maxLength={15}
            placeholder="Add tag..."
          />
          <button 
            onClick={handleAddTag}
            className="ml-1 text-muted-foreground hover:text-primary"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button 
            onClick={() => {
              setIsAddingTag(false);
              setNewTag("");
            }}
            className="ml-1 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : canAddMoreTags && (
        localTags.length === 0 ? (
          <button
            onClick={() => setIsAddingTag(true)}
            className="flex items-center gap-1 text-xs font-medium text-foreground/80 hover:text-primary transition-colors border border-dashed border-foreground/30 rounded-md px-2 py-0.5"
            title="Add tag"
          >
            <Plus className="h-3 w-3" />
            Add tag
          </button>
        ) : (
          <button
            onClick={() => setIsAddingTag(true)}
            className="text-foreground hover:text-primary transition-colors opacity-90 group-hover/tags:opacity-100"
            title="Add tag"
          >
            <Tag className="h-4 w-4" />
          </button>
        )
      )}
    </div>
  );
} 