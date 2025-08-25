import express from "express";
import {
  addOrUpdateRating,
  addProductForAdmin,
  deleteProductForAdmin,
  getAllProducts,
  getAllProductsForAdmin,
  getProductById,
  getProductsByCategory,
  getProductsByKeyword,
  updateProductForAdmin,
  updateStock,
} from "../controllers/productController.js";
import {
  isAuthenticated,
  isAdminAuthenticated,
} from "../middlewares/authMiddleware.js";
import multer from "multer";
import upload from "../middlewares/upload.js";

const productRouter = express.Router();

// Admin-specific routes (with image upload and authentication)
productRouter.get(
  "/admin/products",
  isAdminAuthenticated,
  getAllProductsForAdmin
); // Get all products for admin
productRouter.post(
  "/admin/products",
  isAdminAuthenticated,
  upload.fields([{ name: "productImages", maxCount: 10 }]),
  addProductForAdmin
); // Add product for admin with images
productRouter.put(
  "/admin/products/:id",
  isAdminAuthenticated,
  upload.fields([{ name: "productImages", maxCount: 10 }]),
  updateProductForAdmin
); // Update product for admin with images
productRouter.delete(
  "/admin/products/:id",
  isAdminAuthenticated,
  deleteProductForAdmin
); // Delete product for admin

// Buyer routes
productRouter.get("/products", getAllProducts); // Get all products (public)
productRouter.get("/products/category", getProductsByCategory); // Get products by category
productRouter.get("/products/search", getProductsByKeyword); // Get products by keyword
productRouter.get("/products/:id", getProductById); // Get a product by ID
productRouter.patch("/products/:id/stock", updateStock); // Update product stock
productRouter.patch(
  "/products/:id/ratings",
  isAuthenticated,
  addOrUpdateRating
); // Add rating (requires auth)

export default productRouter;
