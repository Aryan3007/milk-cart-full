import express from "express";
import {
  addCategory,
  updateCategory,
  deleteCategory,
  permanentlyDeleteCategory,
  getCategories,
  getAllCategories,
  getCategoryById,
  getCategoryNames,
  seedDefaultCategories,
} from "../controllers/categoryController.js";

const categoryrouter = express.Router();

// Category CRUD operations
categoryrouter.post("/", addCategory); // Create category
categoryrouter.get("/", getCategories); // Get active categories
categoryrouter.get("/all", getAllCategories); // Get all categories (for admin)
categoryrouter.get("/names", getCategoryNames); // Get category names for dropdowns
categoryrouter.get("/:id", getCategoryById); // Get category by ID
categoryrouter.put("/:id", updateCategory); // Update category
categoryrouter.delete("/:id", deleteCategory); // Soft delete category
categoryrouter.delete("/:id/permanent", permanentlyDeleteCategory); // Permanently delete category

// Utility routes
categoryrouter.post("/seed", seedDefaultCategories); // Manual seed endpoint

export default categoryrouter;
