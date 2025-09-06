import React, { createContext, useContext, useEffect } from "react";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { useAuth } from "./AuthContext";

interface Auth0WrapperProps {
  children: React.ReactNode;
}

interface Auth0ContextType {
  loginWithGoogle: () => Promise<void>;
  isAuth0Loading: boolean;
  isAuth0Authenticated: boolean;
  auth0User: any;
  logout: () => void;
}

const Auth0Context = createContext<Auth0ContextType | undefined>(undefined);

// Auth0 configuration
const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN || "your-auth0-domain.auth0.com",
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || "your-auth0-client-id",
  authorizationParams: {
    redirect_uri: window.location.origin,
    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
  },
};

// Auth0 Integration Component
const Auth0Integration: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { loginWithRedirect, logout, isAuthenticated, user, isLoading } =
    useAuth0();
  const { googleLogin } = useAuth();

  // Handle Auth0 callback and integrate with our auth system
  useEffect(() => {
    const handleAuth0Callback = async () => {
      if (isAuthenticated && user && !isLoading) {
        try {
          // Extract user data from Auth0
          const googleData = {
            googleId: user.sub || "",
            email: user.email || "",
            name: user.name || user.nickname || "",
            avatar: user.picture || "",
          };

          // Authenticate with our backend using Auth0 user data
          const result = await googleLogin(googleData);

          if (result.success) {
            console.log(
              "✅ Auth0 user successfully integrated with our auth system",
            );
          } else {
            console.error("❌ Failed to integrate Auth0 user:", result.message);
          }
        } catch (error) {
          console.error("❌ Error during Auth0 integration:", error);
        }
      }
    };

    handleAuth0Callback();
  }, [isAuthenticated, user, isLoading, googleLogin]);

  const loginWithGoogle = async () => {
    try {
      await loginWithRedirect({
        authorizationParams: {
          connection: "google-oauth2",
        },
      });
    } catch (error) {
      console.error("Auth0 Google login failed:", error);
    }
  };

  const contextValue: Auth0ContextType = {
    loginWithGoogle,
    isAuth0Loading: isLoading,
    isAuth0Authenticated: isAuthenticated,
    auth0User: user,
    logout: () =>
      logout({ logoutParams: { returnTo: window.location.origin } }),
  };

  return (
    <Auth0Context.Provider value={contextValue}>
      {children}
    </Auth0Context.Provider>
  );
};

// Auth0 Wrapper Component
export const Auth0Wrapper: React.FC<Auth0WrapperProps> = ({ children }) => {
  // Check if Auth0 is properly configured
  const isAuth0Configured =
    auth0Config.domain !== "your-auth0-domain.auth0.com" &&
    auth0Config.clientId !== "your-auth0-client-id";

  if (!isAuth0Configured) {
    console.warn("⚠️ Auth0 not configured. Using fallback authentication.");
    console.warn("📝 To enable Auth0:");
    console.warn("   1. Set VITE_AUTH0_DOMAIN in your .env file");
    console.warn("   2. Set VITE_AUTH0_CLIENT_ID in your .env file");
    console.warn("   3. Optionally set VITE_AUTH0_AUDIENCE for API access");

    // Return children without Auth0 provider if not configured
    return <>{children}</>;
  }

  return (
    <Auth0Provider {...auth0Config}>
      <Auth0Integration>{children}</Auth0Integration>
    </Auth0Provider>
  );
};

// Hook to use Auth0 context
export const useAuth0Context = () => {
  const context = useContext(Auth0Context);
  if (!context) {
    // Return a fallback object if Auth0 is not configured
    return {
      loginWithGoogle: async () => {
        console.warn(
          "Auth0 not configured. Please configure Auth0 or use alternative authentication.",
        );
      },
      isAuth0Loading: false,
      isAuth0Authenticated: false,
      auth0User: null,
      logout: () => {},
    };
  }
  return context;
};
