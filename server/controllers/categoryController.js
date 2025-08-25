import Category from "../models/Category.js";
import { seedCategories } from "../utils/seedCategories.js";

// Add a new category
export const addCategory = async (req, res) => {
  try {
    const { name, description, image } = req.body;

    console.log("Attempting to create category:", { name, description, image });

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      return res.status(409).json({
        message: "Category with this name already exists",
        existingCategory: existingCategory,
      });
    }

    const newCategory = new Category({
      name: name.trim(),
      description: description?.trim(),
      image: image?.trim(),
    });

    console.log("Saving category to database...");
    const savedCategory = await newCategory.save();
    console.log("Category saved successfully:", savedCategory._id);

    res.status(201).json({
      message: "Category created successfully",
      category: savedCategory,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    console.error("Error stack:", error.stack);

    // Handle specific MongoDB errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation error",
        error: error.message,
        details: error.errors,
      });
    }

    if (
      error.name === "MongooseError" &&
      error.message.includes("buffering timed out")
    ) {
      return res.status(503).json({
        message: "Database connection timeout. Please try again.",
        error: "Connection timeout",
      });
    }

    res.status(500).json({
      message: "Error creating category.",
      error: error.message,
      type: error.name,
    });
  }
};

// Get all categories
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({
      name: 1,
    });
    res.status(200).json({
      success: true,
      categories,
      count: categories.length,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching categories.",
      error: error.message,
    });
  }
};

// Get all categories (including inactive ones) - for admin
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.status(200).json({
      success: true,
      categories,
      count: categories.length,
    });
  } catch (error) {
    console.error("Error fetching all categories:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching categories.",
      error: error.message,
    });
  }
};

// Get category by ID
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching category.",
      error: error.message,
    });
  }
};

// Get simple category names for dropdowns
export const getCategoryNames = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }, "name")
      .lean()
      .sort({ name: 1 });
    const categoryNames = categories.map((cat) => cat.name);
    res.status(200).json({
      success: true,
      categories: categoryNames,
      message: "Available categories for product creation",
    });
  } catch (error) {
    console.error("Error fetching category names:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching category names.",
      error: error.message,
    });
  }
};

// Update a category
export const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, description, image, isActive } = req.body;

  try {
    // Check if name already exists (excluding current category)
    if (name) {
      const existingCategory = await Category.findOne({
        name: name.trim(),
        _id: { $ne: id },
      });
      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: "Category with this name already exists",
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (image !== undefined) updateData.image = image.trim();
    if (isActive !== undefined) updateData.isActive = isActive;

    const category = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("Error updating category:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.message,
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating category",
      error: error.message,
    });
  }
};

// Delete a category (soft delete)
export const deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await Category.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      category,
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting category",
      error: error.message,
    });
  }
};

// Permanently delete a category
export const permanentlyDeleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category permanently deleted successfully",
    });
  } catch (error) {
    console.error("Error permanently deleting category:", error);
    res.status(500).json({
      success: false,
      message: "Error permanently deleting category",
      error: error.message,
    });
  }
};

// Seed default categories (manual endpoint)
export const seedDefaultCategories = async (req, res) => {
  try {
    const categories = await seedCategories();
    res.status(200).json({
      success: true,
      message: "Default categories seeded successfully",
      categories: categories,
    });
  } catch (error) {
    console.error("Error seeding categories:", error);
    res.status(500).json({
      success: false,
      message: "Error seeding categories",
      error: error.message,
    });
  }
};
