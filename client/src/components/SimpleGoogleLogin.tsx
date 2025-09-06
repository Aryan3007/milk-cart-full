import React, { useState } from "react";
import { useAuth0Context } from "../contexts/Auth0Context";
import { useAuth } from "../contexts/AuthContext";

interface SimpleGoogleLoginProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  text?: string;
  disabled?: boolean;
}

const SimpleGoogleLogin: React.FC<SimpleGoogleLoginProps> = ({
  onSuccess,
  onError,
  text = "Continue with Google",
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithGoogle, isAuth0Loading } =
    useAuth0Context();
  const { googleLogin } = useAuth();

  const handleGoogleLogin = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

    try {
      // Check if Auth0 is configured and use it
      const isAuth0Configured =
        import.meta.env.VITE_AUTH0_DOMAIN &&
        import.meta.env.VITE_AUTH0_CLIENT_ID &&
        import.meta.env.VITE_AUTH0_DOMAIN !== "your-auth0-domain.auth0.com" &&
        import.meta.env.VITE_AUTH0_CLIENT_ID !== "your-auth0-client-id";

      if (isAuth0Configured) {
        // Use Auth0 for Google authentication
        await loginWithGoogle();
        onSuccess?.();
      } else {
        // Fallback to mock Google authentication for development
        console.log(
          "🔧 Using fallback Google authentication (Auth0 not configured)",
        );

        // Mock Google user data for development
        const mockGoogleData = {
          googleId: `google_${Date.now()}`,
          email: "demo@gmail.com",
          name: "Demo User",
          avatar: "https://via.placeholder.com/150",
        };

        const result = await googleLogin(mockGoogleData);

        if (result.success) {
          onSuccess?.();
        } else {
          onError?.(result.message || "Google login failed");
        }
      }
    } catch (error) {
      console.error("Google login error:", error);
      onError?.(error instanceof Error ? error.message : "Google login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={disabled || isLoading || isAuth0Loading}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
    >
      {isLoading || isAuth0Loading ? (
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      <span className="text-sm font-medium">
        {isLoading || isAuth0Loading ? "Signing in..." : text}
      </span>
    </button>
  );
};

export default SimpleGoogleLogin;
