import express from "express";
import {
  // Admin Subscription Plan Management
  getAllSubscriptionPlans,
  getSubscriptionPlan,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,

  // User Subscription Operations
  getAvailableSubscriptions,
  createUserSubscription,
  getUserSubscriptions,
  getUserSubscription,
  pauseUserSubscription,
  resumeUserSubscription,
  cancelUserSubscription,
  skipDelivery,

  // Payment Operations
  createPaymentSession,
  markSubscriptionPaymentCompleted,
  getSubscriptionPaymentStatus,

  // Admin User Subscription Management
  getAllUserSubscriptions,
  getDeliveriesDueToday,
  markDeliveryCompleted,
  getSubscriptionAnalytics,
  updatePaymentStatus,
  verifySubscriptionPayment,
  getAllRefundRequests,
  getRefundRequestById,
  updateRefundRequestStatus,
  getRefundAnalytics,
  getPendingApprovalSubscriptions,
  getPendingPaymentsForVerification,
} from "../controllers/SubscriptionController.js";
import {
  isAuthenticated,
  isAdminAuthenticated,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// Get available subscription plans for users (public)
router.get("/plans", getAvailableSubscriptions);

// Create new subscription (purchase)
router.post("/subscribe", isAuthenticated, createUserSubscription);

// Get user's subscriptions
router.get("/my-subscriptions", isAuthenticated, getUserSubscriptions);

// Get specific user subscription
router.get(
  "/my-subscriptions/:subscriptionId",
  isAuthenticated,
  getUserSubscription
);

// Pause subscription
router.patch(
  "/my-subscriptions/:subscriptionId/pause",
  isAuthenticated,
  pauseUserSubscription
);

// Resume subscription
router.patch(
  "/my-subscriptions/:subscriptionId/resume",
  isAuthenticated,
  resumeUserSubscription
);

// Cancel subscription
router.patch(
  "/my-subscriptions/:subscriptionId/cancel",
  isAuthenticated,
  cancelUserSubscription
);

// Skip delivery
router.patch(
  "/my-subscriptions/:subscriptionId/skip-delivery",
  isAuthenticated,
  skipDelivery
);

// Payment routes for subscriptions
router.post("/create-payment-session", isAuthenticated, createPaymentSession);
router.post(
  "/mark-payment-completed/:paymentId",
  isAuthenticated,
  markSubscriptionPaymentCompleted
);
router.get(
  "/payment-status/:paymentId",
  isAuthenticated,
  getSubscriptionPaymentStatus
);

// ==============================================================
// ADMIN ROUTES (Admin Authentication Required)
// ==============================================================

// Admin Subscription Plan Management
router.get("/admin/plans", isAdminAuthenticated, getAllSubscriptionPlans);
router.get("/admin/plans/:id", isAdminAuthenticated, getSubscriptionPlan);
router.post("/admin/plans", isAdminAuthenticated, createSubscriptionPlan);
router.put("/admin/plans/:id", isAdminAuthenticated, updateSubscriptionPlan);
router.delete("/admin/plans/:id", isAdminAuthenticated, deleteSubscriptionPlan);

// Admin User Subscription Management
router.get("/admin/user-subscriptions", isAdminAuthenticated, getAllUserSubscriptions);
router.get("/admin/deliveries/today", isAdminAuthenticated, getDeliveriesDueToday);
router.patch(
  "/admin/user-subscriptions/:subscriptionId/complete-delivery",
  isAdminAuthenticated,
  markDeliveryCompleted
);
router.patch(
  "/admin/user-subscriptions/:subscriptionId/payment-status",
  isAdminAuthenticated,
  updatePaymentStatus
);

// Admin Analytics
router.get("/admin/analytics", isAdminAuthenticated, getSubscriptionAnalytics);

// Admin Payment Verification
router.post("/admin/verify-payment/:paymentId", isAdminAuthenticated, verifySubscriptionPayment);
router.get("/admin/payments/pending", isAdminAuthenticated, getPendingPaymentsForVerification);

// Admin Refund Request Management
router.get("/admin/refunds", isAdminAuthenticated, getAllRefundRequests);
router.get("/admin/refunds/:id", isAdminAuthenticated, getRefundRequestById);
router.patch("/admin/refunds/:id/status", isAdminAuthenticated, updateRefundRequestStatus);
router.get("/admin/refunds/analytics", isAdminAuthenticated, getRefundAnalytics);

// Only accessible by admin
router.get(
  "/pending-approval",
  isAdminAuthenticated, // ensure only admin can access
  getPendingApprovalSubscriptions
);

export default router;
