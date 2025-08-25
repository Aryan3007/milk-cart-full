import express from "express";
import {
  getUserByToken,
  loginUser,
  registerUser,
  updateUserAddress,
  getAllUsers,
  verifyEmail,
  resendVerificationCode,
  googleAuth,
  testEmail,
  updateUserProfile,
  changePassword,
  authLimiter,
  verificationLimiter,
  getUserDetails,
  exportUserData,
  adminLogin,
  verifyToken,
} from "../controllers/authController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";

const authRouter = express.Router();

// Public routes (with rate limiting)
authRouter.post("/register", authLimiter, registerUser);
authRouter.post("/login", authLimiter, loginUser);
authRouter.post("/google", authLimiter, googleAuth);

// Email verification routes (with rate limiting)
authRouter.post("/verify-email", verificationLimiter, verifyEmail);
authRouter.post(
  "/resend-verification-code",
  verificationLimiter,
  resendVerificationCode
);
authRouter.post("/admin-login", adminLogin);

// Protected routes (require authentication)
authRouter.get("/verify-token", isAuthenticated, verifyToken);
authRouter.get("/user", isAuthenticated, getUserByToken);
authRouter.get("/getalluser", getAllUsers);
authRouter.get(
  "/user/:userId/details",
  // isAuthenticated,
  getUserDetails
);
authRouter.get(
  "/user/:userId/export",
  // isAuthenticated,
  exportUserData
);
authRouter.put("/profile", isAuthenticated, updateUserProfile);
authRouter.put("/change-password", isAuthenticated, changePassword);
authRouter.put("/user/:userId/address", isAuthenticated, updateUserAddress);
authRouter.post("/user/:userId/address", isAuthenticated, updateUserAddress);

// Development/Testing routes
authRouter.post("/test-email", testEmail);

export default authRouter;
