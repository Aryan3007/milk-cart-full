import mongoose from "mongoose";

const cartSchema = new mongoose.Schema(

  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: [true, "Product ID is required"],
        },
        quantity: {
          type: Number,
          required: [true, "Quantity is required"],
          min: [1, "Quantity must be at least 1"],
          max: [100, "Quantity cannot exceed 100"],
        },
        price: {
          type: Number,
          required: [true, "Price is required"],
          min: [0, "Price cannot be negative"],
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, "Total amount cannot be negative"],

    },
    totalItems: {
      type: Number,
      default: 0,
      min: [0, "Total items cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
cartSchema.index({ userId: 1 });
cartSchema.index({ "items.productId": 1 });

// Calculate totals before saving
cartSchema.pre("save", function (next) {
  // Calculate total items
  this.totalItems = this.items.reduce(
    (total, item) => total + item.quantity,
    0
  );
  
  // Calculate total amount (only for items with valid prices)
  this.totalAmount = this.items.reduce((total, item) => {
    const price = item.price || 0;
    const quantity = item.quantity || 0;
    return total + (price * quantity);
  }, 0);
  
  next();
});

export default mongoose.model("Cart", cartSchema);
