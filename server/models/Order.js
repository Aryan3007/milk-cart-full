import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    orderNumber: {
      type: String,
      required: false, // Will be generated automatically
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: [true, "Product ID is required"],
        },
        name: {
          type: String,
          required: [true, "Product name is required"],
        },
        price: {
          type: Number,
          required: [true, "Product price is required"],
          min: [0, "Price cannot be negative"],
        },
        quantity: {
          type: Number,
          required: [true, "Quantity is required"],
          min: [1, "Quantity must be at least 1"],
        },
        image: {
          type: String, // Product image URL
        },
      },
    ],

    // Pricing
    subtotal: {
      type: Number,
      required: [true, "Subtotal is required"],
      min: [0, "Subtotal cannot be negative"],
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: [0, "Shipping fee cannot be negative"],
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, "Tax cannot be negative"],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },

    // Shipping Information
    shippingAddress: {
      name: {
        type: String,
        required: [true, "Recipient name is required"],
      },
      address: {
        type: String,
        required: [true, "Address is required"],
      },
      street: {
        type: String, // Keep both for backward compatibility
      },
      city: {
        type: String,
        required: [true, "City is required"],
      },
      state: {
        type: String,
        required: [true, "State is required"],
      },
      zipCode: {
        type: String,
        required: [true, "ZIP code is required"],
      },
      country: {
        type: String,
        default: "India",
      },
      phone: {
        type: String,
      },
    },

    // Delivery Shift and Scheduling
    deliveryShift: {
      type: String,
      enum: ["morning", "evening"],
      required: [true, "Delivery shift is required"],
      validate: {
        validator: function (value) {
          return ["morning", "evening"].includes(value);
        },
        message:
          "Delivery shift must be either 'morning' (5:00 AM - 11:00 AM) or 'evening' (5-7 PM)",
      },
    },

    // Delivery Date - New field for dated delivery system
    deliveryDate: {
      type: Date,
      required: [true, "Delivery date is required"],
      validate: {
        validator: function (value) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const maxDate = new Date();
          maxDate.setDate(today.getDate() + 7);
          maxDate.setHours(23, 59, 59, 999);

          const deliveryDate = new Date(value);
          deliveryDate.setHours(0, 0, 0, 0);

          return deliveryDate >= today && deliveryDate <= maxDate;
        },
        message: "Delivery date must be between today and 7 days from today",
      },
    },

    // Order placement timing validation
    orderPlacedAt: {
      type: Date,
      default: Date.now,
    },

    // Simplified Status Management
    status: {
      type: String,
      enum: [
        "pending", // Order placed, waiting for admin confirmation
        "confirmed", // Admin confirmed the order
        "delivered", // Order has been delivered
        "cancelled", // Order cancelled by user or admin
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "card", "upi", "wallet"],
      required: [true, "Payment method is required"],
    },

    // Tracking
    estimatedDelivery: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    confirmedAt: {
      type: Date, // When admin confirmed the order
    },
    cancelledAt: {
      type: Date, // When order was cancelled
    },

    // Notes
    customerNotes: {
      type: String,
      maxlength: [500, "Customer notes cannot exceed 500 characters"],
    },
    adminNotes: {
      type: String,
      maxlength: [1000, "Admin notes cannot exceed 1000 characters"],
    },

    // Cancellation tracking
    cancellationReason: {
      type: String,
      maxlength: [200, "Cancellation reason cannot exceed 200 characters"],
    },
    cancelledBy: {
      type: String,
      enum: ["user", "admin"],
    },

    // Delivery Boy Assignment
    deliveryBoyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryBoy",
      required: false,
    },
    assignedAt: {
      type: Date,
      required: false,
    },
    deliveryNotes: {
      type: String,
      maxlength: [500, "Delivery notes cannot exceed 500 characters"],
    },
    deliveryLocation: {
      latitude: {
        type: Number,
        required: false,
      },
      longitude: {
        type: Number,
        required: false,
      },
    },
    // Sequence for delivery (set by admin for delivery boy)
    sequence: {
      type: Number,
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better performance
orderSchema.index({ userId: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ deliveryShift: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ deliveryBoyId: 1 });
orderSchema.index({ status: 1, deliveryBoyId: 1 });
orderSchema.index({ deliveryBoyId: 1, sequence: 1 });

// Static method to check if orders can be placed for a specific delivery shift
orderSchema.statics.canPlaceOrderForShift = function (deliveryShift) {
  // Get current time in IST (Indian Standard Time) using proper timezone conversion
  const now = new Date();
  const istNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );
  const currentHour = istNow.getHours();
  const currentMinutes = istNow.getMinutes();

  console.log(`🌍 UTC time: ${now.toISOString()}`);
  console.log(
    `🇮🇳 IST time: ${istNow.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: false,
    })}`,
  );
  console.log(
    `🕐 Current IST time: ${currentHour}:${currentMinutes
      .toString()
      .padStart(2, "0")}`,
  );
  console.log(`📦 Checking availability for ${deliveryShift} shift`);

  if (deliveryShift === "morning") {
    // For morning shift orders (next day 5:00 AM - 11:00 AM delivery):
    // Can place orders from 6:00 AM to 11:59 PM for tomorrow morning delivery
    // Cannot place orders from 12:00 AM to 5:59 AM for today morning delivery (too late)

    if (currentHour >= 0 && currentHour < 6) {
      // Between 12:00 AM and 5:59 AM - too late for today's morning delivery
      return {
        canPlace: false,
        reason:
          "Morning shift orders must be placed by 11:59 PM the day before delivery. You can place orders for tomorrow morning after 6:00 AM today.",
      };
    }

    // Between 6:00 AM and 11:59 PM - can place for tomorrow morning
    console.log(
      `✅ Morning shift orders allowed at ${currentHour}:${currentMinutes
        .toString()
        .padStart(2, "0")}`,
    );
    return {
      canPlace: true,
      reason: "Order can be placed for tomorrow morning delivery",
    };
  } else if (deliveryShift === "evening") {
    // For evening shift (same day 5-7 PM), can place until 2 PM today
    if (currentHour >= 14) {
      // 2 PM = 14:00
      return {
        canPlace: false,
        reason:
          "Evening shift orders must be placed before 2:00 PM on the delivery day",
      };
    }

    console.log(
      `✅ Evening shift orders allowed at ${currentHour}:${currentMinutes
        .toString()
        .padStart(2, "0")}`,
    );
    return {
      canPlace: true,
      reason: "Order can be placed for today evening delivery",
    };
  }

  return { canPlace: true, reason: "Order can be placed" };
};

// Helper method to check if order can be cancelled based on time rules
orderSchema.methods.canBeCancelledByUser = function () {
  if (this.status !== "pending" && this.status !== "confirmed") {
    return {
      canCancel: false,
      reason: "Order cannot be cancelled in current status",
    };
  }

  const now = new Date();
  const orderCreated = new Date(this.createdAt);

  // Get current time in IST (Indian Standard Time) using proper timezone conversion
  const istNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );
  const currentHour = istNow.getHours();
  const currentMinutes = istNow.getMinutes();

  if (this.deliveryShift === "morning") {
    // For morning shift (next day 5:00 AM - 11:00 AM), can cancel until 8 PM today
    if (currentHour >= 20) {
      // 8 PM = 20:00
      return {
        canCancel: false,
        reason: "Morning shift orders cannot be cancelled after 8 PM",
      };
    }
  } else if (this.deliveryShift === "evening") {
    // For evening shift (same day 5-7 PM), can cancel until 2 PM today
    if (currentHour >= 14) {
      // 2 PM = 14:00
      return {
        canCancel: false,
        reason: "Evening shift orders cannot be cancelled after 2 PM",
      };
    }
  }

  return { canCancel: true, reason: "Order can be cancelled" };
};

// Helper method to check if delivery boy can mark order as delivered based on time restrictions
orderSchema.methods.canBeMarkedAsDelivered = function () {
  if (this.status !== "confirmed") {
    return {
      canMarkDelivered: false,
      reason: "Order must be confirmed before it can be delivered",
    };
  }

  if (!this.deliveryBoyId) {
    return {
      canMarkDelivered: false,
      reason: "Order must be assigned to a delivery boy",
    };
  }

  // Get current time in IST (Indian Standard Time)
  const now = new Date();
  const istNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );
  const currentHour = istNow.getHours();

  console.log(
    `🕐 Current IST time: ${currentHour}:${istNow
      .getMinutes()
      .toString()
      .padStart(2, "0")}`,
  );
  console.log(`📦 Checking delivery time for ${this.deliveryShift} shift`);

  if (this.deliveryShift === "morning") {
    // Morning shift delivery window: 5:00 AM - 11:00 AM
    const currentTime = currentHour * 60 + istNow.getMinutes(); // Convert to minutes for easier comparison
    const startTime = 5 * 60; // 5:00 AM in minutes
    const endTime = 11 * 60; // 11:00 AM in minutes (11:00)

    if (currentTime < startTime || currentTime >= endTime) {
      return {
        canMarkDelivered: false,
        reason:
          "Morning deliveries can only be marked as delivered between 5:00 AM - 11:00 AM",
      };
    }
  } else if (this.deliveryShift === "evening") {
    // Evening shift delivery window: 4:00 PM - 8:00 PM (16:00 - 20:00)
    if (currentHour < 16 || currentHour >= 20) {
      return {
        canMarkDelivered: false,
        reason:
          "Evening deliveries can only be marked as delivered between 4:00 PM - 8:00 PM",
      };
    }
  }

  return { canMarkDelivered: true, reason: "Order can be marked as delivered" };
};

// Generate order number before saving
orderSchema.pre("save", function (next) {
  if (this.isNew && !this.orderNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    this.orderNumber = `ORD-${timestamp}-${random}`;
    console.log(`Generated order number: ${this.orderNumber}`);
  }
  next();
});

// Calculate total amount before saving
orderSchema.pre("save", function (next) {
  if (
    this.isModified("subtotal") ||
    this.isModified("shippingFee") ||
    this.isModified("tax") ||
    this.isModified("discount")
  ) {
    this.totalAmount =
      this.subtotal + this.shippingFee + this.tax - this.discount;
  }
  next();
});

// Set timestamps for status changes
orderSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    const now = new Date();

    if (this.status === "confirmed" && !this.confirmedAt) {
      this.confirmedAt = now;
    } else if (this.status === "delivered" && !this.deliveredAt) {
      this.deliveredAt = now;
    } else if (this.status === "cancelled" && !this.cancelledAt) {
      this.cancelledAt = now;
    }
  }
  next();
});

export default mongoose.model("Order", orderSchema);
