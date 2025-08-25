import express from "express";
import {
  handlePayment,
  getUnpaidOrders,
  createPaymentSession,
  markPaymentCompleted,
  getPaymentStatus,
  getPaymentHistory,
  getAllPaymentsForAdmin,
  verifyPayment,
  getPaymentDetails,
  getAllSubscriptionPaymentsForAdmin,
} from "../controllers/paymentController.js";
import {
  isAuthenticated,
  isAdminAuthenticated,
} from "../middlewares/authMiddleware.js";

const paymentrouter = express.Router();

// User payment routes
paymentrouter.get("/unpaid", isAuthenticated, getUnpaidOrders);
paymentrouter.post("/create-session", isAuthenticated, createPaymentSession);
paymentrouter.post(
  "/:paymentId/complete",
  isAuthenticated,
  markPaymentCompleted
);
paymentrouter.get("/:paymentId/status", isAuthenticated, getPaymentStatus);
paymentrouter.get("/history", isAuthenticated, getPaymentHistory);

// Admin payment routes
paymentrouter.get("/admin/all", isAdminAuthenticated, getAllPaymentsForAdmin);
paymentrouter.get(
  "/admin/subscription",
  isAdminAuthenticated,
  getAllSubscriptionPaymentsForAdmin
);
paymentrouter.get(
  "/admin/:paymentId/details",
  isAdminAuthenticated,
  getPaymentDetails
);
paymentrouter.post(
  "/admin/:paymentId/verify",
  isAdminAuthenticated,
  verifyPayment
);

// Legacy route for backward compatibility
paymentrouter.post("/", isAuthenticated, handlePayment);

export default paymentrouter;
