import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react";

interface EnhancedGoogleAuthProps {
  onSuccess?: (user: unknown) => void;
  onError?: (error: string) => void;
  text?: string;
  disabled?: boolean;
  className?: string;
  mode?: "client" | "server"; // client = Google Identity Services, server = backend OAuth
}

interface GoogleCredentialResponse {
  credential: string;
}

const EnhancedGoogleAuth: React.FC<EnhancedGoogleAuthProps> = ({
  onSuccess,
  onError,
  text = "Continue with Google",
  disabled = false,
  className = "",
  mode = "server", // Default to server-side OAuth for better security
}) => {
  const {
    googleLogin,
    isGoogleAuthLoading,
    googleAuthError,
    retryGoogleAuth,
    clearGoogleAuthError,
  } = useAuth();

  const [isGoogleServicesLoaded, setIsGoogleServicesLoaded] = useState(false);
  const [googleServicesError, setGoogleServicesError] = useState<string | null>(
    null,
  );
  const [retryCount, setRetryCount] = useState(0);

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api/v1";

  const setupGoogleAuth = useCallback(() => {
    try {
      if (
        !window.google ||
        !window.google.accounts ||
        !window.google.accounts.id
      ) {
        throw new Error("Google Identity Services not available");
      }

      // Initialize Google OAuth
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        context: "signin",
        itp_support: true,
      });

      console.log("✅ Google OAuth initialized successfully");
    } catch (error) {
      console.error("❌ Error setting up Google auth:", error);
      setGoogleServicesError("Failed to setup Google authentication");
    }
  }, [GOOGLE_CLIENT_ID, handleGoogleCredentialResponse]);

  const initializeGoogleServices = useCallback(async () => {
    try {
      // Check if Google Client ID is configured
      if (!GOOGLE_CLIENT_ID) {
        setGoogleServicesError("Google Client ID not configured");
        return;
      }

      // Check if Google services are already loaded
      if (
        window.google &&
        window.google.accounts &&
        window.google.accounts.id
      ) {
        console.log("✅ Google Identity Services already loaded");
        setIsGoogleServicesLoaded(true);
        setupGoogleAuth();
        return;
      }

      // Wait for Google services to load
      const checkGoogleServices = (attempts = 0) => {
        if (attempts > 30) {
          // Max 15 seconds
          setGoogleServicesError("Google Identity Services failed to load");
          return;
        }

        if (
          window.google &&
          window.google.accounts &&
          window.google.accounts.id
        ) {
          console.log("✅ Google Identity Services loaded");
          setIsGoogleServicesLoaded(true);
          setupGoogleAuth();
        } else {
          setTimeout(() => checkGoogleServices(attempts + 1), 500);
        }
      };

      checkGoogleServices();
    } catch (error) {
      console.error("❌ Error initializing Google services:", error);
      setGoogleServicesError("Failed to initialize Google authentication");
    }
  }, [GOOGLE_CLIENT_ID, setupGoogleAuth]);

  // Initialize Google Identity Services for client-side mode
  useEffect(() => {
    if (mode === "client" && !isGoogleServicesLoaded) {
      initializeGoogleServices();
    }
  }, [mode, isGoogleServicesLoaded, initializeGoogleServices]);

  const handleGoogleCredentialResponse = useCallback(
    async (response: GoogleCredentialResponse) => {
      try {
        if (!response.credential) {
          throw new Error("No credential received from Google");
        }

        // Decode the JWT token to get user info
        const parts = response.credential.split(".");
        if (parts.length !== 3) {
          throw new Error("Invalid JWT token format");
        }

        const payload = JSON.parse(atob(parts[1]));
        console.log("🔐 Decoded Google user data:", payload);

        const googleData = {
          googleId: payload.sub,
          email: payload.email,
          name: payload.name,
          avatar: payload.picture,
        };

        // Validate required fields
        if (!googleData.googleId || !googleData.email || !googleData.name) {
          throw new Error("Incomplete user data from Google");
        }

        const result = await googleLogin(googleData);

        if (result.success && result.user) {
          onSuccess?.(result.user);
        } else {
          onError?.(result.message || "Google authentication failed");
        }
      } catch (error) {
        console.error("❌ Error processing Google credential:", error);
        const message =
          error instanceof Error
            ? error.message
            : "Failed to process Google authentication";
        onError?.(message);
      }
    },
    [onSuccess, onError, googleLogin],
  );

  const handleGoogleLogin = async () => {
    if (disabled || isGoogleAuthLoading) return;

    try {
      clearGoogleAuthError();
      setRetryCount(0);

      if (mode === "server") {
        // Server-side OAuth flow
        console.log("🔗 Redirecting to server-side Google OAuth...");
        window.location.href = `${BACKEND_URL}/google-auth/login`;
      } else {
        // Client-side OAuth flow
        if (!isGoogleServicesLoaded) {
          throw new Error(
            "Google authentication is not ready. Please try again.",
          );
        }

        if (googleServicesError) {
          throw new Error(googleServicesError);
        }

        if (
          !window.google ||
          !window.google.accounts ||
          !window.google.accounts.id
        ) {
          throw new Error("Google Identity Services not available");
        }

        // Trigger Google OAuth popup
        window.google.accounts.id.prompt();
      }
    } catch (error) {
      console.error("❌ Error during Google login:", error);
      const message =
        error instanceof Error ? error.message : "Google login failed";
      onError?.(message);
    }
  };

  const handleRetry = async () => {
    if (retryCount >= 3) {
      onError?.(
        "Maximum retry attempts reached. Please refresh the page and try again.",
      );
      return;
    }

    setRetryCount((prev) => prev + 1);
    console.log(
      `🔄 Retrying Google authentication (attempt ${retryCount + 1}/3)...`,
    );

    if (mode === "server") {
      // For server-side mode, just retry the redirect
      handleGoogleLogin();
    } else {
      // For client-side mode, retry the last failed authentication
      const result = await retryGoogleAuth();
      if (result.success) {
        onSuccess?.(result);
      } else {
        onError?.(result.message || "Retry failed");
      }
    }
  };

  const handleClearError = () => {
    clearGoogleAuthError();
    setGoogleServicesError(null);
    setRetryCount(0);
  };

  // Determine if we should show an error state
  const hasError = googleAuthError || googleServicesError;
  const showRetryButton = hasError && retryCount < 3;

  // Determine if we should show loading state
  const isLoading =
    isGoogleAuthLoading ||
    (mode === "client" && !isGoogleServicesLoaded && !googleServicesError);

  return (
    <div className="w-full space-y-4">
      {/* Main Google Auth Button */}
      <button
        onClick={handleGoogleLogin}
        disabled={disabled || isLoading || Boolean(hasError)}
        className={`
          w-full flex items-center justify-center gap-3 px-4 py-3 
          border border-gray-300 dark:border-gray-600 rounded-lg 
          bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200
          hover:bg-gray-50 dark:hover:bg-gray-700 
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
          transition-colors duration-200
          ${disabled || isLoading || Boolean(hasError) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          ${className}
        `}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
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
        )}
        <span className="text-sm font-medium">
          {isLoading ? "Connecting..." : text}
        </span>
      </button>

      {/* Error State */}
      {hasError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-red-800 dark:text-red-200 font-medium text-sm mb-1">
                Google Authentication Error
              </h3>
              <p className="text-red-700 dark:text-red-300 text-sm">
                {googleAuthError || googleServicesError}
              </p>
              {retryCount > 0 && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                  Retry attempt {retryCount}/3
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            {showRetryButton && (
              <button
                onClick={handleRetry}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-md transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            )}
            <button
              onClick={handleClearError}
              className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Success State (optional) */}
      {/* This could be shown temporarily after successful auth */}
    </div>
  );
};

// Extend window object to include Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: unknown) => void;
          prompt: () => void;
          renderButton: (element: HTMLElement, config: unknown) => void;
        };
      };
    };
  }
}

export default EnhancedGoogleAuth;
