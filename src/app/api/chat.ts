import { API_URL, getAuthToken } from "./auth";
import axios from "axios";

export interface ChatMessage {
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

export interface ChatSession {
  id: number;
  email: string;
  created_at: string;
}

// Get session ID from localStorage or null if not found
export const getSessionId = (): number | null => {
  if (typeof window !== "undefined") {
    const sessionId = localStorage.getItem("chat_session_id");
    return sessionId ? parseInt(sessionId, 10) : null;
  }
  return null;
};

// Store session ID in localStorage
export const setSessionId = (id: number): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("chat_session_id", id.toString());
  }
};

// Clear session ID from localStorage
export const clearSessionId = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("chat_session_id");
  }
};

// export const sendChatMessage = async (
//   question: string,
//   sessionId: number,
//   onMessageCallback: (content: string) => void,
//   onDoneCallback: (sessionId: number) => void
// ): Promise<void> => {
//   const token = getAuthToken();
//   if (!token) {
//     throw new Error("Not authenticated");
//   }

//   try {
//     const response = await fetch(`${API_URL}/chat/sse`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//       body: JSON.stringify({
//         question,
//         session_id: sessionId || 0,
//       }),
//     });

//     if (!response.ok) {
//       throw new Error("Failed to send message");
//     }

//     const reader = response.body?.getReader();
//     if (!reader) {
//       throw new Error("Response body is not readable");
//     }

//     const decoder = new TextDecoder();
//     let buffer = "";

//     const removeNoneEdges = (text: string): string => {
//       let trimmed = text.trim();
//       if (trimmed.startsWith("None")) {
//         trimmed = trimmed.substring(4).trim();
//       }
//       if (trimmed.endsWith("None")) {
//         trimmed = trimmed.substring(0, trimmed.length - 4).trim();
//       }
//       return trimmed;
//     };

//     const processStream = async (): Promise<void> => {
//       const { done, value } = await reader.read();

//       if (done) {
//         if (buffer.trim()) {
//           const finalContent = removeNoneEdges(buffer);
//           if (finalContent) {
//             onMessageCallback(finalContent);
//           }
//         }
//         onDoneCallback(sessionId);
//         return;
//       }

//       buffer += decoder.decode(value, { stream: true });

//       while (true) {
//         const eventEndIndex = buffer.indexOf("\n\n");
//         if (eventEndIndex === -1) break;

//         const eventData = buffer.slice(0, eventEndIndex);
//         buffer = buffer.slice(eventEndIndex + 2);

//         let content = "";
//         for (const line of eventData.split("\n")) {
//           if (line.startsWith("data:")) {
//             content += line.slice(5).trimStart() + "\n";
//           } else if (line.trim() !== "") {
//             content += line + "\n";
//           }
//         }

//         const filteredContent = removeNoneEdges(content);
//         if (filteredContent !== "") {
//           onMessageCallback(filteredContent);
//         }
//       }

//       const formatMarkdown = (text: string): string => {
//         // Replace instances where markdown headers are concatenated without proper spacing
//         return text
//           .replace(/(\#{1,6}\s[^\n]+)(\#{1,6}\s)/g, "$1\n\n$2")
//           .replace(/(\#{1,6}\s[^\n]+)(\-\s)/g, "$1\n\n$2")
//           .replace(/(\*\*[^\n]+\*\*)(\#{1,6}\s)/g, "$1\n\n$2")
//           .replace(/(\*\*[^\n]+\*\*)(\-\s)/g, "$1\n\n$2")
//           .replace(/(\*\*[^\n]+\*\*)(\⭐|\📝|\⚠️)/g, "$1\n\n$2")
//           .replace(/(\.)(\⭐|\📝|\⚠️)/g, "$1\n\n$2")
//           .replace(/(\#{3})([^\n])/g, "$1\n\n$2") // Add newlines around ### headers
//           .replace(/([^\n])(\#{3})/g, "$1\n\n$2") // Add newlines before ### headers
//           .replace(/(\#{2})([^\s\n])/g, "\n$1$2") // Add newline before ## if not followed by space or newline
//           .replace(/(\#{3})([^\s\n])/g, "\n$1$2") // Add newline before ### if not followed by space or newline
//           .replace(/(\#{4})([^\s\n])/g, "\n$1$2"); // Add newline before #### if not followed by space or newline
//       };

//       // Apply the formatting fix to the content before sending it to the callback
//       const processFormattedContent = (content: string): string => {
//         return formatMarkdown(content);
//       };

//       // Update the onMessageCallback to use the formatted content
//       const enhancedCallback = (content: string) => {
//         onMessageCallback(processFormattedContent(content));
//       };

//       // Use the enhanced callback in the stream processing

//       await processStream();
//     };

//     await processStream();
//   } catch (error) {
//     console.error("Error sending chat message:", error);
//     throw error;
//   }
//   // Fix the markdown formatting by ensuring proper line breaks between sections
// };

export const sendChatMessage = async (
  question: string,
  sessionId: number,
  onMessageCallback: (content: string) => void,
  onDoneCallback: (sessionId: number) => void
): Promise<void> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  try {
    const response = await fetch(`${API_URL}/chat/sse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ question, session_id: sessionId || 0 }),
    });

    if (!response.ok) {
      throw new Error("Failed to send message");
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    // Remove "None" if it's standalone, not inside text
    const removeNoneEdges = (text: string): string => {
      return text.replace(/(^None\s*|\s*None$)/g, "").trim();
    };

    // Ensure markdown headers are correctly formatted
    const formatMarkdown = (text: string): string => {
      return text
        .replace(/(\#{1,6}\s[^\n]+)(\n\#{1,6}\s)/g, "$1\n\n$2") // Ensure two newlines before headers
        .replace(/(\#{1,6}\s[^\n]+)(\n\#{1,6}\s)/g, "$1\n\n$2") // Ensure two newlines before headers
        .replace(/([^\n])(\#{3}\s)/g, "$1\n\n\n$3") // Add two new lines before level 3 headers (###)
        .replace(/([^\n])(\#{4}\s)/g, "$1\n\n\n$4") // Add two new lines before level 4 headers (####)
        .replace(/([^\n])(\#{2}\s)/g, "$1\n\n\n$2") // Add two new lines before level 2 headers (##)

        .replace(/([^\n])(\#{1,6}\s)/g, "$1\n\n$2") // Ensure headers start after a blank line
        .replace(/(\n{2,})/g, "\n\n") // Normalize excessive newlines
        .trim();
    };

    const processStream = async (): Promise<void> => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete messages
        let eventEndIndex;
        while ((eventEndIndex = buffer.indexOf("\n\n")) !== -1) {
          const eventData = buffer.slice(0, eventEndIndex);
          buffer = buffer.slice(eventEndIndex + 2);

          let content = "";
          for (const line of eventData.split("\n")) {
            if (line.startsWith("data:")) {
              content += line.slice(5).trimStart() + "\n";
            } else if (line.trim() !== "") {
              content += line + "\n";
            }
          }

          const cleanedContent = removeNoneEdges(content);
          const formattedContent = formatMarkdown(cleanedContent);

          if (formattedContent) {
            onMessageCallback(formattedContent);
          }
        }
      }

      // Send remaining buffer if any
      if (buffer.trim()) {
        const finalContent = formatMarkdown(removeNoneEdges(buffer));
        if (finalContent) {
          onMessageCallback(finalContent);
        }
      }

      onDoneCallback(sessionId);
    };

    await processStream();
  } catch (error) {
    console.error("Error in sendChatMessage:", error);
    onDoneCallback(sessionId);
  }
};

export interface Session {
  id: number;
  title: string;
}

export interface SessionMessage {
  id: number;
  user_message: string;
  ai_message: string;
}

// export const fetchSessions = async (): Promise<Session[]> => {
//   const token = getAuthToken();
//   if (!token) {
//     throw new Error("Not authenticated");
//   }

//   try {
//     const response = await fetch(`${API_URL}/session`, {
//       method: "GET",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//     });

//     if (!response.ok) {
//       throw new Error("Failed to fetch sessions");
//     }

//     return await response.json();
//   } catch (error) {
//     console.error("Error fetching sessions:", error);
//     throw error;
//   }
// };

export const fetchSessions = async (): Promise<Session[]> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  try {
    const response = await axios.get(`${API_URL}/session`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching sessions:", error);
    throw error;
  }
};

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

// export const fetchSessionMessages = async (
//   sessionId: number
// ): Promise<Session> => {
//   const token = getAuthToken();
//   if (!token) {
//     throw new Error("Not authenticated");
//   }

//   try {
//     const response = await fetch(`${API_URL}/session/${sessionId}`, {
//       method: "GET",
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json",
//       },
//     });

//     if (!response.ok) {
//       throw new Error(`Failed to fetch messages for session ${sessionId}`);
//     }

//     return await response.json();
//   } catch (error) {
//     console.error("Error fetching session messages:", error);
//     throw error;
//   }
// };
