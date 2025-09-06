import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountPrice: {
      type: Number,
      min: [0, "Discount price cannot be negative"],
      validate: {
        validator: function (value) {
          return !value || value <= this.price;
        },
        message: "Discount price cannot be greater than regular price",
      },
    },
    unit: {
      type: String,
      enum: ["piece", "kg", "gram", "liter", "ml", "pack"],
      default: "piece",
    },
    weight: {
      type: String, // "500g", "1kg", "250ml", etc.
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    images: [
      {
        type: String,
      },
    ], // Array of image URLs
    brand: {
      type: String,
      trim: true,
      default: "Store Brand",
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      trim: true,
      uppercase: true,
    },
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      min: [0, "Low stock threshold cannot be negative"],
      default: 5,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "out_of_stock"],
      default: "active",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ], // Product tags for search
    features: [
      {
        type: String,
        trim: true,
      },
    ], // Array of key features
    expiryDays: {
      type: Number,
      min: [0, "Expiry days cannot be negative"],
    }, // Days until expiry for fresh products
  },
  {
    timestamps: true,
  },
);

// Indexes for better performance
ProductSchema.index({ name: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ brand: 1 });
ProductSchema.index({ sku: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ price: 1 });

// Update stock status based on stock level
ProductSchema.pre("save", function (next) {
  if (this.stock <= 0) {
    this.status = "out_of_stock";
  } else if (this.status === "out_of_stock" && this.stock > 0) {
    this.status = "active";
  }
  next();
});

// Virtual for checking if product is in low stock
ProductSchema.virtual("isLowStock").get(function () {
  return this.stock <= this.lowStockThreshold;
});

// Virtual for final price (considering discount)
ProductSchema.virtual("finalPrice").get(function () {
  return this.discountPrice || this.price;
});

export default mongoose.model("Product", ProductSchema);
