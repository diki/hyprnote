import { message } from "@tauri-apps/plugin-dialog";
import { useState } from "react";

import { useLog } from "@/contexts/log-context";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as connectorCommands } from "@hypr/plugin-connector";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as templateCommands } from "@hypr/plugin-template";
import { modelProvider, streamText } from "@hypr/utils/ai";
import { useSessions } from "@hypr/utils/contexts";

import type { ActiveEntityInfo, Message } from "../types/chat-types";
import { parseMarkdownBlocks } from "../utils/markdown-parser";
import { useLicense } from "@/hooks/use-license";

interface UseChatLogicProps {
  sessionId: string | null;
  userId: string | null;
  activeEntity: ActiveEntityInfo | null;
  messages: Message[];
  inputValue: string;
  hasChatStarted: boolean;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  setInputValue: (value: string) => void;
  setHasChatStarted: (started: boolean) => void;
  getChatGroupId: () => Promise<string>;
  sessionData: any;
  chatInputRef: React.RefObject<HTMLTextAreaElement>;
}

export function useChatLogic({
  sessionId,
  userId,
  activeEntity,
  messages,
  inputValue,
  hasChatStarted,
  setMessages,
  setInputValue,
  setHasChatStarted,
  getChatGroupId,
  sessionData,
  chatInputRef,
}: UseChatLogicProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const sessions = useSessions((state) => state.sessions);
  const { addLog } = useLog();
  const { getLicense } = useLicense();

  const handleApplyMarkdown = async (markdownContent: string) => {
    if (!sessionId) {
      console.error("No session ID available");
      return;
    }

    const sessionStore = sessions[sessionId];
    if (!sessionStore) {
      console.error("Session not found in store");
      return;
    }

    try {
      const html = await miscCommands.opinionatedMdToHtml(markdownContent);

      sessionStore.getState().updateEnhancedNote(html);

      console.log("Applied markdown content to enhanced note");
    } catch (error) {
      console.error("Failed to apply markdown content:", error);
    }
  };

  const prepareMessageHistory = async (
    messages: Message[],
    currentUserMessage?: string
  ) => {
    const refetchResult = await sessionData.refetch();
    let freshSessionData = refetchResult.data;

    const { type } = await connectorCommands.getLlmConnection();

    const participants = sessionId
      ? await dbCommands.sessionListParticipants(sessionId)
      : [];

    const calendarEvent = sessionId
      ? await dbCommands.sessionGetEvent(sessionId)
      : null;

    const currentDateTime = new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const eventInfo = calendarEvent
      ? `${calendarEvent.name} (${calendarEvent.start_date} - ${
          calendarEvent.end_date
        })${calendarEvent.note ? ` - ${calendarEvent.note}` : ""}`
      : "";

    const systemContent = await templateCommands.render("ai_chat.system", {
      session: freshSessionData,
      words: JSON.stringify(freshSessionData?.words || []),
      title: freshSessionData?.title,
      enhancedContent: freshSessionData?.enhancedContent,
      rawContent: freshSessionData?.rawContent,
      preMeetingContent: freshSessionData?.preMeetingContent,
      type: type,
      date: currentDateTime,
      participants: participants,
      event: eventInfo,
    });

    console.log("systemContent", systemContent);

    const conversationHistory: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [{ role: "system" as const, content: systemContent }];

    messages.forEach((message) => {
      conversationHistory.push({
        role: message.isUser ? ("user" as const) : ("assistant" as const),
        content: message.content,
      });
    });

    if (currentUserMessage) {
      conversationHistory.push({
        role: "user" as const,
        content: currentUserMessage,
      });
    }

    return conversationHistory;
  };

  const processUserMessage = async (
    content: string,
    analyticsEvent: string
  ) => {
    addLog("info", "processUserMessage called", { content, analyticsEvent });

    if (!content.trim() || isGenerating) {
      return;
    }

    if (messages.length >= 4 && !getLicense.data?.valid) {
      if (userId) {
        try {
          await analyticsCommands.event({
            event: "pro_license_required_chat",
            distinct_id: userId,
          });
          addLog("info", "License required analytics event sent");
        } catch (analyticsError) {
          addLog(
            "warn",
            "License required analytics event failed (non-blocking)",
            {
              error:
                analyticsError instanceof Error
                  ? analyticsError.message
                  : String(analyticsError),
            }
          );
          // Don't throw - analytics failure shouldn't break license check
        }
      }
      await message("2 messages are allowed per conversation for free users.", {
        title: "Pro License Required",
        kind: "info",
      });

      addLog("warn", "processUserMessage early return - license required", {
        messagesLength: messages.length,
        licenseValid: getLicense.data?.valid,
      });
      return;
    }

    try {
      addLog("info", "Starting analytics event");
      if (userId) {
        try {
          await analyticsCommands.event({
            event: analyticsEvent,
            distinct_id: userId,
          });
          addLog("info", "Analytics event sent successfully");
        } catch (analyticsError) {
          addLog("warn", "Analytics event failed (non-blocking)", {
            error:
              analyticsError instanceof Error
                ? analyticsError.message
                : String(analyticsError),
          });
          // Don't throw - analytics failure shouldn't break chat functionality
        }
      }

      if (!hasChatStarted && activeEntity) {
        addLog("info", "Setting chat as started");
        setHasChatStarted(true);
      }

      addLog("info", "Setting isGenerating to true");
      setIsGenerating(true);

      addLog("info", "Getting chat group ID");
      const groupId = await getChatGroupId();
      addLog("info", "Got chat group ID", { groupId });

      const userMessage: Message = {
        id: Date.now().toString(),
        content: content,
        isUser: true,
        timestamp: new Date(),
      };

      addLog("info", "Adding user message to state");
      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");

      addLog("info", "Saving user message to database");
      await dbCommands.upsertChatMessage({
        id: userMessage.id,
        group_id: groupId,
        created_at: userMessage.timestamp.toISOString(),
        role: "User",
        content: userMessage.content.trim(),
      });
      addLog("info", "User message saved to database");

      try {
        addLog("info", "Getting model provider");
        const provider = await modelProvider();
        addLog("info", "Got model provider", { provider: typeof provider });

        const model = provider.languageModel("defaultModel");
        addLog("info", "Got language model", { model: typeof model });

        const aiMessageId = (Date.now() + 1).toString();
        const aiMessage: Message = {
          id: aiMessageId,
          content: "Generating...",
          isUser: false,
          timestamp: new Date(),
        };

        addLog("info", "Adding AI placeholder message");
        setMessages((prev) => [...prev, aiMessage]);

        addLog("info", "Preparing message history");
        const messageHistory = await prepareMessageHistory(messages, content);
        addLog("info", "Message history prepared", {
          historyLength: messageHistory.length,
        });

        addLog("info", "Starting text stream");
        const { textStream } = streamText({
          model,
          messages: messageHistory,
        });
        addLog("info", "Text stream created");

        let aiResponse = "";
        let chunkCount = 0;

        for await (const chunk of textStream) {
          chunkCount++;
          aiResponse += chunk;

          if (chunkCount % 10 === 0) {
            addLog("info", `Received ${chunkCount} chunks`, {
              responseLength: aiResponse.length,
            });
          }

          const parts = parseMarkdownBlocks(aiResponse);

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? {
                    ...msg,
                    content: aiResponse,
                    parts: parts,
                  }
                : msg
            )
          );
        }

        addLog("info", "Text stream completed", {
          totalChunks: chunkCount,
          finalResponseLength: aiResponse.length,
        });

        addLog("info", "Saving AI response to database");
        await dbCommands.upsertChatMessage({
          id: aiMessageId,
          group_id: groupId,
          created_at: new Date().toISOString(),
          role: "Assistant",
          content: aiResponse.trim(),
        });
        addLog("info", "AI response saved to database");

        addLog("info", "Setting isGenerating to false");
        setIsGenerating(false);
      } catch (error) {
        addLog("error", "AI processing error", {
          error: error instanceof Error ? error.message : String(error),
        });
        console.error("AI error:", error);

        setIsGenerating(false);

        const errorMessageId = (Date.now() + 1).toString();
        const aiMessage: Message = {
          id: errorMessageId,
          content: "Sorry, I encountered an error. Please try again.",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);

        await dbCommands.upsertChatMessage({
          id: errorMessageId,
          group_id: groupId,
          created_at: new Date().toISOString(),
          role: "Assistant",
          content: "Sorry, I encountered an error. Please try again.",
        });
      }
    } catch (error) {
      addLog("error", "processUserMessage outer error", {
        error: error instanceof Error ? error.message : String(error),
      });
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    addLog("info", "handleSubmit called", { inputValue });
    try {
      await processUserMessage(inputValue, "chat_message_sent");
      addLog("info", "handleSubmit completed successfully");
    } catch (error) {
      addLog("error", "handleSubmit error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleQuickAction = async (prompt: string) => {
    addLog("info", "handleQuickAction called", { prompt });
    try {
      await processUserMessage(prompt, "chat_quickaction_sent");

      if (chatInputRef.current) {
        chatInputRef.current.focus();
        addLog("info", "Chat input focused after quick action");
      }
      addLog("info", "handleQuickAction completed successfully");
    } catch (error) {
      addLog("error", "handleQuickAction error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      addLog("info", "Enter key pressed, preventing default and submitting");
      e.preventDefault();
      handleSubmit();
    }
  };

  return {
    isGenerating,
    handleSubmit,
    handleQuickAction,
    handleApplyMarkdown,
    handleKeyDown,
  };
}
