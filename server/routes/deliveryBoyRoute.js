import express from "express";
import {
  registerDeliveryBoy,
  loginDeliveryBoy,
  getDeliveryBoyProfile,
  updateDeliveryBoyProfile,
  changeDeliveryBoyPassword,
  getAllDeliveryBoys,
  approveDeliveryBoy,
  rejectDeliveryBoy,
  suspendDeliveryBoy,
  deliveryBoyAuthLimiter,
  deliveryBoyLoginLimiter,
  deliveryBoyRegisterLimiter,
} from "../controllers/deliveryBoyController.js";
import {
  isDeliveryBoyAuthenticated,
  isAuthenticated,
  isAdmin,
  isAdminAuthenticated,
} from "../middlewares/authMiddleware.js";

const deliveryBoyRouter = express.Router();

// Public routes (with separate rate limiting)
deliveryBoyRouter.post(
  "/register",
  deliveryBoyRegisterLimiter,
  registerDeliveryBoy,
);
deliveryBoyRouter.post("/login", deliveryBoyLoginLimiter, loginDeliveryBoy);

// Protected routes for delivery boys (require delivery boy authentication)
deliveryBoyRouter.get(
  "/profile",
  isDeliveryBoyAuthenticated,
  getDeliveryBoyProfile,
);
deliveryBoyRouter.put(
  "/profile",
  isDeliveryBoyAuthenticated,
  updateDeliveryBoyProfile,
);
deliveryBoyRouter.put(
  "/change-password",
  isDeliveryBoyAuthenticated,
  changeDeliveryBoyPassword,
);

// Admin routes (require admin authentication)
deliveryBoyRouter.get("/", isAdminAuthenticated, getAllDeliveryBoys);
deliveryBoyRouter.put(
  "/:deliveryBoyId/approve",
  isAdminAuthenticated,
  approveDeliveryBoy,
);
deliveryBoyRouter.put(
  "/:deliveryBoyId/reject",
  isAdminAuthenticated,
  rejectDeliveryBoy,
);
deliveryBoyRouter.put(
  "/:deliveryBoyId/suspend",
  isAdminAuthenticated,
  suspendDeliveryBoy,
);

export default deliveryBoyRouter;
