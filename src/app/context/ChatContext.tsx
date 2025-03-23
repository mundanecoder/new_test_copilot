"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { API_URL, getAuthToken, isAuthenticated } from "../api/auth";
import { fetchSessions, sendChatMessage } from "../api/chat";

interface ChatMessage {
  id: number;
  content: string;
  created_at: string;
  role: "user" | "assistant";
}

interface Session {
  id: number;
  title: string;
}

interface SessionMessage {
  id: number;
  user_message: string;
  ai_message: string;
}

interface ChatContextType {
  messages: ChatMessage[];
  sessionId: number | null;
  sessions: Session[];
  sendMessage: (content: string) => Promise<void>;
  startNewChat: () => void;
  isLoading: boolean;
  fetchUserSessions: () => Promise<void>;
  loadSessionMessages: (id: number) => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setSessionId: React.Dispatch<React.SetStateAction<number | null>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  sendChatMessage: typeof sendChatMessage;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    console.log("context is undefined");
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);

  const fetchUserSessions = useCallback(async () => {
    try {
      const sessionsData = await fetchSessions();
      setSessions(sessionsData);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated()) {
      fetchUserSessions();
    }
  }, [fetchUserSessions]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      setIsLoading(true);

      // Immediately add the user message to the chat
      const userMessage: ChatMessage = {
        content,
        role: "user",
        created_at: new Date().toISOString(),
        id: Date.now(), // Temporary ID until response comes back
      };

      // Add user message to the state
      setMessages((prev) => [...prev, userMessage]);

      try {
        // Create an initial empty assistant message
        const assistantMessage: ChatMessage = {
          content: "",
          role: "assistant",
          created_at: new Date().toISOString(),
          id: Date.now() + 1, // Temporary ID
        };

        // Add the empty assistant message that will be updated as streaming comes in
        setMessages((prev) => [...prev, assistantMessage]);

        // Make the API call to get the assistant's response
        await sendChatMessage(
          content,
          sessionId || 0,
          // This callback updates the assistant message with each chunk
          (chunk) => {
            // Use a functional update to get the latest state
            setMessages((prevMessages) => {
              // Create a copy of the previous messages
              const updated = [...prevMessages];
              // The assistant message is the last one in the array
              const assistantMessageIndex = updated.length - 1;

              // Make sure the index is valid and points to an assistant message
              if (
                assistantMessageIndex >= 0 &&
                updated[assistantMessageIndex] &&
                updated[assistantMessageIndex].role === "assistant"
              ) {
                // Update the assistant message by appending the chunk
                updated[assistantMessageIndex] = {
                  ...updated[assistantMessageIndex],
                  content: updated[assistantMessageIndex].content + chunk,
                };
              }

              return updated;
            });
          },
          // This callback updates the session ID when the response is complete
          (newSessionId) => {
            setSessionId(newSessionId);
            fetchUserSessions();
          }
        );
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, sessionId]
  );

  const handleStartNewChat = () => {
    // Implementation for starting a new chat
    fetchUserSessions();
    setMessages([]);
    setSessionId(null);
  };

  const loadSessionMessages = useCallback(async (id: number) => {
    try {
      setIsLoading(true);
      const sessionMessages = await fetchSessionMessages(id);

      // Transform the API response into the format expected by the chat UI
      const formattedMessages: ChatMessage[] = [];

      sessionMessages.forEach((msg: SessionMessage) => {
        // Add user message
        formattedMessages.push({
          content: msg.user_message,
          role: "user",
          id: msg.id || Date.now(),
          created_at: new Date().toISOString(),
        });
        // Add AI message
        formattedMessages.push({
          content: msg.ai_message,
          role: "assistant",
          id: msg.id || Date.now(),
          created_at: new Date().toISOString(),
        });
      });

      setMessages(formattedMessages);
      setSessionId(id);
    } catch (error) {
      console.error(`Error loading messages for session ${id}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        sessionId,
        sessions,
        sendMessage: handleSendMessage,
        startNewChat: handleStartNewChat,
        isLoading,
        fetchUserSessions,
        loadSessionMessages,
        setMessages,
        setSessionId,
        setIsLoading,
        sendChatMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

// Function to fetch messages for a specific session
export const fetchSessionMessages = async (
  sessionId: number
): Promise<SessionMessage[]> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  try {
    const response = await fetch(`${API_URL}/session/${sessionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch messages for session ${sessionId}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching messages for session ${sessionId}:`, error);
    throw error;
  }
};
