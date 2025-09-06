import express from "express";
import {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getAllOrdersForAdmin,
  updateOrderStatus,
  getDeliveryShiftAvailability,
  assignOrderToDeliveryBoy,
  getAvailableDeliveryBoys,
  getAssignedOrders,
  markOrderAsDelivered,
  getDeliveryBoyOrderHistory,
  assignUserToDeliveryBoy,
  getUserAssignments,
  removeUserAssignment,
  getUnassignedUsers,
  reassignUserToDeliveryBoy,
  getUserReassignmentHistory,
  getDeliveryBoyOrdersForSequencing,
  updateDeliverySequence,
  getDeliveryBoyUserAssignments,
  updateUserAssignmentSequence,
  transferAllUsersToAnotherDeliveryBoy,
  getDeliverySlots,
} from "../controllers/orderController.js";
import {
  isAuthenticated,
  isAdmin,
  isAdminAuthenticated,
  isDeliveryBoyAuthenticated,
} from "../middlewares/authMiddleware.js";

const orderRouter = express.Router();

// Admin routes (require admin privileges) - must come before parameterized routes
orderRouter.get("/admin/all", isAdminAuthenticated, getAllOrdersForAdmin); // Get all orders for admin
orderRouter.patch("/admin/:orderId", isAdminAuthenticated, updateOrderStatus); // Update order status (admin)
orderRouter.post(
  "/admin/:orderId/assign",
  isAdminAuthenticated,
  assignOrderToDeliveryBoy,
); // Assign order to delivery boy
orderRouter.get(
  "/admin/delivery-boy",
  isAdminAuthenticated,
  getAvailableDeliveryBoys,
); // Get available delivery boys
// Get all orders assigned to a delivery boy (for sequencing)
orderRouter.get(
  "/admin/delivery-boy/:deliveryBoyId/orders-for-sequencing",
  isAdminAuthenticated,
  getDeliveryBoyOrdersForSequencing,
);
// Update delivery sequence for a delivery boy
orderRouter.post(
  "/admin/delivery-boy/:deliveryBoyId/update-sequence",
  isAdminAuthenticated,
  updateDeliverySequence,
);

// Get all users assigned to a delivery boy (for user sequencing)
orderRouter.get(
  "/admin/delivery-boy/:deliveryBoyId/user-assignments",
  isAdminAuthenticated,
  getDeliveryBoyUserAssignments,
);
// Update user sequence for a delivery boy
orderRouter.post(
  "/admin/delivery-boy/:deliveryBoyId/update-user-sequence",
  isAdminAuthenticated,
  updateUserAssignmentSequence,
);

// Bulk transfer users route (admin only)
orderRouter.post(
  "/admin/bulk-transfer-users",
  isAdminAuthenticated,
  transferAllUsersToAnotherDeliveryBoy,
);

// User assignment routes (admin only)
orderRouter.post(
  "/admin/user-assignment",
  isAdminAuthenticated,
  assignUserToDeliveryBoy,
); // Assign user to delivery boy
orderRouter.get(
  "/admin/user-assignments",
  isAdminAuthenticated,
  getUserAssignments,
); // Get all user assignments
orderRouter.delete(
  "/admin/user-assignment/:assignmentId",
  isAdminAuthenticated,
  removeUserAssignment,
); // Remove user assignment
orderRouter.get(
  "/admin/unassigned-users",
  isAdminAuthenticated,
  getUnassignedUsers,
); // Get unassigned users

// User reassignment routes (admin only)
orderRouter.post(
  "/admin/user-reassignment",
  isAdminAuthenticated,
  reassignUserToDeliveryBoy,
); // Reassign user to different delivery boy
orderRouter.get(
  "/admin/user-reassignment-history/:userId",
  isAdminAuthenticated,
  getUserReassignmentHistory,
); // Get user reassignment history

// Public routes
orderRouter.get("/delivery-availability", getDeliveryShiftAvailability); // Check delivery shift availability
orderRouter.get("/available-slots", getDeliverySlots); // Get available delivery slots with dates

// User routes (require authentication)
orderRouter.post("/", isAuthenticated, createOrder); // Create an order
orderRouter.get("/", isAuthenticated, getUserOrders); // Get user orders
orderRouter.get("/:orderId", isAuthenticated, getOrderById); // Get specific order by ID
orderRouter.delete("/:orderId", isAuthenticated, cancelOrder); // Cancel an order (with time-based validation)

// Delivery Boy routes (require delivery boy authentication)
orderRouter.get(
  "/delivery-boy/assigned",
  isDeliveryBoyAuthenticated,
  getAssignedOrders,
); // Get assigned orders for delivery boy
orderRouter.patch(
  "/delivery-boy/:orderId/delivered",
  isDeliveryBoyAuthenticated,
  markOrderAsDelivered,
); // Mark order as delivered
orderRouter.get(
  "/delivery-boy/history",
  isDeliveryBoyAuthenticated,
  getDeliveryBoyOrderHistory,
); // Get delivery boy order history

export default orderRouter;
