import { ReflectionsDialog } from "../../reflections-dialog/ReflectionsDialog";
import { ArtifactTitle } from "./artifact-title";
import { NavigateArtifactHistory } from "./navigate-artifact-history";
import { ArtifactCodeV3, ArtifactMarkdownV3 } from "@opencanvas/shared/types";
import { Assistant } from "@langchain/langgraph-sdk";
import { PanelRightClose } from "lucide-react";
import { TooltipIconButton } from "@/components/ui/assistant-ui/tooltip-icon-button";
import { useGraphContext } from "@/contexts/GraphContext";
import { Badge } from "@/components/ui/badge";

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
  const { graphData: { threadSwitched } } = useGraphContext();

  return (
    <div className="flex flex-row items-center justify-between">
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
        <ArtifactTitle
          title={props.currentArtifactContent.title}
          isArtifactSaved={props.isArtifactSaved}
          artifactUpdateFailed={props.artifactUpdateFailed}
        />
        {threadSwitched && (
          <Badge variant="outline" className="ml-2">Historical Document</Badge>
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
