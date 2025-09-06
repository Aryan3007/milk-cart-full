import { motion } from "framer-motion";
import { Users, Award, Heart, Truck } from "lucide-react";
import AnimatedSection from "./AnimatedSection";
import { legendsBuffaloMilk, membershipMilk } from "../assets/cartImages";

const features = [
  {
    icon: Users,
    title: "100% Pure & Unadulterated",
    description: "No mixing, no preservatives — just real, farm-fresh dairy.",
  },
  {
    icon: Award,
    title: "Hygienic Glass Bottles & Utensils",
    description:
      "All glass containers are thoroughly cleaned and sterilized to ensure they are bacteria-free and safe for reuse.",
  },
  {
    icon: Heart,
    title: "Handled with Care at Every Step",
    description:
      "From milking to bottling, our process is closely monitored to maintain the highest hygiene and safety standards.",
  },
  {
    icon: Truck,
    title: "Plastic-Free, Sustainable Packaging",
    description:
      "We say no to single-use plastics and yes to glass — better for the environment and your health.",
  },
];

export default function About() {
  return (
    <section id="about" className="py-20 bg-white dark:bg-[#3d3d3d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <AnimatedSection animation="fadeInLeft">
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                  Our Story of Authenticity
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                  We’re a new-age dairy brand built with a clear mission — to
                  bring 100% pure, unadulterated dairy products from our farm to
                  your family in the most honest and hygienic way possible.
                </p>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  We don’t cut corners. Every product is packed in glass bottles
                  and utensils that are thoroughly washed and made bacteria-free
                  through strict sterilization processes — not just for
                  freshness, but for your family’s health and peace of mind.
                </p>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  We combine traditional farming values with modern hygiene
                  practices and testing, ensuring that what reaches your
                  doorstep is safe, sustainable, and truly pure.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start space-x-4"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <div className="bg-emerald-100 dark:bg-emerald-900 p-3 rounded-lg">
                      <feature.icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fadeInRight">
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <motion.img
                  src="https://images.pexels.com/photos/422218/pexels-photo-422218.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop"
                  alt="Happy cows in green pasture"
                  className="rounded-2xl shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                />
                <motion.img
                  src={membershipMilk}
                  alt="Farm milking process"
                  className="rounded-2xl shadow-lg mt-8"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                />
                <motion.img
                  src="https://images.pexels.com/photos/1459580/pexels-photo-1459580.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop"
                  alt="Fresh milk bottles"
                  className="rounded-2xl shadow-lg -mt-8"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                />
                <motion.img
                  src={legendsBuffaloMilk}
                  alt="Dairy processing facility"
                  className="rounded-2xl shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              <motion.div
                className="absolute -bottom-4 -left-4 bg-yellow-300 text-yellow-900 p-4 rounded-xl shadow-lg"
                initial={{ scale: 0, rotate: -12 }}
                whileInView={{ scale: 1, rotate: -12 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                viewport={{ once: true }}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold">5+</div>
                  <div className="text-sm">Years Experience</div>
                </div>
              </motion.div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
