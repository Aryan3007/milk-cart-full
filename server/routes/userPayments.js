import express from "express";
import {
  getUnpaidOrders,
  createPaymentSession,
  markPaymentCompleted,
  getPaymentStatus,
  getPaymentHistory,
} from "../controllers/paymentController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";

const userPaymentRouter = express.Router();

// Get all unpaid delivered orders for the user
userPaymentRouter.get("/unpaid-orders", isAuthenticated, getUnpaidOrders);

// Create a payment session with QR code for selected orders
userPaymentRouter.post(
  "/create-payment",
  isAuthenticated,
  createPaymentSession
);

// Mark payment as completed after user pays via UPI
userPaymentRouter.post(
  "/:paymentId/mark-completed",
  isAuthenticated,
  markPaymentCompleted
);

// Get payment status by payment ID
userPaymentRouter.get("/:paymentId", isAuthenticated, getPaymentStatus);

// Get user's payment history
userPaymentRouter.get("/", isAuthenticated, getPaymentHistory);

export default userPaymentRouter;
