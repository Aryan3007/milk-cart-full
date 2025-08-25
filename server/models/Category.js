import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      minlength: [2, "Category name must be at least 2 characters"],
      maxlength: [50, "Category name cannot exceed 50 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    image: {
      type: String, // URL or path to category image
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better performance
categorySchema.index({ name: 1 });
categorySchema.index({ isActive: 1 });

export default mongoose.model("Category", categorySchema);
