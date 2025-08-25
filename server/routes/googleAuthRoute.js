import express from "express";
import {
  initiateGoogleAuth,
  handleGoogleCallback,
  googleAuth,
  getUserProfile,
  updateUserProfile,
} from "../controllers/googleAuthController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Test route to verify Google auth setup
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Google authentication endpoints are working",
    endpoints: {
      initiateAuth: "GET /api/v1/google-auth/login",
      handleCallback: "GET /api/v1/google-auth/callback",
      googleAuth: "POST /api/v1/google-auth/google (legacy)",
      getUserProfile: "GET /api/v1/google-auth/profile (requires auth)",
      updateUserProfile: "PUT /api/v1/google-auth/profile (requires auth)",
    },
    timestamp: new Date().toISOString(),
  });
});

// Server-side OAuth routes
router.get("/login", initiateGoogleAuth);
router.get("/callback", handleGoogleCallback);

// Legacy client-side route (for compatibility)
router.post("/google", googleAuth);

// Protected routes (require authentication)
router.get("/profile", isAuthenticated, getUserProfile);
router.put("/profile", isAuthenticated, updateUserProfile);

export default router;
