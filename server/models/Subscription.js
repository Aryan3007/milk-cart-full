import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    milkType: {
      type: String,
      required: true,
      enum: ["cow", "buffalo"],
      lowercase: true,
    },
    volume: {
      type: String,
      required: true,
      enum: ["1L", "2L", "3L", "5L"],
    },
    duration: {
      type: Number,
      required: true,
      enum: [7, 15, 30, 60], // days
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    dailyPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    popularity: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    originalPrice: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
subscriptionSchema.index({ milkType: 1, volume: 1, duration: 1 });
subscriptionSchema.index({ isActive: 1 });
subscriptionSchema.index({ popularity: -1 });

// Virtual for displaying formatted price
subscriptionSchema.virtual("formattedPrice").get(function () {
  return `₹${this.price}`;
});

// Instance method to calculate total delivery days
subscriptionSchema.methods.getTotalDeliveryDays = function () {
  return this.duration;
};

// Static method to find active plans
subscriptionSchema.statics.findActivePlans = function () {
  return this.find({ isActive: true }).sort({ popularity: -1, price: 1 });
};

// Static method to find plans by type
subscriptionSchema.statics.findByMilkType = function (milkType) {
  return this.find({ milkType: milkType.toLowerCase(), isActive: true }).sort({
    duration: 1,
    volume: 1,
  });
};

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
