import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface WelcomeScreenProps {
  onComplete: () => void;
}

export default function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Wait for fade out animation to complete before calling onComplete
      setTimeout(onComplete, 500);
    }, 2500); // Show for 2.5 seconds, then 0.5s fade out = 3s total

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-50"
        >
          {/* Desktop Image */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="hidden md:block w-full h-full relative"
          >
            <img
              src="/desktop.jpg"
              alt="Khamma Ghani - Legend Milk Cart"
              className="w-full h-full object-contain"
            />
          </motion.div>

          {/* Mobile Image */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="block md:hidden w-full h-full relative"
          >
            <img
              src="/mobile.jpg"
              alt="Khamma Ghani - Legend Milk Cart"
              className="w-full h-full object-contain"
            />
          </motion.div>

          {/* Loading indicator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
          >
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-orange-600 rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
