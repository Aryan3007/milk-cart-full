import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Package, Home, Phone } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AnimatedSection from "../components/AnimatedSection";

export default function OrderSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");

  // Redirect if no order ID
  useEffect(() => {
    if (!orderId) {
      navigate("/");
    }
  }, [orderId, navigate]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  if (!orderId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <AnimatedSection className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-24 h-24 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-8"
          >
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </motion.div>

          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Order Placed Successfully! 🎉
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
            Thank you for your order
          </p>

          <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">
            Order ID:{" "}
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
              #{orderId}
            </span>
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.4}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="space-y-3">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
                  <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Order Confirmed
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Your order has been received and is being processed
                </p>
              </div>

              <div className="space-y-3">
                <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    🚚
                  </motion.div>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Preparing for Delivery
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Your fresh dairy products are being prepared
                </p>
              </div>

              <div className="space-y-3">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                  <Home className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Delivery Tomorrow
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Expected delivery by tomorrow morning
                </p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.6}>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 mb-8">
            <div className="flex items-start space-x-4">
              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Need Help?
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-3">
                  Our customer support team is here to help you with any
                  questions about your order.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    📞 +91 85709 59545
                  </span>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    📧 support@legendsmilkcart.com
                  </span>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.8}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              onClick={() => navigate("/orders")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View My Orders
            </motion.button>

            <motion.button
              onClick={() => navigate("/")}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 px-8 py-3 rounded-lg font-semibold transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Continue Shopping
            </motion.button>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
