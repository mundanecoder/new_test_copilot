// Authentication related API calls

interface User {
  email: string;
  password: string;
  username: string;
  first_name: string;
  last_name: string;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
}

// export const API_URL = " https://cheaply-saving-civet.ngrok-free.app";
// export const API_URL = "http://localhost:8000";
export const API_URL =
  typeof window !== "undefined"
    ? localStorage.getItem("serverUrl") || process.env.NEXT_PUBLIC_API_URL
    : process.env.NEXT_PUBLIC_API_URL;

export const createUser = async (userData: User): Promise<unknown> => {
  try {
    const response = await fetch(`${API_URL}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error("Failed to create user");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const loginUser = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  try {
    const formData = new URLSearchParams();
    formData.append("username", credentials.username);
    formData.append("password", credentials.password);

    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to login");
    }

    const data = await response.json();

    // Store token in localStorage
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("token_type", data.token_type);

    return data;
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
};

export const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("access_token");
  }
  return null;
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

export const logout = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_type");
  }
};

export const handleAuthError = (error: string): void => {
  // Check if the error is a 401 Unauthorized error
  if (error === "401") {
    // Clear any existing auth tokens
    logout();

    // Redirect to login page
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
};
