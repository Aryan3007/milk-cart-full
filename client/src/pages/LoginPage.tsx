import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import EnhancedGoogleAuth from "../components/EnhancedGoogleAuth";

const LoginPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, setAuthenticatedUser } = useAuth();

  // Enhanced OAuth callback handling
  useEffect(() => {
    const handleOAuthCallback = () => {
      const oauthSuccess = searchParams.get("success");
      const token = searchParams.get("token");
      const userString = searchParams.get("user");
      const oauthError = searchParams.get("error");

      if (oauthSuccess === "true" && token && userString) {
        try {
          const user = JSON.parse(decodeURIComponent(userString));
          const decodedToken = decodeURIComponent(token);

          // Update authentication state using AuthContext
          setAuthenticatedUser(user, decodedToken);

          setSuccess("Google login successful! Redirecting...");
          setError(""); // Clear any previous errors

          // Clear URL parameters and redirect
          window.history.replaceState({}, "", "/login");

          setTimeout(() => {
            navigate("/");
          }, 1500);
        } catch (err) {
          console.error("Error parsing OAuth response:", err);
          setError("Authentication data error. Please try again.");
          setSuccess("");
        }
      } else if (oauthError) {
        console.error("OAuth error:", oauthError);
        let errorMessage = "Google authentication failed.";

        // Enhanced error message mapping
        switch (oauthError) {
          case "oauth_error":
            errorMessage =
              "Google authentication was cancelled or failed. Please try again.";
            break;
          case "no_code":
            errorMessage =
              "No authorization code received from Google. Please try again.";
            break;
          case "config_error":
            errorMessage =
              "Google OAuth configuration error. Please contact support.";
            break;
          case "token_error":
            errorMessage =
              "Failed to exchange authorization code for tokens. Please try again.";
            break;
          case "userinfo_error":
            errorMessage =
              "Failed to retrieve user information from Google. Please try again.";
            break;
          case "callback_error":
            errorMessage = "OAuth callback processing error. Please try again.";
            break;
          case "redirect_uri_mismatch":
            errorMessage =
              "Google OAuth configuration error. Please contact support.";
            break;
          default:
            errorMessage = `Google authentication failed: ${oauthError}`;
        }

        setError(errorMessage);
        setSuccess("");

        // Clear URL parameters
        window.history.replaceState({}, "", "/login");
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, setAuthenticatedUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear errors when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.email) {
      setError("Email is required");
      return;
    }

    if (!formData.password) {
      setError("Password is required");
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        if (result.requiresVerification) {
          navigate(
            `/verify-email?email=${encodeURIComponent(
              formData.email,
            )}&type=login`,
          );
        } else {
          setSuccess("Login successful! Redirecting...");
          setTimeout(() => {
            navigate("/");
          }, 1000);
        }
      } else {
        setError(result.message || "Login failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = (user: unknown) => {
    console.log("✅ Google authentication successful:", user);
    setSuccess("Google login successful! Redirecting...");
    setError("");
    setTimeout(() => {
      navigate("/");
    }, 1000);
  };

  const handleGoogleError = (error: string) => {
    console.error("❌ Google authentication failed:", error);
    setError(error);
    setSuccess("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br pt-24 from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to your account
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <p className="text-green-700 dark:text-green-400 text-sm">
                  {success}
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <p className="text-red-700 dark:text-red-400 text-sm">
                  {error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || success !== ""}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          {/* Enhanced Google Login */}
          <div className="mt-6">
            <EnhancedGoogleAuth
              text="Sign in with Google"
              mode="server"
              disabled={isLoading || success !== ""}
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
            />
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Don't have an account?{" "}
              <button
                onClick={() => navigate("/signup")}
                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-semibold"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center space-x-6">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Secure Login
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
              Fast Delivery
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
              Fresh Products
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
