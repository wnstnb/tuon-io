import { isToday, isYesterday, isWithinInterval, subDays } from "date-fns";
import { TooltipIconButton } from "../ui/assistant-ui/tooltip-icon-button";
import { Button } from "../ui/button";
import { Trash2, FileText, Code, Files } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "../ui/sheet";
import { Skeleton } from "../ui/skeleton";
import { useEffect, useState } from "react";
import { Thread } from "@langchain/langgraph-sdk";
import { TighterText } from "../ui/header";
import { useGraphContext } from "@/contexts/GraphContext";
import { useToast } from "@/hooks/use-toast";
import React from "react";
import { useUserContext } from "@/contexts/UserContext";
import { useThreadContext } from "@/contexts/ThreadProvider";
import { getArtifactContent } from "@opencanvas/shared/utils/artifacts";

interface ThreadHistoryProps {
  switchSelectedThreadCallback: (thread: Thread) => void;
}

interface ThreadProps {
  id: string;
  onClick: () => void;
  onDelete: () => void;
  label: string;
  createdAt: Date;
  documentType?: 'code' | 'text';
  documentTitle?: string;
  documentLanguage?: string;
}

const ThreadItem = (props: ThreadProps) => {
  const [isHovering, setIsHovering] = useState(false);

  // Prepare a display title that includes language for code documents
  const displayTitle = props.documentType === 'code' && props.documentLanguage 
    ? `${props.documentTitle || props.label} (${props.documentLanguage})`
    : props.documentTitle || props.label;

  return (
    <div
      className="flex flex-row gap-0 items-center justify-start w-full"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Button
        className="px-2 justify-start items-center flex-grow min-w-[191px] pr-0"
        size="sm"
        variant="ghost"
        onClick={props.onClick}
      >
        {props.documentType === 'code' ? (
          <Code className="mr-2 h-4 w-4 flex-shrink-0" />
        ) : props.documentType === 'text' ? (
          <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
        ) : null}
        
        <TighterText className="truncate text-sm font-light w-full text-left">
          {displayTitle}
        </TighterText>
      </Button>
      {isHovering && (
        <TooltipIconButton
          tooltip="Delete document"
          variant="ghost"
          onClick={props.onDelete}
        >
          <Trash2 className="w-12 h-12 text-[#575757] hover:text-red-500 transition-colors ease-in" />
        </TooltipIconButton>
      )}
    </div>
  );
};

const LoadingThread = () => <Skeleton className="w-full h-8" />;

const convertThreadActualToThreadProps = (
  thread: Thread,
  switchSelectedThreadCallback: (thread: Thread) => void,
  deleteThread: (id: string) => void
): ThreadProps => {
  // Extract artifact information if available
  const threadValues = thread.values as Record<string, any>;
  const artifact = threadValues?.artifact;
  let documentType, documentTitle, documentLanguage;
  
  if (artifact) {
    try {
      // Get the current content based on the artifact's currentIndex
      const currentContent = getArtifactContent(artifact);
      documentType = currentContent.type;
      
      // Clean up and normalize the title - remove duplicate info and unnecessary prefixes
      documentTitle = currentContent.title;
      
      // If the title starts with "Open Canvas:" or similar, clean it up
      if (documentTitle) {
        documentTitle = documentTitle
          .replace(/^(Open Canvas:|Canvas:|Document:)\s*/i, '')
          .trim();
      }
      
      if (documentType === 'code' && 'language' in currentContent) {
        documentLanguage = currentContent.language;
      }
    } catch (e) {
      console.error("Error extracting artifact info", e);
    }
  }

  // If no document title was found from artifact, use thread title or message content
  const fallbackTitle = thread.metadata?.thread_title || 
    ((thread.values as Record<string, any>)?.messages?.[0]?.content || "Untitled");

  return {
    id: thread.thread_id,
    label: fallbackTitle,
    createdAt: new Date(thread.created_at),
    documentType,
    documentTitle: documentTitle || fallbackTitle,
    documentLanguage,
    onClick: () => {
      return switchSelectedThreadCallback(thread);
    },
    onDelete: () => {
      return deleteThread(thread.thread_id);
    },
  };
};

const groupThreadsByDocumentType = (
  threads: Thread[],
  switchSelectedThreadCallback: (thread: Thread) => void,
  deleteThread: (id: string) => void
) => {
  // First, convert and sort all threads by date (newest first)
  const threadProps = threads
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .map((t) =>
      convertThreadActualToThreadProps(
        t,
        switchSelectedThreadCallback,
        deleteThread
      )
    );

  // Create a map to deduplicate by title and keep only the most recent version
  const uniqueDocumentMap = new Map<string, ThreadProps>();
  
  // Since the threads are already sorted by date (newest first),
  // the first occurrence of each title will be the most recent one
  threadProps.forEach((thread) => {
    const title = thread.documentTitle || thread.label;
    if (!uniqueDocumentMap.has(title)) {
      uniqueDocumentMap.set(title, thread);
    }
  });
  
  // Convert back to an array and ensure it's sorted by date
  const uniqueThreadProps = Array.from(uniqueDocumentMap.values())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  
  return {
    code: uniqueThreadProps.filter((t) => t.documentType === 'code'),
    text: uniqueThreadProps.filter((t) => t.documentType === 'text'),
    other: uniqueThreadProps.filter((t) => !t.documentType)
  };
};

const groupThreads = (
  threads: Thread[],
  switchSelectedThreadCallback: (thread: Thread) => void,
  deleteThread: (id: string) => void
) => {
  const today = new Date();
  const yesterday = subDays(today, 1);
  const sevenDaysAgo = subDays(today, 7);

  return {
    today: threads
      .filter((thread) => isToday(new Date(thread.created_at)))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .map((t) =>
        convertThreadActualToThreadProps(
          t,
          switchSelectedThreadCallback,
          deleteThread
        )
      ),
    yesterday: threads
      .filter((thread) => isYesterday(new Date(thread.created_at)))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .map((t) =>
        convertThreadActualToThreadProps(
          t,
          switchSelectedThreadCallback,
          deleteThread
        )
      ),
    lastSevenDays: threads
      .filter((thread) =>
        isWithinInterval(new Date(thread.created_at), {
          start: sevenDaysAgo,
          end: yesterday,
        })
      )
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .map((t) =>
        convertThreadActualToThreadProps(
          t,
          switchSelectedThreadCallback,
          deleteThread
        )
      ),
    older: threads
      .filter((thread) => new Date(thread.created_at) < sevenDaysAgo)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .map((t) =>
        convertThreadActualToThreadProps(
          t,
          switchSelectedThreadCallback,
          deleteThread
        )
      ),
  };
};

const prettifyDateLabel = (group: string): string => {
  switch (group) {
    case "today":
      return "Today";
    case "yesterday":
      return "Yesterday";
    case "lastSevenDays":
      return "Last 7 days";
    case "older":
      return "Older";
    case "code":
      return "Code Documents";
    case "text":
      return "Text Documents";
    case "other":
      return "Other Chats";
    default:
      return group;
  }
};

interface ThreadsListProps {
  groupedThreads: Record<string, ThreadProps[]>;
}

function ThreadsList(props: ThreadsListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const MAX_ITEMS_PER_GROUP = 5;

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  return (
    <div className="flex flex-col pt-3 gap-4">
      {Object.entries(props.groupedThreads).map(([group, threads]) =>
        threads.length > 0 ? (
          <div key={group}>
            <TighterText className="text-sm font-medium mb-1 pl-2">
              {prettifyDateLabel(group)}
            </TighterText>
            <div className="flex flex-col gap-1">
              {(expandedGroups[group] ? threads : threads.slice(0, MAX_ITEMS_PER_GROUP)).map((thread) => (
                <ThreadItem key={thread.id} {...thread} />
              ))}
              
              {threads.length > MAX_ITEMS_PER_GROUP && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs self-start pl-2 mt-1 text-gray-500"
                  onClick={() => toggleGroup(group)}
                >
                  {expandedGroups[group] 
                    ? `Show Less (${threads.length - MAX_ITEMS_PER_GROUP} hidden)` 
                    : `Show More (${threads.length - MAX_ITEMS_PER_GROUP} more)`}
                </Button>
              )}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}

export function ThreadHistoryComponent(props: ThreadHistoryProps) {
  const { toast } = useToast();
  const {
    graphData: { setMessages, switchSelectedThread },
  } = useGraphContext();
  const { deleteThread, getUserThreads, userThreads, isUserThreadsLoading } =
    useThreadContext();
  const { user } = useUserContext();
  const [open, setOpen] = useState(false);
  const [groupByType, setGroupByType] = useState(true);

  useEffect(() => {
    if (typeof window == "undefined" || userThreads.length || !user) return;

    getUserThreads();
  }, [user]);

  const handleDeleteThread = async (id: string) => {
    if (!user) {
      toast({
        title: "Failed to delete thread",
        description: "User not found",
        duration: 5000,
        variant: "destructive",
      });
      return;
    }

    await deleteThread(id, () => setMessages([]));
  };

  const groupedThreads = groupByType 
    ? groupThreadsByDocumentType(
        userThreads,
        (thread) => {
          switchSelectedThread(thread);
          props.switchSelectedThreadCallback(thread);
          setOpen(false);
        },
        handleDeleteThread
      )
    : groupThreads(
        userThreads,
        (thread) => {
          switchSelectedThread(thread);
          props.switchSelectedThreadCallback(thread);
          setOpen(false);
        },
        handleDeleteThread
      );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <TooltipIconButton
          tooltip="Documents"
          variant="ghost"
          className="w-fit h-fit p-2"
        >
          <Files
            className="w-6 h-6 text-gray-600"
          />
        </TooltipIconButton>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="border-none overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        aria-describedby={undefined}
      >
        <SheetTitle>
          <div className="flex justify-between items-center">
            <TighterText className="px-2 text-lg text-gray-600">
              {groupByType ? "Documents" : "Conversation History"}
            </TighterText>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setGroupByType(!groupByType)}
              className="text-xs"
            >
              {groupByType ? "Show All Conversations" : "Show Unique Documents"}
            </Button>
          </div>
        </SheetTitle>

        {isUserThreadsLoading && !userThreads.length ? (
          <div className="flex flex-col gap-1 px-2 pt-3">
            {Array.from({ length: 25 }).map((_, i) => (
              <LoadingThread key={`loading-thread-${i}`} />
            ))}
          </div>
        ) : !userThreads.length ? (
          <p className="px-3 text-gray-500">No documents found.</p>
        ) : (
          <ThreadsList groupedThreads={groupedThreads} />
        )}
      </SheetContent>
    </Sheet>
  );
}

export const ThreadHistory = React.memo(ThreadHistoryComponent);
