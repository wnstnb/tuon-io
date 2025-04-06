import { CircleCheck, CircleX, Edit, LoaderCircle, Save, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useGraphContext } from "@/contexts/GraphContext";

interface ArtifactTitleProps {
  title: string;
  isArtifactSaved: boolean;
  artifactUpdateFailed: boolean;
}

export function ArtifactTitle(props: ArtifactTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(props.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const { graphData } = useGraphContext();

  // Update local state when props change
  useEffect(() => {
    setEditedTitle(props.title);
  }, [props.title]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedTitle(props.title);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (editedTitle.trim() === "") {
      setEditedTitle(props.title);
      setIsEditing(false);
      return;
    }

    // Update the artifact title
    if (graphData.artifact && graphData.threadId) {
      const newArtifact = {
        ...graphData.artifact,
        contents: graphData.artifact.contents.map(content => {
          if (content.index === graphData.artifact?.currentIndex) {
            return {
              ...content,
              title: editedTitle.trim()
            };
          }
          return content;
        })
      };
      
      graphData.setArtifact(newArtifact);
      
      // Update the artifact on the server
      graphData.updateArtifact(newArtifact, graphData.threadId);
    }
    
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <div className="pl-[6px] pt-3 flex flex-col items-start justify-start ml-[6px] gap-1 max-w-1/2">
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-xl font-medium text-foreground bg-transparent border-b border-primary focus:outline-none focus:border-primary-focus px-1"
            maxLength={100}
          />
          <button 
            onClick={handleSaveEdit}
            className="text-foreground hover:text-primary transition-colors ease-in"
            title="Save"
          >
            <Save className="w-4 h-4" />
          </button>
          <button 
            onClick={handleCancelEdit}
            className="text-foreground hover:text-destructive transition-colors ease-in"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-medium text-foreground line-clamp-1">
            {props.title}
          </h1>
          <button 
            onClick={handleStartEdit}
            className="text-muted-foreground hover:text-foreground transition-colors ease-in opacity-0 group-hover:opacity-100"
            title="Rename document"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>
      )}
      <span className="mt-auto">
        {props.isArtifactSaved ? (
          <span className="flex items-center justify-start gap-1 text-muted-foreground">
            <p className="text-xs font-light">Saved</p>
            <CircleCheck className="w-[10px] h-[10px]" />
          </span>
        ) : !props.artifactUpdateFailed ? (
          <span className="flex items-center justify-start gap-1 text-muted-foreground">
            <p className="text-xs font-light">Saving</p>
            <LoaderCircle className="animate-spin w-[10px] h-[10px]" />
          </span>
        ) : props.artifactUpdateFailed ? (
          <span className="flex items-center justify-start gap-1 text-red-300">
            <p className="text-xs font-light">Failed to save</p>
            <CircleX className="w-[10px] h-[10px]" />
          </span>
        ) : null}
      </span>
    </div>
  );
}
