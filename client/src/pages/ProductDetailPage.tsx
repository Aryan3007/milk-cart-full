import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Star,
  ShoppingCart,
  Minus,
  Plus,
  Shield,
  Truck,
  RotateCcw,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { Product } from "../types";
import { useCart } from "../contexts/CartContext";
import { ApiService } from "../services/api";
import AnimatedSection from "../components/AnimatedSection";

interface ApiProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  inStock: boolean;
  brand?: string;
  sku?: string;
}

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const { addToCart, isLoading: cartLoading } = useCart();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    if (!productId) {
      navigate("/products");
      return;
    }

    setIsLoading(true);
    try {
      const apiProduct: ApiProduct = await ApiService.getProductById(productId);
      if (apiProduct) {
        // Transform API response to match Product type
        const transformedProduct: Product = {
          id: apiProduct.id,
          name: apiProduct.name,
          description: apiProduct.description,
          price: apiProduct.price,
          image: apiProduct.images?.[0] || "/placeholder.jpg", // Use first image or placeholder
          category: apiProduct.category,
          stock: apiProduct.stock,
          badges: [], // Will add badges based on product properties
          rating: 4.5, // Default rating - could be enhanced later
          reviews: 0, // Default reviews - could be enhanced later
          unit: "piece", // Default unit - could be enhanced later
        };

        // Add badges based on product properties
        if (apiProduct.inStock) {
          transformedProduct.badges.push("In Stock");
        }
        if (apiProduct.brand) {
          transformedProduct.badges.push(apiProduct.brand);
        }

        setProduct(transformedProduct);
        setProductImages(
          apiProduct.images && apiProduct.images.length > 0
            ? apiProduct.images
            : ["/placeholder.jpg"],
        );
      } else {
        navigate("/products");
      }
    } catch (error) {
      console.error("Failed to load product:", error);
      navigate("/products");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity);
    }
  };

  const incrementQuantity = () => {
    if (product && quantity < product.stock) {
      setQuantity((prev) => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="animate-pulse">
              <div className="bg-gray-300 dark:bg-gray-700 h-96 rounded-2xl mb-4"></div>
              <div className="flex space-x-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-20 h-20 bg-gray-300 dark:bg-gray-700 rounded-lg"
                  ></div>
                ))}
              </div>
            </div>
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
              <div className="h-24 bg-gray-300 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  // Use actual product images from API
  const images =
    productImages.length > 0 ? productImages : ["/placeholder.jpg"];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <AnimatedSection>
          <motion.button
            onClick={() => navigate("/products")}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 mb-8 transition-colors"
            whileHover={{ x: -5 }}
          >
            <ArrowLeft size={20} />
            <span>Back to Products</span>
          </motion.button>
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <AnimatedSection animation="fadeInLeft">
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-lg">
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="w-full h-96 object-cover"
                />
                {product.originalPrice && (
                  <div className="absolute top-4 right-4">
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      {Math.round(
                        ((product.originalPrice - product.price) /
                          product.originalPrice) *
                          100,
                      )}
                      % OFF
                    </span>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImage === index
                        ? "border-emerald-500"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* Product Info */}
          <AnimatedSection animation="fadeInRight">
            <div className="space-y-6">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {product.badges.map((badge, index) => (
                  <span
                    key={index}
                    className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {badge}
                  </span>
                ))}
              </div>

              {/* Title and Rating */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {product.name}
                </h1>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(product.rating)
                            ? "text-yellow-500 fill-yellow-500"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                    <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                      {product.rating}
                    </span>
                  </div>
                  <span className="text-gray-500 dark:text-gray-400">
                    ({product.reviews} reviews)
                  </span>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-center space-x-3">
                <span className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{product.price}
                </span>
                {product.originalPrice && (
                  <span className="text-2xl text-gray-500 line-through">
                    ₹{product.originalPrice}
                  </span>
                )}
                <span className="text-lg text-gray-500">/{product.unit}</span>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Description
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Stock Status */}
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    product.stock > 10
                      ? "bg-green-500"
                      : product.stock > 0
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                ></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {product.stock > 10
                    ? "In Stock"
                    : product.stock > 0
                      ? `Only ${product.stock} left`
                      : "Out of Stock"}
                </span>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center space-x-4">
                <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  Quantity:
                </span>
                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg">
                  <button
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="px-4 py-2 font-medium text-gray-900 dark:text-white">
                    {quantity}
                  </span>
                  <button
                    onClick={incrementQuantity}
                    disabled={quantity >= product.stock}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <motion.button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0 || cartLoading}
                  className="flex-1 flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ShoppingCart size={20} />
                  <span>{cartLoading ? "Adding..." : "Add to Cart"}</span>
                </motion.button>
              </div>

              {/* Product Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                    <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Quality Assured
                    </h4>
                    <p className="text-sm text-gray-500">100% Fresh</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="bg-emerald-100 dark:bg-emerald-900 p-2 rounded-lg">
                    <Truck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Fast Delivery
                    </h4>
                    <p className="text-sm text-gray-500">Same day</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-lg">
                    <RotateCcw className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Delivered in glass bottle
                    </h4>
                    <p className="text-sm text-gray-500">100% Pure</p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
}
