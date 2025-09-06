import React, { createContext, useContext, useReducer, useEffect } from "react";
import { AuthState, User } from "../types";
import ApiService from "../services/api";
import { successToastHandler, errorToastHandler } from "../utils/toastUtils";

interface AuthContextType extends AuthState {
  // Email authentication methods
  signup: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{
    success: boolean;
    message?: string;
    requiresVerification?: boolean;
  }>;
  login: (
    email: string,
    password: string,
  ) => Promise<{
    success: boolean;
    message?: string;
    requiresVerification?: boolean;
  }>;
  verifyEmail: (
    email: string,
    code: string,
  ) => Promise<{ success: boolean; message?: string }>;
  resendCode: (
    email: string,
  ) => Promise<{ success: boolean; message?: string }>;

  // Google authentication
  googleLogin: (googleData: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  }) => Promise<{ success: boolean; message?: string; user?: User }>;

  // Enhanced Google auth methods
  retryGoogleAuth: () => Promise<{ success: boolean; message?: string }>;
  clearGoogleAuthError: () => void;
  isGoogleAuthLoading: boolean;
  googleAuthError: string | null;

  // Profile management
  updateProfile: (
    name: string,
    phone?: string,
  ) => Promise<{ success: boolean; message?: string }>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ success: boolean; message?: string }>;

  // Auth state management
  setAuthenticatedUser: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: "LOGIN"; payload: { user: User; token: string } }
  | { type: "LOGOUT" }
  | { type: "UPDATE_USER"; payload: User }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_GOOGLE_AUTH_LOADING"; payload: boolean }
  | { type: "SET_GOOGLE_AUTH_ERROR"; payload: string | null }
  | { type: "CLEAR_GOOGLE_AUTH_ERROR" };

const authReducer = (
  state: AuthState & {
    isGoogleAuthLoading: boolean;
    googleAuthError: string | null;
  },
  action: AuthAction,
): AuthState & {
  isGoogleAuthLoading: boolean;
  googleAuthError: string | null;
} => {
  switch (action.type) {
    case "LOGIN":
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        isLoading: false,
        isGoogleAuthLoading: false,
        googleAuthError: null,
      };
    case "LOGOUT":
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        isLoading: false,
        isGoogleAuthLoading: false,
        googleAuthError: null,
      };
    case "UPDATE_USER":
      return {
        ...state,
        user: action.payload,
      };
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };
    case "SET_GOOGLE_AUTH_LOADING":
      return {
        ...state,
        isGoogleAuthLoading: action.payload,
      };
    case "SET_GOOGLE_AUTH_ERROR":
      return {
        ...state,
        googleAuthError: action.payload,
        isGoogleAuthLoading: false,
      };
    case "CLEAR_GOOGLE_AUTH_ERROR":
      return {
        ...state,
        googleAuthError: null,
      };
    default:
      return state;
  }
};

const initialState: AuthState & {
  isGoogleAuthLoading: boolean;
  googleAuthError: string | null;
} = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  isGoogleAuthLoading: false,
  googleAuthError: null,
};

// Store the last failed Google auth data for retry
let lastFailedGoogleData: {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
} | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Check for stored user and token on app load
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("authToken");

    if (storedUser && storedToken) {
      try {
        const user = JSON.parse(storedUser);
        ApiService.setAuthToken(storedToken);
        dispatch({ type: "LOGIN", payload: { user, token: storedToken } });
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("authToken");
      }
    }

    // Listen for storage changes (from other tabs or external updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user" || e.key === "authToken") {
        const currentUser = localStorage.getItem("user");
        const currentToken = localStorage.getItem("authToken");

        if (currentUser && currentToken) {
          try {
            const user = JSON.parse(currentUser);
            ApiService.setAuthToken(currentToken);
            dispatch({ type: "LOGIN", payload: { user, token: currentToken } });
          } catch {
            localStorage.removeItem("user");
            localStorage.removeItem("authToken");
            dispatch({ type: "LOGOUT" });
          }
        } else {
          // If either user or token is removed, logout
          ApiService.removeAuthToken();
          dispatch({ type: "LOGOUT" });
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Email authentication methods
  const signup = async (name: string, email: string, password: string) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const result = await ApiService.emailSignup(name, email, password);
      dispatch({ type: "SET_LOADING", payload: false });
      successToastHandler(
        "Registration successful! Please check your email for verification.",
      );
      return {
        success: result.success,
        message: result.message,
        requiresVerification: result.data?.requiresVerification || false,
      };
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      errorToastHandler("Registration failed. Please try again.");
      return {
        success: false,
        message: error instanceof Error ? error.message : "An error occurred",
      };
    }
  };

  const login = async (email: string, password: string) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const result = await ApiService.emailLogin(email, password);

      // If login successful and user is authenticated, update state
      if (result.success && result.data?.token && result.data?.user) {
        const { user, token } = result.data;
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("authToken", token);
        ApiService.setAuthToken(token);
        dispatch({ type: "LOGIN", payload: { user, token } });
        successToastHandler("Successfully logged in! 🎉");
      }

      dispatch({ type: "SET_LOADING", payload: false });
      return {
        success: result.success,
        message: result.message,
        requiresVerification: result.data?.requiresVerification || false,
      };
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      errorToastHandler("Login failed. Please check your credentials.");
      return {
        success: false,
        message: error instanceof Error ? error.message : "An error occurred",
      };
    }
  };

  const verifyEmail = async (email: string, code: string) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const result = await ApiService.verifyEmail(email, code);

      if (result.success && result.data?.user && result.data?.token) {
        const { user, token } = result.data;
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("authToken", token);
        ApiService.setAuthToken(token);
        dispatch({ type: "LOGIN", payload: { user, token } });
      }

      dispatch({ type: "SET_LOADING", payload: false });
      return { success: result.success, message: result.message };
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      return {
        success: false,
        message: error instanceof Error ? error.message : "An error occurred",
      };
    }
  };

  const resendCode = async (email: string) => {
    try {
      const result = await ApiService.resendVerificationCode(email);
      successToastHandler("Verification code resent. Please check your email.");
      return { success: true, message: result.message };
    } catch (error) {
      errorToastHandler("Failed to resend verification code.");
      return {
        success: false,
        message: error instanceof Error ? error.message : "An error occurred",
      };
    }
  };

  // Enhanced Google authentication
  const googleLogin = async (googleData: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  }) => {
    try {
      dispatch({ type: "SET_GOOGLE_AUTH_LOADING", payload: true });
      dispatch({ type: "CLEAR_GOOGLE_AUTH_ERROR" });

      // Validate Google data
      if (!googleData.googleId || !googleData.email || !googleData.name) {
        throw new Error("Incomplete Google authentication data received");
      }

      console.log("🔐 Starting Google authentication for:", googleData.email);

      // Store data for potential retry
      lastFailedGoogleData = googleData;

      const result = await ApiService.googleAuth(googleData);

      if (result.success && result.data?.user && result.data?.token) {
        const { user, token } = result.data;
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("authToken", token);
        ApiService.setAuthToken(token);
        dispatch({ type: "LOGIN", payload: { user, token } });

        // Clear retry data on success
        lastFailedGoogleData = null;

        console.log("✅ Google authentication successful for:", user.email);
        return {
          success: true,
          message: "Google authentication successful",
          user,
        };
      } else {
        throw new Error(result.message || "Google authentication failed");
      }
    } catch (error) {
      console.error("❌ Google authentication error:", error);

      let errorMessage = "Google authentication failed";

      if (error instanceof Error) {
        // Handle specific error types
        if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorMessage =
            "Network error. Please check your connection and try again.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "Request timed out. Please try again.";
        } else if (error.message.includes("server")) {
          errorMessage = "Server error. Please try again in a moment.";
        } else if (error.message.includes("email already exists")) {
          errorMessage =
            "This email is already registered with a different authentication method.";
        } else {
          errorMessage = error.message;
        }
      }

      dispatch({ type: "SET_GOOGLE_AUTH_ERROR", payload: errorMessage });
      return { success: false, message: errorMessage };
    }
  };

  // Retry Google authentication
  const retryGoogleAuth = async () => {
    if (!lastFailedGoogleData) {
      return {
        success: false,
        message: "No previous Google authentication data to retry",
      };
    }

    console.log("🔄 Retrying Google authentication...");
    return googleLogin(lastFailedGoogleData);
  };

  // Clear Google auth error
  const clearGoogleAuthError = () => {
    dispatch({ type: "CLEAR_GOOGLE_AUTH_ERROR" });
  };

  // Auth state management methods
  const setAuthenticatedUser = (user: User, token: string) => {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("authToken", token);
    ApiService.setAuthToken(token);
    dispatch({ type: "LOGIN", payload: { user, token } });
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    localStorage.removeItem("cart");
    ApiService.removeAuthToken();
    lastFailedGoogleData = null; // Clear retry data
    dispatch({ type: "LOGOUT" });
    successToastHandler("Successfully logged out");
  };

  const updateUser = (user: User) => {
    localStorage.setItem("user", JSON.stringify(user));
    dispatch({ type: "UPDATE_USER", payload: user });
  };

  // Profile management methods
  const updateProfile = async (name: string, phone?: string) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const result = await ApiService.updateProfile(name, phone);

      if (result.success && result.data?.user) {
        updateUser(result.data.user);
      }

      dispatch({ type: "SET_LOADING", payload: false });
      return { success: result.success, message: result.message };
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      return {
        success: false,
        message: error instanceof Error ? error.message : "An error occurred",
      };
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
  ) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const result = await ApiService.changePassword(
        currentPassword,
        newPassword,
      );
      dispatch({ type: "SET_LOADING", payload: false });
      return { success: result.success, message: result.message };
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      return {
        success: false,
        message: error instanceof Error ? error.message : "An error occurred",
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signup,
        login,
        verifyEmail,
        resendCode,
        googleLogin,
        retryGoogleAuth,
        clearGoogleAuthError,
        isGoogleAuthLoading: state.isGoogleAuthLoading,
        googleAuthError: state.googleAuthError,
        updateProfile,
        changePassword,
        setAuthenticatedUser,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
