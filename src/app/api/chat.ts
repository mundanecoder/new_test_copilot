import { API_URL, getAuthToken } from "./auth";

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
//     let partialData = "";

//     const processStream = async (): Promise<void> => {
//       const { done, value } = await reader.read();

//       if (done) {
//         return;
//       }

//       const chunk = decoder.decode(value, { stream: true });
//       partialData += chunk;

//       console.log(partialData, "value");

//       const events = partialData.split("\n\n");
//       partialData = events.pop() || "";

//       for (const event of events) {
//         const lines = event.split("\n");
//         let eventData = "";

//         // Aggregate all data lines in the event
//         for (const line of lines) {
//           if (line.startsWith("data:")) {
//             // Append the line's content after 'data:' without trimming spaces
//             eventData += line.substring(5) + "\n"; // Using substring to extract content after 'data:'
//           }
//         }

//         // Trim the final newline added by the loop
//         eventData = eventData.trimEnd();

//         if (!eventData || eventData === "None") continue; // Skip if eventData is empty or "None"

//         try {
//           const jsonData = JSON.parse(eventData);

//           // Handle title_id events (new session created)
//           if (jsonData.title_id) {
//             setSessionId(jsonData.title_id);
//             onDoneCallback(jsonData.title_id);
//             continue;
//           }

//           // Handle chat_id events (existing session updated)
//           if (jsonData.chat_id) {
//             if (sessionId) {
//               onDoneCallback(sessionId);
//             }
//             continue;
//           }

//           // Handle content chunks
//           if (jsonData.content) {
//             if (jsonData.content !== "None") {
//               onMessageCallback(jsonData.content);
//             }
//           } else {
//             // Direct content without wrapper
//             onMessageCallback(eventData);
//           }
//         } catch (e) {
//           // If parsing fails, treat the data as plain text
//           console.log(e, "error");
//           if (eventData !== "None") {
//             onMessageCallback(eventData);
//           }
//         }
//       }

//       await processStream();
//     };

//     await processStream();
//   } catch (error) {
//     console.error("Error sending chat message:", error);
//     throw error;
//   }
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
      body: JSON.stringify({
        question,
        session_id: sessionId || 0,
      }),
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

    const processStream = async (): Promise<void> => {
      const { done, value } = await reader.read();

      if (done) {
        // Process remaining buffer content as final message
        if (buffer.trim()) {
          onMessageCallback(buffer);
        }
        onDoneCallback(sessionId);
        return;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process all complete SSE events (delimited by \n\n)
      while (true) {
        const eventEndIndex = buffer.indexOf("\n\n");
        if (eventEndIndex === -1) break;

        const eventData = buffer.slice(0, eventEndIndex);
        buffer = buffer.slice(eventEndIndex + 2);

        // Handle the complete event
        let content = "";
        for (const line of eventData.split("\n")) {
          if (line.startsWith("data:")) {
            content += line.slice(5).trimStart() + "\n";
          } else if (line.trim() !== "") {
            content += line + "\n";
          }
        }

        if (content !== "") {
          onMessageCallback(content.trimEnd());
        }
      }

      await processStream();
    };

    await processStream();
  } catch (error) {
    console.error("Error sending chat message:", error);
    throw error;
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

export const fetchSessions = async (): Promise<Session[]> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  try {
    const response = await fetch(`${API_URL}/session`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch sessions");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching sessions:", error);
    throw error;
  }
};

export const fetchSessionMessages = async (
  sessionId: number
): Promise<Session> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  try {
    const response = await fetch(`${API_URL}/session/${sessionId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch messages for session ${sessionId}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching session messages:", error);
    throw error;
  }
};
