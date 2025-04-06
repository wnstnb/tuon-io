"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState, useMemo } from "react";
import { ArtifactMarkdownV3 } from "@opencanvas/shared/types";
import "@blocknote/core/fonts/inter.css";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { isArtifactMarkdownContent } from "@opencanvas/shared/utils/artifacts";
import { CopyText } from "./components/CopyText";
import { getArtifactContent } from "@opencanvas/shared/utils/artifacts";
import { useGraphContext } from "@/contexts/GraphContext";
import React from "react";
import { TooltipIconButton } from "../ui/assistant-ui/tooltip-icon-button";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { Textarea } from "../ui/textarea";
import { cn } from "@/lib/utils";
import useLocalStorage from "@/hooks/useLocalStorage";

const cleanText = (text: string) => {
  return text.replaceAll("\\\n", "\n");
};

function ViewRawText({
  isRawView,
  setIsRawView,
}: {
  isRawView: boolean;
  setIsRawView: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <TooltipIconButton
        tooltip={`View ${isRawView ? "rendered" : "raw"} markdown`}
        variant="outline"
        delayDuration={400}
        onClick={() => setIsRawView((p) => !p)}
      >
        {isRawView ? (
          <EyeOff className="w-5 h-5 text-foreground" />
        ) : (
          <Eye className="w-5 h-5 text-foreground" />
        )}
      </TooltipIconButton>
    </motion.div>
  );
}

export interface TextRendererProps {
  isEditing: boolean;
  isHovering: boolean;
  isInputVisible: boolean;
}

export function TextRendererComponent(props: TextRendererProps) {
  const editor = useCreateBlockNote({});
  const { graphData } = useGraphContext();
  const {
    artifact,
    isStreaming,
    updateRenderedArtifactRequired,
    firstTokenReceived,
    setArtifact,
    setSelectedBlocks,
    setUpdateRenderedArtifactRequired,
  } = graphData;
  const [theme] = useLocalStorage<"light" | "dark">("theme", "light");
  const isDarkMode = theme === "dark";

  const [rawMarkdown, setRawMarkdown] = useState("");
  const [isRawView, setIsRawView] = useState(false);
  const [manuallyUpdatingArtifact, setManuallyUpdatingArtifact] =
    useState(false);

  useEffect(() => {
    const selectedText = editor.getSelectedText();
    const selection = editor.getSelection();

    if (selectedText && selection) {
      if (!artifact) {
        console.error("Artifact not found");
        return;
      }

      const currentBlockIdx = artifact.currentIndex;
      const currentContent = artifact.contents.find(
        (c) => c.index === currentBlockIdx
      );
      if (!currentContent) {
        console.error("Current content not found");
        return;
      }
      if (!isArtifactMarkdownContent(currentContent)) {
        console.error("Current content is not markdown");
        return;
      }

      (async () => {
        const [markdownBlock, fullMarkdown] = await Promise.all([
          editor.blocksToMarkdownLossy(selection.blocks),
          editor.blocksToMarkdownLossy(editor.document),
        ]);
        setSelectedBlocks({
          fullMarkdown: cleanText(fullMarkdown),
          markdownBlock: cleanText(markdownBlock),
          selectedText: cleanText(selectedText),
        });
      })();
    }
  }, [editor.getSelectedText()]);

  useEffect(() => {
    if (!props.isInputVisible) {
      setSelectedBlocks(undefined);
    }
  }, [props.isInputVisible]);

  useEffect(() => {
    if (!artifact) {
      return;
    }
    if (
      !isStreaming &&
      !manuallyUpdatingArtifact &&
      !updateRenderedArtifactRequired
    ) {
      return;
    }

    try {
      const currentIndex = artifact.currentIndex;
      const currentContent = artifact.contents.find(
        (c) => c.index === currentIndex && c.type === "text"
      ) as ArtifactMarkdownV3 | undefined;
      if (!currentContent) return;

      // Blocks are not found in the artifact, so once streaming is done we should update the artifact state with the blocks
      (async () => {
        const markdownAsBlocks = await editor.tryParseMarkdownToBlocks(
          currentContent.fullMarkdown
        );
        editor.replaceBlocks(editor.document, markdownAsBlocks);
        setUpdateRenderedArtifactRequired(false);
        setManuallyUpdatingArtifact(false);
      })();
    } finally {
      setManuallyUpdatingArtifact(false);
      setUpdateRenderedArtifactRequired(false);
    }
  }, [artifact, updateRenderedArtifactRequired]);

  useEffect(() => {
    if (isRawView) {
      editor.blocksToMarkdownLossy(editor.document).then(setRawMarkdown);
    } else if (!isRawView && rawMarkdown) {
      try {
        (async () => {
          setManuallyUpdatingArtifact(true);
          const markdownAsBlocks =
            await editor.tryParseMarkdownToBlocks(rawMarkdown);
          editor.replaceBlocks(editor.document, markdownAsBlocks);
          setManuallyUpdatingArtifact(false);
        })();
      } catch (_) {
        setManuallyUpdatingArtifact(false);
      }
    }
  }, [isRawView, editor]);

  const isComposition = useRef(false);

  const onChange = async () => {
    if (
      isStreaming ||
      manuallyUpdatingArtifact ||
      updateRenderedArtifactRequired
    )
      return;

    const fullMarkdown = await editor.blocksToMarkdownLossy(editor.document);
    setArtifact((prev) => {
      if (!prev) {
        return {
          currentIndex: 1,
          contents: [
            {
              index: 1,
              fullMarkdown: fullMarkdown,
              title: "Untitled",
              type: "text",
            },
          ],
        };
      } else {
        return {
          ...prev,
          contents: prev.contents.map((c) => {
            if (c.index === prev.currentIndex) {
              return {
                ...c,
                fullMarkdown: fullMarkdown,
              };
            }
            return c;
          }),
        };
      }
    });
  };

  const onChangeRawMarkdown = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newRawMarkdown = e.target.value;
    setRawMarkdown(newRawMarkdown);
    setArtifact((prev) => {
      if (!prev) {
        return {
          currentIndex: 1,
          contents: [
            {
              index: 1,
              fullMarkdown: newRawMarkdown,
              title: "Untitled",
              type: "text",
            },
          ],
        };
      } else {
        return {
          ...prev,
          contents: prev.contents.map((c) => {
            if (c.index === prev.currentIndex) {
              return {
                ...c,
                fullMarkdown: newRawMarkdown,
              };
            }
            return c;
          }),
        };
      }
    });
  };

  // Initialize and set up a dedicated function to handle editor initialization and list marker styling
  useEffect(() => {
    const handleBlockNoteInit = () => {
      // Force all editor content to have proper theme coloring
      const listHandler = () => {
        // Get all list markers in the editor
        const allElements = document.querySelectorAll('.custom-blocknote-theme [contenteditable="false"]');
        
        // Apply color to each marker element based on current theme
        allElements.forEach(element => {
          if (element instanceof HTMLElement) {
            // Direct style override for list markers and numbers
            element.style.setProperty('color', isDarkMode ? 'white' : 'black', 'important');
            element.style.setProperty('opacity', '1', 'important');
          }
        });
      };
      
      // Run immediately
      listHandler();
      
      // Run again after a short delay to catch any delayed rendering
      setTimeout(listHandler, 100);
      setTimeout(listHandler, 500);
      
      // Set up a mutation observer to watch for changes in the DOM
      // This will ensure newly rendered elements also get the correct styling
      const observer = new MutationObserver(listHandler);
      
      // Start observing once the blocknote container is available
      const startObserving = () => {
        const blockNoteContainer = document.querySelector('.custom-blocknote-theme');
        if (blockNoteContainer) {
          observer.observe(blockNoteContainer, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'contenteditable']
          });
          return true;
        }
        return false;
      };
      
      // Try to start observing immediately
      if (!startObserving()) {
        // If container isn't available yet, try again after a short delay
        setTimeout(startObserving, 200);
      }
      
      // Add the handler to run on theme changes and content changes
      window.addEventListener('themechange', listHandler);
      
      return () => {
        window.removeEventListener('themechange', listHandler);
        observer.disconnect();
      };
    };
    
    // Run the initialization function
    const cleanup = handleBlockNoteInit();
    
    // Cleanup when component unmounts
    return cleanup;
  }, [editor, isDarkMode]); // Run when editor or theme changes

  // Inject high-priority styles directly into head
  useEffect(() => {
    // Remove any previous injected style to avoid duplication
    const existingStyle = document.getElementById('blocknote-override-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Create and inject new style element
    const styleEl = document.createElement('style');
    styleEl.id = 'blocknote-override-styles';
    styleEl.innerHTML = `
      /* Highest possible specificity for list markers */
      html body .custom-blocknote-theme .bn-list-item__marker,
      html body .custom-blocknote-theme [contenteditable="false"],
      html body .custom-blocknote-theme [class*="ListItem"] [contenteditable="false"],
      html body .custom-blocknote-theme [class*="numberedList"] *,
      html body .custom-blocknote-theme [class*="bulletList"] * {
        color: ${isDarkMode ? 'white' : 'black'} !important;
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(styleEl);
  }, [isDarkMode]);

  return (
    <div className="w-full h-full mt-2 flex flex-col border-t-[1px] border-border overflow-y-auto py-5 relative" style={{ backgroundColor: 'transparent' }}>
      {props.isHovering && artifact && (
        <div className="absolute flex gap-2 top-2 right-4 z-10">
          <CopyText currentArtifactContent={getArtifactContent(artifact)} />
          <ViewRawText isRawView={isRawView} setIsRawView={setIsRawView} />
        </div>
      )}
      {isRawView ? (
        <Textarea
          className="whitespace-pre-wrap font-mono text-sm px-[54px] border-0 shadow-none h-full outline-none ring-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
          value={rawMarkdown}
          onChange={onChangeRawMarkdown}
        />
      ) : (
        <>
          <style jsx>{`
            .darkModeOnly,
            .lightModeOnly {
              border-radius: 0.375rem;
            }
          `}</style>
          <div
            className={cn(
              "w-full",
              isDarkMode ? "darkModeOnly" : "lightModeOnly",
              "bg-background"
            )}
          >
            <BlockNoteView 
              key={`blocknote-${isDarkMode ? 'dark' : 'light'}`}
              editor={editor}
              theme={isDarkMode ? "dark" : "light"}
              className="custom-blocknote-theme"
              formattingToolbar={false}
              slashMenu={false}
              onCompositionStartCapture={() => (isComposition.current = true)}
              onCompositionEndCapture={() => (isComposition.current = false)}
              onChange={onChange}
              editable={
                !isStreaming || props.isEditing || !manuallyUpdatingArtifact
              }
              style={{
                color: isDarkMode ? 'white' : 'black',
                '--bn-colors-text': isDarkMode ? 'white' : 'black',
                '--bn-colors-default-text': isDarkMode ? 'white' : 'black',
                '--bn-colors-surface': 'transparent',
                '--bn-colors-editor-text': isDarkMode ? 'white' : 'black',
                '--bn-colors-editor-default-text': isDarkMode ? 'white' : 'black',
                '--bn-colors-list-text': isDarkMode ? 'white' : 'black',
                '--bn-colors-list-marker': isDarkMode ? 'white' : 'black',
                '--bn-colors-inline-text': isDarkMode ? 'white' : 'black'
              } as React.CSSProperties}
            >
              <SuggestionMenuController
                getItems={async () =>
                  getDefaultReactSlashMenuItems(editor).filter(
                    (z) => z.group !== "Media"
                  )
                }
                triggerCharacter={"/"}
              />
            </BlockNoteView>
          </div>
        </>
      )}
    </div>
  );
}

export const TextRenderer = React.memo(TextRendererComponent);
