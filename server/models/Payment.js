import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserSubscription",
    },
    paymentId: {
      type: String,
      required: true,
    },
    referenceNumber: {
      type: String,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["upi", "card", "netbanking", "wallet"],
      default: "upi",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
    },
    upiTransactionId: {
      type: String,
      default: null,
    },
    upiReferenceNumber: {
      type: String,
      default: null,
    },
    adminUpiId: {
      type: String,
      required: true,
    },
    qrCodeUrl: {
      type: String,
      default: null,
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    verifiedBy: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    metadata: {
      userAgent: String,
      ipAddress: String,
      deviceInfo: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
paymentSchema.index({ userId: 1, paymentStatus: 1 });
paymentSchema.index({ paymentId: 1 });
paymentSchema.index({ referenceNumber: 1 });
paymentSchema.index({ subscriptionId: 1 });
paymentSchema.index({ createdAt: -1 });

// Generate unique payment ID
paymentSchema.statics.generatePaymentId = function () {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `PAY-${timestamp}-${random}`;
};

// Generate unique reference number
paymentSchema.statics.generateReferenceNumber = function () {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `REF${timestamp}${random}`;
};

// Instance method to mark payment as completed
paymentSchema.methods.markAsCompleted = function (
  upiTransactionId,
  upiReferenceNumber
) {
  this.paymentStatus = "completed";
  this.paymentDate = new Date();
  this.upiTransactionId = upiTransactionId;
  this.upiReferenceNumber = upiReferenceNumber;
  this.verificationStatus = "pending"; // Admin needs to verify
  return this.save();
};

// Instance method to verify payment
paymentSchema.methods.verifyPayment = function (verifiedBy) {
  this.verificationStatus = "verified";
  // verifiedBy can be either ObjectId (for regular users) or "admin" string
  this.verifiedBy = verifiedBy;
  this.verifiedAt = new Date();
  return this.save();
};

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
