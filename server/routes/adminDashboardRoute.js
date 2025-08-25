import express from "express";
import {
  getDashboardMetrics,
  getReportSummary,
} from "../controllers/adminDashboardController.js";
import { isAdminAuthenticated } from "../middlewares/authMiddleware.js";

const adminDashboardRouter = express.Router();

// Get dashboard metrics for admin
adminDashboardRouter.get(
  "/dashboard",
  isAdminAuthenticated,
  getDashboardMetrics
);
adminDashboardRouter.get(
  "/report-summary",
  isAdminAuthenticated,
  getReportSummary
);

export default adminDashboardRouter;
