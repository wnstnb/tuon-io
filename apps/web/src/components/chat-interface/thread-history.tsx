import { isToday, isYesterday, isWithinInterval, subDays } from "date-fns";
import { TooltipIconButton } from "../ui/assistant-ui/tooltip-icon-button";
import { Button } from "../ui/button";
import { Trash2, FileText, Code, Files, X, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "../ui/sheet";
import { Skeleton } from "../ui/skeleton";
import { useEffect, useState, useMemo, useRef } from "react";
import { Thread } from "@langchain/langgraph-sdk";
import { TighterText } from "../ui/header";
import { useGraphContext } from "@/contexts/GraphContext";
import { useToast } from "@/hooks/use-toast";
import React from "react";
import { useUserContext } from "@/contexts/UserContext";
import { useThreadContext } from "@/contexts/ThreadProvider";
import { getArtifactContent } from "@opencanvas/shared/utils/artifacts";
import { Badge } from "../ui/badge";

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
  tags?: string[];
}

const ThreadItem = (props: ThreadProps) => {
  const [isHovering, setIsHovering] = useState(false);

  // Prepare a display title that includes language for code documents
  const displayTitle = props.documentType === 'code' && props.documentLanguage 
    ? `${props.documentTitle || props.label} (${props.documentLanguage})`
    : props.documentTitle || props.label;

  return (
    <div
      className="flex flex-col gap-0 w-full mb-1"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex flex-row items-center justify-start w-full">
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
      
      {/* Display tags if present */}
      {props.tags && props.tags.length > 0 && (
        <div className="flex items-center gap-1 ml-8 mt-1">
          {props.tags.map(tag => (
            <Badge 
              key={tag} 
              variant="secondary" 
              className="px-2 py-0 h-4 text-xs bg-gray-100 border border-gray-200 text-gray-700"
            >
              {tag}
            </Badge>
          ))}
        </div>
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

  // Get tags from thread metadata
  const tags = thread.metadata?.tags as string[] || [];

  return {
    id: thread.thread_id,
    label: fallbackTitle,
    createdAt: new Date(thread.created_at),
    documentType,
    documentTitle: documentTitle || fallbackTitle,
    documentLanguage,
    tags,
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
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    };

    if (isTagDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTagDropdownOpen]);

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

  // Get all unique tags from all threads
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    userThreads.forEach(thread => {
      const tags = thread.metadata?.tags as string[] || [];
      tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, [userThreads]);

  // Filter threads by active tag if set
  const filteredThreads = useMemo(() => {
    if (activeTagFilters.length === 0) return userThreads;
    
    return userThreads.filter(thread => {
      const tags = thread.metadata?.tags as string[] || [];
      // Require ALL selected tags to be present (AND logic)
      return activeTagFilters.every(filterTag => tags.includes(filterTag));
    });
  }, [userThreads, activeTagFilters]);

  const groupedThreads = groupByType 
    ? groupThreadsByDocumentType(
        filteredThreads,
        (thread) => {
          switchSelectedThread(thread);
          props.switchSelectedThreadCallback(thread);
          setOpen(false);
        },
        handleDeleteThread
      )
    : groupThreads(
        filteredThreads,
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

        {/* Tag filter dropdown */}
        {allTags.length > 0 && (
          <div className="px-3 mt-3 mb-2">
            <div className="relative" ref={dropdownRef}>
              {/* Dropdown trigger button - make it slimmer */}
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                className="w-full justify-between text-sm font-medium h-8 bg-black hover:bg-black/90 text-white"
              >
                <div className="flex items-center mx-auto gap-1">
                  {activeTagFilters.length > 0 && (
                    <span className="h-2 w-2 bg-white rounded-full" />
                  )}
                  {activeTagFilters.length > 0 
                    ? `Filtered by ${activeTagFilters.length} tag${activeTagFilters.length > 1 ? 's' : ''}`
                    : "Filter by tags"}
                </div>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform absolute right-3 ${isTagDropdownOpen ? "rotate-180" : ""}`} />
              </Button>

              {/* Dropdown panel - respect theme */}
              {isTagDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-background shadow-md max-h-60 overflow-y-auto">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-foreground/70">Filter by tags (max 2)</span>
                      {activeTagFilters.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTagFilters([]);
                          }}
                          className="text-xs h-6 py-0 px-2"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5">
                      {allTags.map(tag => (
                        <button
                          key={tag}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeTagFilters.includes(tag)) {
                              // Remove tag if already selected
                              setActiveTagFilters(activeTagFilters.filter(t => t !== tag));
                            } else if (activeTagFilters.length < 2) {
                              // Add tag if not at max selection
                              setActiveTagFilters([...activeTagFilters, tag]);
                            } else {
                              // Show toast if trying to add more than allowed
                              toast({
                                title: "Maximum 2 tags",
                                description: "You can select up to 2 tags for filtering",
                                duration: 3000,
                              });
                            }
                          }}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            activeTagFilters.includes(tag)
                              ? 'bg-gray-200 text-gray-800 border border-gray-300'
                              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isUserThreadsLoading && !userThreads.length ? (
          <div className="flex flex-col gap-1 px-2 pt-3">
            {Array.from({ length: 25 }).map((_, i) => (
              <LoadingThread key={`loading-thread-${i}`} />
            ))}
          </div>
        ) : !filteredThreads.length ? (
          <p className="px-3 text-gray-500">
            {activeTagFilters.length > 0 ? `No documents found with selected tags.` : "No documents found."}
          </p>
        ) : (
          <ThreadsList groupedThreads={groupedThreads} />
        )}
      </SheetContent>
    </Sheet>
  );
}

export const ThreadHistory = React.memo(ThreadHistoryComponent);
