import { ReflectionsDialog } from "../../reflections-dialog/ReflectionsDialog";
import { ArtifactTitle } from "./artifact-title";
import { ArtifactTags } from "./artifact-tags";
import { NavigateArtifactHistory } from "./navigate-artifact-history";
import { ArtifactCodeV3, ArtifactMarkdownV3 } from "@opencanvas/shared/types";
import { Assistant } from "@langchain/langgraph-sdk";
import { PanelRightClose } from "lucide-react";
import { TooltipIconButton } from "@/components/ui/assistant-ui/tooltip-icon-button";
import { useGraphContext } from "@/contexts/GraphContext";
import { Badge } from "@/components/ui/badge";
import { useUserContext } from "@/contexts/UserContext";
import { useState, useEffect } from "react";
import { createClient } from "@/hooks/utils";

interface ArtifactHeaderProps {
  isBackwardsDisabled: boolean;
  isForwardDisabled: boolean;
  setSelectedArtifact: (index: number) => void;
  currentArtifactContent: ArtifactCodeV3 | ArtifactMarkdownV3;
  isArtifactSaved: boolean;
  totalArtifactVersions: number;
  selectedAssistant: Assistant | undefined;
  artifactUpdateFailed: boolean;
  chatCollapsed: boolean;
  setChatCollapsed: (c: boolean) => void;
}

export function ArtifactHeader(props: ArtifactHeaderProps) {
  const { graphData: { threadSwitched, threadId } } = useGraphContext();

  // Get tags from thread metadata
  const threadTags = threadId ? useThreadTags(threadId) : [];

  return (
    <div className="flex flex-row items-center justify-between">
      <div className="flex flex-col items-start justify-center">
        <div className="flex flex-row items-center justify-center gap-2">
          {props.chatCollapsed && (
            <TooltipIconButton
              tooltip="Expand Chat"
              variant="ghost"
              className="ml-2 mb-1 w-8 h-8"
              delayDuration={400}
              onClick={() => props.setChatCollapsed(false)}
            >
              <PanelRightClose className="text-foreground" />
            </TooltipIconButton>
          )}
          <div className="group">
            <ArtifactTitle
              title={props.currentArtifactContent.title}
              isArtifactSaved={props.isArtifactSaved}
              artifactUpdateFailed={props.artifactUpdateFailed}
            />
          </div>
          {threadSwitched && (
            <Badge variant="outline" className="ml-2">Historical Document</Badge>
          )}
        </div>
        
        {/* Add Tags Component */}
        {threadId && (
          <div className="ml-[14px]">
            <ArtifactTags tags={threadTags} threadId={threadId} />
          </div>
        )}
      </div>
      <div className="flex gap-2 items-end mt-[10px] mr-[6px]">
        <NavigateArtifactHistory
          isBackwardsDisabled={props.isBackwardsDisabled}
          isForwardDisabled={props.isForwardDisabled}
          setSelectedArtifact={props.setSelectedArtifact}
          currentArtifactIndex={props.currentArtifactContent.index}
          totalArtifactVersions={props.totalArtifactVersions}
        />
        <ReflectionsDialog selectedAssistant={props.selectedAssistant} />
      </div>
    </div>
  );
}

// Helper hook to get tags from thread metadata
function useThreadTags(threadId: string): string[] {
  const [tags, setTags] = useState<string[]>([]);
  const { user } = useUserContext();
  
  useEffect(() => {
    async function fetchThreadTags() {
      if (!threadId || !user) return;
      
      try {
        const client = createClient();
        const thread = await client.threads.get(threadId);
        
        if (thread && thread.metadata && thread.metadata.tags) {
          setTags(thread.metadata.tags as string[]);
        } else {
          setTags([]);
        }
      } catch (error) {
        console.error("Failed to fetch thread tags", error);
        setTags([]);
      }
    }
    
    fetchThreadTags();
  }, [threadId, user]);
  
  return tags;
}
