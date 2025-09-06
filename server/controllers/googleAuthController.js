import User from "../models/User.js";
import jwt from "jsonwebtoken";

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "default-secret", {
    expiresIn: "7d",
  });
};

// Server-side Google OAuth initiation
export const initiateGoogleAuth = async (req, res) => {
  try {
    const googleClientId =
      process.env.VITE_GOOGLE_CLIENT_ID ||
      "300864766309-rs0l6g3vgshqkjgmkosrc1rstsfqlg80.apps.googleusercontent.com";

    // More robust redirect URI construction
    let redirectUri;
    if (process.env.NODE_ENV === "production") {
      // For production, use environment variable or construct from domain
      redirectUri =
        process.env.GOOGLE_REDIRECT_URI ||
        `https://api.legendsmilkcart.in/api/v1/google-auth/callback`;
    } else {
      // For development, use dynamic construction
      redirectUri = `${req.protocol}://${req.get(
        "host",
      )}/api/v1/google-auth/callback`;
    }

    // Debug logging
    console.log("🔍 Debug - Request details:");
    console.log("  Protocol:", req.protocol);
    console.log("  Host:", req.get("host"));
    console.log("  Original URL:", req.originalUrl);
    console.log("  Constructed redirect URI:", redirectUri);
    console.log("  NODE_ENV:", process.env.NODE_ENV);

    const scope = encodeURIComponent("openid email profile");
    const responseType = "code";
    const state = Date.now().toString(); // Simple state for CSRF protection

    // Store state in session or memory (for production, use proper session storage)
    req.session = req.session || {};
    req.session.oauthState = state;

    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${googleClientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${scope}&` +
      `response_type=${responseType}&` +
      `state=${state}&` +
      `access_type=offline&` +
      `prompt=consent`;

    console.log("🔗 Redirecting to Google OAuth:", googleAuthUrl);

    res.redirect(googleAuthUrl);
  } catch (error) {
    console.error("❌ Error initiating Google OAuth:", error);
    res.status(500).json({
      success: false,
      message: "Failed to initiate Google authentication",
    });
  }
};

// Server-side Google OAuth callback handler
export const handleGoogleCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error("❌ Google OAuth error:", error);
      return res.redirect(
        `${
          process.env.FRONTEND_URL || "http://localhost:5173"
        }/login?error=oauth_error`,
      );
    }

    if (!code) {
      console.error("❌ No authorization code received");
      return res.redirect(
        `${
          process.env.FRONTEND_URL || "http://localhost:5173"
        }/login?error=no_code`,
      );
    }

    console.log("✅ Received Google OAuth callback with code");

    // Exchange code for tokens
    const googleClientId =
      process.env.VITE_GOOGLE_CLIENT_ID ||
      "300864766309-rs0l6g3vgshqkjgmkosrc1rstsfqlg80.apps.googleusercontent.com";
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET; // You'll need this

    // Use same redirect URI logic as initiation
    let redirectUri;
    if (process.env.NODE_ENV === "production") {
      redirectUri =
        process.env.GOOGLE_REDIRECT_URI ||
        `https://api.legendsmilkcart.in/api/v1/google-auth/callback`;
    } else {
      redirectUri = `${req.protocol}://${req.get(
        "host",
      )}/api/v1/google-auth/callback`;
    }

    console.log("🔍 Callback - Using redirect URI:", redirectUri);

    if (!googleClientSecret) {
      console.error("❌ Google Client Secret not configured");
      return res.redirect(
        `${
          process.env.FRONTEND_URL || "http://localhost:5173"
        }/login?error=config_error`,
      );
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("❌ Token exchange failed:", tokenData);
      return res.redirect(
        `${
          process.env.FRONTEND_URL || "http://localhost:5173"
        }/login?error=token_error`,
      );
    }

    console.log("✅ Successfully exchanged code for tokens");

    // Get user info from Google
    const userResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      },
    );

    const googleUser = await userResponse.json();

    if (!userResponse.ok) {
      console.error("❌ Failed to get user info:", googleUser);
      return res.redirect(
        `${
          process.env.FRONTEND_URL || "http://localhost:5173"
        }/login?error=userinfo_error`,
      );
    }

    console.log("✅ Retrieved Google user info:", {
      id: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
    });

    // Save or update user in database
    const userData = await processGoogleUser({
      googleId: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      avatar: googleUser.picture,
    });

    // Generate JWT token
    const jwtToken = generateToken(userData.id);

    // Redirect to frontend with success
    const frontendUrl =
      `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?` +
      `success=true&` +
      `token=${encodeURIComponent(jwtToken)}&` +
      `user=${encodeURIComponent(JSON.stringify(userData))}`;

    res.redirect(frontendUrl);
  } catch (error) {
    console.error("❌ Google OAuth callback error:", error);
    res.redirect(
      `${
        process.env.FRONTEND_URL || "http://localhost:5173"
      }/login?error=callback_error`,
    );
  }
};

// Helper function to process Google user
const processGoogleUser = async (googleData) => {
  const { googleId, email, name, avatar } = googleData;

  // Check if user exists
  let user = await User.findOne({
    $or: [{ googleId: googleId }, { email: email }],
  });

  if (user) {
    console.log("👤 Existing user found:", user.email);

    // Update user info if needed
    let updated = false;
    if (user.googleId !== googleId) {
      user.googleId = googleId;
      updated = true;
    }
    if (user.authProvider !== "google") {
      user.authProvider = "google";
      updated = true;
    }
    if (user.name !== name) {
      user.name = name;
      updated = true;
    }
    if (avatar && user.avatar !== avatar) {
      user.avatar = avatar;
      updated = true;
    }
    if (!user.isVerified) {
      user.isVerified = true;
      updated = true;
    }

    if (updated) {
      await user.save();
      console.log("✅ User info updated");
    }

    // Update last login
    await user.updateLastLogin();
  } else {
    console.log("🆕 Creating new user for:", email);

    user = new User({
      name,
      email,
      googleId,
      avatar,
      authProvider: "google",
      isVerified: true,
      role: "user",
      isActive: true,
      lastLogin: new Date(),
    });

    await user.save();
    console.log("✅ New user created successfully");
  }

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    isVerified: user.isVerified,
    authProvider: user.authProvider,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
  };
};

// Google OAuth login/register (keep existing endpoint for compatibility)
export const googleAuth = async (req, res) => {
  try {
    const { googleId, email, name, avatar } = req.body;

    // Validate required fields
    if (!googleId || !email || !name) {
      return res.status(400).json({
        success: false,
        message: "Missing required Google authentication data",
      });
    }

    console.log("🔐 Google Auth Request:", {
      googleId,
      email,
      name,
      avatar: avatar ? "provided" : "not provided",
    });

    const userData = await processGoogleUser({ googleId, email, name, avatar });
    const token = generateToken(userData.id);

    console.log("🎉 Google authentication successful for:", userData.email);

    res.status(200).json({
      success: true,
      message: "Google authentication successful",
      user: userData,
      token,
    });
  } catch (error) {
    console.error("❌ Google authentication error:", error);

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email already exists with different authentication method",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error during Google authentication",
    });
  }
};

// Get user profile (protected route)
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        isVerified: user.isVerified,
        authProvider: user.authProvider,
        phone: user.phone,
        addresses: user.addresses,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("❌ Get user profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
    });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update allowed fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;

    await user.save();

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      isVerified: user.isVerified,
      authProvider: user.authProvider,
      phone: user.phone,
      addresses: user.addresses,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("❌ Update user profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};
