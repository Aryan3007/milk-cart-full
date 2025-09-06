import mongoose from "mongoose";

const userSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    orderId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "active",
        "paused",
        "cancellation_requested",
        "cancelled",
        "completed",
        "expired",
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    nextDeliveryDate: {
      type: Date,
      required: true,
    },
    totalDeliveries: {
      type: Number,
      required: true,
    },
    completedDeliveries: {
      type: Number,
      default: 0,
    },
    skippedDeliveries: {
      type: Number,
      default: 0,
    },
    deliveryAddress: {
      fullAddress: {
        type: String,
        required: true,
      },
      landmark: String,
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      pincode: {
        type: String,
        required: true,
      },
      contactNumber: {
        type: String,
        required: true,
      },
    },
    deliveryInstructions: {
      type: String,
      trim: true,
    },
    preferredDeliveryTime: {
      type: String,
      enum: ["morning", "afternoon", "evening"],
      default: "morning",
    },
    paymentInfo: {
      transactionId: String,
      paymentMethod: {
        type: String,
        enum: ["card", "upi", "netbanking", "wallet", "cod"],
        required: true,
      },
      amount: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        default: "INR",
      },
      paymentDate: Date,
    },
    subscriptionHistory: [
      {
        action: {
          type: String,
          enum: [
            "created",
            "paused",
            "resumed",
            "cancellation_requested",
            "cancellation_rejected",
            "cancelled",
            "completed",
            "delivery_skipped",
            "delivery_completed",
          ],
        },
        date: {
          type: Date,
          default: Date.now,
        },
        reason: String,
        performedBy: {
          type: mongoose.Schema.Types.Mixed,
          ref: "User",
        },
      },
    ],
    autoRenewal: {
      type: Boolean,
      default: false,
    },
    renewalDate: Date,
    discountApplied: {
      type: Number,
      default: 0,
    },
    couponCode: String,
    notes: String,
    paymentSessionId: String,
    paymentSessionCreatedAt: Date,
    paymentCompletedAt: Date,
    paymentVerifiedAt: Date,
    paymentVerifiedBy: mongoose.Schema.Types.Mixed,
    paymentRejectedAt: Date,
    paymentRejectedBy: mongoose.Schema.Types.Mixed,
    upiTransactionId: String,
    refundRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RefundRequest",
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient querying
userSubscriptionSchema.index({ userId: 1, status: 1 });
userSubscriptionSchema.index({ subscriptionId: 1 });
userSubscriptionSchema.index({ orderId: 1 }, { unique: true });
userSubscriptionSchema.index({ nextDeliveryDate: 1, status: 1 });
userSubscriptionSchema.index({ endDate: 1, status: 1 });

// Virtual for remaining deliveries
userSubscriptionSchema.virtual("remainingDeliveries").get(function () {
  return (
    this.totalDeliveries - this.completedDeliveries - this.skippedDeliveries
  );
});

// Virtual for subscription progress percentage
userSubscriptionSchema.virtual("progressPercentage").get(function () {
  return Math.round(
    ((this.completedDeliveries + this.skippedDeliveries) /
      this.totalDeliveries) *
      100,
  );
});

// Virtual for days remaining
userSubscriptionSchema.virtual("daysRemaining").get(function () {
  const today = new Date();
  const endDate = new Date(this.endDate);
  const diffTime = endDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

// Instance method to check if subscription is active
userSubscriptionSchema.methods.isActive = function () {
  return this.status === "active" && new Date() <= new Date(this.endDate);
};

// Instance method to pause subscription
userSubscriptionSchema.methods.pauseSubscription = function (
  reason,
  performedBy,
) {
  this.status = "paused";
  this.subscriptionHistory.push({
    action: "paused",
    reason: reason,
    performedBy: performedBy,
  });
  return this.save();
};

// Instance method to resume subscription
userSubscriptionSchema.methods.resumeSubscription = function (performedBy) {
  this.status = "active";
  this.subscriptionHistory.push({
    action: "resumed",
    performedBy: performedBy,
  });
  return this.save();
};

// Instance method to cancel subscription
userSubscriptionSchema.methods.cancelSubscription = function (
  reason,
  performedBy,
) {
  this.status = "cancelled";
  this.subscriptionHistory.push({
    action: "cancelled",
    reason: reason,
    performedBy: performedBy,
  });
  return this.save();
};

// Instance method to record delivery completion
userSubscriptionSchema.methods.completeDelivery = function () {
  this.completedDeliveries += 1;

  // Calculate next delivery date
  const nextDate = new Date(this.nextDeliveryDate);
  nextDate.setDate(nextDate.getDate() + 1);
  this.nextDeliveryDate = nextDate;

  // Add to history
  this.subscriptionHistory.push({
    action: "delivery_completed",
  });

  // Check if subscription is completed
  if (
    this.completedDeliveries + this.skippedDeliveries >=
    this.totalDeliveries
  ) {
    this.status = "completed";
    this.subscriptionHistory.push({
      action: "completed",
    });
  }

  return this.save();
};

// Instance method to skip delivery
userSubscriptionSchema.methods.skipDelivery = function (reason) {
  this.skippedDeliveries += 1;

  // Calculate next delivery date
  const nextDate = new Date(this.nextDeliveryDate);
  nextDate.setDate(nextDate.getDate() + 1);
  this.nextDeliveryDate = nextDate;

  // Add to history
  this.subscriptionHistory.push({
    action: "delivery_skipped",
    reason: reason,
  });

  // Check if subscription is completed
  if (
    this.completedDeliveries + this.skippedDeliveries >=
    this.totalDeliveries
  ) {
    this.status = "completed";
    this.subscriptionHistory.push({
      action: "completed",
    });
  }

  return this.save();
};

// Static method to find subscriptions due for delivery today
userSubscriptionSchema.statics.findDueForDeliveryToday = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.find({
    status: "active",
    nextDeliveryDate: {
      $gte: today,
      $lt: tomorrow,
    },
  }).populate("userId subscriptionId");
};

// Static method to find expiring subscriptions
userSubscriptionSchema.statics.findExpiringSoon = function (days = 3) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  return this.find({
    status: "active",
    endDate: {
      $gte: today,
      $lte: futureDate,
    },
  }).populate("userId subscriptionId");
};

const UserSubscription = mongoose.model(
  "UserSubscription",
  userSubscriptionSchema,
);

export default UserSubscription;
