import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    // Basic user information
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, "Please use a valid email address"],
    },
    password: {
      type: String,
      required: function () {
        return this.authProvider === "local";
      },
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't include password in queries by default
    },
    phone: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String, // URL to user's profile picture
    },

    // Authentication fields
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationCode: {
      type: String,
      select: false, // Don't include in queries by default
    },
    verificationCodeExpiry: {
      type: Date,
      select: false, // Don't include in queries by default
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

    // User role
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // Addresses
    addresses: [
      {
        label: {
          type: String,
          required: true,
          trim: true,
        },
        address: {
          type: String,
          required: true,
          trim: true,
        },
        city: {
          type: String,
          required: true,
          trim: true,
        },
        state: {
          type: String,
          required: true,
          trim: true,
        },
        zipCode: {
          type: String,
          required: true,
          trim: true,
        },
        country: {
          type: String,
          default: "India",
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Wishlist
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
userSchema.index({ email: 1 }, { unique: true });

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate verification code
userSchema.methods.generateVerificationCode = function () {
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
  this.verificationCode = code;
  this.verificationCodeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
  return code;
};

// Method to verify code
userSchema.methods.verifyCode = function (code) {
  if (!this.verificationCode || !this.verificationCodeExpiry) {
    return false;
  }
  if (Date.now() > this.verificationCodeExpiry) {
    return false; // Code expired
  }
  return this.verificationCode === code;
};

// Method to clear verification code
userSchema.methods.clearVerificationCode = function () {
  this.verificationCode = undefined;
  this.verificationCodeExpiry = undefined;
};

// Method to update last login
userSchema.methods.updateLastLogin = function () {
  this.lastLogin = new Date();
  return this.save();
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function () {
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
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1,
    },
  });
};

// Virtual for checking if account is locked
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

export default mongoose.model("User", userSchema);
