import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { useHypr, useRightPanel } from "@/contexts";
import { LogProvider } from "@/contexts/log-context";
import {
  ChatHistoryView,
  ChatInput,
  ChatMessagesView,
  ChatSession,
  EmptyChatState,
  FloatingActionButtons,
} from "../components/chat";
import { LogPanel } from "../components/chat/log-panel";

import { useActiveEntity } from "../hooks/useActiveEntity";
import { useChatLogic } from "../hooks/useChatLogic";
import { useChatQueries } from "../hooks/useChatQueries";
import type { Message } from "../types/chat-types";
import { focusInput, formatDate } from "../utils/chat-utils";

function ChatViewContent() {
  const navigate = useNavigate();
  const { isExpanded, chatInputRef } = useRightPanel();
  const { userId } = useHypr();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [hasChatStarted, setHasChatStarted] = useState(false);
  const [currentChatGroupId, setCurrentChatGroupId] = useState<string | null>(
    null
  );
  const [chatHistory, _setChatHistory] = useState<ChatSession[]>([]);

  const prevIsGenerating = useRef(false);

  const { activeEntity, sessionId } = useActiveEntity({
    setMessages,
    setInputValue,
    setShowHistory,
    setHasChatStarted,
  });

  const { chatGroupsQuery, sessionData, getChatGroupId } = useChatQueries({
    sessionId,
    userId,
    currentChatGroupId,
    setCurrentChatGroupId,
    setMessages,
    setHasChatStarted,
    prevIsGenerating,
  });

  const {
    isGenerating,
    handleSubmit,
    handleQuickAction,
    handleApplyMarkdown,
    handleKeyDown,
  } = useChatLogic({
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
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleFocusInput = () => {
    focusInput(chatInputRef);
  };

  const handleNewChat = async () => {
    if (!sessionId || !userId) {
      return;
    }

    setCurrentChatGroupId(null);
    setMessages([]);
    setHasChatStarted(false);
    setInputValue("");
  };

  const handleSelectChatGroup = async (groupId: string) => {
    setCurrentChatGroupId(groupId);
  };

  const handleViewHistory = () => {
    setShowHistory(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleSelectChat = (chatId: string) => {
    setShowHistory(false);
  };

  const handleBackToChat = () => {
    setShowHistory(false);
  };

  const handleNoteBadgeClick = () => {
    if (activeEntity) {
      navigate({
        to: `/app/${activeEntity.type}/$id`,
        params: { id: activeEntity.id },
      });
    }
  };

  useEffect(() => {
    if (isExpanded) {
      const focusTimeout = setTimeout(() => {
        focusInput(chatInputRef);
      }, 200);

      return () => clearTimeout(focusTimeout);
    }
  }, [isExpanded, chatInputRef]);

  if (showHistory) {
    return (
      <ChatHistoryView
        chatHistory={chatHistory}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onBackToChat={handleBackToChat}
        formatDate={formatDate}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden h-full">
      <LogPanel />

      <FloatingActionButtons
        onNewChat={handleNewChat}
        onViewHistory={handleViewHistory}
        chatGroups={chatGroupsQuery.data}
        onSelectChatGroup={handleSelectChatGroup}
      />

      {messages.length === 0 ? (
        <EmptyChatState
          onQuickAction={handleQuickAction}
          onFocusInput={handleFocusInput}
        />
      ) : (
        <ChatMessagesView
          messages={messages}
          sessionTitle={sessionData.data?.title || "Untitled"}
          hasEnhancedNote={!!sessionData.data?.enhancedContent}
          onApplyMarkdown={handleApplyMarkdown}
        />
      )}

      <ChatInput
        inputValue={inputValue}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        autoFocus={true}
        entityId={activeEntity?.id}
        entityType={activeEntity?.type}
        onNoteBadgeClick={handleNoteBadgeClick}
        isGenerating={isGenerating}
      />
    </div>
  );
}

export function ChatView() {
  return (
    <LogProvider>
      <ChatViewContent />
    </LogProvider>
  );
}
