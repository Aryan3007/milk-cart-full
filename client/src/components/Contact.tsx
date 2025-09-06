import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  Facebook,
  Instagram,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import AnimatedSection from "./AnimatedSection";
import { ApiService } from "../services/api";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      const response = await ApiService.submitContactForm(formData);

      if (response.success) {
        setSubmitStatus({
          type: "success",
          message:
            response.message ||
            "Thank you for your message! We will get back to you soon.",
        });
        // Reset form
        setFormData({ name: "", phone: "", message: "" });
      } else {
        setSubmitStatus({
          type: "error",
          message:
            response.message || "Something went wrong. Please try again.",
        });
      }
    } catch (error) {
      console.error("Contact form submission error:", error);
      setSubmitStatus({
        type: "error",
        message: "Network error. Please check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear any previous error messages when user starts typing
    if (submitStatus.type === "error") {
      setSubmitStatus({ type: null, message: "" });
    }
  };

  return (
    <section id="contact" className="py-20 bg-gray-50 dark:bg-[#242424]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Get In Touch
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Have questions about our products or want to place a bulk order?
            We'd love to hear from you!
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <AnimatedSection animation="fadeInLeft">
            <div className="space-y-8">
              <div className="bg-white dark:bg-[#3d3d3d] rounded-2xl p-6 shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Contact Information
                </h3>

                <div className="space-y-4">
                  <motion.div
                    className="flex items-start space-x-4"
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                      <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Address
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300">
                        PLOT NO. B-6 , GOPALPURA BAI PASS, KRISHI VIHAR, <br />
                        JAIPUR, RAJASTHAN
                      </p>
                    </div>
                  </motion.div>

                  <motion.div
                    className="flex items-start space-x-4"
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
                      <Phone className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Phone
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300">
                        +91 85709 59545
                        <br />
                        +91 87654 32109
                      </p>
                    </div>
                  </motion.div>

                  <motion.div
                    className="flex items-start space-x-4"
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg">
                      <Mail className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Email
                      </h4>
                      <a
                        href="mailto:legendsmilkcart@gmail.com"
                        className="text-gray-600 dark:text-gray-300"
                      >
                        legendsmilkcart@gmail.com
                      </a>
                    </div>
                  </motion.div>

                  <motion.div
                    className="flex items-start space-x-4"
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg">
                      <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Business Hours
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300">
                        Mon - Sat: 6:00 AM - 8:00 PM
                        <br />
                        Sunday: 8:00 AM - 6:00 PM
                      </p>
                    </div>
                  </motion.div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#3d3d3d] rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Follow Us
                </h3>
                <div className="flex space-x-4">
                  <motion.a
                    href="https://www.facebook.com/share/16WSM9iDXg/"
                    className="bg-blue-600 p-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Facebook className="w-5 h-5" />
                  </motion.a>
                  <motion.a
                    href="https://www.instagram.com/legendsmilkcart?igsh=NGg0d2dxZ3RmcGw0"
                    className="bg-pink-600 p-2 rounded-lg hover:bg-pink-700 transition-colors duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Instagram className="w-5 h-5" />
                  </motion.a>
                  {/* <motion.a
                    href="#"
                    className="bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 transition-colors duration-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Youtube className="w-5 h-5" />
                  </motion.a> */}
                </div>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fadeInRight">
            <div className="bg-white dark:bg-[#3d3d3d] rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Send us a Message
              </h3>

              {/* Status Messages */}
              {submitStatus.type && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${
                    submitStatus.type === "success"
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                  }`}
                >
                  {submitStatus.type === "success" ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium">
                    {submitStatus.message}
                  </span>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                    minLength={2}
                    maxLength={100}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#242424] dark:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                    pattern="[+]?[\d\s\-\(\)]+"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#242424] dark:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                    minLength={10}
                    maxLength={1000}
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-[#242424] dark:text-white transition-colors duration-200 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Tell us about your requirements..."
                  />
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {formData.message.length}/1000 characters
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors duration-200 disabled:cursor-not-allowed"
                  whileHover={!isSubmitting ? { scale: 1.02 } : {}}
                  whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Send Message</span>
                    </>
                  )}
                </motion.button>
              </form>

              {/* <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <motion.a
                  href="https://wa.me/918570959545"
                  className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>Order via WhatsApp: +91 85709 59545</span>
                </motion.a>
              </div> */}
            </div>
          </AnimatedSection>
        </div>

        <AnimatedSection className="mt-16" delay={0.6}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="h-64 md:h-96">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3558.8070485416297!2d75.73205387543824!3d26.877870776667972!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMjbCsDUyJzQwLjMiTiA3NcKwNDQnMDQuNyJF!5e0!3m2!1sen!2sin!4v1752348893704!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Legends Milk Cart Location"
              />
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
