import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";
import AnimatedSection from "./AnimatedSection";

const testimonials = [
  {
    id: 1,
    name: "Pritha Sharma",
    location: "Mumbai",
    rating: 5,
    image:
      "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
    text: "The quality of milk is exceptional! You can taste the difference immediately. My family has been using PureDairy for over a year now, and we absolutely love it.",
  },
  {
    id: 2,
    name: "Rajesh Kumar",
    location: "Delhi",
    rating: 5,
    image:
      "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
    text: "Their A2 cow milk is pure and fresh. My children love it, and I feel confident knowing they are getting the best quality dairy products.",
  },
  {
    id: 3,
    name: "Sunita Patel",
    location: "Pune",
    rating: 5,
    image:
      "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
    text: "The ghee is absolutely divine! It reminds me of the ghee my grandmother used to make. Pure, aromatic, and full of flavor.",
  },
  {
    id: 4,
    name: "Amit Gupta",
    location: "Bangalore",
    rating: 5,
    image:
      "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
    text: "Reliable delivery and consistent quality. Their customer service is excellent, and they truly care about their customers satisfaction.",
  },
  {
    id: 5,
    name: "Meera Joshi",
    location: "Hyderabad",
    rating: 5,
    image:
      "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
    text: "Their paneer is so fresh and soft! Perfect for all our cooking needs. We have completely switched to PureDairy for all our dairy requirements.",
  },
];

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrevious = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length,
    );
    setIsAutoPlaying(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  return (
    <section id="testimonials" className="py-20 bg-white dark:bg-[#3d3d3d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            What Our Customers Say
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Don't just take our word for it. Here's what families across the
            country are saying about our dairy products.
          </p>
        </AnimatedSection>

        <div className="relative max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-emerald-50 to-indigo-100 dark:from-gray-700 dark:to-gray-600 rounded-3xl p-8 md:p-12 shadow-xl"
            >
              <div className="flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8">
                <div className="flex-shrink-0">
                  <div className="relative">
                    <img
                      src={testimonials[currentIndex].image}
                      alt={testimonials[currentIndex].name}
                      className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover shadow-lg"
                    />
                    <div className="absolute -top-2 -right-2 bg-emerald-600 p-2 rounded-full">
                      <Quote className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 text-center md:text-left">
                  <div className="flex justify-center md:justify-start mb-4">
                    {[...Array(testimonials[currentIndex].rating)].map(
                      (_, i) => (
                        <Star
                          key={i}
                          className="w-5 h-5 text-yellow-500 fill-yellow-500"
                        />
                      ),
                    )}
                  </div>

                  <p className="text-lg md:text-xl text-gray-700 dark:text-gray-200 mb-6 leading-relaxed italic">
                    "{testimonials[currentIndex].text}"
                  </p>

                  <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                      {testimonials[currentIndex].name}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      {testimonials[currentIndex].location}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-between items-center mt-8">
            <motion.button
              onClick={goToPrevious}
              className="bg-white dark:bg-gray-700 p-3 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </motion.button>

            <div className="flex space-x-2">
              {testimonials.map((_, index) => (
                <motion.button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                    index === currentIndex
                      ? "bg-emerald-600"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                />
              ))}
            </div>

            <motion.button
              onClick={goToNext}
              className="bg-white dark:bg-gray-700 p-3 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronRight className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </motion.button>
          </div>
        </div>

        <AnimatedSection className="mt-16" delay={0.4}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                500+
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                Happy Families
              </div>
            </motion.div>
            <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                4.9★
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                Average Rating
              </div>
            </motion.div>
            <motion.div className="text-center" whileHover={{ scale: 1.05 }}>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                25+
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                Years Experience
              </div>
            </motion.div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
