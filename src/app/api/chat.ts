import { API_URL, getAuthToken, handleAuthError } from "./auth";
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
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ question, session_id: sessionId || 0 }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleAuthError("401");
        return;
      }
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("ReadableStream is not supported in this environment.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let isFirstChunk = true;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      // Process the chunk to remove "None" at the start and metadata at the end
      let processedChunk = chunk;

      if (isFirstChunk && processedChunk.startsWith("None")) {
        processedChunk = processedChunk.replace(/^None\s*/, "");
      }

      // Remove the metadata pattern at the end if present
      processedChunk = processedChunk.replace(
        /None\{'title_id': \d+, 'title': '.*?'\}$/,
        ""
      );

      if (processedChunk) {
        onMessageCallback(processedChunk);
      }

      isFirstChunk = false;
    }

    // Call the done callback when streaming is complete
    onDoneCallback(sessionId);
  } catch (error) {
    console.error("Error in sendChatMessage:", error);
    handleAuthError("401");
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
  console.log("token", token);
  if (!token) {
    throw new Error("Not authenticated");
  }

  try {
    const response = await axios.get(`${API_URL}/session/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching sessions:", error);
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      handleAuthError("401");
      return [];
    }
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
      if (response.status === 401) {
        handleAuthError("401");
        throw new Error("Authentication error");
      }
      throw new Error(`Failed to fetch messages for session ${sessionId}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching messages for session ${sessionId}:`, error);
    if (error instanceof Response && error.status === 401) {
      handleAuthError("401");
    }
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
