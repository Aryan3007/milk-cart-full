import { motion } from "framer-motion";
import {
  Milk,
  MapPin,
  Phone,
  Mail,
  Facebook,
  Instagram,
  Heart,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#3d3d3d] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <motion.div
              className="flex items-center space-x-2 mb-4"
              whileHover={{ scale: 1.05 }}
            >
              <Milk className="w-8 h-8 text-blue-400" />
              <span className="text-2xl font-bold">Legends Milk Cart</span>
            </motion.div>
            <p className="text-gray-300 mb-6 max-w-md">
              Bringing you fresh, pure dairy products straight from our farms,
              delivered with care in hygienic glass bottles and utensils. Taste
              the goodness of tradition, with the promise of purity.
            </p>
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
                className="bg-red-600 p-2 rounded-lg hover:bg-red-700 transition-colors duration-200"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Youtube className="w-5 h-5" />
              </motion.a> */}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {[
                { name: "Home", href: "/" },
                { name: "Products", href: "/products" },
                { name: "cart", href: "/cart" },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-300 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Info</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                <p className="text-gray-300 text-sm">
                  PLOT NO. B-6 , GOPALPURA BAI PASS, KRISHI VIHAR, <br />
                  JAIPUR, RAJASTHAN
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-green-400" />
                <p className="text-gray-300 text-sm">+91 8570959545</p>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-purple-400" />
                <a
                  href="mailto:legendsmilkcart@gmail.com"
                  className="text-gray-300 text-sm"
                >
                  legendsmilkcart@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              © {currentYear} Legends Milk Cart. All rights reserved.
            </p>
            <div className="flex items-center space-x-1 text-gray-400 text-sm">
              <span>Made with</span>
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              <span>for pure dairy lovers</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center md:justify-start gap-6 mt-4 text-xs text-gray-500">
            <span>FSSAI License No: 12345678901234</span>
            <span>•</span>
            <span>ISO 22000:2018 Certified</span>
            <span>•</span>
            <span>Organic Certified</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
