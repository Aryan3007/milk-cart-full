import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import QRCode from "qrcode";
import mongoose from "mongoose";
import { paymentConfig } from "../config/payment.js";

// Get user's unpaid orders (confirmed and delivered orders that haven't been paid)
export const getUnpaidOrders = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find all confirmed and delivered orders that are not paid
    // Users can pay once admin confirms their order (don't need to wait for delivery)
    const unpaidOrders = await Order.find({
      userId: userId,
      status: { $in: ["confirmed", "delivered"] }, // Allow payment for confirmed orders
      paymentStatus: { $in: ["pending", "failed", "processing"] },
    })
      .sort({ confirmedAt: -1, deliveredAt: -1 }) // Sort by confirmation/delivery date
      .populate("items.productId", "name images")
      .lean();

    // Calculate total amount
    const totalAmount = unpaidOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );

    // Group orders by confirmation/delivery date for better UI
    const groupedOrders = unpaidOrders.reduce((groups, order) => {
      const groupDate = order.deliveredAt || order.confirmedAt;
      const dateKey = new Date(groupDate).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push({
        id: order._id,
        orderNumber: order.orderNumber,
        items: order.items,
        totalAmount: order.totalAmount,
        confirmedAt: order.confirmedAt,
        deliveredAt: order.deliveredAt,
        paymentStatus: order.paymentStatus,
        status: order.status,
      });
      return groups;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        unpaidOrders: unpaidOrders.map((order) => ({
          id: order._id,
          orderNumber: order.orderNumber,
          items: order.items,
          totalAmount: order.totalAmount,
          confirmedAt: order.confirmedAt,
          deliveredAt: order.deliveredAt,
          paymentStatus: order.paymentStatus,
          status: order.status,
        })),
        groupedOrders,
        totalAmount,
        orderCount: unpaidOrders.length,
      },
    });
  } catch (error) {
    console.error("Error fetching unpaid orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unpaid orders",
      error: error.message,
    });
  }
};

// Create payment session with QR code
export const createPaymentSession = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { orderIds, metadata } = req.body;

    // Validate input
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order IDs are required and must be a non-empty array",
      });
    }

    // Find and validate orders
    const orders = await Order.find({
      _id: { $in: orderIds },
      userId: userId,
      status: { $in: ["confirmed", "delivered"] }, // Allow payment for confirmed orders too
      paymentStatus: { $in: ["pending", "failed", "processing"] },
    });

    if (orders.length !== orderIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some orders are not found or not eligible for payment",
      });
    }

    // Calculate total amount
    const totalAmount = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );

    if (totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid total amount",
      });
    }

    // Generate payment session
    const paymentId = Payment.generatePaymentId();
    const referenceNumber = Payment.generateReferenceNumber();

    // Create UPI URL
    const upiUrl = paymentConfig.generateUpiUrl(
      paymentConfig.adminUpiId,
      paymentConfig.adminUpiName,
      totalAmount,
      referenceNumber,
      `Payment for ${orders.length} milk orders`,
    );

    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(upiUrl, {
      width: paymentConfig.qrCodeSize,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // Create payment record
    const payment = new Payment({
      userId: userId,
      orderIds: orderIds,
      paymentId: paymentId,
      referenceNumber: referenceNumber,
      totalAmount: totalAmount,
      paymentMethod: "upi",
      adminUpiId: paymentConfig.adminUpiId,
      qrCodeUrl: qrCodeDataURL,
      metadata: {
        userAgent: req.headers["user-agent"] || "",
        ipAddress: req.ip || req.connection.remoteAddress || "",
        deviceInfo: metadata?.deviceInfo || "",
      },
    });

    await payment.save();

    // Update orders to mark payment session created
    await Order.updateMany(
      { _id: { $in: orderIds } },
      {
        $set: {
          paymentSessionId: paymentId,
          paymentSessionCreatedAt: new Date(),
        },
      },
    );

    res.status(201).json({
      success: true,
      message: "Payment session created successfully",
      data: {
        paymentId: paymentId,
        referenceNumber: referenceNumber,
        totalAmount: totalAmount,
        qrCodeUrl: qrCodeDataURL,
        upiId: paymentConfig.adminUpiId,
        upiName: paymentConfig.adminUpiName,
        orderCount: orders.length,
        expiresIn: paymentConfig.paymentTimeoutMinutes * 60, // seconds
        orders: orders.map((order) => ({
          id: order._id,
          orderNumber: order.orderNumber,
          amount: order.totalAmount,
        })),
      },
    });
  } catch (error) {
    console.error("Error creating payment session:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment session",
      error: error.message,
    });
  }
};

// Mark payment as completed by user
export const markPaymentCompleted = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { upiTransactionId, upiReferenceNumber, screenshot } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!upiTransactionId) {
      return res.status(400).json({
        success: false,
        message: "UPI transaction ID is required",
      });
    }

    // Find payment
    const payment = await Payment.findOne({
      paymentId: paymentId,
      userId: userId,
      paymentStatus: "pending",
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment session not found or already processed",
      });
    }

    // Check if payment session is not expired
    const now = new Date();
    const sessionCreated = new Date(payment.createdAt);
    const expiryTime = new Date(
      sessionCreated.getTime() +
        paymentConfig.paymentTimeoutMinutes * 60 * 1000,
    );

    if (now > expiryTime) {
      payment.paymentStatus = "cancelled";
      await payment.save();

      return res.status(400).json({
        success: false,
        message:
          "Payment session has expired. Please create a new payment session.",
        expired: true,
      });
    }

    // Mark payment as completed
    await payment.markAsCompleted(upiTransactionId, upiReferenceNumber);

    // Update related orders
    await Order.updateMany(
      { _id: { $in: payment.orderIds } },
      {
        $set: {
          paymentStatus: "processing", // Admin will verify and mark as paid
          paymentCompletedAt: new Date(),
          upiTransactionId: upiTransactionId,
        },
      },
    );

    res.status(200).json({
      success: true,
      message:
        "Payment marked as completed. It will be verified by admin shortly.",
      data: {
        paymentId: payment.paymentId,
        referenceNumber: payment.referenceNumber,
        status: payment.paymentStatus,
        verificationStatus: payment.verificationStatus,
        estimatedVerificationTime: "24 hours",
      },
    });
  } catch (error) {
    console.error("Error marking payment as completed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark payment as completed",
      error: error.message,
    });
  }
};

// Get payment status
export const getPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.userId;

    const payment = await Payment.findOne({
      paymentId: paymentId,
      userId: userId,
    }).populate("orderIds", "orderNumber totalAmount");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        paymentId: payment.paymentId,
        referenceNumber: payment.referenceNumber,
        totalAmount: payment.totalAmount,
        paymentStatus: payment.paymentStatus,
        verificationStatus: payment.verificationStatus,
        paymentDate: payment.paymentDate,
        verifiedAt: payment.verifiedAt,
        orders: payment.orderIds,
        createdAt: payment.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching payment status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment status",
      error: error.message,
    });
  }
};

// Get user's payment history
export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, status } = req.query;

    const filter = { userId };
    if (status && status !== "all") {
      filter.paymentStatus = status;
    }

    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("orderIds", "orderNumber totalAmount deliveredAt")
      .lean();

    const total = await Payment.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        payments: payments.map((payment) => ({
          paymentId: payment.paymentId,
          referenceNumber: payment.referenceNumber,
          totalAmount: payment.totalAmount,
          paymentStatus: payment.paymentStatus,
          verificationStatus: payment.verificationStatus,
          paymentDate: payment.paymentDate,
          orderCount: payment.orderIds.length,
          orders: payment.orderIds,
          createdAt: payment.createdAt,
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
      error: error.message,
    });
  }
};

// Admin: Get all payments for verification
export const getAllPaymentsForAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      verificationStatus,
      dateFrom,
      dateTo,
      search,
      sortField = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Only fetch order payments (not subscription payments)
    const filter = {
      $or: [{ subscriptionId: { $exists: false } }, { subscriptionId: null }],
    };
    if (status && status !== "all") filter.paymentStatus = status;
    if (verificationStatus && verificationStatus !== "all")
      filter.verificationStatus = verificationStatus;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Build aggregation pipeline for advanced search (user name, order number, etc.)
    const pipeline = [
      { $match: filter },
      // Join user
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userObj",
        },
      },
      { $unwind: "$userObj" },
      // Join orders
      {
        $lookup: {
          from: "orders",
          localField: "orderIds",
          foreignField: "_id",
          as: "orderObjs",
        },
      },
    ];

    // Search functionality (now supports user name and order number)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      pipeline.push({
        $match: {
          $or: [
            { paymentId: searchRegex },
            { referenceNumber: searchRegex },
            { upiTransactionId: searchRegex },
            { "userObj.name": searchRegex },
            { "orderObjs.orderNumber": searchRegex },
          ],
        },
      });
    }

    // Sorting
    const sortObj = {};
    sortObj[sortField] = sortOrder === "asc" ? 1 : -1;
    pipeline.push({ $sort: sortObj });

    // Pagination
    pipeline.push({ $skip: (Number(page) - 1) * Number(limit) });
    pipeline.push({ $limit: Number(limit) });

    // Populate user and orders after aggregation
    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userId",
        },
      },
      { $unwind: "$userId" },
      {
        $lookup: {
          from: "orders",
          localField: "orderIds",
          foreignField: "_id",
          as: "orderIds",
        },
      },
    );

    // Count total for pagination
    const countPipeline = [...pipeline];
    countPipeline.pop(); // remove $limit
    countPipeline.pop(); // remove $skip
    countPipeline.push({ $count: "total" });

    // Run aggregation
    const [payments, totalResult] = await Promise.all([
      Payment.aggregate(pipeline),
      Payment.aggregate(countPipeline),
    ]);
    const total = totalResult[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching payments for admin:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      error: error.message,
    });
  }
};

export const getAllSubscriptionPaymentsForAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      verificationStatus,
      dateFrom,
      dateTo,
      search,
      sortField = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Only fetch subscription payments (not order payments)
    const filter = {
      subscriptionId: { $exists: true, $ne: null },
    };
    if (status && status !== "all") filter.paymentStatus = status;
    if (verificationStatus && verificationStatus !== "all")
      filter.verificationStatus = verificationStatus;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Build aggregation pipeline for advanced search (user name, order number, etc.)
    const pipeline = [
      { $match: filter },
      // Join user
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userObj",
        },
      },
      { $unwind: "$userObj" },
      // Join orders
      {
        $lookup: {
          from: "orders",
          localField: "orderIds",
          foreignField: "_id",
          as: "orderObjs",
        },
      },
    ];

    // Search functionality (now supports user name and order number)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      pipeline.push({
        $match: {
          $or: [
            { paymentId: searchRegex },
            { referenceNumber: searchRegex },
            { upiTransactionId: searchRegex },
            { "userObj.name": searchRegex },
            { "orderObjs.orderNumber": searchRegex },
          ],
        },
      });
    }

    // Sorting
    const sortObj = {};
    sortObj[sortField] = sortOrder === "asc" ? 1 : -1;
    pipeline.push({ $sort: sortObj });

    // Pagination
    pipeline.push({ $skip: (Number(page) - 1) * Number(limit) });
    pipeline.push({ $limit: Number(limit) });

    // Populate user and orders after aggregation
    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userId",
        },
      },
      { $unwind: "$userId" },
      {
        $lookup: {
          from: "orders",
          localField: "orderIds",
          foreignField: "_id",
          as: "orderIds",
        },
      },
    );

    // Count total for pagination
    const countPipeline = [...pipeline];
    countPipeline.pop(); // remove $limit
    countPipeline.pop(); // remove $skip
    countPipeline.push({ $count: "total" });

    // Run aggregation
    const [payments, totalResult] = await Promise.all([
      Payment.aggregate(pipeline),
      Payment.aggregate(countPipeline),
    ]);
    const total = totalResult[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching payments for admin:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      error: error.message,
    });
  }
};

// Admin: Verify payment
export const verifyPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { action, notes } = req.body; // action: 'verify' or 'reject'
    const adminId = req.user.userId;

    if (!["verify", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "verify" or "reject"',
      });
    }

    const payment = await Payment.findOne({
      paymentId: paymentId,
      paymentStatus: "completed",
      verificationStatus: "pending",
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found or not eligible for verification",
      });
    }

    if (action === "verify") {
      // Verify payment
      await payment.verifyPayment(adminId);

      // Update related orders to paid status
      await Order.updateMany(
        { _id: { $in: payment.orderIds } },
        {
          $set: {
            paymentStatus: "paid",
            paymentVerifiedAt: new Date(),
            paymentVerifiedBy: adminId,
          },
        },
      );

      res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        data: {
          paymentId: payment.paymentId,
          verificationStatus: payment.verificationStatus,
        },
      });
    } else {
      // Reject payment
      payment.verificationStatus = "rejected";
      payment.notes = notes || "Payment rejected by admin";
      payment.verifiedBy = adminId;
      payment.verifiedAt = new Date();
      await payment.save();

      // Update related orders back to pending payment
      await Order.updateMany(
        { _id: { $in: payment.orderIds } },
        {
          $set: {
            paymentStatus: "pending",
            paymentRejectedAt: new Date(),
            paymentRejectedBy: adminId,
          },
        },
      );

      res.status(200).json({
        success: true,
        message: "Payment rejected successfully",
        data: {
          paymentId: payment.paymentId,
          verificationStatus: payment.verificationStatus,
        },
      });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify payment",
      error: error.message,
    });
  }
};

// Admin: Get detailed payment information with complete order details
export const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findOne({ paymentId })
      .populate("userId", "name email phone")
      .populate({
        path: "orderIds",
        select:
          "orderNumber totalAmount deliveredAt items shippingAddress status paymentStatus deliveryShift customerNotes adminNotes estimatedDelivery confirmedAt cancelledAt cancellationReason cancelledBy deliveryBoyId assignedAt deliveryNotes deliveryLocation",
        populate: {
          path: "items.productId",
          select: "name images description category",
        },
      })
      .populate("verifiedBy", "name");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Manually populate delivery boy information for each order
    if (payment.orderIds && payment.orderIds.length > 0) {
      for (let order of payment.orderIds) {
        if (order.deliveryBoyId) {
          try {
            const DeliveryBoy = mongoose.model("DeliveryBoy");
            const deliveryBoy = await DeliveryBoy.findById(
              order.deliveryBoyId,
            ).select("name phone");
            if (deliveryBoy) {
              order.deliveryBoyId = deliveryBoy;
            }
          } catch (error) {
            console.error("Error populating delivery boy:", error);
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment details",
      error: error.message,
    });
  }
};

// Legacy support for existing payment handling
export const handlePayment = async (req, res) => {
  try {
    const { orderId, paymentStatus } = req.body;

    if (!orderId || !paymentStatus) {
      return res.status(400).json({
        success: false,
        message: "Order ID and payment status are required",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Order is already paid",
      });
    }

    order.paymentStatus = paymentStatus || "paid";
    await order.save();

    res.status(200).json({
      success: true,
      message: "Payment status updated successfully",
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
      },
    });
  } catch (error) {
    console.error("Error handling payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to handle payment",
      error: error.message,
    });
  }
};
