import mongoose from "mongoose";

const userDeliveryAssignmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    deliveryBoyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryBoy",
      required: [true, "Delivery Boy ID is required"],
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Admin who made the assignment
      required: false, // Made optional to handle admin case
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
    // Track which delivery shifts this assignment applies to
    deliveryShifts: [
      {
        type: String,
        enum: ["morning", "evening"],
        required: true,
      },
    ],
    // Track which areas this assignment applies to
    areas: [
      {
        type: String,
        required: true,
      },
    ],
    // Sequence for user arrangement per delivery agent
    sequence: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
userDeliveryAssignmentSchema.index(
  { userId: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);
userDeliveryAssignmentSchema.index({ deliveryBoyId: 1, isActive: 1 });
userDeliveryAssignmentSchema.index({ assignedAt: -1 });
userDeliveryAssignmentSchema.index({ deliveryBoyId: 1, sequence: 1 });

// Method to deactivate assignment
userDeliveryAssignmentSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};

// Static method to get active assignment for a user
userDeliveryAssignmentSchema.statics.getActiveAssignment = function (userId) {
  return this.findOne({ userId, isActive: true })
    .populate("deliveryBoyId", "name phone shift")
    .populate("assignedBy", "name");
};

// Static method to get all assignments for a delivery boy
userDeliveryAssignmentSchema.statics.getDeliveryBoyAssignments = function (
  deliveryBoyId
) {
  return this.find({ deliveryBoyId, isActive: true })
    .populate("userId", "name phone")
    .populate("assignedBy", "name");
};

export default mongoose.model(
  "UserDeliveryAssignment",
  userDeliveryAssignmentSchema
);
