import mongoose from "mongoose";

const refundRequestSchema = new mongoose.Schema(
  {
    userSubscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserSubscription",
      required: true,
    },
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
    originalAmount: {
      type: Number,
      required: true,
    },
    refundAmount: {
      type: Number,
      required: true,
    },
    daysUsed: {
      type: Number,
      required: true,
    },
    daysRemaining: {
      type: Number,
      required: true,
    },
    cancellationReason: {
      type: String,
      required: true,
      trim: true,
    },
    refundMethod: {
      type: String,
      enum: ["upi", "bank_transfer"],
      required: true,
    },
    refundDetails: {
      mobileNumber: {
        type: String,
        required: true,
      },
      // UPI Details
      upiId: {
        type: String,
        required: function () {
          return this.refundMethod === "upi";
        },
      },
      // Bank Account Details
      accountHolderName: {
        type: String,
        required: function () {
          return this.refundMethod === "bank_transfer";
        },
      },
      bankName: {
        type: String,
        required: function () {
          return this.refundMethod === "bank_transfer";
        },
      },
      accountNumber: {
        type: String,
        required: function () {
          return this.refundMethod === "bank_transfer";
        },
      },
      ifscCode: {
        type: String,
        required: function () {
          return this.refundMethod === "bank_transfer";
        },
      },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "processed", "completed"],
      default: "pending",
    },
    adminNotes: {
      type: String,
      trim: true,
    },
    processedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
    },
    processedAt: Date,
    refundTransactionId: String,
    refundDate: Date,
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient querying
refundRequestSchema.index({ userId: 1, status: 1 });
refundRequestSchema.index({ status: 1 });

// Validate that either UPI or bank details are provided based on refundMethod
refundRequestSchema.pre("save", function (next) {
  if (this.refundMethod === "upi" && !this.refundDetails.upiId) {
    next(new Error("UPI ID is required for UPI refund method"));
  } else if (
    this.refundMethod === "bank_transfer" &&
    (!this.refundDetails.accountHolderName ||
      !this.refundDetails.bankName ||
      !this.refundDetails.accountNumber ||
      !this.refundDetails.ifscCode)
  ) {
    next(
      new Error(
        "All bank details are required for bank transfer refund method",
      ),
    );
  } else {
    next();
  }
});

export default mongoose.model("RefundRequest", refundRequestSchema);
