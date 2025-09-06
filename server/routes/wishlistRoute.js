import express from "express";
import {
  getUserWishlist,
  addToWishlist,
  removeFromWishlist,
} from "../controllers/wishlistController.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";

const wishlistrouter = express.Router();

wishlistrouter.get("/", isAuthenticated, getUserWishlist); // Get wishlist
wishlistrouter.post("/", isAuthenticated, addToWishlist); // Add to wishlist
wishlistrouter.delete("/:productId", isAuthenticated, removeFromWishlist); // Remove from wishlist

export default wishlistrouter;
