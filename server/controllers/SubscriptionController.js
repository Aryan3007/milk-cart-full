import Subscription from "../models/Subscription.js";
import UserSubscription from "../models/UserSubscription.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import RefundRequest from "../models/RefundRequest.js";
import { v4 as uuidv4 } from "uuid";

// ==============================================================
// ADMIN SUBSCRIPTION PLAN MANAGEMENT
// ==============================================================

// Get all subscription plans (Admin)
export const getAllSubscriptionPlans = async (req, res) => {
  try {
    const {
      milkType,
      isActive,
      sortBy = "popularity",
      order = "desc",
    } = req.query;

    let filter = {};
    if (milkType) filter.milkType = milkType.toLowerCase();
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const sortOrder = order === "desc" ? -1 : 1;
    let sortOptions = {};

    switch (sortBy) {
      case "price":
        sortOptions.price = sortOrder;
        break;
      case "duration":
        sortOptions.duration = sortOrder;
        break;
      case "volume":
        sortOptions.volume = sortOrder;
        break;
      case "popularity":
      default:
        sortOptions.popularity = -1;
        sortOptions.price = 1;
        break;
    }

    const subscriptions = await Subscription.find(filter).sort(sortOptions);

    res.status(200).json({
      success: true,
      count: subscriptions.length,
      data: subscriptions,
    });
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching subscription plans",
      error: error.message,
    });
  }
};

// Get single subscription plan (Admin)
export const getSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const subscription = await Subscription.findById(id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found",
      });
    }

    res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error("Error fetching subscription plan:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching subscription plan",
      error: error.message,
    });
  }
};

// Create subscription plan (Admin)
export const createSubscriptionPlan = async (req, res) => {
  try {
    const {
      name,
      milkType,
      volume,
      duration,
      price,
      description,
      features,
      discount,
      originalPrice,
    } = req.body;

    // Calculate daily price
    const dailyPrice = Math.round((price / duration) * 100) / 100;

    // Check if similar plan already exists
    const existingPlan = await Subscription.findOne({
      milkType: milkType.toLowerCase(),
      volume,
      duration,
    });

    if (existingPlan) {
      return res.status(400).json({
        success: false,
        message:
          "A subscription plan with this milk type, volume, and duration already exists",
      });
    }

    const subscriptionData = {
      name,
      milkType: milkType.toLowerCase(),
      volume,
      duration,
      price,
      dailyPrice,
      description,
      features: features || [],
      discount: discount || 0,
      originalPrice: originalPrice || price,
    };

    const subscription = new Subscription(subscriptionData);
    await subscription.save();

    res.status(201).json({
      success: true,
      message: "Subscription plan created successfully",
      data: subscription,
    });
  } catch (error) {
    console.error("Error creating subscription plan:", error);
    res.status(500).json({
      success: false,
      message: "Error creating subscription plan",
      error: error.message,
    });
  }
};

// Update subscription plan (Admin)
export const updateSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // If price or duration is updated, recalculate daily price
    if (updateData.price || updateData.duration) {
      const subscription = await Subscription.findById(id);
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription plan not found",
        });
      }

      const price = updateData.price || subscription.price;
      const duration = updateData.duration || subscription.duration;
      updateData.dailyPrice = Math.round((price / duration) * 100) / 100;
    }

    const subscription = await Subscription.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Subscription plan updated successfully",
      data: subscription,
    });
  } catch (error) {
    console.error("Error updating subscription plan:", error);
    res.status(500).json({
      success: false,
      message: "Error updating subscription plan",
      error: error.message,
    });
  }
};

// Delete subscription plan (Admin)
export const deleteSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if there are active user subscriptions for this plan
    const activeUserSubscriptions = await UserSubscription.countDocuments({
      subscriptionId: id,
      status: { $in: ["active", "paused"] },
    });

    if (activeUserSubscriptions > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete subscription plan. ${activeUserSubscriptions} active user subscriptions exist.`,
      });
    }

    const subscription = await Subscription.findByIdAndDelete(id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Subscription plan deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting subscription plan:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting subscription plan",
      error: error.message,
    });
  }
};

// ==============================================================
// USER SUBSCRIPTION OPERATIONS
// ==============================================================

// Get available subscription plans for users
export const getAvailableSubscriptions = async (req, res) => {
  try {
    const { milkType } = req.query;

    let subscriptions;
    if (milkType) {
      subscriptions = await Subscription.findByMilkType(milkType);
    } else {
      subscriptions = await Subscription.findActivePlans();
    }

    res.status(200).json({
      success: true,
      count: subscriptions.length,
      data: subscriptions,
    });
  } catch (error) {
    console.error("Error fetching available subscriptions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching available subscriptions",
      error: error.message,
    });
  }
};

// Create user subscription (Purchase)
export const createUserSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      subscriptionId,
      deliveryAddress,
      deliveryInstructions,
      preferredDeliveryTime,
      paymentMethod,
      couponCode,
      startDate,
    } = req.body;

    // Validate subscription plan exists and is active
    const subscriptionPlan = await Subscription.findById(subscriptionId);
    if (!subscriptionPlan || !subscriptionPlan.isActive) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found or inactive",
      });
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate unique order ID
    const orderId = `SUB-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Calculate dates
    const subscriptionStartDate = startDate ? new Date(startDate) : new Date();
    const subscriptionEndDate = new Date(subscriptionStartDate);
    subscriptionEndDate.setDate(
      subscriptionEndDate.getDate() + subscriptionPlan.duration,
    );

    // Calculate next delivery date (start from tomorrow if starting today)
    const nextDeliveryDate = new Date(subscriptionStartDate);
    if (subscriptionStartDate.toDateString() === new Date().toDateString()) {
      nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 1);
    }

    // Calculate final amount (apply discounts if any)
    let finalAmount = subscriptionPlan.price;
    let discountApplied = subscriptionPlan.discount || 0;

    // TODO: Implement coupon validation logic here
    if (couponCode) {
      // Placeholder for coupon validation
      console.log(`Coupon code ${couponCode} will be validated here`);
    }

    if (discountApplied > 0) {
      finalAmount = Math.round(finalAmount * (1 - discountApplied / 100));
    }

    const userSubscription = new UserSubscription({
      userId,
      subscriptionId,
      orderId,
      status: "pending", // Set status as pending until payment is verified
      startDate: subscriptionStartDate,
      endDate: subscriptionEndDate,
      nextDeliveryDate,
      totalDeliveries: subscriptionPlan.duration,
      deliveryAddress,
      deliveryInstructions,
      preferredDeliveryTime: preferredDeliveryTime || "morning",
      paymentInfo: {
        paymentMethod,
        amount: finalAmount,
        currency: "INR",
      },
      subscriptionHistory: [
        {
          action: "created",
          performedBy: userId,
        },
      ],
      discountApplied,
      couponCode,
    });

    await userSubscription.save();

    // Populate the response with subscription details
    await userSubscription.populate("subscriptionId userId");

    res.status(201).json({
      success: true,
      message:
        "Subscription created successfully. Please complete the payment.",
      data: userSubscription,
    });
  } catch (error) {
    console.error("Error creating user subscription:", error);
    res.status(500).json({
      success: false,
      message: "Error creating subscription",
      error: error.message,
    });
  }
};

// Get user's subscriptions
export const getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { status, page = 1, limit = 10 } = req.query;

    let filter = { userId };
    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const subscriptions = await UserSubscription.find(filter)
      .populate("subscriptionId", "name milkType volume duration price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await UserSubscription.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: subscriptions.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: subscriptions,
    });
  } catch (error) {
    console.error("Error fetching user subscriptions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching subscriptions",
      error: error.message,
    });
  }
};

// Get single user subscription
export const getUserSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { subscriptionId } = req.params;

    const subscription = await UserSubscription.findOne({
      _id: subscriptionId,
      userId,
    }).populate("subscriptionId userId");

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error("Error fetching user subscription:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching subscription",
      error: error.message,
    });
  }
};

// Pause user subscription
export const pauseUserSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { subscriptionId } = req.params;
    const { reason } = req.body;

    const subscription = await UserSubscription.findOne({
      _id: subscriptionId,
      userId,
      status: "active",
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Active subscription not found",
      });
    }

    await subscription.pauseSubscription(reason, userId);

    res.status(200).json({
      success: true,
      message: "Subscription paused successfully",
      data: subscription,
    });
  } catch (error) {
    console.error("Error pausing subscription:", error);
    res.status(500).json({
      success: false,
      message: "Error pausing subscription",
      error: error.message,
    });
  }
};

// Resume user subscription
export const resumeUserSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { subscriptionId } = req.params;

    const subscription = await UserSubscription.findOne({
      _id: subscriptionId,
      userId,
      status: "paused",
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Paused subscription not found",
      });
    }

    await subscription.resumeSubscription(userId);

    res.status(200).json({
      success: true,
      message: "Subscription resumed successfully",
      data: subscription,
    });
  } catch (error) {
    console.error("Error resuming subscription:", error);
    res.status(500).json({
      success: false,
      message: "Error resuming subscription",
      error: error.message,
    });
  }
};

// Cancel user subscription
export const cancelUserSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { subscriptionId } = req.params;
    const { reason, refundDetails } = req.body;

    const subscription = await UserSubscription.findOne({
      _id: subscriptionId,
      userId,
      status: { $in: ["active", "paused"] },
    }).populate("subscriptionId");

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found or already cancelled",
      });
    }

    // Calculate refund amount
    const startDate = new Date(subscription.startDate);
    const endDate = new Date(subscription.endDate);
    const today = new Date();

    // Calculate days used and remaining
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const daysUsed = Math.max(
      0,
      Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)),
    );
    const daysRemaining = Math.max(0, totalDays - daysUsed);

    // Calculate refund amount based on remaining days
    const dailyPrice = subscription.subscriptionId.dailyPrice;
    const refundAmount = Math.round(daysRemaining * dailyPrice * 100) / 100;

    // Validate calculations
    if (daysUsed < 0 || daysRemaining < 0 || daysUsed > totalDays) {
      console.error("Invalid days calculation:", {
        startDate,
        endDate,
        today,
        totalDays,
        daysUsed,
        daysRemaining,
      });
      return res.status(400).json({
        success: false,
        message: "Invalid subscription date calculation",
      });
    }

    // Set subscription status to 'cancellation_requested' and add to history
    subscription.status = "cancellation_requested";
    subscription.subscriptionHistory.push({
      action: "cancellation_requested",
      reason: reason,
      performedBy: userId,
    });
    await subscription.save();

    // Create refund request (status: pending)
    const refundRequest = new RefundRequest({
      userSubscriptionId: subscription._id,
      userId: subscription.userId,
      subscriptionId: subscription.subscriptionId._id,
      orderId: subscription.orderId,
      originalAmount: subscription.paymentInfo.amount,
      refundAmount: refundAmount,
      daysUsed: daysUsed,
      daysRemaining: daysRemaining,
      cancellationReason: reason,
      refundDetails: refundDetails,
      refundMethod: "upi", // Default to UPI
      status: "pending",
    });

    await refundRequest.save();

    // Update subscription with refund request reference
    subscription.refundRequestId = refundRequest._id;
    await subscription.save();

    res.status(200).json({
      success: true,
      message: "Cancellation request submitted. Awaiting admin approval.",
      data: {
        subscription,
        refundRequest: {
          id: refundRequest._id,
          refundAmount: refundRequest.refundAmount,
          daysRemaining: refundRequest.daysRemaining,
          status: refundRequest.status,
        },
      },
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling subscription",
      error: error.message,
    });
  }
};

// Skip delivery
export const skipDelivery = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { subscriptionId } = req.params;
    const { reason, skipDate } = req.body;

    const subscription = await UserSubscription.findOne({
      _id: subscriptionId,
      userId,
      status: "active",
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Active subscription not found",
      });
    }

    // TODO: Implement logic to skip specific date delivery
    // For now, we'll skip the next delivery
    await subscription.skipDelivery(reason);

    res.status(200).json({
      success: true,
      message: "Delivery skipped successfully",
      data: subscription,
    });
  } catch (error) {
    console.error("Error skipping delivery:", error);
    res.status(500).json({
      success: false,
      message: "Error skipping delivery",
      error: error.message,
    });
  }
};

// ==============================================================
// ADMIN USER SUBSCRIPTION MANAGEMENT
// ==============================================================

// Get all user subscriptions (Admin)
export const getAllUserSubscriptions = async (req, res) => {
  try {
    const {
      status,
      milkType,
      userId,
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    let filter = {};
    if (status) filter.status = status;
    if (userId) filter.userId = userId;

    const skip = (page - 1) * limit;
    const sortOrder = order === "desc" ? -1 : 1;

    let aggregatePipeline = [
      { $match: filter },
      {
        $lookup: {
          from: "subscriptions",
          localField: "subscriptionId",
          foreignField: "_id",
          as: "subscriptionDetails",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: "$subscriptionDetails" },
      { $unwind: "$userDetails" },
    ];

    // Add search functionality
    if (search) {
      const searchRegex = new RegExp(search, "i");
      aggregatePipeline.push({
        $match: {
          $or: [
            { "userDetails.name": searchRegex },
            { "userDetails.email": searchRegex },
            { "userDetails.phone": searchRegex },
            { orderId: searchRegex },
            { "subscriptionDetails.name": searchRegex },
          ],
        },
      });
    }

    // Add milk type filter if specified
    if (milkType) {
      aggregatePipeline.push({
        $match: { "subscriptionDetails.milkType": milkType.toLowerCase() },
      });
    }

    // Add sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder;
    aggregatePipeline.push({ $sort: sortOptions });

    // Add pagination
    aggregatePipeline.push({ $skip: skip });
    aggregatePipeline.push({ $limit: parseInt(limit) });

    const subscriptions = await UserSubscription.aggregate(aggregatePipeline);

    // Count total documents
    const countPipeline = aggregatePipeline.slice(0, -2); // Remove skip and limit
    countPipeline.push({ $count: "total" });
    const countResult = await UserSubscription.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    res.status(200).json({
      success: true,
      count: subscriptions.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: subscriptions,
    });
  } catch (error) {
    console.error("Error fetching user subscriptions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user subscriptions",
      error: error.message,
    });
  }
};

// Get deliveries due today (Admin)
export const getDeliveriesDueToday = async (req, res) => {
  try {
    const deliveries = await UserSubscription.findDueForDeliveryToday();

    res.status(200).json({
      success: true,
      count: deliveries.length,
      data: deliveries,
    });
  } catch (error) {
    console.error("Error fetching deliveries due today:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching deliveries due today",
      error: error.message,
    });
  }
};

// Mark delivery as completed (Admin/Delivery Boy)
export const markDeliveryCompleted = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { deliveryNotes } = req.body;

    const subscription = await UserSubscription.findById(subscriptionId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    if (subscription.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Subscription is not active",
      });
    }

    await subscription.completeDelivery();

    if (deliveryNotes) {
      subscription.notes = deliveryNotes;
      await subscription.save();
    }

    res.status(200).json({
      success: true,
      message: "Delivery marked as completed",
      data: subscription,
    });
  } catch (error) {
    console.error("Error marking delivery as completed:", error);
    res.status(500).json({
      success: false,
      message: "Error marking delivery as completed",
      error: error.message,
    });
  }
};

// Get subscription analytics (Admin)
export const getSubscriptionAnalytics = async (req, res) => {
  try {
    const { period = "30" } = req.query; // days
    const days = parseInt(period);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await UserSubscription.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "subscriptionId",
          foreignField: "_id",
          as: "subscriptionDetails",
        },
      },
      { $unwind: "$subscriptionDetails" },
      {
        $group: {
          _id: null,
          totalSubscriptions: { $sum: 1 },
          totalRevenue: { $sum: "$paymentInfo.amount" },
          activeSubscriptions: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          completedSubscriptions: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          cancelledSubscriptions: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
          cowMilkSubscriptions: {
            $sum: {
              $cond: [{ $eq: ["$subscriptionDetails.milkType", "cow"] }, 1, 0],
            },
          },
          buffaloMilkSubscriptions: {
            $sum: {
              $cond: [
                { $eq: ["$subscriptionDetails.milkType", "buffalo"] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const result =
      analytics.length > 0
        ? analytics[0]
        : {
            totalSubscriptions: 0,
            totalRevenue: 0,
            activeSubscriptions: 0,
            completedSubscriptions: 0,
            cancelledSubscriptions: 0,
            cowMilkSubscriptions: 0,
            buffaloMilkSubscriptions: 0,
          };

    res.status(200).json({
      success: true,
      data: {
        period: `Last ${days} days`,
        ...result,
      },
    });
  } catch (error) {
    console.error("Error fetching subscription analytics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching subscription analytics",
      error: error.message,
    });
  }
};

// Create payment session for subscription
export const createPaymentSession = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { subscriptionId, planId } = req.body;

    // Validate input
    if (!subscriptionId || !planId) {
      return res.status(400).json({
        success: false,
        message: "Subscription ID and plan ID are required",
      });
    }

    // Find the subscription
    const subscription = await UserSubscription.findOne({
      _id: subscriptionId,
      userId,
      status: "pending",
      paymentStatus: "pending",
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found or not eligible for payment",
      });
    }

    // Find the plan
    const plan = await Subscription.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found",
      });
    }

    // Import payment utilities
    const Payment = await import("../models/Payment.js").then((m) => m.default);
    const QRCode = await import("qrcode").then((m) => m.default);
    const { paymentConfig } = await import("../config/payment.js");

    // Generate payment session
    const paymentId = Payment.generatePaymentId();
    const referenceNumber = Payment.generateReferenceNumber();

    // Create UPI URL
    const upiUrl = paymentConfig.generateUpiUrl(
      paymentConfig.adminUpiId,
      paymentConfig.adminUpiName,
      subscription.paymentInfo.amount,
      referenceNumber,
      `Payment for ${plan.name} subscription`,
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
      subscriptionId: subscriptionId,
      paymentId: paymentId,
      referenceNumber: referenceNumber,
      totalAmount: subscription.paymentInfo.amount,
      paymentMethod: "upi",
      adminUpiId: paymentConfig.adminUpiId,
      qrCodeUrl: qrCodeDataURL,
      metadata: {
        userAgent: req.headers["user-agent"] || "",
        ipAddress: req.ip || req.connection.remoteAddress || "",
        deviceInfo: "subscription_payment",
      },
    });

    await payment.save();

    // Update subscription to mark payment session created
    subscription.paymentSessionId = paymentId;
    subscription.paymentSessionCreatedAt = new Date();
    await subscription.save();

    res.status(201).json({
      success: true,
      message: "Payment session created successfully",
      data: {
        paymentId: paymentId,
        referenceNumber: referenceNumber,
        totalAmount: subscription.paymentInfo.amount,
        qrCodeUrl: qrCodeDataURL,
        upiId: paymentConfig.adminUpiId,
        upiName: paymentConfig.adminUpiName,
        orderCount: 1,
        expiresIn: paymentConfig.paymentTimeoutMinutes * 60, // seconds
        subscriptionId: subscriptionId,
        plan: {
          id: plan._id,
          name: plan.name,
          amount: subscription.paymentInfo.amount,
        },
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

// Mark subscription payment as completed by user
export const markSubscriptionPaymentCompleted = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { upiTransactionId, upiReferenceNumber } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!upiTransactionId) {
      return res.status(400).json({
        success: false,
        message: "UPI transaction ID is required",
      });
    }

    // Import payment utilities
    const Payment = await import("../models/Payment.js").then((m) => m.default);
    const { paymentConfig } = await import("../config/payment.js");

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

    // Update related subscription
    await UserSubscription.findByIdAndUpdate(payment.subscriptionId, {
      $set: {
        status: "processing", // Status remains processing until admin verification
        paymentStatus: "pending", // Keep as pending until admin verifies
        paymentCompletedAt: new Date(),
        upiTransactionId: upiTransactionId,
      },
    });

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

// Get subscription payment status
export const getSubscriptionPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.userId;

    const Payment = await import("../models/Payment.js").then((m) => m.default);

    const payment = await Payment.findOne({
      paymentId: paymentId,
      userId: userId,
    }).populate("subscriptionId", "orderId status paymentStatus");

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
        subscription: payment.subscriptionId,
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

// Update payment status (Admin)
export const updatePaymentStatus = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { paymentStatus, transactionId, paymentDate } = req.body;

    const subscription = await UserSubscription.findById(subscriptionId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    subscription.paymentStatus = paymentStatus;
    if (transactionId) subscription.paymentInfo.transactionId = transactionId;
    if (paymentDate)
      subscription.paymentInfo.paymentDate = new Date(paymentDate);

    await subscription.save();

    res.status(200).json({
      success: true,
      message: "Payment status updated successfully",
      data: subscription,
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating payment status",
      error: error.message,
    });
  }
};

// Admin: Verify subscription payment
export const verifySubscriptionPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { action, notes } = req.body; // action: 'verify' or 'reject'

    if (!["verify", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "verify" or "reject"',
      });
    }

    const Payment = await import("../models/Payment.js").then((m) => m.default);

    const payment = await Payment.findOne({
      paymentId: paymentId,
      paymentStatus: "completed",
      verificationStatus: "pending",
    }).populate("subscriptionId");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found or not eligible for verification",
      });
    }

    if (action === "verify") {
      // Verify payment
      await payment.verifyPayment("admin");

      // Update related subscription to active status
      await UserSubscription.findByIdAndUpdate(payment.subscriptionId, {
        $set: {
          status: "active", // Now subscription becomes active
          paymentStatus: "paid",
          paymentVerifiedAt: new Date(),
          paymentVerifiedBy: "admin",
        },
      });

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
      payment.verifiedBy = "admin";
      payment.verifiedAt = new Date();
      await payment.save();

      // Update related subscription back to pending payment
      await UserSubscription.findByIdAndUpdate(payment.subscriptionId, {
        $set: {
          status: "pending", // Back to pending status
          paymentStatus: "pending",
          paymentRejectedAt: new Date(),
          paymentRejectedBy: "admin",
        },
      });

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

// ==============================================================
// REFUND REQUEST MANAGEMENT
// ==============================================================

// Get all refund requests (Admin)
export const getAllRefundRequests = async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    let filter = {};
    if (status && status !== "all") {
      filter.status = status;
    }

    const skip = (page - 1) * limit;
    const sortOrder = order === "desc" ? -1 : 1;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder;

    const refundRequests = await RefundRequest.find(filter)
      .populate("userId", "name email phone")
      .populate(
        "subscriptionId",
        "name milkType volume duration price dailyPrice",
      )
      .populate("userSubscriptionId", "status paymentStatus startDate endDate")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Fix any refund requests with incorrect days calculation
    const fixedRefundRequests = refundRequests.map((refund) => {
      const refundObj = refund.toObject();

      // Check if days calculation is incorrect (negative days used or remaining)
      if (refundObj.daysUsed < 0 || refundObj.daysRemaining < 0) {
        console.warn(
          `Fixing incorrect days calculation for refund ${refundObj._id}:`,
          {
            original: {
              daysUsed: refundObj.daysUsed,
              daysRemaining: refundObj.daysRemaining,
            },
          },
        );

        // Recalculate based on subscription dates if available
        if (
          refundObj.userSubscriptionId &&
          refundObj.userSubscriptionId.startDate &&
          refundObj.userSubscriptionId.endDate
        ) {
          const startDate = new Date(refundObj.userSubscriptionId.startDate);
          const endDate = new Date(refundObj.userSubscriptionId.endDate);
          const createdAt = new Date(refundObj.createdAt);

          const totalDays = Math.ceil(
            (endDate - startDate) / (1000 * 60 * 60 * 24),
          );
          const daysUsed = Math.max(
            0,
            Math.ceil((createdAt - startDate) / (1000 * 60 * 60 * 24)),
          );
          const daysRemaining = Math.max(0, totalDays - daysUsed);

          refundObj.daysUsed = daysUsed;
          refundObj.daysRemaining = daysRemaining;

          console.log(`Fixed calculation:`, {
            daysUsed,
            daysRemaining,
            totalDays,
          });
        } else {
          // Fallback: set to reasonable defaults
          refundObj.daysUsed = Math.max(0, refundObj.daysUsed);
          refundObj.daysRemaining = Math.max(0, refundObj.daysRemaining);
        }
      }

      return refundObj;
    });

    const total = await RefundRequest.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: fixedRefundRequests.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: fixedRefundRequests,
    });
  } catch (error) {
    console.error("Error fetching refund requests:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching refund requests",
      error: error.message,
    });
  }
};

// Get refund request by ID (Admin)
export const getRefundRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const refundRequest = await RefundRequest.findById(id)
      .populate("userId", "name email phone")
      .populate(
        "subscriptionId",
        "name milkType volume duration price dailyPrice",
      )
      .populate("userSubscriptionId", "status paymentStatus startDate endDate")
      .populate("processedBy", "name email");

    if (!refundRequest) {
      return res.status(404).json({
        success: false,
        message: "Refund request not found",
      });
    }

    res.status(200).json({
      success: true,
      data: refundRequest,
    });
  } catch (error) {
    console.error("Error fetching refund request:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching refund request",
      error: error.message,
    });
  }
};

// Update refund request status (Admin)
export const updateRefundRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      adminNotes,
      refundTransactionId,
      refundMethod,
      refundDate,
    } = req.body;

    const refundRequest = await RefundRequest.findById(id);

    if (!refundRequest) {
      return res.status(404).json({
        success: false,
        message: "Refund request not found",
      });
    }

    // Update refund request
    refundRequest.status = status;
    if (adminNotes) refundRequest.adminNotes = adminNotes;
    if (refundTransactionId)
      refundRequest.refundTransactionId = refundTransactionId;
    if (refundMethod) refundRequest.refundMethod = refundMethod;
    if (refundDate) refundRequest.refundDate = new Date(refundDate);

    // Find related subscription
    const userSubscription = await UserSubscription.findById(
      refundRequest.userSubscriptionId,
    );
    if (
      userSubscription &&
      userSubscription.status === "cancellation_requested"
    ) {
      if (
        status === "approved" ||
        status === "processed" ||
        status === "completed"
      ) {
        userSubscription.status = "cancelled";
        userSubscription.subscriptionHistory.push({
          action: "cancelled",
          reason: refundRequest.cancellationReason,
          performedBy:
            req.user && req.user.userId ? req.user.userId : undefined,
        });
        await userSubscription.save();
      } else if (status === "rejected") {
        userSubscription.status = "active";
        userSubscription.subscriptionHistory.push({
          action: "cancellation_rejected",
          reason: adminNotes || "Rejected by admin",
          performedBy:
            req.user && req.user.userId ? req.user.userId : undefined,
        });
        await userSubscription.save();
      }
    }

    if (status === "processed" || status === "completed") {
      refundRequest.processedBy = req.user.userId;
      refundRequest.processedAt = new Date();
    }

    await refundRequest.save();

    res.status(200).json({
      success: true,
      message: "Refund request status updated successfully",
      data: refundRequest,
    });
  } catch (error) {
    console.error("Error updating refund request status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating refund request status",
      error: error.message,
    });
  }
};

// Get refund analytics (Admin)
export const getRefundAnalytics = async (req, res) => {
  try {
    const { period = "30" } = req.query;
    const days = parseInt(period);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get refund statistics
    const totalRefunds = await RefundRequest.countDocuments({
      createdAt: { $gte: startDate },
    });

    const totalRefundAmount = await RefundRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ["processed", "completed"] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$refundAmount" },
        },
      },
    ]);

    const statusDistribution = await RefundRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$refundAmount" },
        },
      },
    ]);

    const averageRefundAmount = await RefundRequest.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ["processed", "completed"] },
        },
      },
      {
        $group: {
          _id: null,
          average: { $avg: "$refundAmount" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalRefunds,
        totalRefundAmount: totalRefundAmount[0]?.total || 0,
        averageRefundAmount:
          Math.round((averageRefundAmount[0]?.average || 0) * 100) / 100,
        statusDistribution,
        period: days,
      },
    });
  } catch (error) {
    console.error("Error fetching refund analytics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching refund analytics",
      error: error.message,
    });
  }
};

// Get all subscriptions with paymentStatus: 'pending' and status: 'processing' (pending admin approval)
export const getPendingApprovalSubscriptions = async (req, res) => {
  try {
    const pendingSubs = await UserSubscription.find({
      paymentStatus: "pending",
      status: "processing",
    })
      .populate("userId", "name email phone")
      .populate("subscriptionId", "name price duration");
    res.status(200).json({ success: true, data: pendingSubs });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching pending approvals",
      error: error.message,
    });
  }
};

// Get all payments pending admin verification
export const getPendingPaymentsForVerification = async (req, res) => {
  try {
    const payments = await Payment.find({
      paymentStatus: "completed",
      verificationStatus: "pending",
    })
      .populate("userId", "name email")
      .populate("subscriptionId", "name price duration");
    res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching pending payments",
      error: error.message,
    });
  }
};
