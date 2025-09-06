import categorySchema from "../models/Category.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { deleteMultipleImages } from "../utils/cloudinaryUtils.js";

export const addProduct = async (req, res) => {
  try {
    console.log("Received request body:", req.body);
    console.log("Received files:", req.files);

    const {
      name,
      description,
      price,
      category,
      brand,
      stock,
      status = "active",
      tags = [],
      features = [],
      specifications = [],
      expiryDays,
    } = req.body;

    // Parse arrays from strings if needed
    const parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
    const parsedFeatures =
      typeof features === "string" ? JSON.parse(features) : features;
    const parsedSpecifications =
      typeof specifications === "string"
        ? JSON.parse(specifications)
        : specifications;

    // Validate required fields
    if (
      !name ||
      !description ||
      !category ||
      !price ||
      !brand ||
      stock === undefined
    ) {
      return res.status(400).json({
        message:
          "Name, description, price, category, brand, and stock are required.",
      });
    }

    // Validate numeric fields
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({
        message: "Price must be a positive number.",
      });
    }

    if (isNaN(stock) || stock < 0) {
      return res.status(400).json({
        message: "Stock must be a non-negative number.",
      });
    }

    // Extract user ID from the authenticated token
    // const userId = req.user.userId;

    // Find the user in the database
    // const user = await User.findById(userId);
    // if (!user) {
    //   return res.status(403).json({
    //     message: "User not found",
    //   });
    // }

    // Validate category
    const categoryDoc = await categorySchema.findById(category);
    console.log(categoryDoc);

    if (!categoryDoc) {
      return res.status(400).json({ message: "Category not found." });
    }

    // Process uploaded files for product images (Cloudinary URLs)
    const productImages = req.files?.productImages
      ? req.files.productImages.map((file) => file.path)
      : [];

    // Generate unique SKU
    const sku = `SKU-${brand.replace(/\s+/g, "-").toUpperCase()}-${name
      .replace(/\s+/g, "-")
      .toUpperCase()}-${Date.now()}`;

    // Create the product
    const newProduct = new Product({
      name,
      description,
      price: parseFloat(price),
      category,
      images: productImages,
      brand,
      sku,
      stock: parseInt(stock, 10),
      status,
      tags: parsedTags,
      features: parsedFeatures,
      specifications: parsedSpecifications,
      expiryDays: expiryDays ? parseInt(expiryDays, 10) : undefined,
    });

    const savedProduct = await newProduct.save();

    res.status(201).json({
      message: "Product added successfully.",
      product: savedProduct,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({
      message: "Error adding product.",
      error: error.message,
    });
  }
};

// Get all products with filtering, sorting, and pagination

export const getAllProducts = async (req, res) => {
  try {
    const {
      category,
      priceRange,
      sortBy = "name",
      page = 1,
      limit = 20,
    } = req.query;

    const filters = { status: "active", isActive: true }; // Only show active products

    if (category) {
      // Find category by name
      const categoryDoc = await categorySchema.findOne({ name: category });
      if (categoryDoc) {
        filters.category = categoryDoc._id;
      }
    }

    if (priceRange) {
      const [min, max] = priceRange.split("-");
      filters.price = { $gte: Number(min), $lte: Number(max) };
    }

    const sortOptions = {};
    if (sortBy === "price") sortOptions.price = 1; // Ascending
    if (sortBy === "-price") sortOptions.price = -1; // Descending
    if (sortBy === "newest") sortOptions.createdAt = -1; // Newest first
    if (sortBy === "name") sortOptions.name = 1; // Alphabetical

    const products = await Product.find(filters)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("category", "name")
      .lean();

    const total = await Product.countDocuments(filters);

    // Transform products for frontend
    const transformedProducts = products.map((product) => ({
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category?.name || "Uncategorized",
      images: product.images || [],
      stock: product.stock,
      inStock: product.stock > 0,
    }));

    res.status(200).json({
      products: transformedProducts,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Error fetching products.", error });
  }
};

// Get products by keyword with filtering, sorting, and pagination
export const getProductsByKeyword = async (req, res) => {
  try {
    const {
      keyword,
      category,
      brand,
      priceRange,
      status = "active",
      sortBy,
      page = 1,
      limit = 10,
    } = req.query;

    const filters = { status };

    if (category) filters.category = category;
    if (brand) filters.brand = { $regex: brand, $options: "i" };

    if (priceRange) {
      const [min, max] = priceRange.split("-");
      filters.price = { $gte: Number(min), $lte: Number(max) };
    }

    if (keyword) {
      // Add case-insensitive regex search for the keyword
      filters.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { brand: { $regex: keyword, $options: "i" } },
        { tags: { $in: [new RegExp(keyword, "i")] } },
      ];
    }

    const sortOptions = {};
    if (sortBy === "price") sortOptions.price = 1; // Ascending
    if (sortBy === "-price") sortOptions.price = -1; // Descending
    if (sortBy === "rating") sortOptions.averageRating = -1;
    if (sortBy === "newest") sortOptions.createdAt = -1;

    const products = await Product.find(filters)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("category");

    const total = await Product.countDocuments(filters);

    res.status(200).json({
      products,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching products.", error });
  }
};

export const getProductsByCategory = async (req, res) => {
  try {
    const {
      category,
      priceRange,
      brand,
      status = "active",
      sortBy,
      page = 1,
      limit = 10,
    } = req.query;

    // Filter for category
    const filters = { category, status };

    if (brand) filters.brand = { $regex: brand, $options: "i" };

    // Filter for price range if provided
    if (priceRange) {
      const [min, max] = priceRange.split("-");
      filters.price = { $gte: Number(min), $lte: Number(max) };
    }

    // Sort options
    const sortOptions = {};
    if (sortBy === "price") sortOptions.price = 1; // Ascending
    if (sortBy === "-price") sortOptions.price = -1; // Descending
    if (sortBy === "rating") sortOptions.averageRating = -1;
    if (sortBy === "newest") sortOptions.createdAt = -1;

    // Fetch products based on category and other filters
    const products = await Product.find(filters)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("category");

    // Count the total number of products
    const total = await Product.countDocuments(filters);

    res.status(200).json({
      products,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching products by category.", error });
  }
};

// Get product details by ID (public)
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate("category", "name")
      .lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    // Transform product for frontend
    const transformedProduct = {
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category?.name || "Uncategorized",
      images: product.images || [],
      stock: product.stock,
      inStock: product.stock > 0,
      brand: product.brand,
      sku: product.sku,
    };

    res.status(200).json(transformedProduct);
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(500).json({ message: "Error fetching product details.", error });
  }
};

// Update product for admin (simplified ecommerce product with image upload)
export const updateProductForAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      category,
      stock,
      isActive,
      unit,
      lowStockThreshold,
      brand,
      weight,
    } = req.body;

    console.log("Updating product with ID:", id);
    console.log("Update data:", req.body);
    console.log("Files received:", req.files);

    // Validate numeric fields if provided
    if (price !== undefined && (isNaN(price) || price <= 0)) {
      return res.status(400).json({
        message: "Price must be a positive number.",
      });
    }

    if (stock !== undefined && (isNaN(stock) || stock < 0)) {
      return res.status(400).json({
        message: "Stock must be a non-negative number.",
      });
    }

    if (
      lowStockThreshold !== undefined &&
      (isNaN(lowStockThreshold) || lowStockThreshold < 0)
    ) {
      return res.status(400).json({
        message: "Low stock threshold must be a non-negative number.",
      });
    }

    // Process new uploaded images if any (Cloudinary URLs)
    const newImages = req.files?.productImages
      ? req.files.productImages.map((file) => file.path)
      : [];

    // Find the product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    // Handle category update
    let categoryId = product.category;
    if (category && typeof category === "string") {
      let categoryDoc;

      // Check if category is a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(category)) {
        categoryDoc = await categorySchema.findById(category);
      } else {
        // If not an ObjectId, search by name
        categoryDoc = await categorySchema.findOne({ name: category });
      }

      if (!categoryDoc) {
        return res.status(400).json({
          message: `Category '${category}' not found. Please use one of the existing categories.`,
        });
      }
      categoryId = categoryDoc._id;
    }

    // Prepare update data
    const updateData = {
      ...(name && { name }),
      ...(description && { description }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(category && { category: categoryId }),
      ...(stock !== undefined && { stock: parseInt(stock, 10) }),
      ...(lowStockThreshold !== undefined && {
        lowStockThreshold: parseInt(lowStockThreshold, 10),
      }),
      ...(isActive !== undefined && { isActive }),
      ...(unit && { unit }),
      ...(brand && { brand }),
      ...(weight && { weight }),
      updatedAt: new Date(),
    };

    // If new images are uploaded, update images array
    if (newImages.length > 0) {
      updateData.images = newImages;
    }

    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("category", "name");

    // Transform response for frontend
    const transformedProduct = {
      id: updatedProduct._id.toString(),
      name: updatedProduct.name,
      description: updatedProduct.description,
      price: updatedProduct.price,
      unit: updatedProduct.unit,
      category: updatedProduct.category?.name || "Uncategorized",
      stock: updatedProduct.stock,
      lowStockThreshold: updatedProduct.lowStockThreshold,
      images: updatedProduct.images,
      isActive: updatedProduct.isActive,
      createdDate: updatedProduct.createdAt,
      lastUpdated: updatedProduct.updatedAt,
    };

    res.status(200).json({
      message: "Product updated successfully.",
      product: transformedProduct,
    });
  } catch (error) {
    console.error("Error updating product for admin:", error);
    res.status(500).json({
      message: "Error updating product.",
      error: error.message,
    });
  }
};

// Delete product for admin (simplified)
export const deleteProductForAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Deleting product with ID:", id);

    // Find the product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    // Delete images from Cloudinary if they exist
    if (product.images && product.images.length > 0) {
      console.log("Deleting images from Cloudinary:", product.images);
      const deleteResults = await deleteMultipleImages(product.images);
      console.log("Image deletion results:", deleteResults);
    }

    // Delete the product
    await Product.findByIdAndDelete(id);

    res.status(200).json({
      message: "Product deleted successfully.",
      deletedId: id,
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      message: "Error deleting product.",
      error: error.message,
    });
  }
};

export const addOrUpdateRating = async (req, res) => {
  const { id } = req.params; // Product ID
  const { rating, comment } = req.body;
  const user = await User.findById(req.user.userId); // Get the logged-in user

  if (!user || !rating) {
    return res
      .status(400)
      .json({ message: "User ID and rating are required." });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5." });
  }

  try {
    const product = await Product.findById(id); // Find the product by ID
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    console.log("Product ratings:", product.ratings); // Log product ratings for debugging

    // Check if user has already rated the product
    const existingRating = product.ratings.find(
      (rate) => rate.userId && rate.userId.toString() === user._id.toString(),
    );

    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      existingRating.comment = comment || existingRating.comment;
    } else {
      // Add new rating
      product.ratings.push({ userId: user._id, rating, comment });
    }

    // Recalculate average rating and total reviews
    const totalRatings = product.ratings.reduce(
      (acc, curr) => acc + curr.rating,
      0,
    );
    product.averageRating = totalRatings / product.ratings.length;
    product.totalReviews = product.ratings.length;

    // Save updated product
    await product.save();

    // Populate user names for ratings
    const populatedProduct = await Product.findById(id).populate({
      path: "ratings.userId",
      select: "name", // Select only the name field
    });

    // Transform the ratings to include user names instead of user IDs
    const ratingsWithUserNames = populatedProduct.ratings.map((rate) => ({
      name: rate.userId?.name || "Unknown User", // Fallback if the user has been deleted
      rating: rate.rating,
      comment: rate.comment,
      createdAt: rate.createdAt,
      _id: rate._id,
    }));

    res.status(200).json({
      message: existingRating
        ? "Rating updated successfully"
        : "Rating added successfully",
      product: {
        ...product.toObject(),
        ratings: ratingsWithUserNames, // Replace ratings with user names
      },
    });
  } catch (error) {
    console.error("Error adding/updating rating:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// New function to update stock
export const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    if (isNaN(stock) || stock < 0) {
      return res.status(400).json({
        message: "Stock must be a non-negative number.",
      });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { stock: parseInt(stock, 10) },
      { new: true, runValidators: true },
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.status(200).json({
      message: "Stock updated successfully.",
      product,
    });
  } catch (error) {
    console.error("Error updating stock:", error);
    res.status(500).json({ message: "Error updating stock.", error });
  }
};

// Get all products for admin (includes all statuses and more details)
export const getAllProductsForAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      search = "",
    } = req.query;

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Build search query
    let searchQuery = {};
    // Add search filter
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");

      // First, try to find categories that match the search term
      const matchingCategories = await categorySchema
        .find({ name: searchRegex })
        .select("_id");
      const categoryIds = matchingCategories.map((cat) => cat._id);

      const searchConditions = [
        { name: searchRegex },
        { description: searchRegex },
        { brand: searchRegex },
        { unit: searchRegex },
        { sku: searchRegex },
        ...(categoryIds.length > 0 ? [{ category: { $in: categoryIds } }] : []),
      ];

      searchQuery.$or = searchConditions;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Get total count for pagination
    const totalProducts = await Product.countDocuments(searchQuery);

    // Get paginated products
    const products = await Product.find(searchQuery)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .populate("category", "name")
      .lean();

    const totalPages = Math.ceil(totalProducts / limit);

    // Transform products to match frontend expectations
    const transformedProducts = products.map((product) => ({
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      price: product.price,
      unit: product.unit,
      category: product.category?.name || "Uncategorized",
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      images: product.images || [],
      isActive: product.isActive,
      createdDate: product.createdAt,
      lastUpdated: product.updatedAt,
    }));

    res.status(200).json({
      success: true,
      message: "Fetched all products successfully",
      products: transformedProducts,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalProducts,
        productsPerPage: Number(limit),
        hasNextPage: Number(page) < totalPages,
        hasPrevPage: Number(page) > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching products for admin:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching products.",
      error: error.message,
    });
  }
};

// Add product for admin (simplified ecommerce product)
export const addProductForAdmin = async (req, res) => {
  try {
    console.log("Received product data:", req.body);
    console.log("Received files:", req.files);

    const {
      name,
      description,
      price,
      category,
      stock = 0,
      isActive = true,
      brand,
      unit,
      weight,
      lowStockThreshold,
      tags,
      features,
    } = req.body;

    // Validate required fields
    if (!name || !description || !price || !category) {
      return res.status(400).json({
        message: "Name, description, price, and category are required.",
      });
    }

    // Validate price
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({
        message: "Price must be a positive number.",
      });
    }

    // Validate stock
    if (stock !== undefined && (isNaN(stock) || stock < 0)) {
      return res.status(400).json({
        message: "Stock must be a non-negative number.",
      });
    }

    // Validate lowStockThreshold
    if (
      lowStockThreshold !== undefined &&
      (isNaN(lowStockThreshold) || lowStockThreshold < 0)
    ) {
      return res.status(400).json({
        message: "Low stock threshold must be a non-negative number.",
      });
    }

    // Process uploaded images (Cloudinary URLs)
    const productImages = req.files?.productImages
      ? req.files.productImages.map((file) => file.path)
      : [];

    console.log("Processed images:", productImages);

    // Find existing category (handle both ID and name)
    let categoryDoc;

    // Check if category is a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(category)) {
      categoryDoc = await categorySchema.findById(category);
    } else {
      // If not an ObjectId, search by name
      categoryDoc = await categorySchema.findOne({ name: category });
    }

    if (!categoryDoc) {
      return res.status(400).json({
        message: `Category '${category}' not found. Please use one of the existing categories.`,
      });
    }

    // Generate unique SKU
    const sku = `PROD-${Date.now()}`;

    // Create the product with simplified fields
    const newProduct = new Product({
      name,
      description,
      price: parseFloat(price),
      category: categoryDoc._id,
      images: productImages,
      stock: parseInt(stock) || 0,
      sku,
      isActive,
      ...(brand && { brand }),
      ...(unit && { unit }),
      ...(weight && { weight }),
      ...(lowStockThreshold && {
        lowStockThreshold: parseInt(lowStockThreshold),
      }),
      ...(tags && { tags: Array.isArray(tags) ? tags : [tags] }),
      ...(features && {
        features: Array.isArray(features) ? features : [features],
      }),
    });

    const savedProduct = await newProduct.save();
    await savedProduct.populate("category", "name");

    // Transform response for frontend
    const transformedProduct = {
      id: savedProduct._id.toString(),
      name: savedProduct.name,
      description: savedProduct.description,
      price: savedProduct.price,
      unit: savedProduct.unit,
      category: savedProduct.category?.name || "Uncategorized",
      images: savedProduct.images,
      stock: savedProduct.stock,
      lowStockThreshold: savedProduct.lowStockThreshold,
      isActive: savedProduct.isActive,
      createdDate: savedProduct.createdAt,
      lastUpdated: savedProduct.updatedAt,
    };

    res.status(201).json({
      message: "Product added successfully.",
      product: transformedProduct,
    });
  } catch (error) {
    console.error("Error adding product for admin:", error);
    res.status(500).json({
      message: "Error adding product.",
      error: error.message,
    });
  }
};
