import React, { useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  ArrowRight,
  ShoppingBag,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import AnimatedSection from "../components/AnimatedSection";

export default function CartPage() {
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  const { items, total, updateQuantity, removeFromCart, isLoading, loadCart } =
    useCart();
  const navigate = useNavigate();

  // Per-item loading and error state
  const [itemLoading, setItemLoading] = React.useState<{
    [productId: string]: boolean;
  }>({});
  const [itemError, setItemError] = React.useState<{
    [productId: string]: string;
  }>({});

  // Refresh cart data when component mounts
  React.useEffect(() => {
    loadCart();
  }, []);

  // Handler for updating quantity
  const handleUpdateQuantity = async (
    productId: string,
    newQuantity: number
  ) => {
    if (newQuantity < 1) return;
    setItemLoading((prev) => ({ ...prev, [productId]: true }));
    setItemError((prev) => ({ ...prev, [productId]: "" }));
    try {
      await updateQuantity(productId, newQuantity);
    } catch (err: unknown) {
      let message = "Failed to update quantity";
      if (err instanceof Error) message = err.message;
      setItemError((prev) => ({ ...prev, [productId]: message }));
    } finally {
      setItemLoading((prev) => ({ ...prev, [productId]: false }));
    }
  };

  // Handler for removing item
  const handleRemoveFromCart = async (productId: string) => {
    setItemLoading((prev) => ({ ...prev, [productId]: true }));
    setItemError((prev) => ({ ...prev, [productId]: "" }));
    try {
      await removeFromCart(productId);
    } catch (err: unknown) {
      let message = "Failed to remove item";
      if (err instanceof Error) message = err.message;
      setItemError((prev) => ({ ...prev, [productId]: message }));
    } finally {
      setItemLoading((prev) => ({ ...prev, [productId]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16 bg-gray-50 dark:bg-gray-900 sm:pt-20">
        <div className="max-w-4xl px-4 py-8 mx-auto sm:px-6 lg:px-8 sm:py-16">
          <AnimatedSection className="text-center">
            <div className="flex items-center justify-center mb-6">
              <Loader2 className="w-8 h-8 sm:w-12 sm:h-12 text-emerald-500 animate-spin" />
            </div>
            <h1 className="mb-4 text-xl font-bold text-gray-900 sm:text-2xl dark:text-white">
              Loading your cart...
            </h1>
            <p className="text-sm text-gray-600 sm:text-base dark:text-gray-300">
              Please wait while we fetch your cart items.
            </p>
          </AnimatedSection>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-16 bg-gray-50 dark:bg-gray-900 sm:pt-20">
        <div className="max-w-4xl px-4 py-8 mx-auto sm:px-6 lg:px-8 sm:py-16">
          <AnimatedSection className="text-center">
            <div className="mb-6 text-6xl sm:text-8xl">🛒</div>
            <h1 className="mb-4 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
              Your cart is empty
            </h1>
            <p className="px-4 mb-8 text-lg text-gray-600 sm:text-xl dark:text-gray-300">
              Looks like you haven't added any items to your cart yet.
            </p>
            <motion.button
              onClick={() => navigate("/products")}
              className="flex items-center px-6 py-3 mx-auto space-x-2 font-semibold text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600 sm:px-8"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ShoppingBag size={20} />
              <span>Continue Shopping</span>
            </motion.button>
          </AnimatedSection>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 bg-white dark:bg-gray-900 sm:pt-20">
      <div className="max-w-6xl px-4 py-4 mx-auto sm:px-6 lg:px-8 sm:py-8">
        <AnimatedSection>
          <div className="flex items-center mb-6 space-x-3 sm:mb-8">
            <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500 dark:text-emerald-400" />
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
              Shopping Cart
            </h1>
            <span className="text-sm text-gray-600 sm:text-base dark:text-gray-300">
              ({items.length} items)
            </span>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Cart Items */}
          <div className="space-y-3 lg:col-span-2 sm:space-y-4">
            {items.map((item, index) => (
              <AnimatedSection key={item.product.id} delay={index * 0.1}>
                <motion.div
                  className="p-4 bg-white shadow-lg dark:bg-gray-800 rounded-xl sm:rounded-2xl sm:p-6"
                  layout
                >
                  <div className="flex flex-col items-start space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0 w-full sm:w-auto">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="object-cover w-full h-32 rounded-lg sm:w-20 sm:h-20"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 truncate sm:text-lg dark:text-white">
                        {item.product.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {item.product.unit}
                      </p>
                      <div className="flex items-center mt-1 space-x-2">
                        <span className="text-lg font-bold text-emerald-500 dark:text-emerald-400">
                          ₹{item.product.price}
                        </span>
                        {item.product.originalPrice && (
                          <span className="text-sm text-gray-500 line-through">
                            ₹{item.product.originalPrice}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity Controls and Actions */}
                    <div className="flex items-center justify-between w-full space-x-3 sm:justify-end sm:w-auto">
                      {/* Quantity Controls */}
                      <div className="flex items-center border border-gray-300 rounded-lg dark:border-gray-600">
                        <button
                          onClick={() =>
                            handleUpdateQuantity(
                              item.product.id,
                              item.quantity - 1
                            )
                          }
                          disabled={
                            item.quantity <= 1 || itemLoading[item.product.id]
                          }
                          className="p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {itemLoading[item.product.id] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Minus size={16} />
                          )}
                        </button>
                        <span className="px-3 py-2 font-medium text-gray-900 dark:text-white min-w-[3rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            handleUpdateQuantity(
                              item.product.id,
                              item.quantity + 1
                            )
                          }
                          disabled={
                            item.quantity >= item.product.stock ||
                            itemLoading[item.product.id]
                          }
                          className="p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {itemLoading[item.product.id] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus size={16} />
                          )}
                        </button>
                      </div>

                      {/* Price and Remove Button */}
                      <div className="flex items-center space-x-3">
                        <div className="text-right min-w-[80px]">
                          <div className="text-base font-bold text-gray-900 sm:text-lg dark:text-white">
                            ₹{item.product.price * item.quantity}
                          </div>
                        </div>

                        <motion.button
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          disabled={itemLoading[item.product.id]}
                          className="p-2 text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          {itemLoading[item.product.id] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Error Message */}
                  {itemError[item.product.id] && (
                    <div className="px-4 py-2 mt-2 text-sm text-red-600 rounded-lg bg-red-50 dark:bg-red-900/20">
                      {itemError[item.product.id]}
                    </div>
                  )}
                </motion.div>
              </AnimatedSection>
            ))}
          </div>

          {/* Order Summary */}
          <div className="order-first lg:col-span-1 lg:order-last">
            <AnimatedSection delay={0.3}>
              <div className="sticky p-4 bg-white shadow-lg dark:bg-gray-800 rounded-xl sm:rounded-2xl sm:p-6 top-20 sm:top-24">
                <h2 className="mb-4 text-lg font-bold text-gray-900 sm:text-xl dark:text-white sm:mb-6">
                  Order Summary
                </h2>

                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 sm:text-base dark:text-gray-300">
                      Subtotal
                    </span>
                    <span className="text-sm font-medium text-gray-900 sm:text-base dark:text-white">
                      ₹{total.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 sm:text-base dark:text-gray-300">
                      Delivery Fee
                    </span>
                    <span className="text-sm font-medium sm:text-base text-emerald-500 dark:text-emerald-400">
                      {total >= 500 ? "FREE" : "₹50.00"}
                    </span>
                  </div>

                  {total < 500 && (
                    <div className="p-3 text-xs rounded-lg sm:text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20">
                      Add ₹{(500 - total).toFixed(2)} more for free delivery!
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700 sm:pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-gray-900 sm:text-lg dark:text-white">
                        Total
                      </span>
                      <span className="text-base font-bold sm:text-lg text-emerald-500 dark:text-emerald-400">
                        ₹{(total + (total >= 500 ? 0 : 50)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <motion.button
                  onClick={() => navigate("/checkout")}
                  disabled={isLoading}
                  className="flex items-center justify-center w-full px-4 py-3 mt-4 space-x-2 text-sm font-semibold text-white transition-colors rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-400 sm:px-6 sm:mt-6 sm:text-base"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={20} />
                </motion.button>

                <motion.button
                  onClick={() => navigate("/products")}
                  className="w-full px-4 py-3 mt-3 text-sm font-medium text-gray-900 transition-colors bg-gray-100 rounded-lg dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-white sm:px-6 sm:text-base"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Continue Shopping
                </motion.button>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </div>
  );
}
