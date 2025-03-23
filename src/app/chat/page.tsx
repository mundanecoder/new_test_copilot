"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import CustomMarkdown from "../component/CustomMarkdown";

// Define the ChatMessage type locally to fix type errors
interface ChatMessage {
  content: string;
  role: "user" | "assistant";
  created_at: string;
  id: number;
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isLoggedIn, loading: authLoading } = useAuth();
  const {
    messages,
    startNewChat,
    isLoading,
    sessionId,
    sessions,
    fetchUserSessions,
    loadSessionMessages,
    setMessages,
    setSessionId,
    setIsLoading,
    sendChatMessage,
  } = useChat();
  const router = useRouter();

  // Fetch sessions when component mounts
  useEffect(() => {
    fetchUserSessions();
  }, [fetchUserSessions]);

  // Adjust textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Scroll to bottom of chat messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [authLoading, isLoggedIn, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Use the local handleSendMessage instead of the context's sendMessage
    handleSendMessage(input);
    setInput("");
  };

  // Handle Ctrl+Enter to submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    // Handle Enter key to submit
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Copy message content to clipboard
  const copyToClipboard = (content: string) => {
    navigator.clipboard
      .writeText(content)
      .then(() => {
        console.log("Content copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy content: ", err);
      });
  };

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

      // Add user message
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
    [
      isLoading,
      fetchUserSessions,
      setMessages,
      setIsLoading,
      setSessionId,
      sendChatMessage,
      sessionId,
    ]
  );

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="flex text-black h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Chat Sessions</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Display all sessions */}
          {sessions && sessions.length > 0 ? (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-2 rounded cursor-pointer hover:bg-gray-700 ${
                    sessionId === session.id ? "bg-gray-700" : ""
                  }`}
                  onClick={() => {
                    loadSessionMessages(session.id);
                  }}
                >
                  <div className="text-sm font-medium">
                    Session {session.id}
                  </div>

                  {session.title && (
                    <div className="text-xs text-gray-300 mt-1 truncate">
                      {session.title}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400 flex flex-col items-center justify-center h-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 mb-2 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-center">
                {sessionId
                  ? `Current Session: ${sessionId}`
                  : "No chat sessions yet"}
              </p>
              <p className="text-center text-xs mt-1 text-gray-500">
                Start a new chat to begin
              </p>
            </div>
          )}
        </div>

        <div className="p-4">
          <button
            onClick={() => {
              // Clear messages in the UI
              setMessages([]);
              // Set session ID to 0 for new chat
              setSessionId(0);
              // Also call startNewChat for any other logic it might contain
              startNewChat();
            }}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-medium"
          >
            New Chat
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col w-8/12">
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-full max-w-[80vw] items-center justify-center text-gray-500">
              <p>Start a new conversation</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "ml-auto" : "mr-auto"
                } max-w-[75%]`}
              >
                <div
                  className={`
                  p-3 rounded-lg w-full overflow-hidden relative
                  ${
                    message.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-800 border border-gray-200"
                  }
                `}
                >
                  {message.role === "user" ? (
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  ) : (
                    <div className="prose dark:prose-invert max-w-none overflow-auto">
                      <CustomMarkdown
                        content={message.content}
                        className="bg-white"
                      />
                    </div>
                  )}
                  <div className="text-xs opacity-70 text-right mt-1 flex justify-between items-center">
                    <button
                      onClick={() => copyToClipboard(message.content)}
                      className={`p-1 rounded hover:bg-opacity-20 ${
                        message.role === "user"
                          ? "hover:bg-indigo-400 text-white"
                          : "hover:bg-gray-200 text-gray-600"
                      }`}
                      title="Copy to clipboard"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                        />
                      </svg>
                    </button>
                    <span>{sessionId}</span>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-gray-300 p-4 bg-white">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (Press Enter to send)"
                disabled={isLoading}
                rows={1}
                className="w-full py-2 px-4 border text-black border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none overflow-hidden"
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {isLoading ? "" : "Press Enter to send"}
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="py-2 px-6 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 self-end"
            >
              {isLoading ? (
                <span className="flex text-black items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                "Send"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
