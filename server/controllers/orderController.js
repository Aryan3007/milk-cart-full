import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Cart from "../models/cart.js";
import DeliveryBoy from "../models/DeliveryBoy.js";
import UserDeliveryAssignment from "../models/UserDeliveryAssignment.js";
import { validateDeliverySlot, getAvailableDeliverySlots, getDateLabel, getDeliveryTimeSlot } from "../utils/deliveryScheduling.js";

// Create a new order
export const createOrder = async (req, res) => {
  try {
    const {
      items,
      products, // Support both 'items' and 'products' field names
      shippingAddress,
      deliveryShift,
      deliveryDate, // New field for dated delivery
      paymentMethod = "cod", // Default to cash on delivery
      customerNotes,
      tax = 0,
      discount = 0,
    } = req.body;

    // Set delivery charges to ₹50 per order
    const deliveryCharges = 50;

    // Support both 'items' and 'products' field names
    const orderItems = items || products;

    // Validate required fields
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Order items/products are required and must be a non-empty array",
      });
    }

    // Validate delivery date is provided
    if (!deliveryDate) {
      return res.status(400).json({
        success: false,
        message: "Delivery date is required",
      });
    }

    // Handle different shipping address formats
    let processedShippingAddress;

    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required",
      });
    }

    if (typeof shippingAddress === "string") {
      // Handle simple string address format
      processedShippingAddress = {
        name: "Customer", // Default name
        address: shippingAddress,
        street: shippingAddress, // For backward compatibility
        city: "City", // Default city
        state: "State", // Default state
        zipCode: "000000", // Default zip
        country: "India",
      };
    } else if (typeof shippingAddress === "object") {
      // Handle object format - check required fields
      const addressField = shippingAddress.address || shippingAddress.street;
      if (
        !shippingAddress.name ||
        !addressField ||
        !shippingAddress.city ||
        !shippingAddress.state ||
        !shippingAddress.zipCode
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Complete shipping address is required (name, address/street, city, state, zipCode)",
        });
      }
      processedShippingAddress = {
        ...shippingAddress,
        address: addressField,
        street: addressField, // For backward compatibility
      };
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid shipping address format",
      });
    }

    if (!["cod", "card", "upi", "wallet"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Valid payment method is required (cod, card, upi, wallet)",
      });
    }

    // Validate delivery shift
    if (!deliveryShift || !["morning", "evening"].includes(deliveryShift)) {
      return res.status(400).json({
        success: false,
        message:
          "Valid delivery shift is required (morning: 5:00 AM - 11:00 AM, evening: 5-7 PM)",
      });
    }

    // Validate delivery date and timing using the new scheduling system
    const deliveryValidation = validateDeliverySlot(deliveryDate, deliveryShift);
    if (!deliveryValidation.valid) {
      return res.status(400).json({
        success: false,
        message: deliveryValidation.reason,
        timingRestriction: true,
        deliveryDate,
        deliveryShift,
      });
    }

    // Validate and process order items
    let subtotal = 0;
    const processedItems = [];

    for (const item of orderItems) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Each item must have productId and valid quantity",
        });
      }

      // Fetch product details
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product with ID ${item.productId} not found`,
        });
      }

      if (!product.isActive || product.status !== "active") {
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} is not available`,
        });
      }

      // Check stock availability - only reserve stock, don't deduct yet
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
        });
      }

      const itemPrice = product.discountPrice || product.price;
      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;

      processedItems.push({
        productId: product._id,
        name: product.name,
        price: itemPrice,
        quantity: item.quantity,
        image:
          product.images && product.images.length > 0
            ? product.images[0]
            : null,
      });
    }

    // Calculate total amount
    const totalAmount = subtotal + deliveryCharges + tax - discount;

    if (totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid total amount",
      });
    }

    // Generate order number manually as fallback
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const orderNumber = `ORD-${timestamp}-${random}`;

    // Set priority based on user role
    let priority = "Normal";
    let userName = "";
    let userPhone = "";
    if (req.user && req.user.userId) {
      const user = await import("../models/User.js").then((m) =>
        m.default.findById(req.user.userId)
      );
      if (user) {
        userName = user.name;
        userPhone = user.phone;
      }
      if (req.user.role === "admin") {
        priority = "Urgent";
      }
    }

    const newOrder = new Order({
      userId: req.user.userId,
      userName, // denormalized for search
      userPhone, // denormalized for search
      orderNumber,
      items: processedItems,
      subtotal,
      shippingFee: deliveryCharges, // Set shippingFee to deliveryCharges
      tax,
      discount,
      totalAmount,
      shippingAddress: processedShippingAddress,
      deliveryShift,
      deliveryDate: new Date(deliveryDate), // Add delivery date
      paymentMethod,
      customerNotes: customerNotes || "",
      status: "pending", // Always start as pending - admin must confirm
      paymentStatus: paymentMethod === "cod" ? "pending" : "pending",
      adminNotes: "Order placed. Awaiting admin confirmation.",
      priority, // set priority based on user role
    });

    console.log("Attempting to save order with data:", {
      userId: newOrder.userId,
      orderNumber: newOrder.orderNumber,
      itemsCount: newOrder.items.length,
      totalAmount: newOrder.totalAmount,
      status: newOrder.status,
      deliveryShift: newOrder.deliveryShift,
      priority: newOrder.priority,
    });

    const savedOrder = await newOrder.save();
    console.log("Order saved successfully:", savedOrder.orderNumber);

    // Check if user has an active delivery boy assignment and auto-assign
    try {
      const userAssignment = await UserDeliveryAssignment.findOne({
        userId: req.user.userId,
        isActive: true,
      });

      if (userAssignment) {
        // Auto-assign the order to the assigned delivery boy
        savedOrder.deliveryBoyId = userAssignment.deliveryBoyId;
        savedOrder.assignedAt = new Date();
        await savedOrder.save();

        console.log(
          `Order ${savedOrder.orderNumber} automatically assigned to delivery boy ${userAssignment.deliveryBoyId} based on user assignment`
        );
      }
    } catch (assignmentError) {
      console.error(
        "Error auto-assigning order to delivery boy:",
        assignmentError
      );
      // Don't fail the order creation if auto-assignment fails
    }

    await savedOrder.populate("userId", "name email phone");

    // Note: Stock is NOT deducted here - only when admin confirms the order
    // This prevents stock being locked for orders that might be cancelled
    console.log(
      "Order created in pending status. Stock will be deducted upon admin confirmation."
    );

    // Clear user's cart if it exists
    await Cart.findOneAndDelete({ userId: req.user.userId });

    res.status(201).json({
      success: true,
      message:
        "Order placed successfully. Your order is pending admin confirmation.",
      order: {
        id: savedOrder._id,
        orderNumber: savedOrder.orderNumber,
        items: savedOrder.items,
        subtotal: savedOrder.subtotal,
        shippingFee: savedOrder.shippingFee,
        tax: savedOrder.tax,
        discount: savedOrder.discount,
        totalAmount: savedOrder.totalAmount,
        shippingAddress: savedOrder.shippingAddress,
        deliveryShift: savedOrder.deliveryShift,
        status: savedOrder.status,
        paymentStatus: savedOrder.paymentStatus,
        paymentMethod: savedOrder.paymentMethod,
        createdAt: savedOrder.createdAt,
        adminNotes: savedOrder.adminNotes,
        priority: savedOrder.priority,
      },
    });
  } catch (error) {
    console.error("Error creating order:", error);

    // Handle validation errors more specifically
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        success: false,
        message: "Order validation failed",
        errors: validationErrors,
        details: error.message,
      });
    }

    // Handle duplicate order number error
    if (error.code === 11000 && error.keyPattern?.orderNumber) {
      console.log("Duplicate order number detected, retrying...");
      // Could implement retry logic here
      return res.status(500).json({
        success: false,
        message: "Order number conflict, please try again",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

// Get available delivery slots
export const getDeliverySlots = async (req, res) => {
  try {
    const currentDateTime = new Date().toISOString();
    
    console.log(`[${currentDateTime}] Getting available delivery slots`);
    
    const availableSlots = getAvailableDeliverySlots();
    
    // Transform the slots to match frontend expectations
    const formattedSlots = availableSlots.map(slot => ({
      date: slot.date,
      dateFormatted: getDateLabel(slot.date),
      shifts: {
        morning: {
          available: slot.morning.available,
          timeRange: getDeliveryTimeSlot('morning'),
          cutoffPassed: slot.morning.cutoffPassed,
          reason: slot.morning.reason,
        },
        // Evening is commented out per user request
        // evening: {
        //   available: slot.evening.available,
        //   timeRange: getDeliveryTimeSlot('evening'),
        //   cutoffPassed: slot.evening.cutoffPassed,
        //   reason: slot.evening.reason,
        // },
      },
    }));
    
    console.log(`[${currentDateTime}] Found ${formattedSlots.length} available slots`);
    
    res.status(200).json({
      success: true,
      message: "Available delivery slots retrieved",
      slots: formattedSlots,
      currentTime: currentDateTime,
    });
    
  } catch (error) {
    console.error("Error getting available delivery slots:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to get available delivery slots", 
      error: error.message 
    });
  }
};

// Get delivery shift availability (for frontend to check before showing options)
export const getDeliveryShiftAvailability = async (req, res) => {
  try {
    const morningCheck = Order.canPlaceOrderForShift("morning");
    // Evening shift is always unavailable
    const eveningCheck = {
      canPlace: false,
      reason:
        "Evening shift orders are currently not accepted. Only morning shift orders can be placed.",
    };

    res.status(200).json({
      success: true,
      availability: {
        morning: {
          available: morningCheck.canPlace,
          reason: morningCheck.reason,
        },
        evening: {
          available: eveningCheck.canPlace,
          reason: eveningCheck.reason,
        },
      },
    });
  } catch (error) {
    console.error("Error checking delivery shift availability:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check delivery availability",
      error: error.message,
    });
  }
};

// Get all orders for the authenticated user
export const getUserOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, deliveryShift } = req.query;

    const filters = { userId: req.user.userId };
    if (status) {
      filters.status = status;
    }
    if (deliveryShift) {
      filters.deliveryShift = deliveryShift;
    }

    const orders = await Order.find(filters)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("items.productId", "name images")
      .lean();

    const total = await Order.countDocuments(filters);

    const transformedOrders = orders.map((order) => ({
      id: order._id,
      orderNumber: order.orderNumber,
      items: order.items,
      totalAmount: order.totalAmount,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      shippingAddress: order.shippingAddress,
      deliveryShift: order.deliveryShift,
      createdAt: order.createdAt,
      estimatedDelivery: order.estimatedDelivery,
      deliveredAt: order.deliveredAt,
      confirmedAt: order.confirmedAt,
      cancelledAt: order.cancelledAt,
      adminNotes: order.adminNotes,
      cancellationReason: order.cancellationReason,
      cancelledBy: order.cancelledBy,
    }));

    res.status(200).json({
      success: true,
      orders: transformedOrders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

// Get order by ID for the authenticated user
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      userId: req.user.userId,
    }).populate("items.productId", "name images brand");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if user can cancel this order
    const cancellationCheck = order.canBeCancelledByUser();

    res.status(200).json({
      success: true,
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        items: order.items,
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        tax: order.tax,
        discount: order.discount,
        totalAmount: order.totalAmount,
        shippingAddress: order.shippingAddress,
        deliveryShift: order.deliveryShift,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        estimatedDelivery: order.estimatedDelivery,
        deliveredAt: order.deliveredAt,
        confirmedAt: order.confirmedAt,
        cancelledAt: order.cancelledAt,
        customerNotes: order.customerNotes,
        adminNotes: order.adminNotes,
        cancellationReason: order.cancellationReason,
        cancelledBy: order.cancelledBy,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        canBeCancelled: cancellationCheck.canCancel,
        cancellationMessage: cancellationCheck.reason,
      },
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
};

// Cancel an order (user) with time-based validation
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      userId: req.user.userId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order can be cancelled based on time rules
    const cancellationCheck = order.canBeCancelledByUser();

    if (!cancellationCheck.canCancel) {
      return res.status(400).json({
        success: false,
        message: cancellationCheck.reason,
      });
    }

    // If order was confirmed (stock was deducted), restore stock
    if (order.status === "confirmed") {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: item.quantity } },
          { new: true }
        );
      }
      console.log("Stock restored for cancelled confirmed order");
    }

    order.status = "cancelled";
    order.cancellationReason = reason || "Cancelled by user";
    order.cancelledBy = "user";
    order.customerNotes = `${order.customerNotes}\nCancellation reason: ${
      reason || "Not specified"
    }`;
    order.adminNotes = `${
      order.adminNotes
    }\nOrder cancelled by user at ${new Date().toISOString()}.`;
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        cancellationReason: order.cancellationReason,
        cancelledBy: order.cancelledBy,
      },
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel order",
      error: error.message,
    });
  }
};

// Admin: Get all orders
export const getAllOrdersForAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      area,
      shift,
      search,
      dateFrom,
      dateTo,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filters = {};
    if (status && status !== "all") filters.status = status;
    if (priority && priority !== "all") filters.priority = priority;
    if (area && area !== "all") filters["shippingAddress.address"] = area;
    if (shift && shift !== "all") filters.deliveryShift = shift;
    if (dateFrom || dateTo) {
      filters.createdAt = {};
      if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filters.createdAt.$lte = new Date(dateTo);
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // If search is present, use aggregation
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      const matchStage = {
        $and: [
          filters,
          {
            $or: [
              { "user.name": searchRegex },
              { "user.phone": searchRegex },
              { "items.productName": searchRegex },
            ],
          },
        ],
      };

      const pipeline = [
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        { $match: matchStage },
        { $sort: sortOptions },
        { $skip: (page - 1) * limit },
        { $limit: Number(limit) },
        // Add $project to ensure userName and userPhone are always present
        {
          $project: {
            _id: 1,
            orderNumber: 1,
            items: {
              $map: {
                input: "$items",
                as: "item",
                in: {
                  productName: "$$item.name", // fixed: use name field
                  quantity: "$$item.quantity",
                  price: "$$item.price",
                  unit: "$$item.unit",
                },
              },
            },
            totalAmount: 1,
            status: 1,
            priority: 1,
            shippingAddress: 1,
            deliveryShift: 1,
            createdAt: 1,
            userName: "$user.name",
            userPhone: "$user.phone",
            // Optionally, add more fields as needed
          },
        },
      ];

      const orders = await Order.aggregate(pipeline);
      const total = await Order.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        { $match: matchStage },
        { $count: "count" },
      ]);
      const totalCount = total[0]?.count || 0;

      return res.status(200).json({
        success: true,
        orders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      });
    }

    // If no search, use normal find
    const orders = await Order.find(filters)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("userId", "name email phone")
      .populate("items.productId", "name images")
      .lean();

    const total = await Order.countDocuments(filters);

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching orders for admin:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

// Helper function to validate status transitions (simplified)
const isValidStatusTransition = (currentStatus, newStatus) => {
  const statusFlow = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["delivered", "cancelled"],
    delivered: [], // Final state
    cancelled: [], // Final state
  };

  return statusFlow[currentStatus]?.includes(newStatus) || false;
};

// Admin: Update order status (simplified flow)
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, paymentStatus, adminNotes } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Validate status transitions
    if (status) {
      if (
        !["pending", "confirmed", "delivered", "cancelled"].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order status. Valid statuses: pending, confirmed, delivered, cancelled",
        });
      }

      // Check if status transition is valid
      // if (!isValidStatusTransition(order.status, status)) {
      //   return res.status(400).json({
      //     success: false,
      //     message: `Cannot change order status from '${order.status}' to '${status}'. Invalid status transition.`,
      //   });
      // }
    }

    if (
      paymentStatus &&
      !["pending", "paid", "failed", "refunded"].includes(paymentStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    // Handle stock management based on status changes
    if (status && status !== order.status) {
      // If confirming a pending order, deduct stock
      if (order.status === "pending" && status === "confirmed") {
        for (const item of order.items) {
          const product = await Product.findById(item.productId);
          if (!product) {
            return res.status(400).json({
              success: false,
              message: `Product with ID ${item.productId} not found`,
            });
          }

          if (product.stock < item.quantity) {
            return res.status(400).json({
              success: false,
              message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Required: ${item.quantity}`,
            });
          }

          await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { stock: -item.quantity } },
            { new: true }
          );
        }
        console.log("Stock deducted for confirmed order:", order.orderNumber);
      }

      // If cancelling a confirmed order, restore stock
      if (order.status === "confirmed" && status === "cancelled") {
        for (const item of order.items) {
          await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { stock: item.quantity } },
            { new: true }
          );
        }
        order.cancelledBy = "admin";
        console.log(
          "Stock restored for admin cancelled order:",
          order.orderNumber
        );
      }
    }

    // Update fields
    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (adminNotes) {
      order.adminNotes = order.adminNotes
        ? `${order.adminNotes}\n${new Date().toISOString()}: ${adminNotes}`
        : `${new Date().toISOString()}: ${adminNotes}`;
    }

    // Auto-assign to delivery boy if order is being confirmed and user has assignment
    if (status === "confirmed" && !order.deliveryBoyId) {
      try {
        const userAssignment = await UserDeliveryAssignment.findOne({
          userId: order.userId,
          isActive: true,
        });

        if (userAssignment) {
          order.deliveryBoyId = userAssignment.deliveryBoyId;
          order.assignedAt = new Date();
          console.log(
            `Order ${order.orderNumber} automatically assigned to delivery boy ${userAssignment.deliveryBoyId} upon confirmation`
          );
        }
      } catch (assignmentError) {
        console.error(
          "Error auto-assigning confirmed order to delivery boy:",
          assignmentError
        );
        // Don't fail the status update if auto-assignment fails
      }
    }

    const updatedOrder = await order.save();

    console.log(
      `Order ${order.orderNumber} status updated from '${order.status}' to '${status}' by admin`
    );

    res.status(200).json({
      success: true,
      message: `Order status updated successfully to '${status}'`,
      order: {
        id: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
        deliveredAt: updatedOrder.deliveredAt,
        confirmedAt: updatedOrder.confirmedAt,
        cancelledAt: updatedOrder.cancelledAt,
        adminNotes: updatedOrder.adminNotes,
      },
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error.message,
    });
  }
};

// Admin: Assign order to delivery boy
export const assignOrderToDeliveryBoy = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryBoyId } = req.body;

    // Validate required fields
    if (!deliveryBoyId) {
      return res.status(400).json({
        success: false,
        message: "Delivery boy ID is required",
      });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order is in confirmed status
    if (order.status !== "confirmed") {
      return res.status(400).json({
        success: false,
        message: "Only confirmed orders can be assigned to delivery boys",
      });
    }

    // Check if delivery boy exists and is approved
    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    if (!deliveryBoy.canLogin) {
      return res.status(400).json({
        success: false,
        message: "Delivery boy is not approved or active",
      });
    }

    // Check if delivery boy's shift matches the order's delivery shift
    if (
      deliveryBoy.shift !== "both" &&
      deliveryBoy.shift !== order.deliveryShift
    ) {
      return res.status(400).json({
        success: false,
        message: `Delivery boy works ${deliveryBoy.shift} shift but order is for ${order.deliveryShift} shift`,
      });
    }

    // Assign the order
    order.deliveryBoyId = deliveryBoyId;
    order.assignedAt = new Date();
    order.adminNotes = `${order.adminNotes}\nAssigned to delivery boy ${
      deliveryBoy.name
    } at ${new Date().toISOString()}`;

    await order.save();

    res.status(200).json({
      success: true,
      message: `Order successfully assigned to ${deliveryBoy.name}`,
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        deliveryBoyId: order.deliveryBoyId,
        deliveryBoyName: deliveryBoy.name,
        assignedAt: order.assignedAt,
        status: order.status,
      },
    });
  } catch (error) {
    console.error("Error assigning order to delivery boy:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign order to delivery boy",
      error: error.message,
    });
  }
};

// Admin: Get list of available delivery boys for assignment
export const getAvailableDeliveryBoys = async (req, res) => {
  try {
    const { shift } = req.query;

    // Build filter for approved and active delivery boys
    const filter = {
      status: "approved",
      isActive: true,
    };

    // Filter by shift if provided
    if (shift && shift !== "all") {
      filter.$or = [
        { shift: shift },
        { shift: "both" }, // Delivery boys with "both" shift can handle any shift
      ];
    }

    const deliveryBoys = await DeliveryBoy.find(filter)
      .select("name email phone shift totalDeliveries rating")
      .sort({ totalDeliveries: 1, rating: -1 }); // Sort by least deliveries, then by rating

    res.status(200).json({
      success: true,
      deliveryBoys: deliveryBoys.map((db) => ({
        id: db._id,
        name: db.name,
        email: db.email,
        phone: db.phone,
        shift: db.shift,
        totalDeliveries: db.totalDeliveries,
        rating: db.rating,
      })),
    });
  } catch (error) {
    console.error("Error fetching available delivery boys:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available delivery boys",
      error: error.message,
    });
  }
};

// Delivery Boy: Get assigned orders
export const getAssignedOrders = async (req, res) => {
  try {
    const deliveryBoyId = req.deliveryBoyId; // From delivery boy auth middleware
    const { status } = req.query;

    // 1. Get all active user assignments for this delivery boy, sorted by assignment time
    const UserDeliveryAssignment = await import(
      "../models/UserDeliveryAssignment.js"
    ).then((m) => m.default);
    const userAssignments = await UserDeliveryAssignment.find({
      deliveryBoyId,
      isActive: true,
    })
      .populate("userId", "name email phone")
      .sort({ sequence: 1, assignedAt: 1 }); // Admin-defined user order, fallback to assignedAt

    // 2. For each assigned user, fetch their orders assigned to this delivery boy
    const Order = await import("../models/Order.js").then((m) => m.default);
    const userOrderGroups = [];

    for (const assignment of userAssignments) {
      const user = assignment.userId;
      if (!user) continue;
      const orderFilter = {
        userId: user._id,
        deliveryBoyId,
      };
      if (status && status !== "all") {
        orderFilter.status = status;
      } else {
        orderFilter.status = { $in: ["pending", "confirmed"] };
      }
      const orders = await Order.find(orderFilter)
        .sort({ sequence: 1, createdAt: 1 }) // Sort by sequence if set, fallback to createdAt
        .populate("items.productId", "name images");

      // Transform orders for frontend
      const transformedOrders = orders.map((order) => {
        const deliveryTimeCheck = order.canBeMarkedAsDelivered();
        return {
          id: order._id,
          orderNumber: order.orderNumber,
          customer: {
            name: user.name || order.shippingAddress?.name || "Unknown",
            phone: user.phone || order.shippingAddress?.phone || "N/A",
            email: user.email || "",
            address:
              order.shippingAddress?.address ||
              order.shippingAddress?.street ||
              "N/A",
            landmark: order.shippingAddress?.landmark || "",
            floor: order.shippingAddress?.floor || "",
            apartmentNumber: order.shippingAddress?.apartmentNumber || "",
          },
          items: order.items.map((item) => ({
            id: item._id,
            name: item.name,
            category: "milk", // Default category, you can enhance this
            quantity: item.quantity,
            unit: "unit", // Default unit, you can enhance this
            price: item.price,
            notes: "",
          })),
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          status: order.status,
          deliveryTimeSlot:
            order.deliveryShift === "morning"
              ? "5:00 AM - 11:00 AM"
              : "4:00 PM - 8:00 PM",
          specialInstructions: order.customerNotes || "",
          deliveryNotes: order.deliveryNotes || "",
          priority: order.priority || "normal",
          date: order.createdAt,
          completedAt: order.deliveredAt,
          assignedAt: order.assignedAt,
          canMarkDelivered: deliveryTimeCheck.canMarkDelivered,
          deliveryTimeMessage: deliveryTimeCheck.reason,
          sequence: order.sequence,
        };
      });
      userOrderGroups.push({
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          assignmentId: assignment._id,
          assignedAt: assignment.assignedAt,
        },
        orders: transformedOrders,
      });
    }

    res.status(200).json({
      success: true,
      userOrderGroups, // Array of { user, orders }
      totalUsers: userOrderGroups.length,
    });
  } catch (error) {
    console.error("Error fetching assigned orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch assigned orders",
      error: error.message,
    });
  }
};

// Delivery Boy: Mark order as delivered
export const markOrderAsDelivered = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryNotes, latitude, longitude } = req.body;
    const deliveryBoyId = req.deliveryBoyId; // From delivery boy auth middleware

    // Find the order
    const order = await Order.findOne({
      _id: orderId,
      deliveryBoyId: deliveryBoyId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or not assigned to you",
      });
    }

    // Check if order can be marked as delivered (time restrictions)
    const deliveryTimeCheck = order.canBeMarkedAsDelivered();
    if (!deliveryTimeCheck.canMarkDelivered) {
      return res.status(400).json({
        success: false,
        message: deliveryTimeCheck.reason,
        timingRestriction: true,
      });
    }

    // Update order status to delivered
    order.status = "delivered";
    order.deliveryNotes = deliveryNotes || "";
    order.deliveredAt = new Date();

    // Store delivery location if provided
    if (latitude && longitude) {
      order.deliveryLocation = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      };
    }

    order.adminNotes = `${
      order.adminNotes
    }\nDelivered by delivery boy at ${new Date().toISOString()}`;

    await order.save();

    // Update delivery boy's total deliveries count
    await DeliveryBoy.findByIdAndUpdate(
      deliveryBoyId,
      { $inc: { totalDeliveries: 1 } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Order marked as delivered successfully",
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveredAt: order.deliveredAt,
        deliveryNotes: order.deliveryNotes,
        deliveryLocation: order.deliveryLocation,
      },
    });
  } catch (error) {
    console.error("Error marking order as delivered:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark order as delivered",
      error: error.message,
    });
  }
};

// Delivery Boy: Get order history (delivered orders)
export const getDeliveryBoyOrderHistory = async (req, res) => {
  try {
    const deliveryBoyId = req.deliveryBoyId; // From delivery boy auth middleware
    const {
      page = 1,
      limit = 10,
      search,
      dateFrom,
      dateTo,
      sortBy = "deliveredAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter for delivered orders by this delivery boy
    const filter = {
      deliveryBoyId,
      status: "delivered", // Only show delivered orders in history
    };

    // Date range filter
    if (dateFrom || dateTo) {
      filter.deliveredAt = {};
      if (dateFrom) filter.deliveredAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999); // End of day
        filter.deliveredAt.$lte = endDate;
      }
    }

    // Search filter (customer name, order number, address)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { orderNumber: searchRegex },
        { "shippingAddress.name": searchRegex },
        { "shippingAddress.address": searchRegex },
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const orders = await Order.find(filter)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("items.productId", "name images")
      .populate("userId", "name email phone");

    const total = await Order.countDocuments(filter);

    // Transform orders to match frontend expectations
    const transformedOrders = orders.map((order) => ({
      id: order._id,
      orderNumber: order.orderNumber,
      customer: {
        name: order.userId?.name || order.shippingAddress?.name || "Unknown",
        phone: order.userId?.phone || order.shippingAddress?.phone || "N/A",
        email: order.userId?.email || "",
        address:
          order.shippingAddress?.address ||
          order.shippingAddress?.street ||
          "N/A",
        landmark: order.shippingAddress?.landmark || "",
        floor: order.shippingAddress?.floor || "",
        apartmentNumber: order.shippingAddress?.apartmentNumber || "",
      },
      items: order.items.map((item) => ({
        id: item._id,
        name: item.name,
        category: "milk", // Default category, you can enhance this
        quantity: item.quantity,
        unit: "unit", // Default unit, you can enhance this
        price: item.price,
        notes: "",
      })),
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      deliveryTimeSlot:
        order.deliveryShift === "morning"
          ? "5:00 AM - 11:00 AM"
          : "4:00 PM - 8:00 PM",
      specialInstructions: order.customerNotes || "",
      deliveryNotes: order.deliveryNotes || "",
      priority: order.priority || "normal",
      date: order.createdAt,
      completedAt: order.deliveredAt,
      assignedAt: order.assignedAt,
    }));

    // Group orders by date for frontend
    const groupedOrders = transformedOrders.reduce((groups, order) => {
      const date = new Date(order.completedAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(order);
      return groups;
    }, {});

    res.status(200).json({
      success: true,
      orders: transformedOrders,
      groupedOrders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      filters: {
        search: search || "",
        dateFrom: dateFrom || "",
        dateTo: dateTo || "",
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    console.error("Error fetching delivery boy order history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order history",
      error: error.message,
    });
  }
};

// Admin: Assign user to delivery boy (new function)
export const assignUserToDeliveryBoy = async (req, res) => {
  try {
    const { userId, deliveryBoyId, notes, deliveryShifts, areas } = req.body;
    const adminId = req.user.userId; // Admin making the assignment

    // Validate required fields
    if (!userId || !deliveryBoyId) {
      return res.status(400).json({
        success: false,
        message: "User ID and Delivery Boy ID are required",
      });
    }

    // Check if user exists
    const User = await import("../models/User.js").then((m) => m.default);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if delivery boy exists and is active
    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    if (!deliveryBoy.isActive || deliveryBoy.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Delivery boy is not active or not approved",
      });
    }

    // Deactivate any existing active assignment for this user
    await UserDeliveryAssignment.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );

    // Create new assignment
    // Handle admin case where adminId is "admin" string instead of ObjectId
    const assignmentData = {
      userId,
      deliveryBoyId,
      notes: notes || "",
      deliveryShifts: deliveryShifts || ["morning", "evening"],
      areas: areas || [],
    };

    // Only add assignedBy if it's a valid ObjectId (not "admin" string)
    if (adminId && adminId !== "admin") {
      assignmentData.assignedBy = adminId;
    }

    const assignment = new UserDeliveryAssignment(assignmentData);

    await assignment.save();

    // Automatically assign all pending and confirmed orders for this user to the delivery boy
    const ordersToAssign = await Order.find({
      userId,
      status: { $in: ["pending", "confirmed"] },
      deliveryBoyId: { $exists: false },
    });

    if (ordersToAssign.length > 0) {
      const orderIds = ordersToAssign.map((order) => order._id);

      await Order.updateMany(
        { _id: { $in: orderIds } },
        {
          deliveryBoyId,
          assignedAt: new Date(),
        }
      );

      console.log(
        `Assigned ${ordersToAssign.length} orders to delivery boy ${deliveryBoyId} for user ${userId}`
      );
    }

    // Populate assignment details for response
    const populateOptions = [
      { path: "userId", select: "name phone email" },
      { path: "deliveryBoyId", select: "name phone shift" },
    ];

    // Only populate assignedBy if it exists
    if (assignment.assignedBy) {
      populateOptions.push({ path: "assignedBy", select: "name" });
    }

    await assignment.populate(populateOptions);

    res.status(200).json({
      success: true,
      message: `User assigned to delivery boy successfully. ${ordersToAssign.length} orders automatically assigned.`,
      assignment: {
        id: assignment._id,
        userId: assignment.userId,
        deliveryBoyId: assignment.deliveryBoyId,
        assignedBy: assignment.assignedBy || { name: "Admin" }, // Fallback for admin case
        assignedAt: assignment.assignedAt,
        notes: assignment.notes,
        deliveryShifts: assignment.deliveryShifts,
        areas: assignment.areas,
        ordersAssigned: ordersToAssign.length,
      },
    });
  } catch (error) {
    console.error("Error assigning user to delivery boy:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign user to delivery boy",
      error: error.message,
    });
  }
};

// Admin: Get all user assignments
export const getUserAssignments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      deliveryBoyId,
      isActive = true,
    } = req.query;

    const filter = { isActive: isActive === "true" };

    // Filter by delivery boy
    if (deliveryBoyId) {
      filter.deliveryBoyId = deliveryBoyId;
    }

    // Search filter
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { "userId.name": searchRegex },
        { "userId.phone": searchRegex },
        { "deliveryBoyId.name": searchRegex },
        { "deliveryBoyId.phone": searchRegex },
      ];
    }

    const assignments = await UserDeliveryAssignment.find(filter)
      .populate("userId", "name phone email")
      .populate("deliveryBoyId", "name phone shift totalDeliveries rating")
      .populate("assignedBy", "name")
      .sort({ assignedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await UserDeliveryAssignment.countDocuments(filter);

    // Get order counts for each assignment
    const assignmentsWithOrderCounts = await Promise.all(
      assignments.map(async (assignment) => {
        const orderCount = await Order.countDocuments({
          userId: assignment.userId._id,
          status: { $in: ["pending", "confirmed"] },
        });

        return {
          id: assignment._id,
          userId: assignment.userId,
          deliveryBoyId: assignment.deliveryBoyId,
          assignedBy: assignment.assignedBy || { name: "Admin" }, // Fallback for admin case
          assignedAt: assignment.assignedAt,
          notes: assignment.notes,
          deliveryShifts: assignment.deliveryShifts,
          areas: assignment.areas,
          isActive: assignment.isActive,
          orderCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      assignments: assignmentsWithOrderCounts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching user assignments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user assignments",
      error: error.message,
    });
  }
};

// Admin: Remove user assignment
export const removeUserAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await UserDeliveryAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Deactivate the assignment
    assignment.isActive = false;
    await assignment.save();

    // Remove delivery boy from all pending and confirmed orders for this user
    const ordersToUnassign = await Order.find({
      userId: assignment.userId,
      status: { $in: ["pending", "confirmed"] },
      deliveryBoyId: assignment.deliveryBoyId,
    });

    if (ordersToUnassign.length > 0) {
      await Order.updateMany(
        { _id: { $in: ordersToUnassign.map((order) => order._id) } },
        {
          $unset: { deliveryBoyId: 1, assignedAt: 1 },
        }
      );

      console.log(
        `Unassigned ${ordersToUnassign.length} orders for user ${assignment.userId}`
      );
    }

    res.status(200).json({
      success: true,
      message: `User assignment removed successfully. ${ordersToUnassign.length} orders unassigned.`,
    });
  } catch (error) {
    console.error("Error removing user assignment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove user assignment",
      error: error.message,
    });
  }
};

// Admin: Get users without delivery boy assignments
export const getUnassignedUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      hasOrders = "false", // Changed default to false: show all users without assignments
    } = req.query;

    const User = await import("../models/User.js").then((m) => m.default);

    // Get all users with active assignments
    const assignedUserIds = await UserDeliveryAssignment.distinct("userId", {
      isActive: true,
    });

    // Build filter for unassigned users
    const filter = {
      _id: { $nin: assignedUserIds },
    };

    // Search filter
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
      ];
    }

    // Filter users who have orders (only if hasOrders is true)
    if (hasOrders === "true") {
      const usersWithOrders = await Order.distinct("userId");
      filter._id.$in = usersWithOrders;
    }

    const users = await User.find(filter)
      .select("name phone email createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    // Get order counts for each user
    const usersWithOrderCounts = await Promise.all(
      users.map(async (user) => {
        const orderCount = await Order.countDocuments({
          userId: user._id,
          status: { $in: ["pending", "confirmed"] },
        });

        return {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          createdAt: user.createdAt,
          orderCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      users: usersWithOrderCounts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching unassigned users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unassigned users",
      error: error.message,
    });
  }
};

// Admin: Reassign user to different delivery boy
export const reassignUserToDeliveryBoy = async (req, res) => {
  try {
    const {
      userId,
      newDeliveryBoyId,
      reassignmentType, // 'entire' or 'date_range'
      startDate,
      endDate,
      notes,
    } = req.body;
    const adminId = req.user.userId;

    // Validate required fields
    if (!userId || !newDeliveryBoyId || !reassignmentType) {
      return res.status(400).json({
        success: false,
        message:
          "User ID, new delivery boy ID, and reassignment type are required",
      });
    }

    // Validate reassignment type
    if (!["entire", "date_range"].includes(reassignmentType)) {
      return res.status(400).json({
        success: false,
        message: "Reassignment type must be 'entire' or 'date_range'",
      });
    }

    // Validate date range if needed
    if (reassignmentType === "date_range") {
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message:
            "Start date and end date are required for date range reassignment",
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: "Start date must be before end date",
        });
      }
    }

    // Check if user exists
    const User = await import("../models/User.js").then((m) => m.default);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if new delivery boy exists and is active
    const deliveryBoy = await DeliveryBoy.findById(newDeliveryBoyId);
    if (!deliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "Delivery boy not found",
      });
    }

    if (!deliveryBoy.isActive || deliveryBoy.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Delivery boy is not active or not approved",
      });
    }

    // Check if user has existing assignment
    const existingAssignment = await UserDeliveryAssignment.findOne({
      userId,
      isActive: true,
    });

    if (!existingAssignment) {
      return res.status(404).json({
        success: false,
        message: "User has no active assignment to reassign",
      });
    }

    let ordersReassigned = 0;
    let assignmentUpdated = false;
    let createdAssignment = null;

    if (reassignmentType === "entire") {
      // Deactivate current assignment
      existingAssignment.isActive = false;
      await existingAssignment.save();

      // Create new assignment
      const newAssignment = new UserDeliveryAssignment({
        userId,
        deliveryBoyId: newDeliveryBoyId,
        assignedBy: adminId !== "admin" ? adminId : undefined,
        notes: notes || `Reassigned from ${existingAssignment.deliveryBoyId}`,
        deliveryShifts: existingAssignment.deliveryShifts,
        areas: existingAssignment.areas,
      });

      await newAssignment.save();
      createdAssignment = newAssignment;

      // Reassign all pending and confirmed orders
      const ordersToReassign = await Order.find({
        userId,
        status: { $in: ["pending", "confirmed"] },
      });

      if (ordersToReassign.length > 0) {
        await Order.updateMany(
          { _id: { $in: ordersToReassign.map((order) => order._id) } },
          {
            deliveryBoyId: newDeliveryBoyId,
            assignedAt: new Date(),
          }
        );
        ordersReassigned = ordersToReassign.length;
      }

      assignmentUpdated = true;
    } else if (reassignmentType === "date_range") {
      // For date range reassignment, we'll create a temporary assignment
      // and reassign orders within the date range

      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of day

      // Find orders within the date range
      const ordersInRange = await Order.find({
        userId,
        status: { $in: ["pending", "confirmed"] },
        createdAt: { $gte: start, $lte: end },
      });

      if (ordersInRange.length > 0) {
        await Order.updateMany(
          { _id: { $in: ordersInRange.map((order) => order._id) } },
          {
            deliveryBoyId: newDeliveryBoyId,
            assignedAt: new Date(),
          }
        );
        ordersReassigned = ordersInRange.length;
      }

      // Create a temporary assignment record for tracking
      const tempAssignment = new UserDeliveryAssignment({
        userId,
        deliveryBoyId: newDeliveryBoyId,
        assignedBy: adminId !== "admin" ? adminId : undefined,
        notes: `Temporary reassignment from ${startDate} to ${endDate}. ${
          notes || ""
        }`,
        deliveryShifts: existingAssignment.deliveryShifts,
        areas: existingAssignment.areas,
        isActive: false, // Mark as inactive since it's temporary
      });

      await tempAssignment.save();
      createdAssignment = tempAssignment;
      assignmentUpdated = true;
    }

    // Populate assignment details for response
    const populatedAssignment = await UserDeliveryAssignment.findById(
      createdAssignment._id
    ).populate([
      { path: "userId", select: "name phone email" },
      { path: "deliveryBoyId", select: "name phone shift" },
      { path: "assignedBy", select: "name" },
    ]);

    res.status(200).json({
      success: true,
      message: `User reassigned successfully. ${ordersReassigned} orders reassigned.`,
      reassignment: {
        type: reassignmentType,
        userId: populatedAssignment.userId,
        newDeliveryBoyId: populatedAssignment.deliveryBoyId,
        assignedBy: populatedAssignment.assignedBy || { name: "Admin" },
        assignedAt: populatedAssignment.assignedAt,
        notes: populatedAssignment.notes,
        ordersReassigned,
        dateRange:
          reassignmentType === "date_range" ? { startDate, endDate } : null,
      },
    });
  } catch (error) {
    console.error("Error reassigning user to delivery boy:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reassign user to delivery boy",
      error: error.message,
    });
  }
};

// Admin: Get reassignment history for a user
export const getUserReassignmentHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Get all assignments for the user (including inactive ones for history)
    const assignments = await UserDeliveryAssignment.find({ userId })
      .populate("deliveryBoyId", "name phone shift")
      .populate("assignedBy", "name")
      .sort({ assignedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await UserDeliveryAssignment.countDocuments({ userId });

    // Transform assignments to show reassignment history
    const reassignmentHistory = assignments.map((assignment, index) => {
      const isActive = assignment.isActive;
      const isTemporary = assignment.notes?.includes("Temporary reassignment");

      return {
        id: assignment._id,
        deliveryBoy: assignment.deliveryBoyId,
        assignedBy: assignment.assignedBy || { name: "Admin" },
        assignedAt: assignment.assignedAt,
        notes: assignment.notes,
        status: isActive ? "Active" : isTemporary ? "Temporary" : "Inactive",
        type: isTemporary ? "Date Range" : "Full Assignment",
      };
    });

    res.status(200).json({
      success: true,
      reassignmentHistory,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching user reassignment history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reassignment history",
      error: error.message,
    });
  }
};

// ADMIN: Get all orders assigned to a delivery boy (for sequencing)
export const getDeliveryBoyOrdersForSequencing = async (req, res) => {
  try {
    const { deliveryBoyId } = req.params;
    if (!deliveryBoyId) {
      return res
        .status(400)
        .json({ success: false, message: "deliveryBoyId is required" });
    }
    const orders = await Order.find({ deliveryBoyId })
      .populate("userId", "name phone email")
      .sort({ sequence: 1, createdAt: 1 });
    res.status(200).json({
      success: true,
      orders: orders.map((order) => ({
        id: order._id,
        orderNumber: order.orderNumber,
        user: order.userId,
        status: order.status,
        createdAt: order.createdAt,
        sequence: order.sequence,
        shippingAddress: order.shippingAddress,
        deliveryShift: order.deliveryShift,
        // add more fields as needed
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

// ADMIN: Update delivery sequence for a delivery boy
export const updateDeliverySequence = async (req, res) => {
  try {
    const { deliveryBoyId, orderSequence } = req.body;
    if (!deliveryBoyId || !Array.isArray(orderSequence)) {
      return res.status(400).json({
        success: false,
        message: "deliveryBoyId and orderSequence[] are required",
      });
    }
    // Update each order's sequence field
    for (let i = 0; i < orderSequence.length; i++) {
      await Order.updateOne(
        { _id: orderSequence[i], deliveryBoyId },
        { $set: { sequence: i + 1 } }
      );
    }
    res
      .status(200)
      .json({ success: true, message: "Order sequence updated successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update order sequence",
      error: error.message,
    });
  }
};

// Admin: Get all users assigned to a delivery agent, sorted by sequence
export const getDeliveryBoyUserAssignments = async (req, res) => {
  try {
    const { deliveryBoyId } = req.params;
    if (!deliveryBoyId) {
      return res
        .status(400)
        .json({ success: false, message: "deliveryBoyId is required" });
    }
    const assignments = await UserDeliveryAssignment.find({
      deliveryBoyId,
      isActive: true,
    })
      .populate("userId", "name phone email")
      .sort({ sequence: 1, assignedAt: 1 });
    res.status(200).json({
      success: true,
      users: assignments.map((a) => ({
        assignmentId: a._id,
        user: a.userId,
        sequence: a.sequence,
        assignedAt: a.assignedAt,
        notes: a.notes,
        deliveryShifts: a.deliveryShifts,
        areas: a.areas,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user assignments",
      error: error.message,
    });
  }
};

// Admin: Update the sequence of users for a delivery agent
export const updateUserAssignmentSequence = async (req, res) => {
  try {
    const { deliveryBoyId, assignmentOrder } = req.body;
    if (!deliveryBoyId || !Array.isArray(assignmentOrder)) {
      return res.status(400).json({
        success: false,
        message: "deliveryBoyId and assignmentOrder[] are required",
      });
    }
    for (let i = 0; i < assignmentOrder.length; i++) {
      await UserDeliveryAssignment.updateOne(
        { _id: assignmentOrder[i], deliveryBoyId },
        { $set: { sequence: i + 1 } }
      );
    }
    res
      .status(200)
      .json({ success: true, message: "User sequence updated successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update user sequence",
      error: error.message,
    });
  }
};

// Admin: Bulk transfer all users from one delivery agent to another
export const transferAllUsersToAnotherDeliveryBoy = async (req, res) => {
  try {
    const { fromDeliveryBoyId, toDeliveryBoyId, notes } = req.body;
    const adminId = req.user.userId;
    if (!fromDeliveryBoyId || !toDeliveryBoyId) {
      return res.status(400).json({
        success: false,
        message: "Both fromDeliveryBoyId and toDeliveryBoyId are required",
      });
    }
    if (fromDeliveryBoyId === toDeliveryBoyId) {
      return res.status(400).json({
        success: false,
        message: "Source and destination delivery boy must be different",
      });
    }
    // Check if both delivery boys exist and are active
    const fromDeliveryBoy = await DeliveryBoy.findById(fromDeliveryBoyId);
    const toDeliveryBoy = await DeliveryBoy.findById(toDeliveryBoyId);
    if (!fromDeliveryBoy || !toDeliveryBoy) {
      return res.status(404).json({
        success: false,
        message: "One or both delivery boys not found",
      });
    }
    if (!toDeliveryBoy.isActive || toDeliveryBoy.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Destination delivery boy is not active or not approved",
      });
    }
    // Get all active user assignments for fromDeliveryBoyId
    const assignments = await UserDeliveryAssignment.find({
      deliveryBoyId: fromDeliveryBoyId,
      isActive: true,
    });
    if (assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No users assigned to the source delivery boy",
      });
    }
    let usersTransferred = 0;
    let ordersUpdated = 0;
    for (const assignment of assignments) {
      // Deactivate old assignment
      assignment.isActive = false;
      await assignment.save();
      // Create new assignment for the user to the new delivery boy
      const newAssignment = new UserDeliveryAssignment({
        userId: assignment.userId,
        deliveryBoyId: toDeliveryBoyId,
        assignedBy: adminId !== "admin" ? adminId : undefined,
        notes:
          notes ||
          `Bulk transferred from delivery boy ${fromDeliveryBoyId} to ${toDeliveryBoyId}`,
        deliveryShifts: assignment.deliveryShifts,
        areas: assignment.areas,
      });
      await newAssignment.save();
      usersTransferred++;
      // Update all pending/confirmed orders for this user to the new delivery boy
      const updated = await Order.updateMany(
        {
          userId: assignment.userId,
          status: { $in: ["pending", "confirmed"] },
        },
        {
          deliveryBoyId: toDeliveryBoyId,
          assignedAt: new Date(),
        }
      );
      ordersUpdated += updated.modifiedCount || 0;
    }
    res.status(200).json({
      success: true,
      message: `Transferred ${usersTransferred} users and updated ${ordersUpdated} orders from delivery boy ${fromDeliveryBoyId} to ${toDeliveryBoyId}`,
      usersTransferred,
      ordersUpdated,
    });
  } catch (error) {
    console.error("Error transferring users to another delivery boy:", error);
    res.status(500).json({
      success: false,
      message: "Failed to transfer users to another delivery boy",
      error: error.message,
    });
  }
};
