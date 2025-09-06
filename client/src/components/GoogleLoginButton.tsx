import React, { useEffect, useState, useCallback } from "react";
import { ApiService } from "../services/api";

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleLoginResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    isVerified: boolean;
    authProvider: string;
    createdAt: string;
    lastLogin: string;
  };
  token?: string;
}

interface GoogleLoginButtonProps {
  onSuccess: (response: GoogleLoginResponse) => void;
  onError: (error: Error) => void;
  text?: string;
  disabled?: boolean;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  onError,
  text = "Continue with Google",
  disabled = false,
}) => {
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleCredentialResponse = useCallback(
    async (response: GoogleCredentialResponse) => {
      try {
        console.log("🔐 Google credential received, processing...");
        const result = await ApiService.googleJWTAuth(response.credential);

        if (result.success) {
          console.log("✅ Google authentication successful");
          onSuccess(result);
        } else {
          console.error("❌ Google authentication failed:", result.message);
          onError(new Error(result.message || "Google authentication failed"));
        }
      } catch (error) {
        console.error("❌ Error during Google authentication:", error);
        onError(
          error instanceof Error
            ? error
            : new Error("Google authentication failed"),
        );
      }
    },
    [onSuccess, onError],
  );

  const initializeGoogleAuth = useCallback(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(window as any).google?.accounts?.id) {
        console.warn("Google Identity Services not fully loaded, retrying...");
        setTimeout(() => {
          initializeGoogleAuth();
        }, 1000);
        return;
      }

      console.log("Initializing Google Auth with Client ID:", GOOGLE_CLIENT_ID);

      const initConfig = {
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        context: "signin",
        itp_support: true,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).google.accounts.id.initialize(initConfig);
      console.log("✅ Google Auth initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing Google Auth:", error);
      setLoadError("Failed to initialize Google authentication");
    }
  }, [GOOGLE_CLIENT_ID, handleCredentialResponse]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setIsLoading(false);
      setLoadError("Google Client ID not configured");
      return;
    }

    const checkGoogleServices = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).google?.accounts?.id) {
        console.log("✅ Google services loaded successfully");
        setIsLoading(false);
        setIsGoogleLoaded(true);
        initializeGoogleAuth();
      } else {
        console.log("⏳ Waiting for Google services to load...");
        setTimeout(checkGoogleServices, 500);
      }
    };

    checkGoogleServices();

    const timeout = setTimeout(() => {
      if (!isGoogleLoaded) {
        setIsLoading(false);
        setLoadError("Google services failed to load");
      }
    }, 10000);

    return () => {
      clearTimeout(timeout);
    };
  }, [GOOGLE_CLIENT_ID, isGoogleLoaded, initializeGoogleAuth]);

  const handleClick = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).google?.accounts?.id) {
      onError(new Error("Google services not available"));
      return;
    }

    try {
      console.log("🔐 Triggering Google sign-in...");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).google.accounts.id.prompt();
    } catch (error) {
      console.error("❌ Error triggering Google sign-in:", error);
      onError(
        error instanceof Error
          ? error
          : new Error("Failed to trigger Google sign-in"),
      );
    }
  };

  if (loadError) {
    return (
      <div className="text-red-600 text-sm p-2 border border-red-300 rounded bg-red-50">
        {loadError}
      </div>
    );
  }

  if (isLoading) {
    return (
      <button
        disabled
        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-100 cursor-not-allowed"
      >
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
        Loading Google...
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || !isGoogleLoaded}
      className={`w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
        disabled || !isGoogleLoaded ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      <span className="text-sm font-medium">{text}</span>
    </button>
  );
};

export default GoogleLoginButton;
