import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const deliveryBoySchema = new mongoose.Schema(
  {
    // Basic delivery boy information
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: false, // Made optional since frontend treats it as optional
      sparse: true, // Allow multiple null/undefined values
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, "Please use a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Don't include password in queries by default
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^[+]?[\d\s\-()]{10,}$/, "Please use a valid phone number"],
    },
    age: {
      type: Number,
      required: [true, "Age is required"],
      min: [18, "Age must be at least 18"],
      max: [100, "Age cannot exceed 100"],
    },
    shift: {
      type: String,
      required: [true, "Shift is required"],
      enum: {
        values: ["morning", "evening", "both"],
        message: "Shift must be either 'morning', 'evening', or 'both'",
      },
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
      minlength: [10, "Address must be at least 10 characters"],
    },

    // Verification and approval fields
    isVerified: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },

    // Login tracking
    lastLogin: {
      type: Date,
    },
    loginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      select: false,
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
    },

    // Additional fields
    avatar: {
      type: String, // URL to delivery boy's profile picture
    },
    documents: [
      {
        type: {
          type: String,
          enum: ["id_proof", "address_proof", "license", "other"],
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Performance tracking
    totalDeliveries: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better performance
deliveryBoySchema.index({ phone: 1 });
deliveryBoySchema.index({ status: 1 });
deliveryBoySchema.index({ shift: 1 });

// Pre-save middleware to hash password
deliveryBoySchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
deliveryBoySchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to update last login
deliveryBoySchema.methods.updateLastLogin = function () {
  this.lastLogin = new Date();
  return this.save();
};

// Method to increment login attempts
deliveryBoySchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // If we have max attempts and no lock, lock the account
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // lock for 2 hours
  }

  return this.updateOne(updates);
};

// Method to reset login attempts
deliveryBoySchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1,
    },
  });
};

// Method to approve delivery boy
deliveryBoySchema.methods.approve = function (adminId) {
  this.status = "approved";
  this.isApproved = true;
  this.approvedBy = adminId;
  this.approvedAt = new Date();
  this.rejectionReason = undefined;
  return this.save();
};

// Method to reject delivery boy
deliveryBoySchema.methods.reject = function (reason) {
  this.status = "rejected";
  this.isApproved = false;
  this.rejectionReason = reason;
  return this.save();
};

// Method to suspend delivery boy
deliveryBoySchema.methods.suspend = function (reason) {
  this.status = "suspended";
  this.isActive = false;
  this.rejectionReason = reason;
  return this.save();
};

// Method to update rating
deliveryBoySchema.methods.updateRating = function (newRating) {
  this.totalRatings += 1;
  this.rating =
    (this.rating * (this.totalRatings - 1) + newRating) / this.totalRatings;
  return this.save();
};

// Virtual for checking if account is locked
deliveryBoySchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for checking if can login
deliveryBoySchema.virtual("canLogin").get(function () {
  return (
    this.isActive &&
    this.isApproved &&
    this.status === "approved" &&
    !this.isLocked
  );
});

export default mongoose.model("DeliveryBoy", deliveryBoySchema);
